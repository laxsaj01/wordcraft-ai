import React, { useEffect, useState } from 'react';
import { get, post, del } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Modal, useToast, copyText } from '../components/ui.jsx';

export default function ApiKeys() {
  const { t } = useI18n();
  const toast = useToast();
  const [keys, setKeys] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [name, setName] = useState('');

  async function load() {
    try { setKeys((await get('/api-keys')).keys); } catch (e) { toast(e.message, 'error'); }
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    try {
      const d = await post('/api-keys', { name: name || 'API Key' });
      setNewKey(d.key);
      setName('');
      load();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm(t('common_confirm_delete'))) return;
    try { await del(`/api-keys/${id}`); load(); } catch (e) { toast(e.message, 'error'); }
  }

  const endpoint = `${window.location.origin}/api/v1`;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('api_title')}</h1>
          <div className="page-sub">{t('api_sub')}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setNewKey(null); }}>＋ {t('api_create')}</button>
      </div>

      <div className="card mb-24">
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>{t('api_endpoint')}</h3>
        <pre className="md"><code>{`POST ${endpoint}/generate
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "template": "blog-article",
  "inputs": { "keyword": "best crm software", "tone": "Professional" }
}`}</code></pre>
        <p className="muted" style={{ fontSize: 13 }}>GET {endpoint}/templates · GET {endpoint}/credits — full reference in the Documentation folder.</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('common_name')}</th><th>Key</th><th>Last used</th><th>Created</th><th>{t('common_actions')}</th></tr></thead>
            <tbody>
              {keys.length === 0 && <tr><td colSpan={5} className="muted text-center" style={{ padding: 24 }}>—</td></tr>}
              {keys.map((k) => (
                <tr key={k.id}>
                  <td><strong>{k.name}</strong></td>
                  <td className="mono">{k.prefix}••••••••••••••••</td>
                  <td className="muted">{k.last_used || 'never'}</td>
                  <td className="muted">{k.created_at?.slice(0, 10)}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(k.id)}>{t('common_delete')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal title={t('api_create')} onClose={() => setShowCreate(false)}>
          {newKey ? (
            <>
              <div className="alert alert-warning">⚠ {t('api_warning')}</div>
              <div className="ref-link-box">
                <input className="input mono" readOnly value={newKey} onFocus={(e) => e.target.select()} />
                <button className="btn btn-primary" onClick={() => { copyText(newKey); toast(t('common_copied'), 'success'); }}>📋</button>
              </div>
            </>
          ) : (
            <form onSubmit={create}>
              <div className="field">
                <label>{t('api_key_name')}</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My integration" />
              </div>
              <button className="btn btn-primary btn-block" type="submit">{t('api_create')}</button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
