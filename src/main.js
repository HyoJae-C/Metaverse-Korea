import { haptics, buzz, shake } from './core/haptics.js';
import { RodSkins, rodKind, rodSkin } from './core/rod-skins.js';
import * as THREE from 'three';
import {
  t, setLanguage, getSavedLanguage, getLanguage, onLanguageChange, localName, loadLanguage,
} from './core/i18n.js';
import { REGION_NAMES } from './i18n/languages.js';
import { renderLangList, renderLangDropdown } from './ui/lang-picker.js';
import {
  ID_TEXT, LOGIN_TEXT, OPERATOR_TEXT, RESERVED_TEXT, ONBOARD_TEXT, DRINK_TEXT, HOME_TEXT, GOODS_TEXT, PERFUME_TEXT, UMB_TEXT, CODE_TEXT, OUTFIT_TEXT, HAUNT_TEXT, HONK_TEXT, VENDING_TEXT, FIRST_TAXI_TEXT, LOW_TEXT, CHOOSER_TEXT, INGREDIENT_TEXT, MART_TEXT, DANCE_TEXT, PALACE_TEXT, PUNGMUL_TEXT, JM_TEXT, BOOK_SWAP_TEXT, BOOK_SIT_TEXT, COASTER_TEXT, DRONE_TEXT, FIREWORKS_TEXT, ADOPT_TEXT,
} from './i18n/game-text.js';
import { loadRegionMap, districtBoxes, districtAt, placeOf } from './core/districts.js';
import { createGraphicsQuality } from './core/graphics-quality.js';
import { SquareQuests, QUEST_REWARD, STARTER, STARTER_REWARD, tripOf } from './core/quests.js';
import { STARTER_TEXT, TRIP_TEXT, BUKCHON_TRIP_CARD, ROUTE_TIP } from './data/starter-quests.js';
import { startList, startSpot, firstStopSpot, busiestStart, askCrowds, savedStart, saveStart, ANY } from './game/first-stop.js';
import { HighFives, hi5Msg, parseHi5, crowdBonus, TOGETHER_COINS, TOGETHER_RADIUS } from './core/together.js';
import { Billboard } from './core/billboard.js';
import { WallScreen, wallNear } from './core/wall-screen.js';
import { LocalBoard, SupabaseBoard } from './core/board.js';
import { makeNoticeBoard, makeNewTag } from './core/notice-board-model.js';
import { noticeBoardSpots } from './core/notice-board-spots.js';
import { useGoldCoins } from './ui/gold-coin.js';
useGoldCoins(); // 🪙 shows as a gold coin everywhere
import { BoardUI, BOARD_TEXT } from './ui/board-ui.js';
import { buildWorld, COLORS, onAnyRoad } from './core/world.js';
import { buildLandmarks } from './core/landmarks.js';
import { lakeHoles } from './core/lakeshore.js';
import { setParkSignsLang } from './core/park-signs.js';
import { benchSeats, sculptureNear, hillY, ICECREAM, ICECREAM_TEXT } from './core/park-art.js';
import { yardY } from './core/cathedral-yard-ground.js';
import { splitInstances } from './core/split-instances.js';
import { FarPeople } from './core/far-people.js';
import { buildStreams, streetBlockers as streamStreetBlockers, lowBlockers as streamLowBlockers, holesOf as streamHoles, streamAt, edgeSeats, streamUV } from './core/stream.js';
import { styleNameTag, EmblemCollection, RENAME_COST } from './core/emblems.js';
import { showInfoHint, INFO_TEXT, AREA } from './ui/info-labels.js'; // (the guides' panel, ui/info-ui.js, loads when asked)
import { SaunaLog } from './core/sauna.js';
import { DayPasses, DAY_PASS_TEXT } from './core/day-pass.js';
import { RideTickets } from './core/ride-tickets.js';
import { GymLog, TRAINER_NAME, TRAINER_LINES, nextTrainerLine } from './core/gym.js';
import { INSTRUCTOR_NAME, INSTRUCTOR_LINES, nextInstructorLine, classPose, YOGA_FLOW } from './core/studio.js';
import { saveLastSpot, loadLastSpot, usableSpot, saveLastPlace, loadLastPlace, onMap } from './core/respawn.js';
import { updateFarTextures } from './core/far-textures.js';
import { bookById } from './core/books.js';
import { FoodDex, isFood, allFoods } from './core/food-dex.js';
import { DexUI, DEX_TEXT } from './ui/dex-ui.js';
import { STAMPS } from './data/stamps.js';
import { StampBook, availableStamps, STAMP_REWARD } from './core/stamp-book.js';
import { TRAILS } from './data/trails.js';
import { TrailLog, trailProgress, trailsWith } from './core/trails.js';
import { StampStands } from './core/stamp-stands.js';
import { StampUI, STAMP_TEXT } from './ui/stamp-ui.js';
import { FAN_AT, FAN_KEEP, FAN_NOTE, ringPoly } from './core/palace-fan.js';
import { createPalaceView } from './game/palace-view.js';
import { createTowerLook } from './game/tower-look.js';
import { JongmyoShow } from './core/jongmyo-show.js';
import { PungmulTroupe, PLAZA_SPOT } from './core/pungmul.js';
import { JONGMYO, JongmyoBook, onSamdo, offSindo, inBox, RITE_WATCH } from './data/jongmyo.js';
import { BOSINGAK, BOSINGAK_TEXT, BOSINGAK_CARD, newYearRinging, nearBell, strikeBell, bellGain } from './data/bosingak.js';
import { BosingakShow } from './core/bosingak-show.js';
import { RIDES as PARK_RIDES, DROP_T, RIDE_PRICE, RIDE_PASS, RIDE_CYCLE, canBoard, ridePhase, rideLocked, rideUntil, seatAt, wheelBottom, wheelDoorOpen, COASTER_NAME, RIDE_NAME, RIDE_EMOJI, PARK_UNIFORM } from './core/park-rides.js';
import { createRideCam } from './game/ride-cam.js';
import { createFirstPerson } from './game/first-person.js';
import { createTouchSteer } from './game/touch-steer.js';
import { createFollowCam } from './game/follow-cam.js';
import { createParkRiders } from './game/park-riders.js';
import { boarding, frameAt, rideEnds, rideFx, seatPose, trainAt, LENGTH, TRAINS, OFF as COASTER_OFF, SEATS as COASTER_SEATS, S_AIR, S_LOOP, S_LOOP_TOP, S_TUNNEL } from './core/coaster.js';
import { CoasterFx } from './ui/coaster-fx.js';
import { createNamsanCable } from './game/namsan-cable.js';
import { LocalLoveLocks, SupabaseLoveLocks } from './core/love-locks.js';
import { LOCK_LABELS } from './ui/love-lock-labels.js';
import { WISH, WISHES, canFloat, encodeLantern, decodeLantern, lanternAt, muralSign, wishFrom, wishTo } from './core/lanterns.js';
import { WishUI, WISH_TEXT } from './ui/wish-ui.js';
import { BukchonUI, BK_TEXT, craftEntry, craftWear, CRAFT } from './ui/bukchon-ui.js';
import { BUKCHON, ViewBook, PartBook, EXPLORER_REWARD, inside as inPolygonXZ, nearestAt, ground as bukchonGround } from './data/bukchon.js';
import { Enclosure, FarCull } from './core/enclosure.js';
import { buildBukchonHill } from './core/bukchon-models.js';
import { buildHanoks } from './core/hanok.js';
import { BukchonMarks } from './core/bukchon-marks.js';
import { createCharacter } from './core/character.js';
import { createLookEditor, saveLook, loadLook } from './core/look-editor.js';
import { preloadModel } from './core/model-pack.js';
import { OUTFIT_ITEM, randomLook, DEFAULT_LOOK } from './data/appearance.js';
import { Receipts, sellable, resaleCoins } from './core/resale.js';
import { createUsedRack } from './game/used-rack.js';
import { CollisionMap, distSqToSeg, pointInPoly } from './core/collision.js';
import { Input } from './core/input.js';
import { RemotePlayers, showBubble, showBubbleEl } from './core/players.js';
import { createAreaNet } from './net/area.js';
import { claimTab } from './core/single-tab.js';
import { watchOnline } from './net/online.js';
import { sendRate } from './net/rate.js';
import { startWhereReports } from './net/where.js';
import { createCounts, createErrorSender, createFpsMeter, createVisit, deviceClass, firstSrc, someoneNear, STAGE, startSessionReports } from './core/sessions.js';
import { startUpdateCheck, watchMissingFiles } from './core/update-check.js';
import { showUpdateBanner } from './ui/update-banner.js';
import { config } from './config.js';
import { getEmote } from './data/emotes.js';
import { WeatherSystem, WET, weatherSpeed, darkness } from './core/weather.js';
import { coverScene, snowUniform } from './core/snow-cover.js';
import { watchWeather } from './core/weather-watch.js';
import { Storefronts, latLonToLocal as llToLocal } from './core/storefronts.js';
import { AdPosters } from './core/ad-posters.js';
import { Zones } from './core/zones.js';
import { interiorLoaded, loadInterior, warmInterior, roomKit } from './game/interior-loader.js';
import { createStoreDescs } from './game/store-descs.js'; // rooms: core/interior.js, loaded at the first door
import { isDining, coinPrice, foodIcon, FOOD_BITES, mealSync, parseBite } from './core/dining.js';
import { furnitureById } from './core/furniture.js';
import { ShopUI, Cart, coinsFor, goodsKind, itemSoon, shownStores } from './ui/shop-ui.js';
import { hanbokById, isHanbokModel } from './data/hanbok.js';
import { timeLeft, isRenting } from './core/hanbok-rental.js';
import { GiftBox, parseGift } from './core/gifts.js';
import { GiftUI, GIFT_TEXT } from './ui/gift-ui.js';
import { GrillUI } from './ui/grill-ui.js';
import { ML as MARKET_L } from './ui/kimchi-sell-ui.js';
import { BOSS_LINES } from './ui/market-text.js';
import { lazyPanel } from './core/lazy-panel.js'; // panels downloaded on first use
// (The classes' long texts load with the class: game/cooking-classes.js.)
import { KIMCHI_LABELS as KIMCHI_TEXT, JAPCHAE_LABELS as JAPCHAE_TEXT, KIMBAP_LABELS as KIMBAP_TEXT } from './ui/cooking-labels.js';
import { PochaUI, L, fmt } from './ui/pocha-ui.js';
import { Bag, giftEntry, isCosmetic } from './core/bag.js';
import { perfumeIndex, Scent, SPRAYS, STYLES, PUFF_NEAR, nextPuff, onSale } from './core/perfume.js';
import { ScentFx } from './core/scent-fx.js';
import { BagUI, BAG_TEXT } from './ui/bag-ui.js';
import { RUNWAY_STORE } from './core/runway-game.js';
import { RunwayLine, lineMsg, parseLineMsg, LINE_HI_S } from './core/runway-line.js';
import { WordFx, pickPerfect, GOOD_FX, WORDS as RUNWAY_WORDS, pickWord, wordColor, tierOf, runwayMsg, parseRunwayMsg, wobbleAt, WOBBLE_S } from './core/runway-fx.js';
import { poseKind, poseAt, POSE_S } from './core/runway-poses.js';
import { parseTarot } from './core/tarot-queue.js';
import { BuskingZones } from './core/busking.js';
import { createBuskingPlay } from './game/busking-play.js';
import { buskingGroundY } from './core/busking-layout.js';
import { parseRaceMsg } from './core/pool.js';
import { POOL_TEXT } from './data/pool-text.js';
import { DOME_TEXT, DOME_SHOUT, chantPhrase } from './data/dome-text.js';
import { BASKET_OPEN } from './ui/basketball-labels.js';
import { Skater, PARK_SPEED } from './core/skatepark.js';
import { dayKey } from './core/daily.js';
import { initInstall } from './ui/install-ui.js';
import { DuckUI } from './ui/duck-ui.js';
import { makeMascotHead } from './core/mascot.js';
import { UPDATES, updateText, hasNew as hasNewUpdate, newCount as newUpdates } from './data/updates.js';
import { droneShowAt, ALERT_SECONDS, LIFT_SECONDS } from './core/drone-show.js';
import { fireworksAt, nearYeouido, PHOTO_TIME as FIREWORKS_PHOTO, FINALE_TIME as FIREWORKS_FINALE, ALERT_SECONDS as FIREWORKS_ALERT, DUSK_SECONDS as FIREWORKS_DUSK } from './core/fireworks-show.js';
import { karaokeMsg, parseKaraoke } from './core/karaoke-game.js';
import { createDuckBoats } from './game/duck-boats.js';
import { createHanParks } from './game/han-parks.js';
import { createNightCarts } from './game/night-carts.js';
import { CART, CART_SPEED } from './game/zoo-carts.js';
import { createZooVisit } from './game/zoo-visit.js';
import { createZooSounds } from './game/zoo-sounds.js';
import { createRainbowFountain } from './game/rainbow-fountain.js';
import { parseDarts, parseDartsGo, parseDartPin } from './core/arcade.js';
import { DartPins } from './core/dart-pins.js';
import { JOB_TEXT, jobOf, shiftsLeft, takeShift, readShifts, writeShifts } from './core/jobs.js';
import { hiringTexture, drawHiring, wallPoster, doorSticker, assignSpots } from './core/hiring-ads.js';
import { supportTexture, pickSupportSpots } from './core/support-poster.js';
import { BeautyUI } from './ui/beauty-ui.js';
import { CounterUI, heldFor } from './ui/counter-ui.js';
import { BEAUTY_SHOPS, BEAUTY_ICON, isClinic } from './core/beauty.js';
import { KpopRoom } from './ui/kpop-room.js';
import { parseKpop } from './data/kpop.js';
import { parseFilm } from './data/films.js';
import { trophy, TROPHY_RARITY, catchBubble, showMs } from './ui/fishing-ui.js';
const fishPanels = () => import('./ui/fishing-panels.js'); // (the rod, market and book panels: on first use)
import { FishBag, FishDex, FishStats, FishPity, FISH, fishById, resetFishBookOnce } from './core/fishing.js';
import { createFishingRig } from './core/fishing-rig.js';
import { HELD_KINDS, COFFEE_SIPS, giftKind, SNACKS } from './core/held.js';
import { lipstickEntry } from './core/lipstick.js';
import { createLipstick } from './game/lipstick.js';
import { CloudSave } from './core/cloud-save.js';
import { Inventory, ITEMS, isWorn, parseTandem, tandemMsg } from './core/inventory.js';
import { closetKind, closetColor } from './core/closet.js';
import { RETIRED } from './data/wearables.js';
import { SEATS, seatPosition } from './core/bikes.js';
import { DISTRICT_NAME } from './ui/district-names.js';
import { Music, Sfx } from './core/music.js';
import { MotionSound, honkKind, honkMsg, parseHonk, hearGain } from './core/motion-sound.js';
import { SoundFiles } from './core/sound-files.js';
import { Garage, BIKE_MODELS, RIDE_ICON as VEHICLE_ICON, rideCode } from './core/bike-garage.js';
import { Wallet, demoAd, opIdFor, newOpId } from './core/wallet.js';
import { PROMOS } from './data/promos.js';
import { won } from './core/money.js';
import { loadH5Ads, rewardedShow } from './core/h5-ads.js';
import { mountSideAd, sideAdOn } from './core/side-ad.js';
import { Safety, filterText } from './core/safety.js';
import { Pets } from './core/pets.js';
import { SEA_STORE } from './core/zoo-rooms.js';
import { StreetNpcs, makeNpc, say, placeLabels, PHRASES } from './core/npcs.js';
import { RoadGraph, RouteLine } from './core/route.js';
import { cleanName, readIdentity, saveIdentity, isReservedName, isDefaultName, defaultNamePrefix, localDefaultName, renameState } from './core/identity.js';
import { customPetName, setPetName, PET_NAME_MAX } from './core/pet-names.js';
import { createPetCare, PET_NAME_TEXT, petName } from './game/pet-care.js';
import { createFrisbee, FRISBEE_TEXT, hasFrisbee } from './game/frisbee.js';
import { newFrisbee } from './core/frisbee.js';
import { createSubway } from './game/subway.js';
import { createNoBikeStairs } from './game/no-bike-stairs.js';
import { createRoomCache } from './game/room-cache.js';
import { createGpuJanitor } from './game/gpu-janitor.js';
import { createDining, DINE_TEXT } from './game/dining.js';
import { createPicnic, hasMat, MAT_TEXT } from './game/picnic.js';
import { SNOW_LABELS } from './game/snow-labels.js';
import { lawnFrom } from './core/picnic-mat.js';
import { parseSnowMsg } from './core/snowballs.js';
import { createBeauty } from './game/beauty.js';
import { NavGrid, nearestOnPoly, trimPoly, pointAhead } from './core/nav-grid.js';
import { LocalFriends } from './core/friends.js';
import { SubwayEntrances, VENDING_DRINKS, ROUTE_MAP_TEXT, ROUTE_MAP, loopOrder, gateAt, GATE_X, DOOR_Z, FARE, blockersOf, holeOf, footprintOf, toWorld, outsideOf, PIT } from './core/subway.js';
import { createBikeShop } from './ui/bike-shop-ui.js';
import { createPool } from './game/pool.js';
import { createTarot } from './game/tarot.js';
import { RINK_FENCE } from './core/bumper-cars.js';
import { createArcade } from './game/arcade.js';
import { createBasketball } from './game/basketball.js';
import { createFolkYard } from './game/folk-yard.js';
import { createBalloonClown, restoreBalloon, balloonKind } from './game/balloon-clown.js';
import { createParkTickets } from './game/park-tickets.js';
import { createMirrorMaze } from './game/mirror-maze.js';
import { createRideThrill, THRILL_RIDES } from './game/ride-thrill.js';
import { createSkate } from './game/skate.js';
import { createRoomTips } from './game/tips.js';
import { parseTaxi } from './core/taxi-share.js';
import { createDecor } from './game/decor.js';
import { createClubs } from './game/clubs.js';
import { createMusicCafe } from './game/music-cafe.js';
import { createListeningBar, LISTEN_TEXT, nearestStation } from './game/listening-bar.js';
import { createLiveStage } from './game/live-stage.js';
import { createHatWorkshop } from './game/hat-workshop.js';
import { createDelivery } from './game/delivery.js';
import { createChat } from './game/chat.js';
import { createGifts } from './game/gifts.js';
import { GiftReceipts } from './core/gift-receipts.js';
import { createBank } from './game/bank.js';
import { createHanbokRental } from './game/hanbok-rental.js';
import { createCookingClasses } from './game/cooking-classes.js';
import { createEmoteWheel } from './ui/emote-wheel.js';
import { createDaily } from './game/daily.js';
import { parseSkyMsg } from './game/sky-codes.js';
import { createLedger } from './ui/ledger-ui.js';
import { hillGround } from './core/hill-ground.js';
import { createNamsanWalk } from './game/namsan-walk.js';
import { createGyeongnidanNear } from './game/gyeongnidan-near.js';
import { createSeoulDalNear } from './game/seoul-dal-near.js';
import { createPotatoMarketNear } from './game/potato-market-near.js';
import { sunsetNote } from './game/sunset-spot.js';

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
// Problems are also counted for the operator's numbers once the cloud is up
// (see onProblem below); ones before that wait here.
let onProblem = null;
const earlyProblems = [];
function reportProblem(msg) {
  console.error('[mk]', msg);
  if (onProblem) onProblem(msg); else if (earlyProblems.length < 5) earlyProblems.push(msg);
  if (!errBox) {
    errBox = document.createElement('div');
    errBox.className = 'err-box';
    document.body.append(errBox);
  }
  // In words a player understands, in their language; the technical line
  // stays underneath, small, for a screenshot to the operator.
  const b = document.createElement('b'), small = document.createElement('small');
  b.textContent = '⚠️ ' + t('error.soft');
  small.textContent = String(msg).slice(0, 300);
  errBox.replaceChildren(b, small);
  errBox.hidden = false;
  clearTimeout(errBox.t);
  errBox.t = setTimeout(() => { errBox.hidden = true; }, 15000);
}
addEventListener('error', (e) => {
  const msg = `${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}:${e.colno}`;
  // Not our code: scripts an app's built-in browser (Threads, Instagram,
  // KakaoTalk…) or an extension puts into the page ("onReady is not defined")
  // and other sites' scripts ("Script error."). Counted, but no warning box:
  // the game is fine and the box made players think it was broken.
  if (!/\/(assets|src)\//.test(e.filename || '')) { console.warn('[mk] page script:', msg); onProblem?.('ext: ' + msg); return; }
  reportProblem(msg);
});
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
// The region list and region file start downloading now, while the cloud
// save is checked (up to 3 s when the save server can't be reached, as in
// mainland China). A failed download is tried twice more: on a shaky
// connection the first try is often the one that drops.
const getJson = async (url, tries = 3) => {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((ok) => setTimeout(ok, 800 * i));
    }
  }
};
const regionStart = getJson(`${BASE}regions/index.json`).then((index) => {
  // ?region= picks a region; an unknown id (an old ?region=seongsu link) falls back to the default.
  const asked = new URLSearchParams(location.search).get('region');
  const id = index.regions.some((r) => r.id === asked) ? asked : index.default;
  return getJson(`${BASE}regions/${id}/region.json`).then((region) => ({ index, id, region }));
});
regionStart.catch(() => {}); // awaited below; this only avoids an early "unhandled" note
await cloud.load();
// This play session's counts for the operator's retention numbers
// (core/sessions.js); the reports start once the world is up (see below).
const playCounts = createCounts();
// The loading funnel (core/sessions.js createVisit): page open → pressed
// Play → world loaded → a minute of play. (Test rooms run with ?debug,
// which has no cloud, so nothing is sent from them.)
let firstVisit = true;
try { firstVisit = !localStorage.getItem('mk.made'); } catch { /* storage blocked */ }
const visitDevice = deviceClass({ touch: navigator.maxTouchPoints > 0, width: screen.width, height: screen.height });
const visit = createVisit({
  send: (r) => cloud.reportVisit(r),
  isNew: firstVisit, device: visitDevice, src: firstSrc(location.search),
});
visit.reach(STAGE.OPEN);
// Errors: counted in the session and the message (digits removed, no
// account id) sent for the operator's error list, a few per visit.
const sendError = createErrorSender((m) => cloud.reportError(m));
onProblem = (msg) => { if (!msg.startsWith('ext: ')) playCounts.error(); sendError(msg); }; // ('ext: ' = not our code, see above)
for (const m of earlyProblems.splice(0)) onProblem(m);
// Country statistics for the operator page: a guess from the time zone,
// once a day per account (core/country.js). Loaded on the side; never waits.
if (cloud.user) import('./core/country.js').then(({ reportCountryOnce }) => reportCountryOnce({ uid: cloud.user.id, send: (g) => cloud.reportCountry(g) })).catch(() => {});

// ---------- Start screen ----------
const { id: regionId, region } = await regionStart;
// Realtime room name. Automated tests pass ?debug&room=<name> to get a private
// room, so real visitors on the live site never mix into a test.
const testRoom = new URLSearchParams(location.search).has('debug') && new URLSearchParams(location.search).get('room');
const roomId = testRoom ? `${regionId}~${testRoom.replace(/[^\w-]/g, '').slice(0, 32)}` : regionId;


// Coming back: where you left off (the district of the saved spot), not the
// first stop again. Only the very first visit says "First stop".
let lastPlace = loadLastPlace();
function refreshStartText() {
  const lang = getLanguage();
  const lastName = lastPlace && (localName(DISTRICT_NAME[lastPlace], lang) || lastPlace.charAt(0).toUpperCase() + lastPlace.slice(1));
  $('start-region').textContent = lastName ? t('start.last', { place: lastName }) : t('start.region', {
    region: localName(DISTRICT_NAME[firstStopSpot(region)?.district], lang) || localName(REGION_NAMES[regionId], lang) || localName(region.name, lang), // new players start in Bukchon unless they pick another start (region.json spawn.starts)
    city: localName(REGION_NAMES.seoul, lang),
  });
  const input = $('nickname');
  input.placeholder = t('start.defaultName');
  document.title = t('app.title');
}

// Only the saved language is downloaded (i18n/languages.js); wait for it so
// the start screen doesn't flash English first.
await loadLanguage(getSavedLanguage() || 'en');
setLanguage(getSavedLanguage() || 'en'); // English until you pick one
document.getElementById('boot-note')?.remove(); // index.html's "Loading…" line: the game is up
document.body.dataset.gameUp = '1'; // (boot.js stops drawing the language picker)
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
// A phone on a weak signal can drop one request ("Load failed"): try each
// file up to three times before giving up, so one hiccup doesn't stop the game.
const mapPromise = loadRegionMap(region, (file) => {
  const get = (tries) => fetch(`${BASE}regions/${regionId}/${file}`).then((r) => {
    if (r.status === 404) throw Object.assign(new Error('no map'), { code: 'noMap' });
    if (!r.ok) throw new Error('map ' + r.status);
    return r.json();
  }).catch((e) => (e.code === 'noMap' || tries <= 1 ? Promise.reject(e) : new Promise((ok) => setTimeout(ok, 1500)).then(() => get(tries - 1))));
  return get(3);
});
// And the player's character model, so it is ready when they walk in.
preloadModel(loadLook().model);

// Step 1: language → (guests: Google or guest?) → character + nickname.
// Name and character stay fixed for a while once chosen (core/identity.js).
let editor = null;
let identity = readIdentity();
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
  // New players pick where to start (game/first-stop.js): one tap, the first is on.
  const starts = startList(region);
  $('start-pick').hidden = returning || !starts.length;
  if (!returning && starts.length) {
    const keys = [...starts.map((it) => it.k), ANY];
    if (!keys.includes(startPick)) startPick = keys[0];
    $('start-pick-list').replaceChildren(...keys.map((k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(k === startPick));
      const ic = document.createElement('span');
      ic.className = 'ic';
      ic.textContent = k === ANY ? '🎲' : starts.find((it) => it.k === k).icon || '📍';
      b.append(ic, t('start.' + k));
      b.onclick = () => {
        startPick = k;
        for (const o of $('start-pick-list').children) o.setAttribute('aria-checked', String(o === b));
      };
      return b;
    }));
  }
}
let startPick = savedStart(); // where a new player starts (region.json spawn.starts, or ANY)
// Made a character already: go straight into town after the language (and
// login) step, with no name or clothes to pick (see startNow below).
let startNow = null;
const lookOrStart = () => (isReturning() && startNow ? startNow() : showLook());
$('next-btn').disabled = false; // (boot.js kept it off until now)
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
const seoulPromise = optionalJson('seoul.json'); // the gu overview on the map (scripts/build-seoul.mjs)

// A new player may name the friend who invited them (optional): the server
// pays that friend (supabase/025_referrals.sql). True once it was taken.
let referralSent = false;
await new Promise((resolve) => {
  // A new name must not be in use by someone else (checked on the server
  // when it is set up; see supabase/003_names.sql).
  let busy = false;
  // The friend's name: a name nobody has (or your own) stops here so it can
  // be fixed or cleared. Anything else (server not set up, offline, named
  // someone before) lets the player in without a word.
  const referral = async () => {
    const el = $('referrer');
    const who = cleanName(el.value).trim();
    if (isReturning() || !who) return true;
    busy = true;
    $('start-btn').disabled = true;
    const r = await cloud.claimReferral(who);
    busy = false;
    $('start-btn').disabled = false;
    if (r === 'nobody' || r === 'self') {
      $('status').textContent = t(r === 'self' ? 'referral.self' : 'referral.nobody');
      el.classList.add('bad');
      el.focus();
      return false;
    }
    if (r === 'ok') referralSent = true;
    el.value = '';
    return true;
  };
  const go = async () => {
    if (busy) return;
    const name = cleanName($('nickname').value).trim();
    if (isDefaultName(name)) {
      // No name (or just "여행자"): the server hands out the next number,
      // 여행자100, 여행자101, …, reserved for this account like any name.
      busy = true;
      $('start-btn').disabled = true;
      const prefix = defaultNamePrefix(t('start.defaultName'));
      const given = (await cloud.claimDefaultName(prefix)) || localDefaultName(prefix);
      busy = false;
      $('start-btn').disabled = false;
      $('nickname').value = given;
      if (isReturning()) {
        identity = { ...identity, name: given };
        saveIdentity(identity);
      }
      if (await referral()) resolve();
      return;
    }
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
    if (await referral()) resolve();
  };
  $('referrer').addEventListener('input', (e) => {
    if (!e.isComposing) { const v = cleanName(e.target.value); if (v !== e.target.value) e.target.value = v; }
    $('referrer').classList.remove('bad');
    if ([t('referral.self'), t('referral.nobody')].includes($('status').textContent)) $('status').textContent = '';
  });
  $('referrer').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.isComposing) go();
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
visit.reach(STAGE.PRESSED); // loading time counts from here
// Locked name/character win over whatever the form says; a new choice
// starts its lock.
// Costumes are bought now, so only the name is locked.
if (!isReturning()) {
  identity = { ...identity, name: cleanName($('nickname').value).trim(), nameAt: Date.now() };
  saveIdentity(identity);
}
try { localStorage.setItem('mk.made', '1'); } catch { /* ignore */ }
// Where a new player starts (until the welcome is done, a refresh too): the
// start they picked, or for "anywhere" the one with the most people near it
// right now (asked here, used once the map is up). Null: not new.
const startChoice = (() => {
  try {
    const v = localStorage.getItem('mk.onboard');
    if (v != null ? Number(v) >= 2 : !!loadLastSpot()) return Promise.resolve(null);
  } catch { return Promise.resolve(null); }
  const starts = startList(region), keys = starts.map((it) => it.k);
  if (!keys.length) return Promise.resolve(null);
  if (startPick !== ANY) { const k = keys.includes(startPick) ? startPick : keys[0]; saveStart(k); return Promise.resolve(k); }
  return (async () => {
    const zs = await zonesPromise; // a "square" start: the main square (zones.json's first zone)
    const sq = zs?.zones?.[0]?.at;
    const spots = keys.map((k) => { const sp = startSpot(region, k); return sp?.square ? { x: sq?.[0] ?? 0, z: sq?.[1] ?? 0 } : sp || { x: 0, z: 0 }; });
    const k = busiestStart(keys, await askCrowds(config.netProvider, config.net, spots));
    saveStart(k);
    return k;
  })();
})();
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
  visit.fail();
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
// Resolution, shadows and a 60 fps cap, lowered when the frame rate drops or
// with Battery saver in Settings (core/graphics-quality.js).
const SAVER_KEY = 'mk.batterySaver';
const gfx = createGraphicsQuality({ renderer, sun, capable: !lowSpec && !softwareGL, saver: (() => { try { return localStorage.getItem(SAVER_KEY) === '1'; } catch { return false; } })() });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

// Subway stations (region.json "subway.stations"): stair exits cut into the ground.
// In the order the trains run round them: one loop following the map (core/subway.js loopOrder).
const subwayStations = loopOrder((region.subway?.stations || []).filter((st) => st.exits?.length));
const allExits = subwayStations.flatMap((st) => st.exits);
// Sunken streams (map "streams", core/stream.js): on the street the channel is
// a wall that only bridges cross; down by the water you use streamCollision.
const streams = map.streams || [];
const streamWalls = streams.flatMap(streamStreetBlockers);
// Gyeongbokgung's fan dance (core/palace-show.js): an unseen ring round the
// dancers that you can't step inside, so the formation isn't broken (no
// fence in the way of the view; a note asks you to step back instead).
const palaceAt = (region.districts || []).find((d) => d.id === 'gyeongbokgung')?.offset;
const fanAt = palaceAt && [palaceAt[0] + FAN_AT[0], palaceAt[1] + FAN_AT[1]]; // the west lawn (the king walks round the east one)
const fanRing = fanAt ? [{ p: ringPoly(fanAt[0], fanAt[1], FAN_KEEP) }] : [];
const solidBuildings = map.buildings.filter((b) => !b.visit); // (homes open to visitors: their yard is walkable, the map lists their solid parts as blockers)
const collision = new CollisionMap(solidBuildings.concat(map.blockers || [], allExits.flatMap(blockersOf), streamWalls, fanRing)); // blockers: rivers, walls
const treeCollision = allExits.length || streams.length ? new CollisionMap(solidBuildings.concat(map.blockers || [], allExits.map((e) => footprintOf(e)), streamWalls)) : collision;
const streamCollision = new CollisionMap(streams.flatMap(streamLowBlockers));
const { bounds, obstacles: lawnObstacles, treeSpots } = buildWorld(map, scene, { lowSpec: lowSpec || !!softwareGL, collision: treeCollision, stairHoles: allExits.map(holeOf), holes: allExits.map(holeOf).concat(streams.flatMap(streamHoles), lakeHoles(map.landmarks)) }); // (a lake set below the ground: core/lakeshore.js)
const streamModels = buildStreams(streams, scene);
const subwayEntrances = subwayStations.map((st) => new SubwayEntrances(scene, st));
renderer.localClippingEnabled = true; // the station's train stays inside the hall
// Palace gates, halls, statues (hand-made districts). Those marked "inner"
// (inside Jongmyo's wall) wait for the first visit (the enclosures below).
const landmarks = buildLandmarks(map.landmarks.filter((l) => !l.inner), scene);
// Children's Grand Park's zoo: a room you walk into (core/zoo-park.js, loaded
// on the first visit); what you do there is game/zoo-visit.js.
// The animals' calls when they move, louder the nearer (src/game/zoo-sounds.js).
const zooSounds = createZooSounds({
  get sfx() { return sfx; },
  listener: () => { const r = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0); return me ? { x: me.root.position.x, z: me.root.position.z, rx: r.x, rz: r.z } : null; },
});
const zooVisit = createZooVisit({
  get shop() { return shop; }, get wallet() { return wallet; }, get me() { return me; }, get myLabel() { return myLabel; },
  get riding() { return riding; }, get seated() { return seated; }, sounds: zooSounds, L, fmt, t,
  inZoo: () => mode === 'store' && !!interior?.zooPark,
  showBubble: (o, text, ms, kind) => showBubble(o, $('labels'), text, ms, kind),
  makeNpc: (name, look) => makeNpc($('labels'), name, look), randomLook,
  missionEvent: (type, target) => missionEvent(type, target), setRiding: (k) => setRiding(k),
  placeLabels, enterSeaHall: () => enterHaunted(SEA_STORE),
  sitDown: (s) => sitDown(s), standUp: () => standUp(), seatTaken: (x, z) => others.seatTaken?.(x, z),
});
const streetSeats = benchSeats(map.landmarks).concat(edgeSeats(streams)); // park benches (Seoul Forest) and the edge of the water down by a stream
const storeData = [...((await storesPromise)?.stores || []), ...((await homesPromise)?.homes || [])];
// Product descriptions: at the first shop door (game/store-descs.js).
const storeDescs = createStoreDescs({ url: `${BASE}regions/${regionId}/store-descs.json`, stores: () => storeData });
const zoneData = (await zonesPromise)?.zones || [];
const perfumes = perfumeIndex(storeData); // perfume shops' bottles, by product id
const storefronts = new Storefronts(scene, shownStores(storeData), map, region.center, collision);
// Empty shop lots get ad posters (region.json "adPosters" books a spot).
const adPosters = new AdPosters(scene, map.buildings, storeData, region.center, llToLocal, region.adPosters || {}, import.meta.env.BASE_URL || '/', region.storePosters || {});
const zones = new Zones(scene, zoneData, map, region.center, collision);
const roadGraph = new RoadGraph(map.roads);
// Walking routes around walls (built the first time a route is needed).
// 1.5 m cells: 1 m cells were 13 M cells (about 270 MB) for all of Seoul
// and far routes ran out of search; 2 m cells closed Bukchon's alleys.
let navGrid = null;
const nav = () => (navGrid ||= new NavGrid(collision.polys.map((q) => q.p), map.roads, bounds, { r: PLAYER_R + 0.1, cell: 1.5 }));
function planRoute(ax, az, bx, bz) {
  const poly = nav().route(ax, az, bx, bz) || roadGraph.route(ax, az, bx, bz);
  if (poly.length < 2) poly.push([bx, bz]);
  return poly;
}
const routeLine = new RouteLine(scene);
routeLine.groundY = (x, z) => yardY(map.landmarks, x, z);
// Itaewon's Gyeongnidan-gil is on a hill (district meta "hill"): how high the
// ground is there (core/hill-ground.js). Its slope, streets and neighbours
// load when you first come near (game/gyeongnidan-near.js).
const hillDistrict = (map.meta?.districts || []).find((d) => d.hill);
const slopeY = hillDistrict ? hillGround(hillDistrict.hill, hillDistrict.offset) : () => 0;
const gyeongnidan = createGyeongnidanNear({ district: hillDistrict, scene, labels: $('labels'), roadGraph, roads: map.roads, groundY: slopeY, randomLook });
// Passers-by: two strolling around each meeting zone.
// The Namsan trail: a way up through the hill's blocker, at its height (game/namsan-walk.js).
const namsanWalk = createNamsanWalk({ landmarks: map.landmarks, collision, scene });
// The Namsan cable car, ridden outdoors from the lower station's door up to the summit plaza (game/namsan-cable.js).
const namsanCable = createNamsanCable({
  get me() { return me; }, get mode() { return mode; }, get wallet() { return wallet; }, get shop() { return shop; },
  t, L, fmt, missionEvent: (k) => missionEvent(k), resend: () => { sendTimer = 0; }, clearAction: () => { action = STALE; },
}, { landmarks: map.landmarks, low: storefronts.get('namsan-sky-cable')?.door, top: namsanWalk.station, topOut: namsanWalk.stationOut });
const npcs = new StreetNpcs(scene, $('labels'), roadGraph, zones.items.map((z) => ({ id: z.zone.id, names: z.zone.npc, x: z.x, z: z.z })), undefined, { groundY: (x, z) => slopeY(x, z) || namsanWalk.y(x, z) });
// Busking zones (region.json "busking"), e.g. Hongdae Walking Street: a singer, K-pop dancers, a crowd, a song.
// Gyeongbokgung performances: the fan dance and the king on the lawns either side of the courts, and
// the Bukcheong lion dance on the square in front of Gwanghwamun
// (core/palace-show.js, core/bukcheong.js).
// The performers download when you come within PALACE_LOAD m of the palace
// (loadPalaceShow, from the frame loop).
let palaceShow = null, palaceShowAsked = false;
const PALACE_LOAD = 700;
const makePalaceShow = (PalaceShow) => new PalaceShow(scene, {
  fan: fanAt,
  procession: palaceAt, // the king's walk round the east lawn (ROYAL_ROUTE)
  visitors: palaceAt, // visitors about the courts (PALACE_VISITORS)
  mask: [palaceAt[0] + 8, palaceAt[1] + 42], // the lion dance ring, on the square before King Sejong's statue
  rope: [palaceAt[0] - 18, palaceAt[1] + 46], // the tightrope beside it
  guards: [[palaceAt[0] - 6.5, palaceAt[1] + 6, 0], [palaceAt[0] + 6.5, palaceAt[1] + 6, 0]], // either side of Gwanghwamun's arches
  inside: () => !!enclosures.find((e) => e.id === 'gyeongbokgung')?.inside, // (from outside the wall the fan dance and the king are not drawn)
  layer: $('labels'),
});
function loadPalaceShow(p) {
  if (!palaceAt || palaceShowAsked || Math.hypot(p.x - palaceAt[0], p.z - palaceAt[1]) > PALACE_LOAD) return;
  palaceShowAsked = true;
  import('./core/palace-show.js').then(({ PalaceShow }) => {
    const before = new Set(scene.children);
    palaceShow = makePalaceShow(PalaceShow);
    if (palaceShow.rope?.rig) farCull.add(palaceShow.rope.rig);
    const added = { children: scene.children.filter((o) => !before.has(o)) };
    for (const e of enclosures) e.collect([added]); // (its visitors inside the wall hide from outside it, as at start)
  }, () => { palaceShowAsked = false; });
}
// A pungmul troupe of 19 on Olympic Park's Peace Plaza, between the Peace
// Gate and the skate park (core/pungmul.js). No fence: you can walk in among them.
const olympicAt = (region.districts || []).find((d) => d.id === 'olympic-park')?.offset;
const pungmul = olympicAt ? new PungmulTroupe(scene, [olympicAt[0] + PLAZA_SPOT[0], olympicAt[1] + PLAZA_SPOT[1]], { lowSpec: lowSpec || !!softwareGL }) : null;
// Stamp tour (data/stamps.js): a stamp stand at each place. A stand beside a
// shop only appears once that shop is on the map.
const tourStamps = availableStamps(STAMPS, (id) => !!storefronts.get(id));
const stampStands = new StampStands(scene, tourStamps, (id) => storefronts.get(id), (x, z, r) => collision.blocked(x, z, r), (x, z) => yardY(map.landmarks, x, z)); // (a stand by a shop moves off a wall; up on the cathedral's yard)
const busking = new BuskingZones(scene, $('labels'), region.busking || [], { findFreeSpot, showBubble });

// The main square (the first meeting zone): a guide who hands out errands
// that end back here (광장 미션), and a big screen (전광판) for ads.
const quests = new SquareQuests();
const square = zones.items[0] || null;
let squareNpc = null, billboard = null;
// New players start where they picked (region.json spawn.starts; Bukchon's
// gate unless they picked another), next to a welcome guide in the same
// costume: the first thing they see is what they came for. The welcome high
// five and the first errand (a trip that fits the start) happen there; the
// guide hands out errands like any other after. Shopping starts beside the
// square guide instead, as before.
const firstStop = await startChoice.then((k) => { const sp = k && startSpot(region, k); return sp && !sp.square ? sp : null; });
let welcomeNpc = null;
// Street things that FarCull (below) hides past the fog, besides the ones it
// lists itself: wall screens, the square's billboard and boards, hiring posters.
const farExtras = [];
// Big screens on building walls (region.json "screens").
const wallScreens = [];
for (const sc of region.screens || []) {
  const near = wallNear(map.buildings, sc.at[0], sc.at[1]);
  if (!near) continue;
  const along = sc.along || 0; // slide sideways along the wall
  const wall = { ...near, x: near.x + near.ax * along, z: near.z + near.az * along };
  const w = Math.min(sc.w || 20, wall.len - 2), h = sc.h || w / 2;
  const y = Math.min(sc.y ?? 10, Math.max(3, wall.h - h - 2));
  const ws = new WallScreen({ w, h, image: sc.image ? (import.meta.env.BASE_URL || '/') + sc.image : null, city: sc.city, text: sc.text, wave: sc.wave });
  ws.mount(wall, y, h);
  scene.add(ws.root);
  farExtras.push(ws.root);
  wallScreens.push(ws);
}
if (square) {
  const face = (x, z) => Math.atan2(square.x - x, square.z - z);
  const mascotGuide = (x, z, ry, name = t('quest.guide')) => {
    const npc = makeNpc($('labels'), '❗ ' + name);
    npc.ch.setMascot(makeMascotHead()); // a big plush animal head: easy to spot (it stands still: dancing kept phones busy, Yozi 2026-11-10)
    npc.tag.classList.add('square-guide');
    npc.labelY = 1.95; // above the costume head
    npc.ch.root.position.set(x, 0, z);
    npc.ch.root.rotation.y = ry;
    scene.add(npc.ch.root);
    return npc;
  };
  const [gx, gz] = findFreeSpot(square.x + 2.4, square.z + 1.6);
  squareNpc = mascotGuide(gx, gz, face(gx, gz));
  if (firstStop) { // a few steps ahead of where new players stand, a little to the side, facing them
    const fx = Math.sin(firstStop.ry), fz = Math.cos(firstStop.ry);
    const [wx, wz] = findFreeSpot(firstStop.x + fx * 2.4 + fz * 0.9, firstStop.z + fz * 2.4 - fx * 0.9);
    welcomeNpc = mascotGuide(wx, wz, Math.atan2(firstStop.x - wx, firstStop.z - wz), t('quest.welcomeGuide'));
  }
  const lang = getLanguage();
  billboard = new Billboard(shownStores(storeData).filter((s) => s.category !== 'home').map((s) => ({
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
  farExtras.push(billboard.root);
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
// of the middle, clear of the walkway to Café Street and of the buildings
// (core/notice-board-spots.js).
const noticeBoards = [];
let newsTag = null;
if (square) {
  for (const { board, x, z, ry, ux, uz } of noticeBoardSpots(square, (x, z, r) => collision.blocked(x, z, r))) {
    const color = { news: '#e0a020', free: '#2f6fd6', ask: '#d8452f' }[board];
    const m = makeNoticeBoard(board === 'news' ? '📢 업데이트 소식' : BOARD_TEXT[board].ko, color); // signs in Korean, like the shop signs
    if (board === 'news') { newsTag = makeNewTag(); newsTag.position.set(0, 3.75, 0.1); newsTag.visible = false; m.add(newsTag); }
    m.position.set(x, 0, z);
    m.rotation.y = ry;
    scene.add(m);
    farExtras.push(m);
    noticeBoards.push({ board, x: ux, z: uz }); // stand in front of it
  }
}

// ---------- Player ----------
function latLonToLocal(lat, lon) {
  return llToLocal(region.center, lat, lon);
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

// First minute for new players: start next to the welcome guide in Bukchon
// (or the square guide, in a region without a first stop), high-five them,
// get the first mission, then the info centre is suggested (or just
// explore). 0: high five · 1: getting the mission · 2+: done.
const ONBOARD_KEY = 'mk.onboard';
const ONBOARD_REWARD = 20000; // won, for the welcome high five (supabase/020_rewards.sql 'quest')
let onboard = (() => {
  try {
    const v = localStorage.getItem(ONBOARD_KEY);
    if (v != null) return Number(v) || 0;
    return loadLastSpot() ? 2 : 0; // players from before this: skip it
  } catch { return 2; }
})();
// New players start in Bukchon, facing the welcome guide with the village
// behind them (until the welcome is done: a refresh in the middle of it too).
// Everyone else without a saved spot to come back to starts on the main
// square, next to the guide, not in front of the subway exit and the café:
// there the first thing you did was walk into a shop door. (A usable saved
// spot moves returning players back where they left off, just below.)
if (onboard < 2 && welcomeNpc) {
  const g = welcomeNpc.ch.root;
  const [ox, oz] = findFreeSpot(firstStop.x + (Math.random() - 0.5), firstStop.z + (Math.random() - 0.5));
  me.root.position.set(ox, 0, oz);
  me.root.rotation.y = Math.atan2(g.position.x - ox, g.position.z - oz);
} else if (squareNpc) { // stand next to the guide, facing them
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
function onboardHi5(npc = squareNpc) {
  setOnboard(1);
  $('info-hint').hidden = true;
  me.play('wave');
  npc.ch.wave();
  showBubble(myLabel, $('labels'), '🙌');
  sfx.pop?.();
  wallet.add(ONBOARD_REWARD, { k: 'ledger.quest' }, { r: 'quest', once: 'onboard:hi5' });
  refreshWallet();
  shop.toast(fmt(L(ONBOARD_TEXT.done), { n: ONBOARD_REWARD }));
  action = STALE;
  quests.beginStarter(); // then the first path: errands near the square that each teach one thing
  // First the guide recommends the info centre, then gives the first mission.
  setTimeout(() => {
    say(npc, $('labels'), ['미션 전에 안내센터에 꼭 들러 보세요!', 'misyeon jeone annaesenteoe kkok deulleo boseyo!', L(ONBOARD_TEXT.infoTip)]);
  }, 1100);
  setTimeout(() => {
    talkToGuide(npc); // the first mission
    setOnboard(2);
    // Then: the info centre, or explore on your own. After the guide's tip
    // for the first errand (5.2 s, shown for 9 s), so the card doesn't hide it.
    setTimeout(() => { if (mode === 'street' && !guide && $('info-hint').hidden) showInfoHint($('info-hint'), { onGo: () => guideToPlace({ store: nearestStore((st) => st.workshop === 'info') || 'info-center' }) }); }, 15000);
  }, 5600);
}

// Come back where you left off last time, if that spot is still open.
const spotBoxes = districtBoxes(map);
// A spot we can't come back to: inside something (a duck boat on the river,
// a wall) or out in the empty land between districts (e.g. a spot saved
// before a district moved to its real place, scripts/place-districts.mjs).
// Such spots aren't saved either, so a refresh keeps the last good one.
const spotMap = { boxes: spotBoxes, areas: map.areas, onRoad: (x, z) => onAnyRoad(map.roads, x, z, 0) };
const spotBad = (x, z) => collision.blocked(x, z, 0.4) || !onMap(x, z, spotMap);
if (onboard >= 2) {
  const last = loadLastSpot();
  if (usableSpot(last, bounds, spotBad)) {
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
    if (!outdoors()) return;
    const [x, z] = myWorldSpot(); // (an open-air park: its spot on the street)
    if (spotBad(x, z)) return; // keep the last spot we can come back to
    saveLastSpot(x, z, me.root.rotation.y);
    if (spotBoxes.length) saveLastPlace(districtAt(spotBoxes, x, z));
  } catch { /* still starting up */ }
};
document.addEventListener('visibilitychange', () => { if (document.hidden) rememberSpot(); });
addEventListener('pagehide', rememberSpot);

const cam = { yaw: me.root.rotation.y + Math.PI, pitch: 0.42, dist: 9 };
if (onboard === 0 && welcomeNpc) cam.dist = 7.5; // first minute in Bukchon: the guide ahead, the village behind them
else if (onboard === 0 && squareNpc) { cam.yaw += 0.75; cam.dist = 7; } // first minute: the guide in view, beside us
let camHoriz = 8; // current camera distance (shortened near walls)
let camOutWait = 0; // seconds before the camera may move back out after a wall
let manualCamT = 0; // seconds since the player last dragged the view, counted down (walking then goes by the new view)
// The camera turns only when the player turns it (and on the amusement
// park's rides). Walking, going through doors, sitting, events and the
// guide all leave it as it is: a view that moves by itself loses people.
let doorCam = null; // the street camera when we went in through a door, put back on the way out
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
const isCar = (k) => k === 4 || k === 6 || k === CART; // sports car, limousine, the zoo's cart
let inSkate = false; // in the skate park (rides slow down there; see skateTick)
const skater = new Skater();
let skateY = 0; // ground (or air) height in the skate park
let skateTk = null; // { code, at }: the last trick, sent to others for a moment
const rideSpeed = () => (riding === CART ? CART_SPEED : isCar(riding) ? CAR : riding === 5 ? MOTO : riding === 1 ? (inSkate ? Math.min(PARK_SPEED, garage.speed()) : garage.speed()) : BIKE);
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
// The world is up: loading is done. A minute of visible play is the last
// funnel step.
visit.reach(STAGE.LOADED);
{
  let seen = 0;
  const minute = setInterval(() => {
    if (document.hidden) return;
    if (++seen >= 60) { visit.reach(STAGE.MINUTE); clearInterval(minute); }
  }, 1000);
}
$('joystick').hidden = !input.isTouch;
// Settings sheet: music, sign translation and language live here.
$('settings-btn').onclick = () => { $('settings-panel').hidden = false; };
$('settings-close').onclick = () => { $('settings-panel').hidden = true; };
// Two pages: the main one, and "Game settings" (controls, camera, screen).
// The ✕ stays at the top right however far the page scrolls.
{
  const view = (game) => {
    $('settings-game').hidden = !game;
    $('settings-main').hidden = game;
    $('settings-panel').querySelector('.panel').scrollTop = 0;
  };
  $('settings-btn').addEventListener('click', () => view(false));
  $('game-settings-btn').onclick = () => view(true);
  $('settings-back').onclick = () => view(false);
  $('settings-x').onclick = () => { $('settings-panel').hidden = true; };
}
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

// The operators' season and held weather (admin.html → Weather,
// supabase/023_weather.sql), the same for everyone. A little after
// start, so it never holds up joining the world.
let weatherClient = null, stopWeather = null;
function watchWeatherSetting() {
  if (!cloud.client || cloud.client === weatherClient) return;
  stopWeather?.();
  weatherClient = cloud.client;
  stopWeather = watchWeather(weatherClient, (raw) => weather.setSettings(raw));
}
setTimeout(() => { cloud.onChange(watchWeatherSetting); watchWeatherSetting(); }, 4000);

// ---------- Multiplayer ----------
const remoteOpts = { isOperator: isOperatorName, coasterSeat: (ch, cs, q) => placeRemoteRider(ch, cs, q), tick: (q, all, dt) => sky.remote(q, all, dt) };
let others = new RemotePlayers(scene, $('labels'), remoteOpts);
// Everyone online on the whole map (net/online.js); without a server that
// can count, the people around you.
let onlineAll = 0;
const refreshOnline = () => {
  const n = onlineAll || others.players.size + 1;
  $('online').hidden = n < 2;
  // Phones show just "🟢 5" (style.css hides .on-long); the full words stay
  // in the tooltip and for screen readers.
  const full = t('hud.online', { n });
  $('online').title = full;
  $('online').setAttribute('aria-label', full);
  $('online').replaceChildren('🟢 ', Object.assign(document.createElement('span'), { className: 'on-long', textContent: full }), Object.assign(document.createElement('span'), { className: 'on-short', textContent: String(n), ariaHidden: 'true' }));
};
onLanguageChange(refreshOnline);
let stopOnline = null;
// Its own id, not myId: the online count is open to everyone, and myId must
// stay unseen until it is claimed for chat (claimChatId below).
watchOnline(config.netProvider, config.net, crypto.randomUUID?.() || String(Math.random()).slice(2), (n) => { onlineAll = n; refreshOnline(); })
  .then((stop) => { stopOnline = stop; if (tabParked) stop?.(); }).catch(() => {});
// A newer build deployed while we play: ask for a refresh (core/update-check.js).
{
  const deployed = { current: __BUILD_ID__, fetchVersion: () => fetch(`${BASE}version.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => j?.v) };
  startUpdateCheck({ ...deployed, onNew: () => { if (!tabParked) showUpdateBanner(); } });
  watchMissingFiles({ ...deployed, onNew: () => showUpdateBanner() });
}
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
      const out = outdoors(); // (an open-air Han River park is the street too)
      if (out) { const [x, z] = myWorldSpot(); streetSpot = { x, z }; }
      if (!streetSpot) return null;
      return { name: nickname, place: out ? 'street' : interior?.store?.id || mode, ...streetSpot };
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
let teleports = 0; // how many times we jumped (taxi, map, warp), sent as st.tp
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
// Outdoors: on the street, or on an open-air Han River park's lawn (part of the street).
const outdoors = () => mode === 'street' || !!openParkHere();
const onStreetRoom = () => !!lastJoin && lastJoin[0] === roomId && lastJoin[1] === scene;
// Name tags are announced by each player's own game: ask the server who
// they really are (019_chat_names.sql) and correct a borrowed name. People
// joining together are asked about in one go.
const tagQueue = new Set();
let tagTimer = 0;
function checkTag(id) {
  if (config.netProvider !== 'supabase' || testRoom) return;
  tagQueue.add(id);
  if (tagTimer) return;
  tagTimer = setTimeout(async () => {
    tagTimer = 0;
    const room = others;
    const pairs = [...tagQueue].slice(0, 50).map((pid) => [pid, room.nameOf(pid)]).filter((p) => p[1] != null);
    for (const [pid] of pairs) tagQueue.delete(pid);
    tagQueue.clear();
    const fixes = await cloud.tagNames(pairs);
    for (const [pid, real] of fixes) {
      if (room !== others) return; // moved to another room meanwhile
      room.setName(pid, real ? filterText(cleanName(real).trim()) || '?' : '?');
    }
  }, 400);
}
// Claim myId for this account before anyone can see it, so only we can chat
// as myId (supabase/019_chat_names.sql). Asked once; asked again if the
// server couldn't be reached.
let chatIdClaim = null;
function claimChatId() {
  if (!chatIdClaim) {
    chatIdClaim = cloud.claimChatId(myId, 3000);
    chatIdClaim.then((r) => { if (r === 'offline') chatIdClaim = null; });
  }
  return chatIdClaim;
}
async function joinRoom(room, roomScene, area = null) {
  if (tabParked) return;
  lastJoin = [room, roomScene, !!area];
  const token = ++joinToken;
  dropGifts(); // gifts are between people in the same room
  net?.disconnect();
  net = SOLO;
  for (const id of [...others.players.keys()]) others.leave(id);
  others = new RemotePlayers(roomScene, $('labels'), remoteOpts);
  refreshOnline();
  const handlers = {
    onJoin: (p) => {
      others.join({ ...p, name: filterText(cleanName(p.name).trim() || '?') });
      if (safety.isBlocked(p.id, others.nameOf(p.id))) others.hide(p.id);
      checkTag(p.id);
      refreshOnline(); lastSent = null;
      kpop.onPeerJoin(); // catch them up on the song playing in the K-POP café
      liveStage.onJoin(p.id); // a singer on the live café's stage sends them the voice
    },
    onLeave: (id) => { liveStage.onLeave(id); sky.gone(id); tandemGone(id); taxi.onLeave(id); others.leave(id); interior?.dartPins?.clear(id); refreshOnline(); },
    onState: (id, st) => others.state(id, st),
    onEmote: (id, e) => {
      if (liveStage.onMsg(id, e)) return; // the live café's voice set-up (game/live-stage.js)
      if (sky.onMsg(id, e)) return; // carrying someone in flight (game/sky-flight.js)
      if (parseSnowMsg(e)) { if (!safety.isBlocked(id, others.nameOf(id))) snowman.onMsg(id, parseSnowMsg(e)); return; }
      if (parseTandem(e)) { onTandemMsg(id, parseTandem(e)); return; }
      if (parseGift(e)) { onGiftMsg(id, parseGift(e)); return; }
      if (parseTaxi(e)) {
        const m = parseTaxi(e);
        const heard = (tx) => { if (tx.onMsg(id, others.nameOf(id) || '?', m)) action = STALE; };
        if (m.to !== myId || safety.isBlocked(id, others.nameOf(id))) return;
        if (taxi.loaded) heard(taxi);
        else if (m.verb === 'ask') taxi.ready().then(heard, () => {}); // (a friend's first offer brings the taxi code)
        return;
      }
      if (parseTarot(e)) {
        const m = parseTarot(e);
        if (m.to === myId && !safety.isBlocked(id, others.nameOf(id))) {
          tarotUi.ready().then((ui) => { // (the panel downloads on the first message)
            if (!ui.heard(id, others.nameOf(id) || '?', m)) return;
            shop.toast(fmt(L(TAROT_TEXT.invited), { name: others.nameOf(id) || '?' }));
            action = STALE;
          }, () => {});
        }
        return;
      }
      if (parseKpop(e)) { kpop.onMsg(parseKpop(e)); return; }
      if (parseFilm(e)) { kpop.onMsg(parseFilm(e)); return; }
      if (parseKaraoke(e) != null) { if (karaokeUi.loaded || interior?.stations?.karaoke) karaokeUi.addScore(others.nameOf(id) || '?', parseKaraoke(e)); return; }
      if (arcadeGame.onBowlMsg(id, e)) return; // bowling: the others' balls, lane screens, games with friends (game/arcade.js)
      if (parseDarts(e)) { const m = parseDarts(e); if (m.to === myId) onDartsMsg(id, m); return; }
      if (parseDartsGo(e)) { const m = parseDartsGo(e); if (m.to === myId && !safety.isBlocked(id, others.nameOf(id))) arcade.darts?.go(id, m); return; }
      if (parseDartPin(e)) { const m = parseDartPin(e); if (!safety.isBlocked(id, others.nameOf(id))) interior?.dartPins?.add(id, m.board, m.color, m.x, m.y); return; }
      if (parseHonk(e)) {
        const at = others.positionOf(id);
        if (at && !safety.isBlocked(id, others.nameOf(id))) motionSound.honk(parseHonk(e), hearGain(Math.hypot(at.x - me.root.position.x, at.z - me.root.position.z)));
        return;
      }
      if (e === BELL_MSG) { onPeerBell(id); return; }
      if (typeof e === 'string' && e.startsWith('sniff:')) { onPeerSniff(id, e.slice(6)); return; }
      if (typeof e === 'string' && e.startsWith('fishph:')) { onPeerFishing(id, e.slice(7)); return; }
      if (typeof e === 'string' && e.startsWith('bigfish:')) { onPeerTrophy(id, e.slice(8)); return; }
      if (parseBite(e)) { if (parseBite(e) === myId) onBitten(id); return; }
      if (parseRaceMsg(e)) { onPoolRace(id, parseRaceMsg(e)); return; }
      if (parseLineMsg(e)) {
        if (interior?.store.workshop === 'runway' && !safety.isBlocked(id, others.nameOf(id))) runwayLine.heard(id, parseLineMsg(e), Date.now());
        return;
      }
      if (parseRunwayMsg(e)) {
        const m = parseRunwayMsg(e);
        if (interior?.store.workshop === 'runway' && !safety.isBlocked(id, others.nameOf(id))) { runwayReact(others.rootOf(id), m.tier, m.word); if (m.pose) runwayPose(others.charOf(id), m.pose); }
        return;
      }
      if (parseHi5(e)) { if (parseHi5(e) === myId && !safety.isBlocked(id, others.nameOf(id))) onHi5(id); return; }
      const em = getEmote(e);
      if (em && !safety.isBlocked(id, others.nameOf(id))) others.emote(id, em.anim, em.emoji); // ignore unknown emotes
    },
    onLook: (id, look) => others.setLook(id, look),
    // serverName: the sender's real name, when the server sent it
    // (019_chat_names.sql); the name tag itself comes from the sender.
    onChat: (id, raw, serverName) => {
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
      const quiet = inLibrary();
      const tagName = others.chat(id, text, ms, quiet ? 'chat whisper' : 'chat');
      if (!tagName) return;
      const real = serverName && filterText(cleanName(serverName).trim());
      addChatLine(real || tagName, text, quiet ? 'whisper' : '', id);
      const log = (recentLines.get(id) || []).concat(text).slice(-10);
      recentLines.set(id, log);
    },
  };
  const joinedLook = currentLook;
  try {
    if (config.netProvider === 'supabase' && !testRoom) await claimChatId();
    if (token !== joinToken) return; // a newer join won
    const n = await createAreaNet(config.netProvider, handlers, { ...config.net, accessToken: () => cloud.accessToken(), claimChatId }, {
      room, self: { id: myId, name: nickname, look: joinedLook },
      cellSize: area ? config.netCellSize : 0, x: area?.x, z: area?.z,
      // Debug test rooms play without an account (no cloud save), and the
      // private chat channel only carries chat from accounts: chat there on
      // the room channels instead.
      privateChat: !testRoom,
    });
    if (token !== joinToken) { n.disconnect(); return; } // a newer join won
    net = n;
    // Tell the room where we are now. What we sent while joining went
    // nowhere, and an unchanged state is only re-sent on the idle heartbeat
    // (counted in frame time: on a slow device that is minutes away), so
    // the people already there would see us stand at the map's origin.
    lastSent = null; sendTimer = 0;
    // The look changed while we were connecting (the pool hall puts swimwear
    // on as you come in and takes it off as you leave): tell the new room.
    if (currentLook !== joinedLook) n.sendLook?.(currentLook);
  } catch (err) {
    // Keep playing solo if the realtime service is unreachable.
    console.warn('Multiplayer unavailable:', err);
    if (token === joinToken) {
      net = SOLO;
      // Try again in a while (a busy server, a network blip), unless we
      // have moved on to another room by then.
      setTimeout(() => {
        if (token !== joinToken || net !== SOLO) return;
        const [wx, wz] = myWorldSpot();
        joinRoom(room, roomScene, area ? { x: wx, z: wz } : null);
      }, config.netRetrySeconds * 1000);
    }
  }
}
// Rename at the name tag workshop: costs coins; others see it after a quick
// rejoin of the room we are in. Resolves to 'ok', 'same', 'empty', 'poor'
// or 'taken' (someone else uses that name).
// May I change my name now, and for how much? The first change after
// picking a name is free and immediate, then one change per 7 days. The
// server decides when it can be asked (019_chat_names.sql; operators never
// wait, 027_operator_rename.sql), this browser's
// record otherwise. { free, waitDays, cost }
async function renameInfo() {
  const st = (await cloud.nameStatus()) || renameState(identity);
  return { ...st, cost: st.free ? 0 : RENAME_COST };
}
async function renameMe(raw) {
  const clean = cleanName(raw).trim();
  if (!clean) return 'empty';
  const next = filterText(clean.slice(0, 16));
  if (next === nickname) return 'same';
  if (isReservedName(clean)) return 'reserved';
  const info = await renameInfo();
  if (info.waitDays > 0) return 'wait';
  if (wallet.coins < info.cost) return 'poor';
  const claimed = await cloud.claimName(clean);
  if (claimed === 'taken' || claimed === 'wait') return claimed;
  if (info.cost && !wallet.spend(info.cost, { k: 'ledger.rename' })) return 'poor';
  nickname = next;
  if (chat.friendBackend instanceof LocalFriends) chat.friendBackend.setName(nickname);
  identity = { ...identity, name: clean, nameAt: Date.now(), renames: (identity.renames || 0) + 1, renamedAt: Date.now() };
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
  others = new RemotePlayers(roomScene, $('labels'), remoteOpts);
  refreshOnline();
}
net = SOLO;
// Same browser, second tab: the newest tab plays, older ones step aside so
// you never appear twice on the street (see core/single-tab.js).
// Same idea across devices: if this account's save was opened on another
// phone or computer, this one stops saving and steps aside the same way, so
// it never overwrites the newer progress there (see core/cloud-save.js).
function stepAside(icon, title, hint) {
  if (tabParked) return;
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
  box.innerHTML = '<div class="panel small"><div class="logo"></div><h2></h2><p></p><button class="primary"></button></div>';
  box.querySelector('.logo').textContent = icon;
  box.querySelector('h2').textContent = t(title);
  box.querySelector('p').textContent = t(hint);
  const btn = box.querySelector('button');
  btn.textContent = t('tab.playHere');
  btn.onclick = () => location.reload(); // reloading claims this tab again
  box.style.zIndex = 10000;
  document.body.appendChild(box);
}
claimTab(() => { cloud.stop(); stepAside('🗂️', 'tab.elsewhere', 'tab.elsewhereHint'); });
cloud.onElsewhere(() => stepAside('📱', 'device.elsewhere', 'device.elsewhereHint'));
joinRoom(roomId, scene, { x: me.root.position.x, z: me.root.position.z });

// Emote wheel. (ui/emote-wheel.js)
const emoteWheel = createEmoteWheel({
  get onSquare() { return onSquare; }, get me() { return me; }, get net() { return net; }, $, missionEvent,
  myLabel,
  room: () => (mode === 'store' ? interior?.store?.workshop || null : null), // (some rooms swap a few emotes: data/emotes.js)
});
const { closeWheel } = emoteWheel;

// Text chat, chat codes, friends and friend chat. (game/chat.js)
// Sky view for operators (game/sky-flight.js): chat codes, flying costumes.
// Downloaded at an operator's first code, or when a flyer comes into view or
// offers to carry us; until then nobody is flying.
const sky = lazyPanel(() => import('./game/sky-flight.js').then(({ createSkyFlight }) => createSkyFlight({
  get me() { return me; }, get mode() { return mode; }, get currentLook() { return currentLook; }, setLook,
  get shop() { return shop; }, get busy() { return !!(riding || seated || ride || namsanCable.busy); },
  // (on an open-air park's lawn, Another Land's island or a Han River park:
  // step back onto the street where you stand, then take off from there)
  leaveOpenPark: () => { if (mode === 'store' && interior?.store?.open && seated == null && !ride) leaveStore(true); },
  cloud, input, scene, cam, bounds, blocked: (x, z) => collision.blocked(x, z, PLAYER_R),
  buildings: solidBuildings, myId, get net() { return net; }, get others() { return others; },
  isBlocked: (id) => safety.isBlocked(id, others.nameOf(id)),
  places: () => [
    ...zones.items.map((i) => ({ name: localName(i.zone.name, getLanguage()) || '', x: i.x, z: i.z, icon: '📍' })),
    ...storefronts.items.map((i) => ({ name: localName(i.store.name, getLanguage()) || '', x: i.door.x, z: i.door.z, icon: '🏬' })),
  ],
})), {
  busy: false, gone: () => {}, state: () => {}, update: () => {},
  remote: (q) => { if (q.target?.fl || q.target?.cr) sky.ready().catch(() => {}); },
  onMsg: (id, e) => {
    if (!parseSkyMsg(e)) return false;
    sky.ready().then((s) => s.onMsg(id, e), () => {});
    return true;
  },
});
const chat = createChat({
  sky,
  get others() { return others; }, get shop() { return shop; }, get googleFail() { return googleFail; },
  get CODE_TEXT() { return CODE_TEXT; }, get wallet() { return wallet; },
  get myLook() { return myLook; }, set myLook(v) { myLook = v; }, get inventory() { return inventory; },
  get nickname() { return nickname; }, get net() { return net; }, get sfx() { return sfx; }, $, OPERATOR_TEXT,
  cloud, input, myId, myLabel, recentLines, refreshItems, refreshWallet, safety, setLook,
  onChatSent: () => playCounts.chat(), // retention counts (core/sessions.js)
  get whisper() { return inLibrary(); },
  get me() { return me; }, get camera() { return streetCam(); }, // where a friend request's sender is (core/friends.js whereIs)
  streetPos: () => myPlace(),
});
const { cleanChat, addChatLine } = chat;

// ---------- Stores, zones, map, guide ----------
let mode = 'street';
let activeScene = scene;
let activeCollision = collision;
let interior = null; // { store, scene, products, collision, front }
// In the library chat shows in grey, like a whisper.
const inLibrary = () => interior?.store.category === 'library';
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
    const perfume = product.perfume && perfumes.has(product.id); // (perfume goes to the wardrobe, not the hand)
    if (!perfume && !handReady()) return false;
    if (!wallet.spend(coins, { name: product.name, at: interior?.store.name })) { shop.toast(fmt(L(DINE_TEXT.poor), { n: coins })); return false; }
    refreshWallet();
    const kind = goodsKind(product);
    if (perfume) bag.addVanity({ kind: 'perfume', p: product.id, sips: SPRAYS, name: localName(product.name, 'en') });
    else holdNew(kind === 'gift' ? { kind, sips: 1, name: localName(product.name, 'en'), icon: SHOP_ICON[product.model] || '🛍️' } : { kind, sips: kind === 'food' ? FOOD_BITES : COFFEE_SIPS, name: localName(product.name, 'en'), ...(product.snack ? { snack: product.snack } : {}) });
    if (kind !== 'gift') recordFood(shop.store, product, true);
    const seller = sellerOf(product) || parkClerk();
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
function greetAtStalls(p, list = interior.vendorNpcs) {
  const now = performance.now();
  if (now - stallHiAt < 12000) return;
  const o = list.find((v) => Math.hypot(p.x - v.ch.root.position.x, p.z - v.ch.root.position.z) < 2.4 && now - (v.hiAt || 0) > 40000);
  if (!o) return;
  stallHiAt = o.hiAt = now;
  o.ch.wave();
  say(o, $('labels'), STALL_HI[Math.floor(Math.random() * STALL_HI.length)]);
}
// At the park's market, the stall's own seller thanks you (not the kiosk clerk).
function sellerOf(product) {
  const hp = hanPark() || (mode === 'street' && nightCarts.here(me.root.position)) || interior, i = hp?.vendors?.findIndex((v) => v.stall === product.stall);
  return i >= 0 ? hp.vendorNpcs?.[i] : null;
}
// What a bought thing becomes in your hand.
const SHOP_ICON = { ramyeon: '🍜', egg: '🥚', picnicmat: '🧺', frisbee: '🥏', notebook: '📓', pen: '🖊️', candle: '🕯️', bottle: '🧴', jar: '🫙', lipstick: '💄', plush: '🧸', tote: '👜', scarf: '🧣', samgak: '🍙', milk: '🥛', bread: '🥐', cup: '🥤' };
// Ordering at the counter: META COFFEE and the bar from the clerk, a club
// from its bartender. Coffee refills your stamina when you sip it.
const COUNTER_ORDER = { en: 'Order', ko: '주문하기', ja: '注文する', zh: '点单', es: 'Pedir', ar: 'اطلب', vi: 'Gọi món', hi: 'ऑर्डर करें', fr: 'Commander', th: 'สั่ง', id: 'Pesan' };
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
    if (product.ingredient) { buyIngredient(product, coins); counterUi.render(shopToastText); return false; } // (stays open to buy more)
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

// Pets wait outside shops and other rooms: only the outdoor "rooms" (the Han
// River parks, the theme park, the Namsan slope) and the street have them.
const petIndoors = () => mode === 'store' && !(interior?.hanRiver || interior?.themepark || interior?.lawns);
// Where pets may not go in this room: the bumper car rink in Another Land.
const PARK_FENCES = [RINK_FENCE];
const petFences = () => (mode === 'store' && interior?.bumper ? PARK_FENCES : null);
// My pet: adopt, walk, clean up after it (src/game/pet-care.js).
const petCare = createPetCare({
  get me() { return me; }, get scene() { return scene; }, get activeScene() { return activeScene; },
  get mode() { return mode; }, get riding() { return riding; }, get seated() { return seated; },
  get indoors() { return petIndoors(); },
  get fences() { return petFences(); },
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
const scent = new Scent(localStorage, (id) => perfumes.has(id));
let myScent = scent.active();
const scentFx = new ScentFx();
let myPuffIn = 1;
// Spray one (from the hand, or entry i of the wardrobe).
function sprayPerfume(i = -1) {
  const e = i >= 0 ? bag.vanityList()[i] : held;
  const keep = (rest) => (i >= 0 ? bag.setVanity(i, rest) : setHeld(rest));
  const pf = perfumes.get(e?.p);
  if (!pf) { keep(null); return; }
  me.play('clap'); // lift the bottle
  sfx.pop?.();
  scent.spray(pf.product.id);
  myScent = pf.product.id;
  const p = me.root.position;
  scentFx.attach(activeScene);
  scentFx.puff(p.x, p.y, p.z, pf.fx, true);
  myPuffIn = nextPuff();
  showBubble(myLabel, $('labels'), '🧴 ' + localName(pf.product.name, getLanguage()), 2500);
  const sprays = e.sips - 1;
  const name = localName(pf.product.name, getLanguage());
  if (sprays <= 0) { keep(null); shop.toast(fmt(L(PERFUME_TEXT.last), { name })); }
  else { keep({ ...e, sips: sprays }); shop.toast(fmt(L(PERFUME_TEXT.sprayed), { name, n: sprays })); }
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
  runwayWords.update(dt);
  runwayPoseTick(dt);
  for (const [root, t0] of wobbles) {
    const t = t0 + dt;
    root.rotation.z = wobbleAt(t);
    if (t >= WOBBLE_S) { root.rotation.z = 0; wobbles.delete(root); } else wobbles.set(root, t);
  }
}
// The Curve Runway's reactions (core/runway-fx.js), on me or on someone in
// the room: a sparkle (perfect), a twinkle (close) or a wobble and "!" (miss),
// and the pose's word over the head.
const runwayWords = new WordFx();
const wobbles = new Map(); // character root → seconds into its wobble
function runwayReact(root, tier, word) {
  if (!root || mode !== 'store') return;
  const { x, y, z } = root.position;
  scentFx.attach(activeScene);
  runwayWords.attach(activeScene);
  if (tier === 'p') scentFx.puff(x, y, z, pickPerfect(), true);
  else if (tier === 'g') scentFx.puff(x, y, z, GOOD_FX, false);
  else { wobbles.set(root, 0); runwayWords.pop(x + 0.45, y + 1.5, z, '!', '#ff6b6b', true); }
  if (word) runwayWords.pop(x, y + 2.3, z, L(RUNWAY_WORDS[word]), wordColor(word)); // each word its own colour
}
// A photo pose (core/runway-poses.js) on me or on someone in the room: an
// emote clip, or bone offsets held for a moment. (The spin is main.js's
// runwayStep on me; others are seen turning through their updates.)
const runwayPosing = new Map(); // character → { id, t }
function runwayPose(ch, id) {
  const kind = poseKind(id);
  if (!ch || !kind) return;
  if (kind === 'clip') { ch.play(id); return; }
  if (kind !== 'moves') return;
  const st = { id, t: 0 };
  runwayPosing.set(ch, st);
  ch.setMoves?.(() => poseAt(st.id, st.t));
}
function runwayPoseTick(dt) {
  for (const [ch, st] of runwayPosing) {
    st.t += dt;
    if (st.t >= POSE_S) { ch.setMoves?.(null); runwayPosing.delete(ch); }
  }
}
// Lipstick (game/lipstick.js): bought at a lip shop, put on from the hand.
const lipstick = createLipstick({
  get me() { return me; }, get shop() { return shop; }, get sfx() { return sfx; }, get wallet() { return wallet; },
  get interior() { return interior; }, get bag() { return bag; }, get myLook() { return myLook; },
  refreshWallet: () => refreshWallet(), setLook: (l) => { myLook = { ...l }; setLook(myLook); }, saveLook: (l) => saveLook(l),
  showBubble: (text) => showBubble(myLabel, $('labels'), text, 2500),
});
const HELD_KEY = 'mk.held';
// The bag (core/bag.js): books, drinks and the umbrella you carry but don't
// hold in your hand. 20 slots for now.
const bag = new Bag(localStorage, { isBook: (id) => !!bookById(id), maxSips: COFFEE_SIPS, isPerfume: (id) => perfumes.has(id), maxSprays: SPRAYS });
let held = (() => {
  try {
    const h = JSON.parse(localStorage.getItem(HELD_KEY) || 'null');
    if (h?.kind === 'book') return bookById(h.book) ? { kind: 'book', book: h.book } : null;
    if (h?.kind === 'gift') return giftEntry(h);
    if (h?.kind === 'duckmold') return { kind: 'duckmold' };
    if (h?.kind === 'balloon') return restoreBalloon(h); // (Another Land's clown; gone once its air is out)
    if (h?.kind === 'lipstick') return lipstickEntry(h);
    if (h?.kind === 'perfume') return perfumes.has(h.p) && h.sips > 0 ? { kind: 'perfume', p: h.p, sips: Math.min(SPRAYS, h.sips | 0), name: String(h.name || '').slice(0, 60) } : null;
    return h && HELD_KINDS.includes(h.kind) && h.sips > 0 ? { kind: h.kind, sips: Math.min(COFFEE_SIPS, h.sips | 0), name: String(h.name || '').slice(0, 40), ...(h.ramen && h.kind === 'food' ? { ramen: true } : {}), ...(h.kind === 'food' && SNACKS.includes(h.snack) ? { snack: h.snack } : {}) } : null;
  } catch { return null; }
})();
// A fishing rod while the fishing panel is open shows instead of the cup.
let rodOut = false;
const rodSkins = new RodSkins();
// (bag goods such as a frisbee or a picnic mat are held as themselves, not in a shopping bag)
const heldKind = () => (rodOut ? rodKind(rodSkins.equipped) : held?.kind === 'gift' ? giftKind(held) : held?.snack ? 'food:' + held.snack : held?.kind === 'lipstick' ? 'lipstick:' + held.c : balloonKind(held) || held?.kind || null);
function setHeld(h) {
  held = h;
  try { if (h) localStorage.setItem(HELD_KEY, JSON.stringify(h)); else localStorage.removeItem(HELD_KEY); } catch { /* storage blocked */ }
  me.setHeld(heldKind());
  $('drink-btn').hidden = !h || h.kind === 'gift' || h.kind === 'duckmold' || h.kind === 'balloon'; // a shopping bag is just carried (the duck maker works with E)
  $('stow-btn').hidden = !h || h.kind === 'balloon'; // (a balloon won't fit in the bag)
  $('drink-btn').querySelector('span').textContent = h?.kind === 'book' ? '📖' : h?.kind === 'food' ? '🥡' : h?.kind === 'glass' ? '🍹' : h?.kind === 'perfume' ? '🧴' : h?.kind === 'lipstick' ? '💄' : '☕';
  $('drink-btn').querySelector('small').textContent = h?.kind === 'food' ? L(DINE_TEXT.eat) : h?.kind === 'perfume' ? L(PERFUME_TEXT.spray) : h?.kind === 'lipstick' ? lipstick.label() : t(h?.kind === 'book' ? 'book.read' : 'coffee.drink');
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
  if (held.kind === 'lipstick') { setHeld(lipstick.apply(held)); return; }
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
const umbrellaOpen = () => hasUmbrella() && outdoors() && !riding && !seated && WET.has(weather.kind); // (on a Han River park's lawn too)
const wxSpeed = () => (mode !== 'street' || isCar(riding) ? 1 : weatherSpeed(weather.kind, { bike: !!riding, umbrella: umbrellaOpen() }));
function buyUmbrella(product) {
  if (hasUmbrella()) return;
  if (bag.full) { shop.toast(fmt(L(BAG_TEXT.full), { cap: bag.cap })); return; }
  const cost = product.coins || 5000;
  if (!wallet.spend(cost, { name: product.name, at: interior?.store.name })) { shop.toast(t('pet.noCoins', { n: cost - wallet.coins })); return; }
  bag.add({ kind: 'umbrella' });
  refreshWallet();
  shop.toast(L(UMB_TEXT.bought));
  shop.openProduct(product); // the button now says you have one
}
if (held) setHeld(held);
if (held?.kind === 'book') bag.removeKind('book'); // one library book out at a time: the one in hand

// Put what's in my hand into the bag, and take things back out.
const UMB_DESC = { en: 'Opens by itself outdoors when it rains or snows.', ko: '밖에서 비나 눈이 오면 저절로 펴져요.', ja: '外で雨や雪が降ると自動で開きます。', zh: '在外面下雨或下雪时会自动撑开。' };
const UMB_NAME = { en: 'Umbrella', ko: '우산', ja: '傘', zh: '雨伞' };
const BOOK_DESC = { en: 'Hold it and sit down to read.', ko: '손에 들고 앉으면 읽을 수 있어요.', ja: '手に持って座ると読めます。', zh: '拿在手上坐下就能读。' };
const DRINK_DESC = { en: '{n} sips left.', ko: '{n}모금 남았어요.', ja: '残り{n}口。', zh: '还剩{n}口。' };
function describeEntry(e) {
  if (e.kind === 'umbrella') return { emoji: '☂️', name: L(UMB_NAME), desc: L(UMB_DESC), canHold: false };
  if (e.kind === 'duckmold') return { emoji: '🦆', name: L(SNOW_LABELS.moldName), desc: L(SNOW_LABELS.moldDesc), canHold: true };
  if (e.kind === 'book') {
    const b = bookById(e.book);
    return { emoji: b?.icon || '📖', name: b ? localName(b.title, getLanguage()) : e.book, desc: L(BOOK_DESC), canHold: true };
  }
  if (e.kind === 'food') return { emoji: '🥡', name: e.name || 'Takeout', desc: fmt(L(DINE_TEXT.boxDesc), { n: e.sips }), canHold: true };
  if (e.kind === 'gift') return { emoji: e.icon || '🛍️', name: e.name || 'Shopping bag', desc: fmt(L(GOODS_TEXT.gift), { name: e.name || '' }), canHold: true };
  if (e.kind === 'lipstick') return lipstick.describe(e);
  if (e.kind === 'perfume') {
    const pf = perfumes.get(e.p);
    return { emoji: '🧴', name: pf ? localName(pf.product.name, getLanguage()) : e.name, desc: fmt(L(PERFUME_TEXT.desc), { style: L(STYLES[pf?.style] || STYLES.simple), n: e.sips }), canHold: true };
  }
  return { emoji: e.kind === 'glass' ? '🍹' : '☕', name: e.name || 'Coffee', desc: fmt(L(DRINK_DESC), { n: e.sips }), canHold: true };
}
function stowHeld() {
  if (!held) return;
  if (!bag.add(held)) { shop.toast(fmt(L(BAG_TEXT.full), { cap: bag.cap })); return; }
  const cosmetic = isCosmetic(held), name = describeEntry(held).name;
  setHeld(null);
  sfx.pop?.();
  shop.toast(cosmetic ? fmt(L(BAG_TEXT.toCloset), { name }) : fmt(L(BAG_TEXT.stored), { n: bag.size, cap: bag.cap }));
}
// Taking something new in your hand puts what you were holding into the bag
// (it used to just vanish). Only when the bag is full do we ask first, since
// then the old thing would be thrown away.
function handReady() {
  if (!held || !bag.full || isCosmetic(held)) return true; // (perfume and lipstick go to the wardrobe)
  return confirm(fmt(L(BAG_TEXT.fullSwap), { name: describeEntry(held).name, cap: bag.cap }));
}
function holdNew(h) {
  const old = held;
  if (old && bag.add(old)) {
    const name = describeEntry(old).name;
    setTimeout(() => shop.toast(isCosmetic(old) ? fmt(L(BAG_TEXT.toCloset), { name }) : fmt(L(BAG_TEXT.autoStow), { name, n: bag.size, cap: bag.cap })), 1800);
  }
  setHeld(h);
}
$('stow-btn').onclick = stowHeld;
$('stow-btn').querySelector('small').textContent = L(BAG_TEXT.put);
// Hold on to the collection's nodes now: the bag panel re-renders its children,
// so they can't be looked up by id once another tab has been shown.
itemEl('wallet-items-title'); itemEl('wallet-items');
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
  // The wardrobe's perfume and lipsticks: use one right there, or hold it.
  vanity: {
    useLabel: (e) => (e.kind === 'lipstick' ? '💄 ' + lipstick.label() : '🧴 ' + L(PERFUME_TEXT.spray)),
    onUse: (i) => {
      const e = bag.vanityList()[i];
      if (e?.kind === 'lipstick') bag.setVanity(i, lipstick.apply(e));
      else if (e) { bagUi.hide(); sprayPerfume(i); }
    },
    onHold: (i) => {
      const e = bag.vanityList()[i];
      if (!e || !handReady()) return;
      bag.setVanity(i, null);
      holdNew(e);
    },
    onDrop: (i) => bag.setVanity(i, null),
  },
  extra: () => {
    refreshItems();
    itemEl('wallet-items-title').querySelector('.bag-owned').textContent = L(BAG_TEXT.owned);
    return [itemEl('wallet-items-title'), itemEl('wallet-items')];
  },
  // The Wardrobe tab, a grid like the bag's: put clothes on or take them off
  // (trousers can only be swapped for another pair).
  closet: () => ({
    ids: inventory.list().filter(isClothes),
    describe: (id) => {
      const it = ITEMS[id];
      return { emoji: it.emoji, name: localName(it.name, getLanguage()), desc: localName(it.desc, getLanguage()), worn: it.wear ? isWorn(it, myLook) : myLook.tee === it.tee, kind: closetKind(it), price: it.price, color: closetColor(it), retired: RETIRED.has(id) };
    },
    actions: (id, redraw) => {
      const it = ITEMS[id];
      const w = document.createElement('button');
      if (it.wear) {
        const on = isWorn(it, myLook);
        w.className = 'chip' + (on ? ' on' : '');
        w.textContent = on ? (it.off ? '👕 ' + t('tee.off') : '✅ ' + L(BAG_TEXT.wearing)) : '✨ ' + t('tee.wear');
        w.disabled = on && !it.off;
        w.onclick = () => { outfitAction(id); redraw(); };
      } else { // a printed shirt
        const wearing = myLook.tee === it.tee;
        w.className = 'chip' + (wearing ? ' on' : '');
        w.textContent = '👕 ' + t(wearing ? 'tee.off' : 'tee.wear');
        w.onclick = () => {
          myLook = { ...myLook, tee: wearing ? null : it.tee };
          saveLook(myLook);
          setLook(myLook);
          redraw();
        };
      }
      return [w];
    },
  }),
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
$('keys-bag').textContent = L(BAG_TEXT.title);
onLanguageChange(() => {
  $('stow-btn').querySelector('small').textContent = L(BAG_TEXT.put);
  $('bag-btn').querySelector('small').textContent = L(BAG_TEXT.title);
  $('keys-bag').textContent = L(BAG_TEXT.title);
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

// The camera keeps its angle to the character (behind stays behind) unless
// camYaw says where it is. camVia: walking on from one frame into another
// (onto an open park's lawn, or off it): the camera and the way I'm walking
// carry over through that matrix instead of jumping.
function moveMeTo(targetScene, x, z, ry, camYaw = ry + cam.yaw - me.root.rotation.y, camVia = null) {
  me.root.parent?.remove(me.root);
  targetScene.add(me.root);
  me.root.position.set(x, 0, z);
  me.root.rotation.y = ry;
  lastSent = null; // teleport: tell others right away
  sendTimer = 0;
  teleports = (teleports + 1) % 100; // (others jump us there instead of sliding: core/players.js)
  if (camVia) {
    moveRef.yaw += camYaw - cam.yaw; // (a key held down keeps walking the same way)
    cam.yaw = camYaw;
    camera.position.applyMatrix4(camVia);
    return;
  }
  // A key held down keeps walking the same way as seen from the camera, not
  // the same way on the map: out of a station you'd walk back down the steps.
  moveRef.yaw += camYaw - cam.yaw;
  cam.yaw = camYaw;
  camera.position.set(x + Math.sin(cam.yaw) * cam.dist, 1 + cam.dist * 0.5, z + Math.cos(cam.yaw) * cam.dist);
}

// A shop's inside, built on the first visit and kept while it is one of the
// last few rooms visited (game/room-cache.js: phones drop the page when
// every room ever opened stays in memory).
const interiorCache = createRoomCache({
  max: lowSpec ? 4 : 10,
  build: (store) => {
    const built = interiorLoaded().buildInterior(store); // (enterStore and openParkRoom load it first)
    built.collision = new CollisionMap(built.colliders);
    if (built.zooHall) zooSounds.attach(built.zooHall); // (the Sea Animals hall's tanks call too)
    if (built.zooPark) zooVisit.adopt(built); // the zoo: its keeper, visitors, carts and feeding times
    built.setSignLang?.(signsTranslated ? getLanguage() : null);
    if (built.stations?.dartboards) built.dartPins = new DartPins(built.scene, built.stations.dartboards);
    stampStands.addRoom(store.id, built.scene, built.floorAt); // stamp stands inside (the Namsan summit)
    return built;
  },
  // Kept: the room you're in, the park behind its haunted house or runway,
  // and the open-air parks the street shows.
  keep: (id) => id === interior?.store?.id || id === interior?.front?.parkFront?.store?.id || openParks.some((o) => o.item.store.id === id),
  shown: () => [scene],
  onDrop: (id) => stampStands.dropRoom(id),
});
const roomFor = (store) => interiorCache.room(store);
// Walking into a room not built yet: a game tip covers the build (game/tips.js).
const roomTips = createRoomTips({ $, enterStore: (it) => enterStore(it), built: (store) => !!interiorCache.get(store.id) });
// Textures not drawn for a minute leave the GPU (game/gpu-janitor.js): far
// districts and kept rooms stop holding a phone's memory.
const gpuJanitor = createGpuJanitor({ roots: () => [scene, ...[...interiorCache.values()].map((b) => b.scene)] });
let signsTranslated = false; // signs in the player's language (the signs button, below)
let clerk = null; // the clerk NPC in the shop you're in
let trainer = null; // the gym's trainer NPC
let barkeep = null; // a club's bartender
let areaGuide = null; // an Information Center's area guide (the clerk is the game guide)
const TRAINER_LOOK = { model: 'trainer', hair: 'black', skin: 'warm', shirt: 'charcoal' };
let trainerLine = -1;
// 숨 요가·필라테스: the instructor leads the class at the front; members
// already on some mats follow her, and someone is on a reformer or two.
let instructor = null;
let instructorLine = -1;
function talkToInstructor() {
  instructorLine = nextInstructorLine(instructorLine);
  say(instructor, $('labels'), INSTRUCTOR_LINES[instructorLine]);
  me.root.rotation.y = Math.atan2(instructor.ch.root.position.x - me.root.position.x, instructor.ch.root.position.z - me.root.position.z);
}
// A gym or studio spot you're using: where you stand (or lie, on a bench or
// a reformer) and where you get off again.
let gymSpot = null; // { x, z, back: [x, z] | null }
function useGymSpot(st, kind) {
  const at = st.lie || { x: st.x, z: st.z, ry: st.face ?? me.root.rotation.y };
  me.root.position.set(at.x, 0, at.z);
  me.root.rotation.y = at.ry;
  gymSpot = { x: at.x, z: at.z, back: st.lie ? [st.x, st.z] : null };
  gymUi.show(kind);
}
function leaveGymSpot() {
  const s = gymSpot;
  gymSpot = null;
  if (gymUi.open) gymUi.close();
  if (s?.back && mode === 'store') me.root.position.set(s.back[0], 0, s.back[1]); // off the bench / reformer, beside it
}
let studioPose = ''; // the class's pose now (the instructor says each new one)
function updateStudio() {
  if (!interior?.studioNpcs) return;
  const pose = classPose(performance.now() / 1000);
  for (const o of interior.studioNpcs.class) o.ch.activity(pose);
  if (pose !== studioPose) {
    studioPose = pose;
    const p = YOGA_FLOW.find((q) => q.id === pose);
    if (instructor && p) showBubble(instructor, $('labels'), `${p.icon} ${L(p.name)}`, 2600);
  }
}
function talkToTrainer() {
  trainerLine = nextTrainerLine(trainerLine);
  const [ko, rom, en] = TRAINER_LINES[trainerLine];
  trainer.ch.play(trainerLine % 2 ? 'cheer' : 'clap');
  say(trainer, $('labels'), [ko, rom, en]);
  me.root.rotation.y = Math.atan2(trainer.ch.root.position.x - me.root.position.x, trainer.ch.root.position.z - me.root.position.z);
}
// Riding: your own bike (the 🚲 button), a tandem, a car, or a seat in someone's vehicle.
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
  if (kind && mode !== 'street' && !(interior?.zooPark && (kind === CART || kind === 3))) return; // (in the zoo: its carts, and a seat in a friend's)
  if (kind && seoulDal.busy) return; // (not in Seoul Dal's gondola)
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
  if (verb === 'invite' && !riding && (mode === 'street' || interior?.zooPark)) {
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
  if (!front || (mode !== 'street' && !interior?.zooPark)) return;
  setRiding(0);
  tandemDriver = inv.from;
  mySeat = inv.seat;
  setRiding(3);
  net.sendEmote(tandemMsg('join', inv.from, inv.seat));
}
// Items (saved on this device). A developer code in chat adds items.
const inventory = new Inventory();
// What I paid for clothes I bought myself: only those can be sold back at a
// second-hand shop (core/resale.js).
const receipts = new Receipts();
const giftReceipts = new GiftReceipts({ wallet: () => wallet }); // (core/gift-receipts.js; wallet is made below)
// Outfits are bought now. Players who already picked one at the start keep it.
try {
  if (!localStorage.getItem('mk.outfitGift')) {
    if (OUTFIT_ITEM(myLook.model)) inventory.add(OUTFIT_ITEM(myLook.model));
    localStorage.setItem('mk.outfitGift', '1');
  }
} catch { /* storage blocked */ }
if (String(myLook.model).startsWith('swim-')) { myLook = { ...myLook, model: 'basic' }; saveLook(myLook); setTimeout(() => setLook(myLook), 0); } // swimwear is only for the pool
if (OUTFIT_ITEM(myLook.model) && !isHanbokModel(myLook.model) && !inventory.has(OUTFIT_ITEM(myLook.model))) { myLook = { ...myLook, model: 'basic' }; saveLook(myLook); setTimeout(() => setLook(myLook), 0); }
// Clothes and accessory shops and the items list: buy (coins), wear, or
// take off. Buying puts it on right away.
function outfitAction(itemId) {
  const it = ITEMS[itemId];
  if (!it?.wear) return;
  const on = isWorn(it, myLook);
  if (!inventory.has(itemId)) {
    const note = { name: it.name, at: interior?.store.name };
    if (!wallet.spend(it.price, note)) { shop.toast(t('pet.noCoins', { n: it.price - wallet.coins })); return; }
    inventory.add(itemId);
    receipts.record(itemId, it.price, wallet.lastOp, note);
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
  refreshItems, refreshWallet, safety, shop, storeData, giftReceipts, receipts,
});
const { answerGift, onGiftMsg, canGift, startGift, peopleHere } = giftsGame;
// Seoul Bank: transfers to other players, operators only for now. (game/bank.js)
const bankGame = createBank({
  get interior() { return interior; }, get wallet() { return wallet; }, get sfx() { return sfx; },
  get nickname() { return nickname; }, cloud, shop, refreshWallet, peopleHere,
});
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
const dayPasses = new DayPasses();
const rideTickets = new RideTickets({ pass: () => dayPasses.has('rides') }); // (Another Land's 5-ride and Big 3 tickets)
let domeLoading = false;
// walkIn: stepping onto an open-air park from the street ({ x, z, ry, yaw } in
// the park's own metres): no door, no bell, the camera stays as it was.
function enterStore(item, walkIn = null) {
  // A Han River park laid on the street (game/han-parks.js) has no room:
  // asked to go in (a guide, a quest), you're just put on its path. (The
  // same for the night food carts: game/night-carts.js.)
  if (item.store.hanpark || item.store.carts) {
    if (mode !== 'street') leaveStore();
    moveMeTo(scene, item.door.x, item.door.z, me.root.rotation.y, cam.yaw);
    return;
  }
  // Every room's code (core/interior.js) and the shops' product descriptions
  // (game/store-descs.js) come with the first one walked into; the returned
  // promise keeps the tip cover up meanwhile (game/tips.js).
  const rooms = interiorLoaded();
  if (!rooms || !storeDescs.ready()) {
    if (domeLoading) return;
    domeLoading = true;
    return Promise.all([loadInterior(), storeDescs.load()]).then(() => { domeLoading = false; return enterStore(item, walkIn); }).catch((e) => { domeLoading = false; console.warn('rooms', e); });
  }
  // Seoul Another Dome: the stadium's code comes on the first visit.
  if (rooms.needsDome(item.store)) {
    if (domeLoading) return;
    domeLoading = true;
    return import('./core/dome.js').then((m) => { rooms.setDomeBuilder(m.buildDome); domeLoading = false; return enterStore(item); }).catch((e) => { domeLoading = false; console.warn('dome', e); });
  }
  // The zoo: its grounds and animals come on the first visit too.
  if (rooms.needsZoo(item.store)) {
    if (domeLoading) return;
    domeLoading = true;
    return import('./core/zoo-park.js').then((m) => { rooms.setZooBuilders(m); domeLoading = false; return enterStore(item, walkIn); }).catch((e) => { domeLoading = false; console.warn('zoo', e); });
  }
  // Another Land: the park's models come on the first visit too.
  if (rooms.needsPark(item.store)) {
    if (domeLoading) return;
    domeLoading = true;
    return import('./core/themepark.js').then((m) => { rooms.setParkBuilder(m.buildThemePark); domeLoading = false; return enterStore(item, walkIn); }).catch((e) => { domeLoading = false; console.warn('park', e); });
  }
  if (item.store.workshop === 'bank') bankGame.checkNews(); // money sent to me while I was away
  // The jjimjilbang and the pool: a day pass at the door (core/day-pass.js).
  const fee = dayPasses.feeFor(item.store);
  if (fee) {
    const name = DAY_PASS_TEXT[item.store.workshop];
    if (!dayPasses.enter(item.store, wallet, { name, at: item.store.name })) { shop.toast(fmt(L(DAY_PASS_TEXT.short), { name: L(name), n: fee })); return; }
    refreshWallet();
    shop.toast(fmt(L(DAY_PASS_TEXT.paid), { name: L(name), n: fee }));
  }
  setRiding(false);
  const metroRoom = (st) => st?.category === 'station' || st?.category === 'train';
  if (!metroRoom(item.store) && !walkIn) sfx.doorbell(); // automatic door sliding open (the subway has its own sounds)
  const store = item.store;
  const built = roomFor(store);
  built.dartPins?.clearAll(); // darts from an earlier visit (those people may be gone)
  if (mode === 'street') doorCam = { ...cam };
  interior = { ...built, store, front: item };
  mode = 'store';
  activeScene = built.scene;
  activeCollision = built.collision;
  if (walkIn) moveMeTo(built.scene, walkIn.x, walkIn.z, walkIn.ry, walkIn.yaw, walkIn.camVia);
  else {
    if (built.entry) moveMeTo(built.scene, built.entry.x, built.entry.z, built.entry.ry); // (a room whose door isn't at its south side: the zoo)
    else moveMeTo(built.scene, built.exit.x, built.exit.z - 1.4, Math.PI);
  }
  if (built.zooPark) { zooVisit.showLabels(); if (!walkIn && !item.parkFront) zooVisit.welcome(); }
  if (!store.open) document.body.classList.add('in-store'); // (an open-air park keeps the street's buttons)
  shop.enterStore(store);
  $('guide').hidden = true;
  if (guide?.kind === 'store' && guide.id === store.id) clearGuide();
  if (built.clerk && !built.clerkNpc) {
    built.clerkNpc = makeNpc($('labels'), store.category === 'school' ? teacherLabel() : store.workshop === 'tarot' ? '🔮 ' + L(TAROT_TEXT.reader) : store.workshop === 'kimchi' ? '👵 ' + L(KIMCHI_TEXT.teacher) : store.workshop === 'kimchi-buy' ? '👵 ' + MARKET_L('boss') : store.workshop === 'japchae' ? '👨‍🍳 ' + L(JAPCHAE_TEXT.teacher) : store.category === 'club' ? 'DJ' : store.category === 'bar' ? L(BARTENDER) : store.workshop === 'info' ? '🎮 ' + L(INFO_TEXT.gameGuide) : store.category === 'memorial' ? 'ℹ️ ' + L(roomKit().MEMORIAL_TEXT.guide) : store.workshop === 'pool' ? '🛟 ' + L(POOL_TEXT.lifeguard) : store.workshop === 'bank' ? bankGame.tellerLabel() : t('npc.clerk'), store.category === 'memorial' ? roomKit().GUIDE_LOOK : store.workshop === 'pool' ? roomKit().LIFEGUARD_LOOK : store.workshop === 'themepark' ? { ...randomLook(), ...PARK_UNIFORM } : undefined);
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
  if (built.stations?.instructor && !built.studioNpcs) {
    const hidden = () => { const o = makeNpc($('labels'), ''); o.tag.style.visibility = 'hidden'; return o; };
    const put = (o, x, z, ry) => { o.ch.root.position.set(x, 0, z); o.ch.root.rotation.y = ry; built.scene.add(o.ch.root); return o; };
    const ins = built.stations.instructor;
    const lead = put(makeNpc($('labels'), '🧘 ' + L(INSTRUCTOR_NAME)), ins.x, ins.z, ins.ry);
    const members = built.stations.studio.filter((s) => s.npc && s.kind === 'yoga').map((s) => put(hidden(), s.x, s.z, s.face));
    const riders = built.stations.studio.filter((s) => s.npc && s.kind === 'reformer').map((s) => {
      const o = put(hidden(), s.lie.x, s.lie.z, s.lie.ry);
      o.ch.activity('reformer');
      return o;
    });
    built.studioNpcs = { lead, class: [lead, ...members], all: [lead, ...members, ...riders] };
  }
  interior.studioNpcs = built.studioNpcs || null;
  instructor = built.studioNpcs?.lead || null;
  studioPose = '';
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
      const o = makeNpc($('labels'), '', built.themepark ? { ...randomLook(), ...PARK_UNIFORM } : undefined); // (Another Land's food truck sellers wear the park's uniform)
      o.tag.style.visibility = 'hidden'; // (the stall's sign says who they are; speech bubbles still show)
      o.ch.root.position.set(v.x, v.y || 0, v.z);
      if (v.sit) { o.ch.activity('sit'); o.labelY = 1.5 + (v.y || 0); } // (the food truck sellers sit up at their hatch)
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
  // DDP Hall: visitors already standing round, looking at the design pieces.
  if (built.stations?.visitors && !built.visitorNpcs) {
    built.visitorNpcs = built.stations.visitors.map((s) => {
      const o = makeNpc($('labels'), '');
      o.tag.style.visibility = 'hidden';
      o.ch.root.position.set(s.x, 0, s.z);
      o.ch.root.rotation.y = s.ry;
      built.scene.add(o.ch.root);
      return o;
    });
  }
  interior.visitorNpcs = built.visitorNpcs || null;
  // Bars: regulars already sitting at the counter or a table, or standing
  // round the sports pub's high tables (core/bar-styles.js).
  if (built.stations?.patrons && !built.patronNpcs) {
    built.patronNpcs = built.stations.patrons.map((s) => {
      const o = makeNpc($('labels'), '');
      o.tag.style.visibility = 'hidden'; // (speech bubbles still show)
      o.ch.root.position.set(s.x, s.y || 0, s.z); // (y: up in the stands at Seoul Another Dome)
      o.ch.root.rotation.y = s.ry;
      if (s.sit) o.ch.activity('sit');
      else if (s.act) o.ch.activity(s.act); // (the climbing gym's climbers, hanging on the wall)
      built.scene.add(o.ch.root);
      return o;
    });
    // Seoul Another Dome's cheer squads, on their stages: the cheer leader
    // (with a name tag, for the chants) and the cheer dancers.
    for (const s of built.stations.cheerSquad || []) {
      const o = makeNpc($('labels'), s.role === 'leader' ? '📣 ' + L(DOME_TEXT.leader) : '');
      if (s.role !== 'leader') o.tag.style.visibility = 'hidden';
      o.ch.root.position.set(s.x, s.y, s.z);
      o.ch.root.rotation.y = s.ry;
      o.squad = s;
      built.scene.add(o.ch.root);
      built.patronNpcs.push(o);
    }
  }
  interior.patronNpcs = built.patronNpcs || null;
  // Myeongdong Cathedral: the priest and the altar servers saying Mass
  // (core/cathedral-mass.js, with the room).
  if (built.stations?.mass && !built.massNpcs) built.massNpcs = new (roomKit().CathedralMass)(built, $('labels'), L);
  interior.massNpcs = built.massNpcs || null;
  // Each ride's attendant by its gate, named after the ride (the coaster's too).
  if (built.stations?.rideStaff && !built.rideStaff) {
    built.rideStaff = {};
    for (const st of built.stations.rideStaff) {
      const o = makeNpc($('labels'), RIDE_EMOJI[st.kind] + ' ' + t('ride.staff', { name: L(RIDE_NAME[st.kind]) }), { ...randomLook(), ...PARK_UNIFORM });
      o.ch.root.position.set(st.x, 0, st.z);
      o.ch.root.rotation.y = st.ry;
      built.scene.add(o.ch.root);
      built.rideStaff[st.kind] = o;
    }
  }
  interior.rideStaff = built.rideStaff || null;
  parkTickets.spawn(built); // (the island's ticket guide)
  interior.riderNpcs = parkRiders.spawn(built) || null;
  if (!balloonClown.spawn(built)) balloonClown.leave();
  if (built.stations?.coasterStaff && !built.coasterStaff) {
    built.coasterStaff = built.stations.coasterStaff.map((st) => {
      const o = makeNpc($('labels'), '🎢 ' + t('ride.staff', { name: L(COASTER_NAME) }), { ...randomLook(), ...PARK_UNIFORM });
      o.ch.root.position.set(st.x, 0, st.z);
      o.ch.root.rotation.y = st.ry;
      built.scene.add(o.ch.root);
      return o;
    });
  }
  interior.coasterStaff = built.coasterStaff || null;
  if (built.dome) wireDome(built, store);
  // The sports pub: when someone scores on the big screen, the whole pub
  // jumps up and cheers, and someone shouts "골!".
  if (built.stations?.match) {
    built.stations.match.onGoal = () => {
      if (interior?.store !== store) return;
      const crowd = interior.patronNpcs || [];
      crowd.forEach((o, i) => setTimeout(() => o.ch.play(i % 3 === 2 ? 'clap' : 'cheer'), i * 90));
      const fans = crowd.filter((_, i) => !built.stations.patrons[i]?.sit); // (the ones watching the screen)
      if (fans.length) say(fans[Math.floor(Math.random() * fans.length)], $('labels'), GOAL_SHOUT);
    };
  }
  // The record café: someone is already at the far end of the listening bar,
  // headphones on, nodding along.
  const bar = built.stations?.listening;
  if (bar?.length > 1 && !built.listenerNpcs) {
    const s = bar[0];
    const o = makeNpc($('labels'), '');
    o.tag.style.visibility = 'hidden';
    o.ch.root.position.set(s.x, 0, s.z);
    o.ch.root.rotation.y = s.ry;
    o.ch.activity('listen');
    built.scene.add(o.ch.root);
    s.taken = true; s.npc = true;
    if (s.rack) s.rack.visible = false;
    built.listenerNpcs = [o];
  }
  interior.listenerNpcs = built.listenerNpcs || null;
  if (store.pets && !built.pets) built.pets = new Pets(built.scene, built.room, (x, z, r) => built.collision.blocked(x, z, r), store.pets, 6, adoptables(store));
  interior.pets = built.pets || null;
  missionEvent('visit', store.id);
  deliveryArrived(store.id);
  if (store.music) enterMusicCafe();
  if (store.kpop) enterKpopCafe();
  if (store.cinema) enterKpopCafe('cinema', store.cinema);
  if (store.category === 'bar') enterMusicCafe('jazz'); // a quiet bar plays jazz
  if (built.massNpcs) { enterMusicCafe('organ'); shop.toast(L(roomKit().CATHEDRAL_TEXT.welcome)); } // the cathedral: its organ, softly
  if (store.genre) enterClub(store.genre);
  if (store.workshop === 'livecafe') liveStage.enter();
  const quiet = store.category === 'library';
  const museum = store.category === 'museum';
  const hello = store.category === 'school' ? PHRASES.school[0] : quiet ? PHRASES.library[0] : museum ? PHRASES.museum[0] : store.category === 'memorial' ? PHRASES.memorial[0] : store.category === 'culture' ? PHRASES.culture[0] : PHRASES.welcome[0];
  if (clerk && !walkIn) setTimeout(() => clerk && say(clerk, $('labels'), hello), 600);
  if (store.open) {
    // An open-air park is part of the street: the same people around you
    // (our spot sent in the street's metres), the street's people walking
    // by. Only from somewhere else (a taxi from a shop) join the street.
    if (!onStreetRoom()) { const [wx, wz] = myWorldSpot(); joinRoom(roomId, scene, { x: wx, z: wz }); }
    return;
  }
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
  shop.toast(L(roomKit().MEMORIAL_TEXT.laid));
}

// The War History Museum's floors, for the lift's floor list.
const memorialFloors = () => roomKit().MEMORIAL_FLOORS.map(({ floor, halls }) => ({
  floor, lines: [...(floor === 2 ? [L(roomKit().DONATED.title)] : []), ...halls.map((k) => L(roomKit().MEMORIAL_HALLS[k].name))],
}));

// The museums' lifts (the art museum and the War History Museum): each floor
// is its own interior; you step out by the lift.
function goMuseumFloor(floor) {
  if (mode !== 'store' || !['museum', 'memorial'].includes(interior?.store.category) || roomKit().floorOf(interior.store) === floor) return;
  const front = interior.front;
  standUp();
  if (museumUi.open) museumUi.close();
  if (clerk) { clerk.tag.style.display = 'none'; clerk.bubble?.remove(); clerk.bubble = null; } // the docent stays downstairs
  enterStore({ ...front, store: roomKit().museumFloorStore(front.store, floor) });
  const l = interior.stations.lift;
  moveMeTo(interior.scene, l.x, l.z + 0.6, Math.PI); // facing the lift, so the camera is out in the hall
  const fade = $('fade');
  if (fade) { fade.classList.remove('go'); void fade.offsetWidth; fade.classList.add('go'); }
}

// Another Land's haunted house (core/haunted.js): its own interior, entered
// from the park. As with the museum's floors, the way out to the street
// (taxi, map, teleport) is still the park's gate; only its exit door leads
// back into the park, in front of the house.
let hauntSwitching = 0; // (one scene change per tap, however fast you tap)
const hauntFade = () => { const fade = $('fade'); if (fade) { fade.classList.remove('go'); void fade.offsetWidth; fade.classList.add('go'); } };
function enterHaunted(inner = roomKit().HAUNT_STORE) { // (also the zoo's Sea Animals hall: SEA_STORE, from the zoo)
  const sea = inner === SEA_STORE;
  if (mode !== 'store' || !(sea ? interior?.zooPark : interior?.themepark) || performance.now() < hauntSwitching) return;
  hauntSwitching = performance.now() + 700;
  const front = interior.front;
  endRide();
  standUp();
  if (galleryUi.open) galleryUi.close();
  if (clerk) { clerk.tag.style.display = 'none'; clerk.bubble?.remove(); clerk.bubble = null; } // the ticket clerk stays outside
  if (sea) setRiding(false);
  if (sea) zooVisit.hideLabels();
  enterStore({ ...front, store: inner, parkFront: front });
  if (sea) { hauntFade(); return; }
  const built = interiorCache.get(roomKit().HAUNT_STORE.id);
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
  if (runwayUi.open) runwayUi.close();
  standUp();
  const fromRunway = interior.store.workshop === 'runway';
  if (fromRunway) { leaveRunwayLine(); runwayLine.clear(); }
  enterStore(park);
  if (fromRunway) {
    // Back in DDP Hall, in front of the runway's door, facing into the hall.
    const d = interior.stations.runwayDoor[0];
    moveMeTo(interior.scene, d.x, d.z + 0.6, 0);
  } else if (interior.zooPark) {
    // Out of the Sea Animals hall's door onto the zoo's path, facing away from it.
    const d = interior.stations.seaDoor[0];
    moveMeTo(interior.scene, d.x, d.z, d.ry);
  } else {
    moveMeTo(interior.scene, roomKit().HAUNT_SPOT.x, roomKit().HAUNT_SPOT.z, roomKit().HAUNT_SPOT.ry); // out in front of the door
  }
  hauntFade();
}

// DDP Hall's back door: the Curve Runway is its own room behind it (as with
// the haunted house, the way out to the street is still the hall's front door;
// the runway's door leads back into the hall).
function enterRunwayRoom() {
  if (mode !== 'store' || interior?.store.workshop !== 'ddp-hall' || performance.now() < hauntSwitching) return;
  hauntSwitching = performance.now() + 700;
  const front = interior.front;
  standUp();
  for (const o of interior.visitorNpcs || []) { o.bubble?.remove(); o.bubble = null; }
  runwayLine.clear(); // (whoever is in line will say so)
  enterStore({ ...front, store: RUNWAY_STORE, parkFront: front });
  hauntFade();
  setTimeout(() => { if (interior?.store.workshop === 'runway' && !runwayUi.open) shop.toast(L(roomKit().RUNWAY_TEXT.startHint), 5000); }, 800); // (after the fade)
}

const BARTENDER = { en: 'Bartender', ko: '바텐더', ja: 'バーテンダー', zh: '调酒师' };
const GOAL_SHOUT = ['골!!!', 'gol', 'GOAL!!!']; // the sports pub's crowd
// Seoul Another Dome (core/dome.js): the crowd and the cheer squads react to
// the game, the cheer leader leads a chant now and then.
function wireDome(built, store) {
  const dome = built.dome;
  if (performance.now() - (built.welcomedAt || -1e9) > 90e3) { built.welcomedAt = performance.now(); shop.toast(L(DOME_TEXT.welcome)); }
  if (dome.ev.onCheer) return;
  const here = () => interior?.store === store;
  const squadOf = (side) => (built.patronNpcs || []).filter((o) => o.squad?.side === side);
  const fans = () => (built.patronNpcs || []).filter((o) => !o.squad);
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  dome.ev.onCheer = (res, team) => {
    if (!here()) return;
    if (res === 'crack') { sfx.tock(1, 1500); return; }
    const side = dome.sideOf(team.id), other = side === 'home' ? 'away' : 'home';
    if (['1B', '2B', '3B', 'HR'].includes(res)) {
      dome.jump(side, res === 'HR' ? 1.4 : 0.9);
      if (res === 'HR') dome.jump('all', 0.6);
      sfx.crowd(res === 'HR' ? 1 : 0.55);
      squadOf(side).forEach((o, i) => setTimeout(() => o.ch.play('cheer'), i * 120));
      const crowd = fans();
      crowd.forEach((o, i) => { if (i % 2 === 0) setTimeout(() => o.ch.play(i % 4 ? 'clap' : 'cheer'), i * 80); });
      if (crowd.length) say(pickOne(crowd), $('labels'), pickOne(res === 'HR' ? DOME_SHOUT.HR : DOME_SHOUT.hit));
    } else if (res === 'K') {
      dome.jump(other, 0.6);
      sfx.crowd(0.25);
      const leader = squadOf(other).find((o) => o.squad.role === 'leader');
      if (leader) say(leader, $('labels'), pickOne(DOME_SHOUT.K));
    }
  };
  dome.ev.onChant = (side, team) => {
    if (!here()) return;
    const squad = squadOf(side);
    const leader = squad.find((o) => o.squad.role === 'leader');
    if (leader) say(leader, $('labels'), chantPhrase(team));
    squad.forEach((o, i) => setTimeout(() => o.ch.play(i ? 'clap' : 'cheer'), 800 + i * 100));
    dome.jump(side, 0.45);
    sfx.chant();
  };
}
// walkOut: stepping off an open-air park onto the street (openParks): you
// come out where you are, no bell.
function leaveStore(walkOut = false) {
  if (mode !== 'store') return;
  const openPark = interior.store?.open ? openParks.find((o) => o.item.store === interior.store) : null;
  // Trying something on only lasts while you are in the shop: walking out
  // without buying puts your own look back.
  if (!$('revert-look').hidden) { setLook(myLook); $('revert-look').hidden = true; }
  if (pool.mode?.kind === 'race') endRace(); // (friends hear we left)
  if (wearingSwim()) setLook(myLook); // out of the pool hall: own clothes back before the street sees you
  if (subway.metro) endMetro(); // (a taxi or teleport from the train)
  if (interior.store?.workshop === 'runway') { leaveRunwayLine(); runwayLine.clear(); }
  endRide();
  setRiding(false); // (the zoo's carts stay in the zoo)
  zooVisit.hideLabels();
  namsanCable.stop();
  standUp();
  clearMeal();
  closeHome();
  closeHatWorkshop(false);
  if (orderUi.open) orderUi.close();
  if (grillUi.open) grillUi.close();
  if (fishingUi.open) fishingUi.close();
  if (marketUi.open) marketUi.close();
  if (resaleUi.open) resaleUi.close();
  potatoMarket.close();
  if (ramenUi.open) ramenUi.close();
  if (kimchiUi.open) kimchiUi.close();
  if (japchaeUi.open) japchaeUi.close();
  if (kimbapUi.open) kimbapUi.close();
  if (kimchiSellUi.open) kimchiSellUi.close();
  tarotUi.close();
  leaveTarotLine(true);
  gymSpot = null; // (you leave by the door, not off the bench)
  for (const g of [pochaUi, jobUi, karaokeUi, runwayUi, photoUi, clawUi, battingUi, bowlingUi, climbUi, aimUi, galleryUi, hauntUi, dartsUi, duckUi, emblemUi, infoUi, saunaUi, gymUi, bookUi, academyUi, boardUi, museumUi, loveLockUi, wishUi]) if (g.open) g.close();
  beautyUi.close();
  listenBar.stop(); // (puts the café's music back first)
  liveStage.leave(); // (tells the room the song is over, while still in it)
  leaveMusicCafe();
  leaveKpopCafe();
  leaveClub();
  // Every name tag and bubble this room put on screen goes with it (Another
  // Land's ride attendants and guests, the bar regulars, the yoga class),
  // or they'd hang over the street where they last stood.
  for (const o of [clerk, trainer, barkeep, areaGuide, instructor, ...(interior.readerNpcs || []), ...(interior.vendorNpcs || []), ...(interior.patronNpcs || []), ...Object.values(interior.rideStaff || {}), ...(interior.riderNpcs || []), ...(interior.coasterStaff || []), ...(interior.studioNpcs?.all || []), ...(interior.massNpcs?.all || [])]) if (o) { o.tag.style.display = 'none'; o.bubble?.remove(); o.bubble = null; }
  balloonClown.hideLabels();
  parkTickets.hideLabels();
  clerk = null;
  trainer = null;
  instructor = null;
  barkeep = null;
  areaGuide = null;
  if (counterUi.open) counterUi.close();
  npcs.setVisible(true);
  if (interior.store?.category !== 'station' && interior.store?.category !== 'train' && !openPark) sfx.doorbell();
  const it = interior.front;
  const here = { x: me.root.position.x, z: me.root.position.z, ry: me.root.rotation.y };
  mode = 'street';
  activeScene = scene;
  activeCollision = collision;
  if (openPark) {
    // Out of an open-air park (walking off its lawn, or its Exit button):
    // where you stand, on the nearest free spot (the pier is over the water).
    const [wx, wz] = parkWorld(openPark, here.x, here.z);
    const [ex, ez] = findFreeSpot(wx, wz);
    moveMeTo(scene, ex, ez, here.ry + openPark.ry, cam.yaw + openPark.ry, walkOut ? openPark.toWorld : null);
  } else {
    // Face the street, the camera as it was when we went in (the street looks
    // the way it did). Step out a little in front of the door, on a spot that is not inside a
    // building (some shop fronts sit close to their neighbours).
    const ry = it.group.rotation.y;
    const [ex, ez] = findFreeSpot(it.door.x + Math.sin(ry) * 1.2, it.door.z + Math.cos(ry) * 1.2);
    moveMeTo(scene, ex, ez, ry, doorCam?.yaw);
    if (doorCam) { cam.pitch = doorCam.pitch; cam.dist = doorCam.dist; }
  }
  doorCam = null;
  document.body.classList.remove('in-store');
  shop.leaveStore();
  interior = null;
  if (guide) $('guide').hidden = false;
  if (!openPark || !onStreetRoom()) joinRoom(roomId, scene, { x: me.root.position.x, z: me.root.position.z }); // (out of an open park: already there)
}

// ---------- Subway station ----------
// Down by a stream (core/stream.js): which layer you are on and how high.
let byStream = null; // { i, y, low, stair } while on a stream's stairs or banks
const noBikeStairs = createNoBikeStairs({ toast: (m) => shop.toast(m), text: () => t('stairs.noBike') }); // (game/no-bike-stairs.js)
function updateStream(p, px0, pz0) {
  if (!streams.length) return 0;
  let s = streamAt(streams, p.x, p.z, !!byStream?.low);
  if (s?.stair && riding) { p.x = px0; p.z = pz0; s = streamAt(streams, p.x, p.z, !!byStream?.low); noBikeStairs(); } // no bikes down the steps (and say so)
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
  onArrive: (k) => subwayArrived(k),
  onNoBikeStairs: noBikeStairs,
  streetY: (p, px0, pz0) => { const y = updateStream(p, px0, pz0); return y || skateY || basketball.basketY || hillY(map.landmarks, p.x, p.z) || yardY(map.landmarks, p.x, p.z) || buskingGroundY(map.landmarks, p.x, p.z) || bukchonY(p.x, p.z) || slopeY(p.x, p.z) || namsanWalk.y(p.x, p.z); }, // down by a stream, in the skate park, up a park hill, Myeongdong Cathedral's hill, the busking bank, Bukchon's hill, Gyeongnidan-gil or the Namsan trail
});
const { stationStores, GATE_TEXT, METRO_TEXT, stationIndex, boardTrain, pickStop, metroGetOff, endMetro, passGate, gateFree, updateSubway } = subway;

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
const soundFiles = new SoundFiles(sfx, BASE); // shop blips (Kenney, CC0)
const motionSound = new MotionSound(sfx, soundFiles); // footsteps, wind, engine, bell and horn
// Bicycle bell / horn while riding: you and nearby players hear it.
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
$('saver-btn').setAttribute('aria-pressed', String(gfx.saver));
$('saver-btn').onclick = () => {
  gfx.setSaver(!gfx.saver);
  $('saver-btn').setAttribute('aria-pressed', String(gfx.saver));
  try { localStorage.setItem(SAVER_KEY, gfx.saver ? '1' : '0'); } catch { /* ignore */ }
};
$('steady-btn').setAttribute('aria-pressed', String(steadyWalk));
$('steady-btn').onclick = () => {
  steadyWalk = !steadyWalk;
  $('steady-btn').setAttribute('aria-pressed', String(steadyWalk));
  try { localStorage.setItem(STEADY_KEY, steadyWalk ? '1' : '0'); } catch { /* ignore */ }
};
// Gentle ride effects (the roller coaster): half the zoom and shake, no leaning.
const RIDE_FX_KEY = 'mk.rideFx'; // 'soft': the gentle ride effects (Settings)
let rideFxSoft = false;
try { rideFxSoft = localStorage.getItem(RIDE_FX_KEY) === 'soft'; } catch { /* ignore */ }
$('ridefx-btn').setAttribute('aria-pressed', String(rideFxSoft));
$('ridefx-btn').onclick = () => {
  rideFxSoft = !rideFxSoft;
  $('ridefx-btn').setAttribute('aria-pressed', String(rideFxSoft));
  try { localStorage.setItem(RIDE_FX_KEY, rideFxSoft ? 'soft' : ''); } catch { /* ignore */ }
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
// The record café's listening bar: headphones on, one song, only you hear
// it. (game/listening-bar.js)
const listenBar = createListeningBar({
  $, applyMusicBtn, music, shop, me: () => me, base: BASE,
  onChange: () => {
    action = STALE;
    // The headphones leave their stand while we wear them.
    for (const s of interior?.stations?.listening || []) if (s.rack) s.rack.visible = !s.npc && s !== listenBar.station;
    if (listenBar.station) me.root.rotation.y = listenBar.station.ry; // face the bar
  },
});
// Sinchon's live café: sing into your mic on the stage; only people in the
// café hear it. (game/live-stage.js)
const liveStage = createLiveStage({
  get interior() { return interior; }, get others() { return others; }, get net() { return net; }, get me() { return me; },
  get nickname() { return nickname; }, get sfx() { return sfx; },
  myId, safety, cloud, shop, music, applyMusicBtn, openPersonMenu: chat.openPersonMenu, testRoom: !!testRoom,
  standAt: (x, z, ry) => moveMeTo(activeScene, x, z, ry, cam.yaw), // (the camera stays put: you see your singer from the room)
});
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
// (lawn: an open picnic lawn with no trees, Yeouido's: one laid at an angle keeps its outline, mats lie square with it)
const streetLawns = map.areas.filter((a) => (a.k === 'park' && a.trees) || a.lawn).map((a) => {
  if (a.lawn) return lawnFrom(a.p);
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
    for (const [x, z] of r.pts) if (collision.blocked(x, z, 0.15) || onAnyRoad(lawnRoads, x, z, 0.3)) return true;
    return false;
  },
} : null;
const picnic = createPicnic({
  get interior() { return interior; }, get mode() { return mode; }, get seated() { return seated; },
  get me() { return me; }, get others() { return others; }, get bag() { return bag; }, get shop() { return shop; },
  get myId() { return myId; }, get held() { return held; },
  standUp: () => standUp(), dropHeld: () => setHeld(null), clearAction: () => { action = STALE; }, resendState: () => { lastSent = null; },
}, streetPicnic);
// Sold or given away: it can't stay spread. (After the change settles: taking
// it out of the bag into the hand empties the bag a moment before the hand fills.)
bag.onChange(() => queueMicrotask(() => picnic.checkBag()));
// Fetch with your pet on the same picnic lawns (src/game/frisbee.js).
const frisbee = createFrisbee({
  get me() { return me; }, get pet() { return petCare.pet; }, get room() { return picnic.room; }, get others() { return others; },
  get seated() { return seated; }, get riding() { return riding; }, get bag() { return bag; }, get held() { return held; }, get shop() { return shop; },
  get sfx() { return sfx; }, toStreet: (x, z) => peerSpot(x, z), petName, clearAction: () => { action = STALE; },
  handEmpty: (empty) => me.setHeld(empty ? null : heldKind()), // the frisbee in hand is out being thrown
});
// Snowballs and snowmen once the snow has settled (src/game/snowman.js,
// downloaded when it starts snowing: see the idle tick below).
const snowman = lazyPanel(() => import('./game/snowman.js').then(({ createSnowman }) => createSnowman({
  get mode() { return mode; }, get me() { return me; }, get others() { return others; }, get myId() { return myId; },
  get shop() { return shop; }, get scene() { return scene; },
  get depth() { return snowUniform.value; }, get snowing() { return weather.kind === 'snow'; },
  get onFoot() { return !riding && !seated; }, get look() { return myLook; },
  get heldKind() { return heldKind(); },
  snowNews: () => { // the snow has settled: a snow duck maker for the bag (once), and the news
    const got = !bag.has('duckmold') && held?.kind !== 'duckmold' && bag.add({ kind: 'duckmold' });
    shop.toast(L(got ? SNOW_LABELS.snowNewsGot : SNOW_LABELS.snowNews));
  },
  send: (m) => net.sendEmote(m), blocked: (x, z, r) => collision.blocked(x, z, r),
  bubble: (text) => showBubble(myLabel, $('labels'), text), sfx: () => sfx,
  clearAction: () => { action = STALE; }, resendState: () => { lastSent = null; },
})), {
  tick: () => { if (snowUniform.value > 0 || weather.kind === 'snow') snowman.ready().catch(() => {}); },
  action: () => null, more: () => [], onMsg: () => {},
  sync: null, pose: null, speed: 1, holdSync: null, grabSync: null, duckSync: null, holding: null, busy: null,
});
// Station vending machines: cheap drinks that work like a coffee to go.
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
// The route map pillar in a station: walk up to it to see the map up close.
function openRouteMap() {
  const rm = interior?.subway?.routeMap;
  if (!rm) return;
  const root = $('route-panel');
  const x = document.createElement('button');
  x.className = 'sheet-x'; x.textContent = '✕';
  x.onclick = () => { root.hidden = true; };
  const title = document.createElement('strong');
  title.className = 'wallet-title';
  title.textContent = '🗺️ ' + L(ROUTE_MAP_TEXT.title);
  const img = document.createElement('img');
  img.src = rm.canvas.toDataURL();
  img.alt = L(ROUTE_MAP_TEXT.title);
  // On a narrow phone the map is shown larger and scrolls sideways, starting
  // at your station.
  const wrap = document.createElement('div');
  wrap.className = 'route-scroll';
  wrap.append(img);
  root.replaceChildren(x, title, wrap);
  root.hidden = false;
  const fit = () => { if (rm.here && wrap.scrollWidth > wrap.clientWidth) wrap.scrollLeft = rm.here[0] / ROUTE_MAP.w * img.clientWidth - wrap.clientWidth / 2; };
  if (img.complete) fit(); else img.onload = fit;
}
const nearRouteMap = (p) => {
  const rm = interior?.subway?.routeMap;
  return rm && Math.abs(p.x - rm.x) < 1.8 && Math.abs(p.z - rm.z) < 1.4;
};
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
let routeTimer = 0, routeLen = 0;
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
  routeTimer = 0; // draw the route on the next frame (the camera stays as it is: the line shows the way)
}
function clearGuide() {
  guide = null;
  routePoly = null;
  setAutoWalk(false);
  $('guide').hidden = true;
  routeLine.clear();
}
$('guide-x').onclick = clearGuide;

// The full map (ui/map-view.js) downloads the first time it is opened.
const mapView = lazyPanel(async () => new (await import('./ui/map-view.js')).MapView({
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
    const op = openParkHere(); // (an open-air park: where I am on its lawn, in the street's metres)
    const pos = mode === 'street' ? me.root.position : op ? myPlace() : interior.front.door;
    return {
      me: { x: pos.x, z: pos.z, ry: mode === 'street' ? me.root.rotation.y : op ? me.root.rotation.y + op.ry : interior.front.group.rotation.y },
      others: outdoors() ? others.list() : [],
    };
  },
  onGuide: (g) => {
    if (mode === 'store') leaveStore();
    setGuide(g);
  },
  onTaxi: (dest) => rideTaxi(dest),
}), { hide: () => {}, tick: () => {}, _guAt: undefined });

// Minimap in the street's top-left corner; tap it for the full map. (game/minimap.js)
let minimap = null;
let minimapAlways = false; // Settings › Game settings (game/screen-layout.js); otherwise only while guided
import('./game/minimap.js').then(({ createMinimap }) => {
  minimap = createMinimap({
    hud: $('hud'), map, open: () => $('map-btn').click(),
    getMe: () => ({ x: me.root.position.x, z: me.root.position.z, ry: me.root.rotation.y }),
    getYaw: () => cam.yaw, getGuide: () => guide, getRoute: () => routePoly, visible: () => mode === 'street' && !subway.metro && (minimapAlways || !!guide),
  });
}).catch(() => { /* no minimap: the Map button still works */ });

// Taxi rides to a picked place on the map. (game/taxi.js, downloaded at the
// first ride, or when a friend asks to share theirs.)
const taxi = lazyPanel(() => import('./game/taxi.js').then(({ createTaxi }) => createTaxi({
  get map() { return map; }, get mode() { return mode; }, get me() { return me; },
  get interior() { return interior; }, get wallet() { return wallet; }, get riding() { return riding; }, $,
  get others() { return others; }, get net() { return net; }, safety, place: () => myPlace(), outdoors: () => outdoors(),
  clearGuide, findFreeSpot, input, leaveStore, mapView, missionEvent, moveMeTo, myLabel, refreshWallet, scene,
  setGuide, setRiding, shop, shops: () => storefronts.items,
  // The shop or place nearest (x, z), for a shared taxi's "going to …".
  placeName: (x, z) => {
    let best = null, bd = 80;
    for (const it of storefronts.items) {
      const d = Math.hypot(it.door.x - x, it.door.z - z);
      if (d < bd) { bd = d; best = it.store; }
    }
    return best && localName(best.name, getLanguage());
  },
})), { inCab: () => false, skipFrame: () => false, onLeave: () => {} });
const rideTaxi = (dest) => taxi.rideTaxi(dest);
$('map-btn').onclick = () => {
  const pos = myPlace();
  mapView.show(pos.x, pos.z);
};
// Bukchon Hanok Village's gate (a step of the new player's trip, below), and
// the cards that trip shows. "Back to the guide" puts you beside the square guide.
const FIRST_TAXI = { x: -1511, z: -902.5 }; // Bukchon's gate on Bukchon-ro (bukchon.json: local 36, -11.5)
function firstTaxiCard(lines, buttons) {
  const box = $('info-hint');
  const actions = document.createElement('div');
  actions.className = 'order-actions';
  for (const [cls, label, run] of buttons) {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = label;
    b.onclick = () => { box.hidden = true; run(); };
    actions.append(b);
  }
  const p = document.createElement('p');
  p.textContent = lines;
  box.replaceChildren(p, actions);
  box.hidden = false;
}
// The new player's first errand (core/quests.js STARTER 'trip', steps in
// TRIP): a little tour. Take out the bike, ride to Seongsu Station, get off
// (no bikes on the stairs), one stop to Seoul Forest and a walk in the park,
// the train on to Anguk, up into Bukchon, a walk to Cheonggyecheon; then a
// free taxi back to the square guide. New players, who start in Bukchon,
// get BUKCHON_TRIP instead: the Open House, Anguk Station, the train to
// Seongsu and up to the square guide. Each step
// shows its line on the ground; "Later" moves on to the next errand.
const TRIP_CARD = {
  home: { en: "🚕 Back in Seongsu! Tell the guide you made it.", ko: "🚕 성수에 돌아왔어요! 안내원에게 보고해요.", ja: "🚕 聖水に戻ってきた！案内係に報告しよう。", zh: "🚕 回到圣水了！去向导那里汇报吧。", es: "🚕 ¡De vuelta en Seongsu! Avisa al guía.", id: "🚕 Kembali di Seongsu! Lapor ke pemandu.", ar: "🚕 عدت إلى سونغسو! أبلغ المرشد.", vi: "🚕 Đã về Seongsu! Báo cho người hướng dẫn nhé.", hi: "🚕 सोंगसू वापस! गाइड को बताएँ।", fr: "🚕 De retour à Seongsu ! Va le dire au guide.", th: "🚕 กลับถึงซองซูแล้ว! ไปรายงานไกด์กัน" },
  taxi: { en: "🚕 Free taxi to Seongsu", ko: "🚕 무료 택시로 성수 가기", ja: "🚕 無料タクシーで聖水へ", zh: "🚕 坐免费出租车回圣水", es: "🚕 Taxi gratis a Seongsu", id: "🚕 Taksi gratis ke Seongsu", ar: "🚕 سيارة أجرة مجانية إلى سونغسو", vi: "🚕 Taxi miễn phí về Seongsu", hi: "🚕 सोंगसू तक मुफ़्त टैक्सी", fr: "🚕 Taxi gratuit pour Seongsu", th: "🚕 แท็กซี่ฟรีกลับซองซู" },
  offer: { en: "🚲 Let's take a little trip! First, take out your bike.", ko: "🚲 작은 여행을 떠나 봐요! 먼저 자전거를 꺼내요.", ja: "🚲 ちょっと旅に出よう！まずは自転車を出して。", zh: "🚲 来一次小旅行吧！先把自行车拿出来。", es: "🚲 ¡Hagamos un pequeño viaje! Primero, saca tu bici.", id: "🚲 Ayo jalan-jalan sebentar! Pertama, keluarkan sepedamu.", ar: "🚲 لنقم برحلة صغيرة! أولًا، أخرج دراجتك.", vi: "🚲 Cùng làm một chuyến đi nhỏ nhé! Trước tiên, lấy xe đạp ra.", hi: "🚲 चलिए छोटी सी सैर करें! पहले अपनी साइकिल निकालें।", fr: "🚲 Partons pour une petite balade ! D'abord, sors ton vélo.", th: "🚲 ไปเที่ยวทริปเล็กๆ กัน! ก่อนอื่นเอาจักรยานออกมา" },
  bike: { en: "🚲 Take out my bike", ko: "🚲 자전거 꺼내기", ja: "🚲 自転車を出す", zh: "🚲 拿出自行车", es: "🚲 Sacar mi bici", id: "🚲 Keluarkan sepeda", ar: "🚲 أخرج دراجتي", vi: "🚲 Lấy xe đạp", hi: "🚲 साइकिल निकालें", fr: "🚲 Sortir mon vélo", th: "🚲 เอาจักรยานออกมา" },
  later: { en: "Later", ko: "나중에", ja: "あとで", zh: "以后再说", es: "Más tarde", id: "Nanti saja", ar: "لاحقًا", vi: "Để sau", hi: "बाद में", fr: "Plus tard", th: "ไว้ทีหลัง" },
  getOff: { en: "🚲 No bikes on the stairs! Get off here and walk down to the trains.", ko: "🚲 계단에는 자전거를 못 가지고 가요! 여기서 내려서 걸어 내려가요.", ja: "🚲 階段は自転車では通れないよ！ここで降りて歩いて下りよう。", zh: "🚲 楼梯上不能骑车！在这里下车，走下去坐车吧。", es: "🚲 ¡No se puede bajar en bici! Bájate aquí y baja a pie hasta los trenes.", id: "🚲 Sepeda tidak boleh di tangga! Turun di sini dan jalan kaki ke kereta.", ar: "🚲 لا دراجات على الدرج! انزل هنا وامشِ إلى القطارات.", vi: "🚲 Không đi xe đạp xuống cầu thang được! Xuống xe ở đây và đi bộ xuống tàu.", hi: "🚲 सीढ़ियों पर साइकिल नहीं! यहीं उतरें और पैदल ट्रेन तक जाएँ।", fr: "🚲 Pas de vélo dans l'escalier ! Descends ici et va à pied jusqu'aux trains.", th: "🚲 ห้ามจักรยานลงบันได! ลงตรงนี้แล้วเดินลงไปขึ้นรถไฟ" },
  off: { en: "🚲 Get off", ko: "🚲 내리기", ja: "🚲 降りる", zh: "🚲 下车", es: "🚲 Bajarme", id: "🚲 Turun", ar: "🚲 انزل", vi: "🚲 Xuống xe", hi: "🚲 उतरें", fr: "🚲 Descendre", th: "🚲 ลงจากรถ" },
  wrongStop: { en: "This is {name}. Get off at {stop}!", ko: "여기는 {name}이에요. {stop}에서 내려요!", ja: "ここは{name}。{stop}で降りてね！", zh: "这里是{name}。请在{stop}下车！", es: "Esto es {name}. ¡Bájate en {stop}!", id: "Ini {name}. Turun di {stop}!", ar: "هذه {name}. انزل في {stop}!", vi: "Đây là {name}. Hãy xuống ở {stop}!", hi: "यह {name} है। {stop} पर उतरें!", fr: "C'est {name}. Descends à {stop} !", th: "ที่นี่คือ {name} ลงที่ {stop} นะ!" },
  done: { en: "🏮 This is Cheonggyecheon! Last step: the taxi back to Seongsu is on us. Then tell the square guide for your coins.", ko: "🏮 여기가 청계천이에요! 마지막은 무료 택시로 다시 성수로 돌아가요. 광장 안내원에게 보고하면 보상을 받아요.", ja: "🏮 ここが清渓川！最後は無料タクシーで聖水へ戻ろう。広場の案内係に報告するとご褒美がもらえるよ。", zh: "🏮 这里就是清溪川！最后一步：坐免费出租车回圣水，向广场向导汇报领取奖励。", es: "🏮 ¡Esto es Cheonggyecheon! Último paso: el taxi de vuelta a Seongsu es gratis. Luego avisa al guía de la plaza para cobrar.", id: "🏮 Ini Cheonggyecheon! Langkah terakhir: taksi gratis kembali ke Seongsu. Lalu lapor ke pemandu alun-alun untuk hadiahmu.", ar: "🏮 هذا تشونغيتشون! الخطوة الأخيرة: سيارة أجرة مجانية للعودة إلى سونغسو. ثم أبلغ مرشد الساحة لتأخذ مكافأتك.", vi: "🏮 Đây là Cheonggyecheon! Bước cuối: taxi miễn phí về lại Seongsu. Rồi báo cho người hướng dẫn quảng trường để nhận thưởng.", hi: "🏮 यह चॉन्गेचॉन है! आख़िरी कदम: सोंगसू वापसी की टैक्सी मुफ़्त है। फिर इनाम के लिए चौक के गाइड को बताएँ।", fr: "🏮 Voici Cheonggyecheon ! Dernière étape : le taxi du retour à Seongsu est offert. Ensuite, va voir le guide de la place pour ta récompense.", th: "🏮 ที่นี่คือชองกเยชอน! ขั้นสุดท้าย: นั่งแท็กซี่ฟรีกลับซองซู แล้วรายงานไกด์ประจำลานเพื่อรับรางวัล" },
};
const tripStep = () => (quests.active?.kind === 'trip' ? tripOf(quests.active)[quests.active.stage | 0]?.step || 'done' : null);
const fromBukchon = () => quests.active?.route === 'bukchon'; // the trip from the welcome guide (core/quests.js BUKCHON_TRIP)
// Through the Open House's gate (data/bukchon.js openHouse.box, district metres).
const bkOffset = (region.districts || []).find((d) => d.id === BUKCHON.district)?.offset || null;
const inOpenHouse = (x, z) => {
  if (!bkOffset) return false;
  const [x0, z0, x1, z1] = BUKCHON.openHouse.box, lx = x - bkOffset[0], lz = z - bkOffset[1];
  return lx > Math.min(x0, x1) && lx < Math.max(x0, x1) && lz > Math.min(z0, z1) && lz < Math.max(z0, z1);
};
// The pavement outside the subway exit nearest (x, z).
function nearestSubwayExit(x, z) {
  let best = null, bd = Infinity;
  for (const [s, sub] of subwayStations.entries()) for (const ex of sub.exits) {
    const go = outsideOf(ex), d = Math.hypot(go.x - x, go.z - z);
    if (d < bd) { bd = d; best = { kind: 'subway', id: stationStores[s].id, x: go.x, z: go.z, label: localName(stationStores[s].name, getLanguage()), d }; }
  }
  return best;
}
const zonePlace = (id) => { const z = zones.items.find((i) => i.zone.id === id); return z && { kind: 'zone', id, x: z.x, z: z.z, label: localName(z.zone.name, getLanguage()) }; };
// Where this step of the trip happens (null: nothing to walk to).
function tripPlace(step) {
  const here = myPlace();
  if (step === 'forest') return zonePlace('A-7');
  if (step === 'station' || step === 'stationNear' || step === 'angukWalk' || step === 'down') return nearestSubwayExit(here.x, here.z);
  if (step === 'forestStop' || step === 'anguk' || step === 'seongsuStop') return mode === 'street' ? nearestSubwayExit(here.x, here.z) : null;
  if (step === 'bukchon') return { kind: 'zone', id: 'bukchon', x: FIRST_TAXI.x, z: FIRST_TAXI.z, label: L(FIRST_TAXI_TEXT.place) };
  if (step === 'cheonggye') return zonePlace('B-2');
  if (step === 'square') return zonePlace('A-1');
  if (step === 'openHouse' && bkOffset) { // just inside its gate
    const [gx, gz] = BUKCHON.openHouse.gate;
    return { kind: 'zone', id: 'open-house', x: bkOffset[0] + gx, z: bkOffset[1] + gz - 3, label: L(TRIP_TEXT.openHouse) };
  }
  return null;
}
let tripShown = null, tripGuided = null, tripCard = null; // the step last announced / given a line; its card
function offerTrip(npc) {
  tripShown = tripStep();
  const first = fromBukchon() && tripShown === 'openHouse'; // (the trip from Bukchon starts on foot)
  if (tripShown !== 'bike' && !first) { tripGuided = null; return; } // (picked up again by tripTick)
  firstTaxiCard(L(first ? BUKCHON_TRIP_CARD.offer : TRIP_CARD.offer), [
    first ? ['primary', L(BUKCHON_TRIP_CARD.go), () => { tripGuided = null; tripTick(); }] : ['primary', L(TRIP_CARD.bike), () => setRiding(1)],
    ['chip', L(TRIP_CARD.later), () => {
      if (!tripStep() || !quests.skipStarter()) return;
      if (guide) clearGuide();
      talkToGuide(npc); // the next errand
    }],
  ]);
  tripCard = $('info-hint').firstChild;
}
// A step was done: say the next one, and draw its line.
function onTripStep() {
  const step = tripStep();
  if (!step || step === tripShown) return;
  tripShown = step;
  tripGuided = null;
  if (guide?.kind === 'subway' || guide?.kind === 'zone') clearGuide();
  if (step === 'done') {
    if (tripCard && $('info-hint').firstChild === tripCard) $('info-hint').hidden = true;
    sfx.pop?.();
    me.play('cheer');
    const route = quests.active?.route;
    if (route === 'bukchon' || route === 'toBukchon') { // on Seongsu Square, or at Bukchon's gate by its Information Center: a guide is right here
      firstTaxiCard(L(route === 'bukchon' ? BUKCHON_TRIP_CARD.done : BUKCHON_TRIP_CARD.arrived), [['primary', L(BUKCHON_TRIP_CARD.find), () => { const here = myPlace(), g = nearestGuidePlace(here.x, here.z); if (g) setGuide(g); }]]);
    } else tripTaxiCard();
    return;
  }
  if (tripCard && $('info-hint').firstChild === tripCard) $('info-hint').hidden = true; // the last step's card
  if (step === 'down' && riding) {
    firstTaxiCard(L(TRIP_CARD.getOff), [['primary', L(TRIP_CARD.off), () => setRiding(0)]]);
    tripCard = $('info-hint').firstChild;
  } else shop.toast(L(TRIP_TEXT[step]));
  tripTick();
}
// The trip's end: a free taxi back to the square guide (or look around and
// report to any guide later).
function tripTaxiCard() {
  firstTaxiCard(L(TRIP_CARD.done), [
    ['primary', L(TRIP_CARD.taxi), () => {
      if (!squareNpc) return;
      if (mode === 'store') leaveStore();
      const g = squareNpc.ch.root, sx = Math.cos(g.rotation.y), sz = -Math.sin(g.rotation.y);
      taxi.rideFree({ x: g.position.x + sx * 3, z: g.position.z + sz * 3, label: t('quest.guide') }, () => shop.toast(L(TRIP_CARD.home)));
    }],
    ['chip', L(FIRST_TAXI_TEXT.look), () => {}],
  ]);
}
// Twice a second: the trip's places reached, and its line once per step.
function tripTick() {
  const step = tripStep();
  if (!step || step === 'done') return;
  const p = me.root.position, near = (pl, r) => pl && mode === 'street' && Math.hypot(pl.x - p.x, pl.z - p.z) < r;
  if (step === 'bike' && (riding === 1 || riding === 2)) missionEvent('bike'); // (already on one)
  else if (step === 'forest' && near(zonePlace('A-7'), 30)) missionEvent('place', 'A-7');
  else if ((step === 'station' || step === 'stationNear' || step === 'angukWalk') && near(nearestSubwayExit(p.x, p.z), 10)) missionEvent('place', 'subway');
  else if (step === 'openHouse' && mode === 'street' && inOpenHouse(p.x, p.z)) missionEvent('place', 'open-house');
  else if (step === 'square' && near(zonePlace('A-1'), 20)) missionEvent('place', 'A-1');
  else if (step === 'down' && mode === 'store' && interior?.store?.category === 'station') missionEvent('subwayIn');
  else if (step === 'bukchon' && near(tripPlace('bukchon'), 20)) missionEvent('place', 'bukchon');
  else if (step === 'cheonggye' && near(zonePlace('B-2'), 35)) missionEvent('place', 'B-2');
  if (tripStep() !== step) return; // (moved on: onTripStep took care of it)
  if (mode === 'street' && tripGuided !== step) {
    const pl = tripPlace(step);
    // (not when already there: a line would also hide the "get off" card)
    if (pl && Math.hypot(pl.x - p.x, pl.z - p.z) > 15) { tripGuided = step; setGuide(pl); }
  }
}
setInterval(tripTick, 500);
function subwayArrived(k) {
  const id = stationStores[k].subway?.id;
  missionEvent('subway', id);
  const want = quests.active?.kind === 'trip' && tripOf(quests.active)[quests.active.stage | 0];
  const stop = want?.on === 'subway' && want.target !== id && stationStores.find((st) => st.subway?.id === want.target);
  if (stop) shop.toast(fmt(L(TRIP_CARD.wrongStop), { name: localName(stationStores[k].name, getLanguage()), stop: localName(stop.name, getLanguage()) }));
}
// Where I am on the street map (inside: the door I came in by).
function myPlace() {
  if (openParkHere()) { const [x, z] = myWorldSpot(); return { x, z }; } // (an open-air park: where I am on it)
  if (mode === 'street' || !interior?.front?.door) return me.root.position;
  return interior.front.door;
}
// Every guide who hands out errands: the square guide, and the game guide
// at each Information Center. The nearest one, for "go and see a guide".
function nearestGuidePlace(x, z) {
  const out = [];
  if (squareNpc) out.push({ kind: 'npc-guide', id: 'square-guide', x: squareNpc.ch.root.position.x, z: squareNpc.ch.root.position.z, label: t('quest.guide') });
  if (welcomeNpc) out.push({ kind: 'npc-guide', id: 'welcome-guide', x: welcomeNpc.ch.root.position.x, z: welcomeNpc.ch.root.position.z, label: t('quest.welcomeGuide') });
  for (const it of storefronts.items) if (it.store.workshop === 'info') out.push({ kind: 'store', id: it.store.id, x: it.door.x, z: it.door.z, label: localName(it.store.name, getLanguage()) });
  let best = null, bd = Infinity;
  for (const g of out) { const d = Math.hypot(g.x - x, g.z - z); if (d < bd) { bd = d; best = g; } }
  return best;
}
// Low on coins: point at the nearest guide for a paid errand (not more often
// than every 10 minutes, and only while there are errands left today).
const LOW_COINS = 5000; // won: about three subway fares
let lowCoinsAt = -Infinity, lastCoins = null;
function checkLowCoins() {
  const c = wallet.coins, prev = lastCoins;
  lastCoins = c;
  if (prev == null || c >= prev || c >= LOW_COINS) return; // only when spending takes you under
  if (onboard < 2 || Date.now() - lowCoinsAt < 10 * 60 * 1000) return;
  if (!quests.active && !quests.left) return; // nothing to give out today
  lowCoinsAt = Date.now();
  setTimeout(() => {
    if (!$('info-hint').hidden) { lowCoinsAt = -Infinity; return; } // something else on the card: next time
    firstTaxiCard(L(LOW_TEXT.hint), [
      ['primary', L(LOW_TEXT.go), () => { const here = myPlace(), g = nearestGuidePlace(here.x, here.z); if (!g) return; if (interior) leaveStore(); setGuide(g); }],
      ['chip', L(TRIP_CARD.later), () => {}],
    ]);
  }, 1500); // after the purchase toast
}
// Action button (and E / Space key).
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
const spaceBusy = () => { try { return [basketUi, ...Object.values(folkYard.uis), pochaUi, jobUi, karaokeUi, runwayUi, photoUi, clawUi, battingUi, bowlingUi, climbUi, aimUi, galleryUi, hauntUi, dartsUi, duckUi, emblemUi, infoUi, saunaUi, gymUi, bookUi, academyUi, boardUi, loveLockUi, wishUi, bukchonUi, orderUi, grillUi, fishingUi, marketUi, resaleUi, potatoMarket, ramenUi, kimchiUi, japchaeUi, kimbapUi, kimchiSellUi, tarotUi, counterUi, bagUi, dexUi, fishBookUi, stampUi, museumUi].some((g) => g?.open)
  || !$('map-panel').hidden || !$('settings-panel').hidden || !$('notes-panel').hidden; } catch { return true; } };
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target?.isContentEditable) return;
  if (e.code === 'Space' && !e.repeat && action && !spaceBusy()) {
    e.preventDefault(); // don't also click whatever button kept focus
    if (e.target instanceof HTMLButtonElement) e.target.blur();
    runAction();
  }
  // Enter opens the chat, like T and / (as in most games); E and Space act.
  if (e.code === 'Enter' && !e.repeat && !(e.target instanceof HTMLButtonElement) && !spaceBusy()
    && !document.querySelector('#hud .sheet:not([hidden])') && !$('chat-btn').hidden) { e.preventDefault(); $('chat-btn').click(); return; }
  if (e.code === 'KeyE' && !e.repeat) runAction(); // holding the key acts once
  if (e.code === 'KeyM') $('map-btn').click();
  // B for Bag: closes it if open; opens it only when no game or sheet is
  // taking keys and the bag button is on screen.
  if (e.code === 'KeyB' && !e.repeat) {
    if (bagUi.open) bagUi.hide();
    else if (!spaceBusy() && $('bag-btn').offsetParent) bagUi.show();
  }
  if (e.code === 'Escape') {
    if (!$('route-panel').hidden) $('route-panel').hidden = true;
    else if (!$('map-panel').hidden) mapView.hide();
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

// Coins and the rewarded-ad slot. The balance is kept on the server once
// supabase/015_wallet.sql is set up (see core/wallet.js).
const wallet = new Wallet(config.rewardedAd);
wallet.onSpend((paid, n) => { if (n > 0) soundFiles.play(paid ? 'pay' : 'short', paid ? 0.3 : 0.25); });
const walletReady = wallet.connect(cloud);
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
    // Plus how far along the first path the player is (-1: never on it)
    // and the language setting, read fresh at each report.
    send: (r) => cloud.reportSession({ ...r, counts: { ...r.counts, starter: quests.starterStep ?? -1, lang: getLanguage() } }),
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
const orderUi = lazyPanel(() => import('./ui/order-ui.js').then(({ OrderUI }) => new OrderUI({
  root: $('order-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onStamp: (n, total, coins) => { if (coins) shop.toast(t('order.stampToast', { n, total, coins })); },
})));
// Samgyeopsal grilling minigame: medals for good timing.
const grillUi = new GrillUI({
  root: $('grill-panel'),
  wallet,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); },
});
// Han River park: fishing at the pier and the railing, ramen at the kiosk.
// The catch goes in a bag (mk.fish) and is sold at the fish market.
// Fish book (mk.fishdex): every catch, kept even after selling.
// A one-time fresh start for everyone (FISH_BOOK_RESET): book, pity and bag
// cleared, the bag paid back at its selling price.
const fishRefund = resetFishBookOnce();
if (fishRefund?.coins) wallet.add(fishRefund.coins, undefined, { r: 'fish', once: 'fish-reset-1' });
if (fishRefund?.had) setTimeout(() => shop.toast(t('fish.resetRefund', { coins: fishRefund.coins })), 4000);
const fishBag = new FishBag();
const fishDex = new FishDex(globalThis.localStorage, fishBag);
const fishBookUi = lazyPanel(() => fishPanels().then(({ FishBookUI }) => new FishBookUI({ root: $('fishbook-panel'), dex: fishDex })));
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
  if (!rig) { rig = createFishingRig({ remote: true, waterY: () => hanPark()?.river?.position.y ?? -0.25 }); peerRigs.set(id, rig); }
  const f = fid ? fishById(fid) : null;
  rig.phase(ph, f || (ph === 'land' ? { rarity: 1 } : undefined));
  if (ph === 'cast') p.ch.play('cast');
  else if (ph === 'land' || ph === 'trash') p.ch.play('catch');
}
function onPeerTrophy(id, fid) {
  const f = fishById(fid), p = others.players.get(id);
  if (!f || f.rarity < TROPHY_RARITY || !p || p.hidden || safety.isBlocked(id, others.nameOf(id))) return;
  // Show time (the Ttukseom drone show or the Yeouido fireworks, not the
  // fountain show): your catch shows only on your own screen, so others'
  // trophies don't show here, wherever you are (Yozi).
  if (droneShowAt()?.on || fireworksAt()?.on) return;
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
const fishRig = createFishingRig({ sfx, waterY: () => hanPark()?.river?.position.y ?? -0.25 });
const fishingUi = lazyPanel(() => fishPanels().then(({ FishingUI }) => new FishingUI({
  root: $('fish-panel'),
  bag: fishBag,
  dex: fishDex,
  stats: new FishStats(), // mk.fishstats: casts, misses and escapes, for balancing
  pity: new FishPity(), // mk.fishpity: bites toward each park's first legend
  onRod: (on) => { rodOut = on; me.setHeld(heldKind()); lastSent = null; },
  onPhase: (ph, data) => {
    fishRig.phase(ph, data);
    // Others nearby see the cast, the bite, the reel and the catch too.
    if (FISH_PHASES.has(ph)) net.sendEmote('fishph:' + ph + (data?.id && !data.trash ? ':' + data.id : ''));
    if (ph === 'cast') me.play('cast');
    else if (ph === 'land' || ph === 'trash') me.play('catch');
    else if (ph === 'bite') buzz(60);
    // Huge bites (★4 or a legend): a long rumble on the bite and a tug while
    // you reel; only a landed legend gets the fanfare.
    const legend = data?.rarity === 5, huge = data && !data.trash && !data.mystery && data.rarity >= 4;
    if (ph === 'bite' && huge) { legendOn = true; buzz([250, 80, 250, 80, 500]); shake([$('scene'), $('fish-panel')]); }
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
    // ★3–★5: a trophy over my head, for everyone nearby. I always see my
    // own; during show time others don't (onPeerTrophy, Yozi).
    if (f.rarity >= TROPHY_RARITY) {
      showBubbleEl(myLabel, $('labels'), trophy(f, nickname), showMs(f), 'trophy tier-' + f.rarity);
      net.sendEmote('bigfish:' + f.id);
      sfx.reveal(true);
    }
    missionEvent('fish', f.id);
  },
  onEscape: () => showBubble(myLabel, $('labels'), '💨'),
  park: () => (hanPark() || interior)?.store?.id || null, // which ★3+ kinds bite here (PARK_FISH in core/fishing.js)
  rod: () => rodSkins.equipped,
  lucky: () => { const p = me.root.position; return !!hanPark()?.fishing?.some((f) => f.lucky && Math.hypot(p.x - f.x, p.z - f.z) < 1.8); },
  onClose: () => { if (fishCam && (mode === 'store' || hanPark()?.street)) Object.assign(cam, fishCam); fishCam = null; },
  // The stamp slamming down on a first catch: a deep double thud.
  onStamp: () => { sfx.tock(1, 260); setTimeout(() => sfx.tock(0.7, 180), 70); buzz(40); },
})), { state: 'idle' });
// Second-hand shops: sell clothes I bought back (core/resale.js), paid by
// the server wallet from its own ledger. Clothes bought before receipts
// existed are found once in the budget book.
receipts.scanOnce(wallet.log, inventory.list(), ITEMS, (note) => note?.at?.en === GIFT_TEXT.ledger.en);
// Below it, the second-hand rack: what players sold to the shops, at 40% (game/used-rack.js).
const usedRack = createUsedRack({ wallet, inventory, receipts, items: ITEMS, shop, sfx, refreshWallet, newOpId,
  refreshItems: () => { if (!$('bag-panel').hidden) refreshItems(); }, get interior() { return interior; } });
// Potato Market (감자마켓) by Dongmyo: players' mats of clothes to buy from,
// or spread your own (game/potato-market.js, loaded when near).
// Take off clothes that leave the closet (trousers: back to the plain jeans).
const takeOffItem = (id) => {
  const it = ITEMS[id];
  if (!it || !isWorn(it, myLook)) return;
  myLook = { ...myLook, ...(it.off || (it.wear.pants ? { pants: DEFAULT_LOOK.pants, skirt: null } : {})) };
  saveLook(myLook);
  setLook(myLook);
};
const potatoMarket = createPotatoMarketNear({ spot: map.landmarks.find((l) => l.type === 'potatomarket'), ready: walletReady,
  stalls: map.landmarks.filter((l) => l.type === 'fleastall'),
  scene, wallet, inventory, receipts, items: ITEMS, shop, sfx, refreshWallet, newOpId, resync: () => wallet.connect(cloud),
  refreshItems: () => { if (!$('bag-panel').hidden) refreshItems(); },
  takeOff: takeOffItem });
// Gift receipts: binds still waiting (I gave clothes), receipts for clothes
// given to me.
const giftSync = walletReady.then(() => {
  giftReceipts.run().catch(() => {});
  return giftReceipts.sync(inventory, receipts, ITEMS).catch(() => {});
});
// Clothes bought before the server kept purchases: twice their price back,
// once. Then clothes I had get a receipt at their shop price, and ones the
// old one-time sweep or that refund took out come back, the money kept
// (game/old-clothes.js runItemGrants, Yozi 2026-11-11). Accounts from before
// then get travel money once.
giftSync.then(() => { // (after it: a gift's receipt is in first)
  let grants, old, bonus;
  try { grants = wallet.server && !localStorage.getItem('mk.itemGrants'); old = wallet.server && !localStorage.getItem('mk.oldClothes'); bonus = wallet.server && !localStorage.getItem('mk.updateBonus'); } catch { return; }
  if (!grants && !old && !bonus) return;
  const g = { wallet, inventory, receipts, items: ITEMS, toast: (m) => shop.toast(m), takeOff: takeOffItem, refreshWallet,
    refreshItems: () => { if (!$('bag-panel').hidden) refreshItems(); } };
  import('./game/old-clothes.js').then(async (m) => {
    if (old) await m.runOldClothes(g).catch(() => {});
    if (grants) await m.runItemGrants(g).catch(() => {}); // (after it: refunded clothes come back too, 039)
    if (bonus) setTimeout(() => m.runUpdateBonus(g).catch(() => {}), 4000); // (after the toasts above)
  }).catch(() => {});
});
const resaleUi = lazyPanel(() => import('./ui/resale-ui.js').then(({ ResaleUI }) => new ResaleUI({
  root: $('resale-panel'),
  pct: () => wallet.resellPct,
  list: () => sellable(inventory.list(), ITEMS, receipts, wallet.resellPct),
  wearing: (id) => isWorn(ITEMS[id], myLook),
  onSell: (r) => sellClothes(r),
  rack: () => usedRack.view(),
  onOpen: () => usedRack.refresh(),
  onBuy: (r) => usedRack.buy(r),
})));
let selling = false; // one sale at a time
async function sellClothes({ id }) {
  const it = ITEMS[id], rc = receipts.get(id);
  if (!it || !rc || !inventory.has(id) || selling) return;
  selling = true;
  try { return await sellNow(id, it, rc); } finally { selling = false; }
}
async function sellNow(id, it, rc) {
  const coins = resaleCoins(rc.paid, wallet.resellPct);
  const name = L(it.name);
  const note = { name: it.name, at: interior?.store.name };
  // A fixed id per purchase: asking again (a retry, a second tap) never pays twice.
  const op = await opIdFor('resell:' + id + ':' + (rc.op || rc.bn || '') + ':' + rc.paid).catch(() => newOpId());
  const res = await wallet.resell({ id: op, n: coins, ref: rc.op, bn: rc.bn, paid: rc.paid, note });
  if (!res.ok) {
    if (res.why === 'noref') { receipts.forget(id); return fmt(L(roomKit().RESALE_TEXT.noref), { name }); }
    return L(res.why === 'closed' ? roomKit().RESALE_TEXT.closed : roomKit().RESALE_TEXT.offline);
  }
  // Paid (or sold before): only now does it leave the closet.
  if (isWorn(it, myLook)) { // take it off first (trousers: back to the plain jeans)
    myLook = { ...myLook, ...(it.off || (it.wear.pants ? { pants: DEFAULT_LOOK.pants, skirt: null } : {})) };
    saveLook(myLook);
    setLook(myLook);
  }
  inventory.remove(id);
  receipts.forget(id);
  if (res.n > 0) usedRack.sold(op, id); // on the rack for others
  refreshWallet();
  sfx.pop?.();
  const msg = fmt(L(roomKit().RESALE_TEXT.sold), { n: res.n });
  shop.toast(msg);
  clerk && say(clerk, $('labels'), ['감사합니다!', 'gamsahamnida!', L(roomKit().RESALE_TEXT.thanks)]);
  if (!$('bag-panel').hidden) refreshItems();
  return msg;
}
const marketUi = lazyPanel(() => fishPanels().then(({ FishMarketUI }) => new FishMarketUI({
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
    if (hanPark()?.fishBuy) return; // the park's stand has no clerk (DAILY MART's is across the lawn)
    clerk && say(clerk, $('labels'), ['싱싱하네요! 잘 팔았어요!', 'singsinghaneyo! jal parasseoyo!', t('fish.fresh')]);
  },
})));
// The ramen machine takes a ramyeon pack (and an egg) from the bag, bought
// at DAILY MART; the bowl is carried to a parasol table to eat.
const ramenUi = lazyPanel(() => import('./ui/ramen-ui.js').then(({ RamenUI }) => new RamenUI({
  root: $('ramen-panel'),
  bag,
  hand: { get held() { return held; }, take: () => setHeld(null) }, // a ramyeon pack or an egg in the hand counts too
  onSay: (line) => { const c = parkClerk(); if (c) say(c, $('labels'), line); },
  beforeCook: () => held?.g === 'ramyeon' || handReady(), // (a pack in the hand goes in the pot: the hand is free)
  onCooked: ({ egg }) => {
    holdNew({ kind: 'food', sips: FOOD_BITES, name: localName(egg ? RAMEN_BOWL.egg : RAMEN_BOWL.plain, 'en'), ramen: true });
    me.play('cheer');
    missionEvent('cook');
    togetherBonus('cook');
  },
})));
const RAMEN_BOWL = {
  plain: { en: 'Han River ramen', ko: '한강 라면' },
  egg: { en: 'Han River ramen with egg', ko: '계란 한강 라면' },
};
// DAILY MART's ramyeon and eggs go in the bag (for the ramen machine).
// The park's DAILY MART counter: near the kiosk clerk, the counter menu with
// the kiosk's goods (the products on the counter can still be looked at).
// (a park laid on the street has its own clerk: game/han-parks.js)
const parkClerk = () => clerk || hanPark()?.clerkNpc || null;
const martStore = () => { const st = hanPark().store; return { ...st, name: st.kiosk.name, products: st.products.filter((q) => q.kiosk) }; };
const martCounter = (p) => { const c = parkClerk(); return !!(hanPark()?.store.kiosk && c && Math.hypot(p.x - c.ch.root.position.x, p.z - c.ch.root.position.z) < 3); };
// Han River park: its kiosk's counter (ramyeon and eggs for the ramen machine).
const martAct = () => ({ key: 'mart', label: '🏪 ' + fmt(L(MART_TEXT.buy), { name: localName(hanPark().store.kiosk.name, getLanguage()) }), run: () => { parkClerk()?.ch.wave(); counterUi.show(martStore()); } });
let shopToastText = '';
function buyIngredient(product, coins) {
  const fail = (msg) => { shopToastText = msg; shop.toast(msg); return false; };
  if (product.ingredient === 'mat' && hasMat(bag, held)) return fail(L(MAT_TEXT.have)); // one is enough
  if (product.ingredient === 'frisbee' && hasFrisbee(bag, held)) return fail(L(FRISBEE_TEXT.have));
  if (bag.full) return fail(fmt(L(BAG_TEXT.full), { cap: bag.cap }));
  if (!wallet.spend(coins, { name: product.name, at: (interior || hanPark())?.store.name })) return fail(fmt(L(DINE_TEXT.poor), { n: coins }));
  refreshWallet();
  bag.add({ kind: 'gift', sips: 1, name: localName(product.name, 'en'), icon: SHOP_ICON[product.model] || '🛍️', g: product.ingredient, ...(product.ingredient === 'frisbee' ? { q: newFrisbee().q } : {}) }); // (a frisbee comes in a random colour)
  const who = parkClerk();
  who && say(who, $('labels'), ['감사합니다!', 'gamsahamnida!', t('coffee.enjoy')]);
  shopToastText = fmt(L(INGREDIENT_TEXT.got), { name: localName(product.name, getLanguage()) });
  shop.toast(shopToastText);
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
const jobUi = lazyPanel(() => import('./ui/job-ui.js').then(({ JobUI }) => new JobUI({
  root: $('job-panel'),
  wallet,
  shifts,
  onSay: (line) => clerk && say(clerk, $('labels'), line),
  onPaid: (coins) => { refreshWallet(); if (coins) { shop.toast(fmt(L(JOB_TEXT.paid), { n: coins })); me.play('cheer'); } },
})));
function openJob(job) {
  if (job === 'delivery') startDelivery();
  else jobUi.show(job, interior.store);
}
const karaokeUi = lazyPanel(() => import('./ui/karaoke-ui.js').then(({ KaraokeUI }) => new KaraokeUI({
  root: $('karaoke-panel'),
  wallet,
  onStart: () => { karaokeMusic = music.on; if (music.on) { music.setOn(false); applyMusicBtn(); } },
  onEnd: () => { if (karaokeMusic && !music.on) { music.setOn(true); applyMusicBtn(); } karaokeMusic = false; },
  onScore: (n) => net.sendEmote(karaokeMsg(n)),
  onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); me.play(medal ? 'cheer' : 'wave'); },
})));
let karaokeMusic = false;
// Curve Runway (DDP, ui/runway-ui.js): while the show is on, the movement
// loop walks the character down the runway and back (runwayStep), the
// camera watching from the photographers' end; the poses play here.
let runwayMusic = false, runwayCam = null, runwaySpin = 0;
const runwayUi = lazyPanel(() => import('./ui/runway-ui.js').then(({ RunwayUI }) => new RunwayUI({
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
    leaveRunwayLine(); // (the walk is over, or was stopped)
    // Step aside off the start, so the next walker has it.
    const st = interior?.stations?.runway?.[0], p = me.root.position;
    if (st && Math.hypot(p.x - st.x, p.z - st.z) < 0.6) { p.x = st.x + 2.3; p.z = st.z + 0.3; me.root.rotation.y = -Math.PI / 2; lastSent = null; }
  },
  onPose: (i, kind, label) => {
    if (!label) { me.play('shrug'); return; } // missed the beat
    interior?.stations?.runway?.[0]?.flash?.();
    sfx.snap();
    for (const o of interior?.audienceNpcs || []) if (Math.random() < 0.6) o.ch.play('clap'); // the audience claps
    if (kind === 'turn') runwaySpin = 0.7;
    else runwayPose(me, kind); // (others see it from the photo's message, onJudge)
  },
  onFinish: (score) => {
    runwayLine.addScore(myId, score);
    net.sendEmote(lineMsg.score(score));
  },
  line: {
    status: () => {
      const now = Date.now(), order = runwayLine.order(now);
      const name = (id) => (id === myId ? nickname : others.nameOf(id) || '?');
      return {
        order: order.map((q) => ({ name: name(q.id), walking: q.walking, me: q.id === myId })),
        board: runwayLine.board().map((r) => ({ name: name(r.id), n: r.n })),
        inLine: runwayLine.has(), full: order.length >= 4,
      };
    },
    join: () => { if (runwayLine.join(Date.now())) runwayHiAt = 0; },
    leave: () => leaveRunwayLine(),
  },
  onJudge: (n, label) => {
    const tier = tierOf(label);
    // Every photo that lands gets a word: one of the list at random.
    const photo = n.kind === 'pose' && tier !== 'm';
    const word = photo ? pickWord() : null, pose = photo ? runwayUi.game?.poses?.[n.i] : null;
    runwayReact(me.root, tier, word);
    net.sendEmote(runwayMsg(tier, word, pose));
  },
  onMedal: (medal, coins) => {
    if (coins) shop.toast(t('grill.medalToast', { coins }));
    me.play(medal ? 'cheer' : 'wave');
    if (medal) for (const o of interior?.audienceNpcs || []) o.ch.play(Math.random() < 0.5 ? 'cheer' : 'clap');
  },
})), { walking: false, game: null, line: null });
// Walking with friends (core/runway-line.js): a line of up to four in the
// runway room. While in it I say so every LINE_HI_S seconds; when it is my
// turn (and stays so a moment, so that two people joining at once settle),
// I am taken to the start and the walk begins.
const runwayLine = new RunwayLine(myId);
let runwayHiAt = 0, runwayTurnFor = 0; // (wall clock: a slow frame rate must not slow the hellos)
function leaveRunwayLine() {
  if (!runwayLine.has()) return;
  runwayLine.leave();
  net.sendEmote(lineMsg.bye());
}
function runwayTick(dt) {
  if (!runwayLine.has()) { runwayTurnFor = 0; return; }
  const now = Date.now();
  runwayLine.setWalking(!!runwayUi.game);
  if (now - runwayHiAt >= LINE_HI_S * 1000) { runwayHiAt = now; net.sendEmote(lineMsg.hi(runwayLine.mine.at, !!runwayUi.game)); }
  if (!runwayUi.game && runwayLine.myTurn(now)) {
    runwayTurnFor += dt;
    if (runwayTurnFor > 0.8) startRunwayTurn();
  } else runwayTurnFor = 0;
}
function startRunwayTurn() {
  runwayTurnFor = 0;
  const st = interior?.stations?.runway?.[0];
  if (!st) { leaveRunwayLine(); return; }
  standUp();
  me.root.position.set(st.x, 0, st.z); me.root.rotation.y = st.ry;
  if (!runwayUi.open) runwayUi.show();
  runwayUi.play().then(() => { if (!runwayUi.game) leaveRunwayLine(); }); // (no sound: can't walk)
  runwayLine.setWalking(true);
  runwayHiAt = 0; // tell everyone right away
  shop.toast(L(roomKit().RUNWAY_TEXT.yourTurn));
}
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
const photoUi = lazyPanel(() => import('./ui/photo-ui.js').then(({ PhotoUI }) => new PhotoUI({
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
})));
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
// A prize for your home (claw machine plushies, the balloon booth's bear): true if new.
const givePrize = (id) => { const added = inventory.add(id); refreshItems(); labelDecor(); return added.length > 0; };
const clawUi = lazyPanel(() => import('./ui/claw-ui.js').then(({ ClawUI }) => new ClawUI({
  root: $('claw-panel'),
  wallet,
  give: givePrize,
  itemName: (id) => localName(ITEMS[id]?.name, getLanguage()),
  onWin: () => { me.play('cheer'); sfx.pop?.(); },
})));
// Arcade: batting cage, shooting galleries and darts. (game/arcade.js)
const arcadeGame = createArcade({
  get interior() { return interior; }, get others() { return others; }, get me() { return me; },
  get net() { return net; }, get activeScene() { return activeScene; }, get nickname() { return nickname; }, $, cam, camera, canvas, myId, safety, sfx, shop, give: givePrize,
});
const { onDartsMsg, arcade, galleryUi, hauntUi, battingUi, dartsUi, bowlingUi, climbUi, aimUi, ARCADE_OPEN, openArcade, freshInvite } = arcadeGame;
// Tarot cafés: readings, two readers, the waiting line. (game/tarot.js)
const tarot = createTarot({
  get seated() { return seated; }, get interior() { return interior; }, get clerk() { return clerk; },
  get me() { return me; }, get others() { return others; }, get net() { return net; },
  get nickname() { return nickname; }, get action() { return action; }, set action(v) { action = v; },
  get sendTimer() { return sendTimer; }, set sendTimer(v) { sendTimer = v; }, $, STALE, myId, myLabel,
  refreshWallet, safety, sfx, shop, sitDown, standUp, wallet,
});
const { tarotUi, TAROT_TEXT, leaveTarotLine, tarotAction, tarotReader, TAROT_LINES, tarotTick } = tarot;
// Bumper cars in Another Land: six a round, a waiting line. (game/bumper.js)
// Downloaded the first time Another Land's rink is near (bumper.ready() in the
// frame loop); until then it has no button and nothing to draw.
const bumper = lazyPanel(() => import('./game/bumper.js').then(({ createBumper }) => createBumper({
  get interior() { return mode === 'store' ? interior : null; }, get seated() { return seated; },
  get me() { return me; }, get others() { return others; },
  get action() { return action; }, set action(v) { action = v; },
  get sendTimer() { return sendTimer; }, set sendTimer(v) { sendTimer = v; },
  $, STALE, myId, shop, sfx, wallet, input, moveRef, cam, sitDown, standUp, missionEvent: (...a) => missionEvent(...a),
  ridePass: () => rideTickets.covers('bumper'), useRideTicket: () => useRideTicket('bumper'),
})), { tick: () => {}, action: () => null, state: () => {}, onStandUp: () => {}, driving: false, inCar: false });
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
// The folk games yard in Namsangol Hanok Village: yutnori, tuho, jegichagi
// and neolttwigi with the locals. (game/folk-yard.js)
const folkYard = createFolkYard({
  get map() { return map; }, get mode() { return mode; }, get me() { return me; },
  get action() { return action; }, set action(v) { action = v; },
  $, STALE, scene, shop, wallet, randomLook, dayKey, refreshWallet: () => refreshWallet(),
});
onLanguageChange(() => folkYard.relabel());
// Another Land's balloon clown on platform shoes. (game/balloon-clown.js)
const balloonClown = createBalloonClown({
  get me() { return me; }, get held() { return held; }, get action() { return action; }, set action(v) { action = v; },
  $, STALE, shop, wallet, randomLook, refreshWallet: () => refreshWallet(), handReady: () => handReady(), holdNew: (h) => holdNew(h), setHeld: (h) => setHeld(h),
});
onLanguageChange(() => balloonClown.relabel());
// Another Land's ticket guide at the island's gate, and the booth below. (game/park-tickets.js)
const parkTickets = createParkTickets({
  get interior() { return mode === 'store' ? interior : null; }, get action() { return action; }, set action(v) { action = v; },
  $, STALE, shop, sfx, wallet, randomLook, tickets: rideTickets, refreshWallet: () => refreshWallet(),
  passName: () => L(DAY_PASS_TEXT.rides), buyRidePass: () => buyRidePass(),
});
onLanguageChange(() => parkTickets.relabel());
// Another Land's mirror maze: a clock from the door to the far side. (game/mirror-maze.js)
const mirrorMaze = createMirrorMaze({ shop });
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

// Playing at a busking zone: start/stop, tips and the busking song. (game/busking-play.js)
const buskPlay = createBuskingPlay({
  get me() { return me; }, get mode() { return mode; }, get action() { return action; }, set action(v) { action = v; },
  busking, myLabel, musicCafe, music, applyMusicBtn, sfx, shop, $, STALE,
});
const { stopBusking, buskTip, updateBuskMusic, buskerAct } = buskPlay;
// Name tag studio: emblems and name colours (a place to spend coins).
const emblems = new EmblemCollection();
const emblemUi = lazyPanel(() => import('./ui/emblem-ui.js').then(({ EmblemUI }) => new EmblemUI({
  root: $('emblem-panel'),
  owned: emblems,
  wallet,
  name: nickname,
  rename: (raw) => renameMe(raw),
  renameInfo: () => renameInfo(),
  getLook: () => myLook,
  wearLook: (patch) => {
    myLook = { ...myLook, ...patch };
    for (const k of Object.keys(patch)) if (patch[k] == null) delete myLook[k];
    saveLook(myLook);
    setLook(myLook);
    me.play('cheer');
  },
})));
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
const storeAt = (st) => placeOf(st, region.center, llToLocal);
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
    // One poster texture shared by every district (they're all the same
    // picture; one canvas each was 10 identical copies).
    const tex = supportTexture(signLang(), { qrUrl, label });
    hiringRedraws.push(tex.redraw);
    for (const [d, hub] of Object.entries(hubs)) {
      if (picked[d] && picked[d].dist < 300 && adPosters.setPoster(picked[d].id, tex)) {
        used.add(picked[d].id); supportPlaces.push([d, 'spot', picked[d].id]);
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
      if (!wall) continue;
      const w = Math.min(5.6, wall.len - 1);
      const poster = wallPoster(tex, wall, Math.min(wall.h - w * 0.32 - 1, 6.4), w);
      scene.add(poster);
      farExtras.push(poster);
      supportPlaces.push([d, 'wall', [Math.round(wall.x), Math.round(wall.z), wall.nx, wall.nz, wall.h]]);
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
      const poster = wallPoster(tex, wall, Math.min(wall.h - w * 0.32 - 1, 7.2), w);
      scene.add(poster);
      farExtras.push(poster);
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
  const p = myPlace(); // inside a shop: from its door
  let best = null, bd = Infinity;
  for (const it of storefronts.items) {
    if (!test(it.store)) continue;
    const d = Math.hypot(it.door.x - p.x, it.door.z - p.z);
    if (d < bd) { bd = d; best = it.store.id; }
  }
  return best;
}
const infoUi = lazyPanel(() => import('./ui/info-ui.js').then(({ InfoUI }) => new InfoUI({
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
})));
// The first-time hint waits until the daily check-in card is closed.
if (onboard === 0) { // first time: just the high five, nothing else in the way
  const box = $('info-hint');
  const p0 = document.createElement('p');
  p0.textContent = L(ONBOARD_TEXT.hi5);
  // The controls line goes in the same card instead of a second one on top of
  // it (phones had both stacked over the street).
  const p1 = document.createElement('p');
  p1.className = 'fine';
  p1.textContent = t(input.isTouch ? 'help.mobile' : 'help.desktop');
  box.replaceChildren(p0, p1);
  box.hidden = false;
  dismissHelp();
} else setTimeout(function infoHintWhenFree() {
  if (!$('daily-panel').hidden) { setTimeout(infoHintWhenFree, 1500); return; }
  showInfoHint($('info-hint'), { onGo: () => guideToPlace({ store: nearestStore((st) => st.workshop === 'info') || 'info-center' }) });
}, 2500); // after the daily card would have opened (1.2 s)
// Jjimjilbang: hot kiln and ice room, and the sheep towel.
const saunaUi = lazyPanel(() => import('./ui/sauna-ui.js').then(({ SaunaUI }) => new SaunaUI({
  root: $('sauna-panel'),
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
})));
// Poses held while doing something: the gym, fishing, dancing in a club.
// Others see them too (the "ac" field).
let dancing = false;
let debugPose = null;
function currentActivity() {
  if (debugPose) return debugPose; // (?debug: __mk.forcePose)
  if (mode === 'street' && snowman.pose) return snowman.pose; // gathering snow, rolling a snowball
  if (pool.act) return pool.act; // in the pool: swimming, a tube, arms up for a dive
  if (listenBar.listening) return 'listen'; // headphones on at the record café
  if (seated && !seated.lie && held?.kind === 'book' && bookUi.open) return 'read'; // reading on any seat (a bench, a picnic mat, a café chair)
  if (seated?.mat) return seated.lie ? 'mat' : 'matsit'; // a picnic mat (Han River park, Seoul Forest): lying or sitting
  if (seated?.lie) return 'lie'; // a clinic bed, the operating table
  if (seated?.bumper != null) return 'bumper'; // in a bumper car: sat back, hands on the wheel
  if (dancing || busking.performing) return 'dance'; // (busking: playing on the stage)
  if (gymUi.open) return gymUi.pose; // (the gym, a yoga mat, a reformer)
  if (fishingUi.open) return fishingUi.state === 'reel' ? 'reel' : 'fish'; // reeling in: the reel clip
  return null;
}
// Gym: each finished set makes walking a tiny bit faster.
const gymUi = lazyPanel(() => import('./ui/gym-ui.js').then(({ GymUI }) => new GymUI({
  root: $('gym-panel'),
  log: gymLog,
  onRep: () => { if (!gymUi.pose) me.play('cheer'); },
  onSet: (boost, kind) => { showBubble(myLabel, $('labels'), kind === 'yoga' ? '🧘' : kind === 'reformer' ? '✨' : '💪'); sfx.pop?.(); },
})), { pose: null, kind: null });
// The studio's free mats and reformers (the ones nobody is on).
const STUDIO_ACT = {
  yoga: { en: 'Join the yoga class', ko: '요가 수업 함께하기', ja: 'ヨガのクラスに参加', zh: '加入瑜伽课' },
  reformer: { en: 'Pilates on the reformer', ko: '리포머 필라테스', ja: 'リフォーマーでピラティス', zh: '核心床普拉提' },
};
const studioSpot = (p) => interior?.stations?.studio?.find((s) => !s.npc && Math.hypot(p.x - s.x, p.z - s.z) < (s.kind === 'yoga' ? 0.95 : 0.9));
// Library books: carry one, read it sitting anywhere.
const BOOK_PAGE_KEY = 'mk.bookPages';
const bookPages = (() => { try { return JSON.parse(localStorage.getItem(BOOK_PAGE_KEY) || '{}') || {}; } catch { return {}; } })();
// 효재어학당: the course book opens when you sit at a desk or talk to the
// teacher.
const ACADEMY_OPEN = { en: 'Courses', ko: '수강 신청 · 수업', ja: '受講・授業', zh: '报名 · 上课' };
const academyUi = lazyPanel(async () => {
  const [{ AcademyUI }, { Academy }] = await Promise.all([import('./ui/academy-ui.js'), import('./core/academy.js')]);
  return new AcademyUI({
  root: $('academy-panel'),
  academy: new Academy(),
  name: () => nickname,
  onReward: (n) => { wallet.add(n, undefined, { r: 'academy' }); refreshWallet(); },
  sfx: () => sfx.pop?.(),
});
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
const loveLockUi = lazyPanel(() => import('./ui/love-lock-ui.js').then(({ LoveLockUI }) => new LoveLockUI({
  root: $('love-lock-panel'), store: loveLockStore, wallet, name: () => nickname, toast: (m) => shop.toast(m),
  onHung: () => { refreshWallet(); me.play('cheer'); },
})), { busy: false });
const loveLockActs = () => [
  { key: 'lovelock-hang', label: '🔒 ' + L(LOCK_LABELS.hang), run: () => loveLockUi.show('write') },
  { key: 'lovelock-read', label: '💌 ' + L(LOCK_LABELS.read), run: () => loveLockUi.show('list') },
];
// Cheonggyecheon's lantern festival (core/lanterns.js): float a wish lantern
// from the walkway in the wish corner, read about the procession mural.
const festStream = streams.findIndex((s) => s.lanterns);
let myWish = null, lastWishAt = -1e9;
// Where p is in the festival stream's frame, when down by its water.
function festFrame(p) {
  if (festStream < 0 || byStream?.i !== festStream || !byStream.low || byStream.stair) return null;
  const s = streams[festStream];
  const [u, v] = streamUV(s, p.x, p.z);
  return { s, u, v };
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
// are built at once.
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
  const inner = map.landmarks.filter((l) => l.inner && (l.p ? l.p.every(([x, z]) => e.contains(x, z, -1)) : e.contains(l.x, l.z, -1)));
  if (hanoks.length || inner.length) e.onFirstEnter = () => {
    const out = [];
    if (hanoks.length) {
      const g = buildHanoks(hanoks);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(g);
      out.push(g);
    }
    if (inner.length) { // Jongmyo's halls, terraces, stone path and woods
      const g = buildLandmarks(inner, scene);
      const tick = landmarks.userData.tick;
      landmarks.userData.tick = (t) => { tick(t); g.userData.tick(t); };
      out.push(g);
    }
    return out;
  };
  return e;
});
const enclosureSkip = new Set([me.root, bukchonMarks?.group, ...openHanok, ...(hanbokNpcs?.list || []).map((o) => o.ch.root)].filter(Boolean));
for (const e of enclosures) {
  e.collect([landmarks, scene], enclosureSkip);
  e.adopt(storefronts.items.filter((i) => e.contains(i.group.position.x, i.group.position.z, 0.5)).map((i) => i.group));
}
// Shops, landmarks, subway entrances, stamp stands, meeting zones, the
// stream's lanterns and stones, the zoo's pens and the wall posters past the
// fog are not drawn. (The zoo alone was ~1,500 draw calls a frame from
// Bukchon, 2 km away behind the fog.)
const farCull = new FarCull([...storefronts.items.map((i) => i.group), ...subwayEntrances.flatMap((e) => e.items.map((i) => i.group)), ...stampStands.items.map((i) => i.mesh), ...zones.items.map((i) => i.group), ...landmarks.children, ...openHanok, scene.getObjectByName('streams'), adPosters.root, ...(folkYard.props || []), bukchonMarks?.group, ...farExtras, basketball.court], () => (scene.fog ? scene.fog.far + 30 : Infinity), [landmarks]);
let bukchonWelcomed = false, wasInBukchon = null;
// Gyeongbokgung: from just outside Gwanghwamun, 'Enter' takes you into the
// front court (the fan dance and the king are on the lawns past it),
// and just inside either gate 'Leave' takes you back out.
const PALACE_SPOTS = { gate: [0, 10], inside: [0, -12], leave: [[0, -6], [2, -33]] }; // in the palace district's metres
function palaceAct(p) {
  if (!palaceAt || mode !== 'street') return null;
  const x = p.x - palaceAt[0], z = p.z - palaceAt[1], near = ([sx, sz], r) => Math.hypot(x - sx, z - sz) < r;
  if (near(PALACE_SPOTS.gate, 6)) return { key: 'palace-in', label: '🏯 ' + L(PALACE_TEXT.enter), run: () => {
    const [ix, iz] = PALACE_SPOTS.inside;
    moveMeTo(scene, palaceAt[0] + ix, palaceAt[1] + iz, Math.PI); // facing Geunjeongjeon
  } };
  if (PALACE_SPOTS.leave.some((s) => near(s, 4))) return { key: 'palace-out', label: '🚪 ' + L(PALACE_TEXT.leave), run: () => {
    const [gx, gz] = PALACE_SPOTS.gate;
    moveMeTo(scene, palaceAt[0] + gx, palaceAt[1] + gz + 3, 0); // facing the square
  } };
  return null;
}
const palaceView = createPalaceView({ cam, at: palaceAt, steering: () => manualCamT > 0 }); // (game/palace-view.js: look up at the roofs)
let anotherTower;
const towerLook = createTowerLook(() => (anotherTower ||= landmarks.getObjectByName('another-tower'))?.position); // (game/tower-look.js: tilt up to Another Tower's top)
let fanNoted = false, pungmulNoted = false;
function updateEnclosures(p, dt = 0) {
  farCull.update(dt, p);
  palaceView.tick(p, dt);
  if (mode === 'street') towerLook.tick(cam, p, dt);
  // At the fan dance's edge: please step back a little (once each time you come up).
  if (palaceShow?.nearFan(p.x, p.z)) { if (!fanNoted && !spaceBusy()) { fanNoted = true; shop.toast('🪭 ' + L(PALACE_TEXT.back)); } }
  else if (fanNoted && Math.hypot(p.x - fanAt[0], p.z - fanAt[1]) > FAN_NOTE + 4) fanNoted = false;
  // Coming up to the pungmul troupe: what it is (once each time you come up).
  if (pungmul?.watching(p.x, p.z)) { if (!pungmulNoted && !spaceBusy()) { pungmulNoted = true; shop.toast('🥁 ' + L(PUNGMUL_TEXT.hello)); } }
  else if (pungmulNoted && !pungmul?.watching(p.x, p.z, 15)) pungmulNoted = false;
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
      const note = { name: BK_TEXT[kind], at: interior?.store.name };
      if (!wallet.spend(k.price, note)) { shop.toast(fmt(L(BK_TEXT.poor), { n: k.price })); return false; }
      refreshWallet();
      inventory.add(wear);
      receipts.record(wear, k.price, wallet.lastOp, note); // (so it can be resold: every item keeps its record)
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
    wallet.add(c, { name: BK_TEXT.ledger }, { r: 'view', once: 'view:' + v.n });
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
    wallet.add(EXPLORER_REWARD, { name: BK_TEXT.explorerLedger }, { r: 'view', once: 'bukchon:explorer' });
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
// Jongmyo Shrine (data/jongmyo.js): the guide and the
// grandpas, the stone path's manners (keep off the spirits' middle strip),
// and the ritual dance on Jeongjeon's terrace (core/jongmyo-show.js).
const jongmyoAt = (region.districts || []).find((d) => d.id === JONGMYO.district)?.offset || null;
const jongmyoShow = jongmyoAt ? new JongmyoShow(scene, jongmyoAt, $('labels')) : null;
const jongmyoBook = new JongmyoBook();
let jmCard = 0, jmSindoAt = 0, jmWatch = 0, jmWelcomed = false, jmWasIn = null;
function jongmyoCard(item, sub = '') {
  bukchonUi.card(item, { sub });
  bukchonUi.view = 'jm';
}
function jongmyoAct(p) {
  if (!jongmyoShow || mode !== 'street') return null;
  // Enter from in front of the stamp; leave from just inside the gate.
  const { entry } = JONGMYO, [ox, oz] = jongmyoAt;
  if (Math.hypot(p.x - ox - entry.at[0], p.z - oz - entry.at[1]) < entry.r) return { key: 'jm-enter', label: '🏛️ ' + L(JM_TEXT.enter), run: () => moveMeTo(scene, entry.inside[0] + ox, entry.inside[1] + oz, Math.PI) };
  if (Math.hypot(p.x - ox - entry.leave.at[0], p.z - oz - entry.leave.at[1]) < entry.leave.r) return { key: 'jm-leave', label: '🚪 ' + L(JM_TEXT.leave), run: () => moveMeTo(scene, entry.out[0] + ox, entry.out[1] + oz, 0) };
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
  // Stepped up onto the spirits' strip: slide back down beside it (on foot;
  // a ride just gets the notice), so the manners are learnt on the way.
  const down = onSamdo(x, z) === 'sindo' ? offSindo(x, z) : null;
  if (down) {
    jongmyoBook.step();
    if (!riding && !seated) {
      const k = Math.min(1, dt * 12);
      p.x += (down[0] - x) * k; p.z += (down[1] - z) * k;
    }
    if (performance.now() - jmSindoAt > 8000) { jmSindoAt = performance.now(); shop.toast(L(JM_TEXT.sindo)); }
  }
  if (inBox(x, z, JONGMYO.jeongjeon.woldae)) {
    const c = jongmyoBook.arrive();
    if (c) { wallet.add(c, { name: JM_TEXT.mannersLedger }, { r: 'view', once: 'jongmyo:manners' }); refreshWallet(); me.play('bow'); shop.toast(fmt(L(JM_TEXT.manners), { c })); }
  }
  if (jongmyoShow.watching(p.x, p.z) && !jongmyoBook.rite) {
    if ((jmWatch += dt) >= RITE_WATCH) {
      const c = jongmyoBook.watched();
      if (c) { wallet.add(c, { name: JM_TEXT.riteLedger }, { r: 'view', once: 'jongmyo:rite' }); refreshWallet(); me.play('clap'); shop.toast(fmt(L(JM_TEXT.rite), { c })); }
    }
  } else jmWatch = 0;
}
// Bosingak on Jongno (data/bosingak.js): in front of the steps, ring the
// bell (the striker swings, the hum follows; people round the square hear
// it too). The first ring ever pays a little and shows what the pavilion is.
// On 1 January at midnight and at noon (KST) the bell keeper comes out and
// rings it 33 times, heard all along Jongno, the same moment for everyone.
const bosingakAt = (region.districts || []).find((d) => d.id === BOSINGAK.district)?.offset || null;
const bosingakShow = bosingakAt ? new BosingakShow(scene, bosingakAt, $('labels')) : null;
const BOSINGAK_KEY = 'mk.bosingak';
const BELL_MSG = 'bosingak:ring';
let bellRungAt = -1e9, ringingSeen = '';
const bellRungBefore = () => { try { return globalThis.localStorage?.getItem(BOSINGAK_KEY) === '1'; } catch { return false; } };
// Metres from where you stand to the pavilion (or to the ringing spot).
function bellDistance(p, [x, z] = BOSINGAK.at) {
  if (!bosingakAt) return Infinity;
  return Math.hypot(p.x - bosingakAt[0] - x, p.z - bosingakAt[1] - z);
}
// Someone rang it by hand: loud only round the square (BOSINGAK.hear.ring).
function hearRing(p) {
  strikeBell();
  const loud = mode === 'street' ? bellGain(bellDistance(p, BOSINGAK.ring.at), BOSINGAK.hear.ring) : 0;
  if (loud > 0) setTimeout(() => sfx.bigBell(loud), 1150); // when the log meets the bell
}
function bosingakCard() {
  bukchonUi.card(BOSINGAK_CARD);
  bukchonUi.view = 'bosingak';
}
function ringBosingak() {
  const now = performance.now() / 1000;
  if (now - bellRungAt < BOSINGAK.cooldown) { shop.toast(L(BOSINGAK_TEXT.humming)); return; }
  bellRungAt = now;
  hearRing(me.root.position);
  net.sendEmote(BELL_MSG);
  if (!bellRungBefore()) {
    try { globalThis.localStorage?.setItem(BOSINGAK_KEY, '1'); } catch { /* storage blocked */ }
    const c = BOSINGAK.firstRing;
    wallet.add(c, { name: BOSINGAK_TEXT.ledger }, { r: 'view', once: 'bosingak:bell' });
    refreshWallet();
    setTimeout(() => { shop.toast(fmt(L(BOSINGAK_TEXT.rang), { c: c.toLocaleString() })); bosingakCard(); }, 1300);
  } else setTimeout(() => shop.toast(L(BOSINGAK_TEXT.again)), 1300);
  action = STALE;
}
// Another player rang it (their emote): the striker swings for everyone in
// sight; the sound only reaches the square.
function onPeerBell(id) {
  if (!bosingakAt || safety.isBlocked(id, others.nameOf(id))) return;
  const at = others.positionOf(id);
  if (at && bellDistance(at, BOSINGAK.ring.at) > BOSINGAK.ring.r + 3) return; // not at the bell
  hearRing(me.root.position);
}
function bosingakAct(p) {
  if (!bosingakAt || mode !== 'street' || !nearBell(p.x, p.z, bosingakAt)) return null;
  return { key: 'bosingak-ring', label: '🔔 ' + L(BOSINGAK_TEXT.ring), run: ringBosingak };
}
const bosingakAboutAct = () => ({ key: 'bosingak-about', label: 'ℹ️ ' + L(BOSINGAK_TEXT.about), run: bosingakCard });
// Each frame on the street: the people on the square, and the New Year's ringings.
function updateBosingak(p, dt, w, h) {
  if (!bosingakAt) return;
  const r = newYearRinging(Date.now());
  bosingakShow.update(dt, p, camera, w, h, placeLabels, r);
  if (!r || r.stroke < 0) return;
  const key = r.start + ':' + r.stroke;
  if (key === ringingSeen) return;
  const first = !ringingSeen.startsWith(r.start + ':');
  ringingSeen = key;
  strikeBell();
  bosingakShow.pull();
  const loud = mode === 'street' ? bellGain(bellDistance(p), BOSINGAK.hear.ceremony) : 0;
  if (loud > 0) setTimeout(() => sfx.bigBell(Math.max(0.15, loud)), 1150);
  if (first && loud > 0 && !spaceBusy()) shop.toast(L(new Date(r.start + 9 * 3600e3).getUTCHours() === 12 ? BOSINGAK_TEXT.noon : BOSINGAK_TEXT.newYear));
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
const bookUi = lazyPanel(() => import('./ui/book-ui.js').then(({ BookUI }) => new BookUI({
  root: $('book-panel'),
  carrying: () => (held?.kind === 'book' ? held.book : null),
  // One library book out at a time: picking another swaps it straight away
  // (the old one goes back on the shelf, never into the bag).
  take: (id) => {
    const back = held?.kind === 'book' ? held.book : bag.list().find((e) => e.kind === 'book')?.book;
    if (back === id && held?.kind === 'book') return;
    if (held?.kind === 'book') setHeld({ kind: 'book', book: id });
    else {
      if (!handReady()) return;
      holdNew({ kind: 'book', book: id });
    }
    bag.removeKind('book');
    const old = back && back !== id ? bookById(back) : null;
    shop.toast(old ? fmt(L(BOOK_SWAP_TEXT), { name: localName(old.title, getLanguage()) }) : t('book.taken'));
  },
  putDown: () => { if (held?.kind === 'book') setHeld(null); },
  getPage: (id) => bookPages[id] | 0,
  setPage: (id, i) => { bookPages[id] = i; try { localStorage.setItem(BOOK_PAGE_KEY, JSON.stringify(bookPages)); } catch { /* storage blocked */ } },
})));
const stampBook = new StampBook();
const trailLog = new TrailLog();
const stampUi = new StampUI({ root: $('stamp-panel'), book: stampBook, stamps: () => tourStamps, trails: TRAILS, trailLog });
function refreshStampBtn() { $('stamp-btn').querySelector('span').textContent = `${L(STAMP_TEXT.open)} · ${stampBook.count(tourStamps)}/${tourStamps.length}`; $('map-panel').classList.toggle('stamps-done', stampBook.complete(tourStamps)); } // (every stamp: a gold border round the map)
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
    wallet.add(STAMP_REWARD, { name }, { r: 'stamp', once: 'stamp:' + s.id });
    shop.toast('🔖 ' + fmt(L(STAMP_TEXT.got), { name: L(s.name), c: STAMP_REWARD }));
    refreshStampBtn();
    // The last stamp of a course (e.g. the Joseon Royal Walk) pays its reward once.
    for (const tr of trailsWith(TRAILS, s.id)) {
      if (!trailProgress(tr, tourStamps, stampBook).done || !trailLog.finish(tr.id)) continue;
      const tname = {};
      for (const l of ['ko', 'en', 'ja', 'zh']) tname[l] = fmt(STAMP_TEXT.trailLedger[l], { name: tr.name[l] });
      wallet.add(tr.reward, { name: tname }, { r: 'trail', once: 'trail:' + tr.id });
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
// The ride-all day pass (sold at the ticket window) makes every ride free today.
let ride = null; // { kind, seat, t0, until, back: [x, z] }; the coaster adds train, view, cam
const RIDE_ICON = { carousel: '🎠', wheel: '🎡', viking: '🏴‍☠️', drop: '🗼', swing: '🎪', teacups: '☕', train: '🚂', flume: '🪵', gyro: '🌀', coaster: '🎢' };
const ridePass = () => dayPasses.has('rides');
const rideFare = (kind) => { const id = !ridePass() && rideTickets.ticketFor(kind); return ridePass() ? '🎫 ' + t('ride.onPass') : id ? '🎟️ ' + t('ride.onTicket', { n: rideTickets.left(id) }) : `🪙 ${RIDE_PRICE[kind]}`; }; // (in words: people with a ticket weren't sure it would be used)
// A ride on the pass or a ticket (true), saying what's left on the ticket.
function useRideTicket(kind) {
  const id = rideTickets.use(kind);
  if (id && id !== 'pass') { const n = rideTickets.left(id), name = t('tix.' + id); shop.toast('🎟️ ' + (n ? t('tix.used', { name, n }) : t('tix.done', { name }))); }
  return !!id;
}
function payRide(kind) {
  if (useRideTicket(kind) || wallet.spend(RIDE_PRICE[kind], { k: 'ledger.ride' })) return true;
  shop.toast(t('ride.noCoins', { n: RIDE_PRICE[kind] }));
  return false;
}
function buyRidePass() {
  const name = DAY_PASS_TEXT.rides;
  if (ridePass()) { shop.toast('🎫 ' + fmt(L(DAY_PASS_TEXT.ridesHeld), { name: L(name) })); return; }
  if (!dayPasses.buy('rides', RIDE_PASS, wallet, { name, at: interior?.store?.name })) { shop.toast(fmt(L(DAY_PASS_TEXT.short), { name: L(name), n: RIDE_PASS })); return; }
  refreshWallet();
  sfx.cheer?.();
  shop.toast(fmt(L(DAY_PASS_TEXT.ridesPaid), { name: L(name), n: RIDE_PASS }));
  action = STALE;
}
// Another Land's rides run on the shared clock (like the coaster), so it's
// the same ride for everyone on it. The carousel, the ship and the drop
// tower: get on while it loads, the bar comes down, off at the end. The
// wheel: step into the gondola at the bottom, ride one turn.
const rideClock = () => Date.now() / 1000;
const rideCam = createRideCam({ camera });
const parkRiders = createParkRiders($('labels'));
// Seconds until a wheel gondola is next at the deck (0: one is there now).
function wheelWait(now) {
  for (let s = 0; s < 14; s += 0.25) if (wheelDoorOpen(wheelBottom(now + s), now + s)) return s;
  return 0;
}
function parkRideAction(st) {
  const now = rideClock(), label = `${RIDE_ICON[st.kind]} ${t('ride.' + st.kind)} · ${rideFare(st.kind)}`;
  let n = 0;
  if (RIDE_CYCLE[st.kind]) { if (!canBoard(st.kind, now)) { const r = ridePhase(st.kind, now); n = Math.max(1, Math.ceil(r.next || r.left)); } }
  else if (st.kind === 'wheel' && !wheelDoorOpen(wheelBottom(now), now)) n = Math.max(1, Math.ceil(wheelWait(now)));
  if (!n) return { key: 'ride:' + st.kind, label, run: () => boardRide(st) };
  return { key: 'ride-wait:' + st.kind + ':' + n, label: '⏳ ' + t('ride.wait', { n }), run: () => shop.toast(t('ride.wait', { n })) };
}
function boardRide(st) {
  const now = rideClock();
  if (RIDE_CYCLE[st.kind] && !canBoard(st.kind, now)) return;
  const cabin = st.kind === 'wheel' ? wheelBottom(now) : -1;
  if (cabin >= 0 && !wheelDoorOpen(cabin, now)) return;
  if (!payRide(st.kind)) return;
  const seat = cabin >= 0 ? parkRiders.freeSeat('wheel', 2, cabin * 2) : parkRiders.freeSeat(st.kind, PARK_RIDES[st.kind].seats);
  ride = { kind: st.kind, seat, t0: now, until: rideUntil(st.kind, now), back: [st.x, st.z], shout: 0, phase: '', view: 'third', locked: false };
  const staff = interior.rideStaff?.[st.kind];
  if (staff) showBubble(staff, $('labels'), t('ride.enjoy'), 2600, 'chat npc-say');
  rideCam.reset();
  if (THRILL_RIDES.has(st.kind)) rideThrill.start(interior.scene); // (the coaster's speed lines, wind and sounds)
  shop.toast(t(st.kind === 'wheel' ? 'ride.wheelOn' : 'ride.seated'));
  sendTimer = 0;
  missionEvent('ride');
  action = STALE;
}
function endRide() {
  if (!ride) return;
  if (ride.kind === 'coaster') endCoaster();
  else {
    me.root.rotation.order = 'XYZ';
    me.root.rotation.set(0, Math.atan2(ride.back[0] - me.root.position.x, ride.back[1] - me.root.position.z), 0);
    cam.yaw = me.root.rotation.y + Math.PI;
    me.root.visible = true;
    rideCam.reset();
    rideThrill.stop();
  }
  me.root.position.set(ride.back[0], 0, ride.back[1]);
  ride = null;
  sendTimer = 0;
  me.play('cheer');
  action = STALE;
}
const RIDE_GO = { viking: 'ride.barDown', carousel: 'ride.holdPole', drop: 'ride.harness', wheel: 'ride.wheelBar' };
function updateRide(dt) {
  if (!ride || !interior?.tick) return;
  if (ride.kind === 'coaster') { updateCoaster(dt); return; }
  const now = rideClock();
  const s = seatAt(ride.kind, ride.seat, now);
  me.root.position.set(s.x, s.y, s.z);
  me.root.rotation.order = 'ZYX'; // (face along the seat, then tip with the ship, or nose up the train's and the flume's slopes)
  me.root.rotation.set(s.pitch || 0, s.ry, s.roll);
  ride.pose = s;
  const locked = rideLocked(ride.kind, ride.seat, now);
  if (locked !== ride.locked) { // the bar comes down (or the gondola's bar shuts), or goes up again
    ride.locked = locked;
    if (locked) { shop.toast(t(RIDE_GO[ride.kind] || 'ride.go')); sfx.tock?.(0.6, 420); buzz(30); }
    action = STALE;
  }
  const ph = RIDE_CYCLE[ride.kind] ? ridePhase(ride.kind, now) : null;
  ride.top = ride.kind === 'drop' && ph.phase === 'run' && ph.s > DROP_T.climb - 0.5 && ph.s < DROP_T.hold + 0.2 ? Math.min(1, (ph.s - DROP_T.climb + 0.5) / 1.5) : 0; // (look down at the top)
  if (ride.kind === 'drop' && ph.phase === 'run' && ph.s > DROP_T.hold && ph.s < DROP_T.hold + DROP_T.fall && !ride.fell) { ride.fell = true; buzz(80); me.setMoves?.(DROP_ARMS); }
  if (ride.kind === 'drop' && ph.phase !== 'run' && ride.fell) { ride.fell = false; me.setMoves?.(null); }
  ride.shout -= dt;
  const thrill = ride.kind === 'viking' || ride.kind === 'drop' || ride.kind === 'flume' || ride.kind === 'gyro';
  const scream = ride.kind === 'viking' ? Math.abs(s.roll) > 0.85 : ride.kind === 'gyro' ? Math.abs(s.roll) > 1.2 : ride.kind === 'drop' ? ride.fell : ride.kind === 'flume' ? s.pitch > 0.4 : true; // (the flume: down the big drop; the gyro swing: up past level)
  if (locked && ride.shout <= 0 && scream) {
    ride.shout = ride.kind === 'viking' ? 3.5 : thrill ? 4 : 6;
    showBubble(myLabel, $('labels'), thrill ? '😱 꺄아아!' : ride.kind === 'wheel' ? '😍' : '🎶', 2000);
  }
  if (now >= ride.until) endRide();
}
const DROP_ARMS = () => ({ armR: [-2.9, 0.5, 0], armL: [-2.9, -0.5, 0], foreR: [-0.2, 0, 0], foreL: [-0.2, 0, 0] });

// The Cotton Candy Express (core/coaster.js): wait at the platform for a
// train to come in, get on while it boards (6 s), and you're carried round
// on the shared clock. The camera sits just behind you (or in your seat:
// the action button switches), and everything about the speed follows one
// number, k = speed / top speed: the field of view, the shake, the speed
// lines and wind (ui/coaster-fx.js), your hair, the vibration.
const coasterName = () => L(COASTER_NAME);
const coasterNow = () => Date.now() / 1000;
const coasterFx = new CoasterFx(document.body, $('labels'), sfx);
const rideThrill = createRideThrill({ camera, fx: coasterFx }); // (the swing ride and the drop tower borrow the coaster's effects)
const _cf = {}, _cm = new THREE.Matrix4(), _cx = new THREE.Vector3(), _cy = new THREE.Vector3(), _cz = new THREE.Vector3(), _cv = new THREE.Vector3(), _cu = new THREE.Vector3();
const ARMS_UP = () => ({ armR: [-2.9, 0.5, 0], armL: [-2.9, -0.5, 0], foreR: [-0.2, 0, 0], foreL: [-0.2, 0, 0], head: [-0.15, 0, 0] });
const COWER = () => ({ spine: [0.25, 0, 0], head: [0.3, 0, 0], armR: [-1.2, 0, 0], armL: [-1.2, 0, 0] });
// Seat i of train k at shared time now: the rider's frame (for me and the guests).
function coasterSeat(k, i, now, out = _cf) {
  const tr = trainAt(now, k);
  seatPose(tr.s, i, out);
  out.tr = tr;
  return out;
}
// Put a character in a seat: feet below the seat, facing along the track.
function sitOnTrack(root, f) {
  _cx.set(-f.rx, -f.ry, -f.rz); _cy.set(f.ux, f.uy, f.uz); _cz.set(f.fx, f.fy, f.fz);
  _cm.makeBasis(_cx, _cy, _cz);
  root.quaternion.setFromRotationMatrix(_cm);
  root.position.set(f.x - f.ux * 0.38, f.y - f.uy * 0.38, f.z - f.uz * 0.38); // (0.38: the sitting pose's seat height)
}
function coasterAction(p) {
  const st = interior?.stations?.coaster?.[0];
  if (!st || ride || Math.hypot(p.x - st.x, p.z - st.z) > 2.4) return null;
  const b = boarding(coasterNow());
  if (b.train >= 0 && b.left > 0.6 && takenSeats(b.train).size >= COASTER_SEATS) return { key: 'coaster-full', label: '⏳ ' + L(COASTER_TEXT.full), run: () => shop.toast(L(COASTER_TEXT.full)) };
  if (b.train >= 0 && b.left > 0.6) return { key: 'coaster-board', label: '🎢 ' + fmt(L(COASTER_TEXT.board), { name: coasterName(), fare: rideFare('coaster') }), run: () => boardCoaster() };
  const n = Math.max(1, Math.ceil(b.wait || b.left));
  return { key: 'coaster-wait:' + n, label: '⏳ ' + fmt(L(COASTER_TEXT.wait), { n }), run: () => shop.toast(fmt(L(COASTER_TEXT.wait), { n })) };
}
function boardCoaster() {
  const now = coasterNow(), b = boarding(now);
  if (b.train < 0 || b.left <= 0.3) return;
  // The first free seat from the front, so people who get on together sit
  // together (side by side, then the car behind).
  const taken = takenSeats(b.train);
  const seat = Array.from({ length: COASTER_SEATS }, (_, i) => i).find((i) => !taken.has(i));
  if (seat == null) { shop.toast(L(COASTER_TEXT.full)); return; }
  if (!payRide('coaster')) return;
  const staff = interior.coasterStaff?.[0];
  if (staff) showBubble(staff, $('labels'), L(COASTER_TEXT.enjoy), 2600, 'chat npc-say');
  ride = {
    kind: 'coaster', train: b.train, seat, until: rideEnds(now, b.train),
    back: [COASTER_OFF.x, COASTER_OFF.z], view: 'third', phase: '', fov: camera.fov, cam: null, air: false, t: 0, wind: 0,
  };
  me.root.rotation.order = 'YXZ';
  coasterFx.start(interior.scene);
  shop.toast(L(COASTER_TEXT.on));
  sfx.tock?.(0.6, 500);
  sendTimer = 0;
  missionEvent('ride');
  action = STALE;
}
function endCoaster() {
  coasterFx.stop();
  me.setMoves?.(null);
  me.setWind?.(0);
  me.root.visible = true;
  const f = frameAt(trainAt(coasterNow(), ride.train).s, _cf);
  me.root.quaternion.identity();
  me.root.rotation.set(0, f.yaw - Math.PI / 2, 0); // facing out of the station, back to the park
  cam.yaw = me.root.rotation.y + Math.PI;
  camera.fov = 62;
  camera.up.set(0, 1, 0);
  camera.updateProjectionMatrix();
  shop.toast(L(COASTER_TEXT.back));
}
function updateCoaster(dt) {
  const now = coasterNow(), f = coasterSeat(ride.train, ride.seat, now), tr = f.tr;
  sitOnTrack(me.root, f);
  ride.pose = f;
  ride.t += dt;
  // Moments: the release at the top, the bottom of the drop, the airtime hill.
  if (tr.phase !== ride.phase) {
    if (tr.phase === 'hold') me.setMoves?.(COWER);
    if (tr.phase === 'drop') { buzz(40); showBubble(myLabel, $('labels'), '😱 꺄아아!', 2600); me.setMoves?.(ARMS_UP); }
    if (tr.phase === 'run') buzz([220]);
    if (tr.phase === 'brake') me.setMoves?.(null);
    if (tr.phase === 'unload' && ride.phase) me.play('cheer');
    ride.phase = tr.phase;
  }
  const dAir = Math.abs(((tr.s - S_AIR + LENGTH / 2) % LENGTH + LENGTH) % LENGTH - LENGTH / 2);
  if (dAir < 1.5 && !ride.air) { ride.air = true; buzz(60); }
  if (dAir > 6) ride.air = false;
  const dLoop = Math.abs(tr.s - S_LOOP_TOP); // (upside down at the loop's top)
  if (dLoop < 1.5 && !ride.flip) { ride.flip = true; buzz([40, 30, 40]); showBubble(myLabel, $('labels'), '🙃', 1600); }
  if (dLoop > 8) ride.flip = false;
  ride.wind += (tr.k01 - ride.wind) * Math.min(1, dt * 4);
  me.setWind?.(ride.wind);
  if (now >= ride.until) endRide();
}
// After the normal camera follow: the coaster's own camera.
function coasterCamera(dt) {
  const f = ride?.pose;
  if (!f) return;
  const tr = f.tr, first = ride.view === 'first';
  const fx = rideFx(tr.k01, tr.phase, rideFxSoft);
  // A little behind and above you, a beat late so the train surges ahead
  // when it speeds up (or in your seat).
  const back = first ? -0.2 : 4, up = first ? 0.72 : 2.1;
  _cv.set(f.x - f.fx * back + f.ux * up, f.y - f.fy * back + f.uy * up, f.z - f.fz * back + f.uz * up);
  if (!ride.cam) ride.cam = _cv.clone();
  ride.cam.lerp(_cv, 1 - Math.exp(-dt * (first ? 30 : 7)));
  // Shake: smooth wobble (k², so only when fast), less from your own seat.
  const sh = fx.shake * (first ? 0.45 : 1), t = ride.t;
  camera.position.set(
    ride.cam.x + sh * (Math.sin(t * 23) + 0.6 * Math.sin(t * 37.3)),
    ride.cam.y + sh * (Math.sin(t * 29.1 + 1) + 0.5 * Math.sin(t * 51)),
    ride.cam.z + sh * Math.sin(t * 19.7 + 2),
  );
  // Lean with the banked track (60%, none on the gentle setting), and at the
  // top, from your seat, look down over the edge (slowly: from behind you the
  // view stays on the track ahead, so the crest doesn't jolt it).
  // (In the loop the view turns right over with the track, even on the
  // gentle setting: leaning only part way, it would spin as you go over.)
  const loopIn = Math.max(0, Math.min(1, Math.min(tr.s - S_LOOP[0] + 4, S_LOOP[1] + 4 - tr.s) / 4));
  _cu.set(0, 1, 0).lerp(_cy.set(f.ux, f.uy, f.uz), THREE.MathUtils.lerp(rideFxSoft ? 0 : 0.6, 1, loopIn)).normalize();
  camera.up.copy(_cu);
  ride.down = (ride.down || 0) + ((first && tr.phase === 'hold' ? 3.6 : 0) - (ride.down || 0)) * Math.min(1, dt * 1.5);
  const down = ride.down;
  const ah = first ? 6 : 8, hu = first ? 0.6 : 1;
  camera.lookAt(f.x + f.fx * ah + f.ux * hu, f.y + f.fy * ah + f.uy * hu - down, f.z + f.fz * ah + f.uz * hu);
  ride.fov += (fx.fov - ride.fov) * Math.min(1, dt * 3);
  if (Math.abs(camera.fov - ride.fov) > 0.05) { camera.fov = ride.fov; camera.updateProjectionMatrix(); }
  me.root.visible = !first;
  const inTunnel = tr.s > S_TUNNEL[0] && tr.s < S_TUNNEL[1];
  coasterFx.update(dt, { fx, k: tr.k01, v: tr.v, phase: tr.phase, camera, tunnel: inTunnel });
}
// Other players on the coaster: their state says which train and seat (cs =
// train * 10 + seat + 1); the train runs on the shared clock, so they sit
// exactly where they are on their own screen, arms up in the drop.
function placeRemoteRider(ch, cs, q) {
  // (Another Land's island: they're on the street's side, so the seat is
  // turned from the island's metres into the street's)
  const op = outdoors() ? openParks.find((o) => o.built?.coaster && (o.near || openParkHere() === o)) : null;
  if (!op && !interior?.coaster) return;
  const train = Math.floor((cs - 1) / 10), seat = (cs - 1) % 10;
  if (train >= TRAINS || seat >= COASTER_SEATS) return;
  q.cf ||= {};
  const f = coasterSeat(train, seat, coasterNow(), q.cf);
  ch.root.rotation.order = 'YXZ';
  sitOnTrack(ch.root, f);
  if (op) ch.root.applyMatrix4(op.toWorld);
  const up = f.tr.phase === 'drop' || (f.tr.phase === 'run' && f.tr.k01 > 0.55);
  if (up !== !!q.coUp) { q.coUp = up; ch.setMoves?.(up ? ARMS_UP : null); }
  ch.setWind?.(f.tr.k01);
}
// Seats taken on train k by other players (from their state).
const takenSeats = (k) => new Set([...others.players.values()].map((q) => q.target?.cs).filter((cs) => cs > 0 && Math.floor((cs - 1) / 10) === k).map((cs) => (cs - 1) % 10));
const duckUi = new DuckUI({
  root: $('duck-panel'),
  hudRoot: $('duck-hud'),
  onStart: () => startDuckRide(),
  onLeave: () => standUp(),
});
// Ttukseom drone light show (core/drone-show.js: the schedule; the park room
// turns its sky to night and flies the drones). Here: the game-wide notice
// 10 minutes before, the lift-off and photo-time notices in the park, the
// show music (only if music is on), and a camera that can look up.
const droneShow = { alerted: 0, lifted: 0, photo: 0, music: null };
const dronePark = () => { const h = hanPark(); return h?.show ? h : null; }; // (Ttukseom's, laid on the street)
// In the park while it's dark: the camera may tilt below level to look up.
const skyLook = () => (dronePark()?.show.night || 0) > 0.5 || fireworks.look;
function updateDroneShow() {
  const s = droneShowAt();
  if (s && s.t < -ALERT_SECONDS + 30 && droneShow.alerted !== s.start) { droneShow.alerted = s.start; shop.toast(L(DRONE_TEXT.soon)); }
  stampStands.showTimed(); // (the drone show's stand on its lawn)
  const show = dronePark()?.show || null;
  const t = show?.now?.t;
  if (t != null) {
    if (t >= -LIFT_SECONDS && t < -LIFT_SECONDS + 60 && droneShow.lifted !== show.now.start) {
      droneShow.lifted = show.now.start;
      shop.toast(L(DRONE_TEXT.lift));
    }
    if (show.photo && t >= show.photo[0] && t < show.photo[0] + 20 && droneShow.photo !== show.now.start) { droneShow.photo = show.now.start; shop.toast(L(DRONE_TEXT.photo)); }
  }
  const wantMusic = !!(show?.now && show.night > 0.5 && show.now.on);
  if (wantMusic && !droneShow.music && music.on && music.track.id !== 'droneshow') { droneShow.music = music.track.id; music.setTrack('droneshow'); }
  else if (!wantMusic && droneShow.music) { if (music.track.id === 'droneshow') music.setTrack(droneShow.music); droneShow.music = null; }
}

// Yeouido fireworks (core/fireworks-show.js: the schedule and the program;
// core/fireworks-sky.js: the sparks, downloaded only near Yeouido around
// show time). Here: the game-wide notice 10 minutes before, Yeouido's own
// night (weather.nightMix, only on and around the island), the sparks, the
// booms (sound travels slower than light: about 0.3 s per 100 m) and the
// notices on the lawn.
const fireworks = { alerted: 0, dusk: 0, count: 0, photo: 0, finale: 0, sky: null, loading: false, look: false, lastBoom: 0 };
// Ttukseom's drone show turns the street's sky dark too, in and around its
// park (fading out from 100 to 250 m off it), as Yeouido's fireworks do.
function droneNight(p, street) {
  const k = street ? droneShowAt()?.night || 0 : 0;
  if (!k) return 0;
  const d = hanParks.awayFrom('ttukseom-hangang', p);
  return k * Math.min(1, Math.max(0, (250 - d) / 150));
}
function updateFireworks() {
  const s = fireworksAt();
  if (s && s.t < -FIREWORKS_ALERT + 30 && fireworks.alerted !== s.start) { fireworks.alerted = s.start; shop.toast(L(FIREWORKS_TEXT.soon)); }
  // (An open-air park counts as the street: its own metres turned into the world's.)
  const op = openParkHere(), atWorld = (q) => { const [x, z] = parkWorld(op, q.x, q.z); return { x, y: q.y, z }; };
  const p = op ? atWorld(me.root.position) : me.root.position, street = mode === 'street' || !!op;
  const near = street ? nearYeouido(p.x, p.z) : 0;
  const night = s ? s.night * near : 0;
  weather.nightMix = Math.max(night, droneNight(p, street));
  weather.setShowClear(weather.nightMix > 0.05); // a clear sky in front of either show
  fireworks.look = night > 0.5;
  if (!s) { if (fireworks.sky) fireworks.sky.points.visible = false; return; }
  const t = s.t, onLawn = near > 0.99;
  if (onLawn) {
    if (t >= -FIREWORKS_DUSK && t < -FIREWORKS_DUSK + 60 && fireworks.dusk !== s.start) { fireworks.dusk = s.start; shop.toast(L(FIREWORKS_TEXT.dusk)); }
    if (t >= -10 && t < -5 && fireworks.count !== s.start) { fireworks.count = s.start; shop.toast(L(FIREWORKS_TEXT.count)); }
    if (t >= FIREWORKS_PHOTO[0] && t < FIREWORKS_PHOTO[0] + 20 && fireworks.photo !== s.start) { fireworks.photo = s.start; shop.toast(L(FIREWORKS_TEXT.photo)); }
    if (t >= FIREWORKS_FINALE && t < FIREWORKS_FINALE + 20 && fireworks.finale !== s.start) { fireworks.finale = s.start; shop.toast(L(FIREWORKS_TEXT.finale)); }
  }
  // The sparks: loaded when you're within about 900 m.
  const close = street && Math.hypot(p.x + 2730, p.z - 280) < 900;
  if (close && t > -FIREWORKS_DUSK - 60 && !fireworks.sky && !fireworks.loading) {
    fireworks.loading = true;
    const phone = lowSpec || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
    import('./core/fireworks-sky.js').then((m) => { fireworks.sky = m.createFireworksSky(scene, { phone }); })
      .catch(() => { fireworks.loading = false; }); // (offline: try again later)
  }
  if (!fireworks.sky) return;
  if (!street) { fireworks.sky.points.visible = false; return; }
  const fired = fireworks.sky.update(s.start, t, Math.max(night, darkness()), op ? { fov: camera.fov, position: atWorld(camera.position) } : camera, innerHeight); // (bright from afar too when Seoul's night is real)
  // Booms: louder close by, later far away; at most a few a second.
  for (const b of fired) {
    const dist = Math.hypot(b.x - p.x, b.y, b.z - p.z);
    const loud = Math.min(1, 90 / Math.max(60, dist)) * (b.kind === 'small' ? 0.5 : 1);
    const wait = Math.max(0, b.t - t) + dist / 343;
    const now = performance.now();
    if (dist > 900 || now - fireworks.lastBoom < 140) continue;
    fireworks.lastBoom = now;
    setTimeout(() => sfx.boom?.(loud, b.kind === 'willow' || b.kind === 'kamuro' || b.kind === 'peony'), wait * 1000);
  }
}

// Duck boats at the Han River parks (src/game/duck-boats.js).
// The park I'm in right now: its boats, fishing spots, kiosk and ramen
// machine (core/park.js), or null.
// Han River parks laid on the street (game/han-parks.js): no door, you stay on the street.
const hanParks = createHanParks({
  scene, landmarks: map.landmarks, store: (id) => storeData.find((s) => s.id === id), collision,
  makeNpc: (name) => makeNpc($('labels'), name), clerkName: () => t('npc.clerk'),
  get me() { return me; }, signLang: () => (signsTranslated ? getLanguage() : null),
  night: () => 1 - (1 - darkness()) * (1 - (weather.nightMix || 0)), greet: (list, p) => greetAtStalls(p, list),
  onVisit: (store) => { missionEvent('visit', store.id); }, // (as walking into a shop does)
  // What there is to do there (each made only when you're next to it).
  acts: {
    duck: (p) => duckBoats.boardAction(p), mart: () => martAct(),
    fish: () => ({ key: 'fish', label: '🎣 ' + t('fish.open'), run: () => openFishing() }),
    sell: () => ({ key: 'market', label: '🐟 ' + t('fish.sellOpen'), run: () => marketUi.show() }), // the park's fish buyer
    ramen: () => ({ key: 'ramen', label: '🍜 ' + t('ramen.open'), run: () => ramenUi.show() }),
    look: (pr, store) => ({ ...lookAct(pr), run: () => { shop.store = store; shop.openProduct(pr.product); } }),
  },
});
// Night food carts on the street (game/night-carts.js): Myeongdong's, out
// from sunset until morning.
const nightCarts = createNightCarts({
  scene, landmarks: map.landmarks, store: (id) => storeData.find((s) => s.id === id), collision,
  makeNpc: (name) => makeNpc($('labels'), name), signLang: () => (signsTranslated ? getLanguage() : null),
  night: () => 1 - (1 - darkness()) * (1 - (weather.nightMix || 0)), greet: (list, p) => greetAtStalls(p, list),
  look: (pr, store) => ({ ...lookAct(pr), run: () => { shop.store = store; shop.openProduct(pr.product); } }),
});
const hanPark = () => (mode === 'store' && interior?.hanRiver ? interior : null) || (mode === 'street' ? hanParks.here() : null); // (`hanRiver`: Another Land is `themepark`, no shared `park` flag)
// Han River parks open to the street (stores.json "open"): the park lies on
// the bank of the world's river. It is still its own room (core/park.js, all
// its fishing, boats, stalls and seats work as before), drawn over the
// street through a camera moved into its frame, and the street drawn behind
// it while you're in it. Walking onto its lawn takes you in, walking off it
// takes you out, with no door.
const PARK_IN = { x: 25.5, z0: -4, z1: 13.5 }; // the lawn, in the park's metres (its bank is z = -4)
const PARK_OUT = { x: 26.2, z1: 14.2 }; // (a little wider, so you don't flicker in and out on the edge)
const PARK_NEAR = 220; // drawn (and built) within this many metres
const PARK_STAFF = 80; // its sellers and duck boats drawn within this many metres
const openParks = storefronts.items.filter((i) => i.open).map((item) => {
  const { at: [ox, oz], ry } = item.store.open;
  // Its lawn in the same green as the street's grass around it (just behind
  // it, or beside it), so the park reads as one with the riverside, not a patch.
  const around = [[0, 15.5], [0, 18], [0, 21], [-28, 6], [28, 6]].map(([x, z]) => [ox + x * Math.cos(ry) + z * Math.sin(ry), oz - x * Math.sin(ry) + z * Math.cos(ry)]);
  const grass = around.map(([x, z]) => map.areas.find((a) => (a.k === 'park' || a.k === 'grass') && pointInPoly(x, z, a.p))).find(Boolean);
  if (grass) item.store.open.grass = COLORS[grass.k];
  const toWorld = new THREE.Matrix4().makeRotationY(ry).setPosition(ox, 0, oz);
  // (a park with its own shore, like Another Land's island, says where its
  // edge is: `lawn` to walk in, the wider `out` to walk off)
  const { lawn = null, out = null } = item.store.open;
  return { item, ox, oz, ry, cos: Math.cos(ry), sin: Math.sin(ry), toWorld, toLocal: toWorld.clone().invert(), built: null, near: false, lawn, out };
});
const parkLocal = (o, x, z) => { const dx = x - o.ox, dz = z - o.oz; return [dx * o.cos - dz * o.sin, dx * o.sin + dz * o.cos]; };
function parkWorld(o, x, z) { return [o.ox + x * o.cos + z * o.sin, o.oz - x * o.sin + z * o.cos]; }
const openParkHere = () => (mode === 'store' && interior?.store?.open ? openParks.find((o) => o.item.store === interior.store) : null);
// Where I am in the street's metres (in an open park: its spot turned into
// the world's), for the network and everyone else on the street.
function myWorldSpot() {
  const op = openParkHere(), p = me.root.position;
  return op ? parkWorld(op, p.x, p.z) : [p.x, p.z];
}
// A spot in the room I'm in, in the street's metres (where others are).
const peerSpot = (x, z) => { const op = openParkHere(); return op ? parkWorld(op, x, z) : [x, z]; };
// The camera as the street sees it (in an open park: moved into the world's frame).
const streetCam = () => { const op = openParkHere(); if (!op) return camera; camera.updateMatrixWorld(); return viewThrough(op.toWorld); };
// The kiosk clerk and the stall sellers are there before you walk in, so
// the park looks alive from the street (enterStore keeps these).
function staffOpenPark(built) {
  if (built.clerk && !built.clerkNpc) {
    built.clerkNpc = makeNpc($('labels'), t('npc.clerk'));
    built.clerkNpc.ch.root.position.set(built.clerk.x, built.clerk.y || 0, built.clerk.z);
    built.clerkNpc.ch.root.rotation.y = built.clerk.ry;
    built.scene.add(built.clerkNpc.ch.root);
  }
  if (built.vendors?.length && !built.vendorNpcs) {
    built.vendorNpcs = built.vendors.map((v) => {
      const o = makeNpc($('labels'), '');
      o.tag.style.visibility = 'hidden';
      o.ch.root.position.set(v.x, 0, v.z);
      o.ch.root.rotation.y = v.ry;
      built.scene.add(o.ch.root);
      return o;
    });
  }
  for (const o of [built.clerkNpc, ...(built.vendorNpcs || [])]) if (o) { o.tag.style.display = 'none'; if (o.bubble) o.bubble.style.display = 'none'; }
}
// Its room, built the first time it's near (or you arrive by taxi or map).
function openParkRoom(o) {
  if (!o.built && !interiorLoaded()) { warmInterior(); return null; } // (the rooms' code first: game/interior-loader.js)
  if (!o.built && interiorLoaded().needsPark(o.item.store)) { // (Another Land's island: the park's code comes when it's first near)
    if (!domeLoading) {
      domeLoading = true;
      import('./core/themepark.js').then((m) => { interiorLoaded().setParkBuilder(m.buildThemePark); domeLoading = false; }).catch((e) => { domeLoading = false; console.warn('park', e); });
    }
    return null;
  }
  if (!o.built) {
    o.built = roomFor(o.item.store);
    o.built.scene.fog = scene.fog; // (the street's: the far side of the lawn hazes the same)
    staffOpenPark(o.built);
    parkTickets.spawn(o.built); // (Another Land's ticket guide: there as you cross the bridge)
  }
  return o.built;
}
// Its lights follow the street's (weather, dusk).
const parkNight = () => 1 - (1 - darkness()) * (1 - (weather.nightMix || 0));
function lightOpenPark(built) {
  const L3 = built.lights;
  if (!L3) return;
  L3.hemi.intensity = hemi.intensity; L3.hemi.color.copy(hemi.color); L3.hemi.groundColor.copy(hemi.groundColor);
  L3.ambient.intensity = ambient.intensity; L3.ambient.color.copy(ambient.color);
  L3.sun.intensity = sun.intensity; L3.sun.color.copy(sun.color);
}
function freeParkSpot(col, x, z) {
  if (!col.blocked(x, z, PLAYER_R + 0.05)) return [x, z];
  for (let r = 0.25; r <= 3; r += 0.25) {
    for (let a = 0; a < 16; a++) {
      const g = (a / 16) * Math.PI * 2, px = x + Math.cos(g) * r, pz = z + Math.sin(g) * r;
      if (!col.blocked(px, pz, PLAYER_R + 0.05)) return [px, pz];
    }
  }
  return [x, z];
}
function updateOpenParks(dt) {
  if (!openParks.length) return;
  const p = me.root.position;
  const here = openParkHere();
  if (here) {
    lightOpenPark(openParkRoom(here));
    here.built.setNight?.(parkNight()); // (Another Land's castle gate lights up)
    for (const n of [here.built.clerkNpc, here.built.ticketGuide, ...(here.built.vendorNpcs || []), ...(here.built.riderNpcs || [])]) if (n) n.ch.root.visible = true;
    for (const b of here.built.ducks || []) b.g.visible = true;
    const [wx, wz] = parkWorld(here, p.x, p.z);
    weather.update(dt, wx, wz); // (rain, snow and dusk carry on over the park)
    net.update?.(wx, wz); // (the street's area cells, as on the street)
    sun.position.set(wx, 0, wz).add(weather.sunset.offset); // (low in the west at sunset)
    sun.target.position.set(wx, 0, wz);
    const off = here.out ? !pointInPoly(p.x, p.z, here.out) : Math.abs(p.x) > PARK_OUT.x || p.z > PARK_OUT.z1;
    if (seated == null && !ride && off) leaveStore(true);
    return;
  }
  if (mode !== 'street') return;
  // (in a taxi out of the park you are still standing on its lawn until the
  // ride ends: don't walk back in)
  const inCab = taxi.inCab();
  for (const o of openParks) {
    const d = Math.hypot(p.x - o.ox, p.z - o.oz);
    o.near = d < PARK_NEAR;
    if (!o.near) continue;
    if (!openParkRoom(o)) continue; // (its code is still coming)
    lightOpenPark(o.built);
    o.built.setNight?.(parkNight());
    o.built.tick?.(dt, null);
    // The sellers (about 20 meshes each) only from close by: from further
    // off the stalls and the kiosk read as busy enough.
    const close = d < PARK_STAFF;
    for (const n of [o.built.clerkNpc, o.built.ticketGuide, ...(o.built.vendorNpcs || [])]) if (n) { n.ch.root.visible = close; if (close) n.ch.animate(dt, 0); }
    if (close && o.built.rides?.length) parkRiders.tick(parkRiders.spawn(o.built)); // (Another Land's island: the guests on its rides)
    for (const n of o.built.riderNpcs || []) n.ch.root.visible = close;
    for (const b of o.built.ducks || []) b.g.visible = close; // (the duck boats too: 15 pieces each)
    const [lx, lz] = parkLocal(o, p.x, p.z);
    const onLawn = o.lawn ? pointInPoly(lx, lz, o.lawn) : Math.abs(lx) < PARK_IN.x && lz > PARK_IN.z0 && lz < PARK_IN.z1;
    if (onLawn && !subway.metro && !inCab && !sky.busy) { // (flying over it: not until we land)
      // (the street has no trees or bushes where the park has some: step in
      // beside one, never into it, or you'd be stuck there)
      const [fx, fz] = freeParkSpot(o.built.collision, lx, lz);
      enterStore(o.item, { x: fx, z: fz, ry: me.root.rotation.y - o.ry, yaw: cam.yaw - o.ry, camVia: o.toLocal });
      return;
    }
  }
}
// Drawing: the street, then any open park near it over the top (sharing the
// depth, so buildings and trees hide what's behind them either way).
const parkCam = new THREE.PerspectiveCamera();
parkCam.matrixWorldAutoUpdate = false;
function viewThrough(m) {
  parkCam.projectionMatrix.copy(camera.projectionMatrix);
  parkCam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  parkCam.matrixWorld.multiplyMatrices(m, camera.matrixWorld);
  parkCam.matrixWorldInverse.copy(parkCam.matrixWorld).invert();
  parkCam.matrixWorld.decompose(parkCam.position, parkCam.quaternion, parkCam.scale); // (name tags measure how far they are from the camera's position)
  return parkCam;
}
renderer.info.autoReset = false; // (one frame can be two passes: renderScenes resets it)
function renderScenes() {
  renderer.info.reset();
  const here = openParkHere();
  camera.updateMatrixWorld();
  if (here) {
    renderer.render(scene, viewThrough(here.toWorld)); // the street round the park
    renderer.autoClear = false;
    renderer.render(activeScene, camera);
    renderer.autoClear = true;
    return;
  }
  renderer.render(activeScene, camera);
  if (mode !== 'street') return;
  for (const o of openParks) {
    if (!o.near || !o.built) continue;
    renderer.autoClear = false;
    renderer.render(o.built.scene, viewThrough(o.toLocal));
    renderer.autoClear = true;
  }
}

const duckBoats = createDuckBoats({
  park: hanPark, get seated() { return seated; }, get me() { return me; }, get cam() { return cam; },
  get others() { return others; }, input, moveRef, shop, sfx, duckUi, sitDown: (s) => sitDown(s), standUp: () => standUp(), clearAction: () => { action = STALE; },
  // Someone on the street seen from the open park I'm in: in its metres, or null when they're not by it.
  peerLocal: (r) => {
    const op = openParkHere();
    if (!op) return { x: r.position.x, z: r.position.z, ry: r.rotation.y };
    const [x, z] = parkLocal(op, r.position.x, r.position.z);
    return Math.abs(x) < 80 && z > -120 && z < 40 ? { x, z, ry: r.rotation.y - op.ry } : null;
  },
});
const { boardDuck, startDuckRide, updateDucks } = duckBoats;
// Seoul Dal, the balloon in Yeouido Park (game/seoul-dal-near.js loads
// game/seoul-dal.js when you come near it).
const seoulDal = createSeoulDalNear({
  landmarks: map.landmarks, scene, weather, get me() { return me; }, get mode() { return mode; }, get cam() { return cam; }, get riding() { return riding; },
  others, myId, wallet, shop, t, missionEvent, resend: () => { sendTimer = 0; }, clearAction: () => { action = STALE; },
  move: () => input.move, moveYaw: () => moveRef.yaw, // (walking round the gondola)
  // The stamp tour's Seoul Dal stamp, pressed in the gondola at the top.
  stamp: () => { const s = tourStamps.find((q) => q.id === 'seoul-dal'); return s && { got: stampBook.has(s.id), name: L(s.name), press: () => pressStamp({ stamp: s }) }; },
});

// Banpo Bridge's rainbow fountain show (game/rainbow-fountain.js).
const rainbowFountain = createRainbowFountain({
  landmarks: map.landmarks, scene, weather, music, phone: () => lowSpec,
  toast: (s) => shop.toast(s),
  worldPos: () => {
    const p = me.root.position, here = openParkHere();
    return mode === 'street' ? [p.x, p.z] : here ? parkWorld(here, p.x, p.z) : null;
  },
});

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
  onBuyStick: (shade, coins) => !beauty.surgery && !beauty.haircut && lipstick.buy(shade, coins),
});
// Beauty shops: mirror close-up, haircut, surgery (src/game/beauty.js).
const beauty = createBeauty({
  get me() { return me; }, get cam() { return cam; }, get camera() { return camera; }, get interior() { return interior; },
  get clerk() { return clerk; }, get shop() { return shop; }, get sfx() { return sfx; }, get beautyUi() { return beautyUi; },
  get seated() { return seated; }, set seated(v) { seated = v; },
  get myLook() { return myLook; }, set myLook(v) { myLook = v; },
  setLook, resendState: () => { lastSent = null; },
});
const { keepLook, openBeauty, endBeautyCam, startSurgery, updateSurgery, surgeryView, startHaircut, updateHaircut, finishHaircut } = beauty;
// Within r metres of a spot ({ x, z }) that may be missing.
const nearSpot = (q, p, r) => !!q && Math.hypot(p.x - q.x, p.z - q.z) < r;
const nearFishing = (p) => hanPark()?.fishing?.some((f) => Math.hypot(p.x - f.x, p.z - f.z) < 1.8);
let fishCam = null; // the camera before fishing, put back after
function openFishing() {
  const ry = hanPark()?.frame?.ry || 0; // (a park laid on the street: its river is where its frame says)
  me.root.rotation.y = Math.PI + ry; // face the river (north); the camera stays where the player has it
  fishCam = { pitch: cam.pitch, dist: cam.dist };
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
// The server wants 5 s between ads (wallet_settings.ad_gap_sec) and the ad is
// 3 s, so the button rests a moment after one.
let adCoolUntil = 0;
const ownAd = demoAd($('ad-overlay'), $('ad-count'), $('ad-close'));
let promoAt = Math.floor(Math.random() * PROMOS.length);
const showAd = rewardedShow(config.rewardedAd, (seconds) => { // a different place each time
  const pr = PROMOS[promoAt++ % PROMOS.length];
  $('ad-scene').src = BASE + pr.img;
  $('ad-scene').hidden = false;
  $('ad-place').textContent = t('promo.' + pr.id);
  return ownAd(seconds);
});
function refreshWallet() {
  $('coin-count').textContent = won(wallet.coins);
  $('wallet-coins').textContent = won(wallet.coins);
  $('ad-label').textContent = t('wallet.watch', { n: config.rewardedAd.reward });
  const left = wallet.adsLeft();
  $('ad-left').textContent = t('wallet.left', { n: left });
  $('ad-btn').disabled = left <= 0 || Date.now() < adCoolUntil;
}
wallet.onChange(refreshWallet);
wallet.onChange(checkLowCoins);
lastCoins = wallet.coins;
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
// Clothes live in the bag's Wardrobe tab (a grid, see BagUI's closet); everything
// else (pets, ...) in the bag's collection.
const isClothes = (id) => !!(ITEMS[id]?.wear || ITEMS[id]?.tee);
function refreshItems() {
  const list = inventory.list();
  const own = list.filter((id) => !isClothes(id));
  itemEl('wallet-items-title').hidden = !own.length;
  itemEl('wallet-items').replaceChildren(...own.map(itemRow));
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
// Friend invites (supabase/025_referrals.sql): thank a new player whose
// friend was paid, and tell me when friends joined with my name (now and
// every 10 minutes while playing).
walletReady.then(() => {
  if (referralSent) setTimeout(() => shop.toast(t('referral.sent')), 4000);
  const news = async () => {
    if (!wallet.server || document.hidden) return;
    const r = await cloud.referralNews();
    if (!r?.items.length) return;
    r.items.forEach((it, i) => {
      wallet.credited(it.n, r, { k: 'ledger.referral', v: { name: it.name || '?' } });
      setTimeout(() => shop.toast(t('referral.got', { name: it.name || '?', n: won(it.n) })), 1500 + i * 3500);
    });
    refreshWallet();
  };
  news();
  setInterval(news, 10 * 60 * 1000);
  // Seoul Bank: money other players sent me (game/bank.js).
  bankGame.checkNews();
  setInterval(bankGame.checkNews, 3 * 60 * 1000);
});
walletReady.then(() => {
  const gift = wallet.welcome();
  if (gift) {
    refreshWallet();
    $('welcome-coins').textContent = won(gift);
    const body = () => { $('welcome-body').textContent = t('welcome.body', { n: gift.toLocaleString() }); };
    body();
    onLanguageChange(body);
    $('welcome-panel').hidden = false;
    $('welcome-close').onclick = () => { $('welcome-panel').hidden = true; };
  }
});
$('ad-btn').onclick = async () => {
  $('ad-btn').disabled = true;
  const music0 = music.on;
  if (music0) music.setOn(false); // a real ad has its own sound
  const n = await wallet.watchAd(showAd);
  if (n) { adCoolUntil = Date.now() + 2500; setTimeout(refreshWallet, 2600); }
  if (n) playCounts.ad(); // retention counts (core/sessions.js)
  if (music0) music.setOn(true);
  refreshWallet();
  if (n) shop.toast(t('wallet.earned', { n }));
  // another-seoul.com/?adtest: say whether Google's ad or the game's own ran.
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
  const step = q.kind === 'trip' && tripOf(q)[q.stage | 0]?.step;
  if (step && TRIP_TEXT[step]) return L(TRIP_TEXT[step]);
  const tipKey = ROUTE_TIP[q.route] || st?.tip;
  if (st && st.kind === q.kind && STARTER_TEXT[tipKey]) return fmt(L(STARTER_TEXT[tipKey].text), { store: store ? localName(store.name, getLanguage()) : '' });
  return t('quest.' + q.kind, { store: store ? localName(store.name, getLanguage()) : '', n: q.n, need: q.need });
}
// Where an errand happens (for the 🧭 button next to the chip): its shop,
// or the square guide once it is done. Null: no one place (talk, taxi).
function questPlace(q, ready) {
  // Done: report to the nearest guide (the square, or any Information Center).
  if (ready) { const here = myPlace(); return nearestGuidePlace(here.x, here.z); }
  if (q.kind === 'dance' || q.kind === 'highfive') return squareNpc ? { kind: 'npc-guide', id: 'square-guide', x: squareNpc.ch.root.position.x, z: squareNpc.ch.root.position.z, label: t('quest.guide') } : null;
  if (q.kind === 'trip') return tripPlace(tripOf(q)[q.stage | 0]?.step);
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
// npc: the square guide, or an Information Center's game guide (who hands
// out errands in their own district: no dance on the square, no coffee).
function talkToGuide(npc = squareNpc) {
  const atSquare = npc === squareNpc, here = interior;
  const visible = () => (atSquare ? mode === 'street' : interior === here);
  npc.ch.wave();
  const q = quests.active;
  if (q && quests.ready(questCtx())) {
    const starterQuest = q.starter != null;
    const coins = quests.claim(questCtx());
    if (!starterQuest) playCounts.quest(); // retention counts: a mission beyond the first path
    if (q.kind === 'coffee') setHeld(null); // the guide takes the coffee
    // Busy square bonus: +1 for everyone else standing around the guide.
    const g = npc.ch.root.position; // (only counted on the square: others' spots are street spots)
    const crowd = !atSquare ? 0 : crowdBonus([...others.players.values()].filter((o) => !o.hidden && Math.hypot(o.ch.root.position.x - g.x, o.ch.root.position.z - g.z) < 8).length);
    wallet.add(coins + crowd, { k: 'ledger.quest' }, starterQuest ? { r: 'quest', once: 'starter:' + q.starter } : { r: 'quest' });
    me.play('cheer');
    say(npc, $('labels'), ['고마워요! 수고했어요!', 'gomawoyo! sugohaesseoyo!', t('quest.thanks')]);
    shop.toast(t('quest.done', { coins: coins + crowd, left: quests.left }) + (crowd ? ' ' + t('quest.crowd', { n: crowd }) : ''));
    missionEvent('square');
  } else if (q) {
    say(npc, $('labels'), ['부탁해요!', 'butakhaeyo!', questText(q)]);
    shop.toast(questText(q));
    // On the first path, say the tip again too (it is easy to miss the first time).
    const tip = q.starter != null && STARTER_TEXT[ROUTE_TIP[q.route] || STARTER[q.starter]?.tip]?.tip;
    if (tip) setTimeout(() => { if (visible()) showBubble(npc, $('labels'), '💡 ' + L(tip), 9000, 'chat npc-say'); }, 3000);
    if (q.starter != null && STARTER[q.starter]?.tip === 'trip') offerTrip(npc);
  } else if (quests.left) {
    const d = !atSquare && here?.store ? districtOfStore(here.store) : npc === welcomeNpc ? firstStop.district : null;
    const a = quests.start({
      route: npc === welcomeNpc ? firstStop.trip : null, // the first trip, from the welcome guide: one that fits where they started
      stores: storefronts.items.filter((i) => i.store.category !== 'home' && (!d || (i.store.category !== 'info' && districtOfStore(i.store) === d))).map((i) => i.store.id),
      has: (kind) => (kind !== 'pet' || Object.keys(ITEMS).some((id) => ITEMS[id].pet && inventory.has(id))) // only if you have a pet
        && (atSquare || (kind !== 'dance' && kind !== 'coffee')), // (those two point back to Seongsu)
    });
    say(npc, $('labels'), ['부탁 하나 들어줄래요?', 'butak hana deureojullaeyo?', questText(a)]);
    shop.toast(t('quest.new', { coins: a.starter != null ? STARTER_REWARD : QUEST_REWARD }));
    // On the first path the guide also gives a tip for this errand.
    const tip = a.starter != null && STARTER_TEXT[ROUTE_TIP[a.route] || STARTER[a.starter].tip]?.tip;
    if (tip) setTimeout(() => { if (visible()) showBubble(npc, $('labels'), '💡 ' + L(tip), 9000, 'chat npc-say'); }, 5200);
    if (a.starter != null && STARTER[a.starter].tip === 'trip') setTimeout(() => offerTrip(npc), 600);
  } else {
    say(npc, $('labels'), ['오늘은 끝! 내일 또 와요!', 'oneureun kkeut! naeil tto wayo!', t('quest.tomorrow')]);
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
  wallet.add(TOGETHER_COINS[kind], { k: 'ledger.together' }, { r: 'together' });
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
function hi5Done(id, { coins, who, day }) {
  me.play('cheer');
  others.emote(id, 'cheer', '🙌');
  showBubble(myLabel, $('labels'), '🙌');
  sfx.pop?.();
  if (coins) wallet.add(coins, { k: 'ledger.together' }, { r: 'together', once: 'hi5:' + day + ':' + who });
  shop.toast(t(coins ? 'hi5.doneCoins' : 'hi5.done', { name: others.nameOf(id), coins }));
  missionEvent('highfive');
}

function missionEvent(type, target) {
  if (quests.event(type, target)) {
    refreshQuestChip();
    if (quests.active?.kind === 'trip') onTripStep();
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
  for (const list of mode === 'street' ? [streetSeats, hanParks.seats] : [interior?.seats || []]) for (const s of list) { // (a Han River park on the street: its own too)
    const d = Math.hypot(p.x - s.x, p.z - s.z);
    const dd = d - (s.reach || 0); // (stands: sit from the deck in front of them)
    if (dd < bd && !others.seatTaken?.(...peerSpot(s.x, s.z))) { bd = dd; best = s; }
  }
  return best;
}
function sitDown(seat) {
  seated = seat;
  me.root.position.set(seat.x, seat.y || 0, seat.z); // (y: low on the edge of a stream)
  me.root.rotation.y = seat.ry;
  if (seat.bumper != null) cam.yaw = seat.ry + Math.PI; // a bumper car (a park ride): behind the wheel
  sendTimer = 0; // tell others right away
  missionEvent('sit');
  if (seat.academy) academyUi.show();
  if (seat.sunset) { cam.yaw = seat.ry + Math.PI; cam.pitch = 0.2; shop.toast(sunsetNote(t)); } // Mangwon's sunset steps: face the sunset (game/sunset-spot.js)
  if (seat.sauna) saunaUi.show(seat.sauna); // the kiln or ice room bench
  else if (held?.kind === 'book' && !seat.academy && !seat.lie) shop.toast(L(BOOK_SIT_TEXT)); // a book in hand reads on any seat
}
function standUp() {
  if (!seated) return;
  finishHaircut(); // walking off mid-cut: the new style is already paid for
  me.root.position.set(seated.stand[0], seated.standY || 0, seated.stand[1]);
  if (seated.sauna && saunaUi.open) saunaUi.close();
  if (seated.beauty && beautyUi.open) beautyUi.close();
  if (seated.duck != null) duckBoats.onStandUp();
  if (seated.tarot && tarotUi.open) tarotUi.close(); // (a friend reading with us is told)
  if (seated.bumper != null) bumper.onStandUp();
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
const storeAct = (it) => (warmInterior(), storeDescs.load(), { key: 'enter:' + it.store.id, label: '🚪 ' + t('shop.enter', { name: localName(it.store.name, getLanguage()) }), run: () => roomTips.enter(it) });
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
// An Information Center's game guide hands out and takes errands too, so
// missions aren't only on Seongsu's square.
function infoMissionAct(p) {
  if (mode !== 'store' || interior?.store?.workshop !== 'info' || !clerk || onboard < 2) return null;
  if (Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) >= 2.8) return null;
  const q = quests.active;
  if (!q && !quests.left) return null;
  const label = q ? (quests.ready(questCtx()) ? '🎁 ' + t('quest.report') : '📜 ' + t('quest.check')) : '❗ ' + t('quest.take');
  return { key: 'info-quest:' + (q?.kind || '') + quests.left + (q && quests.ready(questCtx())), label, run: () => talkToGuide(clerk) };
}
// The square guide: the first high five, today's errand, or a chat.
function guideAct(p) {
  // The nearer of the square guide and the welcome guide in Bukchon.
  const dist = (n) => (n ? Math.hypot(p.x - n.ch.root.position.x, p.z - n.ch.root.position.z) : Infinity);
  const npc = dist(welcomeNpc) < dist(squareNpc) ? welcomeNpc : squareNpc;
  if (!npc) return null;
  const d = dist(npc);
  if (onboard === 0 && d < 3.2) return { key: 'onboard-hi5', label: '🙌 ' + L(ONBOARD_TEXT.button), run: () => onboardHi5(npc) };
  if (d >= 2.6) return null;
  const q = quests.active;
  if (q?.kind === 'highfive' && !quests.ready(questCtx())) { // a high-five errand saved before they stopped
    return { key: 'quest-hi5', label: '🙌 ' + L(ONBOARD_TEXT.button), run: () => {
      me.play('wave'); npc.ch.wave(); showBubble(myLabel, $('labels'), '🙌'); sfx.pop?.();
      missionEvent('highfive');
      setTimeout(() => talkToGuide(npc), 700); // report straight away
    } };
  }
  const label = q ? (quests.ready(questCtx()) ? '🎁 ' + t('quest.report') : '📜 ' + t('quest.check')) : quests.left ? '❗ ' + t('quest.take') : '👋 ' + t('npc.hi', { name: t('quest.guide') });
  return { key: 'quest:' + (q?.kind || '') + quests.left + (q && quests.ready(questCtx())), label, run: () => talkToGuide(npc) };
}
const MAX_CHOICES = 6;
// Everything else close enough to do right now, besides what the button shows
// first: every player for a high five, the shop door, the guide, products on
// the shelf, a pet, a seat. Left out while riding, sitting or busy.
function moreActions(p, door) {
  const out = [];
  const hi5s = () => { for (const o of others.nearbyFree(p.x, p.z, 2)) out.push(hi5Action(o)); };
  if (mode === 'street') {
    if (riding || busking.performing || seoulDal.busy || namsanCable.busy) return out;
    if (door) out.push(storeAct(door));
    hi5s();
    const g = guideAct(p); if (g) out.push(g);
    const b = boardAt(p); if (b) out.push(boardAct(b));
    const st = stampStands.nearest(p.x, p.z); if (st) out.push(stampAct(st));
    const bkc = bukchonAct(p); if (bkc) out.push(bkc);
    const jmc = jongmyoAct(p); if (jmc) out.push(jmc);
    const fy = !seated && folkYard.act(p); if (fy) out.push(fy);
    const ptm = !seated && potatoMarket.act(p); if (ptm) out.push(ptm);
    const bsg = bosingakAct(p); if (bsg) out.push(bsg, bosingakAboutAct());
    if (namsanWalk.nearHeart(p)) out.push(...loveLockActs());
    if (!seated) out.push(...hanParks.actions(p)); // a Han River park's kiosk, fishing spots, boats and stalls
    if (!seated) out.push(...nightCarts.actions(p)); // a night food cart's counter
    const bs = !seated && nearestSeat(p); if (bs) out.push(sitAct(bs));
    if (bs?.mat) out.push(matSitAct(bs));
    const pm = !seated && picnic.action(p); if (pm) out.push(pm);
    const fb = frisbee.action(p); if (fb) out.push(fb);
    if (!seated) out.push(...snowman.more(p)); // put a snowball on a bigger one: a snowman
    const ic = sculptureNear(map.landmarks, p.x, p.z); if (ic) out.push(sculptureAct(ic));
    if (muralSpot(p)) out.push(muralAct());
    if (wishSpot(p)) out.push(wishAct());
    const bk = busking.nearBusker(p.x, p.z); if (bk) out.push(buskerAct(bk));
    const n = npcs.nearest(p.x, p.z) || hanbokNpcs?.nearest(p.x, p.z) || gyeongnidan.nearest(p.x, p.z); if (n) out.push(npcAct(n, p));
    return out;
  }
  if (!interior || seated || beauty.surgery || ride || decorGame.decor?.editing) return out;
  if (interior.pool) { out.push(...poolMore(p)); if (pool.mode) return out; } // (racing or diving: only the pool's buttons)
  hi5s();
  const im = infoMissionAct(p); if (im) out.push(im);
  for (const pet of (interior.pets?.list || []).filter((q) => Math.hypot(p.x - q.root.position.x, p.z - q.root.position.z) < 1.6 + interior.pets.radius)) { out.push(petAct(pet, p)); if (pet.adopt && !inventory.has(pet.adopt)) out.push(adoptAct(pet)); }
  const seat = nearestSeat(p);
  if (seat) out.push(sitAct(seat));
  if (seat?.mat) out.push(matSitAct(seat));
  const pm = picnic.action(p); if (pm) out.push(pm);
  const fb = frisbee.action(p); if (fb) out.push(fb);
  if (interior.themepark) out.push(...balloonClown.actions(p), ...parkTickets.actions(p));
  if (interior.zooPark) out.push(...zooVisit.more(p));
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
  if (!$('route-panel').hidden && !(mode !== 'street' && nearRouteMap(p))) $('route-panel').hidden = true; // walked away
  if (mode === 'street') {
    let it = door = storefronts.nearby(p.x, p.z, tSec);
    if (it?.store.workshop === 'cablecar') it = door = null; // (the cable car's lower station: you get in at its door, game/namsan-cable.js)
    updateFarTextures(scene, p.x, p.z); // far boards and posters let go of their canvases (core/far-textures.js)
    const poop = !riding && nearestPoop(p);
    const sb = !riding && !seated ? snowman.action(p) : null; // a snowball to work on, or to start (src/game/snowman.js)
    if (basketball.basketShot) next = null; // mid-shot
    else if (seoulDal.busy || seoulDal.act(p)) next = seoulDal.act(p); // aboard Seoul Dal, or at its gate
    else if (!riding && namsanCable.act(p)) next = namsanCable.act(p); // in the Namsan cable car, or at a station's door
    else if (poop) next = { key: 'poop:' + poop.id, label: '🧻 ' + t('pet.clean'), run: () => cleanPoop(poop) };
    else if (seated?.duck != null) next = duckBoats.seatedAction(); // in a duck boat (a Han River park on the street)
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
    else if (sb && sb.key !== 'sb-make') next = sb; // working on a snowball
    else if (hi5Target(p)) next = hi5Action(hi5Target(p));
    else if (!riding && boardAt(p)) next = boardAct(boardAt(p));
    else if (!riding && stampStands.nearest(p.x, p.z)) next = stampAct(stampStands.nearest(p.x, p.z));
    else if (!riding && bukchonAct(p)) next = bukchonAct(p);
    else if (!riding && jongmyoAct(p)) next = jongmyoAct(p);
    else if (!riding && bosingakAct(p)) next = bosingakAct(p);
    else if (!riding && palaceAct(p)) next = palaceAct(p);
    else if (!riding && namsanWalk.nearHeart(p)) next = loveLockActs()[0]; // the Namsan summit's love locks
    else if (!riding && !seated && hanParks.actions(p).length) next = hanParks.actions(p)[0]; // a Han River park: the kiosk, fishing, the boats
    else if (!riding && !seated && nightCarts.actions(p).length) next = nightCarts.actions(p)[0]; // a night food cart
    else if (seated?.street) next = { key: 'stand', label: '🧍 ' + t('shop.stand'), run: () => standUp() }; // a park bench
    else if (!riding && nearestSeat(p)) next = sitAct(nearestSeat(p));
    else if (!riding && picnic.action(p)) next = picnic.action(p); // a picnic mat on the park lawn
    else if (!riding && frisbee.action(p)) next = frisbee.action(p); // fetch with your pet on the lawn
    else if (!riding && sculptureNear(map.landmarks, p.x, p.z)) next = sculptureAct(sculptureNear(map.landmarks, p.x, p.z));
    else if (!riding && muralSpot(p)) next = muralAct();
    else if (!riding && wishSpot(p)) next = wishAct();
    else if (!riding && !seated && nearCourt(p) && !basketUi.open) next = { key: 'basket', label: '🏀 ' + L(BASKET_OPEN), run: () => basketUi.show() };
    else if (!riding && !seated && folkYard.act(p)) next = folkYard.act(p); // Namsangol's folk games
    else if (!riding && !seated && potatoMarket.act(p)) next = potatoMarket.act(p); // Potato Market's mats
    else if (guideAct(p)) next = guideAct(p);
    else if (sb) next = sb; // start a snowball
    else if (!riding && inSkate && !seated) next = { key: 'skate-ride', label: `${VEHICLE_ICON[garage.current.type]} ${L(SKATE_TEXT.ride)}`, run: () => setRiding(1) };
    else if (buskPlay.buskAction(p, riding)) next = buskPlay.buskAction(p, riding); // the busking stage, the buskers
    else if (palaceShow?.nearGuard(p.x, p.z)) {    } else if (palaceShow?.nearGuard(p.x, p.z)) {
      const g = palaceShow.nearGuard(p.x, p.z);
      next = { key: 'guard:' + g.home.x, label: '👋 ' + t('npc.hi', { name: '수문장' }), run: () => palaceShow.greet(g, p.x, p.z) };
    } else {
      const n = npcs.nearest(p.x, p.z) || hanbokNpcs?.nearest(p.x, p.z) || gyeongnidan.nearest(p.x, p.z);
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
    } else if (interior.subway && !seated && nearRouteMap(p)) {
      next = { key: 'route-map', label: '🗺️ ' + L(ROUTE_MAP_TEXT.view), run: openRouteMap };
    } else if (interior.subway && !seated && interior.subway.vending?.some((v) => Math.hypot(p.x - v.x, p.z - v.z) < 1.3)) {
      next = { key: 'vending', label: '🥤 ' + L(VENDING_TEXT.open), run: openVending };
    } else if (interior.subway && !seated && gateAt(p.x, p.z)) {
      const g = gateAt(p.x, p.z);
      next = g.inside
        ? { key: 'gate-out', label: '🚪 ' + L(GATE_TEXT.out), run: () => passGate(g, false) }
        : gateFree() // out by mistake: back in free for 5 min (the key ticks so the time does)
          ? { key: 'gate-in-free:' + gateFree(), label: '🎫 ' + t('gate.freeAgain', { t: `${Math.floor(gateFree() / 60)}:${String(gateFree() % 60).padStart(2, '0')}` }), run: () => passGate(g, true) }
          : { key: 'gate-in', label: `🎫 ${L(GATE_TEXT.in)} · 🪙 ${FARE}`, run: () => passGate(g, true) };
    } else if (!interior.noExit && interior.front?.parkFront && Math.hypot(p.x - ex.x, p.z - ex.z) < 1.6) {
      next = { key: 'haunt-out', label: '🚪 ' + L(interior.store.workshop === 'runway' ? roomKit().RUNWAY_TEXT.toHall : HAUNT_TEXT.back), run: () => backToPark() };
    } else if (!interior.noExit && !interior.store.open && Math.hypot(p.x - ex.x, p.z - ex.z) < 1.6) { // (an open park: walk off the lawn)
      next = { key: 'exit', label: '🚪 ' + t(interior.store.category === 'home' ? 'home.leave' : interior.zooPark ? 'zoo.leave' : 'shop.leave'), run: () => leaveStore() };
    } else if (!seated && nearPeerMeal(p)) {
      const pm = nearPeerMeal(p);
      next = { key: 'bite:' + pm.owner, label: '😋 ' + fmt(L(DINE_TEXT.share), { name: others.nameOf(pm.owner) || '?' }), run: () => stealBite(pm) };
    } else if (decorGame.decor?.editing) {
      // decorate mode: walk up to a piece to rotate, move or remove it
      const it = nearestPiece(p);
      if (decorGame.decor.carry) next = { key: 'put-down', label: '📍 ' + t('home.putDown'), run: () => { putDown(); closePiece(); } };
      else if (it) next = { key: 'piece:' + decorGame.decor.items.indexOf(it), label: '✋ ' + localName(furnitureById(it.id).name, getLanguage()), run: () => openPiece(it) };
      else if (!decorGame.decor.picked) closePiece();
    } else if (!seated && stampStands.nearest(p.x, p.z, interior.store.id)) {
      next = stampAct(stampStands.nearest(p.x, p.z, interior.store.id));
    } else if (ride?.kind === 'coaster') { // no getting off mid-air: the button switches the view
      const first = ride.view === 'first';
      next = { key: 'coaster-view:' + ride.view, label: (first ? '🎥 ' : '👀 ') + L(first ? COASTER_TEXT.third : COASTER_TEXT.first), run: () => { ride.view = first ? 'third' : 'first'; ride.cam = null; action = STALE; } };
    } else if (ride && ride.kind !== 'coaster' && rideLocked(ride.kind, ride.seat, rideClock())) { // the bar is down: the button switches the view
      // (the Ferris wheel adds a scenic view from outside the gondola: third → scenic → seat)
      const to = ride.view === 'first' ? 'third' : ride.kind === 'wheel' && ride.view === 'third' ? 'scenic' : 'first';
      next = { key: 'ride-view:' + ride.view, label: to === 'scenic' ? '🏞️ ' + t('ride.scenic') : (to === 'third' ? '🎥 ' : '👀 ') + L(to === 'third' ? COASTER_TEXT.third : COASTER_TEXT.first), run: () => { ride.view = to; rideCam.reset(); action = STALE; } };
    } else if (ride) {
      next = { key: 'ride-off', label: '🚪 ' + t('ride.off'), run: () => endRide() };
    } else if (interior.zooPark && riding === CART && freeSeat() >= 0 && others.nearestFree(p.x, p.z, 4.5)) { // the zoo's cart: offer a friend a seat
      const o = others.nearestFree(p.x, p.z, 4.5), seat = freeSeat();
      next = { key: 'tandem-invite:' + o.id, label: '🛺 ' + t('tandem.invite', { name: o.name }), run: () => { net.sendEmote(tandemMsg('invite', o.id, seat)); shop.toast(t('tandem.sent', { name: o.name })); } };
    } else if (interior.zooPark && riding === 3) {
      next = { key: 'bike-off', label: '🛺 ' + t('car.off'), run: () => setRiding(false) };
    } else if (interior.zooPark && !riding && tandemInvite && performance.now() < tandemInvite.until && others.rootOf(tandemInvite.from)?.position.distanceTo(p) < 6) {
      const inv = tandemInvite;
      next = { key: 'tandem-hop:' + inv.from, label: '🛺 ' + t('tandem.hopOn', { name: inv.name }), run: () => hopOn(inv) };
    } else if (interior.zooPark && zooVisit.action(p)) {
      next = zooVisit.action(p); // the zoo: carts, feeding, the keeper, the hippo's watermelon, the Sea Animals hall
    } else if (interior.themepark && coasterAction(p)) {
      next = coasterAction(p);
    } else if (interior.themepark && parkTickets.actions(p).length) {
      next = parkTickets.actions(p)[0]; // the ticket guide (the island) or the booth (below): what's what, then each ticket in the more list
    } else if (interior.themepark && balloonClown.actions(p).length) {
      next = balloonClown.actions(p)[0]; // (the other balloons are in the more list)
    } else if (interior.bumper && bumper.action(p)) {
      next = bumper.action(p);
    } else if (nearStation(p, 'runwayDoor', 1.8)) {
      next = { key: 'runway-in', label: '👠 ' + L(roomKit().RUNWAY_TEXT.enter), run: () => enterRunwayRoom() };
    } else if (interior.themepark && nearStation(p, 'hauntedHouse', 1.8)) {
      next = { key: 'haunt-in', label: '👻 ' + L(HAUNT_TEXT.enter), run: () => enterHaunted() };
    } else if (interior.island && nearStation(p, 'underground', 1.8)) { // Another Land's island: the stairs down to the rest of the park
      const under = storefronts.items.find((i) => i.store.below === interior.store.id);
      if (under) next = { key: 'underground', label: '⬇️ ' + t('shop.enter', { name: localName(under.store.name, getLanguage()) }), run: () => roomTips.enter(under) };
    } else if (interior.rides?.find((st) => Math.hypot(p.x - st.x, p.z - st.z) < 2.2)) {
      const st = interior.rides.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 2.2);
      next = parkRideAction(st);
    } else if (seated?.surgery) {
      next = null; // lie still: the team is at work
    } else if (seated?.beauty) {
      const kind = seated.beauty;
      next = { key: 'beauty:' + kind, label: BEAUTY_ICON[kind] + ' ' + t(kind + '.open'), run: () => openBeauty(kind) };
    } else if (seated?.sauna) {
      next = { key: 'sauna:' + seated.sauna, label: (seated.sauna === 'hot' ? '🔥 ' : '🧊 ') + t(seated.sauna === 'hot' ? 'sauna.hot' : 'sauna.ice'), run: () => saunaUi.show(seated.sauna) };
    } else if (seated && isDining(interior.store)) {
      next = dineAction();
    } else if (seated?.duck != null) { // in a duck boat (game/duck-boats.js)
      next = duckBoats.seatedAction();
    } else if (seated?.pc) { // a free PC in the PC방
      next = { key: 'aim', label: '🎮 ' + L(ARCADE_OPEN.aim), run: () => openArcade('aim') };
    } else if (seated?.tarot) {
      next = { key: 'tarot', label: '🔮 ' + L(TAROT_TEXT.open), run: () => { tarotReader()?.ch.wave(); tarotUi.show(); } };
    } else if (tarotNext) {
      next = tarotNext;
    } else if (interior.pool && !seated && poolAction(p)) {
      next = poolAction(p);
    } else if (seated) {
      next = { key: 'stand', label: '🧍 ' + t('shop.stand'), run: () => standUp() };
    } else if (nearStation(p, 'runway', 1.6) && !runwayUi.open) {
      next = { key: 'runway', label: '👠 ' + L(roomKit().RUNWAY_TEXT.open), run: () => runwayUi.show() };
    } else if (liveStage.action(p)) {
      next = liveStage.action(p);
    } else if (nearStation(p, 'karaoke')) {
      next = { key: 'karaoke', label: '🎤 ' + t('game.karaoke'), run: () => karaokeUi.show() };
    } else if (nearStation(p, 'photo', 2.2)) {
      const kind = interior.store.workshop;
      next = { key: 'photo', label: '📸 ' + t(kind === 'photo1' ? 'game.photo1' : kind === 'photobw' ? 'game.photobw' : 'game.photo'), run: () => photoUi.show(kind) };
    } else if (nearStation(p, 'academy', 1.8)) {
      next = { key: 'academy', label: '🏫 ' + L(ACADEMY_OPEN), run: () => academyUi.show() };
    } else if (interior.stations?.lift && Math.hypot(p.x - interior.stations.lift.x, p.z - interior.stations.lift.z) < 1.6) {
      next = { key: 'lift', label: '🛗 ' + L(roomKit().MUSEUM_TEXT.lift), run: () => museumUi.showLift(roomKit().floorOf(interior.store), goMuseumFloor, interior.store.category === 'memorial' ? memorialFloors() : undefined) };
    } else if (nearStation(p, 'flower', 1.3)) {
      next = { key: 'flower', label: '💐 ' + L(roomKit().MEMORIAL_TEXT.flower), run: () => layMemorialFlower() };
    } else if (roomKit().nearestPainting(interior.stations?.panels, p.x, p.z, 2)) {
      const pn = roomKit().nearestPainting(interior.stations.panels, p.x, p.z, 2).painting;
      next = { key: 'panel:' + pn.kind, label: `📖 ${L(roomKit().MEMORIAL_TEXT.read)} · ${localName(pn.title, getLanguage())}`, run: () => museumUi.showText(pn) };
    } else if (roomKit().nearestPainting(interior.stations?.paintings, p.x, p.z)) {
      const pt = roomKit().nearestPainting(interior.stations.paintings, p.x, p.z).painting;
      next = { key: 'painting:' + pt.id, label: `${pt.credit ? '📷' : '🖼️'} ${L(pt.credit ? roomKit().MEMORIAL_TEXT.look : roomKit().MUSEUM_TEXT.look)} · ${pt.credit ? localName(pt.title, getLanguage()) : getLanguage() === 'ko' ? pt.title.ko : pt.title.en}`, run: () => museumUi.show(pt) };
    } else if (nearStation(p, 'books', 1.5)) {
      const shelf = interior.stations.books.reduce((a, st) => (Math.hypot(p.x - st.x, p.z - st.z) < Math.hypot(p.x - a.x, p.z - a.z) ? st : a));
      next = { key: 'books:' + shelf.section, label: '📚 ' + t('book.pick'), run: () => bookUi.showShelf(shelf.section) };
    } else if (interior.stations?.gym?.find((st) => Math.hypot(p.x - st.x, p.z - st.z) < 1.4)) {
      const st = interior.stations.gym.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 1.4);
      next = { key: 'gym:' + st.kind, label: '💪 ' + t('gym.' + st.kind), run: () => {
        if (st.lie) { useGymSpot(st, st.kind); return; } // the bench: lie down on it
        if (st.bar) { me.root.position.set(st.x, 0, st.z); me.root.rotation.y = 0; } // hang under the bar
        gymUi.show(st.kind);
      } };
    } else if (!gymUi.open && studioSpot(p)) {
      const st = studioSpot(p);
      next = st.kind === 'yoga'
        ? { key: 'studio:yoga', label: '🧘 ' + L(STUDIO_ACT.yoga), run: () => useGymSpot(st, 'yoga') }
        : { key: 'studio:reformer', label: '🤸 ' + L(STUDIO_ACT.reformer), run: () => useGymSpot(st, 'reformer') };
    } else if (instructor && Math.hypot(p.x - instructor.ch.root.position.x, p.z - instructor.ch.root.position.z) < 2.2) {
      next = { key: 'instructor', label: '💬 ' + t('gym.talk', { name: L(INSTRUCTOR_NAME) }), run: () => talkToInstructor() };
    } else if (trainer && Math.hypot(p.x - trainer.ch.root.position.x, p.z - trainer.ch.root.position.z) < 2.4) {
      next = { key: 'trainer', label: '💬 ' + t('gym.talk', { name: L(TRAINER_NAME) }), run: () => talkToTrainer() };
    } else if (interior.stations?.sauna?.find((st) => Math.hypot(p.x - st.x, p.z - st.z) < 2)) {
      const st = interior.stations.sauna.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 2);
      next = { key: 'sauna:' + st.kind, label: (st.kind === 'hot' ? '🔥 ' : '🧊 ') + t(st.kind === 'hot' ? 'sauna.hot' : 'sauna.ice'), run: () => saunaUi.show(st.kind) };
    } else if (nearStation(p, 'claw')) {
      next = { key: 'claw', label: '🧸 ' + t('game.claw'), run: () => clawUi.show() };
    } else if (nearStation(p, 'batting', 1.8)) {
      next = { key: 'batting', label: '⚾ ' + L(ARCADE_OPEN.batting), run: () => openArcade('batting') };
    } else if (nearStation(p, 'bowling', 1.4)) {
      next = arcadeGame.camOn() ? null : { key: 'bowling', label: '🎳 ' + L(ARCADE_OPEN.bowling) + (arcadeGame.bowlInvite() ? ' ⚔️' : ''), run: () => openArcade('bowling') };
    } else if (nearStation(p, 'climbing', 1.8)) {
      next = arcadeGame.camOn() ? null : { key: 'climbing', label: '🧗 ' + L(ARCADE_OPEN.climbing), run: () => openArcade('climbing') };
    } else if (nearStation(p, 'gallery', 2.2)) {
      next = { key: 'gallery', label: '🎯 ' + L(ARCADE_OPEN.gallery), run: () => openArcade('gallery') };
    } else if (nearStation(p, 'hauntGallery', 2)) {
      next = { key: 'hauntGallery', label: '🏮 ' + L(ARCADE_OPEN.hauntGallery), run: () => openArcade('hauntGallery') };
    } else if (nearStation(p, 'darts', 1.6)) {
      next = arcadeGame.camOn() ? null : { key: 'darts', label: '🎯 ' + L(ARCADE_OPEN.darts) + (freshInvite() ? ' ⚔️' : ''), run: () => openArcade('darts') };
    } else if (duckBoats.boardAction(p)) {
      next = duckBoats.boardAction(p);
    } else if (martCounter(p)) {
      // Han River park: DAILY MART's counter (ramyeon and eggs for the ramen machine).
      next = martAct();
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
    } else if (nearSpot(hanPark()?.fishBuy, p, 1.6)) {
      next = { key: 'market', label: '🐟 ' + t('fish.sellOpen'), run: () => marketUi.show() }; // the park's fish buyer
    } else if (nearSpot(hanPark()?.ramen, p, 1.8)) {
      next = { key: 'ramen', label: '🍜 ' + t('ramen.open'), run: () => ramenUi.show() };
    } else if (BEAUTY_SHOPS.includes(interior.store.workshop) && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      const hint = t(isClinic(interior.store.workshop) ? 'beauty.lie' : 'beauty.sit');
      next = { key: 'beauty-hint', label: '💬 ' + hint, run: () => { clerk.ch.wave(); shop.toast(hint); } };
    } else if (interior.store.workshop === 'kimchi-buy' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'kimchi-sell', label: '🧺 ' + MARKET_L('open'), run: () => { clerk.ch.wave(); say(clerk, $('labels'), BOSS_LINES.hello); kimchiSellUi.show(); } };
    } else if (interior.store.workshop === 'fishmarket' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'market', label: '🐟 ' + t('fish.sellOpen'), run: () => openMarket() };
    } else if (interior.store.resale && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.6) {
      next = { key: 'resale', label: '♻️ ' + L(roomKit().RESALE_TEXT.open), run: () => { clerk.ch.wave(); resaleUi.show(); } };
    } else if (clubs.clubState && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 4.5) {
      next = { key: 'club', label: '🎧 ' + L(CLUB_TEXT.open), run: () => openClubPanel() };
    } else if (clubs.clubState && !seated) { // anywhere on the club floor: dance to the beat
      next = { key: 'dance:' + dancing, label: (dancing ? '🛑 ' : '💃 ') + L(dancing ? DANCE_TEXT.stop : DANCE_TEXT.start), run: () => { dancing = !dancing; if (dancing) missionEvent('dance'); action = STALE; } };
    } else if (listenBar.listening) {
      next = { key: 'listen-off', label: '🎧 ' + L(LISTEN_TEXT.off), run: () => listenBar.stop() };
    } else if (interior.stations?.listening && nearestStation(interior.stations.listening, p.x, p.z)) {
      const st = nearestStation(interior.stations.listening, p.x, p.z);
      next = { key: 'listen', label: '🎧 ' + L(LISTEN_TEXT.open), run: () => listenBar.open(st) };
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
          : quests.active && quests.ready(questCtx()) ? infoMissionAct(p) // a mission to report comes first
            : { key: 'info-game', label: '🎮 ' + L(INFO_TEXT.askGame), run: () => { clerk.ch.wave(); infoUi.showGame(); } };
      }
    } else if (interior.store.workshop === 'bank' && clerk && Math.hypot(p.x - clerk.ch.root.position.x, p.z - clerk.ch.root.position.z) < 2.8) {
      next = { key: 'bank', label: bankGame.actionLabel(), run: () => { clerk.ch.wave(); bankGame.openBank(); } };
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
    } else if (frisbee.action(p)) {
      next = frisbee.action(p);
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
// Snow settles on the street (core/snow-cover.js): everything built by now,
// so the shaders are ready before it first snows; while there's snow, parts
// of the city built later (first visits) are given it too.
// Big instanced meshes (trees, reeds, flowers…) cut into tiles so the ones
// out of view are skipped (core/split-instances.js). Same picture, far less work.
splitInstances(scene);
const farPeople = new FarPeople();
coverScene(scene);
let snowCoverAt = 0;
// First-person view (game/first-person.js): V or Settings only.
const firstPerson = createFirstPerson({
  camera, canvas, cam, me, t, toast: (s) => shop.toast(s),
  canUse: () => !arcadeGame.camOn() && !ride && !namsanCable.busy && !sky.busy && !beauty.beautyCam && !hatWorkshop.hatDraft && !fishCam && !runwayCam && !DEBUG_TOP,
});
// Phones: the stick turns the view as you walk (game/touch-steer.js).
const touchSteer = createTouchSteer({ input, cam, t, toast: (s) => shop.toast(s) });
// Settings › Game settings: hide the buttons, and where the joystick sits. (game/screen-layout.js)
import('./game/screen-layout.js').then(({ createScreenLayout }) => {
  createScreenLayout({ input, hud: $('hud'), t, toast: (s) => shop.toast(s), isTouch: input.isTouch, onMinimap: (on) => { minimapAlways = on; } });
}).catch(() => { /* the default layout */ });
// The camera eases round behind you as you walk (game/follow-cam.js).
const followCam = createFollowCam({ cam, me, t, toast: (s) => shop.toast(s) });
let mapPause = 0; // (seconds since other players last moved while the map is open)
renderer.setAnimationLoop((now) => {
  if (!gfx.frame(now) || taxi.skipFrame(now)) return; // (at most 60 frames a second; fewer behind the taxi scene: game/taxi.js)
  guardPosition();
  timer.update();
  const dt = Math.max(0, Math.min(timer.getDelta(), 0.05)); // (never back in time: a clock set back)
  input.update();

  const look = touchSteer.look(input.consumeLook()); // (phones, walking: drag tilts only)
  if (look.dx || look.dy) manualCamT = 2;
  manualCamT -= dt;
  if (!firstPerson.look(look)) {
    cam.yaw -= look.dx * 0.006;
    cam.pitch = THREE.MathUtils.clamp(cam.pitch + look.dy * 0.004, beauty.beautyCam ? 0.05 : (mode === 'street' && towerLook.min(me.root.position)) || (skyLook() ? -0.12 : 0.12), 1.25);
    cam.dist = THREE.MathUtils.clamp(cam.dist + look.zoom, beauty.beautyCam ? 0.8 : 4, interior?.zooHall ? 6.5 : mode === 'store' ? 9 : sky.busy ? 90 : 28); // (the zoo's Sea Animals hall is a room too: the camera stays under its ceiling)
  }

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
  const canSteer = !seated && !arcadeGame.camOn() && !ride && !namsanCable.busy && !sky.busy && riding !== 3 && !firstPerson.active() && !beauty.beautyCam && !hatWorkshop.hatDraft && !fishCam && !runwayCam && !(runwayUi.walking && mode === 'store');
  const stickTurning = touchSteer.turn(dt, mx, my, canSteer);
  if (stickTurning) moveRef.yaw = cam.yaw; // (walk where the turning view faces)
  firstPerson.steer(moveRef); // (first person: always where you look)
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
  if (mode === 'store' && interior?.store.workshop === 'runway') runwayTick(dt); // (walking with friends: the line)
  if (mode === 'store') interior?.tick?.(dt, me.root.position); // amusement park rides, the haunted house
  if (mode === 'store') parkRiders.tick(interior?.riderNpcs); // (guests on the carousel and the ship)
  else landmarks.userData.tick(performance.now() / 1000); // Another Land's wheel, coaster and drop tower
  if (mode === 'street' && streams.length) { streamModels.userData.tick(performance.now() / 1000); updateWishes(); } // ripples, waterfall, lanterns
  updateDroneShow();
  updateFireworks();
  rainbowFountain.update();
  updateRide(dt);
  if (!!ride !== document.body.classList.contains('on-ride')) document.body.classList.toggle('on-ride', !!ride); // (no name tags or bubbles while you ride: just the ride)
  namsanCable.update();
  if (seated?.street && (mode !== 'street' || Math.hypot(p.x - seated.x, p.z - seated.z) > 1)) seated = null; // moved off the bench (a warp, a shop)
  if (seated && !seated.surgery && seated.duck == null && seated.bumper == null && seated.camel == null && mag > 0.3) standUp(); // (get off a duck boat, a bumper car or a camel with its button)
  updateDucks(dt);
  seoulDal.update(p, dt); // (carries me up and down in the gondola)
  updateOpenParks(dt);
  if (mode === 'street') hanParks.update(dt, p); // Han River parks laid on the street
  if (mode === 'street') nightCarts.update(dt, p); // the night food carts (Myeongdong)
  if (!bumper.loaded && mode === 'store' && interior?.bumper) bumper.ready().catch(() => {});
  bumper.tick(dt);
  updateSurgery(dt);
  updateHaircut(dt);
  if (dancing && (mag > 0.3 || !clubs.clubState)) { dancing = false; action = STALE; }
  // Off the bench or reformer as soon as you move (or close the panel); off
  // a yoga mat once you walk away from it.
  if (gymSpot && (!gymUi.open || (gymSpot.back ? mag > 0.3 : Math.hypot(p.x - gymSpot.x, p.z - gymSpot.z) > 1.2))) { leaveGymSpot(); action = STALE; }
  if (mode === 'store') updateStudio();
  if (interior?.stations?.benchBar) { // the rack's bar is gone while someone lifts it
    const lifting = me.activityName === 'bench' || [...others.players.values()].some((q) => !q.hidden && q.target?.ac === 'bench');
    for (const m of interior.stations.benchBar) m.visible = !lifting;
  }
  if (busking.performing && (mag > 0.3 || mode !== 'street' || riding || !busking.stageAt(p.x, p.z))) stopBusking();
  me.activity(currentActivity());
  fishRig.update(dt, me);
  updatePeerRigs(dt);
  if (me.activityName === 'read' && !myLabel.bubble) showBubble(myLabel, $('labels'), t('book.reading'), 3000);
  if (autoWalk && mag > 0.05) setAutoWalk(false); // the player took over
  const steady = steadyWalk && !riding;
  // Walking only in the Quiet Zone (Bukchon) and in the cathedral.
  const inCathedral = mode === 'store' && !!interior?.massNpcs;
  if (inCathedral && input.run && mag > 0.05 && interior.massNpcs.shh()) { showBubble(myLabel, $('labels'), '🤫'); shop.toast(L(roomKit().CATHEDRAL_TEXT.shh)); }
  const quiet = updateQuiet(p, mag > 0.05 || !!autoWalk) || inCathedral;
  const running = updateStamina(dt, input.run && !riding && !steadyWalk && !quiet, mag > 0.05 && !seated);
  if (sky.busy) speed01 = sky.fly(dt, p, mx, my, moveRef.yaw, input.run); // flying (operators)
  else if (mag > 0.05 && !seated && !ride && !namsanCable.busy && !seoulDal.busy && riding !== 3 && !(runwayUi.walking && mode === 'store')) {
    walkedFor += dt;
    if (walkedFor > 0.8) dismissHelp();
    const inStore = mode === 'store' && !interior.store.open; // (an open-air park is the street's: its pace too, or you'd lurch at its edge)
    const walkPace = steady ? (inStore ? STORE_STEADY : STEADY) : (inStore ? STORE_WALK : WALK);
    const speed = (riding ? rideSpeed() : (running ? (inStore ? STORE_RUN : RUN) : walkPace) * gymLog.boost) * Math.min(1, mag) * wxSpeed() * pool.slow * snowman.speed; // (slower in the pool's water, or rolling a big snowball)
    const fx = -Math.sin(moveRef.yaw), fz = -Math.cos(moveRef.yaw); // forward
    const rx = Math.cos(moveRef.yaw), rz = -Math.sin(moveRef.yaw); // right
    const dx = (fx * my + rx * mx) * speed * dt;
    const dz = (fz * my + rz * mx) * speed * dt;
    let [nx, nz] = activeCollision.move(p.x, p.z, dx, dz, PLAYER_R);
    if (mode === 'street') {
      p.x = THREE.MathUtils.clamp(nx, bounds.minX - 50, bounds.maxX + 50);
      p.z = THREE.MathUtils.clamp(nz, bounds.minZ - 50, bounds.maxZ + 50);
    } else {
      const bx = interiorLoaded().roomBox(interior.room), m = interior.store.open ? -2 : 0.5; // (an open park: past its edge is the street, updateOpenParks)
      p.x = THREE.MathUtils.clamp(nx, bx.x0 + m, bx.x1 - m);
      p.z = THREE.MathUtils.clamp(nz, bx.z0 + m, bx.z1 - m);
    }
    const targetRy = Math.atan2(dx, dz);
    let d = targetRy - me.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    me.root.rotation.y += d * Math.min(1, dt * 12);
    const anim = steady ? Math.min(STEADY_ANIM, (speed / walkPace) * STEADY_ANIM) : Math.min(1, speed / (riding ? rideSpeed() : inStore ? STORE_RUN : RUN));
    speed01 = THREE.MathUtils.lerp(speed01, anim, Math.min(1, dt * 10));
  } else if (autoWalk && routePoly?.length > 1 && mode === 'street' && !seated && !seoulDal.busy && riding !== 3) {
    // Head for the route point about 2.5 m ahead (pure pursuit), on foot or by bike.
    const [tx, tz] = pointAhead(routePoly, p.x, p.z, 2.5);
    const ddx = tx - p.x, ddz = tz - p.z, dl = Math.hypot(ddx, ddz) || 1;
    const running = updateStamina(dt, input.run && !riding && !steadyWalk && !quiet, true);
    const speed = (riding ? rideSpeed() : (running ? RUN : steady ? STEADY : WALK) * gymLog.boost) * wxSpeed() * snowman.speed;
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
    speed01 = THREE.MathUtils.lerp(speed01, seoulDal.pace * 0.45, Math.min(1, dt * 10)); // (0, or walking round Seoul Dal's gondola)
  }
  if (!seated) firstPerson.face(me.root); // (strafing, not turning)
  me.animate(dt, speed01 < 0.05 ? 0 : speed01, !!seated || !!ride);
  if (riding === 1 && mode === 'street' && garage.ride(Math.min(5, Math.hypot(p.x - px0, p.z - pz0)))) shop.toast(L(BIKE_TEXT.worn));

  // Ease round behind the character while walking (slowly, and not for a
  // moment after the player drags the view). An older follow swing turned at
  // once and fought the drag, and players got lost; see game/follow-cam.js.
  followCam.update(dt, { dragged: !!(look.dx || look.dy), moving: mag > 0.05 || !!autoWalk, can: canSteer && !stickTurning && !seoulDal.busy && riding !== 3, pace: speed01 });

  // Camera follow.
  // Keep the camera out of buildings: walk back from the player and stop
  // just before the first wall.
  let horiz = Math.cos(cam.pitch) * cam.dist;
  const sy = Math.sin(cam.yaw), cy0 = Math.cos(cam.yaw);
  const wall = mode === 'street' && !sky.busy ? (d) => (byStream?.low ? streamCollision : collision).blocked(p.x + sy * d, p.z + cy0 * d, 0.3, true)
    : interior?.camBlocked ? (d) => interior.camBlocked(p.x + sy * d, p.z + cy0 * d) // the Namsan summit: stop short of the tower; the Curve Runway: short of the back wall
      : null;
  if (wall) {
    for (let d = 1; d <= horiz; d += 0.5) {
      if (!wall(d)) continue;
      // Find the wall to about 6 cm, so the distance glides instead of
      // jumping in half-metre steps as we walk (that read as shaking).
      let lo = d - 0.5, hi = d;
      for (let k = 0; k < 3; k++) { const m = (lo + hi) / 2; if (wall(m)) hi = m; else lo = m; }
      horiz = Math.max(1.5, hi - 0.6);
      break;
    }
  }
  // In fast (never inside a wall), out only once the way has been clear for
  // a moment: walking past doorways and posts, the camera doesn't pump in
  // and out.
  if (horiz < camHoriz) { camHoriz += (horiz - camHoriz) * Math.min(1, dt * 20); camOutWait = 0.6; }
  else if ((camOutWait -= dt) <= 0) camHoriz += (horiz - camHoriz) * Math.min(1, dt * 3);
  const cx = p.x + Math.sin(cam.yaw) * camHoriz;
  const cz = p.z + Math.cos(cam.yaw) * camHoriz;
  // Lower the camera with the distance so a close camera doesn't look straight down.
  let cy = p.y + 1 + Math.sin(cam.pitch) * cam.dist * Math.min(1, camHoriz / (Math.cos(cam.pitch) * cam.dist));
  if (cam.pitch < 0.12) cy = Math.max(cy, p.y + 0.35); // looking up at the drones: not under the grass
  camera.position.lerp(tmp.set(cx, cy, cz), 1 - Math.exp(-dt * 12));
  if (beauty.beautyCam?.look) camera.lookAt(...beauty.beautyCam.look); // the mirror, or the face on the bed
  else camera.lookAt(p.x, p.y + (hatWorkshop.hatDraft || beauty.beautyCam ? 0.05 : 1.1 + towerLook.lift(cam.pitch, camHoriz)), p.z); // workshop: character sits above the panel; Another Tower: tilted up
  if (DEBUG_TOP) {
    camera.position.set(p.x, DEBUG_TOP, p.z + DEBUG_TOP * 0.35);
    camera.lookAt(p.x, 0, p.z);
  }

  firstPerson.update(p, !!seated); // (in your eyes, when on)
  seoulDal.camera(camera); // (in Seoul Dal's gondola, in the air: the view out)
  arcadeGame.camera(dt); // (playing darts or bowling: at the throw line or behind the ball)
  surgeryView(); // (on the operating table: in your eyes, looking up at the team)
  if (ride?.kind === 'coaster') coasterCamera(dt); // (its own view: behind you on the track, or your seat)
  else if (ride?.pose) {
    rideCam.update(dt, ride.pose, ride.view === 'first', rideFxSoft, ride.kind === 'drop' ? 3.4 : ride.kind === 'wheel' ? 3.8 : 0, ride.top || 0, ride.view === 'scenic');
    me.root.visible = ride.view !== 'first';
    if (THRILL_RIDES.has(ride.kind)) rideThrill.update(dt, ride.kind, rideClock(), rideFxSoft, ride.view === 'first'); // (the swing's and the drop's speed)
  }
  const tSec = timer.getElapsed();
  me.setUmbrella(umbrellaOpen());
  if (!outdoors()) snowUniform.value = 0; // (no snow indoors, even on a material the street shares; a Han River park's lawn is outdoors)
  else if (snowUniform.value > 0 && tSec > snowCoverAt) { coverScene(scene); snowCoverAt = tSec + 10; }
  if (mode === 'street') {
    weather.update(dt, p.x, p.z);
    sun.position.copy(p).setY(0).add(weather.sunset.offset); // (low in the west at sunset: core/sunset-sky.js)
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
  if (loveLockUi.open && !loveLockUi.busy && (mode !== 'street' || namsanWalk.awayFromHeart(p))) loveLockUi.close();
  if (wishUi.open && (mode !== 'street' || !(wishUi.view === 'wish' ? wishSpot(p) : muralSpot(p)))) wishUi.close(); // walked away
  if (bukchonUi.open && (bukchonUi.view === 'jm' ? mode !== 'street' : bukchonUi.view === 'bosingak' ? mode !== 'street' || bellDistance(p) > 25 : bukchonUi.view === 'welcome' ? mode !== 'street' || !bukchonIn(p.x, p.z) : bukchonUi.view?.startsWith('craft:') ? mode !== 'store' : mode !== 'street' || !bukchonAct(p))) bukchonUi.close();
  if (interior?.turntable && music.on) interior.turntable.platter.rotation.y -= dt * 3.5; // 33⅓ rpm
  if (mode === 'store' && interior?.animate) interior.animate(dt, clubPulse()); // club lights, candles, the subway train
  if (mode === 'store') interior?.dartPins?.update(); // old darts come out of the wall boards
  basketTick(dt, p); // a basketball move places you
  skateTick(dt, p);
  if (riding !== 3 && !seated && !sky.busy && !seoulDal.busy && !namsanCable.busy) updateSubway(dt, p, px0, pz0); // (the street ground under you, not in the balloon or the cable car)
  sky.update(dt);
  if (mode === 'store' && interior?.floorAt && !seated) p.y = interior.floorAt(p.x, p.z); // the summit plaza is up the hill
  poolTick(dt, p, mag); // Olympic Park Pool: the water, a race, a dive
  updateMeal();
  picnic.tick(); // picnic mats on the park lawn
  frisbee.tick(dt); // playing fetch on the lawn
  snowman.tick(dt); // snowballs and snowmen
  if (mode === 'store') interior?.see?.(p.x, p.z, camera.position.x, camera.position.z); // walk-in rooms turn see-through
  if (mode === 'store' && interior?.store.workshop === 'tarot') tarotTick();
  updateAction(p, tSec);
  mapView.tick(dt); // (draws again only when something moved: ui/map-view.js)
  minimap?.update(dt);

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
    const sop = openParkHere(), [sx, sz] = myWorldSpot(); // (in an open park: in the street's metres, the people around are the street's)
    const st = {
      x: Math.round(sx * 100) / 100,
      z: Math.round(sz * 100) / 100,
      ry: Math.round((me.root.rotation.y + (sop ? sop.ry : 0)) * 100) / 100,
      s: Math.round(speed01 * 100) / 100,
    };
    if (seated || ride) st.sit = 1;
    if (ride?.kind === 'coaster') { st.cs = ride.train * 10 + ride.seat + 1; [st.x, st.z] = peerSpot(COASTER_OFF.x, COASTER_OFF.z); st.ry = 0; } // (others place us from the clock: nothing to send while we ride)
    if (teleports) st.tp = teleports;
    if (tarot.myTicket && interior?.store.workshop === 'tarot') st.tq = tarot.myTicket; // our place in the tarot café line
    if (Math.abs(p.y) > 0.05 && ride?.kind !== 'coaster') st.y = Math.round(p.y * 100) / 100; // on subway stairs (not on the coaster: others place us from the clock)
    sky.state(st); // flying, carried, on a roof
    if (riding) st.bk = riding;
    if (riding === 1) st.bv = rideCode(garage.rideSpec()); // which ride and skin
    if (skateTk && performance.now() - skateTk.at < 1500) st.tk = skateTk.code; // a skate park trick: others play it too
    if (seated?.duck != null) { st.db = seated.duck + 1; st.dbs = seated.duckSeat || 0; } // in a duck boat
    bumper.state(st); // in a bumper car, or in line for one
    seoulDal.state(st); // in Seoul Dal's gondola, or holding a waiting ticket
    const duckRide = duckBoats.ride;
    if (duckRide) st.dr = duckRide.returning ? 1 : Math.ceil(duckRide.left) + 1; // steering it: seconds left + 1 (1 = heading back)
    if (riding === 3) { st.on = tandemDriver; st.seat = mySeat; }
    if (heldKind()) st.hd = heldKind();
    if (me.activityName) st.ac = me.activityName;
    if (umbrellaOpen()) st.um = 1;
    if (petCare.pet && !petIndoors()) st.pt = petCare.pet.id; // (not seen indoors)
    if (myScent) st.sc = myScent; // others show the perfume's effect next to us
    if (sop) st.mp = sop.item.store.id; // which open park our mat and frisbee (in its metres) are in
    if (picnic.sync) st.mt = picnic.sync; // our picnic mat on the park lawn
    if (frisbee.sync) st.fb = frisbee.sync; // a frisbee throw on the lawn, played on everyone's screen
    if (snowman.sync && mode === 'street') st.sb = snowman.sync; // our snowballs and snowmen
    if (snowman.holdSync != null) st.sh = snowman.holdSync; // rolling one of them along
    if (snowman.grabSync) st.sg = snowman.grabSync; // holding on to a friend's
    if (snowman.duckSync && mode === 'street') st.sd = snowman.duckSync; // our snow ducks
    if (myWish) st.wl = encodeLantern(myWish); // our wish lantern on Cheonggyecheon, while it floats
    if (dining.meal?.mesh && interior) st.ml = mealSync(dining.meal, interior.seats, interior.store.products);
    const changed = !lastSent || st.x !== lastSent.x || st.z !== lastSent.z || st.ry !== lastSent.ry || st.s !== lastSent.s || st.sit !== lastSent.sit || st.y !== lastSent.y || st.bk !== lastSent.bk || st.bv !== lastSent.bv || st.db !== lastSent.db || st.on !== lastSent.on || st.seat !== lastSent.seat || st.hd !== lastSent.hd || st.um !== lastSent.um || st.pt !== lastSent.pt || st.ml !== lastSent.ml || st.sc !== lastSent.sc || st.tq !== lastSent.tq || st.mt !== lastSent.mt || st.sb !== lastSent.sb || st.sh !== lastSent.sh || st.sg !== lastSent.sg || st.sd !== lastSent.sd || st.wl !== lastSent.wl || st.tk !== lastSent.tk || st.bc !== lastSent.bc || st.br !== lastSent.br || st.bh !== lastSent.bh || st.bq !== lastSent.bq || st.fb !== lastSent.fb || st.tp !== lastSent.tp || st.fl !== lastSent.fl || st.cr !== lastSent.cr || st.cs !== lastSent.cs || st.dl !== lastSent.dl || st.dq !== lastSent.dq;
    if (changed || idleTimer <= 0) {
      net.sendState(st);
      lastSent = st;
      idleTimer = config.netIdleInterval;
    }
    // Carrying passengers: send more often so their seats keep up.
    // In a crowd, less often (net/rate.js).
    sendTimer = 1 / (passengers.size || bumper.driving ? 12 : sendRate({ peers: net.peers, base: running || riding ? config.netSendRateRun : config.netSendRate, budget: config.netRecvBudget, min: riding && onlineAll < config.netRideFloorUntil ? config.netSendRateRide : config.netSendRateMin }));
  }

  const w = innerWidth, h = innerHeight;
  others.fences = petFences();
  // While the full map is open nothing behind it is seen: other players
  // only catch up four times a second (their dots on the map still move),
  // and the street's NPCs wait. Closing the map, everyone is where they are.
  mapPause += dt;
  const mapUp = mapView.open;
  if (!mapUp || mapPause >= 0.25) { others.update(mapUp ? mapPause : dt, streetCam(), w, h); mapPause = 0; }
  updateBuskMusic(p);
  liveStage.tick(p);
  if (openParkHere() && !mapUp) npcs.update(dt, streetCam(), w, h); // (the street's people walk on by the open park)
  if (mode === 'street') for (const o of hanParks.staffNear(p)) placeLabels(o, camera, w, h); // (a park's clerk and sellers)
  if (mode === 'street') for (const o of nightCarts.staffNear()) placeLabels(o, camera, w, h); // (the night carts' sellers)
  if (mode === 'street') { loadPalaceShow(p); updateEnclosures(p, dt); palaceShow?.update(dt, p, camera, w, h, placeLabels); jongmyoShow?.update(dt, p, camera, w, h, placeLabels); pungmul?.update(dt, p, camera); updateJongmyo(p, dt); updateBosingak(p, dt, w, h); if (!mapUp) { npcs.update(dt, camera, w, h); hanbokNpcs?.update(dt, camera, w, h); } gyeongnidan.update(p, dt, camera, w, h); namsanWalk.update(p); potatoMarket.update(p, dt); folkYard.tick(dt, p, camera, w, h, placeLabels); if (busking.update(dt, p, camera, w, h, placeLabels) === 'tip') buskTip(); }
  else {
    busking.hideLabels(); palaceShow?.hideLabels(); jongmyoShow?.hideLabels(); bosingakShow?.hideLabels(); folkYard.hideLabels(); folkYard.closeAll();
    if (clerk) { clerk.ch.animate(dt, interior?.store.clerkRoams ? roamClerk(dt, p) : 0); placeLabels(clerk, camera, w, h); }
    for (const o of [trainer, barkeep, areaGuide, ...(interior?.readerNpcs || []), ...(interior?.vendorNpcs || [])]) if (o) { o.ch.animate(dt, o.speed || 0); placeLabels(o, camera, w, h); }
    if (interior?.vendorNpcs) greetAtStalls(p);
    for (const o of interior?.audienceNpcs || []) o.ch.animate(dt, 0); // (sitting: their 'sit' activity)
    for (const o of interior?.visitorNpcs || []) o.ch.animate(dt, 0); // (DDP Hall's visitors, standing)
    for (const o of interior?.patronNpcs || []) { o.ch.animate(dt, 0); placeLabels(o, camera, w, h); }
    interior?.massNpcs?.update(dt, camera, w, h); // (the cathedral's Mass)
    for (const o of Object.values(interior?.rideStaff || {})) { o.ch.animate(dt, 0); placeLabels(o, camera, w, h); } // (each ride's attendant)
    for (const o of interior?.riderNpcs || []) { o.ch.animate(dt, 0); placeLabels(o, camera, w, h); } // (guests on the rides)
    for (const o of interior?.coasterStaff || []) { o.ch.animate(dt, 0); placeLabels(o, camera, w, h); } // (the coaster's attendant) // (bar regulars; the label shows their speech bubbles)
    for (const o of interior?.listenerNpcs || []) o.ch.animate(dt, 0); // (the record café's listener, nodding)
    for (const o of interior?.studioNpcs?.all || []) { o.ch.animate(dt, 0); placeLabels(o, camera, w, h); } // (the yoga class, the reformer)
    listenBar.update(dt, p);
  }
  balloonClown.tick(dt, mode === 'store' && !!interior?.themepark && !interior.island, camera, w, h, placeLabels); // (the clown, and a balloon in hand losing its air)
  parkTickets.tick(dt, mode === 'store' && !!interior?.island, camera, w, h, placeLabels, p); // (the ticket guide at the island's gate)
  mirrorMaze.tick(me.root.position, mode === 'store' && !!interior?.themepark && !interior.island && !ride); // (the island is in the coaster's metres, not the maze's)
  zooVisit.tick(dt, p, camera, w, h); // (in the zoo: its visitors, its keeper, the carts)
  for (const g of [squareNpc, welcomeNpc]) {
    if (!g) continue;
    if (mode === 'street') { g.ch.animate(dt, 0); placeLabels(g, camera, w, h); }
    else for (const el of [g.tag, g.bubble]) if (el) el.style.display = 'none';
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

  // The full map covers the screen, so there is nothing to see behind it:
  // the game keeps going but the 3D view is not drawn (Yozi, to keep phones cool).
  if (mapView.open) { updateDelivery(); return; }
  renderScenes(); // (the street, the room you're in, open parks: renderScenes)
  // Skip people too far away to see (core/far-people.js): after drawing, so
  // everyone's matrixWorld is this frame's; never your own character.
  if (activeScene === scene) farPeople.update(dt, scene, camera, me.root);
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
    snow: (v) => { if (v != null) weather.pinnedSnow = v; return snowUniform.value; },
    weatherSet: (raw) => { weather.setSettings(raw); return weather.kind; },
    snowballs: () => snowman.sync, snowSet: (n, x, z) => snowman.debugSet(n, x, z), snowHold: () => snowman.holding, ducks: () => snowman.duckSync, holdFromBag: (kind) => { const i = bag.items.findIndex((e) => e.kind === kind); if (i < 0) return null; const e = held ? bag.swap(i, held) : bag.take(i); if (e) setHeld(e); return heldKind(); }, bagKinds: () => bag.items.map((e) => e.kind), snowSeenDucks: () => [...others.players.values()].map((q) => q.target?.sd ?? null), heldNow: () => heldKind(), blocked: (x, z, r) => collision.blocked(x, z, r), wear: (patch) => { myLook = { ...myLook, ...patch }; setLook(myLook); return myLook.head; }, snowSeen: () => [...others.players].map(([id, q]) => [id, !!q.hidden, q.target?.sb ?? null, q.target?.x, q.target?.sh ?? null]), pose: () => [me.activityName, +me.root.position.x.toFixed(2), +me.root.position.z.toFixed(2), snowman.busy, mode],
    emblem: () => emblemUi.show(),
    notice: (n) => chat.debugNotice(n),
    // Panels downloaded on first use (core/lazy-panel.js): __mk.panel('academy').show()
    panel: (k) => ({ kimchi: kimchiUi, japchae: japchaeUi, kimbap: kimbapUi, academy: academyUi, book: bookUi, sauna: saunaUi, ramen: ramenUi, order: orderUi, job: jobUi, photo: photoUi, claw: clawUi })[k],
    motion: () => ({ wind: !!motionSound.wind, engine: !!motionSound.engine, honk: shownHonk }),
    order: (i = 0) => orderFood(interior.store.products[i], false),
    mealBites: () => dining.meal?.bites ?? null,
    peerMeals: () => [...dining.peerMeals.values()].map((m) => [m.owner, m.bites, m.seat.plate]),
    plateSeat: () => interior.seats.findIndex((s) => s.plate),
    project: (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
    myName: () => nickname,
    nightCarts: () => nightCarts.sites.map((o) => ({ built: !!o.built, shown: o.shown, spots: o.spots })),
    mapView: () => mapView,
    chatState: () => ({ privateChannel: !!net?.chatReady, user: !!cloud.user, guest: !!cloud.guest }),
    near: () => others.players.size, // people in my area cells (not the global count)
    onlineAll: () => onlineAll, // the server's count of everyone on the map (0: none yet)
    enter: (id) => enterStore(storefronts.get(id)),
    openBeauty: (kind) => openBeauty(kind), // (the mirror panel without walking to the chair)
    seoulDal: () => ({ busy: seoulDal.busy, y: +me.root.position.y.toFixed(2), at: [+me.root.position.x.toFixed(1), +me.root.position.z.toFixed(1)], coins: wallet.coins }),
    usedRack, // the second-hand rack (game/used-rack.js), for tests
    potatoMarket, // Potato Market by Dongmyo (game/potato-market-near.js), for tests
    wallet, // (tests stand in for the server: wallet.s, wallet.client)
    enterDoor: (id) => roomTips.enter(storefronts.get(id)), // (through the door: a tip while a new room is built)
    rooms: () => interiorCache.size, // rooms kept in memory (game/room-cache.js)
    gpuSweep: () => gpuJanitor.sweepNow(), // free textures not drawn for a minute (game/gpu-janitor.js)
    gpu: () => ({ ...renderer.info.memory }),
    fountain: () => ({ mix: +(weather.nightMix || 0).toFixed(3), jets: !!rainbowFountain.jets, visible: !!rainbowFountain.jets?.group.visible }),
    fireworks: () => ({ mix: +(weather.nightMix || 0).toFixed(3), sky: !!fireworks.sky, visible: !!fireworks.sky?.points.visible, look: fireworks.look }),
    droneShow: () => { const sh = dronePark()?.show; return { night: +(sh?.night || 0).toFixed(3), drones: !!sh?.sky, lit: sh?.sky?.lit() || 0, sky: +(weather.nightMix || 0).toFixed(3), stamp: !!stampStands.items.find((i) => i.stamp.id === 'drone-show')?.up, pitch: +cam.pitch.toFixed(2) }; },
    openBank: () => bankGame.openBank(),
    bankStub: (open) => { cloud.bankStatus = async () => ({ open, min: 1000, max: 500000 }); }, // (test the operator form without a server)
    bankOpen: () => bankGame.bankUi.open && document.querySelector('#bank-panel')?.textContent,
    forcePose: (n) => { debugPose = n || null; return me.activityName; },
    studio: () => ({ spots: interior?.stations?.studio?.map((s) => [s.x, s.z, s.kind, !!s.npc]) || null, instructor: instructor ? [instructor.ch.root.position.x, instructor.ch.root.position.z, instructor.ch.activityName] : null, npcs: interior?.studioNpcs?.all.map((o) => o.ch.activityName) || null, gym: interior?.stations?.gym?.map((s) => [s.x, s.z, s.kind]) || null, bar: interior?.stations?.benchBar?.[0]?.visible ?? null, spot: gymSpot && { ...gymSpot }, open: gymUi.open, kind: gymUi.kind, pose: gymUi.pose, ac: me.activityName, at: [+me.root.position.x.toFixed(2), +me.root.position.z.toFixed(2)] }),
    runwayRoom: () => enterRunwayRoom(), // (from DDP Hall)
    runwayFx: (tier, word) => runwayReact(me.root, tier, word),
    runwayLine: (on) => (on ? runwayUi.line.join() : runwayUi.line.leave()),
    runwayOpen: () => runwayUi.show(),
    runwayLineState: () => ({ ...runwayUi.line.status(), walking: !!runwayUi.game }),
    backOut: () => backToPark(), // (the runway or haunted house back to its hall or park)
    fronts: () => storefronts.items.map((i) => ({ id: i.store.id, x: +i.group.position.x.toFixed(2), z: +i.group.position.z.toFixed(2), ry: +i.group.rotation.y.toFixed(3) })),
    subway: () => ({ mode, y: +me.root.position.y.toFixed(2), exit: interior?.front?.subwayExit ?? null, train: interior?.subway?.train.phase ?? null, exits: allExits.map((e) => [e.at[0], e.at[1], e.ry]) }),
    subwayStairs: () => interior?.subway?.stairs.map((s) => ({ ...s })) ?? null,
    metro: () => subway.metro && { ...subway.metro, now: Date.now(), station: stationIndex(), mode: interior?.train ? 'train' : interior?.subway ? 'hall' : mode },
    doorsOpen: (t) => interior?.subway?.doorsOpen(t) ?? null,
    pickStop: (k) => pickStop(k),
    leave: () => leaveStore(),
    live: () => liveStage.voice?.debug() ?? null, liveVoice: () => liveStage.voice, // the live café's voice (game/live-voice.js)
    dartSpots: () => interior?.stations?.darts?.map((s) => [s.x, s.z]) ?? null, // the throw lines (game/darts-view.js)
    bowlLanes: () => interior?.stations?.bowling?.map((s) => ({ x: s.x, z: s.z, busy: s.busy, ball: s.ball.visible, rows: s.screen.rows })) ?? null, // lanes and their screens (core/activity-rooms.js)
    listenStations: () => interior?.stations?.listening?.map((s) => [+s.x.toFixed(2), +s.z.toFixed(2), !!s.taken]) ?? null,
    listening: () => ({ id: listenBar.listening, pos: listenBar.position, ac: me.activityName, music: music.on }),
    seats: () => (mode === 'street' ? streetSeats : interior?.seats || []).length, // (on the street: picnic mats come last)
    sit: (i) => sitDown((mode === 'street' ? streetSeats : interior.seats)[i]),
    seated: () => !!seated,
    stand: () => standUp(),
    tarot: () => ({ seats: interior?.seats?.map((s) => [s.x, s.z, s.table ?? null, !!s.wait]), turn: tarot.tarotTurn, ticket: tarot.myTicket, readers: 1 + (interior?.readerNpcs?.length || 0), offer: tarot.tarotOffer() && { ...tarot.tarotOffer() }, state: tarotUi.loaded && tarotUi.state && { topic: tarotUi.state.topic, picked: [...tarotUi.state.picked], pair: tarotUi.state.pair && { ...tarotUi.state.pair } } }),
    bone: (n) => { const b = me.root.getObjectByName(n); if (!b) return null; const v = b.getWorldPosition(new THREE.Vector3()); me.root.worldToLocal(v); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; },
    bookShelf: (section) => bookUi.showShelf(section),
    bookStations: () => interior?.stations?.books?.map((st) => ({ ...st })) ?? null,
    readBook: (id, page = 0) => { bookPages[id] = page; bookUi.read(id); },
    action: () => action?.label || null,
    choices: () => action?.opts?.map((o) => o.label) || null,
    clerkAt: () => { const c = parkClerk(); return c ? [c.ch.root.position.x, c.ch.root.position.z] : null; },
    productsAt: () => (hanPark() || interior)?.products?.map((pr) => [pr.pos.x, pr.pos.z]) ?? null,
    act: () => action?.run(),
    pick: (i) => (action?.opts ? action.opts[i] : action)?.run(),
    room: () => ({ mode, id: interior?.store?.id ?? null, front: interior?.front?.store?.id ?? null }),
    tags: () => [...others.players.values()].map((q) => q.tag?.style.display !== 'none'), // (other players' name tags on screen)
    outside: () => { const q = myPlace(); return { out: outdoors(), x: +q.x.toFixed(2), z: +q.z.toFixed(2) }; }, // (the map and the operators' live view)
    dartPins: () => [...(interior?.dartPins?.byWho.values() || [])].map((e) => [e.board, e.color, e.pins.length]),
    decor: () => decorGame.decor?.items.length ?? -1,
    riding: () => riding,
    sky: () => ({ sky, me }), // (the flight and our character: tests/e2e and screenshots)
    skyPieces: () => { const out = []; me.root.traverse((o) => { if (o.userData.skyPiece) { const v = o.getWorldPosition(new THREE.Vector3()); me.root.worldToLocal(v); let vis = true; for (let q = o; q; q = q.parent) vis &&= q.visible; out.push([o.userData.skyPiece, vis, ...v.toArray().map((n) => +n.toFixed(2))]); } }); return out; },
    cam: (o) => Object.assign(cam, o),
    graphics: () => gfx.state(),
    renderInfo: () => { let tris = 0; scene.traverseVisible((o) => { if (o.isMesh && o.geometry) { const g = o.geometry; const n = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += n * (o.isInstancedMesh ? o.count : 1); } }); return { calls: renderer.info.render.calls, frameTris: renderer.info.render.triangles, sceneTris: Math.round(tris), geometries: renderer.info.memory.geometries }; },
    ride: (k) => startRide(k),
    place: (x, z) => me.root.position.set(x, 0, z),
    parkStaff: () => Object.keys(interior?.rideStaff || {}),
    parkRide: () => ({ ride: ride && ride.kind !== 'coaster' ? { kind: ride.kind, seat: ride.seat, phase: ride.phase, view: ride.view, roll: +(ride.pose?.roll || 0).toFixed(3) } : null, at: [+me.root.position.x.toFixed(2), +me.root.position.y.toFixed(2), +me.root.position.z.toFixed(2)], phase: Object.fromEntries(Object.keys(RIDE_CYCLE).map((k) => [k, ridePhase(k, Date.now() / 1000)])), wheelOpen: wheelDoorOpen(wheelBottom(Date.now() / 1000), Date.now() / 1000), locked: !!ride?.locked }),
    coaster: () => ({ ride: ride?.kind === 'coaster' ? { train: ride.train, seat: ride.seat, view: ride.view, phase: ride.phase } : null, fov: +camera.fov.toFixed(1), boarding: boarding(coasterNow()), pass: ridePass(), at: [+me.root.position.x.toFixed(2), +me.root.position.y.toFixed(2), +me.root.position.z.toFixed(2)], staff: interior?.coasterStaff?.length ?? 0 }),
    look: () => currentLook,
    camYaw: () => +cam.yaw.toFixed(3),
    camPos: () => camera.position.toArray().map((v) => +v.toFixed(2)),
    surgery: () => startSurgery(myLook), // (in a clinic: the operating scene without paying)
    surgeryT: (t) => { if (beauty.surgery) beauty.surgery.t = t; return beauty.surgery?.t ?? null; },
    mirror: () => { Object.assign(cam, { dist: 2.6, pitch: 0.12 }); me.root.rotation.y = cam.yaw; }, // close-up, facing the camera
    pets: () => interior?.pets?.list.map((p) => [p.name, p.state, +p.root.position.x.toFixed(2), +p.root.position.z.toFixed(2)]) ?? null,
    npcs: () => npcs.list.map((o) => [o.name, o.ch.root.position.x, o.ch.root.position.z, o.zone]),
    peers: () => [...others.players.values()].map((p) => ({ name: p.name, model: p.model, ...p.target, x: p.ch.root.position.x, z: p.ch.root.position.z, pet: p.pet ? { id: p.pet.id, x: p.pet.root.position.x, z: p.pet.root.position.z, visible: p.pet.root.visible } : null })),
    goto: (x, z, ry = 0) => moveMeTo(activeScene, x, z, ry),
    taxi: (x, z, label = 'test') => rideTaxi({ x, z, label }),
    skate: () => ({ in: inSkate, y: +skateY.toFixed(2), air: skater.air, grind: !!skater.grind, combo: skater.comboPts, riding, type: garage.current.type, at: [+me.root.position.x.toFixed(1), +me.root.position.z.toFixed(1)], ry: +me.root.rotation.y.toFixed(2) }),
    poolBoard: () => interior?.boardCanvas?.toDataURL(),
    pool: () => ({ act: pool.act, mode: pool.mode?.kind || null, y: +me.root.position.y.toFixed(2), at: [+me.root.position.x.toFixed(1), +me.root.position.z.toFixed(1)], swim: wearingSwim(), tube: pool.tube, race: pool.mode?.race ? { t: +pool.mode.race.t.toFixed(2), x: +pool.mode.race.x.toFixed(1), v: +pool.mode.race.v.toFixed(2), done: pool.mode.race.done } : null, log: { ...poolLog.s } }),
    peerTricks: () => [...others.players.values()].map((o) => [o.tk || '', +o.ch.root.position.y.toFixed(2)]),
    rideOn: (id) => { if (id) { garage.s.own.includes(id) || garage.s.own.push(id); garage.use(id); } setRiding(0); setRiding(1); },
    face: (ry) => { me.root.rotation.y = ry; cam.yaw = ry + Math.PI; },
    duckBoard: (i) => boardDuck(i),
    duckGo: () => startDuckRide(),
    bumper: () => bumper.debug(),
    bumperBoard: () => bumper.board(),
    duck: () => { const duckRide = duckBoats.ride; return duckRide && { x: +duckRide.x.toFixed(2), z: +duckRide.z.toFixed(2), ry: +duckRide.ry.toFixed(2), kx: +duckRide.knock.vx.toFixed(2), kz: +duckRide.knock.vz.toFixed(2) }; },
    duckBoats: () => { const hp = hanPark(), f = hp?.frame; return hp?.ducks?.map((d) => { const [x, z] = f ? f.toWorld(d.g.position.x, d.g.position.z) : [d.g.position.x, d.g.position.z]; return [+x.toFixed(2), +z.toFixed(2), +d.g.rotation.z.toFixed(3)]; }); }, // (a park on the street: in the street's metres)
    hanPark: () => { const hp = hanPark(); return hp ? { id: hp.store.id, street: !!hp.street, ry: hp.frame?.ry ?? null, docks: hp.ducks?.map((d) => (hp.frame ? hp.frame.toWorld(d.home.x, d.home.z + 2.2) : [d.home.x, d.home.z + 2.2])) || [] } : null; },
    doorOf: (id) => { const it = storefronts.get(id); return [it.door.x, it.door.z, it.group.rotation.y]; },
    stores: () => storefronts.items.map((i) => i.store.id),
    storePos: () => storefronts.items.map((i) => [i.store.id, +i.group.position.x.toFixed(1), +i.group.position.z.toFixed(1)]),
    zones: () => zones.items.map((i) => [i.zone.id, i.x, i.z]),
    zoo: () => zooVisit.zoo, // Children's Grand Park's zoo (core/zoo.js), while you're in it
    zooVisit: () => zooVisit,
    boards: () => noticeBoards.map((b) => [b.board, b.x, b.z]),
    royal: () => palaceShow?.royalSpot() ?? null, // where the royal procession is
    palace: () => palaceShow, // (debug: the palace performers)
    pungmul: () => pungmul, // (debug: the pungmul troupe on Olympic Park's Peace Plaza)
    me: () => [me.root.position.x, me.root.position.z, me.root.rotation.y, cam.yaw],
    clerk: () => (clerk ? [clerk.ch.root.position.x, clerk.ch.root.position.z] : null),
    product: (i) => shop.openProduct(interior.products[i].product),
    held: () => held && { ...held },
    perfumeIds: () => [...perfumes.keys()],
    holdNew: (h) => holdNew(h),
    takeout: (i = 0) => orderFood(interior.store.products[i], true),
    giveCoins: (n) => { wallet.add(n, { k: 'ledger.gift' }, { r: 'test' }); refreshWallet(); },
    giveMat: () => bag.add({ kind: 'gift', sips: 1, name: 'Picnic mat', icon: '🧺', g: 'mat' }),
    giveFrisbee: (q) => bag.add({ ...newFrisbee(), ...(q != null ? { q } : {}) }),
    frisbee: () => [frisbee.phase, frisbee.streak, frisbee.lying, frisbee.face], frisbeePeers: () => frisbee.peerPhases(),
    givePet: (id) => { inventory.add(id); setPet(id); },
    giveItem: (id) => inventory.add(id),
    petShown: () => (petCare.pet ? petCare.pet.root.visible : null),
    face: (ry) => { me.root.rotation.y = ry; },
    bagTab: (tab) => bagUi.show(tab),
    heldKind: () => heldKind(),
    scent: () => myScent,
    kpop: () => kpop.song && { id: kpop.song.id, at: Math.round(kpop.position) },
    quest: () => quests.active && { ...quests.active, ready: quests.ready(questCtx()), left: quests.left },
    guide: () => squareNpc && [squareNpc.ch.root.position.x, squareNpc.ch.root.position.z, squareNpc.ch.root.rotation.y],
    welcomeGuide: () => welcomeNpc && [welcomeNpc.ch.root.position.x, welcomeNpc.ch.root.position.z, welcomeNpc.ch.root.rotation.y],
    onboard: () => onboard,
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
    spots: () => hanPark()?.fishing?.map((f) => [f.x, f.z]) || null,
    ramenSpot: () => hanPark()?.ramen && [hanPark().ramen.x, hanPark().ramen.z],
    fishBuySpot: () => hanPark()?.fishBuy && [hanPark().fishBuy.x, hanPark().fishBuy.z],
    music: () => ({ on: music.on, track: music.track.id }),
    pet: () => { const pet = petCare.pet; return pet && { id: pet.id, x: pet.root.position.x, y: +pet.root.position.y.toFixed(2), z: pet.root.position.z, visible: pet.root.visible }; },
    petPoop: () => { const pet = petCare.pet; if (pet) pet.walked = pet.poopAt; },
    poops: () => petCare.poopTimers.list.map((x) => ({ ...x, x: petCare.poops.get(x.id)?.x, z: petCare.poops.get(x.id)?.z })),
    poopTime: (s) => petCare.poopTimers.list.forEach((x) => { x.left = s; }),
    coins: (n) => (n == null ? wallet.coins : wallet.add(n - wallet.coins, undefined, { r: 'test' })),
    bagList: () => bag.list(),
    items: () => inventory.list(),
    toClerk: () => { const c = clerk.ch.root.position; me.root.position.set(c.x, 0, c.z - 1.2); },
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
