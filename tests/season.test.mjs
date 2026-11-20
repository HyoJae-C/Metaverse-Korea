import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MIX, leafColor, leafHash, leafHex, ginkgoColor } from '../src/core/season.js';

const green = new THREE.Color('#7cc46e');
const isGreen = (c) => c === green;

test('summer keeps every tree its own green', () => {
  for (let i = 0; i < 50; i++) assert.equal(leafColor(green, leafHash(i), MIX.park, 'summer'), green);
  assert.equal(leafHex('#5fae5a', 0.7, MIX.street, 'summer'), '#5fae5a');
});

test('autumn: every round tree turns (only the pointed conifers stay green), parks the most red', () => {
  const share = (mix) => {
    let g = 0, red = 0;
    for (let i = 0; i < 4000; i++) {
      const c = leafColor(green, leafHash(i, 1), mix, 'autumn');
      if (isGreen(c)) g++; else if (c.r > 0.6 && c.g < 0.3) red++;
    }
    return { green: g / 4000, red: red / 4000 };
  };
  for (const k of ['street', 'park', 'wood']) assert.equal(share(MIX[k]).green, 0, k);
  assert.ok(share(MIX.park).red > share(MIX.street).red, 'parks have more red maples than the avenues');
  assert.ok(share(MIX.bush).green > 0.4, 'bushes stay mostly green');
});

test('ginkgos are yellow in autumn, green in summer', () => {
  for (let i = 0; i < 20; i++) {
    const c = ginkgoColor(green, leafHash(i), 'autumn');
    assert.ok(c.r > 0.75 && c.g > 0.35 && c.b < c.g * 0.5, c.getHexString()); // (linear values)
  }
  assert.equal(ginkgoColor(green, 0.3, 'summer'), green);
});

test('the same tree always gets the same colour', () => {
  assert.equal(leafColor(green, leafHash(12.5, -3), MIX.park, 'autumn'), leafColor(green, leafHash(12.5, -3), MIX.park, 'autumn'));
});
