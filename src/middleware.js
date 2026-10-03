'use strict';
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');
const { getSetting, setSetting } = require('./settings');

function jwtSecret() {
  let s = getSetting('jwt_secret', '');
  if (!s) {
    s = crypto.randomBytes(32).toString('hex');
    setSetting('jwt_secret', s);
  }
  return s;
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret(), { expiresIn: '7d' });
}

function requireInstall(req, res, next) {
  if (getSetting('installed', '') !== '1') {
    return res.status(503).json({ error: 'not_installed' });
  }
  next();
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, jwtSecret());
    const user = db.prepare('SELECT id, email, name, role, credits, referral_code, referred_by, plan_id, plan_expires, status, created_at FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account is suspended.' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

function makeReferralCode(name, id) {
  const base = (name || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'USER';
  return `${base}${String(id).padStart(4, '0')}${crypto.randomInt(10, 99)}`;
}

module.exports = { signToken, auth, adminOnly, requireInstall, makeReferralCode, jwtSecret };
