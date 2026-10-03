'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { getSetting, setSetting, setMany, isInstalled } = require('../settings');
const { signToken, makeReferralCode, auth, adminOnly } = require('../middleware');
const { signupBonus } = require('../credits');

const router = express.Router();

function sanitizeUser(u) {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role, credits: u.credits,
    referral_code: u.referral_code, plan_id: u.plan_id, plan_expires: u.plan_expires,
    created_at: u.created_at,
  };
}

router.get('/system/status', (req, res) => {
  res.json({
    installed: isInstalled(),
    site_name: getSetting('site_name', 'WordCraft AI'),
    signup_enabled: getSetting('signup_enabled', '1') === '1',
  });
});

router.post('/system/install', (req, res) => {
  if (isInstalled()) return res.status(400).json({ error: 'Already installed.' });
  const { site_name, admin_name, admin_email, admin_password, ai_api_key, ai_base_url, ai_model } = req.body || {};
  if (!admin_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email)) {
    return res.status(400).json({ error: 'A valid admin email is required.' });
  }
  if (!admin_password || admin_password.length < 8) {
    return res.status(400).json({ error: 'Admin password must be at least 8 characters.' });
  }
  const hash = bcrypt.hashSync(admin_password, 10);
  const info = db.prepare('INSERT INTO users (email, password, name, role, credits) VALUES (?, ?, ?, ?, ?)')
    .run(admin_email.toLowerCase().trim(), hash, admin_name || 'Administrator', 'admin', 999999);
  const adminId = info.lastInsertRowid;
  db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(makeReferralCode('ADMIN', adminId), adminId);

  const defaultPlans = db.prepare('SELECT COUNT(*) c FROM plans').get().c;
  if (defaultPlans === 0) {
    const ins = db.prepare('INSERT INTO plans (name, price, currency, credits, interval, words_per_generation, api_access, features, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)');
    ins.run('Starter Pack', 9, 'USD', 100, 'once', 800, 0, JSON.stringify(['100 credits (one-time)', 'All 12 AI writing templates', 'Document history & export', 'Email support']), 1);
    ins.run('Creator', 19, 'USD', 300, 'month', 1500, 0, JSON.stringify(['300 credits / month', 'All 12 AI writing templates', 'Long-form articles up to 1500 words', 'Document history & export', 'Priority support']), 2);
    ins.run('Business', 49, 'USD', 1200, 'month', 3000, 1, JSON.stringify(['1200 credits / month', 'All 12 AI writing templates', 'Long-form articles up to 3000 words', 'Developer API access', 'Document history & export', 'Priority support']), 3);
  }

  setMany({
    installed: '1',
    site_name: site_name || 'WordCraft AI',
    site_tagline: getSetting('site_tagline', 'AI SEO Content Writer & Article Generator'),
    admin_email: admin_email.toLowerCase().trim(),
    ai_api_key: ai_api_key || '',
    ai_base_url: ai_base_url || 'https://api.openai.com/v1',
    ai_model: ai_model || 'gpt-4o-mini',
    signup_enabled: '1',
    signup_bonus_credits: '10',
    referral_reward_percent: '20',
    referral_credits_per_unit: '10',
    currency: 'USD',
    currency_symbol: '$',
    chat_cost_credits: '1',
  });
  signupBonus(adminId);

  const admin = db.prepare('SELECT * FROM users WHERE id = ?').get(adminId);
  res.json({ token: signToken(admin), user: sanitizeUser(admin) });
});

router.post('/auth/register', (req, res) => {
  if (!isInstalled()) return res.status(503).json({ error: 'not_installed' });
  if (getSetting('signup_enabled', '1') !== '1') return res.status(403).json({ error: 'Registration is currently disabled.' });
  const { name, email, password, ref } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (exists) return res.status(409).json({ error: 'An account with this email already exists.' });

  let referredBy = null;
  if (ref) {
    const refUser = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(String(ref).trim());
    if (refUser) referredBy = refUser.id;
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (email, password, name, referred_by) VALUES (?, ?, ?, ?)')
    .run(email.toLowerCase().trim(), hash, name.trim(), referredBy);
  const userId = info.lastInsertRowid;
  db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(makeReferralCode(name, userId), userId);
  signupBonus(userId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({ token: signToken(user), user: sanitizeUser(user) });
});

router.post('/auth/login', (req, res) => {
  if (!isInstalled()) return res.status(503).json({ error: 'not_installed' });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  if (user.status !== 'active') return res.status(403).json({ error: 'Account is suspended. Contact support.' });
  res.json({ token: signToken(user), user: sanitizeUser(user) });
});

router.get('/auth/me', auth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.post('/auth/change-password', auth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  const full = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password || '', full.password)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), req.user.id);
  res.json({ ok: true });
});

module.exports = router;
