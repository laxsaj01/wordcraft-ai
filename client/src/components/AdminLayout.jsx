import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

export default function AdminLayout() {
  const { user, logout, system } = useAuth();
  const { t } = useI18n();
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('wcai_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const links = [
    { to: '/admin', icon: '◫', label: t('admin_dashboard'), end: true },
    { to: '/admin/users', icon: '👥', label: t('admin_users') },
    { to: '/admin/plans', icon: '◆', label: t('admin_plans') },
    { to: '/admin/payments', icon: '💳', label: t('admin_payments') },
    { to: '/admin/blog', icon: '📰', label: t('admin_blog') },
    { to: '/admin/tickets', icon: '🛟', label: t('admin_tickets') },
    { to: '/admin/settings', icon: '⚙', label: t('admin_settings') },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <Link to="/admin" className="sidebar-logo" onClick={() => setNavOpen(false)}>
          <span className="logo-mark">⚙</span>
          <span>{t('nav_admin')}</span>
        </Link>
        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setNavOpen(false)}>
              <span className="nav-icon">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
          <div className="nav-section">App</div>
          <NavLink to="/app" className="nav-link" onClick={() => setNavOpen(false)}>
            <span className="nav-icon">↩</span>
            <span>{t('nav_dashboard')}</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{(user?.name || 'A').charAt(0).toUpperCase()}</div>
            <div className="user-chip-info">
              <div className="user-chip-name">{user?.name}</div>
              <div className="user-chip-meta">Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="flex items-center gap-12">
            <button className="hamburger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">☰</button>
            <strong style={{ fontSize: 15 }}>{system.site_name || 'WordCraft AI'} — Admin</strong>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/'); }}>{t('logout')}</button>
          </div>
        </header>
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>
      {navOpen && <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 99 }} />}
    </div>
  );
}
