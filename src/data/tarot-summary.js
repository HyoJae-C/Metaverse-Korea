// The closing summary of a tarot reading: after the three cards turn over, a
// short reading of about ten lines that puts the three cards together: the
// overall mood, a little story through the three positions, how many major
// cards came up, which suit leads, whether things brighten or need care, a
// tip and a lucky colour/number/snack. Made from templates and a keyword and
// a mood for each card (no AI, no network), so both players reading together
// see the same summary. Just for fun, like the readings themselves.
import { TAROT_CARDS, topicById } from './tarot.js';

export const SUMMARY_LANGS = ['en', 'ko', 'ja', 'zh'];
const w = (en, ko, ja, zh) => ({ en, ko, ja, zh });

// A keyword for each major arcana card and its mood: 1 bright, 0 neutral,
// -1 asks for care.
const MAJOR_KEYS = [
  [1, w('a brave new start', '용감한 새 출발', '勇気ある新しいスタート', '勇敢的新开始')],
  [1, w('your own skills', '나만의 재능', '自分の才能', '自己的本领')],
  [0, w('quiet intuition', '조용한 직감', '静かな直感', '安静的直觉')],
  [1, w('warmth and plenty', '따뜻한 풍요', 'ぬくもりと豊かさ', '温暖与丰盛')],
  [0, w('steady planning', '꾸준한 계획', '着実な計画', '稳定的计划')],
  [0, w('wise advice', '지혜로운 조언', '賢い助言', '智慧的建议')],
  [1, w('a heartfelt choice', '마음이 담긴 선택', '心からの選択', '真心的选择')],
  [1, w('strong forward drive', '힘찬 추진력', '力強い推進力', '强劲的冲劲')],
  [1, w('gentle courage', '부드러운 용기', '優しい勇気', '温柔的勇气')],
  [0, w('quiet time alone', '혼자만의 시간', '一人の静かな時間', '独处的时光')],
  [0, w('a turn of luck', '운의 전환', '運の転機', '运势的转变')],
  [0, w('honesty and balance', '솔직함과 균형', '正直さとバランス', '诚实与平衡')],
  [0, w('a new point of view', '새로운 관점', '新しい視点', '新的视角')],
  [0, w('letting go and renewal', '끝맺음과 새로운 시작', '手放しと再生', '放下与重生')],
  [0, w('calm balance', '차분한 균형', '穏やかなバランス', '平稳的平衡')],
  [-1, w('strong temptation', '강한 유혹', '強い誘惑', '强烈的诱惑')],
  [-1, w('a sudden shake-up', '갑작스러운 변화', '突然の変化', '突如其来的变动')],
  [1, w('bright hope', '반짝이는 희망', '輝く希望', '闪亮的希望')],
  [-1, w('uncertain feelings', '흐릿한 불안', '揺れる不安', '不确定的情绪')],
  [1, w('pure joy', '환한 기쁨', '晴れやかな喜び', '灿烂的喜悦')],
  [1, w('a fresh wake-up call', '새로운 깨달음', '新たな目覚め', '新的觉醒')],
  [1, w('a happy completion', '행복한 완성', '幸せな完成', '幸福的圆满')],
];

// Minor arcana keywords: what the rank means, in the area of life the suit
// stands for ("a new beginning in feelings", "새로운 시작(감정)").
const SUIT_AREA = {
  wands: w('passion', '열정', '情熱', '行动'),
  cups: w('feelings', '감정', '気持ち', '感情'),
  swords: w('thoughts', '생각', '考え', '思考'),
  pentacles: w('money', '돈', 'お金', '金钱'),
};
const RANK_KEYS = [
  null,
  w('a new beginning', '새로운 시작', '新しい始まり', '新开始'),
  w('a choice to make', '선택', '選択', '抉择'),
  w('growth', '성장', '成長', '成长'),
  w('a steady pause', '안정과 휴식', '安定とひと休み', '安稳与休息'),
  w('a bumpy patch', '작은 갈등', '小さなつまずき', '小波折'),
  w('kindness and help', '도움과 배려', '助け合い', '帮助与善意'),
  w('a test of patience', '인내의 시험', '忍耐の試練', '耐心的考验'),
  w('a change of pace', '흐름의 변화', '流れの変化', '节奏的变化'),
  w('the last stretch', '마지막 고비', 'ゴール目前', '最后冲刺'),
  w('a full circle', '한 단계의 마무리', 'ひと区切り', '一个阶段的完成'),
  w('fresh news', '새로운 소식', '新しい知らせ', '新消息'),
  w('bold action', '과감한 행동', '大胆な行動', '大胆的行动'),
  w('warm care', '따뜻한 보살핌', '温かい思いやり', '温暖的关怀'),
  w('calm mastery', '노련한 리더십', '落ち着いた手腕', '沉稳的掌控'),
];
const MINOR_KEY = w('{rank} in {area}', '{rank}({area})', '{rank}（{area}）', '{rank}（{area}）');
// Moods of the minor cards, ace to king, as one character each (+ bright,
// 0 neutral, - asks for care), following the usual upright meanings.
const SUIT_MOODS = {
  wands: '+0++-+0+0-++++',
  cups: '+++0-+00++++++',
  swords: '+0-0-0----0000',
  pentacles: '+0+0-+0+++0+++',
};
const MOOD = { '+': 1, '0': 0, '-': -1 };

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const each = (fn) => Object.fromEntries(SUMMARY_LANGS.map((l) => [l, fn(l)]));

