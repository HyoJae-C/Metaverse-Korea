// Fishing contest with a friend (낚시 내기): the game side. Rules and the
// messages are in core/fish-contest.js.
//
// In a Han River park, with a friend a few steps away, a 🎣 Fishing contest
// button shows (in the more-actions list and in the fishing panel). The
// friend gets a notice and the same button, now "Accept"; both count 3-2-1
// and fish for three minutes. A chip at the top shows the time and both
// best fish (stars, then length). Auto fishing is off while it runs (only fish caught by hand
// count). Walking out of the park, or the friend leaving, ends it.
//
// game: { myId, others(), send(msg), isFriend(name), blocked(id, name),
//   park(): the Han River park I'm in (or null), toast(msg), sfx,
//   chip: the HUD chip, cheer(), bubble(text), peerBubble(id, text),
//   refreshFishing() (redraw the fishing panel's buttons), myName() }
//
// When the friend accepts, both screens (only those two: the messages are
// addressed to one player) show a big "Fishing contest!" banner in the
// middle: my name VS theirs, the rule, and 3-2-1, then GO! (Yozi 2026-11-21).
import { t, getLanguage, localName } from '../core/i18n.js';
import { fishById } from '../core/fishing.js';
import { FishContest, contestMsg, ASK_RADIUS, RULES, sumOf } from '../core/fish-contest.js';

