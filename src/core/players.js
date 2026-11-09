// Other players: spawns their characters, interpolates movement and shows
// name tags and emote bubbles.
import { parseRide } from './bike-garage.js';
import { t, getLanguage } from './i18n.js';
import * as THREE from 'three';
import { HELD_KINDS, heldBase } from './held.js';
// Looping poses others can show (see Character.activity).
const ACTIVITIES = new Set(['dance', 'pushup', 'situp', 'fish', 'reel', 'run', 'clap', 'lie', 'mat', 'matsit', 'pullup', 'curl', 'snip', 'read', 'swim', 'tube', 'dive', 'listen', 'bumper', ...SNOW_POSES, ...Object.keys(STUDIO_MOVES)]); // (yoga poses, the reformer, the bench press)
import { seatPosition } from './bikes.js';
import { trickPose, TRICK_BY_ID } from './skatepark.js';
import { createCharacter } from './character.js';
import { SNOW_POSES } from './snowballs.js';
import { STUDIO_MOVES } from './studio-moves.js';
import { Companion } from './companion.js';
import { ITEMS, isPet } from './inventory.js';
import { styleNameTag } from './emblems.js';
import { sanitizeLook } from '../data/appearance.js';

export class RemotePlayers {
  // isOperator(name) → Promise<boolean>: asks the server whether that name
  // belongs to an operator (only asked when a player shows the badge).
  // coasterSeat(ch, cs, p): put a rider on the roller coaster (cs = their
  // train and seat, sent once; the train itself runs on the shared clock).
  // tick(p, players, dt): more to draw on each player every frame (the
  // flying costumes, game/sky-flight.js).
  constructor(scene, labelLayer, { isOperator, coasterSeat, tick } = {}) {
    this.coasterSeat = coasterSeat || null;
    this.scene = scene;
    this.layer = labelLayer;
    this.players = new Map();
    this.isOperator = isOperator || (async () => false);
    this.tick = tick || null;
  }

  // Name tag with the operator badge only once the server has said yes.
  _tag(p, look) {
    const clean = sanitizeLook(look);
    styleNameTag(p.tag, p.name, clean);
    if (!clean.op) return;
    const name = p.name;
    this.isOperator(name).then((yes) => {
      if (yes && this.players.get(p.id) === p && p.name === name) styleNameTag(p.tag, p.name, clean, { operator: true, lang: getLanguage() });
    }).catch(() => {});
  }

  join(peer) {
    if (this.players.has(peer.id)) return;
    const ch = createCharacter(peer.look); // sanitized inside
    // Hidden until their first position arrives. A phone on its lock screen
    // stays in the room (presence) but its game is paused and sends nothing,
    // so without this they stood at the map's origin, inside the shop there.
    ch.root.visible = false;
    this.scene.add(ch.root);
    const tag = document.createElement('div');
    tag.className = 'nametag';
    tag.style.display = 'none';
    const name = String(peer.name || 'Traveler').slice(0, 16);
    this.layer.appendChild(tag);
    const p = {
      id: peer.id, ch, tag, bubble: null, name,
      target: null, ry: 0, s: 0,
      model: peer.look?.model ?? null, // (debug: what they wear)
      look: peer.look,
    };
    this.players.set(peer.id, p);
    this._tag(p, peer.look);
  }

  // The name the server knows them by (019_chat_names.sql), when the one
  // they announced isn't theirs.
  setName(id, name) {
    const p = this.players.get(id);
    if (!p || !name || p.name === name) return;
    p.name = String(name).slice(0, 16);
    this._tag(p, p.look);
  }

  leave(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.scene.remove(p.ch.root);
    p.pet?.dispose();
    p.tag.remove();
    p.bubble?.remove();
    this.players.delete(id);
  }

  setLook(id, look) {
    const p = this.players.get(id);
    if (!p) return;
    const old = p.ch.root;
    p.ch = createCharacter(look);
    p.model = look?.model ?? null;
    p.look = look;
    this._tag(p, look);
    p.bk = false; // re-applied on the next update
    p.hd = null;
    p.ch.root.position.copy(old.position);
    p.ch.root.rotation.copy(old.rotation);
    p.ch.root.visible = old.visible;
    this.scene.remove(old);
    this.scene.add(p.ch.root);
  }

