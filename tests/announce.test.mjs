import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_NOTICE, MAX_PINNED, NoticeFeed, PinnedNotices, cleanNotice, deleteNotice, parseNoticeCommand, sendNotice, watchNotices } from '../src/core/announce.js';

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

test('a deleted notice leaves the chat and never comes back', async () => {
  const shown = [], removed = [];
  const feed = new NoticeFeed((n) => shown.push(n.id), (id) => removed.push(id));
  feed.add({ id: 7, body: 'oops' });
  assert.equal(feed.remove({ id: 7 }), true);
  assert.equal(feed.remove({}), false);
  assert.equal(feed.add({ id: 7, body: 'oops' }), false); // a late "recent" copy
  assert.deepEqual([shown, removed], [[7], [7]]);
  const c = fakeClient(() => ({ data: [] }));
  const live = [];
  watchNotices(c, new NoticeFeed(() => {}, (id) => live.push(id)));
  c.handlers.d({ payload: { id: 3 } });
  assert.deepEqual(live, [3]);
});

test('deleting: operators only, the server says', async () => {
  const ok = fakeClient(() => ({ data: true }));
  assert.equal((await deleteNotice(ok, 7)).ok, true);
  assert.deepEqual(ok.calls[0], ['rpc', 'ops_delete_announcement', { notice_id: 7 }]);
  assert.equal((await deleteNotice(fakeClient(() => ({ error: { code: '42501' } })), 7)).error, 'operator');
  assert.equal((await deleteNotice(null, 7)).error, 'setup');
});

test('pinned notices stay until deleted, newest first, a few at most', () => {
  const seen = [];
  const pins = new PinnedNotices((list) => seen.push(list.map((n) => n.id)));
  assert.equal(pins.add({ id: 1, body: 'a', pinned: false }), false); // old, unpinned
  assert.equal(pins.add({ id: 2, body: 'b', pinned: true }), true);
  assert.equal(pins.add({ id: 2, body: 'b', pinned: true }), false);
  for (const id of [3, 4, 5]) pins.add({ id, body: 'x', pinned: true });
  assert.deepEqual(pins.list().map((n) => n.id), [5, 4, 3]);
  assert.equal(pins.list().length, MAX_PINNED);
  assert.equal(pins.remove(5), true);
  assert.equal(pins.remove(5), false);
  assert.deepEqual(pins.list().map((n) => n.id), [4, 3, 2]); // the hidden one comes back up
  assert.deepEqual(seen.at(-1), [4, 3, 2]);
});

test('late joiners get every pinned notice; before 030 the last 10 minutes', async () => {
  const c = fakeClient((fn) => fn === 'pinned_announcements'
    ? { data: [{ id: 9, body: 'still up', pinned: true }, { id: 3, body: 'days old', pinned: true }] }
    : { data: [] });
  const got = [];
  watchNotices(c, new NoticeFeed((n) => got.push([n.id, n.pinned])));
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(got, [[3, true], [9, true]]);
  assert.ok(!c.calls.some((x) => x[1] === 'recent_announcements'));

  const old = fakeClient((fn) => fn === 'pinned_announcements'
    ? { error: { code: 'PGRST202' } }
    : { data: [{ id: 1, body: 'recent' }] });
  const got2 = [];
  watchNotices(old, new NoticeFeed((n) => got2.push([n.id, n.pinned])));
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(got2, [[1, false]]);
});
