import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cleanError, cleanSrc, createCounts, createErrorSender, createVisit, deviceClass, firstSrc, newSessionId, someoneNear, STAGE, startSessionReports,
} from '../src/core/sessions.js';
import { countryLabel, funnelRow, ratio, sumCohorts } from '../src/admin/retention.js';

const memStorage = () => { const m = new Map(); return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('device class comes from touch and screen size only', () => {
  assert.equal(deviceClass({ touch: false, width: 390, height: 844 }), 'desktop');
  assert.equal(deviceClass({ touch: true, width: 390, height: 844 }), 'phone');
  assert.equal(deviceClass({ touch: true, width: 820, height: 1180 }), 'tablet');
});

test('src labels are plain short words, and the first one sticks', () => {
  assert.equal(cleanSrc('EXT'), 'ext');
  assert.equal(cleanSrc('reddit_kr-1'), 'reddit_kr-1');
  for (const bad of ['', 'has space', 'a'.repeat(17), '<script>', null, undefined]) assert.equal(cleanSrc(bad), '');
  const st = memStorage();
  assert.equal(firstSrc('?src=ext', st), 'ext');
  assert.equal(firstSrc('?src=reddit', st), 'ext');
  assert.equal(firstSrc('', st), 'ext');
  assert.equal([...st.m.keys()].some((k) => k.startsWith('mk.')), false, 'kept out of the cloud save');
  assert.equal(firstSrc('', memStorage()), '');
});

test('session ids are uuids', () => {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.match(newSessionId(), re);
  assert.match(newSessionId({}), re); // no crypto: still a valid id
});

test('wallet balance changes become earned, spent and purchases', () => {
  const c = createCounts();
  c.coins(1000); // the starting balance isn't earned
  c.coins(1120);
  c.coins(1080);
  c.coins(1080);
  c.coins(1000);
  c.fish(); c.fish(); c.chat(); c.near(1.4); c.near(1.4);
  assert.deepEqual(c.snapshot(), { fish: 2, coinsIn: 120, coinsOut: 120, buys: 2, chats: 1, nearSec: 3, ads: 0, errors: 0, quests: 0 });
  c.reset();
  assert.deepEqual(c.snapshot(), { fish: 0, coinsIn: 0, coinsOut: 0, buys: 0, chats: 0, nearSec: 0, ads: 0, errors: 0, quests: 0 });
  c.coins(1010);
  assert.equal(c.snapshot().coinsIn, 10, 'balance tracking survives a reset');
});

test('someone near means within 25 m', () => {
  assert.equal(someoneNear({ x: 0, z: 0 }, [{ x: 30, z: 0 }, { x: 0, z: 26 }]), false);
  assert.equal(someoneNear({ x: 0, z: 0 }, [{ x: 30, z: 0 }, { x: 15, z: 15 }]), true);
  assert.equal(someoneNear(null, [{ x: 0, z: 0 }]), false);
});

// A fake clock and timer so the reports can be stepped through.
function harness({ playing = true, ok = true } = {}) {
  let t = 0, cb = null;
  const listeners = {};
  const doc = { hidden: false, addEventListener: (e, f) => { listeners[e] = f; }, removeEventListener: () => {} };
  const sent = [];
  let ids = 0;
  const counts = createCounts();
  const stop = startSessionReports({
    get: () => (playing ? { region: 'seongsu', device: 'phone', src: 'ext' } : null),
    send: async (r) => { sent.push(r); return ok; },
    counts, fps: { fps: () => 58 },
    doc, now: () => t, newId: () => `s${++ids}`,
    beatMs: 60000, firstMs: 15000, gapMs: 30 * 60000,
    setTimer: (f) => { cb = f; return 1; }, clearTimer: () => { cb = null; },
  });
  const step = async (sec) => { for (let i = 0; i < sec; i++) { t += 1000; cb?.(); await null; } };
  const setHidden = (h) => { doc.hidden = h; listeners.visibilitychange?.(); };
  return { sent, step, setHidden, counts, stop, advance: (ms) => { t += ms; } };
}

test('reports after 15 s, then once a minute, with this session\'s counts', async () => {
  const h = harness();
  h.counts.fish();
  await h.step(14);
  assert.equal(h.sent.length, 0);
  await h.step(1);
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.sent[0], { id: 's1', region: 'seongsu', device: 'phone', src: 'ext', fps: 58, counts: { fish: 1, coinsIn: 0, coinsOut: 0, buys: 0, chats: 0, nearSec: 0, ads: 0, errors: 0, quests: 0 } });
  await h.step(60);
  assert.equal(h.sent.length, 2);
  assert.equal(h.sent[1].id, 's1');
  h.stop();
});

test('nothing is sent while hidden; a short break keeps the session, a long one starts a new one', async () => {
  const h = harness();
  await h.step(15);
  h.setHidden(true); // one last report as the tab goes away
  assert.equal(h.sent.length, 2);
  await h.step(120);
  assert.equal(h.sent.length, 2);
  h.setHidden(false);
  await h.step(45);
  assert.equal(h.sent.at(-1).id, 's1', 'same session after a 2-minute break');
  h.counts.fish();
  h.setHidden(true);
  h.advance(31 * 60000);
  h.setHidden(false);
  await h.step(15);
  assert.equal(h.sent.at(-1).id, 's2');
  assert.equal(h.sent.at(-1).counts.fish, 0, 'counts start again for the new session');
});

test('no reports while not playing, and none after the server says no', async () => {
  const idle = harness({ playing: false });
  await idle.step(200);
  assert.equal(idle.sent.length, 0);
  const off = harness({ ok: false });
  await off.step(200);
  assert.equal(off.sent.length, 1);
});

