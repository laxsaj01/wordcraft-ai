import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { get, post, sseStream } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import Markdown, { renderMarkdown } from '../components/Markdown.jsx';
import { useToast, copyText } from '../components/ui.jsx';

const ICONS = {
  article: '📝', cart: '🛒', search: '🔍', ads: '📢', social: '📱', mail: '✉️',
  rewrite: '♻️', summary: '📋', grammar: '✅', keyword: '🔑', faq: '❓', landing: '🚀',
};

export default function Writer() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useOutletContext() || {};
  const { t } = useI18n();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [inputs, setInputs] = useState({});
  const [content, setContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savedDocId, setSavedDocId] = useState(null);
  const abortRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    get('/templates').then((d) => {
      setTemplates(d.templates);
      const initial = d.templates.find((x) => x.id === templateId) || null;
      if (initial) {
        setSelected(initial);
        setInputs(defaultInputs(initial));
      }
    }).catch(() => {});
  }, [templateId]);

  function defaultInputs(tpl) {
    const o = {};
    for (const f of tpl.fields) o[f.name] = f.default || '';
    return o;
  }

  function selectTemplate(tpl) {
    setSelected(tpl);
    setInputs(defaultInputs(tpl));
    setContent('');
    setEditing(false);
    setSavedDocId(null);
    navigate(`/app/writer/${tpl.id}`, { replace: true });
  }

  async function generate() {
    if (!selected) return;
    const missing = selected.fields.filter((f) => f.required && !(inputs[f.name] || '').toString().trim());
    if (missing.length) {
      toast(`${missing.map((f) => f.label).join(', ')} — required.`, 'error');
      return;
    }
    if ((user?.credits ?? 0) < selected.cost) {
      toast(t('error_not_enough_credits'), 'error');
      return;
    }
    setContent('');
    setEditing(false);
    setSavedDocId(null);
    setGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;

    if (selected.stream) {
      await sseStream('/generate-stream', { template_id: selected.id, inputs }, {
        signal: controller.signal,
        onDelta: (text) => setContent((c) => c + text),
        onDone: () => { setGenerating(false); refreshUser(); },
        onError: (err) => { setGenerating(false); toast(err.message, 'error'); refreshUser(); },
      }).catch((e) => {
        if (e.name !== 'AbortError') toast(e.message, 'error');
        setGenerating(false);
      });
    } else {
      try {
        const data = await post('/generate', { template_id: selected.id, inputs, save: false });
        setContent(data.content);
        refreshUser();
      } catch (e) {
        toast(e.message, 'error');
        refreshUser();
      }
      setGenerating(false);
    }
    abortRef.current = null;
  }

  function refreshUser() {
    if (refresh) refresh();
  }

  function stop() {
    if (abortRef.current) abortRef.current.abort();
    setGenerating(false);
  }

  function download(ext) {
    const filename = (content.split('\n')[0] || 'document').replace(/^#+\s*/, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 60) || 'document';
    let blob;
    if (ext === 'html') {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title></head><body>${renderMarkdown(content)}</body></html>`;
      blob = new Blob([html], { type: 'text/html' });
    } else {
      blob = new Blob([content], { type: 'text/plain' });
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('writer_title')}</h1>
          <div className="page-sub">{t('writer_choose')}</div>
        </div>
      </div>

      <div className="template-grid">
        {templates.map((tpl) => (
          <div key={tpl.id} className={`template-card ${selected?.id === tpl.id ? 'selected' : ''}`} onClick={() => selectTemplate(tpl)}>
            <span className="t-icon">{ICONS[tpl.icon] || '✨'}</span>
            <span className="t-name">{tpl.name}</span>
            <span className="t-cost">{t('writer_cost', { n: tpl.cost })}</span>
          </div>
        ))}
      </div>

      {selected && (
        <div className="studio">
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>{ICONS[selected.icon] || '✨'} {selected.name}</h3>
            <p className="muted mb-16" style={{ fontSize: 13 }}>{selected.tagline}</p>
            {selected.fields.map((f) => (
              <div className="field" key={f.name}>
                <label>{f.label}{f.required && <span style={{ color: 'var(--danger)' }}> *</span>}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    className={`textarea ${f.large ? 'textarea-large' : ''}`}
                    value={inputs[f.name] || ''}
                    onChange={(e) => setInputs((i) => ({ ...i, [f.name]: e.target.value }))}
                    placeholder={f.placeholder || ''}
                    disabled={generating}
                  />
                ) : f.type === 'select' ? (
                  <select
                    className="select"
                    value={inputs[f.name] || f.default || ''}
                    onChange={(e) => setInputs((i) => ({ ...i, [f.name]: e.target.value }))}
                    disabled={generating}
                  >
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    className="input"
                    type="text"
                    value={inputs[f.name] || ''}
                    onChange={(e) => setInputs((i) => ({ ...i, [f.name]: e.target.value }))}
                    placeholder={f.placeholder || ''}
                    disabled={generating}
                  />
                )}
              </div>
            ))}
            <div className="flex gap-8 mt-8">
              <button className="btn btn-primary btn-block btn-lg" onClick={generate} disabled={generating}>
                {generating ? <><span className="spinner" /> {t('writer_generating')}</> : `✨ ${t('writer_generate')} (${selected.cost} ⚡)`}
              </button>
              {generating && <button className="btn btn-danger" onClick={stop}>{t('writer_stop')}</button>}
            </div>
          </div>

          <div className="card result-pane" ref={resultRef}>
            <div className="result-toolbar">
              {content && (
                <>
                  <span className="badge badge-muted" style={{ alignSelf: 'center', marginInlineEnd: 'auto' }}>{t('writer_words', { n: wordCount })}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing((e) => !e)}>
                    {editing ? '👁 Preview' : `✏️ ${t('common_edit')}`}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { copyText(content); toast(t('common_copied'), 'success'); }}>
                    📋 {t('common_copy')}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => download('md')}>⬇ .md</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => download('txt')}>⬇ .txt</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => download('html')}>⬇ .html</button>
                  <button className="btn btn-primary btn-sm" disabled={!!savedDocId} onClick={async () => {
                    try {
                      const data = await post('/documents', { content, template: selected.id, meta: inputs });
                      setSavedDocId(data.document?.id);
                      toast(t('writer_save_doc') + ' ✓', 'success');
                    } catch (e) { toast(e.message, 'error'); }
                  }}>💾 {savedDocId ? '✓ Saved' : t('writer_save_doc')}</button>
                </>
              )}
            </div>
            {!content && !generating && (
              <div className="result-placeholder">
                <div className="big">✨</div>
                <div>{t('writer_result')}</div>
                <div style={{ fontSize: 13 }}>Fill in the form and press Generate</div>
              </div>
            )}
            {(content || generating) && (
              editing ? (
                <textarea className="result-textarea" value={content} onChange={(e) => setContent(e.target.value)} />
              ) : (
                <div className={`result-body ${generating ? 'typing-cursor' : ''}`}>
                  <Markdown content={content} />
                </div>
              )
            )}
            {generating && content.length === 0 && <div className="muted text-center mt-24"><span className="spinner spinner-dark" /> {t('writer_generating')}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
