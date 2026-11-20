import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MIX, leafColor, leafHash, leafHex } from '../src/core/season.js';

const green = new THREE.Color('#7cc46e');
const isGreen = (c) => c === green;

test('summer keeps every tree its own green', () => {
  for (let i = 0; i < 50; i++) assert.equal(leafColor(green, leafHash(i), MIX.park, 'summer'), green);
  assert.equal(leafHex('#5fae5a', 0.7, MIX.street, 'summer'), '#5fae5a');
});

test('autumn: most trees turn, some stay green, parks the most colourful', () => {
  const share = (mix) => {
    let g = 0, red = 0;
    for (let i = 0; i < 4000; i++) {
      const c = leafColor(green, leafHash(i, 1), mix, 'autumn');
      if (isGreen(c)) g++; else if (c.r > 0.6 && c.g < 0.3) red++;
    }
    return { green: g / 4000, red: red / 4000 };
  };
  const street = share(MIX.street), park = share(MIX.park);
  assert.ok(street.green > 0.08 && street.green < 0.22, `street green ${street.green}`);
  assert.ok(park.green > 0.06 && park.green < 0.2, `park green ${park.green}`);
  assert.ok(park.red > street.red, 'parks have more red maples than the avenues');
  assert.ok(share(MIX.bush).green > 0.4, 'bushes stay mostly green');
});

test('the same tree always gets the same colour', () => {
  assert.equal(leafColor(green, leafHash(12.5, -3), MIX.park, 'autumn'), leafColor(green, leafHash(12.5, -3), MIX.park, 'autumn'));
});
