// Weather and time of day for the region.
// Weather: rolled from the clock (rolledWeather), the same for every player.
// Time of day: the region's local clock (Seoul = UTC+9).
import * as THREE from 'three';

const REFRESH_MS = 15 * 1000; // the clock chip and the next 30-minute weather slot

// Rain and snow slow you down a little outdoors: on foot and by bike.
// An umbrella keeps the rain off, so walking is only a touch slower.
export const WET = new Set(['rain', 'storm', 'snow']);
export function weatherSpeed(kind, { bike = false, umbrella = false } = {}) {
  if (!WET.has(kind)) return 1;
  const snow = kind === 'snow';
  if (bike) return snow ? 0.85 : 0.9;
  if (umbrella) return snow ? 0.94 : 0.96;
  return snow ? 0.88 : 0.92;
}

export const WEATHER_ICON = { clear: '☀️', cloudy: '☁️', fog: '🌫️', rain: '🌧️', snow: '❄️', storm: '⛈️' };
const NIGHT_ICON = { clear: '🌙' };

// Game weather (no live data): every 30 minutes the same roll for everyone,
// from the clock: clear 80 %, rain 10 %, snow 10 %.
export const WEATHER_SLOT_MS = 30 * 60 * 1000;
export const WEATHER_ODDS = [['clear', 0.8], ['rain', 0.1], ['snow', 0.1]];
export function rolledWeather(nowMs = Date.now()) {
  let h = Math.floor(nowMs / WEATHER_SLOT_MS) >>> 0; // integer hash of the slot
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  const u = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  let acc = 0;
  for (const [kind, p] of WEATHER_ODDS) { acc += p; if (u < acc) return kind; }
  return 'clear';
}

// Game clock: a whole day every 2 hours, the same for everyone. Daytime
// (05:30-19:30, dawn and dusk included) takes 90 minutes, the night 30, so
// it's light most of the time but you still see night come round.
// Night is switched off for now: starting a first visit in the dark made the
// colours look dull. Set to true to bring the day/night cycle back.
// (?hour=21 still forces a time for testing.)
export const DAY_NIGHT = false;
const DAY_HOUR = 13;
export const DAY_CYCLE_MS = 2 * 60 * 60 * 1000;
const DAY_SHARE = 0.75;
export function gameHour(nowMs = Date.now()) {
  const u = ((nowMs % DAY_CYCLE_MS) + DAY_CYCLE_MS) % DAY_CYCLE_MS / DAY_CYCLE_MS;
  const h = u < DAY_SHARE ? 5.5 + (u / DAY_SHARE) * 14 : 19.5 + ((u - DAY_SHARE) / (1 - DAY_SHARE)) * 10;
  return h % 24;
}

// 0 = night, 1 = full day, with ~1.5 h dawn and dusk ramps.
export function daylight(hour) {
  const ramp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  return Math.min(ramp(hour, 5.5, 7), 1 - ramp(hour, 18, 19.5));
}

const SKY = {
  day: new THREE.Color(0xbfe3ff),
  dusk: new THREE.Color(0xffc9a8),
  night: new THREE.Color(0x2f3d6b),
  grey: new THREE.Color(0xc9d0d8),
};

export class WeatherSystem {
  constructor({ scene, sun, hemi, ambient, region, onUpdate }) {
    Object.assign(this, { scene, sun, hemi, ambient, region, onUpdate });
    this.kind = 'clear';
    this.temp = null;
    this.sky = new THREE.Color();
    this.particles = null;
    const forced = new URLSearchParams(location.search).get('weather');
    this.forced = forced && WEATHER_ICON[forced] ? forced : null;
    this.forcedHour = Number(new URLSearchParams(location.search).get('hour'));
    if (this.forced) this.setKind(this.forced);
    this.refresh();
    setInterval(() => this.refresh(), REFRESH_MS);
  }

  refresh() {
    const kind = this.forced || rolledWeather();
    if (kind !== this.kind || !this.started) this.setKind(kind);
    this.started = true;
    this.onUpdate?.(this.status());
  }

  hour() {
    return Number.isFinite(this.forcedHour) && new URLSearchParams(location.search).has('hour')
      ? this.forcedHour : DAY_NIGHT ? gameHour() : DAY_HOUR;
  }

