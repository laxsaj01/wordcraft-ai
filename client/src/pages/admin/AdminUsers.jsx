import React, { useEffect, useState } from 'react';
import { get, put, del } from '../../api.js';
import { useI18n } from '../../i18n.jsx';
import { Modal, useToast } from '../../components/ui.jsx';

export default function AdminUsers() {
  const { t } = useI18n();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ credits: 0, status: 'active', role: 'user' });

  async function load(query = '') {
    try {
      const d = await get(`/admin/users?q=${encodeURIComponent(query)}`);
      setUsers(d.users);
    } catch (e) { toast(e.message, 'error'); }
  }
  useEffect(() => { load(); }, []);

  function openEdit(u) {
    setEdit(u);
    setForm({ credits: u.credits, status: u.status, role: u.role });
  }

  async function save() {
    try {
      await put(`/admin/users/${edit.id}`, form);
      setEdit(null);
      load(q);
      toast('User updated', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function remove(u) {
    if (!confirm(`Delete ${u.email}? This removes all their data.`)) return;
    try {
      await del(`/admin/users/${u.id}`);
      load(q);
      toast('User deleted', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('admin_users')} ({users.length})</h1>
        <input className="input" style={{ maxWidth: 280 }} placeholder={t('common_search')} value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(q)} />
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>{t('common_name')}</th><th>{t('common_email')}</th><th>Role</th><th>{t('common_credits')}</th><th>{t('common_status')}</th><th>Joined</th><th>{t('common_actions')}</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="muted">{u.id}</td>
                  <td><strong>{u.name}</strong></td>
                  <td className="muted">{u.email}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-muted'}`}>{u.role}</span></td>
                  <td><strong>{u.credits}</strong> ⚡</td>
                  <td><span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{u.status}</span></td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{u.created_at?.slice(0, 10)}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>{t('common_edit')}</button>
                      {u.role !== 'admin' && <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>{t('common_delete')}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <Modal title={`${t('common_edit')}: ${edit.email}`} onClose={() => setEdit(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEdit(null)}>{t('common_cancel')}</button>
            <button className="btn btn-primary" onClick={save}>{t('common_save')}</button>
          </>}>
          <div className="field">
            <label>{t('common_credits')}</label>
            <input className="input" type="number" min="0" value={form.credits} onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t('common_status')}</label>
            <select className="select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} disabled={edit.role === 'admin'}>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </select>
          </div>
          <div className="field">
            <label>Role</label>
            <select className="select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} disabled={edit.role === 'admin'}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
