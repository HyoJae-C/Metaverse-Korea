import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
};
const { Wallet, WELCOME_COINS, LOG_MAX } = await import('../src/core/wallet.js');
const cfg = { reward: 20, dailyLimit: 5, seconds: 0 };
const fresh = () => { for (const k of Object.keys(store)) delete store[k]; return new Wallet(cfg); };

test('welcome travel money comes once, and is in the budget book', () => {
  const w = fresh();
  assert.equal(w.welcome(), WELCOME_COINS);
  assert.equal(w.welcome(), 0);
  assert.equal(new Wallet(cfg).welcome(), 0, 'saved: not again after a reload');
  assert.equal(w.coins, WELCOME_COINS);
  assert.deepEqual(w.log.map((e) => [e.n, e.bal, e.note]), [[WELCOME_COINS, WELCOME_COINS, { k: 'ledger.welcome' }]]);
});

test('players from before the gift get it too, on top of what they had', () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 42, day: '', ads: 0 });
  const w = new Wallet(cfg);
  assert.equal(w.welcome(), WELCOME_COINS);
  assert.equal(w.coins, 42 + WELCOME_COINS);
});

test('players who got the old 500 get the rest once when the gift goes up', () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 120, day: '', ads: 0, gift: 1 });
  const w = new Wallet(cfg);
  assert.equal(w.welcome(), WELCOME_COINS - 500);
  assert.equal(w.coins, 120 + WELCOME_COINS - 500);
  assert.equal(new Wallet(cfg).welcome(), 0, 'only once');
});

test('every coin in and out is logged with a note, or the current context', () => {
  const w = fresh();
  w.context = () => ({ at: { en: 'Cafe' } });
  w.add(30, { k: 'ledger.quest' });
  assert.equal(w.spend(100), false, 'not enough: nothing paid, nothing logged');
  assert.equal(w.spend(10), true);
  assert.equal(w.take(50, { k: 'ledger.fine' }), 20);
  w.context = null;
  w.add(5);
  assert.deepEqual(w.log.map((e) => [e.n, e.bal, e.note]), [
    [30, 30, { k: 'ledger.quest' }],
    [-10, 20, { at: { en: 'Cafe' } }],
    [-20, 0, { k: 'ledger.fine' }],
    [5, 5, null],
  ]);
  assert.equal(new Wallet(cfg).log.length, 4, 'the book is saved');
  const day = w.dayTotals();
  assert.deepEqual(day, { in: 35, out: 30 });
});

test('the budget book keeps only the latest entries', () => {
  const w = fresh();
  for (let i = 1; i <= LOG_MAX + 20; i++) w.add(1);
  assert.equal(w.log.length, LOG_MAX);
  assert.equal(w.log.at(-1).bal, LOG_MAX + 20);
});

// A pretend server with the rules of supabase/015_wallet.sql (simplified).
function fakeServer({ earnMax = 2000, migrateMax = 30000, welcome = WELCOME_COINS, missing = false } = {}) {
  const srv = { row: null, seen: new Map(), calls: [], down: false };
  srv.client = {
    rpc: async (fn, args) => {
      srv.calls.push(fn);
      if (missing) return { error: { code: 'PGRST202', message: 'Could not find the function' } };
      if (srv.down) return { error: { message: 'fetch failed' } };
      const r = srv.row;
      if (fn === 'wallet_open') {
        let created = false, given = 0;
        if (!r) { created = true; srv.row = { coins: Math.min(args.p_local, migrateMax), ver: 0, welcome: Math.min(args.p_gift, welcome), ads: 5 }; }
        const w = srv.row;
        if (w.welcome < welcome) { given = welcome - w.welcome; w.coins += given; w.welcome = welcome; }
        if (created || given) w.ver++;
        return { data: { status: 'ok', coins: w.coins, ver: w.ver, created, welcome: given, ads_left: w.ads } };
      }
      if (fn === 'wallet_apply') {
        const results = [];
        for (const op of args.p_ops) {
          if (srv.seen.has(op.id)) { results.push({ id: op.id, n: srv.seen.get(op.id) }); continue; }
          let n = 0;
          if (op.k === 'spend') n = r.coins >= -op.n ? op.n : 0;
          else if (op.k === 'take') n = -Math.min(-op.n, r.coins);
          else if (op.k === 'refund') n = srv.seen.get(op.ref) < 0 ? Math.min(op.n, -srv.seen.get(op.ref)) : 0;
          else if (op.k === 'earn') n = Math.min(op.n, earnMax);
          srv.seen.set(op.id, n);
          r.coins += n;
          results.push({ id: op.id, n });
        }
        r.ver++;
        return { data: { status: 'ok', coins: r.coins, ver: r.ver, results } };
      }
      if (fn === 'wallet_ad') {
        if (r.ads <= 0) return { data: { status: 'limit', coins: r.coins, ver: r.ver, granted: 0, ads_left: 0 } };
        r.ads--; r.coins += 20; r.ver++;
        return { data: { status: 'ok', coins: r.coins, ver: r.ver, granted: 20, ads_left: r.ads } };
      }
      return { error: { message: 'unknown' } };
    },
  };
  srv.cloud = { client: srv.client, user: { id: 'u1' } };
  return srv;
}

