'use strict';
const db = require('./db');
const { getInt } = require('./settings');

class CreditError extends Error {
  constructor(message) {
    super(message);
    this.status = 402;
  }
}

const getUser = db.prepare('SELECT id, credits FROM users WHERE id = ?');
const debitStmt = db.prepare('UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?');
const creditStmt = db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?');
const txnStmt = db.prepare('INSERT INTO credit_transactions (user_id, amount, balance_after, type, note) VALUES (?, ?, ?, ?, ?)');

function requireCredits(userId, amount) {
  const user = getUser.get(userId);
  if (!user) throw new CreditError('User not found.');
  if (user.credits < amount) {
    throw new CreditError(`Not enough credits. You need ${amount} but have ${user.credits}. Please upgrade your plan or buy credits.`);
  }
}

function spendCredits(userId, amount, type, note) {
  const tx = db.transaction(() => {
    requireCredits(userId, amount);
    const r = debitStmt.run(amount, userId, amount);
    if (r.changes !== 1) throw new CreditError('Not enough credits.');
    const after = getUser.get(userId).credits;
    txnStmt.run(userId, -amount, after, type, note || '');
    return after;
  });
  return tx();
}

function addCredits(userId, amount, type, note) {
  const tx = db.transaction(() => {
    creditStmt.run(amount, userId);
    const after = getUser.get(userId).credits;
    txnStmt.run(userId, amount, after, type, note || '');
    return after;
  });
  return tx();
}

function signupBonus(userId) {
  const bonus = getInt('signup_bonus_credits', 0);
  if (bonus > 0) addCredits(userId, bonus, 'signup_bonus', 'Welcome bonus');
}

function referralReward(referrerId, paymentAmount) {
  const pct = parseInt(getInt('referral_reward_percent', 0), 10);
  if (!referrerId || pct <= 0) return 0;
  const referrer = getUser.get(referrerId);
  if (!referrer) return 0;
  const creditsPerCurrency = getInt('referral_credits_per_unit', 10);
  const reward = Math.max(1, Math.round(paymentAmount * creditsPerCurrency * (pct / 100)));
  addCredits(referrerId, reward, 'referral', `Referral reward (${pct}% of purchase)`);
  return reward;
}

function transactions(userId, limit = 50) {
  return db.prepare('SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit);
}

module.exports = { requireCredits, spendCredits, addCredits, signupBonus, referralReward, transactions, CreditError };
