// The few folk-yard words the street needs before any game is opened (the
// action buttons, the locals' name tags, the yard's toast) and the lines the
// locals say. The games' own text is in folk-text.js, downloaded with the
// game panels the first time one is opened (game/folk-yard.js).
import { getLanguage, localName } from '../core/i18n.js';

export const FOLK_LABELS = {
  teacher: { en: 'Grandpa Kim', ko: '김 할아버지', ja: 'キムおじいさん', zh: '金爷爷', es: 'Abuelo Kim', id: 'Kakek Kim', vi: 'Ông Kim', hi: 'दादाजी किम', fr: 'Grand-père Kim', th: 'คุณปู่คิม', ar: 'الجد كيم' },
  courtyard: { en: 'Folk games yard', ko: '전통놀이 마당', ja: '伝統遊びの広場', zh: '传统游戏广场', es: 'Patio de juegos tradicionales', id: 'Halaman permainan tradisional', vi: 'Sân trò chơi dân gian', hi: 'पारंपरिक खेलों का आँगन', fr: 'Cour des jeux traditionnels', th: 'ลานละเล่นพื้นบ้าน', ar: 'ساحة الألعاب الشعبية' },
  'yut.open': { en: 'Play yutnori', ko: '윷놀이 하기', ja: 'ユンノリをする', zh: '玩掷柶', es: 'Jugar al yutnori', id: 'Main yutnori', vi: 'Chơi yutnori', hi: 'युतनोरी खेलें', fr: 'Jouer au yutnori', th: 'เล่นยุทโนรี', ar: 'العب يوتنوري' },
  'yut.grandma': { en: 'Grandma', ko: '할머니', ja: 'おばあちゃん', zh: '奶奶', es: 'Abuela', id: 'Nenek', vi: 'Bà', hi: 'दादी', fr: 'Grand-mère', th: 'คุณยาย', ar: 'الجدة' },
  'tuho.open': { en: 'Play tuho', ko: '투호 하기', ja: '投壺をする', zh: '玩投壶', es: 'Jugar al tuho', id: 'Main tuho', vi: 'Chơi tuho', hi: 'तूहो खेलें', fr: 'Jouer au tuho', th: 'เล่นทูโฮ', ar: 'العب توهو' },
  'jegi.open': { en: 'Kick the jegi', ko: '제기차기 하기', ja: 'チェギチャギをする', zh: '踢毽子', es: 'Patear el jegi', id: 'Tendang jegi', vi: 'Đá cầu jegi', hi: 'जेगी उछालें', fr: 'Taper dans le jegi', th: 'เตะเจกี', ar: 'اركل الجيغي' },
  'neol.open': { en: 'Jump on the seesaw', ko: '널뛰기 하기', ja: 'ノルティギをする', zh: '玩跳板', es: 'Saltar en el balancín', id: 'Main jungkat-jungkit', vi: 'Chơi bập bênh', hi: 'नल्त्तुइगी खेलें', fr: 'Sauter sur la balançoire', th: 'กระโดดกระดานหก', ar: 'اقفز على الأرجوحة' },
  'neol.partner': { en: 'Suni', ko: '순이', ja: 'スニ', zh: '顺伊', es: 'Suni', id: 'Suni', vi: 'Suni', hi: 'सुनी', fr: 'Suni', th: 'ซูนี', ar: 'سوني' },
};

// A label in the player's language.
export const folkLabel = (k) => localName(FOLK_LABELS[k], getLanguage()) ?? k;

