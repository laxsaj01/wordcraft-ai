import React, { useEffect, useState } from 'react';
import { get, post, put, del } from '../../api.js';
import { useI18n } from '../../i18n.jsx';
import { Modal, useToast } from '../../components/ui.jsx';

const EMPTY = { title: '', slug: '', excerpt: '', content: '', cover_url: '', status: 'draft' };

export default function AdminBlog() {
  const { t } = useI18n();
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [edit, setEdit] = useState(null);
  const [isNew, setIsNew] = useState(false);

  async function load() {
    try { setPosts((await get('/admin/posts')).posts); } catch (e) { toast(e.message, 'error'); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    try {
      if (isNew) await post('/admin/posts', edit);
      else await put(`/admin/posts/${edit.id}`, edit);
      setEdit(null);
      load();
      toast('Post saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function remove(p) {
    if (!confirm(t('common_confirm_delete'))) return;
    try { await del(`/admin/posts/${p.id}`); load(); toast('Post deleted', 'success'); } catch (e) { toast(e.message, 'error'); }
  }

  async function toggleStatus(p) {
    const status = p.status === 'published' ? 'draft' : 'published';
    try { await put(`/admin/posts/${p.id}`, { status }); load(); } catch (e) { toast(e.message, 'error'); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('admin_blog')} ({posts.length})</h1>
        <button className="btn btn-primary" onClick={() => { setEdit({ ...EMPTY }); setIsNew(true); }}>＋ {t('admin_new_post')}</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('admin_title')}</th><th>Slug</th><th>{t('common_status')}</th><th>Views</th><th>{t('common_date')}</th><th>{t('common_actions')}</th></tr></thead>
            <tbody>
              {posts.length === 0 && <tr><td colSpan={6} className="muted text-center" style={{ padding: 24 }}>—</td></tr>}
              {posts.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong></td>
                  <td className="mono muted">/{p.slug}</td>
                  <td>
                    <span className={`badge ${p.status === 'published' ? 'badge-success' : 'badge-muted'}`} style={{ cursor: 'pointer' }} onClick={() => toggleStatus(p)}>
                      {p.status === 'published' ? t('admin_published') : t('admin_draft')}
                    </span>
                  </td>
                  <td className="muted">{p.views}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{(p.published_at || p.created_at)?.slice(0, 10)}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEdit({ ...p }); setIsNew(false); }}>{t('common_edit')}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>{t('common_delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <Modal wide title={isNew ? t('admin_new_post') : `${t('common_edit')}: ${edit.title}`} onClose={() => setEdit(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEdit(null)}>{t('common_cancel')}</button>
            <button className="btn btn-primary" onClick={save}>{t('common_save')}</button>
          </>}>
          <div className="field"><label>{t('admin_title')}</label><input className="input" value={edit.title} onChange={(e) => setEdit((p) => ({ ...p, title: e.target.value }))} required /></div>
          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="field"><label>Slug (optional, auto-generated)</label><input className="input mono" value={edit.slug || ''} onChange={(e) => setEdit((p) => ({ ...p, slug: e.target.value }))} disabled={!isNew} /></div>
            <div className="field"><label>Cover image URL (optional)</label><input className="input" value={edit.cover_url || ''} onChange={(e) => setEdit((p) => ({ ...p, cover_url: e.target.value }))} placeholder="https://..." /></div>
          </div>
          <div className="field"><label>{t('admin_excerpt')}</label><input className="input" value={edit.excerpt || ''} onChange={(e) => setEdit((p) => ({ ...p, excerpt: e.target.value }))} maxLength={400} /></div>
          <div className="field"><label>{t('admin_content')}</label>
            <textarea className="textarea textarea-large" value={edit.content} onChange={(e) => setEdit((p) => ({ ...p, content: e.target.value }))} required />
          </div>
          <div className="field"><label>{t('common_status')}</label>
            <select className="select" value={edit.status} onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value }))}>
              <option value="draft">{t('admin_draft')}</option>
              <option value="published">{t('admin_publish')}</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
