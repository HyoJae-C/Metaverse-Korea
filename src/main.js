import * as THREE from 'three';
import {
  LANGUAGES, t, setLanguage, getSavedLanguage, getLanguage, onLanguageChange, localName,
} from './core/i18n.js';
import { REGION_NAMES } from './i18n/strings.js';
import { buildWorld, COLORS } from './core/world.js';
import { createCharacter } from './core/character.js';
import { createLookEditor, saveLook } from './core/look-editor.js';
import { PALETTES, PATCHES, HAT_SHAPES, accessory } from './data/appearance.js';
import { CollisionMap, distSqToSeg } from './core/collision.js';
import { Input } from './core/input.js';
import { RemotePlayers, showBubble } from './core/players.js';
import { createAreaNet } from './net/area.js';
import { config } from './config.js';
import { getEmote, ownedPacks } from './data/emotes.js';
import { WeatherSystem } from './core/weather.js';
import { Storefronts } from './core/storefronts.js';
import { Zones } from './core/zones.js';
import { buildInterior } from './core/interior.js';
import { FURNITURE, furnitureById, buildFurniture, furnitureCollider } from './core/furniture.js';
import { ShopUI, Cart } from './ui/shop-ui.js';
import { OrderUI } from './ui/order-ui.js';
import { CloudSave } from './core/cloud-save.js';
import { Inventory, ITEMS, redeemCode, parseTandem, tandemMsg } from './core/inventory.js';
import { SEATS, seatPosition } from './core/bikes.js';
import { MapView } from './ui/map-view.js';
import { Music, Sfx } from './core/music.js';
import { BikeStations } from './core/bikes.js';
import { Wallet, demoAd } from './core/wallet.js';
import { Daily, REWARD } from './core/daily.js';
import { Safety, filterText } from './core/safety.js';
import { Pets } from './core/pets.js';
import { StreetNpcs, NAME_ROMAN, makeNpc, say, placeLabels, PHRASES } from './core/npcs.js';
import { RoadGraph, RouteLine } from './core/route.js';

const BASE = import.meta.env.BASE_URL;
const DEBUG_TOP = Number(new URLSearchParams(location.search).get('top')) || 0;
const $ = (id) => document.getElementById(id);

// Cloud save (guest account on Supabase). Runs before anything reads saved
// data, so a newer save from the server is in place first. Skipped in
// automated test rooms.
const cloud = new CloudSave(config.netProvider === 'supabase' && !new URLSearchParams(location.search).has('debug') ? config.net : null);
await cloud.load();

// ---------- Start screen ----------
const regionsIndex = await fetch(`${BASE}regions/index.json`).then((r) => r.json());
const regionId = new URLSearchParams(location.search).get('region') || regionsIndex.default;
// Realtime room name. Automated tests pass ?debug&room=<name> to get a private
// room, so real visitors on the live site never mix into a test.
const testRoom = new URLSearchParams(location.search).has('debug') && new URLSearchParams(location.search).get('room');
const roomId = testRoom ? `${regionId}~${testRoom.replace(/[^\w-]/g, '').slice(0, 32)}` : regionId;
const region = await fetch(`${BASE}regions/${regionId}/region.json`).then((r) => r.json());

function renderLangGrid(el, onPick) {
  el.innerHTML = '';
  for (const l of LANGUAGES) {
    const b = document.createElement('button');
    b.textContent = l.label;
    b.lang = l.code;
    b.setAttribute('aria-pressed', String(l.code === getLanguage()));
    b.onclick = () => onPick(l.code);
    el.appendChild(b);
  }
}

function refreshStartText() {
  const lang = getLanguage();
  $('start-region').textContent = t('start.region', {
    region: REGION_NAMES[regionId]?.[lang] || localName(region.name, lang),
    city: REGION_NAMES.seoul[lang],
  });
  const input = $('nickname');
  input.placeholder = t('start.defaultName');
  document.title = t('app.title');
}

const browserLang = (navigator.language || 'en').slice(0, 2);
setLanguage(getSavedLanguage() || (LANGUAGES.some((l) => l.code === browserLang) ? browserLang : 'en'));
const pickLang = (code) => {
  setLanguage(code);
  renderLangGrid($('lang-grid'), pickLang);
  renderLangGrid($('lang-grid-2'), (c) => {
    pickLang(c);
    $('lang-overlay').hidden = true;
  });
};
pickLang(getLanguage());
onLanguageChange(refreshStartText);
refreshStartText();
try {
  $('nickname').value = localStorage.getItem('mk.name') || '';
} catch { /* ignore */ }

// Load the map while the player is choosing a language.
const mapPromise = fetch(`${BASE}regions/${regionId}/${region.mapFile || 'map.json'}`).then((r) => {
  if (!r.ok) throw Object.assign(new Error('no map'), { code: 'noMap' });
  return r.json();
});

// Step 1: language → step 2: character + nickname.
let editor = null;
$('next-btn').onclick = () => {
  $('step-lang').hidden = true;
  $('step-look').hidden = false;
  editor ||= createLookEditor({
    optionsEl: $('look-options'), canvas: $('look-preview'), randomBtn: $('look-random'),
  });
};
$('back-btn').onclick = () => {
  $('step-look').hidden = true;
  $('step-lang').hidden = false;
};
const optionalJson = (file) => fetch(`${BASE}regions/${regionId}/${file}`)
  .then((r) => (r.ok ? r.json() : null)).catch(() => null);
const storesPromise = optionalJson('stores.json');
const homesPromise = optionalJson('homes.json');
const zonesPromise = optionalJson('zones.json');
const bikesPromise = optionalJson('bikes.json');

await new Promise((resolve) => {
  $('start-btn').onclick = resolve;
  // Note: a handler body, not an expression. Returning false from an
  // on-handler cancels the key, which blocked typing in this field.
  $('nickname').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.isComposing) resolve();
  };
});
let myLook = editor.getLook();
let daily = null; // daily check-in and missions (set up with the wallet)
const safety = new Safety(); // chat filter and block list
const recentLines = new Map(); // id -> their last chat lines, attached to a report
editor.dispose();
$('start-btn').disabled = true;
$('status').textContent = t('loading');

let map;
try {
  map = await mapPromise;
} catch (err) {
  $('status').textContent = t(err.code === 'noMap' ? 'error.noMap' : 'error.generic');
  throw err;
}

const nickname = filterText(($('nickname').value.trim() || t('start.defaultName')).slice(0, 16));
try {
  localStorage.setItem('mk.name', $('nickname').value.trim());
} catch { /* ignore */ }

// ---------- Renderer & scene ----------
const lowSpec = matchMedia('(pointer: coarse)').matches || navigator.hardwareConcurrency <= 4;
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowSpec, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, lowSpec ? 1.5 : 2));
renderer.shadowMap.enabled = !lowSpec;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.sky);
scene.fog = DEBUG_TOP ? null : new THREE.Fog(COLORS.sky, 140, 420);

const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 2000); // wide, behind-the-back view

const hemi = new THREE.HemisphereLight(0xfff4e0, 0xc9d6b8, 1.5);
const ambient = new THREE.AmbientLight(0xfff0e0, 0.9);
scene.add(hemi, ambient);
const sun = new THREE.DirectionalLight(0xfff1d6, 1.5);
sun.position.set(60, 120, 40);
sun.castShadow = !lowSpec;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

const collision = new CollisionMap(map.buildings);
const { bounds } = buildWorld(map, scene, { lowSpec, collision });
const storeData = [...((await storesPromise)?.stores || []), ...((await homesPromise)?.homes || [])];
const zoneData = (await zonesPromise)?.zones || [];
const storefronts = new Storefronts(scene, storeData, map, region.center, collision);
const zones = new Zones(scene, zoneData, map, region.center, collision);
const roadGraph = new RoadGraph(map.roads);
const routeLine = new RouteLine(scene);
const bikeStations = new BikeStations(scene, (await bikesPromise)?.stations || [], region.center, roadGraph, findFreeSpot);
// Passers-by: two strolling around each meeting zone.
const npcs = new StreetNpcs(scene, $('labels'), roadGraph, zones.items.map((z) => [z.x, z.z]));

// ---------- Player ----------
function latLonToLocal(lat, lon) {
  const R = 6378137;
  const c = region.center;
  const mLat = (Math.PI / 180) * R;
  const mLon = mLat * Math.cos((c.lat * Math.PI) / 180);
  return [(lon - c.lon) * mLon, -(lat - c.lat) * mLat];
}

function findFreeSpot(x, z) {
  if (!collision.blocked(x, z, 0.6)) return [x, z];
  for (let r = 2; r < 80; r += 2) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const px = x + Math.cos(ang) * r, pz = z + Math.sin(ang) * r;
      if (!collision.blocked(px, pz, 0.6)) return [px, pz];
    }
  }
  return [x, z];
}

const myId = crypto.randomUUID?.() || String(Math.random()).slice(2);
let me = createCharacter(myLook);
scene.add(me.root);
// Spawn on the street closest to the configured spawn point.
let spawnDir = null;
function nearestRoadPoint(x, z) {
  let best = [x, z], bestD = Infinity;
  for (const r of map.roads) {
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1;
      const tt = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2));
      const px = x1 + dx * tt, pz = z1 + dz * tt;
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bestD) { bestD = d; best = [px, pz]; spawnDir = Math.atan2(dx, dz); }
    }
  }
  return best;
}
const [rx, rz] = nearestRoadPoint(...latLonToLocal(region.spawn.lat, region.spawn.lon));
// Small random offset so players arriving together don't stack up.
const [sx, sz] = findFreeSpot(rx + (Math.random() - 0.5) * 4, rz + (Math.random() - 0.5) * 4);
me.root.position.set(sx, 0, sz);
// heading: compass degrees (0 = north). Character faces +z at rotation 0.
const startHeading = ((region.spawn.heading ?? 0) * Math.PI) / 180;
me.root.rotation.y = Math.PI - startHeading;
// Face along the street (whichever direction is closer to the configured heading).
if (spawnDir !== null) {
  const alt = spawnDir + Math.PI;
  const diff = (a) => Math.abs(Math.atan2(Math.sin(a - me.root.rotation.y), Math.cos(a - me.root.rotation.y)));
  me.root.rotation.y = diff(spawnDir) < diff(alt) ? spawnDir : alt;
}
// Optional: start in front of a store (e.g. the café meeting spot), facing it.
const spawnStore = region.spawn.nearStore && storefronts.get(region.spawn.nearStore);
if (spawnStore) {
  const { door, group } = spawnStore;
  const ox = Math.sin(group.rotation.y), oz = Math.cos(group.rotation.y); // out of the shop front
  const [fx, fz] = findFreeSpot(door.x + ox * 2.5 + (Math.random() - 0.5), door.z + oz * 2.5 + (Math.random() - 0.5));
  me.root.position.set(fx, 0, fz);
  // Face along the street, the shop on one side, turned slightly towards it.
  // Pick the direction with open space behind us so the camera fits.
  const room = (ry) => {
    let d = 0;
    while (d < 12 && !collision.blocked(fx - Math.sin(ry) * (d + 0.5), fz - Math.cos(ry) * (d + 0.5), 0.3)) d += 0.5;
    return d;
  };
  const along = [group.rotation.y + Math.PI / 2, group.rotation.y - Math.PI / 2];
  const pick = room(along[0]) >= room(along[1]) ? 0 : 1;
  me.root.rotation.y = along[pick] + (pick ? -1 : 1) * 0.5; // ~30° towards the shop
}

