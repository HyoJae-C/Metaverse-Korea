// The skate park at Olympic Park (core/skatepark.js, scenery in core/skatepark-model.js):
// ride in on a board, inline skates, a bike or a kick scooter (bike button,
// or a ride from the bag) and tap Trick to pop; ramps throw you into the air,
// a rail under you is a grind. Tricks in a row make a combo; landing banks
// it into today's score and your best combo (just for fun, no coins).
import { GRIND_NAME, bankPoints, inPark, parkGround, railNear } from '../core/skatepark.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { buzz } from '../core/haptics.js';
import { dayKey } from '../core/daily.js';
import { getLanguage, localName } from '../core/i18n.js';

export function createSkate(game) {
  const { $, STALE, garage, sfx, shop, skater } = game;
  const SKATE_TEXT = {
    trick: { en: 'Trick!', ko: '묘기!', ja: 'トリック！', zh: '技巧！', es: '¡Truco!', ar: 'حركة!', vi: 'Mẹo!', hi: 'ट्रिक!', fr: 'Figure !', th: 'ทริก!', id: 'Trik!' },
    ride: { en: 'Ride to do tricks', ko: '타고 묘기 부리기', ja: '乗ってトリック', zh: '骑上去秀技巧', es: 'Monta para hacer trucos', ar: 'اركب لتؤدي الحركات', vi: 'Lên xe để biểu diễn', hi: 'सवार होकर करतब करें', fr: 'Roule pour faire des figures', th: 'ขี่เพื่อเล่นทริก', id: 'Naik untuk trik' },
    welcome: { en: '🛹 Olympic Park Skate Park! Hop on a ride (bike button or your bag), then tap Trick to jump.', ko: '🛹 올림픽공원 스케이트파크! 탈것에 올라타고(자전거 버튼이나 가방) 묘기 버튼으로 점프해요.', ja: '🛹 オリンピック公園スケートパーク！乗り物に乗って（自転車ボタンかバッグ）、トリックでジャンプ。', zh: '🛹 奥林匹克公园滑板公园！骑上车（自行车按钮或背包），按“技巧”起跳。', es: '🛹 ¡Skatepark del Parque Olímpico! Súbete a algo (botón de bici o tu bolsa) y pulsa Truco para saltar.', ar: '🛹 حديقة التزلج في الحديقة الأولمبية! اركب (زر الدراجة أو حقيبتك) ثم اضغط «حركة» للقفز.', vi: '🛹 Công viên trượt Olympic! Lên xe (nút xe đạp hoặc túi) rồi bấm Mẹo để nhảy.', hi: '🛹 ओलंपिक पार्क स्केट पार्क! सवारी पर चढ़ें (साइकिल बटन या बैग), फिर ट्रिक दबाकर कूदें।', fr: '🛹 Skatepark du Parc olympique ! Monte sur un véhicule (bouton vélo ou ton sac), puis touche Figure pour sauter.', th: '🛹 สเกตพาร์กสวนโอลิมปิก! ขึ้นยานพาหนะ (ปุ่มจักรยานหรือในกระเป๋า) แล้วแตะ ทริก เพื่อกระโดด', id: '🛹 Skatepark Taman Olimpiade! Naik kendaraan (tombol sepeda atau tas), lalu tekan Trik untuk melompat.' },
    howto: { en: '🤸 Tap Trick to pop. Ride up the ramps for big air, and land on a rail to grind!', ko: '🤸 묘기 버튼으로 점프! 램프를 타고 높이 날고, 레일 위에 내려앉으면 그라인드!', ja: '🤸 トリックでジャンプ！ランプで高く飛び、レールに乗ればグラインド！', zh: '🤸 按“技巧”起跳！冲上坡道飞得更高，落在栏杆上就能滑杆！', es: '🤸 Pulsa Truco para saltar. ¡Sube las rampas para volar y cae en un riel para grindear!', ar: '🤸 اضغط «حركة» للقفز. اصعد المنحدرات لتطير عاليًا، وانزل على القضيب للانزلاق!', vi: '🤸 Bấm Mẹo để nhảy. Lên dốc để bay cao, đáp lên thanh để trượt!', hi: '🤸 कूदने के लिए ट्रिक दबाएँ। ऊँची उड़ान के लिए रैंप पर चढ़ें, ग्राइंड के लिए रेल पर उतरें!', fr: '🤸 Touche Figure pour sauter. Monte les rampes pour décoller haut, et atterris sur une rampe de grind pour glisser !', th: '🤸 แตะ ทริก เพื่อกระโดด ขึ้นทางลาดเพื่อลอยสูง แล้วลงบนราวเพื่อไถล!', id: '🤸 Tekan Trik untuk melompat. Naik ramp untuk terbang tinggi, mendarat di rel untuk grind!' },
    bail: { en: 'Bail! 💥', ko: '넘어졌어요! 💥', ja: '転倒！💥', zh: '摔倒了！💥', es: '¡Caída! 💥', ar: 'سقوط! 💥', vi: 'Ngã rồi! 💥', hi: 'गिर गए! 💥', fr: 'Chute ! 💥', th: 'ล้ม! 💥', id: 'Jatuh! 💥' },
    combo: { en: 'Combo', ko: '콤보', ja: 'コンボ', zh: '连招', es: 'Combo', ar: 'كومبو', vi: 'Combo', hi: 'कॉम्बो', fr: 'Combo', th: 'คอมโบ', id: 'Kombo' },
    score: { en: 'Today {n}', ko: '오늘 {n}점', ja: '今日 {n}点', zh: '今天 {n}分', es: 'Hoy {n}', ar: 'اليوم {n}', vi: 'Hôm nay {n}', hi: 'आज {n}', fr: 'Aujourd\'hui {n}', th: 'วันนี้ {n}', id: 'Hari ini {n}' },
    best: { en: 'Best combo {n}', ko: '최고 콤보 {n}', ja: 'ベストコンボ {n}', zh: '最佳连招 {n}', es: 'Mejor combo {n}', ar: 'أفضل كومبو {n}', vi: 'Combo tốt nhất {n}', hi: 'सर्वश्रेष्ठ कॉम्बो {n}', fr: 'Meilleur combo {n}', th: 'คอมโบดีที่สุด {n}', id: 'Kombo terbaik {n}' },
  };
  const SKATE_KEY = 'mk.skate'; // { day, pts, best }
  const readSkate = () => { try { return JSON.parse(localStorage.getItem(SKATE_KEY) || 'null'); } catch { return null; } };
  const skateLm = game.map.landmarks.find((l) => l.type === 'skatepark') || null;
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
    hud.hidden = !game.inSkate;
    if (!game.inSkate) return;
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
      game.skateTk = { code: `${e.trick.id}.${++skateTkSeq % 100}`, at: performance.now() };
      game.sendTimer = 0;
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
    const was = game.inSkate;
    const lx = skateLm ? p.x - skateLm.x : 1e9, lz = skateLm ? p.z - skateLm.z : 1e9;
    game.inSkate = game.mode === 'street' && !!skateLm && inPark(lx, lz);
    if (game.inSkate !== was) {
      game.action = STALE;
      if (game.inSkate && performance.now() - skateWelcomed > 90e3) {
        skateWelcomed = performance.now();
        shop.toast(L(game.riding === 1 ? SKATE_TEXT.howto : SKATE_TEXT.welcome));
      }
    }
    if (!game.inSkate) {
      if (was) { for (const e of skater.finish()) skateEvent(e); game.me.setTrick(null, 0); skateHud(); }
      game.skateY = 0;
      return;
    }
    if (game.riding !== 1) { // on foot (or in a car): just the ramps under you
      if (skater.air || skater.grind || skater.combo.length) { for (const e of skater.finish()) skateEvent(e); game.me.setTrick(null, 0); }
      game.skateY = parkGround(lx, lz).y;
      skateHud();
      return;
    }
    skater.type = garage.current.type;
    let x = lx, z = lz;
    if (skater.grind) {
      // On a rail: stay on it while heading along it; stop and you drop off.
      const r = skater.grind.rail;
      const dx = r.b[0] - r.a[0], dz = r.b[1] - r.a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
      const dot = Math.sin(game.me.root.rotation.y) * ux + Math.cos(game.me.root.rotation.y) * uz;
      if (game.speed01 < 0.15) skater.leaveRail();
      else if (Math.abs(dot) > 0.45) {
        const t = (x - r.a[0]) * ux + (z - r.a[1]) * uz;
        x = r.a[0] + ux * t; z = r.a[1] + uz * t;
        p.x = skateLm.x + x; p.z = skateLm.z + z;
        game.me.root.rotation.y = Math.atan2(ux * Math.sign(dot), uz * Math.sign(dot));
      }
    }
    const g = parkGround(x, z);
    const { y, events } = skater.step(dt, g, railNear(x, z, skater.grind ? 1.1 : 0.9));
    const landedNow = !skater.air && !skater.grind && game.skateY - g.y > 0.25;
    game.skateY = y;
    if (landedNow && !events.some((e) => e.kind === 'bail')) sfx.skateLand(true);
    game.me.setTrick(skater.pose(), y - g.y);
    for (const e of events) skateEvent(e);
    skateHud();
  }
  return { skatePop, SKATE_TEXT, skateTick };
}
