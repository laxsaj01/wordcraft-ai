import React, { useState } from 'react';
import { put, post } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { useToast } from '../components/ui.jsx';

export default function Profile() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [pw, setPw] = useState({ current_password: '', new_password: '' });

  async function saveName(e) {
    e.preventDefault();
    try {
      await put('/profile', { name });
      refresh();
      toast('Profile updated', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  async function changePw(e) {
    e.preventDefault();
    try {
      await post('/auth/change-password', pw);
      setPw({ current_password: '', new_password: '' });
      toast('Password changed', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('profile_title')}</h1>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="flex items-center gap-12 mb-24">
            <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{(user?.name || 'U').charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{user?.name}</div>
              <div className="muted" style={{ fontSize: 13 }}>{user?.email}</div>
              <span className={`badge ${user?.role === 'admin' ? 'badge-info' : 'badge-muted'}`} style={{ marginTop: 4 }}>{user?.role}</span>
            </div>
          </div>
          <form onSubmit={saveName}>
            <div className="field">
              <label>{t('common_name')}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit">{t('common_save')}</button>
          </form>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>{t('profile_change_pw')}</h3>
          <form onSubmit={changePw}>
            <div className="field">
              <label>{t('profile_current_pw')}</label>
              <input className="input" type="password" value={pw.current_password} onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} required />
            </div>
            <div className="field">
              <label>{t('profile_new_pw')}</label>
              <input className="input" type="password" value={pw.new_password} onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} required minLength={8} />
            </div>
            <button className="btn btn-primary" type="submit">{t('profile_change_pw')}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
