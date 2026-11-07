import { haptics, buzz, shake } from './core/haptics.js';
import { RodSkins, rodKind, rodSkin } from './core/rod-skins.js';
import * as THREE from 'three';
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
import { saveLastSpot, loadLastSpot, usableSpot, saveLastPlace, loadLastPlace } from './core/respawn.js';
import { BookUI } from './ui/book-ui.js';
import { AcademyUI } from './ui/academy-ui.js';
import { Academy } from './core/academy.js';
import { bookById } from './core/books.js';
import { FoodDex, isFood, allFoods } from './core/food-dex.js';
import { DexUI, DEX_TEXT } from './ui/dex-ui.js';
import { STAMPS } from './data/stamps.js';
import { StampBook, availableStamps, STAMP_REWARD } from './core/stamp-book.js';
import { TRAILS } from './data/trails.js';
import { TrailLog, trailProgress, trailsWith } from './core/trails.js';
import { StampStands } from './core/stamp-stands.js';
import { StampUI, STAMP_TEXT } from './ui/stamp-ui.js';
import { PalaceShow, FAN_KEEP, ringPoly } from './core/palace-show.js';
import { JongmyoShow } from './core/jongmyo-show.js';
import { JONGMYO, JongmyoBook, onSamdo, inBox, RITE_WATCH } from './data/jongmyo.js';
import { RIDES as PARK_RIDES, RIDE_COST, rideUntil, seatAt } from './core/themepark.js';
import { CABLE, CC, cabinAt, cabinPos, boardSpot, doorsOpen, arrivesIn, cableClock, nearLoveLock } from './core/cablecar.js';
import { LocalLoveLocks, SupabaseLoveLocks } from './core/love-locks.js';
import { LoveLockUI, LOCK_TEXT } from './ui/love-lock-ui.js';
import { WISH, WISHES, canFloat, encodeLantern, decodeLantern, lanternAt, muralSign, wishFrom, wishTo } from './core/lanterns.js';
import { WishUI, WISH_TEXT } from './ui/wish-ui.js';
import { BukchonUI, BK_TEXT, craftEntry, craftWear, CRAFT } from './ui/bukchon-ui.js';
import { BUKCHON, ViewBook, PartBook, EXPLORER_REWARD, inside as inPolygonXZ, nearestAt, ground as bukchonGround } from './data/bukchon.js';
import { Enclosure, FarCull } from './core/enclosure.js';
import { buildBukchonHill } from './core/bukchon-models.js';
import { buildHanoks } from './core/hanok.js';
import { BukchonMarks } from './core/bukchon-marks.js';
import { createCharacter } from './core/character.js';
import { createLookEditor, saveLook } from './core/look-editor.js';
import { OUTFIT_ITEM, randomLook } from './data/appearance.js';
import { CollisionMap, distSqToSeg } from './core/collision.js';
import { Input } from './core/input.js';
import { RemotePlayers, showBubble, showBubbleEl } from './core/players.js';
import { createAreaNet } from './net/area.js';
import { claimTab } from './core/single-tab.js';
import { watchOnline } from './net/online.js';
import { startWhereReports } from './net/where.js';
import { createCounts, createFpsMeter, deviceClass, firstSrc, someoneNear, startSessionReports } from './core/sessions.js';
import { startUpdateCheck } from './core/update-check.js';
import { showUpdateBanner } from './ui/update-banner.js';
import { config } from './config.js';
import { getEmote } from './data/emotes.js';
import { WeatherSystem, WET, weatherSpeed } from './core/weather.js';
import { Storefronts, latLonToLocal as llToLocal } from './core/storefronts.js';
import { AdPosters } from './core/ad-posters.js';
import { Zones } from './core/zones.js';
import { buildInterior } from './core/interior.js';
import { isDining, coinPrice, foodIcon, FOOD_BITES, mealSync, parseBite } from './core/dining.js';
import { furnitureById } from './core/furniture.js';
import { ShopUI, Cart, coinsFor, goodsKind, itemSoon } from './ui/shop-ui.js';
import { hanbokById, isHanbokModel } from './data/hanbok.js';
import { timeLeft, isRenting } from './core/hanbok-rental.js';
import { GiftBox, parseGift } from './core/gifts.js';
import { GiftUI, GIFT_TEXT } from './ui/gift-ui.js';
import { OrderUI } from './ui/order-ui.js';
import { GrillUI } from './ui/grill-ui.js';
import { RamenUI } from './ui/ramen-ui.js';
import { ML as MARKET_L } from './ui/kimchi-sell-ui.js';
import { MUSEUM_TEXT } from './ui/museum-ui.js';
import { nearestPainting, museumFloorStore, floorOf } from './core/museum.js';
import { GUIDE_LOOK, MEMORIAL_TEXT, MEMORIAL_FLOORS, HALLS as MEMORIAL_HALLS, DONATED } from './data/war-memorial.js';
import { HAUNT_STORE, HAUNT_SPOT } from './core/haunted.js';
import { BOSS_LINES } from './ui/market-text.js';
import { KT as KIMCHI_TEXT } from './ui/kimchi-text.js';
import { JT as JAPCHAE_TEXT } from './ui/japchae-text.js';
import { BT as KIMBAP_TEXT } from './ui/kimbap-text.js';
import { PochaUI, L, fmt } from './ui/pocha-ui.js';
import { Bag, giftEntry } from './core/bag.js';
import { perfumeIndex, Scent, SPRAYS, STYLES, PUFF_NEAR, nextPuff, onSale } from './core/perfume.js';
import { ScentFx } from './core/scent-fx.js';
import { BagUI, BAG_TEXT } from './ui/bag-ui.js';
import { KaraokeUI } from './ui/karaoke-ui.js';
import { RunwayUI, RUNWAY_TEXT } from './ui/runway-ui.js';
import { PhotoUI } from './ui/photo-ui.js';
import { ClawUI } from './ui/claw-ui.js';
import { parseTarot } from './core/tarot-queue.js';
import { BuskingZones, TIP, readTips, writeTips, takeTip } from './core/busking.js';
import { buskingGroundY } from './core/busking-layout.js';
import { parseRaceMsg } from './core/pool.js';
import { POOL_TEXT } from './data/pool-text.js';
import { LIFEGUARD_LOOK } from './core/pool-hall.js';
import { BL } from './ui/basketball-text.js';
import { Skater, PARK_SPEED } from './core/skatepark.js';
import { dayKey } from './core/daily.js';
import { initInstall } from './ui/install-ui.js';
import { DuckUI } from './ui/duck-ui.js';
import { makeMascotHead } from './core/mascot.js';
import { UPDATES, updateText, hasNew as hasNewUpdate, newCount as newUpdates } from './data/updates.js';
import { DUCK_SEATS } from './core/park.js';
import { karaokeMsg, parseKaraoke } from './core/karaoke-game.js';
import { DuckRide, DUCK_BUMP } from './core/duck-boat.js';
import { Contacts, touching, wobble } from './core/bump.js';
import { parseDarts, parseDartsGo, parseDartPin } from './core/arcade.js';
import { DartPins } from './core/dart-pins.js';
import { JOB_TEXT, jobOf, shiftsLeft, takeShift, readShifts, writeShifts } from './core/jobs.js';
import { JobUI } from './ui/job-ui.js';
import { hiringTexture, drawHiring, wallPoster, doorSticker, assignSpots } from './core/hiring-ads.js';
import { supportTexture, pickSupportSpots } from './core/support-poster.js';
import { BeautyUI } from './ui/beauty-ui.js';
import { CounterUI, heldFor } from './ui/counter-ui.js';
import { BEAUTY_SHOPS, BEAUTY_ICON, isClinic } from './core/beauty.js';
import { KpopRoom } from './ui/kpop-room.js';
import { parseKpop } from './data/kpop.js';
import { parseFilm } from './data/films.js';
import { FishingUI, FishMarketUI, FishBookUI, trophy, TROPHY_RARITY, catchBubble, showMs } from './ui/fishing-ui.js';
import { FishBag, FishDex, FishStats, FISH, fishById } from './core/fishing.js';
import { createFishingRig } from './core/fishing-rig.js';
import { HELD_KINDS, COFFEE_SIPS } from './core/held.js';
import { CloudSave } from './core/cloud-save.js';
import { Inventory, ITEMS, isWorn, parseTandem, tandemMsg } from './core/inventory.js';
import { SEATS, seatPosition } from './core/bikes.js';
import { MapView, DISTRICT_NAME } from './ui/map-view.js';
import { Music, Sfx } from './core/music.js';
import { MotionSound, honkKind, honkMsg, parseHonk, hearGain } from './core/motion-sound.js';
import { Garage, BIKE_MODELS, RIDE_ICON as VEHICLE_ICON, rideCode } from './core/bike-garage.js';
import { BikeStations } from './core/bikes.js';
import { Wallet, demoAd } from './core/wallet.js';
import { loadH5Ads, rewardedShow } from './core/h5-ads.js';
import { mountSideAd, sideAdOn } from './core/side-ad.js';
import { Safety, filterText } from './core/safety.js';
import { Pets } from './core/pets.js';
import { StreetNpcs, makeNpc, say, placeLabels, PHRASES } from './core/npcs.js';
import { RoadGraph, RouteLine } from './core/route.js';
import { cleanName, readIdentity, saveIdentity, isReservedName } from './core/identity.js';
import { customPetName, setPetName, PET_NAME_MAX } from './core/pet-names.js';
import { createPetCare, PET_NAME_TEXT } from './game/pet-care.js';
import { createSubway } from './game/subway.js';
import { createDining, DINE_TEXT } from './game/dining.js';
import { createPicnic, hasMat, MAT_TEXT } from './game/picnic.js';
import { createBeauty } from './game/beauty.js';
import { NavGrid, nearestOnPoly, trimPoly, pointAhead } from './core/nav-grid.js';
import { LocalFriends } from './core/friends.js';
import { SubwayEntrances, VENDING_DRINKS, gateAt, GATE_X, DOOR_Z, FARE, blockersOf, holeOf, footprintOf, toWorld, outsideOf, PIT } from './core/subway.js';
import { createBikeShop } from './ui/bike-shop-ui.js';
import { createPool } from './game/pool.js';
import { createTarot } from './game/tarot.js';
import { createArcade } from './game/arcade.js';
import { createBasketball } from './game/basketball.js';
import { createSkate } from './game/skate.js';
import { createTaxi } from './game/taxi.js';
import { createDecor } from './game/decor.js';
import { createClubs } from './game/clubs.js';
import { createMusicCafe } from './game/music-cafe.js';
import { createHatWorkshop } from './game/hat-workshop.js';
import { createDelivery } from './game/delivery.js';
import { createChat } from './game/chat.js';
import { createGifts } from './game/gifts.js';
import { createHanbokRental } from './game/hanbok-rental.js';
import { createCookingClasses } from './game/cooking-classes.js';
import { createEmoteWheel } from './ui/emote-wheel.js';
import { createDaily } from './game/daily.js';
import { createLedger } from './ui/ledger-ui.js';

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