  // Positions for the map.
  list() {
    return [...this.players.values()].filter((p) => p.target).map((p) => ({ x: p.ch.root.position.x, z: p.ch.root.position.z, name: p.name }));
  }

  state(id, st) {
    const p = this.players.get(id);
    if (!p) return;
    if (!p.target) {
      p.ch.root.position.set(st.x, 0, st.z);
      p.ch.root.rotation.y = Number.isFinite(st.ry) ? st.ry : 0;
      if (!p.hidden) p.ch.root.visible = true;
    }
    // Estimate their velocity from the last two updates, so we can draw them
    // where they are now rather than where they were when they sent it.
    const now = performance.now();
    p.vx = p.vz = 0;
    if (p.target && p.lastAt && st.s > 0.01) {
      const dt = (now - p.lastAt) / 1000;
      const vx = (st.x - p.target.x) / dt, vz = (st.z - p.target.z) / dt;
      if (dt > 0.03 && dt < 1 && Math.hypot(vx, vz) < 40) { p.vx = vx; p.vz = vz; } // not a teleport
    }
    // A jump (taxi, map, warp: st.tp counts them): put them there at once,
    // rather than sliding them across the map.
    if (p.target && st.tp !== p.target.tp) {
      p.ch.root.position.set(st.x, Number.isFinite(st.y) ? Math.max(-6, Math.min(60, st.y)) : 0, st.z);
      if (Number.isFinite(st.ry)) p.ch.root.rotation.y = st.ry;
      p.vx = p.vz = 0;
      if (p.pet) { const r = p.ch.root; p.pet.place(r.position.x, r.position.z, r.rotation.y, r.position.y); }
    }
    p.lastAt = now;
    p.target = st;
  }

  // Is someone already sitting on the chair at (x, z)?
  // Who sits on the seat at (x, z), if anyone.
  sitterAt(x, z) {
    for (const [id, p] of this.players) if (p.target?.sit && Math.hypot(p.target.x - x, p.target.z - z) < 0.3) return id;
    return null;
  }

  // Everyone holding a tarot café queue number (see core/tarot-queue.js).
  tickets() {
    const out = [];
    for (const [id, p] of this.players) if (!p.hidden && p.target?.tq) out.push({ id, tq: p.target.tq });
    return out;
  }

  seatTaken(x, z) {
    for (const p of this.players.values()) {
      if (p.target?.sit && Math.hypot(p.target.x - x, p.target.z - z) < 0.3) return true;
    }
    return false;
  }

  // Blocked people: no character, name tag or bubbles on this screen.
  hide(id) {
    const p = this.players.get(id);
    if (!p) return;
    p.hidden = true;
    p.ch.root.visible = false;
    p.pet?.dispose();
    p.pet = null;
    for (const el of [p.tag, p.bubble]) if (el) el.style.display = 'none';
  }
  nameOf(id) { return this.players.get(id)?.name ?? null; }
  // Where another player is right now (x, z), or null.
  // Where someone is, by their latest update (not where the smoothed
  // character has got to yet: after a jump that can lag by many metres).
  positionOf(id) {
    const p = this.players.get(id);
    return p ? (p.target || p.ch.root.position) : null;
  }

  chat(id, text, ms = 6000, kind = 'chat') {
    const p = this.players.get(id);
    if (!p || p.hidden) return null;
    showBubble(p, this.layer, text, ms, kind);
    return p.name;
  }

  // The closest visible player within r metres who is not riding: { id, name }.
  nearestFree(x, z, r) {
    let best = null, bd = r;
    for (const [id, p] of this.players) {
      if (p.hidden || !p.target || p.target.bk) continue;
      const d = Math.hypot(p.ch.root.position.x - x, p.ch.root.position.z - z);
      if (d < bd) { bd = d; best = { id, name: p.name }; }
    }
    return best;
  }

  // Everyone visible within r metres who is not riding, closest first.
  nearbyFree(x, z, r) {
    const out = [];
    for (const [id, p] of this.players) {
      if (p.hidden || !p.target || p.target.bk) continue;
      const d = Math.hypot(p.ch.root.position.x - x, p.ch.root.position.z - z);
      if (d < r) out.push({ id, name: p.name, d });
    }
    return out.sort((a, b) => a.d - b.d);
  }

