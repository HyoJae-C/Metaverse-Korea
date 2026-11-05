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
    },
  },
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
      ar: 'أهلًا بك في Another Seoul!', vi: 'Chào mừng đến với Another Seoul!', hi: 'Another Seoul में आपका स्वागत है!',
    },
    items: {
      ko: ['한국 사람도,\n한국을 찾은 친구도,\n누구나 함께 모여서\n\n재미있고 즐거운\n서울 라이프를 즐겨 보세요! 🎉'],
      en: ['From Korea\nor from anywhere else,\neveryone is welcome here.\n\nCome together and enjoy\na fun and happy Seoul life! 🎉'],
      ja: ['韓国の人も、\n世界中から来た人も、\nみんなで集まって\n\n楽しくて幸せな\nソウルライフを満喫しよう！🎉'],
      zh: ['无论是韩国人，\n还是来自世界各地的朋友，\n大家一起聚在这里\n\n享受有趣又快乐的\n首尔生活吧！🎉'],
      es: ['Seas de Corea\no de cualquier otro lugar,\naquí todos son bienvenidos.\n\n¡Ven y disfruta de una vida\nen Seúl divertida y feliz! 🎉'],
      id: ['Orang Korea\natau dari mana pun,\nsemua boleh berkumpul di sini.\n\nAyo nikmati kehidupan Seoul\nyang seru dan menyenangkan! 🎉'],
      ar: ['سواء كنت من كوريا\nأو من أي مكان آخر،\nالجميع مرحَّب بهم هنا.\n\nتعالَ واستمتع بحياة\nممتعة وسعيدة في سيول! 🎉'], vi: ['Dù bạn đến từ Hàn Quốc\nhay bất cứ nơi đâu,\nai cũng được chào đón ở đây.\n\nCùng nhau tận hưởng\ncuộc sống Seoul vui vẻ! 🎉'], hi: ['कोरिया से हों\nया कहीं और से,\nयहाँ सबका स्वागत है।\n\nसाथ आइए और मज़ेदार,\nख़ुशहाल सियोल लाइफ़ का आनंद लीजिए! 🎉'],
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
