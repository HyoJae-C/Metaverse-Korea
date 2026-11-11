import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeMove, takeMove } from '../src/core/domain-move.js';

function store(init = {}) {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m };
}
// What the page on the old address sends (another-seoul-redirect/index.html).
const encode = (keys) => '#move=' + Buffer.from(JSON.stringify({ v: 1, keys })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('a save from the old address comes over, Korean text and all', () => {
  const s = store(); let cleared = 0;
  const n = takeMove({ hash: encode({ mkauth: '{"refresh_token":"r"}', 'mk.name': '모두', 'as.installDone': '1', other: 'x' }), referrer: 'https://another-seoul.com/', storage: s, onDone: () => cleared++ });
  assert.equal(n, 3);
  assert.equal(s.getItem('mk.name'), '모두');
  assert.equal(s.getItem('other'), null);
  assert.equal(cleared, 1);
});

test('a link from anywhere else, or onto an existing save, changes nothing', () => {
  const hash = encode({ mkauth: 'attacker' });
  const a = store(); assert.equal(takeMove({ hash, referrer: 'https://evil.example/', storage: a }), 0); assert.equal(a.length, 0);
  const b = store(); assert.equal(takeMove({ hash, referrer: '', storage: b }), 0);
  const c = store({ 'mk.coins': '5' }); assert.equal(takeMove({ hash, referrer: 'https://another-seoul.com/', storage: c }), 0); assert.equal(c.getItem('mkauth'), null);
});

test('junk in the address is ignored', () => {
  assert.equal(decodeMove('#move=!!!'), null);
  assert.equal(decodeMove('#move=' + Buffer.from('{"v":2,"keys":{}}').toString('base64url')), null);
  assert.equal(decodeMove('#other'), null);
});
