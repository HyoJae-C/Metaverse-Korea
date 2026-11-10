// Ride shops: Pedal Lab (Seongsu), Bike Research Lab (Hongdae), RIDE WITH ME
// (Itaewon) and Hangeul Mihak (Gyeongbokgung). Every one sells bikes,
// skateboards, inline skates and kick scooters in three steps each, and
// repairs them; each also has its own thing: Pedal Lab the first skins, the
// Lab speed tune-ups and street-art skins, RIDE WITH ME long-ride kits (less
// wear) and night skins, Hangeul Mihak a limited Hunminjeongeum skin line
// sold only by the palace (core/bike-garage.js).
import { BIKE_MODELS, KIT_WEAR, RIDE_SHOPS, RIDE_TYPES, SKIN_COLORS, TUNE_STEP, UPGRADE_MAX, RIDE_ICON as VEHICLE_ICON, repairCost, skinPrice } from '../core/bike-garage.js';
import { L, fmt } from './pocha-ui.js';
import { skinCanvas } from '../core/rides.js';

export function createBikeShop(game) {
  const { $, garage, refreshWallet, shop } = game;
  const BIKE_TEXT = {
    open: { en: 'Rides & upgrades', ko: '탈것·업그레이드', ja: '乗り物・アップグレード', zh: '选车·升级', es: 'Vehículos y mejoras' },
    note: { en: 'Each step is only a little faster. Rides wear out very slowly; a repair costs a little (up to 🪙 10000) at any ride shop.', ko: '단계마다 속도는 조금씩만 빨라져요. 타다 보면 아주 조금씩 닳고, 수리는 어느 탈것 가게에서나 조금만 내면 돼요 (최대 🪙 10000).', ja: '段階ごとに少しだけ速くなります。乗るとゆっくりすり減り、修理はどの乗り物店でも少しのお金でできます（最大🪙 10000）。', zh: '每一级只快一点点。骑久了会缓慢磨损，任何一家车店都能花一点钱修理（最多🪙 10000）。', es: 'Cada nivel es solo un poco más rápido. Se desgastan muy despacio; cualquier tienda los repara por poco (hasta 🪙 10000).' },
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
    poor: { en: 'Not enough money.', ko: '돈이 부족해요.', ja: 'お金が足りません。', zh: '钱不够。', es: 'No tienes suficiente dinero.' },
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
  const applyRide = () => { if (game.riding === 1) game.me.setBike(1, garage.rideSpec()); };
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
        const r = garage.buySkin(kind, id, game.wallet, sid);
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
      const swatchColor = garage.rideSpec().color;
      const patternChip = (id) => {
        const has = garage.hasSkin('pattern', id);
        const b = el('button', 'chip skin-pat with-sample' + (skin.pattern === id ? ' on' : ''));
        // A sample of the pattern itself, in the colour your ride has now,
        // so you can see the design before buying (not just its name).
        const sample = skinCanvas(swatchColor, id);
        sample.className = 'skin-sample';
        b.append(sample, el('span', null, L(PATTERN_NAME[id]) + (has ? '' : ` · 🪙${skinPrice('pattern', id)}`)));
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
            const r = garage.upgrade(kind, m.id, game.wallet);
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
          const r = garage.buy(m.id, game.wallet);
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
            const res = garage.repair(m.id, game.wallet);
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

  return { TIER_STARS, BIKE_TEXT, applyRide, openBikeShop };
}
