import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeLook } from '../src/data/appearance.js';

test('the operator flag survives the network only as true', () => {
  assert.equal(sanitizeLook({ op: true }).op, true);
  assert.equal(sanitizeLook({ op: 'yes' }).op, undefined);
  assert.equal(sanitizeLook({}).op, undefined);
});
