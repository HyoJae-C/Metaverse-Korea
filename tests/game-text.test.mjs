import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as TEXT from '../src/i18n/game-text.js';

// Every phrase in the tables main.js uses has English and Korean, and its
// {placeholders} are the same in every language.
const phrases = (o, path = []) => (o && typeof o === 'object' && !('en' in o)
  ? Object.entries(o).flatMap(([k, v]) => phrases(v, [...path, k]))
  : [[path.join('.'), o]]);

for (const [table, value] of Object.entries(TEXT)) {
  test(`${table}: English and Korean, same placeholders in every language`, () => {
    for (const [key, p] of phrases(value)) {
      if (typeof p !== 'object' || Array.isArray(p)) continue; // plain values (numbers, lists)
      assert.ok(p.en && p.ko, `${table}.${key} needs en and ko`);
      const vars = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
      for (const [lang, s] of Object.entries(p)) assert.equal(vars(s), vars(p.en), `${table}.${key} ${lang}`);
    }
  });
}
