import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_NOTICE, NoticeFeed, cleanNotice, parseNoticeCommand, sendNotice, watchNotices } from '../src/core/announce.js';

test('the notice command is /공지, /notice or /announce', () => {
  assert.equal(parseNoticeCommand('/공지 점검 10분 전'), '점검 10분 전');
  assert.equal(parseNoticeCommand('/NOTICE  Hello all '), 'Hello all');
  assert.equal(parseNoticeCommand('/announce hi'), 'hi');
  assert.equal(parseNoticeCommand('/공지'), '');
  assert.equal(parseNoticeCommand('/공지사항 hi'), null);
  assert.equal(parseNoticeCommand('공지 hi'), null);
  assert.equal(parseNoticeCommand('/noticeboard'), null);
});

test('notices are cleaned and kept short', () => {
  assert.equal(cleanNotice(' a\u0000b\n '), 'a b');
  assert.equal(cleanNotice('x'.repeat(500)).length, MAX_NOTICE);
});

test('each notice shows once, empty or broken ones never', () => {
  const shown = [];
  const feed = new NoticeFeed((n) => shown.push(n.body));
  assert.equal(feed.add({ id: 1, body: 'hi' }), true);
  assert.equal(feed.add({ id: 1, body: 'hi' }), false);
  assert.equal(feed.add({ id: 2, body: '   ' }), false);
  assert.equal(feed.add({ body: 'no id' }), false);
  assert.equal(feed.add(null), false);
  assert.deepEqual(shown, ['hi']);
});

function fakeClient(rpcResult) {
  const calls = [];
  const handlers = {};
  const ch = { on(type, f, cb) { handlers[f.event] = cb; return ch; }, subscribe() { return ch; } };
  return {
    calls, handlers, removed: 0,
    channel(topic, opts) { calls.push(['channel', topic, opts]); return ch; },
    removeChannel() { this.removed++; },
    async rpc(fn, args) { calls.push(['rpc', fn, args]); return rpcResult(fn, args); },
  };
}

test('watching: live notices and recent ones, oldest first, no repeats', async () => {
  const c = fakeClient(() => ({ data: [{ id: 5, body: 'second' }, { id: 4, body: 'first' }] }));
  const shown = [];
  const stop = watchNotices(c, new NoticeFeed((n) => shown.push(n.body)));
  assert.deepEqual(c.calls[0], ['channel', 'announce', { config: { private: true } }]);
  await new Promise((r) => setTimeout(r, 0));
  c.handlers.n({ payload: { id: 5, body: 'second' } });
  c.handlers.n({ payload: { id: 6, body: 'live' } });
  assert.deepEqual(shown, ['first', 'second', 'live']);
  stop();
  assert.equal(c.removed, 1);
});

test('sending: the server decides who is an operator', async () => {
  const ok = fakeClient(() => ({ data: { id: 1 } }));
  assert.equal((await sendNotice(ok, ' hi ')).ok, true);
  assert.deepEqual(ok.calls[0], ['rpc', 'ops_announce', { msg: 'hi' }]);
  const no = fakeClient(() => ({ error: { code: '42501', message: 'operators only' } }));
  assert.equal((await sendNotice(no, 'hi')).error, 'operator');
  const setup = fakeClient(() => ({ error: { code: 'PGRST202' } }));
  assert.equal((await sendNotice(setup, 'hi')).error, 'setup');
  assert.equal((await sendNotice(ok, '  ')).error, 'empty');
  assert.equal((await sendNotice(null, 'hi')).error, 'setup');
});
