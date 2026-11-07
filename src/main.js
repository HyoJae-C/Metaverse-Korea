import { haptics, buzz, shake } from './core/haptics.js';
import { RodSkins, rodKind, rodSkin } from './core/rod-skins.js';
import * as THREE from 'three';
import { setBeat } from './core/model-pack.js';
import {
  LANGUAGES, t, setLanguage, getSavedLanguage, getLanguage, onLanguageChange, localName,
} from './core/i18n.js';
import { REGION_NAMES } from './i18n/strings.js';
import { loadRegionMap, districtBoxes, districtAt, placeOf } from './core/districts.js';
import { SquareQuests, QUEST_REWARD, STARTER, STARTER_REWARD } from './core/quests.js';
import { STARTER_TEXT } from './data/starter-quests.js';
import { HighFives, hi5Msg, parseHi5, crowdBonus, TOGETHER_COINS, TOGETHER_RADIUS } from './core/together.js';
import { Billboard } from './core/billboard.js';
import { WallScreen, wallNear } from './core/wall-screen.js';
import { LocalBoard, SupabaseBoard } from './core/board.js';
import { makeNoticeBoard, makeNewTag } from './core/notice-board-model.js';
import { useGoldCoins } from './ui/gold-coin.js';
useGoldCoins(); // 🪙 shows as a gold coin everywhere
import { BoardUI, BOARD_TEXT } from './ui/board-ui.js';
import { buildWorld, COLORS, onAnyRoad } from './core/world.js';
import { buildLandmarks } from './core/landmarks.js';
import { setParkSignsLang } from './core/park-signs.js';
import { benchSeats, sculptureNear, hillY, ICECREAM, ICECREAM_TEXT } from './core/park-art.js';
import { buildStreams, streetBlockers as streamStreetBlockers, lowBlockers as streamLowBlockers, holesOf as streamHoles, streamAt, edgeSeats } from './core/stream.js';
import { styleNameTag, EmblemCollection } from './core/emblems.js';
import { EmblemUI, RENAME_COST } from './ui/emblem-ui.js';
import { InfoUI, showInfoHint, INFO_TEXT, AREA } from './ui/info-ui.js';
import { SaunaUI } from './ui/sauna-ui.js';
import { SaunaLog } from './core/sauna.js';
import { GymUI } from './ui/gym-ui.js';
import { GymLog, TRAINER_NAME, TRAINER_LINES, nextTrainerLine } from './core/gym.js';
import { saveLastSpot, loadLastSpot, usableSpot } from './core/respawn.js';
import { BookUI } from './ui/book-ui.js';
import { AcademyUI } from './ui/academy-ui.js';
import { Academy } from './core/academy.js';
import { bookById } from './core/books.js';
import { FoodDex, isFood, allFoods } from './core/food-dex.js';
import { DexUI, DEX_TEXT } from './ui/dex-ui.js';
import { STAMPS } from './data/stamps.js';
import { StampBook, availableStamps, STAMP_REWARD } from './core/stamp-book.js';
import { StampStands } from './core/stamp-stands.js';
import { StampUI, STAMP_TEXT } from './ui/stamp-ui.js';
import { PalaceShow } from './core/palace-show.js';
import { RIDES as PARK_RIDES, RIDE_COST, rideUntil, seatAt } from './core/themepark.js';
import { CABLE, CC, cabinAt, cabinPos, boardSpot, doorsOpen, arrivesIn, cableClock, nearLoveLock } from './core/cablecar.js';
import { LocalLoveLocks, SupabaseLoveLocks } from './core/love-locks.js';
import { LoveLockUI, LOCK_TEXT } from './ui/love-lock-ui.js';
import { WISH, WISHES, canFloat, encodeLantern, decodeLantern, lanternAt, muralSign, wishFrom, wishTo } from './core/lanterns.js';
import { WishUI, WISH_TEXT } from './ui/wish-ui.js';
import { createCharacter } from './core/character.js';
import { createLookEditor, saveLook } from './core/look-editor.js';
import { PALETTES, PATCHES, HAT_SHAPES, accessory, OUTFIT_ITEM } from './data/appearance.js';
import { CollisionMap, distSqToSeg } from './core/collision.js';
import { Input } from './core/input.js';
import { RemotePlayers, showBubble, showBubbleEl } from './core/players.js';
import { createAreaNet } from './net/area.js';
import { claimTab } from './core/single-tab.js';
import { watchOnline } from './net/online.js';
import { startWhereReports } from './net/where.js';
import { startUpdateCheck } from './core/update-check.js';
import { showUpdateBanner } from './ui/update-banner.js';
import { config } from './config.js';
import { getEmote, ownedPacks } from './data/emotes.js';
import { WeatherSystem, WET, weatherSpeed } from './core/weather.js';
import { Storefronts, latLonToLocal as llToLocal } from './core/storefronts.js';
import { AdPosters } from './core/ad-posters.js';
import { Zones } from './core/zones.js';
import { buildInterior } from './core/interior.js';
import { isDining, coinPrice, foodIcon, FOOD_BITES, mealSync, parseBite } from './core/dining.js';
import { FURNITURE, furnitureById, buildFurniture, furnitureCollider } from './core/furniture.js';
import { ShopUI, Cart, howToGet, coinsFor, RENT, goodsKind, itemSoon } from './ui/shop-ui.js';
import { hanbokById, isHanbokModel, RENT_HOURS } from './data/hanbok.js';
import { loadRental, saveRental, startRental, endRental, checkRental, timeLeft, isRenting, formatLeft } from './core/hanbok-rental.js';
import { GiftBox, giftMsg, parseGift, GIFTS_PER_DAY } from './core/gifts.js';
import { GiftUI, GIFT_TEXT } from './ui/gift-ui.js';
import { OrderUI } from './ui/order-ui.js';
import { GrillUI } from './ui/grill-ui.js';
import { RamenUI } from './ui/ramen-ui.js';
import { KimchiUI } from './ui/kimchi-ui.js';
import { KimchiSellUI, ML as MARKET_L } from './ui/kimchi-sell-ui.js';
import { MuseumUI, MUSEUM_TEXT } from './ui/museum-ui.js';
import { nearestPainting, museumFloorStore, floorOf } from './core/museum.js';
import { HAUNT_STORE, HAUNT_SPOT } from './core/haunted.js';
import { BOSS_LINES } from './ui/market-text.js';
import { kimchiJar } from './core/kimchi-market.js';
import { KT as KIMCHI_TEXT } from './ui/kimchi-text.js';
import { JapchaeUI } from './ui/japchae-ui.js';
import { JT as JAPCHAE_TEXT } from './ui/japchae-text.js';
import { KimbapUI } from './ui/kimbap-ui.js';
import { BT as KIMBAP_TEXT } from './ui/kimbap-text.js';
import { PochaUI, L, fmt } from './ui/pocha-ui.js';
import { Bag, giftEntry } from './core/bag.js';
import { perfumeIndex, Scent, SPRAYS, STYLES, PUFF_NEAR, nextPuff, onSale } from './core/perfume.js';
import { ScentFx } from './core/scent-fx.js';
import { BagUI, BAG_TEXT } from './ui/bag-ui.js';
import { KaraokeUI } from './ui/karaoke-ui.js';
import { PhotoUI } from './ui/photo-ui.js';
import { ClawUI } from './ui/claw-ui.js';
import { TarotUI } from './ui/tarot-ui.js';
import { TarotQueue, parseTarot, tarotMsg } from './core/tarot-queue.js';
import { BuskingZones, TIP, readTips, writeTips, takeTip } from './core/busking.js';
import { buskingGroundY } from './core/busking-layout.js';
import { Skater, parkGround, railNear, inPark, PARK_SPEED, GRIND_NAME, bankPoints, trickPose, TRICK_BY_ID } from './core/skatepark.js';
import { dayKey } from './core/daily.js';
import { initInstall } from './ui/install-ui.js';
import { DuckUI } from './ui/duck-ui.js';
import { makeMascotHead } from './core/mascot.js';
import { UPDATES, updateText, hasNew as hasNewUpdate, newCount as newUpdates } from './data/updates.js';
import { DUCK_SEATS } from './core/park.js';
import { karaokeMsg, parseKaraoke } from './core/karaoke-game.js';
import { DuckRide, DUCK_BUMP } from './core/duck-boat.js';
import { fishCode, forceNextCatch } from './core/fish-luck.js';
import { Contacts, touching, wobble } from './core/bump.js';
import { dartsMsg, parseDarts, dartsGoMsg, parseDartsGo, dartPinMsg, parseDartPin, dartPack, dartColorOf, pickDartColor } from './core/arcade.js';
import { DartPins } from './core/dart-pins.js';
import { pickDelivery, timeFor, deliveryPay, MAX_ROAD } from './core/delivery.js';
import { JOB_TEXT, SHIFTS_PER_DAY, jobOf, shiftsLeft, takeShift, readShifts, writeShifts } from './core/jobs.js';
import { JobUI } from './ui/job-ui.js';
import { hiringTexture, drawHiring, wallPoster, doorSticker, assignSpots } from './core/hiring-ads.js';
import { supportTexture, pickSupportSpots } from './core/support-poster.js';
import { BeautyUI } from './ui/beauty-ui.js';
import { CounterUI, heldFor } from './ui/counter-ui.js';
import { BEAUTY_SHOPS, BEAUTY_ICON, isClinic } from './core/beauty.js';
import { KpopRoom } from './ui/kpop-room.js';
import { parseKpop } from './data/kpop.js';
import { parseFilm } from './data/films.js';
import { FishingUI, FishMarketUI, FishBookUI, trophy, TROPHY_RARITY, fishStampIcon, catchBubble, showMs } from './ui/fishing-ui.js';
import { FishBag, FishDex, FishStats, FISH, fishById } from './core/fishing.js';
import { createFishingRig } from './core/fishing-rig.js';
import { HELD_KINDS, COFFEE_SIPS } from './core/held.js';
import { CloudSave } from './core/cloud-save.js';
import { Inventory, ITEMS, isWorn, redeemCode, isMasterCode, coinCode, eventCode, isEventCode, parseTandem, tandemMsg } from './core/inventory.js';
import { SEATS, seatPosition } from './core/bikes.js';
import { MapView } from './ui/map-view.js';
import { Music, Sfx } from './core/music.js';
import { MotionSound, honkKind, honkMsg, parseHonk, hearGain } from './core/motion-sound.js';
import { taxiFare } from './core/taxi.js';
import { Garage, BIKE_MODELS, bikeModel, repairCost, LOW as BIKE_LOW, RIDE_TYPES, RIDE_ICON as VEHICLE_ICON, SKIN_COLORS, rideCode, RIDE_SHOPS, skinPrice, UPGRADE_MAX, TUNE_STEP, KIT_WEAR } from './core/bike-garage.js';
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
import { cleanName, readIdentity, saveIdentity, isReservedName } from './core/identity.js';
import { customPetName, setPetName, PET_NAME_MAX } from './core/pet-names.js';
import { createPetCare, PET_NAME_TEXT } from './game/pet-care.js';
import { createSubway } from './game/subway.js';
import { createDining, DINE_TEXT } from './game/dining.js';
import { createPicnic, hasMat, MAT_TEXT } from './game/picnic.js';
import { createBeauty } from './game/beauty.js';
import { NavGrid, nearestOnPoly, trimPoly, pointAhead } from './core/nav-grid.js';
import { ALL as FRIENDS_ALL, MAX_BODY as FRIEND_MAX_BODY, Inbox, SupabaseFriends, LocalFriends, convKey, cleanBody as cleanFriendText } from './core/friends.js';
import { FriendsUI, FRIEND_TEXT } from './ui/friends-ui.js';
import { SubwayEntrances, VENDING_DRINKS, gateAt, GATE_X, DOOR_Z, FARE, blockersOf, holeOf, footprintOf, toWorld, outsideOf, PIT } from './core/subway.js';

const BASE = import.meta.env.BASE_URL;
const DEBUG_TOP = Number(new URLSearchParams(location.search).get('top')) || 0;
const $ = (id) => document.getElementById(id);
// The bag's item lists move in and out of the bag panel as its tabs change,
// so they're looked up once (a detached node isn't found by id).
const itemEls = {};
const itemEl = (id) => (itemEls[id] ||= $(id));

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

// Language list: one row per language. On the start screen it is a dropdown
// (the current language on a button; tap it to open the list below).
function renderLangList(el, onPick) {
  el.innerHTML = '';
  for (const l of LANGUAGES) {
    const b = document.createElement('button');
    b.textContent = l.label;
    b.lang = l.code;
    if (l.rtl) b.dir = 'rtl';
    b.setAttribute('aria-pressed', String(l.code === getLanguage()));
    b.onclick = () => onPick(l.code);
    el.appendChild(b);
  }
}
function renderLangDropdown(el, onPick) {
  const cur = LANGUAGES.find((l) => l.code === getLanguage()) || LANGUAGES[0];
  el.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'lang-current';
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span>🌐</span><span class="lang-name"></span><span class="lang-caret">▾</span>';
  btn.querySelector('.lang-name').textContent = cur.label;
  const list = document.createElement('div');
  list.className = 'lang-list';
  list.hidden = true;
  renderLangList(list, onPick);
  btn.onclick = () => {
    list.hidden = !list.hidden;
    btn.setAttribute('aria-expanded', String(!list.hidden));
  };
  el.append(btn, list);
}

function refreshStartText() {
  const lang = getLanguage();
  $('start-region').textContent = t('start.region', {
    region: localName(REGION_NAMES[regionId], lang) || localName(region.name, lang),
    city: localName(REGION_NAMES.seoul, lang),
  });
  const input = $('nickname');
  input.placeholder = t('start.defaultName');
  document.title = t('app.title');
}

setLanguage(getSavedLanguage() || 'en'); // English until you pick one
const pickLang = (code) => {
  setLanguage(code);
  renderLangDropdown($('lang-grid'), pickLang);
  renderLangList($('lang-grid-2'), (c) => {
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
  back: { en: 'Welcome back! Change your name at the name tag workshop, and clothes at the Daily Closet or from your items.', ko: '다시 오셨네요! 이름은 네임택 공방에서, 옷은 데일리 클로젯이나 내 아이템에서 바꿀 수 있어요.', ja: 'おかえりなさい！名前はネームタグ工房で、服はデイリークローゼットかアイテムから変えられます。', zh: '欢迎回来！可以在名牌工坊改名，在日常衣橱或物品里换衣服。', es: '¡Bienvenido de nuevo! Cambia tu nombre en el taller de placas y la ropa en Armario Diario o desde tus objetos.', ar: 'أهلًا بعودتك! غيّر اسمك في ورشة بطاقات الأسماء، وملابسك في خزانة يومية أو من أغراضك.', vi: 'Chào mừng bạn trở lại! Đổi tên ở xưởng bảng tên, còn quần áo thì ở Daily Closet hoặc trong đồ của bạn.', hi: 'फिर से स्वागत है! नाम-टैग वर्कशॉप में अपना नाम बदलें, और कपड़े डेली क्लोज़ेट में या अपनी चीज़ों से।', id: 'Selamat datang kembali! Ganti namamu di bengkel papan nama, dan bajumu di Daily Closet atau dari barangmu.' },
  first: { en: 'Pick a name and a T-shirt colour. Later you can change your name at the name tag workshop, and buy clothes like hoodies or padded coats at the Daily Closet.', ko: '이름과 티셔츠 색을 골라요. 이름은 나중에 네임택 공방에서 바꿀 수 있고, 후드티·패딩 같은 옷은 데일리 클로젯에서 살 수 있어요.', ja: '名前とTシャツの色を選ぼう。名前はあとでネームタグ工房で変えられ、パーカーやダウンなどの服はデイリークローゼットで買えます。', zh: '选择名字和T恤颜色。之后可以在名牌工坊改名，卫衣、羽绒服等衣服可在日常衣橱购买。', es: 'Elige un nombre y el color de tu camiseta. Luego puedes cambiar tu nombre en el taller de placas y comprar ropa como sudaderas o abrigos acolchados en Armario Diario.', ar: 'اختر اسمًا ولون قميص. لاحقًا يمكنك تغيير اسمك في ورشة بطاقات الأسماء، وشراء ملابس مثل الهودي أو المعاطف المنفوخة من خزانة يومية.', vi: 'Chọn tên và màu áo phông. Sau này bạn có thể đổi tên ở xưởng bảng tên, và mua quần áo như áo hoodie hay áo phao ở Daily Closet.', hi: 'एक नाम और टी-शर्ट का रंग चुनें। बाद में नाम-टैग वर्कशॉप में नाम बदल सकते हैं, और डेली क्लोज़ेट से हुडी या पैडेड कोट जैसे कपड़े ख़रीद सकते हैं।', id: 'Pilih nama dan warna kaos. Nanti kamu bisa ganti nama di bengkel papan nama, dan beli baju seperti hoodie atau mantel puffer di Daily Closet.' },
};
const LOGIN_TEXT = {
  title: { en: 'Keep your progress?', ko: '기록을 저장할까요?', ja: '記録を保存しますか？', zh: '要保存进度吗？' },
  text: {
    en: 'Sign in with Google and your coins, items and home are saved to your account, so you can carry on from any device. As a guest, your progress may be lost when the game is updated, or if you clear this browser or switch devices.',
    ko: '구글로 로그인하면 코인, 아이템, 내 집이 계정에 저장돼서 어떤 기기에서든 이어서 할 수 있어요. 게스트는 게임이 업데이트될 때 기록이 사라질 수 있고, 브라우저 기록을 지우거나 기기를 바꿔도 사라질 수 있어요.',
    ja: 'Googleでログインすると、コイン・アイテム・家がアカウントに保存され、どの端末でも続きから遊べます。ゲストの記録は、ゲームのアップデート時や、ブラウザの履歴を消したり端末を変えたときに消えることがあります。',
    zh: '用 Google 登录后，金币、物品和家会保存到账号，在任何设备上都能继续。游客的进度在游戏更新时可能会丢失，清除浏览器记录或换设备也可能丢失。',
  },
  google: { en: 'Sign in with Google (saves)', ko: '구글로 로그인 (저장돼요)', ja: 'Googleでログイン（保存されます）', zh: '用 Google 登录（会保存）' },
  guest: { en: 'Play as a guest', ko: '게스트로 시작', ja: 'ゲストで始める', zh: '以游客身份开始' },
  note: { en: 'You can link Google later in ⚙️ Settings too.', ko: '나중에 ⚙️ 설정에서도 구글을 연결할 수 있어요.', ja: 'あとで ⚙️ 設定からもGoogleを連携できます。', zh: '之后也可以在 ⚙️ 设置里绑定 Google。' },
};
// Made a character here before (mk.made since the start screen remembers it;
// older saves: a look plus a saved spot in town).
const isReturning = () => {
  try { return !!localStorage.getItem('mk.made') || (!!localStorage.getItem('mk.look') && !!localStorage.getItem('mk.lastSpot')); } catch { return false; }
};
const askLogin = () => (cloud.status === 'cloud' && cloud.guest) || new URLSearchParams(location.search).has('login');
function showLook() {
  $('step-lang').hidden = true;
  $('step-login').hidden = true;
  $('step-look').hidden = false;
  editor ||= createLookEditor({ optionsEl: $('look-options'), canvas: $('look-preview'), randomBtn: $('look-random') });
  // Coming back: the character is already made, so no clothes to pick here
  // (change them later at the clothes shop or from your items).
  // Name too: it is kept, and changed at the name tag workshop.
  const returning = isReturning();
  $('step-look').classList.toggle('returning', returning);
  if (returning) {
    $('nickname').value = identity.name || localStorage.getItem('mk.name') || '';
    $('nickname').readOnly = true;
  }
  $('look-lock').textContent = (returning ? '👋 ' : '✨ ') + L(returning ? ID_TEXT.back : ID_TEXT.first);
  $('look-lock').hidden = false;
}
// Made a character already: go straight into town after the language (and
// login) step, with no name or clothes to pick (see startNow below).
let startNow = null;
const lookOrStart = () => (isReturning() && startNow ? startNow() : showLook());
$('next-btn').onclick = () => {
  if (!askLogin()) { lookOrStart(); return; }
  $('step-lang').hidden = true;
  $('step-login').hidden = false;
  $('login-title').textContent = L(LOGIN_TEXT.title);
  $('login-text').textContent = L(LOGIN_TEXT.text);
  $('login-google').textContent = 'G  ' + L(LOGIN_TEXT.google);
  $('login-guest').textContent = L(LOGIN_TEXT.guest);
  $('login-note').textContent = L(LOGIN_TEXT.note);
  // Google's own button where it works (shows this site's name on Google's
  // screen); otherwise the redirect button below stays.
  cloud.renderGoogleButton($('login-google-gis'), () => (freshStart() ? 'signin' : 'link'), {
    locale: gisLocale(),
    onError: (err) => { $('login-note').textContent = t(err === 'taken' ? 'cloud.taken' : 'cloud.notReady'); },
  }).then((ok) => { $('login-google').hidden = ok; });
};
$('login-guest').onclick = lookOrStart;
// Operator badge (🛡️): on the name tag; others see it only once the server
// confirms the name is an operator's (supabase/005_operators.sql).
const OPERATOR_TEXT = {
  on: { en: '🛡️ Operator badge on', ko: '🛡️ 운영자 엠블럼을 달았어요', ja: '🛡️ 運営バッジをつけました', zh: '🛡️ 已戴上运营徽章' },
  off: { en: 'Operator badge off', ko: '운영자 엠블럼을 뗐어요', ja: '運営バッジを外しました', zh: '已摘下运营徽章' },
};
const RESERVED_TEXT = { en: 'Names that look official (operator, admin…) can\'t be used.', ko: '운영자·관리자처럼 공식으로 보이는 이름은 쓸 수 없어요.', ja: '運営・管理者のような公式に見える名前は使えません。', zh: '不能使用像运营、管理员这样看起来官方的名字。' };
const opChecks = new Map(); // name -> Promise<boolean>, once per session
function isOperatorName(name) {
  if (!opChecks.has(name)) opChecks.set(name, cloud.isOperator(name));
  return opChecks.get(name);
}
function styleMyTag(look) { styleNameTag(myTag, nickname, look, { operator: !!look.op, lang: getLanguage() }); }
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
// Progress on this device: link it to Google (same save). A fresh start:
// sign in, which also finds an account used on another device.
const freshStart = () => !localStorage.getItem('mk.name') && !localStorage.getItem('mk.wallet');
const GIS_LOCALE = { zh: 'zh-CN', hant: 'zh-TW' };
const gisLocale = () => GIS_LOCALE[getLanguage()] || getLanguage();
$('login-google').onclick = async () => {
  const err = freshStart() ? await cloud.signInGoogle() : await cloud.linkGoogle();
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
const seoulPromise = optionalJson('seoul.json'); // the gu overview on the map (scripts/build-seoul.mjs)

await new Promise((resolve) => {
  // A new name must not be in use by someone else (checked on the server
  // when it is set up; see supabase/003_names.sql).
  let busy = false;
  const go = async () => {
    if (busy) return;
    const name = cleanName($('nickname').value).trim();
    if (!isReturning() && isReservedName(name)) {
      $('status').textContent = L(RESERVED_TEXT);
      $('nickname').classList.add('bad');
      $('nickname').focus();
      return;
    }
    if (!isReturning() && name) {
      busy = true;
      $('start-btn').disabled = true;
      $('status').textContent = '';
      const r = await cloud.claimName(name);
      busy = false;
      $('start-btn').disabled = false;
      if (r === 'taken') {
        $('status').textContent = t('name.taken');
        $('nickname').classList.add('bad');
        $('nickname').focus();
        return;
      }
    } else if (name) {
      // A name made before names were reserved: reserve it now so newcomers
      // can't take it (no answer needed; an old clash just stays as it is).
      cloud.claimName(name);
    }
    resolve();
  };
  $('nickname').addEventListener('input', () => {
    $('nickname').classList.remove('bad');
    if ($('status').textContent === t('name.taken')) $('status').textContent = '';
  });
  startNow = () => {
    showLook();
    $('step-look').classList.add('quick'); // only the loading line shows
    go();
  };
  // Back from Google sign-in with a character already made: straight in.
  let fromGoogle = false;
  try { fromGoogle = !!sessionStorage.getItem('mk.oauth'); sessionStorage.removeItem('mk.oauth'); } catch { /* ignore */ }
  if (fromGoogle && isReturning()) startNow();
  $('start-btn').onclick = go;
  // Note: a handler body, not an expression. Returning false from an
  // on-handler cancels the key, which blocked typing in this field.
  $('nickname').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.isComposing) go();
  };
});
$('status').textContent = '';
// Locked name/character win over whatever the form says; a new choice
// starts its lock.
// Costumes are bought now, so only the name is locked.
if (!isReturning()) {
  identity = { ...identity, name: cleanName($('nickname').value).trim(), nameAt: Date.now() };
  saveIdentity(identity);
}
try { localStorage.setItem('mk.made', '1'); } catch { /* ignore */ }
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

let nickname = filterText((cleanName($('nickname').value).trim() || t('start.defaultName')).slice(0, 16));
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

// Subway stations (region.json "subway.stations"): stair exits cut into the ground.
const subwayStations = (region.subway?.stations || []).filter((st) => st.exits?.length);
const allExits = subwayStations.flatMap((st) => st.exits);
// Sunken streams (map "streams", core/stream.js): on the street the channel is
// a wall that only bridges cross; down by the water you use streamCollision.
const streams = map.streams || [];
const streamWalls = streams.flatMap(streamStreetBlockers);
const collision = new CollisionMap(map.buildings.concat(map.blockers || [], allExits.flatMap(blockersOf), streamWalls)); // blockers: rivers, walls
const treeCollision = allExits.length || streams.length ? new CollisionMap(map.buildings.concat(map.blockers || [], allExits.map((e) => footprintOf(e)), streamWalls)) : collision;
const streamCollision = new CollisionMap(streams.flatMap(streamLowBlockers));
const { bounds, obstacles: lawnObstacles, treeSpots } = buildWorld(map, scene, { lowSpec: lowSpec || !!softwareGL, collision: treeCollision, holes: allExits.map(holeOf).concat(streams.flatMap(streamHoles)) });
const streamModels = buildStreams(streams, scene);
const subwayEntrances = subwayStations.map((st) => new SubwayEntrances(scene, st));
renderer.localClippingEnabled = true; // the station's train stays inside the hall
const landmarks = buildLandmarks(map.landmarks, scene); // palace gates, halls, statues (hand-made districts)
const streetSeats = benchSeats(map.landmarks).concat(edgeSeats(streams)); // park benches (Seoul Forest) and the edge of the water down by a stream
const storeData = [...((await storesPromise)?.stores || []), ...((await homesPromise)?.homes || [])];
const zoneData = (await zonesPromise)?.zones || [];
const perfumes = perfumeIndex(storeData); // perfume shops' bottles, by product id
const storefronts = new Storefronts(scene, storeData, map, region.center, collision);
// Empty shop lots get ad posters (region.json "adPosters" books a spot).
const adPosters = new AdPosters(scene, map.buildings, storeData, region.center, llToLocal, region.adPosters || {}, import.meta.env.BASE_URL || '/', region.storePosters || {});
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
// Busking zones (region.json "busking"), e.g. Hongdae Walking Street: a singer, K-pop dancers, a crowd, a song.
// Gyeongbokgung performances: the fan dance in front of Geunjeongjeon and
// the mask dance with a lion in front of Gwanghwamun (core/palace-show.js).
const palaceAt = (region.districts || []).find((d) => d.id === 'gyeongbokgung')?.offset;
const palaceShow = palaceAt ? new PalaceShow(scene, {
  fan: [palaceAt[0], palaceAt[1] - 150], // Geunjeongjeon's courtyard
  mask: [palaceAt[0], palaceAt[1] + 52], // on the square, just before King Sejong's statue
  rope: [palaceAt[0] - 18, palaceAt[1] + 46], // the tightrope beside it
  guards: [[palaceAt[0] - 14, palaceAt[1] + 11, 0], [palaceAt[0] + 14, palaceAt[1] + 11, 0]], // either side of Gwanghwamun
  layer: $('labels'),
}) : null;
// Stamp tour (data/stamps.js): a stamp stand at each place. A stand beside a
// shop only appears once that shop is on the map.
const tourStamps = availableStamps(STAMPS, (id) => !!storefronts.get(id));
const stampStands = new StampStands(scene, tourStamps, (id) => storefronts.get(id));
const busking = new BuskingZones(scene, $('labels'), region.busking || [], { findFreeSpot, showBubble });

// The main square (the first meeting zone): a guide who hands out errands
// that end back here (광장 미션), and a big screen (전광판) for ads.
const quests = new SquareQuests();
const square = zones.items[0] || null;
let squareNpc = null, billboard = null;
// Big screens on building walls (region.json "screens").
const wallScreens = [];
for (const sc of region.screens || []) {
  const near = wallNear(map.buildings, sc.at[0], sc.at[1]);
  if (!near) continue;
  const along = sc.along || 0; // slide sideways along the wall
  const wall = { ...near, x: near.x + near.ax * along, z: near.z + near.az * along };
  const w = Math.min(sc.w || 20, wall.len - 2), h = sc.h || w / 2;
  const y = Math.min(sc.y ?? 10, Math.max(3, wall.h - h - 2));
  const ws = new WallScreen({ w, h, image: sc.image ? (import.meta.env.BASE_URL || '/') + sc.image : null, city: sc.city, text: sc.text });
  ws.mount(wall, y, h);
  scene.add(ws.root);
  wallScreens.push(ws);
}
if (square) {
  const face = (x, z) => Math.atan2(square.x - x, square.z - z);
  squareNpc = makeNpc($('labels'), '❗ ' + t('quest.guide'));
  squareNpc.ch.setMascot(makeMascotHead()); // a big plush animal head: easy to spot
  squareNpc.tag.classList.add('square-guide');
  squareNpc.labelY = 1.95; // above the costume head
  squareNpc.ch.activity('dance'); // dances while waiting: easy to spot
  const [gx, gz] = findFreeSpot(square.x + 2.4, square.z + 1.6);
  squareNpc.ch.root.position.set(gx, 0, gz);
  squareNpc.ch.root.rotation.y = face(gx, gz);
  scene.add(squareNpc.ch.root);
  const lang = getLanguage();
  billboard = new Billboard(storeData.filter((s) => s.category !== 'home').map((s) => ({
    title: s.name.ko, sub: localName(s.tagline || {}, lang), bg: s.colors.sign, tag: t('quest.adTag'),
  })), { label: '게임 관련 및 기타 문의', icon: '📷', handle: 'Instagram @hyojae.t' });
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
  // Best: at the far (north) end of the paved square, on its long axis,
  // facing down the whole square, so everyone arriving sees it.
  const pv0 = square.zone.pave;
  if (pv0) {
    const ax = Math.sin(pv0.ry || 0), az = Math.cos(pv0.ry || 0);
    for (let d = pv0.l / 2 - 5; d > 8 && !spot; d -= 1.5) {
      const x = square.x - ax * d, z = square.z - az * d;
      if (fits(x, z, face(x, z))) spot = [x, z];
    }
  }
  if (!spot) for (const r of [9, 11, 13, 15, 18, 22]) {
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
// Notice boards at one end of the square, facing it: free board, inquiries,
// and the update board (with a NEW tag while unread). They stand either side
// of the middle, clear of the walkway to Café Street.
const noticeBoards = [];
let newsTag = null;
if (square) {
  const ry = square.zone.pave?.ry || 0;
  const ax = Math.sin(ry), az = Math.cos(ry), nx = az, nz = -ax; // along / across the square
  const far = square.zone.pave ? square.zone.pave.l / 4 : 10;
  for (const [board, side, color] of [['news', -8.2, '#e0a020'], ['free', -4.8, '#2f6fd6'], ['ask', 4.8, '#d8452f']]) {
    const x = square.x + ax * far + nx * side, z = square.z + az * far + nz * side;
    const m = makeNoticeBoard(board === 'news' ? '📢 업데이트 소식' : BOARD_TEXT[board].ko, color); // signs in Korean, like the shop signs
    if (board === 'news') { newsTag = makeNewTag(); newsTag.position.set(0, 3.75, 0.1); newsTag.visible = false; m.add(newsTag); }
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

// First minute for new players: start next to the square guide, high-five
// them, get the first mission, then the info centre is suggested (or just
// explore). 0: high five · 1: getting the mission · 2+: done.
const ONBOARD_KEY = 'mk.onboard';
let onboard = (() => {
  try {
    const v = localStorage.getItem(ONBOARD_KEY);
    if (v != null) return Number(v) || 0;
    return loadLastSpot() ? 2 : 0; // players from before this: skip it
  } catch { return 2; }
})();
const ONBOARD_TEXT = {
  hi5: { en: '👋 Welcome! Give the square guide a 🙌 high five.', ko: '👋 환영해요! 광장 안내원과 🙌 하이파이브 해보세요.', ja: '👋 ようこそ！広場の案内係と🙌ハイタッチしてみよう。', zh: '👋 欢迎！和广场向导🙌击个掌吧。', es: '👋 ¡Bienvenido! Choca los cinco 🙌 con el guía de la plaza.', ar: '👋 أهلًا! قدّم لمرشد الساحة 🙌 كفًّا عالية.', vi: '👋 Chào mừng! Hãy 🙌 đập tay với người hướng dẫn quảng trường.', hi: '👋 स्वागत है! चौक के गाइड को 🙌 हाई-फ़ाइव दें।', id: '👋 Selamat datang! Ajak pemandu alun-alun 🙌 tos.' },
  button: { en: 'High five the guide', ko: '안내원과 하이파이브', ja: '案内係とハイタッチ', zh: '和向导击掌', es: 'Chocar los cinco con el guía', ar: 'كفّ عالية مع المرشد', vi: 'Đập tay với người hướng dẫn', hi: 'गाइड को हाई-फ़ाइव दें', id: 'Tos dengan pemandu' },
  // The guide, before the first mission: visit the info centre first.
  infoTip: { en: 'Before your mission, do drop by the Information Center! It shows you everything you can do.', ko: '미션 전에 광장 앞 안내센터에 꼭 들러 보세요! 할 수 있는 걸 전부 알려줘요.', ja: 'ミッションの前に、ぜひインフォメーションセンターに寄ってみて！できることを全部教えてくれるよ。', zh: '做任务前，一定要先去一趟信息中心！那里会告诉你能做的所有事情。', es: '¡Antes de tu misión, pásate por el Centro de Información! Te enseña todo lo que puedes hacer.', ar: 'قبل مهمتك، مُرّ على مركز المعلومات! سيُريك كل ما يمكنك فعله.', vi: 'Trước khi làm nhiệm vụ, hãy ghé Trung tâm Thông tin nhé! Ở đó có tất cả những gì bạn có thể làm.', hi: 'मिशन से पहले सूचना केंद्र ज़रूर जाएँ! वहाँ वह सब दिखता है जो आप कर सकते हैं।', id: 'Sebelum misimu, mampirlah ke Pusat Informasi! Di sana ada semua yang bisa kamu lakukan.' },
  done: { en: '🙌 Nice! 🪙 +10. Here is your first mission.', ko: '🙌 좋아요! 🪙 +10. 첫 미션을 드릴게요.', ja: '🙌 いいね！🪙 +10。最初のミッションです。', zh: '🙌 太棒了！🪙 +10。这是你的第一个任务。', es: '🙌 ¡Genial! 🪙 +10. Aquí tienes tu primera misión.', ar: '🙌 رائع! 🪙 +10. هذه مهمتك الأولى.', vi: '🙌 Tuyệt! 🪙 +10. Đây là nhiệm vụ đầu tiên của bạn.', hi: '🙌 बढ़िया! 🪙 +10। यह रहा आपका पहला मिशन।', id: '🙌 Mantap! 🪙 +10. Ini misi pertamamu.' },
};
if (onboard === 0 && squareNpc) { // stand next to the guide, facing them
  const g = squareNpc.ch.root;
  // Beside them (not between them and the square's sign post), so the
  // camera behind us sees the guide clearly.
  const sx2 = Math.cos(g.rotation.y), sz2 = -Math.sin(g.rotation.y);
  const [ox, oz] = findFreeSpot(g.position.x + sx2 * 2.2, g.position.z + sz2 * 2.2);
  me.root.position.set(ox, 0, oz);
  me.root.rotation.y = Math.atan2(g.position.x - ox, g.position.z - oz);
}
function setOnboard(n) {
  onboard = n;
  try { localStorage.setItem(ONBOARD_KEY, String(n)); } catch { /* storage blocked */ }
}
function onboardHi5() {
  setOnboard(1);
  $('info-hint').hidden = true;
  me.play('wave');
  squareNpc.ch.wave();
  showBubble(myLabel, $('labels'), '🙌');
  sfx.pop?.();
  wallet.add(10, { k: 'ledger.quest' });
  refreshWallet();
  shop.toast(L(ONBOARD_TEXT.done));
  action = STALE;
  quests.skipHighFive(); // that was today's high five
  quests.beginStarter(); // then the first path: errands near the square that each teach one thing
  // First the guide recommends the info centre, then gives the first mission.
  setTimeout(() => {
    say(squareNpc, $('labels'), ['미션 전에 안내센터에 꼭 들러 보세요!', 'misyeon jeone annaesenteoe kkok deulleo boseyo!', L(ONBOARD_TEXT.infoTip)]);
  }, 1100);
  setTimeout(() => {
    talkToGuide(); // the first mission
    setOnboard(2);
    // Then: the info centre, or explore on your own. After the guide's tip
    // for the first errand (5.2 s, shown for 9 s), so the card doesn't hide it.
    setTimeout(() => { if (mode === 'street') showInfoHint($('info-hint'), { onGo: () => guideToPlace({ store: nearestStore((st) => st.workshop === 'info') || 'info-center' }) }); }, 15000);
  }, 5600);
}

// Come back where you left off last time, if that spot is still open.
if (onboard >= 2) {
  const last = loadLastSpot();
  // Not out in the empty land between districts either (e.g. a spot saved
  // before a district moved to its real place, scripts/place-districts.mjs).
  const spotBoxes = districtBoxes(map);
  const nearDistrict = (x, z) => !spotBoxes.length || spotBoxes.some((b) => x >= b.x0 - 40 && x <= b.x1 + 40 && z >= b.z0 - 40 && z <= b.z1 + 40);
  if (usableSpot(last, bounds, (x, z) => collision.blocked(x, z, 0.4) || !nearDistrict(x, z))) {
    me.root.position.set(last.x, 0, last.z);
    me.root.rotation.y = last.ry;
  }
}
let tabParked = false; // another tab of this browser took over (see claimTab)
let lastSpotTimer = 3;
const rememberSpot = () => {
  if (tabParked) return; // the newer tab owns the saved spot now
  try { if (mode === 'street') saveLastSpot(me.root.position.x, me.root.position.z, me.root.rotation.y); } catch { /* still starting up */ }
};
document.addEventListener('visibilitychange', () => { if (document.hidden) rememberSpot(); });
addEventListener('pagehide', rememberSpot);

const cam = { yaw: me.root.rotation.y + Math.PI, pitch: 0.42, dist: 9 };
if (onboard === 0 && squareNpc) { cam.yaw += 0.75; cam.dist = 7; } // first minute: the guide in view, beside us
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
const isCar = (k) => k === 4 || k === 6; // sports car, limousine
let inSkate = false; // in the skate park (rides slow down there; see skateTick)
const skater = new Skater();
let skateY = 0; // ground (or air) height in the skate park
let skateTk = null; // { code, at }: the last trick, sent to others for a moment
const rideSpeed = () => (isCar(riding) ? CAR : riding === 5 ? MOTO : riding === 1 ? (inSkate ? Math.min(PARK_SPEED, garage.speed()) : garage.speed()) : BIKE);
const STORE_WALK = 4.2, STORE_RUN = 7;
// Steady walk (a setting, PC and phone): a pace between walking and running
// that never turns into a run, however long you keep moving. No stamina used;
// the gym boost still applies on top, as with walking.
const STEADY = 9, STORE_STEADY = 5.6;
const STEADY_ANIM = 0.52; // speed01 for the steady pace: stays on the walk animation
const STEADY_KEY = 'mk.steadyWalk';
let steadyWalk = false;
try { steadyWalk = localStorage.getItem(STEADY_KEY) === '1'; } catch { /* ignore */ }

const myTag = document.createElement('div');
myTag.className = 'nametag me';
styleMyTag(myLook);
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
// "Support the creator" (Buy Me a Coffee link). Hidden until a URL is set in config.
if (/^https:\/\//.test(config.supportUrl)) {
  $('support-link').href = config.supportUrl;
  $('support-link').hidden = false;
}
$('settings-panel').onclick = (e) => {
  if (e.target.id === 'settings-panel') $('settings-panel').hidden = true;
};
// Update board: the notices, newest first, with a dot until the latest is seen.
const NEWS_SEEN = 'mk.newsSeen';
const newsSeen = () => { try { return localStorage.getItem(NEWS_SEEN); } catch { return null; } };
const refreshNewsDot = () => {
  const on = hasNewUpdate(newsSeen());
  $('news-dot').hidden = !on; // a pulsing NEW badge on the row
  $('settings-dot').hidden = !on;
  $('settings-btn').classList.toggle('has-news', on);
  if (newsTag) newsTag.visible = on; // over the board on the square
};
const renderNews = () => {
  const lang = getLanguage();
  const fresh = newUpdates(newsSeen()); // notices not seen yet get a NEW badge
  $('news-list').replaceChildren(...UPDATES.map((u, i) => {
    const { title, items } = updateText(u, lang);
    const card = document.createElement('article');
    card.className = 'news-item' + (i < fresh ? ' fresh' : '');
    const when = document.createElement('div');
    when.className = 'news-when';
    when.textContent = u.at;
    if (i < fresh) { const b = document.createElement('b'); b.className = 'news-new'; b.textContent = 'NEW'; when.append(b); }
    const h = document.createElement('h3');
    h.textContent = title;
    const ul = document.createElement('ul');
    if (items.length === 1) ul.className = 'single'; // one message: no bullet
    for (const it of items) { const li = document.createElement('li'); li.textContent = it; ul.append(li); }
    card.append(when, h, ul);
    return card;
  }));
};
function openNews() {
  $('settings-panel').hidden = true;
  renderNews();
  $('news-panel').hidden = false;
  try { if (UPDATES[0]) localStorage.setItem(NEWS_SEEN, UPDATES[0].id); } catch { /* ignore */ }
  refreshNewsDot();
}
$('news-btn').onclick = openNews;
$('news-close').onclick = () => { $('news-panel').hidden = true; };
$('news-panel').onclick = (e) => { if (e.target.id === 'news-panel') $('news-panel').hidden = true; };
refreshNewsDot();
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
// PC only: a small key list at the bottom left (phones have the joystick and
// buttons instead). It folds down to one chip, and remembers that.
if (!input.isTouch) {
  const panel = $('keys-panel'), toggle = $('keys-toggle');
  const setFolded = (folded) => {
    panel.classList.toggle('folded', folded);
    toggle.setAttribute('aria-expanded', String(!folded));
  };
  let folded = false;
  try { folded = localStorage.getItem('mk.keysFolded') === '1'; } catch { /* ignore */ }
  setFolded(folded);
  toggle.onclick = () => {
    folded = !folded;
    setFolded(folded);
    toggle.blur();
    try { localStorage.setItem('mk.keysFolded', folded ? '1' : '0'); } catch { /* ignore */ }
  };
  panel.hidden = false;
  // Keep the chat log and the "revert look" chip above the panel.
  const fit = () => document.documentElement.style.setProperty('--keys-h', panel.offsetHeight + 'px');
  new ResizeObserver(fit).observe(panel);
  fit();
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
const stamina = { v: 1, rest: 0, tired: false, boostUntil: 0 };
// Drinks (all alcohol-free, the bar and clubs too) keep your stamina full
// for a few minutes.
const DRINK_BOOST_MS = 3 * 60 * 1000;
const DRINK_TEXT = {
  boost: { en: '⚡ Energy up! You can run without getting tired for 3 minutes.', ko: '⚡ 기운이 났어요! 3분 동안 지치지 않고 달릴 수 있어요.', ja: '⚡ 元気が出た！3分間、疲れずに走れます。', zh: '⚡ 精神满满！3分钟内奔跑不会累。', es: '⚡ ¡Con energía! Puedes correr sin cansarte durante 3 minutos.', ar: '⚡ نشاط! يمكنك الركض دون تعب لمدة 3 دقائق.', vi: '⚡ Tràn đầy năng lượng! Bạn có thể chạy mà không mệt trong 3 phút.', hi: '⚡ ऊर्जा भर गई! 3 मिनट तक आप बिना थके दौड़ सकते हैं।', id: '⚡ Semangat! Kamu bisa lari tanpa lelah selama 3 menit.' },
};
const staminaEl = document.getElementById('stamina');
const staminaFill = document.getElementById('stamina-fill');
function updateStamina(dt, wantsRun, moving) {
  if (config.staminaUnlimited) return wantsRun;
  const boosted = performance.now() < stamina.boostUntil;
  if (boosted) { stamina.v = 1; stamina.tired = false; } // a drink: no tiring for a while
  staminaEl.classList.toggle('boost', boosted);
  const running = wantsRun && moving && !stamina.tired;
  if (running) {
    if (!boosted) stamina.v = Math.max(0, stamina.v - dt / config.staminaMax);
    stamina.rest = 0;
    if (stamina.v === 0) stamina.tired = true;
  } else {
    stamina.rest += dt;
    if (stamina.rest > config.staminaDelay) stamina.v = Math.min(1, stamina.v + (dt * config.staminaRegen) / config.staminaMax);
    if (stamina.tired && stamina.v >= config.staminaResume) stamina.tired = false;
  }
  staminaEl.hidden = stamina.v >= 1 && !boosted; // while boosted: a gold bar
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
  const local = localName(currentStreet, lang);
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
  onUpdate: ({ icon }) => {
    const el = $('weather');
    el.hidden = false;
    el.replaceChildren(icon); // (the clock is off for now)
    el.title = t('credit.weather');
  },
});

// ---------- Multiplayer ----------
let others = new RemotePlayers(scene, $('labels'), { isOperator: isOperatorName });
// Everyone online on the whole map (net/online.js); without a server that
// can count, the people around you.
let onlineAll = 0;
const refreshOnline = () => {
  const n = onlineAll || others.players.size + 1;
  $('online').hidden = n < 2;
  $('online').textContent = '🟢 ' + t('hud.online', { n });
};
onLanguageChange(refreshOnline);
let stopOnline = null;
watchOnline(config.netProvider, config.net, myId, (n) => { onlineAll = n; refreshOnline(); })
  .then((stop) => { stopOnline = stop; if (tabParked) stop?.(); }).catch(() => {});
// A newer build deployed while we play: ask for a refresh (core/update-check.js).
startUpdateCheck({
  current: __BUILD_ID__,
  fetchVersion: () => fetch(`${BASE}version.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => j?.v),
  onNew: () => { if (!tabParked) showUpdateBanner(); },
});
// Our spot on the map for operators' live view (net/where.js, admin.html).
// Inside a shop we report the street spot we came in from, and the shop.
// A hidden tab keeps reporting (browsers slow the timer down to about once a
// minute): it is still in multiplayer, and an operator watching admin.html
// in another tab of the same browser should still see their own game.
let streetSpot = null;
startWhereReports({
  get: () => {
    try {
      if (tabParked || !me?.root) return null;
      if (mode === 'street') streetSpot = { x: me.root.position.x, z: me.root.position.z };
      if (!streetSpot) return null;
      return { name: nickname, place: mode === 'street' ? 'street' : interior?.store?.id || mode, ...streetSpot };
    } catch { return null; } // still starting up
  },
  send: (spot) => cloud.reportWhere(spot),
});
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
// Gifts between people in the same room (see startGift).
const gifts = new GiftBox();
const giftUi = new GiftUI({ onAnswer: (gid, ok) => answerGift(gid, ok) });
let joinToken = 0;
let lastJoin = null; // [room, roomScene, hasArea]: rejoined after a rename
async function joinRoom(room, roomScene, area = null) {
  if (tabParked) return;
  lastJoin = [room, roomScene, !!area];
  const token = ++joinToken;
  dropGifts(); // gifts are between people in the same room
  net?.disconnect();
  net = SOLO;
  for (const id of [...others.players.keys()]) others.leave(id);
  others = new RemotePlayers(roomScene, $('labels'), { isOperator: isOperatorName });
  refreshOnline();
  const handlers = {
    onJoin: (p) => {
      others.join({ ...p, name: filterText(cleanName(p.name).trim() || '?') });
      if (safety.isBlocked(p.id, others.nameOf(p.id))) others.hide(p.id);
      refreshOnline(); lastSent = null;
      kpop.onPeerJoin(); // catch them up on the song playing in the K-POP café
    },
    onLeave: (id) => { tandemGone(id); others.leave(id); interior?.dartPins?.clear(id); refreshOnline(); },
    onState: (id, st) => others.state(id, st),
    onEmote: (id, e) => {
      if (parseTandem(e)) { onTandemMsg(id, parseTandem(e)); return; }
      if (parseGift(e)) { onGiftMsg(id, parseGift(e)); return; }
      if (parseTarot(e)) {
        const m = parseTarot(e);
        if (m.to === myId && !safety.isBlocked(id, others.nameOf(id)) && tarotUi.heard(id, others.nameOf(id) || '?', m)) {
          shop.toast(fmt(L(TAROT_TEXT.invited), { name: others.nameOf(id) || '?' }));
          action = STALE;
        }
        return;
      }
      if (parseKpop(e)) { kpop.onMsg(parseKpop(e)); return; }
      if (parseFilm(e)) { kpop.onMsg(parseFilm(e)); return; }
      if (parseKaraoke(e) != null) { karaokeUi.addScore(others.nameOf(id) || '?', parseKaraoke(e)); return; }
      if (parseDarts(e)) { const m = parseDarts(e); if (m.to === myId) onDartsMsg(id, m); return; }
      if (parseDartsGo(e)) { const m = parseDartsGo(e); if (m.to === myId && !safety.isBlocked(id, others.nameOf(id))) arcade.darts?.go(id, m); return; }
      if (parseDartPin(e)) { const m = parseDartPin(e); if (!safety.isBlocked(id, others.nameOf(id))) interior?.dartPins?.add(id, m.board, m.color, m.x, m.y); return; }
      if (parseHonk(e)) {
        const at = others.positionOf(id);
        if (at && !safety.isBlocked(id, others.nameOf(id))) motionSound.honk(parseHonk(e), hearGain(Math.hypot(at.x - me.root.position.x, at.z - me.root.position.z)));
        return;
      }
      if (typeof e === 'string' && e.startsWith('sniff:')) { onPeerSniff(id, e.slice(6)); return; }
      if (typeof e === 'string' && e.startsWith('fishph:')) { onPeerFishing(id, e.slice(7)); return; }
      if (typeof e === 'string' && e.startsWith('bigfish:')) { onPeerTrophy(id, e.slice(8)); return; }
      if (parseBite(e)) { if (parseBite(e) === myId) onBitten(id); return; }
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
      addChatLine(name, text, '', id);
      const log = (recentLines.get(id) || []).concat(text).slice(-10);
      recentLines.set(id, log);
    },
  };
  try {
    const n = await createAreaNet(config.netProvider, handlers, { ...config.net, accessToken: () => cloud.accessToken() }, {
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
// Rename at the name tag workshop: costs coins; others see it after a quick
// rejoin of the room we are in. Resolves to 'ok', 'same', 'empty', 'poor'
// or 'taken' (someone else uses that name).
async function renameMe(raw) {
  const clean = cleanName(raw).trim();
  if (!clean) return 'empty';
  const next = filterText(clean.slice(0, 16));
  if (next === nickname) return 'same';
  if (isReservedName(clean)) return 'reserved';
  if (wallet.coins < RENAME_COST) return 'poor';
  if (await cloud.claimName(clean) === 'taken') return 'taken';
  if (!wallet.spend(RENAME_COST, { k: 'ledger.rename' })) return 'poor';
  nickname = next;
  if (friendBackend instanceof LocalFriends) friendBackend.setName(nickname);
  identity = { ...identity, name: clean, nameAt: Date.now() };
  saveIdentity(identity);
  try { localStorage.setItem('mk.name', clean); } catch { /* ignore */ }
  $('nickname').value = clean;
  styleMyTag(myLook);
  emblemUi.name = nickname;
  me.play('cheer');
  if (lastJoin && net !== SOLO) {
    const [room, roomScene, hasArea] = lastJoin;
    joinRoom(room, roomScene, hasArea ? { x: me.root.position.x, z: me.root.position.z } : null);
  }
  return 'ok';
}
// Leave multiplayer (e.g. inside your own home).
function goSolo(roomScene) {
  joinToken++;
  net?.disconnect();
  net = SOLO;
  for (const id of [...others.players.keys()]) others.leave(id);
  others = new RemotePlayers(roomScene, $('labels'), { isOperator: isOperatorName });
  refreshOnline();
}
net = SOLO;
// Same browser, second tab: the newest tab plays, older ones step aside so
// you never appear twice on the street (see core/single-tab.js).
claimTab(() => {
  tabParked = true;
  joinToken++; // a join still connecting disconnects itself
  net?.disconnect();
  net = SOLO;
  for (const id of [...others.players.keys()]) others.leave(id);
  stopOnline?.();
  renderer.setAnimationLoop(null);
  try { music.ctx?.suspend(); sfx.ctx?.suspend(); } catch { /* still starting up */ }
  const box = document.createElement('div');
  box.className = 'overlay dim';
  box.id = 'other-tab';
  box.innerHTML = '<div class="panel small"><div class="logo">🗂️</div><h2></h2><p></p><button class="primary"></button></div>';
  box.querySelector('h2').textContent = t('tab.elsewhere');
  box.querySelector('p').textContent = t('tab.elsewhereHint');
  const btn = box.querySelector('button');
  btn.textContent = t('tab.playHere');
  btn.onclick = () => location.reload(); // reloading claims this tab again
  box.style.zIndex = 10000;
  document.body.appendChild(box);
});
joinRoom(roomId, scene, { x: me.root.position.x, z: me.root.position.z });

// Emote wheel: one 😊 button. Press and drag onto a petal, then let go to
// send it; or tap to open the wheel and tap a petal. Keys 1–9 also work.
const emoteBar = $('emotes');
const emoteList = ownedPacks().flatMap((pack) => pack.emotes);
$('keys-emote-range').textContent = `1–${Math.min(9, emoteList.length)}`;
$('keys-emote-range').closest('li').hidden = !emoteList.length;
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

// Text chat: a speech bubble over your head and a log of the last lines.
// Each line fades off the screen a minute after it arrives so it does not
// cover the view; opening the chat shows them all again (scroll back while
// typing). On phones the log can also be folded away (the small tab by it);
// while folded, a new line makes the 💬 button blink. Opens with 💬, or T or / on a keyboard. Text only, never HTML.
// The picker in the chat bar chooses who hears it: everyone nearby (public,
// not stored anywhere), all friends, or one friend. Friend chat is kept like
// a phone messenger (core/friends.js, the 👥 panel).
const chatLog = $('chat-log'), chatBar = $('chat-bar'), chatInput = $('chat-input');
let lastChatAt = 0, chatNoticeShown = false;
const cleanChat = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, config.chatMaxLength);
const CHAT_LOG_LINES = 40;
const CHAT_LINE_MS = 60000; // how long a line stays on screen when the chat is closed
const chatFoldBtn = $('chat-fold');
let chatFolded = false;
try { chatFolded = localStorage.getItem('mk.chatFolded') === '1'; } catch { /* ignore */ }
function setChatFolded(on) {
  chatFolded = on;
  $('hud').classList.toggle('chat-folded', on);
  chatFoldBtn.textContent = on ? '💬 ▸' : '◂';
  chatFoldBtn.setAttribute('aria-label', on ? 'Show chat' : 'Hide chat');
  if (!on) $('chat-btn').classList.remove('chat-blink');
  try { localStorage.setItem('mk.chatFolded', on ? '1' : '0'); } catch { /* ignore */ }
}
chatFoldBtn.onclick = () => setChatFolded(!chatFolded);
setChatFolded(chatFolded);
// A line goes "stale" after a minute: it fades out, then takes no room.
function ageChatLine(line) {
  setTimeout(() => {
    line.classList.add('stale');
    setTimeout(() => line.classList.add('gone'), 1000);
  }, CHAT_LINE_MS);
}
function nudgeChatBtn() {
  if (!chatFolded || !chatBar.hidden) return;
  const btn = $('chat-btn');
  btn.classList.remove('chat-blink');
  void btn.offsetWidth; // restart the animation
  btn.classList.add('chat-blink');
}
// opts.onName: what tapping the name does (default: the block/report menu
// for someone else's id). opts.tag: a small label before the name (friend chat).
function addChatLine(name, text, kind = '', id = null, opts = {}) {
  const line = document.createElement('div');
  line.className = 'chat-line ' + kind;
  if (opts.tag) line.append(Object.assign(document.createElement('span'), { className: 'chat-tag', textContent: opts.tag }));
  // Someone else's name is a button: tap it to block or report them.
  const tap = opts.onName || (id ? () => openPersonMenu(id, name) : null);
  const b = document.createElement(tap ? 'button' : 'b');
  b.textContent = name;
  if (tap) { b.className = 'chat-name'; b.onclick = tap; }
  line.append(b, document.createTextNode(' ' + text));
  if (id) line.dataset.who = name;
  const atEnd = chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 24;
  chatLog.append(line);
  while (chatLog.children.length > CHAT_LOG_LINES) chatLog.firstChild.remove();
  if (atEnd || !chatBar || chatBar.hidden) chatLog.scrollTop = chatLog.scrollHeight;
  ageChatLine(line);
  if (!/\bmine\b/.test(kind)) nudgeChatBtn();
  return line;
}
let personFor = null;
function openPersonMenu(id, name) {
  personFor = { id, name };
  $('person-name').textContent = name;
  refreshPersonFriend();
  $('person-menu').hidden = false;
}
function blockPerson(report) {
  if (!personFor) return;
  const { id, name } = personFor;
  if (report) safety.report(id, name, recentLines.get(id) || []);
  else safety.block(id, name);
  others.hide(id);
  for (const el of chatLog.querySelectorAll('.chat-line')) {
    if (el.dataset.who === name || el.querySelector('.chat-name')?.textContent === name) el.remove();
  }
  // Blocking a friend also ends the friendship.
  const f = friendList.friends.concat(friendList.incoming, friendList.outgoing).find((x) => x.name === name);
  if (f) friendStore()?.remove(f.uid).then(refreshFriends);
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
  $('hud').classList.add('chat-open');
  $('chat-btn').classList.remove('chat-blink');
  chatLog.scrollTop = chatLog.scrollHeight;
  input.keys.clear();
  chatInput.focus();
  if (!chatNoticeShown) { chatNoticeShown = true; if (mustSignInToChat()) chatSignInPrompt(); else addChatLine('ℹ️', t('chat.notice'), 'note'); }
}
function closeChat() { chatBar.hidden = true; chatInput.blur(); $('hud').classList.remove('chat-open'); chatLog.scrollTop = chatLog.scrollHeight; }
const mustSignInToChat = () => config.chatGoogleOnly && config.netProvider === 'supabase' && !(cloud.user && !cloud.guest);
// A note in the chat log with a Google sign-in button (links this guest, so
// the save stays).
function chatSignInPrompt() {
  const line = document.createElement('div');
  line.className = 'chat-line note';
  const btn = document.createElement('button');
  btn.className = 'chat-signin';
  btn.textContent = 'G  ' + t('chat.signInBtn');
  btn.onclick = async () => googleFail(await cloud.linkGoogle());
  line.append(document.createTextNode('🔒 ' + t('chat.signIn') + ' '), btn);
  chatLog.append(line);
  while (chatLog.children.length > CHAT_LOG_LINES) chatLog.firstChild.remove();
  chatLog.scrollTop = chatLog.scrollHeight;
  // Only this notice goes away by itself; chat lines stay.
  setTimeout(() => line.classList.add('old'), 15000);
  setTimeout(() => line.remove(), 16000);
}
$('chat-btn').hidden = !config.chatEnabled;
chatFoldBtn.hidden = !config.chatEnabled;
$('chat-btn').onclick = () => (chatBar.hidden ? openChat() : closeChat());
chatBar.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Commands start with "/" and are never sent to other people.
  const raw = cleanChat(chatInput.value);
  // Event codes for everyone: "./EVENTSTART1" — coins, once per device.
  if (isEventCode(raw)) {
    chatInput.value = '';
    const ev = await eventCode(raw);
    if (!ev) { shop.toast(L(CODE_TEXT.wrong)); return; }
    let used = [];
    try { used = JSON.parse(localStorage.getItem('mk.eventCodes') || '[]'); } catch { /* broken save */ }
    if (used.includes(ev.id)) { shop.toast(L(CODE_TEXT.used)); return; }
    used.push(ev.id);
    try { localStorage.setItem('mk.eventCodes', JSON.stringify(used)); } catch { /* storage blocked */ }
    wallet.add(ev.coins, { k: 'ledger.gift' });
    refreshWallet();
    shop.toast(fmt(L(CODE_TEXT.coins), { n: ev.coins }));
    return;
  }
  if (raw.startsWith('/')) {
    chatInput.value = '';
    // Developer codes: "/<code>". A wrong one reads like any unknown command.
    const code = raw.slice(1).trim();
    // The master code also switches the 🛡️ operator badge on or off.
    if (await isMasterCode(code)) {
      myLook = { ...myLook, op: !myLook.op || undefined };
      if (!myLook.op) delete myLook.op;
      saveLook(myLook);
      setLook(myLook);
      shop.toast(L(myLook.op ? OPERATOR_TEXT.on : OPERATOR_TEXT.off));
    }
    // Fishing code: the next bite (fishing by hand) is that fish, once.
    const fishFromCode = await fishCode(code);
    if (fishFromCode) {
      forceNextCatch(fishFromCode);
      shop.toast(L(CODE_TEXT.fish));
      return;
    }
    const coinsFromCode = await coinCode(code);
    if (coinsFromCode) {
      wallet.add(coinsFromCode, { k: 'ledger.gift' });
      refreshWallet();
      shop.toast(fmt(L(CODE_TEXT.coins), { n: coinsFromCode }));
      return;
    }
    const unlocked = await redeemCode(code);
    if (unlocked) {
      const added = inventory.add(...unlocked);
      shop.toast(added.length ? t('items.added', { list: added.map((id) => ITEMS[id].emoji + ' ' + localName(ITEMS[id].name, getLanguage())).join(', ') }) : t('items.already'));
      refreshItems();
    } else shop.toast(t('chat.unknownCommand'));
    return;
  }
  // Google-only chat (config.chatGoogleOnly): guests get a sign-in prompt
  // instead. Event and developer codes above still work for them.
  if (mustSignInToChat()) { chatSignInPrompt(); return; }
  if (chatTo !== PUBLIC) {
    const body = filterText(cleanFriendBody(chatInput.value));
    if (!body) return;
    chatInput.value = '';
    sendFriend(chatTo, body);
    if (input.isTouch) closeChat();
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


// ---------- Friends and friend chat ----------
// Friends are accounts (found by player name), so friend chat works across
// rooms and areas, and its messages are kept. On Supabase it needs the
// online save (a guest account is enough to add friends; sending follows the
// same chat rules as public chat). Local play: other tabs of this browser.
const PUBLIC = 'public';
let chatTo = PUBLIC; // who the chat bar sends to: PUBLIC, FRIENDS_ALL or a friend's uid
let friendList = { friends: [], incoming: [], outgoing: [] };
let friendBackend = null, friendInbox = null, stopFriendWatch = null;
const cleanFriendBody = (s) => cleanFriendText(s);
const READ_KEY = 'mk.friendRead'; // last read message per chat (in the save, so it follows the account)
function readMarks() {
  try { const r = JSON.parse(localStorage.getItem(READ_KEY) || '{}'); return r && typeof r === 'object' ? r : {}; } catch { return {}; }
}
function saveMarks(m) { try { localStorage.setItem(READ_KEY, JSON.stringify(m)); } catch { /* storage blocked */ } }
function friendStore() {
  const live = cloud.status === 'cloud' && cloud.client && cloud.user;
  let want = null;
  if (live) want = friendBackend instanceof SupabaseFriends && friendBackend.uid === cloud.user.id ? friendBackend : new SupabaseFriends(cloud.client, cloud.user.id);
  else if (config.netProvider !== 'supabase') want = friendBackend instanceof LocalFriends ? friendBackend : new LocalFriends(myId, nickname);
  if (want !== friendBackend) {
    stopFriendWatch?.();
    friendBackend = want;
    friendInbox = want ? new Inbox(want.uid, readMarks()) : null;
    friendList = { friends: [], incoming: [], outgoing: [] };
    friendsUi.loaded.clear();
    refreshFriends.primed = false;
    knownRequests = null;
    stopFriendWatch = want ? want.watch(onFriendMessage, () => refreshFriends()) : null;
    if (want) setTimeout(refreshFriends, 0);
  }
  return friendBackend;
}
let knownRequests = null; // uids of requests already seen (null = first load)
async function refreshFriends() {
  const st = friendStore();
  if (!st) return;
  const r = await st.list();
  if (r.error || st !== friendBackend) { friendsUi.update(); return; }
  // Hide people I've blocked.
  const ok = (f) => !safety.isBlocked(null, f.name);
  friendList = { friends: r.friends.filter(ok), incoming: r.incoming.filter(ok), outgoing: r.outgoing };
  const seen = new Set(friendList.incoming.map((f) => f.uid));
  if (knownRequests) for (const f of friendList.incoming) if (!knownRequests.has(f.uid)) shop.toast(fmt(L(FRIEND_TEXT.newRequest), { name: f.name }));
  knownRequests = seen;
  if (chatTo !== PUBLIC && chatTo !== FRIENDS_ALL && !friendList.friends.some((f) => f.uid === chatTo)) chatTo = PUBLIC;
  // Fetch the newest lines of each chat once, for unread counts and previews.
  if (!refreshFriends.primed) {
    refreshFriends.primed = true;
    for (const k of [FRIENDS_ALL, ...friendList.friends.map((f) => f.uid)]) {
      st.history(k).then((h) => { if (Array.isArray(h) && st === friendBackend) { friendInbox.add(h); friendsUi.loaded.add(k); refreshFriendBadge(); friendsUi.update(); } });
    }
  }
  renderChatTo();
  refreshFriendBadge();
  refreshPersonFriend();
  friendsUi.update();
}
function friendName(uid) { return friendList.friends.find((f) => f.uid === uid)?.name; }
function onFriendMessage(m) {
  if (!friendInbox || m.from === friendBackend?.uid) return;
  const name = friendName(m.from) || m.name || '?';
  if (safety.isBlocked(null, name)) return;
  if (!friendInbox.add({ ...m, name }).length) return;
  const key = convKey(m, friendBackend.uid);
  const reading = friendsUi.open && friendsUi.view === key;
  if (!reading) {
    addChatLine(name, filterText(cleanFriendBody(m.body)), 'friend', null, {
      tag: key === FRIENDS_ALL ? '👥' : '💌',
      onName: () => { closeChat(); friendsUi.show(key); },
    });
    try { sfx.pop?.(); } catch { /* sound not set up yet */ }
  }
  refreshFriendBadge();
  friendsUi.update();
}
async function sendFriend(key, body) {
  const st = friendStore();
  if (!st) { shop.toast(L(FRIEND_TEXT.noAccount)); return false; }
  const r = await st.send(key, body);
  if (r.error) {
    if (r.error === 'chat' && mustSignInToChat()) chatSignInPrompt();
    else shop.toast(friendsUi.errorText(r.error));
    return false;
  }
  friendInbox?.add({ ...r.message, name: nickname });
  friendInbox && saveMarks(friendInbox.markRead(key));
  const to = key === FRIENDS_ALL ? L(FRIEND_TEXT.allFriends) : friendName(key) || '?';
  if (!(friendsUi.open && friendsUi.view === key)) {
    addChatLine(nickname + ' → ' + to, body, 'mine friend', null, { tag: key === FRIENDS_ALL ? '👥' : '💌', onName: () => { closeChat(); friendsUi.show(key); } });
  }
  friendsUi.update();
  return true;
}
const friendsUi = new FriendsUI($('friends-panel'), {
  store: () => friendStore(),
  inbox: () => friendInbox,
  me: () => friendBackend?.uid,
  friends: () => friendList,
  refresh: () => refreshFriends(),
  toast: (m) => shop.toast(m),
  clean: (s) => filterText(cleanFriendBody(s)),
  isBlocked: (uid, name) => safety.isBlocked(null, name),
  onRead: (key) => { if (friendInbox) { saveMarks(friendInbox.markRead(key)); refreshFriendBadge(); } },
  send: (key, text) => {
    if (mustSignInToChat()) { shop.toast(friendsUi.errorText('chat')); return false; }
    const body = filterText(cleanFriendBody(text));
    return body ? sendFriend(key, body) : false;
  },
});
function refreshFriendBadge() {
  const n = friendInbox?.totalUnread() || 0;
  $('chat-unread').hidden = !n;
  $('chat-unread').textContent = n > 99 ? '99+' : String(n);
  $('friends-dot').hidden = !(n || friendList.incoming.length);
}
// The chat bar's "send to" picker.
function renderChatTo() {
  const sel = $('chat-to');
  const opts = [[PUBLIC, '🌐 ' + L(FRIEND_TEXT.everyone)]];
  if (friendBackend) {
    opts.push([FRIENDS_ALL, '👥 ' + L(FRIEND_TEXT.allFriends)]);
    for (const f of friendList.friends) opts.push([f.uid, '💌 ' + f.name]);
  }
  sel.replaceChildren(...opts.map(([v, label]) => Object.assign(document.createElement('option'), { value: v, textContent: label })));
  sel.value = opts.some(([v]) => v === chatTo) ? chatTo : PUBLIC;
  chatTo = sel.value;
  sel.hidden = opts.length < 2;
  applyChatTo();
}
function applyChatTo() {
  const friend = chatTo !== PUBLIC;
  chatBar.classList.toggle('to-friend', friend);
  chatInput.maxLength = friend ? FRIEND_MAX_BODY : config.chatMaxLength;
  chatInput.placeholder = friend
    ? '💬 ' + (chatTo === FRIENDS_ALL ? L(FRIEND_TEXT.allFriends) : friendName(chatTo) || '') + ' · ' + L(FRIEND_TEXT.ph)
    : t('chat.placeholder');
}
$('chat-to').onchange = (e) => { chatTo = e.target.value; applyChatTo(); chatInput.focus(); };
$('friends-btn').onclick = () => { closeChat(); friendsUi.show(null); };
// Person menu: add as a friend, or open the chat with a friend.
function refreshPersonFriend() {
  const btn = $('person-friend');
  if (!personFor || !friendBackend) { btn.hidden = true; return; }
  const f = friendList.friends.find((x) => x.name === personFor.name);
  const out = friendList.outgoing.some((x) => x.name === personFor.name);
  btn.hidden = false;
  btn.disabled = out;
  btn.textContent = f ? '💌 ' + L(FRIEND_TEXT.isFriend) : out ? '⏳ ' + fmt(L(FRIEND_TEXT.waiting), { name: personFor.name }) : '➕ ' + L(FRIEND_TEXT.addFriend);
}
$('person-friend').onclick = async () => {
  if (!personFor) return;
  const st = friendStore();
  if (!st) { shop.toast(L(FRIEND_TEXT.noAccount)); return; }
  const f = friendList.friends.find((x) => x.name === personFor.name);
  $('person-menu').hidden = true;
  if (f) { friendsUi.show(f.uid); return; }
  friendsUi._result(await st.add(personFor.name), personFor.name);
};
onLanguageChange(() => { renderChatTo(); friendsUi.update(); });
cloud.onChange(() => friendStore());
friendStore();
renderChatTo();

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
const HOME_TEXT = {
  bought: { en: 'You bought {name}! At home, tap 🛋️ Decorate to place it.', ko: '{name}을(를) 샀어요! 집에서 🛋️ 꾸미기를 눌러 놓아 보세요.', ja: '{name}を買いました！家で🛋️模様替えを押して置いてね。', zh: '买了{name}！在家点🛋️装饰就能摆放。' },
};
const DEX_NEW = { en: 'New in your food dex!', ko: '도감 등록!', ja: '図鑑に登録！', zh: '图鉴新登记！' };
const shop = new ShopUI({
  cart,
  onTryOn: (product) => {
    setLook({ ...currentLook, ...(hanbokById(product.rent)?.wear || product.tryOn || ITEMS[product.item || product.outfit]?.wear) });
    $('revert-look').hidden = false;
    shop.toast(t('shop.tried'));
  },
  onExit: () => (subway.metro ? metroGetOff() : leaveStore()),
  // Perfume tester: see the effect once next to you, for free. Only you see
  // it, and no scent stays on.
  onSniff: (product) => {
    const pf = perfumes.get(product.id);
    if (!pf) return;
    const p = me.root.position;
    scentFx.attach(activeScene);
    scentFx.puff(p.x, p.y, p.z, pf.fx, true);
    sfx.pop?.();
    // Friends shopping in the same shop see it too: one small message, only
    // inside a shop (its own room), at most one every 2 seconds.
    const now = performance.now();
    if (interior && now - lastSniffSent > 2000) { lastSniffSent = now; net.sendEmote('sniff:' + pf.product.id); }
  },
  onAdd: (product) => recordFood(shop.store, product),
  onAdopt: (product) => {
    adoptPet(product.adopt);
    // Adopted at an animal café: the animal leaves with you instead of staying in the room.
    const left = inventory.has(product.adopt) && interior?.pets?.list.find((q) => q.adopt === product.adopt);
    if (left) interior.pets.remove(left);
  },
  owns: (id) => inventory.has(id),
  hasUmbrella: () => hasUmbrella(),
  onUmbrella: (product) => buyUmbrella(product),
  onOutfit: (product) => outfitAction(product.item || product.outfit),
  onRent: (product) => rentHanbok(product),
  // Lighting shops: a lamp for your home (core/furniture.js), placed with Decorate.
  onFurniture: (product) => {
    const id = product.furniture;
    if (!ITEMS[id] || inventory.has(id)) return;
    const coins = coinsFor(product.price);
    if (!wallet.spend(coins, { name: product.name, at: interior?.store.name })) { shop.toast(fmt(L(DINE_TEXT.poor), { n: coins })); return; }
    inventory.add(id);
    refreshWallet();
    labelDecor();
    sfx.pop?.();
    clerk && say(clerk, $('labels'), ['감사합니다!', 'gamsahamnida!', 'Thank you!']);
    shop.toast(fmt(L(HOME_TEXT.bought), { name: localName(product.name, getLanguage()) }));
  },
  rentLeft: (product) => (isRenting(rental, product.rent) ? timeLeft(rental) : 0),
  wearing: (id) => isWorn(ITEMS[id], myLook),
  canGift: (product) => canGift(product),
  onGift: (product) => startGift(interior?.store, product),
  giftLabel: () => L(GIFT_TEXT.button),
  // Shops that sell things to take home: pay coins, carry it in your hand
  // (food as a takeout box, drinks as a cup, anything else in a shopping bag).
  onBuy: (product, coins) => {
    if (!onSale(product) || itemSoon(shop.store, product)) return false; // a limited edition outside its dates, or not sold yet
    if (product.ingredient) return buyIngredient(product, coins);
    if (!handReady()) return false;
    if (!wallet.spend(coins, { name: product.name, at: interior?.store.name })) { shop.toast(fmt(L(DINE_TEXT.poor), { n: coins })); return false; }
    refreshWallet();
    const kind = goodsKind(product);
    if (product.perfume && perfumes.has(product.id)) holdNew({ kind: 'perfume', p: product.id, sips: SPRAYS, name: localName(product.name, 'en') });
    else holdNew(kind === 'gift' ? { kind, sips: 1, name: localName(product.name, 'en'), icon: SHOP_ICON[product.model] || '🛍️' } : { kind, sips: kind === 'food' ? FOOD_BITES : COFFEE_SIPS, name: localName(product.name, 'en') });
    if (kind !== 'gift') recordFood(shop.store, product, true);
    const seller = sellerOf(product) || clerk;
    seller && say(seller, $('labels'), ['감사합니다!', 'gamsahamnida!', t('coffee.enjoy')]);
    shop.toast(fmt(L(product.perfume ? PERFUME_TEXT.got : GOODS_TEXT.got), { name: localName(product.name, getLanguage()) }));
    return true;
  },
  onTake: (product) => {
    if (!handReady()) return;
    holdNew({ kind: 'coffee', sips: COFFEE_SIPS, name: localName(product.name, 'en') });
    recordFood(shop.store, product, true);
    clerk && say(clerk, $('labels'), ['맛있게 드세요!', 'masitge deuseyo!', t('coffee.enjoy')]);
    shop.toast(t('coffee.got', { name: localName(product.name, getLanguage()) }));
  },
});

// Market sellers call out to you as you walk past their stall (now and then).
const STALL_HI = [['어서 오세요!', 'eoseo oseyo!', 'Welcome!'], ['맛보고 가세요!', 'matbogo gaseyo!', 'Come have a taste!'], ['방금 만들었어요!', 'banggeum mandeureosseoyo!', 'Freshly made!'], ['구경하고 가세요!', 'gugyeonghago gaseyo!', 'Take a look!']];
let stallHiAt = 0;
function greetAtStalls(p) {
  const now = performance.now();
  if (now - stallHiAt < 12000) return;
  const o = interior.vendorNpcs.find((v) => Math.hypot(p.x - v.ch.root.position.x, p.z - v.ch.root.position.z) < 2.4 && now - (v.hiAt || 0) > 40000);
  if (!o) return;
  stallHiAt = o.hiAt = now;
  o.ch.wave();
  say(o, $('labels'), STALL_HI[Math.floor(Math.random() * STALL_HI.length)]);
}
// At the park's market, the stall's own seller thanks you (not the kiosk clerk).
function sellerOf(product) {
  const i = interior?.vendors?.findIndex((v) => v.stall === product.stall);
  return i >= 0 ? interior.vendorNpcs?.[i] : null;
}
// What a bought thing becomes in your hand.
const SHOP_ICON = { ramyeon: '🍜', egg: '🥚', picnicmat: '🧺', notebook: '📓', pen: '🖊️', candle: '🕯️', bottle: '🧴', jar: '🫙', lipstick: '💄', plush: '🧸', tote: '👜', scarf: '🧣', samgak: '🍙', milk: '🥛', bread: '🥐', cup: '🥤' };
const GOODS_TEXT = {
  got: { en: 'You bought {name}!', ko: '{name}을(를) 샀어요!', ja: '{name}を買いました！', zh: '买了{name}！', es: '¡Compraste {name}!', ar: 'اشتريت {name}!', vi: 'Bạn đã mua {name}!', hi: 'आपने {name} ख़रीदा!', id: 'Kamu membeli {name}!' },
  gift: { en: 'A shopping bag · {name}', ko: '쇼핑백 · {name}', ja: 'ショッピングバッグ · {name}', zh: '购物袋 · {name}', es: 'Bolsa de compras · {name}', ar: 'كيس تسوق · {name}', vi: 'Túi mua sắm · {name}', hi: 'शॉपिंग बैग · {name}', id: 'Tas belanja · {name}' },
  soon: { en: '🚧 Coming soon: this shop is getting ready.', ko: '🚧 현재 준비중입니다.', ja: '🚧 現在準備中です。', zh: '🚧 正在准备中。', es: '🚧 Próximamente: la tienda se está preparando.', ar: '🚧 قريبًا: المتجر قيد التجهيز.', vi: '🚧 Sắp ra mắt: cửa hàng này đang chuẩn bị.', hi: '🚧 जल्द आ रहा है: यह दुकान तैयार हो रही है।', id: '🚧 Segera hadir: toko sedang disiapkan.' },
};
// Ordering at the counter: META COFFEE and the bar from the clerk, a club
// from its bartender. Coffee refills your stamina when you sip it.
const COUNTER_ORDER = { en: 'Order', ko: '주문하기', ja: '注文する', zh: '点单', es: 'Pedir', ar: 'اطلب', vi: 'Gọi món', hi: 'ऑर्डर करें', id: 'Pesan' };
function orderAtCounter(p) {
  const st = interior?.store;
  if (!st || !(st.takeaway || st.category === 'cafe' || st.category === 'bar' || st.category === 'club') || !st.products?.length) return null;
  const who = st.category === 'club' ? barkeep : clerk;
  return who && Math.hypot(p.x - who.ch.root.position.x, p.z - who.ch.root.position.z) < (st.category === 'club' ? 3.4 : 2.6) ? who : null; // (over the club's wide bar)
}
const counterUi = new CounterUI({
  root: $('counter-panel'),
  canGift: () => peopleHere().length > 0,
  onGift: (store, product) => startGift(store, product),
  onBuy: (store, product, coins) => {
    if (itemSoon(store, product) || !handReady()) return false;
    if (!wallet.spend(coins, { name: product.name, at: store?.name })) { counterUi.render(fmt(L(DINE_TEXT.poor), { n: coins })); return false; }
    holdNew({ kind: heldFor(product, store), sips: COFFEE_SIPS, name: localName(product.name, 'en') });
    recordFood(store, product, true);
    const who = store.category === 'club' ? barkeep : clerk;
    who && say(who, $('labels'), ['맛있게 드세요!', 'masitge deuseyo!', t('coffee.enjoy')]);
    shop.toast(t('coffee.got', { name: localName(product.name, getLanguage()) }));
    return true;
  },
});

// My pet: adopt, walk, clean up after it (src/game/pet-care.js).
const petCare = createPetCare({
  get me() { return me; }, get scene() { return scene; }, get activeScene() { return activeScene; },
  get mode() { return mode; }, get riding() { return riding; }, get seated() { return seated; },
  get clerk() { return clerk; }, get inventory() { return inventory; }, get wallet() { return wallet; },
  get shop() { return shop; }, get sfx() { return sfx; },
  clearAction: () => { action = STALE; }, refreshQuestChip, refreshItems, refreshWallet,
});
const { setPet, adoptPet, nearestPoop, cleanPoop, updatePet } = petCare;

// Something in my hand (a META COFFEE cup): tap Drink to sip; the cup is gone
// when it's finished. Saved, so a half-drunk coffee survives a reload.
// The quest chip can be folded down to its icon (tap it).
const QUEST_FOLD_KEY = 'mk.questFold';
let questFolded = (() => { try { return localStorage.getItem(QUEST_FOLD_KEY) === '1'; } catch { return false; } })();
// Perfume (core/perfume.js): bought in a perfume shop, kept in the bag, and
// sprayed from the hand. A spray lasts 3 minutes; meanwhile a small effect of
// that perfume pops up next to you every ~7 seconds, and others nearby see it
// too (one short id in the state we already send, no extra messages).
const PERFUME_TEXT = {
  spray: { en: 'Spray', ko: '뿌리기', ja: 'つける', zh: '喷', es: 'Rociar', ar: 'رشّ', vi: 'Xịt', hi: 'छिड़कें', id: 'Semprot' },
  got: { en: 'You bought {name}! Tap 🧴 Spray to wear it, or keep it in your bag.', ko: '{name}을(를) 샀어요! 🧴 뿌리기를 누르거나 가방에 넣어 두세요.', ja: '{name}を買いました！🧴でつけるか、バッグにしまってね。', zh: '买了{name}！点🧴喷一下，或放进包里。', es: '¡Compraste {name}! Toca 🧴 Rociar o guárdalo en la bolsa.', ar: 'اشتريت {name}! اضغط 🧴 رشّ أو احفظه في الحقيبة.', vi: 'Bạn đã mua {name}! Nhấn 🧴 Xịt hoặc cất vào túi.', hi: 'आपने {name} ख़रीदा! 🧴 छिड़कें दबाएँ या बैग में रखें।', id: 'Kamu membeli {name}! Ketuk 🧴 Semprot atau simpan di tas.' },
  sprayed: { en: '🧴 {name} · lasts 3 min · {n} sprays left', ko: '🧴 {name} · 3분 동안 향이 나요 · {n}번 남음', ja: '🧴 {name} · 3分間香ります · 残り{n}回', zh: '🧴 {name} · 香味持续3分钟 · 还剩{n}次', es: '🧴 {name} · dura 3 min · quedan {n}', ar: '🧴 {name} · يدوم 3 دقائق · بقيت {n} رشّات', vi: '🧴 {name} · thơm trong 3 phút · còn {n} lần', hi: '🧴 {name} · 3 मिनट तक · {n} बार बाक़ी', id: '🧴 {name} · tahan 3 menit · sisa {n} semprot' },
  last: { en: '🧴 {name} · lasts 3 min · that was the last spray', ko: '🧴 {name} · 3분 동안 향이 나요 · 마지막 한 번이었어요', ja: '🧴 {name} · 3分間香ります · 最後の1回でした', zh: '🧴 {name} · 香味持续3分钟 · 这是最后一喷', es: '🧴 {name} · dura 3 min · era la última', ar: '🧴 {name} · يدوم 3 دقائق · كانت آخر رشّة', vi: '🧴 {name} · thơm trong 3 phút · đó là lần xịt cuối', hi: '🧴 {name} · 3 मिनट तक · यह आख़िरी बार था', id: '🧴 {name} · tahan 3 menit · itu semprotan terakhir' },
  gone: { en: 'Your perfume has worn off. Spray again from your bag.', ko: '향수 향이 날아갔어요. 가방에서 꺼내 다시 뿌려요.', ja: '香水の香りが消えました。バッグから出してまたつけてね。', zh: '香水味散了。从包里拿出来再喷一次吧。', es: 'Tu perfume se ha desvanecido. Vuelve a rociarlo desde la bolsa.', ar: 'تلاشى عطرك. رشّه مجددًا من الحقيبة.', vi: 'Mùi nước hoa đã bay hết. Lấy từ túi ra xịt lại nhé.', hi: 'आपकी ख़ुशबू उड़ गई। बैग से निकालकर फिर छिड़कें।', id: 'Wangi parfummu sudah hilang. Semprot lagi dari tas.' },
  desc: { en: '{style} perfume · {n} sprays left. Hold it and tap 🧴 Spray.', ko: '{style} 향수 · {n}번 남음. 손에 들고 🧴 뿌리기를 눌러요.', ja: '{style}な香水 · 残り{n}回。手に持って🧴をタップ。', zh: '{style}香水 · 还剩{n}次。拿在手上点🧴。', es: 'Perfume {style} · quedan {n}. Sostenlo y toca 🧴.', ar: 'عطر {style} · بقيت {n} رشّات. أمسكه واضغط 🧴.', vi: 'Nước hoa {style} · còn {n} lần. Cầm lên và nhấn 🧴.', hi: '{style} ख़ुशबू · {n} बार बाक़ी। हाथ में लेकर 🧴 दबाएँ।', id: 'Parfum {style} · sisa {n}. Pegang lalu ketuk 🧴.' },
};
const scent = new Scent(localStorage, (id) => perfumes.has(id));
let myScent = scent.active();
const scentFx = new ScentFx();
let myPuffIn = 1;
function sprayPerfume() {
  const pf = perfumes.get(held?.p);
  if (!pf) { setHeld(null); return; }
  me.play('clap'); // lift the bottle
  sfx.pop?.();
  scent.spray(pf.product.id);
  myScent = pf.product.id;
  const p = me.root.position;
  scentFx.attach(activeScene);
  scentFx.puff(p.x, p.y, p.z, pf.fx, true);
  myPuffIn = nextPuff();
  showBubble(myLabel, $('labels'), '🧴 ' + localName(pf.product.name, getLanguage()), 2500);
  const sprays = held.sips - 1;
  const name = localName(pf.product.name, getLanguage());
  if (sprays <= 0) { setHeld(null); shop.toast(fmt(L(PERFUME_TEXT.last), { name })); }
  else { setHeld({ ...held, sips: sprays }); shop.toast(fmt(L(PERFUME_TEXT.sprayed), { name, n: sprays })); }
  lastSent = null; // others see the scent at once
}
// Shops with "clerkRoams" (the big perfume houses): the clerk walks from
// display to display, pauses there, and greets visitors who come close.
const CLERK_HI = [['어서 오세요!', 'eoseo oseyo', 'Welcome!'], ['천천히 둘러보세요.', 'cheoncheonhi dulleoboseyo.', 'Take your time and look around.'], ['시향해 보시겠어요?', 'sihyang-hae bosigesseoyo?', 'Would you like to try a tester?']];
const roam = { to: null, wait: 2, hiAt: 0, last: -1 };
function roamClerk(dt, p) {
  const r = clerk.ch.root.position;
  const now = performance.now();
  if (Math.hypot(p.x - r.x, p.z - r.z) < 2.4 && now - roam.hiAt > 20000) { // say hi, face them
    roam.hiAt = now;
    roam.wait = Math.max(roam.wait, 2.5);
    roam.to = null;
    clerk.ch.root.rotation.y = Math.atan2(p.x - r.x, p.z - r.z);
    say(clerk, $('labels'), CLERK_HI[Math.floor(Math.random() * CLERK_HI.length)]);
  }
  if (roam.wait > 0) { roam.wait -= dt; return 0; }
  if (!roam.to) {
    const spots = interior.products;
    if (!spots?.length) return 0;
    let k = Math.floor(Math.random() * spots.length);
    if (k === roam.last) k = (k + 1) % spots.length; // somewhere new each time
    roam.last = k;
    const s = spots[k].pos;
    roam.to = { x: s.x, z: s.z };
  }
  const dx = roam.to.x - r.x, dz = roam.to.z - r.z, dist = Math.hypot(dx, dz);
  if (dist < 0.15) { roam.to = null; roam.wait = 3 + Math.random() * 3; return 0; }
  const step = Math.min(dist, dt * 1.1);
  r.x += (dx / dist) * step; r.z += (dz / dist) * step;
  clerk.ch.root.rotation.y = Math.atan2(dx, dz);
  return 0.35;
}
// Someone in the same shop tried a tester: a burst and the name next to them.
let lastSniffSent = 0;
const sniffSeen = new Map(); // remote id -> time of their last tester
function onPeerSniff(id, pid) {
  const pf = perfumes.get(pid), o = others.players.get(id);
  if (!pf || !o || o.hidden || !interior || safety.isBlocked(id, others.nameOf(id))) return;
  const now = performance.now();
  if (now - (sniffSeen.get(id) || 0) < 1500) return; // too many: skip
  sniffSeen.set(id, now);
  const r = o.ch.root.position;
  scentFx.attach(activeScene);
  scentFx.puff(r.x, r.y, r.z, pf.fx, true);
  showBubble(o, $('labels'), '👃 ' + localName(pf.product.name, getLanguage()), 2500);
}
// Every frame: my puffs, and those of people near the camera who wear one.
const scentSeen = new Map(); // remote id -> { sc, puffIn }
function updateScents(dt) {
  scentFx.attach(activeScene);
  const now = Date.now();
  if (myScent && !scent.active(now)) { myScent = null; lastSent = null; shop.toast(L(PERFUME_TEXT.gone)); }
  if (myScent && (myPuffIn -= dt) <= 0) {
    myPuffIn = nextPuff();
    const p = me.root.position;
    scentFx.puff(p.x, p.y, p.z, perfumes.get(myScent)?.fx);
  }
  for (const [id, o] of others.players) {
    const sc = !o.hidden && perfumes.has(o.target?.sc) ? o.target.sc : null;
    let seen = scentSeen.get(id);
    if (!sc) { if (seen) scentSeen.delete(id); continue; }
    const r = o.ch.root.position;
    const near = camera.position.distanceTo(r) < PUFF_NEAR;
    if (!seen || seen.sc !== sc) { // they just sprayed: show the name and a burst
      seen = { sc, puffIn: nextPuff() };
      scentSeen.set(id, seen);
      if (near) {
        scentFx.puff(r.x, r.y, r.z, perfumes.get(sc).fx, true);
        showBubble(o, $('labels'), '🧴 ' + localName(perfumes.get(sc).product.name, getLanguage()), 2500);
      }
      continue;
    }
    if ((seen.puffIn -= dt) <= 0) {
      seen.puffIn = nextPuff();
      if (near) scentFx.puff(r.x, r.y, r.z, perfumes.get(sc).fx);
    }
  }
  for (const id of scentSeen.keys()) if (!others.players.has(id)) scentSeen.delete(id);
  scentFx.update(dt);
}
const HELD_KEY = 'mk.held';
// The bag (core/bag.js): books, drinks and the umbrella you carry but don't
// hold in your hand. 20 slots for now.
const bag = new Bag(localStorage, { isBook: (id) => !!bookById(id), maxSips: COFFEE_SIPS, isPerfume: (id) => perfumes.has(id), maxSprays: SPRAYS });
let held = (() => {
  try {
    const h = JSON.parse(localStorage.getItem(HELD_KEY) || 'null');
    if (h?.kind === 'book') return bookById(h.book) ? { kind: 'book', book: h.book } : null;
    if (h?.kind === 'gift') return giftEntry(h);
    if (h?.kind === 'perfume') return perfumes.has(h.p) && h.sips > 0 ? { kind: 'perfume', p: h.p, sips: Math.min(SPRAYS, h.sips | 0), name: String(h.name || '').slice(0, 60) } : null;
    return h && HELD_KINDS.includes(h.kind) && h.sips > 0 ? { kind: h.kind, sips: Math.min(COFFEE_SIPS, h.sips | 0), name: String(h.name || '').slice(0, 40), ...(h.ramen && h.kind === 'food' ? { ramen: true } : {}) } : null;
  } catch { return null; }
})();
// A fishing rod while the fishing panel is open shows instead of the cup.
let rodOut = false;
const rodSkins = new RodSkins();
const heldKind = () => (rodOut ? rodKind(rodSkins.equipped) : held?.kind || null);
function setHeld(h) {
  held = h;
  try { if (h) localStorage.setItem(HELD_KEY, JSON.stringify(h)); else localStorage.removeItem(HELD_KEY); } catch { /* storage blocked */ }
  me.setHeld(heldKind());
  $('drink-btn').hidden = !h || h.kind === 'gift'; // a shopping bag is just carried
  $('stow-btn').hidden = !h;
  $('drink-btn').querySelector('span').textContent = h?.kind === 'book' ? '📖' : h?.kind === 'food' ? '🥡' : h?.kind === 'glass' ? '🍹' : h?.kind === 'perfume' ? '🧴' : '☕';
  $('drink-btn').querySelector('small').textContent = h?.kind === 'food' ? L(DINE_TEXT.eat) : h?.kind === 'perfume' ? L(PERFUME_TEXT.spray) : t(h?.kind === 'book' ? 'book.read' : 'coffee.drink');
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
  if (held.kind === 'perfume') { sprayPerfume(); return; }
  if (held.ramen && !seated?.parasol) { shop.toast(L(INGREDIENT_TEXT.sit)); return; } // Han River ramen: at a parasol table
  me.play('clap'); // the "use item" move: lift the cup
  sfx.pop?.();
  if (held.kind === 'coffee' || held.kind === 'glass') { // any drink: full stamina, and it stays full for 3 minutes
    const fresh = performance.now() > stamina.boostUntil - DRINK_BOOST_MS + 5000;
    stamina.v = 1; stamina.tired = false; stamina.rest = 0;
    stamina.boostUntil = performance.now() + DRINK_BOOST_MS;
    if (fresh) setTimeout(() => shop.toast(L(DRINK_TEXT.boost)), 1700);
  }
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
const wxSpeed = () => (mode !== 'street' || isCar(riding) ? 1 : weatherSpeed(weather.kind, { bike: !!riding, umbrella: umbrellaOpen() }));
const UMB_TEXT = {
  bought: { en: 'Got an umbrella! It opens by itself when it rains or snows. ☂️', ko: '우산을 샀어요! 비나 눈이 오면 저절로 펴져요. ☂️', ja: '傘を買いました！雨や雪の日は自動で開きます。☂️', zh: '买到雨伞了！下雨或下雪时会自动撑开。☂️' },
};
function buyUmbrella(product) {
  if (hasUmbrella()) return;
  if (bag.full) { shop.toast(fmt(L(BAG_TEXT.full), { cap: bag.cap })); return; }
  const cost = product.coins || 5;
  if (!wallet.spend(cost, { name: product.name, at: interior?.store.name })) { shop.toast(t('pet.noCoins', { n: cost - wallet.coins })); return; }
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
  if (e.kind === 'gift') return { emoji: e.icon || '🛍️', name: e.name || 'Shopping bag', desc: fmt(L(GOODS_TEXT.gift), { name: e.name || '' }), canHold: true };
  if (e.kind === 'perfume') {
    const pf = perfumes.get(e.p);
    return { emoji: '🧴', name: pf ? localName(pf.product.name, getLanguage()) : e.name, desc: fmt(L(PERFUME_TEXT.desc), { style: L(STYLES[pf?.style] || STYLES.simple), n: e.sips }), canHold: true };
  }
  return { emoji: e.kind === 'glass' ? '🍹' : '☕', name: e.name || 'Coffee', desc: fmt(L(DRINK_DESC), { n: e.sips }), canHold: true };
}
function stowHeld() {
  if (!held) return;
  if (!bag.add(held)) { shop.toast(fmt(L(BAG_TEXT.full), { cap: bag.cap })); return; }
  setHeld(null);
  sfx.pop?.();
  shop.toast(fmt(L(BAG_TEXT.stored), { n: bag.size, cap: bag.cap }));
}
// Taking something new in your hand puts what you were holding into the bag
// (it used to just vanish). Only when the bag is full do we ask first, since
// then the old thing would be thrown away.
function handReady() {
  if (!held || !bag.full) return true;
  return confirm(fmt(L(BAG_TEXT.fullSwap), { name: describeEntry(held).name, cap: bag.cap }));
}
function holdNew(h) {
  const old = held;
  if (old && bag.add(old)) {
    const name = describeEntry(old).name;
    setTimeout(() => shop.toast(fmt(L(BAG_TEXT.autoStow), { name, n: bag.size, cap: bag.cap })), 1800);
  }
  setHeld(h);
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
    itemEl('wallet-items-title').querySelector('.bag-owned').textContent = L(BAG_TEXT.owned);
    return [itemEl('wallet-items-title'), itemEl('wallet-items')];
  },
  closet: () => {
    refreshItems();
    return { nodes: [itemEl('wardrobe-items')], count: itemEl('wardrobe-items').childElementCount };
  },
  rides: () => (garage.s.own.length > 1 ? { nodes: [bagRideList()], count: garage.s.own.length } : null),
});
// The bag's Rides tab: every ride you own (bike, board, skates, scooter), to
// switch without going back to a ride shop. On the street and on foot,
// "Ride this" also gets you on it.
function bagRideList() {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const list = el('div', 'bag-rides');
  for (const m of BIKE_MODELS.filter((b) => garage.has(b.id))) {
    const on = garage.s.use === m.id;
    const row = el('div', 'lp-row bike-row' + (on ? ' on' : ''));
    const sw = el('span', 'bike-swatch');
    sw.style.background = m.color;
    const text = el('span', 'lp-text');
    const name = el('strong', null, `${VEHICLE_ICON[m.type]} ${L(m.name)} `);
    name.append(el('span', 'tier-stars t' + m.tier, TIER_STARS[m.tier]));
    text.append(name, el('small', null, `${L(BIKE_TEXT.speed)} ${garage.speedOf(m.id).toFixed(1)} · ${fmt(L(BIKE_TEXT.dur), { n: Math.floor(garage.durability(m.id)) })}`));
    const btns = el('span', 'bike-btns');
    if (on) btns.append(el('small', 'bike-using', '✓ ' + L(riding === 1 ? BIKE_TEXT.using : BIKE_TEXT.picked)));
    else {
      const b = el('button', 'chip', L(BIKE_TEXT.use));
      b.onclick = () => {
        garage.use(m.id);
        sfx.pop?.();
        if (riding === 1) applyRide();
        else if (!riding && mode === 'street') { bagUi.hide(); setRiding(1); }
        shop.toast(fmt(L(riding === 1 ? BIKE_TEXT.switched : BIKE_TEXT.pickedNote), { name: `${VEHICLE_ICON[m.type]} ${L(m.name)}` }));
        if (!$('bag-panel').hidden) bagUi.render();
      };
      btns.append(b);
    }
    row.append(sw, text, btns);
    list.append(row);
  }
  return list;
}
$('bag-btn').onclick = () => { if ($('bag-panel').hidden) bagUi.show(); else bagUi.hide(); };
$('bag-btn').querySelector('small').textContent = L(BAG_TEXT.title);
onLanguageChange(() => {
  $('stow-btn').querySelector('small').textContent = L(BAG_TEXT.put);
  $('bag-btn').querySelector('small').textContent = L(BAG_TEXT.title);
});

function setLook(look) {
  currentLook = look;
  styleMyTag(look);
  const old = me.root;
  me = createCharacter(look);
  me.root.position.copy(old.position);
  me.root.rotation.copy(old.rotation);
  me.setBike(riding, riding === 1 ? garage.rideSpec() : undefined, riding === 3 && isCar(others.kindOf(tandemDriver)));
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
let signsTranslated = false; // signs in the player's language (the signs button, below)
let clerk = null; // the clerk NPC in the shop you're in
let trainer = null; // the gym's trainer NPC
let barkeep = null; // a club's bartender
let areaGuide = null; // an Information Center's area guide (the clerk is the game guide)
const TRAINER_LOOK = { model: 'trainer', hair: 'black', skin: 'warm', shirt: 'charcoal' };
let trainerLine = -1;
function talkToTrainer() {
  trainerLine = nextTrainerLine(trainerLine);
  const [ko, rom, en] = TRAINER_LINES[trainerLine];
  trainer.ch.play(trainerLine % 2 ? 'cheer' : 'clap');
  say(trainer, $('labels'), [ko, rom, en]);
  me.root.rotation.y = Math.atan2(trainer.ch.root.position.x - me.root.position.x, trainer.ch.root.position.z - me.root.position.z);
}
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
  if (isCar(riding)) {
    // Park and step out onto free ground beside the car.
    const ry = me.root.rotation.y;
    const [fx, fz] = findFreeSpot(me.root.position.x + Math.cos(ry) * 1.7, me.root.position.z - Math.sin(ry) * 1.7);
    me.root.position.set(fx, 0, fz);
  }
  riding = kind;
  me.setBike(kind, kind === 1 ? garage.rideSpec() : undefined, kind === 3 && isCar(others.kindOf(tandemDriver)));
  if (kind === 1 || kind === 2) missionEvent('bike');
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
    const ok = (riding === 2 || isCar(riding) || riding === 5) && seat < seatsOf(riding) && !passengers.has(seat) && ![...passengers.values()].includes(from);
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
// Items (saved on this device). A developer code in chat adds items.
const inventory = new Inventory();
// Outfits are bought now. Players who already picked one at the start keep it.
try {
  if (!localStorage.getItem('mk.outfitGift')) {
    if (OUTFIT_ITEM(myLook.model)) inventory.add(OUTFIT_ITEM(myLook.model));
    localStorage.setItem('mk.outfitGift', '1');
  }
} catch { /* storage blocked */ }
if (OUTFIT_ITEM(myLook.model) && !isHanbokModel(myLook.model) && !inventory.has(OUTFIT_ITEM(myLook.model))) { myLook = { ...myLook, model: 'basic' }; saveLook(myLook); setTimeout(() => setLook(myLook), 0); }
const CODE_TEXT = {
  coins: { en: '🪙 +{n} coins!', ko: '🪙 {n}코인을 받았어요!', ja: '🪙 {n}コインもらいました！', zh: '🪙 获得{n}枚硬币！', es: '🪙 ¡+{n} monedas!', ar: '🪙 +{n} عملة!', vi: '🪙 +{n} xu!', hi: '🪙 +{n} सिक्के!', id: '🪙 +{n} koin!' },
  used: { en: 'That code was already used on this device.', ko: '이 기기에서 이미 쓴 코드예요.', ja: 'この端末ではもう使ったコードです。', zh: '这个代码已在本设备上使用过。', es: 'Ese código ya se usó en este dispositivo.', ar: 'استُخدم هذا الرمز بالفعل على هذا الجهاز.', vi: 'Mã này đã được dùng trên thiết bị này.', hi: 'यह कोड इस डिवाइस पर पहले ही इस्तेमाल हो चुका है।', id: 'Kode itu sudah dipakai di perangkat ini.' },
  fish: { en: '🎣 Something huge is waiting... Cast your line!', ko: '🎣 뭔가 거대한 게 기다리고 있어요... 낚싯대를 던져 보세요!', ja: '🎣 何か大きなものが待っています…竿を投げてみて！', zh: '🎣 有个大家伙在等着……快抛竿吧！', es: '🎣 Algo enorme te espera... ¡Lanza la caña!', ar: '🎣 شيء ضخم ينتظر... ارمِ صنارتك!', vi: '🎣 Có thứ gì đó rất lớn đang chờ... Hãy quăng cần!', hi: '🎣 कुछ बहुत बड़ा इंतज़ार कर रहा है... कांटा डालो!', id: '🎣 Ada sesuatu yang besar menunggu... Lempar kailmu!' },
  wrong: { en: 'That event code doesn\'t exist.', ko: '없는 이벤트 코드예요.', ja: 'そのイベントコードはありません。', zh: '没有这个活动代码。', es: 'Ese código de evento no existe.', ar: 'رمز الفعالية هذا غير موجود.', vi: 'Mã sự kiện này không tồn tại.', hi: 'यह इवेंट कोड मौजूद नहीं है।', id: 'Kode acara itu tidak ada.' },
};
const OUTFIT_TEXT = {
  bought: { en: 'New clothes! You are wearing them now.', ko: '새 옷을 샀어요! 바로 입었어요.', ja: '新しい服を買いました！さっそく着ています。', zh: '买了新衣服！已经穿上了。', es: '¡Ropa nueva! Ya la llevas puesta.', ar: 'ملابس جديدة! أنت ترتديها الآن.', vi: 'Quần áo mới! Bạn đang mặc rồi.', hi: 'नए कपड़े! आपने इन्हें अभी पहन लिया है।', id: 'Baju baru! Sekarang sedang kamu pakai.' },
  on: { en: 'Changed clothes!', ko: '옷을 갈아입었어요!', ja: '着替えました！', zh: '换好衣服了！', es: '¡Te cambiaste de ropa!', ar: 'غيّرت ملابسك!', vi: 'Đã thay đồ!', hi: 'कपड़े बदल लिए!', id: 'Sudah ganti baju!' },
  off: { en: 'Back in your T-shirt.', ko: '티셔츠로 갈아입었어요.', ja: 'Tシャツに着替えました。', zh: '换回T恤了。', es: 'De vuelta a tu camiseta.', ar: 'عدت إلى قميصك.', vi: 'Đã trở lại áo phông.', hi: 'वापस अपनी टी-शर्ट में।', id: 'Kembali ke kaosmu.' },
  boughtThing: { en: 'Bought! You are wearing it now.', ko: '샀어요! 바로 착용했어요.', ja: '買いました！さっそく着けています。', zh: '买好了！已经穿戴上了。', es: '¡Comprado! Ya lo llevas puesto.', ar: 'تم الشراء! أنت ترتديه الآن.', vi: 'Đã mua! Bạn đang đeo/mặc rồi.', hi: 'ख़रीद लिया! आपने इसे अभी पहन लिया है।', id: 'Sudah dibeli! Sekarang sedang kamu pakai.' },
  offThing: { en: 'Taken off.', ko: '벗었어요.', ja: '外しました。', zh: '取下了。', es: 'Te lo quitaste.', ar: 'خلعته.', vi: 'Đã tháo ra.', hi: 'उतार दिया।', id: 'Sudah dilepas.' },
};
// Clothes and accessory shops and the items list: buy (coins), wear, or
// take off. Buying puts it on right away.
function outfitAction(itemId) {
  const it = ITEMS[itemId];
  if (!it?.wear) return;
  const on = isWorn(it, myLook);
  if (!inventory.has(itemId)) {
    if (!wallet.spend(it.price, { name: it.name, at: interior?.store.name })) { shop.toast(t('pet.noCoins', { n: it.price - wallet.coins })); return; }
    inventory.add(itemId);
    refreshWallet();
    sfx.pop?.();
    myLook = { ...myLook, ...it.wear };
    shop.toast(L(it.outfit ? OUTFIT_TEXT.bought : OUTFIT_TEXT.boughtThing));
  } else if (on) {
    if (!it.off) return; // trousers: swap them for another pair instead
    myLook = { ...myLook, ...it.off };
    shop.toast(L(it.outfit ? OUTFIT_TEXT.off : OUTFIT_TEXT.offThing));
  } else {
    myLook = { ...myLook, ...it.wear };
    shop.toast(L(OUTFIT_TEXT.on));
  }
  saveLook(myLook);
  setLook(myLook);
}
// Hanbok rental (Dano Hanbok Rental by Gyeongbokgung): pay coins, wear it for
// a few hours, then your own clothes come back by themselves, also after a
// reload (core/hanbok-rental.js). A chip shows the time left.
const RENT_TEXT = {
  rented: { en: '🪭 Rented! Enjoy your hanbok for {h} hours.', ko: '🪭 대여 완료! {h}시간 동안 한복을 즐겨요.', ja: '🪭 レンタル完了！{h}時間韓服を楽しんでね。', zh: '🪭 租好了！尽情穿{h}小时韩服吧。', es: '🪭 ¡Alquilado! Disfruta tu hanbok {h} horas.', ar: '🪭 تم الاستئجار! استمتع بالهانبوك لمدة {h} ساعات.', vi: '🪭 Đã thuê! Tận hưởng hanbok trong {h} giờ.', hi: '🪭 किराए पर लिया! {h} घंटे हानबोक का मज़ा लें।', id: '🪭 Tersewa! Nikmati hanbokmu selama {h} jam.' },
  ended: { en: '🪭 Your hanbok rental is over: back in your own clothes.', ko: '🪭 한복 대여 시간이 끝나서 원래 옷으로 돌아왔어요.', ja: '🪭 韓服のレンタル時間が終わり、元の服に戻りました。', zh: '🪭 韩服租借时间到了，已换回原来的衣服。', es: '🪭 Terminó el alquiler del hanbok: vuelves a tu ropa.', ar: '🪭 انتهى إيجار الهانبوك: عدت إلى ملابسك.', vi: '🪭 Hết giờ thuê hanbok: bạn đã mặc lại đồ của mình.', hi: '🪭 हानबोक का किराया ख़त्म: आप अपने कपड़ों में वापस हैं।', id: '🪭 Sewa hanbok selesai: kembali ke bajumu sendiri.' },
  returned: { en: '🪭 Hanbok returned. Thank you!', ko: '🪭 한복을 반납했어요. 감사합니다!', ja: '🪭 韓服を返却しました。ありがとう！', zh: '🪭 韩服已归还，谢谢！', es: '🪭 Hanbok devuelto. ¡Gracias!', ar: '🪭 أُعيد الهانبوك. شكرًا!', vi: '🪭 Đã trả hanbok. Cảm ơn!', hi: '🪭 हानबोक लौटा दिया। धन्यवाद!', id: '🪭 Hanbok dikembalikan. Terima kasih!' },
  chipHint: { en: 'Your own clothes come back when the time is up. Return it early at the hanbok shop.', ko: '시간이 끝나면 원래 옷으로 돌아와요. 한복집에서 미리 반납할 수도 있어요.', ja: '時間が来ると元の服に戻ります。韓服店で早めに返すこともできます。', zh: '时间到了会换回原来的衣服，也可以在韩服店提前归还。', es: 'Tu ropa vuelve cuando se acaba el tiempo. Puedes devolverlo antes en la tienda.', ar: 'تعود ملابسك عند انتهاء الوقت. يمكنك إعادته مبكرًا في متجر الهانبوك.', vi: 'Hết giờ quần áo của bạn sẽ trở lại. Có thể trả sớm ở tiệm hanbok.', hi: 'समय पूरा होने पर आपके कपड़े लौट आते हैं। चाहें तो दुकान पर पहले लौटा दें।', id: 'Bajumu kembali saat waktunya habis. Bisa dikembalikan lebih awal di toko hanbok.' },
};
let rental = loadRental();
function rentHanbok(product) {
  const set = hanbokById(product.rent);
  if (!set) return;
  if (isRenting(rental, product.rent)) { // give it back early
    myLook = endRental(myLook, rental);
    rental = null;
    shop.toast(L(RENT_TEXT.returned));
  } else {
    if (!wallet.spend(set.coins, { name: product.name, at: interior?.store.name })) { shop.toast(t('pet.noCoins', { n: set.coins - wallet.coins })); return; }
    refreshWallet();
    sfx.pop?.();
    const r = startRental(myLook, product.rent, Date.now(), rental);
    myLook = r.look;
    rental = r.rental;
    shop.toast(fmt(L(RENT_TEXT.rented), { h: RENT_HOURS }));
  }
  $('revert-look').hidden = true;
  saveRental(rental);
  saveLook(myLook);
  setLook(myLook);
  refreshRentChip();
}
function refreshRentChip() {
  const chip = $('rent-chip');
  chip.hidden = !rental;
  if (rental) chip.textContent = '🪭 ' + formatLeft(timeLeft(rental));
  chip.title = rental ? fmt(L(RENT.left), { t: formatLeft(timeLeft(rental)) }) : '';
}
// Time up (checked now, then every 20 s): your own clothes back.
function tickRental() {
  const r = checkRental(myLook, rental);
  if (r.rental !== rental || r.look !== myLook) {
    rental = r.rental;
    saveRental(rental);
    if (r.look !== myLook) {
      myLook = r.look;
      saveLook(myLook);
      if (currentLook !== myLook) $('revert-look').hidden = true;
      setLook(myLook);
      if (r.ended) shop.toast(L(RENT_TEXT.ended));
    }
  }
  refreshRentChip();
}
setTimeout(tickRental, 0);
setInterval(tickRental, 20000);
onLanguageChange(refreshRentChip);
$('rent-chip').onclick = () => shop.toast(`${fmt(L(RENT.left), { t: formatLeft(timeLeft(rental)) })} · ${L(RENT_TEXT.chipHint)}`);
// Gifts: buy something in a shop for someone else in the same shop (rules in
// core/gifts.js). The giver pays now; the friend gets a card to accept, and
// it goes into their bag (or their items, for clothes). No, no answer, or
// someone leaving the shop gives the coins back.
// What a product becomes as a gift here, or null when it can't be one:
// { coins, icon, name, item } (clothes: an item id) or { ..., entry } (a bag entry).
function giftFor(store, product) {
  if (!store || !product || product.adopt || product.umbrella || product.rent || !onSale(product) || itemSoon(store, product)) return null;
  const name = product.name;
  const itemId = product.item || product.outfit;
  const it = itemId && ITEMS[itemId];
  if (it?.wear) return it.price > 0 ? { coins: it.price, icon: it.emoji || '👕', name, item: itemId } : null;
  const how = howToGet(store);
  if (how === 'counter') {
    const kind = heldFor(product, store);
    return { coins: coinPrice(product.price), icon: kind === 'food' ? '🥐' : kind === 'glass' ? '🍹' : '🥤', name, entry: { kind, sips: kind === 'food' ? FOOD_BITES : COFFEE_SIPS, name: localName(name, 'en') } };
  }
  if (how !== 'buy') return null;
  const coins = coinsFor(product.price);
  if (product.perfume) return perfumes.has(product.id) ? { coins, icon: '🧴', name, entry: { kind: 'perfume', p: product.id, sips: SPRAYS, name: localName(name, 'en') } } : null;
  const kind = goodsKind(product), icon = SHOP_ICON[product.model] || '🛍️';
  return { coins, icon, name, entry: kind === 'gift' ? { kind, sips: 1, name: localName(name, 'en'), icon } : { kind, sips: kind === 'food' ? FOOD_BITES : COFFEE_SIPS, name: localName(name, 'en') } };
}
// Everyone I can see in this shop, closest first.
function peopleHere() {
  if (!interior || subway.metro) return [];
  const p = me.root.position, out = [];
  for (const [id, o] of others.players) {
    if (o.hidden) continue;
    const at = o.ch.root.position;
    out.push({ id, name: o.name || '?', d: Math.hypot(at.x - p.x, at.z - p.z) });
  }
  return out.sort((a, b) => a.d - b.d).slice(0, 12);
}
const canGift = (product) => !!giftFor(interior?.store, product) && peopleHere().length > 0;
function startGift(store, product) {
  const g = giftFor(store, product);
  if (!g) return;
  const name = localName(g.name, getLanguage());
  shop.closeProduct();
  counterUi.close();
  giftUi.pick({ icon: g.icon, name, coins: g.coins }, peopleHere(), (to) => {
    const why = gifts.why(to.id);
    if (why) { shop.toast(fmt(L(GIFT_TEXT[why]), { name: to.name, n: GIFTS_PER_DAY })); return; }
    if (!others.players.has(to.id)) { shop.toast(L(GIFT_TEXT.nobody)); return; }
    if (!wallet.spend(g.coins, { name: g.name, at: GIFT_TEXT.ledger })) { shop.toast(fmt(L(DINE_TEXT.poor), { n: g.coins })); return; }
    refreshWallet();
    const gid = gifts.send({ to: to.id, name: to.name, store: store.id, product: product.id, coins: g.coins });
    net.sendEmote(giftMsg('offer', to.id, gid, store.id, product.id));
    sfx.pop?.();
    shop.toast(fmt(L(GIFT_TEXT.sent), { name: to.name }));
  });
}
function refundGift(g, reason) {
  if (g.coins > 0) wallet.add(g.coins, { name: productById(g.store, g.product)?.name, at: GIFT_TEXT.refund });
  refreshWallet();
  shop.toast(fmt(L(GIFT_TEXT.back[reason] || GIFT_TEXT.back.no), { name: g.name, n: g.coins }));
}
const productById = (storeId, productId) => storeData.find((s) => s.id === storeId)?.products?.find((p) => p.id === productId) || null;
function showGiftCards() {
  giftUi.showCards(gifts.cards().map((c) => {
    const g = giftFor(storeData.find((s) => s.id === c.store), productById(c.store, c.product));
    return { gid: c.gid, name: c.name, item: g ? localName(g.name, getLanguage()) : '?', icon: g?.icon || '🎁' };
  }));
}
function onGiftMsg(from, m) {
  if (m.to !== myId) return;
  const name = others.nameOf(from) || '?';
  if (m.verb === 'offer') {
    if (safety.isBlocked(from, name)) return; // blocked: as if it never came (their coins come back on time out)
    const store = storeData.find((s) => s.id === m.store);
    if (!giftFor(store, productById(m.store, m.product))) return; // not something this game version sells
    const r = gifts.heard(from, name, m);
    if (r === 'show') { sfx.pop?.(); showGiftCards(); }
    else if (r) net.sendEmote(giftMsg('no', from, m.gid, r));
    return;
  }
  const r = gifts.answer(from, m.gid, m.verb);
  if (!r) return;
  if (m.verb === 'ok') {
    sfx.pop?.();
    shop.toast(fmt(L(GIFT_TEXT.accepted), { name: r.gift.name, item: localName(productById(r.gift.store, r.gift.product)?.name, getLanguage()) || '🎁' }));
  } else refundGift(r.gift, m.reason);
}
// I tapped Accept or No thanks on a card.
function answerGift(gid, ok) {
  const c = gifts.reply(gid, ok);
  showGiftCards();
  if (!c) return;
  const g = giftFor(storeData.find((s) => s.id === c.store), productById(c.store, c.product));
  if (!ok || !g) { net.sendEmote(giftMsg('no', c.from, gid, 'no')); return; }
  const item = localName(g.name, getLanguage());
  if (g.item) {
    if (inventory.has(g.item)) { net.sendEmote(giftMsg('no', c.from, gid, 'have')); shop.toast(fmt(L(GIFT_TEXT.mineHave), { item, name: c.name })); return; }
    inventory.add(g.item);
    if (!$('wallet-panel').hidden || !$('bag-panel').hidden) refreshItems();
    shop.toast(fmt(L(GIFT_TEXT.gotItem), { item, name: c.name }));
  } else {
    if (!bag.add(g.entry)) { net.sendEmote(giftMsg('no', c.from, gid, 'full')); shop.toast(fmt(L(GIFT_TEXT.mineFull), { name: c.name })); return; }
    shop.toast(fmt(L(GIFT_TEXT.gotBag), { item, name: c.name }));
  }
  sfx.pop?.();
  net.sendEmote(giftMsg('ok', c.from, gid));
}
// Changing room (leaving a shop): every gift still waiting is called off.
function dropGifts() {
  for (const g of gifts.cancelAll()) refundGift(g, 'gone');
  giftUi.close();
  showGiftCards();
}
setInterval(() => {
  const gone = (id) => !others.players.has(id);
  for (const g of gifts.expire(gone)) refundGift(g, gone(g.to) ? 'gone' : 'late');
  const stale = gifts.stale(gone);
  for (const c of stale) if (!gone(c.from)) net.sendEmote(giftMsg('no', c.from, c.gid, 'late'));
  if (stale.length) showGiftCards();
  if (giftUi.open && !interior) giftUi.close();
}, 1000);
// What you can ride: the share bike always, plus owned vehicles.
const RIDES = [
  { kind: 1, emoji: '🚲', label: 'ride.bike' },
  { kind: 2, emoji: '🚲🚲', label: 'ride.tandem', item: 'tandem' },
  { kind: 4, emoji: '🏎️', label: 'ride.car', item: 'car' },
  { kind: 6, emoji: '🚘', label: 'ride.limo', item: 'limo' },
  { kind: 5, emoji: '🏍️', label: 'ride.moto', item: 'moto' },
];
function ridePicker() {
  if (riding) { setRiding(0); return; }
  const rides = RIDES.filter((r) => !r.item || inventory.has(r.item));
  if (rides.length === 1) { startRide(1); return; }
  $('ride-options').replaceChildren(...rides.map((r) => {
    const b = document.createElement('button');
    b.className = 'primary';
    b.textContent = r.kind === 1 ? `${VEHICLE_ICON[garage.current.type]} ${L(garage.current.name)}` : `${r.emoji} ${t(r.label)}`;
    b.onclick = () => { $('ride-panel').hidden = true; startRide(r.kind); };
    return b;
  }));
  $('ride-panel').hidden = false;
}
$('ride-close').onclick = () => { $('ride-panel').hidden = true; };
// Cars go anywhere now (alleys too), like the bikes.
function startRide(kind) {
  setRiding(kind);
}
// My bike (from the toolbar): ride anywhere on the street, tap again to get off.
$('bike-btn').onclick = () => ridePicker();
onLanguageChange(() => { $('bike-label').textContent = t(riding ? 'bike.offShort' : 'hud.bike'); });

function teacherLabel() { return L({ en: 'Teacher', ko: '선생님', ja: '先生', zh: '老师' }); }
function enterStore(item) {
  setRiding(false);
  const metroRoom = (st) => st?.category === 'station' || st?.category === 'train';
  if (!metroRoom(item.store)) sfx.doorbell(); // automatic door sliding open (the subway has its own sounds)
  const store = item.store;
  let built = interiorCache.get(store.id);
  if (!built) {
    built = buildInterior(store);
    built.collision = new CollisionMap(built.colliders);
    interiorCache.set(store.id, built);
    built.setSignLang?.(signsTranslated ? getLanguage() : null);
    if (built.stations?.dartboards) built.dartPins = new DartPins(built.scene, built.stations.dartboards);
    stampStands.addRoom(store.id, built.scene, built.floorAt); // stamp stands inside (the Namsan summit)
  }
  built.dartPins?.clearAll(); // darts from an earlier visit (those people may be gone)
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
    built.clerkNpc = makeNpc($('labels'), store.category === 'school' ? teacherLabel() : store.workshop === 'tarot' ? '🔮 ' + L(TAROT_TEXT.reader) : store.workshop === 'kimchi' ? '👵 ' + L(KIMCHI_TEXT.teacher) : store.workshop === 'kimchi-buy' ? '👵 ' + MARKET_L('boss') : store.workshop === 'japchae' ? '👨‍🍳 ' + L(JAPCHAE_TEXT.teacher) : store.category === 'club' ? 'DJ' : store.category === 'bar' ? L(BARTENDER) : store.workshop === 'info' ? '🎮 ' + L(INFO_TEXT.gameGuide) : t('npc.clerk'));
    built.clerkNpc.ch.root.position.set(built.clerk.x, built.clerk.y || 0, built.clerk.z);
    // A roaming clerk starts on the shop floor, in front of the counter (all
    // the displays are on that side, so the walk never cuts through it).
    if (store.clerkRoams) built.clerkNpc.ch.root.position.set(built.clerk.x - 1.9, 0, built.clerk.z - 1.75);
    built.clerkNpc.ch.root.rotation.y = built.clerk.ry;
    built.scene.add(built.clerkNpc.ch.root);
  }
  clerk = built.clerkNpc || null;
  roam.to = null; roam.wait = 2; roam.hiAt = performance.now(); // (the door greeting is enough at first)
  if (built.trainer && !built.trainerNpc) {
    built.trainerNpc = makeNpc($('labels'), L(TRAINER_NAME), TRAINER_LOOK);
    built.trainerNpc.ch.root.position.set(built.trainer.x, 0, built.trainer.z);
    built.trainerNpc.ch.root.rotation.y = built.trainer.ry;
    built.scene.add(built.trainerNpc.ch.root);
  }
  trainer = built.trainerNpc || null;
  if (built.barkeep && !built.barkeepNpc) {
    built.barkeepNpc = makeNpc($('labels'), L(BARTENDER));
    built.barkeepNpc.ch.root.position.set(built.barkeep.x, 0, built.barkeep.z);
    built.barkeepNpc.ch.root.rotation.y = built.barkeep.ry;
    built.scene.add(built.barkeepNpc.ch.root);
  }
  barkeep = built.barkeepNpc || null;
  // Information Centers: the area guide next to the game guide (the clerk).
  if (built.stations?.areaGuide && !built.areaGuideNpc) { // (parks, stations and trains have no stations)
    const g = built.stations.areaGuide;
    built.areaGuideNpc = makeNpc($('labels'), '🗺️ ' + L(INFO_TEXT.areaGuide));
    built.areaGuideNpc.ch.root.position.set(g.x, 0, g.z);
    built.areaGuideNpc.ch.root.rotation.y = g.ry;
    built.scene.add(built.areaGuideNpc.ch.root);
  }
  areaGuide = built.areaGuideNpc || null;
  // A tarot café with two tables has a second reader.
  if (built.stations?.tarotReaders?.length > 1 && !built.readerNpcs) {
    built.readerNpcs = built.stations.tarotReaders.slice(1).map((r) => {
      const o = makeNpc($('labels'), '🔮 ' + L(TAROT_TEXT.reader));
      o.ch.root.position.set(r.x, 0, r.z);
      o.ch.root.rotation.y = r.ry;
      built.scene.add(o.ch.root);
      return o;
    });
  }
  interior.readerNpcs = built.readerNpcs || null;
  // The Han River park's market: a seller behind each stall.
  if (built.vendors?.length && !built.vendorNpcs) {
    built.vendorNpcs = built.vendors.map((v) => {
      const o = makeNpc($('labels'), '');
      o.tag.style.visibility = 'hidden'; // (the stall's sign says who they are; speech bubbles still show)
      o.ch.root.position.set(v.x, 0, v.z);
      o.ch.root.rotation.y = v.ry;
      built.scene.add(o.ch.root);
      return o;
    });
  }
  interior.vendorNpcs = built.vendorNpcs || null;
  if (store.pets && !built.pets) built.pets = new Pets(built.scene, built.room, (x, z, r) => built.collision.blocked(x, z, r), store.pets, 6, adoptables(store));
  interior.pets = built.pets || null;
  missionEvent('visit', store.id);
  deliveryArrived(store.id);
  if (store.music) enterMusicCafe();
  if (store.kpop) enterKpopCafe();
  if (store.cinema) enterKpopCafe('cinema', store.cinema);
  if (store.category === 'bar') enterMusicCafe('jazz'); // a quiet bar plays jazz
  if (store.genre) enterClub(store.genre);
  const quiet = store.category === 'library';
  const museum = store.category === 'museum';
  const hello = store.category === 'school' ? PHRASES.school[0] : quiet ? PHRASES.library[0] : museum ? PHRASES.museum[0] : store.category === 'culture' ? PHRASES.culture[0] : PHRASES.welcome[0];
  if (clerk) setTimeout(() => clerk && say(clerk, $('labels'), hello), 600);
  npcs.setVisible(false);
  if (store.category === 'home') {
    goSolo(built.scene); // your home is private for now
    openHome(store, built);
  } else joinRoom(`${roomId}-${store.id}`, built.scene);
}

// The museum's lift: each floor is its own interior; you step out by the lift.
function goMuseumFloor(floor) {
  if (mode !== 'store' || interior?.store.category !== 'museum' || floorOf(interior.store) === floor) return;
  const front = interior.front;
  standUp();
  if (museumUi.open) museumUi.close();
  if (clerk) { clerk.tag.style.display = 'none'; clerk.bubble?.remove(); clerk.bubble = null; } // the docent stays downstairs
  enterStore({ ...front, store: museumFloorStore(front.store, floor) });
  const l = interior.stations.lift;
  moveMeTo(interior.scene, l.x, l.z + 0.6, Math.PI); // facing the lift, so the camera is out in the hall
  const fade = $('fade');
  if (fade) { fade.classList.remove('go'); void fade.offsetWidth; fade.classList.add('go'); }
}

// Another Land's haunted house (core/haunted.js): its own interior, entered
// from the park. As with the museum's floors, the way out to the street
// (taxi, map, teleport) is still the park's gate; only its exit door leads
// back into the park, in front of the house.
const HAUNT_TEXT = {
  enter: { en: 'Enter the haunted house', ko: '귀신의 집 들어가기', ja: 'お化け屋敷に入る', zh: '进入鬼屋', es: 'Entrar en la casa encantada', id: 'Masuk rumah hantu', vi: 'Vào nhà ma', hi: 'भूतिया घर में जाएँ', ar: 'ادخل البيت المسكون' },
  back: { en: 'Back to the park', ko: '공원으로 나가기', ja: '遊園地に戻る', zh: '回到乐园', es: 'Volver al parque', id: 'Kembali ke taman', vi: 'Trở lại công viên', hi: 'पार्क में वापस', ar: 'العودة إلى الحديقة' },
  hello: {
    en: '👻 Follow the arrows. In the back room, tap the ghosts your lantern finds!', ko: '👻 화살표를 따라가요. 안쪽 방에서 랜턴에 나타나는 유령을 탭해요!',
    ja: '👻 矢印に沿って進もう。奥の部屋でランタンに現れるおばけをタップ！', zh: '👻 跟着箭头走。在里屋点击灯笼照到的幽灵！',
    es: '👻 Sigue las flechas. En la sala del fondo, toca los fantasmas que encuentre tu farol.', id: '👻 Ikuti panah. Di ruang belakang, ketuk hantu yang ditemukan lenteramu!',
    vi: '👻 Đi theo mũi tên. Ở phòng trong, chạm vào bóng ma mà đèn lồng tìm thấy!', hi: '👻 तीरों के पीछे चलें। पीछे के कमरे में लालटेन में दिखे भूतों पर टैप करें!',
    ar: '👻 اتبع الأسهم. في الغرفة الخلفية، انقر على الأشباح التي يجدها فانوسك!',
  },
};
let hauntSwitching = 0; // (one scene change per tap, however fast you tap)
const hauntFade = () => { const fade = $('fade'); if (fade) { fade.classList.remove('go'); void fade.offsetWidth; fade.classList.add('go'); } };
function enterHaunted() {
  if (mode !== 'store' || !interior?.park || performance.now() < hauntSwitching) return;
  hauntSwitching = performance.now() + 700;
  const front = interior.front;
  endRide();
  standUp();
  if (galleryUi.open) galleryUi.close();
  if (clerk) { clerk.tag.style.display = 'none'; clerk.bubble?.remove(); clerk.bubble = null; } // the ticket clerk stays outside
  enterStore({ ...front, store: HAUNT_STORE, parkFront: front });
  const built = interiorCache.get(HAUNT_STORE.id);
  built.resetVisit();
  built.onScare = (kind) => (kind === 'ghost' ? sfx.ghostly() : sfx.tock(0.25, 260));
  built.setSignLang(signsTranslated ? getLanguage() : null);
  hauntFade();
  shop.toast(L(HAUNT_TEXT.hello));
}
function backToPark() {
  const park = interior?.front?.parkFront;
  if (mode !== 'store' || !park || performance.now() < hauntSwitching) return;
  hauntSwitching = performance.now() + 700;
  if (hauntUi.open) hauntUi.close();
  enterStore(park);
  // Out in front of the door, the camera to the side so the house stays in view.
  moveMeTo(interior.scene, HAUNT_SPOT.x, HAUNT_SPOT.z, HAUNT_SPOT.ry, HAUNT_SPOT.ry - Math.PI / 2);
  hauntFade();
}

const BARTENDER = { en: 'Bartender', ko: '바텐더', ja: 'バーテンダー', zh: '调酒师' };
function leaveStore() {
  if (mode !== 'store') return;
  // Trying something on only lasts while you are in the shop: walking out
  // without buying puts your own look back.
  if (!$('revert-look').hidden) { setLook(myLook); $('revert-look').hidden = true; }
  if (subway.metro) endMetro(); // (a taxi or teleport from the train)
  endRide();
  cable = null;
  standUp();
  clearMeal();
  closeHome();
  closeHatWorkshop(false);
  if (orderUi.open) orderUi.close();
  if (grillUi.open) grillUi.close();
  if (fishingUi.open) fishingUi.close();
  if (marketUi.open) marketUi.close();
  if (ramenUi.open) ramenUi.close();
  if (kimchiUi.open) kimchiUi.close();
  if (japchaeUi.open) japchaeUi.close();
  if (kimbapUi.open) kimbapUi.close();
  if (kimchiSellUi.open) kimchiSellUi.close();
  tarotUi.close();
  leaveTarotLine(true);
  for (const g of [pochaUi, jobUi, karaokeUi, photoUi, clawUi, battingUi, galleryUi, hauntUi, dartsUi, duckUi, emblemUi, infoUi, saunaUi, gymUi, bookUi, academyUi, boardUi, museumUi, loveLockUi, wishUi]) if (g.open) g.close();
  beautyUi.close();
  leaveMusicCafe();
  leaveKpopCafe();
  leaveClub();
  for (const o of [clerk, trainer, barkeep, areaGuide, ...(interior.readerNpcs || []), ...(interior.vendorNpcs || [])]) if (o) { o.tag.style.display = 'none'; o.bubble?.remove(); o.bubble = null; }
  clerk = null;
  trainer = null;
  barkeep = null;
  areaGuide = null;
  if (counterUi.open) counterUi.close();
  npcs.setVisible(true);
  if (interior.store?.category !== 'station' && interior.store?.category !== 'train') sfx.doorbell();
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

// ---------- Subway station ----------
// Down by a stream (core/stream.js): which layer you are on and how high.
let byStream = null; // { i, y, low, stair } while on a stream's stairs or banks
function updateStream(p, px0, pz0) {
  if (!streams.length) return 0;
  let s = streamAt(streams, p.x, p.z, !!byStream?.low);
  if (s?.stair && riding) { p.x = px0; p.z = pz0; s = streamAt(streams, p.x, p.z, !!byStream?.low); } // no bikes down the steps
  byStream = s && (s.low || s.stair) ? s : null;
  if (mode === 'street') activeCollision = byStream?.low ? streamCollision : collision;
  return s ? s.y : 0;
}

// Station halls, ticket gates and riding the train (src/game/subway.js).
const subway = createSubway(subwayStations, {
  get interior() { return interior; }, get scene() { return scene; }, get cam() { return cam; },
  get me() { return me; }, get mode() { return mode; }, get riding() { return riding; }, get seated() { return seated; },
  get wallet() { return wallet; }, get shop() { return shop; }, get sfx() { return sfx; },
  enterStore, leaveStore, moveMeTo, findFreeSpot, goSolo, clearAction: () => { action = STALE; },
  streetY: (p, px0, pz0) => { const y = updateStream(p, px0, pz0); return y || skateY || hillY(map.landmarks, p.x, p.z) || buskingGroundY(map.landmarks, p.x, p.z); }, // down by a stream, in the skate park, up a park hill or the busking bank
});
const { stationStores, GATE_TEXT, METRO_TEXT, stationIndex, boardTrain, pickStop, metroGetOff, endMetro, passGate, updateSubway } = subway;

// Translate signs (storefronts and zone boards) into the chosen language.
const supportPlaces = []; // [district, 'spot' | 'wall', where] (debug)
const hiringRedraws = []; // hiring posters (set up below), redrawn in the sign language
const hiringPlaces = []; // [shop id, 'spot' | 'wall', spot id or [x, z]] (for checks)
const applySigns = () => {
  storefronts.setTranslated(signsTranslated, getLanguage());
  zones.setTranslated(signsTranslated, getLanguage());
  for (const e of subwayEntrances) e.setTranslated(signsTranslated, getLanguage());
  setParkSignsLang(signsTranslated ? getLanguage() : null); // park information boards
  for (const f of hiringRedraws) f(signsTranslated ? getLanguage() : 'en');
  for (const b of interiorCache.values()) b.setSignLang?.(signsTranslated ? getLanguage() : null); // the haunted house
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
const motionSound = new MotionSound(sfx); // footsteps, wind, engine, bell and horn
// Bicycle bell / horn while riding: you and nearby players hear it.
const HONK_TEXT = {
  bell: { en: 'Ring the bell', ko: '벨 울리기', ja: 'ベルを鳴らす', zh: '按车铃', es: 'Tocar el timbre', ar: 'اقرع الجرس', vi: 'Bấm chuông', hi: 'घंटी बजाएँ', id: 'Bunyikan bel' },
  horn: { en: 'Honk', ko: '경적 울리기', ja: 'クラクション', zh: '按喇叭', es: 'Tocar el claxon', ar: 'زمّور', vi: 'Bấm còi', hi: 'हॉर्न बजाएँ', id: 'Klakson' },
};
let shownHonk = null, honkAt = 0;
function honk() {
  if (!shownHonk || performance.now() - honkAt < 900) return;
  honkAt = performance.now();
  motionSound.honk(shownHonk);
  net.sendEmote(honkMsg(shownHonk));
}
$('honk-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); honk(); });
addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) honk(); });
try { sfx.on = localStorage.getItem('mk.sfx') !== '0'; } catch { /* ignore */ }
$('sfx-btn').setAttribute('aria-pressed', String(sfx.on));
$('sfx-btn').onclick = () => {
  sfx.on = !sfx.on;
  $('sfx-btn').setAttribute('aria-pressed', String(sfx.on));
  try { localStorage.setItem('mk.sfx', sfx.on ? '1' : '0'); } catch { /* ignore */ }
  if (sfx.on) sfx.doorbell(); // preview
  else motionSound.stopAll();
};
$('steady-btn').setAttribute('aria-pressed', String(steadyWalk));
$('steady-btn').onclick = () => {
  steadyWalk = !steadyWalk;
  $('steady-btn').setAttribute('aria-pressed', String(steadyWalk));
  try { localStorage.setItem(STEADY_KEY, steadyWalk ? '1' : '0'); } catch { /* ignore */ }
};
$('haptics-btn').setAttribute('aria-pressed', String(haptics.on));
$('haptics-btn').onclick = () => {
  haptics.on = !haptics.on;
  $('haptics-btn').setAttribute('aria-pressed', String(haptics.on));
  buzz(40); // preview
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
// The cinema works the same way, with its own films.
// The black-and-white cinema shows the whole hall, its film and the people
// in it in black and white (a filter on the 3D view and the video).
async function enterKpopCafe(kind = 'kpop', cinema = true) {
  kpopMusic = { wasOn: music.on };
  kpop.enter(kind, cinema);
  document.body.classList.toggle('cinema-silver', cinema === 'silver');
  if (music.on) { await music.setOn(false); applyMusicBtn(); }
}
async function leaveKpopCafe() {
  if (!kpopMusic) return;
  const { wasOn } = kpopMusic;
  kpopMusic = null;
  kpop.leave();
  document.body.classList.remove('cinema-silver');
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
// Ride shops: Pedal Lab (Seongsu), Bike Research Lab (Hongdae), RIDE WITH ME
// (Itaewon) and Hangeul Mihak (Gyeongbokgung). Every one sells bikes,
// skateboards, inline skates and kick scooters in three steps each, and
// repairs them; each also has its own thing: Pedal Lab the first skins, the
// Lab speed tune-ups and street-art skins, RIDE WITH ME long-ride kits (less
// wear) and night skins, Hangeul Mihak a limited Hunminjeongeum skin line
// sold only by the palace (core/bike-garage.js).
const BIKE_TEXT = {
  open: { en: 'Rides & upgrades', ko: '탈것·업그레이드', ja: '乗り物・アップグレード', zh: '选车·升级', es: 'Vehículos y mejoras' },
  note: { en: 'Each step is only a little faster. Rides wear out very slowly; a repair costs a few coins at any ride shop.', ko: '단계마다 속도는 조금씩만 빨라져요. 타다 보면 아주 조금씩 닳고, 수리는 어느 탈것 가게에서나 몇 코인이면 돼요.', ja: '段階ごとに少しだけ速くなります。乗るとゆっくりすり減り、修理はどの乗り物店でも数コインです。', zh: '每一级只快一点点。骑久了会缓慢磨损，任何一家车店都能花几枚硬币修理。', es: 'Cada nivel es solo un poco más rápido. Se desgastan muy despacio; cualquier tienda los repara por unas monedas.' },
  skinNote: { en: 'A colour and a pattern you buy once and can put on any ride. Each ride shop sells its own.', ko: '한 번 사면 모든 탈것에 입힐 수 있는 색상과 패턴이에요. 가게마다 파는 스킨이 달라요.', ja: '一度買えばどの乗り物にも使える色と柄です。お店ごとに品ぞろえが違います。', zh: '买一次就能用在所有车上的颜色和图案。每家店卖的都不一样。', es: 'Un color y un estampado que compras una vez y usas en cualquier vehículo. Cada tienda vende los suyos.' },
  limitedNote: { en: 'Limited: the Hunminjeongeum line is sold only here, by Gyeongbokgung. Once bought, it goes on any ride, anywhere.', ko: '한정판: 훈민정음 라인은 경복궁 옆 이곳에서만 팔아요. 한 번 사면 어디서든 모든 탈것에 입힐 수 있어요.', ja: '限定：訓民正音ラインは景福宮のこの店だけで販売。一度買えばどこでもどの乗り物にも使えます。', zh: '限定：训民正音系列只在景福宫旁的这家店出售。买了之后在哪儿都能用在所有车上。', es: 'Limitado: la línea Hunminjeongeum solo se vende aquí, junto a Gyeongbokgung. Una vez comprada, sirve para cualquier vehículo.' },
  tuneNote: { en: 'Tune-ups: our mechanics make a ride you own a little faster, in three steps.', ko: '튜닝: 연구원들이 내 탈것을 3단계에 걸쳐 조금씩 더 빠르게 만들어 줘요.', ja: 'チューンアップ：持っている乗り物を3段階で少しずつ速くします。', zh: '改装：技师分三级把你的车调得快一点。', es: 'Puesta a punto: hacemos tu vehículo un poco más rápido, en tres pasos.' },
  kitNote: { en: 'Long-ride kits: tougher wheels and parts, so a ride you own wears out more slowly.', ko: '롱라이드 키트: 바퀴와 부품을 튼튼하게 바꿔서 덜 닳게 해 줘요.', ja: 'ロングライドキット：丈夫な部品で乗り物がすり減りにくくなります。', zh: '长途套件：更结实的轮子和零件，车磨损得更慢。', es: 'Kit de ruta larga: piezas más duras para que tu vehículo se gaste más despacio.' },
  speed: { en: 'Speed', ko: '속도', ja: '速さ', zh: '速度', es: 'Velocidad' },
  dur: { en: 'Condition {n}%', ko: '내구도 {n}%', ja: '状態 {n}%', zh: '耐久 {n}%', es: 'Estado {n}%' },
  wear: { en: 'Wear −{n}%', ko: '닳는 속도 −{n}%', ja: '摩耗 −{n}%', zh: '磨损 −{n}%', es: 'Desgaste −{n}%' },
  buy: { en: 'Buy', ko: '사기', ja: '買う', zh: '购买', es: 'Comprar' },
  use: { en: 'Ride this', ko: '이걸로 타기', ja: 'これに乗る', zh: '用这个', es: 'Usar' },
  using: { en: 'Riding', ko: '타는 중', ja: '使用中', zh: '使用中', es: 'En uso' },
  picked: { en: 'Picked', ko: '선택됨', ja: '選択中', zh: '已选', es: 'Elegido' },
  switched: { en: 'Now riding {name}.', ko: '{name}(으)로 바꿔 탔어요.', ja: '{name}に乗り換えました。', zh: '换成了{name}。', es: 'Ahora vas en {name}.' },
  pickedNote: { en: '{name} is ready. Tap 🚲 on the street to ride.', ko: '{name}을(를) 골랐어요. 거리에서 🚲를 누르면 타요.', ja: '{name}を選びました。通りで🚲を押すと乗れます。', zh: '已选{name}。在街上点🚲就能骑。', es: '{name} listo. Toca 🚲 en la calle para subir.' },
  repair: { en: 'Repair', ko: '수리', ja: '修理', zh: '修理', es: 'Reparar' },
  upgrade: { en: 'Upgrade', ko: '업그레이드', ja: 'アップグレード', zh: '升级', es: 'Mejorar' },
  maxed: { en: 'Max', ko: '최고 단계', ja: '最大', zh: '已满级', es: 'Máx.' },
  upgraded: { en: 'Upgraded!', ko: '업그레이드했어요!', ja: 'アップグレードしました！', zh: '升级成功！', es: '¡Mejorado!' },
  fixed: { en: 'Good as new!', ko: '새것처럼 고쳤어요!', ja: '新品同様になりました！', zh: '修好啦，跟新的一样！', es: '¡Como nuevo!' },
  bought: { en: 'Enjoy your new ride!', ko: '새 탈것이 생겼어요!', ja: '新しい乗り物をどうぞ！', zh: '新车到手！', es: '¡Disfruta tu nuevo vehículo!' },
  skinOn: { en: 'Skin applied!', ko: '스킨을 입혔어요!', ja: 'スキンを適用しました！', zh: '已换上皮肤！', es: '¡Aspecto aplicado!' },
  poor: { en: 'Not enough coins.', ko: '코인이 부족해요.', ja: 'コインが足りません。', zh: '硬币不够。', es: 'No tienes suficientes monedas.' },
  worn: { en: 'Your ride is getting worn: a repair at any ride shop makes it good as new.', ko: '탈것이 많이 닳았어요. 탈것 가게에서 수리하면 새것처럼 돼요.', ja: '乗り物がすり減ってきました。乗り物店で修理できます。', zh: '车磨损了，去车店修一下吧。', es: 'Tu vehículo está gastado: repáralo en una tienda de vehículos.' },
  colors: { en: 'Colour', ko: '색상', ja: 'カラー', zh: '颜色', es: 'Color' },
  patterns: { en: 'Pattern', ko: '패턴', ja: '柄', zh: '图案', es: 'Estampado' },
  mine: { en: 'My skins from other shops', ko: '다른 가게에서 산 내 스킨', ja: '他の店で買ったスキン', zh: '在别家买的皮肤', es: 'Mis aspectos de otras tiendas' },
  none: { en: 'Default', ko: '기본', ja: 'デフォルト', zh: '默认', es: 'Normal' },
  skins: { en: 'Skins', ko: '스킨', ja: 'スキン', zh: '皮肤', es: 'Aspectos' },
  tune: { en: 'Tune-up', ko: '튜닝', ja: 'チューン', zh: '改装', es: 'Puesta a punto' },
  kit: { en: 'Long-ride kit', ko: '롱라이드 키트', ja: 'ロングライド', zh: '长途套件', es: 'Kit de ruta' },
  limited: { en: 'Hunminjeongeum (limited)', ko: '훈민정음 한정판', ja: '訓民正音（限定）', zh: '训民正音（限定）', es: 'Hunminjeongeum (limitado)' },
};
// Each shop's title and its own tab (the skins tab of Hangeul Mihak is the
// limited line).
const RIDE_SHOP_TEXT = {
  pedal: { icon: '🚲', en: 'Pedal Lab', ko: '페달랩 탈것 가게', ja: 'ペダルラボ', zh: '踏板实验室', es: 'Pedal Lab' },
  lab: { icon: '🔬', en: 'Bike Research Lab', ko: '자전거연구소', ja: '自転車研究所', zh: '自行车研究所', es: 'Laboratorio de Bicis' },
  rwm: { icon: '🌙', en: 'RIDE WITH ME', ko: 'RIDE WITH ME 라이드 위드 미', ja: 'RIDE WITH ME', zh: 'RIDE WITH ME', es: 'RIDE WITH ME' },
  hangul: { icon: 'ㅎ', en: 'Hangeul Mihak', ko: '한글미학', ja: 'ハングル美学', zh: '韩文美学', es: 'Hangeul Mihak' },
};
const RIDE_TAB = {
  bike: { en: 'Bike', ko: '자전거', ja: '自転車', zh: '自行车', es: 'Bici' },
  skate: { en: 'Board', ko: '보드', ja: 'スケボー', zh: '滑板', es: 'Patineta' },
  inline: { en: 'Inline', ko: '인라인', ja: 'インライン', zh: '轮滑', es: 'Patines' },
  kick: { en: 'Scooter', ko: '킥보드', ja: 'キックボード', zh: '滑板车', es: 'Patinete' },
};
const PATTERN_NAME = {
  flower: { icon: '🌸', en: 'Flowers', ko: '꽃무늬', ja: '花柄', zh: '花朵', es: 'Flores' },
  bolt: { icon: '⚡', en: 'Lightning', ko: '번개', ja: '稲妻', zh: '闪电', es: 'Rayos' },
  heart: { icon: '💗', en: 'Hearts', ko: '하트', ja: 'ハート', zh: '爱心', es: 'Corazones' },
  star: { icon: '⭐', en: 'Stars', ko: '별', ja: '星', zh: '星星', es: 'Estrellas' },
  hangul: { icon: 'ㅎ', en: 'Hangul', ko: '한글 자모', ja: 'ハングル', zh: '韩文字母', es: 'Hangul' },
  graffiti: { icon: '🖌️', en: 'Graffiti', ko: '그라피티', ja: 'グラフィティ', zh: '涂鸦', es: 'Grafiti' },
  checker: { icon: '🏁', en: 'Checkers', ko: '체커보드', ja: 'チェッカー', zh: '棋盘格', es: 'Cuadros' },
  drip: { icon: '🎨', en: 'Paint drips', ko: '페인트 드립', ja: 'ペンキだれ', zh: '滴漆', es: 'Goteo de pintura' },
  splat: { icon: '💥', en: 'Paint splats', ko: '물감 스플래시', ja: 'ペンキしぶき', zh: '泼漆', es: 'Salpicaduras' },
  flame: { icon: '🔥', en: 'Flames', ko: '불꽃', ja: 'ファイヤー', zh: '火焰', es: 'Llamas' },
  stripe: { icon: '🏎️', en: 'Racing stripes', ko: '레이싱 스트라이프', ja: 'レーシングストライプ', zh: '赛车条纹', es: 'Franjas de carreras' },
  dots: { icon: '🔵', en: 'Polka dots', ko: '물방울', ja: '水玉', zh: '波点', es: 'Lunares' },
  wave: { icon: '🌊', en: 'Waves', ko: '물결', ja: '波', zh: '波浪', es: 'Ondas' },
  hunmin: { icon: '📜', en: 'Hunminjeongeum', ko: '훈민정음', ja: '訓民正音', zh: '训民正音', es: 'Hunminjeongeum' },
  naratmal: { icon: '📖', en: 'The first line (1446)', ko: '나랏말싸미 (서문)', ja: '序文の一行目', zh: '序文首句', es: 'La primera línea (1446)' },
  cheonjiin: { icon: '☯️', en: 'Heaven, earth, person (ㆍㅡㅣ)', ko: '천지인 ㆍㅡㅣ', ja: '天地人 ㆍㅡㅣ', zh: '天地人 ㆍㅡㅣ', es: 'Cielo, tierra, persona (ㆍㅡㅣ)' },
  jaeum: { icon: 'ㄱ', en: 'Five basic consonants', ko: '기본 자음 ㄱㄴㅁㅅㅇ', ja: '基本子音5つ', zh: '五个基本辅音', es: 'Cinco consonantes básicas' },
  moeum: { icon: 'ㅏ', en: 'Vowels', ko: '모음', ja: '母音', zh: '元音', es: 'Vocales' },
  gana: { icon: '가', en: 'Ga Na Da', ko: '가나다', ja: 'カナダ（가나다）', zh: '가나다', es: 'Ga Na Da' },
  dojang: { icon: '🟥', en: 'Name seal', ko: '훈민정음 도장', ja: '落款印', zh: '印章', es: 'Sello' },
  panbon: { icon: '📃', en: 'Woodblock page', ko: '목판본', ja: '木版本', zh: '木刻本', es: 'Página xilográfica' },
  'jamo-ring': { icon: 'ㅎ', en: 'ㄱ to ㅎ badges', ko: 'ㄱ부터 ㅎ까지', ja: 'ㄱ〜ㅎ バッジ', zh: 'ㄱ到ㅎ徽章', es: 'Insignias ㄱ a ㅎ' },
  brush: { icon: '🖋️', en: 'Brush calligraphy', ko: '붓글씨 한글', ja: '筆文字ハングル', zh: '毛笔韩文', es: 'Caligrafía' },
};
const COLOR_NAME = {
  lime: { en: 'Neon lime', ko: '네온 라임' }, spray: { en: 'Spray pink', ko: '스프레이 핑크' }, concrete: { en: 'Concrete', ko: '콘크리트' },
  midnight: { en: 'Midnight', ko: '미드나잇' }, chrome: { en: 'Chrome', ko: '크롬' }, gold: { en: 'Gold', ko: '골드' }, neonred: { en: 'Neon red', ko: '네온 레드' },
  hanji: { en: 'Hanji paper', ko: '한지' }, meok: { en: 'Ink (meok)', ko: '먹' }, dancheong: { en: 'Dancheong red', ko: '단청 빨강' }, celadon: { en: 'Celadon', ko: '청자' }, jjok: { en: 'Indigo (jjok)', ko: '쪽빛' },
};
const TIER_STARS = ['★', '★★', '★★★'];
let bikeTab = null, bikeShopId = 'pedal';
const applyRide = () => { if (riding === 1) me.setBike(1, garage.rideSpec()); };
// place: a store with "workshop": "bike" (its "rideShop" picks which shop), or
// a ride-shop id. With nothing, the shop last opened. (Not named `shop`: that
// would hide the shop UI below, and every buy/upgrade toast would throw.)
function openBikeShop(place) {
  if (place) {
    let id = typeof place === 'string' ? place : place.rideShop || 'pedal';
    if (!RIDE_SHOPS[id]) id = 'pedal';
    if (id !== bikeShopId) bikeTab = null; // a new shop opens on its own tab
    bikeShopId = id;
  }
  const sid = bikeShopId, conf = RIDE_SHOPS[sid];
  const root = $('lp-panel');
  delete root.dataset.club;
  root.dataset.rideShop = sid;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const x = el('button', 'sheet-x', '✕');
  x.onclick = () => { root.hidden = true; };
  const own = [...(conf.extra ? [conf.extra] : []), 'skin'];
  if (!bikeTab || !(RIDE_TYPES.includes(bikeTab) || own.includes(bikeTab))) bikeTab = conf.extra || (conf.limited ? 'skin' : garage.current.type);
  const tabs = el('div', 'ride-tabs');
  const tabLabel = (id) => id === 'skin' ? (conf.limited ? '📜 ' + L(BIKE_TEXT.limited) : '🎨 ' + L(BIKE_TEXT.skins))
    : id === 'tune' ? '🔧 ' + L(BIKE_TEXT.tune) : id === 'kit' ? '🛡️ ' + L(BIKE_TEXT.kit) : VEHICLE_ICON[id] + ' ' + L(RIDE_TAB[id]);
  // The shop's own tabs first: they are why you came.
  for (const id of [...own, ...RIDE_TYPES]) {
    const b = el('button', 'ride-tab' + (bikeTab === id ? ' on' : '') + (own.includes(id) ? ' special' : ''), tabLabel(id));
    b.onclick = () => { bikeTab = id; openBikeShop(); };
    tabs.append(b);
  }
  const list = el('div', 'lp-list');
  const top = Math.max(...BIKE_MODELS.map((m) => m.speed)) + UPGRADE_MAX * TUNE_STEP;
  const speedBar = (v) => { const bar = el('span', 'bike-bar'); const fill = el('i'); fill.style.width = Math.round((v / top) * 100) + '%'; bar.append(fill); return bar; };
  let note = BIKE_TEXT.note;
  if (bikeTab === 'skin') {
    note = conf.limited ? BIKE_TEXT.limitedNote : BIKE_TEXT.skinNote;
    const skin = garage.s.skin;
    const section = (title) => { list.append(el('strong', 'skin-title', title)); const g = el('div', 'skin-grid'); list.append(g); return g; };
    const pickSkin = (kind, id) => {
      if (id === null || garage.hasSkin(kind, id)) { garage.setSkin(kind, id); applyRide(); openBikeShop(); return; }
      const r = garage.buySkin(kind, id, wallet, sid);
      refreshWallet();
      shop.toast(L(r === 'bought' ? BIKE_TEXT.skinOn : BIKE_TEXT.poor));
      if (r === 'bought') applyRide();
      openBikeShop();
    };
    const colorDot = (id) => {
      const has = garage.hasSkin('color', id);
      const b = el('button', 'skin-dot' + (skin.color === id ? ' on' : '') + (has ? '' : ' locked'));
      b.style.background = SKIN_COLORS[id];
      b.title = COLOR_NAME[id] ? L(COLOR_NAME[id]) : id;
      if (!has) b.append(el('small', null, '🪙' + skinPrice('color', id)));
      b.onclick = () => pickSkin('color', id);
      return b;
    };
    const patternChip = (id) => {
      const has = garage.hasSkin('pattern', id);
      const b = el('button', 'chip skin-pat' + (skin.pattern === id ? ' on' : ''), `${PATTERN_NAME[id].icon} ${L(PATTERN_NAME[id])}` + (has ? '' : ` · 🪙${skinPrice('pattern', id)}`));
      b.onclick = () => pickSkin('pattern', id);
      return b;
    };
    const cg = section(`${L(BIKE_TEXT.colors)} · 🪙 ${skinPrice('color', conf.colors[0])}`);
    const none = el('button', 'skin-dot none' + (!skin.color ? ' on' : ''), L(BIKE_TEXT.none));
    none.onclick = () => pickSkin('color', null);
    cg.append(none, ...conf.colors.map(colorDot));
    const pg = section(`${L(BIKE_TEXT.patterns)} · 🪙 ${skinPrice('pattern', conf.patterns[0])}`);
    const none2 = el('button', 'chip skin-pat' + (!skin.pattern ? ' on' : ''), L(BIKE_TEXT.none));
    none2.onclick = () => pickSkin('pattern', null);
    pg.append(none2, ...conf.patterns.map(patternChip));
    // Skins bought at the other shops can be put on here too.
    const otherC = garage.s.colors.filter((c) => !conf.colors.includes(c));
    const otherP = garage.s.patterns.filter((q) => !conf.patterns.includes(q));
    if (otherC.length || otherP.length) {
      const mg = section(L(BIKE_TEXT.mine));
      mg.append(...otherC.map(colorDot), ...otherP.map(patternChip));
    }
  } else if (bikeTab === 'tune' || bikeTab === 'kit') {
    const kind = bikeTab;
    note = kind === 'tune' ? BIKE_TEXT.tuneNote : BIKE_TEXT.kitNote;
    for (const m of BIKE_MODELS.filter((b) => garage.has(b.id))) {
      const lv = garage.level(kind, m.id), price = garage.upgradePrice(kind, m.id);
      const row = el('div', 'lp-row bike-row' + (garage.s.use === m.id ? ' on' : ''));
      const sw = el('span', 'bike-swatch');
      sw.style.background = m.color;
      const text = el('span', 'lp-text');
      const name = el('strong', null, `${VEHICLE_ICON[m.type]} ${L(m.name)} `);
      name.append(el('span', 'tier-stars t' + m.tier, TIER_STARS[m.tier]));
      text.append(name);
      if (kind === 'tune') text.append(speedBar(garage.speedOf(m.id)));
      const pips = '●'.repeat(lv) + '○'.repeat(UPGRADE_MAX - lv);
      text.append(el('small', null, `${L(BIKE_TEXT[kind])} ${pips} · ` + (kind === 'tune'
        ? `${L(BIKE_TEXT.speed)} ${(m.speed + lv * TUNE_STEP).toFixed(2)}`
        : fmt(L(BIKE_TEXT.wear), { n: Math.round((1 - KIT_WEAR[lv]) * 100) }))));
      const btns = el('span', 'bike-btns');
      if (price == null) btns.append(el('small', 'bike-using', '✓ ' + L(BIKE_TEXT.maxed)));
      else {
        const b = el('button', 'chip', `${L(BIKE_TEXT.upgrade)} · 🪙 ${price}`);
        b.onclick = () => {
          const r = garage.upgrade(kind, m.id, wallet);
          refreshWallet();
          shop.toast(L(r === 'upgraded' ? BIKE_TEXT.upgraded : BIKE_TEXT.poor));
          openBikeShop();
        };
        btns.append(b);
      }
      row.append(sw, text, btns);
      list.append(row);
    }
  } else for (const m of BIKE_MODELS.filter((b) => b.type === bikeTab)) {
    const own = garage.has(m.id), on = garage.s.use === m.id;
    const row = el('div', 'lp-row bike-row' + (on ? ' on' : ''));
    const sw = el('span', 'bike-swatch');
    sw.style.background = m.color;
    const text = el('span', 'lp-text');
    const name = el('strong', null, `${VEHICLE_ICON[m.type]} ${L(m.name)} `);
    name.append(el('span', 'tier-stars t' + m.tier, TIER_STARS[m.tier]));
    text.append(name);
    const info = el('small', null, `${L(BIKE_TEXT.speed)} ${(own ? m.speed + garage.level('tune', m.id) * TUNE_STEP : m.speed).toFixed(1)}` + (own ? ' · ' + fmt(L(BIKE_TEXT.dur), { n: Math.floor(garage.durability(m.id)) }) : ''));
    text.append(speedBar(own ? garage.speedOf(m.id) : m.speed), info);
    const btns = el('span', 'bike-btns');
    if (!own) {
      const b = el('button', 'chip', `${L(BIKE_TEXT.buy)} · 🪙 ${m.price}`);
      b.onclick = () => {
        const r = garage.buy(m.id, wallet);
        refreshWallet();
        shop.toast(L(r === 'bought' ? BIKE_TEXT.bought : BIKE_TEXT.poor));
        if (r === 'bought') applyRide();
        openBikeShop();
      };
      btns.append(b);
    } else {
      if (!on) {
        const b = el('button', 'chip', L(BIKE_TEXT.use));
        b.onclick = () => { garage.use(m.id); applyRide(); openBikeShop(); };
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
  const head = RIDE_SHOP_TEXT[sid];
  root.replaceChildren(x, el('strong', 'wallet-title', head.icon + ' ' + L(head)), el('p', 'fine', L(note)), tabs, list);
  root.hidden = false;
}

// Restaurants: sit at a table, order, eat, share bites (src/game/dining.js).
const dining = createDining({
  get interior() { return interior; }, get seated() { return seated; }, get mode() { return mode; },
  get me() { return me; }, get clerk() { return clerk; }, get others() { return others; }, get net() { return net; },
  get safety() { return safety; }, get held() { return held; }, get wallet() { return wallet; },
  get shop() { return shop; }, get sfx() { return sfx; }, get canvas() { return canvas; }, get camera() { return camera; },
  missionEvent, refreshWallet, recordFood, setHeld, holdNew, handReady, openMenu,
  clearAction: () => { action = STALE; }, resendState: () => { lastSent = null; },
});
const { clearMeal, dineAction, updateMeal, nearPeerMeal, stealBite, onBitten, orderFood } = dining;
// Picnic mats on the Han River park lawn (src/game/picnic.js).
// The street's wooded parks (Seoul Forest) take picnic mats too: on the
// grass, off the paths, clear of trees, benches and sculptures.
const streetLawns = map.areas.filter((a) => a.k === 'park' && a.trees).map((a) => {
  const xs = a.p.map((q) => q[0]), zs = a.p.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
});
const hills = (map.landmarks || []).filter((l) => ['hill', 'pond', 'greenhouse'].includes(l.type)) // (not on a slope, in a pond or in the greenhouse)
  .map((l) => [l.x, l.z, l.type === 'greenhouse' ? Math.hypot(l.w, l.d) / 2 : l.r || 13]);
const lawnBlocks = lawnObstacles.concat(hills);
const lawnRoads = map.roads.filter((r) => r.p.some(([x, z]) => streetLawns.some((l) => x > l.x0 - 40 && x < l.x1 + 40 && z > l.z0 - 40 && z < l.z1 + 40)));
const streetPicnic = streetLawns.length ? {
  scene, lawns: streetLawns, colliders: [], seats: streetSeats,
  blocked(r) {
    for (const [x, z, rad] of lawnBlocks) {
      const cx = Math.max(r.x0, Math.min(x, r.x1)), cz = Math.max(r.z0, Math.min(z, r.z1));
      if ((cx - x) ** 2 + (cz - z) ** 2 < rad * rad) return true;
    }
    for (const fx of [0, 0.5, 1]) for (const fz of [0, 0.5, 1]) {
      const x = r.x0 + (r.x1 - r.x0) * fx, z = r.z0 + (r.z1 - r.z0) * fz;
      if (collision.blocked(x, z, 0.15) || onAnyRoad(lawnRoads, x, z, 0.3)) return true;
    }
    return false;
  },
} : null;
const picnic = createPicnic({
  get interior() { return interior; }, get mode() { return mode; }, get seated() { return seated; },
  get me() { return me; }, get others() { return others; }, get bag() { return bag; }, get shop() { return shop; },
  get myId() { return myId; },
  standUp: () => standUp(), clearAction: () => { action = STALE; }, resendState: () => { lastSent = null; },
}, streetPicnic);
bag.onChange(() => picnic.checkBag()); // sold or given away: it can't stay spread
// Station vending machines: cheap drinks that work like a coffee to go.
const VENDING_TEXT = {
  open: { en: 'Vending machine', ko: '음료 자판기', ja: '自動販売機', zh: '自动售货机' },
  note: { en: 'Every drink is 1 coin. Sip it to refill your stamina.', ko: '모든 음료가 1코인이에요. 마시면 체력이 채워져요.', ja: '飲み物はすべて1コイン。飲むとスタミナが回復します。', zh: '所有饮料都是1枚硬币。喝了可以恢复体力。' },
  buy: { en: 'Buy', ko: '사기', ja: '買う', zh: '购买' },
  got: { en: 'Clunk! {name} drops out.', ko: '덜컹! {name}이(가) 나왔어요.', ja: 'ガコン！{name}が出てきました。', zh: '咚！{name}掉出来了。' },
};
function buyVending(dr) {
  if (!handReady()) return;
  if (!wallet.spend(dr.price, { name: dr.name, at: interior?.store.name })) { shop.toast(fmt(L(DINE_TEXT.poor), { n: dr.price })); return; }
  refreshWallet();
  sfx.pop?.();
  holdNew({ kind: 'coffee', sips: COFFEE_SIPS, name: localName(dr.name, 'en') });
  $('lp-panel').hidden = true;
  shop.toast(fmt(L(VENDING_TEXT.got), { name: `${dr.icon} ${localName(dr.name, getLanguage())}` }));
}
function openVending() {
  const root = $('lp-panel');
  delete root.dataset.club;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const x = el('button', 'sheet-x', '✕');
  x.onclick = () => { root.hidden = true; };
  const list = el('div', 'lp-list');
  const lang = getLanguage();
  for (const dr of VENDING_DRINKS) {
    const row = el('div', 'lp-row menu-row');
    const text = el('span', 'lp-text');
    text.append(el('strong', null, `${dr.icon} ${localName(dr.name, lang)}`), el('small', 'menu-price', `🪙 ${dr.price}`));
    const b = el('button', 'chip', L(VENDING_TEXT.buy));
    b.onclick = () => buyVending(dr);
    row.append(text, b);
    list.append(row);
  }
  root.replaceChildren(x, el('strong', 'wallet-title', '🥤 ' + L(VENDING_TEXT.open)), el('p', 'fine', L(VENDING_TEXT.note)), list);
  root.hidden = false;
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
    text.append(el('small', 'menu-price', `🪙 ${coinPrice(pr.price)}`));
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
const autoSide = { t: 0, dir: 1, stuck: 0 }; // side-step when walking into a wall
function setAutoWalk(on) {
  autoWalk = !!on && !!guide && riding !== 3;
  $('guide-auto').classList.toggle('on', autoWalk);
  $('guide-auto-label').textContent = t(autoWalk ? 'guide.autoStop' : 'guide.auto');
  if (autoWalk) { routeTimer = 0; manualCamT = 0; }
}
$('guide-auto').onclick = () => setAutoWalk(!autoWalk);
function setGuide(g) {
  guide = g;
  if (onboard >= 2) $('info-hint').hidden = true; // a way is chosen: the info centre card would cover the guide bar
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
  seoul: await seoulPromise,
  zones: zones.items,
  stores: storefronts.items,
  marks: subwayStations.flatMap((sub, s) => sub.exits.map((ex, i) => {
    const [x, z] = toWorld(ex, 0, -PIT.l / 2);
    const go = outsideOf(ex); // guidance ends on the pavement just outside the stairs
    return {
      x, z, icon: '🚇', color: '#5d6470', // one colour for every line for now (no transfers to think about)
      station: s, name: stationStores[s].name, go: { x: go.x, z: go.z },
      label: () => `${localName(stationStores[s].name, getLanguage())} ${ex.n ?? i + 1}`, group: () => localName(stationStores[s].name, getLanguage()),
    };
  })),
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
  if (!wallet.spend(fare, { k: 'ledger.taxi' })) { shop.toast(t('taxi.noCoins', { n: fare.toLocaleString() })); return; }
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
    missionEvent('taxi');
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
// A tap with a second finger while the first one is still on the joystick
// gives no click on phones (only the first finger's touch makes clicks), so
// "enter", "hop on" and the rest did nothing for people walking up to a shop
// with their thumb still down. Act on the touch itself; mouse and keyboard
// keep the plain click.
let actionTouchAt = -1e9;
$('action-btn').addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  e.preventDefault();
  actionTouchAt = performance.now();
  runAction();
});
$('action-btn').onclick = () => { if (performance.now() - actionTouchAt > 700) runAction(); };
// On a keyboard the action button shows its key, and Space works like E:
// walk up to a shop and press either to go in.
function setActionLabel(label, choices = 0) {
  const btn = $('action-btn');
  btn.textContent = label;
  btn.classList.toggle('has-more', choices > 1);
  btn.setAttribute('aria-haspopup', choices > 1 ? 'menu' : 'false');
  if (choices > 1) {
    const more = document.createElement('b');
    more.className = 'action-more';
    more.textContent = `+${choices - 1} ▾`;
    btn.append(more);
  }
  if (input.isTouch) return;
  const k = document.createElement('kbd');
  k.textContent = 'E';
  btn.append(k);
}

// The chooser: when several actions are in reach at once, a tap on the
// action button (or E) lists them all above it. Tap one, or press its number.
const CHOOSER_TEXT = { en: 'What would you like to do?', ko: '무엇을 할까요?', ja: '何をしますか？', zh: '要做什么？' };
const chooser = { open: false, sig: '', pick: 0 };
function closeChooser() {
  if (!chooser.open) return;
  chooser.open = false;
  chooser.sig = '';
  $('action-menu').hidden = true;
  $('action-btn').setAttribute('aria-expanded', 'false');
}
function toggleChooser() {
  if (chooser.open) { closeChooser(); return; }
  if (!action?.opts) return;
  chooser.open = true;
  chooser.pick = 0;
  $('action-btn').setAttribute('aria-expanded', 'true');
  syncChooser();
}
function runChoice(i) {
  const o = action?.opts?.[i];
  closeChooser();
  if (!o) return;
  o.run();
  action = STALE; // refresh the button after whatever that did
}
// Keep the open list in step with what is in reach: rebuild it when the
// choices change, and close it when only one (or none) is left.
function syncChooser() {
  if (!chooser.open) return;
  const opts = action?.opts;
  if (!opts) { closeChooser(); return; }
  const sig = action.key + '\0' + getLanguage();
  if (sig === chooser.sig) return;
  // Keep the same choice highlighted when the list shifts under it.
  const was = chooser.keys?.[chooser.pick];
  chooser.sig = sig;
  chooser.keys = opts.map((o) => o.key);
  chooser.pick = Math.max(0, chooser.keys.indexOf(was));
  const menu = $('action-menu');
  menu.innerHTML = '';
  const head = document.createElement('p');
  head.className = 'action-menu-head';
  head.textContent = L(CHOOSER_TEXT);
  menu.append(head);
  opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.className = 'action-choice' + (i === chooser.pick ? ' on' : '');
    if (!input.isTouch) {
      const k = document.createElement('kbd');
      k.textContent = String(i + 1);
      b.append(k);
    }
    const span = document.createElement('span');
    span.textContent = o.label;
    b.append(span);
    // Same as the action button: act on the touch itself, so a second
    // finger works while the first one is still on the joystick.
    let touchAt = -1e9;
    b.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      touchAt = performance.now();
      runChoice(i);
    });
    b.onclick = () => { if (performance.now() - touchAt > 700) runChoice(i); };
    menu.append(b);
  });
  menu.hidden = false;
}
function highlightChoice(i) {
  const items = $('action-menu').querySelectorAll('.action-choice');
  if (!items.length) return;
  chooser.pick = (i + items.length) % items.length;
  items.forEach((b, j) => b.classList.toggle('on', j === chooser.pick));
}
// A tap anywhere else closes the list (the joystick and the camera keep working).
document.addEventListener('pointerdown', (e) => {
  if (chooser.open && !e.target.closest?.('#action-menu, #action-btn')) closeChooser();
}, true);
// While the list is open, keys pick from it: numbers, arrows, and E / Enter /
// Space for the highlighted one, Esc to close. Caught first so the number
// keys don't also play an emote.
addEventListener('keydown', (e) => {
  if (!chooser.open) return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target?.isContentEditable) return;
  const n = /^Digit([1-9])$/.exec(e.code)?.[1] || /^Numpad([1-9])$/.exec(e.code)?.[1];
  let used = true;
  if (n && action?.opts?.[n - 1]) runChoice(n - 1);
  else if (e.code === 'ArrowUp') highlightChoice(chooser.pick - 1);
  else if (e.code === 'ArrowDown') highlightChoice(chooser.pick + 1);
  else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { if (!e.repeat) runChoice(chooser.pick); }
  else if (e.code === 'Escape') closeChooser();
  else used = false;
  if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
onLanguageChange(() => { chooser.sig = ''; });
// Space is also the karaoke tap and the key for a focused button, so only
// treat it as "act" when no game or sheet is taking keys.
const spaceBusy = () => { try { return [pochaUi, jobUi, karaokeUi, photoUi, clawUi, battingUi, galleryUi, hauntUi, dartsUi, duckUi, emblemUi, infoUi, saunaUi, gymUi, bookUi, academyUi, boardUi, loveLockUi, wishUi, orderUi, grillUi, fishingUi, marketUi, ramenUi, kimchiUi, japchaeUi, kimbapUi, kimchiSellUi, tarotUi, counterUi, bagUi, dexUi, fishBookUi, stampUi, museumUi].some((g) => g?.open)
  || !$('map-panel').hidden || !$('settings-panel').hidden || !$('notes-panel').hidden; } catch { return true; } };
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target?.isContentEditable) return;
  if (e.code === 'Space' && !e.repeat && action && !spaceBusy()) {
    e.preventDefault(); // don't also click whatever button kept focus
    if (e.target instanceof HTMLButtonElement) e.target.blur();
    runAction();
  }
  if (e.code === 'KeyE' || e.code === 'Enter') runAction();
  if (e.code === 'KeyM') $('map-btn').click();
  if (e.code === 'Escape') {
    if (!$('map-panel').hidden) mapView.hide();
    else if (!$('settings-panel').hidden) $('settings-panel').hidden = true;
    else if (!$('notes-panel').hidden) $('notes-panel').hidden = true;
    else if (loveLockUi.open) loveLockUi.close();
    else if (wishUi.open) wishUi.close();
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
// Budget-book note for coins earned or spent without one: the shop you are in.
wallet.context = () => (interior?.store?.name ? { at: interior.store.name } : null);
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
// Fish book (mk.fishdex): every catch, kept even after selling.
const fishDex = new FishDex(globalThis.localStorage, fishBag);
const fishBookUi = new FishBookUI({ root: $('fishbook-panel'), dex: fishDex });
function refreshFishBookBtn() { $('fishbook-btn').querySelector('span').textContent = `${t('fish.book')} · ${fishDex.kinds}/${FISH.length} · 🐟 ${fishDex.total}`; }
$('fishbook-btn').onclick = () => { $('notes-panel').hidden = true; fishBookUi.show(); };
refreshFishBookBtn();
onLanguageChange(refreshFishBookBtn);
// The cast, bobber, bite and reel in 3D (core/fishing-rig.js).
const FISH_PHASES = new Set(['idle', 'cast', 'bite', 'reel', 'land', 'trash', 'escape', 'retrieve', 'off']);
const peerRigs = new Map(); // other anglers' rigs, by player id
function onPeerFishing(id, msg) {
  const [ph, fid] = msg.split(':');
  const p = others.players.get(id);
  if (!FISH_PHASES.has(ph) || !p || p.hidden) return;
  let rig = peerRigs.get(id);
  if (!rig) { rig = createFishingRig({ remote: true, waterY: () => interior?.river?.position.y ?? -0.25 }); peerRigs.set(id, rig); }
  const f = fid ? fishById(fid) : null;
  rig.phase(ph, f || (ph === 'land' ? { rarity: 1 } : undefined));
  if (ph === 'cast') p.ch.play('cast');
  else if (ph === 'land' || ph === 'trash') p.ch.play('catch');
}
function onPeerTrophy(id, fid) {
  const f = fishById(fid), p = others.players.get(id);
  if (!f || f.rarity < TROPHY_RARITY || !p || p.hidden || safety.isBlocked(id, others.nameOf(id))) return;
  showBubbleEl(p, $('labels'), trophy(f, others.nameOf(id) || '?'), showMs(f), 'trophy tier-' + f.rarity);
}
function updatePeerRigs(dt) {
  for (const [id, rig] of peerRigs) {
    const p = others.players.get(id);
    if (!p) { rig.dispose(); peerRigs.delete(id); continue; }
    rig.update(dt, p.ch);
  }
}
let legendOn = false, legendTug = 0;
const fishRig = createFishingRig({ sfx, waterY: () => interior?.river?.position.y ?? -0.25 });
const fishingUi = new FishingUI({
  root: $('fish-panel'),
  bag: fishBag,
  dex: fishDex,
  stats: new FishStats(), // mk.fishstats: casts, misses and escapes, for balancing
  place: () => interior?.store?.fishPlace || null, // the Mangwon pier has fish of its own (core/fish-places.js)
  onRod: (on) => { rodOut = on; me.setHeld(heldKind()); lastSent = null; },
  onPhase: (ph, data) => {
    fishRig.phase(ph, data);
    // Others nearby see the cast, the bite, the reel and the catch too.
    if (FISH_PHASES.has(ph)) net.sendEmote('fishph:' + ph + (data?.id && !data.trash ? ':' + data.id : ''));
    if (ph === 'cast') me.play('cast');
    else if (ph === 'land' || ph === 'trash') me.play('catch');
    else if (ph === 'bite') buzz(60);
    // ★5 legends: a long rumble on the bite, a tug while you reel, a fanfare when landed.
    const legend = data?.rarity === 5;
    if (ph === 'bite' && legend) { legendOn = true; buzz([250, 80, 250, 80, 500]); shake([$('scene'), $('fish-panel')]); }
    if (ph === 'reel' && legendOn) { clearInterval(legendTug); legendTug = setInterval(() => { buzz(40); shake([$('scene')], false); }, 900); }
    if (ph !== 'reel' && ph !== 'tap' && ph !== 'progress' && ph !== 'bite') { clearInterval(legendTug); legendOn = false; }
    if (ph === 'land' && legend) { buzz([120, 60, 120, 60, 120, 60, 700]); shake([$('scene'), $('fish-panel')]); }
  },
  onCatch: (f) => {
    sfx.pop?.();
    refreshFishBookBtn();
    showBubbleEl(myLabel, $('labels'), catchBubble(f), showMs(f));
    if (f.rarity >= 3) me.play('cheer'); // a rare one!
    if (f.rarity >= TROPHY_RARITY) { // ★3–★5: a trophy over my head, for everyone nearby
      showBubbleEl(myLabel, $('labels'), trophy(f, nickname), showMs(f), 'trophy tier-' + f.rarity);
      net.sendEmote('bigfish:' + f.id);
      sfx.reveal(true);
    }
    missionEvent('fish', f.id);
  },
  onEscape: () => showBubble(myLabel, $('labels'), '💨'),
  lucky: () => { const p = me.root.position; return !!interior?.fishing?.some((f) => f.lucky && Math.hypot(p.x - f.x, p.z - f.z) < 1.8); },
  onClose: () => { if (fishCam && mode === 'store') Object.assign(cam, fishCam); fishCam = null; },
  // The stamp slamming down on a first catch: a deep double thud.
  onStamp: () => { sfx.tock(1, 260); setTimeout(() => sfx.tock(0.7, 180), 70); buzz(40); },
});
const marketUi = new FishMarketUI({
  root: $('market-panel'),
  bag: fishBag,
  wallet,
  rods: rodSkins,
  // A new rod skin: show it in hand right away if fishing, and tell the world.
  onRodSkin: (id, bought) => {
    if (bought) { shop.toast(t('fish.rodBought', { name: localName(rodSkin(id).name) })); sfx.reveal?.(true); }
    if (rodOut) { me.setHeld(heldKind()); lastSent = null; }
  },
  onShort: (s) => shop.toast(t('fish.rodShort', { name: localName(s.name) })),
  onSold: (coins) => {
    if (!coins) return;
    shop.toast(t('fish.sold', { coins }));
    if (interior?.fishBuy) return; // the park's stand has no clerk (DAILY MART's is across the lawn)
    clerk && say(clerk, $('labels'), ['싱싱하네요! 잘 팔았어요!', 'singsinghaneyo! jal parasseoyo!', t('fish.fresh')]);
  },
});
// The ramen machine takes a ramyeon pack (and an egg) from the bag, bought
// at DAILY MART; the bowl is carried to a parasol table to eat.
const ramenUi = new RamenUI({
  root: $('ramen-panel'),
  bag,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  beforeCook: () => handReady(),
  onCooked: ({ egg }) => {
    holdNew({ kind: 'food', sips: FOOD_BITES, name: localName(egg ? RAMEN_BOWL.egg : RAMEN_BOWL.plain, 'en'), ramen: true });
    me.play('cheer');
    missionEvent('cook');
    togetherBonus('cook');
  },
});
const RAMEN_BOWL = {
  plain: { en: 'Han River ramen', ko: '한강 라면' },
  egg: { en: 'Han River ramen with egg', ko: '계란 한강 라면' },
};
// DAILY MART's ramyeon and eggs go in the bag (for the ramen machine).
const INGREDIENT_TEXT = {
  got: { en: '{name} is in your bag 🎒', ko: '{name}을(를) 가방에 넣었어요 🎒', ja: '{name}をバッグに入れました 🎒', zh: '{name}放进包里了 🎒' },
  sit: { en: 'Take the ramen to a parasol table ⛱️ and sit down to eat it.', ko: '라면은 파라솔 테이블 ⛱️에 앉아서 먹어요.', ja: 'ラーメンはパラソルのテーブル ⛱️ に座って食べよう。', zh: '把拉面端到遮阳伞桌 ⛱️ 坐下来吃吧。' },
};
function buyIngredient(product, coins) {
  if (product.ingredient === 'mat' && hasMat(bag)) { shop.toast(L(MAT_TEXT.have)); return false; } // one is enough
  if (bag.full) { shop.toast(fmt(L(BAG_TEXT.full), { cap: bag.cap })); return false; }
  if (!wallet.spend(coins, { name: product.name, at: interior?.store.name })) { shop.toast(fmt(L(DINE_TEXT.poor), { n: coins })); return false; }
  refreshWallet();
  bag.add({ kind: 'gift', sips: 1, name: localName(product.name, 'en'), icon: SHOP_ICON[product.model] || '🛍️', g: product.ingredient });
  clerk && say(clerk, $('labels'), ['감사합니다!', 'gamsahamnida!', t('coffee.enjoy')]);
  shop.toast(fmt(L(INGREDIENT_TEXT.got), { name: localName(product.name, getLanguage()) }));
  return true;
}

// Kimjang class at Sonmat Kimchi School (Gyeongbokgung): ten steps from the
// cabbage to the jar; the finished kimchi goes in the bag.
const kimchiUi = new KimchiUI({
  root: $('kimchi-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); me.play(medal ? 'cheer' : 'wave'); },
  onJar: (score) => bag.add(kimchiJar(score, localName(KIMCHI_TEXT.item, 'en'))),
});
// Yongmaru Market (Itaewon): the side-dish stall buys homemade kimchi, a few
// jars a day (core/kimchi-market.js).
const museumUi = new MuseumUI({ root: $('museum-panel') });
const kimchiSellUi = new KimchiSellUI({
  root: $('kimchi-sell-panel'),
  bag,
  wallet,
  getHeld: () => held,
  clearHeld: () => setHeld(null),
  onSold: (coins, score) => {
    shop.toast(MARKET_L('sold', { coins }));
    clerk && say(clerk, $('labels'), score >= 75 ? BOSS_LINES.great : BOSS_LINES.ok);
  },
  onLimit: () => clerk && say(clerk, $('labels'), BOSS_LINES.enough),
});
// Japchae class at Suragan Cooking Class, next to the kimchi school.
const japchaeUi = new JapchaeUI({
  root: $('japchae-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); me.play(medal ? 'cheer' : 'wave'); },
  onBox: (score) => bag.add({ kind: 'gift', sips: 1, name: localName(JAPCHAE_TEXT.item, 'en'), icon: '🍝', g: 'japchae', q: score }),
});
// Free-style kimbap at the same class, at the bamboo mats on the near side.
const kimbapUi = new KimbapUI({
  root: $('kimbap-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); me.play(medal ? 'cheer' : 'wave'); },
  onBox: (score) => bag.add({ kind: 'gift', sips: 1, name: localName(KIMBAP_TEXT.item, 'en'), icon: '🍙', g: 'kimbap', q: score }),
});

// Minigames (ui/*-ui.js): the tteokbokki stall and its delivery run, the
// noraebang, the photo booth, the claw machines and the duck boats.
const pochaUi = new PochaUI({
  root: $('pocha-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onDeliver: () => startDelivery(),
  onMedal: () => missionEvent('cook'), // practice only: no coins, no together bonus
});
// Part-time jobs (core/jobs.js): a few shifts a day, all jobs together.
const shifts = {
  left: () => shiftsLeft(readShifts(), dayKey()),
  take: () => { const n = takeShift(readShifts(), dayKey()); if (!n) return false; writeShifts(n); return true; },
};
const jobUi = new JobUI({
  root: $('job-panel'),
  wallet,
  shifts,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onPaid: (coins) => { refreshWallet(); if (coins) { shop.toast(fmt(L(JOB_TEXT.paid), { n: coins })); me.play('cheer'); } },
});
function openJob(job) {
  if (job === 'delivery') startDelivery();
  else jobUi.show(job, interior.store);
}
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
      const st = nearestBooth(me.root.position);
      photoCam = { ...cam };
      if (st) { const [x, z] = boothSpot(st); me.root.position.set(x, 0, z); lastSent = null; }
      Object.assign(cam, { yaw: 0, dist: 3.0, pitch: 0.06 });
      me.root.rotation.y = 0; // face the camera
    } else if (photoCam) { Object.assign(cam, photoCam); photoCam = null; }
  },
  countdown: (text) => { $('photo-count').hidden = !text; $('photo-count').textContent = text; },
});
let photoCam = null;
// The booth you're at, and a free spot in it: friends already posing keep
// their place, and you stand beside them instead of on top of them.
function nearestBooth(p) {
  let best = null, bd = Infinity;
  for (const st of interior?.stations?.photo || []) { const d = Math.hypot(p.x - st.x, p.z - st.z); if (d < bd) { bd = d; best = st; } }
  return best;
}
function boothSpot(st) {
  const others2 = others.list();
  const spots = st.solo ? [0] : [0, -0.6, 0.6, -1.0, 1.0];
  let best = spots[0], room = -1;
  for (const o of spots) {
    const x = st.x + o, z = st.z;
    const near = Math.min(Infinity, ...others2.map((q) => Math.hypot(q.x - x, q.z - z)));
    if (near > 0.55) return [x, z]; // nobody here
    if (near > room) { room = near; best = o; }
  }
  return [st.x + best, st.z];
}
const clawUi = new ClawUI({
  root: $('claw-panel'),
  wallet,
  give: (id) => { const added = inventory.add(id); refreshItems(); labelDecor(); return added.length > 0; },
  itemName: (id) => localName(ITEMS[id]?.name, getLanguage()),
  onWin: () => { me.play('cheer'); sfx.pop?.(); },
});
// The batting cage, the shooting gallery in Another Land and darts at Bar
// Hush (core/arcade.js). Free skill games: no coins in or out, only your own
// best record. Their panels are loaded the first time you play one.
const arcade = {}; // kind → its UI, once loaded
const arcadePanel = (kind) => ({ get open() { return !!arcade[kind]?.open; }, close() { arcade[kind]?.close(); } });
const battingUi = arcadePanel('batting'), galleryUi = arcadePanel('gallery'), hauntUi = arcadePanel('hauntGallery'), dartsUi = arcadePanel('darts');
const arcadeLoading = {}; // kind → its panel's import, while it loads
let dartsInvite = null; // { from, name, at }: someone in the bar challenged you
let dartsBoard = 0; // which of the bar's wall boards you play at
// Flight colours (DART_COLORS), one per player: with friends, in line-up
// order each takes the colour from their id or the next one still free (the
// same on every screen); alone, a colour nobody on the boards throws now.
function dartColors(ids) {
  if (ids.length === 1) return [pickDartColor(dartColorOf(myId), interior?.dartPins?.colorsInUse(myId) || [])];
  const out = [];
  for (const id of ids) out.push(pickDartColor(dartColorOf(id), out));
  return out;
}
const freshInvite = () => (dartsInvite && performance.now() - dartsInvite.at < 60000 && others.nameOf(dartsInvite.from) ? dartsInvite : null);
async function openArcade(kind) {
  // Turn to face the cage, the targets or the board, with the camera behind you.
  const p = me.root.position, near = (q) => Math.hypot(p.x - q.x, p.z - q.z);
  const st = (interior?.stations?.[kind] || []).filter((q) => near(q) < 2.5).sort((a, b) => near(a) - near(b))[0];
  if (kind === 'darts') dartsBoard = st?.board ?? 0; // the bar has two boards: the one you stand at
  if (st?.ry != null) { me.root.rotation.y = st.ry; cam.yaw = st.ry + Math.PI; }
  if (!arcade[kind]) {
    // The first time, the panel loads: by then you may have walked off or
    // left; open it only if you are still in the same place.
    const at = interior;
    const ui = await (arcadeLoading[kind] ||= makeArcade(kind));
    arcade[kind] ||= ui;
    if (interior !== at || !interior?.stations?.[kind]?.some((q) => Math.hypot(me.root.position.x - q.x, me.root.position.z - q.z) < 3)) return;
  }
  if (!arcade[kind].open) arcade[kind].show();
}
async function makeArcade(kind) {
  {
    let ui;
    if (kind === 'batting') {
      const { BattingUI } = await import('./ui/batting-ui.js');
      ui = new BattingUI({
        root: $('batting-panel'), store: localStorage,
        onResult: (r) => {
          if (r === 'homerun' || r === 'hit') sfx.tock(1, r === 'homerun' ? 1200 : 900);
          if (r === 'homerun') me.play('cheer');
        },
      });
    } else if (kind === 'gallery') {
      const { GalleryUI } = await import('./ui/gallery-ui.js');
      ui = new GalleryUI({ root: $('gallery-panel'), store: localStorage, onPop: () => sfx.tock(0.6, 1500) });
    } else if (kind === 'hauntGallery') { // the haunted house's ghost lantern (same rules, its own look and record)
      const { GalleryUI, HAUNT_THEME } = await import('./ui/gallery-ui.js');
      ui = new GalleryUI({ root: $('haunt-panel'), store: localStorage, theme: HAUNT_THEME, onPop: () => sfx.tock(0.5, 700) });
    } else if (kind === 'darts') {
      const { DartsUI } = await import('./ui/darts-ui.js');
      ui = new DartsUI({
        root: $('darts-panel'), store: localStorage,
        myId, nameOf: (id) => others.nameOf(id),
        friends: () => others.nearbyFree(me.root.position.x, me.root.position.z, 6),
        sendGo: (to, mode, ids) => net.sendEmote(dartsGoMsg(to, mode, ids)),
        invite: freshInvite,
        clearInvite: () => { dartsInvite = null; },
        send: (to, k, thrown, total, extra) => net.sendEmote(dartsMsg(to, k, thrown, total, extra)),
        onThrow: (pts) => { sfx.tock(0.7, 600); if (pts >= 50) me.play('cheer'); },
        colors: dartColors,
        // Our dart sticks in the wall board, and everyone in the bar sees it.
        onDart: (at, color) => {
          interior?.dartPins?.add(myId, dartsBoard, color, at.x, at.y);
          net.sendEmote(dartPinMsg(dartsBoard, color, dartPack(at.x), dartPack(at.y)));
        },
      });
    }
    return ui;
  }
}
// Darts messages for me: a challenge waits up to a minute for you to walk to
// the board; the rest goes to the darts panel.
function onDartsMsg(from, m) {
  if (safety.isBlocked(from, others.nameOf(from))) return;
  if (m.kind === 'i') {
    dartsInvite = { from, name: others.nameOf(from) || '?', at: performance.now() };
    shop.toast(fmt(L(DARTS_INVITE), { name: dartsInvite.name }));
  } else if (m.kind === 'n' && dartsInvite?.from === from) dartsInvite = null;
  arcade.darts?.heard(from, m);
}
const DARTS_INVITE = {
  en: '🎯 {name} challenges you to darts! Go to the dartboard to play.',
  ko: '🎯 {name}님이 다트 대결을 신청했어요! 다트판으로 가서 받아 보세요.',
  ja: '🎯 {name}さんがダーツで勝負を挑んできました！ダーツボードへ。',
  zh: '🎯 {name}向你发起飞镖挑战！去飞镖靶那里接受吧。',
  es: '🎯 ¡{name} te reta a los dardos! Ve a la diana para jugar.',
  id: '🎯 {name} menantangmu main dart! Pergi ke papan dart untuk main.',
  vi: '🎯 {name} thách bạn chơi phi tiêu! Đến bảng phi tiêu để chơi.',
  hi: '🎯 {name} ने आपको डार्ट्स की चुनौती दी! खेलने के लिए डार्टबोर्ड पर जाएँ।',
  ar: '🎯 {name} يتحداك في رمي السهام! اذهب إلى اللوحة لتلعب.',
};
const ARCADE_OPEN = {
  batting: { en: 'Batting cage', ko: '야구 연습장', ja: 'バッティング', zh: '棒球击球', es: 'Jaula de bateo', id: 'Latihan memukul', vi: 'Tập đánh bóng', hi: 'बैटिंग', ar: 'قفص الضرب' },
  gallery: { en: 'Balloon shooting', ko: '풍선 사격', ja: '風船射的', zh: '气球射击', es: 'Tiro al globo', id: 'Tembak balon', vi: 'Bắn bóng bay', hi: 'गुब्बारा निशानेबाज़ी', ar: 'رماية البالونات' },
  hauntGallery: { en: 'Ghost lantern', ko: '유령 랜턴', ja: 'おばけランタン', zh: '幽灵灯笼', es: 'Farol de fantasmas', id: 'Lentera hantu', vi: 'Đèn lồng ma', hi: 'भूत लालटेन', ar: 'فانوس الأشباح' },
  darts: { en: 'Play darts', ko: '다트 하기', ja: 'ダーツをする', zh: '玩飞镖', es: 'Jugar a los dardos', id: 'Main dart', vi: 'Chơi phi tiêu', hi: 'डार्ट्स खेलें', ar: 'العب السهام' },
};
// Tarot cafés (Starlight and Lucky Piggy in Hongdae, Moon & Rose in Seongsu):
// sit at a reader's table and draw three cards, alone or with a friend. When
// the tables are taken, take a number and wait on the sofa (core/tarot-queue.js).
const TAROT_TEXT = {
  reader: { en: 'Tarot reader', ko: '타로 마스터', ja: 'タロット占い師', zh: '塔罗师', es: 'Tarotista', ar: 'قارئة التاروت', vi: 'Thầy bói tarot', hi: 'टैरो रीडर', id: 'Pembaca tarot' },
  open: { en: 'Tarot reading', ko: '타로 보기', ja: 'タロット占い', zh: '塔罗占卜', es: 'Lectura de tarot', ar: 'قراءة التاروت', vi: 'Xem bài tarot', hi: 'टैरो रीडिंग', id: 'Baca tarot' },
  hint: { en: 'Have a seat at my table and I\'ll read your cards.', ko: '테이블에 앉으시면 타로를 봐 드릴게요.', ja: 'テーブルに座ってください。カードを読みますね。', zh: '请在我的桌前坐下，我来为你解牌。', es: 'Siéntate a mi mesa y te leo las cartas.', ar: 'اجلس إلى طاولتي وسأقرأ لك البطاقات.', vi: 'Mời ngồi vào bàn, tôi sẽ xem bài cho bạn.', hi: 'मेरी मेज़ पर बैठिए, मैं आपके कार्ड पढ़ूँगी।', id: 'Silakan duduk di mejaku, aku bacakan kartumu.' },
  sit: { en: 'Sit for a reading', ko: '타로 테이블에 앉기', ja: '占いの席に座る', zh: '入座占卜', es: 'Sentarse para la lectura', ar: 'اجلس للقراءة', vi: 'Ngồi xem bài', hi: 'रीडिंग के लिए बैठें', id: 'Duduk untuk dibaca' },
  ticket: { en: 'Take a number', ko: '대기 번호 받기', ja: '順番待ちの番号を取る', zh: '取号排队', es: 'Tomar número', ar: 'خذ رقمًا', vi: 'Lấy số thứ tự', hi: 'नंबर लें', id: 'Ambil nomor antrean' },
  took: { en: 'You\'re No. {n} in line. Have a seat on the sofa; we\'ll call you.', ko: '대기 {n}번이에요. 소파에 앉아 기다리시면 불러 드릴게요.', ja: '{n}番目です。ソファで待っていてください。お呼びします。', zh: '你排第{n}位。请在沙发上稍候，轮到时会叫你。', es: 'Eres el n.º {n}. Siéntate en el sofá, te llamaremos.', ar: 'أنت رقم {n} في الطابور. اجلس على الأريكة وسننادي عليك.', vi: 'Bạn là số {n}. Mời ngồi sofa chờ gọi.', hi: 'आप कतार में {n} नंबर पर हैं। सोफ़े पर बैठिए, हम बुलाएँगे।', id: 'Kamu nomor {n}. Duduk di sofa, nanti dipanggil.' },
  line: { en: 'No. {n} in line · leave the line', ko: '대기 {n}번 · 대기 취소', ja: '{n}番目 · 列を抜ける', zh: '排第{n}位 · 取消排队', es: 'N.º {n} en la fila · salir', ar: 'رقم {n} · مغادرة الطابور', vi: 'Số {n} · rời hàng', hi: 'कतार में {n} · कतार छोड़ें', id: 'Nomor {n} · keluar antrean' },
  busy: { en: 'Someone is having a reading. Please take a number and wait your turn.', ko: '지금 다른 손님이 타로를 보고 있어요. 대기 번호를 받고 차례를 기다려 주세요.', ja: '今ほかのお客さんが占い中です。番号を取って順番をお待ちください。', zh: '有其他客人正在占卜。请取号等候。', es: 'Alguien está en una lectura. Toma un número y espera tu turno.', ar: 'هناك من يقرأ الآن. خذ رقمًا وانتظر دورك.', vi: 'Có người đang xem bài. Hãy lấy số và chờ đến lượt.', hi: 'कोई रीडिंग ले रहा है। नंबर लेकर अपनी बारी का इंतज़ार करें।', id: 'Ada yang sedang dibaca. Ambil nomor dan tunggu giliran.' },
  turn: { en: 'Your turn! Sit at the free table · {s}s', ko: '차례예요! 빈 테이블에 앉으세요 · {s}초', ja: 'あなたの番！空いた席へ · {s}秒', zh: '轮到你了！请坐到空桌 · {s}秒', es: '¡Tu turno! Siéntate en la mesa libre · {s}s', ar: 'دورك! اجلس إلى الطاولة الفارغة · {s}ث', vi: 'Đến lượt bạn! Ngồi vào bàn trống · {s}giây', hi: 'आपकी बारी! खाली मेज़ पर बैठें · {s}से', id: 'Giliranmu! Duduk di meja kosong · {s}d' },
  called: { en: '🔔 Your turn! A table is free. Please sit down within 10 seconds.', ko: '🔔 차례예요! 테이블이 비었어요. 10초 안에 앉아 주세요.', ja: '🔔 あなたの番です！席が空きました。10秒以内に座ってください。', zh: '🔔 轮到你了！有空桌了。请在10秒内入座。', es: '🔔 ¡Tu turno! Hay una mesa libre. Siéntate en 10 segundos.', ar: '🔔 دورك! هناك طاولة فارغة. اجلس خلال 10 ثوانٍ.', vi: '🔔 Đến lượt bạn! Có bàn trống. Hãy ngồi trong 10 giây.', hi: '🔔 आपकी बारी! मेज़ खाली है। 10 सेकंड में बैठें।', id: '🔔 Giliranmu! Ada meja kosong. Duduk dalam 10 detik.' },
  missed: { en: 'Your 10 seconds ran out, so your number was cleared. Take a new one any time.', ko: '10초가 지나 대기 번호가 초기화됐어요. 언제든 다시 받을 수 있어요.', ja: '10秒が過ぎたので番号がリセットされました。いつでも取り直せます。', zh: '10秒已过，号码已清除。可以随时重新取号。', es: 'Pasaron los 10 segundos y se borró tu número. Toma otro cuando quieras.', ar: 'انتهت الثواني العشر وأُلغي رقمك. خذ رقمًا جديدًا متى شئت.', vi: 'Hết 10 giây nên số của bạn đã bị hủy. Có thể lấy số mới bất cứ lúc nào.', hi: '10 सेकंड बीत गए, आपका नंबर हटा दिया गया। कभी भी नया लें।', id: '10 detik habis, nomormu dihapus. Ambil lagi kapan saja.' },
  leftLine: { en: 'You left the line.', ko: '대기를 취소했어요.', ja: '列を抜けました。', zh: '已取消排队。', es: 'Saliste de la fila.', ar: 'غادرت الطابور.', vi: 'Bạn đã rời hàng.', hi: 'आपने कतार छोड़ दी।', id: 'Kamu keluar dari antrean.' },
  joinFriend: { en: 'Sit with {name} for the reading', ko: '{name} 님 옆에 앉아 같이 보기', ja: '{name}さんの隣で一緒に占う', zh: '坐到{name}旁边一起占', es: 'Sentarse con {name}', ar: 'اجلس مع {name}', vi: 'Ngồi cùng {name}', hi: '{name} के साथ बैठें', id: 'Duduk bersama {name}' },
  invited: { en: '💞 {name} invites you to a tarot reading together!', ko: '💞 {name} 님이 타로를 같이 보자고 해요!', ja: '💞 {name}さんが一緒にタロットを占おうと誘っています！', zh: '💞 {name}邀请你一起占塔罗！', es: '💞 ¡{name} te invita a una lectura de tarot juntos!', ar: '💞 {name} يدعوك لقراءة تاروت معًا!', vi: '💞 {name} mời bạn cùng xem bài tarot!', hi: '💞 {name} आपको साथ में टैरो रीडिंग के लिए बुला रहे हैं!', id: '💞 {name} mengajakmu baca tarot bersama!' },
};
const TAROT_LINES = [
  ['어서 오세요, 앉으세요.', 'eoseo oseyo, anjeuseyo.', 'Welcome, have a seat.'],
  ['카드가 좋게 나왔네요!', 'kadeuga joke nawanneyo!', 'The cards look good!'],
  ['마음을 편하게 하고 골라 보세요.', 'maeumeul pyeonhage hago golla boseyo.', 'Relax and pick a card.'],
  ['잠시만 기다려 주세요.', 'jamsiman gidaryeo juseyo.', 'Please wait a moment.'],
  ['다음 손님, 오세요!', 'daeum sonnim, oseyo!', 'Next guest, please!'],
];
// The reader at the table you sit at (a café with two tables has two readers).
const tarotReader = () => (seated?.table ? interior?.readerNpcs?.[seated.table - 1] : null) || clerk;
const tarotUi = new TarotUI({
  root: $('tarot-panel'),
  wallet,
  onPick: () => sfx.pop?.(),
  onTension: (last) => sfx.heartbeat?.(last ? 5 : 3),
  onReveal: (last) => sfx.reveal?.(last),
  onRead: (cards) => {
    refreshWallet();
    const r = tarotReader();
    if (r) { r.ch.wave(); say(r, $('labels'), TAROT_LINES[1]); }
    showBubble(myLabel, $('labels'), cards.map((c) => c.icon).join(' '), 4000);
  },
  // A friend for a reading together: someone right beside us, not on a bike.
  partner: () => {
    if (!seated?.tarot) return null;
    const p = me.root.position;
    const o = others.nearestFree(p.x, p.z, 2.6);
    return o && !safety.isBlocked(o.id, o.name) ? o : null;
  },
  send: (verb, to, a, b) => net.sendEmote(tarotMsg(verb, to, a, b)),
  myName: () => nickname,
});
// The waiting line.
const tarotQueue = new TarotQueue();
let myTicket = 0; // when we took our number (0: not in line)
let tarotTurn = { order: [], callable: [], expired: [] };
const tarotChairs = (k) => (interior?.seats || []).filter((s) => s.tarot && s.table === k);
const chairBusy = (s) => s === seated || !!others.sitterAt(s.x, s.z);
const tableBusy = (k) => tarotChairs(k).some(chairBusy);
function tarotTick() {
  const tables = interior.stations?.tarotTables?.length || 0;
  let free = 0;
  for (let k = 0; k < tables; k++) if (!tableBusy(k)) free++;
  const line = others.tickets();
  if (myTicket) line.push({ id: myId, tq: myTicket });
  const was = tarotTurn.callable.includes(myId);
  tarotTurn = tarotQueue.update(line, free);
  if (myTicket && tarotTurn.expired.includes(myId)) { myTicket = 0; shop.toast(L(TAROT_TEXT.missed)); action = STALE; sendTimer = 0; }
  if (myTicket && !was && tarotTurn.callable.includes(myId)) {
    shop.toast(L(TAROT_TEXT.called));
    sfx.pop?.();
    if (clerk) say(clerk, $('labels'), TAROT_LINES[4]);
    action = STALE;
  }
}
// May we sit on this reading chair? Not while someone else is at that table
// (unless they asked us to read together), and not ahead of the line.
function tarotSeatOk(s) {
  const busy = tarotChairs(s.table).map((c) => others.sitterAt(c.x, c.z)).filter(Boolean);
  if (busy.length) return !!tarotUi.offer && busy.includes(tarotUi.offer.from);
  return tarotQueue.maySit(myId, tarotTurn);
}
function takeTicket() {
  myTicket = Date.now();
  sendTimer = 0;
  tarotTick();
  shop.toast(fmt(L(TAROT_TEXT.took), { n: tarotTurn.order.indexOf(myId) + 1 }));
  if (clerk) say(clerk, $('labels'), TAROT_LINES[3]);
  action = STALE;
}
function leaveTarotLine(quiet) {
  if (!myTicket) return;
  myTicket = 0;
  sendTimer = 0;
  if (!quiet) shop.toast(L(TAROT_TEXT.leftLine));
  action = STALE;
}
// What the action button offers in a tarot café (null: the usual).
function tarotAction(p, seat) {
  const offer = tarotUi.offer;
  if (offer && !offer.accepted && !seated) { // a friend asked: sit beside them
    const host = others.positionOf(offer.from);
    const chair = host && (interior.seats || []).find((s) => s.tarot && !chairBusy(s) && tarotChairs(s.table).some((c) => others.sitterAt(c.x, c.z) === offer.from));
    if (chair) return { key: 'tarot-join:' + offer.from, label: '💞 ' + fmt(L(TAROT_TEXT.joinFriend), { name: offer.name }), run: () => { leaveTarotLine(true); sitDown(chair); tarotUi.show(); tarotUi.accept(); } };
  }
  if (!seated && seat?.tarot) {
    if (tarotSeatOk(seat)) return { key: 'tarot-sit', label: '🔮 ' + L(TAROT_TEXT.sit), run: () => { leaveTarotLine(true); sitDown(seat); const r = tarotReader(); if (r) { r.ch.wave(); say(r, $('labels'), TAROT_LINES[0]); } tarotUi.show(); } };
    if (!myTicket) return { key: 'tarot-ticket', label: '🎫 ' + L(TAROT_TEXT.ticket), run: () => { shop.toast(L(TAROT_TEXT.busy)); takeTicket(); } };
  }
  if (myTicket) {
    if (!seated && seat?.wait) return sofa(seat); // (sit on the sofa while waiting)
    const s = tarotQueue.secondsLeft(myId);
    if (tarotTurn.callable.includes(myId) && s != null) return { key: 'tarot-turn:' + s, label: '🔔 ' + fmt(L(TAROT_TEXT.turn), { s }), run: () => { if (seated) standUp(); } };
    const n = tarotTurn.order.indexOf(myId) + 1;
    return { key: 'tarot-line:' + n, label: '🎫 ' + fmt(L(TAROT_TEXT.line), { n }), run: () => leaveTarotLine() };
  }
  // Every table taken, or people already waiting: offer a number.
  const tables = interior.stations?.tarotTables?.length || 0;
  const full = tables > 0 && [...Array(tables).keys()].every(tableBusy);
  if ((full || tarotTurn.order.length) && (seat?.wait || seated?.wait || !seated)) return { key: 'tarot-ticket', label: '🎫 ' + L(TAROT_TEXT.ticket), run: () => takeTicket() };
  if (!seated && seat?.wait) return sofa(seat);
  return null;
}
const sofa = (seat) => ({ key: 'sit', label: '🪑 ' + t('shop.sit'), run: () => sitDown(seat) });
// Busking: step onto a busking stage and perform; the crowd tips now and then.
// The skate park at Olympic Park (core/skatepark.js, scenery in core/skatepark-model.js):
// ride in on a board, inline skates, a bike or a kick scooter (bike button,
// or a ride from the bag) and tap Trick to pop; ramps throw you into the air,
// a rail under you is a grind. Tricks in a row make a combo; landing banks
// it into today's score and your best combo (just for fun, no coins).
const SKATE_TEXT = {
  trick: { en: 'Trick!', ko: '묘기!', ja: 'トリック！', zh: '技巧！', es: '¡Truco!', ar: 'حركة!', vi: 'Mẹo!', hi: 'ट्रिक!', id: 'Trik!' },
  ride: { en: 'Ride to do tricks', ko: '타고 묘기 부리기', ja: '乗ってトリック', zh: '骑上去秀技巧', es: 'Monta para hacer trucos', ar: 'اركب لتؤدي الحركات', vi: 'Lên xe để biểu diễn', hi: 'सवार होकर करतब करें', id: 'Naik untuk trik' },
  welcome: { en: '🛹 Olympic Park Skate Park! Hop on a ride (bike button or your bag), then tap Trick to jump.', ko: '🛹 올림픽공원 스케이트파크! 탈것에 올라타고(자전거 버튼이나 가방) 묘기 버튼으로 점프해요.', ja: '🛹 オリンピック公園スケートパーク！乗り物に乗って（自転車ボタンかバッグ）、トリックでジャンプ。', zh: '🛹 奥林匹克公园滑板公园！骑上车（自行车按钮或背包），按“技巧”起跳。', es: '🛹 ¡Skatepark del Parque Olímpico! Súbete a algo (botón de bici o tu bolsa) y pulsa Truco para saltar.', ar: '🛹 حديقة التزلج في الحديقة الأولمبية! اركب (زر الدراجة أو حقيبتك) ثم اضغط «حركة» للقفز.', vi: '🛹 Công viên trượt Olympic! Lên xe (nút xe đạp hoặc túi) rồi bấm Mẹo để nhảy.', hi: '🛹 ओलंपिक पार्क स्केट पार्क! सवारी पर चढ़ें (साइकिल बटन या बैग), फिर ट्रिक दबाकर कूदें।', id: '🛹 Skatepark Taman Olimpiade! Naik kendaraan (tombol sepeda atau tas), lalu tekan Trik untuk melompat.' },
  howto: { en: '🤸 Tap Trick to pop. Ride up the ramps for big air, and land on a rail to grind!', ko: '🤸 묘기 버튼으로 점프! 램프를 타고 높이 날고, 레일 위에 내려앉으면 그라인드!', ja: '🤸 トリックでジャンプ！ランプで高く飛び、レールに乗ればグラインド！', zh: '🤸 按“技巧”起跳！冲上坡道飞得更高，落在栏杆上就能滑杆！', es: '🤸 Pulsa Truco para saltar. ¡Sube las rampas para volar y cae en un riel para grindear!', ar: '🤸 اضغط «حركة» للقفز. اصعد المنحدرات لتطير عاليًا، وانزل على القضيب للانزلاق!', vi: '🤸 Bấm Mẹo để nhảy. Lên dốc để bay cao, đáp lên thanh để trượt!', hi: '🤸 कूदने के लिए ट्रिक दबाएँ। ऊँची उड़ान के लिए रैंप पर चढ़ें, ग्राइंड के लिए रेल पर उतरें!', id: '🤸 Tekan Trik untuk melompat. Naik ramp untuk terbang tinggi, mendarat di rel untuk grind!' },
  bail: { en: 'Bail! 💥', ko: '넘어졌어요! 💥', ja: '転倒！💥', zh: '摔倒了！💥', es: '¡Caída! 💥', ar: 'سقوط! 💥', vi: 'Ngã rồi! 💥', hi: 'गिर गए! 💥', id: 'Jatuh! 💥' },
  combo: { en: 'Combo', ko: '콤보', ja: 'コンボ', zh: '连招', es: 'Combo', ar: 'كومبو', vi: 'Combo', hi: 'कॉम्बो', id: 'Kombo' },
  score: { en: 'Today {n}', ko: '오늘 {n}점', ja: '今日 {n}点', zh: '今天 {n}分', es: 'Hoy {n}', ar: 'اليوم {n}', vi: 'Hôm nay {n}', hi: 'आज {n}', id: 'Hari ini {n}' },
  best: { en: 'Best combo {n}', ko: '최고 콤보 {n}', ja: 'ベストコンボ {n}', zh: '最佳连招 {n}', es: 'Mejor combo {n}', ar: 'أفضل كومبو {n}', vi: 'Combo tốt nhất {n}', hi: 'सर्वश्रेष्ठ कॉम्बो {n}', id: 'Kombo terbaik {n}' },
};
const SKATE_KEY = 'mk.skate'; // { day, pts, best }
const readSkate = () => { try { return JSON.parse(localStorage.getItem(SKATE_KEY) || 'null'); } catch { return null; } };
const skateLm = map.landmarks.find((l) => l.type === 'skatepark') || null;
let skateWelcomed = 0;
let skateTkSeq = 0;
let skatePopTimer = 0;
function skatePop(text, kind = '') {
  const el = $('skate-pop');
  el.textContent = text;
  el.className = 'skate-pop show ' + kind;
  clearTimeout(skatePopTimer);
  skatePopTimer = setTimeout(() => { el.className = 'skate-pop'; }, 1100);
}
function skateHud() {
  const hud = $('skate-hud');
  hud.hidden = !inSkate;
  if (!inSkate) return;
  const s = readSkate();
  const today = s?.day === dayKey() ? s.pts : 0;
  $('skate-score').textContent = '🛹 ' + fmt(L(SKATE_TEXT.score), { n: today.toLocaleString() });
  const combo = skater.comboPts;
  $('skate-combo').textContent = combo ? `${L(SKATE_TEXT.combo)}${skater.mult > 1 ? ' ×' + skater.mult : ''} · ${Math.round(combo).toLocaleString()}`
    : s?.best ? fmt(L(SKATE_TEXT.best), { n: s.best.toLocaleString() }) : '';
}
function skateEvent(e) {
  if (e.kind === 'trick') {
    skatePop(`${'★'.repeat(e.trick.tier || 1)} ${localName(e.trick.name, getLanguage())}${e.mult > 1 ? ' ×' + e.mult : ''}`, e.trick.tier >= 3 ? 'big' : '');
    sfx.skatePop();
    skateTk = { code: `${e.trick.id}.${++skateTkSeq % 100}`, at: performance.now() };
    sendTimer = 0;
  } else if (e.kind === 'grind') {
    if (e.start) { skatePop(localName(GRIND_NAME[skater.type] || GRIND_NAME.skate, getLanguage()), 'grind'); sfx.grind(); buzz(15); }
    else sfx.grind();
  } else if (e.kind === 'land') {
    skatePop(`${e.mult > 1 ? L(SKATE_TEXT.combo) + ' ×' + e.mult + '  ' : ''}+${Math.round(e.total).toLocaleString()}`, 'land');
    const saved = bankPoints(readSkate(), dayKey(), e.total);
    try { localStorage.setItem(SKATE_KEY, JSON.stringify(saved)); } catch { /* storage blocked */ }
  } else if (e.kind === 'bail') {
    skatePop(L(SKATE_TEXT.bail), 'bail');
    sfx.skateLand(false);
    buzz(60);
  }
}
// Every frame on the street, before the ground height is used.
function skateTick(dt, p) {
  const was = inSkate;
  const lx = skateLm ? p.x - skateLm.x : 1e9, lz = skateLm ? p.z - skateLm.z : 1e9;
  inSkate = mode === 'street' && !!skateLm && inPark(lx, lz);
  if (inSkate !== was) {
    action = STALE;
    if (inSkate && performance.now() - skateWelcomed > 90e3) {
      skateWelcomed = performance.now();
      shop.toast(L(riding === 1 ? SKATE_TEXT.howto : SKATE_TEXT.welcome));
    }
  }
  if (!inSkate) {
    if (was) { for (const e of skater.finish()) skateEvent(e); me.setTrick(null, 0); skateHud(); }
    skateY = 0;
    return;
  }
  if (riding !== 1) { // on foot (or in a car): just the ramps under you
    if (skater.air || skater.grind || skater.combo.length) { for (const e of skater.finish()) skateEvent(e); me.setTrick(null, 0); }
    skateY = parkGround(lx, lz).y;
    skateHud();
    return;
  }
  skater.type = garage.current.type;
  let x = lx, z = lz;
  if (skater.grind) {
    // On a rail: stay on it while heading along it; stop and you drop off.
    const r = skater.grind.rail;
    const dx = r.b[0] - r.a[0], dz = r.b[1] - r.a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
    const dot = Math.sin(me.root.rotation.y) * ux + Math.cos(me.root.rotation.y) * uz;
    if (speed01 < 0.15) skater.leaveRail();
    else if (Math.abs(dot) > 0.45) {
      const t = (x - r.a[0]) * ux + (z - r.a[1]) * uz;
      x = r.a[0] + ux * t; z = r.a[1] + uz * t;
      p.x = skateLm.x + x; p.z = skateLm.z + z;
      me.root.rotation.y = Math.atan2(ux * Math.sign(dot), uz * Math.sign(dot));
    }
  }
  const g = parkGround(x, z);
  const { y, events } = skater.step(dt, g, railNear(x, z, skater.grind ? 1.1 : 0.9));
  const landedNow = !skater.air && !skater.grind && skateY - g.y > 0.25;
  skateY = y;
  if (landedNow && !events.some((e) => e.kind === 'bail')) sfx.skateLand(true);
  me.setTrick(skater.pose(), y - g.y);
  for (const e of events) skateEvent(e);
  skateHud();
}

const BUSK_TEXT = {
  start: { en: 'Busk', ko: '버스킹하기', ja: 'バスキングする', zh: '街头表演', es: 'Tocar en la calle', ar: 'اعزف في الشارع', vi: 'Biểu diễn đường phố', hi: 'बस्किंग करें', id: 'Ngamen' },
  stop: { en: 'Stop busking', ko: '버스킹 끝내기', ja: 'バスキングをやめる', zh: '结束表演', es: 'Terminar', ar: 'إنهاء العزف', vi: 'Dừng biểu diễn', hi: 'बस्किंग बंद करें', id: 'Berhenti ngamen' },
  hi: { en: 'Say hi to the busker', ko: '버스커에게 인사', ja: 'バスカーにあいさつ', zh: '和街头艺人打招呼', es: 'Saludar al músico', ar: 'حيِّ العازف', vi: 'Chào nghệ sĩ', hi: 'कलाकार को नमस्ते', id: 'Sapa pengamen' },
  begin: { en: '🎤 You\'re on! The crowd is listening. Moving ends the show.', ko: '🎤 공연 시작! 관객이 듣고 있어요. 움직이면 공연이 끝나요.', ja: '🎤 本番スタート！観客が聴いています。動くと終わります。', zh: '🎤 开演了！观众在听。移动就会结束表演。', es: '🎤 ¡A escena! El público escucha. Si te mueves, termina.', ar: '🎤 بدأ العرض! الجمهور يستمع. الحركة تنهي العرض.', vi: '🎤 Bắt đầu! Khán giả đang nghe. Di chuyển sẽ kết thúc.', hi: '🎤 शो शुरू! भीड़ सुन रही है। चलने से शो ख़त्म होगा।', id: '🎤 Mulai! Penonton mendengarkan. Bergerak mengakhiri pertunjukan.' },
  tip: { en: '🪙 +{n} A listener dropped a tip in your guitar case!', ko: '🪙 +{n} 관객이 기타 케이스에 팁을 넣었어요!', ja: '🪙 +{n} 観客がギターケースにチップを入れました！', zh: '🪙 +{n} 有观众往吉他盒里放了小费！', es: '🪙 +{n} ¡Alguien dejó una propina!', ar: '🪙 +{n} ترك أحد المستمعين إكرامية!', vi: '🪙 +{n} Một khán giả đã boa cho bạn!', hi: '🪙 +{n} एक श्रोता ने टिप दी!', id: '🪙 +{n} Penonton memberi tip!' },
  noTips: { en: 'Great show! No more tips today, but the crowd still loves you.', ko: '멋진 공연! 오늘 팁은 다 받았지만 관객은 여전히 좋아해요.', ja: '素敵なショー！今日のチップは終わりですが、観客は大喜び。', zh: '精彩的表演！今天的小费已经领完，但观众依然喜欢你。', es: '¡Gran show! Hoy no hay más propinas.', ar: 'عرض رائع! لا مزيد من الإكراميات اليوم.', vi: 'Diễn hay lắm! Hôm nay hết tiền boa rồi.', hi: 'शानदार शो! आज और टिप नहीं।', id: 'Pertunjukan hebat! Hari ini tip sudah habis.' },
  note: { en: 'Busking tips', ko: '버스킹 팁', ja: 'バスキングのチップ', zh: '街头表演小费' },
};
let buskMusic = null; // { wasOn, track } while inside a busking zone
function startBusking(s) {
  busking.start(s);
  me.root.position.set(s.x, 0, s.z);
  me.root.rotation.y = 0; // face the crowd
  showBubble(myLabel, $('labels'), '🎤🎶', 3000);
  shop.toast(L(BUSK_TEXT.begin));
  action = STALE;
}
function stopBusking() {
  busking.stop();
  me.play('bow');
  action = STALE;
}
function buskTip() {
  const next = takeTip(readTips(), dayKey());
  if (!next) { if (!busking.noTipsShown) { busking.noTipsShown = true; shop.toast(L(BUSK_TEXT.noTips)); } return; }
  writeTips(next);
  wallet.add(TIP, { name: BUSK_TEXT.note });
  refreshWallet();
  sfx.pop?.();
  shop.toast(fmt(L(BUSK_TEXT.tip), { n: TIP }));
}
// The busking song plays while you're in the zone (and the usual music after).
function updateBuskMusic(p) {
  const z = mode === 'street' ? busking.zoneAt(p.x, p.z) : null;
  if (z === busking.inside) return;
  busking.inside = z;
  if (z) {
    buskMusic = { wasOn: music.on, track: music.track.id === 'busking' ? 'lofi' : music.track.id };
    music.setTrack('busking');
    if (!music.on) music.setOn(true).then(applyMusicBtn);
  } else if (buskMusic) {
    const { wasOn, track } = buskMusic;
    buskMusic = null;
    if (music.track.id === 'busking') music.setTrack(track);
    if (cafeMusic) cafeMusic.wasOn = wasOn; // walked straight into a music café or bar
    else if (!wasOn && music.on) music.setOn(false).then(applyMusicBtn);
  }
}
// Name tag studio: emblems and name colours (a place to spend coins).
const emblems = new EmblemCollection();
const emblemUi = new EmblemUI({
  root: $('emblem-panel'),
  owned: emblems,
  wallet,
  name: nickname,
  rename: (raw) => renameMe(raw),
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
// Information Centers: which district a place is in, the shops of a
// district, and the nearest shop of a kind (the name tag workshops).
const dBoxes = districtBoxes(map);
const storeAt = (st) => placeOf(st, region.center, latLonToLocal);
const districtOfStore = (st) => st.district || districtAt(dBoxes, ...storeAt(st));
// "알바급구!" posters for the shops that hire (core/hiring-ads.js): on the
// empty ad lots nearest each Seongsu job, a few more there for the jobs in
// other districts (Seongsu is where everyone starts), on a wall down the
// street in districts without empty lots, as slides on the square's screen,
// and a paper sign by each hiring shop's door.
{
  const signLang = () => (signsTranslated ? getLanguage() : 'en');
  const jobs = storefronts.items.filter((i) => jobOf(i.store)).map((i) => ({
    item: i, id: i.store.id, x: i.door.x, z: i.door.z, district: districtOfStore(i.store),
    ad: { job: jobOf(i.store), shopNames: i.store.name, district: districtOfStore(i.store), color: i.store.colors?.sign },
  }));
  const spotById = Object.fromEntries(adPosters.spots.map((sp) => [sp.id, sp]));
  const used = new Set();
  const free = () => adPosters.spots.filter((sp) => !used.has(sp.id) && adPosters.posters[sp.id]);
  // One "buy me a coffee" poster per district (core/support-poster.js), on
  // the free ad lot nearest the subway exit (or the square), before the
  // hiring posters take theirs. Never more than one per district.
  if (/^https:\/\//.test(config.supportUrl)) {
    const hubs = {};
    const dOf = (x, z) => districtAt(dBoxes, x, z) || 'map';
    for (const b of dBoxes) hubs[b.id] = { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 };
    for (const st of subwayStations) { const [x, z] = st.exits[0].at; hubs[dOf(x, z)] = { x, z }; }
    if (square) hubs[dOf(square.x, square.z)] = { x: square.x, z: square.z };
    const spotDistrict = (sp) => dOf(sp.front.x, sp.front.z);
    // Spot ids repeat across districts; setPoster reaches the last one.
    const spots = adPosters.spots.filter((sp) => spotById[sp.id] === sp).map((sp) => ({ ...sp, b: { d: spotDistrict(sp) } }));
    const picked = pickSupportSpots(spots, hubs, (sp) => adPosters.posters[sp.id] && !used.has(sp.id));
    const qrUrl = (import.meta.env.BASE_URL || '/') + 'ads/support-qr.png';
    const label = config.supportUrl.replace(/^https:\/\/(www\.)?/, '');
    for (const [d, hub] of Object.entries(hubs)) {
      const tex = supportTexture(signLang(), { qrUrl, label });
      if (picked[d] && picked[d].dist < 300 && adPosters.setPoster(picked[d].id, tex)) {
        used.add(picked[d].id); hiringRedraws.push(tex.redraw); supportPlaces.push([d, 'spot', picked[d].id]);
        continue;
      }
      // No free lot nearby: the nearest tall wall to the hub.
      const edges = [];
      for (const bd of map.buildings) {
        if ((bd.d || 'map') !== d || (bd.h || 10) < 7) continue;
        bd.p.forEach(([x1, z1], i) => {
          const [x2, z2] = bd.p[(i + 1) % bd.p.length];
          if (Math.hypot(x2 - x1, z2 - z1) < 7) return;
          const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
          edges.push({ mx, mz, dist: Math.hypot(mx - hub.x, mz - hub.z) });
        });
      }
      edges.sort((p, q) => p.dist - q.dist);
      let wall = null;
      for (const e of edges) {
        if (e.dist < 12 || e.dist > 300) continue;
        const w = wallNear(map.buildings, e.mx, e.mz, 7);
        if (!w || (w.b.d || 'map') !== d || w.h < 7) continue;
        // Facing the hub side, not over a subway entrance or a shop's sign.
        if ((hub.x - w.x) * w.nx + (hub.z - w.z) * w.nz < 0) continue;
        if (allExits.some((ex) => Math.hypot(ex.at[0] - w.x, ex.at[1] - w.z) < 14)) continue;
        if (storefronts.items.some((o) => Math.hypot(o.group.position.x - w.x, o.group.position.z - w.z) < 7)) continue;
        // No street tree right in front hiding it.
        if (treeSpots.some(([x, z]) => {
          const ahead = (x - w.x) * w.nx + (z - w.z) * w.nz, along = Math.abs((x - w.x) * w.nz - (z - w.z) * w.nx);
          return ahead > 0 && ahead < 14 && along < 5.5;
        })) continue;
        wall = w; break;
      }
      if (!wall) { tex.dispose(); continue; }
      const w = Math.min(5.6, wall.len - 1);
      scene.add(wallPoster(tex, wall, Math.min(wall.h - w * 0.32 - 1, 6.4), w));
      hiringRedraws.push(tex.redraw); supportPlaces.push([d, 'wall', [Math.round(wall.x), Math.round(wall.z), wall.nx, wall.nz, wall.h]]);
    }
  }
  const putOnSpot = (j, spotId) => {
    const sp = spotById[spotId];
    used.add(spotId);
    const meters = Math.hypot(sp.front.x - j.x, sp.front.z - j.z);
    const tex = hiringTexture({ ...j.ad, meters }, signLang());
    if (adPosters.setPoster(spotId, tex)) { hiringRedraws.push(tex.redraw); hiringPlaces.push([j.id, 'spot', spotId, Math.round(meters)]); }
  };
  // Two empty lots per job within a short walk.
  for (let round = 0; round < 2; round++) {
    const got = assignSpots(jobs, free(), 260);
    for (const j of jobs) if (got[j.id]) { putOnSpot(j, got[j.id].spot); j.local = true; }
  }
  // Jobs far from any empty lot: one poster in Seongsu, near where people
  // start (the square), and one on a wall near the shop.
  const hub = square ? { x: square.x, z: square.z } : { x: 0, z: 0 };
  for (const j of jobs.filter((q) => !q.local)) {
    const got = assignSpots([{ id: j.id, x: hub.x, z: hub.z }], free(), 400);
    if (got[j.id]) putOnSpot(j, got[j.id].spot);
    const ry = j.item.group.rotation.y, f = j.item.group.position;
    const nx = Math.sin(ry), nz = Math.cos(ry), ax = Math.cos(ry), az = -Math.sin(ry);
    for (const k of [14, -14, 20, -20, 26, -26, 34, -34]) {
      const wall = wallNear(map.buildings, f.x + ax * k - nx * 0.5, f.z + az * k - nz * 0.5, 6);
      if (!wall || wall.d > 4 || wall.nx * nx + wall.nz * nz < 0.9 || wall.h < 8) continue;
      // Not over another shop's sign.
      if (storefronts.items.some((o) => Math.hypot(o.group.position.x - wall.x, o.group.position.z - wall.z) < 6)) continue;
      const w = Math.min(5.6, wall.len - 1);
      const tex = hiringTexture({ ...j.ad, meters: Math.hypot(wall.x - j.x, wall.z - j.z) }, signLang());
      scene.add(wallPoster(tex, wall, Math.min(wall.h - w * 0.32 - 1, 7.2), w));
      hiringRedraws.push(tex.redraw);
      hiringPlaces.push([j.id, 'wall', [Math.round(wall.x), Math.round(wall.z), +wall.nx.toFixed(2), +wall.nz.toFixed(2)]]);
      break;
    }
  }
  // Paper sign by the door.
  for (const j of jobs) {
    const tex = doorSticker(j.item.group, localName(JOB_TEXT.sticker, signLang()));
    hiringRedraws.push((l) => tex.redraw(localName(JOB_TEXT.sticker, l)));
  }
  // The square's big screen: a hiring slide after every few house ads.
  if (billboard) {
    const slides = jobs.map((j) => ({ seconds: 7, anim: (g) => drawHiring(g, j.ad, signLang()) }));
    let k = 0;
    for (let i = 3; i < billboard.slides.length && slides.length; i += 5) billboard.slides.splice(i, 0, slides[k++ % slides.length]);
  }
}
function nearestStore(test) {
  const p = interior?.front?.door || me.root.position; // inside a shop: from its door
  let best = null, bd = Infinity;
  for (const it of storefronts.items) {
    if (!test(it.store)) continue;
    const d = Math.hypot(it.door.x - p.x, it.door.z - p.z);
    if (d < bd) { bd = d; best = it.store.id; }
  }
  return best;
}
const infoUi = new InfoUI({
  root: $('info-panel'),
  guide: guideToPlace,
  places: {
    districtOf: (to) => {
      if (to.store) { const st = storeData.find((x) => x.id === to.store); return st ? districtOfStore(st) : null; }
      const z = zones.items.find((i) => i.zone.id === to.zone);
      return z ? districtAt(dBoxes, z.x, z.z) : null;
    },
    storesIn: (d) => storeData.filter((st) => st.category !== 'home' && st.category !== 'info' && storefronts.get(st.id) && districtOfStore(st) === d),
    nearest: (workshop) => nearestStore((st) => st.workshop === workshop),
  },
});
// The first-time hint waits until the daily check-in card is closed.
if (onboard === 0) { // first time: just the high five, nothing else in the way
  const box = $('info-hint');
  const p0 = document.createElement('p');
  p0.textContent = L(ONBOARD_TEXT.hi5);
  box.replaceChildren(p0);
  box.hidden = false;
} else setTimeout(function infoHintWhenFree() {
  if (!$('daily-panel').hidden) { setTimeout(infoHintWhenFree, 1500); return; }
  showInfoHint($('info-hint'), { onGo: () => guideToPlace({ store: nearestStore((st) => st.workshop === 'info') || 'info-center' }) });
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
const GYM_POSE = { treadmill: 'run', dumbbell: 'curl', pushup: 'pushup', situp: 'situp', pullup: 'pullup' };
let dancing = false;
const DANCE_TEXT = {
  start: { en: 'Dance', ko: '춤추기', ja: '踊る', zh: '跳舞' },
  stop: { en: 'Stop dancing', ko: '춤 멈추기', ja: 'ダンスをやめる', zh: '停止跳舞' },
};
function currentActivity() {
  if (seated?.mat) return seated.lie ? 'mat' : 'matsit'; // a picnic mat (Han River park, Seoul Forest): lying or sitting
  if (seated?.lie) return 'lie'; // a clinic bed, the operating table
  if (dancing || busking.performing) return 'dance'; // (busking: playing on the stage)
  if (gymUi.open) return GYM_POSE[gymUi.kind] || null;
  if (seated && held?.kind === 'book' && bookUi.open) return 'read';
  if (fishingUi.open) return fishingUi.state === 'reel' ? 'reel' : 'fish'; // reeling in: the reel clip
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
// Love locks on the Namsan summit: in Supabase when signed in to it (the
// coins are taken there too, with the note), else on this device.
let lockBackend = null;
function loveLockStore() {
  const live = cloud.status === 'cloud' && cloud.client && cloud.user;
  if (live && !(lockBackend instanceof SupabaseLoveLocks)) lockBackend = new SupabaseLoveLocks(cloud, wallet);
  if (!live && !lockBackend) lockBackend = new LocalLoveLocks(wallet);
  return lockBackend;
}
const loveLockUi = new LoveLockUI({
  root: $('love-lock-panel'), store: loveLockStore, wallet, name: () => nickname, toast: (m) => shop.toast(m),
  onHung: () => { refreshWallet(); me.play('cheer'); },
});
const loveLockActs = () => [
  { key: 'lovelock-hang', label: '🔒 ' + L(LOCK_TEXT.hang), run: () => loveLockUi.show('write') },
  { key: 'lovelock-read', label: '💌 ' + L(LOCK_TEXT.read), run: () => loveLockUi.show('list') },
];
// Cheonggyecheon's lantern festival (core/lanterns.js): float a wish lantern
// from the walkway in the wish corner, read about the procession mural.
const festStream = streams.findIndex((s) => s.lanterns);
let myWish = null, lastWishAt = -1e9;
// Where p is in the festival stream's frame, when down by its water.
function festFrame(p) {
  if (festStream < 0 || byStream?.i !== festStream || !byStream.low || byStream.stair) return null;
  const s = streams[festStream];
  return { s, u: p.x - s.at[0], v: p.z - s.at[1] };
}
const wishSpot = (p) => { const f = festFrame(p); return f && canFloat(f.s, f.u, f.v) ? f : null; };
const muralSpot = (p) => { const f = festFrame(p), m = f && muralSign(f.s); return m && Math.hypot(f.u - m.u, f.v - m.v) < 2.2 ? m : null; };
const wishUi = new WishUI({
  root: $('wish-panel'), wallet,
  onFloat: (c, w) => {
    const f = wishSpot(me.root.position);
    if (!f) return false;
    const now = Date.now() / 1000;
    if (now - lastWishAt < WISH.cooldown) { shop.toast(L(WISH_TEXT.wait)); return false; }
    if (!wallet.spend(WISH.price, { name: WISH_TEXT.float, at: streams[festStream].name })) { shop.toast(fmt(L(WISH_TEXT.poor), { n: WISH.price })); return false; }
    refreshWallet();
    lastWishAt = now;
    const ww = (f.s.water || 8) / 2;
    const L0 = { id: Math.random().toString(36).slice(2, 10), c, w, u0: Math.min(Math.max(f.u, wishFrom(f.s)), wishTo(f.s) - 6), v: Math.sign(f.v) * (ww - 0.6), t0: now };
    streamModels.userData.wish?.add(L0, nickname);
    myWish = L0;
    lastSent = null; // others see it at once
    me.play('clap');
    sfx.pop?.();
    showBubble(myLabel, $('labels'), '🏮 ' + L(WISHES[w]), 3500);
    shop.toast(L(WISH_TEXT.done));
    return true;
  },
});
const wishAct = () => ({ key: 'wish-float', label: `🏮 ${L(WISH_TEXT.float)} · 🪙 ${WISH.price}`, run: () => wishUi.show('wish') });
const muralAct = () => ({ key: 'mural', label: '📜 ' + L(WISH_TEXT.mural), run: () => wishUi.show('mural') });
// Other players' wish lanterns ride on their state ("wl"); add each new one.
const wishSeen = new Map(); // remote id -> the lantern string we last saw
function updateWishes() {
  const wish = streamModels.userData.wish;
  if (!wish) return;
  const now = Date.now() / 1000;
  if (myWish && !lanternAt(streams[festStream], myWish, now)) { myWish = null; lastSent = null; }
  for (const [id, o] of others.players) {
    const str = !o.hidden && typeof o.target?.wl === 'string' ? o.target.wl : null;
    if (!str || wishSeen.get(id) === str) continue;
    wishSeen.set(id, str);
    if (safety.isBlocked(id, others.nameOf(id))) continue;
    const L1 = decodeLantern(str, streams[festStream], now);
    if (!L1 || !wish.add(L1, others.nameOf(id) || '')) continue;
    if (now - L1.t0 < 10 && camera.position.distanceTo(o.ch.root.position) < 30) showBubble(o, $('labels'), '🏮 ' + L(WISHES[L1.w]), 3500);
  }
  for (const id of wishSeen.keys()) if (!others.players.has(id)) wishSeen.delete(id);
}
const bookUi = new BookUI({
  root: $('book-panel'),
  carrying: () => (held?.kind === 'book' ? held.book : null),
  take: (id) => {
    if (!handReady()) return;
    holdNew({ kind: 'book', book: id });
    shop.toast(t('book.taken'));
  },
  putDown: () => { if (held?.kind === 'book') setHeld(null); },
  getPage: (id) => bookPages[id] | 0,
  setPage: (id, i) => { bookPages[id] = i; try { localStorage.setItem(BOOK_PAGE_KEY, JSON.stringify(bookPages)); } catch { /* storage blocked */ } },
});
const stampBook = new StampBook();
const stampUi = new StampUI({ root: $('stamp-panel'), book: stampBook, stamps: () => tourStamps });
function refreshStampBtn() { $('stamp-btn').querySelector('span').textContent = `${L(STAMP_TEXT.open)} · ${stampBook.count(tourStamps)}/${tourStamps.length}`; }
$('stamp-btn').onclick = () => { $('notes-panel').hidden = true; stampUi.show(); };
refreshStampBtn();
onLanguageChange(refreshStampBtn);
// Press the stamp at a stand: the first time pays 🪙10 and opens the note.
function pressStamp(it) {
  const s = it.stamp;
  stampStands.press(it);
  me.play('bow');
  sfx.pop?.();
  if (stampBook.stamp(s.id)) {
    const name = {};
    for (const l of ['ko', 'en', 'ja', 'zh']) name[l] = fmt(STAMP_TEXT.ledger[l], { name: s.name[l] });
    wallet.add(STAMP_REWARD, { name });
    shop.toast('🔖 ' + fmt(L(STAMP_TEXT.got), { name: L(s.name), c: STAMP_REWARD }));
    refreshStampBtn();
    setTimeout(() => stampUi.show(s.id), 450);
  } else stampUi.show();
  action = STALE;
}
const dexUi = new DexUI({ root: $('dex-panel'), dex: foodDex, stores: () => storeData, localName: (n) => localName(n, getLanguage()) });
function refreshDexBtn() { $('dex-btn').querySelector('span').textContent = `${L(DEX_TEXT.title)} · ${foodDex.kinds}/${allFoods(storeData).length}`; }
$('dex-btn').onclick = () => { $('notes-panel').hidden = true; dexUi.show(); };
refreshDexBtn();
onLanguageChange(refreshDexBtn);
// Amusement park rides: pay a ticket, get carried round, hop off at the end.
let ride = null; // { kind, seat, t0, until, back: [x, z] }
const RIDE_ICON = { carousel: '🎠', wheel: '🎡', viking: '🏴‍☠️', drop: '🗼' };
function boardRide(st) {
  if (!wallet.spend(RIDE_COST, { k: 'ledger.ride' })) { shop.toast(t('ride.noCoins', { n: RIDE_COST })); return; }
  const now = interior.time();
  ride = { kind: st.kind, seat: Math.floor(Math.random() * PARK_RIDES[st.kind].seats), t0: now, until: rideUntil(st.kind, now), back: [st.x, st.z], shout: 0 };
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
  if (ride.shout <= 0) { ride.shout = 5; showBubble(myLabel, $('labels'), ride.kind === 'viking' || ride.kind === 'drop' ? '😱 꺄아아!' : ride.kind === 'wheel' ? '😍' : '🎶', 2200); }
  if (now >= ride.until) endRide();
}
// Namsan Sky Cable: stand at a cabin bay, get in while the doors are open,
// ride up (or down) on the shared clock and step out at the other station.
// The way up costs CABLE.fare; the way down is on the same ticket, so
// nobody gets stuck on the summit without coins.
let cable = null; // { cabin, from: 'low' | 'top', dx }
const CABLE_TEXT = {
  board: { en: 'Get in · 🪙 {n} round trip', ko: '탑승 · 왕복 🪙 {n}', ja: '乗車 · 往復 🪙 {n}', zh: '上车 · 往返 🪙 {n}', es: 'Subir · ida y vuelta 🪙 {n}', id: 'Naik · pulang-pergi 🪙 {n}', ar: 'اركب · ذهاب وعودة 🪙 {n}', vi: 'Lên cabin · khứ hồi 🪙 {n}', hi: 'बैठें · आना-जाना 🪙 {n}' },
  down: { en: 'Ride down (your ticket covers it)', ko: '내려가기 (왕복권 포함)', ja: '下りに乗る（往復券に含まれます）', zh: '乘缆车下山（往返票已含）', es: 'Bajar (incluido en el billete)', id: 'Turun (sudah termasuk tiket)', ar: 'انزل (مشمول في التذكرة)', vi: 'Đi xuống (đã gồm trong vé)', hi: 'नीचे जाएँ (टिकट में शामिल)' },
  wait: { en: 'Next cabin in {n} s', ko: '다음 캐빈까지 {n}초', ja: '次のキャビンまで {n} 秒', zh: '下一班缆车 {n} 秒后到', es: 'Próxima cabina en {n} s', id: 'Kabin berikutnya {n} dtk lagi', ar: 'المقصورة التالية بعد {n} ث', vi: 'Cabin tiếp theo sau {n} giây', hi: 'अगला केबिन {n} सेकंड में' },
  leaves: { en: 'Get off (leaves in {n} s)', ko: '내리기 ({n}초 뒤 출발)', ja: '降りる（{n} 秒後に出発）', zh: '下车（{n} 秒后出发）', es: 'Bajar (sale en {n} s)', id: 'Turun (berangkat {n} dtk lagi)', ar: 'انزل (تنطلق بعد {n} ث)', vi: 'Xuống (khởi hành sau {n} giây)', hi: 'उतरें ({n} सेकंड में रवाना)' },
  toTop: { en: 'Going up to the summit · {n} s', ko: '정상으로 올라가는 중 · {n}초', ja: '山頂へ向かっています · {n} 秒', zh: '正在上山 · {n} 秒', es: 'Subiendo a la cima · {n} s', id: 'Naik ke puncak · {n} dtk', ar: 'صعودًا إلى القمة · {n} ث', vi: 'Đang lên đỉnh · {n} giây', hi: 'चोटी की ओर · {n} सेकंड' },
  toLow: { en: 'Going down to the lower station · {n} s', ko: '아래 승강장으로 내려가는 중 · {n}초', ja: '下の乗り場へ向かっています · {n} 秒', zh: '正在下山 · {n} 秒', es: 'Bajando a la estación · {n} s', id: 'Turun ke stasiun bawah · {n} dtk', ar: 'نزولًا إلى المحطة السفلى · {n} ث', vi: 'Đang xuống ga dưới · {n} giây', hi: 'नीचे स्टेशन की ओर · {n} सेकंड' },
  top: { en: 'Welcome to the top of Namsan! Walk round the tower and look out over Seoul.', ko: '남산 정상에 오신 걸 환영해요! 타워 주변을 걸으며 서울을 내려다보세요.', ja: '南山の山頂へようこそ！タワーの周りを歩いてソウルを見渡してみましょう。', zh: '欢迎来到南山山顶！绕着塔走一走，俯瞰首尔吧。', es: '¡Bienvenido a la cima de Namsan! Pasea alrededor de la torre y mira Seúl.', id: 'Selamat datang di puncak Namsan! Jalan-jalan di sekitar menara dan lihat Seoul.', ar: 'أهلًا بك في قمة نامسان! تجوّل حول البرج وشاهد سيول من الأعلى.', vi: 'Chào mừng lên đỉnh Namsan! Đi quanh tháp và ngắm Seoul nhé.', hi: 'नामसान की चोटी पर स्वागत है! टावर के चारों ओर घूमें और सियोल देखें।' },
  low: { en: 'Back at the lower station. The exit is behind you.', ko: '아래 승강장에 도착했어요. 출구는 뒤쪽이에요.', ja: '下の乗り場に着きました。出口は後ろです。', zh: '回到下站了，出口在身后。', es: 'De vuelta en la estación. La salida está detrás.', id: 'Kembali di stasiun bawah. Pintu keluar ada di belakang.', ar: 'عدت إلى المحطة السفلى. المخرج خلفك.', vi: 'Đã về ga dưới. Lối ra ở phía sau.', hi: 'नीचे स्टेशन पर वापस। निकास पीछे है।' },
};
const cableStation = (p) => (p.z < CC.edge ? 'top' : 'low');
function cableBay(p) {
  const st = cableStation(p);
  for (const i of [0, 1]) { const s = boardSpot(i, st); if (Math.hypot(p.x - s.x, p.z - s.z) < 1.8) return { i, st }; }
  return null;
}
function boardCable(i, st) {
  const c = cabinAt(i, cableClock());
  if (c.at !== st || !doorsOpen(c)) return;
  if (st === 'low' && !wallet.spend(CABLE.fare, { k: 'ledger.cable' })) { shop.toast(t('ride.noCoins', { n: CABLE.fare })); return; }
  cable = { cabin: i, from: st, dx: (Math.random() - 0.5) * 1.2 };
  cam.yaw = st === 'low' ? 0 : Math.PI; // look along the way, the view behind
  sendTimer = 0;
  if (st === 'low') missionEvent('ride');
}
function getOffCable(refund) {
  if (!cable) return;
  const s = boardSpot(cable.cabin, cable.from);
  if (refund && cable.from === 'low') wallet.add(CABLE.fare, { k: 'ledger.cable' });
  me.root.position.set(s.x, s.y, s.z);
  cable = null;
  sendTimer = 0;
}
function updateCable() {
  if (!cable) return;
  if (!interior?.cablecar) { cable = null; return; }
  const c = cabinAt(cable.cabin, cableClock());
  const to = cable.from === 'low' ? 'top' : 'low';
  if (c.at === to) { // arrived: step out onto the platform
    const s = boardSpot(cable.cabin, to);
    me.root.position.set(s.x, s.y, s.z);
    me.root.rotation.y = to === 'top' ? Math.PI : 0;
    cam.yaw = me.root.rotation.y + Math.PI;
    cable = null;
    sendTimer = 0;
    shop.toast(L(CABLE_TEXT[to]));
    if (to === 'top') me.play('cheer');
    return;
  }
  const s = cabinPos(cable.cabin, c.k);
  me.root.position.set(s.x + cable.dx, s.y + 0.02, s.z);
  me.root.rotation.y = cable.from === 'low' ? Math.PI : 0; // face uphill on the way up
}
function cableAction(p) {
  const now = cableClock();
  if (cable) {
    const c = cabinAt(cable.cabin, now);
    // (the countdown is in the key so the button text updates every second)
    if (c.at === cable.from && doorsOpen(c)) { const n = Math.ceil(c.leaves); return { key: 'cable-off:' + n, label: '🚪 ' + fmt(L(CABLE_TEXT.leaves), { n }), run: () => getOffCable(true) }; }
    const n = Math.ceil(c.next || c.leaves || 0);
    return { key: 'cable-ride:' + n, label: '🚡 ' + fmt(L(cable.from === 'low' ? CABLE_TEXT.toTop : CABLE_TEXT.toLow), { n }), run: () => {} };
  }
  const near = cableBay(p);
  if (!near) return null;
  // Either cabin will do: whichever reaches this station first (one comes
  // every half cycle), even if it stops at the bay next to you.
  const bay = [near.i, 1 - near.i].map((i) => ({ i, st: near.st, wait: arrivesIn(i, near.st, now) })).sort((a, b) => a.wait - b.wait)[0];
  const wait = bay.wait;
  if (wait > 0) { const n = Math.ceil(wait); return { key: 'cable-wait:' + n, label: '🚡 ' + fmt(L(CABLE_TEXT.wait), { n }), run: () => {} }; }
  return { key: 'cable-board:' + bay.st + bay.i, label: '🚡 ' + (bay.st === 'low' ? fmt(L(CABLE_TEXT.board), { n: CABLE.fare }) : L(CABLE_TEXT.down)), run: () => boardCable(bay.i, bay.st) };
}
const duckUi = new DuckUI({
  root: $('duck-panel'),
  hudRoot: $('duck-hud'),
  onStart: () => startDuckRide(),
  onLeave: () => standUp(),
});
// Riding a duck boat in Ttukseom park: 4 boats wait at the dock until
// someone gets in (two seats each). Not a game: whoever sets off steers the
// boat freely on the river for up to a minute (free), then it pedals itself
// back to the dock and they get off. A friend in the other seat rides along.
const DUCK_TEXT = {
  board: { en: 'Get in the duck boat', ko: '오리배 타기', ja: 'アヒルボートに乗る', zh: '坐鸭子船', es: 'Subir al bote pato', ar: 'اركب قارب البطة', vi: 'Lên thuyền vịt', hi: 'बत्तख नाव में बैठें', id: 'Naik perahu bebek' },
  go: { en: 'Duck boat ride', ko: '오리배 출발', ja: 'アヒルボートで出発', zh: '鸭子船出发', es: 'Paseo en bote pato', ar: 'جولة بقارب البطة', vi: 'Đi thuyền vịt', hi: 'बत्तख नाव की सवारी', id: 'Naik perahu bebek' },
  back: { en: 'Back to dock', ko: '선착장으로 돌아가기', ja: '乗り場に戻る', zh: '回码头', es: 'Volver al muelle', ar: 'العودة إلى الرصيف', vi: 'Quay về bến', hi: 'घाट पर लौटें', id: 'Kembali ke dermaga' },
  docked: { en: 'Back at the dock. Thanks for riding! 🦆', ko: '선착장에 도착했어요. 즐거웠죠? 🦆', ja: '乗り場に着きました。楽しかった？🦆', zh: '回到码头了，玩得开心吗？🦆', es: '¡De vuelta en el muelle! Gracias por pasear 🦆', ar: 'عدت إلى الرصيف. شكرًا على الجولة! 🦆', vi: 'Đã về bến. Cảm ơn bạn đã đi thuyền! 🦆', hi: 'घाट पर वापस। सवारी के लिए धन्यवाद! 🦆', id: 'Sudah kembali di dermaga. Terima kasih! 🦆' },
  full: { en: 'This boat is full', ko: '이 배는 자리가 다 찼어요', ja: 'このボートは満席です', zh: '这条船坐满了', es: 'Este bote está lleno', ar: 'هذا القارب ممتلئ', vi: 'Thuyền này đã đầy', hi: 'यह नाव भर गई है', id: 'Perahu ini penuh' },
  waiting: { en: 'Waiting at the dock · {n}/2 aboard', ko: '선착장에서 대기 중 · {n}/2명 탑승', ja: '乗り場で待機中 · {n}/2人', zh: '在码头等待 · {n}/2人', es: 'Esperando en el muelle · {n}/2 a bordo', ar: 'ينتظر عند الرصيف · {n}/2 على متنه', vi: 'Đang chờ ở bến · {n}/2 người trên thuyền', hi: 'घाट पर इंतज़ार · {n}/2 सवार', id: 'Menunggu di dermaga · {n}/2 naik' },
};
let duckRide = null; // my trip while I steer (core/duck-boat.js)
let duckFollowed = false; // I rode along with a friend steering
// Which boat each person is in (me and others), to place the boats.
function duckRiders(i) {
  let n = seated?.duck === i ? 1 : 0;
  for (const o of others.players.values()) if (o.target?.db === i + 1) n++;
  return n;
}
function boardDuck(i) {
  const d = interior.ducks[i];
  const taken = [...others.players.values()].filter((o) => o.target?.db === i + 1).map((o) => o.target.dbs | 0);
  const seat = taken.includes(0) ? 1 : 0;
  if (duckRiders(i) >= DUCK_SEATS.length) { shop.toast(L(DUCK_TEXT.full)); return; }
  duckRide = null; duckFollowed = false;
  sitDown({ x: d.home.x + DUCK_SEATS[seat][0], z: d.home.z + DUCK_SEATS[seat][1], ry: Math.PI, stand: [d.home.x, d.home.z + 2.6], duck: i, duckSeat: seat });
  shop.toast(fmt(L(DUCK_TEXT.waiting), { n: duckRiders(i) }));
}
// Someone else in my boat who is steering it (they send st.dr).
const duckDriver = () => {
  if (seated?.duck == null) return null;
  for (const [id, o] of others.players) if (o.target?.db === seated.duck + 1 && o.target.dr) return { id, o };
  return null;
};
function startDuckRide() {
  if (seated?.duck == null || duckDriver()) return;
  duckRide = new DuckRide(interior.ducks[seated.duck].home);
  cam.pitch = Math.min(cam.pitch, 0.3); cam.dist = Math.max(cam.dist, 8); // look out over the river
  action = STALE;
}
// A boat's pose from a rider's (seat in the boat's own space, turned with it).
function boatFromRider(rx, rz, rry, seat) {
  const ry = rry - Math.PI, [sx, sz] = DUCK_SEATS[seat] || DUCK_SEATS[0];
  return { x: rx - (sx * Math.cos(ry) + sz * Math.sin(ry)), z: rz - (-sx * Math.sin(ry) + sz * Math.cos(ry)), ry };
}
function placeBoat(d, b) {
  d.g.position.set(b.x, Math.sin(performance.now() / 500 + d.i) * 0.03, b.z);
  d.g.rotation.y = b.ry;
}
// Each frame in the park: steer my boat (or ride in a friend's), carry me
// with it, and put other people's boats where they sit.
// Boats bump into each other (core/bump.js). I only push my own boat; the
// other drivers push theirs on their screens, and everyone sees it through
// the usual position updates. The wobble, splash and boing play for all.
const duckContacts = new Contacts();
let duckRings = null; // little splash rings where two boats met
function duckSplash(x, z, big) {
  if (!duckRings || duckRings.scene !== interior.scene) {
    const geo = new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2);
    duckRings = { scene: interior.scene, list: [0, 1, 2].map(() => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
      m.visible = false; interior.scene.add(m); return m;
    }) };
  }
  const m = duckRings.list.find((r) => !r.visible) || duckRings.list[0];
  m.visible = true; m.position.set(x, -0.2, z);
  m.userData.t = 0; m.userData.size = 0.8 + big * 1.4;
}
// Where the other boats are this frame (not mine): moving if someone steers
// it, otherwise parked (it won't budge).
function otherBoats(mine) {
  const list = [];
  for (const d of interior.ducks) {
    if (d.i === mine) continue;
    let driven = false;
    for (const o of others.players.values()) if (o.target?.db === d.i + 1 && o.target.dr) { driven = true; break; }
    list.push({ x: d.g.position.x, z: d.g.position.z, vx: d.vx || 0, vz: d.vz || 0, fixed: !driven, i: d.i });
  }
  return list;
}
function updateDucks(dt) {
  if (!interior?.ducks) { if (duckRide) duckRide = null; duckUi.hud(null); return; }
  const moved = new Set();
  if (seated?.duck != null) {
    const d = interior.ducks[seated.duck];
    const drv = !duckRide && duckDriver();
    let b;
    if (duckRide) {
      // The stick, camera-relative like walking: the bow turns towards it.
      const { x: mx, y: my } = input.move;
      const fx = -Math.sin(moveRef.yaw), fz = -Math.cos(moveRef.yaw), rx = Math.cos(moveRef.yaw), rz = -Math.sin(moveRef.yaw);
      duckRide.steer(fx * my + rx * mx, fz * my + rz * mx, dt);
      duckRide.bump(otherBoats(seated.duck));
      b = duckRide;
      duckUi.hud({ left: duckRide.left, returning: duckRide.returning });
      if (duckRide.docked) { duckRide = null; standUp(); shop.toast(L(DUCK_TEXT.docked)); action = STALE; return; }
    } else if (drv) {
      const o = drv.o;
      b = boatFromRider(o.ch.root.position.x, o.ch.root.position.z, o.ch.root.rotation.y, o.target.dbs | 0);
      duckFollowed = true;
      duckUi.hud({ left: Math.max(0, o.target.dr - 1), returning: o.target.dr === 1, driver: others.nameOf(drv.id) || '?' });
    } else {
      if (duckFollowed) { duckFollowed = false; standUp(); shop.toast(L(DUCK_TEXT.docked)); action = STALE; return; } // the friend docked and got off
      b = { x: d.home.x, z: d.home.z, ry: 0 };
      duckUi.hud(null);
    }
    placeBoat(d, b);
    const [sx, sz] = DUCK_SEATS[seated.duckSeat || 0];
    me.root.position.set(b.x + sx * Math.cos(b.ry) + sz * Math.sin(b.ry), 0, b.z - sx * Math.sin(b.ry) + sz * Math.cos(b.ry));
    me.root.rotation.y = b.ry + Math.PI;
    moved.add(seated.duck);
  } else duckUi.hud(null);
  for (const o of others.players.values()) {
    const i = (o.target?.db | 0) - 1;
    if (i < 0 || i >= interior.ducks.length || moved.has(i)) continue;
    const r = o.ch.root;
    placeBoat(interior.ducks[i], boatFromRider(r.position.x, r.position.z, r.rotation.y, o.target.dbs | 0));
    moved.add(i);
  }
  for (const d of interior.ducks) if (!moved.has(d.i)) { // empty: back at the dock, bobbing
    d.g.position.x += (d.home.x - d.g.position.x) * Math.min(1, dt * 2);
    d.g.position.z += (d.home.z - d.g.position.z) * Math.min(1, dt * 2);
    d.g.position.y = Math.sin(performance.now() / 600 + d.i) * 0.03;
    d.g.rotation.y += (0 - d.g.rotation.y) * Math.min(1, dt * 2);
  }
  // Every boat: how fast it is going, bumps (wobble, splash, boing), sway.
  const now = performance.now() / 1000;
  for (const d of interior.ducks) {
    const p = d.g.position;
    if (dt > 0 && d.px != null) {
      const k = Math.min(1, dt * 10); // smooth out jumpy network updates
      d.vx = (d.vx || 0) + ((p.x - d.px) / dt - (d.vx || 0)) * k;
      d.vz = (d.vz || 0) + ((p.z - d.pz) / dt - (d.vz || 0)) * k;
    }
    d.px = p.x; d.pz = p.z;
  }
  const poses = interior.ducks.map((d) => ({ x: d.g.position.x, z: d.g.position.z }));
  for (const [i, j] of duckContacts.update(touching(poses, DUCK_BUMP))) {
    const a = interior.ducks[i], c = interior.ducks[j];
    const hard = Math.min(1, Math.hypot((a.vx || 0) - (c.vx || 0), (a.vz || 0) - (c.vz || 0)) / DUCK_BUMP.maxKick);
    if (hard < 0.05 && !moved.has(i) && !moved.has(j)) continue; // two parked boats side by side
    a.bumpAt = c.bumpAt = now; a.bumpAmp = c.bumpAmp = 0.08 + hard * 0.16;
    const mx = (a.g.position.x + c.g.position.x) / 2, mz = (a.g.position.z + c.g.position.z) / 2;
    duckSplash(mx, mz, hard);
    const far = Math.hypot(me.root.position.x - mx, me.root.position.z - mz);
    sfx.bump?.(hard, Math.max(0, 1 - far / 30));
  }
  for (const d of interior.ducks) {
    const t = now - (d.bumpAt ?? -99);
    const sway = seated?.duck === d.i ? Math.sin(performance.now() / 700) * 0.04 : 0;
    d.g.rotation.z = sway + wobble(t, d.bumpAmp || 0);
    d.g.rotation.x = wobble(t - 0.05, (d.bumpAmp || 0) * 0.5, 9);
  }
  if (duckRings) for (const m of duckRings.list) if (m.visible) {
    m.userData.t += dt;
    const k = m.userData.t / 0.8;
    if (k >= 1) { m.visible = false; continue; }
    m.scale.setScalar(0.3 + k * m.userData.size);
    m.material.opacity = 0.8 * (1 - k);
  }
}

// Delivery run from the tteokbokki stall: ride to another shop in time.
let delivery = null; // { id, name, until }
function startDelivery() {
  if (delivery) { shop.toast(t('delivery.cancelHint')); return; }
  const from = interior?.front?.door || me.root.position;
  // Only shops reachable within a minute along the streets.
  const stores = storefronts.items.filter((i) => i.store.category !== 'home' && i.store.category !== 'park' && i.store.category !== 'station' && i.store.id !== interior?.store.id)
    .map((i) => ({ id: i.store.id, x: i.door.x, z: i.door.z, item: i }))
    .filter((s) => { const d = Math.hypot(s.x - from.x, s.z - from.z); return d > 30 && d <= MAX_ROAD; })
    .map((s) => {
      const poly = roadGraph.route(from.x, from.z, s.x, s.z);
      let road = 0;
      for (let k = 1; k < poly.length; k++) road += Math.hypot(poly[k][0] - poly[k - 1][0], poly[k][1] - poly[k - 1][1]);
      return { ...s, road };
    });
  const target = pickDelivery(stores, from);
  if (!target) return;
  if (!shifts.take()) { shop.toast(fmt(L(JOB_TEXT.noShifts), { all: SHIFTS_PER_DAY })); return; }
  const secs = timeFor(target.road);
  const name = localName(target.item.store.name, getLanguage());
  delivery = { id: target.id, name, until: performance.now() + secs * 1000, emoji: interior?.store?.jobEmoji || '🛵' };
  shop.toast(t('delivery.start', { name, s: secs }) + ' · ' + fmt(L(JOB_TEXT.shiftsLeft), { n: shifts.left(), all: SHIFTS_PER_DAY }));
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
  wallet.add(coins, { k: 'ledger.delivery' });
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
  $('delivery-chip').textContent = `🛵${delivery.emoji === '🛵' ? '' : delivery.emoji} ${delivery.name} · ${Math.ceil(left)}s`;
}
$('delivery-chip').onclick = () => { if (delivery) shop.toast(t('delivery.cancelHint')); };
// Beauty shops (core/beauty.js): sit in front of the big mirror (salon,
// lens shop, lip shop) or lie on a clinic bed, try options on, pay coins to
// keep them. A clinic sends you through surgery first.
const beautyUi = new BeautyUI({
  root: $('beauty-panel'),
  onPreview: (look) => setLook(beautyUi.kind === 'salon' ? { ...look, head: null } : look), // salon: hat off to see the hair
  onSave: (look, cost) => {
    if (cost && !wallet.spend(cost)) { shop.toast(t('pet.noCoins', { n: cost - wallet.coins })); return false; }
    if (cost && isClinic(beautyUi.kind) && interior?.stations?.surgery) { setLook(myLook); endBeautyCam(); startSurgery(look); return true; }
    if (cost && beautyUi.kind === 'salon' && seated?.mirrorZ != null && (look.hairStyle !== myLook.hairStyle || look.dye !== myLook.dye)) { setLook(myLook); startHaircut(look); return true; }
    keepLook(look);
    endBeautyCam();
    me.play('cheer');
    return true;
  },
  onCancel: () => { setLook(myLook); endBeautyCam(); },
});
// Beauty shops: mirror close-up, haircut, surgery (src/game/beauty.js).
const beauty = createBeauty({
  get me() { return me; }, get cam() { return cam; }, get camera() { return camera; }, get interior() { return interior; },
  get clerk() { return clerk; }, get shop() { return shop; }, get sfx() { return sfx; }, get beautyUi() { return beautyUi; },
  get seated() { return seated; }, set seated(v) { seated = v; },
  get myLook() { return myLook; }, set myLook(v) { myLook = v; },
  setLook, resendState: () => { lastSent = null; },
});
const { keepLook, openBeauty, endBeautyCam, startSurgery, updateSurgery, startHaircut, updateHaircut, finishHaircut } = beauty;
const nearFishing = (p) => interior?.fishing?.some((f) => Math.hypot(p.x - f.x, p.z - f.z) < 1.8);
let fishCam = null; // the camera before fishing, put back after
function openFishing() {
  me.root.rotation.y = Math.PI; // face the river (north)…
  // …with the camera low behind one shoulder, so the cast and the bobber
  // out on the water are in view above the panel.
  fishCam = { pitch: cam.pitch, dist: cam.dist };
  Object.assign(cam, { yaw: innerWidth < innerHeight ? -0.4 : -0.7, pitch: 0.3, dist: 6 });
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
// Settings: Google's own button links this guest; after "I already have an
// account" the same button signs in to that account instead.
let settingsGoogleMode = 'link';
let settingsGis = false;
const renderSettingsGoogle = () => cloud.renderGoogleButton($('google-link-gis'), () => settingsGoogleMode, { locale: gisLocale(), onError: googleFail })
  .then((ok) => { settingsGis = ok; $('google-link').hidden = ok; });
$('google-link').onclick = async () => googleFail(await cloud.linkGoogle());
$('google-signin').onclick = async () => {
  if (!confirm(t('cloud.signinConfirm'))) return;
  if (settingsGis) { settingsGoogleMode = 'signin'; shop.toast(t('cloud.tapGoogle')); return; }
  googleFail(await cloud.signInGoogle());
};
if (cloud.status === 'cloud' && cloud.guest) renderSettingsGoogle();
onLanguageChange(() => { if (settingsGis) renderSettingsGoogle(); });
cloud.onChange(refreshCloud);
refreshCloud();
// Add to Home Screen: settings row, guide sheet and a one-off nudge on phones.
initInstall({ $, t, onLanguageChange, isTouch: input.isTouch, cloud, toast: (m) => shop.toast(m) });
onLanguageChange(refreshCloud);
$('coin-btn').onclick = () => { $('wallet-panel').hidden = false; refreshWallet(); refreshItems(); };
const WEARING = { en: 'Wearing', ko: '착용 중', ja: '着用中', zh: '穿着中', es: 'Puesto', ar: 'ترتديه', vi: 'Đang mặc', hi: 'पहना हुआ', id: 'Dipakai' };
// Clothes live in the bag's Wardrobe tab; everything else (pets, ...) in the
// bag's collection.
const isClothes = (id) => !!(ITEMS[id]?.wear || ITEMS[id]?.tee);
function refreshItems() {
  const list = inventory.list();
  const own = list.filter((id) => !isClothes(id));
  itemEl('wallet-items-title').hidden = !own.length;
  itemEl('wallet-items').replaceChildren(...own.map(itemRow));
  itemEl('wardrobe-items').replaceChildren(...list.filter(isClothes).map(itemRow));
}
function itemRow(id) {
  {
    const row = document.createElement('div');
    row.className = 'item-row';
    const it = ITEMS[id];
    const b = document.createElement('strong');
    const own = it.pet && customPetName(id);
    // "Shiba · Kongtteok" → "Shiba · <your name>"
    b.textContent = `${it.emoji} ${own ? localName(it.name, getLanguage()).split(' · ')[0] + ' · ' + own : localName(it.name, getLanguage())}`;
    const d = document.createElement('small');
    d.textContent = localName(it.desc, getLanguage());
    row.append(b, d);
    if (it.pet) { // walk this pet, or leave it at home
      const walking = petCare.pet?.id === id;
      const w = document.createElement('button');
      w.className = 'chip item-walk' + (walking ? ' on' : '');
      w.textContent = walking ? '🏠 ' + t('pet.home') : '🐾 ' + t('pet.walk');
      w.onclick = () => setPet(walking ? null : id);
      const nb = document.createElement('button');
      nb.className = 'chip item-walk';
      nb.textContent = '✏️ ' + L(PET_NAME_TEXT.rename);
      nb.onclick = () => {
        const form = document.createElement('form');
        form.className = 'pet-name-form';
        const inp = document.createElement('input');
        inp.maxLength = PET_NAME_MAX;
        inp.placeholder = L(PET_NAME_TEXT.placeholder);
        inp.value = customPetName(id) || it.pet.name;
        inp.addEventListener('keydown', (e) => e.stopPropagation()); // don't walk while typing
        const ok = document.createElement('button');
        ok.className = 'chip';
        ok.textContent = L(PET_NAME_TEXT.save);
        form.append(inp, ok);
        form.onsubmit = (e) => {
          e.preventDefault();
          const n = setPetName(id, inp.value);
          shop.toast(fmt(L(PET_NAME_TEXT.named), { name: n || it.pet.name }));
          refreshItems();
        };
        nb.replaceWith(form);
        inp.focus();
        inp.select();
      };
      const btns = document.createElement('div');
      btns.className = 'item-btns';
      btns.append(w, nb);
      row.append(btns);
    }
    if (it.wear) { // put it on, or take it off (trousers can only be swapped)
      const on = isWorn(it, myLook);
      const w = document.createElement('button');
      w.className = 'chip item-walk' + (on ? ' on' : '');
      w.textContent = on ? (it.off ? '👕 ' + t('tee.off') : '✅ ' + L(WEARING)) : '✨ ' + t('tee.wear');
      w.disabled = on && !it.off;
      w.onclick = () => { outfitAction(id); refreshItems(); };
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
  }
}
// Bring back the pet I was walking last time.
petCare.restorePet();
$('wallet-close').onclick = () => { $('wallet-panel').hidden = true; };
// Notebook: the place stamps, food book and fish book live behind their own
// HUD button so people find them (they used to hide inside the wallet).
$('notes-btn').onclick = () => { const p = $('notes-panel'); p.hidden = !p.hidden; if (!p.hidden) $('wallet-panel').hidden = true; };
$('notes-close').onclick = () => { $('notes-panel').hidden = true; };
// Budget book (가계부): today's totals and the latest coins in and out.
function ledgerLabel(e) {
  const lang = getLanguage(), n = e.note || {};
  const parts = [n.k && t(n.k, n.v), n.name && localName(n.name, lang), n.at && localName(n.at, lang)].filter(Boolean);
  return parts.length ? parts.join(' · ') : t(e.n > 0 ? 'ledger.in' : 'ledger.out');
}
function renderLedger() {
  const lang = getLanguage();
  const day = wallet.dayTotals();
  $('ledger-today').textContent = t('ledger.today', { in: day.in.toLocaleString(), out: day.out.toLocaleString() });
  const when = (ms) => {
    const d = new Date(ms), now = new Date();
    const time = d.toLocaleTimeString(lang === 'zht' ? 'zh-Hant' : lang, { hour: 'numeric', minute: '2-digit' });
    return d.toDateString() === now.toDateString() ? time : d.toLocaleDateString(lang === 'zht' ? 'zh-Hant' : lang, { month: 'short', day: 'numeric' }) + ' ' + time;
  };
  const rows = wallet.log.slice().reverse().map((e) => {
    const row = document.createElement('div');
    row.className = 'ledger-row';
    const what = document.createElement('span');
    what.className = 'ledger-what';
    const label = document.createElement('strong');
    label.textContent = ledgerLabel(e);
    const at = document.createElement('small');
    at.textContent = when(e.t);
    what.append(label, at);
    const amt = document.createElement('span');
    amt.className = 'ledger-amt ' + (e.n > 0 ? 'in' : 'out');
    amt.textContent = (e.n > 0 ? '+' : '−') + Math.abs(e.n).toLocaleString();
    const bal = document.createElement('small');
    bal.className = 'ledger-bal';
    bal.textContent = '🪙 ' + Number(e.bal ?? 0).toLocaleString();
    amt.append(bal);
    row.append(what, amt);
    return row;
  });
  if (!rows.length) {
    const p = document.createElement('p');
    p.className = 'fine';
    p.textContent = t('ledger.empty');
    rows.push(p);
  }
  $('ledger-list').replaceChildren(...rows);
}
$('ledger-btn').onclick = () => { $('wallet-panel').hidden = true; renderLedger(); $('ledger-panel').hidden = false; };
$('ledger-close').onclick = () => { $('ledger-panel').hidden = true; };
wallet.onChange(() => { if (!$('ledger-panel').hidden) renderLedger(); });
onLanguageChange(() => { if (!$('ledger-panel').hidden) renderLedger(); });
// Travel money, once: enough to explore without working part-time first,
// with a word to spend it wisely. Players from before it get it too.
{
  const gift = wallet.welcome();
  if (gift) {
    refreshWallet();
    $('welcome-coins').textContent = gift.toLocaleString();
    const body = () => { $('welcome-body').textContent = t('welcome.body', { n: gift.toLocaleString() }); };
    body();
    onLanguageChange(body);
    $('welcome-panel').hidden = false;
    $('welcome-close').onclick = () => { $('welcome-panel').hidden = true; };
  }
}
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
function questCtx() { return { held: held?.kind || null, pet: !!petCare.pet }; }
function questText(q) {
  const store = q.target ? storefronts.items.find((i) => i.store.id === q.target)?.store : null;
  const st = q.starter != null && STARTER[q.starter];
  if (st && STARTER_TEXT[st.tip]) return fmt(L(STARTER_TEXT[st.tip].text), { store: store ? localName(store.name, getLanguage()) : '' });
  return t('quest.' + q.kind, { store: store ? localName(store.name, getLanguage()) : '', n: q.n, need: q.need });
}
// Where an errand happens (for the 🧭 button next to the chip): its shop,
// or the square guide once it is done. Null: no one place (talk, taxi).
function questPlace(q, ready) {
  if (ready || q.kind === 'dance' || q.kind === 'highfive') return squareNpc ? { kind: 'npc-guide', id: 'square-guide', x: squareNpc.ch.root.position.x, z: squareNpc.ch.root.position.z, label: t('quest.guide') } : null;
  const target = q.target || (q.kind === 'coffee' ? 'meta-coffee' : null);
  const it = target && storefronts.get(target);
  return it ? { kind: 'store', id: it.store.id, x: it.door.x, z: it.door.z, label: localName(it.store.name, getLanguage()) } : null;
}
function refreshQuestChip() {
  const q = quests.active;
  $('quest-bar').hidden = !q;
  if (!q) return;
  const ready = quests.ready(questCtx());
  const place = questPlace(q, ready);
  $('quest-go').hidden = !place;
  $('quest-go').textContent = '🧭 ' + t('mission.go');
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
    wallet.add(coins + crowd, { k: 'ledger.quest' });
    me.play('cheer');
    say(squareNpc, $('labels'), ['고마워요! 수고했어요!', 'gomawoyo! sugohaesseoyo!', t('quest.thanks')]);
    shop.toast(t('quest.done', { coins: coins + crowd, left: quests.left }) + (crowd ? ' ' + t('quest.crowd', { n: crowd }) : ''));
    missionEvent('square');
  } else if (q) {
    say(squareNpc, $('labels'), ['부탁해요!', 'butakhaeyo!', questText(q)]);
    shop.toast(questText(q));
    // On the first path, say the tip again too (it is easy to miss the first time).
    const tip = q.starter != null && STARTER_TEXT[STARTER[q.starter]?.tip]?.tip;
    if (tip) setTimeout(() => { if (mode === 'street') showBubble(squareNpc, $('labels'), '💡 ' + L(tip), 9000, 'chat npc-say'); }, 3000);
  } else if (quests.left) {
    const a = quests.start({
      stores: storefronts.items.filter((i) => i.store.category !== 'home').map((i) => i.store.id),
      has: (kind) => (kind !== 'pet' || Object.keys(ITEMS).some((id) => ITEMS[id].pet && inventory.has(id))) // only if you have a pet
    });
    say(squareNpc, $('labels'), ['부탁 하나 들어줄래요?', 'butak hana deureojullaeyo?', questText(a)]);
    shop.toast(t('quest.new', { coins: a.starter != null ? STARTER_REWARD : QUEST_REWARD }));
    // On the first path the guide also gives a tip for this errand.
    const tip = a.starter != null && STARTER_TEXT[STARTER[a.starter].tip]?.tip;
    if (tip) setTimeout(() => { if (mode === 'street') showBubble(squareNpc, $('labels'), '💡 ' + L(tip), 9000, 'chat npc-say'); }, 5200);
  } else {
    say(squareNpc, $('labels'), ['오늘은 끝! 내일 또 와요!', 'oneureun kkeut! naeil tto wayo!', t('quest.tomorrow')]);
  }
  refreshQuestChip();
}
$('quest-go').onclick = () => {
  const q = quests.active;
  const place = q && questPlace(q, quests.ready(questCtx()));
  if (!place) return;
  if (interior) leaveStore();
  setGuide(place);
};
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
  wallet.add(TOGETHER_COINS[kind], { k: 'ledger.together' });
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
  if (coins) wallet.add(coins, { k: 'ledger.together' });
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
if (daily.hasNews() && onboard >= 2) setTimeout(() => { renderDaily(); $('daily-panel').hidden = false; }, 1200); // not in a new player's first minute
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
  for (const s of (mode === 'street' ? streetSeats : interior?.seats) || []) {
    const d = Math.hypot(p.x - s.x, p.z - s.z);
    if (d < bd && !others.seatTaken?.(s.x, s.z)) { bd = d; best = s; }
  }
  return best;
}
function sitDown(seat) {
  seated = seat;
  me.root.position.set(seat.x, seat.y || 0, seat.z); // (y: low on the edge of a stream)
  me.root.rotation.y = seat.ry;
  cam.yaw = seat.ry + Math.PI;
  sendTimer = 0; // tell others right away
  missionEvent('sit');
  if (seat.academy) academyUi.show();
  if (seat.sauna) saunaUi.show(seat.sauna); // the kiln or ice room bench
}
function standUp() {
  if (!seated) return;
  finishHaircut(); // walking off mid-cut: the new style is already paid for
  me.root.position.set(seated.stand[0], seated.standY || 0, seated.stand[1]);
  if (seated.sauna && saunaUi.open) saunaUi.close();
  if (seated.beauty && beautyUi.open) beautyUi.close();
  if (seated.duck != null) { if (duckUi.open) duckUi.close(); duckUi.hud(null); duckRide = null; duckFollowed = false; }
  if (seated.tarot && tarotUi.open) tarotUi.close(); // (a friend reading with us is told)
  seated = null;
  sendTimer = 0;
}

const nearReader = (p) => [clerk, ...(interior?.readerNpcs || [])].find((r) => r && Math.hypot(p.x - r.ch.root.position.x, p.z - r.ch.root.position.z) < 1.9);
const nearStation = (p, kind, r = 1.8) => interior?.stations?.[kind]?.some((st) => Math.hypot(p.x - st.x, p.z - st.z) < r);
const hi5Target = (p) => !riding && !seated && others.nearestFree(p.x, p.z, 2);
function hi5Action(o) {
  const asked = hi5.waiting(o.id);
  return { key: 'hi5:' + o.id + asked, label: '🙌 ' + t(asked ? 'hi5.accept' : 'hi5.ask', { name: o.name }), run: () => pressHi5(o) };
}
// Street actions that can be next to each other (a shop door with people at
// it, the guide among a crowd): built in one place so the chooser can list
// them all, not only the one the button shows first.
const storeAct = (it) => ({ key: 'enter:' + it.store.id, label: '🚪 ' + t('shop.enter', { name: localName(it.store.name, getLanguage()) }), run: () => enterStore(it) });
const boardAt = (p) => noticeBoards.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 1.8);
const boardAct = (b) => (b.board === 'news'
  ? { key: 'board:news', label: '📢 ' + t('news.title'), run: () => openNews() }
  : { key: 'board:' + b.board, label: (b.board === 'ask' ? '📮 ' : '📋 ') + L(BOARD_TEXT[b.board]), run: () => boardUi.show(b.board) });
const stampAct = (it) => (stampBook.has(it.stamp.id)
  ? { key: 'stamp-note:' + it.stamp.id, label: '🔖 ' + L(STAMP_TEXT.open), run: () => pressStamp(it) }
  : { key: 'stamp:' + it.stamp.id, label: '🔖 ' + L(STAMP_TEXT.stamp) + ' · ' + L(it.stamp.name), run: () => pressStamp(it) });
const npcAct = (n, p) => ({ key: 'npc:' + n.name, label: '👋 ' + t('npc.hi', { name: n.name }), run: () => { npcs.greet(n, p.x, p.z); missionEvent('talk', n.name); } });
// Yozi's ice cream sculptures in Seoul Forest (core/park-art.js).
const sculptureAct = (l) => ({ key: 'icecream:' + l.x + ',' + l.z, label: '🍦 ' + L(ICECREAM_TEXT.look), run: () => { me.play?.('wave'); shop.toast(fmt(L(ICECREAM_TEXT.about), { name: L(ICECREAM[l.model]) })); } });
const buskerAct = (s) => ({ key: 'busker', label: '👋 ' + L(BUSK_TEXT.hi), run: () => busking.greet(s) });
// The square guide: the first high five, today's errand, or a chat.
function guideAct(p) {
  if (!squareNpc) return null;
  const d = Math.hypot(p.x - squareNpc.ch.root.position.x, p.z - squareNpc.ch.root.position.z);
  if (onboard === 0 && d < 3.2) return { key: 'onboard-hi5', label: '🙌 ' + L(ONBOARD_TEXT.button), run: () => onboardHi5() };
  if (d >= 2.6) return null;
  const q = quests.active;
  if (q?.kind === 'highfive' && !quests.ready(questCtx())) { // today's first errand: high five the guide
    return { key: 'quest-hi5', label: '🙌 ' + L(ONBOARD_TEXT.button), run: () => {
      me.play('wave'); squareNpc.ch.wave(); showBubble(myLabel, $('labels'), '🙌'); sfx.pop?.();
      missionEvent('highfive');
      setTimeout(() => talkToGuide(), 700); // report straight away
    } };
  }
  const label = q ? (quests.ready(questCtx()) ? '🎁 ' + t('quest.report') : '📜 ' + t('quest.check')) : quests.left ? '❗ ' + t('quest.take') : '👋 ' + t('npc.hi', { name: t('quest.guide') });
  return { key: 'quest:' + (q?.kind || '') + quests.left + (q && quests.ready(questCtx())), label, run: () => talkToGuide() };
}
const MAX_CHOICES = 6;
// Everything else close enough to do right now, besides what the button shows
// first: every player for a high five, the shop door, the guide, products on
// the shelf, a pet, a seat. Left out while riding, sitting or busy.
function moreActions(p, door) {
  const out = [];
  const hi5s = () => { for (const o of others.nearbyFree(p.x, p.z, 2)) out.push(hi5Action(o)); };
  if (mode === 'street') {
    if (riding || busking.performing) return out;
    if (door) out.push(storeAct(door));
    hi5s();
    const g = guideAct(p); if (g) out.push(g);
    const b = boardAt(p); if (b) out.push(boardAct(b));
    const st = stampStands.nearest(p.x, p.z); if (st) out.push(stampAct(st));
    const bs = !seated && nearestSeat(p); if (bs) out.push(sitAct(bs));
    if (bs?.mat) out.push(matSitAct(bs));
    const pm = !seated && picnic.action(p); if (pm) out.push(pm);
    const ic = sculptureNear(map.landmarks, p.x, p.z); if (ic) out.push(sculptureAct(ic));
    if (muralSpot(p)) out.push(muralAct());
    if (wishSpot(p)) out.push(wishAct());
    const bk = busking.nearBusker(p.x, p.z); if (bk) out.push(buskerAct(bk));
    const n = npcs.nearest(p.x, p.z); if (n) out.push(npcAct(n, p));
    return out;
  }
  if (!interior || seated || beauty.surgery || ride || decor?.editing) return out;
  hi5s();
  if (interior.cablecar && !cable && nearLoveLock(p.x, p.z)) out.push(...loveLockActs());
  for (const pet of (interior.pets?.list || []).filter((q) => Math.hypot(p.x - q.root.position.x, p.z - q.root.position.z) < 1.6 + interior.pets.radius)) { out.push(petAct(pet, p)); if (pet.adopt && !inventory.has(pet.adopt)) out.push(adoptAct(pet)); }
  const seat = nearestSeat(p);
  if (seat) out.push(sitAct(seat));
  if (seat?.mat) out.push(matSitAct(seat));
  const pm = picnic.action(p); if (pm) out.push(pm);
  const near = (interior.products || []).map((pr) => ({ pr, d: Math.hypot(p.x - pr.pos.x, p.z - pr.pos.z) })).filter((o) => o.d < 1.9).sort((a, b) => a.d - b.d);
  for (const { pr } of near.slice(0, 3)) out.push(lookAct(pr));
  return out;
}
// Animal cafés: puppies and kittens waiting for a family roam with the
// café's own animals (not on display tables), and you can adopt them.
// store.adopt: [{ pet: item id, desc }]; pets you already have are not there.
function adoptables(store) {
  return (store.adopt || []).filter((a) => ITEMS[a.pet]?.pet && !inventory.has(a.pet))
    .map((a) => ({ ...ITEMS[a.pet].pet, adopt: a.pet, desc: a.desc }));
}
const ADOPT_TEXT = {
  meet: { en: 'Meet {name} · adopt', ko: '{name} 만나기 · 분양', ja: '{name}に会う · 迎える', zh: '认识{name} · 领养' },
  desc: { en: '{desc}\nWaiting for a family. The adoption fee helps the café care for the animals.', ko: '{desc}\n가족을 기다리고 있어요. 분양비는 카페 동물들을 돌보는 데 쓰여요.', ja: '{desc}\n家族を待っています。譲渡費はカフェの動物たちのお世話に使われます。', zh: '{desc}\n正在等待家人。领养费用于照顾咖啡馆里的动物。' },
};
const adoptAct = (pet) => ({ key: 'adopt:' + pet.adopt, label: '🏡 ' + fmt(L(ADOPT_TEXT.meet), { name: Pets.label(pet) }), run: () => {
  const it = ITEMS[pet.adopt];
  shop.openProduct({ id: 'adopt-' + pet.adopt, model: 'pet:' + pet.kind, color: pet.color, adopt: pet.adopt, price: 0, name: it.name,
    desc: { en: fmt(ADOPT_TEXT.desc.en, { desc: pet.desc?.en || '' }), ko: fmt(ADOPT_TEXT.desc.ko, { desc: pet.desc?.ko || pet.desc?.en || '' }), ja: fmt(ADOPT_TEXT.desc.ja, { desc: pet.desc?.en || '' }), zh: fmt(ADOPT_TEXT.desc.zh, { desc: pet.desc?.en || '' }) } });
} });
const petAct = (pet, p) => ({ key: 'pet:' + pet.name, label: '🐾 ' + t('pet.pat', { name: Pets.label(pet) }), run: () => { interior.pets.pet(pet, p.x, p.z); showBubble(myLabel, $('labels'), '😻'); missionEvent('pet'); } });
const sitAct = (seat) => (seat.mat
  ? { key: 'lie-mat', label: '🧺 ' + L(MAT_TEXT.lie), run: () => sitDown(seat) }
  : { key: 'sit', label: (seat.edge ? '🌊 ' : '🪑 ') + t('shop.sit'), run: () => sitDown(seat) }); // 🌊 the edge of a stream
// On a picnic mat you can also sit up, facing the foot of the mat.
const matSitAct = (seat) => ({ key: 'sit-mat', label: '🧺 ' + L(MAT_TEXT.sit), run: () => sitDown({ ...seat, lie: false }) });
const lookAct = (pr) => ({ key: 'look:' + pr.product.id, label: '👀 ' + t('shop.look', { name: localName(pr.product.name, getLanguage()) }), run: () => shop.openProduct(pr.product) });
function updateAction(p, tSec) {
  let next = null, door = null;
  if (mode === 'street') {
    const it = door = storefronts.nearby(p.x, p.z, tSec);
    const poop = !riding && nearestPoop(p);
    if (poop) next = { key: 'poop:' + poop.id, label: '🧻 ' + t('pet.clean'), run: () => cleanPoop(poop) };
    else if (it) next = storeAct(it);
    else if ((riding === 2 || isCar(riding) || riding === 5) && freeSeat() >= 0 && others.nearestFree(p.x, p.z, isCar(riding) ? 4.5 : 3)) {
      const o = others.nearestFree(p.x, p.z, isCar(riding) ? 4.5 : 3);
      const seat = freeSeat();
      next = { key: 'tandem-invite:' + o.id, label: (isCar(riding) ? '🚗 ' : riding === 5 ? '🏍️ ' : '🚲 ') + t('tandem.invite', { name: o.name }), run: () => { net.sendEmote(tandemMsg('invite', o.id, seat)); shop.toast(t('tandem.sent', { name: o.name })); } };
    } else if (riding === 1 && inSkate) next = { key: 'trick', label: '🤸 ' + L(SKATE_TEXT.trick), run: () => skater.tap() }; // (the bike button gets off)
    else if (riding) next = { key: 'bike-off', label: isCar(riding) ? '🚗 ' + t('car.off') : riding === 5 ? '🏍️ ' + t('bike.offShort') : '🚲 ' + t('bike.off'), run: () => setRiding(false) };
    else if (tandemInvite && performance.now() < tandemInvite.until && others.rootOf(tandemInvite.from) && others.rootOf(tandemInvite.from).position.distanceTo(p) < 6) {
      const inv = tandemInvite;
      next = { key: 'tandem-hop:' + inv.from, label: (isCar(others.kindOf(inv.from)) ? '🚗 ' : '🚲 ') + t('tandem.hopOn', { name: inv.name }), run: () => hopOn(inv) };
    }
    else if (bikeStations.nearby(p.x, p.z)) next = { key: 'bike-on', label: '🚲 ' + t('bike.on'), run: () => setRiding(true) };
    else if (hi5Target(p)) next = hi5Action(hi5Target(p));
    else if (!riding && boardAt(p)) next = boardAct(boardAt(p));
    else if (!riding && stampStands.nearest(p.x, p.z)) next = stampAct(stampStands.nearest(p.x, p.z));
    else if (seated?.street) next = { key: 'stand', label: '🧍 ' + t('shop.stand'), run: () => standUp() }; // a park bench
    else if (!riding && nearestSeat(p)) next = sitAct(nearestSeat(p));
    else if (!riding && picnic.action(p)) next = picnic.action(p); // a picnic mat on the park lawn
    else if (!riding && sculptureNear(map.landmarks, p.x, p.z)) next = sculptureAct(sculptureNear(map.landmarks, p.x, p.z));
    else if (!riding && muralSpot(p)) next = muralAct();
    else if (!riding && wishSpot(p)) next = wishAct();
    else if (guideAct(p)) next = guideAct(p);
    else if (!riding && inSkate && !seated) next = { key: 'skate-ride', label: `${VEHICLE_ICON[garage.current.type]} ${L(SKATE_TEXT.ride)}`, run: () => setRiding(1) };
    else if (busking.performing) {
      next = { key: 'busk-stop', label: '🛑 ' + L(BUSK_TEXT.stop), run: () => stopBusking() };
    } else if (!riding && busking.stageAt(p.x, p.z)) {
      const s = busking.stageAt(p.x, p.z);
      next = { key: 'busk', label: '🎤 ' + L(BUSK_TEXT.start), run: () => startBusking(s) };
    } else if (busking.nearBusker(p.x, p.z)) {
      next = buskerAct(busking.nearBusker(p.x, p.z));
    } else if (palaceShow?.nearGuard(p.x, p.z)) {
      const g = palaceShow.nearGuard(p.x, p.z);
      next = { key: 'guard:' + g.home.x, label: '👋 ' + t('npc.hi', { name: '수문장' }), run: () => palaceShow.greet(g, p.x, p.z) };
    } else {
      const n = npcs.nearest(p.x, p.z);
      if (n) next = npcAct(n, p);
    }
  } else {
    const ex = interior.exit;
    const seat = !seated && nearestSeat(p);
    const tarotNext = interior.store?.workshop === 'tarot' && !seated?.tarot ? tarotAction(p, seat) : null;
    if (beauty.surgery) {
      next = null;
    } else if (interior.subway && !seated && p.x > GATE_X + 0.5 && Math.abs(p.z) > DOOR_Z - 2.6 && interior.subway.doorsOpen(p.z >= 0 ? 0 : 1) && stationStores.length > 1) {
      const t = p.z >= 0 ? 0 : 1, to = stationStores[stationIndex()].towards?.[t === 0 ? 'up' : 'down'];
      next = { key: 'metro-board:' + t, label: `🚇 ${L(METRO_TEXT.board)} · ${L(t === 0 ? METRO_TEXT.up : METRO_TEXT.down)} → ${to ? localName(to, getLanguage()) : ''}`, run: () => boardTrain(t, interior.subway.doorsOpen(t) || 0.5) };
    } else if (interior.subway && !seated && interior.subway.vending?.some((v) => Math.hypot(p.x - v.x, p.z - v.z) < 1.3)) {
      next = { key: 'vending', label: '🥤 ' + L(VENDING_TEXT.open), run: openVending };
    } else if (interior.subway && !seated && gateAt(p.x, p.z)) {
      const g = gateAt(p.x, p.z);
      next = g.inside
        ? { key: 'gate-out', label: '🚪 ' + L(GATE_TEXT.out), run: () => passGate(g, false) }
        : { key: 'gate-in', label: `🎫 ${L(GATE_TEXT.in)} · 🪙 ${FARE}`, run: () => passGate(g, true) };
    } else if (!interior.noExit && interior.front?.parkFront && Math.hypot(p.x - ex.x, p.z - ex.z) < 1.6) {
      next = { key: 'haunt-out', label: '🚪 ' + L(HAUNT_TEXT.back), run: () => backToPark() };
    } else if (!interior.noExit && Math.hypot(p.x - ex.x, p.z - ex.z) < 1.6) {
      next = { key: 'exit', label: '🚪 ' + t(interior.store.category === 'home' ? 'home.leave' : 'shop.leave'), run: () => leaveStore() };
    } else if (!seated && nearPeerMeal(p)) {
      const pm = nearPeerMeal(p);
      next = { key: 'bite:' + pm.owner, label: '😋 ' + fmt(L(DINE_TEXT.share), { name: others.nameOf(pm.owner) || '?' }), run: () => stealBite(pm) };
    } else if (decor?.editing) {
      // decorate mode: walk up to a piece to rotate, move or remove it
      const it = nearestPiece(p);
      if (decor.carry) next = { key: 'put-down', label: '📍 ' + t('home.putDown'), run: () => { putDown(); closePiece(); } };
      else if (it) next = { key: 'piece:' + decor.items.indexOf(it), label: '✋ ' + localName(furnitureById(it.id).name, getLanguage()), run: () => openPiece(it) };
      else if (!decor.picked) closePiece();
    } else if (interior.cablecar && cableAction(p)) {
      next = cableAction(p);
    } else if (!seated && stampStands.nearest(p.x, p.z, interior.store.id)) {
      next = stampAct(stampStands.nearest(p.x, p.z, interior.store.id));
    } else if (interior.cablecar && nearLoveLock(p.x, p.z)) {
      next = loveLockActs()[0]; // and "read the messages" (moreActions)
    } else if (ride) {
      next = { key: 'ride-off', label: '🚪 ' + t('ride.off'), run: () => endRide() };
    } else if (interior.park && nearStation(p, 'hauntedHouse', 1.8)) {
      next = { key: 'haunt-in', label: '👻 ' + L(HAUNT_TEXT.enter), run: () => enterHaunted() };
    } else if (interior.rides?.find((st) => Math.hypot(p.x - st.x, p.z - st.z) < 2.2)) {
      const st = interior.rides.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 2.2);
      next = { key: 'ride:' + st.kind, label: `${RIDE_ICON[st.kind]} ${t('ride.' + st.kind)} · 🪙 ${RIDE_COST}`, run: () => boardRide(st) };
    } else if (seated?.surgery) {
      next = null; // lie still: the team is at work
    } else if (seated?.beauty) {
      const kind = seated.beauty;
      next = { key: 'beauty:' + kind, label: BEAUTY_ICON[kind] + ' ' + t(kind + '.open'), run: () => openBeauty(kind) };
    } else if (seated?.sauna) {
      next = { key: 'sauna:' + seated.sauna, label: (seated.sauna === 'hot' ? '🔥 ' : '🧊 ') + t(seated.sauna === 'hot' ? 'sauna.hot' : 'sauna.ice'), run: () => saunaUi.show(seated.sauna) };
    } else if (seated && isDining(interior.store)) {
      next = dineAction();
    } else if (seated?.duck != null) { // in a duck boat: set off (or get off) from the sheet; out on the water, head back
      if (duckRide && !duckRide.returning) next = { key: 'duck-back', label: '⚓ ' + L(DUCK_TEXT.back), run: () => { duckRide?.goBack(); action = STALE; } };
      else if (duckRide || duckFollowed) next = null;
      else next = { key: 'duck-go', label: '🚣 ' + L(DUCK_TEXT.go), run: () => { const drv = duckDriver(); duckUi.show(drv ? others.nameOf(drv.id) || '?' : null); } };
    } else if (seated?.tarot) {
      next = { key: 'tarot', label: '🔮 ' + L(TAROT_TEXT.open), run: () => { tarotReader()?.ch.wave(); tarotUi.show(); } };
    } else if (tarotNext) {
      next = tarotNext;
    } else if (seated) {
      next = { key: 'stand', label: '🧍 ' + t('shop.stand'), run: () => standUp() };
    } else if (nearStation(p, 'karaoke')) {
      next = { key: 'karaoke', label: '🎤 ' + t('game.karaoke'), run: () => karaokeUi.show() };
    } else if (nearStation(p, 'photo', 2.2)) {
      const kind = interior.store.workshop;
      next = { key: 'photo', label: '📸 ' + t(kind === 'photo1' ? 'game.photo1' : kind === 'photobw' ? 'game.photobw' : 'game.photo'), run: () => photoUi.show(kind) };
    } else if (nearStation(p, 'academy', 1.8)) {
      next = { key: 'academy', label: '🏫 ' + L(ACADEMY_OPEN), run: () => academyUi.show() };
    } else if (interior.stations?.lift && Math.hypot(p.x - interior.stations.lift.x, p.z - interior.stations.lift.z) < 1.6) {
      next = { key: 'lift', label: '🛗 ' + L(MUSEUM_TEXT.lift), run: () => museumUi.showLift(floorOf(interior.store), goMuseumFloor) };
    } else if (nearestPainting(interior.stations?.paintings, p.x, p.z)) {
      const pt = nearestPainting(interior.stations.paintings, p.x, p.z).painting;
      next = { key: 'painting:' + pt.id, label: `🖼️ ${L(MUSEUM_TEXT.look)} · ${getLanguage() === 'ko' ? pt.title.ko : pt.title.en}`, run: () => museumUi.show(pt) };
    } else if (nearStation(p, 'books', 1.5)) {
      next = { key: 'books', label: '📚 ' + t('book.pick'), run: () => bookUi.showShelf() };
    } else if (interior.stations?.gym?.find((st) => Math.hypot(p.x - st.x, p.z - st.z) < 1.4)) {
      const st = interior.stations.gym.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 1.4);
      next = { key: 'gym:' + st.kind, label: '💪 ' + t('gym.' + st.kind), run: () => {
        if (st.bar) { me.root.position.set(st.x, 0, st.z); me.root.rotation.y = 0; cam.yaw = Math.PI * 0.8; } // hang under the bar
        gymUi.show(st.kind);
      } };
    } else if (trainer && Math.hypot(p.x - trainer.ch.root.position.x, p.z - trainer.ch.root.position.z) < 2.4) {
      next = { key: 'trainer', label: '💬 ' + t('gym.talk', { name: L(TRAINER_NAME) }), run: () => talkToTrainer() };
    } else if (interior.stations?.sauna?.find((st) => Math.hypot(p.x - st.x, p.z - st.z) < 2)) {
      const st = interior.stations.sauna.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 2);
      next = { key: 'sauna:' + st.kind, label: (st.kind === 'hot' ? '🔥 ' : '🧊 ') + t(st.kind === 'hot' ? 'sauna.hot' : 'sauna.ice'), run: () => saunaUi.show(st.kind) };
    } else if (nearStation(p, 'claw')) {
      next = { key: 'claw', label: '🧸 ' + t('game.claw'), run: () => clawUi.show() };
    } else if (nearStation(p, 'batting', 1.8)) {
      next = { key: 'batting', label: '⚾ ' + L(ARCADE_OPEN.batting), run: () => openArcade('batting') };
    } else if (nearStation(p, 'gallery', 2.2)) {
      next = { key: 'gallery', label: '🎯 ' + L(ARCADE_OPEN.gallery), run: () => openArcade('gallery') };
    } else if (nearStation(p, 'hauntGallery', 2)) {
      next = { key: 'hauntGallery', label: '🏮 ' + L(ARCADE_OPEN.hauntGallery), run: () => openArcade('hauntGallery') };
    } else if (nearStation(p, 'darts', 1.6)) {
      next = { key: 'darts', label: '🎯 ' + L(ARCADE_OPEN.darts) + (freshInvite() ? ' ⚔️' : ''), run: () => openArcade('darts') };
    } else if (interior.ducks && !seated && interior.ducks.find((d) => Math.hypot(p.x - d.home.x, p.z - (d.home.z + 2.2)) < 1.6)) {
      const d = interior.ducks.find((q) => Math.hypot(p.x - q.home.x, p.z - (q.home.z + 2.2)) < 1.6);
      next = { key: 'duck-board:' + d.i, label: '🦆 ' + L(DUCK_TEXT.board) + ` (${duckRiders(d.i)}/2)`, run: () => boardDuck(d.i) };
    } else if (orderAtCounter(p)) {
      const who = orderAtCounter(p);
      next = { key: 'counter', label: '🧾 ' + L(COUNTER_ORDER), run: () => { who.ch.wave(); counterUi.show(interior.store); } };
    } else if (interior.store.workshop === 'pocha' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'pocha', label: '🌶️ ' + t('game.pocha'), run: () => { clerk.ch.wave(); pochaUi.show(); } };
    } else if (interior.tv && Math.hypot(p.x - interior.tv.x, p.z - interior.tv.z) < 2.6) {
      next = interior.store.cinema
        ? { key: 'kpop', label: '🎬 ' + t('cinema.open'), run: () => kpop.open() }
        : { key: 'kpop', label: '📺 ' + t('kpop.open'), run: () => kpop.open() };
    } else if (nearFishing(p)) {
      next = { key: 'fish', label: '🎣 ' + t('fish.open'), run: () => openFishing() };
    } else if (nearStation(p, 'kimbap', 1.3)) {
      next = { key: 'kimbap', label: '🍙 ' + L(KIMBAP_TEXT.open), run: () => { clerk?.ch.wave(); kimbapUi.show(); } };
    } else if (nearStation(p, 'japchae', 1.3)) {
      next = { key: 'japchae', label: '🍝 ' + L(JAPCHAE_TEXT.open), run: () => { clerk?.ch.wave(); japchaeUi.show(); } };
    } else if (interior.store.workshop === 'japchae' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.4) {
      next = { key: 'japchae-hint', label: '💬 ' + L(JAPCHAE_TEXT.hint), run: () => { clerk.ch.wave(); shop.toast(L(JAPCHAE_TEXT.hint)); } };
    } else if (nearStation(p, 'kimchi', 1.3)) {
      next = { key: 'kimchi', label: '🥬 ' + L(KIMCHI_TEXT.open), run: () => { clerk?.ch.wave(); kimchiUi.show(); } };
    } else if (interior.store.workshop === 'kimchi' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.4) {
      next = { key: 'kimchi-hint', label: '💬 ' + L(KIMCHI_TEXT.hint), run: () => { clerk.ch.wave(); shop.toast(L(KIMCHI_TEXT.hint)); } };
    } else if (interior.fishBuy && Math.hypot(p.x - interior.fishBuy.x, p.z - interior.fishBuy.z) < 1.6) {
      next = { key: 'market', label: '🐟 ' + t('fish.sellOpen'), run: () => marketUi.show() }; // the park's fish buyer
    } else if (interior.ramen && Math.hypot(p.x - interior.ramen.x, p.z - interior.ramen.z) < 1.8) {
      next = { key: 'ramen', label: '🍜 ' + t('ramen.open'), run: () => ramenUi.show() };
    } else if (BEAUTY_SHOPS.includes(interior.store.workshop) && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      const hint = t(isClinic(interior.store.workshop) ? 'beauty.lie' : 'beauty.sit');
      next = { key: 'beauty-hint', label: '💬 ' + hint, run: () => { clerk.ch.wave(); shop.toast(hint); } };
    } else if (interior.store.workshop === 'kimchi-buy' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'kimchi-sell', label: '🫙 ' + MARKET_L('open'), run: () => { clerk.ch.wave(); say(clerk, $('labels'), BOSS_LINES.hello); kimchiSellUi.show(); } };
    } else if (interior.store.workshop === 'fishmarket' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'market', label: '🐟 ' + t('fish.sellOpen'), run: () => openMarket() };
    } else if (clubState && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 4.5) {
      next = { key: 'club', label: '🎧 ' + L(CLUB_TEXT.open), run: () => openClubPanel() };
    } else if (clubState && !seated) { // anywhere on the club floor: dance to the beat
      next = { key: 'dance:' + dancing, label: (dancing ? '🛑 ' : '💃 ') + L(dancing ? DANCE_TEXT.stop : DANCE_TEXT.start), run: () => { dancing = !dancing; if (dancing) missionEvent('dance'); action = STALE; } };
    } else if (interior.turntable && Math.hypot(p.x - interior.turntable.x, p.z - interior.turntable.z) < 2) {
      next = { key: 'lp', label: '💿 ' + t('lp.open'), run: () => openLpPanel() };
    } else if (interior.store.workshop === 'bike' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'bikeshop', label: '🚲 ' + L(BIKE_TEXT.open), run: () => { clerk.ch.wave(); openBikeShop(interior.store); } };
    } else if (interior.store.workshop === 'grill' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'grill', label: '🥓 ' + t('grill.open'), run: () => openGrill() };
    } else if (interior.store.workshop === 'order' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'order', label: '🍢 ' + t('order.start'), run: () => openOrder() };
    } else if (interior.store.workshop === 'emblem' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'emblem', label: '🏷️ ' + t('emblem.open'), run: () => { clerk.ch.wave(); emblemUi.show(); } };
    } else if (interior.store.workshop === 'info' && (clerk || areaGuide)) {
      // Two guides at the desk: whichever one you stand closer to.
      const dist = (o) => (o ? Math.hypot(p.x - o.ch.root.position.x, p.z - o.ch.root.position.z) : Infinity);
      const area = dist(areaGuide) < dist(clerk);
      const d = districtOfStore(interior.store);
      const name = L(AREA[d]?.name || { en: d });
      if (Math.min(dist(clerk), dist(areaGuide)) < 2.8) {
        next = area
          ? { key: 'info-area', label: '🗺️ ' + fmt(L(INFO_TEXT.askArea), { name }), run: () => { areaGuide.ch.wave(); infoUi.showArea(d); } }
          : { key: 'info-game', label: '🎮 ' + L(INFO_TEXT.askGame), run: () => { clerk.ch.wave(); infoUi.showGame(); } };
      }
    } else if (interior.store.workshop === 'tarot' && !seated && nearReader(p)) {
      const r = nearReader(p);
      next = { key: 'tarot-hint', label: '💬 ' + L(TAROT_TEXT.hint), run: () => { r.ch.wave(); say(r, $('labels'), TAROT_LINES[0]); shop.toast(L(TAROT_TEXT.hint)); } };
    } else if (interior.store.workshop === 'hat' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'hat', label: '🧢 ' + t('hat.make'), run: () => { clerk.ch.wave(); openHatWorkshop(); } };
    } else if (jobOf(interior.store) && interior.store.workshop !== 'pocha' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      const job = jobOf(interior.store);
      next = { key: 'job', label: '💼 ' + fmt(L(JOB_TEXT.work), { role: L(JOB_TEXT.role[job]) }), run: () => { clerk.ch.wave(); openJob(job); } };
    } else if (clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.2) {
      next = { key: 'clerk', label: '👋 ' + t('npc.hi', { name: clerk.name }), run: () => { clerk.ch.wave(); const lines = PHRASES[['library', 'school', 'museum', 'culture'].includes(interior?.store.category) ? interior.store.category : 'shop']; say(clerk, $('labels'), lines[Math.floor(Math.random() * lines.length)]); } };
    } else if (interior.pets?.nearest(p.x, p.z)) {
      next = petAct(interior.pets.nearest(p.x, p.z), p);
    } else if (hi5Target(p)) {
      next = hi5Action(hi5Target(p));
    } else if (picnic.action(p)) {
      next = picnic.action(p);
    } else if (seat) {
      next = sitAct(seat);
    } else {
      let best = null, bestD = 1.9;
      for (const pr of interior.products) {
        const d = Math.hypot(p.x - pr.pos.x, p.z - pr.pos.z);
        if (d < bestD) { bestD = d; best = pr; }
      }
      if (best) next = lookAct(best);
      else shop.closeProduct();
    }
  }
  // More than one thing in reach (a crowd to high five, the clerk and a
  // product, a shop door with people at it): the button shows the first and
  // a "+N", and a tap opens a list to pick from.
  if (next || mode === 'street' || interior) {
    const seen = new Set(), opts = [];
    for (const o of [next, ...moreActions(p, door)]) if (o && !seen.has(o.key) && opts.length < MAX_CHOICES) { seen.add(o.key); opts.push(o); }
    if (opts.length > 1) next = { key: 'pick:' + opts.map((o) => o.key).join('|'), label: opts[0].label, opts, run: () => toggleChooser() };
    else next = opts[0] || null;
  }
  if (next?.key !== action?.key) {
    action = next;
    $('action-btn').hidden = !action;
    if (action) setActionLabel(action.label, action.opts?.length);
    else shop.closeProduct();
    syncChooser();
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
  cam.yaw -= look.dx * 0.006;
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + look.dy * 0.004, beauty.beautyCam ? 0.05 : 0.12, 1.25);
  cam.dist = THREE.MathUtils.clamp(cam.dist + look.zoom, beauty.beautyCam ? 0.8 : 4, mode === 'store' ? 9 : 28);

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
  if (mode === 'store') interior?.tick?.(dt, me.root.position); // amusement park rides, the haunted house
  else landmarks.userData.tick(performance.now() / 1000); // Another Land's wheel, coaster and drop tower
  if (mode === 'street' && streams.length) { streamModels.userData.tick(performance.now() / 1000); updateWishes(); } // ripples, waterfall, lanterns
  updateRide(dt);
  updateCable();
  if (seated?.street && (mode !== 'street' || Math.hypot(p.x - seated.x, p.z - seated.z) > 1)) seated = null; // moved off the bench (a warp, a shop)
  if (seated && !seated.surgery && seated.duck == null && mag > 0.3) standUp(); // (get off a duck boat with its button)
  updateDucks(dt);
  updateSurgery(dt);
  updateHaircut(dt);
  if (dancing && (mag > 0.3 || !clubState)) { dancing = false; action = STALE; }
  if (busking.performing && (mag > 0.3 || mode !== 'street' || riding || !busking.stageAt(p.x, p.z))) stopBusking();
  me.activity(currentActivity());
  fishRig.update(dt, me);
  updatePeerRigs(dt);
  if (me.activityName === 'read' && !myLabel.bubble) showBubble(myLabel, $('labels'), t('book.reading'), 3000);
  if (autoWalk && mag > 0.05) setAutoWalk(false); // the player took over
  const steady = steadyWalk && !riding;
  const running = updateStamina(dt, input.run && !riding && !steadyWalk, mag > 0.05 && !seated);
  if (mag > 0.05 && !seated && !ride && !cable && riding !== 3) {
    walkedFor += dt;
    if (walkedFor > 0.8) dismissHelp();
    const inStore = mode === 'store';
    const walkPace = steady ? (inStore ? STORE_STEADY : STEADY) : (inStore ? STORE_WALK : WALK);
    const speed = (riding ? rideSpeed() : (running ? (inStore ? STORE_RUN : RUN) : walkPace) * gymLog.boost) * Math.min(1, mag) * wxSpeed();
    const fx = -Math.sin(moveRef.yaw), fz = -Math.cos(moveRef.yaw); // forward
    const rx = Math.cos(moveRef.yaw), rz = -Math.sin(moveRef.yaw); // right
    const dx = (fx * my + rx * mx) * speed * dt;
    const dz = (fz * my + rz * mx) * speed * dt;
    let [nx, nz] = activeCollision.move(p.x, p.z, dx, dz, PLAYER_R);
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
    const anim = steady ? Math.min(STEADY_ANIM, (speed / walkPace) * STEADY_ANIM) : Math.min(1, speed / (riding ? rideSpeed() : inStore ? STORE_RUN : RUN));
    speed01 = THREE.MathUtils.lerp(speed01, anim, Math.min(1, dt * 10));
  } else if (autoWalk && routePoly?.length > 1 && mode === 'street' && !seated && riding !== 3) {
    // Head for the route point about 2.5 m ahead (pure pursuit), on foot or by bike.
    const [tx, tz] = pointAhead(routePoly, p.x, p.z, 2.5);
    const ddx = tx - p.x, ddz = tz - p.z, dl = Math.hypot(ddx, ddz) || 1;
    const running = updateStamina(dt, input.run && !riding && !steadyWalk, true);
    const speed = (riding ? rideSpeed() : (running ? RUN : steady ? STEADY : WALK) * gymLog.boost) * wxSpeed();
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
    speed01 = THREE.MathUtils.lerp(speed01, steady ? STEADY_ANIM : speed / (riding ? rideSpeed() : RUN), Math.min(1, dt * 10));
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
      if ((byStream?.low ? streamCollision : collision).blocked(p.x + sy * d, p.z + cy0 * d, 0.3)) { horiz = Math.max(1.5, d - 0.6); break; }
    }
  } else if (interior?.camBlocked) { // outdoor rooms (the Namsan summit): stop short of the tower
    const sy = Math.sin(cam.yaw), cy0 = Math.cos(cam.yaw);
    for (let d = 1; d <= horiz; d += 0.5) {
      if (interior.camBlocked(p.x + sy * d, p.z + cy0 * d)) { horiz = Math.max(1.5, d - 0.6); break; }
    }
  }
  camHoriz += (horiz - camHoriz) * Math.min(1, dt * (horiz < camHoriz ? 20 : 4));
  const cx = p.x + Math.sin(cam.yaw) * camHoriz;
  const cz = p.z + Math.cos(cam.yaw) * camHoriz;
  // Lower the camera with the distance so a close camera doesn't look straight down.
  const cy = p.y + 1 + Math.sin(cam.pitch) * cam.dist * Math.min(1, camHoriz / (Math.cos(cam.pitch) * cam.dist));
  camera.position.lerp(tmp.set(cx, cy, cz), 1 - Math.exp(-dt * 12));
  if (beauty.beautyCam?.look) camera.lookAt(...beauty.beautyCam.look); // the mirror, or the face on the bed
  else camera.lookAt(p.x, p.y + (hatDraft || beauty.beautyCam ? 0.05 : 1.1), p.z); // workshop: character sits above the panel
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
  if (loveLockUi.open && !loveLockUi.busy && (!interior?.cablecar || Math.hypot(p.x - CC.loveLock.spot.x, p.z - CC.loveLock.spot.z) > 4.5)) loveLockUi.close();
  if (wishUi.open && (mode !== 'street' || !(wishUi.view === 'wish' ? wishSpot(p) : muralSpot(p)))) wishUi.close(); // walked away
  if (interior?.turntable && music.on) interior.turntable.platter.rotation.y -= dt * 3.5; // 33⅓ rpm
  if (mode === 'store' && interior?.animate) interior.animate(dt, clubPulse()); // club lights, candles, the subway train
  if (mode === 'store') interior?.dartPins?.update(); // old darts come out of the wall boards
  skateTick(dt, p);
  if (riding !== 3 && !seated) updateSubway(dt, p, px0, pz0);
  if (mode === 'store' && interior?.floorAt && !cable && !seated) p.y = interior.floorAt(p.x, p.z); // the summit plaza is up the hill
  updateMeal();
  picnic.tick(); // picnic mats on the park lawn
  if (mode === 'store') interior?.see?.(p.x, p.z, camera.position.x, camera.position.z); // walk-in rooms turn see-through
  if (mode === 'store' && interior?.store.workshop === 'tarot') tarotTick();
  updateAction(p, tSec);
  if (mapView.open) mapView.draw();

  streetTimer -= dt;
  if (streetTimer <= 0 && mode === 'street') {
    streetTimer = 0.4;
    const s = byStream?.low ? streams[byStream.i].name : nearestStreet(p.x, p.z); // down by the water: the stream's name
    if (s !== currentStreet) {
      currentStreet = s;
      updateStreetCard();
    }
  }

  const hk = ride ? null : honkKind(riding === 3 ? 0 : riding);
  if (hk !== shownHonk) {
    shownHonk = hk;
    $('honk-btn').hidden = !hk;
    if (hk) { $('honk-btn').textContent = hk === 'bell' ? '🔔' : '📯'; $('honk-btn').setAttribute('aria-label', L(HONK_TEXT[hk])); }
  }
  motionSound.update(dt, {
    walking: speed01 > 0.05 && !riding && !seated && !ride && !dancing,
    running: input.run && !stamina.tired && !steadyWalk,
    riding: ride ? 0 : riding,
    speed01,
    indoor: mode === 'store',
  });
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
    if (myTicket && interior?.store.workshop === 'tarot') st.tq = myTicket; // our place in the tarot café line
    if (Math.abs(p.y) > 0.05) st.y = Math.round(p.y * 100) / 100; // on subway stairs
    if (riding) st.bk = riding;
    if (riding === 1) st.bv = rideCode(garage.rideSpec()); // which ride and skin
    if (skateTk && performance.now() - skateTk.at < 1500) st.tk = skateTk.code; // a skate park trick: others play it too
    if (seated?.duck != null) { st.db = seated.duck + 1; st.dbs = seated.duckSeat || 0; } // in a duck boat
    if (duckRide) st.dr = duckRide.returning ? 1 : Math.ceil(duckRide.left) + 1; // steering it: seconds left + 1 (1 = heading back)
    if (riding === 3) { st.on = tandemDriver; st.seat = mySeat; }
    if (heldKind()) st.hd = heldKind();
    if (me.activityName) st.ac = me.activityName;
    if (umbrellaOpen()) st.um = 1;
    if (petCare.pet) st.pt = petCare.pet.id;
    if (myScent) st.sc = myScent; // others show the perfume's effect next to us
    if (picnic.sync) st.mt = picnic.sync; // our picnic mat on the park lawn
    if (myWish) st.wl = encodeLantern(myWish); // our wish lantern on Cheonggyecheon, while it floats
    if (dining.meal?.mesh && interior) st.ml = mealSync(dining.meal, interior.seats, interior.store.products);
    const changed = !lastSent || st.x !== lastSent.x || st.z !== lastSent.z || st.ry !== lastSent.ry || st.s !== lastSent.s || st.sit !== lastSent.sit || st.y !== lastSent.y || st.bk !== lastSent.bk || st.bv !== lastSent.bv || st.db !== lastSent.db || st.on !== lastSent.on || st.seat !== lastSent.seat || st.hd !== lastSent.hd || st.um !== lastSent.um || st.pt !== lastSent.pt || st.ml !== lastSent.ml || st.sc !== lastSent.sc || st.tq !== lastSent.tq || st.mt !== lastSent.mt || st.wl !== lastSent.wl || st.tk !== lastSent.tk;
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
  updateBuskMusic(p);
  if (mode === 'street') { palaceShow?.update(dt, p, camera, w, h, placeLabels); npcs.update(dt, camera, w, h); if (busking.update(dt, p, camera, w, h, placeLabels) === 'tip') buskTip(); }
  else {
    busking.hideLabels(); palaceShow?.hideLabels();
    if (clerk) { clerk.ch.animate(dt, interior?.store.clerkRoams ? roamClerk(dt, p) : 0); placeLabels(clerk, camera, w, h); }
    for (const o of [trainer, barkeep, areaGuide, ...(interior?.readerNpcs || []), ...(interior?.vendorNpcs || [])]) if (o) { o.ch.animate(dt, 0); placeLabels(o, camera, w, h); }
    if (interior?.vendorNpcs) greetAtStalls(p);
  }
  if (squareNpc) {
    if (mode === 'street') { squareNpc.ch.animate(dt, 0); placeLabels(squareNpc, camera, w, h); }
    else for (const el of [squareNpc.tag, squareNpc.bubble]) if (el) el.style.display = 'none';
  }
  billboard?.update(dt);
  if (newsTag?.visible) { const ts = performance.now() / 1000; newsTag.position.y = 3.75 + Math.sin(ts * 3.3) * 0.12; newsTag.userData.tick(ts); }
  for (const ws of wallScreens) if (mode === 'street' && Math.hypot(ws.root.position.x - me.root.position.x, ws.root.position.z - me.root.position.z) < 300) ws.update(dt); // only the ones you can see
  if (mode === 'store') interior.pets?.update(dt, me.root.position);
  guardPosition();
  tmp.set(p.x, p.y + 1.55, p.z).project(camera); // (p.y: up a hill, on stairs)
  const lx = (tmp.x * 0.5 + 0.5) * w, ly = (-tmp.y * 0.5 + 0.5) * h;
  myTag.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly}px)`;
  if (myLabel.bubble) myLabel.bubble.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly - 24}px)`;
  updateScents(dt);

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
  const sfxLog = [];
  for (const k of ['arrivalChime', 'doorOpen', 'doorClose', 'depart']) {
    const fn = sfx[k].bind(sfx);
    sfx[k] = () => { sfxLog.push([k, Date.now()]); fn(); };
  }
  window.__mk = {
    stampSpots: () => stampStands.items.map((i) => [i.stamp.id, +i.ux.toFixed(1), +i.uz.toFixed(1), +i.ry.toFixed(2)]),
    sfxLog: () => sfxLog.slice(),
    emblem: () => emblemUi.show(),
    motion: () => ({ wind: !!motionSound.wind, engine: !!motionSound.engine, honk: shownHonk }),
    order: (i = 0) => orderFood(interior.store.products[i], false),
    mealBites: () => dining.meal?.bites ?? null,
    peerMeals: () => [...dining.peerMeals.values()].map((m) => [m.owner, m.bites, m.seat.plate]),
    plateSeat: () => interior.seats.findIndex((s) => s.plate),
    project: (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
    myName: () => nickname,
    mapView: () => mapView,
    near: () => others.players.size, // people in my area cells (not the global count)
    enter: (id) => enterStore(storefronts.get(id)),
    fronts: () => storefronts.items.map((i) => ({ id: i.store.id, x: +i.group.position.x.toFixed(2), z: +i.group.position.z.toFixed(2), ry: +i.group.rotation.y.toFixed(3) })),
    subway: () => ({ mode, y: +me.root.position.y.toFixed(2), exit: interior?.front?.subwayExit ?? null, train: interior?.subway?.train.phase ?? null, exits: allExits.map((e) => [e.at[0], e.at[1], e.ry]) }),
    subwayStairs: () => interior?.subway?.stairs.map((s) => ({ ...s })) ?? null,
    metro: () => subway.metro && { ...subway.metro, now: Date.now(), station: stationIndex(), mode: interior?.train ? 'train' : interior?.subway ? 'hall' : mode },
    doorsOpen: (t) => interior?.subway?.doorsOpen(t) ?? null,
    pickStop: (k) => pickStop(k),
    leave: () => leaveStore(),
    seats: () => interior?.seats?.length ?? 0,
    sit: (i) => sitDown(interior.seats[i]),
    seated: () => !!seated,
    stand: () => standUp(),
    tarot: () => ({ seats: interior?.seats?.map((s) => [s.x, s.z, s.table ?? null, !!s.wait]), turn: tarotTurn, ticket: myTicket, readers: 1 + (interior?.readerNpcs?.length || 0), offer: tarotUi.offer && { ...tarotUi.offer }, state: tarotUi.state && { topic: tarotUi.state.topic, picked: [...tarotUi.state.picked], pair: tarotUi.state.pair && { ...tarotUi.state.pair } } }),
    bone: (n) => { const b = me.root.getObjectByName(n); if (!b) return null; const v = b.getWorldPosition(new THREE.Vector3()); me.root.worldToLocal(v); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; },
    bookShelf: () => bookUi.showShelf(),
    readBook: (id, page = 0) => { bookPages[id] = page; bookUi.read(id); },
    action: () => action?.label || null,
    choices: () => action?.opts?.map((o) => o.label) || null,
    clerkAt: () => (clerk ? [clerk.ch.root.position.x, clerk.ch.root.position.z] : null),
    productsAt: () => interior?.products?.map((pr) => [pr.pos.x, pr.pos.z]) ?? null,
    act: () => action?.run(),
    room: () => ({ mode, id: interior?.store?.id ?? null, front: interior?.front?.store?.id ?? null }),
    dartPins: () => [...(interior?.dartPins?.byWho.values() || [])].map((e) => [e.board, e.color, e.pins.length]),
    decor: () => decor?.items.length ?? -1,
    bikes: () => bikeStations.items.map((b) => [b.x, b.z]),
    riding: () => riding,
    cam: (o) => Object.assign(cam, o),
    ride: (k) => startRide(k),
    place: (x, z) => me.root.position.set(x, 0, z),
    look: () => currentLook,
    camPos: () => camera.position.toArray().map((v) => +v.toFixed(2)),
    mirror: () => { Object.assign(cam, { dist: 2.6, pitch: 0.12 }); me.root.rotation.y = cam.yaw; }, // close-up, facing the camera
    pets: () => interior?.pets?.list.map((p) => [p.name, p.state, +p.root.position.x.toFixed(2), +p.root.position.z.toFixed(2)]) ?? null,
    npcs: () => npcs.list.map((o) => [o.name, o.ch.root.position.x, o.ch.root.position.z]),
    peers: () => [...others.players.values()].map((p) => ({ name: p.name, ...p.target, x: p.ch.root.position.x, z: p.ch.root.position.z, pet: p.pet ? { id: p.pet.id, x: p.pet.root.position.x, z: p.pet.root.position.z, visible: p.pet.root.visible } : null })),
    goto: (x, z, ry = 0) => moveMeTo(activeScene, x, z, ry),
    skate: () => ({ in: inSkate, y: +skateY.toFixed(2), air: skater.air, grind: !!skater.grind, combo: skater.comboPts, riding, type: garage.current.type, at: [+me.root.position.x.toFixed(1), +me.root.position.z.toFixed(1)], ry: +me.root.rotation.y.toFixed(2) }),
    peerTricks: () => [...others.players.values()].map((o) => [o.tk || '', +o.ch.root.position.y.toFixed(2)]),
    rideOn: (id) => { if (id) { garage.s.own.includes(id) || garage.s.own.push(id); garage.use(id); } setRiding(0); setRiding(1); },
    face: (ry) => { me.root.rotation.y = ry; cam.yaw = ry + Math.PI; },
    duckBoard: (i) => boardDuck(i),
    duckGo: () => startDuckRide(),
    duck: () => duckRide && { x: +duckRide.x.toFixed(2), z: +duckRide.z.toFixed(2), ry: +duckRide.ry.toFixed(2), kx: +duckRide.knock.vx.toFixed(2), kz: +duckRide.knock.vz.toFixed(2) },
    duckBoats: () => interior?.ducks?.map((d) => [+d.g.position.x.toFixed(2), +d.g.position.z.toFixed(2), +d.g.rotation.z.toFixed(3)]),
    doorOf: (id) => { const it = storefronts.get(id); return [it.door.x, it.door.z, it.group.rotation.y]; },
    stores: () => storefronts.items.map((i) => i.store.id),
    storePos: () => storefronts.items.map((i) => [i.store.id, +i.group.position.x.toFixed(1), +i.group.position.z.toFixed(1)]),
    zones: () => zones.items.map((i) => [i.zone.id, i.x, i.z]),
    boards: () => noticeBoards.map((b) => [b.board, b.x, b.z]),
    me: () => [me.root.position.x, me.root.position.z, me.root.rotation.y, cam.yaw],
    clerk: () => (clerk ? [clerk.ch.root.position.x, clerk.ch.root.position.z] : null),
    product: (i) => shop.openProduct(interior.products[i].product),
    held: () => held && { ...held },
    perfumeIds: () => [...perfumes.keys()],
    holdNew: (h) => holdNew(h),
    takeout: (i = 0) => orderFood(interior.store.products[i], true),
    giveCoins: (n) => { wallet.add(n, { k: 'ledger.gift' }); refreshWallet(); },
    giveMat: () => bag.add({ kind: 'gift', sips: 1, name: 'Picnic mat', icon: '🧺', g: 'mat' }),
    face: (ry) => { me.root.rotation.y = ry; },
    bagTab: (tab) => bagUi.show(tab),
    heldKind: () => heldKind(),
    scent: () => myScent,
    kpop: () => kpop.song && { id: kpop.song.id, at: Math.round(kpop.position) },
    quest: () => quests.active && { ...quests.active, ready: quests.ready(questCtx()), left: quests.left },
    guide: () => squareNpc && [squareNpc.ch.root.position.x, squareNpc.ch.root.position.z, squareNpc.ch.root.rotation.y],
    billboard: () => billboard && [billboard.root.position.x, billboard.root.position.z],
    hiring: () => hiringPlaces,
    delivery: () => delivery && { ...delivery, left: (delivery.until - performance.now()) / 1000 },
    supportPosters: () => supportPlaces,
    adSpots: () => adPosters.spots.map((s) => [s.id, Math.round(s.front.x), Math.round(s.front.z), s.front.nx, s.front.nz]),
    boards: () => noticeBoards.map((b) => [b.board, b.x, b.z]),
    wallScreens: () => wallScreens.map((w) => [w.root.position.x, w.root.position.y, w.root.position.z, w.root.rotation.y]),
    billboardFrame: () => billboard?.canvas.toDataURL('image/png'),
    look: () => ({ ...currentLook }),
    setLook: (patch) => setLook({ ...currentLook, ...patch }),
    fish: () => ({ ...fishBag.c }),
    addFish: (id) => fishBag.add(id),
    fishDex: () => ({ ...fishDex.c }),
    fishing: () => fishingUi.state,
    spots: () => interior?.fishing?.map((f) => [f.x, f.z]) || null,
    ramenSpot: () => interior?.ramen && [interior.ramen.x, interior.ramen.z],
    music: () => ({ on: music.on, track: music.track.id }),
    pet: () => { const pet = petCare.pet; return pet && { id: pet.id, x: pet.root.position.x, y: +pet.root.position.y.toFixed(2), z: pet.root.position.z, visible: pet.root.visible }; },
    petPoop: () => { const pet = petCare.pet; if (pet) pet.walked = pet.poopAt; },
    poops: () => petCare.poopTimers.list.map((x) => ({ ...x, x: petCare.poops.get(x.id)?.x, z: petCare.poops.get(x.id)?.z })),
    poopTime: (s) => petCare.poopTimers.list.forEach((x) => { x.left = s; }),
    coins: (n) => (n == null ? wallet.coins : wallet.add(n - wallet.coins)),
    bagList: () => bag.list(),
    owns: (id) => inventory.has(id),
    gifts: () => ({ out: gifts.out.size, cards: gifts.cards().length }),
    turntable: () => interior?.turntable && [interior.turntable.x, interior.turntable.z],
    blocked: (x, z) => collision.blocked(x, z, PLAYER_R),
    stream: () => ({ y: +me.root.position.y.toFixed(2), low: !!byStream?.low, stair: !!byStream?.stair, street: currentStreet?.en || null }),
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
    garage: () => garage,
    bikeShop: (id) => openBikeShop(id || 'pedal'),
    ride: (k) => setRiding(k),
    mission: (type, target) => missionEvent(type, target),
    arcade: () => arcade,
    loveLock: (view) => loveLockUi.show(view),
  };
}