const cam = { yaw: me.root.rotation.y + Math.PI, pitch: 0.42, dist: 9 };
let camHoriz = 8; // current camera distance (shortened near walls)
let manualCamT = 0; // seconds left before the camera starts following again
const PLAYER_R = 0.35;
// Street speeds are a bit faster than real life so the area feels compact;
// shops are small rooms, so walking there stays slower.
const WALK = 6.5, RUN = 12;
const BIKE = 16; // bike share: faster than running, no stamina
const CAR = 26; // car: big roads only
const STORE_WALK = 4.2, STORE_RUN = 7;

const myTag = document.createElement('div');
myTag.className = 'nametag me';
myTag.textContent = nickname;
$('labels').appendChild(myTag);
const myLabel = { tag: myTag, bubble: null };

// ---------- HUD ----------
const input = new Input(canvas, $('joystick'));
$('hud').hidden = false;
$('start').hidden = true;
$('joystick').hidden = !input.isTouch;
// Settings sheet: music, sign translation and language live here.
$('settings-btn').onclick = () => { $('settings-panel').hidden = false; };
$('settings-close').onclick = () => { $('settings-panel').hidden = true; };
$('settings-panel').onclick = (e) => {
  if (e.target.id === 'settings-panel') $('settings-panel').hidden = true;
};
$('lang-btn').onclick = () => {
  $('settings-panel').hidden = true;
  $('lang-overlay').hidden = false;
};
$('lang-overlay').onclick = (e) => {
  if (e.target.id === 'lang-overlay') $('lang-overlay').hidden = true;
};

let helpTimer;
try {
  if (!localStorage.getItem('mk.helpSeen')) $('help').hidden = false;
} catch {
  $('help').hidden = false;
}
const refreshHelp = () => {
  $('help-text').textContent = t(input.isTouch ? 'help.mobile' : 'help.desktop');
};
refreshHelp();
const dismissHelp = () => {
  if ($('help').hidden) return;
  $('help').hidden = true;
  try { localStorage.setItem('mk.helpSeen', '1'); } catch { /* ignore */ }
};
$('help-ok').onclick = dismissHelp;
// Running stamina (see config.stamina*).
const stamina = { v: 1, rest: 0, tired: false };
const staminaEl = document.getElementById('stamina');
const staminaFill = document.getElementById('stamina-fill');
function updateStamina(dt, wantsRun, moving) {
  if (config.staminaUnlimited) return wantsRun;
  const running = wantsRun && moving && !stamina.tired;
  if (running) {
    stamina.v = Math.max(0, stamina.v - dt / config.staminaMax);
    stamina.rest = 0;
    if (stamina.v === 0) stamina.tired = true;
  } else {
    stamina.rest += dt;
    if (stamina.rest > config.staminaDelay) stamina.v = Math.min(1, stamina.v + (dt * config.staminaRegen) / config.staminaMax);
    if (stamina.tired && stamina.v >= config.staminaResume) stamina.tired = false;
  }
  staminaEl.hidden = stamina.v >= 1;
  staminaFill.style.transform = `scaleX(${stamina.v})`;
  staminaEl.classList.toggle('tired', stamina.tired);
  return running;
}
let walkedFor = 0; // the hint closes by itself once the player has walked a bit
clearTimeout(helpTimer);

// Street name: shown in its original (Korean) form, with a translate toggle.
const namedRoads = map.roads.filter((r) => r.n);
let currentStreet = null;
let translated = false;
function updateStreetCard() {
  const nameEl = $('street-name'), subEl = $('street-sub'), btn = $('street-translate');
  if (!currentStreet) {
    nameEl.textContent = t('hud.unnamed');
    subEl.textContent = '';
    btn.hidden = true;
    return;
  }
  const lang = getLanguage();
  const original = currentStreet.ko || localName(currentStreet);
  const local = currentStreet[lang] || currentStreet.en;
  const canTranslate = lang !== 'ko' && local && local !== original;
  btn.hidden = !canTranslate;
  btn.textContent = t(translated ? 'hud.original' : 'hud.translate');
  if (canTranslate && translated) {
    nameEl.textContent = local;
    subEl.textContent = original;
  } else {
    nameEl.textContent = original;
    subEl.textContent = '';
  }
}
$('street-translate').onclick = () => {
  translated = !translated;
  updateStreetCard();
};
onLanguageChange(() => {
  refreshHelp();
  updateStreetCard();
});

function nearestStreet(x, z) {
  let best = null, bestD = 18 * 18;
  for (const r of namedRoads) {
    const hw = r.w / 2 + 4;
    for (let i = 0; i < r.p.length - 1; i++) {
      const d = distSqToSeg(x, z, r.p[i], r.p[i + 1]);
      if (d < bestD && d < (hw + 6) ** 2) {
        bestD = d;
        best = r.n;
      }
    }
  }
  return best;
}

// ---------- Weather ----------
const weather = new WeatherSystem({
  scene, sun, hemi, ambient, region,
  onUpdate: ({ icon, temp }) => {
    const el = $('weather');
    el.hidden = false;
    el.textContent = temp == null ? icon : `${icon} ${Math.round(temp)}°C`;
    el.title = t('hud.weatherNow');
  },
});

// ---------- Multiplayer ----------
let others = new RemotePlayers(scene, $('labels'));
const refreshOnline = () => {
  const n = others.players.size + 1;
  $('online').hidden = n < 2;
  $('online').textContent = '🟢 ' + t('hud.online', { n });
};
onLanguageChange(refreshOnline);
let net = null;
let currentLook = myLook;
const SOLO = { sendState() {}, sendEmote() {}, sendLook() {}, disconnect() {} };
let idleTimer = 0, sendTimer = 0;
let lastSent = null; // set to null to resend our state at once (e.g. when someone joins)
// Street rooms are split into cells (see net/area.js); a shop is one room.
let joinToken = 0;
async function joinRoom(room, roomScene, area = null) {
  const token = ++joinToken;
  net?.disconnect();
  net = SOLO;
  for (const id of [...others.players.keys()]) others.leave(id);
  others = new RemotePlayers(roomScene, $('labels'));
  refreshOnline();
  const handlers = {
    onJoin: (p) => {
      others.join({ ...p, name: filterText(p.name) });
      if (safety.isBlocked(p.id, others.nameOf(p.id))) others.hide(p.id);
      refreshOnline(); lastSent = null;
    },
    onLeave: (id) => { tandemGone(id); others.leave(id); refreshOnline(); },
    onState: (id, st) => others.state(id, st),
    onEmote: (id, e) => {
      if (parseTandem(e)) { onTandemMsg(id, parseTandem(e)); return; }
      const em = getEmote(e);
      if (em && !safety.isBlocked(id, others.nameOf(id))) others.emote(id, em.anim, em.emoji); // ignore unknown emotes
    },
    onLook: (id, look) => others.setLook(id, look),
    onChat: (id, raw) => {
      if (!config.chatEnabled || safety.isBlocked(id, others.nameOf(id))) return;
      const text = filterText(cleanChat(raw));
      if (!text) return;
      // On the street only people within a few metres are heard, briefly.
      const street = !interior;
      if (street) {
        const at = others.positionOf(id);
        if (!at || Math.hypot(at.x - me.root.position.x, at.z - me.root.position.z) > config.chatStreetRadius) return;
      }
      const ms = street ? config.chatStreetSeconds * 1000 : 6000;
      const name = others.chat(id, text, ms);
      if (!name) return;
      addChatLine(name, text, '', id, street ? ms + 3000 : 0);
      const log = (recentLines.get(id) || []).concat(text).slice(-10);
      recentLines.set(id, log);
    },
  };
  try {
    const n = await createAreaNet(config.netProvider, handlers, config.net, {
      room, self: { id: myId, name: nickname, look: currentLook },
      cellSize: area ? config.netCellSize : 0, x: area?.x, z: area?.z,
    });
    if (token !== joinToken) { n.disconnect(); return; } // a newer join won
    net = n;
  } catch (err) {
    // Keep playing solo if the realtime service is unreachable.
    console.warn('Multiplayer unavailable:', err);
    if (token === joinToken) net = SOLO;
  }
}
// Leave multiplayer (e.g. inside your own home).
function goSolo(roomScene) {
  joinToken++;
  net?.disconnect();
  net = SOLO;
  for (const id of [...others.players.keys()]) others.leave(id);
  others = new RemotePlayers(roomScene, $('labels'));
  refreshOnline();
}
net = SOLO;
joinRoom(roomId, scene, { x: me.root.position.x, z: me.root.position.z });