test('server wallet: the browser balance comes over once, capped, with the welcome money on top', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 99999, gift: 0 });
  const srv = fakeServer();
  const w = new Wallet(cfg);
  assert.equal(await w.connect(srv.cloud), 'server');
  assert.equal(w.coins, 30000 + WELCOME_COINS);
  assert.equal(w.welcome(), WELCOME_COINS, 'the welcome panel shows what the server gave');
  assert.equal(w.welcome(), 0);
  store['mk.wallet'] = JSON.stringify({ coins: 5000000 }); // edited afterwards: ignored
  const again = new Wallet(cfg);
  assert.equal(again.coins, 30000 + WELCOME_COINS, 'reload shows the server copy');
  await again.connect(srv.cloud);
  assert.equal(again.coins, 30000 + WELCOME_COINS);
});

test('server wallet: changes show at once, then the server balance wins', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 100, gift: WELCOME_COINS });
  const srv = fakeServer({ earnMax: 50 });
  const w = new Wallet(cfg);
  await w.connect(srv.cloud);
  assert.equal(w.coins, 100);
  assert.equal(w.spend(30, { k: 'ledger.taxi' }), true);
  assert.equal(w.coins, 70, 'shown at once');
  w.add(500, { k: 'ledger.quest' }); // more than the server allows for one reward
  assert.equal(w.coins, 570);
  assert.equal(await w.flush(), true);
  assert.equal(w.coins, 120, 'the server capped the reward');
  assert.equal(srv.row.coins, 120);
  assert.equal(w.spend(1000), false, 'still no spending more than you have');
  assert.equal(w.take(999, { k: 'ledger.fine' }), 120);
  await w.flush();
  assert.equal(w.coins, 0);
});

test('server wallet: offline changes wait in the browser and are sent once', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 200, gift: WELCOME_COINS });
  const srv = fakeServer();
  const w = new Wallet(cfg);
  await w.connect(srv.cloud);
  srv.down = true;
  w.add(10);
  assert.equal(await w.flush(), false);
  clearTimeout(w._timer); w._timer = null;
  const reload = new Wallet(cfg); // the tab closed before it was sent
  assert.equal(reload.coins, 210);
  srv.down = false;
  await reload.connect(srv.cloud);
  await reload.flush();
  assert.equal(srv.row.coins, 210);
  await reload.flush();
  assert.equal(srv.row.coins, 210, 'not twice');
});

test('server wallet: a refund gives back only what that payment took', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 100, gift: WELCOME_COINS });
  const srv = fakeServer();
  const w = new Wallet(cfg);
  await w.connect(srv.cloud);
  w.spend(40);
  const paid = w.lastOp;
  w.refund(40, paid);
  await w.flush();
  assert.equal(srv.row.coins, 100);
  assert.deepEqual(w.log.map((e) => e.n), [-40, 40]);
});

test('server wallet: ads are counted by the server', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 0, gift: WELCOME_COINS });
  const srv = fakeServer();
  const w = new Wallet(cfg);
  await w.connect(srv.cloud);
  const show = async () => true;
  let got = 0;
  for (let i = 0; i < 7; i++) got += await w.watchAd(show);
  assert.equal(got, 100);
  assert.equal(w.adsLeft(), 0);
  assert.equal(srv.row.coins, 100);
});

test('before the SQL is set up, the wallet stays in the browser', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 70, gift: WELCOME_COINS });
  const w = new Wallet(cfg);
  assert.equal(await w.connect(fakeServer({ missing: true }).cloud), 'local');
  assert.equal(w.server, false);
  w.add(5);
  assert.equal(JSON.parse(store['mk.wallet']).coins, 75);
  assert.equal(await w.connect(null), 'local');
});

test('another account on this device does not get this copy', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 300, gift: WELCOME_COINS });
  const a = fakeServer();
  const w = new Wallet(cfg);
  await w.connect(a.cloud);
  w.add(10);
  const b = fakeServer();
  b.row = { coins: 7, ver: 3, welcome: WELCOME_COINS, ads: 5 };
  const w2 = new Wallet(cfg);
  await w2.connect({ client: b.client, user: { id: 'u2' } });
  assert.equal(w2.coins, 7);
  assert.equal(w2.s.queue.length, 0);
});
