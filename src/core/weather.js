// Weather and time of day for the region.
// Weather: rolled from the clock (rolledWeather), the same for every player.
// Time of day: the game's own two-hour day (show-clock.js).
import * as THREE from 'three';
import { snowDepth, snowUniform, SETTLE_MS, MELT_MS } from './snow-cover.js';

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

export { WEATHER_ICON, WEATHER_SLOT_MS, WEATHER_ODDS, SEASON_ODDS, SEASONS, seasonAt, weatherSettings, weatherAt, rolledWeather } from './weather-roll.js';
import { WEATHER_ICON, weatherAt, weatherSettings } from './weather-roll.js';
import { gameHour, SKY_SUN } from './show-clock.js';
const NIGHT_ICON = { clear: '🌙' };

// Time of day: the game's own two-hour day (show-clock.js), the same for
// everyone wherever they live, with a night and a show every two hours.
// (It used to follow Seoul's clock, so players abroad rarely saw night.)
// ?hour=21 forces a time for testing.

// 0 = night, 1 = full day, with a dawn and a dusk of about 1 h 20 min
// around sunrise and sunset (twilight is still light).
export function daylight(hour, sun = SKY_SUN) {
  const ramp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  return Math.min(ramp(hour, sun.rise - 0.7, sun.rise + 0.6), 1 - ramp(hour, sun.set - 0.6, sun.set + 0.7));
}

// The hour now (or the one ?hour= forces), and how dark it is out (0 day,
// 1 night): for rooms with their own sky (the Han River parks, the cable
// car) so walking in from the street keeps the same time of day.
let forced; // (read once: the address doesn't change while you play)
const forcedHour = () => {
  if (forced === undefined) {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    forced = q?.has('hour') && Number.isFinite(Number(q.get('hour'))) ? Number(q.get('hour')) : null;
  }
  return forced;
};
export function hourNow(nowMs = Date.now()) {
  if (forcedHour() != null) return forcedHour();
  return gameHour(nowMs);
}
export function darkness(nowMs = Date.now()) {
  return 1 - daylight(hourNow(nowMs), SKY_SUN);
}

// Night look: moonlit blue instead of the day's warm light, so colours stay
// clear (not muddy) after dark, and lit windows (glowAtNight).
const NIGHT_LIGHT = {
  hemi: new THREE.Color(0xa9b9ff), ground: new THREE.Color(0x46507a),
  ambient: new THREE.Color(0x9fadde), sun: new THREE.Color(0xc4d2ff),
};
const glowing = []; // [material, strength]: emissive that comes on after dark
export function glowAtNight(material, strength = 1) {
  material.emissiveIntensity = 0;
  glowing.push([material, strength]);
}

const SKY = {
  day: new THREE.Color(0xbfe3ff),
  dusk: new THREE.Color(0xffc9a8),
  night: new THREE.Color(0x1e2b5a),
  grey: new THREE.Color(0xc9d0d8),
};

export class WeatherSystem {
  constructor({ scene, sun, hemi, ambient, region, onUpdate }) {
    Object.assign(this, { scene, sun, hemi, ambient, region, onUpdate });
    this.dayLight = { hemi: hemi.color.clone(), ground: hemi.groundColor.clone(), ambient: ambient.color.clone(), sun: sun.color.clone() };
    this.kind = 'clear';
    this.settings = null; // the operators' season / held weather (setSettings)
    this.temp = null;
    this.sky = new THREE.Color();
    this.particles = null;
    const forced = new URLSearchParams(location.search).get('weather');
    this.forced = forced && WEATHER_ICON[forced] ? forced : null;
    if (this.forced) this.setKind(this.forced);
    this.refresh();
    setInterval(() => this.refresh(), REFRESH_MS);
  }

  refresh() {
    const kind = this.forced || (this.showClear ? 'clear' : weatherAt(Date.now(), this.settings));
    if (kind !== this.kind || !this.started) this.setKind(kind);
    this.started = true;
    this.onUpdate?.(this.status());
  }

