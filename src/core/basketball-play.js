// Plays one shot (core/basketball-game.js shotMove) on a character at the
// court (core/basketball-court.js): moves the ball, bends the limbs, shakes
// the rim and flicks the net. Where the character stands is handed back
// each frame for the caller to place (main.js keeps its own ground height).
//
//   const play = new ShotPlayer({ ch, court, ball, move, onEvent });
//   each frame: const s = play.step(dt);   s = { done, x, z, y, ry, spin, speed }
//   play.stop() ends it early (and lets go of the limbs).
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

export class ShotPlayer {
  constructor({ ch, court, ball, move, onEvent }) {
    Object.assign(this, { ch, court, ball, move, onEvent });
    this.t = 0;
    this.fired = 0;
    this.done = false;
    this.prev = null;
    ch?.setMoves?.(() => this.move.pose(this.t));
    if (ball) { ball.visible = true; if (!ball.parent) court.group.parent?.add(ball); }
  }
  // The court's yaw in the world (the hoop frame turned).
  get courtYaw() {
    this.court.group.getWorldQuaternion(_q);
    return _e.setFromQuaternion(_q, 'YXZ').y;
  }
  step(dt) {
    const m = this.move;
    this.t = Math.min(m.dur, this.t + dt);
    const r = m.root(this.t);
    const g = this.court.group;
    g.localToWorld(_v.set(r.x, 0, r.z));
    const out = { done: false, x: _v.x, z: _v.z, y: r.y, ry: this.courtYaw + r.yaw, spin: r.spin, speed: r.run ? 0.75 : 0 };
    // The ball, in the hoop frame → world (it lives beside the court group).
    if (this.ball) {
      const p = m.ball(this.t);
      g.localToWorld(_v.set(p[0], p[1], p[2]));
      if (this.ball.parent && this.ball.parent !== g.parent) this.ball.parent.worldToLocal(_v);
      if (this.prev) {
        const d = _v.distanceTo(this.prev);
        this.ball.rotation.x += d / 0.09; // rolls as it moves
      }
      this.ball.position.copy(_v);
      this.prev = (this.prev || new THREE.Vector3()).copy(_v);
    }
    while (this.fired < m.events.length && m.events[this.fired].t <= this.t) {
      const ev = m.events[this.fired++];
      if (ev.kind === 'dunk') this.court.shake();
      if (ev.kind === 'net') this.court.swish(!!ev.swish || m.shot === 'dunk');
      this.onEvent?.(ev, m);
    }
    this.court.update(dt);
    if (this.t >= m.dur) { out.done = true; this.stop(); }
    return out;
  }
  stop() {
    if (this.done) return;
    this.done = true;
    this.ch?.setMoves?.(null);
    this.ch?.setTrick?.(null, 0);
  }
}
