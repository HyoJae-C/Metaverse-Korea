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
    const ch = createCharacter(peer.outfit);
    this.scene.add(ch.root);
    const tag = document.createElement('div');
    tag.className = 'nametag';
    tag.textContent = peer.name || 'Traveler';
    this.layer.appendChild(tag);
    this.players.set(peer.id, {
      ch, tag, bubble: null,
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

  state(id, st) {
    const p = this.players.get(id);
    if (!p) return;
    if (!p.target) p.ch.root.position.set(st.x, 0, st.z);
    p.target = st;
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
        p.ch.animate(dt, p.target.s || 0);
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

export function showBubble(p, layer, emoji) {
  p.bubble?.remove();
  const b = document.createElement('div');
  b.className = 'bubble';
  b.textContent = emoji;
  layer.appendChild(b);
  p.bubble = b;
  setTimeout(() => {
    if (p.bubble === b) {
      b.remove();
      p.bubble = null;
    }
  }, 2500);
}
