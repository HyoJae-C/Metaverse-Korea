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
  go: { en: 'Go', ko: '가기', ja: '行く', zh: '前往', es: 'Ir', id: 'Pergi', vi: 'Đi', hi: 'चलें', ar: 'اذهب' },
  gameGuide: { en: 'Game Guide', ko: '게임 안내', ja: 'ゲーム案内', zh: '游戏向导', es: 'Guía del juego', id: 'Pemandu Game', vi: 'Hướng dẫn trò chơi', hi: 'गेम गाइड', ar: 'مرشد اللعبة' },
  areaGuide: { en: 'Area Guide', ko: '지역 안내', ja: 'エリア案内', zh: '地区向导', es: 'Guía de la zona', id: 'Pemandu Area', vi: 'Hướng dẫn khu vực', hi: 'इलाक़ा गाइड', ar: 'مرشد المنطقة' },
  askGame: { en: 'Ask about the game', ko: '게임 안내 듣기', ja: 'ゲームについて聞く', zh: '询问游戏玩法', es: 'Preguntar por el juego', id: 'Tanya soal game', vi: 'Hỏi về trò chơi', hi: 'गेम के बारे में पूछें', ar: 'اسأل عن اللعبة' },
  askArea: { en: 'Ask about {name}', ko: '{name} 안내 듣기', ja: '{name}について聞く', zh: '询问{name}', es: 'Preguntar por {name}', id: 'Tanya soal {name}', vi: 'Hỏi về {name}', hi: '{name} के बारे में पूछें', ar: 'اسأل عن {name}' },
  gameTitle: { en: 'Game guide', ko: '게임 안내', ja: 'ゲーム案内', zh: '游戏指南', es: 'Guía del juego', id: 'Panduan game', vi: 'Hướng dẫn trò chơi', hi: 'गेम गाइड', ar: 'دليل اللعبة' },
  gameIntro: {
    en: 'Here is how things work in Another Seoul. Ask my colleague next to me about places in this neighbourhood.',
    ko: '어나더 서울에서 할 수 있는 것들을 알려 드릴게요. 이 동네 장소는 옆 동료에게 물어보세요.',
    ja: 'アナザーソウルの遊び方をご案内します。この辺りの場所は隣の同僚に聞いてください。',
    zh: '这里介绍Another Seoul的玩法。这一带有哪些地方，请问我旁边的同事。',
    es: 'Así funciona Another Seoul. Pregunta a mi compañero de al lado por los lugares de este barrio.',
    id: 'Begini cara main di Another Seoul. Tanyakan tempat-tempat di sekitar sini ke rekan di sebelahku.',
    vi: 'Đây là cách chơi Another Seoul. Hỏi đồng nghiệp bên cạnh tôi về các địa điểm trong khu này nhé.',
    hi: 'Another Seoul में चीज़ें ऐसे चलती हैं। इस इलाक़े की जगहों के बारे में मेरे बगल वाले साथी से पूछें।',
    ar: 'إليك كيف تسير الأمور في Another Seoul. اسأل زميلي بجانبي عن أماكن هذا الحي.',
  },
  areaTitle: { en: '{name} guide', ko: '{name} 안내', ja: '{name}案内', zh: '{name}指南', es: 'Guía de {name}', id: 'Panduan {name}', vi: 'Hướng dẫn {name}', hi: '{name} गाइड', ar: 'دليل {name}' },
  morePlaces: { en: 'More places here', ko: '이 동네의 다른 곳', ja: 'この辺りのほかの場所', zh: '这一带的其他地方', es: 'Más lugares aquí', id: 'Tempat lain di sini', vi: 'Thêm địa điểm ở đây', hi: 'यहाँ की और जगहें', ar: 'أماكن أخرى هنا' },
  otherAreas: { en: 'Other neighbourhoods', ko: '다른 동네', ja: 'ほかのエリア', zh: '其他街区', es: 'Otros barrios', id: 'Lingkungan lain', vi: 'Khu khác', hi: 'दूसरे इलाक़े', ar: 'أحياء أخرى' },
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
    name: { en: 'Seongsu', ko: '성수', ja: '聖水', zh: '圣水', es: 'Seongsu', id: 'Seongsu', vi: 'Seongsu', hi: 'सोंगसू', ar: 'سونغسو' },
    intro: { en: 'Seongsu: café streets, fashion and beauty shops, perfume houses and pop-ups around Seongsu Square, with Seoul Forest and the Han River close by.', ko: '성수: 성수 광장을 둘러싼 카페 거리, 패션·뷰티 가게, 향수 가게와 팝업. 서울숲과 한강도 가까워요.', ja: '聖水：聖水広場を囲むカフェ通り、ファッション・ビューティーの店、香水店とポップアップ。ソウルの森と漢江もすぐ近く。', zh: '圣水：圣水广场周围的咖啡街、时装美妆店、香水店和快闪店，首尔林和汉江也很近。' } },
  gyeongbokgung: { icon: '🏯', to: { zone: 'G' },
    name: { en: 'Gyeongbokgung', ko: '경복궁', ja: '景福宮', zh: '景福宫', es: 'Gyeongbokgung', id: 'Gyeongbokgung', vi: 'Gyeongbokgung', hi: 'ग्योंगबोकगुंग', ar: 'غيونغبوكغونغ' },
    intro: { en: 'Gyeongbokgung: Gwanghwamun Square and the palace, a hanbok rental, a traditional tea house and a kimchi class. South of the square, Cheonggyecheon Stream starts at Cheonggye Plaza.', ko: '경복궁: 광화문광장과 궁궐, 한복대여점, 전통찻집, 김치 만들기 교실. 광장 남쪽 청계광장에서 청계천이 시작돼요.', ja: '景福宮：光化門広場と王宮、韓服レンタル、伝統茶房、キムチ教室。広場の南、清渓広場から清渓川が始まります。', zh: '景福宫：光化门广场和宫殿、韩服租赁、传统茶馆、泡菜课。广场南边的清溪广场是清溪川的起点。' } },
  itaewon: { icon: '🌍', to: { zone: 'H' },
    name: { en: 'Itaewon', ko: '이태원', ja: '梨泰院', zh: '梨泰院', es: 'Itaewon', id: 'Itaewon', vi: 'Itaewon', hi: 'इतेवॉन', ar: 'إيتايوون' },
    intro: { en: 'Itaewon: World Food Street and cafés in the north-west, bars and clubs in the north-east, and Yongmaru Market (traditional market) south-west of the station. West along Itaewon-ro: the War History Museum, a quiet place to remember.', ko: '이태원: 북서쪽 세계음식거리와 카페, 북동쪽 바와 클럽, 역 남서쪽의 용마루시장(전통시장). 이태원로를 따라 서쪽으로 가면 조용히 추모할 수 있는 전쟁역사박물관이 있어요.', ja: '梨泰院：北西に世界グルメ通りとカフェ、北東にバーとクラブ、駅の南西にヨンマル市場（伝統市場）。梨泰院路を西へ行くと、静かに追悼できる戦争歴史博物館があります。', zh: '梨泰院：西北是世界美食街和咖啡馆，东北是酒吧和夜店，车站西南是龙脊市场（传统市场）。沿梨泰院路往西是战争历史博物馆，一个可以静静缅怀的地方。' } },
  songpa: { icon: '🎡', to: { store: 'another-land' },
    name: { en: 'Songpa', ko: '송파', ja: '松坡', zh: '松坡', es: 'Songpa', id: 'Songpa', vi: 'Songpa', hi: 'सोंगपा', ar: 'سونغبا' },
    intro: { en: 'Songpa: walks around Seokchon Lake and Another Land, the theme park on the lake island. East along Olympic-ro, Olympic Park: the Peace Gate, the lone tree, and a skate park on the Peace Plaza for tricks on boards, inline skates and bikes.', ko: '송파: 석촌호수 산책길과 호수 섬 위의 놀이공원 어나더랜드. 올림픽로를 따라 동쪽에는 올림픽공원이 있어요. 평화의문, 나홀로나무, 그리고 평화의광장 스케이트파크에서 보드, 인라인, 자전거로 묘기를 부려 보세요.', ja: '松坡：石村湖の散歩道と、湖の島の遊園地アナザーランド。オリンピック路を東へ行くとオリンピック公園：平和の門、ひとりぼっちの木、平和の広場のスケートパークでスケボー・インライン・自転車の技を。', zh: '松坡：石村湖步道和湖心岛上的游乐园另一乐园。沿奥林匹克路往东是奥林匹克公园：和平之门、孤独树，还有和平广场上的滑板公园，可以用滑板、轮滑和自行车秀技巧。' } },
  seodaemun: { icon: '📚', to: { zone: 'I' },
    name: { en: 'Sinchon', ko: '신촌', ja: '新村', zh: '新村', es: 'Sinchon', id: 'Sinchon', vi: 'Sinchon', hi: 'सिनचोन', ar: 'سينتشون' },
    intro: { en: 'Sinchon (Seodaemun): a campus street with a Korean academy, a library full of Korean books, and three cinemas on Sinchon-ro: Byeolbit Cinema, Doodle Cinema 2D and the black-and-white Silver Screen Theater.', ko: '신촌(서대문): 어학당과 한국어 책이 가득한 도서관이 있는 대학가. 신촌로에는 별빛 시네마, 두들 시네마 2D, 흑백 영화관 은막 흑백극장이 모여 있어요.', ja: '新村（西大門）：語学堂と韓国語の本でいっぱいの図書館がある大学街。新村路にはビョルビッ シネマ、ドゥードゥル シネマ 2D、白黒の銀幕モノクロ劇場が並んでいます。', zh: '新村（西大门）：有语学堂和满是韩语书的图书馆的大学街。新村路上有星光影院、涂鸦影院 2D 和黑白的银幕黑白剧场。' } },
  hongdae: { icon: '🎸', to: { zone: 'J' },
    name: { en: 'Hongdae', ko: '홍대', ja: '弘大', zh: '弘大', es: 'Hongdae', id: 'Hongdae', vi: 'Hongdae', hi: 'होंगदे', ar: 'هونغداي' },
    intro: { en: 'Hongdae: buskers on the Walking Street, indie shops, animal cafés, tarot and a neon name tag shop.', ko: '홍대: 걷고싶은거리의 버스킹, 인디 가게, 동물 카페, 타로, 네온 네임택 가게.', ja: '弘大：歩きたい通りのバスキング、インディーの店、動物カフェ、タロット、ネオンのネームタグ店。', zh: '弘大：步行街的街头表演、独立小店、动物咖啡馆、塔罗和霓虹名牌店。' } },
};

