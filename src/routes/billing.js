'use strict';
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getSetting, getInt } = require('../settings');
const { addCredits, referralReward } = require('../credits');

const router = express.Router();

function siteUrl(req) {
  const s = getSetting('site_url', '');
  if (s) return s.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function activePlans() {
  return db.prepare('SELECT * FROM plans WHERE active = 1 ORDER BY sort_order ASC, price ASC').all()
    .map((p) => ({ ...p, features: JSON.parse(p.features || '[]') }));
}

router.get('/plans', (req, res) => {
  res.json({ plans: activePlans(), currency_symbol: getSetting('currency_symbol', '$') });
});

function getPlan(id) {
  const p = db.prepare('SELECT * FROM plans WHERE id = ? AND active = 1').get(id);
  return p ? { ...p, features: JSON.parse(p.features || '[]') } : null;
}

function fulfill(paymentId) {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
  if (!payment || payment.status === 'paid') return payment;
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(payment.plan_id);
  db.prepare("UPDATE payments SET status = 'paid' WHERE id = ?").run(paymentId);
  if (!plan) return payment;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payment.user_id);
  addCredits(user.id, plan.credits, 'purchase', `Purchase: ${plan.name}`);

  if (plan.interval === 'month' || plan.interval === 'year') {
    const days = plan.interval === 'month' ? 30 : 365;
    const base = user.plan_id === plan.id && user.plan_expires && new Date(user.plan_expires) > new Date()
      ? new Date(user.plan_expires)
      : new Date();
    base.setTime(base.getTime() + days * 24 * 60 * 60 * 1000);
    db.prepare('UPDATE users SET plan_id = ?, plan_expires = ? WHERE id = ?')
      .run(plan.id, base.toISOString().slice(0, 19).replace('T', ' '), user.id);
  }
  if (user.referred_by) referralReward(user.referred_by, payment.amount);
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
}

router.post('/checkout', auth, async (req, res) => {
  const plan = getPlan(req.body.plan_id);
  if (!plan) return res.status(404).json({ error: 'Plan not found.' });
  const gateway = req.body.gateway;
  if (!['paypal', 'stripe'].includes(gateway)) return res.status(400).json({ error: 'Unsupported gateway.' });

  const payInfo = db.prepare('INSERT INTO payments (user_id, plan_id, amount, currency, gateway, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, plan.id, plan.price, plan.currency || getSetting('currency', 'USD'), gateway, 'pending');
  const paymentId = payInfo.lastInsertRowid;
  const base = siteUrl(req);

  try {
    if (gateway === 'paypal') {
      const mode = getSetting('paypal_mode', 'sandbox');
      const clientId = getSetting('paypal_client_id', '');
      const secret = getSetting('paypal_secret', '');
      if (!clientId || !secret) return res.status(503).json({ error: 'PayPal is not configured yet. Ask the site admin to add PayPal credentials.' });
      const apiBase = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const authRes = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      if (!authRes.ok) throw new Error(`PayPal auth failed (${authRes.status})`);
      const { access_token } = await authRes.json();
      const orderRes = await fetch(`${apiBase}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: plan.currency || 'USD', value: plan.price.toFixed(2) },
            description: `${getSetting('site_name', 'WordCraft AI')} - ${plan.name}`,
            custom_id: String(paymentId),
          }],
          application_context: {
            brand_name: getSetting('site_name', 'WordCraft AI'),
            user_action: 'PAY_NOW',
            return_url: `${base}/billing/return?gateway=paypal&payment_id=${paymentId}`,
            cancel_url: `${base}/plans?canceled=1`,
          },
        }),
      });
      if (!orderRes.ok) throw new Error(`PayPal order creation failed (${orderRes.status}): ${(await orderRes.text()).slice(0, 200)}`);
      const order = await orderRes.json();
      db.prepare('UPDATE payments SET gateway_ref = ? WHERE id = ?').run(order.id, paymentId);
      const approve = (order.links || []).find((l) => l.rel === 'approve');
      return res.json({ redirect: approve ? approve.href : null, payment_id: paymentId, order_id: order.id });
    }

    // Stripe Checkout
    const secretKey = getSetting('stripe_secret_key', '');
    if (!secretKey) return res.status(503).json({ error: 'Stripe is not configured yet. Ask the site admin to add a Stripe secret key.' });
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', `${base}/billing/return?gateway=stripe&payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}`);
    form.set('cancel_url', `${base}/plans?canceled=1`);
    form.set('client_reference_id', String(paymentId));
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', (plan.currency || 'USD').toLowerCase());
    form.set('line_items[0][price_data][unit_amount]', String(Math.round(plan.price * 100)));
    form.set('line_items[0][price_data][product_data][name]', `${getSetting('site_name', 'WordCraft AI')} - ${plan.name}`);
    form.set('line_items[0][price_data][product_data][description]', `${plan.credits} credits (${plan.interval})`);
    const sRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!sRes.ok) throw new Error(`Stripe checkout failed (${sRes.status}): ${(await sRes.text()).slice(0, 200)}`);
    const session = await sRes.json();
    db.prepare('UPDATE payments SET gateway_ref = ? WHERE id = ?').run(session.id, paymentId);
    return res.json({ redirect: session.url, payment_id: paymentId, session_id: session.id });
  } catch (e) {
    db.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").run(paymentId);
    return res.status(502).json({ error: e.message });
  }
});

router.post('/confirm', auth, async (req, res) => {
  const { gateway, payment_id, order_id, session_id } = req.body || {};
  const payment = db.prepare('SELECT * FROM payments WHERE id = ? AND user_id = ?').get(payment_id, req.user.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found.' });
  if (payment.status === 'paid') return res.json({ status: 'paid' });

  try {
    if (gateway === 'paypal') {
      const mode = getSetting('paypal_mode', 'sandbox');
      const apiBase = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const authRes = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${getSetting('paypal_client_id', '')}:${getSetting('paypal_secret', '')}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      const { access_token } = await authRes.json();
      const captureRes = await fetch(`${apiBase}/v2/checkout/orders/${order_id || payment.gateway_ref}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      });
      if (!captureRes.ok) throw new Error(`PayPal capture failed (${captureRes.status})`);
      const capture = await captureRes.json();
      if (capture.status !== 'COMPLETED') throw new Error(`PayPal capture status: ${capture.status}`);
      fulfill(payment.id);
      return res.json({ status: 'paid' });
    }

    if (gateway === 'stripe') {
      const sRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id || payment.gateway_ref}`, {
        headers: { Authorization: `Bearer ${getSetting('stripe_secret_key', '')}` },
      });
      if (!sRes.ok) throw new Error(`Stripe session lookup failed (${sRes.status})`);
      const session = await sRes.json();
      if (session.payment_status !== 'paid') {
        return res.json({ status: session.payment_status || 'pending' });
      }
      fulfill(payment.id);
      return res.json({ status: 'paid' });
    }
    return res.status(400).json({ error: 'Unknown gateway.' });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
});

router.get('/history', auth, (req, res) => {
  const payments = db.prepare('SELECT p.*, pl.name as plan_name, pl.interval FROM payments p LEFT JOIN plans pl ON pl.id = p.plan_id WHERE p.user_id = ? ORDER BY p.id DESC LIMIT 100').all(req.user.id);
  res.json({ payments });
});

module.exports = router;
