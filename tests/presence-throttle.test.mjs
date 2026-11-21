// Presence updates are spaced out (net/rate.js createPresenceThrottle):
// trying looks on fast must not flood Supabase presence, which cuts the
// player off (others saw them vanish at the salon, 2026-11-20).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresenceThrottle } from '../src/net/rate.js';

function clock() {
  let t = 0, timers = [];
  return {
    now: () => t,
    later: (f, ms) => { const h = { f, at: t + ms }; timers.push(h); return h; },
    cancel: (h) => { timers = timers.filter((x) => x !== h); },
    advance(ms) {
      t += ms;
      for (const h of timers.filter((x) => x.at <= t)) { timers = timers.filter((x) => x !== h); h.f(); }
    },
  };
}

test('ten looks in two seconds send two presence updates, the last look last', () => {
  const c = clock(), sent = [];
  const p = createPresenceThrottle((x) => sent.push(x), { gap: 3000, ...c });
  for (let i = 0; i < 10; i++) { p.track({ look: i }); c.advance(200); }
  assert.deepEqual(sent, [{ look: 0 }]);
  c.advance(3000);
  assert.deepEqual(sent, [{ look: 0 }, { look: 9 }]);
  c.advance(10000);
  assert.equal(sent.length, 2);
});

test('a join tracks at once and drops what was waiting; clear drops it too', () => {
  const c = clock(), sent = [];
  const p = createPresenceThrottle((x) => sent.push(x), { gap: 3000, ...c });
  p.track({ look: 1 });
  p.track({ look: 2 });
  p.now({ look: 3 });
  c.advance(5000);
  assert.deepEqual(sent, [{ look: 1 }, { look: 3 }]);
  p.track({ look: 4 }); // (3 s since the join: goes)
  p.track({ look: 5 });
  p.clear();
  c.advance(5000);
  assert.deepEqual(sent, [{ look: 1 }, { look: 3 }, { look: 4 }]);
});

test('walking back and forth on a cell border: leave/appear is spaced out too, the latest wish last', () => {
  const c = clock(), sent = [];
  const p = createPresenceThrottle((x) => sent.push(x), { gap: 3000, ...c });
  p.now({ name: 'a' }); // joined this cell as our own
  for (let i = 0; i < 6; i++) { c.advance(300); p.track(i % 2 ? { name: 'a' } : null); } // out, in, out, in, out, in
  assert.deepEqual(sent, [{ name: 'a' }]);
  c.advance(3000);
  assert.deepEqual(sent, [{ name: 'a' }, { name: 'a' }]);
  p.track(null); // and we finally walk off
  c.advance(3000);
  assert.deepEqual(sent, [{ name: 'a' }, { name: 'a' }, null]);
});