  // Someone in this area by their name (names are unique), or null.
  idByName(name) {
    const key = String(name || '').toLowerCase();
    for (const [id, p] of this.players) if (!p.hidden && p.target && p.name.toLowerCase() === key) return id;
    return null;
  }

  // Make someone easy to spot for a while: their name tag glows and a bubble
  // pops over their head (only on this screen). Used for friend requests.
  ping(id, text = '👋', ms = 10000) {
    const p = this.players.get(id);
    if (!p || p.hidden) return false;
    p.tag.classList.remove('ping');
    void p.tag.offsetWidth; // restart the animation
    p.tag.classList.add('ping');
    clearTimeout(p.pingTimer);
    p.pingTimer = setTimeout(() => p.tag.classList.remove('ping'), ms);
    showBubble(p, this.layer, text, Math.min(ms, 6000));
    return true;
  }

  kindOf(id) { return this.players.get(id)?.target?.bk || 0; }
  rootOf(id) { return this.players.get(id)?.ch.root ?? null; }
  charOf(id) { const p = this.players.get(id); return p && !p.hidden ? p.ch : null; }
  // Where someone is right now, predicted from their last update and speed
  // (no smoothing delay): used to keep a passenger glued to the driver.
  predicted(id) {
    const p = this.players.get(id);
    if (!p?.target) return null;
    const ahead = Math.min(0.3, (performance.now() - (p.lastAt || 0)) / 1000);
    return { position: { x: p.target.x + (p.vx || 0) * ahead, z: p.target.z + (p.vz || 0) * ahead }, rotation: { y: p.ch.root.rotation.y } };
  }

  emote(id, anim, emoji) {
    const p = this.players.get(id);
    if (!p || p.hidden) return;
    if (anim) p.ch.play(anim);
    showBubble(p, this.layer, emoji);
  }

  // Their pet walking with them (pt: the pet's item id), seen by everyone.
  _pet(p) {
    const id = !p.hidden && isPet(p.target.pt) ? p.target.pt : null;
    if ((p.pet?.id || null) === id) return;
    p.pet?.dispose();
    p.pet = null;
    if (!id) return;
    p.pet = new Companion(id, ITEMS[id].pet);
    this.scene.add(p.pet.root);
    const r = p.ch.root;
    p.pet.place(r.position.x, r.position.z, r.rotation.y, r.position.y);
  }