// Things the locals say: [Korean, romanization, meaning].
const tr = (en, ja, zh, es, id, vi, hi, ar, fr, th) => ({ en, ja, zh, es, id, vi, hi, ar, fr, th });
export const FOLK_LINES = {
  yutHello: ['윷놀이 한 판 할까요?', 'yunnori han pan halkkayo?', tr('Shall we play a round of yutnori?', 'ユンノリ、一局やりましょうか？', '来一局掷柶吧？', '¿Jugamos una partida de yutnori?', 'Main yutnori satu ronde, yuk?', 'Chơi một ván yutnori nhé?', 'युतनोरी की एक बाज़ी हो जाए?', 'هل نلعب جولة يوتنوري؟', 'On fait une partie de yutnori ?', 'มาเล่นยุทโนรีกันสักตาไหม?')],
  caught: ['잡았다!', 'jabatda!', tr('Got you!', '捕まえた！', '抓到了！', '¡Te pillé!', 'Kena kau!', 'Bắt được rồi!', 'पकड़ लिया!', 'أمسكتك!', 'Je t\'ai eu !', 'จับได้แล้ว!')],
  stacked: ['업어!', 'eobeo!', tr('Piggyback!', 'おんぶ！', '背上！', '¡A caballito!', 'Gendong!', 'Cõng nào!', 'पीठ पर चढ़ो!', 'على الظهر!', 'À dos !', 'ขี่หลัง!')],
  won: ['이겼다!', 'igyeotda!', tr('I won!', '勝った！', '赢了！', '¡Gané!', 'Aku menang!', 'Thắng rồi!', 'मैं जीता!', 'فزت!', 'J\'ai gagné !', 'ชนะแล้ว!')],
  tuhoHello: ['화살을 항아리에 넣어 봐요.', 'hwasareul hang-arie neo-eo bwayo.', tr('Try to get the arrows into the jar.', '矢を壺に入れてみて。', '试着把箭投进壶里吧。', 'Intenta meter las flechas en el jarrón.', 'Coba masukkan panah ke guci.', 'Thử ném tên vào bình xem.', 'तीर जार में डालकर देखो।', 'حاول إدخال السهام في الجرّة.', 'Essaie de mettre les flèches dans le pot.', 'ลองโยนลูกศรลงไหดูสิ')],
  inJar: ['들어갔다!', 'deureogatda!', tr('It went in!', '入った！', '进了！', '¡Entró!', 'Masuk!', 'Vào rồi!', 'अंदर गया!', 'دخل!', 'C\'est rentré !', 'ลงแล้ว!')],
  jegiHello: ['제기 몇 번 찰 수 있어요?', 'jegi myeot beon chal su isseoyo?', tr('How many kicks can you do?', '何回蹴れるかな？', '你能踢几下？', '¿Cuántas patadas puedes dar?', 'Bisa tendang berapa kali?', 'Bạn đá được mấy cái?', 'कितनी किक लगा सकते हो?', 'كم ركلة تستطيع؟', 'Combien de coups peux-tu faire ?', 'เตะได้กี่ครั้งเอ่ย?')],
  neolHello: ['같이 널 뛰어요!', 'gachi neol ttwieoyo!', tr('Let\'s jump together!', '一緒に跳ぼう！', '一起跳吧！', '¡Saltemos juntos!', 'Ayo lompat bersama!', 'Cùng nhảy nào!', 'चलो साथ कूदें!', 'لنقفز معًا!', 'Sautons ensemble !', 'กระโดดด้วยกันเถอะ!')],
  high: ['높이 올라간다!', 'nopi ollaganda!', tr('Up you go!', '高く上がるよ！', '飞高啦！', '¡Arriba!', 'Naik tinggi!', 'Bay cao nào!', 'ऊपर चले!', 'إلى الأعلى!', 'Et hop, en l\'air !', 'ลอยขึ้นไปเลย!')],
  cheer: ['잘한다!', 'jalhanda!', tr('Well done!', '上手！', '真棒！', '¡Muy bien!', 'Hebat!', 'Giỏi lắm!', 'शाबाश!', 'أحسنت!', 'Bravo !', 'เก่งมาก!')],
};
export const lineText = (key) => {
  const [ko, rom, t] = FOLK_LINES[key];
  return [ko, rom, localName(t, getLanguage())];
};
