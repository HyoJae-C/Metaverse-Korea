// Walking route along real streets: a graph built from the map's road
// polylines (OSM ways share their junction nodes), A* search, and a line of
// blue arrows on the ground pointing the way, with a pulse flowing towards
// the destination.
import * as THREE from 'three';

export class RoadGraph {
  constructor(roads) {
    this.nodes = []; // [x, z]
    this.adj = []; // [[nodeIndex, length], ...]
    const index = new Map();
    const id = ([x, z]) => {
      const k = x + ',' + z;
      let i = index.get(k);
      if (i === undefined) {
        i = this.nodes.length;
        index.set(k, i);
        this.nodes.push([x, z]);
        this.adj.push([]);
      }
      return i;
    };
    for (const r of roads) {
      for (let i = 1; i < r.p.length; i++) {
        const a = id(r.p[i - 1]), b = id(r.p[i]);
        if (a === b) continue;
        const len = Math.hypot(r.p[i][0] - r.p[i - 1][0], r.p[i][1] - r.p[i - 1][1]);
        this.adj[a].push([b, len]);
        this.adj[b].push([a, len]);
      }
    }
  }

  nearest(x, z) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const d = (this.nodes[i][0] - x) ** 2 + (this.nodes[i][1] - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // Shortest path between two nodes (A*). Returns node indices, or null.
  search(start, goal) {
    const N = this.nodes.length;
    const g = new Float64Array(N).fill(Infinity);
    const from = new Int32Array(N).fill(-1);
    const done = new Uint8Array(N);
    const [gx, gz] = this.nodes[goal];
    const h = (i) => Math.hypot(this.nodes[i][0] - gx, this.nodes[i][1] - gz);
    const heap = new MinHeap();
    g[start] = 0;
    heap.push(h(start), start);
    while (heap.size) {
      const cur = heap.pop();
      if (done[cur]) continue;
      if (cur === goal) break;
      done[cur] = 1;
      for (const [nb, len] of this.adj[cur]) {
        const ng = g[cur] + len;
        if (ng < g[nb]) {
          g[nb] = ng;
          from[nb] = cur;
          heap.push(ng + h(nb), nb);
        }
      }
    }
    if (start !== goal && from[goal] === -1) return null;
    const path = [goal];
    while (path[path.length - 1] !== start) path.push(from[path[path.length - 1]]);
    return path.reverse();
  }

  // Polyline from (ax, az) to (bx, bz) along streets. Falls back to a
  // straight line when the two points are close or not connected.
  route(ax, az, bx, bz) {
    const direct = [[ax, az], [bx, bz]];
    if (!this.nodes.length || Math.hypot(bx - ax, bz - az) < 25) return direct;
    const s = this.nearest(ax, az), e = this.nearest(bx, bz);
    const ids = this.search(s, e);
    if (!ids) return direct;
    const pts = ids.map((i) => this.nodes[i]);
    // Skip the first node if it lies behind us, and the last if it lies past
    // the destination, so the line doesn't make a little detour at the ends.
    if (pts.length > 1 && dist(ax, az, pts[1]) <= dist(pts[0][0], pts[0][1], pts[1])) pts.shift();
    const n = pts.length;
    if (n > 1 && dist(bx, bz, pts[n - 2]) <= dist(pts[n - 1][0], pts[n - 1][1], pts[n - 2])) pts.pop();
    const out = [[ax, az]];
    for (const q of [...pts, [bx, bz]]) {
      const last = out[out.length - 1];
      if (q[0] !== last[0] || q[1] !== last[1]) out.push(q);
    }
    return out;
  }
}

const dist = (x, z, p) => Math.hypot(p[0] - x, p[1] - z);

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const { k, v } = this;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p];
      i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const { k, v } = this;
    const top = v[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= k.length) break;
        if (c + 1 < k.length && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c];
        i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

const SPACING = 2.0; // metres between arrows
const MAX_DOTS = 900;

// An arrow lying flat, pointing along -z (heading 0 = towards -z).
function arrowGeometry() {
  const s = new THREE.Shape();
  for (const [x, y] of [[0, 0.62], [0.46, 0.14], [0.17, 0.14], [0.17, -0.42], [-0.17, -0.42], [-0.17, 0.14], [-0.46, 0.14]]) {
    if (x === 0 && y === 0.62) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2);
}
// Heading (rotation about y) that points an arrow along (dx, dz).
export const arrowHeading = (dx, dz) => Math.atan2(-dx, -dz);

// Arrows on the ground along a polyline, each pointing the way. Call set()
// with a new polyline and update() every frame for the flowing animation.
export class RouteLine {
  constructor(scene, color = 0x2f7df6) {
    const geo = arrowGeometry();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_DOTS);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
    this.points = [];
    this.heads = [];
    this.t = 0;
    this._y = new THREE.Vector3(0, 1, 0);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._p = new THREE.Vector3();
  }

  set(poly) {
    this.points = [];
    this.heads = [];
    let carry = 0;
    for (let i = 1; i < poly.length && this.points.length < MAX_DOTS; i++) {
      const [ax, az] = poly[i - 1], [bx, bz] = poly[i];
      const len = Math.hypot(bx - ax, bz - az);
      let d = carry;
      for (; d < len && this.points.length < MAX_DOTS; d += SPACING) {
        const f = d / len;
        this.points.push(ax + (bx - ax) * f, az + (bz - az) * f);
        this.heads.push(arrowHeading(bx - ax, bz - az));
      }
      carry = d - len;
    }
    this.mesh.count = this.points.length / 2;
  }

  clear() {
    this.points = [];
    this.heads = [];
    this.mesh.count = 0;
  }

  update(dt) {
    if (!this.mesh.count) return;
    this.t += dt;
    const n = this.mesh.count;
    for (let i = 0; i < n; i++) {
      // A bright pulse travels along the line towards the destination; the
      // first few dots fade in so the line starts softly at our feet.
      const wave = 0.5 + 0.5 * Math.sin(i * 0.55 - this.t * 6);
      const fade = Math.min(1, (i + 1) / 4);
      const s = (0.7 + 0.45 * wave) * fade;
      this._p.set(this.points[i * 2], 0.12, this.points[i * 2 + 1]); // above roads (max 0.06)
      this._s.set(s, 1, s);
      this._q.setFromAxisAngle(this._y, this.heads[i]);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
