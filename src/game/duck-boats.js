// Duck boats (오리배) at the Han River parks: boarding, steering my boat or
// riding in a friend's, placing everyone's boats, bumps and splash rings.
// Moved out of main.js; the game's live state comes in through `game`
// (getters), as in delivery.js. `game.park()` is the park I'm in (its
// boats, `ducks`, and its `scene`), or null.
import * as THREE from 'three';
import { DUCK_SEATS } from '../core/park.js';
import { DuckRide, DUCK_BUMP } from '../core/duck-boat.js';
import { Contacts, touching, wobble } from '../core/bump.js';
import { L, fmt } from '../ui/pocha-ui.js';

// Riding a duck boat in Ttukseom park: 4 boats wait at the dock until
// someone gets in (two seats each). Not a game: whoever sets off steers the
// boat freely on the river for up to a minute (free), then it pedals itself
// back to the dock and they get off. A friend in the other seat rides along.
export const DUCK_TEXT = {
  board: { en: 'Get in the duck boat', ko: '오리배 타기', ja: 'アヒルボートに乗る', zh: '坐鸭子船', es: 'Subir al bote pato', ar: 'اركب قارب البطة', vi: 'Lên thuyền vịt', hi: 'बत्तख नाव में बैठें', fr: 'Monter dans le pédalo canard', th: 'ขึ้นเรือเป็ด', id: 'Naik perahu bebek' },
  go: { en: 'Duck boat ride', ko: '오리배 출발', ja: 'アヒルボートで出発', zh: '鸭子船出发', es: 'Paseo en bote pato', ar: 'جولة بقارب البطة', vi: 'Đi thuyền vịt', hi: 'बत्तख नाव की सवारी', fr: 'Balade en pédalo canard', th: 'นั่งเรือเป็ด', id: 'Naik perahu bebek' },
  back: { en: 'Back to dock', ko: '선착장으로 돌아가기', ja: '乗り場に戻る', zh: '回码头', es: 'Volver al muelle', ar: 'العودة إلى الرصيف', vi: 'Quay về bến', hi: 'घाट पर लौटें', fr: 'Retour au quai', th: 'กลับท่าเรือ', id: 'Kembali ke dermaga' },
  docked: { en: 'Back at the dock. Thanks for riding! 🦆', ko: '선착장에 도착했어요. 즐거웠죠? 🦆', ja: '乗り場に着きました。楽しかった？🦆', zh: '回到码头了，玩得开心吗？🦆', es: '¡De vuelta en el muelle! Gracias por pasear 🦆', ar: 'عدت إلى الرصيف. شكرًا على الجولة! 🦆', vi: 'Đã về bến. Cảm ơn bạn đã đi thuyền! 🦆', hi: 'घाट पर वापस। सवारी के लिए धन्यवाद! 🦆', fr: 'De retour au quai. Merci d\'être monté ! 🦆', th: 'กลับถึงท่าเรือแล้ว ขอบคุณที่ใช้บริการ! 🦆', id: 'Sudah kembali di dermaga. Terima kasih! 🦆' },
  full: { en: 'This boat is full', ko: '이 배는 자리가 다 찼어요', ja: 'このボートは満席です', zh: '这条船坐满了', es: 'Este bote está lleno', ar: 'هذا القارب ممتلئ', vi: 'Thuyền này đã đầy', hi: 'यह नाव भर गई है', fr: 'Ce bateau est plein', th: 'เรือลำนี้เต็มแล้ว', id: 'Perahu ini penuh' },
  waiting: { en: 'Waiting at the dock · {n}/2 aboard', ko: '선착장에서 대기 중 · {n}/2명 탑승', ja: '乗り場で待機中 · {n}/2人', zh: '在码头等待 · {n}/2人', es: 'Esperando en el muelle · {n}/2 a bordo', ar: 'ينتظر عند الرصيف · {n}/2 على متنه', vi: 'Đang chờ ở bến · {n}/2 người trên thuyền', hi: 'घाट पर इंतज़ार · {n}/2 सवार', fr: 'En attente au quai · {n}/2 à bord', th: 'รอที่ท่าเรือ · บนเรือ {n}/2', id: 'Menunggu di dermaga · {n}/2 naik' },
};

