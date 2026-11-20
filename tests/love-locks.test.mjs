import test from 'node:test';
import assert from 'node:assert/strict';
import { countLines, cleanNote, preview, LocalLoveLocks, LOVE_LOCK, LOCK_SHAPES } from '../src/core/love-locks.js';
import { readFileSync } from 'node:fs';
import { NAMSAN_WALK, plazaEdge } from '../src/game/namsan-walk.js';

const mem = () => { const d = {}; return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } }; };
const wallet = (coins) => ({ coins, spend(n) { if (n > this.coins) return false; this.coins -= n; return true; }, add(n) { this.coins += n; } });

test('lines are counted from line breaks, 20 at most', () => {
  assert.equal(countLines(''), 0);
  assert.equal(countLines('a'), 1);
  assert.equal(countLines('a\r\nb\n\nc'), 4);
  assert.equal(cleanNote(Array(20).fill('x').join('\n')).body.split('\n').length, 20);
  assert.equal(cleanNote(Array(21).fill('x').join('\n')).error, 'lines');
  assert.equal(cleanNote(' \n \n').error, 'empty');
  assert.equal(cleanNote('가'.repeat(201)).error, 'chars');
  assert.equal(cleanNote('가'.repeat(200)).body.length, 200);
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
  const hill = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/itaewon.json', import.meta.url), 'utf8')).landmarks.find((l) => l.type === 'namsan');
  for (const [px, pz] of [W.heart, W.heartSpot]) assert.ok(Math.hypot(px, pz) < plazaEdge(hill, Math.atan2(pz, px)) - W.rail - 1.5, 'inside the railing');
  assert.ok(Math.hypot(x - W.heart[0], z - W.heart[1]) < 3.5, 'in front of the heart');
});

test('a lock for two: half each (the odd won to the host), messages carry only a clean note', async () => {
  const { halves, pairMsg, parsePair, SupabaseLoveLocks } = await import('../src/core/love-locks.js');
  assert.deepEqual(halves(15000), { host: 7500, friend: 7500 });
  assert.deepEqual(halves(15001), { host: 7501, friend: 7500 });
  const ask = parsePair(pairMsg({ v: 'ask', to: 'p-1', rid: 'r1', shape: 'star', body: '우리\n<b>hi</b>' }));
  assert.deepEqual(ask, { v: 'ask', to: 'p-1', rid: 'r1', shape: 'star', body: '우리\n<b>hi</b>' });
  assert.deepEqual(parsePair(pairMsg({ v: 'ok', to: 'p-1', rid: 'r1', body: 'ignored' })), { v: 'ok', to: 'p-1', rid: 'r1' });
  assert.deepEqual(parsePair(pairMsg({ v: 'fail', to: 'p-1', rid: 'r1', why: 'p_late' })), { v: 'fail', to: 'p-1', rid: 'r1', why: 'p_late' });
  for (const bad of [{ v: 'ask', to: 'p', rid: 'r', shape: 'blob', body: 'x' }, { v: 'ask', to: 'p', rid: 'r', shape: 'heart', body: '' },
    { v: 'ask', to: 'p', rid: 'r', shape: 'heart', body: 'x'.repeat(201) }, { v: 'pay', to: 'p', rid: 'r' }, { v: 'ok', to: 'a:b', rid: 'r' }]) {
    assert.equal(parsePair(pairMsg(bad)), null, JSON.stringify(bad));
  }
  assert.equal(parsePair('ll:{nope'), null);
  // Without the server there is no lock for two; with it, until the server says it doesn't know them.
  assert.equal(new LocalLoveLocks({ coins: 0, spend: () => false }, mem()).pairs, false);
  const st = new SupabaseLoveLocks({ client: {} }, { server: true });
  assert.equal(st.pairs, true);
  assert.ok(st._pairGone({ code: 'PGRST202', message: 'Could not find the function public.hang_love_lock_pair' }));
  assert.equal(st.pairs, false);
});

test('the friend pays only through the server, once per lock', async () => {
  const { SupabaseLoveLocks } = await import('../src/core/love-locks.js');
  const charged = [];
  const wallet = { server: true, flush: async () => true, charged: (n, r) => charged.push([n, r.coins]), _sf: () => 1 };
  const answers = [{ status: 'ok', half: 7500, coins: 9000, ver: 3 }, { status: 'hung', paid: 7500, coins: 1500, ver: 4, lock: { id: 9, name: 'A', name2: 'B' } }, { status: 'hung', paid: 7500, coins: 1500, ver: 4, lock: { id: 9 } }];
  const client = { rpc: async () => ({ data: answers.shift(), error: null }) };
  const st = new SupabaseLoveLocks({ client }, wallet);
  const q = { requestId: 'r1', host: 'h', shape: 'heart', text: 'hi' };
  assert.deepEqual(await st.pairOk(q), { status: 'ok', half: 7500 });
  assert.equal(charged.length, 0);
  const r = await st.pairOk(q);
  assert.equal(r.status, 'hung');
  assert.equal(r.lock.name2, 'B');
  await st.pairOk(q);
  assert.deepEqual(charged, [[7500, 1500]]);
});
