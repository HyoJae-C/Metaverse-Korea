import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneMedia, prefixedStorage, PHONE_PREVIEW } from '../src/core/phone-preview.js';
import { PHONES, phoneUrl, fitScale } from '../src/admin/phone-panel.js';

function store(init = {}) {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('outside a browser frame the game is not a phone preview', () => {
  assert.equal(PHONE_PREVIEW, null);
});

test('pointer and hover queries read as a touch phone', () => {
  assert.equal(phoneMedia('(pointer: coarse)'), '(min-width: 0px)');
  assert.equal(phoneMedia('(min-width: 1200px) and (min-height: 640px) and (pointer: fine)'), '(min-width: 1200px) and (min-height: 640px) and (max-width: 0px)');
  assert.equal(phoneMedia('(hover: none)'), '(min-width: 0px)');
  assert.equal(phoneMedia('(any-hover: hover)'), '(max-width: 0px)');
  assert.equal(phoneMedia('(max-width: 700px)'), '(max-width: 700px)');
});

test('the preview keeps its save apart from the real game tab', () => {
  const real = store({ 'mk.name': 'Yozi', mkauth: 'operator' });
  const s = prefixedStorage(real);
  assert.equal(s.getItem('mk.name'), null);
  assert.equal(s.length, 0);
  s.setItem('mk.name', 'guest');
  s.setItem('mkauth', 'guest-token');
  assert.equal(real.getItem('mk.name'), 'Yozi');
  assert.equal(real.getItem('mkauth'), 'operator');
  assert.equal(s.getItem('mk.name'), 'guest');
  assert.deepEqual([s.key(0), s.key(1)].sort(), ['mk.name', 'mkauth']);
  s.clear();
  assert.equal(s.length, 0);
  assert.equal(real.getItem('mk.name'), 'Yozi');
});

test('phone list and frame address', () => {
  assert.ok(PHONES.some((p) => p.kind === 'ios') && PHONES.some((p) => p.kind === 'android'));
  const p = PHONES.find((x) => x.id === 'galaxys24');
  assert.equal(phoneUrl('./', p, false), './?phone=android&w=360&h=780');
  assert.equal(phoneUrl('./', p, true), './?phone=android&w=780&h=360');
});

test('the phone shrinks to fit, never grows', () => {
  assert.equal(fitScale(393, 852, 2000, 2000), 1);
  assert.ok(Math.abs(fitScale(393, 852, 1000, 438) - 0.5) < 1e-9);
});
