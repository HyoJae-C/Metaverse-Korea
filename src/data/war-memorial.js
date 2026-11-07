// The War History Museum (전쟁역사박물관), west along Itaewon-ro: a made-up
// museum modelled loosely on the War Memorial of Korea (전쟁기념관), and what
// hangs in its exhibition halls (core/war-memorial.js).
//
// Every photo is one the War Memorial of Korea shares on the KOGL portal
// (kogl.or.kr) under KOGL Type 1 (공공누리 제1유형: 출처표시, free use with
// credit, changes and commercial use allowed). Before adding one, open its
// page (`page` below) and check that it says "제1유형:출처표시"; types 2-4 can't
// be used here. Photos of the building posted by other offices (e.g. 용산구)
// are Type 4 on the same portal, so the building itself is modelled, not
// photographed. KOGL Type 1 also forbids implying that the holder endorses
// us, so the hall shows DISCLAIMER by the door and on each card.
//
// `file` is our compressed copy in public/ (memorial/<id>.jpg, at most 900 px,
// downloaded from each KOGL page). Until a file is there, its frame shows a
// "photo coming soon" card. Descriptions are
// short retellings of the text on each KOGL page.
//
// The Statue of Brothers (형제의 상) is a sculptor's work, so the game leaves
// its spot by the gate empty instead of modelling it.

export const CREDIT = { ko: '전쟁기념관, 공공누리 제1유형', en: 'The War Memorial of Korea, KOGL Type 1' };
export const DISCLAIMER = {
  en: 'The War History Museum is a made-up museum in the game, modelled loosely on the War Memorial of Korea in Yongsan. It is not run by or linked to the War Memorial of Korea. The photos are ones the War Memorial of Korea shares for free use with credit (KOGL Type 1).',
  ko: '전쟁역사박물관은 용산 전쟁기념관을 본떠 만든 게임 속 가상 박물관이에요. 전쟁기념관(전쟁기념사업회)이 운영하거나 관계된 곳이 아니에요. 사진은 전쟁기념관이 공공누리 제1유형(출처표시)으로 공개한 자료예요.',
  ja: '戦争歴史博物館は龍山の戦争記念館をもとにしたゲーム内の架空の博物館です。戦争記念館が運営・関与しているものではありません。写真は戦争記念館が出典表示を条件に公開している資料（公共ヌリ第1類型）です。',
  zh: '战争历史博物馆是参照龙山战争纪念馆制作的游戏内虚构博物馆，并非战争纪念馆运营或相关的场所。照片是战争纪念馆以注明出处为条件公开的资料（公共努里第1类型）。',
};
export const SOURCE = { en: 'See it on the KOGL portal', ko: '공공누리에서 보기', ja: '公共ヌリで見る', zh: '在公共努里查看' };
export const COMING = { ko: '사진 준비 중', en: 'Photo coming soon' };

// Visitor information on the board by the door. Only facts checked against
// the War Memorial's own pages; opening hours change, so the board sends
// visitors to the official site for them.
export const VISIT = {
  ko: ['주소: 서울 용산구 이태원로 29', '가까운 역: 삼각지역 (4·6호선)', '실내 전시실은 2010년부터 무료 관람이에요.', '관람 시간은 공식 홈페이지에서 확인하세요.', 'www.warmemo.or.kr'],
  en: ['29 Itaewon-ro, Yongsan-gu, Seoul', 'Nearest station: Samgakji (Lines 4 and 6)', 'The exhibition halls have been free to visit since 2010.', 'Check opening hours on the official website.', 'www.warmemo.or.kr'],
};

const PAGE = 'https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=';
const HOLDER = { ko: '전쟁기념관 소장', en: 'War Memorial of Korea collection' };
const E = (o) => ({ ...o, page: PAGE + o.kogl, no: `KOGL ${o.kogl}`, file: `memorial/${o.id}.jpg`, artist: o.artist || HOLDER, credit: CREDIT, disclaimer: DISCLAIMER, source: SOURCE });

