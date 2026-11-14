import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEAM_LIST } from '../src/data/ballpark-teams.js';
import { WEARABLES } from '../src/data/wearables.js';
import { ACCESSORIES, sanitizeLook } from '../src/data/appearance.js';

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
const dome = stores.find((s) => s.id === 'seoul-another-dome');

test('the team store sells every team\'s jersey, cap and cheer towel (24 goods)', () => {
  const goods = dome.products.filter((p) => p.goods);
  assert.equal(goods.length, TEAM_LIST.length * 3);
  for (const p of goods) {
    const it = WEARABLES[p.item];
    assert.ok(it, p.item);
    assert.ok(TEAM_LIST.some((t) => t.id === p.goods));
    for (const lang of ['en', 'ko', 'ja', 'zh']) assert.ok(p.name[lang] && p.desc[lang], p.id + ' ' + lang);
  }
});

test('a cheer towel is a neck accessory that a look keeps', () => {
  for (const t of TEAM_LIST) {
    const a = ACCESSORIES.neck.find((x) => x.id === 'towel-' + t.id);
    assert.equal(a?.shape, 'towel');
    assert.equal(a.team, t.id);
    assert.equal(sanitizeLook({ neck: 'towel-' + t.id }).neck, 'towel-' + t.id);
  }
});
