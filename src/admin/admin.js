// The operator page (admin.html): overview, live player map, inquiries,
// free board and players. This file is the page shell and the live map; the
// other tabs are in ./panels.js. The map shows where everyone playing is
// right now, from the spots the games report (net/where.js) and the server
// only hands to operator accounts (supabase/008_player_where.sql).
//
// Uses the game's own sign-in: open this page in the browser where you play
// with your operator account. Nothing here is linked from the game.
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { loadRegionMap, districtBoxes, districtAt } from '../core/districts.js';
import { describePlace, agoText, fitView } from './view.js';
import { createPanels } from './panels.js';

const REGION = 'seongsu';
const POLL_MS = 3000;
const BASE = import.meta.env.BASE_URL;
const $ = (id) => document.getElementById(id);
const cv = $('cv');
const g = cv.getContext('2d');

let map = null, boxes = [], stores = new Map();
let players = []; // { uid, player, place, px, pz, age_s, guest }
let selected = null;
let fetchedAt = 0; // when players came in (age_s counts from then)
const view = { cx: 0, cz: 0, scale: 0.2, dpr: 1, fitted: false };

function message(title, html) {
  const box = $('msg');
  box.hidden = !title;
  if (!title) return;
  box.innerHTML = '<div><h2></h2><div class="b"></div></div>';
  box.querySelector('h2').textContent = title;
  box.querySelector('.b').innerHTML = html;
}

// ---------- Map ----------
const toScreen = (x, z) => [(x - view.cx) * view.scale + cv.width / 2, (z - view.cz) * view.scale + cv.height / 2];
const toWorld = (sx, sy) => [(sx - cv.width / 2) / view.scale + view.cx, (sy - cv.height / 2) / view.scale + view.cz];

function resize() {
  const r = cv.getBoundingClientRect();
  view.dpr = Math.min(2, devicePixelRatio || 1);
  const w = Math.round(r.width * view.dpr), h = Math.round(r.height * view.dpr);
  if (!w || !h || (w === cv.width && h === cv.height)) return; // hidden tab: keep the old size
  const k = cv.width ? w / cv.width : 1;
  cv.width = w; cv.height = h;
  view.scale *= k || 1;
  draw();
}

function draw() {
  g.fillStyle = '#f3ecdc';
  g.fillRect(0, 0, cv.width, cv.height);
  if (!map) return;
  const poly = (p) => {
    g.beginPath();
    p.forEach(([x, z], i) => { const [sx, sy] = toScreen(x, z); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); });
  };
  const AREA = { plaza: '#e3dccd', sand: '#efe2c2', water: '#a9d8f0' };
  const order = { plaza: 0, sand: 0, water: 2 };
  for (const a of [...map.areas].sort((x, y) => (order[x.k] ?? 1) - (order[y.k] ?? 1))) {
    g.fillStyle = AREA[a.k] || '#bfe3a8';
    poly(a.p); g.fill();
  }
  g.lineCap = g.lineJoin = 'round';
  for (const r of map.roads) {
    poly(r.p);
    g.strokeStyle = r.k === 'walk' ? '#e6dcc8' : '#ffffff';
    g.lineWidth = Math.max(1, r.w * view.scale);
    g.stroke();
  }
  g.fillStyle = '#e2d6c2'; g.strokeStyle = '#d2c3aa'; g.lineWidth = 1;
  for (const b of map.buildings) { poly(b.p); g.closePath(); g.fill(); g.stroke(); }
  g.strokeStyle = '#b8bcc4'; g.lineWidth = Math.max(2, 7 * view.scale);
  for (const r of map.rail) { poly(r.p); g.stroke(); }

  const dpr = view.dpr;
  // District names, faint, in the middle of each district.
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `600 ${13 * dpr}px system-ui, sans-serif`;
  g.fillStyle = 'rgba(80,70,55,.45)';
  for (const b of boxes) {
    const [sx, sy] = toScreen((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
    const text = districtName(b.id).toUpperCase();
    if (g.measureText(text).width > (b.x1 - b.x0) * view.scale) continue; // zoomed out too far: names would overlap
    g.fillText(text, sx, sy);
  }

  // Players: green on the street, purple inside a shop, grey when not seen
  // for a while. The newest on top.
  g.textAlign = 'left';
  g.font = `600 ${12 * dpr}px system-ui, sans-serif`;
  for (const p of [...players].reverse()) {
    const [sx, sy] = toScreen(p.px, p.pz);
    const stale = ageOf(p) > 90;
    const color = stale ? '#a59c90' : p.place === 'street' ? '#18a058' : '#8a4fff';
    const r = (p.uid === selected ? 8 : 6) * dpr;
    g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2);
    g.fillStyle = color; g.fill();
    g.lineWidth = 2 * dpr; g.strokeStyle = '#fff'; g.stroke();
    if (p.uid === selected) { g.beginPath(); g.arc(sx, sy, r + 5 * dpr, 0, Math.PI * 2); g.strokeStyle = color; g.stroke(); }
    const label = p.player + (p.place !== 'street' ? ' 🏬' : '');
    g.lineWidth = 3 * dpr; g.strokeStyle = 'rgba(255,255,255,.9)';
    g.strokeText(label, sx + r + 4 * dpr, sy);
    g.fillStyle = '#2b2620';
    g.fillText(label, sx + r + 4 * dpr, sy);
  }
}