  update(dt, camera, width, height) {
    const v = new THREE.Vector3();
    for (const p of this.players.values()) {
      const r = p.ch.root;
      if (p.target) {
        const k = 1 - Math.exp(-dt * 10);
        const ahead = Math.min(0.3, (performance.now() - (p.lastAt || 0)) / 1000) + 0.1; // + the smoothing delay
        r.position.x += (p.target.x + (p.vx || 0) * ahead - r.position.x) * k;
        r.position.z += (p.target.z + (p.vz || 0) * ahead - r.position.z) * k;
        r.position.y += ((Number.isFinite(p.target.y) ? Math.max(-6, Math.min(p.target.fl || p.target.cr ? 260 : 60, p.target.y)) : 0) - r.position.y) * k; // subway stairs, the Namsan cable car and summit
        let d = p.target.ry - r.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        r.rotation.y += d * k;
        const inCar = p.target.bk === 3 && [4, 6, 7].includes(this.players.get(p.target.on)?.target?.bk);
        const bv = p.target.bk === 1 ? String(p.target.bv || '').slice(0, 40) : '';
        if ((p.target.bk || 0) !== (p.bk || 0) || inCar !== !!p.inCar || bv !== (p.bv || '')) {
          p.bk = p.target.bk || 0; p.inCar = inCar; p.bv = bv;
          p.ch.setBike(p.bk, p.bk === 1 ? parseRide(bv) || undefined : undefined, inCar); // their ride and skin
        }
        // A skate park trick ("id.n"): play it here too.
        const tk = p.target.bk === 1 && typeof p.target.tk === 'string' ? p.target.tk.slice(0, 24) : '';
        if (tk !== (p.tk || '')) { p.tk = tk; const id = tk.split('.')[0]; p.trick = TRICK_BY_ID[id] ? { id, t: 0 } : null; }
        if (p.trick) {
          p.trick.t += dt;
          const pose = trickPose(p.trick.id, p.trick.t);
          p.ch.setTrick(pose, 0);
          if (!pose) p.trick = null;
        }
        if ((p.target.hd || null) !== (p.hd || null)) { p.hd = HELD_KINDS.includes(heldBase(p.target.hd)) ? p.target.hd : null; p.ch.setHeld(p.hd); }
        p.ch.setUmbrella(p.target.um === 1);
        p.ch.activity?.(ACTIVITIES.has(p.target.ac) ? p.target.ac : null); // gym, fishing, dancing
        if (p.target.ac === 'read' && !p.bubble) showBubble(p, this.layer, t('book.reading'), 3000); // 📖 reading…
        p.ch.animate(dt, p.target.sit ? 0 : p.target.s || 0, !!p.target.sit);
        this._pet(p);
      }
      // Riding with someone (tandem or car): sit in our seat of their vehicle.
      if (p.target?.bk === 3 && p.target.on) {
        const d = this.players.get(p.target.on);
        if (d) { [r.position.x, r.position.z] = seatPosition(d.ch.root, d.target?.bk, p.target.seat || 0); r.rotation.y = d.ch.root.rotation.y; }
      }
      // On the roller coaster: their seat in the train, every frame, from
      // the shared clock (no positions sent while they ride).
      if (this.coasterSeat && p.target?.cs > 0) { this.coasterSeat(p.ch, p.target.cs, p); p.onCoaster = true; }
      else if (p.onCoaster) { p.onCoaster = false; r.rotation.set(0, r.rotation.y, 0); p.ch.setMoves?.(null); p.ch.setWind?.(0); }
      if (p.target) this.tick?.(p, this, dt);
      if (p.pet) p.pet.fences = this.fences || null;
      if (p.pet) p.pet.update(dt, { x: r.position.x, z: r.position.z, y: r.position.y, ry: r.rotation.y }, !!p.target?.bk, false);
      if (p.hidden || !p.target) continue; // not placed yet (see join)
      v.set(r.position.x, r.position.y + 1.55, r.position.z).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      const dist = camera.position.distanceTo(r.position);
      const show = visible && dist < 60;
      const sx = (v.x * 0.5 + 0.5) * width, sy = (-v.y * 0.5 + 0.5) * height;
      for (const el of [p.tag, p.bubble]) {
        if (!el) continue;
        el.style.display = show ? '' : 'none';
        el.style.transform = `translate(-50%, -100%) translate(${sx}px, ${sy - (el === p.bubble ? 24 : 0)}px)`;
      }
    }
  }
}

// A new bubble starts where its speaker's name tag already is, so it never
// shows for a moment at the corner of the screen before the next frame
// places it. A speaker without a placed tag keeps it hidden until then.
function placeLikeTag(p, b) {
  const tr = p.tag?.style.transform;
  if (tr) {
    b.style.transform = tr + ' translateY(-24px)';
    b.style.display = p.tag.style.display;
  } else b.style.display = 'none';
}

// A bubble holding built elements (a picture and text), e.g. the big-catch
// trophy over someone's head.
export function showBubbleEl(p, layer, content, ms = 5000, kind = '') {
  p.bubble?.remove();
  const b = document.createElement('div');
  b.className = kind ? 'bubble ' + kind : 'bubble';
  b.append(content);
  placeLikeTag(p, b);
  layer.appendChild(b);
  p.bubble = b;
  setTimeout(() => { if (p.bubble === b) { b.remove(); p.bubble = null; } }, ms);
}

export function showBubble(p, layer, text, ms = 2500, kind = '') {
  p.bubble?.remove();
  const b = document.createElement('div');
  b.className = kind ? 'bubble ' + kind : 'bubble';
  b.textContent = text; // always text, never HTML
  placeLikeTag(p, b);
  layer.appendChild(b);
  p.bubble = b;
  setTimeout(() => {
    if (p.bubble === b) {
      b.remove();
      p.bubble = null;
    }
  }, ms);
}
