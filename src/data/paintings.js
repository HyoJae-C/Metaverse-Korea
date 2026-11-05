// Old Korean paintings in the museum south of Itaewon (core/museum.js).
//
// Every image comes from the National Museum of Korea's collection site and
// is released there under KOGL Type 1 (공공누리 제1유형: 출처표시, free use with
// credit). Before adding one, open its page (`page` below) and check that it
// shows the 공공누리 1유형 badge; types 2-4 (no commercial use / no changes)
// can't be used here. KOGL Type 1 also forbids implying that the museum
// endorses us, so the gallery shows DISCLAIMER by the door and in the card.
//
// `src` is the museum's 700 px image; `file` is our compressed copy in
// public/ (made by scripts/fetch-paintings.mjs, about 100 KB each), loaded
// only when you walk into the museum. `w`/`h` give the shape on the wall.
// Descriptions are short retellings of the museum's own text.

export const CREDIT = { ko: '국립중앙박물관, 공공누리 제1유형', en: 'National Museum of Korea, KOGL Type 1' };
export const DISCLAIMER = {
  en: 'A place in the game, not run by or linked to the real National Museum of Korea. The paintings are images the museum shares for free use with credit.',
  ko: '실제 국립중앙박물관과 관계없는 게임 속 공간이에요. 그림은 국립중앙박물관이 출처 표시 조건으로 공개한 이미지예요.',
  ja: 'ゲームの中の空間で、実際の国立中央博物館とは関係ありません。絵は博物館が出典表示を条件に公開している画像です。',
  zh: '这是游戏里的空间，与真实的国立中央博物馆无关。画作图片由博物馆以注明出处为条件公开。',
  es: 'Un lugar del juego, sin relación con el Museo Nacional de Corea real. Las pinturas son imágenes que el museo comparte con libre uso citando la fuente.',
  id: 'Tempat di dalam game, tidak terkait dengan Museum Nasional Korea yang asli. Lukisan adalah gambar yang dibagikan museum untuk dipakai bebas dengan mencantumkan sumber.',
  vi: 'Một nơi trong trò chơi, không liên quan đến Bảo tàng Quốc gia Hàn Quốc thật. Tranh là ảnh bảo tàng công bố cho dùng tự do khi ghi nguồn.',
  hi: 'यह गेम के अंदर की जगह है, असली राष्ट्रीय कोरिया संग्रहालय से इसका कोई संबंध नहीं। चित्र संग्रहालय द्वारा स्रोत बताने की शर्त पर मुफ़्त उपयोग के लिए दी गई तस्वीरें हैं।',
  ar: 'مكان داخل اللعبة، لا علاقة له بالمتحف الوطني الكوري الحقيقي. اللوحات صور يتيحها المتحف للاستخدام الحر مع ذكر المصدر.',
};

const PAGE = 'https://www.museum.go.kr/MUSEUM/contents/M0502000000.do?schM=view&searchId=search&relicId=';
const IMG = 'https://www.museum.go.kr/relic_image//PS01001001/';
const HONGDO = { ko: '김홍도', en: 'Kim Hong-do' };
const HONGDO_ERA = { ko: '조선, 18세기 후반', en: 'Joseon, late 18th century' };
const ALBUM = { ko: '《단원 풍속도첩》, 보물', en: 'Album of Genre Paintings by Danwon, Treasure' };
const P = (o) => ({ ...o, page: PAGE + o.relicId, file: `museum/${o.id}.jpg` });

