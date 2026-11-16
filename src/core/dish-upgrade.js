// Upgrading a cooked dish (음식 강화, plan: the "음식 강화 계획" doc). A dish
// from a cooking class goes up one level a try (+1 … +20 for now, +30 later),
// paying 정성 양념 (seasoning). Success is luck: on the server, upgrade_dish
// rolls the dice (supabase/051_dish_upgrade.sql); this file has the same
// rules for the panel and for play without the server.
//
// Rules (Yozi 2026-11-16/17):
//  - +1 … +20: a failed try changes nothing (the dish never breaks or drops).
//  - Each failure adds to the dish's gauge (정성 게이지), raising the next
//    try's chance until it succeeds: +5%p up to +10, +2%p after.
//  - Cost: 1 seasoning up to +10; from +11, as many as the level tried for.
//  - Everyone gets DAILY_TRIES tries a day, whatever they have.
//  - A gold-medal dish starts at +1.
//  - Seasoning: 10 to start (everyone, once), 3 for finishing the day's
//    missions, 1 a day for each kind of dish you cook. Not sold for now.
// Kept free of DOM code so it can be unit-tested.
import { recipeOf } from './recipe-book.js';
import { isKimchi, kimchiScore } from './kimchi-market.js';
import { medalFor } from './grill-game.js';

export const LEVEL_OPEN = 20; // the highest level you can reach for now
export const DAILY_TRIES = 10;
export const START_SEASONING = 10;
export const MISSION_SEASONING = 3;
export const CLASS_SEASONING = 1;
// Chance (%) of reaching each level, from +1.
export const CHANCE = [100, 97, 93, 89, 85, 80, 75, 70, 65, 60, 55, 52, 49, 46, 43, 40, 37, 34, 31, 28];
export const gaugeStep = (target) => (target <= 10 ? 5 : 2);
export const costFor = (target) => (target <= 10 ? 1 : target);
// The chance of the next try for a dish at `lv` with `gauge` points saved up.
export const chanceFor = (lv, gauge = 0) => (lv >= LEVEL_OPEN ? 0 : Math.min(100, CHANCE[lv] + (gauge | 0)));

// A bag entry that can be upgraded (a cooked dish): its kind (kimchi, kimbap,
// bibimnaengmyeon …), else null.
export const dishKindOf = (e) => (recipeOf(e) ? (isKimchi(e) ? 'kimchi' : e.g) : null);
export const dishLevel = (e) => Math.max(0, Math.min(30, e?.lv | 0));
// Where a dish starts the first time it's upgraded.
export const startLevel = (e) => (medalFor(kimchiScore(e)) === 'gold' ? 1 : 0);

// One try with a die (rand → 0…1). → { ok, lv, gauge, chance, cost }
export function rollUpgrade(lv, gauge, rand = Math.random) {
  const target = lv + 1, chance = chanceFor(lv, gauge), cost = costFor(target);
  const ok = Math.floor(rand() * 100) < chance;
  return ok ? { ok, lv: target, gauge: 0, chance, cost } : { ok, lv, gauge: Math.min(100, (gauge | 0) + gaugeStep(target)), chance, cost };
}
