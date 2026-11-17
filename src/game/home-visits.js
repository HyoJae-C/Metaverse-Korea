// Home visits: walk into someone else's home at Forest Lane Apartments.
// Loaded with import() the first time you go into a home.
//
// Each player picks who may visit (decor.js, mk.homeVisit): everyone,
// friends (the default) or nobody. While you're home with visits open, the
// server lists your home (supabase/047_home_visits.sql) and your home is a
// small multiplayer room; otherwise you're alone in it, as before.
// At the door, "Visit a home" lists the homes you may walk into right now.
// The host's game sends its furniture to the visitors over the room, checks
// each visitor with the server, and keeps the room to MAX_PEOPLE. Only the
// host can move furniture. When the host goes out, visitors go out too.
import { cleanName } from '../core/identity.js';

export const MAX_PEOPLE = 4; // host included (realtime messages grow with the square)
const BEAT_MS = 60000; // the server forgets a home after 2 minutes without a beat
const HOST_WAIT_MS = 6000; // a visitor who finds nobody home goes back out

// Room messages, sent as emotes: the layout from the host, or "out you go".
export const layoutMsg = (items) => 'hv:lay:' + JSON.stringify(items.map(([id, x, z, ry, y = 0, off = 0]) => {
  const a = [id, +x.toFixed(2), +z.toFixed(2), +ry.toFixed(2)];
  if (y || off) a.push(+(+y).toFixed(3), off ? 1 : 0); // (only when it's on a table or a lamp is off: messages stay short)
  return a;
}));
export const kickMsg = (id) => 'hv:kick:' + id;
export function parseVisitMsg(e) {
  if (typeof e !== 'string' || !e.startsWith('hv:')) return null;
  if (e.startsWith('hv:kick:')) return { kick: e.slice(8) };
  if (e.startsWith('hv:lay:')) { try { const a = JSON.parse(e.slice(7)); return Array.isArray(a) ? { lay: a.slice(0, 80) } : null; } catch { return null; } }
  return null;
}
export const homeRoom = (base, hostId) => `${base}-home-${hostId}`;

