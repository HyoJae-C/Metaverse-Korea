// Old Korean paintings in the museum south of Itaewon (core/museum.js).
//
// Every image comes from the National Museum of Korea's collection site and
// is released there under KOGL Type 1 (공공누리 제1유형: 출처표시, free use with
// credit). Before adding one, open its page (`page` below) and check that it
// shows the 공공누리 1유형 badge; types 2-4 (no commercial use / no changes)
// can't be used here. KOGL Type 1 also forbids implying that the museum
// endorses us, so the gallery shows DISCLAIMER by the door and in the card.
//
// `src` is the museum's 700 px image; `crop` ([x, y, w, h] in that image)
// trims colour charts, mounts and labels off the scan; `file` is our compressed copy in
// public/ (made by scripts/fetch-paintings.mjs, about 100 KB each), loaded
// only when you walk into the museum. `w`/`h` give the shape on the wall.
// Descriptions are short retellings of the museum's own text.

export const CREDIT = { ko: '국립중앙박물관, 공공누리 제1유형', en: 'National Museum of Korea, KOGL Type 1' };
export const DISCLAIMER = {
  en: 'A made-up art museum in the game. It is not a real institution and is not run by or linked to the National Museum of Korea. The paintings are images the museum shares for free use with credit.',
  ko: '실제 기관이 아닌 게임 속 가상 미술관이고, 국립중앙박물관과 관계없어요. 그림은 국립중앙박물관이 출처 표시 조건으로 공개한 이미지예요.',
  ja: 'ゲームの中の架空の美術館で、実在の施設ではなく、国立中央博物館とは関係ありません。絵は博物館が出典表示を条件に公開している画像です。',
  zh: '这是游戏里虚构的美术馆，不是真实机构，与国立中央博物馆无关。画作图片由博物馆以注明出处为条件公开。',
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
    id: 'ssireum', relicId: 551, no: '본관6504-22', src: IMG + 'bon006/2016/1213161649247/700/bon006504-22-01.jpg', crop: [128, 24, 442, 528], w: 442, h: 528,
    title: { ko: '씨름', en: 'Ssireum (Korean Wrestling)' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '김홍도 풍속화를 대표하는 그림이에요. 구경꾼들을 위아래에 둥글게 앉히고, 가운데에서 두 씨름꾼이 힘을 겨뤄요. 왼쪽의 엿장수와 벗어 놓은 신발도 찾아보세요.',
      en: "One of Kim Hong-do's best-known genre scenes. The crowd sits in a ring at the top and bottom, and two wrestlers grapple in the middle. Look for the taffy seller on the left and the shoes left on the ground.",
    },
  }),
  P({
    id: 'jumak', relicId: 537, no: '본관6504-8', src: IMG + 'bon006/2016/1213161649247/700/bon006504-08-01.jpg', crop: [115, 20, 517, 595], w: 517, h: 595,
    title: { ko: '주막', en: 'Tavern' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '길을 가던 사람들이 길가 주막에서 요기하는 모습이에요. 국자로 막걸리를 뜨는 주모와 부뚜막 위 그릇들이 그 시절 주막 풍경을 보여 줘요.',
      en: 'Travellers stop for a bite at a roadside tavern. The hostess ladles out makgeolli (rice wine), and the bowls on the stove show what an inn of the time looked like.',
    },
  }),
  P({
    id: 'umulga', relicId: 540, no: '본관6504-11', src: IMG + 'bon006/2016/1213161649247/700/bon006504-11-01.jpg', crop: [64, 32, 540, 631], w: 540, h: 631,
    title: { ko: '우물가', en: 'At the Well' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '여인들이 모인 우물가에 한 남자가 가슴을 드러낸 채 물을 마셔요. 여인들은 수줍어 고개를 돌려요. 남녀를 엄격히 구별하던 조선의 풍속이 보여요.',
      en: 'A man with his shirt open gulps water at a well where women have gathered, and they shyly look away. It shows how strictly Joseon kept men and women apart.',
    },
  }),
  P({
    id: 'dambae', relicId: 541, no: '본관6504-12', src: IMG + 'bon006/2016/1213161649247/700/bon006504-12-01.jpg', crop: [78, 30, 538, 638], w: 538, h: 638,
    title: { ko: '담배썰기', en: 'Cutting Tobacco' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '넓은 담뱃잎의 줄기를 골라내고 작두로 썰고 있어요. 더워서 저고리를 벗은 일꾼들 옆에서 주인은 책을 펴 놓고 있어요.',
      en: 'Workers strip big tobacco leaves and slice them with a fodder cutter. It is hot enough to work without jackets, yet the owner sits nearby with a book open.',
    },
  }),
  P({
    id: 'geurimgamsang', relicId: 544, no: '본관6504-15', src: IMG + 'bon006/2016/1213161649247/700/bon006504-15-01.jpg', crop: [58, 33, 539, 634], w: 539, h: 634,
    title: { ko: '그림감상', en: 'Viewing a Painting' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '선비들이 긴 그림을 펼쳐 들고 둘러서서 감상해요. 침이 튈까 봐 부채로 입을 가린 사람이 눈에 띄어요. 종이에 아무것도 그려져 있지 않아 무엇을 보는지는 몰라요.',
      en: 'Scholars crowd round a long scroll, looking very serious. One holds a fan over his mouth so he will not spit on it. The paper is left blank, so we never find out what they are looking at.',
    },
  }),
  P({
    id: 'pyeonja', relicId: 546, no: '본관6504-17', src: IMG + 'bon006/2016/1213161649247/700/bon006504-17-01.jpg', crop: [57, 38, 543, 624], w: 543, h: 624,
    title: { ko: '편자박기', en: 'Shoeing a Horse' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '말을 눕히고 네 다리를 나무에 묶은 뒤 편자를 박고 있어요. 위쪽에는 땀 흘리는 두 사람이 마실 물이 놓여 있어요.',
      en: 'The horse is laid down with its legs tied to a pole so it cannot kick while the men nail on its shoes. Up in the corner, water waits for the two sweating workers.',
    },
  }),
  P({
    id: 'nongari', relicId: 530, no: '본관6504-1', src: IMG + 'bon006/2016/1213161228096/700/bon006504-01-01.jpg', crop: [82, 23, 531, 638], w: 531, h: 638,
    title: { ko: '논갈이', en: 'Ploughing the Fields' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '김홍도는 소탈한 서민의 생활과 일하는 모습을 많이 그렸어요. 이 그림에서는 소를 몰아 논밭을 갈아요.',
      en: 'Kim Hong-do loved to paint ordinary people at work, with a touch of Korean humour. Here farmers drive oxen to plough the fields.',
    },
  }),
  P({
    id: 'haengsang', relicId: 39197, no: '본관6504-25', src: IMG + 'bon006/2016/1213161649247/700/bon006504-25-01.jpg', crop: [82, 30, 518, 595], w: 518, h: 595,
    title: { ko: '행상', en: 'Peddlers' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '지게를 진 상인과 광주리를 인 아낙이 장사하러 떠나며 헤어지는 모습이에요. 저고리 안에 아이를 업은 엄마의 모습이 재미있어요.',
      en: 'A peddler with an A-frame pack and a woman with a basket on her head part ways as they set off to sell. Notice the baby she carries inside her jacket.',
    },
  }),
  P({
    id: 'tugye', relicId: 4425, no: '덕수2291-14', src: IMG + 'duk002/2016/1220152727617/700/duk002291-14-00.jpg', crop: [15, 12, 614, 600], w: 614, h: 600,
    title: { ko: '투계도', en: 'Cockfight' }, artist: { ko: '신윤복', en: 'Sin Yun-bok' }, era: { ko: '조선, 18세기 후반~19세기 초', en: 'Joseon, late 18th to early 19th century' },
    desc: {
      ko: '닭 그림이에요. 신윤복은 김홍도와 함께 조선 후기의 생활을 그린 대표 화가예요.',
      en: 'A painting of fighting roosters. Sin Yun-bok and Kim Hong-do are the two great painters of everyday life in late Joseon.',
    },
  }),
  P({
    id: 'yeosokdo', relicId: 109850, no: '덕수1103', src: IMG + 'duk000/2019/0925162303635/700/duk001103-000-80001.jpg', w: 469, h: 700,
    title: { ko: '여속도첩', en: 'Album of Women’s Customs' }, artist: { ko: '신윤복', en: 'Sin Yun-bok' }, era: { ko: '조선, 18세기 후반~19세기 초', en: 'Joseon, late 18th to early 19th century' },
    desc: {
      ko: '신윤복은 부드럽고 여린 붓질과 청록, 빨강, 노랑 같은 화려한 색으로 사람들을 그렸어요. 김홍도가 서민을 주로 그렸다면 신윤복은 양반의 풍류를 은근히 풍자했어요.',
      en: 'Sin Yun-bok drew people with soft, delicate lines and bright colours: blue-green, red and yellow. Where Kim Hong-do painted working people, he gently poked fun at the pastimes of the upper class.',
    },
  }),
  P({
    id: 'inwang', relicId: 36549667, no: '건희1', src: IMG + 'lkh000/2023/0106142242505/700/lkh000001-000-80001.jpg', w: 700, h: 400,
    title: { ko: '인왕제색도', en: 'Clearing after Rain on Mount Inwang' }, artist: { ko: '정선', en: 'Jeong Seon' }, era: { ko: '조선, 1751년', en: 'Joseon, 1751' }, set: { ko: '국보', en: 'National Treasure' },
    desc: {
      ko: '겸재 정선이 일흔여섯 살에 비 갠 뒤의 인왕산을 그린 그림이에요. 직접 보고 그린 한국의 산천, 진경산수화를 대표해요. 인왕산은 지금도 서울 경복궁 서쪽에 있어요.',
      en: 'Jeong Seon painted Mount Inwang just after the rain, aged 75. It is the great example of "true-view" landscape: real Korean scenery painted from life. You can still see Inwangsan west of Gyeongbokgung in Seoul.',
    },
  }),
  P({
    id: 'nosong', relicId: 8486, no: '신수15765', src: IMG + 'ssu08/700/ssu15765.jpg', crop: [95, 175, 521, 173], w: 521, h: 173,
    title: { ko: '노송도', en: 'Old Pine Tree' }, artist: { ko: '강세황', en: 'Gang Se-hwang' }, era: { ko: '조선, 18세기', en: 'Joseon, 18th century' },
    desc: {
      ko: '늙은 소나무 그림이에요. 소나무는 사계절 푸르러 오래 사는 것을 뜻해요. 강세황은 김홍도의 스승으로도 알려져 있어요.',
      en: 'An old pine. Pines stay green all year, so in Korean art they stand for a long life. Gang Se-hwang is also known as a teacher of Kim Hong-do.',
    },
  }),
  P({
    id: 'mogyeon', relicId: 331, no: '본관255', src: IMG + 'bon000/2019/0925124355224/700/bon000255-000-80000.jpg', w: 406, h: 700,
    title: { ko: '어미개와 강아지', en: 'Mother Dog and Puppies' }, artist: { ko: '이암', en: 'Yi Am' }, era: { ko: '조선, 16세기', en: 'Joseon, 16th century' },
    desc: {
      ko: '이암(1499-?)은 왕족 출신 화가로, 짐승 그림을 잘 그렸다고 해요. 중종의 초상을 그릴 화가로 추천되기도 했어요.',
      en: 'Yi Am (born 1499), a member of the royal family, was said to be a master at painting animals. He was even put forward to paint the portrait of King Jungjong.',
    },
  }),
  P({
    id: 'gyeoulsansu', relicId: 332, no: '본관281', src: IMG + 'bon000/2019/0925124358901/700/bon000281-000-80000.jpg', w: 270, h: 700,
    title: { ko: '겨울 산수', en: 'Winter Landscape' }, artist: { ko: '김수철', en: 'Kim Su-cheol' }, era: { ko: '조선, 19세기', en: 'Joseon, 19th century' },
    desc: {
      ko: '겨울 산과 물을 그린 세로로 긴 족자 그림이에요. 김수철은 19세기 조선의 화가예요.',
      en: 'A tall hanging scroll of mountains and water in winter, by Kim Su-cheol, a painter of 19th-century Joseon.',
    },
  }),
  P({
    id: 'yundoseo', relicId: 2386, no: '신수15103', src: IMG + 'ssu08/700/ssu15103.jpg', crop: [0, 0, 223, 396], w: 223, h: 396,
    title: { ko: '윤두서 필 화첩 (가물첩)', en: 'Album by Yun Du-seo (Family Treasures)' }, artist: { ko: '윤두서', en: 'Yun Du-seo' }, era: { ko: '조선, 17세기 말~18세기 초', en: 'Joseon, late 17th to early 18th century' },
    desc: {
      ko: '윤두서(1668-1715)는 윤선도의 증손으로, 벼슬을 마다하고 학문과 그림으로 평생을 보냈어요. 표지에 "가물첩(집안의 물건)"이라고 쓰여 있어 집안에서 대대로 전해 온 화첩임을 알 수 있어요.',
      en: 'Yun Du-seo (1668-1715), great-grandson of the poet Yun Seon-do, turned down office to spend his life on study and painting. The cover reads "Family Treasures": the album was handed down in his family.',
    },
  }),
  P({
    id: 'hwalssogi', relicId: 531, no: '본관6504-2', src: IMG + 'bon006/2016/1213161519678/700/bon006504-02-01.jpg', crop: [84, 34, 536, 631], w: 536, h: 631,
    title: { ko: '활쏘기', en: 'Archery' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '활 쏘는 법을 배우는 젊은이들과 이를 가르치는 군관의 모습이에요. 시위를 당기는 사람의 힘준 얼굴과 자세를 고쳐 주는 손길을 눈여겨보세요.',
      en: 'Young men learn to shoot a bow while an officer teaches them. Look at the strain on the archer\'s face and the hands correcting his stance.',
    },
  }),
  P({
    id: 'giwa', relicId: 532, no: '본관6504-3', src: IMG + 'bon006/2016/1213161551255/700/bon006504-03-01.jpg', crop: [69, 25, 529, 596], w: 529, h: 596,
    title: { ko: '기와이기', en: 'Roofing with Tiles' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '집을 짓고 기와를 올리는 장면이에요. 아래에서 던진 기와를 맨손으로 받는 일꾼, 먹줄로 기둥이 바른지 살피는 목수, 대패질하는 목수가 생생해요.',
      en: 'Builders put tiles on a new roof. One worker catches tiles thrown up from below with bare hands, a carpenter checks a pillar with a plumb line, and another planes a beam.',
    },
  }),
  P({
    id: 'daejanggan', relicId: 533, no: '본관6504-4', src: IMG + 'bon006/2016/1213161649247/700/bon006504-04-01.jpg', crop: [111, 34, 504, 598], w: 504, h: 598,
    title: { ko: '대장간', en: 'Smithy' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '대장간에서 일하는 사람들이에요. 달군 쇠를 모루에 대는 사람, 망치로 내리치는 사람, 숫돌에 연장을 가는 사람, 풀무 줄을 당기는 어린 견습생까지 있어요.',
      en: 'Blacksmiths at work: one holds the hot iron on the anvil, others swing hammers, one sharpens a finished tool, and a young apprentice pulls the bellows rope.',
    },
  }),
  P({
    id: 'nadeuri', relicId: 534, no: '본관6504-5', src: IMG + 'bon006/2016/1213161649247/700/bon006504-05-01.jpg', crop: [87, 23, 520, 617], w: 520, h: 617,
    title: { ko: '나들이', en: 'On the Road' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '나귀를 탄 선비와 아이들과 길을 가는 부부가 마주친 장면이에요. 부채로 얼굴을 가린 선비가 아이를 안은 여인을 몰래 훔쳐보는 모습이 재미있어요.',
      en: 'A scholar on a donkey passes a family on the road. Hiding behind his fan, he sneaks a look at the mother carrying her child.',
    },
  }),
  P({
    id: 'siju', relicId: 535, no: '본관6504-6', src: IMG + 'bon006/2016/1213161649247/700/bon006504-06-01.jpg', crop: [80, 25, 531, 632], w: 531, h: 632,
    title: { ko: '시주', en: 'Asking for Alms' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '두 승려가 목탁과 타악기를 두드리며 시주를 청하고 있어요. 지나가던 여인이 장옷을 머리에 얹고 주머니에서 엽전을 꺼내려는 순간이에요.',
      en: 'Two monks beat a wooden bell and a drum to ask for alms. A passing woman lifts her cloak onto her head and is about to take coins from her purse.',
    },
  }),
  P({
    id: 'narutbae', relicId: 536, no: '본관6504-7', src: IMG + 'bon006/2016/1213161649247/700/bon006504-07-01.jpg', crop: [86, 19, 533, 631], w: 533, h: 631,
    title: { ko: '나룻배', en: 'Ferry Boats' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '두 척의 배에 여러 신분의 사람들과 짐이 가득 실려 있어요. 장으로 가는 길로 보여, 조선 후기 장사가 활발해진 모습을 엿볼 수 있어요.',
      en: 'Two boats packed with people of every rank and their goods, probably on the way to market. It shows how trade grew in late Joseon.',
    },
  }),
  P({
    id: 'gonu', relicId: 538, no: '본관6504-9', src: IMG + 'bon006/2016/1213161649247/700/bon006504-09-01.jpg', crop: [94, 32, 510, 592], w: 510, h: 592,
    title: { ko: '고누놀이', en: 'Playing Gonu' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '나무하러 왔던 아이들이 땅에 판을 그리고 고누를 두고 있어요. 고누는 오래전부터 전해 온 우리 놀이로, 지방마다 이름과 놀이법이 조금씩 달라요.',
      en: 'Young woodcutters take a break to play gonu, an old Korean board game drawn on the ground. Its name and rules differ a little from region to region.',
    },
  }),
  P({
    id: 'ppallaeteo', relicId: 539, no: '본관6504-10', src: IMG + 'bon006/2016/1213161649247/700/bon006504-10-01.jpg', crop: [111, 35, 500, 589], w: 500, h: 589,
    title: { ko: '빨래터', en: 'Washing by the Stream' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '냇가에서 빨래하는 여인들과 바위 뒤에서 몰래 엿보는 선비가 웃음을 자아내요. 간결한 선과 담백한 색이 돋보여요.',
      en: 'Women wash clothes in a stream while a scholar peeks at them from behind a rock. Simple lines and soft colours make the joke work.',
    },
  }),
  P({
    id: 'jarijjagi', relicId: 542, no: '본관6504-13', src: IMG + 'bon006/2016/1213161649247/700/bon006504-13-01.jpg', crop: [75, 33, 534, 632], w: 534, h: 632,
    title: { ko: '자리짜기', en: 'Weaving Mats' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '아버지는 자리를 짜고 어머니는 물레를 돌리는 동안, 아들이 서당에서 배운 천자문을 막대기로 짚으며 읽어 보여요. 서민 가정의 희망이 담긴 그림이에요.',
      en: 'Father weaves a mat and mother spins thread while their son proudly reads out the characters he learned at school, pointing with a stick.',
    },
  }),
  P({
    id: 'byeotajak', relicId: 543, no: '본관6504-14', src: IMG + 'bon006/2016/1213161649247/700/bon006504-14-01.jpg', crop: [71, 34, 531, 632], w: 531, h: 632,
    title: { ko: '벼타작', en: 'Threshing Rice' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '일꾼들이 볏단을 내리쳐 타작하고, 양반 지주는 비스듬히 누워 지켜봐요. 신분이 다른 사람들을 한 장면에 담았지만 김홍도는 해학의 눈으로 바라봤어요.',
      en: 'Farmhands thresh sheaves of rice while the landowner lounges and watches. Kim Hong-do shows people of different classes with humour rather than anger.',
    },
  }),
  P({
    id: 'gilssam', relicId: 545, no: '본관6504-16', src: IMG + 'bon006/2016/1213161649247/700/bon006504-16-01.jpg', crop: [66, 34, 549, 631], w: 549, h: 631,
    title: { ko: '길쌈', en: 'Weaving Cloth' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '베틀에서 베를 짜는 여인과 이를 바라보는 아이, 아이를 업은 할머니, 위쪽에서 실을 뽑는 여인까지 집안 여성들의 고된 일상이 담겨 있어요.',
      en: 'A woman weaves at the loom, watched by a child and a grandmother carrying a baby, while another woman winds thread above. The hard daily work of women at home.',
    },
  }),
  P({
    id: 'gogijabi', relicId: 547, no: '본관6504-18', src: IMG + 'bon006/2016/1213161649247/700/bon006504-18-01.jpg', crop: [71, 35, 531, 628], w: 531, h: 628,
    title: { ko: '고기잡이', en: 'Fishing' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '발을 둘러친 어장에서 그물로 고기를 잡는 모습이에요. 물새들이 고기떼를 따라 날아들고, 배 위에는 생선을 담을 독과 솥까지 실려 있어요.',
      en: 'Fishermen haul fish from a fenced fish trap. Water birds follow the shoal, and the boats carry jars for the catch and even a cooking pot.',
    },
  }),
  P({
    id: 'sinhaeng', relicId: 548, no: '본관6504-19', src: IMG + 'bon006/2016/1213161649247/700/bon006504-19-01.jpg', crop: [89, 36, 530, 626], w: 530, h: 626,
    title: { ko: '신행길', en: 'Wedding Procession' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '신랑이 신부 집으로 향하는 혼례 행렬이에요. 백마를 탄 신랑 앞에 청사초롱과 기러기를 든 사람이 앞장서고, 뒤에는 중매쟁이가 따라와요.',
      en: 'A groom rides a white horse to the bride\'s house. Lantern bearers and a man carrying a wooden goose lead the way, and the matchmaker follows behind.',
    },
  }),
  P({
    id: 'jeomsim', relicId: 549, no: '본관6504-20', src: IMG + 'bon006/2016/1213161649247/700/bon006504-20-01.jpg', crop: [82, 36, 524, 626], w: 524, h: 626,
    title: { ko: '점심', en: 'Lunch Break' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '들일을 하던 일꾼들이 점심을 먹고 있어요. 돌아앉아 아기에게 젖을 먹이는 여인과 따라온 강아지도 정겨워요.',
      en: 'Field workers eat their lunch. A mother turns away to feed her baby, and a dog has come along too.',
    },
  }),
  P({
    id: 'jangteogil', relicId: 550, no: '본관6504-21', src: IMG + 'bon006/2016/1213161649247/700/bon006504-21-01.jpg', crop: [37, 10, 619, 348], w: 619, h: 348,
    title: { ko: '장터길', en: 'Back from the Market' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '산모퉁이를 돌아가는 말과 소의 행렬이에요. 짐 없는 등을 보니 장에서 물건을 다 팔고 돌아가는 길인 듯해, 그림 전체가 밝고 경쾌해요.',
      en: 'Riders and their animals round a hill. Their loads are gone, so they seem to be heading home after selling everything at the market, and the mood is cheerful.',
    },
  }),
  P({
    id: 'seodang', relicId: 552, no: '본관6504-23', src: IMG + 'bon006/2016/1213161649247/700/bon006504-23-01.jpg', crop: [78, 18, 542, 651], w: 542, h: 651,
    title: { ko: '서당', en: 'Village School' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '훈장에게 혼나고 돌아앉아 훌쩍이는 아이를 가운데 두고, 둘레의 아이들이 키득거려요. 우는 아이의 표정과 친구들의 익살스러운 모습에 절로 웃음이 나요.',
      en: 'A boy sobs after a scolding from the teacher, while the other pupils sitting around him try not to laugh. A scene that still makes people smile.',
    },
  }),
  P({
    id: 'mudong', relicId: 553, no: '본관6504-24', src: IMG + 'bon006/2016/1213161649247/700/bon006504-24-01.jpg', crop: [67, 24, 550, 649], w: 550, h: 649,
    title: { ko: '춤추는 아이', en: 'Dancing Boy' }, artist: HONGDO, era: HONGDO_ERA, set: ALBUM,
    desc: {
      ko: '북과 장구, 피리, 해금 소리에 맞춰 아이가 덩실덩실 춤을 춰요. 악사들의 모습만 봐도 음악이 들리는 듯해요.',
      en: 'A boy dances to a drum, an hourglass drum, flutes and a fiddle. You can almost hear the music from the players.',
    },
  }),
];

