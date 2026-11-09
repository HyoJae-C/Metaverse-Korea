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
    id: 'war-memorial', place: { store: 'war-memorial' }, color: '#4a5560', shape: 'square',
    name: { ko: '전쟁역사박물관', en: 'War History Museum', ja: '戦争歴史博物館', zh: '战争历史博物馆' },
    gu: { ko: '용산구', en: 'Yongsan-gu', ja: '龍山区', zh: '龙山区' },
    icon: '<path d="M62 128 h76 M68 128 v-36 h64 v36 M64 92 h72"/><path d="M80 92 a20 20 0 0 1 40 0"/><path d="M100 72 v-8 M80 128 v-28 M93 128 v-28 M107 128 v-28 M120 128 v-28"/>',
  },
  {
    id: 'hongdae', place: { at: [-2965, -269] }, color: '#7b3fa0', shape: 'circle',
    name: { ko: '홍대 버스킹존', en: 'Hongdae Busking', ja: '弘大バスキング', zh: '弘大街头表演' },
    gu: { ko: '마포구', en: 'Mapo-gu', ja: '麻浦区', zh: '麻浦区' },
    icon: '<path d="M84 128 a14 14 0 1 1 10 -24 l20 -36 l8 4 l-20 36 a14 14 0 0 1 -18 20 z"/><path d="M114 62 l10 5 M126 92 v-20 l14 -4 v20"/><circle cx="122" cy="94" r="4"/><circle cx="136" cy="90" r="4"/>',
  },
  {
    id: 'seongsu', place: { at: [19.3, 105.4] }, color: '#e0662a', shape: 'square',
    name: { ko: '성수 팝업스토어', en: 'Seongsu Pop-up', ja: '聖水ポップアップ', zh: '圣水快闪店' },
    gu: { ko: '성동구', en: 'Seongdong-gu', ja: '城東区', zh: '城东区' },
    icon: '<path d="M64 84 l36 -26 l36 26 z M68 84 v40 h64 v-40"/><path d="M64 84 q9 10 18 0 q9 10 18 0 q9 10 18 0 q9 10 18 0"/><rect x="90" y="100" width="20" height="24"/>',
  },
  {
    id: 'seoul-forest', place: { at: [-334.6, 92], ry: -1.5708 }, color: '#3f8a52', shape: 'circle', // at the far (south) end of Metasequoia Avenue
    name: { ko: '서울숲', en: 'Seoul Forest', ja: 'ソウルの森', zh: '首尔林' },
    gu: { ko: '성동구', en: 'Seongdong-gu', ja: '城東区', zh: '城东区' },
    icon: '<path d="M78 128 v-20 M78 108 l-20 0 l20 -30 l20 30 z M78 92 l-14 0 l14 -22 l14 22 z"/><path d="M128 128 l-14 -44 h28 z"/><path d="M112 84 a16 14 0 0 1 32 0 a16 10 0 0 1 -32 0 z"/><path d="M56 128 h88"/>',
  },
  {
    // at the west end of the drone show's lawn, in the park laid on the
    // street (scripts/build-seongsu.mjs), the river ahead
    id: 'hangang', place: { at: [283.8, 419.7], ry: 2.981 }, color: '#1d6fb8', shape: 'square',
    name: { ko: '뚝섬 한강공원', en: 'Ttukseom Han River Park', ja: 'トゥクソム漢江公園', zh: '纛岛汉江公园' },
    gu: { ko: '광진구', en: 'Gwangjin-gu', ja: '広津区', zh: '广津区' },
    // a duck boat (오리배) on the river
    icon: '<path d="M60 104 h64 q14 0 18 -10 M60 104 q2 16 18 16 h42 q16 0 20 -26"/><path d="M122 104 q-2 -14 4 -24 M136 80 q4 10 -2 24"/><circle cx="130" cy="70" r="11"/><path d="M140 66 l12 4 l-11 4"/><circle cx="132" cy="67" r="2"/><path d="M62 82 h56 M68 82 v22 M112 82 v22"/><path d="M52 132 q12 -7 24 0 q12 7 24 0 q12 -7 24 0 q12 7 24 0"/>',
  },
  {
    // Ttukseom's drone light show (core/drone-show.js): the stand is only on
    // the lawn (in front of the barge) while the drones are up, so this stamp means you saw a show.
    id: 'drone-show', place: { at: [308.9, 424.7], ry: 2.981 }, onlyDuring: 'droneShow', color: '#3b3f9e', shape: 'circle',
    name: { ko: '뚝섬 드론쇼', en: 'Ttukseom Drone Show', ja: 'トゥクソム・ドローンショー', zh: '纛岛无人机表演' },
    gu: { ko: '광진구', en: 'Gwangjin-gu', ja: '広津区', zh: '广津区' },
    // drones drawing a heart over the river
    icon: '<path d="M100 122 l-26 -26 a14 14 0 0 1 26 -18 a14 14 0 0 1 26 18 z" stroke-dasharray="3 7" stroke-linecap="round"/><circle cx="72" cy="70" r="3"/><circle cx="130" cy="66" r="3"/><circle cx="140" cy="92" r="2.5"/><circle cx="62" cy="96" r="2.5"/><path d="M64 136 q9 -6 18 0 q9 6 18 0 q9 -6 18 0 q9 6 18 0"/>',
  },
  {
    id: 'gyeongbokgung', place: { at: [-1734, -900] }, color: '#b0282e', shape: 'circle', // right in front of Gwanghwamun, beside the Enter spot
    name: { ko: '경복궁', en: 'Gyeongbokgung', ja: '景福宮', zh: '景福宫' },
    gu: { ko: '종로구', en: 'Jongno-gu', ja: '鍾路区', zh: '钟路区' },
    icon: '<path d="M56 82 q44 -26 88 0 q-6 -2 -10 2 h-68 q-4 -4 -10 -2 z"/><path d="M70 84 v8 h60 v-8 M64 92 q36 -12 72 0 M72 96 v28 M128 96 v28 M88 96 v28 M112 96 v28 M60 126 h80"/>',
  },
  {
    // at the Open House gate, up the lane from Bukchon-ro 5-gil
    id: 'bukchon', place: { at: [-1495, -935] }, color: '#5a4a3a', shape: 'square',
    name: { ko: '북촌한옥마을', en: 'Bukchon Hanok Village', ja: '北村韓屋村', zh: '北村韩屋村' },
    gu: { ko: '종로구', en: 'Jongno-gu', ja: '鍾路区', zh: '钟路区' },
    // a hanok roof over a gate
    icon: '<path d="M52 92 q48 -34 96 0 q-6 -3 -12 1 h-72 q-6 -4 -12 -1 z"/><path d="M66 94 v32 h68 v-32 M88 126 v-22 h24 v22 M100 104 v22"/><path d="M60 92 l-6 -4 M140 92 l6 -4"/>',
  },
  {
    // on Jongmyo Square, beside Oedaemun (the shrine's main gate on Jongno)
    id: 'jongmyo', place: { at: [-1371, -781] }, color: '#7a2e22', shape: 'circle',
    name: { ko: '종묘', en: 'Jongmyo Shrine', ja: '宗廟', zh: '宗庙' },
    gu: { ko: '종로구', en: 'Jongno-gu', ja: '鍾路区', zh: '钟路区' },
    // the long hall on its terrace, with the three-strip stone path
    icon: '<path d="M40 92 q60 -18 120 0 q-4 -2 -8 2 h-104 q-4 -4 -8 -2 z"/><path d="M48 94 v22 h104 v-22 M60 94 v22 M72 94 v22 M84 94 v22 M96 94 v22 M108 94 v22 M120 94 v22 M132 94 v22 M144 94 v22"/><path d="M36 122 h128 M44 128 h112"/><path d="M92 128 l-4 18 M108 128 l4 18 M100 128 v18"/>',
  },
  {
    // on Heunginjimun's lawn, by the walk up from Ogansugyo Bridge
    id: 'heunginjimun', place: { at: [-1011, -817] }, color: '#2b5f8a', shape: 'square',
    name: { ko: '흥인지문', en: 'Heunginjimun', ja: '興仁之門', zh: '兴仁之门' },
    gu: { ko: '종로구', en: 'Jongno-gu', ja: '鍾路区', zh: '钟路区' },
    // the gate with the half-moon ongseong in front
    icon: '<path d="M70 120 h60 v-22 h-60 z M94 120 v-10 q6 -8 12 0 v10"/><path d="M62 98 q38 -22 76 0 q-5 -2 -8 2 h-60 q-3 -4 -8 -2 z"/><path d="M76 90 q24 -14 48 0"/><path d="M40 126 q60 30 120 0"/><path d="M40 126 v-10 M160 126 v-10"/>',
  },
  {
    // in Dongdaemun History & Culture Park, by the city wall's water gate
    id: 'igansumun', place: { at: [-1096, -503] }, color: '#6a5a3a', shape: 'circle',
    name: { ko: '이간수문', en: 'Igansumun Water Gate', ja: '二間水門', zh: '二间水门' },
    gu: { ko: '중구', en: 'Jung-gu', ja: '中区', zh: '中区' },
    // the wall with its two arches over water
    icon: '<path d="M40 70 h120 v56 h-120 z"/><path d="M66 126 v-22 q14 -18 28 0 v22 M106 126 v-22 q14 -18 28 0 v22"/><path d="M40 70 v-10 h12 v10 M64 70 v-10 h12 v10 M88 70 v-10 h12 v10 M112 70 v-10 h12 v10 M136 70 v-10 h12 v10"/><path d="M36 140 q14 -6 28 0 q14 6 28 0 q14 -6 28 0 q14 6 28 0 q14 -6 28 0"/>',
  },
  {
    // on Sungnyemun's lawn, south of the gate
    id: 'sungnyemun', place: { at: [-1781, -408] }, color: '#8a3a2a', shape: 'square',
    name: { ko: '숭례문', en: 'Sungnyemun', ja: '崇礼門', zh: '崇礼门' },
    gu: { ko: '중구', en: 'Jung-gu', ja: '中区', zh: '中区' },
    // the gate: a stone base with its arch, two tiled roofs
    icon: '<path d="M46 132 h108 v-28 h-108 z M92 132 v-14 q8 -10 16 0 v14"/><path d="M58 104 v-10 h84 v10"/><path d="M40 94 q60 -26 120 0 q-6 -2 -10 2 h-100 q-4 -4 -10 -2 z"/><path d="M70 86 v-10 h60 v10"/><path d="M56 76 q44 -22 88 0 q-6 -2 -10 2 h-68 q-4 -4 -10 -2 z"/>',
  },
  {
    // on DDP's front plaza
    id: 'ddp', place: { at: [-1035, -468] }, color: '#5d6470', shape: 'circle',
    name: { ko: '동대문디자인플라자', en: 'Dongdaemun Design Plaza', ja: '東大門デザインプラザ', zh: '东大门设计广场' },
    gu: { ko: '중구', en: 'Jung-gu', ja: '中区', zh: '中区' },
    // the long, curved building with its roof walk
    icon: '<path d="M44 124 q-4 -30 26 -38 q30 -8 60 -4 q30 4 28 30 q-2 12 -14 12 h-88 q-10 0 -12 0 z"/><path d="M62 96 q38 -10 76 -2"/><path d="M60 110 q40 -8 84 0"/><path d="M90 124 v-12 h20 v12"/><path d="M36 138 h128"/>',
  },
  {
    id: 'suragan', place: { store: 'sonmat-kimchi' }, color: '#1f7a5c', shape: 'square',
    name: { ko: '수라간', en: 'Suragan Kitchen', ja: '水刺間', zh: '水剌间' },
    gu: { ko: '종로구', en: 'Jongno-gu', ja: '鍾路区', zh: '钟路区' },
    icon: '<path d="M64 98 h72 q-4 26 -36 26 q-32 0 -36 -26 z M60 98 h80"/><path d="M84 88 q-6 -8 0 -16 q6 -8 0 -16 M100 88 q-6 -8 0 -16 q6 -8 0 -16 M116 88 q-6 -8 0 -16 q6 -8 0 -16"/>',
  },
  {
    // on the west lake's south shore (Songpa's map, local 470, 345)
    id: 'seokchon', place: { at: [908, 1116] }, color: '#1e7fa8', shape: 'circle',
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
  {
    // on the forest path's lawn in Yeonnam-dong, beside the old rails
    id: 'yeonnam', place: { at: [-2971, -425], ry: Math.PI / 2 }, color: '#3f7a4f', shape: 'circle',
    name: { ko: '경의선숲길', en: 'Gyeongui Line Forest Park', ja: '京義線森の道', zh: '京义线林荫路' },
    gu: { ko: '마포구', en: 'Mapo-gu', ja: '麻浦区', zh: '麻浦区' },
    // a tree beside a stretch of railway
    icon: '<path d="M60 132 l20 -60 M140 132 l-20 -60 M66 116 h68 M71 100 h58 M76 86 h48"/><path d="M100 70 q-22 -2 -18 -20 q4 -16 18 -12 q14 -4 18 12 q4 18 -18 20 z M100 70 v26"/>',
  },
  {
    // beside the south gate of Mangwon Market (scripts/build-mangwon.mjs: market.gate)
    id: 'mangwon-market', place: { at: [-3285.3, -294.8] }, color: '#c0392b', shape: 'square',
    name: { ko: '망원시장', en: 'Mangwon Market', ja: '望遠市場', zh: '望远市场' },
    gu: { ko: '마포구', en: 'Mapo-gu', ja: '麻浦区', zh: '麻浦区' },
    // the arcade roof over a stall, a croquette on a skewer
    icon: '<path d="M56 96 q44 -40 88 0 M60 96 v32 M140 96 v32 M56 128 h88"/><path d="M72 112 h56 v16 h-56 z"/><ellipse cx="100" cy="84" rx="12" ry="8"/><path d="M100 92 v12"/>',
  },
  {
    // where the way down from Mangwon-ro meets the river, in the park laid on the street (scripts/build-mapo.mjs prints the spot)
    id: 'mangwon-pier', place: { at: [-3524.9, -267.9], ry: 3.9794 }, color: '#2f78b0', shape: 'circle',
    name: { ko: '망원한강공원', en: 'Mangwon Han River Park', ja: '望遠漢江公園', zh: '望远汉江公园' },
    gu: { ko: '마포구', en: 'Mapo-gu', ja: '麻浦区', zh: '麻浦区' },
    // a fishing rod with a fish on the line, over the waves
    icon: '<path d="M58 70 q40 -10 70 30 M128 100 v12"/><path d="M114 116 q14 -12 28 0 q-14 12 -28 0 z M142 116 l8 -6 v12 z"/><path d="M52 136 q12 -7 24 0 q12 7 24 0 q12 -7 24 0 q12 7 24 0"/>',
  },
  {
    // at the west end of Moonlight Square, in the park laid on the street (scripts/build-banpo.mjs prints the spot)
    id: 'banpo-jamwon', place: { at: [-1253.4, 832.7], ry: 2.3081 }, color: '#3a6fc9', shape: 'circle',
    name: { ko: '반포·잠원 한강공원', en: 'Banpo-Jamwon Han River Park', ja: '盤浦・蚕院漢江公園', zh: '盘浦·蚕院汉江公园' },
    gu: { ko: '서초구', en: 'Seocho-gu', ja: '瑞草区', zh: '瑞草区' },
    // Banpo Bridge on its piers, with arcs of water falling from its side
    icon: '<path d="M50 92 h100 M50 100 h100 M66 100 v32 M100 100 v32 M134 100 v32"/><path d="M62 92 q-6 -18 -12 -6 M86 92 q-6 -22 -14 -8 M110 92 q-6 -22 -14 -8 M134 92 q-6 -18 -12 -6"/><path d="M48 138 q13 -7 26 0 q13 7 26 0 q13 -7 26 0 q13 7 26 0"/>',
  },
  {
    // in the fishing corner towards the 63 tower, in the park laid on the street (scripts/build-yeouido.mjs prints the spot)
    id: 'yeouido', place: { at: [-2491.3, 655.1], ry: 0.7679 }, color: '#1f8fa3', shape: 'circle',
    name: { ko: '여의도 한강공원', en: 'Yeouido Han River Park', ja: '汝矣島漢江公園', zh: '汝矣岛汉江公园' },
    gu: { ko: '영등포구', en: 'Yeongdeungpo-gu', ja: '永登浦区', zh: '永登浦区' },
    // the island in the river, the 63 tower on its tip and Seogang Bridge's arch
    icon: '<path d="M126 128 v-70 l8 -6 l8 6 v70"/><path d="M134 52 v-10"/><path d="M48 128 q20 -30 40 0 M48 128 h48"/><path d="M40 128 q60 -12 120 0"/><path d="M44 144 q13 -7 26 0 q13 7 26 0 q13 -7 26 0 q13 7 26 0"/>',
  },
  {
    // on the gate plaza of Children's Grand Park, beside the rainbow gate
    id: 'grand-park', place: { at: [452, -81], ry: -1.5708 }, color: '#e08a2e', shape: 'circle',
    name: { ko: '서울어른도대공원', en: "Grown-ups' Grand Park", ja: 'ソウル大人も大公園', zh: '首尔大人也大公园' },
    gu: { ko: '광진구', en: 'Gwangjin-gu', ja: '広津区', zh: '广津区' },
    // a lion's face in its mane
    icon: '<circle cx="100" cy="100" r="40"/><circle cx="100" cy="102" r="24"/><circle cx="91" cy="96" r="3"/><circle cx="109" cy="96" r="3"/><path d="M95 108 l5 5 l5 -5 M100 113 v6"/><path d="M76 72 l-6 -8 M124 72 l6 -8"/>',
  },  {
    // on KONEXT Square by Samseong Station, in front of the aquarium pavilion
    id: 'konext', place: { at: [149, 874], ry: Math.PI / 2 }, color: '#1d5fa8', shape: 'square',
    name: { ko: '코넥스트', en: 'KONEXT', ja: 'コネクスト', zh: 'KONEXT' },
    gu: { ko: '강남구', en: 'Gangnam-gu', ja: '江南区', zh: '江南区' },
    // the mall's long front with its wave skylight, over a wave
    icon: '<path d="M52 120 h96 M56 120 v-34 h88 v34 M56 98 h88"/><path d="M70 86 q8 -14 15 0 q8 -14 15 0 q8 -14 15 0 q8 -14 15 0"/><path d="M50 138 q12 -7 25 0 q12 7 25 0 q12 -7 25 0 q12 7 25 0"/>',
  },
  {
    // on the concourse of Seoul Another Dome, left of the door as you come in
    id: 'another-dome', place: { store: 'seoul-another-dome', room: true, at: [-14, 54.5], ry: 2.89 }, color: '#1f4f8f', shape: 'circle',
    name: { ko: '서울 어나더 돔', en: 'Seoul Another Dome', ja: 'ソウル・アナザードーム', zh: '首尔另一个巨蛋' },
    gu: { ko: '송파구', en: 'Songpa-gu', ja: '松坡区', zh: '松坡区' },
    // a baseball with its stitches, and a bat across it
    icon: '<circle cx="92" cy="104" r="30"/><path d="M72 82 q12 22 0 44 M112 82 q-12 22 0 44"/><path d="M118 70 l34 -34 l8 8 l-34 34 z M118 70 l-8 8"/>',
  },
];
