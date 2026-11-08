import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
};
const { Wallet, WELCOME_COINS, LOG_MAX, onceId } = await import('../src/core/wallet.js');
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

test('players from before the gift get it too, on top of what they had (old coins become won)', () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 42, day: '', ads: 0 });
  const w = new Wallet(cfg);
  assert.equal(w.welcome(), WELCOME_COINS);
  assert.equal(w.coins, 42000 + WELCOME_COINS);
});

test('players who got the old 500 coins (₩500,000) get the rest once when the gift goes up', () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 120, day: '', ads: 0, gift: 1 });
  const w = new Wallet(cfg);
  assert.equal(w.welcome(), WELCOME_COINS - 500000);
  assert.equal(w.coins, 120000 + WELCOME_COINS - 500000);
  assert.equal(new Wallet(cfg).welcome(), 0, 'only once');
});

test('a coin save, budget book and receipts are turned into won once', () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 7, gift: 1000 });
  store['mk.ledger'] = JSON.stringify([{ t: 1, n: -3, bal: 7, note: null }]);
  const w = new Wallet(cfg);
  assert.equal(w.coins, 7000);
  assert.equal(w.welcome(), 0, 'the old 1,000-coin gift is the ₩1,000,000 one');
  assert.deepEqual(w.log.map((e) => [e.n, e.bal]), [[-3000, 7000]]);
  w.add(500);
  const again = new Wallet(cfg);
  assert.equal(again.coins, 7500, 'saved in won: not multiplied again');
  assert.deepEqual(again.log.map((e) => e.n), [-3000, 500]);
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
// unit 'krw': 018_won.sql has run; 'coin': a server from before it.
function fakeServer({ earnMax = 2000, migrateMax = 30000, welcome = WELCOME_COINS, missing = false, resell = 10, unit = 'krw' } = {}) {
  const srv = { row: null, seen: new Map(), calls: [], down: false };
  srv.client = {
    rpc: async (fn, args) => {
      srv.calls.push(fn);
      if (missing) return { error: { code: 'PGRST202', message: 'Could not find the function' } };
      if (srv.down) return { error: { message: 'fetch failed' } };
      const r = srv.row;
      if (fn === 'wallet_resell_pct') return resell == null ? { error: { code: 'PGRST202', message: 'Could not find the function' } } : { data: resell };
      if (fn === 'wallet_open') {
        if (unit === 'coin' && args.p_unit) return { error: { code: 'PGRST202', message: 'Could not find the function' } };
        let created = false, given = 0;
        if (!r) { created = true; srv.row = { coins: Math.min(args.p_local, migrateMax), ver: 0, welcome: Math.min(args.p_gift, welcome), ads: 5 }; }
        const w = srv.row;
        if (w.welcome < welcome) { given = welcome - w.welcome; w.coins += given; w.welcome = welcome; }
        if (created || given) w.ver++;
        return { data: { status: 'ok', unit: unit === 'krw' ? 'krw' : undefined, coins: w.coins, ver: w.ver, created, welcome: given, ads_left: w.ads } };
      }
      if (fn === 'wallet_apply') {
        const results = [];
        for (const op of args.p_ops) {
          srv.sent = [...(srv.sent || []), op];
          if (srv.seen.has(op.id)) { results.push({ id: op.id, n: srv.seen.get(op.id), status: 'ok' }); continue; }
          let n = 0;
          if (op.k === 'resell') { // 017_resale.sql
            srv.sold ??= new Set();
            const paid = srv.seen.get(op.ref);
            const status = !(paid < 0) ? 'noref' : srv.sold.has(op.ref) ? 'sold' : 'ok';
            if (status === 'ok') { n = Math.min(op.n, Math.floor((-paid * resell) / 100)); srv.sold.add(op.ref); }
            srv.seen.set(op.id, n);
            r.coins += n;
            results.push({ id: op.id, n, status });
            continue;
          }
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
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 99999, gift: 0 });
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
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 100, gift: WELCOME_COINS });
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
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 200, gift: WELCOME_COINS });
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
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 100, gift: WELCOME_COINS });
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
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 0, gift: WELCOME_COINS });
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
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 70, gift: WELCOME_COINS });
  const w = new Wallet(cfg);
  assert.equal(await w.connect(fakeServer({ missing: true }).cloud), 'local');
  assert.equal(w.server, false);
  w.add(5);
  assert.equal(JSON.parse(store['mk.wallet']).coins, 75);
  assert.equal(await w.connect(null), 'local');
});

