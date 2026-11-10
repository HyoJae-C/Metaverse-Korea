// Bosingak (보신각), the bell pavilion on Jongno, in the Gyeongbokgung
// district's metres (districts/gyeongbokgung.json). Its landmark model is in
// core/bosingak-model.js; ringing the bell is in main.js (bosingakAct).
//
// The spot: on the north side of Jongno, east of Sejong-daero, where the
// real pavilion stands by Jonggak Station (the game's Jongno is 1/4 scale
// between districts, so this is about where it falls, not to the metre).

export const BOSINGAK = {
  district: 'gyeongbokgung',
  at: [155, 106], // the pavilion's centre (its front faces Jongno, +z)
  base: [144.5, 100, 163, 112], // the stone base and its steps up the west side: a blocker in the map
  plaza: [124, 84, 186, 140], // the open paving round it, up to Jongno's edge
  ring: { at: [155, 116], r: 4 }, // stand here, in front of the steps, to ring the bell
  cooldown: 7, // seconds before the bell can be rung again (it hums that long)
  firstRing: 10000, // won for the first ring (once; reward rule 'view')
  // The New Year's ringings on 1 January (KST): at midnight (제야의 종) and
  // again at noon, 33 strokes each. The bell keeper comes out a little
  // before and goes back in a little after.
  newYear: { strikes: 33, gap: 15, starts: [0, 12], comeOut: 120, stay: 60 },
  // How far the bell carries (metres from the pavilion): a ring by a player
  // only round the square; the New Year's ringings along all of Jongno.
  hear: { ring: 20, ceremony: 450 },
  // The few people already on the square, facing the pavilion: [x, z, what].
  people: [[150, 129, 'photo'], [151, 122, 'pose'], [173, 127, 'coffee'], [133, 97, 'look']],
  keeper: { who: 'official', at: [161, 106.8], ry: -Math.PI / 2 }, // on the upper floor, behind the striker, facing the bell ('official' in Joseon dress or 'monk')
};

// The pavilion's size, in metres (core/bosingak-model.js draws it; the base is
// BOSINGAK.base in the map: 16 × 12, plus the steps).
export const BELL_HOUSE = { w: 16, d: 12, baseH: 3.2, postH: 5.4, bellH: 3.2, bellR: 1.15 };

export const BOSINGAK_TEXT = {
  name: { en: 'Bosingak Bell Pavilion', ko: '보신각', ja: '普信閣', zh: '普信阁' },
  ring: { en: 'Ring the bell', ko: '종 치기', ja: '鐘をつく', zh: '敲钟' },
  about: { en: 'About Bosingak', ko: '보신각 이야기', ja: '普信閣について', zh: '关于普信阁' },
  rang: {
    en: '🔔 Boooong… The bell of Bosingak rings out over Jongno. (+₩{c})',
    ko: '🔔 데엥… 보신각 종소리가 종로에 울려 퍼져요. (+₩{c})',
    ja: '🔔 ゴーン… 普信閣の鐘の音が鍾路に響きわたります。（+₩{c}）',
    zh: '🔔 咚——普信阁的钟声回荡在钟路上空。（+₩{c}）',
  },
  again: {
    en: '🔔 Boooong… The bell rings out over Jongno.',
    ko: '🔔 데엥… 종소리가 종로에 울려 퍼져요.',
    ja: '🔔 ゴーン… 鐘の音が鍾路に響きわたります。',
    zh: '🔔 咚——钟声回荡在钟路上空。',
  },
  humming: {
    en: 'The bell is still humming. Wait for it to fade.',
    ko: '종이 아직 울리고 있어요. 소리가 잦아들 때까지 기다려 주세요.',
    ja: '鐘はまだ響いています。音が消えるまで待ちましょう。',
    zh: '钟声还在回荡，等它渐渐消散吧。',
  },
  ledger: { en: 'Rang the Bosingak bell', ko: '보신각 타종', ja: '普信閣の鐘つき', zh: '普信阁敲钟' },
  // The name tag over whoever rings the New Year's bell (BOSINGAK.keeper.who).
  keeper: {
    official: { en: '🔔 Bell keeper', ko: '🔔 타종관', ja: '🔔 鐘つき役', zh: '🔔 敲钟官' },
    monk: { en: '🔔 Monk', ko: '🔔 스님', ja: '🔔 お坊さん', zh: '🔔 僧人' },
  },
  noon: {
    en: '🔔 Bosingak\'s bell rings 33 times for the New Year. You can hear it all along Jongno.',
    ko: '🔔 새해를 맞아 보신각 종이 33번 울려요. 종로 어디서나 들려요.',
    ja: '🔔 新年を祝って普信閣の鐘が33回鳴ります。鍾路のどこでも聞こえます。',
    zh: '🔔 为迎接新年，普信阁的钟将敲响33下，整条钟路都听得到。',
  },
  newYear: {
    en: '🎆 Happy New Year! Bosingak is ringing in the year with 33 strokes, as it does every New Year\'s Eve.',
    ko: '🎆 새해 복 많이 받으세요! 해마다 그렇듯 보신각이 33번 종을 울려 새해를 맞아요.',
    ja: '🎆 あけましておめでとう！毎年の大みそかと同じく、普信閣が33回鐘をついて新年を迎えます。',
    zh: '🎆 新年快乐！和每年除夕一样，普信阁敲响33声钟迎接新年。',
  },
};

