// Seoul Bank (서울은행): send won to another player. No DOM, so it can be
// unit-tested. The money itself moves on the server, in one go, in
// supabase/028_bank.sql (bank_send); the game only asks.
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
// min..max), 'poor' (more than my balance).
export function checkSend({ to, n, balance, min, max, me = '' }) {
  const name = String(to || '').trim();
  if (!name) return 'name';
  const key = (s) => String(s).replace(/\s+/g, '').toLowerCase();
  if (me && key(name) === key(me)) return 'self';
  if (!Number.isInteger(n) || n < min || n > max) return 'amount';
  if (n > balance) return 'poor';
  return null;
}

// The amount typed in the box ("12,000", "₩5000", " 3000 "): a whole number, or NaN.
export function parseAmount(text) {
  const s = String(text ?? '').replace(/[₩,\s]/g, '');
  return /^\d{1,9}$/.test(s) ? Number(s) : NaN;
}

// The server's answers that mean nothing moved and the player should hear why.
export const SEND_ERRORS = ['closed', 'amount', 'poor', 'nobody', 'self', 'nowallet', 'open', 'offline', 'bad', 'signin'];