  status() {
    const day = daylight(this.hour()) > 0.3;
    const icon = (!day && NIGHT_ICON[this.kind]) || WEATHER_ICON[this.kind];
    return { kind: this.kind, temp: this.temp, icon };
  }

  setKind(kind) {
    this.kind = kind;
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose(); // the shared flake texture stays
      this.particles = null;
    }
    if (kind === 'rain' || kind === 'storm' || kind === 'snow') this.particles = makePrecip(kind);
    if (this.particles) this.scene.add(this.particles);
  }

  // Call every frame with the player position.
  update(dt, px, pz) {
    const d = daylight(this.hour());
    const overcast = { clear: 0, cloudy: 0.5, fog: 0.7, rain: 0.75, snow: 0.6, storm: 0.9 }[this.kind];
    // Sky: night → dusk → day, then greyed by clouds.
    const twilight = 1 - Math.abs(d - 0.5) * 2; // peaks mid-ramp
    this.sky.copy(SKY.night).lerp(SKY.day, d).lerp(SKY.dusk, twilight * 0.55 * (1 - overcast));
    this.sky.lerp(SKY.grey, overcast * 0.6 * Math.max(d, 0.25));
    this.scene.background.copy(this.sky);
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.sky);
      const near = this.kind === 'fog' ? 25 : 140 - overcast * 60;
      this.scene.fog.near = near;
      this.scene.fog.far = this.kind === 'fog' ? 160 : 420 - overcast * 120;
    }
    // Bright and cheerful: strong fill light so colours stay vivid.
    this.sun.intensity = (0.4 + 1.6 * d) * (1 - overcast * 0.5);
    this.hemi.intensity = 0.85 + 1.15 * d;
    this.ambient.intensity = 0.75 + 0.5 * d;

    if (this.particles) {
      // Drops move on the GPU: only two numbers change per frame, so rain
      // and snow cost almost nothing on the CPU and never stutter.
      const u = this.particles.userData.uniforms;
      u.uTime.value = (u.uTime.value + Math.min(dt, 0.1)) % 1000;
      u.uCenter.value.set(px, pz);
    }
  }
}

// Rain streaks and snowflakes in a 60 m box around the player, animated in the
// vertex shader. Each drop has a fixed spot in a repeating 60 m world grid, so
// walking never makes drops jump. Fewer drops on phones.
const BOX = 60, HEIGHT = 24;
let flake = null; // soft round snowflake, drawn once
function flakeTexture() {
  if (flake) return flake;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  flake = new THREE.CanvasTexture(c);
  return flake;
}
function makePrecip(kind) {
  const snow = kind === 'snow';
  const small = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const n = Math.round((snow ? 1500 : 1400) * (small ? 0.5 : 1));
  const per = snow ? 1 : 2; // a rain streak is a short line: bottom and top
  const base = new Float32Array(n * per * 3);
  const top = new Float32Array(n * per);
  for (let i = 0; i < n; i++) {
    const x = Math.random() * BOX, y = Math.random() * HEIGHT, z = Math.random() * BOX;
    for (let k = 0; k < per; k++) {
      base.set([x, y, z], (i * per + k) * 3);
      top[i * per + k] = k;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(base, 3));
  geo.setAttribute('top', new THREE.BufferAttribute(top, 1));
  const uniforms = { uTime: { value: 0 }, uCenter: { value: new THREE.Vector2() } };
  const mat = snow
    ? new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.95, map: flakeTexture(), depthWrite: false })
    : new THREE.LineBasicMaterial({ color: 0xaecbe0, transparent: true, opacity: 0.75 });
  const speed = snow ? 1.6 : 22;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        uniform vec2 uCenter;
        attribute float top;`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = position;
        transformed.y = mod(position.y - uTime * ${speed.toFixed(1)}, ${HEIGHT.toFixed(1)}) + top * 0.7;
        transformed.xz = uCenter + mod(position.xz - uCenter + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)};
        ${snow ? 'transformed.x += sin(transformed.y * 0.7 + position.z) * 0.3;' : 'transformed.x += top * 0.05;'}`);
  };
  const obj = snow ? new THREE.Points(geo, mat) : new THREE.LineSegments(geo, mat);
  obj.userData.uniforms = uniforms;
  obj.frustumCulled = false;
  obj.name = 'precip';
  return obj;
}
