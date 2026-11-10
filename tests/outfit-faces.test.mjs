import test from 'node:test';
import assert from 'node:assert/strict';
import PACK from '../src/data/characters/kaykit2.js';
import { WEARABLES } from '../src/data/wearables.js';
import { HANBOK } from '../src/data/hanbok.js';

// Every model shows its GLB's own head. Only the rogue's head is the
// player's face (rogue_hooded is the same head under a hood): clothes on
// any other GLB gave players someone else's face (a beard, the knight's
// blond hair, the mage's thick brows) when they put them on.
const PLAYER_HEADS = new Set(['models/kaykit2/rogue.glb', 'models/kaykit2/rogue_hooded.glb']);
const NPC_ONLY = new Set(['trainer']);

test('clothes never change the face: every wearable model is on the rogue head', () => {
  for (const [id, m] of Object.entries(PACK.models)) {
    if (NPC_ONLY.has(id)) continue;
    assert.ok(PLAYER_HEADS.has(m.url), `${id} uses ${m.url}`);
  }
});

test('shop clothes and hanbok point at models that keep the face', () => {
  const ids = [...Object.values(WEARABLES).map((w) => w.wear?.model), ...Object.values(HANBOK).map((h) => h.model)].filter(Boolean);
  assert.ok(ids.includes('puffer-black') && ids.includes('padding-white'));
  for (const id of ids) assert.ok(PLAYER_HEADS.has(PACK.models[id]?.url), `${id} -> ${PACK.models[id]?.url}`);
});
