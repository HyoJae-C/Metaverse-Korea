// Seoul Bank (서울은행): send won to another player. No DOM, so it can be
// unit-tested. The money itself moves on the server, in one go, in
// supabase/028_bank.sql (bank_send); the game only asks.
//
// Who may send (7 days + 35 missions, 1,000,000 kept, 250,000 a day,
// friends only) is 077_bank_rules.sql; the server checks it all.
//
// For now only operators can send. Everyone else meets the teller, who says
// transfers are coming soon. The server decides who can (bank_status), so
// the "coming soon" answer is also what anyone gets when it can't be asked
// (SQL not run yet, offline, not signed in).

// The note that goes with a transfer: one of these (no free text, so there's
// nothing to moderate). The same list is in 028_bank.sql.
export const MEMOS = ['thanks', 'food', 'coffee', 'birthday', 'payback', 'trip'];
// Quick amounts on the form (won).
export const QUICK = [1000, 5000, 10000, 50000];

// Why this transfer can't be asked for, or null when it can:
// 'name' (no name typed), 'self', 'amount' (not a whole number within
// min..max), 'poor' (more than my balance), 'keep' (would leave less than
// keep: 077_bank_rules.sql, 1,000,000), 'daylimit' (more than left today,
// 250,000 a day). keep 0 / left null: no such rule for me (operators).
export function checkSend({ to, n, balance, min, max, me = '', keep = 0, left = null }) {
  const name = String(to || '').trim();
  if (!name) return 'name';
  const key = (s) => String(s).replace(/\s+/g, '').toLowerCase();
  if (me && key(name) === key(me)) return 'self';
  if (!Number.isInteger(n) || n < min || n > max) return 'amount';
  if (n > balance) return 'poor';
  if (keep > 0 && balance - n < keep) return 'keep';
  if (left != null && n > left) return 'daylimit';
  return null;
}

// The most I can send now: the per-transfer max, today's limit, and what I
// can spare above the money I must keep.
export function sendCap({ balance, max, keep = 0, left = null }) {
  let cap = Math.min(max, keep > 0 ? balance - keep : balance);
  if (left != null) cap = Math.min(cap, left);
  return Math.max(0, cap);
}

// The amount typed in the box ("12,000", "₩5000", " 3000 "): a whole number, or NaN.
export function parseAmount(text) {
  const s = String(text ?? '').replace(/[₩,\s]/g, '');
  return /^\d{1,9}$/.test(s) ? Number(s) : NaN;
}

