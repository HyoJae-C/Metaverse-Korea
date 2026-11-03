import * as THREE from 'three';
import { setBeat } from './core/model-pack.js';
import {
  LANGUAGES, t, setLanguage, getSavedLanguage, getLanguage, onLanguageChange, localName,
} from './core/i18n.js';
import { REGION_NAMES } from './i18n/strings.js';
import { loadRegionMap } from './core/districts.js';
import { SquareQuests, QUEST_REWARD } from './core/quests.js';
import { HighFives, hi5Msg, parseHi5, crowdBonus, TOGETHER_COINS, TOGETHER_RADIUS } from './core/together.js';
import { Billboard } from './core/billboard.js';
import { WallScreen, wallNear } from './core/wall-screen.js';
import { LocalBoard, SupabaseBoard } from './core/board.js';
import { makeNoticeBoard } from './core/notice-board-model.js';
import { useGoldCoins } from './ui/gold-coin.js';
useGoldCoins(); // 🪙 shows as a gold coin everywhere
import { BoardUI, BOARD_TEXT } from './ui/board-ui.js';
import { buildWorld, COLORS } from './core/world.js';
import { buildLandmarks } from './core/landmarks.js';
import { styleNameTag, EmblemCollection } from './core/emblems.js';
import { EmblemUI } from './ui/emblem-ui.js';
import { InfoUI, showInfoHint } from './ui/info-ui.js';
import { SaunaUI } from './ui/sauna-ui.js';
import { SaunaLog } from './core/sauna.js';
import { GymUI } from './ui/gym-ui.js';
import { GymLog } from './core/gym.js';
import { saveLastSpot, loadLastSpot, usableSpot } from './core/respawn.js';
import { BookUI } from './ui/book-ui.js';
import { AcademyUI } from './ui/academy-ui.js';
import { Academy } from './core/academy.js';
import { bookById } from './core/books.js';
import { FoodDex, isFood, allFoods } from './core/food-dex.js';
import { DexUI, DEX_TEXT } from './ui/dex-ui.js';
import { RIDES as PARK_RIDES, RIDE_COST, RIDE_SECONDS, seatAt } from './core/themepark.js';
import { createCharacter } from './core/character.js';
import { createLookEditor, saveLook } from './core/look-editor.js';
import { PALETTES, PATCHES, HAT_SHAPES, accessory } from './data/appearance.js';
import { CollisionMap, distSqToSeg } from './core/collision.js';
import { Input } from './core/input.js';
import { RemotePlayers, showBubble } from './core/players.js';
import { createAreaNet } from './net/area.js';
import { config } from './config.js';
import { getEmote, ownedPacks } from './data/emotes.js';
import { WeatherSystem, WET, weatherSpeed } from './core/weather.js';
import { Storefronts } from './core/storefronts.js';
import { Zones } from './core/zones.js';
import { buildInterior, productModel } from './core/interior.js';
import { isDining, coinPrice, takeoutKind, foodIcon, Meal, FOOD_BITES } from './core/dining.js';
import { FURNITURE, furnitureById, buildFurniture, furnitureCollider } from './core/furniture.js';
import { ShopUI, Cart } from './ui/shop-ui.js';
import { OrderUI } from './ui/order-ui.js';
import { GrillUI } from './ui/grill-ui.js';
import { RamenUI } from './ui/ramen-ui.js';
import { PochaUI, L, fmt } from './ui/pocha-ui.js';
import { Bag } from './core/bag.js';
import { BagUI, BAG_TEXT } from './ui/bag-ui.js';
import { KaraokeUI } from './ui/karaoke-ui.js';
import { PhotoUI } from './ui/photo-ui.js';
import { ClawUI } from './ui/claw-ui.js';
import { DuckUI } from './ui/duck-ui.js';
import { karaokeMsg, parseKaraoke } from './core/karaoke-game.js';
import { duckMsg, parseDuck } from './core/duck-boat.js';
import { pickDelivery, timeFor, deliveryPay } from './core/delivery.js';
import { BeautyUI } from './ui/beauty-ui.js';
import { KpopRoom } from './ui/kpop-room.js';
import { parseKpop } from './data/kpop.js';
import { FishingUI, FishMarketUI } from './ui/fishing-ui.js';
import { FishBag } from './core/fishing.js';
import { HELD_KINDS, COFFEE_SIPS } from './core/held.js';
import { Companion, PoopTimers, makePoop, CLEAN_SECONDS, FINE } from './core/companion.js';
import { CloudSave } from './core/cloud-save.js';
import { Inventory, ITEMS, redeemCode, parseTandem, tandemMsg } from './core/inventory.js';
import { SEATS, seatPosition } from './core/bikes.js';
import { MapView } from './ui/map-view.js';
import { Music, Sfx } from './core/music.js';
import { taxiFare } from './core/taxi.js';
import { Garage, BIKE_MODELS, bikeModel, repairCost, LOW as BIKE_LOW } from './core/bike-garage.js';
import { ClubMusic } from './core/club-music.js';
import { CLUB_TRACKS, CLUB_GENRES, songSeconds } from './data/club-tracks.js';
import { TRACKS } from './data/tracks.js';
import { BikeStations } from './core/bikes.js';
import { Wallet, demoAd } from './core/wallet.js';
import { Daily, REWARD } from './core/daily.js';
import { Safety, filterText } from './core/safety.js';
import { Pets } from './core/pets.js';
import { StreetNpcs, NAME_ROMAN, makeNpc, say, placeLabels, PHRASES } from './core/npcs.js';
import { RoadGraph, RouteLine } from './core/route.js';
import { cleanName, readIdentity, commitIdentity, saveIdentity, nameLocked, modelLocked, daysLeft, LOCK_DAYS } from './core/identity.js';
import { NavGrid, nearestOnPoly, trimPoly, pointAhead } from './core/nav-grid.js';

const BASE = import.meta.env.BASE_URL;
const DEBUG_TOP = Number(new URLSearchParams(location.search).get('top')) || 0;
const $ = (id) => document.getElementById(id);

// Safety net: if the player or the camera ever ends up at an invalid
// position (NaN), put them back at the last good one, and show a short note
// with the details so the cause can be found from a screenshot. Set up
// first so a failure while the world loads shows up too.
const lastGood = { x: 0, z: 0, yaw: 0, ok: false };
let errBox = null;
function reportProblem(msg) {
  console.error('[mk]', msg);
  if (!errBox) {
    errBox = document.createElement('div');
    errBox.className = 'err-box';
    document.body.append(errBox);
  }
  errBox.textContent = '⚠️ ' + String(msg).slice(0, 300);
  errBox.hidden = false;
  clearTimeout(errBox.t);
  errBox.t = setTimeout(() => { errBox.hidden = true; }, 15000);
}
addEventListener('error', (e) => reportProblem(`${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}:${e.colno}`));
addEventListener('unhandledrejection', (e) => reportProblem('promise: ' + (e.reason?.message || e.reason)));

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
// (One map file, or several districts joined into one city: core/districts.js.)
const mapPromise = loadRegionMap(region, (file) => fetch(`${BASE}regions/${regionId}/${file}`).then((r) => {
  if (!r.ok) throw Object.assign(new Error('no map'), { code: 'noMap' });
  return r.json();
}));

// Step 1: language → (guests: Google or guest?) → character + nickname.
// Name and character stay fixed for a while once chosen (core/identity.js).
let editor = null;
let identity = readIdentity();
const ID_TEXT = {
  model: { en: 'You can change your character in {n} day(s).', ko: '캐릭터는 {n}일 뒤에 바꿀 수 있어요.', ja: 'キャラクターは{n}日後に変更できます。', zh: '{n}天后才能更换角色。' },
  name: { en: 'You can change your name in {n} day(s).', ko: '이름은 {n}일 뒤에 바꿀 수 있어요.', ja: '名前は{n}日後に変更できます。', zh: '{n}天后才能改名。' },
  first: { en: 'Once you start, your name and character stay for {n} days.', ko: '시작하면 이름과 캐릭터는 {n}일 동안 바꿀 수 없어요.', ja: '始めると、名前とキャラクターは{n}日間変更できません。', zh: '开始后，名字和角色{n}天内不能更改。' },
};
const LOGIN_TEXT = {
  title: { en: 'Keep your progress?', ko: '기록을 저장할까요?', ja: '記録を保存しますか？', zh: '要保存进度吗？' },
  text: {
    en: 'Sign in with Google and your coins, items and home are saved to your account, so you can carry on from any device. As a guest, everything stays in this browser only and can be lost if you clear it or switch devices.',
    ko: '구글로 로그인하면 코인, 아이템, 내 집이 계정에 저장돼서 어떤 기기에서든 이어서 할 수 있어요. 게스트는 이 브라우저에만 저장돼서, 기록을 지우거나 기기를 바꾸면 사라질 수 있어요.',
    ja: 'Googleでログインすると、コイン・アイテム・家がアカウントに保存され、どの端末でも続きから遊べます。ゲストはこのブラウザだけに保存され、履歴を消したり端末を変えると消えることがあります。',
    zh: '用 Google 登录后，金币、物品和家会保存到账号，在任何设备上都能继续。游客只保存在这个浏览器里，清除记录或换设备可能会丢失。',
  },
  google: { en: 'Sign in with Google (saves)', ko: '구글로 로그인 (저장돼요)', ja: 'Googleでログイン（保存されます）', zh: '用 Google 登录（会保存）' },
  guest: { en: 'Play as a guest', ko: '게스트로 시작', ja: 'ゲストで始める', zh: '以游客身份开始' },
  note: { en: 'You can link Google later in ⚙️ Settings too.', ko: '나중에 ⚙️ 설정에서도 구글을 연결할 수 있어요.', ja: 'あとで ⚙️ 設定からもGoogleを連携できます。', zh: '之后也可以在 ⚙️ 设置里绑定 Google。' },
};
const askLogin = () => (cloud.status === 'cloud' && cloud.guest) || new URLSearchParams(location.search).has('login');
function showLook() {
  $('step-lang').hidden = true;
  $('step-login').hidden = true;
  $('step-look').hidden = false;
  const lockM = modelLocked(identity) ? identity.model : null;
  editor ||= createLookEditor({
    optionsEl: $('look-options'), canvas: $('look-preview'), randomBtn: $('look-random'), lockModel: lockM,
  });
  const notes = [];
  if (lockM) notes.push(fmt(L(ID_TEXT.model), { n: daysLeft(identity.modelAt) }));
  if (nameLocked(identity)) {
    $('nickname').value = identity.name;
    $('nickname').readOnly = true;
    notes.push(fmt(L(ID_TEXT.name), { n: daysLeft(identity.nameAt) }));
  }
  if (!notes.length) notes.push(fmt(L(ID_TEXT.first), { n: LOCK_DAYS }));
  $('look-lock').textContent = '🔒 ' + notes.join(' ');
  $('look-lock').hidden = false;
}
$('next-btn').onclick = () => {
  if (!askLogin()) { showLook(); return; }
  $('step-lang').hidden = true;
  $('step-login').hidden = false;
  $('login-title').textContent = L(LOGIN_TEXT.title);
  $('login-text').textContent = L(LOGIN_TEXT.text);
  $('login-google').textContent = 'G  ' + L(LOGIN_TEXT.google);
  $('login-guest').textContent = L(LOGIN_TEXT.guest);
  $('login-note').textContent = L(LOGIN_TEXT.note);
};
$('login-guest').onclick = showLook;
// Names: Hangul, English letters, numbers and spaces (checked while typing,
// after an IME has finished composing a syllable).
const NAME_HINT = { en: 'Korean or English letters and numbers only.', ko: '한글, 영어, 숫자만 쓸 수 있어요.', ja: '韓国語（ハングル）・英字・数字のみ使えます。', zh: '只能使用韩文、英文字母和数字。' };
const tidyName = (e) => {
  if (e?.isComposing) return;
  const el = $('nickname'), v = cleanName(el.value);
  if (v !== el.value) { el.value = v; $('look-lock').textContent = '✏️ ' + L(NAME_HINT); $('look-lock').hidden = false; }
};
$('nickname').addEventListener('input', tidyName);
$('nickname').addEventListener('compositionend', tidyName);
$('nickname').value = cleanName($('nickname').value);
$('login-google').onclick = async () => {
  // Progress on this device: link it to Google (same save). A fresh start:
  // sign in, which also finds an account used on another device.
  const fresh = !localStorage.getItem('mk.name') && !localStorage.getItem('mk.wallet');
  const err = fresh ? await cloud.signInGoogle() : await cloud.linkGoogle();
  if (err) $('login-note').textContent = t(err === 'taken' ? 'cloud.taken' : 'cloud.notReady');
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
// Locked name/character win over whatever the form says; a new choice
// starts its lock.
identity = commitIdentity(identity, { name: $('nickname').value, model: editor.getLook().model });
saveIdentity(identity);
let myLook = modelLocked(identity) ? { ...editor.getLook(), model: identity.model } : editor.getLook();
if (nameLocked(identity)) $('nickname').value = identity.name;
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

const nickname = filterText((cleanName($('nickname').value).trim() || t('start.defaultName')).slice(0, 16));
try {
  localStorage.setItem('mk.name', cleanName($('nickname').value).trim());
} catch { /* ignore */ }

// ---------- Renderer & scene ----------
const lowSpec = matchMedia('(pointer: coarse)').matches || navigator.hardwareConcurrency <= 4;
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !lowSpec, powerPreference: 'high-performance' }); // alpha: the K-POP café screen is a see-through hole
// iPhone Safari ignores user-scalable=no: stop pinch and double-tap zoom
// (fast taps on the fishing reel button zoomed the page in).
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
// Chrome with graphics acceleration turned off (or a GPU it has blocked)
// draws with a slow software renderer: say how to turn it back on.
const softwareGL = (() => {
  try {
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    return /swiftshader|llvmpipe|software|basic render/i.test(name) ? name : '';
  } catch { return ''; }
})();
if (softwareGL && !/[?&]debug\b/.test(location.search)) {
  setTimeout(() => showGpuHint(), 3000);
}
function showGpuHint() {
  const box = document.createElement('div');
  box.className = 'err-box gpu-hint';
  box.textContent = {
    ko: '🐢 그래픽 가속이 꺼져 있어 화면이 느리거나 안 보일 수 있어요. 크롬 설정 → 시스템 → "가능한 경우 그래픽 가속 사용"을 켜고 다시 시작해 주세요.',
    ja: '🐢 グラフィック アクセラレーションがオフです。Chrome の設定 → システム →「グラフィック アクセラレーションが使用可能な場合は使用する」をオンにして再起動してください。',
    zh: '🐢 图形加速已关闭，画面可能很慢或不显示。请在 Chrome 设置 → 系统 → 打开“使用图形加速功能”后重新启动。',
  }[getLanguage()] || '🐢 Graphics acceleration is off, so the game may be slow or blank. In Chrome, open Settings → System → turn on "Use graphics acceleration when available", then relaunch.';
  document.body.append(box);
  setTimeout(() => box.remove(), 20000);
}
// The graphics card can drop the page (driver reset, too many tabs): let it
// come back instead of leaving a blank screen.
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); reportProblem('graphics context lost — reload the page if it stays blank'); });
canvas.addEventListener('webglcontextrestored', () => { if (errBox) errBox.hidden = true; });
renderer.setPixelRatio(Math.min(devicePixelRatio, lowSpec || softwareGL ? 1 : 2));
renderer.shadowMap.enabled = !lowSpec && !softwareGL;
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
sun.castShadow = !lowSpec && !softwareGL;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

