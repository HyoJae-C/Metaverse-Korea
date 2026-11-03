// Information Center: what you can do in town and where, with a "show me the
// way" button for each place. Also the first-time hint that points new
// players here (with "don't show again").
import { L } from './pocha-ui.js';

const T = {
  title: { en: 'Information Center', ko: '인포메이션 센터', ja: 'インフォメーションセンター', zh: '信息中心' },
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
    ko: '처음 오셨나요? 광장 앞 인포메이션 센터에서 할 수 있는 것들을 알려드려요.',
    ja: '初めてですか？広場前のインフォメーションセンターで、できることを紹介しています。',
    zh: '第一次来？去广场前的信息中心看看能做些什么吧。',
  },
  hintGo: { en: 'Show me the way', ko: '길 안내', ja: '道案内', zh: '带我去' },
  later: { en: 'Later', ko: '나중에', ja: 'あとで', zh: '以后再说' },
  never: { en: "Don't show again", ko: '다시 보지 않기', ja: '今後表示しない', zh: '不再显示' },
};

// Each topic: emoji, title, text, and where "Go" leads (a store id or a zone).
export const TOPICS = [
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
    title: { en: 'Four-cut photo booth', ko: '인생네컷', ja: '4カット写真', zh: '四格照相' },
    text: { en: 'Pose with friends and save the strip.', ko: '친구와 포즈 잡고 사진을 저장해요.', ja: '友だちとポーズして保存。', zh: '和朋友摆姿势并保存照片。' } },
  { icon: '🧸', to: { store: 'lucky-claw' },
    title: { en: 'Claw machine', ko: '인형뽑기', ja: 'クレーンゲーム', zh: '抓娃娃' },
    text: { en: 'Win plushies to put in your home.', ko: '뽑은 인형은 내 집에 놓을 수 있어요.', ja: '取ったぬいぐるみは家に飾れます。', zh: '抓到的玩偶可以摆在家里。' } },
  { icon: '🧖', to: { store: 'onsaem-jjimjil' },
    title: { en: 'Jjimjilbang', ko: '찜질방', ja: 'チムジルバン', zh: '汗蒸房' },
    text: { en: 'Sweat it out in the hot kiln, cool off in the ice room, and wear a sheep towel.', ko: '불가마에서 땀 빼고 얼음방에서 식히고, 양머리 수건도 써 봐요.', ja: '汗蒸幕で汗を流し、氷の部屋で涼んで、羊タオルもかぶろう。', zh: '在火窑出汗、去冰屋降温，再戴上羊角毛巾。' } },
  { icon: '💪', to: { store: 'muscle-gym' },
    title: { en: 'Gym', ko: '헬스장', ja: 'ジム', zh: '健身房' },
    text: { en: 'Treadmill, dumbbells, bench press and push-ups. Every set makes you a tiny bit faster (up to +3%).', ko: '러닝머신, 아령, 벤치프레스, 푸시업. 한 세트마다 이동속도가 아주 조금씩 빨라져요(최대 +3%).', ja: 'ランニングマシン、ダンベル、ベンチプレス、腕立て。1セットごとに少しずつ速く（最大+3%）。', zh: '跑步机、哑铃、卧推、俯卧撑。每完成一组速度会稍微提升（最多+3%）。' } },
  { icon: '📚', to: { store: 'chaekmaru-library' },
    title: { en: 'Korean books', ko: '한국어 책', ja: '韓国語の本', zh: '韩语书' },
    text: { en: '10 books at the library: Hangul, greetings, idioms, new slang, dad jokes and more. Carry one and read it sitting anywhere.', ko: '도서관에 책 10권: 한글, 인사말, 사자성어, 신조어, 아재개그 등. 들고 가서 어디서든 앉아 읽어요.', ja: '図書館に10冊：ハングル、あいさつ、四字熟語、新語、おやじギャグなど。持ち出して座って読めます。', zh: '图书馆有10本书：韩文、问候语、成语、新词、冷笑话等。带走后坐下就能读。' } },
  { icon: '🎡', to: { store: 'haneul-land' },
    title: { en: 'Amusement park', ko: '놀이공원', ja: '遊園地', zh: '游乐园' },
    text: { en: 'Haneul Land: carousel, Ferris wheel and a pirate ship. 🪙 2 a ride.', ko: '하늘랜드: 회전목마, 대관람차, 바이킹. 한 번에 🪙 2.', ja: 'ハヌルランド：メリーゴーランド、観覧車、バイキング。1回 🪙 2。', zh: '天空乐园：旋转木马、摩天轮、海盗船。每次 🪙 2。' } },
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