export function createDuckBoats(game) {
  const ducks = () => game.park()?.ducks;
  let duckRide = null; // my trip while I steer (core/duck-boat.js)
  let duckFollowed = false; // I rode along with a friend steering
  // Which boat each person is in (me and others), to place the boats.
  function duckRiders(i) {
    let n = game.seated?.duck === i ? 1 : 0;
    for (const o of game.others.players.values()) if (o.target?.db === i + 1) n++;
    return n;
  }
  function boardDuck(i) {
    const d = ducks()[i];
    const taken = [...game.others.players.values()].filter((o) => o.target?.db === i + 1).map((o) => o.target.dbs | 0);
    const seat = taken.includes(0) ? 1 : 0;
    if (duckRiders(i) >= DUCK_SEATS.length) { game.shop.toast(L(DUCK_TEXT.full)); return; }
    duckRide = null; duckFollowed = false;
    game.sitDown({ x: d.home.x + DUCK_SEATS[seat][0], z: d.home.z + DUCK_SEATS[seat][1], ry: Math.PI, stand: [d.home.x, d.home.z + 2.6], duck: i, duckSeat: seat });
    game.shop.toast(fmt(L(DUCK_TEXT.waiting), { n: duckRiders(i) }));
  }
  // Someone else in my boat who is steering it (they send st.dr).
  const duckDriver = () => {
    if (game.seated?.duck == null) return null;
    for (const [id, o] of game.others.players) if (o.target?.db === game.seated.duck + 1 && o.target.dr) return { id, o };
    return null;
  };
  function startDuckRide() {
    if (game.seated?.duck == null || duckDriver()) return;
    duckRide = new DuckRide(ducks()[game.seated.duck].home);
    game.cam.pitch = Math.min(game.cam.pitch, 0.3); game.cam.dist = Math.max(game.cam.dist, 8); // look out over the river
    game.clearAction();
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
    if (!duckRings || duckRings.scene !== game.park().scene) {
      const geo = new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2);
      duckRings = { scene: game.park().scene, list: [0, 1, 2].map(() => {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
        m.visible = false; game.park().scene.add(m); return m;
      }) };
    }
    const m = duckRings.list.find((r) => !r.visible) || duckRings.list[0];
    m.visible = true; m.position.set(x, (game.park().river?.position.y ?? -0.25) + 0.05, z); // (just on the water: the park's, or the street's for an open park)
    m.userData.t = 0; m.userData.size = 0.8 + big * 1.4;
  }
  // Where the other boats are this frame (not mine): moving if someone steers
  // it, otherwise parked (it won't budge).
  function otherBoats(mine) {
    const list = [];
    for (const d of ducks()) {
      if (d.i === mine) continue;
      let driven = false;
      for (const o of game.others.players.values()) if (o.target?.db === d.i + 1 && o.target.dr) { driven = true; break; }
      list.push({ x: d.g.position.x, z: d.g.position.z, vx: d.vx || 0, vz: d.vz || 0, fixed: !driven, i: d.i });
    }
    return list;
  }
  function updateDucks(dt) {
    if (!ducks()) { if (duckRide) duckRide = null; game.duckUi.hud(null); return; }
    const moved = new Set();
    if (game.seated?.duck != null) {
      const d = ducks()[game.seated.duck];
      const drv = !duckRide && duckDriver();
      let b;
      if (duckRide) {
        // The stick, camera-relative like walking: the bow turns towards it.
        const { x: mx, y: my } = game.input.move;
        const fx = -Math.sin(game.moveRef.yaw), fz = -Math.cos(game.moveRef.yaw), rx = Math.cos(game.moveRef.yaw), rz = -Math.sin(game.moveRef.yaw);
        duckRide.steer(fx * my + rx * mx, fz * my + rz * mx, dt);
        duckRide.bump(otherBoats(game.seated.duck));
        b = duckRide;
        game.duckUi.hud({ left: duckRide.left, returning: duckRide.returning });
        if (duckRide.docked) { duckRide = null; game.standUp(); game.shop.toast(L(DUCK_TEXT.docked)); game.clearAction(); return; }
      } else if (drv) {
        const o = drv.o;
        b = boatFromRider(o.ch.root.position.x, o.ch.root.position.z, o.ch.root.rotation.y, o.target.dbs | 0);
        duckFollowed = true;
        game.duckUi.hud({ left: Math.max(0, o.target.dr - 1), returning: o.target.dr === 1, driver: game.others.nameOf(drv.id) || '?' });
      } else {
        if (duckFollowed) { duckFollowed = false; game.standUp(); game.shop.toast(L(DUCK_TEXT.docked)); game.clearAction(); return; } // the friend docked and got off
        b = { x: d.home.x, z: d.home.z, ry: 0 };
        game.duckUi.hud(null);
      }
      placeBoat(d, b);
      const [sx, sz] = DUCK_SEATS[game.seated.duckSeat || 0];
      game.me.root.position.set(b.x + sx * Math.cos(b.ry) + sz * Math.sin(b.ry), 0, b.z - sx * Math.sin(b.ry) + sz * Math.cos(b.ry));
      game.me.root.rotation.y = b.ry + Math.PI;
      moved.add(game.seated.duck);
    } else game.duckUi.hud(null);
    for (const o of game.others.players.values()) {
      const i = (o.target?.db | 0) - 1;
      if (i < 0 || i >= ducks().length || moved.has(i)) continue;
      const r = o.ch.root;
      placeBoat(ducks()[i], boatFromRider(r.position.x, r.position.z, r.rotation.y, o.target.dbs | 0));
      moved.add(i);
    }
    for (const d of ducks()) if (!moved.has(d.i)) { // empty: back at the dock, bobbing
      d.g.position.x += (d.home.x - d.g.position.x) * Math.min(1, dt * 2);
      d.g.position.z += (d.home.z - d.g.position.z) * Math.min(1, dt * 2);
      d.g.position.y = Math.sin(performance.now() / 600 + d.i) * 0.03;
      d.g.rotation.y += (0 - d.g.rotation.y) * Math.min(1, dt * 2);
    }
    // Every boat: how fast it is going, bumps (wobble, splash, boing), sway.
    const now = performance.now() / 1000;
    for (const d of ducks()) {
      const p = d.g.position;
      if (dt > 0 && d.px != null) {
        const k = Math.min(1, dt * 10); // smooth out jumpy network updates
        d.vx = (d.vx || 0) + ((p.x - d.px) / dt - (d.vx || 0)) * k;
        d.vz = (d.vz || 0) + ((p.z - d.pz) / dt - (d.vz || 0)) * k;
      }
      d.px = p.x; d.pz = p.z;
    }
    const poses = ducks().map((d) => ({ x: d.g.position.x, z: d.g.position.z }));
    for (const [i, j] of duckContacts.update(touching(poses, DUCK_BUMP))) {
      const a = ducks()[i], c = ducks()[j];
      const hard = Math.min(1, Math.hypot((a.vx || 0) - (c.vx || 0), (a.vz || 0) - (c.vz || 0)) / DUCK_BUMP.maxKick);
      if (hard < 0.05 && !moved.has(i) && !moved.has(j)) continue; // two parked boats side by side
      a.bumpAt = c.bumpAt = now; a.bumpAmp = c.bumpAmp = 0.08 + hard * 0.16;
      const mx = (a.g.position.x + c.g.position.x) / 2, mz = (a.g.position.z + c.g.position.z) / 2;
      duckSplash(mx, mz, hard);
      const far = Math.hypot(game.me.root.position.x - mx, game.me.root.position.z - mz);
      game.sfx.bump?.(hard, Math.max(0, 1 - far / 30));
    }
    for (const d of ducks()) {
      const t = now - (d.bumpAt ?? -99);
      const sway = game.seated?.duck === d.i ? Math.sin(performance.now() / 700) * 0.04 : 0;
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

  // Getting up from the boat (main.js standUp): close the sheet, end my trip.
  function onStandUp() {
    if (game.duckUi.open) game.duckUi.close();
    game.duckUi.hud(null);
    duckRide = null; duckFollowed = false;
  }
  // The action while seated in a boat: set off (or get off) from the sheet;
  // out on the water, head back.
  function seatedAction() {
    if (duckRide && !duckRide.returning) return { key: 'duck-back', label: '⚓ ' + L(DUCK_TEXT.back), run: () => { duckRide?.goBack(); game.clearAction(); } };
    if (duckRide || duckFollowed) return null;
    return { key: 'duck-go', label: '🚣 ' + L(DUCK_TEXT.go), run: () => { const drv = duckDriver(); game.duckUi.show(drv ? game.others.nameOf(drv.id) || '?' : null); } };
  }
  // Standing at a dock: get in the boat in front of me.
  function boardAction(p) {
    const list = ducks();
    if (!list || game.seated) return null;
    const d = list.find((q) => Math.hypot(p.x - q.home.x, p.z - (q.home.z + 2.2)) < 1.6);
    return d ? { key: 'duck-board:' + d.i, label: '🦆 ' + L(DUCK_TEXT.board) + ` (${duckRiders(d.i)}/2)`, run: () => boardDuck(d.i) } : null;
  }
  return {
    get ride() { return duckRide; },
    boardDuck, startDuckRide, updateDucks, onStandUp, seatedAction, boardAction,
  };
}
