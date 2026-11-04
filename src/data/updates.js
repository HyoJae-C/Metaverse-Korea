// The update board (⚙️ → 📢 Updates): notices for players, newest first.
// Each notice is short and plain (what changed for players, no technical
// details), and is checked by the game's owner before it goes in.
//   id:    unique, also used to show the "new" dot once per notice
//   at:    when it was announced, Korea time ('YYYY.MM.DD HH:MM')
//   title / items: per language; a language without its own text shows English.
//   A notice with one item shows it as a message (no bullet); \n breaks a line.
export const UPDATES = [
  {
    id: '2026-11-04-welcome',
    at: '2026.11.04 05:00',
    title: {
      ko: '어나더서울에 오신 걸 환영해요!',
      en: 'Welcome to Another Seoul!',
      ja: 'アナザー・ソウルへようこそ！',
      zh: '欢迎来到Another Seoul！',
      es: '¡Bienvenido a Another Seoul!',
      id: 'Selamat datang di Another Seoul!',
      ar: 'أهلًا بك في Another Seoul!',
    },
    items: {
      ko: ['한국 사람도,\n한국을 찾은 친구도,\n누구나 함께 모여서\n\n재미있고 즐거운\n서울 라이프를 즐겨 보세요! 🎉'],
      en: ['From Korea\nor from anywhere else,\neveryone is welcome here.\n\nCome together and enjoy\na fun and happy Seoul life! 🎉'],
      ja: ['韓国の人も、\n世界中から来た人も、\nみんなで集まって\n\n楽しくて幸せな\nソウルライフを満喫しよう！🎉'],
      zh: ['无论是韩国人，\n还是来自世界各地的朋友，\n大家一起聚在这里\n\n享受有趣又快乐的\n首尔生活吧！🎉'],
      es: ['Seas de Corea\no de cualquier otro lugar,\naquí todos son bienvenidos.\n\n¡Ven y disfruta de una vida\nen Seúl divertida y feliz! 🎉'],
      id: ['Orang Korea\natau dari mana pun,\nsemua boleh berkumpul di sini.\n\nAyo nikmati kehidupan Seoul\nyang seru dan menyenangkan! 🎉'],
      ar: ['سواء كنت من كوريا\nأو من أي مكان آخر،\nالجميع مرحَّب بهم هنا.\n\nتعالَ واستمتع بحياة\nممتعة وسعيدة في سيول! 🎉'],
    },
  },
];

// The text of a notice in a language (English when it has none).
export function updateText(u, lang) {
  return { title: u.title[lang] || u.title.en, items: u.items[lang] || u.items.en };
}

// Whether there is a notice newer than the last one seen.
export function hasNew(seenId, list = UPDATES) {
  return list.length > 0 && list[0].id !== seenId;
}

// How many notices (from the top) are new since the last one seen: all of
// them when none was seen yet.
export function newCount(seenId, list = UPDATES) {
  const i = list.findIndex((u) => u.id === seenId);
  return i < 0 ? list.length : i;
}
