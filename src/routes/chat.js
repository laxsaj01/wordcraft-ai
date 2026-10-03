'use strict';
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { chatStream, AIError } = require('../ai');
const { spendCredits, addCredits } = require('../credits');
const { getInt, getSetting } = require('../settings');

const router = express.Router();

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

router.get('/chats', auth, (req, res) => {
  res.json({ chats: db.prepare('SELECT * FROM chats WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(req.user.id) });
});

router.post('/chats', auth, (req, res) => {
  const title = (req.body.title || 'New Chat').slice(0, 100);
  const info = db.prepare('INSERT INTO chats (user_id, title) VALUES (?, ?)').run(req.user.id, title);
  res.json({ chat: db.prepare('SELECT * FROM chats WHERE id = ?').get(info.lastInsertRowid) });
});

router.get('/chats/:id', auth, (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });
  res.json({ chat, messages: db.prepare('SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY id ASC').all(chat.id) });
});

router.delete('/chats/:id', auth, (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });
  db.prepare('DELETE FROM chat_messages WHERE chat_id = ?').run(chat.id);
  db.prepare('DELETE FROM chats WHERE id = ?').run(chat.id);
  res.json({ ok: true });
});

router.post('/chats/:id/messages', auth, async (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });
  const text = (req.body.message || '').toString().trim();
  if (!text) return res.status(400).json({ error: 'Message cannot be empty.' });
  if (text.length > 8000) return res.status(400).json({ error: 'Message too long (max 8000 characters).' });

  const cost = Math.max(1, getInt('chat_cost_credits', 1));
  try {
    spendCredits(req.user.id, cost, 'chat', `Chat: ${chat.title}`);
  } catch (e) {
    return res.status(e.status || 402).json({ error: e.message });
  }

  db.prepare('INSERT INTO chat_messages (chat_id, role, content) VALUES (?, ?, ?)').run(chat.id, 'user', text);
  if (chat.title === 'New Chat') {
    db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(text.slice(0, 60), chat.id);
  }

  const systemPrompt = getSetting('chat_system_prompt', 'You are WordCraft AI, a helpful assistant specialized in SEO content, copywriting and marketing. Be concise, practical and accurate. When asked to write content, output clean Markdown.');
  const history = db.prepare('SELECT role, content FROM chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT 20').all(chat.id).reverse();
  const messages = [{ role: 'system', content: systemPrompt }, ...history];

  sseInit(res);
  try {
    const full = await chatStream(messages, { maxTokens: 2048 }, (delta) => sseSend(res, 'delta', { text: delta }));
    db.prepare('INSERT INTO chat_messages (chat_id, role, content) VALUES (?, ?, ?)').run(chat.id, 'assistant', full);
    const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
    sseSend(res, 'done', { credits: user.credits });
  } catch (e) {
    addCredits(req.user.id, cost, 'refund', 'Refund: chat message failed');
    sseSend(res, 'error', { message: e.message, refunded: true });
  }
  res.end();
});

module.exports = router;
