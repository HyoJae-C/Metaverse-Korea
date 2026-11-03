// The update board (⚙️ → 📢 Updates): notices for players, newest first.
// Each notice is short and plain (what changed for players, no technical
// details), and is checked by the game's owner before it goes in.
//   id:    unique, also used to show the "new" dot once per notice
//   at:    when it was announced, Korea time ('YYYY.MM.DD HH:MM')
//   title / items: per language; a language without its own text shows English.
export const UPDATES = [
  {
    id: '2026-11-04-welcome',
    at: '2026.11.04 05:00',
    title: {
      ko: '메타버스 코리아에 오신 걸 환영해요!',
      en: 'Welcome to Metaverse Korea!',
      ja: 'メタバース・コリアへようこそ！',
      zh: '欢迎来到元宇宙韩国！',
      es: '¡Bienvenido a Metaverse Korea!',
      id: 'Selamat datang di Metaverse Korea!',
      ar: 'أهلًا بك في ميتافيرس كوريا!',
    },
    items: {
      ko: ['한국 사람도, 한국을 찾은 친구도 누구나 모여서 재미있고 즐거운 서울 라이프를 즐겨 보세요! 🎉'],
      en: ['Whether you are from Korea or from anywhere else, come together and enjoy a fun and happy Seoul life! 🎉'],
      ja: ['韓国の人も、韓国が好きな世界中の人も、みんなで集まって楽しいソウルライフを満喫しよう！🎉'],
      zh: ['无论是韩国人还是来自世界各地的朋友，都来一起享受有趣又快乐的首尔生活吧！🎉'],
      es: ['Seas de Corea o de cualquier otro lugar, ¡ven y disfruta de una vida en Seúl divertida y feliz! 🎉'],
      id: ['Orang Korea atau dari mana pun, ayo berkumpul dan nikmati kehidupan Seoul yang seru dan menyenangkan! 🎉'],
      ar: ['سواء كنت من كوريا أو من أي مكان آخر، تعالَ واستمتع بحياة ممتعة وسعيدة في سيول! 🎉'],
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
