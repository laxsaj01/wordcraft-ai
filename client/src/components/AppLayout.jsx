import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n, LANG_OPTIONS } from '../i18n.jsx';

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('wcai_theme', next);
}

export default function AppLayout() {
  const { user, logout, system, refresh } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('wcai_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const links = [
    { to: '/app', icon: '◫', label: t('nav_dashboard'), end: true },
    { to: '/app/writer', icon: '✎', label: t('nav_writer') },
    { to: '/app/documents', icon: '🗎', label: t('nav_documents') },
    { to: '/app/chat', icon: '💬', label: t('nav_chat') },
    { to: '/app/plans', icon: '◆', label: t('nav_plans') },
    { to: '/app/referral', icon: '🎁', label: t('nav_referral') },
    { to: '/app/api-keys', icon: '🔑', label: t('nav_apikeys') },
    { to: '/app/tickets', icon: '🛟', label: t('nav_tickets') },
    { to: '/app/profile', icon: '👤', label: t('nav_profile') },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <Link to="/app" className="sidebar-logo" onClick={() => setNavOpen(false)}>
          <span className="logo-mark">✦</span>
          <span>{system.site_name || 'WordCraft AI'}</span>
        </Link>
        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setNavOpen(false)}>
              <span className="nav-icon">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
          {user && user.role === 'admin' && (
            <>
              <div className="nav-section">{t('nav_admin')}</div>
              <NavLink to="/admin" className="nav-link" onClick={() => setNavOpen(false)}>
                <span className="nav-icon">⚙</span>
                <span>{t('nav_admin')}</span>
              </NavLink>
            </>
          )}
          <div className="nav-section">{t('nav_blog')}</div>
          <NavLink to="/blog" className="nav-link" onClick={() => setNavOpen(false)}>
            <span className="nav-icon">📰</span>
            <span>{t('nav_blog')}</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{(user?.name || 'U').charAt(0).toUpperCase()}</div>
            <div className="user-chip-info">
              <div className="user-chip-name">{user?.name}</div>
              <div className="user-chip-meta">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="flex items-center gap-12">
            <button className="hamburger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">☰</button>
            <span className="credit-pill" title={t('common_credits')}>⚡ {user?.credits ?? 0} {t('common_credits')}</span>
          </div>
          <div className="topbar-actions">
            <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
              {LANG_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={toggleTheme} aria-label="Theme">◐</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/'); }}>{t('logout')}</button>
          </div>
        </header>
        <main style={{ flex: 1 }}>
          <Outlet context={{ refresh }} />
        </main>
      </div>
      {navOpen && <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 99 }} />}
    </div>
  );
}