const collision = new CollisionMap(map.buildings.concat(map.blockers || [])); // blockers: rivers, walls
const { bounds } = buildWorld(map, scene, { lowSpec: lowSpec || !!softwareGL, collision });
buildLandmarks(map.landmarks, scene); // palace gates, halls, statues (hand-made districts)
const storeData = [...((await storesPromise)?.stores || []), ...((await homesPromise)?.homes || [])];
const zoneData = (await zonesPromise)?.zones || [];
const storefronts = new Storefronts(scene, storeData, map, region.center, collision);
const zones = new Zones(scene, zoneData, map, region.center, collision);
const roadGraph = new RoadGraph(map.roads);
// Walking routes around walls (built the first time a route is needed).
let navGrid = null;
const nav = () => (navGrid ||= new NavGrid(collision.polys.map((q) => q.p), map.roads, bounds, { r: PLAYER_R + 0.1 }));
function planRoute(ax, az, bx, bz) {
  const poly = nav().route(ax, az, bx, bz) || roadGraph.route(ax, az, bx, bz);
  if (poly.length < 2) poly.push([bx, bz]);
  return poly;
}
const routeLine = new RouteLine(scene);
const bikeStations = new BikeStations(scene, (await bikesPromise)?.stations || [], region.center, roadGraph, findFreeSpot);
// Passers-by: two strolling around each meeting zone.
const npcs = new StreetNpcs(scene, $('labels'), roadGraph, zones.items.map((z) => [z.x, z.z]));

// The main square (the first meeting zone): a guide who hands out errands
// that end back here (광장 미션), and a big screen (전광판) for ads.
const quests = new SquareQuests();
const square = zones.items[0] || null;
let squareNpc = null, billboard = null;
// Big screens on building walls (region.json "screens").
const wallScreens = [];
for (const sc of region.screens || []) {
  const wall = wallNear(map.buildings, sc.at[0], sc.at[1]);
  if (!wall) continue;
  const w = Math.min(sc.w || 20, wall.len - 2), h = w / 2; // the canvas is 2:1
  const y = Math.min(sc.y ?? 10, Math.max(3, wall.h - h - 2));
  const ws = new WallScreen({ w, h });
  ws.mount(wall, y, h);
  scene.add(ws.root);
  wallScreens.push(ws);
}
if (square) {
  const face = (x, z) => Math.atan2(square.x - x, square.z - z);
  squareNpc = makeNpc($('labels'), '❗ ' + t('quest.guide'));
  const [gx, gz] = findFreeSpot(square.x + 2.4, square.z + 1.6);
  squareNpc.ch.root.position.set(gx, 0, gz);
  squareNpc.ch.root.rotation.y = face(gx, gz);
  scene.add(squareNpc.ch.root);
  const lang = getLanguage();
  billboard = new Billboard(storeData.filter((s) => s.category !== 'home').map((s) => ({
    title: s.name.ko, sub: localName(s.tagline || {}, lang), bg: s.colors.sign, tag: t('quest.adTag'),
  })));
  // Raised decks (the station) you can walk under, but a tall screen can't
  // stand there.
  const overhead = new CollisionMap(map.buildings.filter((b) => b.m > 2).map((b) => ({ ...b, m: 0 })));
  // Find a spot where the whole screen (9.5 m wide) stands clear of
  // buildings, facing the square: nearest first, starting from the old spot.
  const fits = (x, z, ry) => {
    const ax = Math.cos(ry), az = -Math.sin(ry); // along the screen
    const nx = Math.sin(ry), nz = Math.cos(ry); // its facing
    for (let u = -5.4; u <= 5.4; u += 0.6) for (const v of [-0.8, 0.8]) {
      if (collision.blocked(x + ax * u + nx * v, z + az * u + nz * v, 0.3) || overhead.blocked(x + ax * u + nx * v, z + az * u + nz * v, 0.8)) return false;
    }
    return true;
  };
  let spot = null;
  for (const r of [9, 11, 13, 15, 18, 22]) {
    for (let k = 0; k < 32 && !spot; k++) {
      const a = Math.atan2(-7, -7) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 16);
      const x = square.x + Math.sin(a) * r, z = square.z + Math.cos(a) * r;
      if (fits(x, z, face(x, z))) spot = [x, z];
    }
    if (spot) break;
  }
  const [bx, bz] = spot || findFreeSpot(square.x - 7, square.z - 7);
  billboard.root.position.set(bx, 0, bz);
  billboard.root.rotation.y = face(bx, bz);
  scene.add(billboard.root);
  // Paving blocks (보도블럭) on the square, under the roads.
  const pc = document.createElement('canvas');
  pc.width = pc.height = 256;
  const pg = pc.getContext('2d');
  pg.fillStyle = '#b9b1a4'; pg.fillRect(0, 0, 256, 256); // joints
  const tones = ['#ddd5c7', '#d3cabb', '#e4ddd0', '#cfc6b6', '#d8cfc0'];
  for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
    const x = col * 64 + (row % 2) * 32, y = row * 32;
    pg.fillStyle = tones[(row * 7 + col * 3 + 15) % tones.length];
    pg.fillRect(x + 2, y + 2, 60, 28);
  }
  const pt = new THREE.CanvasTexture(pc);
  pt.colorSpace = THREE.SRGBColorSpace;
  pt.wrapS = pt.wrapT = THREE.RepeatWrapping;
  // The square's own shape (zones.json "pave": a rounded rectangle w x l,
  // turned ry), or a circle.
  const pv = square.zone.pave;
  let paveGeo;
  if (pv) {
    const hw = pv.w / 2, hl = pv.l / 2, cr = Math.min(6, hw / 2);
    const sh = new THREE.Shape();
    sh.moveTo(-hw + cr, -hl);
    sh.lineTo(hw - cr, -hl); sh.quadraticCurveTo(hw, -hl, hw, -hl + cr);
    sh.lineTo(hw, hl - cr); sh.quadraticCurveTo(hw, hl, hw - cr, hl);
    sh.lineTo(-hw + cr, hl); sh.quadraticCurveTo(-hw, hl, -hw, hl - cr);
    sh.lineTo(-hw, -hl + cr); sh.quadraticCurveTo(-hw, -hl, -hw + cr, -hl);
    paveGeo = new THREE.ShapeGeometry(sh, 6).rotateX(-Math.PI / 2);
    pt.repeat.set(1 / 2, 1 / 2); // ShapeGeometry UVs are in metres: a block is about 0.4 m
  } else {
    const PAVE_R = 24;
    paveGeo = new THREE.CircleGeometry(PAVE_R, 48).rotateX(-Math.PI / 2);
    pt.repeat.set(PAVE_R / 2, PAVE_R / 2);
  }
  const pave = new THREE.Mesh(paveGeo, new THREE.MeshLambertMaterial({ map: pt }));
  pave.position.set(square.x, 0.016, square.z);
  if (pv) pave.rotation.y = pv.ry || 0;
  pave.receiveShadow = true;
  scene.add(pave);
}
// Two notice boards side by side at one end of the square, facing it.
const noticeBoards = [];
if (square) {
  const ry = square.zone.pave?.ry || 0;
  const ax = Math.sin(ry), az = Math.cos(ry), nx = az, nz = -ax; // along / across the square
  const far = square.zone.pave ? square.zone.pave.l / 4 : 10;
  for (const [board, side, color] of [['free', -1.7, '#2f6fd6'], ['ask', 1.7, '#d8452f']]) {
    const x = square.x + ax * far + nx * side, z = square.z + az * far + nz * side;
    const m = makeNoticeBoard(BOARD_TEXT[board].ko, color); // signs in Korean, like the shop signs
    m.position.set(x, 0, z);
    m.rotation.y = Math.atan2(-ax, -az);
    scene.add(m);
    noticeBoards.push({ board, x: x - ax * 1.2, z: z - az * 1.2 }); // stand in front of it
  }
}

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

// Come back where you left off last time, if that spot is still open.
{
  const last = loadLastSpot();
  if (usableSpot(last, bounds, (x, z) => collision.blocked(x, z, 0.4))) {
    me.root.position.set(last.x, 0, last.z);
    me.root.rotation.y = last.ry;
  }
}
let lastSpotTimer = 3;
const rememberSpot = () => {
  try { if (mode === 'street') saveLastSpot(me.root.position.x, me.root.position.z, me.root.rotation.y); } catch { /* still starting up */ }
};
document.addEventListener('visibilitychange', () => { if (document.hidden) rememberSpot(); });
addEventListener('pagehide', rememberSpot);

const cam = { yaw: me.root.rotation.y + Math.PI, pitch: 0.42, dist: 9 };
let camHoriz = 8; // current camera distance (shortened near walls)
let manualCamT = 0; // seconds left before the camera starts following again
const PLAYER_R = 0.35;
// Street speeds are a bit faster than real life so the area feels compact;
// shops are small rooms, so walking there stays slower.
const WALK = 6.5, RUN = 12;
const gymLog = new GymLog(); // workouts make walking and running a touch faster (max +3%)
const BIKE = 13.5; // the basic bike (and the tandem): a little faster than running, no stamina
const CAR = 26; // car: big roads only
const MOTO = 24; // motorbike (from a developer code)
// My bikes (core/bike-garage.js): faster models from the bike shop; they wear out slowly.
const garage = new Garage();
const rideSpeed = () => (riding === 4 ? CAR : riding === 5 ? MOTO : riding === 1 ? garage.speed() : BIKE);
const STORE_WALK = 4.2, STORE_RUN = 7;