// Emote wheel: one 😊 button. Press and drag onto a petal, then let go to
// send it; or tap to open the wheel and tap a petal. Keys 1–9 also work.
const emoteBar = $('emotes');
const emoteList = ownedPacks().flatMap((pack) => pack.emotes);
function sendEmote(em) {
  missionEvent('emote');
  if (em.anim) me.play(em.anim);
  showBubble(myLabel, $('labels'), em.emoji);
  net.sendEmote(em.id);
}
const petals = emoteList.map((em, i) => {
  const b = document.createElement('button');
  b.textContent = em.emoji;
  b.setAttribute('aria-label', em.id);
  // Fan out in a quarter circle above and to the left of the main button.
  // Rings of 3, 4 and 5 petals so up to 12 fit without overlapping.
  const ring = i < 3 ? 0 : i < 7 ? 1 : 2;
  const start = [0, 3, 7][ring];
  const n = Math.min([3, 4, 5][ring], emoteList.length - start);
  const ang = Math.PI / 2 + (n > 1 ? ((i - start) / (n - 1)) : 0.5) * (Math.PI / 2);
  const r = [80, 140, 200][ring];
  b.style.setProperty('--dx', `${Math.cos(ang) * r}px`);
  b.style.setProperty('--dy', `${-Math.sin(ang) * r}px`);
  b.onclick = (e) => { e.stopPropagation(); sendEmote(em); closeWheel(); };
  emoteBar.appendChild(b);
  return b;
});
let wheelOpen = false, dragHot = null, dragStart = null;
function openWheel() { wheelOpen = true; emoteBar.hidden = false; $('emote-wheel').classList.add('open'); }
function closeWheel() {
  wheelOpen = false; emoteBar.hidden = true; $('emote-wheel').classList.remove('open');
  petals.forEach((p) => p.classList.remove('hot'));
  dragHot = null;
}
const mainBtn = $('emote-main');
mainBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  mainBtn.setPointerCapture(e.pointerId);
  dragStart = { x: e.clientX, y: e.clientY, wasOpen: wheelOpen, moved: false };
  openWheel();
});
mainBtn.addEventListener('pointermove', (e) => {
  if (!dragStart) return;
  if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 12) dragStart.moved = true;
  dragHot = null;
  let best = 44;
  for (const p of petals) {
    const r = p.getBoundingClientRect();
    const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    if (d < best) { best = d; dragHot = p; }
  }
  petals.forEach((p) => p.classList.toggle('hot', p === dragHot));
});
const endDrag = () => {
  if (!dragStart) return;
  const { moved, wasOpen } = dragStart;
  dragStart = null;
  if (dragHot) { sendEmote(emoteList[petals.indexOf(dragHot)]); closeWheel(); }
  else if (moved || wasOpen) closeWheel(); // dragged off, or tapped again to close
  // a plain tap leaves the wheel open for tapping a petal
};
mainBtn.addEventListener('pointerup', endDrag);
mainBtn.addEventListener('pointercancel', () => { dragStart = null; closeWheel(); });
addEventListener('pointerdown', (e) => { if (wheelOpen && !e.target.closest('#emote-wheel')) closeWheel(); });
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const n = Number(e.key);
  if (n >= 1 && n <= emoteList.length) sendEmote(emoteList[n - 1]);
});

// Text chat: a speech bubble over your head and a short log (last 6 lines,
// fading out). Opens with 💬, or T or / on a keyboard. Text only, never HTML.
const chatLog = $('chat-log'), chatBar = $('chat-bar'), chatInput = $('chat-input');
let lastChatAt = 0, chatNoticeShown = false;
const cleanChat = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, config.chatMaxLength);
// removeAfter (ms): drop the line from the log after this long (street chat).
function addChatLine(name, text, kind = '', id = null, removeAfter = 0) {
  const line = document.createElement('div');
  line.className = 'chat-line ' + kind;
  // Someone else's name is a button: tap it to block or report them.
  const b = document.createElement(id ? 'button' : 'b');
  b.textContent = name;
  if (id) { b.className = 'chat-name'; b.onclick = () => openPersonMenu(id, name); }
  line.append(b, document.createTextNode(' ' + text));
  chatLog.append(line);
  while (chatLog.children.length > 6) chatLog.firstChild.remove();
  setTimeout(() => line.classList.add('old'), removeAfter ? removeAfter - 1000 : 15000);
  if (removeAfter) setTimeout(() => line.remove(), removeAfter);
}
let personFor = null;
function openPersonMenu(id, name) {
  personFor = { id, name };
  $('person-name').textContent = name;
  $('person-menu').hidden = false;
}
function blockPerson(report) {
  if (!personFor) return;
  const { id, name } = personFor;
  if (report) safety.report(id, name, recentLines.get(id) || []);
  else safety.block(id, name);
  others.hide(id);
  for (const el of chatLog.querySelectorAll('.chat-line')) {
    if (el.querySelector('.chat-name')?.textContent === name) el.remove();
  }
  $('person-menu').hidden = true;
  shop.toast(t(report ? 'safety.reported' : 'safety.blocked', { name }));
  refreshUnblock();
}
$('person-block').onclick = () => blockPerson(false);
$('person-report').onclick = () => blockPerson(true);
$('person-close').onclick = () => { $('person-menu').hidden = true; };
function refreshUnblock() {
  $('unblock-label').textContent = t('safety.unblockAll', { n: safety.blockedCount });
  $('unblock-btn').disabled = safety.blockedCount === 0;
}
$('unblock-btn').onclick = () => { safety.unblockAll(); refreshUnblock(); shop.toast(t('safety.unblocked')); };
onLanguageChange(refreshUnblock);
refreshUnblock();
function openChat() {
  // Close any open panel first (daily missions, wallet, cart…) so the chat bar is not hidden behind it.
  for (const x of document.querySelectorAll('#hud .sheet:not([hidden]) .sheet-x')) x.click();
  chatBar.hidden = false;
  input.keys.clear();
  chatInput.focus();
  if (!chatNoticeShown) { chatNoticeShown = true; addChatLine('ℹ️', t('chat.notice'), 'note'); }
}
function closeChat() { chatBar.hidden = true; chatInput.blur(); }
$('chat-btn').hidden = !config.chatEnabled;
$('chat-btn').onclick = () => (chatBar.hidden ? openChat() : closeChat());
chatBar.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Commands start with "/" and are never sent to other people.
  const raw = cleanChat(chatInput.value);
  if (raw.startsWith('/')) {
    chatInput.value = '';
    const [cmd, ...rest] = raw.slice(1).split(/\s+/);
    const unlocked = cmd === 'master' && await redeemCode(rest.join(' '));
    if (unlocked) {
      const added = inventory.add(...unlocked);
      shop.toast(added.length ? t('items.added', { list: added.map((id) => ITEMS[id].emoji + ' ' + localName(ITEMS[id].name, getLanguage())).join(', ') }) : t('items.already'));
      refreshItems();
    } else shop.toast(t('chat.unknownCommand'));
    return;
  }
  const text = filterText(cleanChat(chatInput.value));
  const now = performance.now() / 1000;
  if (!text || now - lastChatAt < config.chatCooldown) return;
  lastChatAt = now;
  chatInput.value = '';
  showBubble(myLabel, $('labels'), text, 6000, 'chat');
  addChatLine(nickname, text, 'mine');
  net.sendChat?.(text);
  if (input.isTouch) closeChat(); // hide the keyboard, give the joystick back
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.isComposing) e.preventDefault(); // Korean/Japanese IME: finish the word first
  if (e.key === 'Escape') closeChat();
});
addEventListener('keydown', (e) => {
  if (!config.chatEnabled || e.target instanceof HTMLInputElement) return;
  if (e.code === 'KeyT' || e.code === 'Slash') { e.preventDefault(); openChat(); }
});


// ---------- Stores, zones, map, guide ----------
let mode = 'street';
let activeScene = scene;
let activeCollision = collision;
let interior = null; // { store, scene, products, collision, front }
let action = null; // what the action button does right now
// Assign to `action` to force the button to refresh on the next frame
// (null would compare equal to "no action" and leave a stale button showing).
const STALE = { key: '\0', run() {} };

const cart = new Cart();
const shop = new ShopUI({
  cart,
  onTryOn: (product) => {
    setLook({ ...currentLook, ...product.tryOn });
    $('revert-look').hidden = false;
    shop.toast(t('shop.tried'));
  },
  onExit: () => leaveStore(),
});

function setLook(look) {
  currentLook = look;
  const old = me.root;
  me = createCharacter(look);
  me.root.position.copy(old.position);
  me.root.rotation.copy(old.rotation);
  me.setBike(riding);
  old.parent?.remove(old);
  activeScene.add(me.root);
  net.sendLook?.(look);
}
$('revert-look').onclick = () => {
  setLook(myLook);
  $('revert-look').hidden = true;
};

function moveMeTo(targetScene, x, z, ry, camYaw = ry + Math.PI) {
  me.root.parent?.remove(me.root);
  targetScene.add(me.root);
  me.root.position.set(x, 0, z);
  me.root.rotation.y = ry;
  lastSent = null; // teleport: tell others right away
  sendTimer = 0;
  cam.yaw = camYaw;
  camera.position.set(x + Math.sin(cam.yaw) * cam.dist, 1 + cam.dist * 0.5, z + Math.cos(cam.yaw) * cam.dist);
}

