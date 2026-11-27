// Skating two together at Mokdong Ice Rink (Yozi 2026-11-21: "친구랑
// 손잡고 달리기라던가, 앞에 앉고 달리기"; no sled). Loaded with the rink
// (game/ice-rink.js); the rules are in core/ice-skate.js.
//
// Next to a friend on the ice a 🤝 button shows. Pick hand in hand, or
// pushing them as they crouch in front; they get a yes / no. The one who
// asked leads and skates as usual, the other is held at their spot.
// Either lets go with the action button. No jumps while together.
//
// What travels: "ice:…" messages between the two (ask, yes, no, end), and
// the ip field of the shared state, so everyone sees the pair.
import { L, fmt } from '../ui/pocha-ui.js';
import { PAIR, onIce, pairMsg, parsePairMsg, pairCode, parsePairCode, pairSpot } from '../core/ice-skate.js';

export const PAIR_TEXT = {
  hand: { en: 'Skate hand in hand', ko: '손잡고 달리기', ja: '手をつないで滑る', zh: '牵手滑行', es: 'Patinar de la mano', ar: 'التزلج يدًا بيد', vi: 'Nắm tay cùng trượt', fr: 'Patiner main dans la main', pt: "Patinar de mãos dadas", th: 'จับมือสเกตด้วยกัน', id: 'Meluncur bergandengan' },
  push: { en: 'Push them as they crouch', ko: '앉은 친구 밀어 주기', ja: 'しゃがんだ友だちを押す', zh: '推着蹲下的朋友滑', es: 'Empujar a tu amigo agachado', ar: 'ادفع صديقك وهو جالس القرفصاء', vi: 'Đẩy bạn đang ngồi xổm', fr: 'Pousser ton ami accroupi', pt: "Empurrar enquanto a pessoa se agacha", th: 'เข็นเพื่อนที่นั่งยอง', id: 'Dorong teman yang jongkok' },
  askHand: { en: '{name}: skate hand in hand?', ko: '{name}: 손잡고 달릴까요?', ja: '{name}：手をつないで滑る？', zh: '{name}：牵手一起滑吗？', es: '{name}: ¿patinamos de la mano?', ar: '{name}: نتزلج يدًا بيد؟', vi: '{name}: nắm tay cùng trượt nhé?', fr: '{name} : on patine main dans la main ?', pt: "{name}: patinar de mãos dadas?", th: '{name}: จับมือสเกตด้วยกันไหม?', id: '{name}: meluncur bergandengan?' },
  askPush: { en: '{name}: crouch down and I will push you!', ko: '{name}: 앉으면 밀어 줄게요!', ja: '{name}：しゃがんで、押してあげる！', zh: '{name}：蹲下，我推你！', es: '{name}: ¡agáchate y te empujo!', ar: '{name}: اجلس القرفصاء وسأدفعك!', vi: '{name}: ngồi xuống, mình đẩy cho!', fr: '{name} : accroupis-toi, je te pousse !', pt: "{name}: agache que eu empurro você!", th: '{name}: นั่งยองสิ เดี๋ยวเข็นให้!', id: '{name}: jongkok, aku dorong!' },
  yes: { en: 'Yes!', ko: '좋아요!', ja: 'いいよ！', zh: '好！', es: '¡Sí!', ar: 'نعم!', vi: 'Được!', fr: 'Oui !', pt: "Sim!", th: 'ได้เลย!', id: 'Ya!' },
  no: { en: 'Not now', ko: '다음에요', ja: 'また今度', zh: '下次吧', es: 'Ahora no', ar: 'ليس الآن', vi: 'Để sau', fr: 'Pas maintenant', pt: "Agora não", th: 'ไว้ก่อน', id: 'Nanti saja' },
  sent: { en: 'Asked {name}', ko: '{name}에게 신청했어요', ja: '{name}に申し込みました', zh: '已邀请{name}', es: 'Se lo pediste a {name}', ar: 'تم سؤال {name}', vi: 'Đã mời {name}', fr: 'Demandé à {name}', pt: "Convite enviado a {name}", th: 'ชวน {name} แล้ว', id: 'Mengajak {name}' },
  declined: { en: '{name}: not now', ko: '{name}: 다음에요', ja: '{name}：また今度', zh: '{name}：下次吧', es: '{name}: ahora no', ar: '{name}: ليس الآن', vi: '{name}: để sau', fr: '{name} : pas maintenant', pt: "{name}: agora não", th: '{name}: ไว้ก่อน', id: '{name}: nanti saja' },
  together: { en: 'Skating with {name}', ko: '{name}와 함께 타요', ja: '{name}と一緒に滑ります', zh: '和{name}一起滑', es: 'Patinando con {name}', ar: 'تتزلج مع {name}', vi: 'Đang trượt cùng {name}', fr: 'Tu patines avec {name}', pt: "Patinando com {name}", th: 'สเกตกับ {name}', id: 'Meluncur bersama {name}' },
  letGo: { en: 'Let go', ko: '놓기', ja: '離す', zh: '松开', es: 'Soltar', ar: 'اترك', vi: 'Buông ra', fr: 'Lâcher', pt: "Soltar", th: 'ปล่อย', id: 'Lepas' },
  hintFar: { en: 'Skate closer to {name}, then tap again', ko: '{name}에게 더 가까이 가서 다시 눌러 보세요', ja: '{name}にもっと近づいて、もう一度押してね', zh: '再靠近{name}一点，然后再点一次', es: 'Acércate más a {name} y toca otra vez', ar: 'اقترب أكثر من {name} ثم اضغط مرة أخرى', vi: 'Lại gần {name} hơn rồi bấm lại', fr: 'Approche-toi de {name}, puis touche à nouveau', pt: "Patine mais perto de {name} e toque de novo", th: 'เข้าไปใกล้ {name} อีกนิด แล้วกดอีกครั้ง', id: 'Dekati {name}, lalu ketuk lagi' },
  hintFriend: { en: 'Only friends can skate together. Add them as a friend first', ko: '친구끼리만 같이 탈 수 있어요. 먼저 친구가 되어 보세요', ja: '一緒に滑れるのは友だちだけ。まず友だちになろう', zh: '只有好友才能一起滑，先加为好友吧', es: 'Solo los amigos pueden patinar juntos. Primero hazte su amigo', ar: 'الأصدقاء فقط يتزلجون معًا. أضفه صديقًا أولًا', vi: 'Chỉ bạn bè mới trượt cùng nhau được. Hãy kết bạn trước', fr: 'Seuls les amis peuvent patiner ensemble. Deviens d\'abord son ami', pt: "Só amigos podem patinar juntos. Adicione a pessoa como amigo primeiro", th: 'เฉพาะเพื่อนเท่านั้นที่สเกตด้วยกันได้ เพิ่มเพื่อนก่อนนะ', id: 'Hanya teman yang bisa meluncur bersama. Berteman dulu' },
  hintNone: { en: 'When a friend is on the ice, skate up to them and tap here', ko: '친구가 얼음 위에 오면 가까이 가서 여기를 눌러 보세요', ja: '友だちが氷の上に来たら、近づいてここを押してね', zh: '好友上冰后，靠近他再点这里', es: 'Cuando un amigo esté en el hielo, acércate y toca aquí', ar: 'عندما يكون صديق على الجليد، اقترب منه واضغط هنا', vi: 'Khi bạn bè lên sân băng, lại gần rồi bấm vào đây', fr: 'Quand un ami est sur la glace, approche-toi et touche ici', pt: "Quando um amigo estiver no gelo, patine até ele e toque aqui", th: 'เมื่อเพื่อนอยู่บนลานน้ำแข็ง เข้าไปใกล้ ๆ แล้วกดที่นี่', id: 'Saat teman ada di atas es, dekati lalu ketuk di sini' },
  apart: { en: 'Skating on your own again', ko: '다시 혼자 타요', ja: 'またひとりで滑ります', zh: '又各滑各的了', es: 'De nuevo por tu cuenta', ar: 'تتزلج وحدك من جديد', vi: 'Lại trượt một mình', fr: 'De nouveau en solo', pt: "Patinando sozinho de novo", th: 'กลับมาสเกตคนเดียว', id: 'Meluncur sendiri lagi' },
};
const PANEL = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:40;background:rgba(255,255,255,.96);border-radius:16px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.2);font:600 15px system-ui,sans-serif;color:#2b2230;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px)';
const CHOICE = 'border:0;border-radius:12px;padding:10px 14px;font:600 15px system-ui,sans-serif;background:#ffe3d9;color:#2b2230;cursor:pointer';

