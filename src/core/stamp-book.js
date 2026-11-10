// Stamp book (스탬프 노트): which tour stamps you have and the day you got
// each. Saved under mk.stamps, so it follows you to other devices.
export const STAMP_REWARD = 10000; // 🪙 for each new stamp; no prize for a full book (places keep being added)
export const STAMP_NEAR = 1.6; // metres from the stand to use it

// The stamps that exist on this map: a stand beside a shop needs that shop.
// The order of the stamp note (Yozi 2026-11-11). The subway takes you
// anywhere, so it doesn't go by district: each page of four mixes sights
// (관광) and things to do (액티비티), starting in Bukchon where new players
// start, with Yeongdeungpo, Seocho and Gangnam at the back. A stamp not
// listed here goes at the end, in data/stamps.js order: place it here.
export const STAMP_ORDER = [
  'bukchon', 'seongsu', 'gyeongbokgung', 'suragan', // 북촌 · 성수 팝업 · 경복궁 · 수라간
  'jongmyo', 'hongdae', 'ddp', 'hangang', // 종묘 · 홍대 버스킹 · DDP · 뚝섬 한강공원
  'namsan', 'mangwon-market', 'heunginjimun', 'another-dome', // 남산타워 · 망원시장 · 흥인지문 · 어나더 돔
  'museum', 'hyojae', 'sungnyemun', 'grand-park', // 국립중앙미술관 · 효재대학교 · 숭례문 · 어린이대공원
  'seoul-forest', 'mangwon-pier', 'igansumun', 'yeonnam', // 서울숲 · 망원 한강공원 · 이간수문 · 경의선숲길
  'war-memorial', 'drone-show', 'seokchon', 'yeouido', // 전쟁역사박물관 · 드론쇼 · 석촌호수 · 여의도 한강공원
  'banpo-jamwon', 'konext', // 반포 한강공원 · 코넥스트
];
const rank = (s) => { const i = STAMP_ORDER.indexOf(s.id); return i < 0 ? STAMP_ORDER.length : i; };
export const inNoteOrder = (stamps) => stamps.map((s, i) => [s, i]).sort((x, y) => rank(x[0]) - rank(y[0]) || x[1] - y[1]).map(([s]) => s);

export function availableStamps(stamps, hasStore) {
  return inNoteOrder(stamps.filter((s) => (s.place?.store ? hasStore(s.place.store) : Array.isArray(s.place?.at))));
}

const KEY = 'mk.stamps';
const today = (now) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export class StampBook {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}'); } catch { /* broken save */ }
    this.got = {};
    for (const [k, v] of Object.entries(raw || {})) if (typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v)) this.got[k] = v;
  }
  has(id) { return !!this.got[id]; }
  date(id) { return this.got[id] || null; }
  // How many of these stamps you have (stamps for removed places don't count).
  count(stamps) { return stamps.filter((s) => this.got[s.id]).length; }
  // Every stamp collected (the map gets a gold border, Yozi 2026-11-11).
  // Kept once earned, under "_all": a new stamp added later doesn't take it away.
  complete(stamps) {
    if (this.got._all) return true;
    if (!stamps.length || this.count(stamps) < stamps.length) return false;
    this.got._all = today(Date.now());
    try { this.storage?.setItem(KEY, JSON.stringify(this.got)); } catch { /* storage blocked */ }
    return true;
  }
  // Stamp it; true the first time (that's when the coins are paid).
  stamp(id, now = Date.now()) {
    if (!id || this.got[id]) return false;
    this.got[id] = today(now);
    try { this.storage?.setItem(KEY, JSON.stringify(this.got)); } catch { /* storage blocked */ }
    return true;
  }
}
