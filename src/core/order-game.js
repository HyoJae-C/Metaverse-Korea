// Rules of the ordering practice (no DOM, so it can be unit-tested).
// Korean word order is flexible, so the words of the order may come in any
// order, as long as the polite ending (주세요) comes last.
import { BLOCKS } from '../data/order-missions.js';

// Blocks offered for a mission, shuffled. `rand` is injectable for tests.
export function blocksFor(mission, rand = Math.random) {
  const ids = [...mission.need, ...mission.extra, 'please'];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

// Check an order (a list of block ids, in the order the player put them).
// Returns { ok, missing, extra, noEnding } where missing/extra are block ids.
export function checkOrder(mission, picked) {
  const words = picked.filter((id) => !BLOCKS[id]?.end);
  const endsPolitely = picked.length > 0 && !!BLOCKS[picked[picked.length - 1]]?.end && picked.filter((id) => BLOCKS[id]?.end).length === 1;
  const missing = mission.need.filter((id) => !words.includes(id));
  const extra = words.filter((id, i) => !mission.need.includes(id) || words.indexOf(id) !== i);
  return { ok: endsPolitely && !missing.length && !extra.length, missing, extra, noEnding: !endsPolitely };
}

// What the clerk says back: repeats the order to confirm it, like real
// counter staff do ("떡볶이 1인분, 안 맵게요? 맞으세요?").
export function repeatBack(picked) {
  const words = picked.filter((id) => BLOCKS[id] && !BLOCKS[id].end);
  if (!words.length) return null;
  const ko = words.map((id) => BLOCKS[id].ko);
  const rom = words.map((id) => BLOCKS[id].rom);
  return { ko: ko.join(' ') + '요?', rom: rom.join(' ') + 'yo?' };
}

// The full sentence for a mission, for the "listen and repeat" practice.
export function sentenceFor(mission) {
  const ids = [...mission.need, 'please'];
  return { ko: ids.map((id) => BLOCKS[id].ko).join(' '), rom: ids.map((id) => BLOCKS[id].rom).join(' ') };
}
