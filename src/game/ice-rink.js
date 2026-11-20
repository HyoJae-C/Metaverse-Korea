// Mokdong Ice Rink (목동아이스링크): figure skating. Step through a gate onto
// the ice and you are on skates: you glide, the action button (Space) jumps,
// and in the air the arrow keys (or the arrow pad on a phone) do tricks:
// ← → ← a triple, ↑ ↓ a butterfly, ↓ ↑ a backflip … (core/ice-skate.js has
// the rules, core/ice-rink-hall.js the room). Land clean jumps one after
// another for a combo. Points are for fun: today's total and your best jump,
// kept on the device (no coins).
//
// What travels in my state while on the ice: bk 1 and bv (the ice skates,
// so others draw them), ik (my jump: "n:L3,UD", "n:!" a fall).
//
// Downloaded the first time you are inside the rink (main.js lazyPanel).
import { L, fmt } from '../ui/pocha-ui.js';
import { getLanguage } from '../core/i18n.js';
import { buzz } from '../core/haptics.js';
import { dayKey } from '../core/daily.js';
import { rideCode } from '../core/bike-garage.js';
import { ICE_SKATES, HOWTO_EN } from '../core/ice-rink-hall.js';
import { IceSkater, SKATE, PLAIN, onIce, jumpPose, peerJump, syncPeerTricks, bankJump, trickName, trickCode } from '../core/ice-skate.js';