test('another account on this device does not get this copy', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 300, gift: WELCOME_COINS });
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

test('second-hand shops: the server pays from its ledger, once per purchase, and only once the purchase is there', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 100, gift: WELCOME_COINS });
  const srv = fakeServer();
  const w = new Wallet(cfg);
  await w.connect(srv.cloud);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(w.resellPct, 10, 'the share comes from the server');
  assert.equal(w.spend(60, { name: { en: 'Black hoodie' } }), true);
  const buy = w.lastOp;
  // Still queued: resell sends the purchase first.
  const sold = await w.resell({ id: 'sell-1', n: 6, ref: buy, note: { name: { en: 'Black hoodie' } } });
  assert.deepEqual(sold, { ok: true, n: 6 });
  assert.equal(w.coins, 46);
  assert.equal(srv.row.coins, 46);
  assert.equal(w.log.at(-1).n, 6, 'in the budget book');
  assert.deepEqual(await w.resell({ id: 'sell-1', n: 6, ref: buy }), { ok: true, n: 6 }, 'the same sale asked again pays nothing more');
  assert.equal(srv.row.coins, 46);
  assert.deepEqual(await w.resell({ id: 'sell-2', n: 6, ref: buy }), { ok: true, n: 0, why: 'sold' }, 'a purchase sells back once');
  assert.equal(srv.row.coins, 46);
  assert.deepEqual(await w.resell({ id: 'sell-3', n: 50, ref: 'made-up' }), { ok: false, n: 0, why: 'noref' });
  assert.equal(w.coins, 46);
  srv.down = true;
  assert.equal((await w.resell({ id: 'sell-4', n: 6, ref: buy })).why, 'offline');
});

test('second-hand shops: closed until the SQL is run; a browser-only wallet pays at once', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 100, gift: WELCOME_COINS });
  const srv = fakeServer({ resell: null });
  const w = new Wallet(cfg);
  await w.connect(srv.cloud);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(w.resellPct, null);
  assert.equal((await w.resell({ id: 'x', n: 6, ref: 'y' })).why, 'closed');
  const local = fresh();
  assert.equal(local.resellPct, 10);
  assert.deepEqual(await local.resell({ id: 'x', n: 6 }), { ok: true, n: 6 });
  assert.equal(local.coins, 6);
});

test('before 018_won.sql the server still counts coins: amounts are changed on the way', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 5000, gift: WELCOME_COINS });
  const srv = fakeServer({ unit: 'coin', welcome: 1000 });
  const w = new Wallet(cfg);
  assert.equal(await w.connect(srv.cloud), 'server');
  assert.equal(srv.row.coins, 5, 'the browser money went over in coins');
  assert.equal(w.coins, 5000);
  assert.equal(w.spend(2000), true);
  await w.flush();
  assert.equal(srv.row.coins, 3);
  assert.equal(w.coins, 3000, 'the server balance, shown in won');
  assert.equal(srv.client && srv.calls.includes('wallet_apply'), true);
});

test('ops queued in coins before won are sent as won', async () => {
  fresh();
  store['mkw.state'] = JSON.stringify({ uid: 'u1', base: 10, ver: 1, ads: 5, adsDay: '', queue: [{ id: 'a', n: -4, k: 'spend' }] });
  const w = new Wallet(cfg);
  assert.equal(w.coins, 6000);
  const srv = fakeServer();
  srv.row = { coins: 10000, ver: 1, welcome: WELCOME_COINS, ads: 5 };
  await w.connect(srv.cloud);
  await w.flush();
  assert.equal(srv.row.coins, 6000);
});

test('the page shows money as won: 🪙 amounts become ₩ with commas', async () => {
  const { wonText } = await import('../src/ui/gold-coin.js');
  assert.equal(wonText('🪙 4500'), '₩4,500');
  assert.equal(wonText('Check in (+30000 🪙)'), 'Check in (+₩30,000)');
  assert.equal(wonText('Sold! 🪙 +45000'), 'Sold! +₩45,000');
  assert.equal(wonText('물고기 가방 🪙 1500어치'), '물고기 가방 ₩1,500어치');
  assert.equal(wonText('Fare 🪙 1,550'), 'Fare ₩1,550');
  assert.equal(wonText('no money here'), 'no money here');
});

