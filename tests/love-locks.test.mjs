import test from 'node:test';
import assert from 'node:assert/strict';
import { countLines, cleanNote, preview, LocalLoveLocks, LOVE_LOCK, LOCK_SHAPES } from '../src/core/love-locks.js';
import { NAMSAN_WALK } from '../src/game/namsan-walk.js';

const mem = () => { const d = {}; return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } }; };
const wallet = (coins) => ({ coins, spend(n) { if (n > this.coins) return false; this.coins -= n; return true; }, add(n) { this.coins += n; } });

test('lines are counted from line breaks, 20 at most', () => {
  assert.equal(countLines(''), 0);
  assert.equal(countLines('a'), 1);
  assert.equal(countLines('a\r\nb\n\nc'), 4);
  assert.equal(cleanNote(Array(20).fill('x').join('\n')).body.split('\n').length, 20);
  assert.equal(cleanNote(Array(21).fill('x').join('\n')).error, 'lines');
  assert.equal(cleanNote(' \n \n').error, 'empty');
  assert.equal(cleanNote('가'.repeat(1001)).error, 'chars');
});

test('a note keeps its line breaks and spaces, HTML stays plain text', () => {
  assert.equal(cleanNote('\n\n  to you\n\n<b>love</b>  \n\n').body, '  to you\n\n<b>love</b>');
  assert.equal(preview('one\ntwo   three'), 'one two three');
  assert.ok(preview('x'.repeat(80)).endsWith('…'));
});

test('hanging a lock takes the price once, even when sent twice', async () => {
  const w = wallet(100000);
  const s = new LocalLoveLocks(w, mem());
  const req = { requestId: 'r1', shape: 'heart', name: 'Yozi', text: 'hi\nthere', price: LOVE_LOCK.price };
  const a = await s.hang(req);
  const b = await s.hang(req);
  assert.equal(a.charged, true);
  assert.equal(b.charged, false);
  assert.equal(b.lock.id, a.lock.id);
  assert.equal(w.coins, 100000 - LOVE_LOCK.price);
  assert.equal((await s.page()).rows.length, 1);
});

test('no lock without coins, a message, a known shape or the right price', async () => {
  const s = new LocalLoveLocks(wallet(LOVE_LOCK.price - 1), mem());
  assert.equal((await s.hang({ requestId: 'a', shape: 'heart', name: 'A', text: 'x', price: LOVE_LOCK.price })).error, 'coins');
  const rich = new LocalLoveLocks(wallet(999999), mem());
  assert.equal((await rich.hang({ requestId: 'b', shape: 'heart', name: 'A', text: '  ', price: LOVE_LOCK.price })).error, 'empty');
  assert.equal((await rich.hang({ requestId: 'c', shape: 'blob', name: 'A', text: 'x', price: LOVE_LOCK.price })).error, 'shape');
  assert.equal((await rich.hang({ requestId: 'd', shape: 'star', name: 'A', text: 'x', price: 1 })).error, 'price');
  assert.deepEqual(LOCK_SHAPES, ['heart', 'circle', 'square', 'star']);
});

test('the list is newest first, a page at a time', async () => {
  const s = new LocalLoveLocks(wallet(1e6), mem());
  for (let i = 0; i < 23; i++) await s.hang({ requestId: 'r' + i, shape: LOCK_SHAPES[i % 4], name: 'N', text: 'note ' + i, price: LOVE_LOCK.price });
  const p1 = await s.page(null, 10);
  assert.equal(p1.rows[0].body, 'note 22');
  assert.equal(p1.more, true);
  const p3 = await s.page((await s.page(p1.rows[9].id, 10)).rows[9].id, 10);
  assert.equal(p3.rows.length, 3);
  assert.equal(p3.more, false);
  assert.equal(p3.rows[2].body, 'note 0');
});

test('the love-lock spot is on the summit plaza, clear of the tower', () => {
  const W = NAMSAN_WALK, [x, z] = W.heartSpot;
  assert.ok(Math.hypot(x, z) > W.towerR + 2, 'off the tower\'s terrace');
  assert.ok(Math.hypot(x, z) < W.plazaR - 2, 'inside the railing');
  assert.ok(Math.hypot(x - W.heart[0], z - W.heart[1]) < 3.5, 'in front of the heart');
});
