// Information Centers (one in every neighbourhood), each with two guides at
// the front desk: the game guide explains how things work, the area guide
// shows what there is in this neighbourhood, with a "Go" button for each
// place. Also the first-time hint that points new players here (with "don't
// show again").
import { L, fmt } from './pocha-ui.js';
import { storeIcon } from '../core/store-icons.js';

const T = {
  title: { en: 'Information Center', ko: '안내센터', ja: 'インフォメーションセンター', zh: '信息中心' },
  intro: {
    en: 'Welcome! Here is everything you can do around town. Tap "Go" and the guide line takes you there.',
    ko: '어서 오세요! 이 동네에서 할 수 있는 것들을 모았어요. "가기"를 누르면 길 안내 선이 데려다줘요.',
    ja: 'ようこそ！この街でできることをまとめました。「行く」を押すと道案内が表示されます。',
    zh: '欢迎！这里汇总了城里能做的事。点“前往”就会显示路线。',
  },
  go: { en: 'Go', ko: '가기', ja: '行く', zh: '前往', es: 'Ir', id: 'Pergi', vi: 'Đi', hi: 'चलें', fr: 'Y aller', th: 'ไป', ar: 'اذهب' },
  gameGuide: { en: 'Game Guide', ko: '게임 안내', ja: 'ゲーム案内', zh: '游戏向导', es: 'Guía del juego', id: 'Pemandu Game', vi: 'Hướng dẫn trò chơi', hi: 'गेम गाइड', fr: 'Guide du jeu', th: 'คู่มือเกม', ar: 'مرشد اللعبة' },
  areaGuide: { en: 'Area Guide', ko: '지역 안내', ja: 'エリア案内', zh: '地区向导', es: 'Guía de la zona', id: 'Pemandu Area', vi: 'Hướng dẫn khu vực', hi: 'इलाक़ा गाइड', fr: 'Guide du quartier', th: 'คู่มือพื้นที่', ar: 'مرشد المنطقة' },
  askGame: { en: 'Ask about the game', ko: '게임 안내 듣기', ja: 'ゲームについて聞く', zh: '询问游戏玩法', es: 'Preguntar por el juego', id: 'Tanya soal game', vi: 'Hỏi về trò chơi', hi: 'गेम के बारे में पूछें', fr: 'Questions sur le jeu', th: 'ถามเรื่องเกม', ar: 'اسأل عن اللعبة' },
  askArea: { en: 'Ask about {name}', ko: '{name} 안내 듣기', ja: '{name}について聞く', zh: '询问{name}', es: 'Preguntar por {name}', id: 'Tanya soal {name}', vi: 'Hỏi về {name}', hi: '{name} के बारे में पूछें', fr: 'Questions sur {name}', th: 'ถามเรื่อง {name}', ar: 'اسأل عن {name}' },
  gameTitle: { en: 'Game guide', ko: '게임 안내', ja: 'ゲーム案内', zh: '游戏指南', es: 'Guía del juego', id: 'Panduan game', vi: 'Hướng dẫn trò chơi', hi: 'गेम गाइड', fr: 'Guide du jeu', th: 'คู่มือเกม', ar: 'دليل اللعبة' },
  gameIntro: {
    en: 'Here is how things work in Another Seoul. Ask my colleague next to me about places in this neighbourhood.',
    ko: '어나더 서울에서 할 수 있는 것들을 알려 드릴게요. 이 동네 장소는 옆 동료에게 물어보세요.',
    ja: 'アナザーソウルの遊び方をご案内します。この辺りの場所は隣の同僚に聞いてください。',
    zh: '这里介绍Another Seoul的玩法。这一带有哪些地方，请问我旁边的同事。',
    es: 'Así funciona Another Seoul. Pregunta a mi compañero de al lado por los lugares de este barrio.',
    id: 'Begini cara main di Another Seoul. Tanyakan tempat-tempat di sekitar sini ke rekan di sebelahku.',
    vi: 'Đây là cách chơi Another Seoul. Hỏi đồng nghiệp bên cạnh tôi về các địa điểm trong khu này nhé.',
    hi: 'Another Seoul में चीज़ें ऐसे चलती हैं। इस इलाक़े की जगहों के बारे में मेरे बगल वाले साथी से पूछें।',
    fr: 'Voici comment ça marche dans Another Seoul. Demande à mon collègue à côté pour les lieux de ce quartier.',
    th: 'นี่คือวิธีเล่นใน Another Seoul ถ้าอยากรู้เรื่องสถานที่ในย่านนี้ ถามเพื่อนร่วมงานข้างๆ ฉันได้เลย',
    ar: 'إليك كيف تسير الأمور في Another Seoul. اسأل زميلي بجانبي عن أماكن هذا الحي.',
  },
  areaTitle: { en: '{name} guide', ko: '{name} 안내', ja: '{name}案内', zh: '{name}指南', es: 'Guía de {name}', id: 'Panduan {name}', vi: 'Hướng dẫn {name}', hi: '{name} गाइड', fr: 'Guide de {name}', th: 'คู่มือ {name}', ar: 'دليل {name}' },
  morePlaces: { en: 'More places here', ko: '이 동네의 다른 곳', ja: 'この辺りのほかの場所', zh: '这一带的其他地方', es: 'Más lugares aquí', id: 'Tempat lain di sini', vi: 'Thêm địa điểm ở đây', hi: 'यहाँ की और जगहें', fr: 'Plus de lieux ici', th: 'สถานที่อื่นๆ ที่นี่', ar: 'أماكن أخرى هنا' },
  otherAreas: { en: 'Other neighbourhoods', ko: '다른 동네', ja: 'ほかのエリア', zh: '其他街区', es: 'Otros barrios', id: 'Lingkungan lain', vi: 'Khu khác', hi: 'दूसरे इलाक़े', fr: 'Autres quartiers', th: 'ย่านอื่นๆ', ar: 'أحياء أخرى' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  hint: {
    en: 'New here? Visit the Information Center by the square to see everything you can do.',
    ko: '처음 오셨나요? 광장 앞 안내센터에서 할 수 있는 것들을 알려드려요.',
    ja: '初めてですか？広場前のインフォメーションセンターで、できることを紹介しています。',
    zh: '第一次来？去广场前的信息中心看看能做些什么吧。',
  },
  hintGo: { en: 'Show me the way', ko: '길 안내', ja: '道案内', zh: '带我去' },
  later: { en: 'Later', ko: '나중에', ja: 'あとで', zh: '以后再说' },
  never: { en: "Don't show again", ko: '다시 보지 않기', ja: '今後表示しない', zh: '不再显示' },
};

// Each neighbourhood: its name, what the area guide says first, and where
// "Go" leads from another neighbourhood's guide.
export const AREA = {
  seongsu: { icon: '🛍️', to: { zone: 'A' },
    name: { en: 'Seongsu', ko: '성수', ja: '聖水', zh: '圣水', es: 'Seongsu', id: 'Seongsu', vi: 'Seongsu', hi: 'सोंगसू', fr: 'Seongsu', th: 'ซองซู', ar: 'سونغسو' },
    intro: { en: 'Seongsu: café streets, fashion and beauty shops, perfume houses and pop-ups around Seongsu Square, with Seoul Forest and the Han River close by.', ko: '성수: 성수 광장을 둘러싼 카페 거리, 패션·뷰티 가게, 향수 가게와 팝업. 서울숲과 한강도 가까워요.', ja: '聖水：聖水広場を囲むカフェ通り、ファッション・ビューティーの店、香水店とポップアップ。ソウルの森と漢江もすぐ近く。', zh: '圣水：圣水广场周围的咖啡街、时装美妆店、香水店和快闪店，首尔林和汉江也很近。' } },
  gyeongbokgung: { icon: '🏯', to: { zone: 'G' },
    name: { en: 'Gyeongbokgung', ko: '경복궁', ja: '景福宮', zh: '景福宫', es: 'Gyeongbokgung', id: 'Gyeongbokgung', vi: 'Gyeongbokgung', hi: 'ग्योंगबोकगुंग', fr: 'Gyeongbokgung', th: 'เคียงบกกุง', ar: 'غيونغبوكغونغ' },
    intro: { en: 'Gyeongbokgung: Gwanghwamun Square and the palace, a hanbok rental, a traditional tea house and a kimchi class. South of the square, Cheonggyecheon Stream starts at Cheonggye Plaza, and east along Jongno you can ring the bell at Bosingak.', ko: '경복궁: 광화문광장과 궁궐, 한복대여점, 전통찻집, 김치 만들기 교실. 광장 남쪽 청계광장에서 청계천이 시작되고, 종로를 따라 동쪽으로 가면 보신각에서 종을 쳐 볼 수 있어요.', ja: '景福宮：光化門広場と王宮、韓服レンタル、伝統茶房、キムチ教室。広場の南、清渓広場から清渓川が始まり、鍾路を東へ行くと普信閣で鐘をつけます。', zh: '景福宫：光化门广场和宫殿、韩服租赁、传统茶馆、泡菜课。广场南边的清溪广场是清溪川的起点，沿钟路往东走可以在普信阁敲钟。' } },
  bukchon: { icon: '🏘️', to: { zone: 'P' },
    name: { en: 'Bukchon', ko: '북촌', ja: '北村', zh: '北村', es: 'Bukchon', id: 'Bukchon', vi: 'Bukchon', hi: 'बुकचोन', fr: 'Bukchon', th: 'บุกชอน', ar: 'بوكتشون' },
    intro: { en: 'Bukchon Hanok Village: hanok alleys on the hill between Gyeongbokgung and Changdeokgung, up from Anguk Station. Climb the alley to the hilltop for the famous photo, walk into the Open House, tie a knot charm or make a hanji lantern, and rent a hanbok. The alleys up the hill are a Quiet Zone: people live there, so walking only. Real Bukchon: in the Bukchon-ro 11-gil area visitors are welcome 10:00 to 17:00 (since Nov 2024). Check before you go.', ko: '북촌한옥마을: 안국역에서 올라가는 경복궁과 창덕궁 사이 언덕의 한옥 골목. 언덕 꼭대기에 올라 유명한 장면을 사진에 담고, 열린 한옥에 들어가 보고, 매듭 노리개와 한지 등을 만들고, 한복도 빌려요. 언덕 위 골목은 주민이 사는 조용한 골목이라 걸어서만 다녀요. 실제 북촌로11길 일대는 관광객 방문 시간이 오전 10시~오후 5시예요(2024년 11월부터). 가기 전에 확인하세요.', ja: '北村韓屋村：安国駅から上る、景福宮と昌徳宮の間の丘の韓屋の路地。丘のてっぺんで有名な景色を撮り、オープンハウスに入り、結びのお守りや韓紙の灯りを作り、韓服も借りられます。丘の路地は人が暮らす静かな路地なので歩いてのみ。実際の北村路11ギル一帯の観光客の訪問時間は10時〜17時（2024年11月から）。行く前に確認を。', zh: '北村韩屋村：从安国站往上走，景福宫和昌德宫之间山坡上的韩屋小巷。爬到坡顶拍下有名的景色，走进开放韩屋，编绳结挂饰、做韩纸灯，还能租韩服。坡上的小巷住着居民，是安静小巷，只能步行。现实中北村路11街一带游客参观时间为10:00至17:00（2024年11月起），出发前请确认。' } },
  jongmyo: { icon: '🏛️', to: { zone: 'R' },
    name: { en: 'Jongmyo Shrine', ko: '종묘', ja: '宗廟', zh: '宗庙', es: 'Santuario Jongmyo', id: 'Kuil Jongmyo', vi: 'Đền Jongmyo', hi: 'जोंगम्यो', fr: 'Sanctuaire de Jongmyo', th: 'ศาลเจ้าชงมโย', ar: 'ضريح جونغميو' },
    intro: { en: 'Jongmyo Shrine, on Jongno: the royal ancestral shrine of the Joseon dynasty, with its two long halls in the woods. Walk the stone path the right way (keep off the raised middle, it is for the spirits) and watch the ritual dance on Jeongjeon\'s terrace. Real Jongmyo: closed on Tuesdays, guided tours on weekdays, free walking on Saturdays. Check before you go.', ko: '종로의 종묘: 숲속에 긴 건물 두 채가 있는 조선 왕실의 사당이에요. 돌길을 바르게 걷고(가운데 높은 길은 혼령의 길이라 밟지 않아요) 정전 월대에서 제례 춤을 구경해요. 실제 종묘는 화요일에 쉬고, 평일에는 해설 관람, 토요일에는 자유 관람이에요. 가기 전에 확인하세요.', ja: '鍾路の宗廟：森の中に二棟の長い建物が建つ朝鮮王室の霊廟。石畳を正しく歩き（中央の高い道は霊の道なので歩きません）、正殿の月台で祭礼の舞を見よう。実際の宗廟は火曜休み、平日はガイドツアー、土曜は自由観覧。行く前に確認を。', zh: '钟路的宗庙：树林中有两座长殿的朝鲜王室宗庙。正确地走石路（中间高起的路是神灵的路，不要踩），在正殿月台上观看祭礼舞蹈。真实的宗庙周二闭馆，平日跟随讲解参观，周六自由参观，出发前请确认。' } },
  itaewon: { icon: '🌍', to: { zone: 'H' },
    name: { en: 'Itaewon', ko: '이태원', ja: '梨泰院', zh: '梨泰院', es: 'Itaewon', id: 'Itaewon', vi: 'Itaewon', hi: 'इतेवॉन', fr: 'Itaewon', th: 'อิแทวอน', ar: 'إيتايوون' },
    intro: { en: 'Itaewon: World Food Street and cafés in the north-west, bars and clubs in the north-east, and Yongmaru Market (traditional market) south-west of the station. West along Itaewon-ro: the War History Museum, a quiet place to remember.', ko: '이태원: 북서쪽 세계음식거리와 카페, 북동쪽 바와 클럽, 역 남서쪽의 용마루시장(전통시장). 이태원로를 따라 서쪽으로 가면 조용히 추모할 수 있는 전쟁역사박물관이 있어요.', ja: '梨泰院：北西に世界グルメ通りとカフェ、北東にバーとクラブ、駅の南西にヨンマル市場（伝統市場）。梨泰院路を西へ行くと、静かに追悼できる戦争歴史博物館があります。', zh: '梨泰院：西北是世界美食街和咖啡馆，东北是酒吧和夜店，车站西南是龙脊市场（传统市场）。沿梨泰院路往西是战争历史博物馆，一个可以静静缅怀的地方。' } },
  songpa: { icon: '🎡', to: { store: 'another-land' },
    name: { en: 'Songpa', ko: '송파', ja: '松坡', zh: '松坡', es: 'Songpa', id: 'Songpa', vi: 'Songpa', hi: 'सोंगपा', fr: 'Songpa', th: 'ซงพา', ar: 'سونغبا' },
    intro: { en: 'Songpa: walks around Seokchon Lake and Another Land, the theme park on the lake island, by Jamsil Station. Olympic Park is further east along Olympic-ro.', ko: '송파: 잠실역 옆 석촌호수 산책길과 호수 섬 위의 놀이공원 어나더랜드. 올림픽로를 따라 동쪽으로 가면 올림픽공원이에요.', ja: '松坡：蚕室駅のそば、石村湖の散歩道と湖の島の遊園地アナザーランド。オリンピック路を東へ行くとオリンピック公園。', zh: '松坡：蚕室站旁的石村湖步道和湖心岛上的游乐园另一乐园。沿奥林匹克路往东就是奥林匹克公园。' } },
  'olympic-park': { icon: '🛹', to: { zone: 'M' },
    name: { en: 'Olympic Park', ko: '올림픽공원', ja: 'オリンピック公園', zh: '奥林匹克公园', es: 'Parque Olímpico', id: 'Taman Olimpiade', vi: 'Công viên Olympic', hi: 'ओलंपिक पार्क', fr: 'Parc olympique', th: 'สวนโอลิมปิก', ar: 'الحديقة الأولمبية' },
    intro: { en: 'Olympic Park: built for the 1988 Seoul Olympics. The Peace Gate on the Peace Plaza, the lone tree on the lawn, and a skate park on the plaza for tricks on boards, inline skates and bikes.', ko: '올림픽공원: 1988 서울올림픽을 위해 만든 공원. 평화의광장의 평화의문, 잔디밭의 나홀로나무, 그리고 광장 스케이트파크에서 보드, 인라인, 자전거로 묘기를 부려 보세요.', ja: 'オリンピック公園：1988年ソウル五輪のために造られた公園。平和の広場の平和の門、芝生のひとりぼっちの木、広場のスケートパークでスケボー・インライン・自転車の技を。', zh: '奥林匹克公园：为1988年首尔奥运会而建。和平广场上的和平之门、草坪上的孤独树，还有广场上的滑板公园，可以用滑板、轮滑和自行车秀技巧。' } },
  seodaemun: { icon: '📚', to: { zone: 'I' },
    name: { en: 'Sinchon', ko: '신촌', ja: '新村', zh: '新村', es: 'Sinchon', id: 'Sinchon', vi: 'Sinchon', hi: 'सिनचोन', fr: 'Sinchon', th: 'ชินชน', ar: 'سينتشون' },
    intro: { en: 'Sinchon (Seodaemun): a campus street with a Korean academy, a library full of Korean books, and three cinemas on Sinchon-ro: Byeolbit Cinema, Doodle Cinema 2D and the black-and-white Silver Screen Theater.', ko: '신촌(서대문): 어학당과 한국어 책이 가득한 도서관이 있는 대학가. 신촌로에는 별빛 시네마, 두들 시네마 2D, 흑백 영화관 은막 흑백극장이 모여 있어요.', ja: '新村（西大門）：語学堂と韓国語の本でいっぱいの図書館がある大学街。新村路にはビョルビッ シネマ、ドゥードゥル シネマ 2D、白黒の銀幕モノクロ劇場が並んでいます。', zh: '新村（西大门）：有语学堂和满是韩语书的图书馆的大学街。新村路上有星光影院、涂鸦影院 2D 和黑白的银幕黑白剧场。' } },
  hongdae: { icon: '🎸', to: { zone: 'J' },
    name: { en: 'Hongdae', ko: '홍대', ja: '弘大', zh: '弘大', es: 'Hongdae', id: 'Hongdae', vi: 'Hongdae', hi: 'होंगदे', fr: 'Hongdae', th: 'ฮงแด', ar: 'هونغداي' },
    intro: { en: 'Hongdae: buskers on the Walking Street, indie shops, animal cafés, tarot and a neon name tag shop.', ko: '홍대: 걷고싶은거리의 버스킹, 인디 가게, 동물 카페, 타로, 네온 네임택 가게.', ja: '弘大：歩きたい通りのバスキング、インディーの店、動物カフェ、タロット、ネオンのネームタグ店。', zh: '弘大：步行街的街头表演、独立小店、动物咖啡馆、塔罗和霓虹名牌店。' } },
  yeonnam: { icon: '🌳', to: { zone: 'N' },
    name: { en: 'Yeonnam-dong', ko: '연남동', ja: '延南洞', zh: '延南洞', es: 'Yeonnam-dong', id: 'Yeonnam-dong', vi: 'Yeonnam-dong', hi: 'योननाम-दोंग', fr: 'Yeonnam-dong', th: 'ยอนนัม-ดง', ar: 'يونّام دونغ' },
    intro: { en: 'Yeonnam-dong: the Gyeongui Line Forest Park ("Yeontral Park") runs north from Hongdae Walking Street on an old railway. Buy a picnic mat and kimbap at Sopung Picnic and spread out on the grass. Small shops, a bookshop, a photo booth and a Korean-Chinese restaurant line the lanes. Try the walk from here to Mangwon: the forest path, then Mangwon Market, then the Han River.', ko: '연남동: 홍대 걷고싶은거리에서 북쪽으로 옛 철길 위의 경의선숲길(연트럴파크)이 이어져요. 소풍 피크닉에서 돗자리와 김밥을 사서 잔디에 펼쳐 보세요. 골목에는 소품샵, 책방, 사진관, 중식당이 있어요. 추천 코스: 숲길에서 망원시장을 지나 한강까지 걸어 보세요.', ja: '延南洞：弘大の歩きたい通りから北へ、旧線路の上に京義線森の道（ヨントラルパーク）が続きます。ソプン・ピクニックでレジャーシートとキンパを買って芝生に広げよう。路地には雑貨店、書店、写真館、中華料理店。おすすめコース：森の道から望遠市場を通って漢江まで歩いてみて。', zh: '延南洞：从弘大步行街往北，旧铁路上的京义线林荫路（延特尔公园）一路延伸。在郊游野餐买野餐垫和紫菜包饭，铺在草地上吧。小巷里有杂货店、书店、照相馆和中餐馆。推荐路线：从林荫路经望远市场走到汉江。' } },
  mangwon: { icon: '🐟', to: { zone: 'O' },
    name: { en: 'Mangwon-dong', ko: '망원동', ja: '望遠洞', zh: '望远洞', es: 'Mangwon-dong', id: 'Mangwon-dong', vi: 'Mangwon-dong', hi: 'मांगवॉन-दोंग', fr: 'Mangwon-dong', th: 'มังวอน-ดง', ar: 'مانغوون دونغ' },
    intro: { en: 'Mangwon-dong: Mangwon Market under its arcade roof (croquettes, dakgangjeong, rice cakes, side dishes, noodles), quiet cafés and a bakery on Poeun-ro (Mangridan-gil), and the open Han River park at the south end. The Mangwon Fishing Pier there has the same catch as every Han River park.', ko: '망원동: 아케이드 지붕 아래 망원시장(고로케, 닭강정, 떡, 반찬, 칼국수), 포은로(망리단길)의 조용한 카페와 빵집, 그리고 남쪽 끝의 탁 트인 한강공원. 망원 낚시 선착장에서는 다른 한강공원과 똑같은 물고기가 잡혀요.', ja: '望遠洞：アーケードの屋根の下の望遠市場（コロッケ、タッカンジョン、お餅、おかず、カルグクス）、圃隠路（望理団通り）の静かなカフェとパン屋、南の端の開放的な漢江公園。望遠釣り桟橋では、ほかの漢江公園と同じ魚が釣れます。', zh: '望远洞：拱廊顶棚下的望远市场（可乐饼、炸鸡块、年糕、小菜、刀切面），圃隐路（望理团路）上安静的咖啡馆和面包店，还有南端开阔的汉江公园。望远钓鱼码头能钓到和其他汉江公园一样的鱼。' } },
  'banpo-jamwon': { icon: '🌈', to: { store: 'banpo-jamwon-hangang' },
    name: { en: 'Banpo-Jamwon Han River Park', ko: '반포·잠원 한강공원', ja: '盤浦・蚕院漢江公園', zh: '盘浦·蚕院汉江公园', es: 'Parque Banpo-Jamwon del río Han', id: 'Taman Sungai Han Banpo-Jamwon', vi: 'Công viên sông Hàn Banpo-Jamwon', hi: 'बानपो-जामवॉन हान नदी पार्क', fr: 'Parc Banpo-Jamwon du fleuve Han', th: 'สวนริมแม่น้ำฮันบันโพ-จัมวอน', ar: 'حديقة نهر هان بانبو-جاموون' },
    intro: { en: 'Banpo-Jamwon Han River Park: Banpo and Jamwon Han River Parks lie side by side on the south bank, so here they are one riverside park. Walk across Jamsu Bridge, the low deck under Banpo Bridge, from Itaewon. Inside the park: fishing (the manta ray, a legend, only bites here), Han River ramen, duck boats and food trucks.', ko: '반포·잠원 한강공원: 한강 남쪽 강변에 나란히 있는 반포한강공원과 잠원한강공원을 하나로 묶었어요. 이태원에서 반포대교 아래 낮은 다리인 잠수교를 걸어서 건너요. 공원 안에서는 낚시(전설의 만타가오리는 여기서만 잡혀요), 한강 라면, 오리배, 푸드트럭을 즐겨요.', ja: '盤浦・蚕院漢江公園：漢江の南岸に並ぶ盤浦漢江公園と蚕院漢江公園を一つにしました。梨泰院から、盤浦大橋の下の低い橋・潜水橋を歩いて渡ります。公園では釣り（伝説のマンタはここでしか釣れません）、漢江ラーメン、アヒルボート、フードトラックを楽しめます。', zh: '盘浦·蚕院汉江公园：汉江南岸并排的盘浦汉江公园和蚕院汉江公园在这里合二为一。从梨泰院走过盘浦大桥下的低桥潜水桥就到了。公园里可以钓鱼（传说中的蝠鲼只在这里咬钩）、煮汉江拉面、坐鸭子船、逛餐车。' } },
  euljiro: { icon: '👠', to: { zone: 'Q' },
    name: { en: 'Euljiro & Dongdaemun', ko: '을지로·동대문', ja: '乙支路・東大門', zh: '乙支路·东大门', es: 'Euljiro y Dongdaemun', id: 'Euljiro & Dongdaemun', vi: 'Euljiro & Dongdaemun', hi: 'उलजीरो और दोंगदेमुन', fr: 'Euljiro et Dongdaemun', th: 'อึลจีโรและทงแดมุน', ar: 'أولجيرو ودونغدايمون' },
    intro: { en: 'Euljiro & Dongdaemun: DDP, the curved silver Dongdaemun Design Plaza, with Dongdaemun History & Culture Park and a piece of the Seoul City Wall beside it. Inside DDP, walk the Curve Runway to the beat and pose for the cameras. Across Jangchungdan-ro are the fashion malls, open late like the real ones, and south of Toegye-ro, Namsangol Hanok Village has a quiet yard inside its wall. Follow Toegye-ro west to Sungnyemun (Namdaemun), the old city\'s great south gate; north across Ogansugyo Bridge stands Heunginjimun, the east gate.', ko: '을지로·동대문: 은빛 곡선 건물 동대문디자인플라자(DDP)와 그 옆 동대문역사문화공원, 한양도성 성곽 한 자락이 있어요. DDP 안 커브 런웨이에서는 박자에 맞춰 워킹하고 카메라 앞에서 포즈를 잡아 보세요. 장충단로 건너편에는 실제처럼 밤늦게까지 여는 패션몰이, 퇴계로 남쪽에는 담장 안 마당이 조용한 남산골 한옥마을이 있어요. 퇴계로를 따라 서쪽으로 가면 옛 서울의 남쪽 정문 숭례문(남대문), 오간수교 건너 북쪽에는 동쪽 정문 흥인지문이 서 있어요.', ja: '乙支路・東大門：銀色の曲線の建物、東大門デザインプラザ（DDP）と、隣の東大門歴史文化公園、漢陽都城の城壁の一部があります。DDPの中のカーブ・ランウェイでは、リズムに合わせて歩き、カメラの前でポーズをとってみましょう。奨忠壇路の向かいには本物のように夜遅くまで開くファッションモール、退渓路の南には塀の中の庭が静かな南山コル韓屋村があります。退渓路を西へ行くと旧ソウルの南の正門・崇礼門（南大門）、五間水橋を渡った北には東の正門・興仁之門が立っています。', zh: '乙支路·东大门：银色曲线建筑东大门设计广场（DDP），旁边是东大门历史文化公园和一段汉阳都城城墙。在DDP里的曲线T台，可以踩着节拍走秀，在镜头前摆姿势。奖忠坛路对面是像现实中一样营业到深夜的时装商场，退溪路南边是围墙里庭院安静的南山谷韩屋村。沿退溪路往西是旧首尔的南正门崇礼门（南大门），过五间水桥往北是东正门兴仁之门。' } },
};

// Game help (the game guide): how things work, anywhere.
export const GAME_TOPICS = [
  { icon: '🧭', to: null,
    title: { en: 'Getting around', ko: '이동하는 법', ja: '移動のしかた', zh: '怎么移动' },
    text: { en: 'In 🗺️ Map, tap a place: a path appears and 🚶 Auto walks you there by itself. 🛵 Vehicle hops on a free bike. 🚕 Taxi (in the map) is fastest but costs more (from 🪙 4800). Walk down the subway stairs (🚇 on the map) to ride to other districts for 🪙 1550.', ko: '🗺️ 지도에서 장소를 누르면 길이 나오고, 🚶 자동을 누르면 알아서 걸어가요. 🛵 탈것을 누르면 무료 자전거를 타요. 🚕 택시(지도 안)는 제일 빠르지만 돈이 더 들어요(🪙 4800부터). 지하철 계단(지도의 🚇)으로 내려가면 🪙 1550으로 다른 동네에 갈 수 있어요.', ja: '🗺️地図で場所をタップすると道が出て、🚶自動で勝手に歩きます。🛵乗り物で無料の自転車に乗れます。🚕タクシー（地図の中）は一番速いけど高めです（🪙 4800から）。地下鉄の階段（地図の🚇）を下りると🪙 1550で他の街へ行けます。', zh: '在🗺️地图上点一个地方会出现路线，点🚶自动就会自己走过去。🛵交通工具可以骑免费自行车。🚕出租车（在地图里）最快但更贵（🪙 4800起）。走下地铁楼梯（地图上的🚇），花🪙 1550就能去别的街区。' } },
  { icon: '🪙', to: null,
    title: { en: 'Money (won)', ko: '돈 (원)', ja: 'お金（ウォン）', zh: '钱（韩元）' },
    text: { en: 'Game money is Korean won, priced like Seoul (a coffee is about 🪙 4500). Earn it from travel support money every day, part-time jobs, missions, fishing and deliveries. Spend it on food, clothes, rides, photos and more.', ko: '게임 속 돈은 서울 물가 그대로의 원화예요 (커피 한 잔 약 🪙 4500). 매일 받는 여행지원금, 아르바이트, 미션, 낚시, 배달로 벌고 음식, 옷, 탈것, 사진 등에 써요.', ja: 'ゲームのお金はソウルの物価そのままの韓国ウォンです（コーヒー1杯 約🪙 4500）。毎日の旅行支援金、アルバイト、ミッション、釣り、配達で稼ぎ、食べ物や服、乗り物、写真などに使えます。', zh: '游戏里的钱是按首尔物价计算的韩元（一杯咖啡约🪙 4500）。通过每天的旅行补助、打工、任务、钓鱼和送外卖赚钱，用来买吃的、衣服、坐车、拍照等。' } },
  { icon: '📅', to: null,
    title: { en: 'Daily check-in and missions', ko: '출석과 오늘의 미션', ja: '出席と今日のミッション', zh: '每日签到和任务' },
    text: { en: 'Tap 📅 at the top for the daily check-in and three missions a day. The ❗ Square guide at Seongsu Square hands out errands too.', ko: '위쪽 📅을 누르면 출석 체크와 하루 세 가지 미션이 있어요. 성수 광장의 ❗ 광장 안내원도 심부름을 줘요.', ja: '上の📅で出席チェックと1日3つのミッション。聖水広場の❗広場案内係もおつかいをくれます。', zh: '点上方📅签到，每天有三个任务。圣水广场上的❗广场向导也会派差事。' } },
  { icon: '🔤', to: null,
    title: { en: 'Korean signs', ko: '한글 간판', ja: 'ハングルの看板', zh: '韩文招牌' },
    text: { en: 'Shop signs are in Korean, like in Seoul. Turn on "Translate shop signs" in ⚙️ Settings to read them in your language.', ko: '간판은 서울처럼 한글이에요. ⚙️ 설정에서 "가게 간판 번역"을 켜면 내 언어로 보여요.', ja: '看板はソウルと同じくハングルです。⚙️設定で「店の看板を翻訳」をオンにすると自分の言語で表示されます。', zh: '招牌和首尔一样是韩文。在⚙️设置里打开“翻译店铺招牌”就能用你的语言显示。' } },
  { icon: 'ℹ️', to: null,
    title: { en: 'Information Centers', ko: '안내센터', ja: 'インフォメーションセンター', zh: '信息中心' },
    text: { en: 'Every neighbourhood has one, with two guides: the game guide (that is me) and the area guide next to me, who knows every place around here.', ko: '동네마다 하나씩 있고 안내원이 두 명이에요. 게임 안내(저)와, 옆에서 이 동네 장소를 다 아는 지역 안내원이 있어요.', ja: '各エリアに1つあり、案内係は2人。ゲーム案内（私）と、隣でこの辺りの場所を全部知っているエリア案内です。', zh: '每个街区都有一个，有两位向导：游戏向导（就是我）和旁边熟悉这一带的地区向导。' } },
{ icon: '🏷️', to: { workshop: 'emblem' },
    title: { en: 'Name tag emblems', ko: '닉네임 엠블럼', ja: '名札エンブレム', zh: '名牌徽章' },
    text: { en: '20 emblems and name colours, from basic to dazzling, and a name change. Name tag workshops in Seongsu and Hongdae: same tags, different style. "Go" takes you to the nearest one.', ko: '기본부터 완전 화려함까지 엠블럼 20종과 이름 색상, 이름 바꾸기도 돼요. 네임택 공방은 성수와 홍대에 있어요(기능은 같고 분위기만 달라요). "가기"는 가까운 곳으로 안내해요.', ja: 'ベーシックから超ド派手まで、エンブレム20種と名前の色、名前変更も。ネームタグ工房は聖水と弘大に（中身は同じ、雰囲気が違います）。「行く」で近い方へ案内します。', zh: '从基础到超华丽，20种徽章和名字颜色，还能改名。名牌工坊在圣水和弘大（功能一样，风格不同）。点“前往”会带你去最近的一家。' } },
{ icon: '🏠', to: null,
    title: { en: 'Your home', ko: '내 집', ja: 'マイホーム', zh: '我的家' },
    text: { en: 'Pick a home on the map and decorate it with furniture.', ko: '지도에서 집을 골라 가구로 꾸며요.', ja: '地図で家を選んで家具で飾ろう。', zh: '在地图上选一个家，用家具装饰。' } },
{ icon: '👋', to: null,
    title: { en: 'With friends', ko: '친구와 함께', ja: '友だちと', zh: '和朋友一起' },
    text: { en: 'High five, ride a tandem bike, do square missions together for a bonus.', ko: '하이파이브, 2인용 자전거, 광장 미션을 같이 하면 보너스.', ja: 'ハイタッチ、2人乗り自転車、広場ミッションを一緒にするとボーナス。', zh: '击掌、骑双人自行车、一起做广场任务有奖励。' } },
];

// Places (the area guide): each one shows up in the guide of the
// neighbourhood it is in. `to` is a store id or a meeting zone.
export const PLACE_TOPICS = [
{ icon: '🌶️', to: { store: 'sinjeon-pocha' },
    title: { en: 'Tteokbokki stall and deliveries', ko: '떡볶이 포차와 배달', ja: 'トッポッキ屋台と配達', zh: '炒年糕摊和送外卖' },
    text: { en: 'Take orders in Korean, cook, and deliver by bike.', ko: '한국어 주문을 받아 만들고 자전거로 배달해요.', ja: '韓国語の注文を受けて作り、自転車で配達。', zh: '用韩语接单、做菜，骑车送外卖。' } },
{ icon: '🎤', to: { store: 'star-noraebang' },
    title: { en: 'Noraebang', ko: '노래방', ja: 'カラオケ', zh: 'KTV' },
    text: { en: 'A rhythm game with a room score board.', ko: '방 점수판이 있는 리듬 게임.', ja: 'ルームのスコアボード付きリズムゲーム。', zh: '带房间排行榜的节奏游戏。' } },
{ icon: '📸', to: { store: 'nemo-photo' },
    title: { en: 'Photo booths', ko: '사진관 3곳', ja: '写真館3軒', zh: '三家照相馆' },
    text: { en: 'Jogak Studio (four-cut strips), Chueok Photo (one big portrait) and Memories (black & white).', ko: '조각스튜디오(네 컷), 추억사진관(한 장 크게), 메모리즈(흑백).', ja: 'チョガクスタジオ（4カット）、チュオク写真館（大きな1枚）、メモリーズ（モノクロ）。', zh: '碎片工作室（四格）、回忆照相馆（一张大照）、Memories（黑白）。' } },
{ icon: '🧸', to: { store: 'lucky-claw' },
    title: { en: 'Claw machine', ko: '인형뽑기', ja: 'クレーンゲーム', zh: '抓娃娃' },
    text: { en: 'Win plushies to put in your home.', ko: '뽑은 인형은 내 집에 놓을 수 있어요.', ja: '取ったぬいぐるみは家に飾れます。', zh: '抓到的玩偶可以摆在家里。' } },
{ icon: '🎯', to: { store: 'bar-hush' },
    title: { en: 'Darts at Bar Hush', ko: '바 허시 다트', ja: 'バー・ハッシュのダーツ', zh: '静语酒吧飞镖' },
    text: { en: 'Throw darts alone or challenge someone in the bar. No drink needed.', ko: '혼자 던지거나 바 안의 친구에게 대결을 신청해요. 음료 주문은 필요 없어요.', ja: 'ひとりで投げても、バーにいる人に挑戦しても。ドリンク注文は不要。', zh: '一个人玩或挑战酒吧里的朋友，不用点饮料。' } },
{ icon: '🧺', to: { store: 'spin-cycle' },
    title: { en: 'A hidden bar', ko: '숨은 바', ja: '隠れ家バー', zh: '秘密酒吧' },
    text: { en: 'Somewhere on Itaewon-ro, a coin laundry is not what it seems. Walk in and look past the washing machines.', ko: '이태원로 어딘가의 코인 빨래방은 보기와 달라요. 들어가서 세탁기 너머를 보세요.', ja: '梨泰院路のどこかに、見た目どおりではないコインランドリーがあります。入って洗濯機の奥を見てみて。', zh: '梨泰院路上有一家自助洗衣店并不简单。走进去，看看洗衣机后面。' } },
{ icon: '⚽', to: { store: 'full-time-pub' },
    title: { en: 'Sports pub', ko: '스포츠 펍', ja: 'スポーツパブ', zh: '体育酒吧' },
    text: { en: 'A match plays on the big screen. When someone scores, the whole pub cheers: shout 골! with them.', ko: '큰 화면에서 경기가 나와요. 골이 들어가면 펍 전체가 환호해요. 같이 "골!"을 외쳐 봐요.', ja: '大画面で試合を放送中。ゴールが決まるとパブ中が大歓声。一緒に「コル！」と叫ぼう。', zh: '大屏幕在播比赛。一进球，整个酒吧都欢呼起来，和大家一起喊"골!"吧。' } },
{ icon: '⚾', to: { store: 'homerun-batting' },
    title: { en: 'Batting cage', ko: '야구 연습장', ja: 'バッティングセンター', zh: '棒球击球场' },
    text: { en: 'Pick a pitch speed (80 to 140 km/h) and time your swing for a home run. Free: beat your own best.', ko: '80~140km/h 공 속도를 고르고 타이밍 맞춰 홈런! 무료, 내 최고 기록에 도전.', ja: '球速80〜140km/hを選んでタイミングよくホームラン！無料で自己ベストに挑戦。', zh: '选80到140公里的球速，掌握时机打出全垒打！免费，挑战自己的纪录。' } },
{ icon: '🧖', to: { store: 'onsaem-jjimjil' },
    title: { en: 'Jjimjilbang', ko: '찜질방', ja: 'チムジルバン', zh: '汗蒸房' },
    text: { en: 'Sweat it out in the hot kiln, cool off in the ice room, and wear a sheep towel.', ko: '불가마에서 땀 빼고 얼음방에서 식히고, 양머리 수건도 써 봐요.', ja: '汗蒸幕で汗を流し、氷の部屋で涼んで、羊タオルもかぶろう。', zh: '在火窑出汗、去冰屋降温，再戴上羊角毛巾。' } },
{ icon: '💪', to: { store: 'muscle-gym' },
    title: { en: 'Gym', ko: '헬스장', ja: 'ジム', zh: '健身房' },
    text: { en: 'Treadmill, dumbbells, bench press and push-ups. Every set makes you a tiny bit faster (up to +1%).', ko: '러닝머신, 아령, 벤치프레스, 푸시업. 한 세트마다 이동속도가 아주 조금씩 빨라져요(최대 +1%).', ja: 'ランニングマシン、ダンベル、ベンチプレス、腕立て。1セットごとに少しずつ速く（最大+1%）。', zh: '跑步机、哑铃、卧推、俯卧撑。每完成一组速度会稍微提升（最多+1%）。' } },
{ icon: '🧘', to: { store: 'sum-yoga' },
    title: { en: 'Yoga & pilates', ko: '요가·필라테스', ja: 'ヨガ・ピラティス', zh: '瑜伽·普拉提' },
    text: { en: 'Next to the gym in Hongdae. Join the yoga class on a free mat (six poses, keep your balance), or lie on a reformer and push with your breath.', ko: '홍대 헬스장 옆. 빈 매트에서 요가 수업에 함께하거나(자세 6개, 균형 잡기), 리포머에 누워 숨에 맞춰 밀어요.', ja: '弘大のジムの隣。空いたマットでヨガのクラスに参加（6つのポーズ、バランスをキープ）、リフォーマーに寝て呼吸に合わせて押そう。', zh: '在弘大健身房旁边。在空垫子上跟瑜伽课（六个体式，保持平衡），或躺在核心床上跟着呼吸推。' } },
{ icon: '📚', to: { store: 'chaekmaru-library' },
    title: { en: 'Korean books', ko: '한국어 책', ja: '韓国語の本', zh: '韩语书' },
    text: { en: '11 books at the library: Hangul, greetings, idioms, new slang, internet slang, dad jokes and more. Carry one and read it sitting anywhere.', ko: '도서관에 책 11권: 한글, 인사말, 사자성어, 신조어, 인터넷 용어, 아재개그 등. 들고 가서 어디서든 앉아 읽어요.', ja: '図書館に11冊：ハングル、あいさつ、四字熟語、新語、ネット用語、おやじギャグなど。持ち出して座って読めます。', zh: '图书馆有11本书：韩文、问候语、成语、新词、网络用语、冷笑话等。带走后坐下就能读。' } },
{ icon: '🎡', to: { store: 'another-land' },
    title: { en: 'Amusement park', ko: '놀이공원', ja: '遊園地', zh: '游乐园' },
    text: { en: 'Another Land, the candy-house theme park on the island in Seokchon Lake, Songpa (over the Han River south-east of Seongsu): carousel, Ferris wheel, pirate ship and a drop tower (🪙 5000 a ride), and a free balloon shooting gallery.', ko: '송파 석촌호수 섬 위의 과자의 집 놀이공원 어나더랜드(성수 남동쪽, 한강 건너): 회전목마, 대관람차, 바이킹, 자이로드롭(한 번에 🪙 5000), 무료 풍선 사격장.', ja: '松坡・石村湖の島にあるお菓子の家の遊園地アナザーランド（聖水の南東、漢江の向こう）：メリーゴーランド、観覧車、バイキング、フリーフォール（1回 🪙 5000）、無料の風船射的。', zh: '松坡石村湖岛上的糖果屋游乐园「另一乐园」（圣水东南，汉江对岸）：旋转木马、摩天轮、海盗船、跳楼机（每次 🪙 5000），还有免费的气球射击。' } },
{ icon: '🏫', to: { store: 'hyojae-academy' },
    title: { en: 'Hyojae University Korean Academy', ko: '효재대학교 어학당', ja: 'ヒョジェ大学 語学堂', zh: '孝在大学语学堂' },
    text: { en: 'Real Korean courses: Hangul, TOPIK 1-4 and an advanced class. Sit at a desk, study each lesson, pass the quiz and earn a certificate.', ko: '한글, 토픽 1~4급, 고급반까지 진짜 한국어 과정. 책상에 앉아 레슨을 공부하고 퀴즈를 통과해 수료증을 받아요.', ja: 'ハングル、TOPIK1〜4級、上級クラスの本格コース。席に座って学び、クイズに合格して修了証をもらおう。', zh: '真正的韩语课程：韩文、TOPIK 1-4级和高级班。坐到课桌前学习，通过测验获得结业证书。' } },
{ icon: '🏪', to: { store: 'haru-mart' },
    title: { en: 'Convenience store', ko: '편의점', ja: 'コンビニ', zh: '便利店' },
    text: { en: 'Rice balls, cup ramen and banana milk. An umbrella (🪙 5000) opens by itself on rainy and snowy days, so you walk almost as fast as usual.', ko: '삼각김밥, 컵라면, 바나나 우유. 우산(🪙 5000)은 비나 눈 오는 날 저절로 펴져서 평소처럼 걸을 수 있어요.', ja: 'おにぎり、カップ麺、バナナ牛乳。傘（🪙 5000）は雨や雪の日に自動で開き、いつも通りに近い速さで歩けます。', zh: '饭团、杯面、香蕉牛奶。雨伞（🪙 5000）在雨雪天自动撑开，走路几乎和平时一样快。' } },
{ icon: '🦆', to: { store: 'ttukseom-hangang' },
    title: { en: 'Han River park', ko: '한강공원', ja: '漢江公園', zh: '汉江公园' },
    text: { en: 'Fishing, duck boats with a friend, a picnic, and the riverside market: tteokbokki, skewers, hotteok, chicken and handmade crafts.', ko: '낚시, 친구와 오리배, 피크닉, 그리고 강변장터: 떡볶이, 꼬치, 호떡, 치킨, 손작업 소품.', ja: '釣り、友だちとアヒルボート、ピクニック、そして川辺市場：トッポッキ、串焼き、ホットク、チキン、手作り雑貨。', zh: '钓鱼、和朋友踩鸭子船、野餐，还有江边集市：炒年糕、烤串、糖饼、炸鸡和手工小物。' } },
{ icon: '🐟', to: { store: 'seongsu-fishmarket' },
    title: { en: 'Fish market', ko: '수산시장', ja: '魚市場', zh: '水产市场' },
    text: { en: 'Sell the fish you catch.', ko: '잡은 물고기를 팔아요.', ja: '釣った魚を売れます。', zh: '卖掉钓到的鱼。' } },
{ icon: '🏯', to: { zone: 'G' },
    title: { en: 'Gyeongbokgung Palace', ko: '경복궁', ja: '景福宮', zh: '景福宫' },
    text: { en: 'West along Sajik-ro: Gwanghwamun Square, the palace, a hanbok rental and a tea house. Taxis go there too.', ko: '사직로를 따라 서쪽으로: 광화문광장, 경복궁, 한복대여점, 전통찻집. 택시로도 갈 수 있어요.', ja: '社稷路を西へ：光化門広場、景福宮、韓服レンタル、伝統茶房。タクシーでも行けます。', zh: '沿社稷路向西：光化门广场、景福宫、韩服租赁、传统茶馆。也可以坐出租车。' } },
{ icon: '🌊', to: { zone: 'L' },
    title: { en: 'Cheonggyecheon Stream', ko: '청계천', ja: '清渓川', zh: '清溪川' },
    text: { en: 'South of Gwanghwamun Square, a stream flows below the street from Cheonggye Plaza. Take the stairs down to the water, cross the stepping stones and walk under Mojeongyo and Gwangtonggyo bridges. A short stretch: the real stream runs on for about 11 km.', ko: '광화문광장 남쪽 청계광장에서 시작해 길 아래로 흐르는 개천. 계단으로 물가에 내려가 징검다리를 건너고 모전교와 광통교 밑을 걸어 봐요. 짧은 구간만 있고, 실제 청계천은 약 11km 이어져요.', ja: '光化門広場の南、清渓広場から道の下を流れる小川。階段で水辺に下り、飛び石を渡って毛廛橋と広通橋の下を歩こう。短い区間だけで、本物の清渓川は約11km続きます。', zh: '光化门广场南边，从清溪广场开始在街道下方流淌的溪流。走楼梯下到水边，踩着踏石过溪，从毛廛桥和广通桥下走过。这里只有一小段，真实的清溪川长约11公里。' } },
{ icon: '📸', to: { zone: 'P' },
    title: { en: 'The hilltop photo spot and the Open House', ko: '언덕 포토스팟과 열린 한옥', ja: '丘のフォトスポットとオープンハウス', zh: '坡顶拍照点和开放韩屋' },
    text: { en: 'Walk up Bukchon-ro 11-gil to the top of the hill and stand on the footprint mark: the famous view down the alley to the city. The Open House is on Bukchon-ro 5-gil, just inside the gate: learn the parts of a hanok. A few homes up the alley have a 출입 가능 (Visitors welcome) sign: their gate is open, so you can step into the yard. Every other gate is a private home.', ko: '북촌로11길을 따라 언덕 꼭대기까지 올라가 발자국 표시에 서 보세요. 골목 아래로 도시가 보이는 그 유명한 장면이에요. 대문 바로 안쪽 북촌로5길에 열린 한옥이 있어서 한옥의 구조를 배울 수 있어요. 골목의 몇몇 집에는 \'출입 가능\' 표지판이 있어요. 대문이 열려 있어 마당까지 들어가 볼 수 있고, 나머지 대문은 모두 사람이 사는 집이에요.', ja: '北村路11ギルを丘のてっぺんまで登り、足あとマークに立とう。路地の先に街が見えるあの有名な景色。門を入ってすぐの北村路5ギルにオープンハウスがあり、韓屋のしくみを学べます。路地の数軒には「출입 가능（見学できます）」の看板があり、門が開いていて中庭に入れます。ほかの門はすべて人の住む家です。', zh: '沿北村路11街爬到坡顶，站在脚印标记上：就是小巷尽头望见城市的那个有名景色。进门不远的北村路5街有开放韩屋，可以了解韩屋的结构。小巷里有几户挂着“출입 가능（欢迎参观）”的牌子，大门敞开，可以走进院子。其他大门都是居民的家。' } },
{ icon: '👘', to: { store: 'gahoe-hanbok' },
    title: { en: 'Gahoe Hanbok Rental', ko: '가회 한복대여', ja: '嘉会 韓服レンタル', zh: '嘉会韩服租赁' },
    text: { en: 'Rent a hanbok for 2 hours. Walk in through the Bukchon gate by Anguk Station; it is on Bukchon-ro 5-gil.', ko: '안국역 옆 북촌 대문으로 들어가 북촌로5길에서 한복을 2시간 빌려요.', ja: '安国駅そばの北村の門から入り、北村路5ギルで韓服を2時間レンタル。', zh: '从安国站旁的北村大门进去，在北村路5街租韩服2小时。' } },
{ icon: '🎀', to: { store: 'maeum-knot' },
    title: { en: 'Knot and hanji workshops', ko: '매듭·한지 공방', ja: '結び・韓紙の工房', zh: '绳结和韩纸工坊' },
    text: { en: 'Maeum Knot Studio: tie a maedeup knot charm. Saekji Paper Studio: make a hanji lantern. Talk to the teacher inside.', ko: '마음매듭에서 매듭 노리개를, 색지공방에서 한지 등을 만들어요. 안에서 선생님에게 말을 걸어요.', ja: 'マウム結び工房でメドゥプのお守り、セクチ韓紙工房で韓紙の灯りづくり。中の先生に話しかけて。', zh: '在心结工坊编绳结挂饰，在彩纸工坊做韩纸灯。进去和老师说话吧。' } },
{ icon: '🍵', to: { store: 'noeul-teahouse' },
    title: { en: 'Noeul Teahouse', ko: '노을찻집', ja: 'ノウル茶房', zh: '晚霞茶馆' },
    text: { en: 'Omija and jujube tea, yakgwa and injeolmi bingsu.', ko: '오미자차, 대추차, 약과, 인절미 빙수.', ja: '五味子茶、なつめ茶、ヤックァ、きなこ餅かき氷。', zh: '五味子茶、大枣茶、药果和打糕刨冰。' } },
];

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class InfoUI {
  // guide(to): start the route guide to { store } or { zone }; returns false
  // if the place isn't on this map.
  // places: { districtOf(to) -> district id of a { store } / { zone },
  //   storesIn(id) -> [store] in a district, nearest(workshop) -> store id }.
  constructor({ root, guide, places }) {
    Object.assign(this, { root, guide, places });
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  // The game guide: how things work.
  showGame() {
    this.render('🎮 ' + L(T.gameTitle), L(T.gameIntro), [{ rows: GAME_TOPICS }]);
  }
  // The area guide: what there is in this district, then the others.
  showArea(district) {
    const P = this.places;
    const here = PLACE_TOPICS.filter((tp) => tp.to && P?.districtOf(tp.to) === district);
    const named = new Set(here.map((tp) => tp.to.store).filter(Boolean));
    const more = (P?.storesIn(district) || []).filter((st) => !named.has(st.id)).map((st) => ({
      icon: storeIcon(st), title: st.name, text: st.tagline || {}, to: { store: st.id },
    }));
    const others = Object.keys(AREA).filter((id) => id !== district).map((id) => ({
      icon: AREA[id].icon, title: AREA[id].name, text: AREA[id].intro, to: AREA[id].to,
    }));
    const name = L(AREA[district]?.name || { en: district });
    this.render('🗺️ ' + fmt(L(T.areaTitle), { name }), L(AREA[district]?.intro || T.intro), [
      { rows: here },
      { head: L(T.morePlaces), rows: more },
      { head: L(T.otherAreas), rows: others },
    ]);
  }
  show() { this.showGame(); }
  render(title, intro, sections) {
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', L(T.close));
    x.onclick = () => this.close();
    const list = el('div', 'info-list');
    for (const sec of sections) {
      if (!sec.rows.length) continue;
      if (sec.head) list.append(el('h4', 'info-head', sec.head));
      for (const tp of sec.rows) {
        const row = el('div', 'info-row');
        const body = el('div');
        body.append(el('strong', null, `${tp.icon} ${L(tp.title)}`), el('p', null, L(tp.text)));
        row.append(body);
        const to = tp.to?.workshop ? (this.places?.nearest(tp.to.workshop) ? { store: this.places.nearest(tp.to.workshop) } : null) : tp.to;
        if (to) {
          const go = el('button', 'chip', L(T.go));
          go.onclick = () => { if (this.guide(to) !== false) this.close(); };
          row.append(go);
        }
        list.append(row);
      }
    }
    this.root.replaceChildren(x, el('h3', null, title), el('p', 'order-hint', intro), list);
  }
}

// The first-time hint card. storage key mk.infoHintOff = "don't show again".
const OFF = 'mk.infoHintOff';
export function showInfoHint(root, { onGo }) {
  try { if (localStorage.getItem(OFF)) return false; } catch { /* storage blocked: show it */ }
  const go = el('button', 'primary', '📍 ' + L(T.hintGo));
  const later = el('button', 'chip', L(T.later));
  const never = el('button', 'chip', L(T.never));
  const done = () => { root.hidden = true; };
  go.onclick = () => { done(); onGo(); };
  later.onclick = done;
  never.onclick = () => { try { localStorage.setItem(OFF, '1'); } catch { /* ignore */ } done(); };
  const actions = el('div', 'order-actions');
  actions.append(go, later, never);
  root.replaceChildren(el('p', null, 'ℹ️ ' + L(T.hint)), actions);
  root.hidden = false;
  return true;
}
export { T as INFO_TEXT };
