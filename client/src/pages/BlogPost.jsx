import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import Markdown from '../components/Markdown.jsx';

export default function BlogPost() {
  const { slug } = useParams();
  const { t } = useI18n();
  const { system } = useAuth();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    get(`/blog/${slug}`).then((d) => setPost(d.post)).catch(() => setNotFound(true));
  }, [slug]);

  return (
    <div className="landing" style={{ minHeight: '100vh' }}>
      <nav className="landing-nav">
        <Link to="/" className="sidebar-logo" style={{ padding: 0 }}>
          <span className="logo-mark">✦</span>
          <span>{system.site_name || 'WordCraft AI'}</span>
        </Link>
        <div className="landing-nav-links">
          <Link className="btn btn-ghost btn-sm" to="/blog">← {t('blog_title')}</Link>
        </div>
      </nav>
      <div className="section blog-post-page">
        {notFound && <div className="empty-state"><div className="icon">🔍</div>Post not found. <Link to="/blog">{t('common_back')}</Link></div>}
        {post && (
          <article>
            <h1>{post.title}</h1>
            <div className="blog-meta mb-24">
              <span>✍ {post.author_name}</span>
              <span>📅 {post.published_at?.slice(0, 10)}</span>
              <span>👁 {post.views} views</span>
            </div>
            {post.cover_url && <img src={post.cover_url} alt={post.title} style={{ width: '100%', borderRadius: 12, marginBottom: 24 }} />}
            <Markdown content={post.content} />
          </article>
        )}
      </div>
    </div>
  );
}
