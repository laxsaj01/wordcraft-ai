import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../api.js';
import { useAuth } from '../auth.jsx';
import { setToken } from '../api.js';
import { useI18n } from '../i18n.jsx';

export default function Install() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { system } = useAuth();
  const [form, setForm] = useState({
    site_name: 'WordCraft AI',
    admin_name: 'Administrator',
    admin_email: '',
    admin_password: '',
    ai_api_key: '',
    ai_base_url: 'https://api.openai.com/v1',
    ai_model: 'gpt-4o-mini',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (system.installed) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card text-center">
          <div className="auth-logo"><span className="logo-mark">✦</span> WordCraft AI</div>
          <p className="muted mb-16">This installation is already set up.</p>
          <a className="btn btn-primary" href="/login">Go to login</a>
        </div>
      </div>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await post('/system/install', form);
      setToken(data.token);
      window.location.href = '/app';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo"><span className="logo-mark">✦</span> WordCraft AI</div>
        <h1 className="auth-title">{t('install_title')}</h1>
        <p className="auth-sub">{t('install_sub')}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="field">
              <label>{t('install_site')}</label>
              <input className="input" value={form.site_name} onChange={set('site_name')} required />
            </div>
            <div className="field">
              <label>{t('install_admin_name')}</label>
              <input className="input" value={form.admin_name} onChange={set('admin_name')} required />
            </div>
          </div>
          <div className="field">
            <label>{t('install_admin_email')}</label>
            <input className="input" type="email" value={form.admin_email} onChange={set('admin_email')} required placeholder="admin@example.com" />
          </div>
          <div className="field">
            <label>{t('install_admin_pw')}</label>
            <input className="input" type="password" value={form.admin_password} onChange={set('admin_password')} required minLength={8} />
          </div>
          <div className="field">
            <label>{t('install_ai_key')}</label>
            <input className="input" type="password" value={form.ai_api_key} onChange={set('ai_api_key')} placeholder="sk-..." />
          </div>
          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="field">
              <label>{t('install_ai_url')}</label>
              <input className="input" value={form.ai_base_url} onChange={set('ai_base_url')} />
            </div>
            <div className="field">
              <label>{t('install_ai_model')}</label>
              <input className="input" value={form.ai_model} onChange={set('ai_model')} />
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-lg mt-8" disabled={busy}>
            {busy ? <span className="spinner" /> : t('install_btn')}
          </button>
        </form>
      </div>
    </div>
  );
}