const DISTRICT_EN = { seodaemun: 'Seodaemun (Sinchon)', 'olympic-park': 'Olympic Park' };
const districtName = (id) => DISTRICT_EN[id] || (id ? id.charAt(0).toUpperCase() + id.slice(1) : '');

function fitAll() {
  const pts = players.length ? players.map((p) => [p.px, p.pz]) : null;
  const v = fitView(pts || boxes.flatMap((b) => [[b.x0, b.z0], [b.x1, b.z1]]), cv.width, cv.height, view.dpr);
  if (v) Object.assign(view, v);
  draw();
}

// Drag to move, wheel or pinch to zoom.
const pointers = new Map();
let pinch = null;
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
  }
});
cv.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2 && pinch) {
    const [a, b] = [...pointers.values()];
    view.scale = clampScale(pinch.scale * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d);
  } else if (pointers.size === 1) {
    view.cx -= (dx * view.dpr) / view.scale;
    view.cz -= (dy * view.dpr) / view.scale;
  }
  draw();
});
const up = (e) => {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  // A tap (not a drag) picks the nearest player.
  if (p && !pointers.size && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 6) {
    const r = cv.getBoundingClientRect();
    const sx = (e.clientX - r.left) * view.dpr, sy = (e.clientY - r.top) * view.dpr;
    let best = null, bd = 20 * view.dpr;
    for (const pl of players) {
      const [px, py] = toScreen(pl.px, pl.pz);
      const d = Math.hypot(px - sx, py - sy);
      if (d < bd) { bd = d; best = pl.uid; }
    }
    select(best, false);
  }
};
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', up);
const clampScale = (s) => Math.min(8, Math.max(0.02, s));
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  const sx = (e.clientX - r.left) * view.dpr, sy = (e.clientY - r.top) * view.dpr;
  const [wx, wz] = toWorld(sx, sy);
  view.scale = clampScale(view.scale * Math.exp(-e.deltaY * 0.0015));
  // Keep the point under the cursor where it was.
  view.cx = wx - (sx - cv.width / 2) / view.scale;
  view.cz = wz - (sy - cv.height / 2) / view.scale;
  draw();
}, { passive: false });

// Seconds since a player last reported (the server's clock, not ours).
const ageOf = (p) => p.age_s + (Date.now() - fetchedAt) / 1000;

// ---------- List ----------
function select(uid, centre) {
  selected = uid;
  const p = players.find((x) => x.uid === uid);
  if (p && centre) { view.cx = p.px; view.cz = p.pz; view.scale = Math.max(view.scale, 1 * view.dpr); }
  renderList();
  draw();
}

function renderList() {
  const rows = players.map((p) => {
    const tr = document.createElement('tr');
    tr.className = 'p' + (p.uid === selected ? ' sel' : '');
    tr.onclick = () => select(p.uid, true);
    const stale = ageOf(p) > 90;
    const color = stale ? '#a59c90' : p.place === 'street' ? '#18a058' : '#8a4fff';
    const name = document.createElement('td');
    const dot = document.createElement('span');
    dot.className = 'dot'; dot.style.background = color;
    const sub = document.createElement('div');
    sub.className = 'muted';
    sub.textContent = p.guest ? 'guest' : 'Google';
    name.append(dot, p.player, sub);
    const where = document.createElement('td');
    const d = describePlace(p.place, stores);
    where.textContent = d;
    const sub2 = document.createElement('div');
    sub2.className = 'muted';
    sub2.textContent = `${districtName(districtAt(boxes, p.px, p.pz))} · ${Math.round(p.px)}, ${Math.round(p.pz)}`;
    where.append(sub2);
    const seen = document.createElement('td');
    seen.className = 'muted';
    seen.textContent = agoText(ageOf(p));
    tr.append(name, where, seen);
    return tr;
  });
  $('list').replaceChildren(...rows);
  const online = players.filter((p) => ageOf(p) <= 90).length;
  $('count').textContent = String(+$('within').value <= 90 ? players.length : online);
  $('countLabel').textContent = +$('within').value <= 90 ? 'online' : `online · ${players.length} seen`;
}

