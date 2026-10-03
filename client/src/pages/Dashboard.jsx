import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { refresh } = useOutletContext();
  const [docs, setDocs] = useState([]);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    get('/documents').then((d) => setDocs(d.documents.slice(0, 6))).catch(() => {});
    get('/chats').then((d) => setChats(d.chats)).catch(() => {});
    refresh();
  }, [refresh]);

  const planActive = user?.plan_expires && new Date(user.plan_expires.replace(' ', 'T') + 'Z') > new Date();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dash_welcome', { name: user?.name?.split(' ')[0] || '' })}</h1>
        </div>
        <Link to="/app/writer" className="btn btn-primary">✎ {t('nav_writer')}</Link>
      </div>

      <div className="grid grid-4 mb-24">
        <div className="card stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{user?.credits ?? 0}</div>
          <div className="stat-label">{t('dash_credits')}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">🗎</div>
          <div className="stat-value">{docs.length}</div>
          <div className="stat-label">{t('dash_docs')}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-value">{chats.length}</div>
          <div className="stat-label">{t('dash_chats')}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">◆</div>
          <div className="stat-value" style={{ fontSize: 18, paddingTop: 8 }}>{planActive ? `#${user.plan_id}` : t('dash_no_plan')}</div>
          <div className="stat-label">{t('dash_plan')} {!planActive && <Link to="/app/plans" style={{ fontSize: 12 }}>({t('dash_upgrade')})</Link>}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 16 }}>{t('dash_quick')}</h3>
          </div>
          <div className="grid grid-2" style={{ gap: 10 }}>
            <Link to="/app/writer" className="btn btn-secondary">✎ {t('nav_writer')}</Link>
            <Link to="/app/chat" className="btn btn-secondary">💬 {t('nav_chat')}</Link>
            <Link to="/app/plans" className="btn btn-secondary">◆ {t('nav_plans')}</Link>
            <Link to="/app/referral" className="btn btn-secondary">🎁 {t('nav_referral')}</Link>
          </div>
        </div>
        <div className="card">
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: 16 }}>{t('dash_recent_docs')}</h3>
            <Link to="/app/documents" className="btn btn-ghost btn-sm">{t('docs_open')} →</Link>
          </div>
          {docs.length === 0 && <div className="empty-state" style={{ padding: 20 }}>{t('docs_empty')}</div>}
          {docs.map((d) => (
            <div key={d.id} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🗎 {d.title}</span>
              <span className="muted" style={{ fontSize: 12, flexShrink: 0 }}>{d.updated_at?.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
