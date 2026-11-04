// Information Center: what you can do in town and where, with a "show me the
// way" button for each place. Also the first-time hint that points new
// players here (with "don't show again").
import { L } from './pocha-ui.js';

const T = {
  title: { en: 'Information Center', ko: '안내센터', ja: 'インフォメーションセンター', zh: '信息中心' },
  intro: {
    en: 'Welcome! Here is everything you can do around town. Tap "Go" and the guide line takes you there.',
    ko: '어서 오세요! 이 동네에서 할 수 있는 것들을 모았어요. "가기"를 누르면 길 안내 선이 데려다줘요.',
    ja: 'ようこそ！この街でできることをまとめました。「行く」を押すと道案内が表示されます。',
    zh: '欢迎！这里汇总了城里能做的事。点“前往”就会显示路线。',
  },
  go: { en: 'Go', ko: '가기', ja: '行く', zh: '前往' },
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

// Each topic: emoji, title, text, and where "Go" leads (a store id or a zone).
export const TOPICS = [
  { icon: '🧭', to: null,
    title: { en: 'Getting around', ko: '이동하는 법', ja: '移動のしかた', zh: '怎么移动' },
    text: { en: 'In 🗺️ Map, tap a place: a path appears and 🚶 Auto walks you there by itself. 🛵 Vehicle hops on a free bike. 🚕 Taxi (in the map) is fastest but costs coins. Walk down the subway stairs (🚇 on the map) to ride to other districts for 🪙 2.', ko: '🗺️ 지도에서 장소를 누르면 길이 나오고, 🚶 자동을 누르면 알아서 걸어가요. 🛵 탈것을 누르면 무료 자전거를 타요. 🚕 택시(지도 안)는 제일 빠르지만 코인이 들어요. 지하철 계단(지도의 🚇)으로 내려가면 🪙 2로 다른 동네에 갈 수 있어요.', ja: '🗺️地図で場所をタップすると道が出て、🚶自動で勝手に歩きます。🛵乗り物で無料の自転車に乗れます。🚕タクシー（地図の中）は一番速いけどコインがかかります。地下鉄の階段（地図の🚇）を下りると🪙 2で他の街へ行けます。', zh: '在🗺️地图上点一个地方会出现路线，点🚶自动就会自己走过去。🛵交通工具可以骑免费自行车。🚕出租车（在地图里）最快但要花金币。走下地铁楼梯（地图上的🚇），花🪙 2就能去别的街区。' } },
  { icon: '🪙', to: null,
    title: { en: 'Coins', ko: '코인', ja: 'コイン', zh: '金币' },
    text: { en: 'Earn coins from games, missions, fishing and deliveries. Spend them on games, photos, emblems and more.', ko: '게임, 미션, 낚시, 배달로 코인을 벌고 게임, 사진, 엠블럼 등에 써요.', ja: 'ゲーム・ミッション・釣り・配達でコインを稼ぎ、ゲームや写真、エンブレムに使えます。', zh: '通过游戏、任务、钓鱼、送外卖赚金币，用来玩游戏、拍照、买徽章等。' } },
  { icon: '🏷️', to: { store: 'name-studio' },
    title: { en: 'Name tag emblems', ko: '닉네임 엠블럼', ja: '名札エンブレム', zh: '名牌徽章' },
    text: { en: '20 emblems and name colours, from basic to dazzling.', ko: '기본부터 완전 화려함까지 엠블럼 20종과 이름 색상.', ja: 'ベーシックから超ド派手まで、エンブレム20種と名前の色。', zh: '从基础到超华丽，20种徽章和名字颜色。' } },
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
    text: { en: 'Another Land, the candy-house theme park on the island in Seokchon Lake, Songpa (over the Han River south-east of Seongsu): carousel, Ferris wheel, pirate ship and a drop tower. 🪙 2 a ride.', ko: '송파 석촌호수 섬 위의 과자의 집 놀이공원 어나더랜드(성수 남동쪽, 한강 건너): 회전목마, 대관람차, 바이킹, 자이로드롭. 한 번에 🪙 2.', ja: '松坡・石村湖の島にあるお菓子の家の遊園地アナザーランド（聖水の南東、漢江の向こう）：メリーゴーランド、観覧車、バイキング、フリーフォール。1回 🪙 2。', zh: '松坡石村湖岛上的糖果屋游乐园「另一乐园」（圣水东南，汉江对岸）：旋转木马、摩天轮、海盗船、跳楼机。每次 🪙 2。' } },
  { icon: '🏫', to: { store: 'hyojae-academy' },
    title: { en: 'Hyojae Korean Academy', ko: '효재어학당', ja: 'ヒョジェ語学堂', zh: '孝在语学堂' },
    text: { en: 'Real Korean courses: Hangul, TOPIK 1-4 and an advanced class. Sit at a desk, study each lesson, pass the quiz and earn a certificate.', ko: '한글, 토픽 1~4급, 고급반까지 진짜 한국어 과정. 책상에 앉아 레슨을 공부하고 퀴즈를 통과해 수료증을 받아요.', ja: 'ハングル、TOPIK1〜4級、上級クラスの本格コース。席に座って学び、クイズに合格して修了証をもらおう。', zh: '真正的韩语课程：韩文、TOPIK 1-4级和高级班。坐到课桌前学习，通过测验获得结业证书。' } },
  { icon: '🏪', to: { store: 'haru-mart' },
    title: { en: 'Convenience store', ko: '편의점', ja: 'コンビニ', zh: '便利店' },
    text: { en: 'Rice balls, cup ramen and banana milk. An umbrella (🪙 5) opens by itself on rainy and snowy days, so you walk almost as fast as usual.', ko: '삼각김밥, 컵라면, 바나나 우유. 우산(🪙 5)은 비나 눈 오는 날 저절로 펴져서 평소처럼 걸을 수 있어요.', ja: 'おにぎり、カップ麺、バナナ牛乳。傘（🪙 5）は雨や雪の日に自動で開き、いつも通りに近い速さで歩けます。', zh: '饭团、杯面、香蕉牛奶。雨伞（🪙 5）在雨雪天自动撑开，走路几乎和平时一样快。' } },
  { icon: '🦆', to: { store: 'ttukseom-hangang' },
    title: { en: 'Han River park', ko: '한강공원', ja: '漢江公園', zh: '汉江公园' },
    text: { en: 'Fishing, duck boats with a friend, and a picnic.', ko: '낚시, 친구와 오리배, 그리고 피크닉.', ja: '釣り、友だちとアヒルボート、ピクニック。', zh: '钓鱼、和朋友踩鸭子船、野餐。' } },
  { icon: '🐟', to: { store: 'seongsu-fishmarket' },
    title: { en: 'Fish market', ko: '수산시장', ja: '魚市場', zh: '水产市场' },
    text: { en: 'Sell the fish you catch.', ko: '잡은 물고기를 팔아요.', ja: '釣った魚を売れます。', zh: '卖掉钓到的鱼。' } },
  { icon: '🏠', to: null,
    title: { en: 'Your home', ko: '내 집', ja: 'マイホーム', zh: '我的家' },
    text: { en: 'Pick a home on the map and decorate it with furniture.', ko: '지도에서 집을 골라 가구로 꾸며요.', ja: '地図で家を選んで家具で飾ろう。', zh: '在地图上选一个家，用家具装饰。' } },
  { icon: '🏯', to: { zone: 'G' },
    title: { en: 'Gyeongbokgung Palace', ko: '경복궁', ja: '景福宮', zh: '景福宫' },
    text: { en: 'West along Sajik-ro: Gwanghwamun Square, the palace, a hanbok rental and a tea house. Taxis go there too.', ko: '사직로를 따라 서쪽으로: 광화문광장, 경복궁, 한복대여점, 전통찻집. 택시로도 갈 수 있어요.', ja: '社稷路を西へ：光化門広場、景福宮、韓服レンタル、伝統茶房。タクシーでも行けます。', zh: '沿社稷路向西：光化门广场、景福宫、韩服租赁、传统茶馆。也可以坐出租车。' } },
  { icon: '👋', to: null,
    title: { en: 'With friends', ko: '친구와 함께', ja: '友だちと', zh: '和朋友一起' },
    text: { en: 'High five, ride a tandem bike, do square missions together for a bonus.', ko: '하이파이브, 2인용 자전거, 광장 미션을 같이 하면 보너스.', ja: 'ハイタッチ、2人乗り自転車、広場ミッションを一緒にするとボーナス。', zh: '击掌、骑双人自行车、一起做广场任务有奖励。' } },
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
  constructor({ root, guide }) {
    Object.assign(this, { root, guide });
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  show() {
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', L(T.close));
    x.onclick = () => this.close();
    const list = el('div', 'info-list');
    for (const tp of TOPICS) {
      const row = el('div', 'info-row');
      const body = el('div');
      body.append(el('strong', null, `${tp.icon} ${L(tp.title)}`), el('p', null, L(tp.text)));
      row.append(body);
      if (tp.to) {
        const go = el('button', 'chip', L(T.go));
        go.onclick = () => { if (this.guide(tp.to) !== false) this.close(); };
        row.append(go);
      }
      list.append(row);
    }
    this.root.replaceChildren(x, el('h3', null, 'ℹ️ ' + L(T.title)), el('p', 'order-hint', L(T.intro)), list);
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
