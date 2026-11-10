// The 78-card tarot deck for the tarot cafés (Starlight Tarot and Lucky Piggy
// Tarot in Hongdae, Moon & Rose Tarot in Seongsu): the 22 major arcana here,
// the 56 minor arcana in tarot-minor.js. The card names and meanings are
// traditional and free to use; the card faces are drawn in the browser (a
// numeral and a symbol), not copied from any published deck. Readings are made
// up for fun, with no scientific basis.
import { MINOR } from './tarot-minor.js';

export const TAROT_COST = 20000; // won for one reading (one topic, three cards)
export const TAROT_PAIR = 40000; // two reading together (couple / friends), split: dutch pay
export const TAROT_HALF = TAROT_PAIR / 2; // each one's share

export const POSITIONS = [
  { id: 'past', name: { en: 'Past', ko: '과거', ja: '過去', zh: '过去' } },
  { id: 'present', name: { en: 'Present', ko: '현재', ja: '現在', zh: '现在' } },
  { id: 'future', name: { en: 'Future', ko: '미래', ja: '未来', zh: '未来' } },
];

const c = (n, icon, en, ko, ja, zh, mean) => ({ n, icon, name: { en, ko, ja, zh }, mean });

const MAJOR = [
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

// Love (for dating and relationship readings) and money meanings of the major
// arcana, in card order: [love, money], each { en, ko, ja, zh }.
const MAJOR_TOPICS = [
  [ // 0 The Fool
    { en: 'Be playful and open. Love may start where you least expect it.', ko: '가볍고 열린 마음으로! 사랑은 생각지 못한 곳에서 시작될 수 있어요.', ja: '気軽にオープンに。恋は思いがけない場所で始まるかも。', zh: '轻松开放一点。爱情可能在意想不到的地方开始。' },
    { en: 'Fine for small adventures, but keep a little money for surprises.', ko: '작은 모험은 좋지만, 예상 못한 지출에 대비해 조금 남겨 두세요.', ja: '小さな冒険はOK。でも急な出費のために少し残しておいて。', zh: '小冒险没问题，但留一点钱以防万一。' },
  ],
  [ // 1 The Magician
    { en: 'Your charm is switched on. Go ahead and make the first move.', ko: '매력이 활짝 켜졌어요. 먼저 다가가 보세요.', ja: '魅力が全開です。自分から一歩踏み出して。', zh: '你的魅力全开。主动迈出第一步吧。' },
    { en: 'A good idea of yours could turn into income. Give it a try.', ko: '좋은 아이디어가 수입으로 이어질 수 있어요. 시도해 보세요.', ja: 'あなたのアイデアが収入につながるかも。やってみて。', zh: '你的好点子可能变成收入。试试看。' },
  ],
  [ // 2 The High Priestess
    { en: 'Feelings are quiet but real. Give them a little time.', ko: '감정은 조용하지만 진짜예요. 조금 시간을 주세요.', ja: '気持ちは静かだけど本物。少し時間をあげて。', zh: '感情安静但真实。给它一点时间。' },
    { en: 'Don\'t rush. Read the small print before you pay.', ko: '서두르지 마세요. 돈을 내기 전에 꼼꼼히 읽어 보세요.', ja: '急がないで。払う前に細かいところまで確認を。', zh: '别着急。付钱前先看清细则。' },
  ],
  [ // 3 The Empress
    { en: 'Warm, caring days. Affection grows naturally.', ko: '따뜻하고 다정한 시기예요. 애정이 자연스럽게 자라요.', ja: '温かく優しい時期。愛情が自然に育ちます。', zh: '温暖体贴的日子。感情自然增长。' },
    { en: 'Comfortable and plentiful. You can treat yourself a little.', ko: '넉넉하고 편안해요. 나에게 작은 선물을 해도 좋아요.', ja: 'ゆとりがあって安心。自分にご褒美も少しならOK。', zh: '宽裕舒适。可以稍微犒劳一下自己。' },
  ],
  [ // 4 The Emperor
    { en: 'Steady, dependable love. Show that you can be counted on.', ko: '든든하고 안정적인 사랑이에요. 믿음직한 모습을 보여 주세요.', ja: '安定した頼れる恋。頼りになるところを見せて。', zh: '稳定可靠的感情。展现你值得信赖的一面。' },
    { en: 'Make a budget and stick to it. Order brings savings.', ko: '예산을 세우고 지키세요. 규칙이 저축을 만들어요.', ja: '予算を立てて守って。きちんとすると貯まります。', zh: '定好预算并遵守。有规律就能存下钱。' },
  ],
  [ // 5 The Hierophant
    { en: 'Classic romance: a proper date, or meeting each other\'s friends.', ko: '정석 연애예요. 제대로 된 데이트나 서로의 친구를 만나 보세요.', ja: '王道の恋。ちゃんとしたデートや、友達の紹介も吉。', zh: '传统浪漫：一次正式约会，或见见彼此的朋友。' },
    { en: 'Ask someone who knows, and follow tried-and-true ways.', ko: '잘 아는 사람에게 묻고, 검증된 방법을 따르세요.', ja: '詳しい人に聞いて、確かな方法で。', zh: '请教懂行的人，按稳妥的方法来。' },
  ],
  [ // 6 The Lovers
    { en: 'A lovely match card! Your hearts are in tune.', ko: '사랑스러운 궁합 카드예요! 마음이 잘 통해요.', ja: '素敵な相性カード！心が通じ合っています。', zh: '美好的缘分牌！你们心意相通。' },
    { en: 'A choice between two options. Pick what you truly value.', ko: '두 가지 중 하나를 고를 때예요. 정말 중요한 쪽을 택하세요.', ja: '二択のとき。本当に大切なほうを選んで。', zh: '二选一的时候。选择你真正看重的。' },
  ],
  [ // 7 The Chariot
    { en: 'Go for it with confidence. Your energy is attractive.', ko: '자신 있게 다가가세요. 당신의 에너지가 매력적이에요.', ja: '自信を持って進んで。その勢いが魅力です。', zh: '自信地去追吧。你的活力很有吸引力。' },
    { en: 'Push forward on your goals. Effort brings earnings.', ko: '목표를 향해 밀고 나가세요. 노력한 만큼 벌어요.', ja: '目標に向けて前進を。努力が収入になります。', zh: '朝目标前进。努力就会有收入。' },
  ],
  [ // 8 Strength
    { en: 'Gentle patience wins hearts. Be kind and calm.', ko: '부드러운 인내가 마음을 얻어요. 다정하고 차분하게.', ja: '優しい忍耐が心をつかみます。穏やかに。', zh: '温柔的耐心能赢得人心。温和冷静一点。' },
    { en: 'A little self-control keeps your wallet healthy.', ko: '조금만 참으면 지갑이 건강해져요.', ja: '少しの我慢でお財布が元気に。', zh: '稍微克制一下，钱包就会很健康。' },
  ],
  [ // 9 The Hermit
    { en: 'Some time alone will help you see what you really want.', ko: '혼자만의 시간이 진짜 원하는 걸 알게 해 줘요.', ja: '一人の時間が、本当に望むものを教えてくれます。', zh: '独处的时光会让你看清自己真正想要的。' },
    { en: 'Spend less, think more. A quiet time for saving.', ko: '덜 쓰고 더 생각하세요. 조용히 모으는 시기예요.', ja: '使うより考えて。静かに貯める時期です。', zh: '少花多想。安静存钱的时期。' },
  ],
  [ // 10 Wheel of Fortune
    { en: 'Fate is turning. A surprise meeting could happen.', ko: '인연의 바퀴가 돌고 있어요. 뜻밖의 만남이 있을 수 있어요.', ja: '縁の輪が回っています。思わぬ出会いがあるかも。', zh: '命运之轮在转动。可能会有意外的相遇。' },
    { en: 'Luck goes up and down. Ride the good wave when it comes.', ko: '운은 오르락내리락해요. 좋은 흐름이 오면 타세요.', ja: '運は上がったり下がったり。いい波に乗って。', zh: '运势起起伏伏。好运来时要抓住。' },
  ],
  [ // 11 Justice
    { en: 'Honesty and balance make it work. Speak fairly.', ko: '솔직함과 균형이 열쇠예요. 공평하게 말해 보세요.', ja: '正直さとバランスが鍵。公平に話して。', zh: '诚实与平衡是关键。公平地沟通。' },
    { en: 'Fair deals and paperwork go well. Keep your receipts.', ko: '공정한 거래와 서류 일이 잘 풀려요. 영수증은 챙기세요.', ja: '公正な取引や書類はうまくいきます。レシートは保管を。', zh: '公平交易和文书事务顺利。保留好收据。' },
  ],
  [ // 12 The Hanged Man
    { en: 'Try seeing things from their side for a while.', ko: '잠시 상대의 입장에서 바라봐 보세요.', ja: 'しばらく相手の立場から見てみて。', zh: '试着从对方的角度看看。' },
    { en: 'Hold off on big purchases for now.', ko: '큰 지출은 잠시 미뤄 두세요.', ja: '大きな買い物はしばらく待って。', zh: '大额消费先暂缓。' },
  ],
  [ // 13 Death
    { en: 'Let the old go, and something new can bloom.', ko: '지난 것을 보내면 새로운 꽃이 피어요.', ja: '古いものを手放すと、新しい花が咲きます。', zh: '放下过去，新的花朵才能绽放。' },
    { en: 'Change an old spending habit for a fresh start.', ko: '오래된 소비 습관을 바꾸면 새 출발이에요.', ja: '古いお金の使い方を変えて、新しいスタートを。', zh: '改掉旧的消费习惯，重新开始。' },
  ],
  [ // 14 Temperance
    { en: 'A calm, balanced pace suits you best.', ko: '차분하고 균형 잡힌 속도가 가장 잘 맞아요.', ja: '穏やかでバランスの良いペースが一番。', zh: '平稳均衡的节奏最适合你。' },
    { en: 'Balance what comes in and goes out. Spend in moderation.', ko: '들어오고 나가는 돈의 균형을 맞추세요. 적당히 쓰기.', ja: '入るお金と出るお金のバランスを。ほどほどに。', zh: '平衡收支。适度消费。' },
  ],
  [ // 15 The Devil
    { en: 'Strong attraction! Enjoy it, but don\'t lose yourself.', ko: '강한 끌림이 있어요! 즐기되 나를 잃지는 마세요.', ja: '強い引力！楽しんで、でも自分を見失わないで。', zh: '强烈的吸引力！享受它，但别迷失自己。' },
    { en: 'Watch out for impulse buys and tempting deals.', ko: '충동구매와 달콤한 유혹을 조심하세요.', ja: '衝動買いと甘い誘いに注意。', zh: '小心冲动消费和诱人的优惠。' },
  ],
  [ // 16 The Tower
    { en: 'A surprise shake-up clears the air between you.', ko: '깜짝 놀랄 일이 생기지만, 덕분에 공기가 맑아져요.', ja: '突然の出来事が、二人の空気をすっきりさせます。', zh: '意外的变动反而让关系更清晰。' },
    { en: 'An unexpected cost may pop up. Keep a small cushion.', ko: '예상 못한 지출이 생길 수 있어요. 비상금을 조금 두세요.', ja: '急な出費があるかも。少しの備えを。', zh: '可能会有意外开销。留点备用金。' },
  ],
  [ // 17 The Star
    { en: 'Hopeful feelings. A wish in love may come true.', ko: '희망찬 마음이에요. 사랑의 소원이 이뤄질지도 몰라요.', ja: '希望に満ちた気持ち。恋の願いが叶うかも。', zh: '充满希望。爱情的愿望可能会实现。' },
    { en: 'Things are getting brighter. Start saving for a dream.', ko: '점점 밝아지고 있어요. 꿈을 위해 저축을 시작해 보세요.', ja: 'だんだん明るく。夢のための貯金を始めて。', zh: '情况越来越好。为梦想开始存钱吧。' },
  ],
  [ // 18 The Moon
    { en: 'Mixed signals? Ask instead of guessing.', ko: '헷갈리는 신호가 있나요? 추측 말고 물어보세요.', ja: 'サインが曖昧？推測せずに聞いてみて。', zh: '信号模糊？与其猜测不如直接问。' },
    { en: 'Something is unclear. Double-check before you pay.', ko: '불분명한 게 있어요. 돈을 내기 전에 다시 확인하세요.', ja: 'はっきりしない点あり。払う前に再確認を。', zh: '有不明确的地方。付款前再确认一次。' },
  ],
  [ // 19 The Sun
    { en: 'Bright and happy! A great time for dates.', ko: '밝고 행복해요! 데이트하기 딱 좋은 때예요.', ja: '明るくハッピー！デートに最高の時期。', zh: '明亮又快乐！非常适合约会。' },
    { en: 'Good money luck. Enjoy it, and share a little.', ko: '금전운이 좋아요. 즐기고 조금은 나눠 보세요.', ja: '金運良好。楽しんで、少しおすそ分けも。', zh: '财运很好。好好享受，也分享一点。' },
  ],
  [ // 20 Judgement
    { en: 'A second chance or a happy reunion is possible.', ko: '두 번째 기회나 반가운 재회가 있을 수 있어요.', ja: '二度目のチャンスや、うれしい再会があるかも。', zh: '可能会有第二次机会或愉快的重逢。' },
    { en: 'Look over old accounts. Something may come back to you.', ko: '예전 통장을 살펴보세요. 돌아올 돈이 있을지도 몰라요.', ja: '昔の口座を見直して。戻ってくるお金があるかも。', zh: '看看旧账户。可能有钱会回到你手里。' },
  ],
  [ // 21 The World
    { en: 'A happy, complete feeling. You fit together well.', ko: '행복하고 꽉 찬 느낌이에요. 서로 잘 맞아요.', ja: '幸せで満たされた気持ち。相性ぴったり。', zh: '幸福圆满的感觉。你们很合拍。' },
    { en: 'A goal reached! Reward yourself.', ko: '목표 달성! 스스로에게 상을 주세요.', ja: '目標達成！自分にご褒美を。', zh: '目标达成！奖励一下自己。' },
  ],
];
MAJOR.forEach((card, i) => { [card.love, card.money] = MAJOR_TOPICS[i]; });

// The whole 78-card deck: 22 major arcana (0–21), then 56 minor arcana (22–77).
export const TAROT_CARDS = [...MAJOR, ...MINOR];

export const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

// The corner mark on a card face: a roman numeral, or the minor card's rank.
export const cardMark = (card) => (card.suit ? card.mark : ROMAN[card.n]);

// The kinds of reading. Dating and friendship readings can be done with a friend
// sitting beside you (pair), with their own three positions.
const P = (id, en, ko, ja, zh) => ({ id, name: { en, ko, ja, zh } });
export const TOPICS = [
  {
    id: 'today', icon: '🔮', text: 'mean', name: { en: 'Past, present, future', ko: '과거·현재·미래', ja: '過去・現在・未来', zh: '过去·现在·未来' },
    positions: POSITIONS,
  },
  {
    id: 'dating', icon: '💘', text: 'love', pairable: true, name: { en: 'Dating luck', ko: '연애운', ja: '恋愛運', zh: '恋爱运' },
    positions: [P('charm', 'Your charm', '나의 매력', 'あなたの魅力', '你的魅力'), P('meet', 'A new meeting', '다가올 만남', '新しい出会い', '新的邂逅'), P('advice', 'Advice', '조언', 'アドバイス', '建议')],
  },
  {
    // Friendship luck reads the cards' general meanings (no separate texts).
    id: 'friend', icon: '🤝', text: 'mean', pairable: true, name: { en: 'Friendship luck', ko: '우정운', ja: '友情運', zh: '友情运' },
    positions: [P('mine', 'Your side', '나의 마음', 'あなたの気持ち', '你的心意'), P('theirs', 'Your friend\'s side', '친구의 마음', '友達の気持ち', '朋友的心意'), P('flow', 'Your friendship ahead', '앞으로의 우정', 'これからの友情', '友情走向')],
  },
  {
    id: 'money', icon: '💰', text: 'money', name: { en: 'Money luck', ko: '금전운', ja: '金運', zh: '财运' },
    positions: [P('now', 'Right now', '지금 상황', '今の状況', '现在'), P('care', 'Watch out for', '주의할 점', '気をつけること', '注意'), P('soon', 'Coming luck', '다가올 운', 'これからの運', '未来财运')],
  },
];
// A reading together: the first card is the host's heart, the second the
// friend's (each picks their own), the third is for the two of them.
export const PAIR_POSITIONS = [
  P('a', '{a}\'s heart', '{a}의 마음', '{a}の気持ち', '{a}的心意'),
  P('b', '{b}\'s heart', '{b}의 마음', '{b}の気持ち', '{b}的心意'),
  P('us', 'You two', '두 사람', 'ふたり', '你们俩'),
];
export const topicById = (id) => TOPICS.find((t) => t.id === id) || TOPICS[0];
// What a card says for a reading of this topic.
export const cardText = (card, topic) => card[topicById(topic).text] || card.mean;

// Shuffles the deck (Fisher–Yates) with rand() in [0, 1).
export function shuffleDeck(rand = Math.random) {
  const deck = TAROT_CARDS.map((card) => card.n);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
// A small seeded random (mulberry32), so two players reading together shuffle
// the same deck from the same seed.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
