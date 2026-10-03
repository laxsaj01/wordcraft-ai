import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { post } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

export default function BillingReturn() {
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const { t } = useI18n();
  const [state, setState] = useState('confirming');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const pending = sessionStorage.getItem('wcai_pending_payment');
      if (!pending) { setState('failed'); setError('No pending payment found.'); return; }
      sessionStorage.removeItem('wcai_pending_payment');
      try {
        const info = JSON.parse(pending);
        const gateway = params.get('gateway') || info.gateway;
        const payment_id = params.get('payment_id') || info.payment_id;
        const order_id = params.get('order_id') || info.order_id;
        const session_id = params.get('session_id') || info.session_id;
        // Stripe may still be finalizing; retry a few times.
        let result = null;
        for (let i = 0; i < 5; i++) {
          result = await post('/confirm', { gateway, payment_id, order_id, session_id });
          if (result.status === 'paid') break;
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (result && result.status === 'paid') {
          setState('paid');
          refresh();
        } else {
          setState('failed');
          setError(`Payment status: ${result ? result.status : 'unknown'}`);
        }
      } catch (e) {
        setState('failed');
        setError(e.message);
      }
    })();
  }, [params, refresh]);

  return (
    <div className="auth-wrap">
      <div className="card auth-card text-center">
        {state === 'confirming' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <h1 className="auth-title">{t('plans_confirming')}</h1>
            <div className="mt-16"><span className="spinner spinner-dark" style={{ width: 26, height: 26 }} /></div>
          </>
        )}
        {state === 'paid' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h1 className="auth-title">{t('plans_success')}</h1>
            <Link to="/app" className="btn btn-primary mt-24">{t('nav_dashboard')}</Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h1 className="auth-title">{t('plans_failed')}</h1>
            {error && <div className="alert alert-error mt-16">{error}</div>}
            <div className="flex gap-8 mt-24" style={{ justifyContent: 'center' }}>
              <Link to="/app/plans" className="btn btn-secondary">{t('common_back')}</Link>
              <Link to="/app/tickets" className="btn btn-primary">{t('nav_tickets')}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
