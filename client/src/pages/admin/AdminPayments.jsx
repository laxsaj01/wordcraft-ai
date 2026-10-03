import React, { useEffect, useState } from 'react';
import { get } from '../../api.js';
import { useI18n } from '../../i18n.jsx';
import { useToast } from '../../components/ui.jsx';

export default function AdminPayments() {
  const { t } = useI18n();
  const toast = useToast();
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    get('/admin/payments').then((d) => setPayments(d.payments)).catch((e) => toast(e.message, 'error'));
  }, []);

  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('admin_payments')}</h1>
          <div className="page-sub">Total paid: <strong>${totalPaid.toFixed(2)}</strong> · {payments.length} records</div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>{t('common_date')}</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Gateway</th><th>{t('common_status')}</th><th>Reference</th></tr></thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={8} className="muted text-center" style={{ padding: 24 }}>—</td></tr>}
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="muted">{p.id}</td>
                  <td className="muted">{p.created_at?.slice(0, 16)}</td>
                  <td><strong>{p.name}</strong><div className="muted" style={{ fontSize: 12 }}>{p.email}</div></td>
                  <td>{p.plan_name || '—'}</td>
                  <td><strong>${p.amount}</strong></td>
                  <td><span className="badge badge-muted">{p.gateway}</span></td>
                  <td><span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{p.status}</span></td>
                  <td className="mono muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.gateway_ref || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
