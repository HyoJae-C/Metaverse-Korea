import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanBody, kstDayStart, LocalBoard, DAILY_POSTS } from '../src/core/board.js';

const mem = () => { const d = {}; return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } }; };

test('cleanBody: trims, and limits lines and length', () => {
  assert.deepEqual(cleanBody('\n\nhello  \r\nworld  \n\n'), { body: 'hello\nworld' });
  assert.equal(cleanBody('   \n ').error, 'empty');
  assert.equal(cleanBody(Array(20).fill('a').join('\n')).body.split('\n').length, 20);
  assert.equal(cleanBody(Array(21).fill('a').join('\n')).error, 'lines');
  assert.equal(cleanBody('가'.repeat(1001)).error, 'chars');
});

test('the day starts at midnight Korean time', () => {
  const t = Date.parse('2026-11-03T14:59:00Z'); // 23:59 KST
  assert.equal(new Date(kstDayStart(t)).toISOString(), '2026-11-02T15:00:00.000Z');
  assert.equal(new Date(kstDayStart(t + 2 * 60e3)).toISOString(), '2026-11-03T15:00:00.000Z');
});

test('three posts a day per board; deleting does not give more', async () => {
  const b = new LocalBoard(mem(), 'u1');
  const now = Date.parse('2026-11-03T03:00:00Z');
  for (let i = 0; i < DAILY_POSTS; i++) assert.ok((await b.post('free', 'A', 'hi ' + i, now + i)).post);
  assert.equal((await b.post('free', 'A', 'one more', now + 9)).error, 'limit');
  assert.ok((await b.post('ask', 'A', 'other board', now + 10)).post, 'the other board has its own count');
  const [first] = await b.list('free');
  await b.remove(first.id);
  assert.equal((await b.list('free')).length, 2);
  assert.equal(await b.left('free', now + 20), 0);
  assert.ok((await b.post('free', 'A', 'next day', now + 86400e3)).post);
});
