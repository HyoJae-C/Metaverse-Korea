import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAll, layout, ownerOf } from '../scripts/place-districts.mjs';
import { SALON, CLINIC, CLINIC2, LENS, LIPS, MENUS, EYE_SHAPES, BASIC_HAIR, beautyCost, menuFor } from '../src/core/beauty.js';
import { sanitizeLook, PALETTES, HAIR_STYLES, EYE_SHAPE_IDS, LIP_FAMILIES } from '../src/data/appearance.js';
import { STRINGS } from '../src/i18n/strings.js';
import { readFileSync } from 'node:fs';

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

test('thirty hairstyles, ten lip tints, fourteen lens colours, two eye shapes per clinic', () => {
  assert.equal(HAIR_STYLES.length, 30);
  assert.equal(new Set(HAIR_STYLES).size, 30);
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
  const bad = sanitizeLook({ dye: 'toString', eyes: '#fff', tone: 1, small: 'yes', hairStyle: 'rainbow', lip: 'constructor', eyeShape: 'huge' });
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

test('salons by concept: three signature styles each, the basic cuts everywhere', () => {
  const stores = JSON.parse(readFileSync(new URL('../public/regions/seongsu/stores.json', import.meta.url))).stores;
  const salons = stores.filter((s) => s.workshop === 'salon');
  // Salons are spread over the areas: Seongsu, Hongdae, Seodaemun (by the
  // campus street) and Itaewon (a men's barber).
  const rows = layout(...Object.values(loadAll()));
  const area = (s) => ownerOf(rows, s.at[0], s.at[1])?.id || 'elsewhere';
  const count = {};
  for (const s of salons) count[area(s)] = (count[area(s)] || 0) + 1;
  assert.deepEqual(count, { seongsu: 2, hongdae: 4, seodaemun: 1, itaewon: 1 });
  const seen = new Set();
  for (const s of salons) {
    assert.equal(s.hairStyles.length, 3, s.id);
    const [o] = menuFor('salon', s);
    assert.deepEqual(o.choices.slice(0, 3), s.hairStyles, `${s.id}: signatures first`);
    for (const h of BASIC_HAIR) assert.ok(o.choices.includes(h), `${s.id} ${h}`);
    for (const h of s.hairStyles) {
      assert.ok(HAIR_STYLES.includes(h) && !BASIC_HAIR.includes(h), `${s.id} ${h}`);
      assert.ok(!seen.has(h), `${h} is the signature of two salons`);
      seen.add(h);
    }
    assert.equal(menuFor('salon', s)[1].key, 'dye');
  }
  // every style is on offer somewhere
  assert.deepEqual([...seen, ...BASIC_HAIR].sort(), [...HAIR_STYLES].sort());
});