// A card's keyword ({ en, ko, ja, zh }) and mood.
export function cardKey(card) {
  if (!card.suit) {
    const [mood, key] = MAJOR_KEYS[card.n];
    return { mood, key };
  }
  return {
    mood: MOOD[SUIT_MOODS[card.suit][card.rank - 1]],
    key: each((l) => fill(MINOR_KEY[l], { rank: RANK_KEYS[card.rank][l], area: SUIT_AREA[card.suit][l] })),
  };
}

// The three-sentence story through the positions, per kind of reading
// (pair: a reading together, {a} and {b} being the two names).
const Q = { en: (k) => k, ko: (k) => `'${k}'`, ja: (k) => `「${k}」`, zh: (k) => `“${k}”` };
const STORY = {
  today: [
    w('🕰️ Your past was shaped by {k1}.', "🕰️ 지나온 시간은 {k1}의 흐름이었어요.", '🕰️ これまでは{k1}の流れでした。', '🕰️ 过去是{k1}的时光。'),
    w('📍 Right now, {k2} is at the center of your days.', '📍 지금은 {k2}의 한가운데에 있어요.', '📍 今は{k2}の真ん中にいます。', '📍 现在你正处在{k2}之中。'),
    w('🌅 Ahead of you, {k3} is waiting.', '🌅 앞으로는 {k3}의 시간이 기다리고 있어요.', '🌅 この先には{k3}の時間が待っています。', '🌅 前方等待你的是{k3}。'),
  ],
  dating: [
    w('✨ Your charm right now comes from {k1}.', '✨ 지금 당신의 매력은 {k1}에서 나와요.', '✨ 今のあなたの魅力は{k1}から生まれています。', '✨ 你现在的魅力来自{k1}。'),
    w('💌 A new meeting may bring {k2}.', '💌 다가올 만남에는 {k2}의 기운이 있어요.', '💌 新しい出会いには{k2}の気配があります。', '💌 新的邂逅可能带来{k2}。'),
    w('🧭 The best advice: lean into {k3}.', '🧭 가장 좋은 조언은 {k3}의 힘을 믿는 거예요.', '🧭 一番のアドバイスは{k3}の力を信じること。', '🧭 最好的建议：相信{k3}的力量。'),
  ],
  friend: [
    w('🙋 On your side, there is {k1}.', '🙋 내 쪽에는 {k1}의 마음이 있어요.', '🙋 あなたの側には{k1}があります。', '🙋 你这边带着{k1}。'),
    w("🧑‍🤝‍🧑 Your friend's side leans toward {k2}.", '🧑‍🤝‍🧑 친구의 마음은 {k2} 쪽으로 기울어 있어요.', '🧑‍🤝‍🧑 友達の気持ちは{k2}に傾いています。', '🧑‍🤝‍🧑 朋友的心偏向{k2}。'),
    w('🛤️ Your friendship is heading toward {k3}.', '🛤️ 앞으로의 우정은 {k3}의 방향으로 가고 있어요.', '🛤️ これからの友情は{k3}へ向かっています。', '🛤️ 你们的友情正走向{k3}。'),
  ],
  money: [
    w('👛 Right now you are in a time of {k1}.', '👛 지금 돈의 흐름은 {k1}의 시기예요.', '👛 今のお金の流れは{k1}の時期。', '👛 你现在的财运处于{k1}的时期。'),
    w('⚠️ Watch out for {k2}.', '⚠️ {k2}의 순간을 조심하세요.', '⚠️ {k2}の場面に気をつけて。', '⚠️ 要留意{k2}的时刻。'),
    w('🌱 Coming next: {k3}.', '🌱 다가올 운에는 {k3}의 기운이 있어요.', '🌱 これからの運には{k3}の気配があります。', '🌱 接下来的财运带着{k3}。'),
  ],
  pair: [
    w("💗 {a}'s heart holds {k1}.", '💗 {a}의 마음에는 {k1}의 기운이 있어요.', '💗 {a}の心には{k1}があります。', '💗 {a}的心里有{k1}。'),
    w("💗 {b}'s heart holds {k2}.", '💗 {b}의 마음에는 {k2}의 기운이 있어요.', '💗 {b}の心には{k2}があります。', '💗 {b}的心里有{k2}。'),
    w('🤝 As a pair, you two share {k3}.', '🤝 두 사람은 함께 {k3}의 흐름을 나누고 있어요.', '🤝 ふたりは一緒に{k3}を分かち合っています。', '🤝 你们俩一起分享着{k3}。'),
  ],
};

