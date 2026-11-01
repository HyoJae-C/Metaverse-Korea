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
import { createNet } from './net/index.js';
import { config } from './config.js';
import { getEmote, ownedPacks } from './data/emotes.js';
import { WeatherSystem } from './core/weather.js';

const BASE = import.meta.env.BASE_URL;
const DEBUG_TOP = Number(new URLSearchParams(location.search).get('top')) || 0;
const $ = (id) => document.getElementById(id);

// ---------- Start screen ----------
const regionsIndex = await fetch(`${BASE}regions/index.json`).then((r) => r.json());
const regionId = new URLSearchParams(location.search).get('region') || regionsIndex.default;
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
await new Promise((resolve) => {
  $('start-btn').onclick = resolve;
  $('nickname').onkeydown = (e) => e.key === 'Enter' && resolve();
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

const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 2000);

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
const me = createCharacter(myLook);
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

const cam = { yaw: me.root.rotation.y + Math.PI, pitch: 0.5, dist: 11 };
const PLAYER_R = 0.35;
const WALK = 4.2, RUN = 8;

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
$('lang-btn').onclick = () => {
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
$('help-ok').onclick = () => {
  $('help').hidden = true;
  try { localStorage.setItem('mk.helpSeen', '1'); } catch { /* ignore */ }
};
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
const others = new RemotePlayers(scene, $('labels'));
const refreshOnline = () => {
  const n = others.players.size + 1;
  $('online').hidden = n < 2;
  $('online').textContent = '🟢 ' + t('hud.online', { n });
};
onLanguageChange(refreshOnline);
let net = await createNet(config.netProvider, {
  onJoin: (p) => { others.join(p); refreshOnline(); },
  onLeave: (id) => { others.leave(id); refreshOnline(); },
  onState: (id, st) => others.state(id, st),
  onEmote: (id, e) => {
    const em = getEmote(e);
    if (em) others.emote(id, em.anim, em.emoji); // ignore unknown emotes
  },
}, config.net);
try {
  await net.connect({ room: regionId, self: { id: myId, name: nickname, look: myLook } });
} catch (err) {
  // Keep playing solo if the realtime service is unreachable.
  console.warn('Multiplayer unavailable:', err);
  net = { sendState() {}, sendEmote() {}, disconnect() {} };
}

const emoteBar = $('emotes');
for (const pack of ownedPacks()) {
  for (const em of pack.emotes) {
    const b = document.createElement('button');
    b.textContent = em.emoji;
    b.setAttribute('aria-label', em.id);
    b.onclick = () => {
      if (em.anim === 'wave') me.wave();
      showBubble(myLabel, $('labels'), em.emoji);
      net.sendEmote(em.id);
    };
    emoteBar.appendChild(b);
  }
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
let streetTimer = 0, sendTimer = 0, speed01 = 0;
const tmp = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  input.update();

  const look = input.consumeLook();
  cam.yaw -= look.dx * 0.006;
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + look.dy * 0.004, 0.12, 1.25);
  cam.dist = THREE.MathUtils.clamp(cam.dist + look.zoom, 4, 28);

  // Movement relative to camera.
  const { x: mx, y: my } = input.move;
  const mag = Math.hypot(mx, my);
  const p = me.root.position;
  if (mag > 0.05) {
    const speed = (input.run ? RUN : WALK) * Math.min(1, mag);
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw); // forward
    const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw); // right
    const dx = (fx * my + rx * mx) * speed * dt;
    const dz = (fz * my + rz * mx) * speed * dt;
    const [nx, nz] = collision.move(p.x, p.z, dx, dz, PLAYER_R);
    p.x = THREE.MathUtils.clamp(nx, bounds.minX - 50, bounds.maxX + 50);
    p.z = THREE.MathUtils.clamp(nz, bounds.minZ - 50, bounds.maxZ + 50);
    const targetRy = Math.atan2(dx, dz);
    let d = targetRy - me.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    me.root.rotation.y += d * Math.min(1, dt * 12);
    speed01 = THREE.MathUtils.lerp(speed01, speed / RUN, Math.min(1, dt * 10));
  } else {
    speed01 = THREE.MathUtils.lerp(speed01, 0, Math.min(1, dt * 10));
  }
  me.animate(dt, speed01 < 0.05 ? 0 : speed01);

  // Camera follow.
  const cx = p.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
  const cz = p.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
  const cy = 1 + Math.sin(cam.pitch) * cam.dist;
  camera.position.lerp(tmp.set(cx, cy, cz), 1 - Math.exp(-dt * 12));
  camera.lookAt(p.x, 1.1, p.z);
  if (DEBUG_TOP) {
    camera.position.set(p.x, DEBUG_TOP, p.z + DEBUG_TOP * 0.35);
    camera.lookAt(p.x, 0, p.z);
  }

  weather.update(dt, p.x, p.z);
  sun.position.set(p.x + 60, 120, p.z + 40);
  sun.target.position.set(p.x, 0, p.z);

  streetTimer -= dt;
  if (streetTimer <= 0) {
    streetTimer = 0.4;
    const s = nearestStreet(p.x, p.z);
    if (s !== currentStreet) {
      currentStreet = s;
      updateStreetCard();
    }
  }

  sendTimer -= dt;
  if (sendTimer <= 0) {
    sendTimer = 1 / config.netSendRate;
    net.sendState({
      x: Math.round(p.x * 100) / 100,
      z: Math.round(p.z * 100) / 100,
      ry: Math.round(me.root.rotation.y * 100) / 100,
      s: Math.round(speed01 * 100) / 100,
    });
  }

  const w = innerWidth, h = innerHeight;
  others.update(dt, camera, w, h);
  tmp.set(p.x, 1.55, p.z).project(camera);
  const lx = (tmp.x * 0.5 + 0.5) * w, ly = (-tmp.y * 0.5 + 0.5) * h;
  myTag.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly}px)`;
  if (myLabel.bubble) myLabel.bubble.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly - 24}px)`;

  renderer.render(scene, camera);
});

updateStreetCard();
