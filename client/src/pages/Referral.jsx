import React, { useEffect, useState } from 'react';
import { get } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { useToast, copyText } from '../components/ui.jsx';

export default function Referral() {
  const { t } = useI18n();
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    get('/referral').then(setData).catch((e) => toast(e.message, 'error'));
  }, []);

  if (!data) return <div className="page"><div className="empty-state">{t('common_loading')}</div></div>;

  const fullLink = data.link.startsWith('http') ? data.link : `${window.location.origin}${data.link}`;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('referral_title')}</h1>
          <div className="page-sub">{t('referral_sub', { pct: data.reward_percent })}</div>
        </div>
      </div>

      <div className="grid grid-2 mb-24">
        <div className="card stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{data.referred_count}</div>
          <div className="stat-label">{t('referral_joined')}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{data.earned_credits}</div>
          <div className="stat-label">{t('referral_earned')}</div>
        </div>
      </div>

      <div className="card mb-24">
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>{t('referral_link')}</label>
        <div className="ref-link-box">
          <input className="input mono" readOnly value={fullLink} onFocus={(e) => e.target.select()} />
          <button className="btn btn-primary" onClick={() => { copyText(fullLink); toast(t('common_copied'), 'success'); }}>📋 {t('common_copy')}</button>
        </div>
        <p className="muted mt-8" style={{ fontSize: 13 }}>Your code: <strong className="mono">{data.code}</strong></p>
      </div>

      {data.referred.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}><h3 style={{ fontSize: 16 }}>{t('referral_joined')}</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('common_name')}</th><th>{t('common_email')}</th><th>Joined</th></tr></thead>
              <tbody>
                {data.referred.map((r, i) => (
                  <tr key={i}><td>{r.name}</td><td className="muted">{r.email}</td><td className="muted">{r.joined?.slice(0, 10)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