export const EXHIBITS = [
  // ── Hall A: The Korean War, 1950–1953 ──
  E({
    id: 'incheon-extra', kogl: 58694, era: { ko: '1950년', en: '1950' },
    title: { ko: '진중신문 호외: 인천상륙작전 속보', en: 'Field Newspaper Extra: The Incheon Landing' },
    desc: {
      ko: '동해사령부에서 낸 인천상륙작전 속보 호외예요. 상륙작전이 성공해 서울로 향하고 있다는 소식을 손으로 써서 호외로 나눠 줬어요.',
      en: 'A special edition put out by the East Sea Command with breaking news of the Incheon Landing: the landing had succeeded and the troops were heading for Seoul. It was written out by hand and handed round as an extra.',
    },
  }),
  E({
    id: 'student-soldier', kogl: 58600, era: { ko: '1951년', en: '1951' }, artist: { ko: '정형섭 기증', en: 'Donated by Jeong Hyeong-seop' },
    title: { ko: '학도병의 모습', en: 'A Student Soldier' },
    desc: {
      ko: '기증자는 1950년 9월, 부산 대동중학교 4학년 때 학도병으로 지원 입대했어요. 이 사진은 1951년 5월 전선에서 찍은 모습이에요.',
      en: 'The donor volunteered as a student soldier in September 1950, while in his fourth year at Daedong Middle School in Busan. This photo was taken at the front in May 1951.',
    },
  }),
  E({
    id: 'gangneung-hill', kogl: 58599, era: { ko: '1951년', en: '1951' }, artist: { ko: '정형섭 기증', en: 'Donated by Jeong Hyeong-seop' },
    title: { ko: '강릉 고지 탈환 후 환호하는 모습', en: 'Cheering After Retaking a Hill Near Gangneung' },
    desc: {
      ko: '16세 학도병으로 참전한 기증자가 찍은 사진이에요. 1951년 강릉 고지를 되찾은 뒤 부대원들이 태극기를 들고 환호하고 있어요.',
      en: 'Taken by the donor, who fought as a 16-year-old student soldier. After retaking a hill near Gangneung in 1951, his unit cheers with the Korean flag.',
    },
  }),
  E({
    id: 'armistice-table', kogl: 58726, era: { ko: '2010년 등록', en: 'Registered in 2010' },
    title: { ko: '정전협정 조인 당시 테이블', en: 'The Armistice Signing Table' },
    desc: {
      ko: '1953년 7월 27일 정전협정을 조인할 때 쓰인 테이블이에요. 전쟁기념관이 보관하고 있고, 2010년 문화재로 등록됐어요.',
      en: 'The table used when the Armistice Agreement was signed on 27 July 1953. The War Memorial keeps it, and it was registered as cultural heritage in 2010.',
    },
  }),
  E({
    id: 'wac-insignia', kogl: 58700, era: { ko: '1952년 제정', en: 'Adopted 1952' },
    title: { ko: '여군병과 최초 휘장', en: "First Insignia of the Women's Army Corps" },
    desc: {
      ko: '1952년 5월 28일에 정한 첫 여군병과 휘장이에요. 투구는 신라 화랑의 전신인 원화를 나타내 상무정신을, 인물상은 유관순을 나타내 애국정신을 상징해요.',
      en: "The first insignia of the Women's Army Corps, adopted on 28 May 1952. The helmet stands for the wonhwa, forerunners of Silla's hwarang, and martial spirit; the figure stands for Yu Gwan-sun and love of country.",
    },
  }),
  // ── Hall B: Life in Wartime ──
  E({
    id: 'daegu-station', kogl: 58594, era: { ko: '1952–1953년', en: '1952–1953' }, artist: { ko: 'Ernest Cowell 기증', en: 'Donated by Ernest Cowell' },
    title: { ko: '대구 기차역의 아이들', en: 'Children at Daegu Station' },
    desc: {
      ko: '미 육군 보병 제7사단 소대장으로 1952~1953년에 참전한 기증자가 찍었어요. 대구 기차역에서 만난 아이들의 모습이에요.',
      en: 'Taken by the donor, a platoon leader in the US Army 7th Infantry Division who served in 1952–1953: children he met at Daegu railway station.',
    },
  }),
  E({
    id: 'boy-and-soldier', kogl: 58587, era: { ko: '1950년대', en: '1950s' }, artist: { ko: 'Dale Myers 기증', en: 'Donated by Dale Myers' },
    title: { ko: '어린이와 유엔군', en: 'A Child and a UN Soldier' },
    desc: {
      ko: '참전 용사 Dale Myers가 갖고 있던 1950년대 대구 사진이에요. 2000년 한국을 찾아 기념관을 둘러본 뒤 기증했어요.',
      en: 'A photo from 1950s Daegu kept by veteran Dale Myers, who donated it after visiting the memorial on a trip to Korea in 2000.',
    },
  }),
  E({
    id: 'jige', kogl: 58591, era: { ko: '1950년대', en: '1950s' }, artist: { ko: 'Dale Myers 기증', en: 'Donated by Dale Myers' },
    title: { ko: '지게를 진 노인', en: 'An Old Man with a Jige' },
    desc: {
      ko: '1950년대 대구에서 지게를 지고 가는 노인이에요. 지게는 짐을 등에 지고 나르던 한국의 전통 운반 도구예요.',
      en: 'An old man in 1950s Daegu carrying a jige, the A-frame carrier Koreans used to move loads on their backs.',
    },
  }),
  E({
    id: 'daegu-street', kogl: 58581, era: { ko: '1952년', en: '1952' }, artist: { ko: 'Dale Myers 기증', en: 'Donated by Dale Myers' },
    title: { ko: '1952년 대구 거리', en: 'A Daegu Street, 1952' },
    desc: {
      ko: '전쟁 중의 대구 거리 풍경이에요. 자전거를 타는 아이가 보여요.',
      en: 'A street in Daegu during the war. Look for the child riding a bicycle.',
    },
  }),
  E({
    id: 'town-buildings', kogl: 58601, era: { ko: '1950년대', en: '1950s' }, artist: { ko: 'Allan R. Millet 기증', en: 'Donated by Allan R. Millet' },
    title: { ko: '전쟁 당시 시가지 건물', en: 'Town Buildings During the War' },
    desc: {
      ko: '6·25전쟁 당시 한국의 시가지 건물을 찍은 사진이에요. 2001년에 기증됐어요.',
      en: 'Town buildings in Korea during the Korean War, photographed in the 1950s and donated in 2001.',
    },
  }),
  // ── Lobby wall: about the memorial ──
  E({
    id: 'opening-1994', kogl: 58714, era: { ko: '1994년', en: '1994' },
    title: { ko: '전쟁기념관 개관', en: 'The Memorial Opens' },
    desc: {
      ko: '전쟁기념관은 옛 육군본부 자리에 세워져 1994년 6월 10일 개관식을 열었고, 6월 14일부터 일반에 공개됐어요. 개관식에는 1만 5천여 명이 참석했어요.',
      en: 'Built on the site of the former Army Headquarters, the War Memorial of Korea held its opening ceremony on 10 June 1994, with about 15,000 guests, and opened to the public on 14 June.',
    },
  }),
  E({
    id: 'peace-plaza', kogl: 58742, era: { ko: '2018년', en: '2018' },
    title: { ko: '평화광장', en: 'The Peace Plaza' },
    desc: {
      ko: '전쟁기념관의 6,000㎡ 크기 평화광장은 2018년, 우리나라 최고의 무공훈장인 태극무공훈장 모양으로 새로 꾸며졌어요. 광장 가운데에 "평화를 원하거든 전쟁을 기억하라"는 글이 새겨져 있어요.',
      en: "The 6,000 m² Peace Plaza at the War Memorial of Korea was redesigned in 2018 in the shape of the Order of Military Merit Taeguk, Korea's highest military decoration. Its centre carries the words \"If you want peace, remember war.\"",
    },
  }),
  // ── Memorial room ──
  E({
    id: 'names-of-the-fallen', kogl: 10289, era: { ko: '2019년 촬영', en: 'Photographed 2019' },
    title: { ko: '전사자명비 (국군 및 경찰)', en: 'Names of the Fallen (Armed Forces and Police)' },
    desc: {
      ko: '나라를 지키다 숨진 국군과 경찰을 기리는 전사자명비의 헌시 「님이시여」예요. 유희남이 글을 짓고 조종숙이 글씨를 썼어요. 전사자명비는 전쟁기념관 회랑에 있어요.',
      en: 'The dedication poem "Nim-isiyeo" (O, Honoured Ones) on the memorial walls for Korean soldiers and police who gave their lives. Words by Yu Hui-nam, calligraphy by Jo Jong-suk. The walls of names stand in the corridors of the War Memorial of Korea.',
    },
  }),
];

