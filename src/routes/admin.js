'use strict';
const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware');
const { getSetting, setMany } = require('../settings');
const { addCredits } = require('../credits');

const router = express.Router();
router.use(auth, adminOnly);

const SETTINGS_KEYS = [
  'site_name', 'site_tagline', 'site_url', 'currency', 'currency_symbol',
  'ai_base_url', 'ai_api_key', 'ai_model', 'ai_max_tokens', 'ai_temperature',
  'chat_system_prompt', 'chat_cost_credits',
  'signup_enabled', 'signup_bonus_credits',
  'referral_reward_percent', 'referral_credits_per_unit',
  'paypal_mode', 'paypal_client_id', 'paypal_secret',
  'stripe_secret_key',
  'footer_text',
];

router.get('/stats', (req, res) => {
  const users = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'user'").get().c;
  const newToday = db.prepare("SELECT COUNT(*) c FROM users WHERE date(created_at) = date('now')").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(amount), 0) s FROM payments WHERE status = 'paid'").get().s;
  const revenueMonth = db.prepare("SELECT COALESCE(SUM(amount), 0) s FROM payments WHERE status = 'paid' AND created_at >= datetime('now', '-30 days')").get().s;
  const creditsSpent = db.prepare('SELECT COALESCE(-SUM(amount), 0) s FROM credit_transactions WHERE amount < 0').get().s;
  const documents = db.prepare('SELECT COUNT(*) c FROM documents').get().c;
  const activeSubs = db.prepare("SELECT COUNT(*) c FROM users WHERE plan_id IS NOT NULL AND plan_expires > datetime('now')").get().c;
  const openTickets = db.prepare("SELECT COUNT(*) c FROM tickets WHERE status = 'open'").get().c;
  const dailyRevenue = db.prepare("SELECT date(created_at) d, SUM(amount) s, COUNT(*) n FROM payments WHERE status = 'paid' AND created_at >= datetime('now', '-29 days') GROUP BY date(created_at) ORDER BY d ASC").all();
  const dailySignups = db.prepare("SELECT date(created_at) d, COUNT(*) n FROM users WHERE created_at >= datetime('now', '-29 days') GROUP BY date(created_at) ORDER BY d ASC").all();
  const recentUsers = db.prepare("SELECT id, name, email, credits, created_at FROM users WHERE role = 'user' ORDER BY id DESC LIMIT 8").all();
  res.json({ users, new_today: newToday, revenue, revenue_month: revenueMonth, credits_spent: creditsSpent, documents, active_subs: activeSubs, open_tickets: openTickets, daily_revenue: dailyRevenue, daily_signups: dailySignups, recent_users: recentUsers });
});

router.get('/users', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const rows = q
    ? db.prepare('SELECT id, email, name, role, credits, status, plan_id, plan_expires, created_at FROM users WHERE email LIKE ? OR name LIKE ? ORDER BY id DESC LIMIT 200').all(`%${q}%`, `%${q}%`)
    : db.prepare('SELECT id, email, name, role, credits, status, plan_id, plan_expires, created_at FROM users ORDER BY id DESC LIMIT 200').all();
  res.json({ users: rows });
});

router.put('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { credits, status, role } = req.body || {};
  if (credits !== undefined) {
    const target = Math.max(0, parseInt(credits, 10) || 0);
    const diff = target - user.credits;
    if (diff !== 0) addCredits(user.id, diff, 'admin_adjust', 'Adjusted by admin');
  }
  if (status && ['active', 'suspended'].includes(status) && user.role !== 'admin') {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, user.id);
  }
  if (role && ['user', 'admin'].includes(role) && user.id !== req.user.id) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  }
  res.json({ user: db.prepare('SELECT id, email, name, role, credits, status, plan_id, plan_expires, created_at FROM users WHERE id = ?').get(user.id) });
});

router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Admin accounts cannot be deleted.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  const tx = db.transaction(() => {
    for (const t of ['credit_transactions', 'api_keys', 'documents', 'tickets', 'payments']) {
      db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(user.id);
    }
    db.prepare('DELETE FROM chat_messages WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?)').run(user.id);
    db.prepare('DELETE FROM chats WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM ticket_messages WHERE ticket_id NOT IN (SELECT id FROM tickets)').run();
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  });
  tx();
  res.json({ ok: true });
});

router.get('/plans', (req, res) => {
  res.json({ plans: db.prepare('SELECT * FROM plans ORDER BY sort_order ASC, id ASC').all().map((p) => ({ ...p, features: JSON.parse(p.features || '[]') })) });
});