const myTag = document.createElement('div');
myTag.className = 'nametag me';
styleNameTag(myTag, nickname, myLook);
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
// K-POP café room sync (see enterKpopCafe).
// The video sits on the café's wall screen, behind the canvas (see
// placeKpopVideo).
const kpopLayer = document.createElement('div');
kpopLayer.className = 'kpop-layer';
kpopLayer.hidden = true;
const kpopVideo = document.createElement('div');
kpopVideo.className = 'kpop-video';
kpopLayer.append(kpopVideo);
document.getElementById('scene').before(kpopLayer); // behind the canvas
const kpop = new KpopRoom({ video: kpopVideo, tv: $('kpop-tv'), panel: $('kpop-panel'), send: (m) => net.sendEmote(m), toast: (x) => shop.toast(x) });
$('kpop-tv').querySelector('.kpop-unmute').onclick = () => kpop.unmute();
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
      others.join({ ...p, name: filterText(cleanName(p.name).trim() || '?') });
      if (safety.isBlocked(p.id, others.nameOf(p.id))) others.hide(p.id);
      refreshOnline(); lastSent = null;
      kpop.onPeerJoin(); // catch them up on the song playing in the K-POP café
    },
    onLeave: (id) => { tandemGone(id); others.leave(id); refreshOnline(); },
    onState: (id, st) => others.state(id, st),
    onEmote: (id, e) => {
      if (parseTandem(e)) { onTandemMsg(id, parseTandem(e)); return; }
      if (parseKpop(e)) { kpop.onMsg(parseKpop(e)); return; }
      if (parseKaraoke(e) != null) { karaokeUi.addScore(others.nameOf(id) || '?', parseKaraoke(e)); return; }
      if (parseDuck(e)) { const d = parseDuck(e); if (d.to === myId) duckUi.heard(id, d.strokes); return; }
      if (parseHi5(e)) { if (parseHi5(e) === myId && !safety.isBlocked(id, others.nameOf(id))) onHi5(id); return; }
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
  if (onSquare()) missionEvent('squareEmote');
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
// Food dex: every food you buy is recorded (see core/food-dex.js).
const foodDex = new FoodDex();
function recordFood(store, product, quiet = false) {
  if (!isFood(store, product)) return false;
  const isNew = foodDex.add(store, product);
  const all = allFoods(storeData).length;
  if (!quiet) shop.toast(isNew ? `📖 ${L(DEX_NEW)} ${localName(product.name, getLanguage())} (${foodDex.kinds}/${all})` : `${t('shop.added')} · 🍽️ ${foodDex.kinds}/${all}`);
  refreshDexBtn();
  return true;
}
const DEX_NEW = { en: 'New in your food dex!', ko: '도감 등록!', ja: '図鑑に登録！', zh: '图鉴新登记！' };
const shop = new ShopUI({
  cart,
  onTryOn: (product) => {
    setLook({ ...currentLook, ...product.tryOn });
    $('revert-look').hidden = false;
    shop.toast(t('shop.tried'));
  },
  onExit: () => leaveStore(),
  onAdd: (product) => recordFood(shop.store, product),
  onAdopt: (product) => adoptPet(product.adopt),
  owns: (id) => inventory.has(id),
  hasUmbrella: () => hasUmbrella(),
  onUmbrella: (product) => buyUmbrella(product),
  onTake: (product) => {
    if (held && !confirm(t('coffee.replace'))) return;
    setHeld({ kind: 'coffee', sips: COFFEE_SIPS, name: localName(product.name, 'en') });
    recordFood(shop.store, product, true);
    clerk && say(clerk, $('labels'), ['맛있게 드세요!', 'masitge deuseyo!', t('coffee.enjoy')]);
    shop.toast(t('coffee.got', { name: localName(product.name, getLanguage()) }));
  },
});

// My pet: adopt at the pet shop (coins) or by code, then take it for walks.
// It poops now and then on the street; clean up within CLEAN_SECONDS or a
// fine notice (과태료) takes FINE coins. The poop is then cleared by the city.
const PET_KEY = 'mk.pet';
let pet = null; // Companion
const poopTimers = new PoopTimers();
const poops = new Map(); // id -> { id, mesh, x, z }
function setPet(id) {
  pet?.dispose();
  pet = null;
  if (id && inventory.has(id) && ITEMS[id]?.pet) {
    pet = new Companion(id, ITEMS[id].pet);
    activeScene.add(pet.root);
    pet.place(me.root.position.x, me.root.position.z, me.root.rotation.y);
  }
  try { if (pet) localStorage.setItem(PET_KEY, id); else localStorage.removeItem(PET_KEY); } catch { /* storage blocked */ }
  refreshQuestChip();
  if (!$('wallet-panel').hidden || !$('bag-panel').hidden) refreshItems();
}
function adoptPet(id) {
  const it = ITEMS[id];
  if (!it?.pet || !it.price) return;
  if (inventory.has(id)) { setPet(id); return; }
  if (!wallet.spend(it.price)) { shop.toast(t('pet.noCoins', { n: it.price - wallet.coins })); return; }
  inventory.add(id);
  setPet(id);
  shop.closeProduct();
  clerk && say(clerk, $('labels'), ['잘 키워 주세요!', 'jal kiwo juseyo!', t('pet.takeCare')]);
  shop.toast(t('pet.adopted', { name: petName(it.pet) }));
}
// Korean subject particle after a name: 이 after a final consonant, else 가.
const subjectParticle = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이' : '가'; };
const petName = (def) => (getLanguage() === 'ko' ? def.name : `${def.rom} (${def.name})`);
function nearestPoop(p) {
  let best = null, bd = 1.6;
  for (const po of poops.values()) {
    const d = Math.hypot(po.x - p.x, po.z - p.z);
    if (d < bd) { bd = d; best = po; }
  }
  return best;
}
function cleanPoop(po) {
  poopTimers.clean(po.id);
  po.mesh.removeFromParent();
  poops.delete(po.id);
  me.play('bow'); // bend down
  shop.toast(t('pet.cleaned'));
  action = STALE;
}
function updatePet(dt, p) {
  // Fines for poop left too long (the timer runs even inside shops).
  for (const late of poopTimers.step(dt)) {
    const po = poops.get(late.id);
    po?.mesh.removeFromParent();
    poops.delete(late.id);
    const taken = wallet.take(FINE);
    showFine(taken, po?.street);
  }
  const soon = poopTimers.list.reduce((m, x) => Math.min(m, x.left), Infinity);
  $('poop-chip').hidden = soon === Infinity;
  if (soon !== Infinity) $('poop-chip').textContent = `💩 ${t('pet.cleanIn', { s: Math.ceil(soon) })}`;
  if (!pet) return;
  if (pet.root.parent !== activeScene) { activeScene.add(pet.root); pet.place(p.x, p.z, me.root.rotation.y); }
  const hidden = riding > 0 || seated;
  if (pet.update(dt, { x: p.x, z: p.z, ry: me.root.rotation.y }, hidden, mode === 'street')) {
    const pos = pet.root.position;
    const mesh = makePoop();
    mesh.position.set(pos.x, 0, pos.z);
    scene.add(mesh);
    const { id } = poopTimers.add();
    poops.set(id, { id, mesh, x: pos.x, z: pos.z, street: $('street-name')?.textContent || '' });
    sfx.pop?.();
    shop.toast(t('pet.pooped', { name: petName(pet.def), ga: subjectParticle(pet.def.name), s: CLEAN_SECONDS }));
  }
}
let fineShown = null; // { count, taken } while the notice is open (two fines at once add up)
function showFine(taken, street) {
  const box = $('fine-panel');
  fineShown = box.hidden || !fineShown ? { count: 1, taken } : { count: fineShown.count + 1, taken: fineShown.taken + taken };
  $('fine-street').textContent = street || t('pet.fineStreet');
  $('fine-amount').textContent = `🪙 ${FINE}` + (fineShown.count > 1 ? ` × ${fineShown.count}` : '');
  $('fine-paid').textContent = t('pet.finePaid', { n: fineShown.taken, left: wallet.coins });
  box.hidden = false;
  refreshWallet();
}
$('fine-close').onclick = () => { $('fine-panel').hidden = true; };

// Something in my hand (a META COFFEE cup): tap Drink to sip; the cup is gone
// when it's finished. Saved, so a half-drunk coffee survives a reload.
// The quest chip can be folded down to its icon (tap it).
const QUEST_FOLD_KEY = 'mk.questFold';
let questFolded = (() => { try { return localStorage.getItem(QUEST_FOLD_KEY) === '1'; } catch { return false; } })();
// Restaurant texts (see the restaurant section below).
const DINE_TEXT = {
  menu: { en: 'Menu', ko: '메뉴판', ja: 'メニュー', zh: '菜单' },
  note: { en: 'Order here and your food comes to the table. Paid in coins: 1 coin per ₩1,000.', ko: '여기서 주문하면 음식이 식탁으로 나와요. 결제는 코인으로, 1,000원당 1코인이에요.', ja: 'ここで注文すると料理がテーブルに届きます。お支払いはコインで、1,000ウォンにつき1コイン。', zh: '在这里点餐，菜会送到桌上。用硬币支付，每1,000韩元1枚。' },
  here: { en: 'Eat here', ko: '먹고 가기', ja: '店内で', zh: '堂食' },
  togo: { en: 'To go', ko: '포장', ja: '持ち帰り', zh: '打包' },
  ordered: { en: 'Ordered {name}! It will be right out.', ko: '{name} 주문 완료! 곧 나와요.', ja: '{name}を注文しました！すぐお持ちします。', zh: '已点{name}！马上就好。' },
  served: { en: 'Your {name} is here. Enjoy!', ko: '{name} 나왔습니다. 맛있게 드세요!', ja: '{name}お待たせしました。どうぞ！', zh: '您的{name}来了，请慢用！' },
  waiting: { en: 'Cooking…', ko: '조리 중…', ja: '調理中…', zh: '烹饪中…' },
  eat: { en: 'Eat', ko: '먹기', ja: '食べる', zh: '吃' },
  bite: { en: 'Yum! {n} bites left', ko: '냠냠! {n}입 남았어요', ja: 'もぐもぐ！あと{n}口', zh: '好吃！还剩{n}口' },
  finished: { en: 'All gone. That was good!', ko: '다 먹었어요. 잘 먹었습니다!', ja: '完食！ごちそうさまでした！', zh: '吃完了，真好吃！' },
  packed: { en: '{name} packed to go. Tap 🥡 to eat.', ko: '{name} 포장 완료! 🥡를 눌러 먹어요.', ja: '{name}を持ち帰りにしました。🥡で食べられます。', zh: '{name}已打包，点🥡就能吃。' },
  poor: { en: 'Not enough coins ({n} needed)', ko: '코인이 부족해요 ({n}코인 필요)', ja: 'コインが足りません（{n}枚必要）', zh: '硬币不够（需要{n}枚）' },
  busy: { en: 'Finish the dish on your table first.', ko: '식탁의 음식을 먼저 다 드세요.', ja: 'まずテーブルの料理を食べ終えてね。', zh: '先把桌上的菜吃完吧。' },
  boxDesc: { en: 'Takeout box · {n} bites left', ko: '포장 음식 · {n}입 남음', ja: '持ち帰り · あと{n}口', zh: '外带餐盒 · 还剩{n}口' },
};
const HELD_KEY = 'mk.held';
// The bag (core/bag.js): books, drinks and the umbrella you carry but don't
// hold in your hand. 20 slots for now.
const bag = new Bag(localStorage, { isBook: (id) => !!bookById(id), maxSips: COFFEE_SIPS });
let held = (() => {
  try {
    const h = JSON.parse(localStorage.getItem(HELD_KEY) || 'null');
    if (h?.kind === 'book') return bookById(h.book) ? { kind: 'book', book: h.book } : null;
    return h && HELD_KINDS.includes(h.kind) && h.sips > 0 ? { kind: h.kind, sips: Math.min(COFFEE_SIPS, h.sips | 0), name: String(h.name || '').slice(0, 40) } : null;
  } catch { return null; }
})();
// A fishing rod while the fishing panel is open shows instead of the cup.
let rodOut = false;
const heldKind = () => (rodOut ? 'rod' : held?.kind || null);
function setHeld(h) {
  held = h;
  try { if (h) localStorage.setItem(HELD_KEY, JSON.stringify(h)); else localStorage.removeItem(HELD_KEY); } catch { /* storage blocked */ }
  me.setHeld(heldKind());
  $('drink-btn').hidden = !h;
  $('stow-btn').hidden = !h;
  $('drink-btn').querySelector('span').textContent = h?.kind === 'book' ? '📖' : h?.kind === 'food' ? '🥡' : '☕';
  $('drink-btn').querySelector('small').textContent = h?.kind === 'food' ? L(DINE_TEXT.eat) : t(h?.kind === 'book' ? 'book.read' : 'coffee.drink');
  lastSent = null; // others see it on the next update
  refreshQuestChip();
}
function drink() {
  if (!held) return;
  if (held.kind === 'book') { // read it, sitting down
    if (seated) bookUi.read(held.book);
    else shop.toast(t('book.sitToRead'));
    return;
  }
  me.play('clap'); // the "use item" move: lift the cup
  sfx.pop?.();
  const sips = held.sips - 1;
  const food = held.kind === 'food';
  if (sips <= 0) { setHeld(null); shop.toast(food ? L(DINE_TEXT.finished) : t('coffee.finished')); }
  else { setHeld({ ...held, sips }); shop.toast(food ? fmt(L(DINE_TEXT.bite), { n: sips }) : t('coffee.sip', { n: sips })); }
}
$('drink-btn').onclick = drink;

// Umbrella (from the convenience store): opens by itself outdoors on foot
// when it rains or snows. Rain and snow slow walking and cycling a little;
// the umbrella keeps most of that off on foot.
const UMB_KEY = 'mk.umbrella';
// The umbrella lives in the bag (it used to be a flag of its own: move it in).
try {
  if (localStorage.getItem(UMB_KEY)) { bag.add({ kind: 'umbrella' }); localStorage.removeItem(UMB_KEY); }
} catch { /* storage blocked */ }
const hasUmbrella = () => bag.has('umbrella');
const umbrellaOpen = () => hasUmbrella() && mode === 'street' && !riding && !seated && WET.has(weather.kind);
const wxSpeed = () => (mode !== 'street' || riding === 4 ? 1 : weatherSpeed(weather.kind, { bike: !!riding, umbrella: umbrellaOpen() }));
const UMB_TEXT = {
  bought: { en: 'Got an umbrella! It opens by itself when it rains or snows. ☂️', ko: '우산을 샀어요! 비나 눈이 오면 저절로 펴져요. ☂️', ja: '傘を買いました！雨や雪の日は自動で開きます。☂️', zh: '买到雨伞了！下雨或下雪时会自动撑开。☂️' },
};
function buyUmbrella(product) {
  if (hasUmbrella()) return;
  if (bag.full) { shop.toast(fmt(L(BAG_TEXT.full), { cap: bag.cap })); return; }
  const cost = product.coins || 5;
  if (!wallet.spend(cost)) { shop.toast(t('pet.noCoins', { n: cost - wallet.coins })); return; }
  bag.add({ kind: 'umbrella' });
  refreshWallet();
  shop.toast(L(UMB_TEXT.bought));
  shop.openProduct(product); // the button now says you have one
}
if (held) setHeld(held);

// Put what's in my hand into the bag, and take things back out.
const UMB_DESC = { en: 'Opens by itself outdoors when it rains or snows.', ko: '밖에서 비나 눈이 오면 저절로 펴져요.', ja: '外で雨や雪が降ると自動で開きます。', zh: '在外面下雨或下雪时会自动撑开。' };
const UMB_NAME = { en: 'Umbrella', ko: '우산', ja: '傘', zh: '雨伞' };
const BOOK_DESC = { en: 'Hold it and sit down to read.', ko: '손에 들고 앉으면 읽을 수 있어요.', ja: '手に持って座ると読めます。', zh: '拿在手上坐下就能读。' };
const DRINK_DESC = { en: '{n} sips left.', ko: '{n}모금 남았어요.', ja: '残り{n}口。', zh: '还剩{n}口。' };
function describeEntry(e) {
  if (e.kind === 'umbrella') return { emoji: '☂️', name: L(UMB_NAME), desc: L(UMB_DESC), canHold: false };
  if (e.kind === 'book') {
    const b = bookById(e.book);
    return { emoji: b?.icon || '📖', name: b ? localName(b.title, getLanguage()) : e.book, desc: L(BOOK_DESC), canHold: true };
  }
  if (e.kind === 'food') return { emoji: '🥡', name: e.name || 'Takeout', desc: fmt(L(DINE_TEXT.boxDesc), { n: e.sips }), canHold: true };
  return { emoji: '☕', name: e.name || 'Coffee', desc: fmt(L(DRINK_DESC), { n: e.sips }), canHold: true };
}
function stowHeld() {
  if (!held) return;
  if (!bag.add(held)) { shop.toast(fmt(L(BAG_TEXT.full), { cap: bag.cap })); return; }
  setHeld(null);
  sfx.pop?.();
  shop.toast(fmt(L(BAG_TEXT.stored), { n: bag.size, cap: bag.cap }));
}
$('stow-btn').onclick = stowHeld;
$('stow-btn').querySelector('small').textContent = L(BAG_TEXT.put);
const bagUi = new BagUI({
  root: $('bag-panel'),
  bag,
  describe: describeEntry,
  holding: () => !!held,
  onHold: (i) => {
    const e = held ? bag.swap(i, held) : bag.take(i);
    if (e) setHeld(e);
  },
  onDrop: (i) => bag.take(i),
  extra: () => {
    refreshItems();
    $('wallet-items-title').querySelector('.bag-owned').textContent = L(BAG_TEXT.owned);
    return [$('wallet-items-title'), $('wallet-items')];
  },
});
$('bag-btn').onclick = () => { if ($('bag-panel').hidden) bagUi.show(); else bagUi.hide(); };
$('bag-btn').querySelector('small').textContent = L(BAG_TEXT.title);
onLanguageChange(() => {
  $('stow-btn').querySelector('small').textContent = L(BAG_TEXT.put);
  $('bag-btn').querySelector('small').textContent = L(BAG_TEXT.title);
});

function setLook(look) {
  currentLook = look;
  styleNameTag(myTag, nickname, look);
  const old = me.root;
  me = createCharacter(look);
  me.root.position.copy(old.position);
  me.root.rotation.copy(old.rotation);
  me.setBike(riding, riding === 1 ? garage.current.color : undefined);
  me.setHeld(heldKind());
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
  me.setBike(kind, kind === 1 ? garage.current.color : undefined);
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
    const ok = (riding === 2 || riding === 4 || riding === 5) && seat < seatsOf(riding) && !passengers.has(seat) && ![...passengers.values()].includes(from);
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
  { kind: 5, emoji: '🏍️', label: 'ride.moto', item: 'moto' },
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

function teacherLabel() { return L({ en: 'Teacher', ko: '선생님', ja: '先生', zh: '老师' }); }
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
    built.clerkNpc = makeNpc($('labels'), store.category === 'school' ? teacherLabel() : store.category === 'club' ? 'DJ' : store.category === 'bar' ? L(BARTENDER) : t('npc.clerk'));
    built.clerkNpc.ch.root.position.set(built.clerk.x, built.clerk.y || 0, built.clerk.z);
    built.clerkNpc.ch.root.rotation.y = built.clerk.ry;
    built.scene.add(built.clerkNpc.ch.root);
  }
  clerk = built.clerkNpc || null;
  if (store.pets && !built.pets) built.pets = new Pets(built.scene, built.room, (x, z, r) => built.collision.blocked(x, z, r), store.pets);
  interior.pets = built.pets || null;
  missionEvent('visit', store.id);
  deliveryArrived(store.id);
  if (store.music) enterMusicCafe();
  if (store.kpop) enterKpopCafe();
  if (store.category === 'bar') enterMusicCafe('jazz'); // a quiet bar plays jazz
  if (store.genre) enterClub(store.genre);
  const quiet = store.category === 'library';
  const hello = store.category === 'school' ? PHRASES.school[0] : quiet ? PHRASES.library[0] : PHRASES.welcome[0];
  if (clerk) setTimeout(() => clerk && say(clerk, $('labels'), hello), 600);
  npcs.setVisible(false);
  if (store.category === 'home') {
    goSolo(built.scene); // your home is private for now
    openHome(store, built);
  } else joinRoom(`${roomId}-${store.id}`, built.scene);
}