const HEADLINE = {
  bright: w('✨ Overall: a bright, hopeful reading.', '✨ 전체적으로 밝고 희망찬 흐름이에요.', '✨ 全体的に明るく希望に満ちた結果です。', '✨ 整体来看，是明亮又充满希望的结果。'),
  balanced: w('🌗 Overall: a balanced reading, with both light and shade.', '🌗 전체적으로 빛과 그림자가 함께 있는 균형 잡힌 흐름이에요.', '🌗 全体的に光と影がある、バランスの取れた結果です。', '🌗 整体来看，光明与阴影并存，比较平衡。'),
  careful: w('🌧️ Overall: a reading that asks you to go gently.', '🌧️ 전체적으로 조심스럽게, 천천히 가라는 흐름이에요.', '🌧️ 全体的に、ゆっくり慎重に進むよう告げる結果です。', '🌧️ 整体来看，提醒你放慢脚步、小心前行。'),
};
const MAJORS = [
  w('🃏 All three are minor cards: this is about everyday choices you can shape.', '🃏 세 장 모두 마이너 카드예요. 일상의 선택으로 충분히 바꿀 수 있는 이야기예요.', '🃏 3枚ともマイナーカード。日々の選択で変えられるお話です。', '🃏 三张都是小阿卡那。这是你可以通过日常选择改变的事。'),
  w('🃏 One major card, {name}, carries the main theme.', "🃏 메이저 카드 '{name}' 한 장이 큰 주제를 이끌어요.", '🃏 メジャーカード「{name}」1枚が大きなテーマを担っています。', '🃏 一张大阿卡那“{name}”带出了主要主题。'),
  w('🃏 Two major cards: something important is moving in your life.', '🃏 메이저 카드가 두 장이에요. 삶에서 중요한 일이 움직이고 있어요.', '🃏 メジャーカードが2枚。人生で大事なことが動いています。', '🃏 两张大阿卡那：生活中有重要的事情在推进。'),
  w('🃏 All three are major cards: a rare, powerful turning point!', '🃏 세 장 모두 메이저 카드예요. 흔치 않은 강한 전환점이에요!', '🃏 3枚ともメジャーカード！めったにない大きな転機です。', '🃏 三张都是大阿卡那：罕见而强大的转折点！'),
];
const SUIT_NAME = {
  wands: w('Wands', '완드', 'ワンド', '权杖'),
  cups: w('Cups', '컵', 'カップ', '圣杯'),
  swords: w('Swords', '소드', 'ソード', '宝剑'),
  pentacles: w('Pentacles', '펜타클', 'ペンタクル', '星币'),
};
const SUIT_ICON = { wands: '🪵', cups: '🏆', swords: '🗡️', pentacles: '🪙' };
const LEAD = w('{icon} Most cards are {suit}: {focus}', '{icon} {suit} 카드가 가장 많아요. {focus}', '{icon} {suit}のカードが多め。{focus}', '{icon} {suit}牌最多：{focus}');
const FOCUS = {
  wands: w('your energy and passion are the key.', '열정과 행동력이 열쇠예요.', '情熱と行動力が鍵です。', '热情和行动力是关键。'),
  cups: w('feelings and relationships matter most.', '감정과 관계가 가장 중요해요.', '気持ちと人間関係がいちばん大切。', '感情和人际关系最重要。'),
  swords: w('clear thinking and honest words will help.', '맑은 생각과 솔직한 말이 도움이 돼요.', '冷静な考えと正直な言葉が助けになります。', '清晰的思考和坦诚的话语会有帮助。'),
  pentacles: w('money, work and daily life are in focus.', '돈과 일, 일상생활에 초점이 있어요.', 'お金・仕事・日常生活に焦点があります。', '金钱、工作和日常生活是重点。'),
};
const MIX = w('🌈 A mix of suits: keep your life in balance.', '🌈 여러 무늬가 섞여 있어요. 삶의 균형을 지켜 주세요.', '🌈 いろいろなスートが混ざっています。バランスを大切に。', '🌈 各种花色混在一起：保持生活的平衡。');
const FLOW = {
  up: w('📈 Things get brighter from the first card to the last.', '📈 첫 카드에서 마지막 카드로 갈수록 점점 밝아져요.', '📈 最初のカードから最後のカードへ、だんだん明るくなります。', '📈 从第一张到最后一张，情况越来越明朗。'),
  down: w("📉 The last card asks for a little more care, so don't rush.", '📉 마지막 카드가 조금 더 신중하라고 말해요. 서두르지 마세요.', '📉 最後のカードは、もう少し慎重にと言っています。急がないで。', '📉 最后一张牌提醒你多一分谨慎，别着急。'),
  even: w('➡️ The mood stays steady across all three cards.', '➡️ 세 장 모두 비슷한 분위기로 꾸준히 이어져요.', '➡️ 3枚とも同じような空気で、安定して続きます。', '➡️ 三张牌的气氛一致，稳稳地延续。'),
};
const TIP = {
  wands: w('💡 Tip: act on one idea this week.', '💡 한마디: 이번 주에 아이디어 하나를 실행해 보세요.', '💡 ひとこと：今週、アイデアをひとつ実行してみて。', '💡 建议：这周把一个想法付诸行动。'),
  cups: w('💡 Tip: tell someone how you really feel.', '💡 한마디: 진짜 마음을 누군가에게 말해 보세요.', '💡 ひとこと：本当の気持ちを誰かに伝えてみて。', '💡 建议：把真实的感受告诉某个人。'),
  swords: w('💡 Tip: write your thoughts down before you decide.', '💡 한마디: 결정하기 전에 생각을 글로 적어 보세요.', '💡 ひとこと：決める前に考えを書き出してみて。', '💡 建议：做决定前先把想法写下来。'),
  pentacles: w('💡 Tip: make a small plan for your money and time.', '💡 한마디: 돈과 시간에 대한 작은 계획을 세워 보세요.', '💡 ひとこと：お金と時間の小さな計画を立ててみて。', '💡 建议：为金钱和时间做个小计划。'),
  major: w('💡 Tip: say yes to the change that is calling you.', '💡 한마디: 다가오는 변화를 피하지 말고 받아들여 보세요.', '💡 ひとこと：呼んでいる変化に「イエス」と言ってみて。', '💡 建议：对召唤你的改变说“好”。'),
};
// Lucky colour and snack for the leading element (a Korean street snack, for fun).
const LUCKY = {
  wands: [w('red', '빨강', '赤', '红色'), w('tteokbokki', '떡볶이', 'トッポッキ', '炒年糕')],
  cups: [w('blue', '파랑', '青', '蓝色'), w('sikhye (sweet rice drink)', '식혜', 'シッケ（甘い米の飲み物）', '甜米露')],
  swords: [w('silver', '은색', '銀色', '银色'), w('bungeoppang (fish-shaped bread)', '붕어빵', 'プンオパン（たい焼き風パン）', '鲫鱼饼')],
  pentacles: [w('green', '초록', '緑', '绿色'), w('gimbap', '김밥', 'キンパ', '紫菜包饭')],
  major: [w('purple', '보라', '紫', '紫色'), w('hotteok (sweet pancake)', '호떡', 'ホットク（韓国風おやき）', '糖饼')],
};
const LUCKY_LINE = w('🍀 Lucky color: {color} · Lucky number: {n} · Lucky snack: {snack}', '🍀 행운의 색: {color} · 행운의 숫자: {n} · 행운의 간식: {snack}', '🍀 ラッキーカラー：{color}・ラッキーナンバー：{n}・ラッキーおやつ：{snack}', '🍀 幸运色：{color} · 幸运数字：{n} · 幸运小吃：{snack}');
const CLOSING = {
  one: w('🔮 Whatever the cards say, your next step is yours to choose.', '🔮 카드가 뭐라고 하든, 다음 걸음은 당신이 정하는 거예요.', '🔮 カードが何と言っても、次の一歩を決めるのはあなたです。', '🔮 不管牌怎么说，下一步由你自己决定。'),
  pair: w('🔮 Whatever the cards say, you two write your own story.', '🔮 카드가 뭐라고 하든, 두 사람의 이야기는 두 사람이 만들어요.', '🔮 カードが何と言っても、ふたりの物語はふたりで作るもの。', '🔮 不管牌怎么说，你们的故事由你们自己书写。'),
};

