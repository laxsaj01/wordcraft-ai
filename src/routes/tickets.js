'use strict';
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const rows = req.user.role === 'admin'
    ? db.prepare("SELECT t.*, u.name as user_name, u.email as user_email FROM tickets t JOIN users u ON u.id = t.user_id ORDER BY t.updated_at DESC LIMIT 200").all()
    : db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100').all(req.user.id);
  res.json({ tickets: rows });
});

router.post('/', auth, (req, res) => {
  const subject = (req.body.subject || '').toString().trim();
  const message = (req.body.message || '').toString().trim();
  if (!subject) return res.status(400).json({ error: 'Subject is required.' });
  if (!message) return res.status(400).json({ error: 'Message is required.' });
  const open = db.prepare("SELECT COUNT(*) c FROM tickets WHERE user_id = ? AND status = 'open'").get(req.user.id).c;
  if (open >= 5) return res.status(400).json({ error: 'You have too many open tickets. Please wait for a reply first.' });
  const tx = db.transaction(() => {
    const info = db.prepare('INSERT INTO tickets (user_id, subject) VALUES (?, ?)').run(req.user.id, subject.slice(0, 150));
    db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, is_admin, message) VALUES (?, ?, 0, ?)').run(info.lastInsertRowid, req.user.id, message.slice(0, 5000));
    return info.lastInsertRowid;
  });
  const id = tx();
  res.json({ ticket: db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) });
});

router.get('/:id', auth, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  const messages = db.prepare('SELECT tm.*, u.name, u.role FROM ticket_messages tm JOIN users u ON u.id = tm.user_id WHERE tm.ticket_id = ? ORDER BY tm.id ASC').all(ticket.id);
  res.json({ ticket, messages });
});

router.post('/:id/replies', auth, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && ticket.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });
  const message = (req.body.message || '').toString().trim();
  if (!message) return res.status(400).json({ error: 'Message cannot be empty.' });
  db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, is_admin, message) VALUES (?, ?, ?, ?)')
    .run(ticket.id, req.user.id, isAdmin ? 1 : 0, message.slice(0, 5000));
  const newStatus = isAdmin ? 'answered' : (ticket.status === 'answered' ? 'open' : ticket.status);
  db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, ticket.id);
  res.json({ ok: true });
});

module.exports = router;