const BARTENDER = { en: 'Bartender', ko: '바텐더', ja: 'バーテンダー', zh: '调酒师' };
function leaveStore() {
  if (mode !== 'store') return;
  endRide();
  standUp();
  clearMeal();
  closeHome();
  closeHatWorkshop(false);
  if (orderUi.open) orderUi.close();
  if (grillUi.open) grillUi.close();
  if (fishingUi.open) fishingUi.close();
  if (marketUi.open) marketUi.close();
  if (ramenUi.open) ramenUi.close();
  for (const g of [pochaUi, karaokeUi, photoUi, clawUi, duckUi, emblemUi, infoUi, saunaUi, gymUi, bookUi, academyUi, boardUi]) if (g.open) g.close();
  beautyUi.close();
  leaveMusicCafe();
  leaveKpopCafe();
  leaveClub();
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

// Music café: pick an LP to change the song. Only this player hears it (the
// music plays in this browser). Leaving puts the usual music back.
let cafeMusic = null; // { wasOn } while inside a music café
// K-POP café: everyone in the room watches and hears the same music video
// (ui/kpop-room.js). Our own background music pauses while inside.
let kpopMusic = null;
async function enterKpopCafe() {
  kpopMusic = { wasOn: music.on };
  if (music.on) { await music.setOn(false); applyMusicBtn(); }
  kpop.enter();
}
async function leaveKpopCafe() {
  if (!kpopMusic) return;
  const { wasOn } = kpopMusic;
  kpopMusic = null;
  kpop.leave();
  if (wasOn && !music.on) { await music.setOn(true); applyMusicBtn(); }
}
async function enterMusicCafe(track = 'lofi') {
  cafeMusic = { wasOn: music.on };
  music.setTrack(track);
  if (!music.on) { await music.setOn(true); applyMusicBtn(); } // the room's music plays on entering
}
async function leaveMusicCafe() {
  if (!cafeMusic) return;
  const { wasOn } = cafeMusic;
  cafeMusic = null;
  $('lp-panel').hidden = true;
  music.setTrack('lofi');
  if (!wasOn && music.on) { await music.setOn(false); applyMusicBtn(); }
}
function openLpPanel() {
  const root = $('lp-panel');
  const lang = getLanguage();
  const x = document.createElement('button');
  x.className = 'sheet-x';
  x.textContent = '✕';
  x.setAttribute('aria-label', t('order.close'));
  x.onclick = () => { root.hidden = true; };
  const h = document.createElement('h3');
  h.textContent = '💿 ' + t('lp.title');
  const note = document.createElement('p');
  note.className = 'fine';
  note.textContent = t('lp.note');
  const list = document.createElement('div');
  list.className = 'lp-list';
  for (const tr of TRACKS) {
    const b = document.createElement('button');
    const playing = music.on && music.track.id === tr.id;
    b.className = 'lp-row' + (playing ? ' on' : '');
    b.innerHTML = `<span class="lp-disc"><i></i></span><span class="lp-text"><strong></strong><small></small></span>`;
    b.querySelector('.lp-disc').style.background = `radial-gradient(circle, ${tr.color} 0 26%, #141418 27% 100%)`;
    b.querySelector('strong').textContent = `${tr.icon} ${localName(tr.name, lang)}${playing ? ' · ' + t('lp.playing') : ''}`;
    b.querySelector('small').textContent = localName(tr.desc, lang);
    b.onclick = async () => {
      music.setTrack(tr.id);
      if (!music.on) { await music.setOn(true); applyMusicBtn(); }
      shop.toast(t('lp.now', { name: localName(tr.name, lang) }));
      openLpPanel();
    };
    list.append(b);
  }
  const off = document.createElement('button');
  off.className = 'chip';
  off.textContent = music.on ? '🔇 ' + t('lp.stop') : '🔊 ' + t('lp.play');
  off.onclick = async () => { await music.setOn(!music.on); applyMusicBtn(); openLpPanel(); };
  const actions = document.createElement('div');
  actions.className = 'order-actions';
  actions.append(off);
  root.replaceChildren(x, h, note, list, actions);
  root.hidden = false;
}
// Bike shop (Pedal Lab): buy a slightly faster bike, pick which one to
// ride, and repair wear (core/bike-garage.js).
const BIKE_TEXT = {
  open: { en: 'Bikes & repairs', ko: '자전거 고르기·수리', ja: '自転車・修理', zh: '选车·维修' },
  title: { en: 'Pedal Lab', ko: '페달랩 자전거 가게', ja: 'ペダルラボ', zh: '踏板实验室' },
  note: { en: 'Every bike is only a little faster than the last. Bikes wear out very slowly as you ride; a repair costs a few coins.', ko: '자전거마다 속도 차이는 조금씩만 나요. 타다 보면 아주 조금씩 닳고, 수리는 몇 코인이면 돼요.', ja: 'どの自転車も速さの差は少しだけ。乗るととてもゆっくりすり減り、修理は数コインです。', zh: '每辆车只快一点点。骑久了会非常缓慢地磨损，修理只要几枚硬币。' },
  speed: { en: 'Speed', ko: '속도', ja: '速さ', zh: '速度' },
  dur: { en: 'Condition {n}%', ko: '내구도 {n}%', ja: '状態 {n}%', zh: '耐久 {n}%' },
  buy: { en: 'Buy', ko: '사기', ja: '買う', zh: '购买' },
  use: { en: 'Ride this', ko: '이걸로 타기', ja: 'これに乗る', zh: '骑这辆' },
  using: { en: 'Riding', ko: '타는 중', ja: '使用中', zh: '使用中' },
  repair: { en: 'Repair', ko: '수리', ja: '修理', zh: '修理' },
  fixed: { en: 'Good as new!', ko: '새것처럼 고쳤어요!', ja: '新品同様になりました！', zh: '修好啦，跟新的一样！' },
  bought: { en: 'Enjoy your new bike!', ko: '새 자전거가 생겼어요!', ja: '新しい自転車をどうぞ！', zh: '新车到手！' },
  poor: { en: 'Not enough coins.', ko: '코인이 부족해요.', ja: 'コインが足りません。', zh: '硬币不够。' },
  worn: { en: 'Your bike is getting worn: a repair at Pedal Lab makes it good as new.', ko: '자전거가 많이 닳았어요. 페달랩에서 수리하면 새것처럼 돼요.', ja: '自転車がすり減ってきました。ペダルラボで修理できます。', zh: '自行车磨损了，去踏板实验室修一下吧。' },
};
function openBikeShop() {
  const root = $('lp-panel');
  delete root.dataset.club;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const x = el('button', 'sheet-x', '✕');
  x.onclick = () => { root.hidden = true; };
  const list = el('div', 'lp-list');
  const top = BIKE_MODELS[BIKE_MODELS.length - 1].speed;
  for (const m of BIKE_MODELS) {
    const own = garage.has(m.id), on = garage.s.use === m.id;
    const row = el('div', 'lp-row bike-row' + (on ? ' on' : ''));
    const sw = el('span', 'bike-swatch');
    sw.style.background = m.color;
    const text = el('span', 'lp-text');
    text.append(el('strong', null, '🚲 ' + L(m.name)));
    const bar = el('span', 'bike-bar');
    const fill = el('i');
    fill.style.width = Math.round((m.speed / top) * 100) + '%';
    bar.append(fill);
    const info = el('small', null, `${L(BIKE_TEXT.speed)} ${m.speed.toFixed(1)}` + (own ? ' · ' + fmt(L(BIKE_TEXT.dur), { n: Math.floor(garage.durability(m.id)) }) : ''));
    text.append(bar, info);
    const btns = el('span', 'bike-btns');
    if (!own) {
      const b = el('button', 'chip', `${L(BIKE_TEXT.buy)} · 🪙 ${m.price}`);
      b.onclick = () => {
        const r = garage.buy(m.id, wallet);
        refreshWallet();
        shop.toast(L(r === 'bought' ? BIKE_TEXT.bought : BIKE_TEXT.poor));
        if (r === 'bought' && riding === 1) me.setBike(1, garage.current.color);
        openBikeShop();
      };
      btns.append(b);
    } else {
      if (!on) {
        const b = el('button', 'chip', L(BIKE_TEXT.use));
        b.onclick = () => { garage.use(m.id); if (riding === 1) me.setBike(1, garage.current.color); openBikeShop(); };
        btns.append(b);
      } else btns.append(el('small', 'bike-using', '✓ ' + L(BIKE_TEXT.using)));
      const cost = repairCost(garage.durability(m.id));
      if (cost > 0) {
        const r = el('button', 'chip', `🔧 ${L(BIKE_TEXT.repair)} · 🪙 ${cost}`);
        r.onclick = () => {
          const res = garage.repair(m.id, wallet);
          refreshWallet();
          shop.toast(L(res === 'fixed' ? BIKE_TEXT.fixed : BIKE_TEXT.poor));
          openBikeShop();
        };
        btns.append(r);
      }
    }
    row.append(sw, text, btns);
    list.append(row);
  }
  root.replaceChildren(x, el('strong', 'wallet-title', '🚲 ' + L(BIKE_TEXT.title)), el('p', 'fine', L(BIKE_TEXT.note)), list);
  root.hidden = false;
}

// Restaurants (core/dining.js): sit at a table, open the menu and order.
// The dish comes to your table a few seconds later; eat it in 5 bites. Or
// order to go and carry the box (5 bites too). Prices are won on the menu,
// paid in coins at 1 per 1,000 won.
let meal = null; // Meal on a table in this restaurant (+ .mesh once served)
function clearMeal() {
  if (meal?.mesh) meal.mesh.removeFromParent();
  meal = null;
}
function dineAction() {
  if (meal?.seat === seated) {
    if (!meal.ready(performance.now())) return { key: 'dine-wait', label: '⏳ ' + L(DINE_TEXT.waiting), run: () => {} };
    return { key: 'dine-eat:' + meal.bites, label: `😋 ${L(DINE_TEXT.eat)} (${meal.bites}/${FOOD_BITES})`, run: () => eatMeal() };
  }
  return { key: 'dine-menu', label: '📖 ' + L(DINE_TEXT.menu), run: () => openMenu() };
}
function updateMeal() {
  if (!meal || meal.mesh || !interior || !meal.ready(performance.now())) return;
  const [x, z] = meal.seat.plate;
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.02, 20), new THREE.MeshLambertMaterial({ color: '#fbfaf6' }));
  plate.position.y = 0.01;
  const food = productModel(meal.product.model, meal.product.color);
  food.scale.setScalar(1.5);
  food.position.y = 0.02;
  g.add(plate, food);
  g.position.set(x, 0.645, z);
  g.rotation.y = meal.seat.ry;
  interior.scene.add(g);
  meal.mesh = g;
  meal.food = food;
  sfx.pop?.();
  const name = localName(meal.product.name, getLanguage());
  shop.toast(fmt(L(DINE_TEXT.served), { name }));
  clerk && say(clerk, $('labels'), ['맛있게 드세요!', 'masitge deuseyo!', fmt(L(DINE_TEXT.served), { name })]);
  action = STALE;
}
function eatMeal() {
  if (!meal) return;
  const left = meal.bite(performance.now());
  me.play('clap');
  sfx.pop?.();
  if (left <= 0) { clearMeal(); shop.toast(L(DINE_TEXT.finished)); missionEvent('eat'); }
  else { meal.food.scale.setScalar(1.5 * (0.45 + 0.55 * left / FOOD_BITES)); shop.toast(fmt(L(DINE_TEXT.bite), { n: left })); }
}
function orderFood(product, togo) {
  const cost = coinPrice(product.price);
  if (!togo && meal?.seat === seated) { shop.toast(L(DINE_TEXT.busy)); return; }
  if (togo && held && !confirm(t('coffee.replace'))) return;
  if (!wallet.spend(cost)) { shop.toast(fmt(L(DINE_TEXT.poor), { n: cost })); return; }
  refreshWallet();
  recordFood(interior.store, product, true);
  const name = localName(product.name, getLanguage());
  $('lp-panel').hidden = true;
  if (togo) {
    setHeld({ kind: takeoutKind(product), sips: FOOD_BITES, name: localName(product.name, 'en') });
    shop.toast(fmt(L(DINE_TEXT.packed), { name }));
    clerk && say(clerk, $('labels'), ['포장해 드릴게요!', 'pojanghae deurilgeyo!', fmt(L(DINE_TEXT.packed), { name })]);
    return;
  }
  clearMeal();
  meal = new Meal(seated, product, performance.now());
  shop.toast(fmt(L(DINE_TEXT.ordered), { name }));
  clerk && say(clerk, $('labels'), ['네, 주문 받았습니다!', 'ne, jumun badatseumnida!', fmt(L(DINE_TEXT.ordered), { name })]);
  action = STALE;
}
function openMenu() {
  const root = $('lp-panel');
  delete root.dataset.club;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const x = el('button', 'sheet-x', '✕');
  x.onclick = () => { root.hidden = true; };
  const list = el('div', 'lp-list');
  const lang = getLanguage();
  for (const pr of interior.store.products) {
    const row = el('div', 'lp-row menu-row');
    const text = el('span', 'lp-text');
    text.append(el('strong', null, `${foodIcon(pr.model)} ${localName(pr.name, lang)}`));
    if (pr.desc) text.append(el('small', null, localName(pr.desc, lang)));
    text.append(el('small', 'menu-price', `₩${Number(pr.price).toLocaleString()} → 🪙 ${coinPrice(pr.price)}`));
    const btns = el('span', 'bike-btns');
    const here = el('button', 'chip', '🍽️ ' + L(DINE_TEXT.here));
    here.onclick = () => orderFood(pr, false);
    const go = el('button', 'chip', '🥡 ' + L(DINE_TEXT.togo));
    go.onclick = () => orderFood(pr, true);
    btns.append(here, go);
    row.append(text, btns);
    list.append(row);
  }
  root.replaceChildren(x, el('strong', 'wallet-title', '📖 ' + localName(interior.store.name, lang) + ' · ' + L(DINE_TEXT.menu)), el('p', 'fine', L(DINE_TEXT.note)), list);
  root.hidden = false;
}

