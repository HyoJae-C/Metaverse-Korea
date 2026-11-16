import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noticeText, runPlayerNotices } from '../src/game/player-notices.js';

test('a notice reads in my language, then English, then Korean', () => {
  const b = { ko: '안내', en: 'Note', zh: '通知' };
  assert.equal(noticeText(b, 'ko'), '안내');
  assert.equal(noticeText(b, 'ja'), 'Note');
  assert.equal(noticeText(b, 'hant'), '通知');
  assert.equal(noticeText({ ko: '안내' }, 'fr'), '안내');
  assert.equal(noticeText(null, 'en'), '');
});

// A tiny DOM: enough for the popup.
function fakeDom() {
  const shown = [];
  const node = () => ({ style: {}, children: [], append(...c) { this.children.push(...c); }, remove() { shown.splice(shown.indexOf(this), 1); }, focus() {} });
  globalThis.document = { createElement: node, body: { append: (n) => shown.push(n) } };
  return shown;
}
const texts = (n) => [n.textContent, ...(n.children || []).flatMap(texts)].filter(Boolean);

test('shows each unseen notice, marks it seen on OK, and takes the server wallet', async () => {
  const shown = fakeDom(), calls = [], credited = [];
  const client = { rpc: async (f, a) => { calls.push([f, a]); return f === 'my_notices' ? { data: { notices: [{ id: 7, body: { en: 'Cable car fix', ko: '케이블카' }, won: 75000 }], coins: 100, ver: 9 } } : { data: null }; } };
  const wallet = { server: true, client, credited: (n, r) => credited.push([n, r.ver]) };
  const p = runPlayerNotices({ wallet, t: (k) => k, lang: () => 'en' });
  while (!shown.length) await new Promise((r) => setTimeout(r, 1));
  assert.ok(texts(shown[0]).includes('Cable car fix'));
  assert.deepEqual(credited, [[75000, 9]]);
  const ok = shown[0].children[0].children.at(-1);
  ok.onclick();
  assert.equal(await p, 1);
  assert.equal(shown.length, 0);
  assert.deepEqual(calls.at(-1), ['notice_seen', { p_id: 7 }]);
});

test('nothing to show, or offline: no popup', async () => {
  const shown = fakeDom();
  const wallet = { server: true, client: { rpc: async () => ({ error: { message: 'x' } }) } };
  assert.equal(await runPlayerNotices({ wallet, t: (k) => k, lang: () => 'en' }), 0);
  assert.equal(await runPlayerNotices({ wallet: { server: false }, t: (k) => k, lang: () => 'en' }), 0);
  assert.equal(shown.length, 0);
});