  // At the Yeouido fireworks or the Ttukseom drone show (their night is on
  // around you) the sky clears: no rain, snow or fog in front of the show
  // (Yozi). Everywhere else keeps the shared weather.
  setShowClear(on) {
    if (!!on === !!this.showClear) return;
    this.showClear = !!on;
    this.refresh();
  }

  // The operators' setting changed (supabase/023_weather.sql).
  setSettings(raw) {
    this.settings = raw ? weatherSettings(raw) : null;
    this.depthAt = 0; // work the snow out again
    this.refresh();
  }

  hour() {
    return hourNow();
  }

  status() {
    const day = darkness() < 0.7;
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

  // How deep the snow is now, from the shared weather of the last few
  // minutes (worked out once a second).
  snowNow() {
    const now = Date.now();
    if (now - (this.depthAt || 0) >= 1000) {
      this.depthAt = now;
      this.depth = snowDepth(now, (ms) => weatherAt(ms, this.settings));
    }
    return this.depth;
  }

  // Call every frame with the player position.
  update(dt, px, pz) {
    // nightMix (0–1): a show's own night in one place, e.g. over Yeouido
    // during the fireworks (main.js), on top of the hour of the day.
    const d = (1 - darkness()) * (1 - (this.nightMix || 0));
    const overcast = { clear: 0, cloudy: 0.5, fog: 0.7, rain: 0.75, snow: 0.6, storm: 0.9 }[this.kind];
    // Sky: night → dusk → day, then greyed by clouds.
    const twilight = 1 - Math.abs(d - 0.5) * 2; // peaks mid-ramp
    this.sky.copy(SKY.night).lerp(SKY.day, d).lerp(SKY.dusk, twilight * 0.55 * (1 - overcast));
    this.sky.lerp(SKY.grey, overcast * 0.6 * Math.max(d, 0.25));
    this.scene.background.copy(this.sky);
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.sky);
      const near = this.kind === 'fog' ? 25 : 140 - overcast * 60;
      // lift (0-1): high up (Seoul Dal at the top), the haze pulls back so
      // the river, the bridges and the 63 tower show.
      const far = this.kind === 'fog' ? 160 : 420 - overcast * 120, lift = this.lift || 0;
      this.scene.fog.near = near + (far * 1.2 - near) * lift;
      this.scene.fog.far = far + (far * 2.6 - far) * lift;
    }
    // Bright and cheerful: strong fill light so colours stay vivid.
    this.sun.intensity = (0.4 + 1.6 * d) * (1 - overcast * 0.5);
    this.hemi.intensity = 0.85 + 1.15 * d;
    this.ambient.intensity = 0.75 + 0.5 * d;
    const n = 1 - d, D = this.dayLight;
    this.hemi.color.copy(D.hemi).lerp(NIGHT_LIGHT.hemi, n);
    this.hemi.groundColor.copy(D.ground).lerp(NIGHT_LIGHT.ground, n);
    this.ambient.color.copy(D.ambient).lerp(NIGHT_LIGHT.ambient, n);
    this.sun.color.copy(D.sun).lerp(NIGHT_LIGHT.sun, n);
    // Lit windows: on from dusk (a few stay dark: the texture says which).
    const glow = Math.max(0, n - 0.15) / 0.85;
    for (const [m, k] of glowing) m.emissiveIntensity = glow * k;

    // Snow on the ground: from the shared clock, so everyone sees the same
    // depth; with ?weather= forced it settles from the moment you arrive
    // (?snow=0.6 pins a depth for testing).
    const pinned = this.pinnedSnow ??= Number(new URLSearchParams(location.search).get('snow') ?? NaN);
    const step = Math.min(dt, 0.1) * 1000;
    snowUniform.value = Number.isFinite(pinned) ? pinned
      : this.forced ? Math.min(1, Math.max(0, snowUniform.value + (this.kind === 'snow' ? step / SETTLE_MS : -step / MELT_MS)))
      : this.snowNow();

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