const interiorCache = new Map();
let clerk = null; // the clerk NPC in the shop you're in
// Bike share: rent at a station, get off anywhere (the bike goes back by itself).
let riding = 0; // 0 walking, 1 bike, 2 tandem (driving), 3 a seat in someone's vehicle, 4 car (driving)
let tandemDriver = null; // id of the driver whose vehicle I'm riding in
let mySeat = 0; // my seat in their vehicle (see SEATS)
const passengers = new Map(); // seat -> id: people riding with me
let tandemInvite = null; // { from, name, seat, until }: someone offered me a ride
const seatsOf = (kind) => SEATS[kind]?.length || 0;
const freeSeat = () => { for (let i = 0; i < seatsOf(riding); i++) if (!passengers.has(i)) return i; return -1; };
function setRiding(on) {
  const kind = on === true ? 1 : on || 0;
  if (riding === kind) return;
  if (kind && mode !== 'street') return;
  // Leaving a shared vehicle tells the others.
  for (const id of passengers.values()) net.sendEmote(tandemMsg('end', id));
  passengers.clear();
  if (riding === 3 && tandemDriver) {
    net.sendEmote(tandemMsg('leave', tandemDriver));
    // Step out beside the vehicle, onto free ground.
    const [fx, fz] = findFreeSpot(me.root.position.x + Math.cos(me.root.rotation.y) * 1.4, me.root.position.z - Math.sin(me.root.rotation.y) * 1.4);
    me.root.position.set(fx, 0, fz);
    tandemDriver = null;
  }
  if (riding === 4) {
    // Park and step out onto free ground beside the car.
    const ry = me.root.rotation.y;
    const [fx, fz] = findFreeSpot(me.root.position.x + Math.cos(ry) * 1.6, me.root.position.z - Math.sin(ry) * 1.6);
    me.root.position.set(fx, 0, fz);
  }
  riding = kind;
  me.setBike(kind);
  if (kind === 1 || kind === 2) missionEvent('bike');
  if (kind === 4) setAutoWalk(false); // auto-walk routes use alleys too
  sendTimer = 0;
  action = STALE;
  $('bike-btn').classList.toggle('on', !!kind);
  $('bike-label').textContent = t(kind ? 'bike.offShort' : 'hud.bike');
}
// Riding together (tandem: 1 passenger; car: up to 5). The driver offers a
// ride to someone nearby; they tap Ride and sit in the offered seat, following
// the driver, who steers. Messages ride on the emote channel.
function onTandemMsg(from, { verb, target, seat }) {
  if (target !== myId) return;
  const name = others.nameOf(from) || '?';
  if (verb === 'invite' && !riding && mode === 'street') {
    tandemInvite = { from, name, seat, until: performance.now() + 15000 };
    shop.toast(t('tandem.invited', { name }));
    action = STALE;
  } else if (verb === 'join') {
    const ok = (riding === 2 || riding === 4) && seat < seatsOf(riding) && !passengers.has(seat) && ![...passengers.values()].includes(from);
    if (ok) { passengers.set(seat, from); shop.toast(t('tandem.joined', { name })); action = STALE; }
    else net.sendEmote(tandemMsg('end', from)); // seat taken or not driving: say no
  } else if (verb === 'leave') {
    for (const [k, id] of passengers) if (id === from) { passengers.delete(k); shop.toast(t('tandem.left', { name })); action = STALE; }
  } else if (verb === 'end' && from === tandemDriver) {
    tandemGone(from);
  }
}
function tandemGone(id) {
  for (const [k, pid] of passengers) if (pid === id) { passengers.delete(k); action = STALE; }
  if (id === tandemDriver) { tandemDriver = null; riding = 3; setRiding(0); shop.toast(t('tandem.ended')); }
}
function hopOn(inv) {
  tandemInvite = null;
  const front = others.rootOf(inv.from);
  if (!front || mode !== 'street') return;
  setRiding(0);
  tandemDriver = inv.from;
  mySeat = inv.seat;
  setRiding(3);
  net.sendEmote(tandemMsg('join', inv.from, inv.seat));
}
// Items (saved on this device). The master code in chat adds every item.
const inventory = new Inventory();
// What you can ride: the share bike always, plus owned vehicles.
const RIDES = [
  { kind: 1, emoji: '🚲', label: 'ride.bike' },
  { kind: 2, emoji: '🚲🚲', label: 'ride.tandem', item: 'tandem' },
  { kind: 4, emoji: '🚗', label: 'ride.car', item: 'car' },
];
function ridePicker() {
  if (riding) { setRiding(0); return; }
  const rides = RIDES.filter((r) => !r.item || inventory.has(r.item));
  if (rides.length === 1) { startRide(1); return; }
  $('ride-options').replaceChildren(...rides.map((r) => {
    const b = document.createElement('button');
    b.className = 'primary';
    b.textContent = `${r.emoji} ${t(r.label)}`;
    b.onclick = () => { $('ride-panel').hidden = true; startRide(r.kind); };
    return b;
  }));
  $('ride-panel').hidden = false;
}
$('ride-close').onclick = () => { $('ride-panel').hidden = true; };
function startRide(kind) {
  if (kind === 4) {
    // Cars start on a big road: hop to the nearest one if it's close.
    const p = me.root.position;
    let [rx, rz, d] = nearestCarRoad(p.x, p.z);
    if (d <= 25 && collision.blocked(rx, rz, PLAYER_R)) {
      // Something stands there (a pillar, a kiosk): take the closest clear spot on a big road.
      const free = clearCarSpot(p.x, p.z);
      if (free) [rx, rz, d] = [free[0], free[1], Math.max(0.6, free[2])];
      else d = Infinity;
    }
    if (d > 25) { shop.toast(t('car.noRoad')); return; }
    if (d > 0.5) moveMeTo(scene, rx, rz, me.root.rotation.y, cam.yaw);
  }
  setRiding(kind);
}
// Cars stay on the big roads (OSM primary, secondary, tertiary…), never in
// residential alleys, service lanes or footpaths.
const CAR_ROADS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link', 'trunk_link', 'unclassified']);
const carSegs = [];
for (const r of map.roads) {
  if (!CAR_ROADS.has(r.k)) continue;
  for (let i = 1; i < r.p.length; i++) carSegs.push([r.p[i - 1][0], r.p[i - 1][1], r.p[i][0], r.p[i][1], (r.w || 8) / 2]);
}
// Nearest point on a car road: [x, z, distance beyond the road edge].
function nearestCarRoad(x, z) {
  let best = [x, z, Infinity];
  for (const [ax, az, bx, bz, hw] of carSegs) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const px = ax + u * dx, pz = az + u * dz;
    const d = Math.max(0, Math.hypot(px - x, pz - z) - hw);
    if (d < best[2]) best = [d === 0 ? x : px, d === 0 ? z : pz, d];
  }
  return best;
}
const onCarRoad = (x, z) => nearestCarRoad(x, z)[2] <= 0.5;
// Closest clear point on a big road's centre line within 25 m: [x, z, distance].
function clearCarSpot(x, z) {
  let best = null;
  for (const [ax, az, bx, bz] of carSegs) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 2);
    for (let i = 0; i <= n; i++) {
      const px = ax + ((bx - ax) * i) / n, pz = az + ((bz - az) * i) / n;
      const d = Math.hypot(px - x, pz - z);
      if (d <= 25 && (!best || d < best[2]) && !collision.blocked(px, pz, PLAYER_R)) best = [px, pz, d];
    }
  }
  return best;
}
// My bike (from the toolbar): ride anywhere on the street, tap again to get off.
$('bike-btn').onclick = () => ridePicker();
onLanguageChange(() => { $('bike-label').textContent = t(riding ? 'bike.offShort' : 'hud.bike'); });

function enterStore(item) {
  setRiding(false);
  sfx.doorbell(); // ding-dong
  const store = item.store;
  let built = interiorCache.get(store.id);
  if (!built) {
    built = buildInterior(store);
    built.collision = new CollisionMap(built.colliders);
    interiorCache.set(store.id, built);
  }
  interior = { ...built, store, front: item };
  mode = 'store';
  activeScene = built.scene;
  activeCollision = built.collision;
  cam.dist = 7;
  cam.pitch = 0.7;
  moveMeTo(built.scene, built.exit.x, built.exit.z - 1.4, Math.PI);
  document.body.classList.add('in-store');
  shop.enterStore(store);
  $('guide').hidden = true;
  if (guide?.kind === 'store' && guide.id === store.id) clearGuide();
  if (built.clerk && !built.clerkNpc) {
    built.clerkNpc = makeNpc($('labels'), t('npc.clerk'));
    built.clerkNpc.ch.root.position.set(built.clerk.x, 0, built.clerk.z);
    built.clerkNpc.ch.root.rotation.y = built.clerk.ry;
    built.scene.add(built.clerkNpc.ch.root);
  }
  clerk = built.clerkNpc || null;
  if (store.pets && !built.pets) built.pets = new Pets(built.scene, built.room, (x, z, r) => built.collision.blocked(x, z, r), store.pets);
  interior.pets = built.pets || null;
  missionEvent('visit', store.id);
  const quiet = store.category === 'library';
  if (clerk) setTimeout(() => clerk && say(clerk, $('labels'), quiet ? PHRASES.library[0] : PHRASES.welcome[0]), 600);
  npcs.setVisible(false);
  if (store.category === 'home') {
    goSolo(built.scene); // your home is private for now
    openHome(store, built);
  } else joinRoom(`${roomId}-${store.id}`, built.scene);
}

function leaveStore() {
  if (mode !== 'store') return;
  standUp();
  closeHome();
  closeHatWorkshop(false);
  if (orderUi.open) orderUi.close();
  if (clerk) { clerk.tag.style.display = 'none'; clerk.bubble?.remove(); clerk.bubble = null; }
  clerk = null;
  npcs.setVisible(true);
  sfx.doorbell();
  const it = interior.front;
  mode = 'street';
  activeScene = scene;
  activeCollision = collision;
  cam.dist = 9;
  cam.pitch = 0.42;
  // Face the street, with the camera to the side so the shop front stays in view.
  // Step out a little in front of the door, on a spot that is not inside a
  // building (some shop fronts sit close to their neighbours).
  const ry = it.group.rotation.y;
  const [ex, ez] = findFreeSpot(it.door.x + Math.sin(ry) * 1.2, it.door.z + Math.cos(ry) * 1.2);
  moveMeTo(scene, ex, ez, ry, ry + Math.PI / 2);
  document.body.classList.remove('in-store');
  shop.leaveStore();
  interior = null;
  if (guide) $('guide').hidden = false;
  joinRoom(roomId, scene, { x: me.root.position.x, z: me.root.position.z });
}

// Translate signs (storefronts and zone boards) into the chosen language.
let signsTranslated = false;
const applySigns = () => {
  storefronts.setTranslated(signsTranslated, getLanguage());
  zones.setTranslated(signsTranslated, getLanguage());
  $('signs-btn').setAttribute('aria-pressed', String(signsTranslated));
  $('signs-btn').title = t(signsTranslated ? 'hud.signsOn' : 'hud.signsOff');
};
$('signs-btn').onclick = () => {
  signsTranslated = !signsTranslated;
  applySigns();
};
onLanguageChange(() => { if (signsTranslated) applySigns(); });

// Sound effects (on by default; remembered on this device).
const sfx = new Sfx();
try { sfx.on = localStorage.getItem('mk.sfx') !== '0'; } catch { /* ignore */ }
$('sfx-btn').setAttribute('aria-pressed', String(sfx.on));
$('sfx-btn').onclick = () => {
  sfx.on = !sfx.on;
  $('sfx-btn').setAttribute('aria-pressed', String(sfx.on));
  try { localStorage.setItem('mk.sfx', sfx.on ? '1' : '0'); } catch { /* ignore */ }
  if (sfx.on) sfx.doorbell(); // preview
};

// Background music (off by default; the choice is remembered on this device).
const music = new Music();
const MUSIC_KEY = 'mk.music';
const applyMusicBtn = () => {
  $('music-btn').setAttribute('aria-pressed', String(music.on));
  $('music-btn').title = t(music.on ? 'hud.musicOn' : 'hud.musicOff');
};
$('music-btn').onclick = async () => {
  await music.setOn(!music.on);
  try { localStorage.setItem(MUSIC_KEY, music.on ? '1' : '0'); } catch { /* ignore */ }
  applyMusicBtn();
};
applyMusicBtn();
onLanguageChange(applyMusicBtn);
let musicWanted = false;
try { musicWanted = localStorage.getItem(MUSIC_KEY) === '1'; } catch { /* ignore */ }
if (musicWanted) {
  // Browsers only allow sound after a tap or key press.
  const resume = async () => {
    removeEventListener('pointerdown', resume);
    removeEventListener('keydown', resume);
    if (!music.on) { await music.setOn(true); applyMusicBtn(); }
  };
  addEventListener('pointerdown', resume);
  addEventListener('keydown', resume);
}

