'use strict';
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getTemplate, publicTemplates } = require('../templates');
const { chatComplete, chatStream, AIError } = require('../ai');
const { spendCredits, addCredits, CreditError } = require('../credits');

const router = express.Router();

router.get('/templates', (req, res) => {
  res.json({ templates: publicTemplates() });
});

function validateInputs(template, inputs) {
  const errors = [];
  for (const f of template.fields) {
    if (f.required && !(inputs[f.name] || '').toString().trim()) {
      errors.push(`${f.label} is required.`);
    }
  }
  return errors;
}

function sseInit(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

function sseSend(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post('/generate', auth, async (req, res) => {
  const template = getTemplate(req.body.template_id);
  if (!template) return res.status(400).json({ error: 'Unknown template.' });
  const inputs = req.body.inputs || {};
  const errors = validateInputs(template, inputs);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  try {
    spendCredits(req.user.id, template.cost, 'generation', template.name);
  } catch (e) {
    return res.status(e.status || 402).json({ error: e.message });
  }
  try {
    const { content } = await chatComplete([{ role: 'user', content: template.prompt(inputs) }], {
      maxTokens: template.id === 'blog-article' ? 3500 : 2048,
    });
    let doc = null;
    if (req.body.save) {
      const title = (content.split('\n')[0] || template.name).replace(/^#+\s*/, '').slice(0, 120) || template.name;
      const info = db.prepare('INSERT INTO documents (user_id, title, content, template, meta) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, title, content, template.id, JSON.stringify(inputs));
      doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(info.lastInsertRowid);
    }
    const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
    res.json({ content, document: doc, credits: user.credits });
  } catch (e) {
    addCredits(req.user.id, template.cost, 'refund', `Refund: ${template.name} failed`);
    const status = e instanceof AIError ? e.status : 500;
    res.status(status).json({ error: e.message, refunded: true });
  }
});

router.post('/generate-stream', auth, async (req, res) => {
  const template = getTemplate(req.body.template_id);
  if (!template) return res.status(400).json({ error: 'Unknown template.' });
  const inputs = req.body.inputs || {};
  const errors = validateInputs(template, inputs);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  try {
    spendCredits(req.user.id, template.cost, 'generation', template.name);
  } catch (e) {
    return res.status(e.status || 402).json({ error: e.message });
  }
  sseInit(res);
  try {
    await chatStream(
      [{ role: 'user', content: template.prompt(inputs) }],
      { maxTokens: template.id === 'blog-article' || template.id === 'landing-page' ? 4000 : 2500 },
      (delta) => sseSend(res, 'delta', { text: delta })
    );
    const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
    sseSend(res, 'done', { credits: user.credits });
  } catch (e) {
    addCredits(req.user.id, template.cost, 'refund', `Refund: ${template.name} failed`);
    sseSend(res, 'error', { message: e.message, refunded: true });
  }
  res.end();
});

router.post('/documents', auth, (req, res) => {
  const content = (req.body.content || '').toString();
  if (!content.trim()) return res.status(400).json({ error: 'Content cannot be empty.' });
  const title = (req.body.title || content.split('\n')[0] || 'Untitled').toString().replace(/^#+\s*/, '').slice(0, 200) || 'Untitled';
  const info = db.prepare('INSERT INTO documents (user_id, title, content, template, meta) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, title, content.slice(0, 200000), req.body.template || '', JSON.stringify(req.body.meta || {}));
  res.json({ document: db.prepare('SELECT * FROM documents WHERE id = ?').get(info.lastInsertRowid) });
});

router.get('/documents', auth, (req, res) => {
  const rows = db.prepare('SELECT id, title, template, created_at, updated_at, length(content) as size FROM documents WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200').all(req.user.id);
  res.json({ documents: rows });
});

router.get('/documents/:id', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  res.json({ document: doc });
});

router.put('/documents/:id', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  const title = (req.body.title || doc.title).slice(0, 200);
  const content = req.body.content !== undefined ? String(req.body.content) : doc.content;
  db.prepare("UPDATE documents SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?").run(title, content, doc.id);
  res.json({ document: db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id) });
});

router.delete('/documents/:id', auth, (req, res) => {
  const r = db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (r.changes !== 1) return res.status(404).json({ error: 'Document not found.' });
  res.json({ ok: true });
});

module.exports = router;
