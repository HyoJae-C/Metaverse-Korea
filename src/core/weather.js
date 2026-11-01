// Live weather and time of day for the region.
// Weather: Open-Meteo (free, no key; CC BY 4.0, credited on screen).
// Time of day: the region's local clock (Seoul = UTC+9).
import * as THREE from 'three';

const REFRESH_MS = 10 * 60 * 1000;

// WMO weather code → our weather kind.
export function weatherKind(code) {
  if (code == null) return 'clear';
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'clear';
}

export const WEATHER_ICON = { clear: '☀️', cloudy: '☁️', fog: '🌫️', rain: '🌧️', snow: '❄️', storm: '⛈️' };
const NIGHT_ICON = { clear: '🌙' };

export async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,weather_code,is_day&timezone=Asia%2FSeoul';
  const r = await fetch(url);
  if (!r.ok) throw new Error('weather HTTP ' + r.status);
  const j = await r.json();
  return {
    temp: j.current?.temperature_2m,
    kind: weatherKind(j.current?.weather_code),
    isDay: j.current?.is_day !== 0,
  };
}

// Hour of day (fractional) in a fixed UTC offset.
export function localHour(offsetHours = 9, now = new Date()) {
  const h = now.getUTCHours() + now.getUTCMinutes() / 60 + offsetHours;
  return ((h % 24) + 24) % 24;
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

  async refresh() {
    try {
      const w = await fetchWeather(this.region.center.lat, this.region.center.lon);
      this.temp = w.temp;
      if (!this.forced) this.setKind(w.kind);
    } catch (err) {
      console.warn('Weather unavailable:', err.message);
    }
    this.onUpdate?.(this.status());
  }

  hour() {
    return Number.isFinite(this.forcedHour) && new URLSearchParams(location.search).has('hour')
      ? this.forcedHour : localHour(9);
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
    this.sun.intensity = (0.25 + 1.25 * d) * (1 - overcast * 0.65);
    this.hemi.intensity = 0.6 + 0.9 * d;
    this.ambient.intensity = 0.55 + 0.35 * d;

    if (this.particles) {
      const pos = this.particles.geometry.attributes.position;
      const snow = this.kind === 'snow';
      const fall = (snow ? 1.6 : 22) * dt;
      for (let i = 0; i < pos.count; i += snow ? 1 : 2) {
        let y = pos.getY(i) - fall;
        let x = pos.getX(i), z = pos.getZ(i);
        if (snow) x += Math.sin((y + i) * 0.7) * dt * 0.4;
        if (y < 0 || Math.abs(x - px) > 30 || Math.abs(z - pz) > 30) {
          x = px + (Math.random() - 0.5) * 60;
          z = pz + (Math.random() - 0.5) * 60;
          y = 18 + Math.random() * 6;
        }
        pos.setXYZ(i, x, y, z);
        if (!snow) pos.setXYZ(i + 1, x + 0.05, y + 0.7, z);
      }
      pos.needsUpdate = true;
    }
  }
}

function makePrecip(kind) {
  const snow = kind === 'snow';
  const n = snow ? 1500 : 1400;
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(n * 3 * (snow ? 1 : 2));
  for (let i = 0; i < arr.length; i += 3) {
    arr[i] = (Math.random() - 0.5) * 60;
    arr[i + 1] = Math.random() * 24;
    arr[i + 2] = (Math.random() - 0.5) * 60;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const obj = snow
    ? new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.95 }))
    : new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaecbe0, transparent: true, opacity: 0.75 }));
  obj.frustumCulled = false;
  obj.name = 'precip';
  return obj;
}