// Guidance to a zone or store.
let guide = null;
let routeTimer = 0, routeLen = 0, faceRoute = false;
let routePoly = null; // the current route along the streets
// Auto-walk: follow the route without steering. Any stick/key input stops it.
let autoWalk = false;
let carNoteT = 0; // cooldown for the "cars can't go into alleys" note
const autoSide = { t: 0, dir: 1, stuck: 0 }; // side-step when walking into a wall
function setAutoWalk(on) {
  autoWalk = !!on && !!guide && riding !== 3 && riding !== 4;
  $('guide-auto').classList.toggle('on', autoWalk);
  $('guide-auto-label').textContent = t(autoWalk ? 'guide.autoStop' : 'guide.auto');
  if (autoWalk) { routeTimer = 0; manualCamT = 0; }
}
$('guide-auto').onclick = () => setAutoWalk(!autoWalk);
function setGuide(g) {
  guide = g;
  $('guide').hidden = mode !== 'street';
  routeTimer = 0; // draw the route on the next frame
  faceRoute = true; // and turn the camera to look along it
}
function clearGuide() {
  guide = null;
  routePoly = null;
  setAutoWalk(false);
  $('guide').hidden = true;
  routeLine.clear();
}
$('guide-x').onclick = clearGuide;

const mapView = new MapView({
  root: $('map-panel'),
  map,
  zones: zones.items,
  stores: storefronts.items,
  getPlayers: () => {
    const pos = mode === 'street' ? me.root.position : interior.front.door;
    return {
      me: { x: pos.x, z: pos.z, ry: mode === 'street' ? me.root.rotation.y : interior.front.group.rotation.y },
      others: mode === 'street' ? others.list() : [],
    };
  },
  onGuide: (g) => {
    if (mode === 'store') leaveStore();
    setGuide(g);
  },
  onTaxi: (dest) => rideTaxi(dest),
});

// Taxi: pick a place on the map (taxi mode) and ride there. A short scene
// from the back seat, the driver speaks Korean, then you're dropped off on
// the nearest street. Free during beta (see ROADMAP: later it costs coins).
const TAXI_LINES = [
  ['안녕하세요! 어디로 가세요?', 'annyeonghaseyo! eodiro gaseyo?', 'taxi.t1'],
  ['네, 출발할게요!', 'ne, chulbalhalgeyo!', 'taxi.t2'],
  ['도착했습니다. 안녕히 가세요!', 'dochakhaetseumnida. annyeonghi gaseyo!', 'taxi.t3'],
];
let taxiTimers = [];
const CAR_FREE = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track', 'corridor']);
function taxiDropOff(x, z) {
  let best = [x, z], bd = Infinity;
  for (const r of map.roads) {
    if (CAR_FREE.has(r.k)) continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      const px = ax + u * dx, pz = az + u * dz, d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bd) { bd = d; best = [px, pz]; }
    }
  }
  return best;
}
function rideTaxi(dest) {
  if (mode === 'store') leaveStore();
  if (riding) setRiding(false);
  clearGuide();
  // Drop-off: the nearest point on a road a car can use, on free ground.
  const [rx, rz] = taxiDropOff(dest.x, dest.z);
  const [fx, fz] = findFreeSpot(rx, rz);
  const ry = Math.atan2(dest.x - fx, dest.z - fz); // face the destination
  const sayLine = ([ko, rom, key]) => {
    $('taxi-ko').textContent = ko;
    $('taxi-rom').textContent = rom;
    $('taxi-tr').textContent = getLanguage() === 'ko' ? '' : t(key);
  };
  $('taxi-dest').textContent = '📍 ' + t('taxi.to', { label: dest.label });
  $('taxi-skip').textContent = t('taxi.skip');
  $('taxi-ride').hidden = false;
  input.keys.clear();
  sayLine(TAXI_LINES[0]);
  let done = false;
  const arrive = () => {
    if (done) return;
    done = true;
    taxiTimers.forEach(clearTimeout);
    taxiTimers = [];
    $('taxi-ride').hidden = true;
    moveMeTo(scene, fx, fz, ry);
    if (dest.guide && Math.hypot(dest.x - fx, dest.z - fz) > 4) setGuide(dest.guide);
    showBubble(myLabel, $('labels'), '🚕');
  };
  taxiTimers = [
    setTimeout(() => sayLine(TAXI_LINES[1]), 1800),
    setTimeout(() => sayLine(TAXI_LINES[2]), 4200),
    setTimeout(arrive, 5600),
  ];
  $('taxi-skip').onclick = arrive;
}
$('map-btn').onclick = () => {
  const pos = mode === 'street' ? me.root.position : interior.front.door;
  mapView.show(pos.x, pos.z);
};

// Action button (and E / Enter key).
const moveRef = { yaw: 0, stick: null };
function runAction() {
  if (!action) return;
  action.run();
}
$('action-btn').onclick = runAction;
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'KeyE' || e.code === 'Enter') runAction();
  if (e.code === 'KeyM') $('map-btn').click();
  if (e.code === 'Escape') {
    if (!$('map-panel').hidden) mapView.hide();
    else if (!$('settings-panel').hidden) $('settings-panel').hidden = true;
    else if (wheelOpen) closeWheel();
    else if (!$('product-panel').hidden) shop.closeProduct();
  }
});

let currentZone = null;
function updateZoneLine(z) {
  const el = $('zone-line');
  if (!z) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = z.id;
  b.style.background = z.color;
  el.append(b, document.createTextNode(localName(z.name, getLanguage())));
}
onLanguageChange(() => updateZoneLine(currentZone));


