import * as THREE from 'three';
import {
  LANGUAGES, t, setLanguage, getSavedLanguage, getLanguage, onLanguageChange, localName,
} from './core/i18n.js';
import { REGION_NAMES } from './i18n/strings.js';
import { buildWorld, COLORS } from './core/world.js';
import { createCharacter } from './core/character.js';
import { createLookEditor } from './core/look-editor.js';
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
import { MapView } from './ui/map-view.js';
import { Music, Sfx } from './core/music.js';
import { RoadGraph, RouteLine } from './core/route.js';

const BASE = import.meta.env.BASE_URL;
const DEBUG_TOP = Number(new URLSearchParams(location.search).get('top')) || 0;
const $ = (id) => document.getElementById(id);

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

await new Promise((resolve) => {
  $('start-btn').onclick = resolve;
  // Note: a handler body, not an expression. Returning false from an
  // on-handler cancels the key, which blocked typing in this field.
  $('nickname').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.isComposing) resolve();
  };
});
const myLook = editor.getLook();
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

const nickname = ($('nickname').value.trim() || t('start.defaultName')).slice(0, 16);
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
    onJoin: (p) => { others.join(p); refreshOnline(); lastSent = null; },
    onLeave: (id) => { others.leave(id); refreshOnline(); },
    onState: (id, st) => others.state(id, st),
    onEmote: (id, e) => {
      const em = getEmote(e);
      if (em) others.emote(id, em.anim, em.emoji); // ignore unknown emotes
    },
    onLook: (id, look) => others.setLook(id, look),
    onChat: (id, raw) => {
      if (!config.chatEnabled) return;
      const text = cleanChat(raw);
      const name = text && others.chat(id, text);
      if (name) addChatLine(name, text);
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
  if (em.anim === 'wave') me.wave();
  showBubble(myLabel, $('labels'), em.emoji);
  net.sendEmote(em.id);
}
const petals = emoteList.map((em, i) => {
  const b = document.createElement('button');
  b.textContent = em.emoji;
  b.setAttribute('aria-label', em.id);
  // Fan out in a quarter circle above and to the left of the main button.
  const n = emoteList.length;
  const ang = Math.PI / 2 + (n > 1 ? (i / (n - 1)) : 0.5) * (Math.PI / 2);
  const r = 84;
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
function addChatLine(name, text, kind = '') {
  const line = document.createElement('div');
  line.className = 'chat-line ' + kind;
  const b = document.createElement('b');
  b.textContent = name;
  line.append(b, document.createTextNode(' ' + text));
  chatLog.append(line);
  while (chatLog.children.length > 6) chatLog.firstChild.remove();
  setTimeout(() => line.classList.add('old'), 15000);
}
function openChat() {
  chatBar.hidden = false;
  input.keys.clear();
  chatInput.focus();
  if (!chatNoticeShown) { chatNoticeShown = true; addChatLine('ℹ️', t('chat.notice'), 'note'); }
}
function closeChat() { chatBar.hidden = true; chatInput.blur(); }
$('chat-btn').hidden = !config.chatEnabled;
$('chat-btn').onclick = () => (chatBar.hidden ? openChat() : closeChat());
chatBar.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = cleanChat(chatInput.value);
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
function enterStore(item) {
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
  if (store.category === 'home') {
    goSolo(built.scene); // your home is private for now
    openHome(store, built);
  } else joinRoom(`${roomId}-${store.id}`, built.scene);
}

function leaveStore() {
  if (mode !== 'store') return;
  standUp();
  closeHome();
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
function setGuide(g) {
  guide = g;
  $('guide').hidden = mode !== 'street';
  routeTimer = 0; // draw the route on the next frame
  faceRoute = true; // and turn the camera to look along it
}
function clearGuide() {
  guide = null;
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
});
$('map-btn').onclick = () => {
  const pos = mode === 'street' ? me.root.position : interior.front.door;
  mapView.show(pos.x, pos.z);
};

// Action button (and E / Enter key).
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


// Home decorating: place furniture from a catalogue, then walk up to a piece
// to rotate, move or remove it. Saved in this browser only (for now).
const MAX_PIECES = 60;
let decor = null; // { home, built, items: [{ id, x, z, ry }], group, editing, piece }
const homeKey = (id) => 'mk.home.' + id;
function loadDecor(id) {
  try {
    const a = JSON.parse(localStorage.getItem(homeKey(id)) || '[]');
    return Array.isArray(a)
      ? a.filter((i) => furnitureById(i?.id) && [i.x, i.z, i.ry].every(Number.isFinite)).slice(0, MAX_PIECES)
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
  }
  const extra = decor.items.map(furnitureCollider).filter(Boolean);
  interior.collision = activeCollision = new CollisionMap(decor.built.colliders.concat(extra));
  interior.seats = decor.items.filter((it) => furnitureById(it.id).seat).map((it) => {
    const fx = Math.sin(it.ry), fz = Math.cos(it.ry);
    const out = furnitureById(it.id).size[1] / 2 + 0.55;
    return { x: it.x + fx * 0.05, z: it.z + fz * 0.05, ry: it.ry, stand: [it.x + fx * out, it.z + fz * out] };
  });
  saveDecor();
}
function openHome(store, built) {
  if (!built.decorGroup) { built.decorGroup = new THREE.Group(); built.scene.add(built.decorGroup); }
  decor = { home: store.id, built, items: loadDecor(store.id), group: built.decorGroup, editing: false, piece: null };
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
  action = null; // refresh the action button
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
function openPiece(it) {
  decor.piece = it;
  $('piece-name').textContent = furnitureById(it.id).emoji + ' ' + localName(furnitureById(it.id).name, getLanguage());
  $('piece-bar').hidden = false;
}
function closePiece() {
  if (decor) decor.piece = null;
  $('piece-bar').hidden = true;
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
  [decor.piece.x, decor.piece.z] = spotInFront();
  rebuildDecor();
  closePiece();
  action = null;
};
$('piece-remove').onclick = () => {
  if (!decor?.piece) return;
  decor.items.splice(decor.items.indexOf(decor.piece), 1);
  rebuildDecor();
  closePiece();
  action = null;
};
$('piece-close').onclick = closePiece;

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
  } else {
    const ex = interior.exit;
    const seat = !seated && nearestSeat(p);
    if (Math.hypot(p.x - ex.x, p.z - ex.z) < 1.6) {
      next = { key: 'exit', label: '🚪 ' + t(interior.store.category === 'home' ? 'home.leave' : 'shop.leave'), run: () => leaveStore() };
    } else if (decor?.editing) {
      // decorate mode: walk up to a piece to rotate, move or remove it
      const it = nearestPiece(p);
      if (it) next = { key: 'piece:' + decor.items.indexOf(it), label: '✋ ' + localName(furnitureById(it.id).name, getLanguage()), run: () => openPiece(it) };
      else closePiece();
    } else if (seated) {
      next = { key: 'stand', label: '🧍 ' + t('shop.stand'), run: () => standUp() };
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
onLanguageChange(() => { action = null; });

function updateGuide(p, dt) {
  if (!guide || mode !== 'street') return;
  const dx = guide.x - p.x, dz = guide.z - p.z;
  const dist = Math.hypot(dx, dz);
  // Re-plan the route along the streets from where we are now.
  routeTimer -= dt;
  if (routeTimer <= 0) {
    routeTimer = 0.5;
    const poly = roadGraph.route(p.x, p.z, guide.x, guide.z);
    routeLine.set(poly);
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
  if (dist < 6) {
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
  cam.yaw -= look.dx * 0.006;
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + look.dy * 0.004, 0.12, 1.25);
  cam.dist = THREE.MathUtils.clamp(cam.dist + look.zoom, 4, mode === 'store' ? 9 : 28);

  // Movement relative to camera.
  const { x: mx, y: my } = input.move;
  const mag = Math.hypot(mx, my);
  const p = me.root.position;
  if (seated && mag > 0.3) standUp();
  const running = updateStamina(dt, input.run, mag > 0.05 && !seated);
  if (mag > 0.05 && !seated) {
    walkedFor += dt;
    if (walkedFor > 0.8) dismissHelp();
    const inStore = mode === 'store';
    const speed = (running ? (inStore ? STORE_RUN : RUN) : (inStore ? STORE_WALK : WALK)) * Math.min(1, mag);
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw); // forward
    const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw); // right
    const dx = (fx * my + rx * mx) * speed * dt;
    const dz = (fz * my + rz * mx) * speed * dt;
    const [nx, nz] = activeCollision.move(p.x, p.z, dx, dz, PLAYER_R);
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
    speed01 = THREE.MathUtils.lerp(speed01, speed / (inStore ? STORE_RUN : RUN), Math.min(1, dt * 10));
  } else {
    speed01 = THREE.MathUtils.lerp(speed01, 0, Math.min(1, dt * 10));
  }
  me.animate(dt, speed01 < 0.05 ? 0 : speed01, !!seated);

  // Third-person follow: while walking, the camera swings round behind the
  // character, so running sideways turns into running forward. Paused for a
  // moment after the player drags the view themselves.
  if (mag > 0.05 && manualCamT <= 0 && !DEBUG_TOP) {
    const behind = me.root.rotation.y + Math.PI;
    let d = behind - cam.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    // Don't spin round when walking straight towards the camera.
    if (Math.abs(d) < 2.4) cam.yaw += d * Math.min(1, dt * (mode === 'store' ? 1.5 : 2.5));
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
  camera.lookAt(p.x, 1.1, p.z);
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
    const changed = !lastSent || st.x !== lastSent.x || st.z !== lastSent.z || st.ry !== lastSent.ry || st.s !== lastSent.s || st.sit !== lastSent.sit;
    if (changed || idleTimer <= 0) {
      net.sendState(st);
      lastSent = st;
      idleTimer = config.netIdleInterval;
    }
    sendTimer = 1 / (running ? config.netSendRateRun : config.netSendRate);
  }

  const w = innerWidth, h = innerHeight;
  others.update(dt, camera, w, h);
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
    peers: () => [...others.players.values()].map((p) => ({ name: p.name, ...p.target, x: p.ch.root.position.x, z: p.ch.root.position.z })),
    goto: (x, z, ry = 0) => moveMeTo(activeScene, x, z, ry),
    doorOf: (id) => { const it = storefronts.get(id); return [it.door.x, it.door.z, it.group.rotation.y]; },
    stores: () => storefronts.items.map((i) => i.store.id),
    zones: () => zones.items.map((i) => [i.zone.id, i.x, i.z]),
    me: () => [me.root.position.x, me.root.position.z, me.root.rotation.y, cam.yaw],
    blocked: (x, z) => collision.blocked(x, z, PLAYER_R),
  };
}