// Google ads (AdSense): the script for the rewarded "Watch an ad" button,
// loaded early so the start screen's banner (wide computer screens) can fill.
{
  const ad = config.rewardedAd;
  const google = ad.provider === 'h5' || sideAdOn(config.sideAd, ad.client);
  loadH5Ads(google ? ad : {});
  mountSideAd({ cfg: config.sideAd, client: ad.client, test: ad.test });
}

// Cloud save (guest account on Supabase). Runs before anything reads saved
// data, so a newer save from the server is in place first. Skipped in
// automated test rooms.
const cloud = new CloudSave(config.netProvider === 'supabase' && !new URLSearchParams(location.search).has('debug') ? config.net : null);
await cloud.load();
// This play session's counts for the operator's retention numbers
// (core/sessions.js); the reports start once the world is up (see below).
const playCounts = createCounts();

// ---------- Start screen ----------
const regionsIndex = await fetch(`${BASE}regions/index.json`).then((r) => r.json());
// ?region= picks a region; an unknown id (an old ?region=seongsu link) falls back to the default.
const askedRegion = new URLSearchParams(location.search).get('region');
const regionId = regionsIndex.regions.some((r) => r.id === askedRegion) ? askedRegion : regionsIndex.default;
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

// Coming back: where you left off (the district of the saved spot), not the
// first stop again. Only the very first visit says "First stop".
let lastPlace = loadLastPlace();
function refreshStartText() {
  const lang = getLanguage();
  const lastName = lastPlace && (localName(DISTRICT_NAME[lastPlace], lang) || lastPlace.charAt(0).toUpperCase() + lastPlace.slice(1));
  $('start-region').textContent = lastName ? t('start.last', { place: lastName }) : t('start.region', {
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
// Gyeongbokgung's fan dance (core/palace-show.js): a rope ring round the
// dancers that you can't step inside, so the formation isn't broken.
const palaceAt = (region.districts || []).find((d) => d.id === 'gyeongbokgung')?.offset;
const fanAt = palaceAt && [palaceAt[0], palaceAt[1] - 150]; // Geunjeongjeon's courtyard
const fanRing = fanAt ? [{ p: ringPoly(fanAt[0], fanAt[1], FAN_KEEP) }] : [];
const solidBuildings = map.buildings.filter((b) => !b.visit); // (homes open to visitors: their yard is walkable, the map lists their solid parts as blockers)
const collision = new CollisionMap(solidBuildings.concat(map.blockers || [], allExits.flatMap(blockersOf), streamWalls, fanRing)); // blockers: rivers, walls
const treeCollision = allExits.length || streams.length ? new CollisionMap(solidBuildings.concat(map.blockers || [], allExits.map((e) => footprintOf(e)), streamWalls)) : collision;
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
const npcs = new StreetNpcs(scene, $('labels'), roadGraph, zones.items.map((z) => ({ id: z.zone.id, x: z.x, z: z.z })));
// Busking zones (region.json "busking"), e.g. Hongdae Walking Street: a singer, K-pop dancers, a crowd, a song.
// Gyeongbokgung performances: the fan dance in front of Geunjeongjeon and
// the mask dance with a lion in front of Gwanghwamun (core/palace-show.js).
const palaceShow = palaceAt ? new PalaceShow(scene, {
  fan: fanAt,
  procession: palaceAt, // the king's walk round the palace (ROYAL_ROUTE)
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
const spotBoxes = districtBoxes(map);
if (onboard >= 2) {
  const last = loadLastSpot();
  // Not out in the empty land between districts either (e.g. a spot saved
  // before a district moved to its real place, scripts/place-districts.mjs).
  const nearDistrict = (x, z) => !spotBoxes.length || spotBoxes.some((b) => x >= b.x0 - 40 && x <= b.x1 + 40 && z >= b.z0 - 40 && z <= b.z1 + 40);
  if (usableSpot(last, bounds, (x, z) => collision.blocked(x, z, 0.4) || !nearDistrict(x, z))) {
    me.root.position.set(last.x, 0, last.z);
    me.root.rotation.y = last.ry;
    // A save from before districts were remembered: name it now.
    if (!lastPlace && spotBoxes.length) {
      lastPlace = districtAt(spotBoxes, last.x, last.z);
      saveLastPlace(lastPlace);
      refreshStartText();
    }
  }
}
let tabParked = false; // another tab of this browser took over (see claimTab)
let lastSpotTimer = 3;
const rememberSpot = () => {
  if (tabParked) return; // the newer tab owns the saved spot now
  try {
    if (mode !== 'street') return;
    const { x, z } = me.root.position;
    saveLastSpot(x, z, me.root.rotation.y);
    if (spotBoxes.length) saveLastPlace(districtAt(spotBoxes, x, z));
  } catch { /* still starting up */ }
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
// Gifts (game/gifts.js) are set up further down, but joining the first room
// (just below) already calls off any waiting gifts.
let giftsGame = null;
function dropGifts() { giftsGame?.dropGifts(); }
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
      if (parseRaceMsg(e)) { onPoolRace(id, parseRaceMsg(e)); return; }
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
  const joinedLook = currentLook;
  try {
    const n = await createAreaNet(config.netProvider, handlers, { ...config.net, accessToken: () => cloud.accessToken() }, {
      room, self: { id: myId, name: nickname, look: joinedLook },
      cellSize: area ? config.netCellSize : 0, x: area?.x, z: area?.z,
      // Debug test rooms play without an account (no cloud save), and the
      // private chat channel only carries chat from accounts: chat there on
      // the room channels instead.
      privateChat: !testRoom,
    });
    if (token !== joinToken) { n.disconnect(); return; } // a newer join won
    net = n;
    // The look changed while we were connecting (the pool hall puts swimwear
    // on as you come in and takes it off as you leave): tell the new room.
    if (currentLook !== joinedLook) n.sendLook?.(currentLook);
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
  if (chat.friendBackend instanceof LocalFriends) chat.friendBackend.setName(nickname);
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

// Emote wheel. (ui/emote-wheel.js)
const emoteWheel = createEmoteWheel({
  get onSquare() { return onSquare; }, get me() { return me; }, get net() { return net; }, $, missionEvent,
  myLabel,
});
const { closeWheel } = emoteWheel;

// Text chat, chat codes, friends and friend chat. (game/chat.js)
const chat = createChat({
  get others() { return others; }, get shop() { return shop; }, get googleFail() { return googleFail; },
  get CODE_TEXT() { return CODE_TEXT; }, get wallet() { return wallet; },
  get myLook() { return myLook; }, set myLook(v) { myLook = v; }, get inventory() { return inventory; },
  get nickname() { return nickname; }, get net() { return net; }, get sfx() { return sfx; }, $, OPERATOR_TEXT,
  cloud, input, myId, myLabel, recentLines, refreshItems, refreshWallet, safety, setLook,
  onChatSent: () => playCounts.chat(), // retention counts (core/sessions.js)
});
const { cleanChat, addChatLine } = chat;

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
  rentLeft: (product) => (isRenting(hanbokRental.rental, product.rent) ? timeLeft(hanbokRental.rental) : 0),
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
if (String(myLook.model).startsWith('swim-')) { myLook = { ...myLook, model: 'basic' }; saveLook(myLook); setTimeout(() => setLook(myLook), 0); } // swimwear is only for the pool
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
// Hanbok rental by Gyeongbokgung. (game/hanbok-rental.js)
const hanbokRental = createHanbokRental({
  get myLook() { return myLook; }, set myLook(v) { myLook = v; }, get wallet() { return wallet; },
  get interior() { return interior; }, get sfx() { return sfx; }, get currentLook() { return currentLook; },
  $, refreshWallet, setLook, shop,
});
const { rentHanbok } = hanbokRental;
// Gifts for friends in the same shop. (game/gifts.js)
giftsGame = createGifts({
  get interior() { return interior; }, get subway() { return subway; }, get me() { return me; },
  get others() { return others; }, get wallet() { return wallet; }, get net() { return net; },
  get sfx() { return sfx; }, $, SHOP_ICON, bag, counterUi, giftUi, gifts, inventory, myId, perfumes,
  refreshItems, refreshWallet, safety, shop, storeData,
});
const { answerGift, onGiftMsg, canGift, startGift, peopleHere } = giftsGame;
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
    built.clerkNpc = makeNpc($('labels'), store.category === 'school' ? teacherLabel() : store.workshop === 'tarot' ? '🔮 ' + L(TAROT_TEXT.reader) : store.workshop === 'kimchi' ? '👵 ' + L(KIMCHI_TEXT.teacher) : store.workshop === 'kimchi-buy' ? '👵 ' + MARKET_L('boss') : store.workshop === 'japchae' ? '👨‍🍳 ' + L(JAPCHAE_TEXT.teacher) : store.category === 'club' ? 'DJ' : store.category === 'bar' ? L(BARTENDER) : store.workshop === 'info' ? '🎮 ' + L(INFO_TEXT.gameGuide) : store.category === 'memorial' ? 'ℹ️ ' + L(MEMORIAL_TEXT.guide) : store.workshop === 'pool' ? '🛟 ' + L(POOL_TEXT.lifeguard) : t('npc.clerk'), store.category === 'memorial' ? GUIDE_LOOK : store.workshop === 'pool' ? LIFEGUARD_LOOK : undefined);
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
  // The Curve Runway's audience: people already sitting in some of the seats.
  if (built.stations?.runway?.[0]?.audience && !built.audienceNpcs) {
    built.audienceNpcs = built.stations.runway[0].audience.map((s) => {
      const o = makeNpc($('labels'), '');
      o.tag.style.visibility = 'hidden';
      o.ch.root.position.set(s.x, 0, s.z);
      o.ch.root.rotation.y = s.ry;
      o.ch.activity('sit'); // the sitting clip, legs along the seat
      built.scene.add(o.ch.root);
      return o;
    });
  }
  interior.audienceNpcs = built.audienceNpcs || null;
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
  const hello = store.category === 'school' ? PHRASES.school[0] : quiet ? PHRASES.library[0] : museum ? PHRASES.museum[0] : store.category === 'memorial' ? PHRASES.memorial[0] : store.category === 'culture' ? PHRASES.culture[0] : PHRASES.welcome[0];
  if (clerk) setTimeout(() => clerk && say(clerk, $('labels'), hello), 600);
  npcs.setVisible(false);
  if (store.category === 'home') {
    goSolo(built.scene); // your home is private for now
    openHome(store, built);
  } else joinRoom(`${roomId}-${store.id}`, built.scene);
}

// The War History Museum's altar: a white chrysanthemum on it and a bow (others
// see the bow; the flowers are only in your own view of the room).
function layMemorialFlower() {
  interior?.stations?.layFlower?.();
  me.play('bow');
  net.sendEmote('bow');
  shop.toast(L(MEMORIAL_TEXT.laid));
}

// The War History Museum's floors, for the lift's floor list.
const memorialFloors = () => MEMORIAL_FLOORS.map(({ floor, halls }) => ({
  floor, lines: [...(floor === 2 ? [L(DONATED.title)] : []), ...halls.map((k) => L(MEMORIAL_HALLS[k].name))],
}));

// The museums' lifts (the art museum and the War History Museum): each floor
// is its own interior; you step out by the lift.
function goMuseumFloor(floor) {
  if (mode !== 'store' || !['museum', 'memorial'].includes(interior?.store.category) || floorOf(interior.store) === floor) return;
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
  if (pool.mode?.kind === 'race') endRace(); // (friends hear we left)
  if (wearingSwim()) setLook(myLook); // out of the pool hall: own clothes back before the street sees you
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
  for (const g of [pochaUi, jobUi, karaokeUi, runwayUi, photoUi, clawUi, battingUi, galleryUi, hauntUi, dartsUi, duckUi, emblemUi, infoUi, saunaUi, gymUi, bookUi, academyUi, boardUi, museumUi, loveLockUi, wishUi]) if (g.open) g.close();
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
  streetY: (p, px0, pz0) => { const y = updateStream(p, px0, pz0); return y || skateY || basketball.basketY || hillY(map.landmarks, p.x, p.z) || buskingGroundY(map.landmarks, p.x, p.z) || bukchonY(p.x, p.z); }, // down by a stream, in the skate park, up a park hill, the busking bank or Bukchon's hill
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

// Music café LPs, the K-POP café and the cinemas. (game/music-cafe.js)
const musicCafe = createMusicCafe({
  $, applyMusicBtn, kpop, music, shop,
});
const { enterMusicCafe, enterKpopCafe, leaveMusicCafe, leaveKpopCafe, openLpPanel } = musicCafe;
// Ride shops: rides, repairs, tune-ups and skins. (ui/bike-shop-ui.js)
const bikeShop = createBikeShop({
  get riding() { return riding; }, get me() { return me; }, get wallet() { return wallet; }, $, garage,
  refreshWallet, shop,
});
const { TIER_STARS, BIKE_TEXT, applyRide, openBikeShop } = bikeShop;
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

// Itaewon clubs: genre playlists on a shared clock. (game/clubs.js)
const clubs = createClubs({
  $, applyMusicBtn, music, shop,
});
const { enterClub, leaveClub, CLUB_TEXT, openClubPanel, clubPulse } = clubs;
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

// Taxi rides to a picked place on the map. (game/taxi.js)
const taxi = createTaxi({
  get map() { return map; }, get mode() { return mode; }, get me() { return me; },
  get interior() { return interior; }, get wallet() { return wallet; }, get riding() { return riding; }, $,
  clearGuide, findFreeSpot, input, leaveStore, mapView, missionEvent, moveMeTo, myLabel, refreshWallet, scene,
  setGuide, setRiding, shop,
});
const { rideTaxi } = taxi;
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
const spaceBusy = () => { try { return [basketUi, pochaUi, jobUi, karaokeUi, runwayUi, photoUi, clawUi, battingUi, galleryUi, hauntUi, dartsUi, duckUi, emblemUi, infoUi, saunaUi, gymUi, bookUi, academyUi, boardUi, loveLockUi, wishUi, bukchonUi, orderUi, grillUi, fishingUi, marketUi, ramenUi, kimchiUi, japchaeUi, kimbapUi, kimchiSellUi, tarotUi, counterUi, bagUi, dexUi, fishBookUi, stampUi, museumUi].some((g) => g?.open)
  || !$('map-panel').hidden || !$('settings-panel').hidden || !$('notes-panel').hidden; } catch { return true; } };
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target?.isContentEditable) return;
  if (e.code === 'Space' && !e.repeat && action && !spaceBusy()) {
    e.preventDefault(); // don't also click whatever button kept focus
    if (e.target instanceof HTMLButtonElement) e.target.blur();
    runAction();
  }
  if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) runAction(); // holding the key acts once
  if (e.code === 'KeyM') $('map-btn').click();
  if (e.code === 'Escape') {
    if (!$('map-panel').hidden) mapView.hide();
    else if (!$('settings-panel').hidden) $('settings-panel').hidden = true;
    else if (!$('notes-panel').hidden) $('notes-panel').hidden = true;
    else if (loveLockUi.open) loveLockUi.close();
    else if (wishUi.open) wishUi.close();
    else if (emoteWheel.wheelOpen) closeWheel();
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


// Home decorating: place, move and remove furniture. (game/decor.js)
const decorGame = createDecor({
  get interior() { return interior; },
  get activeCollision() { return activeCollision; }, set activeCollision(v) { activeCollision = v; },
  get action() { return action; }, set action(v) { action = v; }, get me() { return me; }, $, STALE,
  inventory, shop,
});
const { labelDecor, openHome, closeHome, nearestPiece, putDown, closePiece, openPiece, updateCarry } = decorGame;

// Coins and the rewarded-ad slot (demo for now; see core/wallet.js).
const wallet = new Wallet(config.rewardedAd);
// Budget-book note for coins earned or spent without one: the shop you are in.
wallet.context = () => (interior?.store?.name ? { at: interior.store.name } : null);
// Anonymous session reports for the operator's retention numbers
// (core/sessions.js, supabase/011_play_sessions.sql): once a minute while
// the tab is visible. Not in test rooms or while another tab owns the game.
playCounts.coins(wallet.coins);
wallet.onChange((c) => playCounts.coins(c));
if (!testRoom) {
  const device = deviceClass({ touch: input.isTouch, width: screen.width, height: screen.height });
  const src = firstSrc(location.search);
  startSessionReports({
    get: () => (tabParked || !me?.root ? null : { region: regionId, device, src }),
    send: (r) => cloud.reportSession(r),
    counts: playCounts,
    fps: createFpsMeter(),
    tick: (sec) => {
      try {
        if (!me?.root) return;
        const mine = me.root.position;
        const near = someoneNear(mine, [...others.players.values()].map((p) => p.ch?.root?.position).filter(Boolean));
        if (near) playCounts.near(sec);
      } catch { /* still starting up */ }
    },
  });
}
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
    playCounts.fish();
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
  park: () => interior?.store?.id || null, // which ★5 legends bite here (PARK_LEGENDS in core/fishing.js)
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

// Cooking classes (kimchi, japchae, kimbap), the market's kimchi stall and the museums. (game/cooking-classes.js)
const cookingClasses = createCookingClasses({
  get clerk() { return clerk; }, get me() { return me; }, get held() { return held; }, $, bag, missionEvent,
  setHeld, shop, togetherBonus, wallet,
});
const { museumUi, kimchiUi, japchaeUi, kimbapUi, kimchiSellUi } = cookingClasses;

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
// Curve Runway (DDP, ui/runway-ui.js): while the show is on, the movement
// loop walks the character down the runway and back (runwayStep), the
// camera watching from the photographers' end; the poses play here.
let runwayMusic = false, runwayCam = null, runwaySpin = 0;
const runwayUi = new RunwayUI({
  root: $('runway-panel'),
  wallet,
  onStart: () => {
    runwayMusic = music.on; if (music.on) { music.setOn(false); applyMusicBtn(); }
    runwayCam = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist };
    Object.assign(cam, { yaw: 0, pitch: 0.3, dist: 7 });
  },
  onEnd: () => {
    if (runwayMusic && !music.on) { music.setOn(true); applyMusicBtn(); }
    runwayMusic = false; runwaySpin = 0;
    if (runwayCam) { Object.assign(cam, runwayCam); runwayCam = null; }
  },
  onPose: (i, kind, label) => {
    if (!label) { me.play('shrug'); return; } // missed the beat
    interior?.stations?.runway?.[0]?.flash?.();
    sfx.snap();
    for (const o of interior?.audienceNpcs || []) if (Math.random() < 0.6) o.ch.play('clap'); // the audience claps
    if (kind === 'turn') runwaySpin = 0.7;
    else { me.play(kind); net.sendEmote(kind); }
  },
  onMedal: (medal, coins) => {
    if (coins) shop.toast(t('grill.medalToast', { coins }));
    me.play(medal ? 'cheer' : 'wave');
    if (medal) for (const o of interior?.audienceNpcs || []) o.ch.play(Math.random() < 0.5 ? 'cheer' : 'clap');
  },
});
// One frame of the show: where on the runway, facing which way.
function runwayStep(p, dt) {
  const st = interior?.stations?.runway?.[0], w = runwayUi.walkState();
  if (!st || !w) return 0;
  const z = st.z + (st.z1 - st.z) * w.along;
  const moved = Math.abs(z - p.z);
  p.x = st.x; p.z = z;
  let ry = w.phase === 'back' ? Math.PI : 0;
  if (runwaySpin > 0) { runwaySpin = Math.max(0, runwaySpin - dt); ry += (1 - runwaySpin / 0.7) * Math.PI * 2; }
  me.root.rotation.y = ry;
  return moved > 0.0005 ? 0.32 : 0; // a steady catwalk pace
}
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
// Arcade: batting cage, shooting galleries and darts. (game/arcade.js)
const arcadeGame = createArcade({
  get interior() { return interior; }, get others() { return others; }, get me() { return me; },
  get net() { return net; }, $, cam, myId, safety, sfx, shop,
});
const { onDartsMsg, arcade, galleryUi, hauntUi, battingUi, dartsUi, ARCADE_OPEN, openArcade, freshInvite } = arcadeGame;
// Tarot cafés: readings, two readers, the waiting line. (game/tarot.js)
const tarot = createTarot({
  get seated() { return seated; }, get interior() { return interior; }, get clerk() { return clerk; },
  get me() { return me; }, get others() { return others; }, get net() { return net; },
  get nickname() { return nickname; }, get action() { return action; }, set action(v) { action = v; },
  get sendTimer() { return sendTimer; }, set sendTimer(v) { sendTimer = v; }, $, STALE, myId, myLabel,
  refreshWallet, safety, sfx, shop, sitDown, standUp, wallet,
});
const { tarotUi, TAROT_TEXT, leaveTarotLine, tarotAction, tarotReader, TAROT_LINES, tarotTick } = tarot;
// Mini basketball on Olympic Park's Peace Plaza. (game/basketball.js)
const basketball = createBasketball({
  get map() { return map; }, get mode() { return mode; }, get me() { return me; },
  get action() { return action; }, set action(v) { action = v; }, get riding() { return riding; },
  get seated() { return seated; },
  get manualCamT() { return manualCamT; }, set manualCamT(v) { manualCamT = v; },
  get speed01() { return speed01; }, set speed01(v) { speed01 = v; }, $, STALE, cam, scene, setAutoWalk, sfx,
  shop, wallet,
});
const { basketUi, nearCourt, basketTick } = basketball;
// Olympic Park skate park: tricks, grinds and combos. (game/skate.js)
const skate = createSkate({
  get map() { return map; }, get inSkate() { return inSkate; }, set inSkate(v) { inSkate = v; },
  get skateTk() { return skateTk; }, set skateTk(v) { skateTk = v; },
  get sendTimer() { return sendTimer; }, set sendTimer(v) { sendTimer = v; }, get mode() { return mode; },
  get action() { return action; }, set action(v) { action = v; }, get riding() { return riding; },
  get me() { return me; }, get skateY() { return skateY; }, set skateY(v) { skateY = v; },
  get speed01() { return speed01; }, $, STALE, garage, sfx, shop, skater,
});
const { skatePop, SKATE_TEXT, skateTick } = skate;

// Olympic Park Pool: swimming, races and diving. (game/pool.js)
const poolGame = createPool({
  get currentLook() { return currentLook; }, get myLook() { return myLook; },
  get action() { return action; }, set action(v) { action = v; }, get mode() { return mode; },
  get interior() { return interior; }, get others() { return others; }, get me() { return me; },
  get net() { return net; }, get nickname() { return nickname; },
  get signsTranslated() { return signsTranslated; }, get seated() { return seated; },
  get speed01() { return speed01; }, set speed01(v) { speed01 = v; }, get clerk() { return clerk; }, $, STALE,
  cam, camera, hiringRedraws, myId, refreshWallet, safety, setLook, sfx, shop, skatePop, wallet,
});
const { onPoolRace, pool, endRace, wearingSwim, poolMore, poolAction, poolTick, poolLog } = poolGame;

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
    if (musicCafe.cafeMusic) musicCafe.cafeMusic.wasOn = wasOn; // walked straight into a music café or bar
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
  if (pool.act) return pool.act; // in the pool: swimming, a tube, arms up for a dive
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
// Bukchon (data/bukchon.js): the 8 Views photo walk, the Open House's hanok
// parts, the magpie's persimmons, the Quiet Zone, and the craft workshops.
const bukchonAt = (region.districts || []).find((d) => d.id === BUKCHON.district)?.offset || null;
const viewBook = new ViewBook(), partBook = new PartBook();
// Bukchon's hill (data/bukchon.js ground): how high the street is at (x, z).
// In the yard of a home open to visitors, the ground is its flat terrace.
const visitYards = map.buildings.filter((b) => b.visit).map((b) => ({ x0: Math.min(...b.p.map((q) => q[0])), x1: Math.max(...b.p.map((q) => q[0])), z0: Math.min(...b.p.map((q) => q[1])), z1: Math.max(...b.p.map((q) => q[1])), y: b.lv || 0 }));
function bukchonY(x, z) {
  if (!bukchonAt) return 0;
  for (const v of visitYards) if (x > v.x0 && x < v.x1 && z > v.z0 && z < v.z1) return v.y;
  return bukchonGround(x - bukchonAt[0], z - bukchonAt[1]);
}
// Villagers in hanbok, men and women, strolling the alleys inside the wall.
const HANBOK_WOMEN = [['yellow-red', 'long'], ['pink-navy', 'bun'], ['mint-pink', 'pony'], ['pink-navy', 'bob'], ['yellow-red', 'bun']];
const HANBOK_MEN = [['baji-blue', 'short'], ['durumagi-lilac', 'crop'], ['baji-navy', 'pomp'], ['durumagi-gray', 'short'], ['baji-jade', 'crop']];
const bukchonIn = (x, z) => !!bukchonAt && inPolygonXZ(x - bukchonAt[0], z - bukchonAt[1], [[BUKCHON.area[0], BUKCHON.area[1]], [BUKCHON.area[2], BUKCHON.area[1]], [BUKCHON.area[2], BUKCHON.area[3]], [BUKCHON.area[0], BUKCHON.area[3]]]);
const hanbokNpcs = bukchonAt ? new StreetNpcs(scene, $('labels'), roadGraph, BUKCHON.villagers.map(([x, z]) => ({ id: 'bukchon', x: x + bukchonAt[0], z: z + bukchonAt[1] })), 2, {
  keepIn: bukchonIn,
  phrases: PHRASES.bukchon,
  groundY: bukchonY,
  who: (i) => {
    const [set, hairStyle] = (i % 2 ? HANBOK_MEN : HANBOK_WOMEN)[Math.floor(i / 2) % 5];
    return { name: (i % 2 ? ['민준', '도하', '선우', '이준', '주호'] : ['소연', '지유', '하윤', '예나', '서아'])[Math.floor(i / 2) % 5], look: { ...randomLook(), hairStyle, ...hanbokById(set).wear } };
  },
}) : null;

const bukchonMarks = bukchonAt ? new BukchonMarks(scene, bukchonAt) : null;
bukchonMarks?.taken(viewBook);
// Bukchon sits open on the field: its hanok and hill are built at once and
// seen from Yulgok-ro; the stone walls are only the hill's retaining walls.
const openHanok = [];
// Hanok inside a district's enclosure wait for the first visit; the rest
// (e.g. Seosunra-gil's shops outside Jongmyo's wall) are built at once.
const inEnclosure = (d, b) => {
  if (!d.enclosure) return false;
  const [ax, az, bx, bz] = d.enclosure.box, [ox, oz] = d.offset;
  return b.p.every(([x, z]) => x >= Math.min(ax, bx) + ox && x <= Math.max(ax, bx) + ox && z >= Math.min(az, bz) + oz && z <= Math.max(az, bz) + oz);
};
for (const d of map.meta?.districts || []) {
  const hanoks = map.buildings.filter((b) => b.hanok && b.d === d.id && !inEnclosure(d, b));
  if (!hanoks.length) continue;
  const g = buildHanoks(hanoks);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  if (d.id === BUKCHON.district) g.add(buildBukchonHill(map.roads.filter((r) => r.d === d.id), d.offset)); // the hill and its alleys
  scene.add(g);
  openHanok.push(g);
}
// Walled places (district meta "enclosure", core/enclosure.js): Gyeongbokgung
// shows its wall and gates from the street; what is inside is drawn once you
// walk in.
const enclosures = (map.meta?.districts || []).filter((d) => d.enclosure).map((d) => {
  const [x0, z0, x1, z1] = d.enclosure.box, [ox, oz] = d.offset;
  const e = new Enclosure({ id: d.id, box: [x0 + ox, z0 + oz, x1 + ox, z1 + oz] });
  const hanoks = map.buildings.filter((b) => b.hanok && b.d === d.id && inEnclosure(d, b));
  if (hanoks.length) e.onFirstEnter = () => {
    const g = buildHanoks(hanoks);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    return [g];
  };
  return e;
});
const enclosureSkip = new Set([me.root, bukchonMarks?.group, ...openHanok, ...(hanbokNpcs?.list || []).map((o) => o.ch.root)].filter(Boolean));
for (const e of enclosures) {
  e.collect([landmarks, scene], enclosureSkip);
  e.adopt(storefronts.items.filter((i) => e.contains(i.group.position.x, i.group.position.z, 0.5)).map((i) => i.group));
}
// Shops, landmarks, subway entrances, stamp stands, meeting zones and the
// stream's lanterns and stones past the fog are not drawn.
const farCull = new FarCull([...storefronts.items.map((i) => i.group), ...subwayEntrances.flatMap((e) => e.items.map((i) => i.group)), ...stampStands.items.map((i) => i.mesh), ...zones.items.map((i) => i.group), ...landmarks.children, ...openHanok, scene.getObjectByName('streams')], () => (scene.fog ? scene.fog.far + 30 : Infinity));
let bukchonWelcomed = false, wasInBukchon = null;
function updateEnclosures(p, dt = 0) {
  farCull.update(dt, p);
  for (const e of enclosures) if (e.update(p) === 'enter') shop.toast((AREA[e.id]?.icon || '🚪') + ' ' + L(AREA[e.id]?.name || { en: e.id }));
  // Walking up into Bukchon the first time this visit: what it is, and the rules.
  const inBk = bukchonIn(p.x, p.z), entered = wasInBukchon === false && inBk;
  wasInBukchon = inBk;
  if (entered && !bukchonWelcomed && mode === 'street' && !spaceBusy()) {
    bukchonWelcomed = true;
    const w = BUKCHON.welcome;
    bukchonUi.card({ icon: '🏘️', name: w.title, text: w.text }, { sub: '🤫 ' + L(w.rules) });
    bukchonUi.view = 'welcome';
  }
}
const bukchonUi = new BukchonUI({
  root: $('bukchon-panel'), wallet,
  onMake: (kind, ci, si) => {
    const k = CRAFT[kind], entry = craftEntry(kind, ci, si), wear = craftWear(kind, ci, si);
    if (!k || (!entry && !wear)) return false;
    if (wear) { // a piece you wear (Sunra Silver Studio's pendants): it goes to your items
      if (inventory.has(wear)) { shop.toast(L(BK_TEXT.haveIt)); return false; }
      if (!wallet.spend(k.price, { name: BK_TEXT[kind], at: interior?.store.name })) { shop.toast(fmt(L(BK_TEXT.poor), { n: k.price })); return false; }
      refreshWallet();
      inventory.add(wear);
      refreshItems();
      sfx.pop?.();
      clerk && say(clerk, $('labels'), ['잘 어울려요!', 'jal eoullyeoyo!', 'It suits you!']);
      shop.toast(fmt(L(BK_TEXT.madeWear), { icon: k.icon, name: L(ITEMS[wear]?.name || { en: wear }) }));
      return true;
    }
    if (bag.full) { shop.toast(L(BK_TEXT.bagFull)); return false; }
    if (!wallet.spend(k.price, { name: BK_TEXT[kind], at: interior?.store.name })) { shop.toast(fmt(L(BK_TEXT.poor), { n: k.price })); return false; }
    refreshWallet();
    bag.add(entry);
    sfx.pop?.();
    clerk && say(clerk, $('labels'), ['잘 만들었어요!', 'jal mandeureosseoyo!', 'Beautiful!']);
    shop.toast(fmt(L(BK_TEXT.made), { icon: k.icon, name: entry.name }));
    return true;
  },
});
function takeView(v) {
  me.play('wave');
  sfx.pop?.();
  const c = viewBook.take(v.n);
  if (c) {
    wallet.add(c, { name: BK_TEXT.ledger });
    refreshWallet();
    shop.toast(fmt(L(BK_TEXT.got), { n: v.n, name: L(v.name), c }));
    if (viewBook.done && BUKCHON.views.length > 1) setTimeout(() => shop.toast(L(BK_TEXT.allDone)), 1600);
  } else shop.toast(fmt(L(BK_TEXT.again), { n: v.n }));
  bukchonMarks?.taken(viewBook);
  bukchonUi.views(viewBook, v.n);
  action = STALE;
}
function readPart(part) {
  bukchonUi.card(part);
  if (partBook.read(part.id)) {
    wallet.add(EXPLORER_REWARD, { name: BK_TEXT.explorerLedger });
    refreshWallet();
    setTimeout(() => shop.toast(fmt(L(BK_TEXT.explorer), { c: EXPLORER_REWARD })), 500);
  }
}
function bukchonAct(p) {
  if (!bukchonAt || mode !== 'street') return null;
  const v = nearestAt(BUKCHON.views, p.x, p.z, bukchonAt, 2.4);
  if (v) return { key: 'bk-view:' + v.n, label: '📸 ' + fmt(L(BK_TEXT.photo), { name: L(v.name) }), run: () => takeView(v) };
  const oh = BUKCHON.openHouse;
  const part = nearestAt(oh.parts, p.x, p.z, bukchonAt, 2.2);
  if (part) return { key: 'bk-part:' + part.id, label: part.icon + ' ' + L(part.name), run: () => readPart(part) };
  if (nearestAt([oh.tree], p.x, p.z, bukchonAt, 3.2)) return { key: 'bk-magpie', label: oh.tree.icon + ' ' + L(oh.tree.name), run: () => bukchonUi.card(oh.tree) };
  return null;
}
const inQuietZone = (p) => !!bukchonAt && mode === 'street' && inPolygonXZ(p.x - bukchonAt[0], p.z - bukchonAt[1], BUKCHON.quiet);
let quietWas = false, shhAt = 0;
// In the Quiet Zone: walking only. Rides get parked, running turns into a walk.
function updateQuiet(p, moving) {
  const q = inQuietZone(p);
  if (q && !quietWas) shop.toast(L(BK_TEXT.quiet));
  if (q && riding && riding !== 3) { setRiding(false); shop.toast(L(BK_TEXT.noRide)); }
  if (q && moving && input.run && performance.now() - shhAt > 9000) { shhAt = performance.now(); showBubble(myLabel, $('labels'), '🤫'); shop.toast(L(BK_TEXT.shh)); }
  quietWas = q;
  return q;
}
// Jongmyo Shrine and Seosunra-gil (data/jongmyo.js): the guide and the
// grandpas, the stone path's manners (keep off the spirits' middle strip),
// and the ritual dance on Jeongjeon's terrace (core/jongmyo-show.js).
const jongmyoAt = (region.districts || []).find((d) => d.id === JONGMYO.district)?.offset || null;
const jongmyoShow = jongmyoAt ? new JongmyoShow(scene, jongmyoAt, $('labels')) : null;
const jongmyoBook = new JongmyoBook();
const JM_TEXT = {
  ask: { en: 'Ask the guide', ko: '해설사에게 묻기', ja: '解説員に聞く', zh: '问讲解员' },
  hi: { en: 'Say hi to the grandpas', ko: '어르신께 인사하기', ja: 'おじいさんにあいさつ', zh: '和老爷爷打招呼' },
  sindo: { en: '🛤️ The raised middle strip is the spirits\' path (sindo). Please walk on a side strip.', ko: '🛤️ 가운데 높은 길은 혼령이 다니는 신도예요. 양옆 길로 걸어 주세요.', ja: '🛤️ 中央の高い道は霊の通る神道です。両脇の道を歩いてください。', zh: '🛤️ 中间高起的是神灵走的神道，请走两侧的路。' },
  manners: { en: '🙇 You walked the stone path the right way, off the spirits\' strip! (+🪙 {c})', ko: '🙇 혼령의 길을 밟지 않고 돌길을 바르게 걸었어요! (+🪙 {c})', ja: '🙇 霊の道を踏まずに石畳を正しく歩きました！（+🪙 {c}）', zh: '🙇 没有踩神灵的路，正确地走完了石路！（+🪙 {c}）' },
  mannersLedger: { en: 'Jongmyo manners', ko: '종묘 예절', ja: '宗廟のマナー', zh: '宗庙礼仪' },
  rite: { en: '🥁 You watched the ilmu, the ritual dance of Jongmyo Jeryeak. (+🪙 {c})', ko: '🥁 종묘제례악의 일무를 끝까지 지켜봤어요. (+🪙 {c})', ja: '🥁 宗廟祭礼楽の佾舞を見届けました。（+🪙 {c}）', zh: '🥁 看完了宗庙祭礼乐的佾舞。（+🪙 {c}）' },
  riteLedger: { en: 'Jongmyo Jeryeak', ko: '종묘제례악 관람', ja: '宗廟祭礼楽の観覧', zh: '观看宗庙祭礼乐' },
};
let jmCard = 0, jmSindoAt = 0, jmWatch = 0, jmWelcomed = false, jmWasIn = null;
function jongmyoCard(item, sub = '') {
  bukchonUi.card(item, { sub });
  bukchonUi.view = 'jm';
}
function jongmyoAct(p) {
  if (!jongmyoShow || mode !== 'street') return null;
  if (jongmyoShow.nearGuide(p.x, p.z)) return { key: 'jm-guide', label: 'ℹ️ ' + L(JM_TEXT.ask), run: () => {
    jongmyoShow.greetGuide(p.x, p.z);
    const c = JONGMYO.guideCards[jmCard++ % JONGMYO.guideCards.length];
    jongmyoCard(c, `${(jmCard - 1) % JONGMYO.guideCards.length + 1} / ${JONGMYO.guideCards.length}`);
  } };
  const e = jongmyoShow.nearElder(p.x, p.z);
  if (e) return { key: 'jm-elder:' + e.home.x, label: '👴 ' + L(JM_TEXT.hi), run: () => jongmyoShow.greetElder(e, p.x, p.z) };
  return null;
}
// Each frame on the street: the walk through the gate, the stone path, the rite.
function updateJongmyo(p, dt) {
  if (!jongmyoAt) return;
  const x = p.x - jongmyoAt[0], z = p.z - jongmyoAt[1];
  const inside = inBox(x, z, JONGMYO.wall);
  if (inside && jmWasIn === false) { // walked in through Oedaemun
    jongmyoBook.enter();
    if (!jmWelcomed && mode === 'street' && !spaceBusy()) {
      jmWelcomed = true;
      const w = JONGMYO.welcome;
      jongmyoCard({ icon: '🏛️', name: w.title, text: w.text }, '🛤️ ' + L(w.rules));
    }
  }
  jmWasIn = inside;
  if (!inside) { jmWatch = 0; return; }
  if (onSamdo(x, z) === 'sindo') {
    jongmyoBook.step();
    if (performance.now() - jmSindoAt > 15000) { jmSindoAt = performance.now(); shop.toast(L(JM_TEXT.sindo)); }
  }
  if (inBox(x, z, JONGMYO.jeongjeon.woldae)) {
    const c = jongmyoBook.arrive();
    if (c) { wallet.add(c, { name: JM_TEXT.mannersLedger }); refreshWallet(); me.play('bow'); shop.toast(fmt(L(JM_TEXT.manners), { c })); }
  }
  if (jongmyoShow.watching(p.x, p.z) && !jongmyoBook.rite) {
    if ((jmWatch += dt) >= RITE_WATCH) {
      const c = jongmyoBook.watched();
      if (c) { wallet.add(c, { name: JM_TEXT.riteLedger }); refreshWallet(); me.play('clap'); shop.toast(fmt(L(JM_TEXT.rite), { c })); }
    }
  } else jmWatch = 0;
}
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
const trailLog = new TrailLog();
const stampUi = new StampUI({ root: $('stamp-panel'), book: stampBook, stamps: () => tourStamps, trails: TRAILS, trailLog });
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
    // The last stamp of a course (e.g. the City Wall Trail) pays its reward once.
    for (const tr of trailsWith(TRAILS, s.id)) {
      if (!trailProgress(tr, tourStamps, stampBook).done || !trailLog.finish(tr.id)) continue;
      const tname = {};
      for (const l of ['ko', 'en', 'ja', 'zh']) tname[l] = fmt(STAMP_TEXT.trailLedger[l], { name: tr.name[l] });
      wallet.add(tr.reward, { name: tname });
      setTimeout(() => { shop.toast(tr.icon + ' ' + fmt(L(STAMP_TEXT.trailDone), { name: L(tr.name), c: tr.reward })); sfx.cheer?.(); }, 1400);
    }
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

// Delivery runs from the tteokbokki stall. (game/delivery.js)
const deliveryGame = createDelivery({
  get interior() { return interior; }, get me() { return me; }, get mode() { return mode; }, $, leaveStore,
  missionEvent, roadGraph, setGuide, shifts, shop, storefronts, wallet,
});
const { deliveryArrived, startDelivery, updateDelivery } = deliveryGame;
// Beauty shops (core/beauty.js): sit in front of the big mirror (salon,
// lens shop, lip shop) or lie on a clinic bed, try options on, pay coins to
// keep them. A clinic sends you through surgery first.
const beautyUi = new BeautyUI({
  root: $('beauty-panel'),
  onPreview: (look) => setLook(beautyUi.kind === 'salon' ? { ...look, head: null } : look), // salon: hat off to see the hair
  onSave: (look, cost) => {
    if (beauty.surgery || beauty.haircut) return false; // one at a time: no paying twice
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
const showAd = rewardedShow(config.rewardedAd, demoAd($('ad-overlay'), $('ad-count'), $('ad-close')));
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
// Budget book. (ui/ledger-ui.js)
createLedger({ $, wallet });
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
  // another-seoul.com/?adtest: say whether Google's ad or the demo ran.
  if (new URLSearchParams(location.search).has('adtest') && showAd.last) {
    const l = showAd.last;
    shop.toast(`Google ad: ${l.google}${l.why ? ` (${l.why})` : ''}${l.demo ? ' → demo shown' : ''}`);
  }
};

// Daily check-in and today's three missions. (game/daily.js)
const dailyGame = createDaily({
  get daily() { return daily; }, set daily(v) { daily = v; }, get mode() { return mode; }, $, leaveStore,
  npcs, setGuide, storefronts, wallet, zones,
});
const { renderDaily } = dailyGame;
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

// Hat workshop: shape, colour and patch. (game/hat-workshop.js)
const hatWorkshop = createHatWorkshop({
  get myLook() { return myLook; }, set myLook(v) { myLook = v; }, get me() { return me; }, $, cam, setLook,
  shop,
});
const { closeHatWorkshop, openHatWorkshop } = hatWorkshop;
// Café seats. Sitting snaps you onto the chair facing the table; moving or
// tapping Stand puts you back beside it. Others see it through the "sit" flag.
let seated = null;
function nearestSeat(p) {
  let best = null, bd = 1.3;
  for (const s of (mode === 'street' ? streetSeats : interior?.seats) || []) {
    const d = Math.hypot(p.x - s.x, p.z - s.z);
    const dd = d - (s.reach || 0); // (stands: sit from the deck in front of them)
    if (dd < bd && !others.seatTaken?.(s.x, s.z)) { bd = dd; best = s; }
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
const npcAct = (n, p) => ({ key: 'npc:' + n.name, label: '👋 ' + t('npc.hi', { name: n.name }), run: () => { (n.owner || npcs).greet(n, p.x, p.z); missionEvent('talk', n.name); } });
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
    const bkc = bukchonAct(p); if (bkc) out.push(bkc);
    const jmc = jongmyoAct(p); if (jmc) out.push(jmc);
    const bs = !seated && nearestSeat(p); if (bs) out.push(sitAct(bs));
    if (bs?.mat) out.push(matSitAct(bs));
    const pm = !seated && picnic.action(p); if (pm) out.push(pm);
    const ic = sculptureNear(map.landmarks, p.x, p.z); if (ic) out.push(sculptureAct(ic));
    if (muralSpot(p)) out.push(muralAct());
    if (wishSpot(p)) out.push(wishAct());
    const bk = busking.nearBusker(p.x, p.z); if (bk) out.push(buskerAct(bk));
    const n = npcs.nearest(p.x, p.z) || hanbokNpcs?.nearest(p.x, p.z); if (n) out.push(npcAct(n, p));
    return out;
  }
  if (!interior || seated || beauty.surgery || ride || decorGame.decor?.editing) return out;
  if (interior.pool) { out.push(...poolMore(p)); if (pool.mode) return out; } // (racing or diving: only the pool's buttons)
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
    if (basketball.basketShot) next = null; // mid-shot
    else if (poop) next = { key: 'poop:' + poop.id, label: '🧻 ' + t('pet.clean'), run: () => cleanPoop(poop) };
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
    else if (!riding && bukchonAct(p)) next = bukchonAct(p);
    else if (!riding && jongmyoAct(p)) next = jongmyoAct(p);
    else if (seated?.street) next = { key: 'stand', label: '🧍 ' + t('shop.stand'), run: () => standUp() }; // a park bench
    else if (!riding && nearestSeat(p)) next = sitAct(nearestSeat(p));
    else if (!riding && picnic.action(p)) next = picnic.action(p); // a picnic mat on the park lawn
    else if (!riding && sculptureNear(map.landmarks, p.x, p.z)) next = sculptureAct(sculptureNear(map.landmarks, p.x, p.z));
    else if (!riding && muralSpot(p)) next = muralAct();
    else if (!riding && wishSpot(p)) next = wishAct();
    else if (!riding && !seated && nearCourt(p) && !basketUi.open) next = { key: 'basket', label: '🏀 ' + BL('open'), run: () => basketUi.show() };
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
      const n = npcs.nearest(p.x, p.z) || hanbokNpcs?.nearest(p.x, p.z);
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
    } else if (decorGame.decor?.editing) {
      // decorate mode: walk up to a piece to rotate, move or remove it
      const it = nearestPiece(p);
      if (decorGame.decor.carry) next = { key: 'put-down', label: '📍 ' + t('home.putDown'), run: () => { putDown(); closePiece(); } };
      else if (it) next = { key: 'piece:' + decorGame.decor.items.indexOf(it), label: '✋ ' + localName(furnitureById(it.id).name, getLanguage()), run: () => openPiece(it) };
      else if (!decorGame.decor.picked) closePiece();
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
    } else if (interior.pool && !seated && poolAction(p)) {
      next = poolAction(p);
    } else if (seated) {
      next = { key: 'stand', label: '🧍 ' + t('shop.stand'), run: () => standUp() };
    } else if (nearStation(p, 'runway', 1.6) && !runwayUi.open) {
      next = { key: 'runway', label: '👠 ' + L(RUNWAY_TEXT.open), run: () => {
        const st = interior.stations.runway[0];
        me.root.position.set(st.x, 0, st.z); me.root.rotation.y = st.ry;
        runwayUi.show();
      } };
    } else if (nearStation(p, 'karaoke')) {
      next = { key: 'karaoke', label: '🎤 ' + t('game.karaoke'), run: () => karaokeUi.show() };
    } else if (nearStation(p, 'photo', 2.2)) {
      const kind = interior.store.workshop;
      next = { key: 'photo', label: '📸 ' + t(kind === 'photo1' ? 'game.photo1' : kind === 'photobw' ? 'game.photobw' : 'game.photo'), run: () => photoUi.show(kind) };
    } else if (nearStation(p, 'academy', 1.8)) {
      next = { key: 'academy', label: '🏫 ' + L(ACADEMY_OPEN), run: () => academyUi.show() };
    } else if (interior.stations?.lift && Math.hypot(p.x - interior.stations.lift.x, p.z - interior.stations.lift.z) < 1.6) {
      next = { key: 'lift', label: '🛗 ' + L(MUSEUM_TEXT.lift), run: () => museumUi.showLift(floorOf(interior.store), goMuseumFloor, interior.store.category === 'memorial' ? memorialFloors() : undefined) };
    } else if (nearStation(p, 'flower', 1.3)) {
      next = { key: 'flower', label: '💐 ' + L(MEMORIAL_TEXT.flower), run: () => layMemorialFlower() };
    } else if (nearestPainting(interior.stations?.panels, p.x, p.z, 2)) {
      const pn = nearestPainting(interior.stations.panels, p.x, p.z, 2).painting;
      next = { key: 'panel:' + pn.kind, label: `📖 ${L(MEMORIAL_TEXT.read)} · ${localName(pn.title, getLanguage())}`, run: () => museumUi.showText(pn) };
    } else if (nearestPainting(interior.stations?.paintings, p.x, p.z)) {
      const pt = nearestPainting(interior.stations.paintings, p.x, p.z).painting;
      next = { key: 'painting:' + pt.id, label: `${pt.credit ? '📷' : '🖼️'} ${L(pt.credit ? MEMORIAL_TEXT.look : MUSEUM_TEXT.look)} · ${pt.credit ? localName(pt.title, getLanguage()) : getLanguage() === 'ko' ? pt.title.ko : pt.title.en}`, run: () => museumUi.show(pt) };
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
    } else if (CRAFT[interior.store.craft] && clerk && !seated && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      const kind = interior.store.craft;
      next = { key: 'craft:' + kind, label: `${CRAFT[kind].icon} ${L(BK_TEXT[kind])} · 🪙 ${CRAFT[kind].price}`, run: () => { clerk.ch.wave(); bukchonUi.craft(kind); } };
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
    } else if (clubs.clubState && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 4.5) {
      next = { key: 'club', label: '🎧 ' + L(CLUB_TEXT.open), run: () => openClubPanel() };
    } else if (clubs.clubState && !seated) { // anywhere on the club floor: dance to the beat
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
      next = { key: 'clerk', label: '👋 ' + t('npc.hi', { name: clerk.name }), run: () => { clerk.ch.wave(); const lines = PHRASES[['library', 'school', 'museum', 'memorial', 'culture'].includes(interior?.store.category) ? interior.store.category : 'shop']; say(clerk, $('labels'), lines[Math.floor(Math.random() * lines.length)]); } };
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
  if (dancing && (mag > 0.3 || !clubs.clubState)) { dancing = false; action = STALE; }
  if (busking.performing && (mag > 0.3 || mode !== 'street' || riding || !busking.stageAt(p.x, p.z))) stopBusking();
  me.activity(currentActivity());
  fishRig.update(dt, me);
  updatePeerRigs(dt);
  if (me.activityName === 'read' && !myLabel.bubble) showBubble(myLabel, $('labels'), t('book.reading'), 3000);
  if (autoWalk && mag > 0.05) setAutoWalk(false); // the player took over
  const steady = steadyWalk && !riding;
  const quiet = updateQuiet(p, mag > 0.05 || !!autoWalk);
  const running = updateStamina(dt, input.run && !riding && !steadyWalk && !quiet, mag > 0.05 && !seated);
  if (mag > 0.05 && !seated && !ride && !cable && riding !== 3 && !(runwayUi.walking && mode === 'store')) {
    walkedFor += dt;
    if (walkedFor > 0.8) dismissHelp();
    const inStore = mode === 'store';
    const walkPace = steady ? (inStore ? STORE_STEADY : STEADY) : (inStore ? STORE_WALK : WALK);
    const speed = (riding ? rideSpeed() : (running ? (inStore ? STORE_RUN : RUN) : walkPace) * gymLog.boost) * Math.min(1, mag) * wxSpeed() * pool.slow; // (slower in the pool's water)
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
    const running = updateStamina(dt, input.run && !riding && !steadyWalk && !quiet, true);
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
  } else if (runwayUi.walking && mode === 'store') {
    speed01 = THREE.MathUtils.lerp(speed01, runwayStep(p, dt), Math.min(1, dt * 10));
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
  else camera.lookAt(p.x, p.y + (hatWorkshop.hatDraft || beauty.beautyCam ? 0.05 : 1.1), p.z); // workshop: character sits above the panel
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
  if (bukchonUi.open && (bukchonUi.view === 'jm' ? mode !== 'street' : bukchonUi.view === 'welcome' ? mode !== 'street' || !bukchonIn(p.x, p.z) : bukchonUi.view?.startsWith('craft:') ? mode !== 'store' : mode !== 'street' || !bukchonAct(p))) bukchonUi.close();
  if (interior?.turntable && music.on) interior.turntable.platter.rotation.y -= dt * 3.5; // 33⅓ rpm
  if (mode === 'store' && interior?.animate) interior.animate(dt, clubPulse()); // club lights, candles, the subway train
  if (mode === 'store') interior?.dartPins?.update(); // old darts come out of the wall boards
  basketTick(dt, p); // a basketball move places you
  skateTick(dt, p);
  if (riding !== 3 && !seated) updateSubway(dt, p, px0, pz0);
  if (mode === 'store' && interior?.floorAt && !cable && !seated) p.y = interior.floorAt(p.x, p.z); // the summit plaza is up the hill
  poolTick(dt, p, mag); // Olympic Park Pool: the water, a race, a dive
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
    if (tarot.myTicket && interior?.store.workshop === 'tarot') st.tq = tarot.myTicket; // our place in the tarot café line
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
  if (mode === 'street') { updateEnclosures(p, dt); palaceShow?.update(dt, p, camera, w, h, placeLabels); jongmyoShow?.update(dt, p, camera, w, h, placeLabels); updateJongmyo(p, dt); npcs.update(dt, camera, w, h); hanbokNpcs?.update(dt, camera, w, h); if (busking.update(dt, p, camera, w, h, placeLabels) === 'tip') buskTip(); }
  else {
    busking.hideLabels(); palaceShow?.hideLabels(); jongmyoShow?.hideLabels();
    if (clerk) { clerk.ch.animate(dt, interior?.store.clerkRoams ? roamClerk(dt, p) : 0); placeLabels(clerk, camera, w, h); }
    for (const o of [trainer, barkeep, areaGuide, ...(interior?.readerNpcs || []), ...(interior?.vendorNpcs || [])]) if (o) { o.ch.animate(dt, 0); placeLabels(o, camera, w, h); }
    if (interior?.vendorNpcs) greetAtStalls(p);
    for (const o of interior?.audienceNpcs || []) o.ch.animate(dt, 0); // (sitting: their 'sit' activity)
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
    chatState: () => ({ privateChannel: !!net?.chatReady, user: !!cloud.user, guest: !!cloud.guest }),
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
    tarot: () => ({ seats: interior?.seats?.map((s) => [s.x, s.z, s.table ?? null, !!s.wait]), turn: tarot.tarotTurn, ticket: tarot.myTicket, readers: 1 + (interior?.readerNpcs?.length || 0), offer: tarotUi.offer && { ...tarotUi.offer }, state: tarotUi.state && { topic: tarotUi.state.topic, picked: [...tarotUi.state.picked], pair: tarotUi.state.pair && { ...tarotUi.state.pair } } }),
    bone: (n) => { const b = me.root.getObjectByName(n); if (!b) return null; const v = b.getWorldPosition(new THREE.Vector3()); me.root.worldToLocal(v); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; },
    bookShelf: () => bookUi.showShelf(),
    readBook: (id, page = 0) => { bookPages[id] = page; bookUi.read(id); },
    action: () => action?.label || null,
    choices: () => action?.opts?.map((o) => o.label) || null,
    clerkAt: () => (clerk ? [clerk.ch.root.position.x, clerk.ch.root.position.z] : null),
    productsAt: () => interior?.products?.map((pr) => [pr.pos.x, pr.pos.z]) ?? null,
    act: () => action?.run(),
    pick: (i) => (action?.opts ? action.opts[i] : action)?.run(),
    room: () => ({ mode, id: interior?.store?.id ?? null, front: interior?.front?.store?.id ?? null }),
    dartPins: () => [...(interior?.dartPins?.byWho.values() || [])].map((e) => [e.board, e.color, e.pins.length]),
    decor: () => decorGame.decor?.items.length ?? -1,
    bikes: () => bikeStations.items.map((b) => [b.x, b.z]),
    riding: () => riding,
    cam: (o) => Object.assign(cam, o),
    renderInfo: () => { let tris = 0; scene.traverseVisible((o) => { if (o.isMesh && o.geometry) { const g = o.geometry; const n = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += n * (o.isInstancedMesh ? o.count : 1); } }); return { calls: renderer.info.render.calls, frameTris: renderer.info.render.triangles, sceneTris: Math.round(tris), geometries: renderer.info.memory.geometries }; },
    ride: (k) => startRide(k),
    place: (x, z) => me.root.position.set(x, 0, z),
    look: () => currentLook,
    camPos: () => camera.position.toArray().map((v) => +v.toFixed(2)),
    mirror: () => { Object.assign(cam, { dist: 2.6, pitch: 0.12 }); me.root.rotation.y = cam.yaw; }, // close-up, facing the camera
    pets: () => interior?.pets?.list.map((p) => [p.name, p.state, +p.root.position.x.toFixed(2), +p.root.position.z.toFixed(2)]) ?? null,
    npcs: () => npcs.list.map((o) => [o.name, o.ch.root.position.x, o.ch.root.position.z, o.zone]),
    peers: () => [...others.players.values()].map((p) => ({ name: p.name, model: p.model, ...p.target, x: p.ch.root.position.x, z: p.ch.root.position.z, pet: p.pet ? { id: p.pet.id, x: p.pet.root.position.x, z: p.pet.root.position.z, visible: p.pet.root.visible } : null })),
    goto: (x, z, ry = 0) => moveMeTo(activeScene, x, z, ry),
    skate: () => ({ in: inSkate, y: +skateY.toFixed(2), air: skater.air, grind: !!skater.grind, combo: skater.comboPts, riding, type: garage.current.type, at: [+me.root.position.x.toFixed(1), +me.root.position.z.toFixed(1)], ry: +me.root.rotation.y.toFixed(2) }),
    poolBoard: () => interior?.boardCanvas?.toDataURL(),
    pool: () => ({ act: pool.act, mode: pool.mode?.kind || null, y: +me.root.position.y.toFixed(2), at: [+me.root.position.x.toFixed(1), +me.root.position.z.toFixed(1)], swim: wearingSwim(), tube: pool.tube, race: pool.mode?.race ? { t: +pool.mode.race.t.toFixed(2), x: +pool.mode.race.x.toFixed(1), v: +pool.mode.race.v.toFixed(2), done: pool.mode.race.done } : null, log: { ...poolLog.s } }),
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
    royal: () => palaceShow?.royalSpot() ?? null, // where the royal procession is
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
    delivery: () => deliveryGame.delivery && { ...deliveryGame.delivery, left: (deliveryGame.delivery.until - performance.now()) / 1000 },
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