// Itaewon clubs: each plays its genre's playlist (core/club-music.js). The
// songs run on the clock, so everyone inside hears the same song at the same
// moment. Our own background music pauses while inside.
const clubMusic = new ClubMusic();
let clubState = null; // { wasOn, genre } while inside a club
const CLUB_TEXT = {
  open: { en: 'Playlist', ko: '플레이리스트', ja: 'プレイリスト', zh: '播放列表' },
  now: { en: 'Now playing', ko: '지금 나오는 곡', ja: '再生中', zh: '正在播放' },
  note: { en: 'Everyone in the club hears the same song. 10 songs, 2–3 minutes each, all made in your browser.', ko: '클럽 안의 모두가 같은 곡을 들어요. 2~3분짜리 10곡이 브라우저에서 바로 만들어져요.', ja: 'クラブの全員が同じ曲を聴いています。2〜3分の10曲をブラウザでその場で演奏します。', zh: '俱乐部里的每个人都听同一首歌。共10首，每首2–3分钟，在浏览器中实时生成。' },
  mute: { en: 'Mute', ko: '음소거', ja: 'ミュート', zh: '静音' },
  unmute: { en: 'Sound on', ko: '소리 켜기', ja: '音を出す', zh: '打开声音' },
  left: { en: '{t} left', ko: '{t} 남음', ja: '残り{t}', zh: '剩余{t}' },
};
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
clubMusic.onSong = (i) => {
  if (!clubState) return;
  const tr = CLUB_TRACKS[clubState.genre][i];
  shop.toast('🎧 ' + localName(tr.name, getLanguage()));
  if (!$('lp-panel').hidden && $('lp-panel').dataset.club) openClubPanel();
};
async function enterClub(genre) {
  clubState = { wasOn: music.on, genre };
  if (music.on) { await music.setOn(false); applyMusicBtn(); }
  if (clubState?.genre === genre) await clubMusic.start(genre);
}
async function leaveClub() {
  if (!clubState) return;
  const { wasOn } = clubState;
  clubState = null;
  clubMusic.stop();
  $('lp-panel').hidden = true;
  delete $('lp-panel').dataset.club;
  if (wasOn && !music.on) { await music.setOn(true); applyMusicBtn(); }
}
function clubPulse() {
  if (!clubState || !clubMusic.on) return null;
  const p = clubMusic.pulse();
  return p && { ...p, title: localName(clubMusic.song.name, getLanguage()) };
}
setBeat(() => clubPulse()); // dancers move to the club's beat
function openClubPanel() {
  if (!clubState) return;
  const root = $('lp-panel');
  root.dataset.club = '1';
  const lang = getLanguage();
  const g = CLUB_GENRES[clubState.genre];
  const x = document.createElement('button');
  x.className = 'sheet-x';
  x.textContent = '✕';
  x.onclick = () => { root.hidden = true; delete root.dataset.club; };
  const h = document.createElement('strong');
  h.className = 'wallet-title';
  h.textContent = `${g.icon} ${localName(g.name, lang)} · ${L(CLUB_TEXT.open)}`;
  const note = document.createElement('p');
  note.className = 'fine';
  note.textContent = localName(g.desc, lang) + ' ' + L(CLUB_TEXT.note);
  const list = document.createElement('div');
  list.className = 'lp-list';
  const p = clubMusic.pulse();
  CLUB_TRACKS[clubState.genre].forEach((tr, i) => {
    const playing = clubMusic.on && clubMusic.index === i;
    const row = document.createElement('div');
    row.className = 'lp-row' + (playing ? ' on' : '');
    row.innerHTML = '<span class="lp-text"><strong></strong><small></small></span>';
    row.querySelector('strong').textContent = `${i + 1}. ${localName(tr.name, lang)}`;
    const len = songSeconds(clubState.genre, tr);
    row.querySelector('small').textContent = playing && p
      ? `▶ ${L(CLUB_TEXT.now)} · ${fmt(L(CLUB_TEXT.left), { t: mmss(Math.max(0, len - p.pos)) })}`
      : `${tr.bpm} BPM · ${mmss(len)}`;
    list.append(row);
  });
  const mute = document.createElement('button');
  mute.className = 'chip';
  mute.textContent = clubMusic.muted ? '🔊 ' + L(CLUB_TEXT.unmute) : '🔇 ' + L(CLUB_TEXT.mute);
  mute.onclick = () => { clubMusic.setMuted(!clubMusic.muted); openClubPanel(); };
  const actions = document.createElement('div');
  actions.className = 'order-actions';
  actions.append(mute);
  root.replaceChildren(x, h, note, list, actions);
  root.hidden = false;
}

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
  routePoly = null; // plan a new route
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
// the nearest street. The fare grows with the distance.
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
  // Drop-off: the nearest point on a road a car can use, on free ground.
  const [rx, rz] = taxiDropOff(dest.x, dest.z);
  const [fx, fz] = findFreeSpot(rx, rz);
  // The fare grows with the distance (core/taxi.js).
  const from = mode === 'street' ? me.root.position : interior.front.door;
  const fare = taxiFare(from.x, from.z, fx, fz);
  if (!wallet.spend(fare)) { shop.toast(t('taxi.noCoins', { n: fare.toLocaleString() })); return; }
  refreshWallet();
  if (mode === 'store') leaveStore();
  if (riding) setRiding(false);
  clearGuide();
  const ry = Math.atan2(dest.x - fx, dest.z - fz); // face the destination
  const sayLine = ([ko, rom, key]) => {
    $('taxi-ko').textContent = ko;
    $('taxi-rom').textContent = rom;
    $('taxi-tr').textContent = getLanguage() === 'ko' ? '' : t(key);
  };
  $('taxi-dest').textContent = '📍 ' + t('taxi.to', { label: dest.label }) + ' · 🪙 ' + t('taxi.fare', { n: fare.toLocaleString() });
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
  const def = furnitureById(id);
  if (def?.item && !inventory.has(def.item)) return; // a prize you haven't won yet
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
  for (const b of $('decor-grid').children) {
    const f = furnitureById(b.dataset.id);
    b.querySelector('small').textContent = localName(f.name, getLanguage());
    b.hidden = !!f.item && !inventory.has(f.item); // plushies: once you've won one
  }
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
// Samgyeopsal grilling minigame: medals for good timing.
const grillUi = new GrillUI({
  root: $('grill-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); },
});
// Han River park: fishing at the pier and the railing, ramen at the kiosk.
// The catch goes in a bag (mk.fish) and is sold at the fish market.
const fishBag = new FishBag();
const fishingUi = new FishingUI({
  root: $('fish-panel'),
  bag: fishBag,
  onRod: (on) => { rodOut = on; me.setHeld(heldKind()); lastSent = null; },
  onCatch: (f) => {
    sfx.pop?.();
    showBubble(myLabel, $('labels'), f.emoji);
    if (f.chance <= 2) me.play('cheer'); // a rare one!
    missionEvent('fish', f.id);
    togetherBonus('fish');
  },
  onEscape: () => showBubble(myLabel, $('labels'), '💨'),
});
const marketUi = new FishMarketUI({
  root: $('market-panel'),
  bag: fishBag,
  wallet,
  onSold: (coins) => {
    if (!coins) return;
    shop.toast(t('fish.sold', { coins }));
    clerk && say(clerk, $('labels'), ['싱싱하네요! 잘 팔았어요!', 'singsinghaneyo! jal parasseoyo!', t('fish.fresh')]);
  },
});
const ramenUi = new RamenUI({
  root: $('ramen-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); },
});

// Minigames (ui/*-ui.js): the tteokbokki stall and its delivery run, the
// noraebang, the photo booth, the claw machines and the duck boats.
const cookDone = (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); };
const pochaUi = new PochaUI({
  root: $('pocha-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onDeliver: () => startDelivery(),
  onMedal: cookDone,
});
const karaokeUi = new KaraokeUI({
  root: $('karaoke-panel'),
  wallet,
  onStart: () => { karaokeMusic = music.on; if (music.on) { music.setOn(false); applyMusicBtn(); } },
  onEnd: () => { if (karaokeMusic && !music.on) { music.setOn(true); applyMusicBtn(); } karaokeMusic = false; },
  onScore: (n) => net.sendEmote(karaokeMsg(n)),
  onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); me.play(medal ? 'cheer' : 'wave'); },
});
let karaokeMusic = false;
let snapReq = null; // resolved with a copy of the canvas after the next render
const photoUi = new PhotoUI({
  root: $('photo-panel'),
  wallet,
  snap: () => new Promise((resolve) => { snapReq = resolve; }),
  onShoot: (on) => {
    document.body.classList.toggle('shooting', on);
    if (on) {
      const st = interior?.stations?.photo?.[0];
      photoCam = { ...cam };
      if (st) { me.root.position.set(st.x, 0, st.z); lastSent = null; }
      Object.assign(cam, { yaw: 0, dist: 3.0, pitch: 0.06 });
      me.root.rotation.y = 0; // face the camera
    } else if (photoCam) { Object.assign(cam, photoCam); photoCam = null; }
  },
  countdown: (text) => { $('photo-count').hidden = !text; $('photo-count').textContent = text; },
});
let photoCam = null;
const clawUi = new ClawUI({
  root: $('claw-panel'),
  wallet,
  give: (id) => { const added = inventory.add(id); refreshItems(); labelDecor(); return added.length > 0; },
  itemName: (id) => localName(ITEMS[id]?.name, getLanguage()),
  onWin: () => { me.play('cheer'); sfx.pop?.(); },
});
// Name tag studio: emblems and name colours (a place to spend coins).
const emblems = new EmblemCollection();
const emblemUi = new EmblemUI({
  root: $('emblem-panel'),
  owned: emblems,
  wallet,
  name: nickname,
  getLook: () => myLook,
  wearLook: (patch) => {
    myLook = { ...myLook, ...patch };
    for (const k of Object.keys(patch)) if (patch[k] == null) delete myLook[k];
    saveLook(myLook);
    setLook(myLook);
    me.play('cheer');
  },
});
// Information Center, and route guides to the places it lists.
function guideToPlace(to) {
  if (to.store) {
    const it = storefronts.get(to.store);
    if (!it) return false;
    if (interior) leaveStore();
    setGuide({ kind: 'store', id: it.store.id, x: it.door.x, z: it.door.z, label: localName(it.store.name, getLanguage()) });
    return true;
  }
  const z = zones.items.find((i) => i.zone.id === to.zone);
  if (!z) return false;
  if (interior) leaveStore();
  setGuide({ kind: 'zone', id: z.zone.id, x: z.x, z: z.z, label: localName(z.zone.name, getLanguage()) });
  return true;
}
const infoUi = new InfoUI({ root: $('info-panel'), guide: guideToPlace });
// The first-time hint waits until the daily check-in card is closed.
setTimeout(function infoHintWhenFree() {
  if (!$('daily-panel').hidden) { setTimeout(infoHintWhenFree, 1500); return; }
  showInfoHint($('info-hint'), { onGo: () => guideToPlace({ store: 'info-center' }) });
}, 2500); // after the daily card would have opened (1.2 s)
// Jjimjilbang: hot kiln and ice room, and the sheep towel.
const saunaUi = new SaunaUI({
  root: $('sauna-panel'),
  wallet,
  log: new SaunaLog(),
  onEnter: (kind) => showBubble(myLabel, $('labels'), kind === 'hot' ? '🥵' : '🥶', 4000),
  onLeave: (kind, done) => { if (done) { me.play('cheer'); showBubble(myLabel, $('labels'), kind === 'hot' ? '😌' : '😆'); } },
  towel: {
    on: () => myLook.head === 'towel',
    toggle: () => {
      myLook = { ...myLook, head: myLook.head === 'towel' ? null : 'towel' };
      if (!myLook.head) delete myLook.head;
      saveLook(myLook);
      setLook(myLook);
    },
  },
});
// Poses held while doing something: the gym, fishing, dancing in a club.
// Others see them too (the "ac" field).
const GYM_POSE = { treadmill: 'run', dumbbell: 'clap', pushup: 'pushup', situp: 'situp' };
let dancing = false;
const DANCE_TEXT = {
  start: { en: 'Dance', ko: '춤추기', ja: '踊る', zh: '跳舞' },
  stop: { en: 'Stop dancing', ko: '춤 멈추기', ja: 'ダンスをやめる', zh: '停止跳舞' },
};
function currentActivity() {
  if (dancing) return 'dance';
  if (gymUi.open) return GYM_POSE[gymUi.kind] || null;
  if (fishingUi.open) return 'fish';
  return null;
}
// Gym: each finished set makes walking a tiny bit faster.
const gymUi = new GymUI({
  root: $('gym-panel'),
  log: gymLog,
  onRep: (kind) => { if (!GYM_POSE[kind]) me.play('cheer'); },
  onSet: () => { showBubble(myLabel, $('labels'), '💪'); sfx.pop?.(); },
});
// Library books: carry one, read it sitting anywhere.
const BOOK_PAGE_KEY = 'mk.bookPages';
const bookPages = (() => { try { return JSON.parse(localStorage.getItem(BOOK_PAGE_KEY) || '{}') || {}; } catch { return {}; } })();
// 효재어학당: the course book opens when you sit at a desk or talk to the
// teacher.
const ACADEMY_OPEN = { en: 'Courses', ko: '수강 신청 · 수업', ja: '受講・授業', zh: '报名 · 上课' };
const academyUi = new AcademyUI({
  root: $('academy-panel'),
  academy: new Academy(),
  name: () => nickname,
  onReward: (n) => { wallet.add(n); refreshWallet(); },
  sfx: () => sfx.pop?.(),
});
// Notice boards: in Supabase when signed in to it, else on this device.
let boardBackend = null;
function boardStore() {
  const live = cloud.status === 'cloud' && cloud.client && cloud.user;
  if (live && !(boardBackend instanceof SupabaseBoard)) boardBackend = new SupabaseBoard(cloud.client, cloud.user.id);
  if (!live && !boardBackend) boardBackend = new LocalBoard();
  return boardBackend;
}
const boardUi = new BoardUI({ root: $('board-panel'), store: boardStore, name: () => nickname, toast: (m) => shop.toast(m) });
const bookUi = new BookUI({
  root: $('book-panel'),
  carrying: () => (held?.kind === 'book' ? held.book : null),
  take: (id) => {
    if (held?.kind === 'coffee' && !confirm(t('coffee.replace'))) return;
    setHeld({ kind: 'book', book: id });
    shop.toast(t('book.taken'));
  },
  putDown: () => { if (held?.kind === 'book') setHeld(null); },
  getPage: (id) => bookPages[id] | 0,
  setPage: (id, i) => { bookPages[id] = i; try { localStorage.setItem(BOOK_PAGE_KEY, JSON.stringify(bookPages)); } catch { /* storage blocked */ } },
});
const dexUi = new DexUI({ root: $('dex-panel'), dex: foodDex, stores: () => storeData, localName: (n) => localName(n, getLanguage()) });
function refreshDexBtn() { $('dex-btn').querySelector('span').textContent = `${L(DEX_TEXT.title)} · ${foodDex.kinds}/${allFoods(storeData).length}`; }
$('dex-btn').onclick = () => { $('wallet-panel').hidden = true; dexUi.show(); };
refreshDexBtn();
onLanguageChange(refreshDexBtn);
// Amusement park rides: pay a ticket, get carried round, hop off at the end.
let ride = null; // { kind, seat, t0, until, back: [x, z] }
const RIDE_ICON = { carousel: '🎠', wheel: '🎡', viking: '🏴‍☠️' };
function boardRide(st) {
  if (!wallet.spend(RIDE_COST)) { shop.toast(t('ride.noCoins', { n: RIDE_COST })); return; }
  const now = interior.time();
  ride = { kind: st.kind, seat: Math.floor(Math.random() * PARK_RIDES[st.kind].seats), t0: now, until: now + RIDE_SECONDS[st.kind], back: [st.x, st.z], shout: 0 };
  sendTimer = 0;
  missionEvent('ride');
}
function endRide() {
  if (!ride) return;
  me.root.position.set(ride.back[0], 0, ride.back[1]);
  ride = null;
  sendTimer = 0;
  me.play('cheer');
}
function updateRide(dt) {
  if (!ride || !interior?.tick) return;
  const now = interior.time();
  const s = seatAt(ride.kind, ride.seat, now, ride.t0);
  me.root.position.set(s.x, s.y, s.z);
  me.root.rotation.y = s.ry;
  ride.shout -= dt;
  if (ride.shout <= 0) { ride.shout = 5; showBubble(myLabel, $('labels'), ride.kind === 'viking' ? '😱 꺄아아!' : ride.kind === 'wheel' ? '😍' : '🎶', 2200); }
  if (now >= ride.until) endRide();
}
const duckUi = new DuckUI({
  root: $('duck-panel'),
  wallet,
  friend: () => others.nearestFree(me.root.position.x, me.root.position.z, TOGETHER_RADIUS),
  send: (to, n) => net.sendEmote(duckMsg(to, n)),
  onDone: (ok) => { if (ok) me.play('cheer'); },
});