// The funny one-liner at the very end: "Your compatibility in one word: …".
const VERDICT_LABEL = {
  compat: w('Your compatibility in one word:', '두 사람의 궁합은 한마디로!', 'ふたりの相性をひとことで！', '你们的缘分一句话总结：'),
  friend: w('Your friendship in one word:', '두 사람의 우정은 한마디로!', 'ふたりの友情をひとことで！', '你们的友情一句话总结：'),
  dating: w('Your love luck in one word:', '당신의 연애운은 한마디로!', 'あなたの恋愛運をひとことで！', '你的恋爱运一句话总结：'),
  today: w('Your fortune in one word:', '당신의 운세는 한마디로!', 'あなたの運勢をひとことで！', '你的运势一句话总结：'),
  money: w('Your wallet in one word:', '당신의 지갑은 한마디로!', 'あなたのお財布をひとことで！', '你的钱包一句话总结：'),
};
const VERDICTS = {
  love: {
    bright: [
      w('Like two friendly pineapples! 🍍🍍', '사이좋은 파인애플 같은 사이! 🍍🍍', '仲良しパイナップルみたいな関係！🍍🍍', '像一对好朋友菠萝！🍍🍍'),
      w('Like socks that never lose their pair! 🧦', '절대 짝 안 잃어버리는 양말 같은 사이! 🧦', '絶対に片方なくさない靴下みたいな関係！🧦', '像永远不会丢一只的袜子！🧦'),
      w('Like a magnet stuck to the fridge! 🧲', '냉장고에 딱 붙은 자석 같은 사이! 🧲', '冷蔵庫にぴったりくっつく磁石みたいな関係！🧲', '像紧贴冰箱的磁铁！🧲'),
      w('Like tteokbokki and cheese! 🧀', '떡볶이와 치즈 같은 사이! 🧀', 'トッポッキとチーズみたいな関係！🧀', '像炒年糕配芝士！🧀'),
    ],
    balanced: [
      w('Like two cats sharing one box! 🐈📦', '상자 하나를 나눠 쓰는 고양이 두 마리 같은 사이! 🐈📦', 'ひとつの箱を取り合う猫2匹みたいな関係！🐈📦', '像共用一个纸箱的两只猫！🐈📦'),
      w('Like earphones that keep tangling! 🎧', '자꾸 엉키는 이어폰 줄 같은 사이! 🎧', 'すぐ絡まるイヤホンみたいな関係！🎧', '像总是缠在一起的耳机线！🎧'),
      w('Like mint chocolate: love it or argue! 🍫', '민트초코 같은 사이! 좋아하거나 싸우거나 🍫', 'ミントチョコみたいな関係！好きかケンカか 🍫', '像薄荷巧克力：要么爱要么吵！🍫'),
      w('Like a pigeon and a breadcrumb! 🐦🍞', '비둘기와 빵 부스러기 같은 사이! 🐦🍞', 'ハトとパンくずみたいな関係！🐦🍞', '像鸽子和面包屑！🐦🍞'),
    ],
    careful: [
      w('Like a rotten banana! 🍌💀', '썩은 바나나 같은 사이! 🍌💀', '腐ったバナナみたいな関係！🍌💀', '像一根烂香蕉！🍌💀'),
      w('Like a charger that only works at an angle! 🔌', '각도 맞춰야만 되는 충전기 같은 사이! 🔌', '角度を合わせないと充電できないケーブルみたいな関係！🔌', '像要斜着才能充电的充电线！🔌'),
      w('Like ramen with no kimchi! 🍜', '김치 없는 라면 같은 사이! 🍜', 'キムチなしのラーメンみたいな関係！🍜', '像没有泡菜的拉面！🍜'),
      w('Like a cat and a bath! 🐈🛁', '고양이와 목욕 같은 사이! 🐈🛁', '猫とお風呂みたいな関係！🐈🛁', '像猫和洗澡！🐈🛁'),
    ],
  },
  life: {
    bright: [
      w('Hotteok fresh off the pan 🔥', '갓 구운 호떡 🔥', '焼きたてホットク 🔥', '刚出锅的糖饼 🔥'),
      w('Main character energy 🌟', '주인공 기운 🌟', '主人公オーラ 🌟', '主角光环 🌟'),
      w('Green lights all the way 🚦', '신호등 전부 초록불 🚦', '信号がずっと青 🚦', '一路绿灯 🚦'),
    ],
    balanced: [
      w('Medium spicy 🌶️', '보통맛 🌶️', '普通の辛さ 🌶️', '中辣 🌶️'),
      w('Bus arriving in 3 minutes 🚌', '버스 3분 후 도착 🚌', 'バスあと3分 🚌', '公交还有3分钟到站 🚌'),
      w('Phone at 50% 🔋', '배터리 50% 🔋', 'バッテリー50% 🔋', '电量50% 🔋'),
    ],
    careful: [
      w('Phone at 5% 🪫', '배터리 5% 🪫', 'バッテリー5% 🪫', '电量5% 🪫'),
      w('Umbrella left at home ☔', '우산 두고 나온 날 ☔', '傘を忘れた日 ☔', '忘带伞的日子 ☔'),
      w('Extra spicy, no water 🥵', '물 없이 매운맛 🥵', '水なしで激辛 🥵', '没水还吃特辣 🥵'),
    ],
  },
};
const moodOf = (total) => (total >= 2 ? 'bright' : total <= -1 ? 'careful' : 'balanced');
const asCards = (cards) => cards.map((c) => (typeof c === 'number' ? TAROT_CARDS[c] : c));

