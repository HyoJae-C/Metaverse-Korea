import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SALON, CLINIC, CLINIC2, LENS, LIPS, MENUS, EYE_SHAPES, beautyCost } from '../src/core/beauty.js';
import { sanitizeLook, PALETTES, HAIR_STYLES, EYE_SHAPE_IDS, LIP_FAMILIES } from '../src/data/appearance.js';
import { STRINGS } from '../src/i18n/strings.js';

test('you pay for each change; going back to your own is free', () => {
  assert.equal(beautyCost(SALON, {}, { dye: 'pink' }), 30);
  assert.equal(beautyCost(SALON, {}, { dye: 'pink', hairStyle: 'bob' }), 70);
  assert.equal(beautyCost(SALON, { dye: 'pink' }, { dye: 'pink' }), 0);
  assert.equal(beautyCost(SALON, { dye: 'pink' }, { dye: null }), 0);
  assert.equal(beautyCost(CLINIC, {}, { eyeShape: 'big', tone: 'tan', small: 'small' }), 130);
  assert.equal(beautyCost(CLINIC, { small: 'small' }, { small: 'big' }), 45); // small to big
  assert.equal(beautyCost(CLINIC, { small: 'big' }, { small: null }), 0);
  assert.equal(beautyCost(CLINIC, { small: false }, { small: false }), 0);
  assert.equal(beautyCost(CLINIC2, {}, { eyeShape: 'cat' }), 50);
  assert.equal(beautyCost(LENS, {}, { eyes: 'aqua' }), 25);
  assert.equal(beautyCost(LIPS, {}, { lip: 'cherry' }), 15);
});

test('ten hairstyles, ten lip tints, fourteen lens colours, two eye shapes per clinic', () => {
  assert.equal(HAIR_STYLES.length, 10);
  assert.equal(LIP_FAMILIES.mixed.length, 10);
  for (const shades of Object.values(LIP_FAMILIES)) for (const k of shades) assert.ok(PALETTES.lip[k] != null, k);
  assert.ok(Object.keys(PALETTES.eyes).length >= 14);
  assert.deepEqual([...EYE_SHAPES.clinic, ...EYE_SHAPES.clinic2].sort(), [...EYE_SHAPE_IDS].sort());
  for (const shapes of Object.values(EYE_SHAPES)) assert.equal(shapes.length, 2);
});

test('looks keep valid beauty choices and drop the rest', () => {
  const ok = sanitizeLook({ dye: 'mint', eyes: 'aqua', tone: 'deep', small: true, hairStyle: 'twin', lip: 'coral', eyeShape: 'puppy' });
  assert.deepEqual([ok.dye, ok.eyes, ok.tone, ok.small, ok.hairStyle, ok.lip, ok.eyeShape], ['mint', 'aqua', 'deep', 'small', 'twin', 'coral', 'puppy']); // an old save's small head
  assert.equal(sanitizeLook({ small: 'big' }).small, 'big');
  const bad = sanitizeLook({ dye: 'toString', eyes: '#fff', tone: 1, small: 'yes', hairStyle: 'mohawk', lip: 'constructor', eyeShape: 'huge' });
  assert.deepEqual([bad.dye, bad.eyes, bad.tone, bad.small, bad.hairStyle, bad.lip, bad.eyeShape], [null, null, null, false, null, null, null]);
});

test('every menu option has a palette or labelled choices in every language', () => {
  for (const [kind, menu] of Object.entries(MENUS)) {
    for (const l of ['en', 'ko', 'ja', 'zh']) for (const k of ['open', 'title', 'howTo']) assert.ok(STRINGS[l][`${kind}.${k}`], `${l} ${kind}.${k}`);
    for (const o of menu) {
      if (o.palette) assert.ok(PALETTES[o.palette], o.key);
      for (const c of o.choices || []) for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(STRINGS[l][`${o.label}.${c}`], `${l} ${o.label}.${c}`);
      if (!o.toggle) for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(STRINGS[l]['beauty.' + o.key], `${l} beauty.${o.key}`);
    }
  }
});

test('each colour lip shop sells only its own family, Petal Lip the mixed ten', async () => {
  const { menuFor } = await import('../src/core/beauty.js');
  const { readFileSync } = await import('node:fs');
  const stores = JSON.parse(readFileSync(new URL('../public/regions/seongsu/stores.json', import.meta.url))).stores;
  const lipShops = stores.filter((s) => s.workshop === 'lips');
  assert.ok(lipShops.length >= 7);
  for (const s of lipShops) {
    const [o] = menuFor('lips', s);
    assert.deepEqual(o.only, LIP_FAMILIES[s.lipFamily || 'mixed'], s.id);
  }
  assert.deepEqual(menuFor('lips', { lipFamily: 'green' })[0].only, ['mint', 'matcha', 'emerald', 'olive', 'forest']);
  assert.equal(menuFor('salon', null), SALON);
});
