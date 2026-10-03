import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Modal, useToast } from '../components/ui.jsx';

export default function Tickets() {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [open, setOpen] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try { setTickets((await get('/tickets')).tickets); } catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    try {
      await post('/tickets', form);
      setShowNew(false);
      setForm({ subject: '', message: '' });
      load();
      toast('Ticket created', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

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

  const statusBadge = (s) => (
    <span className={`badge ${s === 'open' ? 'badge-warning' : s === 'answered' ? 'badge-success' : 'badge-muted'}`}>
      {s === 'open' ? t('tickets_open') : s === 'answered' ? t('tickets_answered') : t('tickets_closed')}
    </span>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('tickets_title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>＋ {t('tickets_new')}</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading && <div className="empty-state">{t('common_loading')}</div>}
        {!loading && tickets.length === 0 && <div className="empty-state"><div className="icon">🛟</div>{t('tickets_empty')}</div>}
        {!loading && tickets.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>#</th><th>{t('tickets_subject')}</th>{user.role === 'admin' && <th>User</th>}<th>{t('common_status')}</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {tickets.map((tk) => (
                  <tr key={tk.id} style={{ cursor: 'pointer' }} onClick={() => openTicket(tk)}>
                    <td className="muted">{tk.id}</td>
                    <td><strong>{tk.subject}</strong></td>
                    {user.role === 'admin' && <td className="muted">{tk.user_email}</td>}
                    <td>{statusBadge(tk.status)}</td>
                    <td className="muted">{tk.updated_at?.slice(0, 16)}</td>
                    <td><button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openTicket(tk); }}>{t('docs_open')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <Modal title={t('tickets_new')} onClose={() => setShowNew(false)}>
          <form onSubmit={create}>
            <div className="field">
              <label>{t('tickets_subject')}</label>
              <input className="input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required maxLength={150} />
            </div>
            <div className="field">
              <label>{t('tickets_message')}</label>
              <textarea className="textarea" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required maxLength={5000} />
            </div>
            <button className="btn btn-primary btn-block" type="submit">{t('tickets_new')}</button>
          </form>
        </Modal>
      )}

      {open && (
        <Modal wide title={`#${open.id} — ${open.subject}`} onClose={() => setOpen(null)}>
          <div style={{ marginBottom: 12 }}>{statusBadge(open.status)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '46vh', overflowY: 'auto', marginBottom: 16 }}>
            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.is_admin ? 'msg-assistant' : 'msg-user'}`} style={{ maxWidth: '88%' }}>
                <div style={{ fontSize: 11.5, opacity: .75, marginBottom: 4 }}>
                  {m.is_admin ? '🛡 Support' : m.name} · {m.created_at?.slice(0, 16)}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
              </div>
            ))}
          </div>
          {open.status !== 'closed' && (
            <form onSubmit={sendReply} className="flex gap-8">
              <input className="input" style={{ flex: 1 }} placeholder={t('tickets_reply')} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} />
              <button className="btn btn-primary" type="submit" disabled={!reply.trim()}>{t('chat_send')}</button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