// The one-word verdict: { label, word }, each { en, ko, ja, zh }.
export function readingVerdict(cards, topic, pair = null) {
  const cs = asCards(cards);
  const id = topicById(topic).id;
  const total = cs.reduce((s, c) => s + cardKey(c).mood, 0);
  const label = VERDICT_LABEL[id === 'friend' ? 'friend' : pair ? 'compat' : id];
  const list = VERDICTS[pair || id === 'friend' ? 'love' : 'life'][moodOf(total)];
  return { label, word: list[cs.reduce((s, c) => s + c.n, 0) % list.length] };
}

// The summary of a three-card reading: an array of lines, each { en, ko, ja, zh }.
// cards: the three card objects (or card numbers) in position order;
// topic: the reading's topic id; pair: { a, b } names for a reading together.
export function readingSummary(cards, topic, pair = null) {
  const cs = asCards(cards);
  const keys = cs.map(cardKey);
  const total = keys.reduce((s, k) => s + k.mood, 0);
  const lines = [HEADLINE[moodOf(total)]];

  const story = pair ? STORY.pair : STORY[topicById(topic).id];
  for (const t of story) {
    lines.push(each((l) => fill(t[l], {
      k1: Q[l](keys[0].key[l]), k2: Q[l](keys[1].key[l]), k3: Q[l](keys[2].key[l]),
      a: pair?.a ?? '', b: pair?.b ?? '',
    })));
  }

  const majors = cs.filter((c) => !c.suit);
  lines.push(each((l) => fill(MAJORS[majors.length][l], { name: majors[0]?.name[l] ?? '' })));

  const counts = {};
  for (const c of cs) if (c.suit) counts[c.suit] = (counts[c.suit] || 0) + 1;
  const lead = Object.keys(counts).find((s) => counts[s] >= 2);
  if (lead) lines.push(each((l) => fill(LEAD[l], { icon: SUIT_ICON[lead], suit: SUIT_NAME[lead][l], focus: FOCUS[lead][l] })));
  else if (majors.length <= 1) lines.push(MIX);

  const d = keys[2].mood - keys[0].mood;
  lines.push(FLOW[d > 0 ? 'up' : d < 0 ? 'down' : 'even']);

  const element = lead || (majors.length ? 'major' : cs[2].suit);
  lines.push(TIP[element]);
  const [color, snack] = LUCKY[element];
  const n = (cs.reduce((s, c) => s + c.n, 0) % 9) + 1;
  lines.push(each((l) => fill(LUCKY_LINE[l], { color: color[l], n, snack: snack[l] })));

  lines.push(CLOSING[pair ? 'pair' : 'one']);
  return lines;
}
