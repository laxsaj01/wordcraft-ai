import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Modal, useToast } from '../components/ui.jsx';

export default function Plans() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [symbol, setSymbol] = useState('$');
  const [history, setHistory] = useState([]);
  const [checkout, setCheckout] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const d = await get('/plans');
      setPlans(d.plans);
      setSymbol(d.currency_symbol || '$');
      const h = await get('/billing/history');
      setHistory(h.payments);
    } catch (e) { toast(e.message, 'error'); }
  }

  const planActive = user?.plan_expires && new Date(user.plan_expires.replace(' ', 'T') + 'Z') > new Date();

  async function pay(gateway) {
    setBusy(true);
    try {
      const d = await post('/checkout', { plan_id: checkout.id, gateway });
      if (d.redirect) {
        sessionStorage.setItem('wcai_pending_payment', JSON.stringify({ gateway, payment_id: d.payment_id, order_id: d.order_id, session_id: d.session_id }));
        window.location.href = d.redirect;
      } else {
        toast('Could not start checkout.', 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('plans_title')}</h1>
          <div className="page-sub">
            {planActive ? `${t('plans_current')}: #${user.plan_id} — ${t('plans_expires')} ${user.plan_expires}` : t('plans_none')}
          </div>
        </div>
        <span className="credit-pill">⚡ {user?.credits ?? 0} {t('common_credits')}</span>
      </div>

      <div className="grid grid-3 mb-24">
        {plans.map((p, idx) => (
          <div className={`card plan-card ${idx === 1 ? 'featured' : ''}`} key={p.id}>
            {idx === 1 && <span className="plan-popular">★ POPULAR</span>}
            <div className="plan-name">{p.name}</div>
            <div className="plan-price">
              {symbol}{p.price}
              <span className="unit"> / {p.interval === 'once' ? t('plans_once') : p.interval === 'month' ? t('plans_month') : t('plans_year')}</span>
            </div>
            <div className="plan-credits">⚡ {t('plans_credits', { n: p.credits })}</div>
            <ul className="plan-features">
              {(p.features || []).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <button className="btn btn-primary btn-block" onClick={() => setCheckout(p)}>
              {t('plans_buy', { name: p.name })}
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16 }}>{t('plans_history')}</h3>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('common_date')}</th><th>Plan</th><th>Amount</th><th>Gateway</th><th>{t('common_status')}</th></tr></thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={5} className="muted text-center" style={{ padding: 24 }}>—</td></tr>}
              {history.map((p) => (
                <tr key={p.id}>
                  <td className="muted">{p.created_at?.slice(0, 16)}</td>
                  <td>{p.plan_name || '—'}</td>
                  <td><strong>{symbol}{p.amount}</strong></td>
                  <td><span className="badge badge-muted">{p.gateway}</span></td>
                  <td>
                    <span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {checkout && (
        <Modal title={`${t('plans_buy', { name: checkout.name })} — ${symbol}${checkout.price}`} onClose={() => { setCheckout(null); setBusy(false); }}>
          <p className="muted mb-16">⚡ {t('plans_credits', { n: checkout.credits })} · {checkout.interval === 'once' ? t('plans_once') : checkout.interval === 'month' ? t('plans_month') : t('plans_year')}</p>
          <p className="mb-16" style={{ fontSize: 14, fontWeight: 600 }}>{t('plans_pay_with')}</p>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <button className="btn btn-secondary btn-lg" disabled={busy} onClick={() => pay('paypal')}>
              {busy ? <span className="spinner spinner-dark" /> : '🅿️ PayPal'}
            </button>
            <button className="btn btn-secondary btn-lg" disabled={busy} onClick={() => pay('stripe')}>
              {busy ? <span className="spinner spinner-dark" /> : '💳 Stripe'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