export function createHomeVisits(game) {
  const { $, t, shop, cloud, decor } = game;
  let hosting = null; // { built, token } while I'm in my own home with visits open
  let guest = null; // { host: { net, name }, timer } while I'm in someone else's home
  let beat = 0, token = 0, sheet = null;

  // --- In my own home ---
  async function openMine(built) {
    const my = ++token;
    if (decor.visit() === 'none') { cloud.call('home_close'); return; }
    await game.claimChatId?.();
    const r = await cloud.call('home_open_set', { p_net: game.myId, p_visit: decor.visit() });
    if (my !== token || r.data !== 'ok') return; // left already, or the server isn't set up: stay alone
    hosting = { built };
    game.joinRoom(homeRoom(game.roomId, game.myId), built.scene);
    clearInterval(beat);
    beat = setInterval(() => cloud.call('home_open_set', { p_net: game.myId, p_visit: decor.visit() }), BEAT_MS);
  }
  function closeMine() {
    clearInterval(beat);
    beat = 0;
    if (hosting) cloud.call('home_close');
    hosting = null;
  }
  const people = () => game.others.players.size + 1;
  async function guestCame(id) {
    if (people() > MAX_PEOPLE) { game.net.sendEmote(kickMsg(id)); return; }
    const r = await cloud.call('home_guest_ok', { p_guest_net: id });
    if (!hosting) return;
    if (r.data === false) { game.net.sendEmote(kickMsg(id)); return; }
    sendLayout();
  }
  let layoutTimer = 0;
  function sendLayout() {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(() => {
      const items = decor.layout();
      if (hosting && items && game.others.players.size) game.net.sendEmote(layoutMsg(items));
    }, 300);
  }
  // The visit setting changed while I'm home.
  function visitChanged(v) {
    if (!decor.decor || decor.decor.guest) return;
    if (v === 'none') {
      if (hosting) { game.net.sendEmote(kickMsg('*')); game.goSolo(hosting.built.scene); }
      closeMine();
      token++;
      cloud.call('home_close');
      shop.toast(t('home.closed'));
    } else if (hosting) cloud.call('home_open_set', { p_net: game.myId, p_visit: v });
    else { openMine(decor.decor.built); shop.toast(t('home.opened')); }
  }

  // --- Visiting ---
  function visit(host, front) {
    closeList();
    const name = cleanName(host.name) || '?';
    const label = t('home.ofName', { name });
    guest = { host: { net: host.net_id, name, level: host.level } }; // (level: the host's home size, 053_home_levels.sql)
    game.enterStore({ ...front, store: { ...front.store, visitHost: guest.host, name: { en: label, ko: label } } });
  }
  function openGuest(store, built) {
    const my = ++token;
    decor.openGuest(store, built);
    game.joinRoom(homeRoom(game.roomId, store.visitHost.net), built.scene);
    guest = { host: store.visitHost };
    guest.timer = setTimeout(() => {
      if (my !== token || !guest) return;
      if (game.others.nameOf(guest.host.net) == null) { shop.toast(t('home.notHome', { name: guest.host.name })); game.leaveStore(); }
      else if (people() > MAX_PEOPLE) { shop.toast(t('home.visitFull', { name: guest.host.name })); game.leaveStore(); }
    }, HOST_WAIT_MS);
  }

  // --- The list at the door ---
  function closeList() { if (sheet) sheet.hidden = true; }
  async function openList(front) {
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'sheet';
      sheet.id = 'visit-panel';
      sheet.innerHTML = '<button class="sheet-x" aria-label="Close">✕</button><strong></strong><p class="fine"></p><div class="visit-list"></div>';
      sheet.querySelector('.sheet-x').onclick = closeList;
      $('hud').append(sheet);
    }
    sheet.hidden = false;
    sheet.querySelector('strong').textContent = '🏘️ ' + t('home.visitTitle');
    const note = sheet.querySelector('p'), list = sheet.querySelector('.visit-list');
    note.textContent = '…';
    list.replaceChildren();
    const r = await cloud.call('open_homes');
    if (sheet.hidden) return;
    if (r.error) { note.textContent = t('home.visitSoon'); return; }
    const homes = (r.data || []).filter((h) => h.net_id !== game.myId);
    note.textContent = homes.length ? t('home.visitPick') : t('home.visitEmpty');
    list.append(...homes.map((h) => {
      const b = document.createElement('button');
      const n = document.createElement('span');
      n.textContent = '🏠 ' + t('home.ofName', { name: cleanName(h.name) || '?' });
      const tag = document.createElement('small');
      tag.textContent = h.friend ? '👫 ' + t('home.friend') : '';
      b.append(n, tag);
      b.onclick = () => visit(h, front);
      return b;
    }));
  }

  return {
    // Walked into a home (main.js enterStore, after it went solo).
    entered(store, built) {
      if (store.visitHost) openGuest(store, built);
      else openMine(built);
    },
    // Walked out of a home.
    left() {
      token++;
      clearTimeout(guest?.timer);
      clearTimeout(layoutTimer);
      guest = null;
      closeMine();
    },
    onJoin(id) { if (hosting) guestCame(id); },
    onLeave(id) {
      if (guest && id === guest.host.net) { shop.toast(t('home.hostLeft', { name: guest.host.name })); game.leaveStore(); }
    },
    // A room message ('hv:…'): true if it was one.
    onMsg(id, e) {
      const m = parseVisitMsg(e);
      if (!m) return false;
      if (!guest || id !== guest.host.net) return true; // only the host's game speaks for the home
      if (m.lay) decor.showLayout(m.lay);
      if (m.kick === game.myId || m.kick === '*') { shop.toast(t('home.kicked', { name: guest.host.name })); game.leaveStore(); }
      return true;
    },
    layoutChanged: sendLayout,
    visitChanged,
    openList,
    get state() { return { hosting: !!hosting, guest: guest?.host.net || null }; },
  };
}