test('admin ratios show counts and wait for the day to be over', () => {
  assert.equal(ratio(3, 7), '3/7 (43%)');
  assert.equal(ratio(0, 0), '0/0');
  assert.equal(ratio(1, 2, false), '–');
  const s = sumCohorts([
    { joined: '2026-11-01', tagged: true, players: 4, d1: 2, d3: 1, d7: 1, d7plus: 2, first_under5: 1, d1_ready: true, d3_ready: true, d7_ready: true },
    { joined: '2026-11-06', tagged: false, players: 3, d1: 1, d3: 0, d7: 0, d7plus: 0, first_under5: 2, d1_ready: true, d3_ready: false, d7_ready: false },
  ]);
  assert.deepEqual(s.all, { players: 7, d1: 3, d1of: 7, d3: 1, d3of: 4, d7: 1, d7of: 4, d7plus: 2, under5: 3 });
  assert.equal(s.tagged.players, 4);
  assert.equal(s.other.d3of, 0);
});

test('the session SQL stores no personal data and keeps the table private', () => {
  const sql = readFileSync(new URL('../supabase/011_play_sessions.sql', import.meta.url), 'utf8');
  const table = sql.match(/create table if not exists public\.play_sessions \(([\s\S]*?)\n\);/)[1];
  for (const banned of ['ip', 'email', 'name', 'user_agent', ' x ', ' z ', 'text_']) assert.equal(new RegExp(`\\n\\s*${banned.trim()}\\b`).test(table), false, banned);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.play_sessions from anon, authenticated/);
  assert.match(sql, /perform public\.ops_check\(\)/);
});

test('ads, errors and square missions are counted per session', () => {
  const c = createCounts();
  c.ad(); c.ad(); c.error(); c.quest();
  const n = c.snapshot();
  assert.equal(n.ads, 2); assert.equal(n.errors, 1); assert.equal(n.quests, 1);
  c.reset();
  assert.equal(c.snapshot().ads, 0);
});

test('error messages lose digits and links, and only a few are sent per visit', async () => {
  assert.equal(cleanError('position reset (x=12.5, z=-3)'), 'position reset (x=#.#, z=-#)');
  assert.equal(cleanError('boom @ https://another-seoul.com/assets/index-abc123.js:10:2'), 'boom @ <url>');
  assert.ok(cleanError('x'.repeat(500)).length <= 120);
  const sent = [];
  const send = createErrorSender((m) => sent.push(m), 2);
  assert.equal(send('a 1'), true);
  assert.equal(send('a 2'), false, 'same message once digits are gone');
  assert.equal(send('b'), true);
  assert.equal(send('c'), false, 'cap reached');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(sent, ['a #', 'b']);
});

test('a visit moves forward through the funnel and times loading from Play', async () => {
  const got = [];
  let t = 1000;
  const v = createVisit({ send: (r) => { got.push({ ...r }); return true; }, isNew: true, device: 'phone', newId: () => 'v1', now: () => t });
  v.reach(STAGE.OPEN);
  t = 5000; v.reach(STAGE.PRESSED);
  t = 8500; v.reach(STAGE.LOADED);
  assert.equal(v.reach(STAGE.PRESSED), false, 'never goes back');
  v.reach(STAGE.MINUTE);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(got.map((r) => r.stage), [1, 2, 3, 4]);
  assert.equal(got[2].loadMs, 3500);
  assert.equal(got[0].isNew, true);
  assert.equal(got[0].id, 'v1');
});

test('a failed load is reported once, and a missing server stops the reports', async () => {
  let calls = 0;
  const v = createVisit({ send: () => { calls++; return false; }, newId: () => 'v2' });
  v.reach(STAGE.OPEN);
  await new Promise((r) => setTimeout(r, 0));
  v.fail(); v.reach(STAGE.PRESSED);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls, 1);
});

test('014 SQL keeps the old report_session signature and stores no account id with errors', () => {
  const sql = readFileSync(new URL('../supabase/014_retention_more.sql', import.meta.url), 'utf8');
  assert.match(sql, /create or replace function public\.report_session\(\s*p_id uuid, p_region text, p_device text, p_src text, p_fps int, p_counts jsonb\s*\)/);
  const errTable = sql.match(/create table if not exists public\.client_errors \(([^;]*)\);/)[1];
  assert.doesNotMatch(errTable, /user_id/);
  for (const fn of ['report_visit', 'report_error', 'ops_retention_more']) assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\(`));
  assert.match(sql, /ops_retention_more[\s\S]*perform public\.ops_check\(\)/);
});

test('funnel rows and country labels for the admin page', () => {
  assert.deepEqual(funnelRow({ is_new: true, opened: 10, pressed: 8, loaded: 6, minute: 5, failed: 1, load_med_s: 4.2, load_p90_s: 11 }),
    ['First visit', 10, '8/10 (80%)', '6/10 (60%)', '5/10 (50%)', '1/10 (10%)', '4.2 s / 11 s']);
  assert.equal(funnelRow({ is_new: false, opened: 0, pressed: 0, loaded: 0, minute: 0, failed: 0, load_med_s: 0 })[6], '–');
  assert.match(countryLabel('KR'), /^🇰🇷 /);
  assert.equal(countryLabel('XX'), '❔ Unknown');
  assert.equal(countryLabel('<b>'), '❔ Unknown');
});

test('016 SQL keeps operators out of every statistics table', () => {
  const sql = readFileSync(new URL('../supabase/016_stats_skip_operators.sql', import.meta.url), 'utf8');
  for (const t of ['play_sessions', 'play_visits', 'player_country_days', 'client_errors']) {
    assert.match(sql, new RegExp(`create trigger skip_operator before insert on public\\.${t}\\b`), t);
  }
  assert.match(sql, /revoke all on function public\.stats_skip_operator\(\) from public, anon, authenticated/);
});
