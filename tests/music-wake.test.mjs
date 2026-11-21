import { test } from 'node:test';
import assert from 'node:assert/strict';

// A phone back from another app (Yozi, iPhone Safari): the sound is stopped
// ("interrupted") and must start again on coming back or on the next tap.
const listeners = {};
globalThis.addEventListener = (ev, fn) => { (listeners[ev] ||= []).push(fn); };
globalThis.document = { hidden: false, addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); } };
const node = () => new Proxy({}, { get: (o, k) => (k === 'connect' ? (x) => x : k in o ? o[k] : (o[k] = typeof k === 'string' && /gain|frequency|Q|detune/.test(k) ? { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} } : () => node())), set: (o, k, v) => { o[k] = v; return true; } });
class FakeAC {
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.resumes = 0; this.destination = {}; this.oscs = 0; }
  resume() { this.resumes++; if (this.allow !== false) this.state = 'running'; return this.allow === false ? new Promise(() => {}) : Promise.resolve(); }
  suspend() { this.state = 'suspended'; }
  createGain() { return node(); }
  createBiquadFilter() { return node(); }
  createConvolver() { return node(); }
  createOscillator() { this.oscs++; return node(); }
  createBuffer() { return { getChannelData: () => new Float32Array(8000) }; }
}
globalThis.window = { AudioContext: FakeAC };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, configurable: true });
const { Music } = await import('../src/core/music.js');
const { ConcertPlayer } = await import('../src/core/concert-player.js');

test('music on: the sound starts again after the phone stopped it', async () => {
  const music = new Music();
  await music.setOn(true);
  clearInterval(music.timer);
  const c = music.ctx;
  assert.equal(c.state, 'running');
  c.state = 'interrupted'; // (switched to another app and back)
  const before = c.resumes;
  for (const fn of listeners.visibilitychange) fn();
  assert.equal(c.resumes, before + 1, 'coming back wakes it');
  assert.equal(c.state, 'running');
  c.state = 'interrupted'; c.allow = false; // Safari refuses outside a tap
  for (const fn of listeners.pageshow) fn();
  assert.equal(c.state, 'interrupted');
  c.allow = true;
  for (const fn of listeners.pointerdown) fn();
  assert.equal(c.state, 'running', 'the next tap starts it');
  const n = c.resumes;
  for (const fn of listeners.pointerdown) fn();
  assert.equal(c.resumes, n, 'nothing to do while it runs');
});

test('switching music on does not hang when Safari never answers', async () => {
  const music = new Music();
  music._init();
  music.ctx.allow = false;
  await music.setOn(true); // (would wait for ever before)
  clearInterval(music.timer);
  assert.equal(music.on, true);
});

test('the concert plays only while the sound runs, and finds its place after', async () => {
  const music = new Music();
  await music.setOn(true);
  clearInterval(music.timer);
  const c = music.ctx, player = new ConcertPlayer(music);
  const score = { bpm: 60, beats: 100, voices: [{ inst: 'flute', n: Array.from({ length: 100 }, (_, i) => [i, 0.5, 72]) }] };
  player.play(score, -0.1);
  assert.equal(player.count, 1);
  c.state = 'interrupted';
  for (let t = 1; t < 30; t += 0.5) player.play(score, t); // half a minute away
  assert.equal(player.count, 1, 'no notes pile up while it is stopped');
  c.state = 'running';
  player.play(score, 29.9);
  assert.equal(player.count, 2, 'back at bar 30, not thirty notes at once');
});
