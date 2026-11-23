import test from 'node:test';
import assert from 'node:assert/strict';
import { GiftGate } from '../src/core/gift-gate.js';
import { EN } from '../src/i18n/en.js';

const t = (k, v) => EN[k].replace(/\{(\w+)\}/g, (_, x) => v[x]);
const wallet = (data, calls = []) => ({ server: true, client: { rpc: async (fn) => { calls.push(fn); return { data }; } } });

test('a new account is told why it cannot send gifts yet', async () => {
  const g = new GiftGate({ wallet: wallet({ ok: false, days: 2, hours: 0.5, min_days: 7, min_hours: 3 }) });
  assert.equal(g.why(t), undefined); // not asked yet
  const shown = [];
  let went = false;
  g.gate(t, (m) => shown.push(m), () => { went = true; });
  await g.check();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(went, false);
  assert.match(shown[0], /7 days old/);
  assert.match(shown[0], /2 days, 0.5 hours/);
});

test('an account old enough goes straight on, and the answer is kept a while', async () => {
  let now = 0;
  const calls = [];
  const g = new GiftGate({ wallet: wallet({ ok: true, days: 30, hours: 12, min_days: 7, min_hours: 3 }, calls), now: () => now });
  await g.check();
  let went = 0;
  g.gate(t, () => {}, () => went++);
  assert.equal(went, 1);
  await g.check();
  assert.equal(calls.length, 1);
  now += 6 * 60 * 1000;
  await g.check();
  assert.equal(calls.length, 2);
});

test('no server answer (offline, or 073 not run) does not hold anyone back', async () => {
  const g = new GiftGate({ wallet: { server: true, client: { rpc: async () => ({ error: { message: 'no function' } }) } } });
  await g.check();
  assert.equal(g.why(t), null);
  const off = new GiftGate({ wallet: { server: false } });
  await off.check();
  assert.equal(off.why(t), null);
});
