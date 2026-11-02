// Other players: spawns their characters, interpolates movement and shows
// name tags and emote bubbles.
import * as THREE from 'three';
import { createCharacter } from './character.js';

export class RemotePlayers {
  constructor(scene, labelLayer) {
    this.scene = scene;
    this.layer = labelLayer;
    this.players = new Map();
  }

  join(peer) {
    if (this.players.has(peer.id)) return;
    const ch = createCharacter(peer.look); // sanitized inside
    this.scene.add(ch.root);
    const tag = document.createElement('div');
    tag.className = 'nametag';
    tag.textContent = String(peer.name || 'Traveler').slice(0, 16);
    this.layer.appendChild(tag);
    this.players.set(peer.id, {
      ch, tag, bubble: null, name: tag.textContent,
      target: null, ry: 0, s: 0,
    });
  }

  leave(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.scene.remove(p.ch.root);
    p.tag.remove();
    p.bubble?.remove();
    this.players.delete(id);
  }

  setLook(id, look) {
    const p = this.players.get(id);
    if (!p) return;
    const old = p.ch.root;
    p.ch = createCharacter(look);
    p.ch.root.position.copy(old.position);
    p.ch.root.rotation.copy(old.rotation);
    this.scene.remove(old);
    this.scene.add(p.ch.root);
  }

  // Positions for the map.
  list() {
    return [...this.players.values()].map((p) => ({ x: p.ch.root.position.x, z: p.ch.root.position.z, name: p.name }));
  }

  state(id, st) {
    const p = this.players.get(id);
    if (!p) return;
    if (!p.target) p.ch.root.position.set(st.x, 0, st.z);
    p.target = st;
  }

  // Is someone already sitting on the chair at (x, z)?
  seatTaken(x, z) {
    for (const p of this.players.values()) {
      if (p.target?.sit && Math.hypot(p.target.x - x, p.target.z - z) < 0.3) return true;
    }
    return false;
  }

  chat(id, text) {
    const p = this.players.get(id);
    if (!p) return null;
    showBubble(p, this.layer, text, 6000, 'chat');
    return p.name;
  }

  emote(id, anim, emoji) {
    const p = this.players.get(id);
    if (!p) return;
    if (anim === 'wave') p.ch.wave();
    showBubble(p, this.layer, emoji);
  }

  update(dt, camera, width, height) {
    const v = new THREE.Vector3();
    for (const p of this.players.values()) {
      const r = p.ch.root;
      if (p.target) {
        const k = 1 - Math.exp(-dt * 10);
        r.position.x += (p.target.x - r.position.x) * k;
        r.position.z += (p.target.z - r.position.z) * k;
        let d = p.target.ry - r.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        r.rotation.y += d * k;
        p.ch.animate(dt, p.target.sit ? 0 : p.target.s || 0, !!p.target.sit);
      }
      v.set(r.position.x, 1.55, r.position.z).project(camera);
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

export function showBubble(p, layer, text, ms = 2500, kind = '') {
  p.bubble?.remove();
  const b = document.createElement('div');
  b.className = kind ? 'bubble ' + kind : 'bubble';
  b.textContent = text; // always text, never HTML
  layer.appendChild(b);
  p.bubble = b;
  setTimeout(() => {
    if (p.bubble === b) {
      b.remove();
      p.bubble = null;
    }
  }, ms);
}