// Home decorating: place furniture from a catalogue, then tap it again in the
// catalogue (or walk up to it) to rotate, carry or put it away. One of each
// piece for now, so rooms stay light. Saved in this browser only (for now).
const MAX_PIECES = 60;
let decor = null; // { home, built, items: [{ id, x, z, ry }], group, editing, piece, carry }
const homeKey = (id) => 'mk.home.' + id;
function loadDecor(id) {
  try {
    const a = JSON.parse(localStorage.getItem(homeKey(id)) || '[]');
    return Array.isArray(a)
      ? a.filter((i, k) => furnitureById(i?.id) && [i.x, i.z, i.ry].every(Number.isFinite) && a.findIndex((j) => j?.id === i.id) === k).slice(0, MAX_PIECES)
      : [];
  } catch { return []; }
}
function saveDecor() {
  const r = (v) => Math.round(v * 100) / 100;
  try { localStorage.setItem(homeKey(decor.home), JSON.stringify(decor.items.map((i) => ({ id: i.id, x: r(i.x), z: r(i.z), ry: r(i.ry) })))); } catch { /* storage blocked */ }
}
function rebuildDecor() {
  decor.group.clear();
  for (const it of decor.items) {
    const g = buildFurniture(it.id);
    g.position.set(it.x, 0, it.z);
    g.rotation.y = it.ry;
    decor.group.add(g);
    it.mesh = g;
  }
  // The piece being carried doesn't block you until it is put down.
  const extra = decor.items.filter((it) => it !== decor.carry).map(furnitureCollider).filter(Boolean);
  interior.collision = activeCollision = new CollisionMap(decor.built.colliders.concat(extra));
  interior.seats = decor.items.filter((it) => furnitureById(it.id).seat).map((it) => {
    const fx = Math.sin(it.ry), fz = Math.cos(it.ry);
    const out = furnitureById(it.id).size[1] / 2 + 0.55;
    return { x: it.x + fx * 0.05, z: it.z + fz * 0.05, ry: it.ry, stand: [it.x + fx * out, it.z + fz * out] };
  });
  saveDecor();
  markPlaced();
}
// Catalogue buttons show which pieces are already in the room.
function markPlaced() {
  for (const b of $('decor-grid').children) b.classList.toggle('placed', !!decor?.items.some((i) => i.id === b.dataset.id));
}
function openHome(store, built) {
  if (!built.decorGroup) { built.decorGroup = new THREE.Group(); built.scene.add(built.decorGroup); }
  decor = { home: store.id, built, items: loadDecor(store.id), group: built.decorGroup, editing: false, piece: null, carry: null };
  rebuildDecor();
  $('decor-btn').hidden = false;
}
function closeHome() {
  if (!decor) return;
  setDecorating(false);
  $('decor-btn').hidden = true;
  decor = null;
}
function setDecorating(on) {
  decor.editing = on;
  $('decor-bar').hidden = !on;
  $('decor-btn').classList.toggle('on', on);
  if (!on) closePiece();
  action = STALE; // refresh the action button
}
// A spot about 1.6 m in front of the player, inside the room.
function spotInFront() {
  const p = me.root.position, ry = me.root.rotation.y;
  const { w, d } = interior.room;
  return [
    THREE.MathUtils.clamp(p.x + Math.sin(ry) * 1.6, -w / 2 + 0.8, w / 2 - 0.8),
    THREE.MathUtils.clamp(p.z + Math.cos(ry) * 1.6, -d / 2 + 0.8, d / 2 - 1.8),
    ry + Math.PI, // facing you
  ];
}
function placePiece(id) {
  const placed = decor.items.find((i) => i.id === id);
  if (placed) { openPiece(placed, true); return; } // one of each: tap again to edit it
  if (decor.items.length >= MAX_PIECES) return shop.toast(t('home.full'));
  const [x, z, ry] = spotInFront();
  decor.items.push({ id, x, z, ry: Math.round(ry / (Math.PI / 4)) * (Math.PI / 4) });
  rebuildDecor();
}
function nearestPiece(p) {
  let best = null, bd = 1.6;
  for (const it of decor.items) {
    const d = Math.hypot(p.x - it.x, p.z - it.z) - Math.max(...furnitureById(it.id).size) / 2;
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
function openPiece(it, picked = false) {
  if (decor.carry && decor.carry !== it) putDown();
  decor.piece = it;
  decor.picked = picked; // chosen from the catalogue: stays open while you walk
  $('piece-move-label').textContent = t(decor.carry === it ? 'home.putDown' : 'home.carry');
  $('piece-name').textContent = furnitureById(it.id).emoji + ' ' + localName(furnitureById(it.id).name, getLanguage());
  $('piece-bar').hidden = false;
}
function closePiece() {
  if (decor?.carry) putDown();
  if (decor) { decor.piece = null; decor.picked = false; }
  $('piece-bar').hidden = true;
}
// Carry a piece: it floats in front of you until you put it down.
function putDown() {
  decor.carry = null;
  $('decor-bar').hidden = !decor.editing;
  rebuildDecor();
  if (decor.piece) $('piece-move-label').textContent = t('home.carry');
}
function updateCarry() {
  const it = decor?.carry;
  if (!it?.mesh) return;
  [it.x, it.z] = spotInFront();
  it.mesh.position.set(it.x, 0.08, it.z); // lifted a little while carried
}
$('decor-btn').onclick = () => decor && setDecorating(!decor.editing);
$('decor-grid').append(...FURNITURE.map((f) => {
  const b = document.createElement('button');
  b.className = 'decor-item';
  b.innerHTML = `<span>${f.emoji}</span><small></small>`;
  b.dataset.id = f.id;
  b.onclick = () => placePiece(f.id);
  return b;
}));
function labelDecor() {
  for (const b of $('decor-grid').children) b.querySelector('small').textContent = localName(furnitureById(b.dataset.id).name, getLanguage());
}
labelDecor();
onLanguageChange(labelDecor);
$('piece-rotate').onclick = () => { if (decor?.piece) { decor.piece.ry += Math.PI / 4; rebuildDecor(); } };
$('piece-move').onclick = () => {
  if (!decor?.piece) return;
  if (decor.carry) { putDown(); closePiece(); action = STALE; return; }
  decor.carry = decor.piece;
  decor.picked = true;
  $('decor-bar').hidden = true; // see where you're walking
  rebuildDecor();
  $('piece-move-label').textContent = t('home.putDown');
};
$('piece-remove').onclick = () => {
  if (!decor?.piece) return;
  if (decor.carry === decor.piece) decor.carry = null;
  decor.items.splice(decor.items.indexOf(decor.piece), 1);
  rebuildDecor();
  closePiece();
  action = STALE;
};
$('piece-close').onclick = closePiece;


// Coins and the rewarded-ad slot (demo for now; see core/wallet.js).
const wallet = new Wallet(config.rewardedAd);
// Ordering practice at restaurants (food can't be eaten; you practise ordering).
const orderUi = new OrderUI({
  root: $('order-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onStamp: (n, total, coins) => { if (coins) shop.toast(t('order.stampToast', { n, total, coins })); },
});
function openOrder() {
  if (!interior?.store || !clerk) return;
  clerk.ch.wave();
  orderUi.show(interior.store);
}
const showAd = demoAd($('ad-overlay'), $('ad-count'), $('ad-close'));
function refreshWallet() {
  $('coin-count').textContent = wallet.coins;
  $('wallet-coins').textContent = wallet.coins;
  $('ad-label').textContent = t('wallet.watch', { n: config.rewardedAd.reward });
  const left = wallet.adsLeft();
  $('ad-left').textContent = t('wallet.left', { n: left });
  $('ad-btn').disabled = left <= 0;
}
wallet.onChange(refreshWallet);
onLanguageChange(refreshWallet);
refreshWallet();
function refreshCloud() {
  const label = t(cloud.status === 'cloud' ? (cloud.guest ? 'cloud.guest' : 'cloud.account') : cloud.status === 'error' ? 'cloud.error' : 'cloud.local');
  $('cloud-label').textContent = !cloud.guest && cloud.email ? `${label} · ${cloud.email}` : label;
  // A guest can link Google (keeps this save) or sign in to an older account.
  $('cloud-actions').hidden = !(cloud.status === 'cloud' && cloud.guest);
}
const googleFail = (err) => err && shop.toast(t(err === 'taken' ? 'cloud.taken' : 'cloud.notReady'));
$('google-link').onclick = async () => googleFail(await cloud.linkGoogle());
$('google-signin').onclick = async () => {
  if (!confirm(t('cloud.signinConfirm'))) return;
  googleFail(await cloud.signInGoogle());
};
cloud.onChange(refreshCloud);
refreshCloud();
onLanguageChange(refreshCloud);
$('coin-btn').onclick = () => { $('wallet-panel').hidden = false; refreshWallet(); refreshItems(); };
function refreshItems() {
  const list = inventory.list();
  $('wallet-items-title').hidden = !list.length;
  $('wallet-items').replaceChildren(...list.map((id) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    const it = ITEMS[id];
    const b = document.createElement('strong');
    b.textContent = `${it.emoji} ${localName(it.name, getLanguage())}`;
    const d = document.createElement('small');
    d.textContent = localName(it.desc, getLanguage());
    row.append(b, d);
    return row;
  }));
}
$('wallet-close').onclick = () => { $('wallet-panel').hidden = true; };
$('ad-btn').onclick = async () => {
  $('ad-btn').disabled = true;
  const music0 = music.on;
  if (music0) music.setOn(false); // a real ad has its own sound
  const n = await wallet.watchAd(showAd);
  if (music0) music.setOn(true);
  refreshWallet();
  if (n) shop.toast(t('wallet.earned', { n }));
};

// Daily check-in and three daily missions (see core/daily.js).
daily = new Daily(wallet, {
  npcs: [...new Set(npcs.list.map((o) => o.name))],
  stores: storefronts.items.map((i) => i.store).filter((st) => st.category !== 'home'),
});
const storeById = (id) => storefronts.items.find((i) => i.store.id === id);
function missionText(m) {
  if (m.type === 'talk') return t('mission.talk', { name: getLanguage() === 'ko' ? m.target : `${m.target} (${NAME_ROMAN[m.target] || ''})` });
  if (m.type === 'visit') return t('mission.visit', { store: localName(storeById(m.target)?.store.name, getLanguage()) || m.target });
  return t('mission.' + m.type, { n: m.need });
}
function renderDaily() {
  const wd = daily.weekDay(), done = daily.checkedInToday();
  $('daily-week').replaceChildren(...Array.from({ length: 7 }, (_, i) => {
    const el = document.createElement('span');
    const day = i + 1;
    el.textContent = day === 7 ? '🎁' : String(day);
    if (day === 7) el.classList.add('big');
    if (day < wd || (day === wd && done)) el.classList.add('on');
    if (day === wd) el.classList.add('today');
    return el;
  }));
  const btn = $('checkin-btn');
  btn.disabled = done;
  btn.textContent = done ? t('daily.done') : t('daily.checkIn', { n: wd === 7 ? REWARD.week : REWARD.checkIn });
  $('daily-streak').textContent = t('daily.streak', { n: done ? daily.streak : Math.max(0, wd - 1), w: REWARD.week });
  $('daily-missions').replaceChildren(...daily.missions.map((m) => {
    const li = document.createElement('li');
    const finished = m.n >= m.need;
    li.classList.toggle('done', finished);
    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.textContent = finished ? '✓' : '';
    const text = document.createElement('span');
    text.className = 'm-text';
    text.textContent = missionText(m);
    li.append(tick, text);
    if (m.need > 1 && !finished) {
      const prog = document.createElement('span');
      prog.className = 'm-prog';
      prog.textContent = `${m.n}/${m.need}`;
      li.append(prog);
    }
    // Show the way: to the store, or to where the person is walking right now.
    const target = m.type === 'visit' ? storeById(m.target) : m.type === 'talk' ? npcs.list.find((o) => o.name === m.target) : null;
    if (target && !finished) {
      const go = document.createElement('button');
      go.className = 'chip';
      go.textContent = '🧭 ' + t('mission.go');
      go.onclick = () => {
        $('daily-panel').hidden = true;
        if (mode === 'store') leaveStore();
        if (m.type === 'visit') setGuide({ kind: 'store', id: target.store.id, x: target.door.x, z: target.door.z, label: localName(target.store.name, getLanguage()) });
        else setGuide({ kind: 'npc', id: target.name, x: target.ch.root.position.x, z: target.ch.root.position.z, label: target.name });
      };
      li.append(go);
    }
    return li;
  }));
  $('daily-bonus').textContent = daily.allDone() ? t('daily.bonusDone') : t('daily.bonus', { n: REWARD.allDone });
  $('daily-dot').hidden = !daily.hasNews();
}
function missionEvent(type, target) {
  const r = daily?.record(type, target);
  if (!r) return;
  shop.toast(t('daily.complete', { n: r.coins }));
}
daily.onChange(renderDaily);
onLanguageChange(renderDaily);
renderDaily();
$('daily-btn').onclick = () => { renderDaily(); $('daily-panel').hidden = false; };
$('daily-close').onclick = () => { $('daily-panel').hidden = true; };
// Once a day, open the check-in card shortly after arriving.
if (daily.hasNews()) setTimeout(() => { renderDaily(); $('daily-panel').hidden = false; }, 1200);
$('checkin-btn').onclick = () => {
  const n = daily.checkIn();
  if (n) shop.toast(t('daily.checked', { n }));
};

// Hat workshop: pick a shape, colour and embroidered patch; the hat shows on
// your character while you edit, and Save keeps it (others see it too).
let hatDraft = null, savedCam = null;
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function hatButtons(rowId, items, render, onPick) {
  const row = $(rowId);
  row.replaceChildren(...items.map((id) => {
    const b = document.createElement('button');
    b.className = 'hat-opt';
    b.dataset.id = id ?? '';
    render(b, id);
    b.onclick = () => { onPick(id); refreshHat(); };
    return b;
  }));
}
function refreshHat() {
  for (const [row, key] of [['hat-shapes', 'head'], ['hat-colors', 'hatColor'], ['hat-patches', 'hatPatch']]) {
    for (const b of $(row).children) b.classList.toggle('on', (hatDraft[key] ?? '') === b.dataset.id);
  }
  setLook(hatDraft);
}
function openHatWorkshop() {
  hatDraft = { ...myLook, head: HAT_SHAPES.includes(myLook.head) ? myLook.head : 'bucket', hatColor: myLook.hatColor || 'butter' };
  hatButtons('hat-shapes', HAT_SHAPES, (b, id) => { b.textContent = accessory('head', id).emoji; b.title = id; }, (id) => { hatDraft.head = id; });
  hatButtons('hat-colors', Object.keys(PALETTES.hat), (b, id) => { b.style.background = hex(PALETTES.hat[id]); b.classList.add('swatch'); b.title = id; }, (id) => { hatDraft.hatColor = id; });
  hatButtons('hat-patches', [null, ...Object.keys(PATCHES)], (b, id) => { b.textContent = id ? PATCHES[id] : '∅'; }, (id) => { hatDraft.hatPatch = id; });
  $('hat-panel').hidden = false;
  savedCam = { ...cam };
  Object.assign(cam, { dist: 2.6, pitch: 0.12, yaw: me.root.rotation.y }); // close-up, facing you
  refreshHat();
}
function closeHatWorkshop(save) {
  if (!hatDraft) return;
  $('hat-panel').hidden = true;
  if (save) {
    myLook = { ...hatDraft };
    saveLook(myLook);
    shop.toast(t('hat.saved'));
  }
  setLook(myLook);
  hatDraft = null;
  if (savedCam) Object.assign(cam, savedCam);
}
$('hat-save').onclick = () => closeHatWorkshop(true);
$('hat-cancel').onclick = () => closeHatWorkshop(false);
// Café seats. Sitting snaps you onto the chair facing the table; moving or
// tapping Stand puts you back beside it. Others see it through the "sit" flag.
let seated = null;
function nearestSeat(p) {
  let best = null, bd = 1.3;
  for (const s of interior?.seats || []) {
    const d = Math.hypot(p.x - s.x, p.z - s.z);
    if (d < bd && !others.seatTaken?.(s.x, s.z)) { bd = d; best = s; }
  }
  return best;
}
function sitDown(seat) {
  seated = seat;
  me.root.position.set(seat.x, 0, seat.z);
  me.root.rotation.y = seat.ry;
  cam.yaw = seat.ry + Math.PI;
  sendTimer = 0; // tell others right away
  missionEvent('sit');
}
function standUp() {
  if (!seated) return;
  me.root.position.set(seated.stand[0], 0, seated.stand[1]);
  seated = null;
  sendTimer = 0;
}

function updateAction(p, tSec) {
  let next = null;
  if (mode === 'street') {
    const it = storefronts.nearby(p.x, p.z, tSec);
    if (it) next = { key: 'enter:' + it.store.id, label: '🚪 ' + t('shop.enter', { name: localName(it.store.name, getLanguage()) }), run: () => enterStore(it) };
    else if ((riding === 2 || riding === 4) && freeSeat() >= 0 && others.nearestFree(p.x, p.z, riding === 4 ? 4.5 : 3)) {
      const o = others.nearestFree(p.x, p.z, riding === 4 ? 4.5 : 3);
      const seat = freeSeat();
      next = { key: 'tandem-invite:' + o.id, label: (riding === 4 ? '🚗 ' : '🚲 ') + t('tandem.invite', { name: o.name }), run: () => { net.sendEmote(tandemMsg('invite', o.id, seat)); shop.toast(t('tandem.sent', { name: o.name })); } };
    } else if (riding) next = { key: 'bike-off', label: riding === 4 ? '🚗 ' + t('car.off') : '🚲 ' + t('bike.off'), run: () => setRiding(false) };
    else if (tandemInvite && performance.now() < tandemInvite.until && others.rootOf(tandemInvite.from) && others.rootOf(tandemInvite.from).position.distanceTo(p) < 6) {
      const inv = tandemInvite;
      next = { key: 'tandem-hop:' + inv.from, label: (others.kindOf(inv.from) === 4 ? '🚗 ' : '🚲 ') + t('tandem.hopOn', { name: inv.name }), run: () => hopOn(inv) };
    }
    else if (bikeStations.nearby(p.x, p.z)) next = { key: 'bike-on', label: '🚲 ' + t('bike.on'), run: () => setRiding(true) };
    else {
      const n = npcs.nearest(p.x, p.z);
      if (n) next = { key: 'npc:' + n.name, label: '👋 ' + t('npc.hi', { name: n.name }), run: () => { npcs.greet(n, p.x, p.z); missionEvent('talk', n.name); } };
    }
  } else {
    const ex = interior.exit;
    const seat = !seated && nearestSeat(p);
    if (Math.hypot(p.x - ex.x, p.z - ex.z) < 1.6) {
      next = { key: 'exit', label: '🚪 ' + t(interior.store.category === 'home' ? 'home.leave' : 'shop.leave'), run: () => leaveStore() };
    } else if (decor?.editing) {
      // decorate mode: walk up to a piece to rotate, move or remove it
      const it = nearestPiece(p);
      if (decor.carry) next = { key: 'put-down', label: '📍 ' + t('home.putDown'), run: () => { putDown(); closePiece(); } };
      else if (it) next = { key: 'piece:' + decor.items.indexOf(it), label: '✋ ' + localName(furnitureById(it.id).name, getLanguage()), run: () => openPiece(it) };
      else if (!decor.picked) closePiece();
    } else if (seated) {
      next = { key: 'stand', label: '🧍 ' + t('shop.stand'), run: () => standUp() };
    } else if (interior.store.workshop === 'order' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'order', label: '🍢 ' + t('order.start'), run: () => openOrder() };
    } else if (interior.store.workshop === 'hat' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'hat', label: '🧢 ' + t('hat.make'), run: () => openHatWorkshop() };
    } else if (clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.2) {
      next = { key: 'clerk', label: '👋 ' + t('npc.hi', { name: clerk.name }), run: () => { clerk.ch.wave(); const lines = interior?.store.category === 'library' ? PHRASES.library : PHRASES.shop; say(clerk, $('labels'), lines[Math.floor(Math.random() * lines.length)]); } };
    } else if (interior.pets?.nearest(p.x, p.z)) {
      const pet = interior.pets.nearest(p.x, p.z);
      next = { key: 'pet:' + pet.name, label: '🐾 ' + t('pet.pat', { name: Pets.label(pet) }), run: () => { interior.pets.pet(pet, p.x, p.z); showBubble(myLabel, $('labels'), '😻'); missionEvent('pet'); } };
    } else if (seat) {
      next = { key: 'sit', label: '🪑 ' + t('shop.sit'), run: () => sitDown(seat) };
    } else {
      let best = null, bestD = 1.9;
      for (const pr of interior.products) {
        const d = Math.hypot(p.x - pr.pos.x, p.z - pr.pos.z);
        if (d < bestD) { bestD = d; best = pr; }
      }
      if (best) next = { key: 'look:' + best.product.id, label: '👀 ' + t('shop.look', { name: localName(best.product.name, getLanguage()) }), run: () => shop.openProduct(best.product) };
      else shop.closeProduct();
    }
  }
  if (next?.key !== action?.key) {
    action = next;
    $('action-btn').hidden = !action;
    if (action) $('action-btn').textContent = action.label;
    else shop.closeProduct();
  }
}
onLanguageChange(() => { action = STALE; });

