import React, { useEffect, useState } from 'react';
import { get, post, put } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useI18n } from '../../i18n.jsx';
import { Modal, useToast } from '../../components/ui.jsx';

export default function AdminTickets() {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [open, setOpen] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');

  async function load() {
    try { setTickets((await get('/tickets')).tickets); } catch (e) { toast(e.message, 'error'); }
  }
  useEffect(() => { load(); }, []);

  async function openTicket(tk) {
    try {
      const d = await get(`/tickets/${tk.id}`);
      setOpen(d.ticket);
      setMessages(d.messages);
    } catch (e) { toast(e.message, 'error'); }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    try {
      await post(`/tickets/${open.id}/replies`, { message: reply });
      setReply('');
      openTicket(open);
      load();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function setStatus(status) {
    try {
      await put(`/admin/tickets/${open.id}/status`, { status });
      openTicket({ ...open, status });
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  const statusBadge = (s) => (
    <span className={`badge ${s === 'open' ? 'badge-warning' : s === 'answered' ? 'badge-success' : 'badge-muted'}`}>
      {s === 'open' ? t('tickets_open') : s === 'answered' ? t('tickets_answered') : t('tickets_closed')}
    </span>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('admin_tickets')} ({tickets.length})</h1>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>{t('tickets_subject')}</th><th>Customer</th><th>{t('common_status')}</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {tickets.length === 0 && <tr><td colSpan={6} className="muted text-center" style={{ padding: 24 }}>—</td></tr>}
              {tickets.map((tk) => (
                <tr key={tk.id} style={{ cursor: 'pointer' }} onClick={() => openTicket(tk)}>
                  <td className="muted">{tk.id}</td>
                  <td><strong>{tk.subject}</strong></td>
                  <td className="muted" style={{ fontSize: 13 }}>{tk.user_name}<div style={{ fontSize: 11.5 }}>{tk.user_email}</div></td>
                  <td>{statusBadge(tk.status)}</td>
                  <td className="muted">{tk.updated_at?.slice(0, 16)}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openTicket(tk); }}>{t('docs_open')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal wide title={`#${open.id} — ${open.subject}`} onClose={() => setOpen(null)}
          footer={<>
            {open.status !== 'closed'
              ? <button className="btn btn-secondary btn-sm" onClick={() => setStatus('closed')}>{t('tickets_closed')} →</button>
              : <button className="btn btn-secondary btn-sm" onClick={() => setStatus('open')}>Reopen</button>}
          </>}>
          <div className="mb-16">{statusBadge(open.status)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '46vh', overflowY: 'auto', marginBottom: 16 }}>
            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.is_admin ? 'msg-assistant' : 'msg-user'}`} style={{ maxWidth: '88%' }}>
                <div style={{ fontSize: 11.5, opacity: .75, marginBottom: 4 }}>{m.is_admin ? `🛡 ${m.name} (admin)` : m.name} · {m.created_at?.slice(0, 16)}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
              </div>
            ))}
          </div>
          <form onSubmit={sendReply} className="flex gap-8">
            <input className="input" style={{ flex: 1 }} placeholder={t('tickets_reply')} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} />
            <button className="btn btn-primary" type="submit" disabled={!reply.trim()}>{t('chat_send')}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