// What the guide card says (facts that don't change; no event times, since
// those change from year to year: the card points to Seoul's own pages).
export const BOSINGAK_CARD = {
  icon: '🔔',
  name: BOSINGAK_TEXT.name,
  text: {
    en: 'Bosingak stands on Jongno, the old main street of Seoul. In the Joseon dynasty a great bell here rang to open and close the gates of the capital: 28 strokes at night and 33 at dawn. The pavilion you see was rebuilt in 1979, and the old bell now rests at the National Museum of Korea. Every New Year\'s Eve the bell is rung 33 times at midnight, and crowds fill Jongno to hear it. Real Bosingak: by Jonggak Station (Line 1). Bell-ringing events change, so check Seoul\'s official site before you go.',
    ko: '보신각은 서울의 옛 큰길인 종로에 서 있어요. 조선 시대에는 이곳의 큰 종을 쳐서 도성의 문을 열고 닫았어요. 밤에는 28번(인정), 새벽에는 33번(파루) 울렸어요. 지금의 누각은 1979년에 다시 지었고, 옛 종은 국립중앙박물관에 있어요. 해마다 12월 31일 자정에는 제야의 종을 33번 울리고, 종로가 사람들로 가득 차요. 실제 보신각은 1호선 종각역 옆이에요. 타종 행사는 해마다 바뀌니 가기 전에 서울시 공식 누리집에서 확인하세요.',
    ja: '普信閣はソウルの昔の大通り、鍾路に建っています。朝鮮時代、ここの大きな鐘をついて都の門を開け閉めしました。夜は28回、夜明けは33回。今の楼閣は1979年に建て直され、昔の鐘は国立中央博物館にあります。毎年大みそかの午前0時には除夜の鐘を33回つき、鍾路は人でいっぱいになります。実際の普信閣は1号線鍾閣駅のそば。鐘つき行事は年によって変わるので、行く前にソウル市の公式サイトで確認を。',
    zh: '普信阁坐落在首尔的老大街钟路上。朝鲜时代，人们敲响这里的大钟来开关都城的城门：夜里敲28下，黎明敲33下。现在的楼阁是1979年重建的，旧钟收藏在国立中央博物馆。每年除夕午夜都会敲响33声除夕钟，钟路挤满了来听钟声的人。现实中的普信阁在1号线钟阁站旁。敲钟活动每年不同，出发前请在首尔市官网确认。',
  },
};

// Korean time (UTC+9, no daylight saving) for a moment in ms.
const kst = (ms) => new Date(ms + 9 * 3600e3);

// The New Year's ringing going on at `ms`, or null: { start (ms), stroke
// (0..32 while ringing, -1 before the first and after the last), keeper (true
// while the bell keeper is out) }. Everyone's clock gives the same answer, so
// every player hears the same stroke.
export function newYearRinging(ms, { strikes, gap, starts, comeOut, stay } = BOSINGAK.newYear) {
  const y = kst(ms).getUTCFullYear();
  for (const yr of [y, y + 1]) for (const h of starts) {
    const start = Date.UTC(yr, 0, 1, h) - 9 * 3600e3, s = (ms - start) / 1000, end = strikes * gap;
    if (s < -comeOut || s >= end + stay) continue;
    return { start, stroke: s >= 0 && s < end ? Math.floor(s / gap) : -1, keeper: true };
  }
  return null;
}
// The stroke that is due (0..32) during a New Year's ringing, otherwise -1.
export const newYearStroke = (ms, cfg) => newYearRinging(ms, cfg)?.stroke ?? -1;

// How loud the bell is `d` metres from the pavilion: full close by, nothing
// past `range` (BOSINGAK.hear.ring or .ceremony).
export const bellGain = (d, range) => (d >= range ? 0 : (1 - d / range) ** 1.5);

// Close enough (in world metres) to ring: off = the district's offset.
export function nearBell(x, z, off) {
  if (!off) return false;
  const [rx, rz] = BOSINGAK.ring.at;
  return Math.hypot(x - off[0] - rx, z - off[1] - rz) < BOSINGAK.ring.r;
}

// The striker's swing, shared by main.js (which strikes) and the model in
// core/bosingak-model.js (which draws it). Times in seconds.
let struckAt = -1e9;
export function strikeBell(now = performance.now() / 1000) { struckAt = now; }
export const sinceStrike = (now = performance.now() / 1000) => now - struckAt;
// How far the striker is pulled back (0 at rest, 1 fully back) and how hard
// the bell is still shaking (0..1), `s` seconds after a stroke. The log meets
// the bell at 1.15 s.
export function strikePose(s) {
  if (s < 0 || s > 6) return { pull: 0, shake: 0 };
  if (s < 0.9) return { pull: Math.sin((s / 0.9) * Math.PI / 2), shake: 0 }; // drawn back
  if (s < 1.15) return { pull: 1 - (s - 0.9) / 0.25, shake: 0 }; // swung in
  const t = s - 1.15; // after the hit: it bounces off and settles, the bell trembles
  return { pull: Math.max(0, 0.25 * Math.sin(t * 4) * Math.exp(-t * 1.6)), shake: Math.exp(-t * 0.8) };
}
