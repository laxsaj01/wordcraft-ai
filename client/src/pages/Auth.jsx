import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n, LANG_OPTIONS } from '../i18n.jsx';

export default function Auth({ mode }) {
  const { login, register, user, system } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user, navigate]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = isRegister
        ? await register(form.name, form.email, form.password, params.get('ref') || '')
        : await login(form.email, form.password);
      navigate(u.role === 'admin' ? '/admin' : '/app', { replace: true });
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <Link to="/" className="auth-logo" style={{ color: 'var(--text)' }}>
          <span className="logo-mark">✦</span> {system.site_name || 'WordCraft AI'}
        </Link>
        <h1 className="auth-title">{isRegister ? t('auth_register_title') : t('auth_login_title')}</h1>
        <p className="auth-sub">{isRegister ? t('auth_register_sub') : t('auth_login_sub')}</p>
        {error && <div className="alert alert-error">{error}</div>}
        {isRegister && !system.signup_enabled && <div className="alert alert-info">Registration is currently disabled.</div>}
        <form onSubmit={submit}>
          {isRegister && (
            <div className="field">
              <label>{t('common_name')}</label>
              <input className="input" value={form.name} onChange={set('name')} required autoFocus />
            </div>
          )}
          <div className="field">
            <label>{t('common_email')}</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} required autoFocus={!isRegister} />
          </div>
          <div className="field">
            <label>{t('auth_password')}</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} required minLength={8} />
          </div>
          <button className="btn btn-primary btn-block btn-lg mt-8" disabled={busy}>
            {busy ? <span className="spinner" /> : (isRegister ? t('register') : t('login'))}
          </button>
        </form>
        <div className="auth-switch">
          {isRegister ? (
            <>{t('auth_have_account')} <Link to="/login">{t('login')}</Link></>
          ) : (
            <>{t('auth_no_account')} <Link to={`/register${params.get('ref') ? `?ref=${params.get('ref')}` : ''}`}>{t('register')}</Link></>
          )}
        </div>
        <div className="text-center mt-16">
          <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANG_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
