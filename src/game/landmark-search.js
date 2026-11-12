// Landmarks in the map's search ("Sungnyemun", "보신각", "King Sejong"):
// the gates, statues and towers that are neither a shop, a meeting zone nor a
// district, so the search found nothing for them before.
//
// Places come from the map's own landmarks (districts/*.json, already moved
// to world metres by core/districts.js), so a landmark that moves keeps its
// search result. To add one: an entry keyed by its landmark `type` (and
// `kind` when one type has several, like the two statues), its names, other
// names people type (`also`), and `go`: where guidance ends, in metres from
// the landmark, on open ground in front of it (tests/landmark-search.test.mjs
// checks it is not inside a building or blocker).
export const LANDMARK_SEARCH = [
  { type: 'sungnyemun', icon: '🏯', go: [0, 20], // the lawn south of the gate, by its stamp
    name: { en: 'Sungnyemun (Namdaemun)', ko: '숭례문 (남대문)', ja: '崇礼門（南大門）', zh: '崇礼门（南大门）' },
    also: ['Namdaemun Gate', 'Great South Gate', '남대문', '南大門', '南大门'] },
  { type: 'oldstation', icon: '🚉', go: [11, 0], // the plaza in front of it
    name: { en: 'Old Seoul Station (Culture Station Seoul 284)', ko: '구 서울역사 (문화역서울284)', ja: '旧ソウル駅舎（文化駅ソウル284）', zh: '旧首尔站（文化站首尔284）' },
    also: ['Seoul Station', 'Culture Station Seoul 284', '서울역', '문화역서울284', 'ソウル駅', '首尔站'] },
  { type: 'heunginjimun', icon: '🏯', go: [8, 0],
    name: { en: 'Heunginjimun (Dongdaemun Gate)', ko: '흥인지문 (동대문)', ja: '興仁之門（東大門）', zh: '兴仁之门（东大门）' },
    also: ['Dongdaemun Gate', 'Great East Gate', '동대문', '東大門', '东大门'] },
  { type: 'bosingak', icon: '🔔', go: [0, 10], // where you stand to ring the bell
    name: { en: 'Bosingak Bell Pavilion', ko: '보신각', ja: '普信閣', zh: '普信阁' },
    also: ['Bosingak', 'Bell', '종각', '鐘閣', '钟阁'] },
  { type: 'statue', kind: 'king', icon: '🗿', go: [0, 12],
    name: { en: 'Statue of King Sejong', ko: '세종대왕 동상', ja: '世宗大王像', zh: '世宗大王铜像' },
    also: ['Sejong', '세종대왕', '세종'] },
  { type: 'statue', kind: 'admiral', icon: '🗿', go: [0, -12],
    name: { en: 'Statue of Admiral Yi Sun-sin', ko: '이순신 장군 동상', ja: '李舜臣将軍像', zh: '李舜臣将军铜像' },
    also: ['Yi Sun-sin', 'Yi Sunsin', '이순신'] },
  { type: 'ddp', icon: '🏛️', go: [8, 42], // its front plaza, by the stamp
    name: { en: 'Dongdaemun Design Plaza (DDP)', ko: '동대문디자인플라자 (DDP)', ja: '東大門デザインプラザ（DDP）', zh: '东大门设计广场（DDP）' } },
  { type: 'hanokgate', icon: '🏘️', go: [0, 8],
    name: { en: 'Namsangol Hanok Village', ko: '남산골 한옥마을', ja: '南山コル韓屋村', zh: '南山谷韩屋村' },
    also: ['Hanok Village', '한옥마을'] },
  { type: 'cablecar', icon: '🚡', go: [0, 8],
    name: { en: 'Namsan Cable Car (N Seoul Tower)', ko: '남산 케이블카 (N서울타워)', ja: '南山ケーブルカー（Nソウルタワー）', zh: '南山缆车（N首尔塔）' },
    also: ['Namsan', 'N Tower', 'Seoul Tower', '남산', '남산타워', '서울타워'] },
  { type: 'haneultower', icon: '🗼', go: [0, 20],
    name: { en: 'Modu Tower', ko: '모두타워', ja: 'モドゥタワー', zh: 'Modu塔' } },
  { type: 'tower63', icon: '🏢', go: [0, 12],
    name: { en: '63 Building', ko: '63빌딩', ja: '63ビル', zh: '63大厦' } },
  { type: 'peacegate', icon: '⛩️', go: [0, 12],
    name: { en: 'World Peace Gate', ko: '평화의 문', ja: '平和の門', zh: '和平之门' },
    also: ['Peace Gate', '평화의문'] },
];

const norm = (v) => String(v ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s\-_'·.()（）]+/g, '');

// The searchable landmarks found on this map: { key, icon, name, also, x, z }
// with (x, z) where guidance ends.
export function landmarkPlaces(landmarks = []) {
  const out = [];
  for (const e of LANDMARK_SEARCH) {
    const l = landmarks.find((m) => m.type === e.type && (!e.kind || m.kind === e.kind) && Number.isFinite(m.x));
    if (!l) continue; // that landmark isn't on this map
    out.push({ key: e.kind ? `${e.type}:${e.kind}` : e.type, icon: e.icon, name: e.name, also: e.also || [], x: l.x + e.go[0], z: l.z + e.go[1] });
  }
  return out;
}

// Does a landmark match the search text? Its names in any language, or one of
// its other names, ignoring case, spaces and brackets.
export function landmarkMatches(place, query) {
  const q = norm(query);
  if (!q) return false; // landmarks show only when searched for, not in the full list
  return [...Object.values(place.name), ...place.also].some((x) => norm(x).includes(q));
}