// Game help (the game guide): how things work, anywhere.
export const GAME_TOPICS = [
  { icon: '🧭', to: null,
    title: { en: 'Getting around', ko: '이동하는 법', ja: '移動のしかた', zh: '怎么移动' },
    text: { en: 'In 🗺️ Map, tap a place: a path appears and 🚶 Auto walks you there by itself. 🛵 Vehicle hops on a free bike. 🚕 Taxi (in the map) is fastest but costs coins. Walk down the subway stairs (🚇 on the map) to ride to other districts for 🪙 2.', ko: '🗺️ 지도에서 장소를 누르면 길이 나오고, 🚶 자동을 누르면 알아서 걸어가요. 🛵 탈것을 누르면 무료 자전거를 타요. 🚕 택시(지도 안)는 제일 빠르지만 코인이 들어요. 지하철 계단(지도의 🚇)으로 내려가면 🪙 2로 다른 동네에 갈 수 있어요.', ja: '🗺️地図で場所をタップすると道が出て、🚶自動で勝手に歩きます。🛵乗り物で無料の自転車に乗れます。🚕タクシー（地図の中）は一番速いけどコインがかかります。地下鉄の階段（地図の🚇）を下りると🪙 2で他の街へ行けます。', zh: '在🗺️地图上点一个地方会出现路线，点🚶自动就会自己走过去。🛵交通工具可以骑免费自行车。🚕出租车（在地图里）最快但要花金币。走下地铁楼梯（地图上的🚇），花🪙 2就能去别的街区。' } },
  { icon: '🪙', to: null,
    title: { en: 'Coins', ko: '코인', ja: 'コイン', zh: '金币' },
    text: { en: 'Earn coins from games, missions, fishing and deliveries. Spend them on games, photos, emblems and more.', ko: '게임, 미션, 낚시, 배달로 코인을 벌고 게임, 사진, 엠블럼 등에 써요.', ja: 'ゲーム・ミッション・釣り・配達でコインを稼ぎ、ゲームや写真、エンブレムに使えます。', zh: '通过游戏、任务、钓鱼、送外卖赚金币，用来玩游戏、拍照、买徽章等。' } },
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
{ icon: '⚾', to: { store: 'homerun-batting' },
    title: { en: 'Batting cage', ko: '야구 연습장', ja: 'バッティングセンター', zh: '棒球击球场' },
    text: { en: 'Pick a pitch speed (80 to 140 km/h) and time your swing for a home run. Free: beat your own best.', ko: '80~140km/h 공 속도를 고르고 타이밍 맞춰 홈런! 무료, 내 최고 기록에 도전.', ja: '球速80〜140km/hを選んでタイミングよくホームラン！無料で自己ベストに挑戦。', zh: '选80到140公里的球速，掌握时机打出全垒打！免费，挑战自己的纪录。' } },
{ icon: '🧖', to: { store: 'onsaem-jjimjil' },
    title: { en: 'Jjimjilbang', ko: '찜질방', ja: 'チムジルバン', zh: '汗蒸房' },
    text: { en: 'Sweat it out in the hot kiln, cool off in the ice room, and wear a sheep towel.', ko: '불가마에서 땀 빼고 얼음방에서 식히고, 양머리 수건도 써 봐요.', ja: '汗蒸幕で汗を流し、氷の部屋で涼んで、羊タオルもかぶろう。', zh: '在火窑出汗、去冰屋降温，再戴上羊角毛巾。' } },
{ icon: '💪', to: { store: 'muscle-gym' },
    title: { en: 'Gym', ko: '헬스장', ja: 'ジム', zh: '健身房' },
    text: { en: 'Treadmill, dumbbells, bench press and push-ups. Every set makes you a tiny bit faster (up to +1%).', ko: '러닝머신, 아령, 벤치프레스, 푸시업. 한 세트마다 이동속도가 아주 조금씩 빨라져요(최대 +1%).', ja: 'ランニングマシン、ダンベル、ベンチプレス、腕立て。1セットごとに少しずつ速く（最大+1%）。', zh: '跑步机、哑铃、卧推、俯卧撑。每完成一组速度会稍微提升（最多+1%）。' } },
{ icon: '📚', to: { store: 'chaekmaru-library' },
    title: { en: 'Korean books', ko: '한국어 책', ja: '韓国語の本', zh: '韩语书' },
    text: { en: '11 books at the library: Hangul, greetings, idioms, new slang, internet slang, dad jokes and more. Carry one and read it sitting anywhere.', ko: '도서관에 책 11권: 한글, 인사말, 사자성어, 신조어, 인터넷 용어, 아재개그 등. 들고 가서 어디서든 앉아 읽어요.', ja: '図書館に11冊：ハングル、あいさつ、四字熟語、新語、ネット用語、おやじギャグなど。持ち出して座って読めます。', zh: '图书馆有11本书：韩文、问候语、成语、新词、网络用语、冷笑话等。带走后坐下就能读。' } },
{ icon: '🎡', to: { store: 'another-land' },
    title: { en: 'Amusement park', ko: '놀이공원', ja: '遊園地', zh: '游乐园' },
    text: { en: 'Another Land, the candy-house theme park on the island in Seokchon Lake, Songpa (over the Han River south-east of Seongsu): carousel, Ferris wheel, pirate ship and a drop tower (🪙 2 a ride), and a free balloon shooting gallery.', ko: '송파 석촌호수 섬 위의 과자의 집 놀이공원 어나더랜드(성수 남동쪽, 한강 건너): 회전목마, 대관람차, 바이킹, 자이로드롭(한 번에 🪙 2), 무료 풍선 사격장.', ja: '松坡・石村湖の島にあるお菓子の家の遊園地アナザーランド（聖水の南東、漢江の向こう）：メリーゴーランド、観覧車、バイキング、フリーフォール（1回 🪙 2）、無料の風船射的。', zh: '松坡石村湖岛上的糖果屋游乐园「另一乐园」（圣水东南，汉江对岸）：旋转木马、摩天轮、海盗船、跳楼机（每次 🪙 2），还有免费的气球射击。' } },
{ icon: '🏫', to: { store: 'hyojae-academy' },
    title: { en: 'Hyojae University Korean Academy', ko: '효재대학교 어학당', ja: 'ヒョジェ大学 語学堂', zh: '孝在大学语学堂' },
    text: { en: 'Real Korean courses: Hangul, TOPIK 1-4 and an advanced class. Sit at a desk, study each lesson, pass the quiz and earn a certificate.', ko: '한글, 토픽 1~4급, 고급반까지 진짜 한국어 과정. 책상에 앉아 레슨을 공부하고 퀴즈를 통과해 수료증을 받아요.', ja: 'ハングル、TOPIK1〜4級、上級クラスの本格コース。席に座って学び、クイズに合格して修了証をもらおう。', zh: '真正的韩语课程：韩文、TOPIK 1-4级和高级班。坐到课桌前学习，通过测验获得结业证书。' } },
{ icon: '🏪', to: { store: 'haru-mart' },
    title: { en: 'Convenience store', ko: '편의점', ja: 'コンビニ', zh: '便利店' },
    text: { en: 'Rice balls, cup ramen and banana milk. An umbrella (🪙 5) opens by itself on rainy and snowy days, so you walk almost as fast as usual.', ko: '삼각김밥, 컵라면, 바나나 우유. 우산(🪙 5)은 비나 눈 오는 날 저절로 펴져서 평소처럼 걸을 수 있어요.', ja: 'おにぎり、カップ麺、バナナ牛乳。傘（🪙 5）は雨や雪の日に自動で開き、いつも通りに近い速さで歩けます。', zh: '饭团、杯面、香蕉牛奶。雨伞（🪙 5）在雨雪天自动撑开，走路几乎和平时一样快。' } },
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
