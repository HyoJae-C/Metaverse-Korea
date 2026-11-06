// Name and character (body model) can't be changed for a while once chosen,
// so people know who they're talking to. Each has its own lock: a new
// choice starts LOCK_DAYS of keeping it. An empty name isn't locked.

export const LOCK_DAYS = 7;

// Names use Korean (Hangul), English letters, numbers and spaces only.
export const cleanName = (s) => String(s || '').replace(/[^가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 ]/g, '').replace(/ {2,}/g, ' ').slice(0, 16);
// Names that look official are not allowed, so nobody can pose as the
// operator by name (the real one has the 🛡️ badge).
const RESERVED = /운영자|운영진|운영팀|관리자|개발자|admin|operator|moderator|official|staff|developer|^gm\d*$/i;
export const isReservedName = (s) => RESERVED.test(String(s || '').replace(/\s+/g, ''));
const DAY = 24 * 60 * 60 * 1000;
const KEY = 'mk.identity';

export function readIdentity(storage = globalThis.localStorage) {
  try {
    const r = JSON.parse(storage?.getItem(KEY) || 'null');
    if (r && typeof r === 'object') {
      return { name: cleanName(r.name).trim(), nameAt: Number(r.nameAt) || 0, model: typeof r.model === 'string' ? r.model : null, modelAt: Number(r.modelAt) || 0 };
    }
  } catch { /* corrupt or blocked: no lock */ }
  return { name: '', nameAt: 0, model: null, modelAt: 0 };
}

// Whole days left (rounded up) before it can change; 0 = free to change.
export function daysLeft(at, now = Date.now()) {
  if (!at) return 0;
  const left = at + LOCK_DAYS * DAY - now;
  return left > 0 ? Math.ceil(left / DAY) : 0;
}

export function nameLocked(id, now = Date.now()) { return !!id.name && daysLeft(id.nameAt, now) > 0; }
export function modelLocked(id, now = Date.now()) { return !!id.model && daysLeft(id.modelAt, now) > 0; }

// What the player gets to use: their choice, unless it's still locked.
// Returns the record to save (a changed choice restarts its lock).
export function commitIdentity(id, { name, model }, now = Date.now()) {
  const next = { ...id };
  const n = cleanName(name).trim();
  if (!nameLocked(id, now) && n !== id.name) { next.name = n; next.nameAt = n ? now : 0; }
  if (!modelLocked(id, now) && model && model !== id.model) { next.model = model; next.modelAt = now; }
  return next;
}

export function saveIdentity(id, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(id)); } catch { /* storage blocked */ }
}
