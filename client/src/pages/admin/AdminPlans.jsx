import React, { useEffect, useState } from 'react';
import { get, post, put, del } from '../../api.js';
import { useI18n } from '../../i18n.jsx';
import { Modal, useToast } from '../../components/ui.jsx';

const EMPTY = { name: '', price: 19, credits: 300, interval: 'month', words_per_generation: 1500, api_access: false, features: '', active: true, sort_order: 0, currency: 'USD' };

export default function AdminPlans() {
  const { t } = useI18n();
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [edit, setEdit] = useState(null);
  const [isNew, setIsNew] = useState(false);

  async function load() {
    try { setPlans((await get('/admin/plans')).plans); } catch (e) { toast(e.message, 'error'); }
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEdit({ ...EMPTY });
    setIsNew(true);
  }
  function openEdit(p) {
    setEdit({ ...p, features: (p.features || []).join('\n') });
    setIsNew(false);
  }

  async function save() {
    const body = { ...edit, price: parseFloat(edit.price) || 0, credits: parseInt(edit.credits, 10) || 0, features: String(edit.features || '').split('\n').map((s) => s.trim()).filter(Boolean) };
    try {
      if (isNew) await post('/admin/plans', body);
      else await put(`/admin/plans/${edit.id}`, body);
      setEdit(null);
      load();
      toast('Plan saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function remove(p) {
    if (!confirm(t('common_confirm_delete'))) return;
    try { await del(`/admin/plans/${p.id}`); load(); toast('Plan deleted', 'success'); } catch (e) { toast(e.message, 'error'); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('admin_plans')}</h1>
        <button className="btn btn-primary" onClick={openNew}>＋ {t('admin_new_post').replace('post', 'plan')}</button>
      </div>
      <div className="grid grid-3">
        {plans.map((p) => (
          <div className="card plan-card" key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
            <div className="flex-between mb-8">
              <div className="plan-name">{p.name}</div>
              <span className={`badge ${p.active ? 'badge-success' : 'badge-muted'}`}>{p.active ? 'active' : 'hidden'}</span>
            </div>
            <div className="plan-price" style={{ fontSize: 30 }}>${p.price}<span className="unit"> / {p.interval}</span></div>
            <div className="plan-credits">⚡ {p.credits} credits {p.api_access ? '· 🔑 API' : ''}</div>
            <ul className="plan-features" style={{ marginBottom: 16 }}>
              {(p.features || []).slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <div className="flex gap-8">
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>{t('common_edit')}</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>{t('common_delete')}</button>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <Modal wide title={isNew ? 'New plan' : `${t('common_edit')}: ${edit.name}`} onClose={() => setEdit(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEdit(null)}>{t('common_cancel')}</button>
            <button className="btn btn-primary" onClick={save}>{t('common_save')}</button>
          </>}>
          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="field"><label>{t('common_name')}</label><input className="input" value={edit.name} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="field"><label>Price</label><input className="input" type="number" min="0" step="0.01" value={edit.price} onChange={(e) => setEdit((p) => ({ ...p, price: e.target.value }))} /></div>
            <div className="field"><label>Credits</label><input className="input" type="number" min="0" value={edit.credits} onChange={(e) => setEdit((p) => ({ ...p, credits: e.target.value }))} /></div>
            <div className="field"><label>Billing interval</label>
              <select className="select" value={edit.interval} onChange={(e) => setEdit((p) => ({ ...p, interval: e.target.value }))}>
                <option value="once">once (credit pack)</option>
                <option value="month">month (subscription)</option>
                <option value="year">year (subscription)</option>
              </select>
            </div>
            <div className="field"><label>Max words per generation (0 = model default)</label><input className="input" type="number" min="0" value={edit.words_per_generation} onChange={(e) => setEdit((p) => ({ ...p, words_per_generation: e.target.value }))} /></div>
            <div className="field"><label>Sort order</label><input className="input" type="number" value={edit.sort_order} onChange={(e) => setEdit((p) => ({ ...p, sort_order: e.target.value }))} /></div>
          </div>
          <div className="field"><label>Features (one per line)</label>
            <textarea className="textarea" value={edit.features} onChange={(e) => setEdit((p) => ({ ...p, features: e.target.value }))} />
          </div>
          <div className="flex gap-12">
            <label className="checkbox-row"><input type="checkbox" checked={!!edit.active} onChange={(e) => setEdit((p) => ({ ...p, active: e.target.checked }))} /> Active (visible)</label>
            <label className="checkbox-row"><input type="checkbox" checked={!!edit.api_access} onChange={(e) => setEdit((p) => ({ ...p, api_access: e.target.checked }))} /> Includes API access</label>
          </div>
        </Modal>
      )}
    </div>
  );
}