// ---------- Data ----------
let client = null;
let pollTimer = 0;

async function poll() {
  clearTimeout(pollTimer);
  if (document.hidden || tab !== 'live') return; // picks up again when shown
  try {
    const { data, error } = await client.rpc('ops_where', { within_seconds: +$('within').value });
    if (error) return failed(error);
    players = data || [];
    fetchedAt = Date.now();
    if (selected && !players.some((p) => p.uid === selected)) selected = null;
    if (!view.fitted && players.length) { view.fitted = true; fitAll(); }
    renderList();
    draw();
    $('status').textContent = 'updated ' + new Date().toLocaleTimeString();
  } catch (e) {
    $('status').textContent = 'offline, retrying…';
    console.warn(e);
  }
  pollTimer = setTimeout(poll, POLL_MS);
}

function failed(error) {
  $('status').textContent = '';
  if (error.code === 'PGRST202' || error.code === '42883') {
    $('list').innerHTML = '<tr><td colspan="3" class="muted">Run <code>supabase/008_player_where.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run), then reload this page.</td></tr>';
  } else if (error.code === '42501') {
    notOperator();
  } else {
    $('status').textContent = 'Could not load players: ' + (error.message || String(error));
    pollTimer = setTimeout(poll, POLL_MS * 3);
  }
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let myId = '';

async function start() {
  addEventListener('resize', resize);
  resize();
  const json = (file) => fetch(`${BASE}regions/${REGION}/${file}`).then((r) => r.json());
  const region = await json('region.json');
  const [m, st] = await Promise.all([loadRegionMap(region, json), json('stores.json').catch(() => null)]);
  map = m;
  boxes = districtBoxes(map);
  for (const s of st?.stores || []) stores.set(s.id, s);
  fitAll();

  if (config.netProvider !== 'supabase' || !config.net.url || !config.net.key) {
    message('No server', 'This build has no Supabase settings (VITE_REALTIME_URL / VITE_REALTIME_PUBLIC_KEY), so there are no players to show.');
    return;
  }
  // The game's sign-in (same storage key as core/cloud-save.js).
  client = createClient(config.net.url, config.net.key, { auth: { storageKey: 'mkauth', persistSession: true, autoRefreshToken: true } });
  const { data } = await client.auth.getSession();
  myId = data.session?.user?.id || '';
  if (!myId) {
    message('Not signed in', `Open <a href="${BASE}">the game</a> in this browser, sign in with your operator account, then come back to this page.`);
    return;
  }
  // Operator? (am_operator comes with 009_admin.sql; without it the live
  // map still finds out through ops_where.)
  const op = await client.rpc('am_operator');
  if (!op.error && op.data !== true) return notOperator();
  panels = createPanels({ client, $, escapeHtml, agoText, describePlace: (pl) => describePlace(pl, stores), setStatus: (t) => { $('status').textContent = t; }, go: showTab, notOperator, badge });
  $('within').onchange = () => { view.fitted = false; poll(); };
  $('fit').onclick = fitAll;
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { poll(); panels.wake(tab); } });
  for (const b of document.querySelectorAll('#tabs button')) b.onclick = () => showTab(b.dataset.tab);
  addEventListener('hashchange', () => showTab(location.hash.slice(1)));
  showTab(location.hash.slice(1));
}

// ---------- Tabs ----------
const TABS = ['overview', 'live', 'ask', 'free', 'players'];
let tab = null, panels = null;
function showTab(name) {
  if (!TABS.includes(name)) name = 'overview';
  if (name === tab) return;
  tab = name;
  if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  for (const t of TABS) $('tab-' + t).hidden = t !== name;
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === name);
  if (name === 'live') { resize(); if (!view.fitted) fitAll(); poll(); } else clearTimeout(pollTimer);
  panels?.show(name);
}
function badge(id, n) {
  const el = $(id);
  el.hidden = !n;
  el.textContent = String(n || '');
}
function notOperator() {
  message('Operators only', `This account isn't an operator. Add its user id to the <code>operators</code> table (Table Editor → operators → Insert row), then reload.<br><br>Your user id: <code>${escapeHtml(myId)}</code>`);
}

start().catch((e) => message('Something went wrong', escapeHtml(e.message)));