// The museum's halls: three floors, each with Hall A on the left and Hall B
// on the right of a central hall (see core/museum.js). Each hall shows one
// kind of painting; add a painting by putting its id in a hall's list.
// A hall with no paintings yet is shown as "coming soon".
export const FLOORS = [1, 2, 3];
export const HALLS = [
  {
    id: 'hongdo-work', floor: 1, side: 'A',
    name: { ko: '김홍도관 Ⅰ · 일하는 사람들', en: 'Kim Hong-do Hall I · People at Work' },
    paintings: ['nongari', 'byeotajak', 'jeomsim', 'giwa', 'daejanggan', 'pyeonja', 'jarijjagi', 'gilssam', 'dambae', 'gogijabi', 'haengsang'],
  },
  {
    id: 'hongdo-life', floor: 1, side: 'B',
    name: { ko: '김홍도관 Ⅱ · 놀이와 나들이', en: 'Kim Hong-do Hall II · Play and Outings' },
    paintings: ['ssireum', 'mudong', 'seodang', 'hwalssogi', 'gonu', 'geurimgamsang', 'jumak', 'umulga', 'ppallaeteo', 'nadeuri', 'siju', 'narutbae', 'sinhaeng', 'jangteogil'],
  },
  {
    id: 'landscape', floor: 2, side: 'A',
    name: { ko: '산수화관 · 산과 물', en: 'Landscape Hall · Mountains and Water' },
    paintings: ['inwang', 'gyeoulsansu', 'nosong', 'yundoseo'],
  },
  {
    id: 'figures', floor: 2, side: 'B',
    name: { ko: '인물·동물화관', en: 'Figures and Animals Hall' },
    paintings: ['yeosokdo', 'tugye', 'mogyeon'],
  },
  { id: 'soon-a', floor: 3, side: 'A', name: { ko: '3층 A관', en: '3F Hall A' }, paintings: [] },
  { id: 'soon-b', floor: 3, side: 'B', name: { ko: '3층 B관', en: '3F Hall B' }, paintings: [] },
];
export const COMING_SOON = { ko: '준비 중이에요', en: 'Coming soon' };
