import React, { useEffect, useState } from 'react';
import { get } from '../../api.js';
import { useI18n } from '../../i18n.jsx';
import { useToast } from '../../components/ui.jsx';

export default function AdminDashboard() {
  const { t } = useI18n();
  const toast = useToast();
  const [s, setS] = useState(null);

  useEffect(() => {
    get('/admin/stats').then(setS).catch((e) => toast(e.message, 'error'));
  }, []);

  if (!s) return <div className="page"><div className="empty-state">{t('common_loading')}</div></div>;

  const maxRev = Math.max(1, ...s.daily_revenue.map((d) => d.s));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = s.daily_revenue.find((r) => r.d === key);
    days.push({ key, value: row ? row.s : 0 });
  }

  const stats = [
    { icon: '👥', label: t('admin_total_users'), value: s.users, sub: `+${s.new_today} today` },
    { icon: '💰', label: t('admin_revenue'), value: `$${Number(s.revenue).toFixed(2)}`, sub: `${t('admin_revenue_30')}: $${Number(s.revenue_month).toFixed(2)}` },
    { icon: '⚡', label: t('admin_credits_used'), value: s.credits_spent, sub: `${s.documents} documents` },
    { icon: '◆', label: t('admin_active_subs'), value: s.active_subs, sub: `${s.open_tickets} ${t('admin_open_tickets').toLowerCase()}` },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('admin_dashboard')}</h1>
      </div>
      <div className="grid grid-4 mb-24">
        {stats.map((st, i) => (
          <div className="card stat-card" key={i}>
            <div className="stat-icon">{st.icon}</div>
            <div className="stat-value">{st.value}</div>
            <div className="stat-label">{st.label}</div>
            <div className="muted" style={{ fontSize: 12 }}>{st.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>{t('admin_revenue_30')}</h3>
          <div className="admin-chart">
            {days.map((d) => (
              <div key={d.key} className="chart-bar" style={{ height: `${Math.max(2, (d.value / maxRev) * 100)}%` }} data-tip={`${d.key}: $${Number(d.value).toFixed(2)}`} />
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}><h3 style={{ fontSize: 16 }}>Recent signups</h3></div>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {s.recent_users.length === 0 && <tr><td className="muted text-center" style={{ padding: 20 }}>—</td></tr>}
                {s.recent_users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong><div className="muted" style={{ fontSize: 12 }}>{u.email}</div></td>
                    <td className="muted">{u.credits} ⚡</td>
                    <td className="muted" style={{ fontSize: 12 }}>{u.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