const newCid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`).slice(0, 36);

export function createFishContest(game) {
  const contest = new FishContest();
  let parkId = null; // the park the contest started in
  let lastPhase = null;
  let friendName = '?'; // (kept: once they're gone, their name is too)

  const nameOf = (id) => game.others().nameOf(id) || (id === contest.c?.with ? friendName : '?');
  const fishLabel = (id) => {
    const f = fishById(id);
    if (!f) return '🐟';
    return getLanguage() === 'ko' ? f.ko : localName(f.name, getLanguage());
  };
  // Friends close enough to ask, closest first.
  function friendsNear(p) {
    if (!game.park()) return [];
    return game.others().nearbyFree(p.x, p.z, ASK_RADIUS).filter((o) => game.isFriend(o.name) && !game.blocked(o.id, o.name));
  }
  // Anyone near who asked me (friends only).
  function askerNear(p) {
    if (!game.park()) return null;
    for (const o of game.others().nearbyFree(p.x, p.z, ASK_RADIUS)) if (contest.asked(o.id) && game.isFriend(o.name)) return o;
    return null;
  }

  // The asker picks the rule (Yozi 2026-11-20): a small sheet of three.
  let sheet = null;
  function pickRule(o) {
    if (contest.on) return;
    if (!game.isFriend(o.name)) { game.toast(t('fc.notFriend', { name: o.name })); return; }
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'sheet gift-panel fc-rules';
      (document.getElementById('hud') || document.body).append(sheet);
    }
    const x = document.createElement('button');
    x.className = 'sheet-x';
    x.textContent = '✕';
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => { sheet.hidden = true; };
    const h = document.createElement('h3');
    h.textContent = t('fc.pick', { name: o.name });
    const list = document.createElement('div');
    list.className = 'gift-people fc-rule-list';
    for (const r of RULES) {
      const b = document.createElement('button');
      b.className = 'chip' + (r === RULES[0] ? ' primary' : '');
      const sub = document.createElement('small');
      sub.textContent = t('fc.' + r + 'Sub');
      b.append(document.createTextNode(t('fc.' + r)), document.createElement('br'), sub);
      b.onclick = () => { sheet.hidden = true; ask(o, r); };
      list.append(b);
    }
    sheet.replaceChildren(x, h, list);
    sheet.hidden = false;
  }
  function ask(o, rule) {
    if (contest.on) return;
    const cid = newCid();
    contest.ask(o.id, cid, rule);
    game.send(contestMsg('ask', o.id, cid, rule));
    game.toast(t('fc.sent', { name: o.name }));
    game.refreshFishing();
  }
  function accept(o) {
    const cid = contest.accept(o.id);
    if (!cid) return;
    game.send(contestMsg('ok', o.id, cid));
    begin();
  }
  function begin() {
    parkId = game.park()?.store?.id || null;
    friendName = nameOf(contest.c.with);
    lastPhase = null;
    game.sfx.pop?.();
    showVs();
    paint();
    game.refreshFishing();
  }

  // The big VS banner: from accept through 3-2-1 to GO!, then it fades.
  let vs = null, vsTimer = 0;
  function showVs() {
    if (!vs) {
      vs = document.createElement('div');
      vs.className = 'fc-vs';
      vs.setAttribute('role', 'status');
      vs.setAttribute('aria-live', 'assertive');
      (document.getElementById('hud') || document.body).append(vs);
    }
    const el = (cls, text) => { const d = document.createElement('div'); d.className = cls; if (text != null) d.textContent = text; return d; };
    const row = el('fc-vs-row');
    row.append(el('fc-vs-name fc-vs-me', game.myName?.() || t('fc.you')), el('fc-vs-x', 'VS'), el('fc-vs-name fc-vs-them', friendName));
    vs.replaceChildren(el('fc-vs-title', t('fc.vsTitle')), row, el('fc-vs-rule', t('fc.' + contest.rule)), el('fc-vs-n'));
    vs.classList.remove('fc-vs-out');
    vs.hidden = false;
    clearInterval(vsTimer);
    vsTimer = setInterval(stepVs, 100);
    stepVs();
  }
  let vsShown = '';
  function stepVs() {
    const c = contest.c;
    const n = vs.querySelector('.fc-vs-n');
    if (!c || c.done || c.quit) { hideVs(); return; }
    const left = c.go - contest.now();
    const txt = left > 0 ? String(Math.ceil(left / 1000)) : t('fc.vsGo');
    if (txt !== vsShown) { vsShown = txt; n.textContent = txt; n.classList.remove('fc-vs-tick'); void n.offsetWidth; n.classList.add('fc-vs-tick'); }
    if (left <= -1100) hideVs();
    else if (left <= -700) vs.classList.add('fc-vs-out');
  }
  function hideVs() {
    clearInterval(vsTimer);
    vsTimer = 0;
    vsShown = '';
    if (vs) vs.hidden = true;
  }

  // The buttons: accept when a friend near asked me, else ask each friend near.
  function acts(p) {
    if (contest.on) return [];
    const a = askerNear(p);
    if (a) return [{ key: 'fc-ok:' + a.id, label: t('fc.accept', { name: a.name, rule: t('fc.' + contest.ruleOf(a.id)) }), run: () => accept(a) }];
    return friendsNear(p).slice(0, 2).map((o) => ({ key: 'fc-ask:' + o.id + contest.waitingFor(o.id), label: t('fc.ask', { name: o.name }), run: () => pickRule(o) }));
  }
  // Only for the main button: a friend near asked me.
  function act(p) {
    if (contest.on) return null;
    const a = askerNear(p);
    return a ? acts(p)[0] : null;
  }

  function onMsg(from, m) {
    if (m.to !== game.myId) return;
    const name = nameOf(from);
    if (game.blocked(from, name)) return;
    if (m.verb === 'ask' && !game.isFriend(name)) { game.send(contestMsg('no', from, m.cid)); return; }
    const r = contest.heard(from, m);
    if (r === 'busy') game.send(contestMsg('no', from, m.cid));
    else if (r === 'asked') { game.sfx.pop?.(); game.toast(t('fc.asked', { name, rule: t('fc.' + contest.ruleOf(from)) })); game.refreshFishing(); }
    else if (r === 'start') begin();
    else if (r === 'no') game.toast(t('fc.no', { name }));
    else if (r === 'quit') { game.toast(t('fc.quitThem', { name })); paint(); game.refreshFishing(); }
    else if (r === 'fish') paint();
    else if (r === 'final') tick();
  }

  // A fish I landed (by hand). Its length shows on my catch bubble.
  function caught(f) {
    const cm = contest.caught(f.id);
    if (cm == null) return null;
    game.send(contestMsg('fish', contest.with, contest.c.cid, f.id, cm));
    paint();
    return cm;
  }

  // A side on the chip, by the rule: its stars and length ("★★ 60 cm"),
  // its length, or its ★ added up ("7★").
  const best = (b) => (contest.rule === 'sum' ? sumOf(b.by) + '★'
    : contest.rule === 'long' ? b.cm + ' cm'
    : (b.fish ? '★'.repeat(fishById(b.fish)?.rarity || 1) + ' ' : '') + b.cm + ' cm');
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function paint() {
    const chip = game.chip;
    if (!chip) return;
    const ph = contest.phase();
    chip.hidden = !ph;
    if (!ph) return;
    const c = contest.c, name = nameOf(c.with);
    if (ph === 'count') chip.textContent = t('fc.count', { n: contest.secondsLeft() });
    else if (ph === 'wait') chip.textContent = t('fc.waitEnd', { name });
    else chip.textContent = t('fc.chip', { time: mmss(contest.secondsLeft()), me: best(c.me), name, them: best(c.them) });
  }

  function end(res) {
    const name = nameOf(contest.c.with);
    const sum = res.rule === 'sum';
    const v = { name, me: sum ? sumOf(res.me.by) : res.me.cm, them: sum ? sumOf(res.them.by) : res.them.cm, fish: fishLabel(res.me.fish), theirs: fishLabel(res.them.fish) };
    if (res.win === 'me') { game.cheer(); game.bubble('🏆'); game.sfx.reveal?.(true); }
    else if (res.win === 'them') game.peerBubble(contest.c.with, '🏆');
    const key = !res.me.cm && !res.them.cm ? 'fc.none' : (res.win === 'tie' ? 'fc.tie' : res.win === 'me' ? 'fc.win' : 'fc.lose') + (sum ? 'Sum' : '');
    game.toast(t(key, v));
    paint();
    game.refreshFishing();
  }

  // Every second or so.
  function tick() {
    if (!contest.c || contest.c.done) return;
    const gone = !game.others().players.has(contest.c.with);
    if (gone || (game.park()?.store?.id || null) !== parkId) {
      const q = contest.quit(gone ? 'them' : 'me');
      if (q) { game.send(contestMsg('quit', q.to, q.cid)); game.toast(gone ? t('fc.quitThem', { name: friendName }) : t('fc.quitMe')); }
      paint();
      game.refreshFishing();
      return;
    }
    const ph = contest.phase();
    if (ph !== lastPhase) {
      if (ph === 'fish') { game.toast(t('fc.go', { rule: t('fc.' + contest.rule) })); game.sfx.pop?.(); }
      lastPhase = ph;
      game.refreshFishing();
    }
    const fin = contest.final();
    if (fin) game.send(contestMsg('end', contest.c.with, contest.c.cid, fin.cm, fin.fish, fin.by));
    const res = contest.result();
    if (res) { end(res); return; }
    paint();
  }
  setInterval(tick, 500);

  // The page is closing: tell the friend.
  globalThis.addEventListener?.('pagehide', () => { const q = contest.quit(); if (q) game.send(contestMsg('quit', q.to, q.cid)); });

  return {
    acts, act, onMsg, caught,
    // Auto fishing is off while a contest runs.
    get noAuto() { return contest.on; },
    get on() { return contest.on; },
    // (tests/e2e) the VS banner's names while it shows, else null
    get vs() { return vs && !vs.hidden ? [...vs.querySelectorAll('.fc-vs-name')].map((e) => e.textContent) : null; },
    // (tests/e2e) where it stands
    get state() { const c = contest.c; return c && { phase: contest.phase(), rule: c.rule, done: c.done, quit: c.quit || null, me: { ...c.me, by: [...c.me.by] }, them: { ...c.them, by: [...c.them.by] } }; },
  };
}