function updateGuide(p, dt) {
  if (!guide || mode !== 'street') return;
  // A person walks around: follow where they are now, and when we get
  // close they stop and wait for us.
  if (guide.kind === 'npc') {
    const o = npcs.list.find((n) => n.name === guide.id);
    if (o) {
      const moved = Math.hypot(o.ch.root.position.x - guide.x, o.ch.root.position.z - guide.z);
      guide.x = o.ch.root.position.x;
      guide.z = o.ch.root.position.z;
      if (moved > 3) routeTimer = 0;
      if (Math.hypot(guide.x - p.x, guide.z - p.z) < 25) o.pause = Math.max(o.pause || 0, 1);
    }
  }
  const dx = guide.x - p.x, dz = guide.z - p.z;
  const dist = Math.hypot(dx, dz);
  // Re-plan the route along the streets from where we are now.
  routeTimer -= dt;
  if (routeTimer <= 0) {
    routeTimer = 0.5;
    const poly = roadGraph.route(p.x, p.z, guide.x, guide.z);
    routeLine.set(poly);
    routePoly = poly;
    routeLen = 0;
    for (let i = 1; i < poly.length; i++) routeLen += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    if (faceRoute) {
      faceRoute = false;
      // Look towards the route point about 8 m ahead.
      let ax = poly[1][0], az = poly[1][1], acc = 0;
      for (let i = 1; i < poly.length; i++) {
        acc += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
        [ax, az] = poly[i];
        if (acc > 8) break;
      }
      if (Math.hypot(ax - p.x, az - p.z) > 1) cam.yaw = Math.atan2(-(ax - p.x), -(az - p.z));
    }
  }
  if (dist < (guide.kind === 'npc' ? 2.5 : 6)) {
    shop.toast(t('guide.arrived', { label: guide.label }));
    clearGuide();
    return;
  }
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  const ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);
  $('guide-arrow').style.transform = `rotate(${ang}rad)`;
  $('guide-text').textContent = t('guide.to', { label: guide.label, m: Math.round(Math.max(dist, routeLen)) });
}