// Delivery run from the tteokbokki stall: ride to another shop in time.
let delivery = null; // { id, name, until }
function startDelivery() {
  const from = interior?.front?.door || me.root.position;
  const stores = storefronts.items.filter((i) => i.store.category !== 'home' && i.store.category !== 'park' && i.store.id !== interior?.store.id)
    .map((i) => ({ id: i.store.id, x: i.door.x, z: i.door.z, item: i }));
  const target = pickDelivery(stores, from);
  if (!target) return;
  const secs = timeFor(target.d);
  const name = localName(target.item.store.name, getLanguage());
  delivery = { id: target.id, name, until: performance.now() + secs * 1000 };
  shop.toast(t('delivery.start', { name, s: secs }));
  if (mode === 'store') leaveStore();
  setGuide({ kind: 'store', id: target.id, x: target.x, z: target.z, label: name });
}
function deliveryArrived(storeId) {
  if (!delivery || delivery.id !== storeId) return;
  const left = (delivery.until - performance.now()) / 1000;
  const coins = deliveryPay(left);
  delivery = null;
  $('delivery-chip').hidden = true;
  if (!coins) return;
  wallet.add(coins);
  me.play('cheer');
  shop.toast(t('delivery.done', { n: coins }));
  missionEvent('delivery');
}
function updateDelivery() {
  if (!delivery) return;
  const left = (delivery.until - performance.now()) / 1000;
  if (left <= 0) {
    delivery = null;
    $('delivery-chip').hidden = true;
    shop.toast(t('delivery.late'));
    return;
  }
  $('delivery-chip').hidden = false;
  $('delivery-chip').textContent = `🛵 ${delivery.name} · ${Math.ceil(left)}s`;
}
$('delivery-chip').onclick = () => { if (delivery) shop.toast(t('delivery.cancelHint')); };
// Hair salon (dye) and cosmetic clinic (eye colour, skin tone, smaller head):
// try options on with a close-up camera, pay coins to keep them.
const beautyUi = new BeautyUI({
  root: $('beauty-panel'),
  onPreview: (look) => setLook(look),
  onSave: (look, cost) => {
    if (cost && !wallet.spend(cost)) { shop.toast(t('pet.noCoins', { n: cost - wallet.coins })); return false; }
    myLook = { ...look };
    saveLook(myLook);
    setLook(myLook);
    endBeautyCam();
    me.play('cheer');
    shop.toast(t('beauty.saved'));
    clerk && say(clerk, $('labels'), ['정말 잘 어울려요!', 'jeongmal jal eoullyeoyo!', t('beauty.suits')]);
    return true;
  },
  onCancel: () => { setLook(myLook); endBeautyCam(); },
});
let beautyCam = null;
function openBeauty(kind) {
  clerk?.ch.wave();
  beautyCam = { ...cam };
  Object.assign(cam, { dist: 2.6, pitch: 0.12 }); // close-up
  me.root.rotation.y = cam.yaw; // turn to face the camera (a mirror)
  lastSent = null;
  beautyUi.show(kind, myLook);
}
function endBeautyCam() {
  if (beautyCam) Object.assign(cam, beautyCam);
  beautyCam = null;
}
const nearFishing = (p) => interior?.fishing?.some((f) => Math.hypot(p.x - f.x, p.z - f.z) < 1.8);
function openFishing() {
  me.root.rotation.y = Math.PI; // face the river (north)…
  cam.yaw = 0; // …with the camera behind you
  fishingUi.show();
}
function openMarket() {
  if (!clerk) return;
  clerk.ch.wave();
  marketUi.show();
}
function openGrill() {
  if (!interior?.store || !clerk) return;
  clerk.ch.wave();
  grillUi.show();
}
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
    if (it.pet) { // walk this pet, or leave it at home
      const walking = pet?.id === id;
      const w = document.createElement('button');
      w.className = 'chip item-walk' + (walking ? ' on' : '');
      w.textContent = walking ? '🏠 ' + t('pet.home') : '🐾 ' + t('pet.walk');
      w.onclick = () => setPet(walking ? null : id);
      row.append(w);
    }
    if (it.tee) { // put the printed shirt on, or take it off
      const wearing = myLook.tee === it.tee;
      const w = document.createElement('button');
      w.className = 'chip item-walk' + (wearing ? ' on' : '');
      w.textContent = '👕 ' + t(wearing ? 'tee.off' : 'tee.wear');
      w.onclick = () => {
        myLook = { ...myLook, tee: wearing ? null : it.tee };
        saveLook(myLook);
        setLook(myLook);
        refreshItems();
      };
      row.append(w);
    }
    return row;
  }));
}
// Bring back the pet I was walking last time.
try { const saved = localStorage.getItem(PET_KEY); if (saved) setPet(saved); } catch { /* storage blocked */ }
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
// Square missions: what the guide can check on the spot, the HUD chip, and
// talking to the guide (take an errand, see it again, or report back).
// A function declaration (not a const): setHeld() runs during startup,
// before this line, when a held item is restored.
function questCtx() { return { held: held?.kind || null, pet: !!pet }; }
function questText(q) {
  const store = q.kind === 'visit' ? storefronts.items.find((i) => i.store.id === q.target)?.store : null;
  return t('quest.' + q.kind, { store: store ? localName(store.name, getLanguage()) : '', n: q.n, need: q.need });
}
function refreshQuestChip() {
  const q = quests.active;
  $('quest-chip').hidden = !q;
  if (!q) return;
  const ready = quests.ready(questCtx());
  const count = q.need > 1 ? ` (${Math.min(q.n, q.need)}/${q.need})` : '';
  // Folded: just the icon (and the count); tap the chip to unfold or fold it.
  $('quest-chip').classList.toggle('folded', questFolded);
  $('quest-chip').textContent = questFolded
    ? (ready ? '🎁' : '📜') + count + ' ▸'
    : (ready ? '🎁 ' + t('quest.goBackShort') : '📜 ') + ' ' + questText(q) + count + ' ◂';
}
function talkToGuide() {
  squareNpc.ch.wave();
  const q = quests.active;
  if (q && quests.ready(questCtx())) {
    const coins = quests.claim(questCtx());
    if (q.kind === 'coffee') setHeld(null); // the guide takes the coffee
    // Busy square bonus: +1 for everyone else standing around the guide.
    const g = squareNpc.ch.root.position;
    const crowd = crowdBonus([...others.players.values()].filter((o) => !o.hidden && Math.hypot(o.ch.root.position.x - g.x, o.ch.root.position.z - g.z) < 8).length);
    wallet.add(coins + crowd);
    me.play('cheer');
    say(squareNpc, $('labels'), ['고마워요! 수고했어요!', 'gomawoyo! sugohaesseoyo!', t('quest.thanks')]);
    shop.toast(t('quest.done', { coins: coins + crowd, left: quests.left }) + (crowd ? ' ' + t('quest.crowd', { n: crowd }) : ''));
    missionEvent('square');
  } else if (q) {
    say(squareNpc, $('labels'), ['부탁해요!', 'butakhaeyo!', questText(q)]);
    shop.toast(questText(q));
  } else if (quests.left) {
    const a = quests.start({
      stores: storefronts.items.filter((i) => i.store.category !== 'home').map((i) => i.store.id),
      has: (kind) => (kind !== 'pet' || Object.keys(ITEMS).some((id) => ITEMS[id].pet && inventory.has(id))) // only if you have a pet
        && (kind !== 'highfive' || others.players.size > 0), // only with someone around
    });
    say(squareNpc, $('labels'), ['부탁 하나 들어줄래요?', 'butak hana deureojullaeyo?', questText(a)]);
    shop.toast(t('quest.new', { coins: QUEST_REWARD }));
  } else {
    say(squareNpc, $('labels'), ['오늘은 끝! 내일 또 와요!', 'oneureun kkeut! naeil tto wayo!', t('quest.tomorrow')]);
  }
  refreshQuestChip();
}
$('quest-chip').onclick = () => {
  questFolded = !questFolded;
  try { localStorage.setItem(QUEST_FOLD_KEY, questFolded ? '1' : '0'); } catch { /* storage blocked */ }
  refreshQuestChip();
};
refreshQuestChip();

// On the square: near the guide and the big screen.
const onSquare = () => mode === 'street' && squareNpc && Math.hypot(me.root.position.x - squareNpc.ch.root.position.x, me.root.position.z - squareNpc.ch.root.position.z) < 14;

// Doing something with another player close by pays a little extra.
function togetherBonus(kind) {
  const p = me.root.position;
  const friend = others.nearestFree(p.x, p.z, TOGETHER_RADIUS);
  if (!friend) return;
  wallet.add(TOGETHER_COINS[kind]);
  shop.toast(t('together.bonus', { name: friend.name, coins: TOGETHER_COINS[kind] }));
}

// High five (core/together.js): both press 🙌 next to each other.
const hi5 = new HighFives();
function pressHi5(o) {
  net.sendEmote(hi5Msg(o.id));
  me.play('wave');
  showBubble(myLabel, $('labels'), '🙌');
  const r = hi5.press(o.id, o.name);
  if (r) hi5Done(o.id, r);
  else shop.toast(t('hi5.sent', { name: o.name }));
}
function onHi5(id) {
  const name = others.nameOf(id);
  const r = hi5.heard(id, name);
  if (r) hi5Done(id, r);
  else { shop.toast(t('hi5.asked', { name })); action = null; } // refresh the button
}
function hi5Done(id, { coins }) {
  me.play('cheer');
  others.emote(id, 'cheer', '🙌');
  showBubble(myLabel, $('labels'), '🙌');
  sfx.pop?.();
  if (coins) wallet.add(coins);
  shop.toast(t(coins ? 'hi5.doneCoins' : 'hi5.done', { name: others.nameOf(id), coins }));
  missionEvent('highfive');
}

function missionEvent(type, target) {
  if (quests.event(type, target)) {
    refreshQuestChip();
    if (quests.ready(questCtx())) shop.toast(t('quest.goBack'));
  }
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
  if (seat.academy) academyUi.show();
  if (seat.sauna) saunaUi.show(seat.sauna); // the kiln or ice room bench
}
function standUp() {
  if (!seated) return;
  me.root.position.set(seated.stand[0], 0, seated.stand[1]);
  if (seated.sauna && saunaUi.open) saunaUi.close();
  seated = null;
  sendTimer = 0;
}

