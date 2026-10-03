import React, { useEffect, useState } from 'react';
import { get, del } from '../api.js';
import { useI18n } from '../i18n.jsx';
import Markdown from '../components/Markdown.jsx';
import { Modal, useToast } from '../components/ui.jsx';

export default function Documents() {
  const { t } = useI18n();
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const d = await get('/documents');
      setDocs(d.documents);
    } catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openDoc(d) {
    try {
      const data = await get(`/documents/${d.id}`);
      setOpen(data.document);
    } catch (e) { toast(e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm(t('common_confirm_delete'))) return;
    try {
      await del(`/documents/${id}`);
      setOpen(null);
      load();
      toast('Deleted', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('docs_title')}</h1>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {loading && <div className="empty-state">{t('common_loading')}</div>}
        {!loading && docs.length === 0 && (
          <div className="empty-state"><div className="icon">🗎</div>{t('docs_empty')}</div>
        )}
        {!loading && docs.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('admin_title')}</th><th>Template</th><th>Updated</th><th>{t('common_actions')}</th></tr></thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td style={{ maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</td>
                    <td><span className="badge badge-info">{d.template || '—'}</span></td>
                    <td className="muted">{d.updated_at?.slice(0, 16)}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-secondary btn-sm" onClick={() => openDoc(d)}>{t('docs_open')}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(d.id)}>{t('common_delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <Modal wide title={open.title} onClose={() => setOpen(null)}
          footer={<button className="btn btn-danger btn-sm" onClick={() => remove(open.id)}>{t('common_delete')}</button>}>
          <Markdown content={open.content} />
        </Modal>
      )}
    </div>
  );
}
