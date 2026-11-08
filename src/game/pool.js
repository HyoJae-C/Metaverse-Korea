// Olympic Park Pool (core/pool.js rules, core/pool-hall.js the hall): you
// are in swimwear and a cap as soon as you come in (your own clothes come
// back when you leave, like trying clothes on; other swimsuits are in the
// lockers by the door), swim in any pool (flat on the water while moving, others see
// it too), borrow a tube, race 50 m against three swimmers by tapping
// Stroke! in rhythm, or climb the tower and dive, tapping Flip! for
// somersaults. Records stay on this device; the first races of a day pay a
// few coins.
import { COMP, COUNTDOWN, FLIP_TIME, LOBBY, PoolLog, RACE_LEN, Race, SWIM_Y, WATER_Y, boardById, diveHeight, laneZ, maxFlips, pickLane, raceMsg, rankTimes, rivalLanes, rivalPaces, scoreDive, waterAt } from '../core/pool.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { MEDALS, POOL_TEXT, RIVAL_LOOKS, RIVAL_NAMES, SWIMSUITS } from '../data/pool-text.js';
import { buzz } from '../core/haptics.js';
import { config } from '../config.js';
import { getLanguage, onLanguageChange } from '../core/i18n.js';
import { makeNpc, placeLabels, say } from '../core/npcs.js';