router.post('/plans', (req, res) => {
  const { name, price, credits, interval, words_per_generation, api_access, features, active, sort_order, currency } = req.body || {};
  if (!name || !(price >= 0) || !(credits >= 0)) return res.status(400).json({ error: 'name, price and credits are required.' });
  if (!['once', 'month', 'year'].includes(interval)) return res.status(400).json({ error: 'interval must be once, month or year.' });
  const info = db.prepare('INSERT INTO plans (name, price, currency, credits, interval, words_per_generation, api_access, features, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(name, price, currency || getSetting('currency', 'USD'), credits, interval, words_per_generation || 0, api_access ? 1 : 0, JSON.stringify(features || []), active === 0 ? 0 : 1, sort_order || 0);
  res.json({ plan: db.prepare('SELECT * FROM plans WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/plans/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found.' });
  const b = req.body || {};
  db.prepare('UPDATE plans SET name = ?, price = ?, currency = ?, credits = ?, interval = ?, words_per_generation = ?, api_access = ?, features = ?, active = ?, sort_order = ? WHERE id = ?')
    .run(
      b.name !== undefined ? b.name : plan.name,
      b.price !== undefined ? b.price : plan.price,
      b.currency !== undefined ? b.currency : plan.currency,
      b.credits !== undefined ? b.credits : plan.credits,
      b.interval !== undefined && ['once', 'month', 'year'].includes(b.interval) ? b.interval : plan.interval,
      b.words_per_generation !== undefined ? b.words_per_generation : plan.words_per_generation,
      b.api_access !== undefined ? (b.api_access ? 1 : 0) : plan.api_access,
      b.features !== undefined ? JSON.stringify(b.features) : plan.features,
      b.active !== undefined ? (b.active ? 1 : 0) : plan.active,
      b.sort_order !== undefined ? b.sort_order : plan.sort_order,
      plan.id
    );
  res.json({ plan: db.prepare('SELECT * FROM plans WHERE id = ?').get(plan.id) });
});

router.delete('/plans/:id', (req, res) => {
  const r = db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
  if (r.changes !== 1) return res.status(404).json({ error: 'Plan not found.' });
  res.json({ ok: true });
});

router.get('/payments', (req, res) => {
  res.json({ payments: db.prepare('SELECT p.*, u.email, u.name, pl.name as plan_name FROM payments p JOIN users u ON u.id = p.user_id LEFT JOIN plans pl ON pl.id = p.plan_id ORDER BY p.id DESC LIMIT 300').all() });
});

router.get('/posts', (req, res) => {
  res.json({ posts: db.prepare('SELECT * FROM blog_posts ORDER BY id DESC LIMIT 200').all() });
});

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').slice(0, 90) || `post-${Date.now()}`;
}

router.post('/posts', (req, res) => {
  const { title, excerpt, content, cover_url, status } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content are required.' });
  let slug = slugify(req.body.slug || title);
  if (db.prepare('SELECT id FROM blog_posts WHERE slug = ?').get(slug)) slug = `${slug}-${Date.now().toString(36)}`;
  const info = db.prepare("INSERT INTO blog_posts (title, slug, excerpt, content, cover_url, status, author_id, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN datetime('now') ELSE NULL END)")
    .run(title.slice(0, 200), slug, (excerpt || '').slice(0, 400), content, cover_url || '', status === 'published' ? 'published' : 'draft', req.user.id, status);
  res.json({ post: db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/posts/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  const b = req.body || {};
  const status = b.status !== undefined ? (b.status === 'published' ? 'published' : 'draft') : post.status;
  db.prepare('UPDATE blog_posts SET title = ?, excerpt = ?, content = ?, cover_url = ?, status = ?, published_at = COALESCE(published_at, CASE WHEN ? = \'published\' THEN datetime(\'now\') ELSE NULL END) WHERE id = ?')
    .run(
      b.title !== undefined ? b.title.slice(0, 200) : post.title,
      b.excerpt !== undefined ? b.excerpt.slice(0, 400) : post.excerpt,
      b.content !== undefined ? b.content : post.content,
      b.cover_url !== undefined ? b.cover_url : post.cover_url,
      status, status, post.id
    );
  res.json({ post: db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(post.id) });
});

router.delete('/posts/:id', (req, res) => {
  const r = db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);
  if (r.changes !== 1) return res.status(404).json({ error: 'Post not found.' });
  res.json({ ok: true });
});

router.put('/tickets/:id/status', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  const status = req.body.status;
  if (!['open', 'answered', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, ticket.id);
  res.json({ ok: true });
});

router.get('/settings', (req, res) => {
  const out = {};
  for (const k of SETTINGS_KEYS) out[k] = getSetting(k, '');
  res.json({ settings: out });
});

router.put('/settings', (req, res) => {
  const updates = {};
  for (const k of SETTINGS_KEYS) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  setMany(updates);
  res.json({ ok: true });
});

module.exports = router;
