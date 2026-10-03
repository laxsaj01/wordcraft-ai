import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n, LANG_OPTIONS } from '../i18n.jsx';
import Markdown from '../components/Markdown.jsx';

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('wcai_theme', next);
}

export default function Landing({ pricingAnchor }) {
  const { user, system } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [plans, setPlans] = useState([]);
  const [symbol, setSymbol] = useState('$');
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    get('/plans').then((d) => { setPlans(d.plans); setSymbol(d.currency_symbol || '$'); }).catch(() => {});
    get('/blog').then((d) => setPosts(d.posts.slice(0, 3))).catch(() => {});
    const saved = localStorage.getItem('wcai_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    if (pricingAnchor) {
      setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [pricingAnchor]);

  const siteName = system.site_name || 'WordCraft AI';

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="sidebar-logo" style={{ padding: 0 }}>
          <span className="logo-mark">✦</span>
          <span>{siteName}</span>
        </Link>
        <div className="landing-nav-links">
          <a className="btn btn-ghost btn-sm" href="#features">{t('landing_features').split(' ').slice(0, 3).join(' ')}</a>
          <a className="btn btn-ghost btn-sm" href="#pricing">{t('landing_pricing')}</a>
          <Link className="btn btn-ghost btn-sm" to="/blog">{t('nav_blog')}</Link>
          <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
            {LANG_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={toggleTheme} aria-label="Theme">◐</button>
          {user ? (
            <Link className="btn btn-primary btn-sm" to="/app">{t('nav_dashboard')}</Link>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" to="/login">{t('login')}</Link>
              <Link className="btn btn-primary btn-sm" to="/register">{t('register')}</Link>
            </>
          )}
        </div>
      </nav>

      <header className="hero">
        <h1>{t('landing_hero_title').split('AI')[0]}<span className="grad-text">AI</span></h1>
        <p>{t('landing_hero_sub')}</p>
        <div className="hero-actions">
          <Link className="btn btn-primary btn-lg" to={user ? '/app/writer' : '/register'}>{t('landing_cta_start')}</Link>
          {!user && <Link className="btn btn-secondary btn-lg" to="/login">{t('landing_cta_login')}</Link>}
        </div>
      </header>

      <section className="section" id="features">
        <h2 className="section-title">{t('landing_features')}</h2>
        <div className="grid grid-3 mt-24">
          {[
            { icon: '✎', t: t('landing_f1_t'), d: t('landing_f1_d') },
            { icon: '🔌', t: t('landing_f2_t'), d: t('landing_f2_d') },
            { icon: '🚀', t: t('landing_f3_t'), d: t('landing_f3_d') },
          ].map((f, idx) => (
            <div className="card feature-card" key={idx}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="pricing">
        <h2 className="section-title">{t('landing_pricing')}</h2>
        <p className="section-sub">{siteName}</p>
        <div className="grid grid-3">
          {plans.map((p, idx) => (
            <div className={`card plan-card ${idx === 1 ? 'featured' : ''}`} key={p.id}>
              {idx === 1 && <span className="plan-popular">★ POPULAR</span>}
              <div className="plan-name">{p.name}</div>
              <div className="plan-price">
                {p.price === 0 ? 'Free' : `${symbol}${p.price}`}
                {p.price > 0 && <span className="unit"> / {p.interval === 'once' ? t('plans_once') : p.interval === 'month' ? t('plans_month') : t('plans_year')}</span>}
              </div>
              <div className="plan-credits">⚡ {t('plans_credits', { n: p.credits })}</div>
              <ul className="plan-features">
                {(p.features || []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              <Link className="btn btn-primary btn-block" to={user ? '/app/plans' : `/register`}>
                {t('plans_buy', { name: p.name })}
              </Link>
            </div>
          ))}
          {plans.length === 0 && <div className="empty-state" style={{ gridColumn: '1 / -1' }}>{t('common_loading')}</div>}
        </div>
      </section>

      {posts.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t('blog_title')}</h2>
          <div className="blog-grid mt-24">
            {posts.map((p) => (
              <Link to={`/blog/${p.slug}`} className="card blog-card" key={p.id}>
                <div className="blog-cover">{p.cover_url ? <img src={p.cover_url} alt={p.title} /> : '📰'}</div>
                <div className="blog-card-body">
                  <div className="blog-card-title">{p.title}</div>
                  <div className="blog-card-excerpt">{p.excerpt}</div>
                  <div className="blog-meta"><span>{p.published_at?.slice(0, 10)}</span><span>👁 {p.views}</span></div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="landing-footer">
        © {new Date().getFullYear()} {siteName}. {t('footer_rights')}
      </footer>
    </div>
  );
}