export const RINK_TEXT = {
  jump: { en: 'Jump', ko: '점프', ja: 'ジャンプ', zh: '跳跃', es: 'Saltar', ar: 'اقفز', vi: 'Nhảy', hi: 'कूदें', fr: 'Sauter', th: 'กระโดด', id: 'Lompat' },
  land: { en: 'Land!', ko: '착지!', ja: '着氷！', zh: '落冰！', es: '¡Aterriza!', ar: 'اهبط!', vi: 'Tiếp băng!', hi: 'उतरें!', fr: 'Réception !', th: 'ลงพื้น!', id: 'Mendarat!' },
  welcome: { en: '⛸️ Step through a gate onto the ice. Jump, then press arrows in the air: ← → ← is a triple!', ko: '⛸️ 게이트로 빙판에 올라가요. 점프한 뒤 공중에서 방향키를 눌러요: ← → ← 는 트리플!', ja: '⛸️ ゲートから氷の上へ。ジャンプして空中で矢印キー：← → ← でトリプル！', zh: '⛸️ 从入口上冰。起跳后在空中按方向键：← → ← 就是三周跳！', es: '⛸️ Entra al hielo por una puerta. Salta y pulsa flechas en el aire: ¡← → ← es un triple!', ar: '⛸️ ادخل الجليد من البوابة. اقفز ثم اضغط الأسهم في الهواء: ← → ← قفزة ثلاثية!', vi: '⛸️ Qua cổng để ra sân băng. Nhảy rồi bấm mũi tên trên không: ← → ← là ba vòng!', hi: '⛸️ गेट से बर्फ़ पर आएँ। कूदें, फिर हवा में तीर दबाएँ: ← → ← ट्रिपल है!', fr: '⛸️ Entre sur la glace par une porte. Saute, puis appuie sur les flèches en l\'air : ← → ← fait un triple !', th: '⛸️ เข้าลานน้ำแข็งทางประตู กระโดดแล้วกดลูกศรกลางอากาศ: ← → ← คือสามรอบ!', id: '⛸️ Masuk ke es lewat gerbang. Lompat, lalu tekan panah di udara: ← → ← itu triple!' },
  onIce: { en: '⛸️ Skates on! The faster you glide, the longer you stay in the air.', ko: '⛸️ 스케이트 착용! 빨리 달릴수록 공중에 오래 떠 있어요.', ja: '⛸️ スケート装着！速く滑るほど長く跳べます。', zh: '⛸️ 穿好冰鞋！滑得越快，滞空越久。', es: '⛸️ ¡Patines puestos! Cuanto más rápido vas, más tiempo en el aire.', ar: '⛸️ ارتديت الزلاجات! كلما أسرعت بقيت في الهواء أطول.', vi: '⛸️ Đã mang giày trượt! Trượt càng nhanh, bay càng lâu.', hi: '⛸️ स्केट पहन लिए! जितना तेज़, उतनी देर हवा में।', fr: '⛸️ Patins aux pieds ! Plus tu vas vite, plus tu restes en l\'air.', th: '⛸️ ใส่รองเท้าสเกตแล้ว! ยิ่งเร็วยิ่งลอยนาน', id: '⛸️ Sepatu es terpasang! Makin cepat, makin lama di udara.' },
  perfect: { en: 'PERFECT', ko: '완벽!', ja: 'パーフェクト', zh: '完美', es: 'PERFECTO', ar: 'ممتاز', vi: 'HOÀN HẢO', hi: 'परफ़ेक्ट', fr: 'PARFAIT', th: 'เพอร์เฟกต์', id: 'SEMPURNA' },
  shaky: { en: 'Shaky landing', ko: '착지 흔들림', ja: '着氷が乱れた', zh: '落冰不稳', es: 'Aterrizaje inestable', ar: 'هبوط مهتز', vi: 'Tiếp băng chưa vững', hi: 'डगमगाती लैंडिंग', fr: 'Réception instable', th: 'ลงพื้นไม่นิ่ง', id: 'Mendarat goyah' },
  fall: { en: 'Fell! 💥', ko: '넘어졌어요! 💥', ja: '転倒！💥', zh: '摔倒了！💥', es: '¡Caída! 💥', ar: 'سقوط! 💥', vi: 'Ngã rồi! 💥', hi: 'गिर गए! 💥', fr: 'Chute ! 💥', th: 'ล้ม! 💥', id: 'Jatuh! 💥' },
  combo: { en: 'Combo', ko: '콤보', ja: 'コンボ', zh: '连跳', es: 'Combo', ar: 'كومبو', vi: 'Combo', hi: 'कॉम्बो', fr: 'Combo', th: 'คอมโบ', id: 'Kombo' },
  today: { en: 'Today {n}', ko: '오늘 {n}점', ja: '今日 {n}点', zh: '今天 {n}分', es: 'Hoy {n}', ar: 'اليوم {n}', vi: 'Hôm nay {n}', hi: 'आज {n}', fr: 'Aujourd\'hui {n}', th: 'วันนี้ {n}', id: 'Hari ini {n}' },
  best: { en: 'Best jump {n}', ko: '최고 점프 {n}', ja: 'ベストジャンプ {n}', zh: '最佳一跳 {n}', es: 'Mejor salto {n}', ar: 'أفضل قفزة {n}', vi: 'Cú nhảy tốt nhất {n}', hi: 'सर्वश्रेष्ठ जंप {n}', fr: 'Meilleur saut {n}', th: 'กระโดดดีที่สุด {n}', id: 'Lompatan terbaik {n}' },
  keys: { en: 'In the air: ← → turns · ↑↓ ↓↑ ↑↑ ↓↓ tricks', ko: '공중에서: ← → 회전 · ↑↓ ↓↑ ↑↑ ↓↓ 기술', ja: '空中で：← → 回転 · ↑↓ ↓↑ ↑↑ ↓↓ 技', zh: '空中：← → 转体 · ↑↓ ↓↑ ↑↑ ↓↓ 技巧', es: 'En el aire: ← → giros · ↑↓ ↓↑ ↑↑ ↓↓ trucos', ar: 'في الهواء: ← → دوران · ↑↓ ↓↑ ↑↑ ↓↓ حركات', vi: 'Trên không: ← → xoay · ↑↓ ↓↑ ↑↑ ↓↓ kỹ thuật', hi: 'हवा में: ← → घुमाव · ↑↓ ↓↑ ↑↑ ↓↓ करतब', fr: 'En l\'air : ← → tours · ↑↓ ↓↑ ↑↑ ↓↓ figures', th: 'กลางอากาศ: ← → หมุน · ↑↓ ↓↑ ↑↑ ↓↓ ท่า', id: 'Di udara: ← → putaran · ↑↓ ↓↑ ↑↑ ↓↓ trik' },
};
// The board by the gates (drawn on a canvas: four languages, English otherwise).
const HOWTO = {
  en: HOWTO_EN,
  ko: { title: '점프하고 방향키!', sub: '→ 부터 누르면 반대로 회전 · 빠를수록 오래 떠요', turn: ['싱글', '더블', '트리플', '쿼드러플'], UD: '버터플라이', DU: '백플립', UU: '카트휠', DD: '데스 드롭', foot: '착지 직전에 점프를 한 번 더: 완벽 ×1.5' },
  ja: { title: 'ジャンプして矢印キー！', sub: '→ から押すと逆回転 · 速いほど長く跳べる', turn: ['シングル', 'ダブル', 'トリプル', '4回転'], UD: 'バタフライ', DU: 'バックフリップ', UU: '側転', DD: 'デスドロップ', foot: '着氷直前にもう一度ジャンプ：パーフェクト ×1.5' },
  zh: { title: '起跳后按方向键！', sub: '先按 → 就反方向转 · 越快滞空越久', turn: ['一周跳', '两周跳', '三周跳', '四周跳'], UD: '蝴蝶跳', DU: '后空翻', UU: '侧手翻', DD: '死亡坠落', foot: '落冰前再按一次跳跃：完美 ×1.5' },
};
const KEY = 'mk.icerink'; // { day, pts, best }
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const ARROWS = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D' };
const GLYPH = { L: '←', R: '→', U: '↑', D: '↓' };
const STEP = 0.15; // m: the glide is moved in pieces this long, so it never skips through the boards