const nearStation = (p, kind, r = 1.8) => interior?.stations?.[kind]?.some((st) => Math.hypot(p.x - st.x, p.z - st.z) < r);
const hi5Target = (p) => !riding && !seated && others.nearestFree(p.x, p.z, 2);
function hi5Action(o) {
  const asked = hi5.waiting(o.id);
  return { key: 'hi5:' + o.id + asked, label: '🙌 ' + t(asked ? 'hi5.accept' : 'hi5.ask', { name: o.name }), run: () => pressHi5(o) };
}
function updateAction(p, tSec) {
  let next = null;
  if (mode === 'street') {
    const it = storefronts.nearby(p.x, p.z, tSec);
    const poop = !riding && nearestPoop(p);
    if (poop) next = { key: 'poop:' + poop.id, label: '🧻 ' + t('pet.clean'), run: () => cleanPoop(poop) };
    else if (it) next = { key: 'enter:' + it.store.id, label: '🚪 ' + t('shop.enter', { name: localName(it.store.name, getLanguage()) }), run: () => enterStore(it) };
    else if ((riding === 2 || riding === 4 || riding === 5) && freeSeat() >= 0 && others.nearestFree(p.x, p.z, riding === 4 ? 4.5 : 3)) {
      const o = others.nearestFree(p.x, p.z, riding === 4 ? 4.5 : 3);
      const seat = freeSeat();
      next = { key: 'tandem-invite:' + o.id, label: (riding === 4 ? '🚗 ' : riding === 5 ? '🏍️ ' : '🚲 ') + t('tandem.invite', { name: o.name }), run: () => { net.sendEmote(tandemMsg('invite', o.id, seat)); shop.toast(t('tandem.sent', { name: o.name })); } };
    } else if (riding) next = { key: 'bike-off', label: riding === 4 ? '🚗 ' + t('car.off') : riding === 5 ? '🏍️ ' + t('bike.offShort') : '🚲 ' + t('bike.off'), run: () => setRiding(false) };
    else if (tandemInvite && performance.now() < tandemInvite.until && others.rootOf(tandemInvite.from) && others.rootOf(tandemInvite.from).position.distanceTo(p) < 6) {
      const inv = tandemInvite;
      next = { key: 'tandem-hop:' + inv.from, label: (others.kindOf(inv.from) === 4 ? '🚗 ' : '🚲 ') + t('tandem.hopOn', { name: inv.name }), run: () => hopOn(inv) };
    }
    else if (bikeStations.nearby(p.x, p.z)) next = { key: 'bike-on', label: '🚲 ' + t('bike.on'), run: () => setRiding(true) };
    else if (hi5Target(p)) next = hi5Action(hi5Target(p));
    else if (!riding && noticeBoards.find((b) => Math.hypot(p.x - b.x, p.z - b.z) < 1.8)) {
      const b = noticeBoards.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 1.8);
      next = { key: 'board:' + b.board, label: (b.board === 'ask' ? '📮 ' : '📋 ') + L(BOARD_TEXT[b.board]), run: () => boardUi.show(b.board) };
    } else if (squareNpc && Math.hypot(p.x - squareNpc.ch.root.position.x, p.z - squareNpc.ch.root.position.z) < 2.6) {
      const q = quests.active;
      const label = q ? (quests.ready(questCtx()) ? '🎁 ' + t('quest.report') : '📜 ' + t('quest.check')) : quests.left ? '❗ ' + t('quest.take') : '👋 ' + t('npc.hi', { name: t('quest.guide') });
      next = { key: 'quest:' + (q?.kind || '') + quests.left + (q && quests.ready(questCtx())), label, run: () => talkToGuide() };
    } else {
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
    } else if (ride) {
      next = { key: 'ride-off', label: '🚪 ' + t('ride.off'), run: () => endRide() };
    } else if (interior.rides?.find((st) => Math.hypot(p.x - st.x, p.z - st.z) < 2.2)) {
      const st = interior.rides.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 2.2);
      next = { key: 'ride:' + st.kind, label: `${RIDE_ICON[st.kind]} ${t('ride.' + st.kind)} · 🪙 ${RIDE_COST}`, run: () => boardRide(st) };
    } else if (seated?.sauna) {
      next = { key: 'sauna:' + seated.sauna, label: (seated.sauna === 'hot' ? '🔥 ' : '🧊 ') + t(seated.sauna === 'hot' ? 'sauna.hot' : 'sauna.ice'), run: () => saunaUi.show(seated.sauna) };
    } else if (seated && isDining(interior.store)) {
      next = dineAction();
    } else if (seated) {
      next = { key: 'stand', label: '🧍 ' + t('shop.stand'), run: () => standUp() };
    } else if (nearStation(p, 'karaoke')) {
      next = { key: 'karaoke', label: '🎤 ' + t('game.karaoke'), run: () => karaokeUi.show() };
    } else if (nearStation(p, 'photo', 2.2)) {
      next = { key: 'photo', label: '📸 ' + t('game.photo'), run: () => photoUi.show() };
    } else if (nearStation(p, 'academy', 1.8)) {
      next = { key: 'academy', label: '🏫 ' + L(ACADEMY_OPEN), run: () => academyUi.show() };
    } else if (nearStation(p, 'books', 1.5)) {
      next = { key: 'books', label: '📚 ' + t('book.pick'), run: () => bookUi.showShelf() };
    } else if (interior.stations?.gym?.find((st) => Math.hypot(p.x - st.x, p.z - st.z) < 1.4)) {
      const st = interior.stations.gym.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 1.4);
      next = { key: 'gym:' + st.kind, label: '💪 ' + t('gym.' + st.kind), run: () => gymUi.show(st.kind) };
    } else if (interior.stations?.sauna?.find((st) => Math.hypot(p.x - st.x, p.z - st.z) < 2)) {
      const st = interior.stations.sauna.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 2);
      next = { key: 'sauna:' + st.kind, label: (st.kind === 'hot' ? '🔥 ' : '🧊 ') + t(st.kind === 'hot' ? 'sauna.hot' : 'sauna.ice'), run: () => saunaUi.show(st.kind) };
    } else if (nearStation(p, 'claw')) {
      next = { key: 'claw', label: '🧸 ' + t('game.claw'), run: () => clawUi.show() };
    } else if (interior.duck && Math.hypot(p.x - interior.duck.x, p.z - interior.duck.z) < 2.4) {
      next = { key: 'duck', label: '🦆 ' + t('game.duck'), run: () => duckUi.show() };
    } else if (interior.store.workshop === 'pocha' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'pocha', label: '🌶️ ' + t('game.pocha'), run: () => { clerk.ch.wave(); pochaUi.show(); } };
    } else if (interior.tv && Math.hypot(p.x - interior.tv.x, p.z - interior.tv.z) < 2.6) {
      next = { key: 'kpop', label: '📺 ' + t('kpop.open'), run: () => kpop.open() };
    } else if (nearFishing(p)) {
      next = { key: 'fish', label: '🎣 ' + t('fish.open'), run: () => openFishing() };
    } else if (interior.ramen && Math.hypot(p.x - interior.ramen.x, p.z - interior.ramen.z) < 1.8) {
      next = { key: 'ramen', label: '🍜 ' + t('ramen.open'), run: () => ramenUi.show() };
    } else if ((interior.store.workshop === 'salon' || interior.store.workshop === 'clinic') && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      const kind = interior.store.workshop;
      next = { key: kind, label: (kind === 'salon' ? '💇 ' : '✨ ') + t(kind + '.open'), run: () => openBeauty(kind) };
    } else if (interior.store.workshop === 'fishmarket' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'market', label: '🐟 ' + t('fish.sellOpen'), run: () => openMarket() };
    } else if (clubState && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 4.5) {
      next = { key: 'club', label: '🎧 ' + L(CLUB_TEXT.open), run: () => openClubPanel() };
    } else if (clubState && !seated) { // anywhere on the club floor: dance to the beat
      next = { key: 'dance:' + dancing, label: (dancing ? '🛑 ' : '💃 ') + L(dancing ? DANCE_TEXT.stop : DANCE_TEXT.start), run: () => { dancing = !dancing; if (dancing) missionEvent('dance'); action = STALE; } };
    } else if (interior.turntable && Math.hypot(p.x - interior.turntable.x, p.z - interior.turntable.z) < 2) {
      next = { key: 'lp', label: '💿 ' + t('lp.open'), run: () => openLpPanel() };
    } else if (interior.store.workshop === 'bike' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'bikeshop', label: '🚲 ' + L(BIKE_TEXT.open), run: () => { clerk.ch.wave(); openBikeShop(); } };
    } else if (interior.store.workshop === 'grill' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'grill', label: '🥓 ' + t('grill.open'), run: () => openGrill() };
    } else if (interior.store.workshop === 'order' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'order', label: '🍢 ' + t('order.start'), run: () => openOrder() };
    } else if (interior.store.workshop === 'emblem' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'emblem', label: '🏷️ ' + t('emblem.open'), run: () => { clerk.ch.wave(); emblemUi.show(); } };
    } else if (interior.store.workshop === 'info' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'info', label: 'ℹ️ ' + t('info.open'), run: () => { clerk.ch.wave(); infoUi.show(); } };
    } else if (interior.store.workshop === 'hat' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'hat', label: '🧢 ' + t('hat.make'), run: () => openHatWorkshop() };
    } else if (clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.2) {
      next = { key: 'clerk', label: '👋 ' + t('npc.hi', { name: clerk.name }), run: () => { clerk.ch.wave(); const lines = PHRASES[interior?.store.category === 'library' ? 'library' : interior?.store.category === 'school' ? 'school' : 'shop']; say(clerk, $('labels'), lines[Math.floor(Math.random() * lines.length)]); } };
    } else if (interior.pets?.nearest(p.x, p.z)) {
      const pet = interior.pets.nearest(p.x, p.z);
      next = { key: 'pet:' + pet.name, label: '🐾 ' + t('pet.pat', { name: Pets.label(pet) }), run: () => { interior.pets.pet(pet, p.x, p.z); showBubble(myLabel, $('labels'), '😻'); missionEvent('pet'); } };
    } else if (hi5Target(p)) {
      next = hi5Action(hi5Target(p));
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
      if (moved > 3) { routePoly = null; routeTimer = 0; }
      if (Math.hypot(guide.x - p.x, guide.z - p.z) < 25) o.pause = Math.max(o.pause || 0, 1);
    }
  }
  const dx = guide.x - p.x, dz = guide.z - p.z;
  const dist = Math.hypot(dx, dz);
  // Plan a route once; then just trim the part already walked, and plan
  // again only when we wander off it.
  routeTimer -= dt;
  if (routeTimer <= 0) {
    routeTimer = 0.5;
    if (!routePoly || nearestOnPoly(routePoly, p.x, p.z).d > 6) routePoly = planRoute(p.x, p.z, guide.x, guide.z);
    else routePoly = trimPoly(routePoly, p.x, p.z);
    const poly = routePoly;
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
  // Arrived: close by, and not just on the other side of a wall.
  if (dist < (guide.kind === 'npc' ? 2.5 : 6) && routeLen < 10) {
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

function guardPosition() {
  const r = me.root.position;
  const bad = ![r.x, r.y, r.z, cam.yaw, cam.pitch, cam.dist].every(Number.isFinite);
  if (!bad) { lastGood.x = r.x; lastGood.z = r.z; lastGood.yaw = cam.yaw; lastGood.ok = true; return; }
  reportProblem(`position reset (x=${r.x}, z=${r.z}, yaw=${cam.yaw}, mode=${mode}, riding=${riding}, wx=${weather.kind}, speed=${wxSpeed()}, gym=${gymLog.boost})`);
  r.set(lastGood.x, 0, lastGood.z);
  cam.yaw = lastGood.yaw;
  if (!Number.isFinite(cam.pitch)) cam.pitch = 0.42;
  if (!Number.isFinite(cam.dist)) cam.dist = 9;
  if (!lastGood.ok && square) r.set(square.x, 0, square.z + 3);
}
renderer.setAnimationLoop(() => {
  guardPosition();
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
  const px0 = p.x, pz0 = p.z; // to measure how far my bike went this frame
  if (riding === 3) {
    // On someone's back seat: ride along behind them, pedalling at their pace.
    const front = others.predicted(tandemDriver);
    if (!front) tandemGone(tandemDriver);
    else {
      const ox = p.x, oz = p.z;
      const [sx, sz] = seatPosition(front, others.kindOf(tandemDriver), mySeat);
      // Follow the driver's live (predicted) spot; light smoothing hides the
      // small corrections when a new update arrives.
      const k = 1 - Math.exp(-dt * 25);
      p.set(ox + (sx - ox) * k, 0, oz + (sz - oz) * k);
      me.root.rotation.y = front.rotation.y;
      speed01 = THREE.MathUtils.lerp(speed01, Math.min(1, Math.hypot(p.x - ox, p.z - oz) / dt / BIKE), Math.min(1, dt * 5));
    }
  }
  if (mode === 'store') interior?.tick?.(dt); // amusement park rides
  updateRide(dt);
  if (seated && mag > 0.3) standUp();
  if (dancing && (mag > 0.3 || !clubState)) { dancing = false; action = STALE; }
  me.activity(currentActivity());
  if (autoWalk && mag > 0.05) setAutoWalk(false); // the player took over
  const running = updateStamina(dt, input.run && !riding, mag > 0.05 && !seated);
  if (mag > 0.05 && !seated && !ride && riding !== 3) {
    walkedFor += dt;
    if (walkedFor > 0.8) dismissHelp();
    const inStore = mode === 'store';
    const speed = (riding ? rideSpeed() : (running ? (inStore ? STORE_RUN : RUN) : (inStore ? STORE_WALK : WALK)) * gymLog.boost) * Math.min(1, mag) * wxSpeed();
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
    speed01 = THREE.MathUtils.lerp(speed01, Math.min(1, speed / (riding ? rideSpeed() : inStore ? STORE_RUN : RUN)), Math.min(1, dt * 10));
  } else if (autoWalk && routePoly?.length > 1 && mode === 'street' && !seated && riding !== 3) {
    // Head for the route point about 2.5 m ahead (pure pursuit), on foot or by bike.
    const [tx, tz] = pointAhead(routePoly, p.x, p.z, 2.5);
    const ddx = tx - p.x, ddz = tz - p.z, dl = Math.hypot(ddx, ddz) || 1;
    const running = updateStamina(dt, input.run && !riding, true);
    const speed = (riding ? rideSpeed() : (running ? RUN : WALK) * gymLog.boost) * wxSpeed();
    // Stuck on a wall corner? Side-step for a moment, then try again.
    let ux = ddx / dl, uz = ddz / dl;
    if (autoSide.t > 0) { autoSide.t -= dt; [ux, uz] = [ux * 0.3 - uz * autoSide.dir, uz * 0.3 + ux * autoSide.dir]; }
    const [nx, nz] = activeCollision.move(p.x, p.z, ux * speed * dt, uz * speed * dt, PLAYER_R);
    const progressed = Math.hypot(nx - p.x, nz - p.z) > speed * dt * 0.3;
    autoSide.stuck = progressed ? 0 : autoSide.stuck + dt;
    if (autoSide.stuck > 0.5) { autoSide.stuck = 0; autoSide.t = 0.7; autoSide.dir = -autoSide.dir || 1; routePoly = null; routeTimer = 0; }
    p.x = nx; p.z = nz;
    let d = Math.atan2(ddx, ddz) - me.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    me.root.rotation.y += d * Math.min(1, dt * 8);
    speed01 = THREE.MathUtils.lerp(speed01, speed / (riding ? rideSpeed() : RUN), Math.min(1, dt * 10));
  } else if (riding !== 3) {
    speed01 = THREE.MathUtils.lerp(speed01, 0, Math.min(1, dt * 10));
  }
  me.animate(dt, speed01 < 0.05 ? 0 : speed01, !!seated || !!ride);
  if (riding === 1 && mode === 'street' && garage.ride(Math.min(5, Math.hypot(p.x - px0, p.z - pz0)))) shop.toast(L(BIKE_TEXT.worn));

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
  const cy = p.y + 1 + Math.sin(cam.pitch) * cam.dist * Math.min(1, camHoriz / (Math.cos(cam.pitch) * cam.dist));
  camera.position.lerp(tmp.set(cx, cy, cz), 1 - Math.exp(-dt * 12));
  camera.lookAt(p.x, p.y + (hatDraft || beautyCam ? 0.05 : 1.1), p.z); // workshop: character sits above the panel
  if (DEBUG_TOP) {
    camera.position.set(p.x, DEBUG_TOP, p.z + DEBUG_TOP * 0.35);
    camera.lookAt(p.x, 0, p.z);
  }

  const tSec = timer.getElapsed();
  me.setUmbrella(umbrellaOpen());
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
  updatePet(dt, p);
  if (fishingUi.open && !nearFishing(p)) fishingUi.close(); // walked away from the water
  if (interior?.turntable && music.on) interior.turntable.platter.rotation.y -= dt * 3.5; // 33⅓ rpm
  if (mode === 'store' && interior?.animate) interior.animate(dt, clubPulse()); // club lights, candles
  updateMeal();
  if (mode === 'store') interior?.see?.(p.x, p.z); // walk-in rooms turn see-through
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
  lastSpotTimer -= dt;
  if (lastSpotTimer <= 0) { lastSpotTimer = 3; rememberSpot(); }
  sendTimer -= dt;
  idleTimer -= dt;
  if (sendTimer <= 0) {
    const st = {
      x: Math.round(p.x * 100) / 100,
      z: Math.round(p.z * 100) / 100,
      ry: Math.round(me.root.rotation.y * 100) / 100,
      s: Math.round(speed01 * 100) / 100,
    };
    if (seated || ride) st.sit = 1;
    if (riding) st.bk = riding;
    if (riding === 3) { st.on = tandemDriver; st.seat = mySeat; }
    if (heldKind()) st.hd = heldKind();
    if (me.activityName) st.ac = me.activityName;
    if (umbrellaOpen()) st.um = 1;
    if (pet) st.pt = pet.id;
    const changed = !lastSent || st.x !== lastSent.x || st.z !== lastSent.z || st.ry !== lastSent.ry || st.s !== lastSent.s || st.sit !== lastSent.sit || st.bk !== lastSent.bk || st.on !== lastSent.on || st.seat !== lastSent.seat || st.hd !== lastSent.hd || st.um !== lastSent.um || st.pt !== lastSent.pt;
    if (changed || idleTimer <= 0) {
      net.sendState(st);
      lastSent = st;
      idleTimer = config.netIdleInterval;
    }
    // Carrying passengers: send more often so their seats keep up.
    sendTimer = 1 / (passengers.size ? 12 : running ? config.netSendRateRun : config.netSendRate);
  }

  const w = innerWidth, h = innerHeight;
  others.update(dt, camera, w, h);
  if (mode === 'street') npcs.update(dt, camera, w, h);
  else if (clerk) { clerk.ch.animate(dt, 0); placeLabels(clerk, camera, w, h); }
  if (squareNpc) {
    if (mode === 'street') { squareNpc.ch.animate(dt, 0); placeLabels(squareNpc, camera, w, h); }
    else for (const el of [squareNpc.tag, squareNpc.bubble]) if (el) el.style.display = 'none';
  }
  billboard?.update(dt);
  for (const ws of wallScreens) ws.update(dt);
  if (mode === 'store') interior.pets?.update(dt, me.root.position);
  guardPosition();
  tmp.set(p.x, 1.55, p.z).project(camera);
  const lx = (tmp.x * 0.5 + 0.5) * w, ly = (-tmp.y * 0.5 + 0.5) * h;
  myTag.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly}px)`;
  if (myLabel.bubble) myLabel.bubble.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly - 24}px)`;

  renderer.render(activeScene, camera);
  // The canvas has an alpha channel (for the K-POP screen hole), but see-
  // through things (signs, glass) would leave it below 1 and let the page
  // show through: make every pixel opaque, then cut the hole.
  const gl = renderer.getContext();
  gl.colorMask(false, false, false, true);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.colorMask(true, true, true, true);
  renderer.resetState();
  if (kpopHole.visible) {
    renderer.autoClear = false;
    renderer.render(holeScene, camera);
    renderer.autoClear = true;
  }
  if (snapReq) { // photo booth: copy the frame now, before the buffer is cleared
    // The middle of the view, where the booth is (photo cells are 32:22).
    const src = renderer.domElement, W = src.width, H = src.height;
    const cw = Math.min(W, H * 1.1), ch = cw * 22 / 32;
    const c = document.createElement('canvas');
    c.width = Math.round(cw); c.height = Math.round(ch);
    c.getContext('2d').drawImage(src, (W - cw) / 2, Math.max(0, H * 0.52 - ch / 2), cw, ch, 0, 0, c.width, c.height);
    snapReq(c);
    snapReq = null;
  }
  updateDelivery();
  // The K-POP café's video, on the wall screen.
  placeKpopVideo(kpop.song && interior?.tv);
});

