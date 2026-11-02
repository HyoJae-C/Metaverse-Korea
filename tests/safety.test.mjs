import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
const { filterText, Safety } = await import('../src/core/safety.js');

test('masks swear words, also spaced out or stretched', () => {
  assert.equal(filterText('what the fuck'), 'what the ****');
  assert.match(filterText('f u c k off'), /^\*+ off$/);
  assert.match(filterText('씨발 진짜'), /^\*+ 진짜$/);
  assert.equal(filterText('Hello, nice café!'), 'Hello, nice café!');
  assert.equal(filterText('강아지 새끼 귀여워'), '강아지 새끼 귀여워');
});

test('masks links, emails and phone numbers but keeps prices', () => {
  assert.equal(filterText('call 010-1234-5678'), 'call ***');
  assert.equal(filterText('mail me a@b.com'), 'mail me ***');
  assert.equal(filterText('see https://x.example/y'), 'see ***');
  assert.equal(filterText('latte is 6500 won'), 'latte is 6500 won');
});

test('block by id now and by name later; report also blocks', () => {
  const s = new Safety();
  s.block('id1', 'Bob');
  assert.ok(s.isBlocked('id1', 'Other'));
  assert.ok(new Safety().isBlocked('id9', 'Bob'), 'name kept across sessions');
  s.report('id2', 'Eve', ['hi', 'bad']);
  assert.ok(s.isBlocked('id2'));
  assert.equal(s.blockedCount, 2);
  s.unblockAll();
  assert.ok(!s.isBlocked('id1', 'Bob'));
});
