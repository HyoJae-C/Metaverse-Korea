// Club playlists for Itaewon: 10 songs a genre, each 2–3 minutes. Like
// data/tracks.js, every song is a recipe that core/club-music.js plays live
// with Web Audio: no audio files, nothing to download or license, and the
// server does no work at all.
//
// key: MIDI note of the home note (bass octave); prog: four chords as scale
// steps (0 = home chord); seed: picks the melody, drum and bass patterns.
// To add a song: copy a line and change the numbers and the title.

export const CLUB_GENRES = {
  edm: {
    icon: '⚡',
    name: { en: 'EDM', ko: 'EDM', ja: 'EDM', zh: 'EDM' },
    desc: { en: 'Big-room and progressive house: four-on-the-floor kicks, builds and drops.', ko: '빅룸·프로그레시브 하우스: 쿵쿵 울리는 킥, 빌드업, 그리고 드롭!', ja: 'ビッグルーム／プログレッシブ・ハウス：4つ打ちキック、ビルドアップ、ドロップ。', zh: '大房／渐进浩室：四拍底鼓、铺垫和高潮。' },
  },
  hiphop: {
    icon: '🎤',
    name: { en: 'Hip-hop', ko: '힙합', ja: 'ヒップホップ', zh: '嘻哈' },
    desc: { en: 'Trap and boom bap: deep 808 bass, snappy snares and rolling hi-hats.', ko: '트랩·붐뱁: 묵직한 808 베이스, 찰진 스네어, 굴러가는 하이햇.', ja: 'トラップ／ブーンバップ：重い808ベース、キレのあるスネア、転がるハイハット。', zh: '陷阱／Boom bap：厚重的 808 贝斯、清脆军鼓和滚动踩镲。' },
  },
  kpop: {
    icon: '💖',
    name: { en: 'K-POP Remix', ko: 'K-POP 리믹스', ja: 'K-POPリミックス', zh: 'K-POP 混音' },
    desc: { en: 'K-pop style dance remixes: future-bass chords, vocal chops and big drops.', ko: 'K-POP 느낌 댄스 리믹스: 퓨처베이스 코드, 보컬 찹, 시원한 드롭.', ja: 'K-POP風ダンスリミックス：フューチャーベースのコード、ボーカルチョップ、派手なドロップ。', zh: 'K-POP 风舞曲混音：未来贝斯和弦、人声切片和强劲高潮。' },
  },
};

const T = (id, en, ko, bpm, key, prog, seed, extra = {}) => ({ id, name: { en, ko }, bpm, key, prog, seed, ...extra });

