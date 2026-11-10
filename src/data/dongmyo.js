// Dongmyo (동묘), Jongno-gu: the shrine and the flea market beside it, laid
// out by scripts/build-dongmyo.mjs (world metres, x east, z south; the
// streets and the shrine are in scripts/data/dongmyo-osm.json).
//
// The real Dongmyo flea market spreads through the lanes round the shrine;
// here it is one open block between Jibong-ro, Jong-ro and the lane along
// the shrine's west wall, with stalls round its edge and Potato Market's mat
// spots in the middle (src/game/potato-market.js).

const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });

export const DONGMYO = {
  district: 'dongmyo',
  gateW: 3.2, // the main gate's opening
  innerGateAt: 7.5, // m from the main gate up the axis: 내삼문
  hall: { w: 7, d: 4.6 }, // Jeongjeon at 1/4 (its real footprint is about 28 x 18 m)
  sideHallAt: 11, sideHallOff: 4.6, // 동무, 서무 either side of the yard
  market: {
    plaza: [[-876, -787.5], [-847, -798], [-835.5, -778], [-828.5, -760], [-830, -753], [-876, -753]],
    center: [-853, -769],
    // Mat spots [x, z, ry]: a 2.6 m mat each, a walk between.
    mats: [-760, -769, -778].flatMap((z) => [-865, -857, -849, -841].map((x) => [x, z, 0])),
    // Stalls round the edge: their front (+z in their own metres) faces the middle.
    stalls: [
      ...[-757, -763, -769, -775, -781].map((z, i) => ({ at: [-873, z], ry: Math.PI / 2, c: i })),
      ...[[-866, -789.3], [-858, -792.2]].map(([x, z], i) => ({ at: [x, z], ry: 0.34, c: 5 + i })),
      ...[[-862, -755.5], [-852, -755.5], [-842, -755.5]].map(([x, z], i) => ({ at: [x, z], ry: Math.PI, c: 7 + i })),
    ],
    // The market's board on the plaza's middle line, north of the mats,
    // reading south into the market; 1.4x a park sign with a short text so
    // it reads from the mats (Yozi 2026-11-11).
    sign: {
      at: [-853, -784.5], ry: 0, sc: 1.4, fs: 46,
      title: N('감자마켓', 'Potato Market', 'ポテトマーケット', '土豆市场'),
      text: {
        en: 'Spread a mat and sell clothes you bought. They sell even while you are away.',
        ko: '돗자리를 펴고 내가 산 옷을 팔아요. 내가 없어도 팔려요.',
        ja: 'シートを広げて、買った服を売ろう。留守の間も売れます。',
        zh: '铺开垫子，卖你买的衣服。你不在时也能卖出。',
      },
    },
  },
  // The real hanok cluster south-east of the shrine (OSM 동묘한옥밀집구역)
  // is left out: the game's Cheonggyecheon-ro runs there (the stream's north
  // road keeps game distance from the water, about 25 m north of the real
  // road at this end).
  // Rows of buildings along the streets (scripts/build-dongmyo.mjs): side -1
  // is left of the road's direction (north of Jong-ro, west of Jibong-ro).
  rows: [
    { road: 'Jong-ro', side: -1, from: 10, to: 200, width: 12, gap: 2, depth: 10, h: [10, 22] },
    { road: 'Jong-ro', side: 1, from: 10, to: 200, width: 11, gap: 2, depth: 9, h: [8, 16] },
    { road: 'Jibong-ro', side: -1, from: 2, to: 200, width: 11, gap: 2, depth: 9, h: [8, 18] },
    { road: 'Jibong-ro', side: 1, from: 2, to: 200, width: 11, gap: 2, depth: 9, h: [8, 16] },
  ],
};
