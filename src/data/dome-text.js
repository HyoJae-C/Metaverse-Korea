// Modu Ballpark (core/dome.js, core/ballgame.js): the words shown in
// the game, in every language the game speaks (English is the fallback).

export const DOME_TEXT = {
  welcome: {
    en: '⚾ Welcome to Modu Ballpark! A game starts every 15 minutes: sit behind home plate or join the cheering section on the 1st base side, and grab chicken at the stand. A game stadium: no stadium like this is open here yet, so check before you visit.',
    ko: '⚾ 모두야구장에 오신 걸 환영해요! 15분마다 경기가 시작돼요. 홈플레이트 뒤에 앉거나 1루 쪽 응원석에 끼어 보고, 매점에서 치킨도 사 먹어요. 게임 속 구장이라 지금 이곳에는 이런 구장이 영업하지 않으니, 방문 전 확인하세요.',
    ja: '⚾ モドゥ野球場へようこそ！試合は15分ごとに始まるよ。ホームベース裏に座るか1塁側の応援席に加わって、売店でチキンもどうぞ。ゲームの球場なので、現在ここにこのような球場は営業していません。訪問前に確認してください。',
    zh: '⚾ 欢迎来到Modu棒球场！每15分钟开始一场比赛。坐在本垒后面，或加入一垒一侧的应援区，再去小卖部买炸鸡吧。这是游戏里的球场，这里目前没有这样的球场营业，出发前请确认。',
    es: '⚾ ¡Bienvenido al Modu Ballpark! Cada 15 minutos empieza un partido: siéntate detrás del home o únete a la grada de animación de primera base, y compra pollo en el puesto. Es un estadio del juego: aquí aún no hay ningún estadio así abierto, compruébalo antes de ir.',
    ar: '⚾ أهلًا بك في ملعب مودو! تبدأ مباراة كل 15 دقيقة: اجلس خلف لوحة البيت أو انضم إلى قسم التشجيع جهة القاعدة الأولى، وخذ دجاجًا من الكشك. هذا ملعب داخل اللعبة: لا يوجد ملعب كهذا مفتوح هنا حاليًا، فتحقق قبل زيارتك.',
    vi: '⚾ Chào mừng đến Modu Ballpark! Cứ 15 phút có một trận: ngồi sau chốt nhà hoặc vào khu cổ vũ phía gôn 1, và mua gà ở quầy. Đây là sân trong game: hiện ở đây chưa có sân nào như vậy hoạt động, hãy kiểm tra trước khi đến.',
    hi: '⚾ मोडू बॉलपार्क में स्वागत है! हर 15 मिनट में एक मैच शुरू होता है: होम प्लेट के पीछे बैठिए या पहले बेस की तरफ़ चीयरिंग सेक्शन में जाइए, और स्टॉल से चिकन लीजिए। यह खेल का स्टेडियम है: यहाँ अभी ऐसा कोई स्टेडियम नहीं खुला है, जाने से पहले जाँच लें।',
    fr: '⚾ Bienvenue au Modu Ballpark ! Un match commence toutes les 15 minutes : assieds-toi derrière le marbre ou rejoins la tribune des supporters côté première base, et prends du poulet au stand. C\'est un stade du jeu : aucun stade comme celui-ci n\'est encore ouvert ici, vérifie avant d\'y aller.',
    th: '⚾ ยินดีต้อนรับสู่สนามเบสบอลโมดู! ทุก 15 นาทีมีการแข่งหนึ่งนัด นั่งหลังโฮมเพลตหรือไปร่วมโซนเชียร์ฝั่งเบสหนึ่ง แล้วซื้อไก่ที่ร้าน นี่คือสนามในเกม ตอนนี้ที่นี่ยังไม่มีสนามแบบนี้เปิดจริง กรุณาตรวจสอบก่อนไป',
    id: '⚾ Selamat datang di Modu Ballpark! Setiap 15 menit ada pertandingan: duduk di belakang home plate atau gabung ke tribun sorak di sisi base pertama, dan beli ayam di kios. Ini stadion dalam game: belum ada stadion seperti ini yang buka di sini, cek dulu sebelum berkunjung.',
  },
  leader: { en: 'Cheer leader', ko: '응원단장', ja: '応援団長', zh: '啦啦队长', es: 'Jefe de animación', ar: 'قائد التشجيع', vi: 'Trưởng đoàn cổ vũ', hi: 'चीयर लीडर', fr: 'Chef des supporters', th: 'หัวหน้ากองเชียร์', id: 'Pemimpin sorak' },
};

// What the crowd shouts (Korean, romanization, English), as the NPCs say it.
export const DOME_SHOUT = {
  HR: [['홈런!', 'homeon!', 'Home run!'], ['넘어갔다!', 'neomeogatda!', "It's gone!"]],
  hit: [['나이스!', 'naiseu!', 'Nice!'], ['안타!', 'anta!', 'A hit!'], ['잘한다!', 'jalhanda!', 'Well done!']],
  K: [['삼진!', 'samjin!', 'Strikeout!']],
};
// The cheer leader's chant for a team: its two-word chant, then "let's go".
export const chantPhrase = (team) => [team.chant[0], team.chant[1], `Let's go, ${team.name.en}!`];