test('earnings name their reward; once-only rewards keep one op id however often they are given', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 0, gift: WELCOME_COINS });
  const srv = fakeServer({ earnMax: 1e9 });
  const w = new Wallet(cfg);
  await w.connect(srv.cloud);
  const base = w.coins;
  w.add(20000, { k: 'ledger.stamp' }, { r: 'stamp', once: 'stamp:gyeongbok' });
  w.add(30000, null, { r: 'job' });
  w.spend(1000, null);
  await w.flush();
  const [stamp, job, pay] = srv.sent;
  assert.equal(stamp.r, 'stamp');
  assert.equal(stamp.id, onceId('stamp:gyeongbok'));
  assert.equal(job.r, 'job');
  assert.equal(pay.r, undefined, 'only earnings name a reward');
  // Storage cleared, the stamp taken again: the server pays it once.
  fresh();
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 0, gift: WELCOME_COINS });
  const again = new Wallet(cfg);
  await again.connect(srv.cloud);
  again.add(20000, null, { r: 'stamp', once: 'stamp:gyeongbok' });
  await again.flush();
  assert.equal(again.coins, base + 20000 + 30000 - 1000);
});

test('once ids are fixed, different per text, and look like uuids', () => {
  assert.equal(onceId('medal:grill:gold'), onceId('medal:grill:gold'));
  assert.notEqual(onceId('medal:grill:gold'), onceId('medal:grill:silver'));
  assert.match(onceId('x'), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('server wallet: a reward the server cut gets its own line, so the book adds up to the balance', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 100, gift: WELCOME_COINS });
  const srv = fakeServer({ earnMax: 50 });
  const w = new Wallet(cfg);
  await w.connect(srv.cloud);
  w.add(500, { k: 'ledger.quest' });
  await w.flush();
  assert.equal(w.coins, 150);
  const tail = w.log.slice(-2).map((e) => [e.n, e.bal, e.note?.k]);
  assert.deepEqual(tail, [[500, 600, 'ledger.quest'], [-450, 150, 'ledger.cut']]);
});

test('signed in to another account on this device: the balance change is in the book, not silent', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 0, gift: WELCOME_COINS });
  const a = fakeServer();
  a.row = { coins: 5003850, ver: 3, welcome: WELCOME_COINS, ads: 5 };
  const w = new Wallet(cfg);
  await w.connect(a.cloud);
  w.add(-70000, { k: 'ledger.hair' }, { kind: 'spend' });
  await w.flush();
  assert.equal(w.log.at(-1).bal, 4933850);
  // The same device, now signed in to account u2 that only has the welcome money.
  const b = fakeServer();
  b.row = { coins: WELCOME_COINS, ver: 1, welcome: WELCOME_COINS, ads: 5 };
  b.cloud.user = { id: 'u2' };
  const again = new Wallet(cfg);
  await again.connect(b.cloud);
  assert.equal(again.coins, WELCOME_COINS);
  const last = again.log.at(-1);
  assert.deepEqual([last.n, last.bal, last.note], [WELCOME_COINS - 4933850, WELCOME_COINS, { k: 'ledger.account' }]);
  assert.equal(a.row.coins, 4933850, 'the money is still on the first account');
});

test('balance changed on another device: one sync line on connect, none when it already matches', async () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ u: 1, coins: 0, gift: WELCOME_COINS });
  const srv = fakeServer();
  srv.row = { coins: 300000, ver: 1, welcome: WELCOME_COINS, ads: 5 };
  const w = new Wallet(cfg);
  await w.connect(srv.cloud);
  w.add(-1000, null, { kind: 'spend' });
  await w.flush();
  const n = w.log.length;
  srv.row.coins -= 50000; srv.row.ver++; // spent on the phone
  const again = new Wallet(cfg);
  await again.connect(srv.cloud);
  assert.deepEqual([again.log.length, again.log.at(-1).n, again.log.at(-1).note?.k], [n + 1, -50000, 'ledger.sync']);
  const third = new Wallet(cfg);
  await third.connect(srv.cloud);
  assert.equal(third.log.length, n + 1, 'nothing new when it matches');
});
