// The few folk-yard words the street needs before any game is opened (the
// action buttons, the locals' name tags, the yard's toast) and the lines the
// locals say. The games' own text is in folk-text.js, downloaded with the
// game panels the first time one is opened (game/folk-yard.js).
import { getLanguage, localName } from '../core/i18n.js';

export const FOLK_LABELS = {
  teacher: { en: 'Grandpa Kim', ko: '김 할아버지', ja: 'キムおじいさん', zh: '金爷爷', es: 'Abuelo Kim', id: 'Kakek Kim', vi: 'Ông Kim', fr: 'Grand-père Kim', pt: "Vovô Kim", th: 'คุณปู่คิม', ar: 'الجد كيم' },
  courtyard: { en: 'Folk games yard', ko: '전통놀이 마당', ja: '伝統遊びの広場', zh: '传统游戏广场', es: 'Patio de juegos tradicionales', id: 'Halaman permainan tradisional', vi: 'Sân trò chơi dân gian', fr: 'Cour des jeux traditionnels', pt: "Pátio dos jogos tradicionais", th: 'ลานละเล่นพื้นบ้าน', ar: 'ساحة الألعاب الشعبية' },
  'yut.open': { en: 'Play yutnori', ko: '윷놀이 하기', ja: 'ユンノリをする', zh: '玩掷柶', es: 'Jugar al yutnori', id: 'Main yutnori', vi: 'Chơi yutnori', fr: 'Jouer au yutnori', pt: "Jogar yutnori", th: 'เล่นยุทโนรี', ar: 'العب يوتنوري' },
  'yut.grandma': { en: 'Grandma', ko: '할머니', ja: 'おばあちゃん', zh: '奶奶', es: 'Abuela', id: 'Nenek', vi: 'Bà', fr: 'Grand-mère', pt: "Vovó", th: 'คุณยาย', ar: 'الجدة' },
  'yut.ask': { en: '🎲 {name} asks you to play yutnori!', ko: '🎲 {name}님이 윷놀이 같이 하재요!', ja: '🎲 {name}さんがユンノリに誘っています！', zh: '🎲 {name}邀请你玩掷柶！', es: '🎲 ¡{name} te invita a jugar al yutnori!', id: '🎲 {name} mengajakmu main yutnori!', vi: '🎲 {name} rủ bạn chơi yutnori!', fr: '🎲 {name} t\'invite à jouer au yutnori !', pt: "🎲 {name} chamou você para jogar yutnori!", th: '🎲 {name} ชวนคุณเล่นยุทโนรี!', ar: '🎲 {name} يدعوك للعب يوتنوري!' },
  'yut.yes': { en: 'Play', ko: '같이 하기', ja: '遊ぶ', zh: '一起玩', es: 'Jugar', id: 'Main', vi: 'Chơi', fr: 'Jouer', pt: "Jogar", th: 'เล่น', ar: 'العب' },
  'yut.no': { en: 'No thanks', ko: '괜찮아요', ja: 'やめておく', zh: '不用了', es: 'No, gracias', id: 'Tidak, terima kasih', vi: 'Thôi', fr: 'Non merci', pt: "Não, obrigado", th: 'ไม่เป็นไร', ar: 'لا، شكرًا' },
  'tuho.open': { en: 'Play tuho', ko: '투호 하기', ja: '投壺をする', zh: '玩投壶', es: 'Jugar al tuho', id: 'Main tuho', vi: 'Chơi tuho', fr: 'Jouer au tuho', pt: "Jogar tuho", th: 'เล่นทูโฮ', ar: 'العب توهو' },
  'jegi.open': { en: 'Kick the jegi', ko: '제기차기 하기', ja: 'チェギチャギをする', zh: '踢毽子', es: 'Patear el jegi', id: 'Tendang jegi', vi: 'Đá cầu jegi', fr: 'Taper dans le jegi', pt: "Chutar o jegi", th: 'เตะเจกี', ar: 'اركل الجيغي' },
  'neol.open': { en: 'Jump on the seesaw', ko: '널뛰기 하기', ja: 'ノルティギをする', zh: '玩跳板', es: 'Saltar en el balancín', id: 'Main jungkat-jungkit', vi: 'Chơi bập bênh', fr: 'Sauter sur la balançoire', pt: "Pular na gangorra", th: 'กระโดดกระดานหก', ar: 'اقفز على الأرجوحة' },
  'neol.partner': { en: 'Suni', ko: '순이', ja: 'スニ', zh: '顺伊', es: 'Suni', id: 'Suni', vi: 'Suni', fr: 'Suni', pt: "Suni", th: 'ซูนี', ar: 'سوني' },
};