// ---------- Loop ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const timer = new THREE.Timer();
let streetTimer = 0, speed01 = 0;
const tmp = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  input.update();

  const look = input.consumeLook();
  if (look.dx || look.dy) manualCamT = 2;
  manualCamT -= dt;
  carNoteT = Math.max(0, carNoteT - dt);
  cam.yaw -= look.dx * 0.006;
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + look.dy * 0.004, 0.12, 1.25);
  cam.dist = THREE.MathUtils.clamp(cam.dist + look.zoom, 4, mode === 'store' ? 9 : 28);

  // Movement relative to the camera. While the stick is held in one
  // direction we keep the camera angle from when it was pushed, so the
  // character walks in a straight line while the camera swings round behind
  // (instead of circling). A new direction uses the current camera angle.
  const { x: mx, y: my } = input.move;
  const mag = Math.hypot(mx, my);
  if (mag > 0.05) {
    const sa = Math.atan2(mx, my);
    if (moveRef.stick === null || Math.abs(Math.atan2(Math.sin(sa - moveRef.stick), Math.cos(sa - moveRef.stick))) > 0.6) {
      moveRef.yaw = cam.yaw;
      moveRef.stick = sa;
    }
  } else moveRef.stick = null;
  if (manualCamT > 0) moveRef.yaw = cam.yaw; // the player is steering the view
  const p = me.root.position;
  if (riding === 3) {
    // On someone's back seat: ride along behind them, pedalling at their pace.
    const front = others.rootOf(tandemDriver);
    if (!front) tandemGone(tandemDriver);
    else {
      const ox = p.x, oz = p.z;
      const [sx, sz] = seatPosition(front, others.kindOf(tandemDriver), mySeat);
      p.set(sx, 0, sz);
      me.root.rotation.y = front.rotation.y;
      speed01 = THREE.MathUtils.lerp(speed01, Math.min(1, Math.hypot(p.x - ox, p.z - oz) / dt / BIKE), Math.min(1, dt * 5));
    }
  }
  if (seated && mag > 0.3) standUp();
  if (autoWalk && mag > 0.05) setAutoWalk(false); // the player took over
  const running = updateStamina(dt, input.run && !riding, mag > 0.05 && !seated);
  if (mag > 0.05 && !seated && riding !== 3) {
    walkedFor += dt;
    if (walkedFor > 0.8) dismissHelp();
    const inStore = mode === 'store';
    const speed = (riding === 4 ? CAR : riding ? BIKE : running ? (inStore ? STORE_RUN : RUN) : (inStore ? STORE_WALK : WALK)) * Math.min(1, mag);
    const fx = -Math.sin(moveRef.yaw), fz = -Math.cos(moveRef.yaw); // forward
    const rx = Math.cos(moveRef.yaw), rz = -Math.sin(moveRef.yaw); // right
    const dx = (fx * my + rx * mx) * speed * dt;
    const dz = (fz * my + rz * mx) * speed * dt;
    let [nx, nz] = activeCollision.move(p.x, p.z, dx, dz, PLAYER_R);
    if (riding === 4 && !onCarRoad(nx, nz)) {
      // Off the big road: slide along it if we can, else stop.
      if (onCarRoad(nx, p.z)) nz = p.z;
      else if (onCarRoad(p.x, nz)) nx = p.x;
      else { nx = p.x; nz = p.z; if (!carNoteT) { shop.toast(t('car.alley')); carNoteT = 4; } }
    }
    if (mode === 'street') {
      p.x = THREE.MathUtils.clamp(nx, bounds.minX - 50, bounds.maxX + 50);
      p.z = THREE.MathUtils.clamp(nz, bounds.minZ - 50, bounds.maxZ + 50);
    } else {
      const { w: rw, d: rd } = interior.room;
      p.x = THREE.MathUtils.clamp(nx, -rw / 2 + 0.5, rw / 2 - 0.5);
      p.z = THREE.MathUtils.clamp(nz, -rd / 2 + 0.5, rd / 2 - 0.5);
    }
    const targetRy = Math.atan2(dx, dz);
    let d = targetRy - me.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    me.root.rotation.y += d * Math.min(1, dt * 12);
    speed01 = THREE.MathUtils.lerp(speed01, Math.min(1, speed / (riding ? BIKE : inStore ? STORE_RUN : RUN)), Math.min(1, dt * 10));
  } else if (autoWalk && routePoly?.length > 1 && mode === 'street' && !seated && riding !== 3) {
    // Head for the route point about 2.5 m ahead (pure pursuit), on foot or by bike.
    let tx = routePoly[routePoly.length - 1][0], tz = routePoly[routePoly.length - 1][1];
    for (const [x, z] of routePoly) if (Math.hypot(x - p.x, z - p.z) > 2.5) { tx = x; tz = z; break; }
    const ddx = tx - p.x, ddz = tz - p.z, dl = Math.hypot(ddx, ddz) || 1;
    const running = updateStamina(dt, input.run && !riding, true);
    const speed = riding ? BIKE : running ? RUN : WALK;
    // Stuck on a wall corner? Side-step for a moment, then try again.
    let ux = ddx / dl, uz = ddz / dl;
    if (autoSide.t > 0) { autoSide.t -= dt; [ux, uz] = [ux * 0.3 - uz * autoSide.dir, uz * 0.3 + ux * autoSide.dir]; }
    const [nx, nz] = activeCollision.move(p.x, p.z, ux * speed * dt, uz * speed * dt, PLAYER_R);
    const progressed = Math.hypot(nx - p.x, nz - p.z) > speed * dt * 0.3;
    autoSide.stuck = progressed ? 0 : autoSide.stuck + dt;
    if (autoSide.stuck > 0.5) { autoSide.stuck = 0; autoSide.t = 0.7; autoSide.dir = -autoSide.dir || 1; routeTimer = 0; }
    p.x = nx; p.z = nz;
    let d = Math.atan2(ddx, ddz) - me.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    me.root.rotation.y += d * Math.min(1, dt * 8);
    speed01 = THREE.MathUtils.lerp(speed01, speed / (riding ? BIKE : RUN), Math.min(1, dt * 10));
  } else if (riding !== 3) {
    speed01 = THREE.MathUtils.lerp(speed01, 0, Math.min(1, dt * 10));
  }
  me.animate(dt, speed01 < 0.05 ? 0 : speed01, !!seated);

  // Third-person follow: while walking, the camera swings round behind the
  // character, so running sideways turns into running forward. Paused for a
  // moment after the player drags the view themselves.
  // Auto-walk and the tandem back seat follow too (nobody is steering).
  const carried = (autoWalk && speed01 > 0.05) || (riding === 3 && speed01 > 0.05);
  if ((mag > 0.05 || carried) && manualCamT <= 0 && !DEBUG_TOP) {
    const behind = me.root.rotation.y + Math.PI;
    let d = behind - cam.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    // Don't spin round when walking straight towards the camera.
    if (Math.abs(d) < 2.7 || carried) cam.yaw += d * Math.min(1, dt * (mode === 'store' ? 2 : 3.2));
  }

  // Camera follow.
  // Keep the camera out of buildings: walk back from the player and stop
  // just before the first wall.
  let horiz = Math.cos(cam.pitch) * cam.dist;
  if (mode === 'street') {
    const sy = Math.sin(cam.yaw), cy0 = Math.cos(cam.yaw);
    for (let d = 1; d <= horiz; d += 0.5) {
      if (collision.blocked(p.x + sy * d, p.z + cy0 * d, 0.3)) { horiz = Math.max(1.5, d - 0.6); break; }
    }
  }
  camHoriz += (horiz - camHoriz) * Math.min(1, dt * (horiz < camHoriz ? 20 : 4));
  const cx = p.x + Math.sin(cam.yaw) * camHoriz;
  const cz = p.z + Math.cos(cam.yaw) * camHoriz;
  // Lower the camera with the distance so a close camera doesn't look straight down.
  const cy = 1 + Math.sin(cam.pitch) * cam.dist * Math.min(1, camHoriz / (Math.cos(cam.pitch) * cam.dist));
  camera.position.lerp(tmp.set(cx, cy, cz), 1 - Math.exp(-dt * 12));
  camera.lookAt(p.x, hatDraft ? 0.05 : 1.1, p.z); // workshop: character sits above the panel
  if (DEBUG_TOP) {
    camera.position.set(p.x, DEBUG_TOP, p.z + DEBUG_TOP * 0.35);
    camera.lookAt(p.x, 0, p.z);
  }

  const tSec = timer.getElapsed();
  if (mode === 'street') {
    weather.update(dt, p.x, p.z);
    sun.position.set(p.x + 60, 120, p.z + 40);
    sun.target.position.set(p.x, 0, p.z);
    const z = zones.update(camera, p.x, p.z, tSec);
    if (z !== currentZone) {
      currentZone = z;
      updateZoneLine(z);
    }
    updateGuide(p, dt);
    net.update?.(p.x, p.z); // switch area cells as we walk
  }
  routeLine.update(dt);
  updateCarry();
  updateAction(p, tSec);
  if (mapView.open) mapView.draw();

  streetTimer -= dt;
  if (streetTimer <= 0 && mode === 'street') {
    streetTimer = 0.4;
    const s = nearestStreet(p.x, p.z);
    if (s !== currentStreet) {
      currentStreet = s;
      updateStreetCard();
    }
  }

  // Event-based sync: send only when our state changed (moving, turning,
  // slowing to a stop; a teleport or a newcomer forces a send), plus a slow
  // heartbeat when idle. Presence already tracks who is online, so the
  // heartbeat only re-confirms the last position. Realtime services bill per
  // message and receiver, so standing still should cost almost nothing.
  sendTimer -= dt;
  idleTimer -= dt;
  if (sendTimer <= 0) {
    const st = {
      x: Math.round(p.x * 100) / 100,
      z: Math.round(p.z * 100) / 100,
      ry: Math.round(me.root.rotation.y * 100) / 100,
      s: Math.round(speed01 * 100) / 100,
    };
    if (seated) st.sit = 1;
    if (riding) st.bk = riding;
    if (riding === 3) { st.on = tandemDriver; st.seat = mySeat; }
    const changed = !lastSent || st.x !== lastSent.x || st.z !== lastSent.z || st.ry !== lastSent.ry || st.s !== lastSent.s || st.sit !== lastSent.sit || st.bk !== lastSent.bk || st.on !== lastSent.on || st.seat !== lastSent.seat;
    if (changed || idleTimer <= 0) {
      net.sendState(st);
      lastSent = st;
      idleTimer = config.netIdleInterval;
    }
    sendTimer = 1 / (running ? config.netSendRateRun : config.netSendRate);
  }

  const w = innerWidth, h = innerHeight;
  others.update(dt, camera, w, h);
  if (mode === 'street') npcs.update(dt, camera, w, h);
  else if (clerk) { clerk.ch.animate(dt, 0); placeLabels(clerk, camera, w, h); }
  if (mode === 'store') interior.pets?.update(dt, me.root.position);
  tmp.set(p.x, 1.55, p.z).project(camera);
  const lx = (tmp.x * 0.5 + 0.5) * w, ly = (-tmp.y * 0.5 + 0.5) * h;
  myTag.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly}px)`;
  if (myLabel.bubble) myLabel.bubble.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly - 24}px)`;

  renderer.render(activeScene, camera);
});

updateStreetCard();

// Test hooks (only with ?debug in the URL).
if (new URLSearchParams(location.search).has('debug')) {
  window.__mk = {
    enter: (id) => enterStore(storefronts.get(id)),
    leave: () => leaveStore(),
    seats: () => interior?.seats?.length ?? 0,
    sit: (i) => sitDown(interior.seats[i]),
    seated: () => !!seated,
    decor: () => decor?.items.length ?? -1,
    bikes: () => bikeStations.items.map((b) => [b.x, b.z]),
    riding: () => riding,
    place: (x, z) => me.root.position.set(x, 0, z),
    look: () => currentLook,
    pets: () => interior?.pets?.list.map((p) => [p.name, p.state, +p.root.position.x.toFixed(2), +p.root.position.z.toFixed(2)]) ?? null,
    npcs: () => npcs.list.map((o) => [o.name, o.ch.root.position.x, o.ch.root.position.z]),
    peers: () => [...others.players.values()].map((p) => ({ name: p.name, ...p.target, x: p.ch.root.position.x, z: p.ch.root.position.z })),
    goto: (x, z, ry = 0) => moveMeTo(activeScene, x, z, ry),
    doorOf: (id) => { const it = storefronts.get(id); return [it.door.x, it.door.z, it.group.rotation.y]; },
    stores: () => storefronts.items.map((i) => i.store.id),
    zones: () => zones.items.map((i) => [i.zone.id, i.x, i.z]),
    me: () => [me.root.position.x, me.root.position.z, me.root.rotation.y, cam.yaw],
    blocked: (x, z) => collision.blocked(x, z, PLAYER_R),
    missions: () => daily.missions.map((m) => ({ ...m })),
    mission: (type, target) => missionEvent(type, target),
  };
}
