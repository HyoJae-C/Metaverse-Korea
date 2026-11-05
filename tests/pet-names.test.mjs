import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setPetName, customPetName, readPetNames, cleanPetName, PET_NAME_MAX } from '../src/core/pet-names.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('a pet keeps the name you give it', () => {
  const s = mem();
  assert.equal(customPetName('pet-shiba', s), '');
  assert.equal(setPetName('pet-shiba', ' 초코 ', s), '초코');
  assert.equal(customPetName('pet-shiba', s), '초코');
  assert.equal(customPetName('pet-maltese', s), '');
});

test('names are cleaned and kept short; empty goes back to the default', () => {
  const s = mem();
  assert.equal(cleanPetName('<b>Max!</b>'), 'bMaxb');
  assert.ok(cleanPetName('가'.repeat(30)).length <= PET_NAME_MAX);
  setPetName('pet-shiba', 'Max', s);
  assert.equal(setPetName('pet-shiba', '   ', s), '');
  assert.deepEqual(readPetNames(s), {});
});

test('a broken save does not crash', () => {
  const s = mem();
  s.setItem('mk.petNames', 'not json');
  assert.equal(customPetName('pet-shiba', s), '');
});
