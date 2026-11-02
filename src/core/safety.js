// Chat safety: a word filter, personal-info masking, and a block list.
//
// This runs in each visitor's browser, so it protects the reader, not the
// network. Reports are kept on this device until there is a server to send
// them to (see Safety.report).

// A short starter list (English, Korean, a little Japanese and Chinese).
// Matching ignores case, spaces and dots inside a word.
const WORDS = [
  'fuck', 'fck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy', 'slut', 'whore',
  'nigger', 'nigga', 'faggot', 'retard',
  '씨발', '시발', 'ㅅㅂ', 'ㅆㅂ', '씨바', '병신', 'ㅂㅅ', '좆', '존나', 'ㅈㄴ', '개새끼', '미친놈', '미친년',
  '닥쳐', '꺼져', '엠창', '느금', '애미', '애비',
  '死ね', 'くそ', 'ばか', '傻逼', '操你', '他妈的',
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// "f u c k", "f.u.c.k" and "fuuuck" all match.
const WORD_RE = new RegExp(WORDS.map((w) => [...w].map((c) => esc(c) + '+').join('[\\s._-]*')).join('|'), 'giu');
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[\w.-]+\.(?:com|net|org|io|kr|gg|me|ly|co)\b(?:\/\S*)?/giu;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/gu;
const PHONE_RE = /(?:\+?\d[\s-]?){7,}/gu; // 7+ digits: phone numbers, account numbers

export function filterText(s) {
  return String(s ?? '')
    .replace(EMAIL_RE, '***')
    .replace(URL_RE, '***')
    .replace(PHONE_RE, '***')
    .replace(WORD_RE, (m) => '*'.repeat(Math.min(6, [...m.replace(/[\s._-]/g, '')].length)));
}

const KEY = 'mk.safety';
function read() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { blocked: Array.isArray(s.blocked) ? s.blocked : [], reports: Array.isArray(s.reports) ? s.reports : [] };
  } catch { return { blocked: [], reports: [] }; }
}
function write(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
}

// Blocked people are matched by their player id (this session) or their
// nickname (later sessions, since ids are per session).
export class Safety {
  constructor() { this.s = read(); }
  isBlocked(id, name) {
    return this.s.blocked.some((b) => (id && b.id === id) || (name && b.name === name));
  }
  block(id, name) {
    if (this.isBlocked(id, name)) return;
    this.s.blocked.push({ id, name, at: Date.now() });
    this.s.blocked = this.s.blocked.slice(-200);
    write(this.s);
  }
  unblockAll() { this.s.blocked = []; write(this.s); }
  get blockedCount() { return this.s.blocked.length; }
  // Saves a report with the reported person's recent lines, and blocks them.
  report(id, name, lines, reason = '') {
    this.s.reports.push({ id, name, reason, lines: lines.slice(-10), at: Date.now() });
    this.s.reports = this.s.reports.slice(-50);
    write(this.s);
    this.block(id, name);
  }
}
