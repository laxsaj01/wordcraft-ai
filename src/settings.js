'use strict';
const db = require('./db');

const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

function getSetting(key, fallback = '') {
  const row = getStmt.get(key);
  return row ? row.value : fallback;
}

function getInt(key, fallback = 0) {
  const v = getSetting(key, '');
  if (v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function getFloat(key, fallback = 0) {
  const v = getSetting(key, '');
  if (v === '') return fallback;
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : n;
}

function setSetting(key, value) {
  setStmt.run(key, String(value));
}

function setMany(obj) {
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) setStmt.run(k, String(v));
  });
  tx(Object.entries(obj));
}

function isInstalled() {
  return getSetting('installed', '') === '1';
}

module.exports = { getSetting, getInt, getFloat, setSetting, setMany, isInstalled };
