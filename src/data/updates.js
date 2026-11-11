// The update board (⚙️ → 📢 Updates): notices for players, newest first.
// Each notice is short and plain (what changed for players, no technical
// details), and is checked by the game's owner before it goes in.
//   id:    unique, also used to show the "new" dot once per notice
//   at:    when it was announced, Korea time ('YYYY.MM.DD HH:MM')
//   title / items: per language; a language without its own text shows English.
//   A notice with one item shows it as a message (no bullet); \n breaks a line.
import { s2t } from '../i18n/hant.js';

export const UPDATES = [
  {
    id: '2026-11-11-new-name',
    at: '2026.11.11 18:30',
    title: {
      ko: '✨ 어나더서울이 모두서울이 됐어요!',
      en: '✨ Another Seoul is now Modu Seoul!',
      ja: '✨ アナザー・ソウルはモドゥ・ソウルになりました！',
      zh: '✨ Another Seoul 改名为 Modu Seoul 啦！',
    },
    items: {
      ko: ['모두(everyone)와 함께 걷는 서울이라는 뜻이에요. 계정, 옷, 돈은 그대로예요.\n새 주소: moduseoul.com'],
      en: ['"Modu" means "everyone" in Korean: a Seoul for everyone to walk together. Your account, clothes and money stay the same.\nNew address: moduseoul.com'],
      ja: ['「モドゥ」は韓国語で「みんな」。みんなで歩くソウルです。アカウント、服、お金はそのままです。\n新しいアドレス：moduseoul.com'],
      zh: ['"Modu" 在韩语里是"大家"的意思：大家一起漫步的首尔。账号、衣服和钱都不变。\n新网址：moduseoul.com'],
    },
  },
  {
    id: '2026-11-06-hangang-park',
    at: '2026.11.06 20:15',
    title: {
      ko: '🦆 뚝섬한강공원에 놀러 오세요!',
      en: '🦆 Come play at Ttukseom Han River Park!',
      ja: '🦆 トゥクソム漢江公園に遊びに来てね！',
      zh: '🦆 来纛岛汉江公园玩吧！',
      es: '🦆 ¡Ven a divertirte al Parque Ttukseom del río Han!',
      id: '🦆 Ayo main ke Taman Sungai Han Ttukseom!',
      ar: '🦆 تعالَ والعب في حديقة نهر هان في تتوكسوم!', vi: '🦆 Hãy đến chơi ở Công viên sông Hàn Ttukseom!', hi: '🦆 Ttukseom हान नदी पार्क में घूमने आइए!',
      fr: '🦆 Viens jouer au parc du fleuve Han de Ttukseom !',
      th: '🦆 มาเล่นที่สวนริมแม่น้ำฮันตุกซอมกัน!',
    },
    items: {
      ko: [
        '🎣 낚시: 새로 생긴 낚시 도감을 채워 보세요. 자동 낚시도 되고, 귀한 희귀 물고기도 기다리고 있어요!',
        '🍜 한강라면: 데일리마트에서 라면을 사서 강변에서 직접 끓여 먹어요.',
        '🦆 오리배: 무료로 타고 친구와 함께 강 위를 마음껏 달려 보세요.',
        '🍢 강변장터: 떡볶이, 꼬치, 호떡, 치킨까지 다양한 먹거리가 준비되어 있어요!',
      ],
      en: [
        '🎣 Fishing: fill the new fish book. Try auto fishing, and look out for rare fish!',
        '🍜 Han River ramyeon: buy a pack at DAILY MART and cook it yourself by the river.',
        '🦆 Duck boats: ride for free and steer around the river with a friend.',
        '🍢 Riverside market: tteokbokki, skewers, hotteok, chicken and lots more to eat!',
      ],
      ja: [
        '🎣 釣り：新しい釣り図鑑を埋めよう。自動釣りもできて、レアな魚も待っているよ！',
        '🍜 漢江ラーメン：DAILY MARTでラーメンを買って、川辺で自分で作って食べよう。',
        '🦆 アヒルボート：無料で乗れて、友だちと川の上を自由に走れるよ。',
        '🍢 川辺市場：トッポッキ、串焼き、ホットク、チキンなど食べ物がいっぱい！',
      ],
      zh: [
        '🎣 钓鱼：来填满全新的钓鱼图鉴吧。可以自动钓鱼，还有稀有鱼等着你！',
        '🍜 汉江拉面：在DAILY MART买一包拉面，在江边亲手煮来吃。',
        '🦆 鸭子船：免费乘坐，和朋友一起在江上自由畅游。',
        '🍢 江边集市：炒年糕、烤串、糖饼、炸鸡，各种美食等你来尝！',
      ],
      es: [
        '🎣 Pesca: completa el nuevo libro de peces. Prueba la pesca automática ¡y busca peces raros!',
        '🍜 Ramyeon del río Han: compra un paquete en DAILY MART y cocínalo tú mismo junto al río.',
        '🦆 Botes pato: súbete gratis y navega por el río con un amigo.',
        '🍢 Mercado ribereño: tteokbokki, brochetas, hotteok, pollo ¡y mucho más para comer!',
      ],
      id: [
        '🎣 Memancing: lengkapi buku ikan yang baru. Coba memancing otomatis dan cari ikan langka!',
        '🍜 Ramyeon Sungai Han: beli ramyeon di DAILY MART dan masak sendiri di tepi sungai.',
        '🦆 Perahu bebek: naik gratis dan jelajahi sungai bersama teman.',
        '🍢 Pasar tepi sungai: tteokbokki, sate, hotteok, ayam, dan banyak makanan lainnya!',
      ],
      ar: [
        '🎣 الصيد: املأ كتاب الأسماك الجديد. جرّب الصيد التلقائي وابحث عن الأسماك النادرة!',
        '🍜 رامين نهر هان: اشترِ عبوة من DAILY MART واطبخها بنفسك على ضفة النهر.',
        '🦆 قوارب البطة: اركب مجانًا وتجوّل في النهر مع صديق.',
        '🍢 سوق ضفة النهر: تتوكبوكي وأسياخ وهوتوك ودجاج وأطعمة كثيرة أخرى!',
      ],
      vi: [
        '🎣 Câu cá: hãy hoàn thành sổ tay cá mới. Thử câu tự động và săn cá hiếm nhé!',
        '🍜 Mì ramyeon sông Hàn: mua một gói ở DAILY MART rồi tự nấu bên bờ sông.',
        '🦆 Thuyền vịt: đi miễn phí và lướt trên sông cùng bạn bè.',
        '🍢 Chợ ven sông: tteokbokki, xiên nướng, hotteok, gà rán và nhiều món ngon khác!',
      ],
      hi: [
        '🎣 मछली पकड़ना: नई फ़िश बुक भरिए। ऑटो फ़िशिंग आज़माइए और दुर्लभ मछलियाँ खोजिए!',
        '🍜 हान नदी रामयन: DAILY MART से पैकेट ख़रीदिए और नदी किनारे ख़ुद पकाइए।',
        '🦆 बत्तख नाव: मुफ़्त में सवारी कीजिए और दोस्त के साथ नदी पर घूमिए।',
        '🍢 नदी किनारे बाज़ार: तेओकबोक्की, सीख कबाब, होत्तेओक, चिकन और बहुत कुछ!',
      ],
      fr: ['🎣 Pêche : remplis le nouveau carnet des poissons. Essaie la pêche auto, et guette les poissons rares !', '🍜 Ramyeon du fleuve Han : achète un paquet au DAILY MART et cuisine-le toi-même au bord du fleuve.', '🦆 Pédalos canards : balade gratuite sur le fleuve avec un ami.', '🍢 Marché du bord du fleuve : tteokbokki, brochettes, hotteok, poulet frit et plein d\'autres choses à manger !'],
      th: ['🎣 ตกปลา: เติมสมุดปลาเล่มใหม่ ลองตกปลาอัตโนมัติ แล้วคอยดูปลาหายาก!', '🍜 รามยอนริมแม่น้ำฮัน: ซื้อหนึ่งซองที่ DAILY MART แล้วต้มเองริมแม่น้ำ', '🦆 เรือเป็ด: นั่งฟรีและบังคับไปรอบแม่น้ำกับเพื่อน', '🍢 ตลาดริมแม่น้ำ: ต็อกบกกี ของเสียบไม้ ฮอตต็อก ไก่ทอด และอีกมากมาย!'],
    },
  },
  {
    id: '2026-11-05-refresh',
    at: '2026.11.05 18:05',
    title: {
      ko: '🔄 새로고침하면 새 콘텐츠가!',
      en: '🔄 Refresh for new content!',
      ja: '🔄 リロードで新しいコンテンツ！',
      zh: '🔄 刷新一下，可能有新内容！',
      es: '🔄 ¡Recarga para ver novedades!',
      id: '🔄 Muat ulang untuk konten baru!',
      ar: '🔄 حدّث الصفحة لترى الجديد!', vi: '🔄 Tải lại để xem nội dung mới!', hi: '🔄 नई चीज़ों के लिए रीफ़्रेश कीजिए!',
      fr: '🔄 Actualise pour du nouveau contenu !',
      th: '🔄 รีเฟรชเพื่อดูของใหม่!',
    },
    items: {
      ko: ['개발자가 하루에도 몇 번씩\n업데이트를 하고 있어요.\n\n10~15분마다 새로고침을 하면\n새 콘텐츠가 계속 생길 수도 있어요! ✨'],
      en: ['The developer updates the game\nseveral times a day.\n\nRefresh the page every 10–15 minutes\nand you may find something new! ✨'],
      ja: ['開発者が1日に何度も\nアップデートしています。\n\n10〜15分ごとにリロードすると\n新しいコンテンツが見つかるかも！✨'],
      zh: ['开发者每天都会\n更新好几次。\n\n每隔10～15分钟刷新一下页面，\n也许就会发现新内容！✨'],
      es: ['El desarrollador actualiza el juego\nvarias veces al día.\n\nRecarga la página cada 10–15 minutos\n¡y quizá encuentres algo nuevo! ✨'],
      id: ['Pengembang memperbarui game\nbeberapa kali sehari.\n\nMuat ulang halaman setiap 10–15 menit,\nmungkin ada hal baru! ✨'],
      ar: ['المطوّر يحدّث اللعبة\nعدة مرات في اليوم.\n\nحدّث الصفحة كل 10–15 دقيقة\nوقد تجد شيئًا جديدًا! ✨'],
      vi: ['Nhà phát triển cập nhật game\nnhiều lần mỗi ngày.\n\nHãy tải lại trang mỗi 10–15 phút,\nbiết đâu sẽ có nội dung mới! ✨'],
      hi: ['डेवलपर दिन में कई बार\nगेम अपडेट करते हैं।\n\nहर 10–15 मिनट में पेज रीफ़्रेश कीजिए,\nशायद कुछ नया मिल जाए! ✨'],
      fr: ['Le développeur met le jeu à jour\nplusieurs fois par jour.\n\nActualise la page toutes les 10–15 minutes\net tu trouveras peut-être du nouveau ! ✨'],
      th: ['ผู้พัฒนาอัปเดตเกม\nหลายครั้งต่อวัน\n\nรีเฟรชหน้าทุก 10–15 นาที\nอาจเจออะไรใหม่ๆ ก็ได้! ✨'],
    },
  },
  {
    id: '2026-11-05-subway',
    at: '2026.11.05 18:00',
    title: {
      ko: '🚇 지하철을 타 보세요!',
      en: '🚇 Take the subway!',
      ja: '🚇 地下鉄に乗ってみよう！',
      zh: '🚇 来坐地铁吧！',
      es: '🚇 ¡Sube al metro!',
      id: '🚇 Ayo naik kereta bawah tanah!',
      ar: '🚇 جرّب ركوب المترو!', vi: '🚇 Hãy thử đi tàu điện ngầm!', hi: '🚇 मेट्रो में सफ़र कीजिए!',
      fr: '🚇 Prends le métro !',
      th: '🚇 นั่งรถไฟใต้ดินกัน!',
    },
    items: {
      ko: ['길가의 지하철 입구 계단으로 내려가 보세요.\n개찰구를 지나 열차를 타면\n성수 · 경복궁 · 홍대입구 · 이태원 · 잠실\n다른 동네로 금방 갈 수 있어요! 🚉'],
      en: ['Walk down the subway stairs on the street.\nPass the ticket gate and hop on a train\nto ride to Seongsu, Gyeongbokgung,\nHongik Univ., Itaewon and Jamsil! 🚉'],
      ja: ['道ばたの地下鉄の入口から階段を下りてみよう。\n改札を通って電車に乗れば\n聖水・景福宮・弘大入口・梨泰院・蚕室へ\nすぐに行けるよ！🚉'],
      zh: ['从路边的地铁入口走下楼梯，\n通过闸机，坐上列车，\n就能很快去圣水、景福宫、\n弘大入口、梨泰院和蚕室！🚉'],
      es: ['Baja por las escaleras del metro en la calle.\nPasa el torniquete y súbete a un tren\npara ir a Seongsu, Gyeongbokgung,\nHongik Univ., Itaewon y Jamsil. 🚉'],
      id: ['Turuni tangga stasiun di pinggir jalan.\nLewati gerbang tiket dan naik kereta\nuntuk pergi ke Seongsu, Gyeongbokgung,\nHongik Univ., Itaewon, dan Jamsil! 🚉'],
      ar: ['انزل درج المترو الموجود في الشارع.\nمرّ عبر بوابة التذاكر واركب القطار\nلتذهب إلى سيونغسو وكيونغبوكغونغ\nوهونغيك وإيتايوون وجامسيل! 🚉'],
      vi: ['Hãy đi xuống cầu thang ga tàu bên đường.\nQua cổng soát vé và lên tàu\nđể đến Seongsu, Gyeongbokgung,\nHongik Univ., Itaewon và Jamsil! 🚉'],
      hi: ['सड़क पर मेट्रो की सीढ़ियों से नीचे जाइए।\nटिकट गेट पार करके ट्रेन में बैठिए\nऔर Seongsu, Gyeongbokgung,\nHongik Univ., Itaewon व Jamsil पहुँचिए! 🚉'],
      fr: ['Descends l\'escalier du métro dans la rue.\nPasse le portillon et monte dans un train\npour aller à Seongsu, Gyeongbokgung,\nHongik Univ., Itaewon et Jamsil ! 🚉'],
      th: ['เดินลงบันไดรถไฟใต้ดินบนถนน\nผ่านประตูตรวจตั๋วแล้วขึ้นรถไฟ\nไป Seongsu, Gyeongbokgung,\nHongik Univ., Itaewon และ Jamsil! 🚉'],
    },
  },
  {
    id: '2026-11-04-welcome',
    at: '2026.11.04 05:00',
    title: {
      ko: '모두서울에 오신 걸 환영해요!',
      en: 'Welcome to Modu Seoul!',
      ja: 'モドゥ・ソウルへようこそ！',
      zh: '欢迎来到Modu Seoul！',
      es: '¡Bienvenido a Modu Seoul!',
      id: 'Selamat datang di Modu Seoul!',
      ar: 'أهلًا بك في Modu Seoul!', vi: 'Chào mừng đến với Modu Seoul!', hi: 'Modu Seoul में आपका स्वागत है!',
      fr: 'Bienvenue dans Modu Seoul !',
      th: 'ยินดีต้อนรับสู่ Modu Seoul!',
    },
    items: {
      ko: ['한국 사람도,\n한국을 찾은 친구도,\n누구나 함께 모여서\n\n재미있고 즐거운\n서울 라이프를 즐겨 보세요! 🎉'],
      en: ['From Korea\nor from anywhere else,\neveryone is welcome here.\n\nCome together and enjoy\na fun and happy Seoul life! 🎉'],
      ja: ['韓国の人も、\n世界中から来た人も、\nみんなで集まって\n\n楽しくて幸せな\nソウルライフを満喫しよう！🎉'],
      zh: ['无论是韩国人，\n还是来自世界各地的朋友，\n大家一起聚在这里\n\n享受有趣又快乐的\n首尔生活吧！🎉'],
      es: ['Seas de Corea\no de cualquier otro lugar,\naquí todos son bienvenidos.\n\n¡Ven y disfruta de una vida\nen Seúl divertida y feliz! 🎉'],
      id: ['Orang Korea\natau dari mana pun,\nsemua boleh berkumpul di sini.\n\nAyo nikmati kehidupan Seoul\nyang seru dan menyenangkan! 🎉'],
      ar: ['سواء كنت من كوريا\nأو من أي مكان آخر،\nالجميع مرحَّب بهم هنا.\n\nتعالَ واستمتع بحياة\nممتعة وسعيدة في سيول! 🎉'], vi: ['Dù bạn đến từ Hàn Quốc\nhay bất cứ nơi đâu,\nai cũng được chào đón ở đây.\n\nCùng nhau tận hưởng\ncuộc sống Seoul vui vẻ! 🎉'], hi: ['कोरिया से हों\nया कहीं और से,\nयहाँ सबका स्वागत है।\n\nसाथ आइए और मज़ेदार,\nख़ुशहाल सियोल लाइफ़ का आनंद लीजिए! 🎉'],
      fr: ['Que tu viennes de Corée\nou d\'ailleurs,\ntout le monde est le bienvenu ici.\n\nViens profiter ensemble\nd\'une vie à Séoul joyeuse ! 🎉'],
      th: ['ไม่ว่าจะมาจากเกาหลี\nหรือที่ไหนก็ตาม\nที่นี่ยินดีต้อนรับทุกคน\n\nมาสนุกด้วยกัน\nกับชีวิตในโซลที่แสนสุข! 🎉'],
    },
  },
];

// The text of a notice in a language (English when it has none; 繁體中文
// is made from the simplified Chinese text).
export function updateText(u, lang) {
  if (lang === 'zht' && !u.title.zht && u.title.zh) {
    return { title: s2t(u.title.zh), items: (u.items.zht || u.items.zh || u.items.en).map(s2t) };
  }
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