export const PAINTINGS = [
  P({
    id: 'ssireum', relicId: 551, no: '본관6504-22', src: IMG + 'bon006/2016/1213161649247/700/bon006504-22-01.jpg', w: 222, h: 269,
    title: { ko: '씨름', en: 'Ssireum (Korean Wrestling)' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '김홍도 풍속화를 대표하는 그림이에요. 구경꾼들을 위아래에 둥글게 앉히고, 가운데에서 두 씨름꾼이 힘을 겨뤄요. 왼쪽의 엿장수와 벗어 놓은 신발도 찾아보세요.',
      en: "One of Kim Hong-do's best-known genre scenes. The crowd sits in a ring at the top and bottom, and two wrestlers grapple in the middle. Look for the taffy seller on the left and the shoes left on the ground.",
    },
  }),
  P({
    id: 'jumak', relicId: 537, no: '본관6504-8', src: IMG + 'bon006/2016/1213161649247/700/bon006504-08-01.jpg', w: 239, h: 280,
    title: { ko: '주막', en: 'Tavern' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '길을 가던 사람들이 길가 주막에서 요기하는 모습이에요. 국자로 막걸리를 뜨는 주모와 부뚜막 위 그릇들이 그 시절 주막 풍경을 보여 줘요.',
      en: 'Travellers stop for a bite at a roadside tavern. The hostess ladles out makgeolli (rice wine), and the bowls on the stove show what an inn of the time looked like.',
    },
  }),
  P({
    id: 'umulga', relicId: 540, no: '본관6504-11', src: IMG + 'bon006/2016/1213161649247/700/bon006504-11-01.jpg', w: 239, h: 281,
    title: { ko: '우물가', en: 'At the Well' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '여인들이 모인 우물가에 한 남자가 가슴을 드러낸 채 물을 마셔요. 여인들은 수줍어 고개를 돌려요. 남녀를 엄격히 구별하던 조선의 풍속이 보여요.',
      en: 'A man with his shirt open gulps water at a well where women have gathered, and they shyly look away. It shows how strictly Joseon kept men and women apart.',
    },
  }),
  P({
    id: 'dambae', relicId: 541, no: '본관6504-12', src: IMG + 'bon006/2016/1213161649247/700/bon006504-12-01.jpg', w: 239, h: 280,
    title: { ko: '담배썰기', en: 'Cutting Tobacco' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '넓은 담뱃잎의 줄기를 골라내고 작두로 썰고 있어요. 더워서 저고리를 벗은 일꾼들 옆에서 주인은 책을 펴 놓고 있어요.',
      en: 'Workers strip big tobacco leaves and slice them with a fodder cutter. It is hot enough to work without jackets, yet the owner sits nearby with a book open.',
    },
  }),
  P({
    id: 'geurimgamsang', relicId: 544, no: '본관6504-15', src: IMG + 'bon006/2016/1213161649247/700/bon006504-15-01.jpg', w: 239, h: 281,
    title: { ko: '그림감상', en: 'Viewing a Painting' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '선비들이 긴 그림을 펼쳐 들고 둘러서서 감상해요. 침이 튈까 봐 부채로 입을 가린 사람이 눈에 띄어요. 종이에 아무것도 그려져 있지 않아 무엇을 보는지는 몰라요.',
      en: 'Scholars crowd round a long scroll, looking very serious. One holds a fan over his mouth so he will not spit on it. The paper is left blank, so we never find out what they are looking at.',
    },
  }),
  P({
    id: 'pyeonja', relicId: 546, no: '본관6504-17', src: IMG + 'bon006/2016/1213161649247/700/bon006504-17-01.jpg', w: 239, h: 280,
    title: { ko: '편자박기', en: 'Shoeing a Horse' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '말을 눕히고 네 다리를 나무에 묶은 뒤 편자를 박고 있어요. 위쪽에는 땀 흘리는 두 사람이 마실 물이 놓여 있어요.',
      en: 'The horse is laid down with its legs tied to a pole so it cannot kick while the men nail on its shoes. Up in the corner, water waits for the two sweating workers.',
    },
  }),
  P({
    id: 'nongari', relicId: 530, no: '본관6504-1', src: IMG + 'bon006/2016/1213161228096/700/bon006504-01-01.jpg', w: 238, h: 278,
    title: { ko: '논갈이', en: 'Ploughing the Fields' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '김홍도는 소탈한 서민의 생활과 일하는 모습을 많이 그렸어요. 이 그림에서는 소를 몰아 논밭을 갈아요.',
      en: 'Kim Hong-do loved to paint ordinary people at work, with a touch of Korean humour. Here farmers drive oxen to plough the fields.',
    },
  }),
  P({
    id: 'haengsang', relicId: 39197, no: '본관6504-25', src: IMG + 'bon006/2016/1213161649247/700/bon006504-25-01.jpg', w: 237, h: 277,
    title: { ko: '행상', en: 'Peddlers' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '지게를 진 상인과 광주리를 인 아낙이 장사하러 떠나며 헤어지는 모습이에요. 저고리 안에 아이를 업은 엄마의 모습이 재미있어요.',
      en: 'A peddler with an A-frame pack and a woman with a basket on her head part ways as they set off to sell. Notice the baby she carries inside her jacket.',
    },
  }),
  P({
    id: 'tugye', relicId: 4425, no: '덕수2291-14', src: IMG + 'duk002/2016/1220152727617/700/duk002291-14-00.jpg', w: 236, h: 230,
    title: { ko: '투계도', en: 'Cockfight' }, artist: { ko: '신윤복', en: 'Sin Yun-bok' }, era: { ko: '조선, 18세기 후반~19세기 초', en: 'Joseon, late 18th to early 19th century' },
    desc: {
      ko: '닭 그림이에요. 신윤복은 김홍도와 함께 조선 후기의 생활을 그린 대표 화가예요.',
      en: 'A painting of fighting roosters. Sin Yun-bok and Kim Hong-do are the two great painters of everyday life in late Joseon.',
    },
  }),
  P({
    id: 'yeosokdo', relicId: 109850, no: '덕수1103', src: IMG + 'duk000/2019/0925162303635/700/duk001103-000-80001.jpg', w: 245, h: 297,
    title: { ko: '여속도첩', en: 'Album of Women’s Customs' }, artist: { ko: '신윤복', en: 'Sin Yun-bok' }, era: { ko: '조선, 18세기 후반~19세기 초', en: 'Joseon, late 18th to early 19th century' },
    desc: {
      ko: '신윤복은 부드럽고 여린 붓질과 청록, 빨강, 노랑 같은 화려한 색으로 사람들을 그렸어요. 김홍도가 서민을 주로 그렸다면 신윤복은 양반의 풍류를 은근히 풍자했어요.',
      en: 'Sin Yun-bok drew people with soft, delicate lines and bright colours: blue-green, red and yellow. Where Kim Hong-do painted working people, he gently poked fun at the pastimes of the upper class.',
    },
  }),
  P({
    id: 'inwang', relicId: 36549667, no: '건희1', src: IMG + 'lkh000/2023/0106142242505/700/lkh000001-000-80001.jpg', w: 1382, h: 792,
    title: { ko: '인왕제색도', en: 'Clearing after Rain on Mount Inwang' }, artist: { ko: '정선', en: 'Jeong Seon' }, era: { ko: '조선, 1751년', en: 'Joseon, 1751' }, set: { ko: '국보', en: 'National Treasure' },
    desc: {
      ko: '겸재 정선이 일흔여섯 살에 비 갠 뒤의 인왕산을 그린 그림이에요. 직접 보고 그린 한국의 산천, 진경산수화를 대표해요. 인왕산은 지금도 서울 경복궁 서쪽에 있어요.',
      en: 'Jeong Seon painted Mount Inwang just after the rain, aged 75. It is the great example of "true-view" landscape: real Korean scenery painted from life. You can still see Inwangsan west of Gyeongbokgung in Seoul.',
    },
  }),
  P({
    id: 'nosong', relicId: 8486, no: '신수15765', src: IMG + 'ssu08/700/ssu15765.jpg', w: 1025, h: 420,
    title: { ko: '노송도', en: 'Old Pine Tree' }, artist: { ko: '강세황', en: 'Gang Se-hwang' }, era: { ko: '조선, 18세기', en: 'Joseon, 18th century' },
    desc: {
      ko: '늙은 소나무 그림이에요. 소나무는 사계절 푸르러 오래 사는 것을 뜻해요. 강세황은 김홍도의 스승으로도 알려져 있어요.',
      en: 'An old pine. Pines stay green all year, so in Korean art they stand for a long life. Gang Se-hwang is also known as a teacher of Kim Hong-do.',
    },
  }),
  P({
    id: 'mogyeon', relicId: 331, no: '본관255', src: IMG + 'bon000/2019/0925124355224/700/bon000255-000-80000.jpg', w: 555, h: 1630,
    title: { ko: '어미개와 강아지', en: 'Mother Dog and Puppies' }, artist: { ko: '이암', en: 'Yi Am' }, era: { ko: '조선, 16세기', en: 'Joseon, 16th century' },
    desc: {
      ko: '이암(1499-?)은 왕족 출신 화가로, 짐승 그림을 잘 그렸다고 해요. 중종의 초상을 그릴 화가로 추천되기도 했어요.',
      en: 'Yi Am (born 1499), a member of the royal family, was said to be a master at painting animals. He was even put forward to paint the portrait of King Jungjong.',
    },
  }),
  P({
    id: 'gyeoulsansu', relicId: 332, no: '본관281', src: IMG + 'bon000/2019/0925124358901/700/bon000281-000-80000.jpg', w: 460, h: 1190,
    title: { ko: '겨울 산수', en: 'Winter Landscape' }, artist: { ko: '김수철', en: 'Kim Su-cheol' }, era: { ko: '조선, 19세기', en: 'Joseon, 19th century' },
    desc: {
      ko: '겨울 산과 물을 그린 세로로 긴 족자 그림이에요. 김수철은 19세기 조선의 화가예요.',
      en: 'A tall hanging scroll of mountains and water in winter, by Kim Su-cheol, a painter of 19th-century Joseon.',
    },
  }),
  P({
    id: 'yundoseo', relicId: 2386, no: '신수15103', src: IMG + 'ssu08/700/ssu15103.jpg', w: 170, h: 300,
    title: { ko: '윤두서 필 화첩 (가물첩)', en: 'Album by Yun Du-seo (Family Treasures)' }, artist: { ko: '윤두서', en: 'Yun Du-seo' }, era: { ko: '조선, 17세기 말~18세기 초', en: 'Joseon, late 17th to early 18th century' },
    desc: {
      ko: '윤두서(1668-1715)는 윤선도의 증손으로, 벼슬을 마다하고 학문과 그림으로 평생을 보냈어요. 표지에 "가물첩(집안의 물건)"이라고 쓰여 있어 집안에서 대대로 전해 온 화첩임을 알 수 있어요.',
      en: 'Yun Du-seo (1668-1715), great-grandson of the poet Yun Seon-do, turned down office to spend his life on study and painting. The cover reads "Family Treasures": the album was handed down in his family.',
    },
  }),
];
