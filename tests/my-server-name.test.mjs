import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askMyServerName } from '../src/game/my-server-name.js';

// tag_names answers only for names that differ from the server's.
const cloudWith = (real) => ({ asked: [], async tagNames(pairs) { this.asked.push(pairs); return new Map(real === undefined ? [] : [[pairs[0][0], real]]); } });
const claimed = (r) => async () => r;

test('a name changed on the server replaces the one this browser kept', async () => {
  const cloud = cloudWith('치킨집알바생');
  assert.equal(await askMyServerName({ cloud, myId: 'p1', name: '옛이름', claimChatId: claimed('ok') }), '치킨집알바생');
  assert.deepEqual(cloud.asked, [[['p1', '옛이름']]]);
});

test('same name, no server name, or no claimed id: keep mine', async () => {
  assert.equal(await askMyServerName({ cloud: cloudWith(undefined), myId: 'p1', name: 'A', claimChatId: claimed('ok') }), null);
  assert.equal(await askMyServerName({ cloud: cloudWith(null), myId: 'p1', name: 'A', claimChatId: claimed('ok') }), null);
  const cloud = cloudWith('B');
  assert.equal(await askMyServerName({ cloud, myId: 'p1', name: 'A', claimChatId: claimed('offline') }), null);
  assert.equal(cloud.asked.length, 0);
});
