// The 22 cards of the tarot's major arcana, for the tarot café in Hongdae
// (Starlight Tarot). The card names and meanings are traditional and free to
// use; the card faces are drawn in the browser (a numeral and a symbol), not
// copied from any published deck. Readings are for fun.

export const TAROT_COST = 10; // coins for one reading (three cards)

export const POSITIONS = [
  { id: 'past', name: { en: 'Past', ko: '과거', ja: '過去', zh: '过去' } },
  { id: 'present', name: { en: 'Present', ko: '현재', ja: '現在', zh: '现在' } },
  { id: 'future', name: { en: 'Future', ko: '미래', ja: '未来', zh: '未来' } },
];

const c = (n, icon, en, ko, ja, zh, mean) => ({ n, icon, name: { en, ko, ja, zh }, mean });

export const TAROT_CARDS = [
  c(0, '🎒', 'The Fool', '바보', '愚者', '愚者', {
    en: 'A fresh start. Say yes to the trip, even if you don\'t know the way yet.',
    ko: '새로운 시작이에요. 길을 다 몰라도 일단 떠나 보세요.',
    ja: '新しい始まり。道がわからなくても、まず出発してみて。',
    zh: '新的开始。即使还不认得路，也先出发吧。',
  }),
  c(1, '🪄', 'The Magician', '마법사', '魔術師', '魔术师', {
    en: 'You already have what you need. Use your skills and make it happen.',
    ko: '필요한 건 이미 다 갖고 있어요. 재능을 써서 직접 이뤄 보세요.',
    ja: '必要なものはもう揃っています。自分の力で形にして。',
    zh: '你需要的已经都有了。发挥本领，亲手实现它。',
  }),
  c(2, '🌙', 'The High Priestess', '여사제', '女教皇', '女祭司', {
    en: 'Listen to your quiet inner voice. The answer is something you already feel.',
    ko: '조용한 마음의 소리를 들어 보세요. 답은 이미 느끼고 있어요.',
    ja: '静かな心の声に耳を傾けて。答えはもう感じているはず。',
    zh: '倾听内心安静的声音。答案你其实已经感觉到了。',
  }),
  c(3, '🌾', 'The Empress', '여황제', '女帝', '皇后', {
    en: 'Warmth and plenty. Take care of yourself and things will grow.',
    ko: '풍요와 따뜻함이에요. 나를 잘 돌보면 좋은 일이 자라나요.',
    ja: '豊かさとぬくもり。自分を大切にすると物事が育ちます。',
    zh: '丰盛与温暖。好好照顾自己，好事就会成长。',
  }),
  c(4, '👑', 'The Emperor', '황제', '皇帝', '皇帝', {
    en: 'Structure and steady steps. Make a plan and stick to it.',
    ko: '안정과 꾸준함이에요. 계획을 세우고 지켜 나가세요.',
    ja: '安定と着実な一歩。計画を立てて守りましょう。',
    zh: '秩序与稳步前进。定好计划并坚持下去。',
  }),
  c(5, '🔑', 'The Hierophant', '교황', '教皇', '教皇', {
    en: 'Learn from someone wiser. Good advice is close by.',
    ko: '지혜로운 사람에게 배워 보세요. 좋은 조언이 가까이 있어요.',
    ja: '経験のある人から学んで。良い助言はすぐそばに。',
    zh: '向更有智慧的人学习。好的建议就在身边。',
  }),
  c(6, '💞', 'The Lovers', '연인', '恋人', '恋人', {
    en: 'A meaningful bond or choice. Follow what your heart truly values.',
    ko: '소중한 인연이나 선택이에요. 마음이 진짜 원하는 쪽을 따르세요.',
    ja: '大切な縁、または選択。心が本当に大事にするものに従って。',
    zh: '重要的缘分或选择。跟随内心真正珍视的东西。',
  }),
  c(7, '🏇', 'The Chariot', '전차', '戦車', '战车', {
    en: 'Keep moving forward. Your drive will carry you past obstacles.',
    ko: '계속 앞으로 나아가세요. 추진력이 장애물을 넘게 해 줘요.',
    ja: '前へ進み続けて。その勢いが障害を越えさせてくれます。',
    zh: '继续向前。你的冲劲会带你越过障碍。',
  }),
  c(8, '🦁', 'Strength', '힘', '力', '力量', {
    en: 'Gentle courage. Patience is stronger than force.',
    ko: '부드러운 용기예요. 인내가 힘보다 강해요.',
    ja: '優しい勇気。忍耐は力よりも強い。',
    zh: '温柔的勇气。耐心比蛮力更强大。',
  }),
  c(9, '🏮', 'The Hermit', '은둔자', '隠者', '隐士', {
    en: 'Take some time alone. A quiet walk will light the way.',
    ko: '혼자만의 시간을 가져 보세요. 조용한 산책이 길을 비춰 줘요.',
    ja: '一人の時間を。静かな散歩が道を照らします。',
    zh: '给自己一点独处时间。安静地散散步会照亮道路。',
  }),
  c(10, '🎡', 'Wheel of Fortune', '운명의 수레바퀴', '運命の輪', '命运之轮', {
    en: 'Luck is turning. Be ready when the chance comes round.',
    ko: '운이 돌고 있어요. 기회가 왔을 때 잡을 준비를 하세요.',
    ja: '運が巡ってきています。チャンスが来たら掴めるように。',
    zh: '运势正在转动。机会来临时要做好准备。',
  }),
  c(11, '⚖️', 'Justice', '정의', '正義', '正义', {
    en: 'Fairness and honest choices. What you give comes back.',
    ko: '공정함과 정직한 선택이에요. 베푼 만큼 돌아와요.',
    ja: '公平と誠実な選択。与えたものは返ってきます。',
    zh: '公平与诚实的选择。付出多少就会回来多少。',
  }),
  c(12, '🙃', 'The Hanged Man', '매달린 사람', '吊るされた男', '倒吊人', {
    en: 'Pause and look from another angle. Waiting is not losing.',
    ko: '잠시 멈추고 다른 각도에서 보세요. 기다림은 지는 게 아니에요.',
    ja: '立ち止まって別の角度から見て。待つことは負けではありません。',
    zh: '停一停，换个角度看看。等待不等于失败。',
  }),
  c(13, '🦋', 'Death', '죽음', '死神', '死神', {
    en: 'Not an ending to fear: one chapter closes so a new one can begin.',
    ko: '두려운 끝이 아니에요. 한 장이 끝나야 새 장이 시작돼요.',
    ja: '恐れる終わりではありません。一つの章が閉じ、新しい章が始まります。',
    zh: '不是可怕的结束：一章结束，新的一章才会开始。',
  }),
  c(14, '🏺', 'Temperance', '절제', '節制', '节制', {
    en: 'Balance and calm. Mix a little of everything, slowly.',
    ko: '균형과 차분함이에요. 무엇이든 조금씩, 천천히 섞어 보세요.',
    ja: 'バランスと落ち着き。何事も少しずつ、ゆっくりと。',
    zh: '平衡与平静。什么都来一点，慢慢调和。',
  }),
  c(15, '⛓️', 'The Devil', '악마', '悪魔', '恶魔', {
    en: 'Notice a habit that holds you back. The chain is looser than it looks.',
    ko: '나를 붙잡는 습관을 알아차려 보세요. 사슬은 보기보다 헐거워요.',
    ja: '自分を縛る習慣に気づいて。鎖は見た目より緩いもの。',
    zh: '留意拖住你的习惯。那条锁链比看起来松。',
  }),
  c(16, '⚡', 'The Tower', '탑', '塔', '高塔', {
    en: 'A sudden surprise shakes things up, and clears space for something truer.',
    ko: '갑작스러운 변화가 와요. 덕분에 더 진짜인 것을 위한 자리가 생겨요.',
    ja: '突然の変化が訪れ、より本物のための場所が空きます。',
    zh: '突然的变化打乱一切，也为更真实的东西腾出空间。',
  }),
  c(17, '⭐', 'The Star', '별', '星', '星星', {
    en: 'Hope and healing. Make a wish: things are getting better.',
    ko: '희망과 회복이에요. 소원을 빌어 보세요. 점점 좋아지고 있어요.',
    ja: '希望と癒し。願いごとをして。良くなってきています。',
    zh: '希望与疗愈。许个愿吧，一切正在变好。',
  }),
  c(18, '🌕', 'The Moon', '달', '月', '月亮', {
    en: 'Things are not fully clear yet. Trust your feelings and go gently.',
    ko: '아직은 다 보이지 않아요. 느낌을 믿고 천천히 가세요.',
    ja: 'まだはっきりとは見えません。直感を信じて、ゆっくり進んで。',
    zh: '事情还没完全明朗。相信感觉，慢慢走。',
  }),
  c(19, '☀️', 'The Sun', '태양', '太陽', '太阳', {
    en: 'Joy, warmth and success. A bright day is coming.',
    ko: '기쁨, 따뜻함, 성공이에요. 밝은 날이 와요.',
    ja: '喜び、ぬくもり、成功。明るい日がやってきます。',
    zh: '喜悦、温暖与成功。晴朗的日子要来了。',
  }),
  c(20, '📯', 'Judgement', '심판', '審判', '审判', {
    en: 'A wake-up call. Look back, forgive, and step up.',
    ko: '깨어나라는 신호예요. 돌아보고, 용서하고, 한 걸음 나아가세요.',
    ja: '目覚めの合図。振り返り、許し、一歩踏み出して。',
    zh: '觉醒的信号。回顾、原谅，然后向前一步。',
  }),
  c(21, '🌍', 'The World', '세계', '世界', '世界', {
    en: 'Completion. A journey ends well, and the whole world is open to you.',
    ko: '완성이에요. 여행이 잘 마무리되고 온 세상이 열려 있어요.',
    ja: '完成。旅は良い形で終わり、世界があなたに開かれています。',
    zh: '圆满。旅程顺利结束，整个世界向你敞开。',
  }),
];

export const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

// Shuffles the deck (Fisher–Yates) with rand() in [0, 1).
export function shuffleDeck(rand = Math.random) {
  const deck = TAROT_CARDS.map((card) => card.n);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
