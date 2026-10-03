'use strict';
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { getTemplate, publicTemplates } = require('../templates');
const { chatComplete, AIError } = require('../ai');
const { spendCredits, addCredits } = require('../credits');

const router = express.Router();

function apiKeyAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!key) return res.status(401).json({ error: 'Missing API key. Send Authorization: Bearer <your-key>.' });
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const row = db.prepare('SELECT ak.*, u.plan_id, u.plan_expires FROM api_keys ak JOIN users u ON u.id = ak.user_id WHERE ak.key_hash = ?').get(hash);
  if (!row) return res.status(401).json({ error: 'Invalid API key.' });
  db.prepare("UPDATE api_keys SET last_used = datetime('now') WHERE id = ?").run(row.id);

  const plan = row.plan_id ? db.prepare('SELECT api_access FROM plans WHERE id = ?').get(row.plan_id) : null;
  const planActive = row.plan_expires && new Date(row.plan_expires.replace(' ', 'T') + 'Z') > new Date();
  const hasApiAccess = (plan && plan.api_access === 1 && planActive) ||
    db.prepare('SELECT role FROM users WHERE id = ?').get(row.user_id).role === 'admin';
  if (!hasApiAccess) {
    return res.status(403).json({ error: 'API access requires an active plan with API access enabled (e.g. Business plan).' });
  }
  req.apiUser = db.prepare('SELECT id, email, name, role, credits FROM users WHERE id = ?').get(row.user_id);
  next();
}

router.get('/templates', apiKeyAuth, (req, res) => {
  res.json({ templates: publicTemplates().map((t) => ({ id: t.id, name: t.name, cost: t.cost, fields: t.fields.map((f) => ({ name: f.name, label: f.label, type: f.type, required: f.required })) })) });
});

router.get('/credits', apiKeyAuth, (req, res) => {
  res.json({ credits: req.apiUser.credits });
});

router.post('/generate', apiKeyAuth, async (req, res) => {
  const template = getTemplate(req.body.template);
  if (!template) return res.status(400).json({ error: `Unknown template. GET /api/v1/templates for the list.` });
  const inputs = req.body.inputs || {};
  const missing = template.fields.filter((f) => f.required && !(inputs[f.name] || '').toString().trim());
  if (missing.length) return res.status(400).json({ error: `Missing required inputs: ${missing.map((f) => f.name).join(', ')}` });
  try {
    spendCredits(req.apiUser.id, template.cost, 'api_generation', `API: ${template.name}`);
  } catch (e) {
    return res.status(402).json({ error: e.message });
  }
  try {
    const { content, usage } = await chatComplete([{ role: 'user', content: template.prompt(inputs) }], {
      maxTokens: template.id === 'blog-article' ? 3500 : 2048,
    });
    const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.apiUser.id);
    res.json({ template: template.id, content, credits_used: template.cost, credits_remaining: user.credits, usage });
  } catch (e) {
    addCredits(req.apiUser.id, template.cost, 'refund', 'Refund: API generation failed');
    res.status(e instanceof AIError ? e.status : 500).json({ error: e.message, refunded: true });
  }
});

module.exports = router;
