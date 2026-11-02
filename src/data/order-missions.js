// Ordering practice for restaurants. Food in the game can't be eaten, so a
// restaurant is a place to practise ordering in Korean: the player gets a
// mission card ("order 1 serving of mild tteokbokki"), builds the order from
// word blocks, says it to the clerk, then answers the clerk's follow-up
// question. Each mission gives a stamp.
//
// Korean lines carry Revised Romanization and a meaning in each UI language.
// Shared across regions: a store opts in with "workshop": "order" and
// "orderMenu": "<menu id>" in its stores.json entry.

// Word blocks. "end" marks the polite ending the order must finish with.
export const BLOCKS = {
  tteokbokki: { ko: '떡볶이', rom: 'tteokbokki', en: 'tteokbokki (spicy rice cakes)', ja: 'トッポッキ', zh: '炒年糕' },
  gimbap: { ko: '김밥', rom: 'gimbap', en: 'gimbap (seaweed rice roll)', ja: 'キンパ', zh: '紫菜包饭' },
  sundae: { ko: '순대', rom: 'sundae', en: 'sundae (Korean blood sausage)', ja: 'スンデ', zh: '血肠' },
  oneServing: { ko: '1인분', rom: 'il-inbun', en: '1 serving', ja: '1人前', zh: '一人份' },
  twoServings: { ko: '2인분', rom: 'i-inbun', en: '2 servings', ja: '2人前', zh: '两人份' },
  oneRoll: { ko: '한 줄', rom: 'han jul', en: '1 roll', ja: '1本', zh: '一条' },
  twoRolls: { ko: '두 줄', rom: 'du jul', en: '2 rolls', ja: '2本', zh: '两条' },
  mild: { ko: '안 맵게', rom: 'an maepge', en: 'not spicy', ja: '辛くなく', zh: '不辣' },
  extraSpicy: {
    ko: '아주 맵게', rom: 'aju maepge', en: 'extra spicy', ja: 'とても辛く', zh: '特辣',
    // The clerk's extra reaction when this block is in the order.
    reaction: ['아주 매운맛은 정말 매워요! 😅', 'aju maeunmaseun jeongmal maewoyo!', { en: 'Extra spicy is REALLY spicy!', ja: 'とても辛いのは本当に辛いですよ！', zh: '特辣真的很辣哦！' }],
  },
  noOrgans: { ko: '내장 빼고', rom: 'naejang ppaego', en: 'without the organ meat', ja: '内臓抜きで', zh: '不要内脏' },
  please: { ko: '주세요', rom: 'juseyo', en: 'please (give me)', ja: 'ください', zh: '请给我', end: true },
};

// Clerk lines: [Korean, romanization, { en, ja, zh }].
export const LINES = {
  greet: ['어서 오세요! 뭐 드릴까요?', 'eoseo oseyo! mwo deurilkkayo?', { en: 'Welcome! What can I get you?', ja: 'いらっしゃいませ！何にしますか？', zh: '欢迎光临！您要点什么？' }],
  pardon: ['네? 다시 한번 말씀해 주시겠어요?', 'ne? dasi hanbeon malsseumhae jusigesseoyo?', { en: 'Sorry? Could you say that again?', ja: 'はい？もう一度言っていただけますか？', zh: '什么？您能再说一遍吗？' }],
  confirmTail: ['맞으세요?', 'majeuseyo?', { en: 'Is that right?', ja: 'よろしいですか？', zh: '对吗？' }],
  gotIt: ['네, 알겠습니다!', 'ne, algesseumnida!', { en: 'Sure, got it!', ja: 'はい、かしこまりました！', zh: '好的，明白了！' }],
  hereOrToGo: ['드시고 가세요? 포장이세요?', 'deusigo gaseyo? pojangieyo?', { en: 'For here or to go?', ja: '店内でお召し上がりですか？お持ち帰りですか？', zh: '在这里吃还是打包？' }],
  howToPay: ['결제는 어떻게 하시겠어요?', 'gyeoljeneun eotteoke hasigesseoyo?', { en: 'How would you like to pay?', ja: 'お支払いはどうなさいますか？', zh: '您怎么付款？' }],
  done: ['잠시만 기다려 주세요. 맛있게 드세요!', 'jamsiman gidaryeo juseyo. masitge deuseyo!', { en: 'Just a moment, please. Enjoy your meal!', ja: '少々お待ちください。ごゆっくりどうぞ！', zh: '请稍等。祝您用餐愉快！' }],
  wrongAnswer: ['네? 😮', 'ne?', { en: 'Huh? (That is not what your mission says.)', ja: 'えっ？（ミッションと違います）', zh: '嗯？（和任务不一样哦）' }],
};

// Answers to the clerk's follow-up questions.
export const ANSWERS = {
  here: ['먹고 갈게요', 'meokgo galgeyo', { en: "I'll eat here", ja: '店内で食べます', zh: '在这里吃' }],
  toGo: ['포장해 주세요', 'pojanghae juseyo', { en: 'To go, please', ja: '持ち帰りでお願いします', zh: '请打包' }],
  card: ['카드로 할게요', 'kadeuro halgeyo', { en: "I'll pay by card", ja: 'カードで払います', zh: '我用卡付' }],
  cash: ['현금으로 할게요', 'hyeongeumeuro halgeyo', { en: "I'll pay in cash", ja: '現金で払います', zh: '我付现金' }],
};

// Menus: the missions a restaurant offers.
export const MENUS = {
  bunsik: [
    {
      id: 'mild-tteokbokki',
      icon: '🌶️',
      title: { en: 'Order 1 serving of tteokbokki, not spicy, to eat here', ja: 'トッポッキ1人前を辛くなく、店内で注文しよう', zh: '点一份不辣的炒年糕，在店里吃', ko: '안 매운 떡볶이 1인분을 먹고 가는 걸로 주문하기' },
      need: ['tteokbokki', 'oneServing', 'mild'],
      extra: ['gimbap', 'twoServings', 'extraSpicy'],
      ask: 'hereOrToGo', options: ['here', 'toGo'], answer: 'here',
    },
    {
      id: 'gimbap-to-go',
      icon: '🍙',
      title: { en: 'Order 2 rolls of gimbap to go', ja: 'キンパ2本を持ち帰りで注文しよう', zh: '点两条紫菜包饭打包带走', ko: '김밥 두 줄을 포장으로 주문하기' },
      need: ['gimbap', 'twoRolls'],
      extra: ['oneRoll', 'sundae', 'mild'],
      ask: 'hereOrToGo', options: ['here', 'toGo'], answer: 'toGo',
    },
    {
      id: 'sundae-card',
      icon: '💳',
      title: { en: 'Order 1 serving of sundae without the organ meat, and pay by card', ja: 'スンデ1人前を内臓抜きで注文して、カードで払おう', zh: '点一份不要内脏的血肠，用卡付款', ko: '순대 1인분을 내장 빼고 주문하고 카드로 결제하기' },
      need: ['sundae', 'oneServing', 'noOrgans'],
      extra: ['tteokbokki', 'twoServings', 'extraSpicy'],
      ask: 'howToPay', options: ['card', 'cash'], answer: 'card',
    },
  ],
};

export const stampId = (storeId, missionId) => `order:${storeId}:${missionId}`;