export function createPool(game) {
  const { $, STALE, cam, camera, hiringRedraws, myId, refreshWallet, safety, setLook, sfx, shop,
    skatePop, wallet } = game;
  const PT = POOL_TEXT;
  const poolLog = new PoolLog();
  const pool = {
    was: false, // inside the hall last frame
    act: null, // the activity pose to show ('swim', 'tube', 'dive')
    slow: 1, // walking speed factor (slower in the water)
    tube: false,
    mode: null, // null | { kind: 'board', b } | { kind: 'dive', b, t, queued, rot } | { kind: 'race', ... }
    welcomed: 0, tip: -1,
    suit: 0, // which swimsuit you wear in the hall
    opens: new Map(), // races friends opened in the hall: rid -> { from, name, lane, lanes, joined, endsAt }
    lastRace: null, // our finished race with friends, while their times come in
  };
  const wearingSwim = () => typeof game.currentLook?.model === 'string' && game.currentLook.model.startsWith('swim-');
  function wearSwim(id) {
    const keep = { hair: game.myLook.hair, skin: game.myLook.skin, shirt: game.myLook.shirt, pants: game.myLook.pants, dye: game.myLook.dye, hairStyle: game.myLook.hairStyle, eyeShape: game.myLook.eyeShape, lip: game.myLook.lip, eyes: game.myLook.eyes, tone: game.myLook.tone, small: game.myLook.small, emblem: game.myLook.emblem, nameColor: game.myLook.nameColor, op: game.myLook.op };
    setLook({ ...keep, model: id }); // no hat, glasses or bag in the water; the cap covers the hair
    $('revert-look').hidden = true;
    game.action = STALE;
  }
  function poolHud() {
    const hud = $('pool-hud');
    const on = game.mode === 'store' && !!game.interior?.pool;
    hud.hidden = !on;
    if (!on) return;
    const m = pool.mode;
    if (m?.kind === 'race') {
      const r = m.race;
      $('pool-score').textContent = fmt(L(PT.hudRace), { m: Math.floor(r.x), t: Math.max(0, r.t).toFixed(1) });
      $('pool-sub').textContent = r.started ? '' : r.t < -COUNTDOWN ? fmt(L(PT.waiting), { s: Math.ceil(-r.t - COUNTDOWN), n: m.mates.size + 1 }) : L(PT.ready);
    } else {
      const s = poolLog.s;
      $('pool-score').textContent = fmt(L(PT.hudPool), { race: s.bestRace ? s.bestRace.toFixed(2) + 's' : '–', dive: s.bestDive || '–' });
      $('pool-sub').textContent = '';
    }
  }
  const hall = () => game.interior?.pool ? game.interior : null;

  // ---- the race ----
  // Alone in the hall: three rival swimmers, off after the countdown. With
  // other players in the hall the block opens a race first (LOBBY seconds,
  // or Start now): friends who step on a block join, everyone counts down
  // together, and the board ranks the real swimmers. Nobody joined: the
  // rivals swim instead. (Messages: core/pool.js raceMsg.)
  const raceRid = () => Math.random().toString(36).slice(2, 9);
  const poolFriends = () => game.others.players.size > 0;
  function spawnRivals(race, lane) {
    race.paces = rivalPaces();
    return rivalLanes(lane).map((ln, i) => {
      const o = makeNpc($('labels'), RIVAL_NAMES[i], RIVAL_LOOKS[i]);
      o.lane = ln;
      o.ch.root.position.set(COMP.x0 - 0.55, 0.58, laneZ(ln));
      o.ch.root.rotation.y = Math.PI / 2;
      game.interior.scene.add(o.ch.root);
      return o;
    });
  }
  function onBlock(lane) {
    game.me.root.position.set(COMP.x0 - 0.55, 0.58, laneZ(lane));
    game.me.root.rotation.y = Math.PI / 2;
    cam.yaw = 0.55; // from the deck side, looking along the lanes
  }
  function startRace(lane) {
    if (pool.mode) return;
    pool.tube = false;
    const friends = poolFriends();
    const race = new Race(lane, []);
    if (friends) race.t = -(LOBBY + COUNTDOWN);
    const m = { kind: 'race', race, rivals: [], lane, count: 4, after: 0, rid: friends ? raceRid() : null, host: true, mates: new Map(), sent: 0 };
    if (!friends) m.rivals = spawnRivals(race, lane);
    pool.mode = m;
    pool.lastRace = null;
    hall().setRaceMode(true);
    onBlock(lane);
    if (friends) { sendRaceOpen(m); shop.toast(fmt(L(PT.opened), { s: LOBBY })); } else shop.toast(L(PT.raceHint));
    game.action = STALE;
  }
  const lobbyLeft = (r) => Math.max(0, -r.t - COUNTDOWN);
  function sendRaceOpen(m) { m.sent = performance.now(); game.net.sendEmote(raceMsg('open', m.rid, { lane: m.lane, left: lobbyLeft(m.race) })); }
  // Join a race a friend opened, in the lane you stand at or the nearest free one.
  function joinRace(o, want) {
    if (pool.mode) return;
    const lane = pickLane(want, o.lanes);
    if (lane < 0) return;
    pool.tube = false;
    const race = new Race(lane, []);
    race.t = -(Math.max(0, (o.endsAt - performance.now()) / 1000) + COUNTDOWN);
    const mates = new Map([[o.from, { name: o.name, lane: o.lane, time: null }]]);
    for (const [id, j] of o.joined) if (id !== myId) mates.set(id, { ...j, time: null });
    pool.mode = { kind: 'race', race, rivals: [], lane, count: 4, after: 0, rid: o.rid, host: false, mates };
    pool.lastRace = null;
    o.lanes.add(lane);
    hall().setRaceMode(true);
    onBlock(lane);
    game.net.sendEmote(raceMsg('join', o.rid, lane));
    shop.toast(L(PT.raceHint));
    game.action = STALE;
  }
  function raceStartNow() {
    const m = pool.mode;
    if (m?.kind !== 'race' || !m.host || m.race.t >= -COUNTDOWN) return;
    m.race.t = -COUNTDOWN - 0.01;
    if (m.rid) sendRaceOpen(m);
  }
  // A race message from someone in the hall.
  function onPoolRace(id, msg) {
    if (!game.interior?.pool || safety.isBlocked(id, game.others.nameOf(id))) return;
    const name = game.others.nameOf(id) || '?';
    const now = performance.now();
    const m = pool.mode?.kind === 'race' && pool.mode.rid === msg.rid ? pool.mode : null;
    if (msg.verb === 'open') {
      let o = pool.opens.get(msg.rid);
      if (!o) {
        o = { rid: msg.rid, from: id, name, lane: msg.lane, lanes: new Set([msg.lane]), joined: new Map() };
        pool.opens.set(msg.rid, o);
        if (!pool.mode && msg.left > 0.5) shop.toast(fmt(L(PT.invite), { name }));
      }
      o.endsAt = now + msg.left * 1000;
      if (m && !m.race.started) { // line up with the host's clock
        const want = -(msg.left + COUNTDOWN);
        if (Math.abs(m.race.t - want) > 0.25) m.race.t = want;
      }
      game.action = STALE;
    } else if (msg.verb === 'join') {
      const o = pool.opens.get(msg.rid);
      if (o) { o.lanes.add(msg.lane); o.joined.set(id, { name, lane: msg.lane }); }
      if (m && !m.mates.has(id)) {
        m.mates.set(id, { name, lane: msg.lane, time: null });
        shop.toast(fmt(L(PT.joined), { name, n: msg.lane + 1 }));
        if (m.host) sendRaceOpen(m); // so the newcomer's clock matches
      }
    } else if (msg.verb === 'fin') {
      const r = m || (pool.lastRace?.rid === msg.rid ? pool.lastRace : null);
      const mate = r?.mates.get(id);
      if (mate && mate.time == null) { mate.time = msg.time; if (r.race?.done || r === pool.lastRace) drawFriendBoard(r); }
    } else if (msg.verb === 'quit') {
      pool.opens.get(msg.rid)?.joined.delete(id);
      if (pool.opens.get(msg.rid)?.from === id) pool.opens.delete(msg.rid);
      const r = m || (pool.lastRace?.rid === msg.rid ? pool.lastRace : null);
      if (r?.mates.get(id)?.time == null) r?.mates.delete(id);
    }
  }
  // The open race (not ours) a block could join, if any.
  function joinableRace() {
    const now = performance.now();
    let best = null;
    for (const [rid, o] of pool.opens) {
      if (o.endsAt < now - 500 || !game.others.players.has(o.from)) { if (o.endsAt < now - 60e3 || !game.others.players.has(o.from)) pool.opens.delete(rid); continue; }
      if (o.endsAt > now + 300 && (!best || o.endsAt < best.endsAt)) best = o;
    }
    return best;
  }
  function strokeTap() {
    const m = pool.mode;
    if (m?.kind !== 'race' || !m.race.started || m.race.done) return;
    const q = m.race.tap(performance.now() / 1000);
    if (q < 0.5) skatePop(L(PT.splash), 'bail');
    else { sfx.splash?.(false); buzz(8); }
  }
  // Where a swimmer is, s metres into the race, t seconds after the start: a
  // short dive off the block first.
  function racePos(s, t, lane) {
    const dive = Math.min(1, Math.max(0, t / 0.6));
    if (t < 0.6) return { x: COMP.x0 - 0.55 + dive * 3.5, y: 0.58 + (SWIM_Y - 0.58) * dive + Math.sin(dive * Math.PI) * 0.6, z: laneZ(lane), air: true };
    return { x: Math.max(COMP.x0 + 2.95, COMP.x0 + s), y: SWIM_Y, z: laneZ(lane), air: false };
  }
  function raceTick(dt, p) {
    const m = pool.mode, r = m.race;
    const before = Math.ceil(-r.t);
    const lobby = r.t < -COUNTDOWN;
    // The race runs on the real clock, not the frame time (capped when frames
    // are slow), so friends on slow and fast devices start and finish together.
    const now = performance.now() / 1000;
    let rdt = m.clock ? Math.min(1, now - m.clock) : dt;
    m.clock = now;
    while (rdt > 1e-6) {
      const step = Math.min(0.05, rdt);
      rdt -= step;
      for (const ev of r.step(step)) {
        if (ev === 'go') { skatePop(L(PT.go), 'big'); sfx.skatePop(); game.action = STALE; }
        if (ev === 'finish') finishRace();
      }
      if (r.done) break;
    }
    if (lobby && r.t >= -COUNTDOWN) { // the lobby closed
      if (m.host && m.rid) sendRaceOpen(m);
      if (m.host && !m.mates.size) { m.rivals = spawnRivals(r, m.lane); m.rid && game.net.sendEmote(raceMsg('quit', m.rid)); m.rid = null; shop.toast(L(PT.raceHint)); }
      game.action = STALE;
    }
    if (lobby && m.host && m.rid && performance.now() - m.sent > 2000) sendRaceOpen(m); // for anyone who just came in
    const n = Math.ceil(-r.t);
    if (!r.started && before !== n && n > 0 && n <= COUNTDOWN) skatePop(String(n));
    if (lobby && before !== n) game.action = STALE; // the countdown on the button
    const me0 = racePos(r.x, r.t, m.lane);
    if (!r.started) { me0.x = COMP.x0 - 0.55; me0.y = 0.58; }
    p.set(me0.x, me0.y, me0.z);
    game.me.root.rotation.y = Math.PI / 2;
    pool.act = r.started && !me0.air ? 'swim' : 'dive';
    pool.speed01 = r.started && !me0.air ? Math.min(1, 0.35 + r.v / 4) : 0;
    const dist = r.rivals();
    m.rivals.forEach((o, i) => {
      const q = racePos(dist[i], r.t, o.lane);
      if (!r.started) { q.x = COMP.x0 - 0.55; q.y = 0.58; }
      o.ch.root.position.set(q.x, q.y, q.z);
      const swimming = r.started && !q.air && dist[i] < RACE_LEN;
      o.ch.activity(r.started && !q.air ? 'swim' : 'dive');
      o.ch.animate(dt, swimming ? 0.9 : 0, false);
      placeLabels(o, camera, innerWidth, innerHeight);
    });
    if (r.done) {
      m.after += dt;
      const allIn = m.mates.size ? true : r.paces.every((pc) => pc <= r.t) || m.after > 6;
      if (allIn && m.after > 2.5) endRace();
    }
  }
  // The board for a race with friends: everyone in, fastest first, '–' for
  // those still swimming.
  function drawFriendBoard(r) {
    const rows = rankTimes([{ name: game.nickname || 'You', lane: r.lane, time: r.mine, me: true }, ...[...r.mates.values()].map((x) => ({ name: x.name, lane: x.lane, time: x.time }))]);
    hall()?.drawBoard(L(PT.friendsRace), rows.map((row) => ({ place: row.place ? String(row.place) : '', lane: String(row.lane + 1), name: (row.place && MEDALS[row.place - 1] ? MEDALS[row.place - 1] + ' ' : '') + row.name, time: row.time != null ? row.time.toFixed(2) : '–', me: row.me })), 60);
  }
  function finishRace() {
    const m = pool.mode, r = m.race, { time } = r.done;
    // With friends: your place among those already in (anyone faster has
    // touched the wall before you, so their time is here already).
    const place = m.mates.size ? 1 + [...m.mates.values()].filter((x) => x.time != null && x.time < time).length : r.done.place;
    r.done.place = place;
    const { coins, best } = poolLog.finishRace(time, place);
    skatePop(fmt(L(PT.finish), { medal: MEDALS[place - 1] || '🏁', time: time.toFixed(2) }), place === 1 ? 'big' : 'land');
    let msg = fmt(L(PT.finish), { medal: MEDALS[place - 1] || '🏁', time: time.toFixed(2) });
    if (best) msg += ' · ' + L(PT.newBest);
    if (coins) { wallet.add(coins, { name: { en: '50 m race', ko: '50m 레이스' }, at: game.interior?.store.name }, { r: 'pool' }); refreshWallet(); msg += ' · ' + fmt(L(PT.coins), { n: coins }); }
    shop.toast(msg);
    sfx.landed?.();
    if (m.rid) game.net.sendEmote(raceMsg('fin', m.rid, time));
    m.mine = time;
    if (m.mates.size) { drawFriendBoard(m); return; }
    const rows = [{ name: game.nickname || 'You', lane: m.lane + 1, time, me: true }, ...m.rivals.map((o, i) => ({ name: o.name.replace(/^\S+\s/, ''), lane: o.lane + 1, time: r.paces[i] }))]
      .sort((a, b) => a.time - b.time)
      .map((row, i) => ({ ...row, place: MEDALS[i] ? String(i + 1) : '', lane: String(row.lane), time: row.time.toFixed(2) }));
    hall().drawBoard(L(PT.results), rows, 60);
  }
  function endRace() {
    const m = pool.mode;
    if (m?.kind !== 'race') return;
    for (const o of m.rivals) { o.ch.root.removeFromParent(); o.tag.remove(); o.bubble?.remove(); }
    if (m.rid && !m.race.done) game.net.sendEmote(raceMsg('quit', m.rid));
    // Friends still swimming: their times keep coming onto the board.
    pool.lastRace = m.rid && m.mates.size && m.race.done ? { rid: m.rid, lane: m.lane, mine: m.mine, mates: m.mates } : null;
    hall()?.setRaceMode(false);
    pool.mode = null;
    game.action = STALE;
  }

  // ---- dives ----
  function climbBoard(b) {
    if (pool.mode) return;
    pool.tube = false;
    pool.mode = { kind: 'board', b, at: performance.now() };
    game.me.root.position.set(b.tip, b.h, b.z);
    game.me.root.rotation.y = -Math.PI / 2; // facing the water
    cam.yaw = -0.9; // from the pool side at an angle, clear of the other boards, so the flips show
    if (performance.now() - (pool.diveHinted || 0) > 120e3) { pool.diveHinted = performance.now(); shop.toast(L(PT.diveHint)); }
    game.action = STALE;
  }
  function climbDown() {
    const m = pool.mode;
    if (m?.kind !== 'board') return;
    pool.mode = null;
    game.me.root.position.set(m.b.foot[0], 0, m.b.foot[1]);
    game.action = STALE;
  }
  function startDive() {
    const m = pool.mode;
    if (m?.kind !== 'board') return;
    pool.mode = { kind: 'dive', b: m.b, t: 0, queued: 0, rot: 0 };
    sfx.skatePop();
    game.action = STALE;
  }
  function queueFlip() {
    const m = pool.mode;
    if (m?.kind === 'dive' && m.queued < maxFlips(m.b.h) + 1) m.queued++;
  }
  function diveTick(dt, p) {
    const m = pool.mode;
    m.t += dt;
    if (m.rot < m.queued) m.rot = Math.min(m.queued, m.rot + dt / FLIP_TIME);
    const y = diveHeight(m.b.h, m.t);
    p.set(m.b.tip - 0.4 - 1.3 * m.t, y, m.b.z);
    game.me.root.rotation.y = -Math.PI / 2;
    const turning = m.rot < m.queued;
    game.me.setTrick({ flip: m.rot * Math.PI * 2, tuck: turning ? 1 : 0 }, 0);
    pool.act = turning ? null : 'dive';
    pool.speed01 = 0;
    if (y <= WATER_Y) {
      const res = scoreDive(m.b.h, m.rot);
      game.me.setTrick(null, 0);
      const { best } = poolLog.finishDive(res.points);
      skatePop(fmt(L(res.clean ? PT.clean : PT.flop), { n: res.flips, p: res.points }) + (best && res.clean ? ' 🎉' : ''), res.clean ? (res.flips >= 2 ? 'big' : 'land') : 'bail');
      sfx.splash?.(true);
      buzz(res.clean ? 20 : 70);
      pool.mode = null;
      p.y = WATER_Y - 1.3; // under for a moment, then up to the surface
      game.action = STALE;
    }
  }

  // Every frame, after the walking: in the hall, the water, the race, the dive.
  function poolTick(dt, p, mag = 0) {
    const on = game.mode === 'store' && !!game.interior?.pool;
    if (!on) {
      if (pool.was) { // left the hall: own clothes back, nothing left running
        pool.was = false;
        if (pool.mode?.kind === 'race') endRace();
        if (pool.mode?.kind === 'dive') game.me.setTrick(null, 0);
        pool.mode = null;
        pool.opens.clear();
        pool.lastRace = null;
        pool.tube = false;
        pool.act = null;
        pool.slow = 1;
        if (wearingSwim()) setLook(game.myLook);
        poolHud();
      }
      return;
    }
    if (!pool.was) {
      pool.was = true;
      if (performance.now() - pool.welcomed > 90e3) { pool.welcomed = performance.now(); shop.toast(L(PT.welcome)); }
      // The scoreboard's "buy me a coffee" panel between races (like the street posters).
      if (/^https:\/\//.test(config.supportUrl)) hall().setSupport({ qrUrl: (import.meta.env.BASE_URL || '/') + 'ads/support-qr.png', label: config.supportUrl.replace(/^https:\/\/(www\.)?/, ''), lang: game.signsTranslated ? getLanguage() : 'en' });
    }
    // Swimwear the whole time you are in the hall: whatever else changed your
    // look in here (a shirt from the bag, a rental, an outfit) waits until you leave.
    if (!wearingSwim()) wearSwim(SWIMSUITS[pool.suit % SWIMSUITS.length]);
    pool.speed01 = null;
    const m = pool.mode;
    if (m?.kind === 'race') raceTick(dt, p);
    else if (m?.kind === 'dive') diveTick(dt, p);
    else if (m?.kind === 'board' && mag > 0.3 && performance.now() - m.at > 600) climbDown(); // walk away: back down the ladder
    else if (m?.kind === 'board') {
      p.set(m.b.tip, m.b.h, m.b.z);
      game.me.root.rotation.y = -Math.PI / 2;
      pool.act = 'dive';
      pool.speed01 = 0;
    } else if (game.seated) {
      pool.act = null; pool.slow = 1; // on a lounger or in the stands (sitDown set the height)
    } else {
      const w = waterAt(p.x, p.z);
      const target = w ? SWIM_Y : 0;
      p.y += (target - p.y) * Math.min(1, dt * (w ? 6 : 10));
      if (!w && p.y > -0.15) p.y = 0;
      pool.act = w ? (pool.tube ? 'tube' : 'swim') : null;
      pool.slow = w ? (pool.tube ? 0.4 : 0.6) : 1;
      if (!!w !== !!pool.inWater) { pool.inWater = !!w; if (w) sfx.splash?.(false); game.action = STALE; }
    }
    if (pool.speed01 != null) game.speed01 = pool.speed01;
    poolHud();
  }
  // The action button in the hall (before the general ones).
  function poolAction(p) {
    const m = pool.mode;
    if (m?.kind === 'race') return m.race.started && !m.race.done
      ? { key: 'pool-stroke', label: '🏊 ' + L(PT.stroke), run: strokeTap }
      : m.race.t < -COUNTDOWN
        ? (m.host ? { key: 'pool-start-now:' + Math.ceil(-m.race.t - COUNTDOWN), label: '▶️ ' + L(PT.startNow) + ' · ' + Math.ceil(-m.race.t - COUNTDOWN), run: raceStartNow } : { key: 'pool-wait-start', label: '🏁 ' + L(PT.waitStart), run: () => {} })
        : { key: 'pool-wait', label: '🏁 ' + L(m.race.done ? PT.go : PT.ready), run: () => {} };
    if (m?.kind === 'board') return { key: 'pool-dive', label: '🤸 ' + L(PT.dive), run: startDive };
    if (m?.kind === 'dive') return { key: 'pool-flip', label: '🔄 ' + L(PT.flip), run: queueFlip };
    const near = (list, r) => (list || []).find((s) => Math.hypot(p.x - s.x, p.z - s.z) < r);
    const st = game.interior.stations;
    if (near(st.lockers, 1.8)) { // the first other swimsuit (the rest in the list)
      const i = SWIMSUITS.findIndex((id) => id !== game.currentLook.model);
      return { key: 'pool-suit', label: '🔐 ' + fmt(L(PT.locker),
        { name: L(PT.suits[SWIMSUITS[i]]) }), run: () => { pool.suit = i; wearSwim(SWIMSUITS[i]); } };
    }
    if (near(st.tubes, 1.8)) return pool.tube
      ? { key: 'pool-tube-off', label: '🛟 ' + L(PT.tubePut), run: () => { pool.tube = false; game.action = STALE; } }
      : { key: 'pool-tube', label: '🛟 ' + L(PT.tubeTake), run: () => { pool.tube = true; game.action = STALE; } };
    const blk = !waterAt(p.x, p.z, 0) && near(st.blocks, 1.25);
    const open = blk && joinableRace();
    if (open) return { key: 'pool-join:' + open.rid, label: '🏁 ' + fmt(L(PT.join), { name: open.name }), run: () => joinRace(open, blk.lane) };
    if (blk) return { key: 'pool-race:' + blk.lane, label: '🏁 ' + fmt(L(PT.race), { n: blk.lane + 1 }), run: () => startRace(blk.lane) };
    const lad = near(st.ladders, 1.3);
    if (lad) { const b = boardById(lad.board); return { key: 'pool-climb:' + b.id, label: '🪜 ' + fmt(L(PT.climb), { h: b.h }), run: () => climbBoard(b) }; }
    if (game.clerk && Math.hypot(p.x - game.clerk.ch.root.position.x, p.z - game.clerk.ch.root.position.z) < 2.6) return { key: 'pool-talk', label: '💬 ' + L(PT.talk), run: lifeguardTip };
    return null;
  }
  // More choices: the other swimsuits at the lockers.
  function poolMore(p) {
    const out = [];
    if (pool.mode) return out;
    if ((game.interior.stations.lockers || []).some((s) => Math.hypot(p.x - s.x, p.z - s.z) < 1.8)) {
      SWIMSUITS.forEach((id, i) => { if (game.currentLook.model !== id) out.push({ key: 'pool-suit:' + id, label: (id.includes('navy') || id.includes('coral') ? '🩱 ' : '🩳 ') + L(PT.suits[id]), run: () => { pool.suit = i; wearSwim(id); } }); });
    }
    return out;
  }
  function lifeguardTip() {
    pool.tip = (pool.tip + 1) % PT.tips.length;
    const [ko, rom, tr] = PT.tips[pool.tip];
    if (game.clerk) say(game.clerk, $('labels'), [ko, rom, L(tr)]);
  }
  onLanguageChange(poolHud);
  hiringRedraws.push((lang) => hall()?.setSupportLang(lang)); // the sign-translate button
  return { onPoolRace, pool, endRace, wearingSwim, poolMore, poolAction, poolTick, poolLog };
}
