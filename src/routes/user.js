'use strict';
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { auth } = require('../middleware');
const { transactions } = require('../credits');
const { getSetting } = require('../settings');

const router = express.Router();

router.put('/profile', auth, (req, res) => {
  const name = (req.body.name || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Name cannot be empty.' });
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.slice(0, 100), req.user.id);
  res.json({ ok: true, name });
});

router.get('/transactions', auth, (req, res) => {
  res.json({ transactions: transactions(req.user.id, 100) });
});

router.get('/referral', auth, (req, res) => {
  const referred = db.prepare('SELECT id, name, email, created_at FROM users WHERE referred_by = ? ORDER BY id DESC').all(req.user.id);
  const earned = db.prepare("SELECT COALESCE(SUM(amount), 0) s FROM credit_transactions WHERE user_id = ? AND type = 'referral'").get(req.user.id).s;
  const base = getSetting('site_url', '') || '';
  res.json({
    code: req.user.referral_code,
    link: base ? `${base.replace(/\/+$/, '')}/register?ref=${req.user.referral_code}` : `/register?ref=${req.user.referral_code}`,
    reward_percent: parseInt(getSetting('referral_reward_percent', '0'), 10) || 0,
    referred_count: referred.length,
    earned_credits: earned,
    referred: referred.map((r) => ({ name: r.name, email: r.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'), joined: r.created_at })),
  });
});

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

router.get('/api-keys', auth, (req, res) => {
  res.json({ keys: db.prepare('SELECT id, name, prefix, last_used, created_at FROM api_keys WHERE user_id = ? ORDER BY id DESC').all(req.user.id) });
});

router.post('/api-keys', auth, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) c FROM api_keys WHERE user_id = ?').get(req.user.id).c;
  if (count >= 10) return res.status(400).json({ error: 'Maximum of 10 API keys reached. Delete an old key first.' });
  const name = (req.body.name || 'API Key').toString().slice(0, 50);
  const key = 'wc_' + crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO api_keys (user_id, name, key_hash, prefix) VALUES (?, ?, ?, ?)')
    .run(req.user.id, name, hashKey(key), key.slice(0, 11));
  res.json({ key, name });
});

router.delete('/api-keys/:id', auth, (req, res) => {
  const r = db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (r.changes !== 1) return res.status(404).json({ error: 'Key not found.' });
  res.json({ ok: true });
});

module.exports = router;