export function createIceRink(game) {
  const { $, STALE, moveRef, shop, sfx } = game;
  const sk = new IceSkater();
  let hall = null; // the room's iceRink (while we are in it)
  let skating = false;
  let myCh = null; // the character the skates are on
  let lang = null;
  let typed = ''; // the arrows of this jump, shown while in the air
  let hudAt = 0;
  const peers = new Map(); // id -> { n, fall, t, tricks }

  // ---- the HUD and the arrow pad (made here, so nothing is in the first download) ----
  const el = (tag, css, text = '') => { const e = document.createElement(tag); e.style.cssText = css; e.textContent = text; return e; };
  const hud = el('div', 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 96px);transform:translateX(-50%);z-index:6;pointer-events:none;text-align:center;font:700 14px system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7);white-space:nowrap');
  const hudMain = el('div', 'font-size:15px'), hudSub = el('div', 'opacity:.9;font-size:13px'), hudKeys = el('div', 'font:800 26px system-ui,sans-serif;color:#ffd84a;min-height:30px;letter-spacing:4px');
  hud.append(hudMain, hudSub, hudKeys);
  hud.hidden = true;
  // Four arrows in a cross, bottom right above the action button, for touch.
  const touch = matchMedia('(pointer: coarse)').matches;
  const pad = el('div', 'position:fixed;right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 150px);z-index:7;width:156px;height:156px;touch-action:none;user-select:none;-webkit-user-select:none');
  pad.id = 'ice-pad';
  for (const [k, x, y] of [['U', 52, 0], ['L', 0, 52], ['R', 104, 52], ['D', 52, 104]]) {
    const b = el('button', `position:absolute;left:${x}px;top:${y}px;width:52px;height:52px;border-radius:14px;border:2px solid rgba(255,255,255,.85);background:rgba(20,40,70,.55);color:#fff;font:800 24px system-ui,sans-serif;padding:0;touch-action:none`, GLYPH[k]);
    b.dataset.k = k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); arrow(k); });
    pad.append(b);
  }
  pad.hidden = true;
  const layer = $('hud') || document.body;
  layer.append(hud, pad);

  const pop = (text, kind = '') => game.skatePop?.(text, kind);
  const name = (k) => trickName(k, getLanguage());

  // Arrow keys in the air: taken from the key event itself, so quick taps
  // between two frames all count.
  addEventListener('keydown', (e) => {
    const k = ARROWS[e.code];
    if (!k || e.repeat || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
    arrow(k);
  });

  function arrow(k) {
    if (!skating || !sk.air) return;
    const e = sk.press(k);
    typed += GLYPH[k];
    hudKeys.textContent = typed.slice(-8);
    if (e) {
      pop(`${name(e.trick)}${e.trick.turns ? '' : ' ✨'}`, e.trick.pts >= 700 ? 'big' : '');
      sfx.skatePop?.();
      game.sendTimer = 0;
    }
  }
  function jump() {
    if (!skating) return;
    const e = sk.jump();
    if (e) { typed = ''; hudKeys.textContent = ''; sfx.skatePop?.(); buzz(12); game.missionEvent?.('skate'); }
    game.sendTimer = 0;
    game.action = STALE;
  }

  function onEvent(e) {
    if (e.kind === 'fall') {
      pop(L(RINK_TEXT.fall), 'bail');
      sfx.skateLand?.(false);
      buzz(70);
    } else if (e.kind === 'land') {
      const what = e.done.length ? e.done.map(name).join(' + ') : name(PLAIN);
      const tag = e.perfect ? `${L(RINK_TEXT.perfect)} ` : e.clean ? '' : `${L(RINK_TEXT.shaky)} · `;
      pop(`${tag}${what}${e.mult > 1 ? `  ${L(RINK_TEXT.combo)} ×${e.mult}` : ''}  +${e.total.toLocaleString()}`, !e.clean ? 'bail' : e.total >= 700 ? 'big' : 'land');
      sfx.skateLand?.(e.clean);
      if (e.perfect) { sfx.cheer?.(); buzz([20, 30, 40]); } else buzz(15);
      if (e.done.length) {
        const saved = bankJump(read(), dayKey(), e.total);
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* storage blocked */ }
        hall?.drawCube(what.slice(0, 28), '+' + e.total.toLocaleString(), e.perfect ? L(RINK_TEXT.perfect) : e.mult > 1 ? `${L(RINK_TEXT.combo)} ×${e.mult}` : '');
      }
    }
    typed = ''; hudKeys.textContent = '';
    game.sendTimer = 0;
    game.action = STALE;
  }

  function showHud(now) {
    hud.hidden = !skating;
    pad.hidden = !(skating && touch);
    if (!skating || now - hudAt < 200) return;
    hudAt = now;
    if (!pad.hidden) { // sit just above the action button, whatever the screen
      const r = $('action-btn')?.getBoundingClientRect();
      if (r && r.height) pad.style.bottom = `${Math.round(innerHeight - r.top + 10)}px`;
    }
    const s = read();
    const today = s?.day === dayKey() ? s.pts : 0;
    const main = '⛸️ ' + fmt(L(RINK_TEXT.today), { n: today.toLocaleString() }) + (sk.chain > 0 ? ` · ${L(RINK_TEXT.combo)} ×${sk.mult}` : '');
    const sub = sk.air ? '' : s?.best ? fmt(L(RINK_TEXT.best), { n: s.best.toLocaleString() }) : L(RINK_TEXT.keys);
    if (hudMain.textContent !== main) hudMain.textContent = main;
    if (hudSub.textContent !== sub) hudSub.textContent = sub;
  }

  function setSkates(on) {
    const me = game.me;
    me.setBike(on ? 1 : 0, on ? ICE_SKATES : undefined);
    if (!on) me.setTrick(null, 0);
    myCh = on ? me : null;
  }
  function stop(p) {
    if (skating) { skating = false; setSkates(false); if (p) p.y = 0; }
    sk.reset(); typed = ''; hudKeys.textContent = '';
    game.sendTimer = 0;
    game.action = STALE;
  }
  function leave() {
    stop(null);
    hall = null; lang = null;
    peers.clear();
    hud.hidden = true; pad.hidden = true;
  }

  // Every frame, before the walking (main.js): on the ice we do the moving.
  function tick(dt, p, mx = 0, my = 0) {
    const room = game.interior?.iceRink || null;
    if (!room) { if (hall) leave(); return; }
    if (room !== hall) {
      hall = room;
      shop.toast(L(RINK_TEXT.welcome));
    }
    if (lang !== getLanguage()) { lang = getLanguage(); hall.drawHow(HOWTO[lang] || HOWTO.en); }
    const on = !game.seated && onIce(p.x, p.z);
    if (on !== skating) {
      if (on) { skating = true; sk.reset(); setSkates(true); shop.toast(L(RINK_TEXT.onIce)); game.sendTimer = 0; game.action = STALE; } else stop(p);
    }
    if (skating && myCh !== game.me) setSkates(true); // (a new look made a new character)
    if (skating) {
      const yaw = moveRef.yaw;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const { dx, dz, events } = sk.step(dt, fx * my + rx * mx, fz * my + rz * mx);
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / STEP));
      let x = p.x, z = p.z;
      for (let i = 0; i < n; i++) [x, z] = game.collide(x, z, dx / n, dz / n);
      if (Math.hypot(x - p.x - dx, z - p.z - dz) > 0.01) {
        const hard = sk.speed;
        sk.hit(x - p.x, z - p.z, dt);
        if (hard - sk.speed > 2.5) { sfx.bump?.(Math.min(1, hard / SKATE.max) * 0.5, 0.7); buzz(15); }
      }
      p.x = x; p.z = z; p.y = sk.y;
      const me = game.me, v = sk.speed;
      if (!sk.air && sk.down <= 0 && v > 0.4) {
        let d = Math.atan2(sk.vx, sk.vz) - me.root.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        me.root.rotation.y += d * Math.min(1, dt * 10);
      }
      me.setTrick(sk.pose(), sk.y);
      game.speed01 = sk.air || sk.down > 0 ? 0 : Math.min(1, 0.15 + v / SKATE.max);
      for (const e of events) onEvent(e);
    }
    // The others' jumps, from their codes.
    for (const [id, o] of game.others.players) {
      const code = o.hidden ? '' : o.target?.ik;
      let pj = peers.get(id);
      if (!code) { if (pj) { o.ch.setTrick(null, 0); peers.delete(id); } continue; }
      const j = peerJump(code);
      if (!j) continue;
      if (!pj || pj.n !== j.n || pj.fall !== j.fall) { pj = { n: j.n, fall: j.fall, t: 0, tricks: [] }; peers.set(id, pj); }
      pj.t += dt;
      const y = Math.max(0, o.ch.root.position.y);
      if (j.fall) { const q = Math.min(1, pj.t / SKATE.fall); o.ch.setTrick({ flip: -Math.sin(Math.PI * Math.min(1, q * 1.15)) * 1.35, tuck: 1 }, y); } else o.ch.setTrick(jumpPose(syncPeerTricks(pj.tricks, j.codes, pj.t), pj.t), y);
    }
    for (const id of peers.keys()) if (!game.others.players.has(id)) peers.delete(id);
    showHud(performance.now());
  }

  // The action button on the ice (null: nothing of ours).
  function action() {
    if (!hall || !skating || sk.down > 0) return null;
    return sk.air ? { key: 'ice-land', label: '⛸️ ' + L(RINK_TEXT.land), run: jump } : { key: 'ice-jump', label: '⛸️ ' + L(RINK_TEXT.jump), run: jump };
  }
  // My bits of the shared state.
  function state(st) {
    if (!skating) return;
    st.bk = 1; st.bv = rideCode(ICE_SKATES);
    const c = sk.code();
    if (c) st.ik = c;
  }

  return {
    tick, action, state, RINK_TEXT,
    get skating() { return skating; },
    jump, arrow,
    debug: () => ({ skating, air: sk.air, y: +sk.y.toFixed(2), t: +sk.t.toFixed(2), speed: +sk.speed.toFixed(2), down: +sk.down.toFixed(2), chain: sk.chain, tricks: sk.tricks.map(trickCode), code: sk.code(), saved: read(), peers: [...peers].map(([id, q]) => [id, q.n, q.tricks.map(trickCode)]) }),
    skater: sk,
  };
}