// A label in the player's language.
export const folkLabel = (k) => localName(FOLK_LABELS[k], getLanguage()) ?? k;

// Things the locals say: [Korean, romanization, meaning].
const tr = (en, ja, zh, es, id, vi, ar, fr, th, pt) => ({ en, ja, zh, es, id, vi, ar, fr, th, pt });
export const FOLK_LINES = {
  yutHello: ['윷놀이 한 판 할까요?', 'yunnori han pan halkkayo?', tr('Shall we play a round of yutnori?', 'ユンノリ、一局やりましょうか？', '来一局掷柶吧？', '¿Jugamos una partida de yutnori?', 'Main yutnori satu ronde, yuk?', 'Chơi một ván yutnori nhé?', 'هل نلعب جولة يوتنوري؟', 'On fait une partie de yutnori ?', 'มาเล่นยุทโนรีกันสักตาไหม?', "Vamos jogar uma partida de yutnori?")],
  caught: ['잡았다!', 'jabatda!', tr('Got you!', '捕まえた！', '抓到了！', '¡Te pillé!', 'Kena kau!', 'Bắt được rồi!', 'أمسكتك!', 'Je t\'ai eu !', 'จับได้แล้ว!', "Peguei você!")],
  stacked: ['업어!', 'eobeo!', tr('Piggyback!', 'おんぶ！', '背上！', '¡A caballito!', 'Gendong!', 'Cõng nào!', 'على الظهر!', 'À dos !', 'ขี่หลัง!', "De cavalinho!")],
  won: ['이겼다!', 'igyeotda!', tr('I won!', '勝った！', '赢了！', '¡Gané!', 'Aku menang!', 'Thắng rồi!', 'فزت!', 'J\'ai gagné !', 'ชนะแล้ว!', "Ganhei!")],
  tuhoHello: ['화살을 항아리에 넣어 봐요.', 'hwasareul hang-arie neo-eo bwayo.', tr('Try to get the arrows into the jar.', '矢を壺に入れてみて。', '试着把箭投进壶里吧。', 'Intenta meter las flechas en el jarrón.', 'Coba masukkan panah ke guci.', 'Thử ném tên vào bình xem.', 'حاول إدخال السهام في الجرّة.', 'Essaie de mettre les flèches dans le pot.', 'ลองโยนลูกศรลงไหดูสิ', "Tente acertar as flechas no jarro.")],
  inJar: ['들어갔다!', 'deureogatda!', tr('It went in!', '入った！', '进了！', '¡Entró!', 'Masuk!', 'Vào rồi!', 'دخل!', 'C\'est rentré !', 'ลงแล้ว!', "Entrou!")],
  jegiHello: ['제기 몇 번 찰 수 있어요?', 'jegi myeot beon chal su isseoyo?', tr('How many kicks can you do?', '何回蹴れるかな？', '你能踢几下？', '¿Cuántas patadas puedes dar?', 'Bisa tendang berapa kali?', 'Bạn đá được mấy cái?', 'كم ركلة تستطيع؟', 'Combien de coups peux-tu faire ?', 'เตะได้กี่ครั้งเอ่ย?', "Quantos chutes você consegue?")],
  neolHello: ['같이 널 뛰어요!', 'gachi neol ttwieoyo!', tr('Let\'s jump together!', '一緒に跳ぼう！', '一起跳吧！', '¡Saltemos juntos!', 'Ayo lompat bersama!', 'Cùng nhảy nào!', 'لنقفز معًا!', 'Sautons ensemble !', 'กระโดดด้วยกันเถอะ!', "Vamos pular juntos!")],
  high: ['높이 올라간다!', 'nopi ollaganda!', tr('Up you go!', '高く上がるよ！', '飞高啦！', '¡Arriba!', 'Naik tinggi!', 'Bay cao nào!', 'إلى الأعلى!', 'Et hop, en l\'air !', 'ลอยขึ้นไปเลย!', "Lá vai você!")],
  cheer: ['잘한다!', 'jalhanda!', tr('Well done!', '上手！', '真棒！', '¡Muy bien!', 'Hebat!', 'Giỏi lắm!', 'أحسنت!', 'Bravo !', 'เก่งมาก!', "Muito bem!")],
};
export const lineText = (key) => {
  const [ko, rom, t] = FOLK_LINES[key];
  return [ko, rom, localName(t, getLanguage())];
};
