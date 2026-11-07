// Seoul stamp tour (서울 스탬프 투어): one stamp stand at each place.
// To add a place, add one entry here. Nothing else needs to change.
//   place: { store: 'id' } puts the stand beside that shop's door (and the
//          stamp only exists once that shop is on the map),
//          { store: 'id', room: true, at: [x, z], ry } puts it inside that
//          shop's room (the Namsan summit, a park), at room position x, z,
//          its front facing ry, or
//          { at: [x, z] } puts it at a world position.
//   shape: 'circle' | 'square' — the rubber stamp's frame.
//   icon:  SVG drawn in a 200×200 box, in the stamp's ink colour.
export const STAMPS = [
  {
    // on the Namsan summit plaza (up the cable car), across from the love locks
    id: 'namsan', place: { store: 'namsan-sky-cable', room: true, at: [18.6, -43], ry: -Math.PI / 2 }, color: '#c8323a', shape: 'circle',
    name: { ko: '남산타워', en: 'N Seoul Tower', ja: 'Nソウルタワー', zh: 'N首尔塔' },
    gu: { ko: '용산구', en: 'Yongsan-gu', ja: '龍山区', zh: '龙山区' },
    icon: '<path d="M100 40 v12 M92 58 h16 l-3 10 h-10 z M97 68 l-5 62 h16 l-5 -62 M86 130 h28" /><circle cx="100" cy="62" r="2"/><path d="M60 138 q20 -18 40 -6 q22 -14 42 6" />',
  },
  {
    id: 'museum', place: { store: 'national-museum' }, color: '#2b4c8c', shape: 'square',
    name: { ko: '국립중앙미술관', en: 'National Art Museum', ja: '国立中央美術館', zh: '国立中央美术馆' },
    gu: { ko: '용산구', en: 'Yongsan-gu', ja: '龍山区', zh: '龙山区' },
    icon: '<rect x="66" y="62" width="68" height="56" rx="2"/><rect x="73" y="69" width="54" height="42"/><path d="M76 106 l15 -18 l10 11 l8 -8 l15 15" /><circle cx="114" cy="80" r="4"/>',
  },
  {
    id: 'hongdae', place: { at: [-2954, -703] }, color: '#7b3fa0', shape: 'circle',
    name: { ko: '홍대 버스킹존', en: 'Hongdae Busking', ja: '弘大バスキング', zh: '弘大街头表演' },
    gu: { ko: '마포구', en: 'Mapo-gu', ja: '麻浦区', zh: '麻浦区' },
    icon: '<path d="M84 128 a14 14 0 1 1 10 -24 l20 -36 l8 4 l-20 36 a14 14 0 0 1 -18 20 z"/><path d="M114 62 l10 5 M126 92 v-20 l14 -4 v20"/><circle cx="122" cy="94" r="4"/><circle cx="136" cy="90" r="4"/>',
  },
  {
    id: 'seongsu', place: { at: [92, 219] }, color: '#e0662a', shape: 'square',
    name: { ko: '성수 팝업스토어', en: 'Seongsu Pop-up', ja: '聖水ポップアップ', zh: '圣水快闪店' },
    gu: { ko: '성동구', en: 'Seongdong-gu', ja: '城東区', zh: '城东区' },
    icon: '<path d="M64 84 l36 -26 l36 26 z M68 84 v40 h64 v-40"/><path d="M64 84 q9 10 18 0 q9 10 18 0 q9 10 18 0 q9 10 18 0"/><rect x="90" y="100" width="20" height="24"/>',
  },
  {
    id: 'seoul-forest', place: { at: [-196.6, 338], ry: -1.5708 }, color: '#3f8a52', shape: 'circle', // beside the chocolate cone, end of Metasequoia Avenue
    name: { ko: '서울숲', en: 'Seoul Forest', ja: 'ソウルの森', zh: '首尔林' },
    gu: { ko: '성동구', en: 'Seongdong-gu', ja: '城東区', zh: '城东区' },
    icon: '<path d="M78 128 v-20 M78 108 l-20 0 l20 -30 l20 30 z M78 92 l-14 0 l14 -22 l14 22 z"/><path d="M128 128 l-14 -44 h28 z"/><path d="M112 84 a16 14 0 0 1 32 0 a16 10 0 0 1 -32 0 z"/><path d="M56 128 h88"/>',
  },
  {
    // in the Ttukseom Han River Park room, on the lawn just inside the
    // entrance, facing you as you walk in (the river and the pier ahead)
    id: 'hangang', place: { store: 'ttukseom-hangang', room: true, at: [2.4, 11], ry: 0 }, color: '#1d6fb8', shape: 'square',
    name: { ko: '뚝섬 한강공원', en: 'Ttukseom Han River Park', ja: 'トゥクソム漢江公園', zh: '纛岛汉江公园' },
    gu: { ko: '광진구', en: 'Gwangjin-gu', ja: '広津区', zh: '广津区' },
    // a duck boat (오리배) on the river
    icon: '<path d="M60 104 h64 q14 0 18 -10 M60 104 q2 16 18 16 h42 q16 0 20 -26"/><path d="M122 104 q-2 -14 4 -24 M136 80 q4 10 -2 24"/><circle cx="130" cy="70" r="11"/><path d="M140 66 l12 4 l-11 4"/><circle cx="132" cy="67" r="2"/><path d="M62 82 h56 M68 82 v22 M112 82 v22"/><path d="M52 132 q12 -7 24 0 q12 7 24 0 q12 -7 24 0 q12 7 24 0"/>',
  },
  {
    id: 'gyeongbokgung', place: { at: [-1723, -1018] }, color: '#b0282e', shape: 'circle',
    name: { ko: '경복궁', en: 'Gyeongbokgung', ja: '景福宮', zh: '景福宫' },
    gu: { ko: '종로구', en: 'Jongno-gu', ja: '鍾路区', zh: '钟路区' },
    icon: '<path d="M56 82 q44 -26 88 0 q-6 -2 -10 2 h-68 q-4 -4 -10 -2 z"/><path d="M70 84 v8 h60 v-8 M64 92 q36 -12 72 0 M72 96 v28 M128 96 v28 M88 96 v28 M112 96 v28 M60 126 h80"/>',
  },
  {
    id: 'suragan', place: { store: 'sonmat-kimchi' }, color: '#1f7a5c', shape: 'square',
    name: { ko: '수라간', en: 'Suragan Kitchen', ja: '水刺間', zh: '水剌间' },
    gu: { ko: '종로구', en: 'Jongno-gu', ja: '鍾路区', zh: '钟路区' },
    icon: '<path d="M64 98 h72 q-4 26 -36 26 q-32 0 -36 -26 z M60 98 h80"/><path d="M84 88 q-6 -8 0 -16 q6 -8 0 -16 M100 88 q-6 -8 0 -16 q6 -8 0 -16 M116 88 q-6 -8 0 -16 q6 -8 0 -16"/>',
  },
  {
    id: 'seokchon', place: { at: [345, 576] }, color: '#1e7fa8', shape: 'circle',
    name: { ko: '석촌호수', en: 'Seokchon Lake', ja: '石村湖', zh: '石村湖' },
    gu: { ko: '송파구', en: 'Songpa-gu', ja: '松坡区', zh: '松坡区' },
    icon: '<path d="M58 104 q10 -8 21 0 q10 8 21 0 q10 -8 21 0 q10 8 21 0 M58 120 q10 -8 21 0 q10 8 21 0 q10 -8 21 0 q10 8 21 0"/><path d="M80 92 v-22 M80 70 q-14 4 -12 16 M80 70 q14 4 12 16 M80 70 q-8 -10 -18 -6 M80 70 q8 -10 18 -6"/><path d="M118 92 q0 -16 12 -24 q-2 14 8 24 z"/>',
  },
  {
    id: 'hyojae', place: { store: 'hyojae-academy' }, color: '#3d3a8a', shape: 'square',
    name: { ko: '효재대학교', en: 'Hyojae University', ja: 'ヒョジェ大学', zh: '孝才大学' },
    gu: { ko: '서대문구', en: 'Seodaemun-gu', ja: '西大門区', zh: '西大门区' },
    icon: '<path d="M100 60 l42 16 l-42 16 l-42 -16 z M76 84 v18 q24 14 48 0 v-18 M138 78 v22"/><path d="M70 120 h28 q2 0 2 3 q0 -3 2 -3 h28 v10 h-28 q-2 0 -2 3 q0 -3 -2 -3 h-28 z"/>',
  },
];