// The player sits BEHIND the canvas; while a song is on, the wall screen is
// drawn as a see-through hole, so the video shows only there and people in
// front of the TV still cover it. The player box is fitted to the screen's
// corners with a flat (2D) transform: no 3D transforms, which can drop video
// on iPhones.
const KPOP_W = 640, KPOP_H = 360;
// The hole: drawn after the café (depth-tested, so people in front of the
// TV still cover it), writing transparent black.
const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000, blending: THREE.NoBlending });
holeMat.opacity = 0;
const holeScene = new THREE.Scene();
const kpopHole = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), holeMat);
kpopHole.visible = false;
holeScene.add(kpopHole);
let kpopLast = '';
function placeKpopVideo(tv) {
  let ok = !!tv;
  if (tv) {
    tv.screen.updateMatrixWorld();
    kpopHole.matrixAutoUpdate = false;
    kpopHole.matrix.copy(tv.screen.matrixWorld).multiply(new THREE.Matrix4().makeScale(tv.width, tv.screen.geometry.parameters.height, 1));
    kpopHole.matrixWorld.copy(kpopHole.matrix);
    const p = tv.screen.position, hw = tv.width / 2, hh = tv.screen.geometry.parameters.height / 2;
    const c = [[-hw, hh], [hw, hh], [-hw, -hh], [hw, -hh]].map(([dx, dy]) => { // TL, TR, BL, BR
      tmp.set(p.x + dx, p.y + dy, p.z).project(camera);
      if (tmp.z > 1) ok = false; // behind the camera
      return [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight];
    });
    const [tl, tr, bl, br] = c;
    const ex = [(tr[0] - tl[0] + br[0] - bl[0]) / 2, (tr[1] - tl[1] + br[1] - bl[1]) / 2];
    const ey = [(bl[0] - tl[0] + br[0] - tr[0]) / 2, (bl[1] - tl[1] + br[1] - tr[1]) / 2];
    const cx = (tl[0] + tr[0] + bl[0] + br[0]) / 4, cy = (tl[1] + tr[1] + bl[1] + br[1]) / 4;
    const k = 1.06; // a little bigger than the hole, so its edges never show the café
    const m = [ex[0] / KPOP_W * k, ex[1] / KPOP_W * k, ey[0] / KPOP_H * k, ey[1] / KPOP_H * k];
    m.push(cx - (ex[0] + ey[0]) / 2 * k, cy - (ex[1] + ey[1]) / 2 * k);
    const css = `matrix(${m.map((v) => v.toFixed(4)).join(',')})`;
    if (css !== kpopLast) { kpopLast = css; kpopVideo.style.transform = css; }
  }
  kpopHole.visible = ok;
  if (kpopLayer.hidden === ok) kpopLayer.hidden = !ok;
}

updateStreetCard();

// Test hooks (only with ?debug in the URL).
if (new URLSearchParams(location.search).has('debug')) {
  window.__mk = {
    enter: (id) => enterStore(storefronts.get(id)),
    leave: () => leaveStore(),
    seats: () => interior?.seats?.length ?? 0,
    sit: (i) => sitDown(interior.seats[i]),
    seated: () => !!seated,
    bone: (n) => { const b = me.root.getObjectByName(n); if (!b) return null; const v = b.getWorldPosition(new THREE.Vector3()); me.root.worldToLocal(v); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; },
    bookShelf: () => bookUi.showShelf(),
    readBook: (id, page = 0) => { bookPages[id] = page; bookUi.read(id); },
    action: () => action?.label || null,
    act: () => action?.run(),
    decor: () => decor?.items.length ?? -1,
    bikes: () => bikeStations.items.map((b) => [b.x, b.z]),
    riding: () => riding,
    cam: (o) => Object.assign(cam, o),
    ride: (k) => startRide(k),
    place: (x, z) => me.root.position.set(x, 0, z),
    look: () => currentLook,
    mirror: () => { Object.assign(cam, { dist: 2.6, pitch: 0.12 }); me.root.rotation.y = cam.yaw; }, // close-up, facing the camera
    pets: () => interior?.pets?.list.map((p) => [p.name, p.state, +p.root.position.x.toFixed(2), +p.root.position.z.toFixed(2)]) ?? null,
    npcs: () => npcs.list.map((o) => [o.name, o.ch.root.position.x, o.ch.root.position.z]),
    peers: () => [...others.players.values()].map((p) => ({ name: p.name, ...p.target, x: p.ch.root.position.x, z: p.ch.root.position.z, pet: p.pet ? { id: p.pet.id, x: p.pet.root.position.x, z: p.pet.root.position.z, visible: p.pet.root.visible } : null })),
    goto: (x, z, ry = 0) => moveMeTo(activeScene, x, z, ry),
    doorOf: (id) => { const it = storefronts.get(id); return [it.door.x, it.door.z, it.group.rotation.y]; },
    stores: () => storefronts.items.map((i) => i.store.id),
    storePos: () => storefronts.items.map((i) => [i.store.id, +i.group.position.x.toFixed(1), +i.group.position.z.toFixed(1)]),
    zones: () => zones.items.map((i) => [i.zone.id, i.x, i.z]),
    me: () => [me.root.position.x, me.root.position.z, me.root.rotation.y, cam.yaw],
    clerk: () => (clerk ? [clerk.ch.root.position.x, clerk.ch.root.position.z] : null),
    product: (i) => shop.openProduct(interior.products[i].product),
    held: () => held && { ...held },
    heldKind: () => heldKind(),
    kpop: () => kpop.song && { id: kpop.song.id, at: Math.round(kpop.position) },
    quest: () => quests.active && { ...quests.active, ready: quests.ready(questCtx()), left: quests.left },
    guide: () => squareNpc && [squareNpc.ch.root.position.x, squareNpc.ch.root.position.z],
    billboard: () => billboard && [billboard.root.position.x, billboard.root.position.z],
    boards: () => noticeBoards.map((b) => [b.board, b.x, b.z]),
    wallScreens: () => wallScreens.map((w) => [w.root.position.x, w.root.position.y, w.root.position.z, w.root.rotation.y]),
    billboardFrame: () => billboard?.canvas.toDataURL('image/png'),
    look: () => ({ ...currentLook }),
    fish: () => ({ ...fishBag.c }),
    addFish: (id) => fishBag.add(id),
    fishing: () => fishingUi.state,
    spots: () => interior?.fishing?.map((f) => [f.x, f.z]) || null,
    ramenSpot: () => interior?.ramen && [interior.ramen.x, interior.ramen.z],
    music: () => ({ on: music.on, track: music.track.id }),
    pet: () => pet && { id: pet.id, x: pet.root.position.x, z: pet.root.position.z, visible: pet.root.visible },
    petPoop: () => { if (pet) pet.walked = pet.poopAt; },
    poops: () => poopTimers.list.map((x) => ({ ...x, x: poops.get(x.id)?.x, z: poops.get(x.id)?.z })),
    poopTime: (s) => poopTimers.list.forEach((x) => { x.left = s; }),
    coins: (n) => (n == null ? wallet.coins : wallet.add(n - wallet.coins)),
    turntable: () => interior?.turntable && [interior.turntable.x, interior.turntable.z],
    blocked: (x, z) => collision.blocked(x, z, PLAYER_R),
    route: (ax, az, bx, bz) => planRoute(ax, az, bx, bz),
    guideTo: (id) => guideToPlace({ store: id }),
    guiding: () => !!guide,
    routeCheck: (ax, az) => storefronts.items.map((it) => {
      const t0 = performance.now();
      const poly = planRoute(ax, az, it.door.x, it.door.z);
      const ms = Math.round(performance.now() - t0);
      let bad = 0, worst = null;
      for (let i = 1; i < poly.length; i++) {
        const [x1, z1] = poly[i - 1], [x2, z2] = poly[i];
        const n = Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 0.5);
        for (let k = 0; k <= n; k++) { const x = x1 + (x2 - x1) * k / n, z = z1 + (z2 - z1) * k / n; if (collision.blocked(x, z, 0.2)) { bad++; worst ||= [Math.round(x), Math.round(z), i, poly.length]; } }
      }
      return [it.store.id, bad, worst, ms, poly.length];
    }),
    missions: () => daily.missions.map((m) => ({ ...m })),
    mission: (type, target) => missionEvent(type, target),
  };
}
