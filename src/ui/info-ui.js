// Information Centers (one in every neighbourhood), each with two guides at
// the front desk: the game guide explains how things work, the area guide
// shows what there is in this neighbourhood, with a "Go" button for each
// place. Downloaded the first time a guide is asked; the street's words
// (area names, the first-time hint) are in ui/info-labels.js.
import { L, fmt } from './pocha-ui.js';
import { INFO_TEXT as T, AREA, el } from './info-labels.js';
import { storeIcon } from '../core/store-icons.js';

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
{ icon: '🥊', to: { store: 'punch-arcade' },
    title: { en: 'Arcade', ko: '오락실', ja: 'ゲームセンター', zh: '游戏厅' },
    text: { en: 'A fighting game, alone or against someone in the room. Matches play on the wall screens.', ko: '격투 게임을 혼자 또는 옆 사람과. 경기는 벽 스크린에 나와요.', ja: '格闘ゲームを一人でも、隣の人とも。試合は壁のスクリーンに映ります。', zh: '格斗游戏，可单人也可和旁边的人对战，比赛会在墙上大屏幕播放。' } },
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
    text: { en: 'Modu Land, the candy-house theme park on the island in Seokchon Lake, Songpa (over the Han River south-east of Seongsu): a roller coaster, carousel, Ferris wheel, pirate ship, drop tower, swing ride, teacups, park train, log flume and bumper cars (from 🪙 2000 a ride, or a day pass), a free mirror maze and a balloon shooting gallery.', ko: '송파 석촌호수 섬 위의 과자의 집 놀이공원 모두랜드(성수 남동쪽, 한강 건너): 롤러코스터, 회전목마, 대관람차, 바이킹, 자이로드롭, 회전그네, 찻잔, 기차, 후룸라이드, 범퍼카(한 번에 🪙 2000부터, 자유이용권도 있어요), 무료 거울 미로와 풍선 사격장.', ja: '松坡・石村湖の島にあるお菓子の家の遊園地モドゥランド（聖水の南東、漢江の向こう）：ジェットコースター、メリーゴーランド、観覧車、バイキング、フリーフォール、回転ブランコ、ティーカップ、汽車、急流すべり、バンパーカー（1回 🪙 2000から、フリーパスも）、無料のミラー迷路と風船射的。', zh: '松坡石村湖岛上的糖果屋游乐园「Modu乐园」（圣水东南，汉江对岸）：过山车、旋转木马、摩天轮、海盗船、跳楼机、旋转秋千、旋转茶杯、小火车、激流勇进、碰碰车（每次 🪙 2000 起，也有一日通票），还有免费的镜子迷宫和气球射击。' } },
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
{ icon: '🏯', to: { zone: 'B-1' },
    title: { en: 'Gyeongbokgung Palace', ko: '경복궁', ja: '景福宮', zh: '景福宫' },
    text: { en: 'West along Sajik-ro: Gwanghwamun Square, the palace, a hanbok rental and a tea house. Taxis go there too.', ko: '사직로를 따라 서쪽으로: 광화문광장, 경복궁, 한복대여점, 전통찻집. 택시로도 갈 수 있어요.', ja: '社稷路を西へ：光化門広場、景福宮、韓服レンタル、伝統茶房。タクシーでも行けます。', zh: '沿社稷路向西：光化门广场、景福宫、韩服租赁、传统茶馆。也可以坐出租车。' } },
{ icon: '🌊', to: { zone: 'B-2' },
    title: { en: 'Cheonggyecheon Stream', ko: '청계천', ja: '清渓川', zh: '清溪川' },
    text: { en: 'South of Gwanghwamun Square, a stream flows below the street from Cheonggye Plaza. Take the stairs down to the water, cross the stepping stones and walk under Mojeongyo and Gwangtonggyo bridges. A short stretch: the real stream runs on for about 11 km.', ko: '광화문광장 남쪽 청계광장에서 시작해 길 아래로 흐르는 개천. 계단으로 물가에 내려가 징검다리를 건너고 모전교와 광통교 밑을 걸어 봐요. 짧은 구간만 있고, 실제 청계천은 약 11km 이어져요.', ja: '光化門広場の南、清渓広場から道の下を流れる小川。階段で水辺に下り、飛び石を渡って毛廛橋と広通橋の下を歩こう。短い区間だけで、本物の清渓川は約11km続きます。', zh: '光化门广场南边，从清溪广场开始在街道下方流淌的溪流。走楼梯下到水边，踩着踏石过溪，从毛廛桥和广通桥下走过。这里只有一小段，真实的清溪川长约11公里。' } },
{ icon: '📸', to: { zone: 'B-3' },
    title: { en: 'The hilltop photo spot and the Open House', ko: '언덕 포토스팟과 열린 한옥', ja: '丘のフォトスポットとオープンハウス', zh: '坡顶拍照点和开放韩屋' },
    text: { en: 'Walk up Bukchon-ro 11-gil to the top of the hill and stand on the footprint mark: the famous view down the alley to the city. The Open House is on the lane of shops just inside the gate: learn the parts of a hanok. A few homes up the alley have a 출입 가능 (Visitors welcome) sign: their gate is open, so you can step into the yard. Every other gate is a private home.', ko: '북촌로11길을 따라 언덕 꼭대기까지 올라가 발자국 표시에 서 보세요. 골목 아래로 도시가 보이는 그 유명한 장면이에요. 대문 바로 안쪽 가게 골목에 열린 한옥이 있어서 한옥의 구조를 배울 수 있어요. 골목의 몇몇 집에는 \'출입 가능\' 표지판이 있어요. 대문이 열려 있어 마당까지 들어가 볼 수 있고, 나머지 대문은 모두 사람이 사는 집이에요.', ja: '北村路11ギルを丘のてっぺんまで登り、足あとマークに立とう。路地の先に街が見えるあの有名な景色。門を入ってすぐのお店の路地にオープンハウスがあり、韓屋のしくみを学べます。路地の数軒には「출입 가능（見学できます）」の看板があり、門が開いていて中庭に入れます。ほかの門はすべて人の住む家です。', zh: '沿北村路11街爬到坡顶，站在脚印标记上：就是小巷尽头望见城市的那个有名景色。进门不远的商店小巷里有开放韩屋，可以了解韩屋的结构。小巷里有几户挂着“출입 가능（欢迎参观）”的牌子，大门敞开，可以走进院子。其他大门都是居民的家。' } },
{ icon: '👘', to: { store: 'gahoe-hanbok' },
    title: { en: 'Gahoe Hanbok Rental', ko: '가회 한복대여', ja: '嘉会 韓服レンタル', zh: '嘉会韩服租赁' },
    text: { en: 'Rent a hanbok for 2 hours. Walk in through the Bukchon gate by Anguk Station; it is on the lane of shops inside.', ko: '안국역 옆 북촌 대문으로 들어가 가게 골목에서 한복을 2시간 빌려요.', ja: '安国駅そばの北村の門から入り、お店の路地で韓服を2時間レンタル。', zh: '从安国站旁的北村大门进去，在商店小巷租韩服2小时。' } },
{ icon: '🎀', to: { store: 'maeum-knot' },
    title: { en: 'Knot and hanji workshops', ko: '매듭·한지 공방', ja: '結び・韓紙の工房', zh: '绳结和韩纸工坊' },
    text: { en: 'Maeum Knot Studio: tie a maedeup knot charm. Saekji Paper Studio: make a hanji lantern. Talk to the teacher inside.', ko: '마음매듭에서 매듭 노리개를, 색지공방에서 한지 등을 만들어요. 안에서 선생님에게 말을 걸어요.', ja: 'マウム結び工房でメドゥプのお守り、セクチ韓紙工房で韓紙の灯りづくり。中の先生に話しかけて。', zh: '在心结工坊编绳结挂饰，在彩纸工坊做韩纸灯。进去和老师说话吧。' } },
{ icon: '🍵', to: { store: 'noeul-teahouse' },
    title: { en: 'Noeul Teahouse', ko: '노을찻집', ja: 'ノウル茶房', zh: '晚霞茶馆' },
    text: { en: 'Omija and jujube tea, yakgwa and injeolmi bingsu.', ko: '오미자차, 대추차, 약과, 인절미 빙수.', ja: '五味子茶、なつめ茶、ヤックァ、きなこ餅かき氷。', zh: '五味子茶、大枣茶、药果和打糕刨冰。' } },
];

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

export { AREA };
