import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KPOP, parseKpop, kpopMsg } from '../src/data/kpop.js';

test('play and stop messages round-trip; only listed songs are accepted', () => {
  const id = KPOP[0].id;
  assert.deepEqual(parseKpop(kpopMsg(id, 12.34)), { verb: 'play', id, at: 12.3 });
  assert.deepEqual(parseKpop(kpopMsg(null)), { verb: 'stop' });
  assert.equal(parseKpop('kpop:play:dQw4w9WgXcQ:0'), null);
  assert.equal(parseKpop('kpop:play:' + id), null);
  assert.equal(parseKpop('wave'), null);
  for (const s of KPOP) assert.match(s.id, /^[\w-]{11}$/);
});
