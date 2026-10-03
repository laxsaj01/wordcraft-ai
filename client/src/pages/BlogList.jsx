import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useI18n, LANG_OPTIONS } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';

export default function BlogList() {
  const { t, lang, setLang } = useI18n();
  const { user, system } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ posts: [], page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const page = parseInt(params.get('page'), 10) || 1;

  useEffect(() => {
    setLoading(true);
    get(`/blog?page=${page}`).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [page]);

  return (
    <div className="landing" style={{ minHeight: '100vh' }}>
      <nav className="landing-nav">
        <Link to="/" className="sidebar-logo" style={{ padding: 0 }}>
          <span className="logo-mark">✦</span>
          <span>{system.site_name || 'WordCraft AI'}</span>
        </Link>
        <div className="landing-nav-links">
          <Link className="btn btn-ghost btn-sm" to="/">{t('common_back')}</Link>
          <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANG_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
          {user ? (
            <Link className="btn btn-primary btn-sm" to="/app">{t('nav_dashboard')}</Link>
          ) : (
            <Link className="btn btn-primary btn-sm" to="/login">{t('login')}</Link>
          )}
        </div>
      </nav>

      <div className="section">
        <h1 className="section-title">{t('blog_title')}</h1>
        <p className="section-sub">{system.site_name}</p>
        {loading && <div className="empty-state">{t('common_loading')}</div>}
        {!loading && data.posts.length === 0 && <div className="empty-state"><div className="icon">📰</div>{t('blog_empty')}</div>}
        <div className="blog-grid">
          {data.posts.map((p) => (
            <Link to={`/blog/${p.slug}`} className="card blog-card" key={p.id}>
              <div className="blog-cover">{p.cover_url ? <img src={p.cover_url} alt={p.title} /> : '📰'}</div>
              <div className="blog-card-body">
                <div className="blog-card-title">{p.title}</div>
                <div className="blog-card-excerpt">{p.excerpt}</div>
                <div className="blog-meta">
                  <span>{p.published_at?.slice(0, 10)}</span>
                  <span>👁 {p.views}</span>
                </div>
                <span className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>{t('blog_read_more')} →</span>
              </div>
            </Link>
          ))}
        </div>
        {data.pages > 1 && (
          <div className="pagination">
            {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`btn btn-sm ${n === data.page ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setParams({ page: String(n) })}>{n}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