export const CLUB_TRACKS = {
  edm: [
    T('edm-orbit', 'Orbit Rush', '오빗 러시', 126, 45, [0, 5, 2, 6], 11),
    T('edm-neon', 'Neon Tide', '네온 타이드', 124, 41, [5, 6, 0, 4], 23, { bass: 'rolling' }),
    T('edm-skyline', 'Skyline Pulse', '스카이라인 펄스', 128, 43, [0, 3, 5, 4], 37),
    T('edm-hangang', 'Han River Lights', '한강 라이츠', 122, 40, [0, 6, 5, 6], 41, { bass: 'pulse' }),
    T('edm-gravity', 'Zero Gravity', '제로 그래비티', 126, 38, [0, 5, 3, 4], 53, { bass: 'rolling' }),
    T('edm-firework', 'Fireworks Drop', '불꽃 드롭', 128, 44, [5, 3, 0, 4], 67),
    T('edm-midnight', 'Midnight Runner', '미드나잇 러너', 124, 42, [0, 2, 5, 6], 71, { bass: 'pulse' }),
    T('edm-laser', 'Laser Garden', '레이저 가든', 126, 39, [0, 6, 3, 4], 83),
    T('edm-hill', 'Namsan Sunrise', '남산 선라이즈', 122, 46, [3, 0, 4, 5], 97, { bass: 'rolling' }),
    T('edm-hyper', 'Hyperloop', '하이퍼루프', 128, 41, [0, 5, 6, 4], 101),
  ],
  hiphop: [
    T('hh-alley', 'Back Alley Kings', '뒷골목 킹스', 88, 36, [0, 5, 3, 4], 13),
    T('hh-808', 'Eight-Oh-Eight Hill', '808 언덕', 92, 38, [0, 6, 5, 4], 29, { hats: 'trap' }),
    T('hh-subway', 'Last Subway', '막차', 86, 35, [0, 3, 0, 4], 31),
    T('hh-crown', 'Paper Crown', '종이 왕관', 94, 37, [5, 3, 0, 6], 43, { hats: 'trap' }),
    T('hh-rooftop', 'Rooftop Cypher', '옥상 싸이퍼', 90, 40, [0, 5, 2, 4], 59),
    T('hh-gold', 'Gold Chains, No Brakes', '골드 체인', 96, 34, [0, 6, 3, 4], 61, { hats: 'trap' }),
    T('hh-rain', 'Rain on Concrete', '콘크리트 위의 비', 84, 39, [0, 3, 5, 6], 73),
    T('hh-boss', 'Boss Level', '보스 레벨', 92, 36, [0, 1, 0, 4], 89, { hats: 'trap' }),
    T('hh-late', 'Late Night Freestyle', '심야 프리스타일', 88, 41, [5, 6, 0, 0], 103),
    T('hh-homerun', 'Home Run Swing', '홈런 스윙', 94, 37, [0, 5, 6, 4], 107, { hats: 'trap' }),
  ],
  kpop: [
    T('kp-heart', 'Heart Signal (Remix)', '하트 시그널 (리믹스)', 118, 41, [5, 6, 0, 4], 17, { major: true }),
    T('kp-starlight', 'Starlight Dash (Remix)', '스타라이트 대시 (리믹스)', 120, 43, [0, 4, 5, 3], 19, { major: true }),
    T('kp-bubble', 'Bubble Pop Party (Remix)', '버블팝 파티 (리믹스)', 116, 45, [3, 4, 2, 5], 47, { major: true }),
    T('kp-crush', 'Secret Crush (Remix)', '시크릿 크러시 (리믹스)', 114, 40, [0, 5, 2, 6], 79),
    T('kp-summer', 'Summer Blue (Remix)', '썸머 블루 (리믹스)', 122, 42, [3, 4, 5, 0], 109, { major: true }),
    T('kp-mirror', 'Mirror Mirror (Remix)', '미러 미러 (리믹스)', 118, 38, [0, 6, 5, 6], 113),
    T('kp-candy', 'Candy Rocket (Remix)', '캔디 로켓 (리믹스)', 120, 44, [0, 4, 5, 3], 127, { major: true }),
    T('kp-moon', 'Moonwalk Romance (Remix)', '문워크 로맨스 (리믹스)', 112, 39, [5, 3, 0, 4], 131),
    T('kp-fever', 'Fever Time (Remix)', '피버 타임 (리믹스)', 124, 41, [0, 5, 3, 4], 137),
    T('kp-encore', 'Encore Encore (Remix)', '앙코르 앙코르 (리믹스)', 116, 43, [3, 4, 2, 5], 139, { major: true }),
  ],
};

// Song layout: [section, bars]. Every song of a genre follows its genre's form.
export const CLUB_FORM = {
  edm: [['intro', 8], ['build', 8], ['drop', 16], ['break', 8], ['build', 8], ['drop', 16], ['outro', 8]],
  hiphop: [['intro', 4], ['verse', 12], ['hook', 12], ['verse', 12], ['hook', 12], ['outro', 4]],
  kpop: [['intro', 8], ['verse', 8], ['build', 8], ['drop', 16], ['verse', 8], ['build', 4], ['drop', 16], ['outro', 4]],
};

// How loud the dance floor feels in each section (0–1), for the lights.
export const SECTION_ENERGY = { intro: 0.35, verse: 0.55, build: 0.7, drop: 1, hook: 1, break: 0.3, outro: 0.4 };

export function songBars(genre) { return CLUB_FORM[genre].reduce((n, [, b]) => n + b, 0); }
export function songSeconds(genre, track) { return (songBars(genre) * 4 * 60) / track.bpm; }

// The section at a bar: { name, bar (within the section), bars, energy }.
export function sectionAt(genre, bar) {
  let from = 0;
  for (const [name, bars] of CLUB_FORM[genre]) {
    if (bar < from + bars) return { name, bar: bar - from, bars, energy: SECTION_ENERGY[name] };
    from += bars;
  }
  return { name: 'outro', bar: 0, bars: 1, energy: SECTION_ENERGY.outro };
}

// Everyone in a club hears the same song at the same moment: the playlist
// runs on the clock, looping forever. Returns { index, pos } (seconds in).
export function playlistAt(genre, seconds) {
  const list = CLUB_TRACKS[genre];
  const lens = list.map((t) => songSeconds(genre, t));
  const cycle = lens.reduce((a, b) => a + b, 0);
  let pos = ((seconds % cycle) + cycle) % cycle;
  for (let i = 0; i < list.length; i++) {
    if (pos < lens[i]) return { index: i, pos };
    pos -= lens[i];
  }
  return { index: 0, pos: 0 };
}