// game: the rink's (me, others, net, myId, isFriend, isBlocked, shop, $,
// STALE, action, sendTimer). rink: { free(): on the ice and able to pair,
// sk: the IceSkater }.
export function createIcePair(game, rink) {
  const { shop, STALE } = game;
  let pair = null; // { role: 'L' | 'F', kind: 'hand' | 'push', other, lost }
  let asked = null; // { to, kind, until }: my ask, waiting for a yes
  let invite = null; // { from, kind, until }: theirs, waiting for mine
  let near = null; // { id, name }: a friend close enough to ask
  let why = null; // nobody to ask: { text, name } said when the button is tapped
  let nearAt = 0;
  let panel = null;
  const send = (verb, to, kind) => game.net?.sendEmote?.(pairMsg(verb, to, kind));
  const nameOf = (id) => game.others.nameOf?.(id) || '';
  const toast = (text, vars) => shop.toast(fmt(L(text), vars || {}));
  const dirty = () => { game.sendTimer = 0; game.action = STALE; };

  // ---- the button and the little panels ----
  const btn = document.createElement('button');
  btn.id = 'ice-pair';
  btn.type = 'button';
  btn.style.cssText = 'position:fixed;left:calc(env(safe-area-inset-left,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 328px);z-index:6;height:32px;max-width:190px;overflow:hidden;text-overflow:ellipsis;padding:0 12px;border-radius:16px;border:2px solid rgba(255,255,255,.9);background:rgba(214,84,120,.85);color:#fff;font:800 13px system-ui,sans-serif;white-space:nowrap';
  btn.hidden = true;
  btn.addEventListener('pointerdown', (e) => e.stopPropagation());
  btn.addEventListener('click', (e) => { e.stopPropagation(); btn.blur(); if (near) menu(near); else if (why) toast(why.text, why); });
  (game.$('hud') || document.body).append(btn);
  function closePanel() { panel?.remove(); panel = null; }
  function showPanel(title, choices) {
    closePanel();
    panel = document.createElement('div');
    panel.id = 'ice-pair-panel';
    panel.style.cssText = PANEL;
    const h = document.createElement('div');
    h.textContent = title;
    panel.append(h);
    for (const [label, run] of choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = CHOICE;
      b.onclick = () => { closePanel(); run?.(); };
      panel.append(b);
    }
    document.body.append(panel);
  }
  function menu(who) {
    showPanel('⛸️ ' + who.name, [
      ['🤝 ' + L(PAIR_TEXT.hand), () => ask(who, 'hand')],
      ['🧎 ' + L(PAIR_TEXT.push), () => ask(who, 'push')],
      ['✕', null],
    ]);
  }
  function ask(who, kind) {
    if (pair || !rink.free()) return;
    asked = { to: who.id, kind, until: performance.now() + PAIR.askFor * 1000 };
    send('ask', who.id, kind);
    toast(PAIR_TEXT.sent, { name: who.name });
  }
  function start(role, kind, other) {
    pair = { role, kind, other, lost: 0 };
    asked = null; invite = null; near = null;
    closePanel();
    toast(PAIR_TEXT.together, { name: nameOf(other) });
    dirty();
  }
  // Apart again. tell: say so to the other.
  function end(tell = true, say = true) {
    if (!pair) return;
    if (tell) send('end', pair.other);
    pair = null;
    if (say) toast(PAIR_TEXT.apart);
    dirty();
  }
  const letGo = () => end(true);

  // Someone I could ask: a friend on skates on the ice, close by, not in a
  // pair. With nobody to ask, why (the button says it when tapped): a
  // friend too far away, a skater who is not a friend, or no one at all.
  function findNear(p) {
    let best = null, bd = PAIR.near, far = null, fd = Infinity, stranger = false;
    for (const [id, o] of game.others.players) {
      if (o.hidden || o.target?.bk !== 1 || o.target.ip) continue;
      const r = o.ch.root.position, d = Math.hypot(r.x - p.x, r.z - p.z);
      if (!onIce(r.x, r.z)) continue;
      const name = nameOf(id);
      if (game.isBlocked?.(id)) continue;
      if (!game.isFriend?.(name)) { if (d < PAIR.near) stranger = true; continue; }
      if (d < bd) { best = { id, name }; bd = d; } else if (d < fd) { far = name; fd = d; }
    }
    why = best ? null : far ? { text: PAIR_TEXT.hintFar, name: far } : { text: stranger ? PAIR_TEXT.hintFriend : PAIR_TEXT.hintNone };
    return best;
  }

  // Every frame on the ice. True when I am the one being led (my place was
  // set here: the rink does not move me).
  function tick(dt, p) {
    const now = performance.now();
    if (asked && now > asked.until) asked = null;
    if (invite && now > invite.until) { invite = null; closePanel(); }
    if (!pair) {
      if (now - nearAt > 300) { nearAt = now; near = rink.free() && !asked ? findNear(p) : null; }
      // Always there on the ice, so it can be found: faint with nobody to ask.
      const label = near ? '🤝 ' + near.name : '🤝';
      if (btn.textContent !== label) { btn.textContent = label; btn.style.opacity = near ? '1' : '0.6'; }
      btn.hidden = false;
      if (!near && panel && !invite) closePanel();
      return false;
    }
    btn.hidden = true;
    // Is the other still with me? (their ip says so; a moment's grace for the news to travel)
    const o = game.others.players.get(pair.other);
    const theirs = parsePairCode(o?.target?.ip);
    const ok = o && !o.hidden && theirs && theirs.other === game.myId && theirs.role !== pair.role;
    pair.lost = ok ? 0 : pair.lost + dt;
    if (!o || pair.lost > PAIR.lost) { end(!!o); return false; }
    if (pair.role !== 'F') return false;
    // Led: held at my spot by the leader.
    const lead = game.others.predicted?.(pair.other);
    if (!lead) return false;
    const spot = pairSpot(pair.kind, { x: lead.position.x, z: lead.position.z, ry: lead.rotation.y });
    const k = Math.min(1, dt * 14);
    const nx = p.x + (spot.x - p.x) * k, nz = p.z + (spot.z - p.z) * k;
    rink.sk.vx = dt > 0 ? (nx - p.x) / dt : 0; rink.sk.vz = dt > 0 ? (nz - p.z) / dt : 0; // (so letting go glides on)
    const max = 9, v = Math.hypot(rink.sk.vx, rink.sk.vz);
    if (v > max) { rink.sk.vx *= max / v; rink.sk.vz *= max / v; }
    p.x = nx; p.z = nz; p.y = 0;
    const root = game.me.root;
    let d = spot.ry - root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    root.rotation.y += d * Math.min(1, dt * 12);
    game.speed01 = pair.kind === 'push' ? 0 : Math.min(1, o.target?.s || 0);
    return true;
  }

  // After the others are placed (main.js): everyone who is being led goes
  // to their spot by their leader, so the two stay together on every screen.
  function after() {
    for (const [id, o] of game.others.players) {
      const c = o.hidden ? null : parsePairCode(o.target?.ip);
      if (!c || c.role !== 'F') continue;
      const lead = c.other === game.myId ? game.me.root : game.others.players.get(c.other)?.ch.root;
      if (!lead || (c.other === game.myId && !(pair?.role === 'L' && pair.other === id))) continue;
      const spot = pairSpot(c.kind, { x: lead.position.x, z: lead.position.z, ry: lead.rotation.y });
      const r = o.ch.root;
      r.position.x = spot.x; r.position.z = spot.z; r.rotation.y = spot.ry;
    }
  }

  function onMsg(from, e) {
    const m = parsePairMsg(e);
    if (!m) return false;
    if (m.to !== game.myId || game.isBlocked?.(from)) return true;
    const name = nameOf(from);
    if (m.verb === 'ask' && m.kind) {
      if (pair || invite || !rink.free() || !game.isFriend?.(name)) { send('no', from); return true; }
      invite = { from, kind: m.kind, until: performance.now() + PAIR.askFor * 1000 };
      showPanel('⛸️ ' + fmt(L(m.kind === 'push' ? PAIR_TEXT.askPush : PAIR_TEXT.askHand), { name }), [
        ['🤝 ' + L(PAIR_TEXT.yes), () => { const v = invite; invite = null; if (!v || pair || !rink.free()) { send('no', from); return; } send('yes', v.from, v.kind); start('F', v.kind, v.from); }],
        [L(PAIR_TEXT.no), () => { invite = null; send('no', from); }],
      ]);
    } else if (m.verb === 'yes' && m.kind) {
      if (!pair && asked && asked.to === from && asked.kind === m.kind && rink.free()) start('L', m.kind, from);
      else if (!(pair?.other === from)) send('end', from);
    } else if (m.verb === 'no') {
      if (asked?.to === from) { asked = null; toast(PAIR_TEXT.declined, { name }); }
    } else if (m.verb === 'end') {
      if (pair?.other === from) end(false);
      if (invite?.from === from) { invite = null; closePanel(); }
    }
    return true;
  }
  function gone(id) {
    if (pair?.other === id) end(false);
    if (invite?.from === id) { invite = null; closePanel(); }
    if (asked?.to === id) asked = null;
  }
  // Off the ice, or out of the rink.
  function leave() {
    end(true, false);
    asked = null; near = null;
    if (invite) { send('no', invite.from); invite = null; }
    closePanel();
    btn.hidden = true;
  }

  return {
    tick, after, onMsg, gone, leave, letGo,
    get on() { return !!pair; },
    get led() { return pair?.role === 'F'; },
    // The pose over my stride ('' none): hL, hF, pL, pF.
    pose: () => (pair ? (pair.kind === 'push' ? 'p' : 'h') + pair.role : ''),
    action: () => (pair ? { key: 'ice-letgo', label: '✋ ' + L(PAIR_TEXT.letGo), run: letGo } : null),
    state(st) { if (pair) st.ip = pairCode(pair.kind, pair.role, pair.other); },
    debug: () => ({ pair: pair && { ...pair }, asked: asked && { ...asked }, invite: invite && { ...invite }, near: near && { ...near } }),
    // (for tests: ask the friend near me)
    ask: (kind) => { if (near) ask(near, kind); return !!near; },
    answer: (yes) => { const b = panel?.querySelectorAll('button')[yes ? 0 : 1]; b?.click(); return !!b; },
  };
}