// Where each photo hangs (core/war-memorial.js).
export const HALLS = {
  A: { name: { ko: '6·25전쟁 1950–1953', en: 'The Korean War 1950–1953' }, photos: ['incheon-extra', 'student-soldier', 'gangneung-hill', 'armistice-table', 'wac-insignia'] },
  B: { name: { ko: '전쟁 속 일상', en: 'Life in Wartime' }, photos: ['daegu-station', 'boy-and-soldier', 'jige', 'daegu-street', 'town-buildings'] },
  lobby: { photos: ['opening-1994', 'peace-plaza'] },
  memorial: { name: { ko: '추모실', en: 'Memorial Room' }, photos: ['names-of-the-fallen'] },
};

export const MEMORIAL_TEXT = {
  look: { en: 'Look at the photo', ko: '사진 보기', ja: '写真を見る', zh: '看照片' },
  flower: { en: 'Lay a flower', ko: '헌화하기', ja: '献花する', zh: '献花' },
  laid: { en: 'You laid a white chrysanthemum in remembrance.', ko: '흰 국화 한 송이를 놓고 추모했어요.', ja: '白い菊を一輪供えて追悼しました。', zh: '你献上一朵白菊花，表达哀思。' },
  remember: { ko: '나라를 위해 목숨을 바친 분들을 기억합니다', en: 'We remember those who gave their lives' },
};
