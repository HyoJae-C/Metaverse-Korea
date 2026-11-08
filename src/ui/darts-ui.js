// Darts at the bar (rules in core/arcade.js): the aim sways over the board;
// tap THROW at the right moment, within 7 seconds per dart. Alone: 5 rounds
// of 3 darts. Or invite up to 3 people in the same bar (1:1, 1:1:1, 1:1:1:1
// or 2:2 teams): you take turns, one dart each, and every screen shows every
// throw live (the thrower sends the sway's phase and where each dart lands
// to each of the others). No drinks or coins.
// Loaded on first use (see openArcade in main.js).
import {
  DART_ROUNDS, DARTS_PER_ROUND, DART_SECONDS, DARTS_MAX_PLAYERS, dartsEach, throwerOf, teamOf, BOARD_ORDER, RING, dartScore, dartAim, dartLand,
  dartPack, dartUnpack, swayPack, swayUnpack, loadRecords, saveRecord, DART_COLORS,
} from '../core/arcade.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Darts', ko: '다트', ja: 'ダーツ', zh: '飞镖', es: 'Dardos', id: 'Dart', vi: 'Phi tiêu', hi: 'डार्ट्स', fr: 'Fléchettes', th: 'ปาเป้า', ar: 'رمي السهام' },
  howTo: {
    en: 'The aim sways over the board: press THROW (or Space) when it is where you want it. 5 rounds of 3 darts. Bull 50, the thin rings count double and triple. You have {s} seconds for each dart.',
    ko: '조준점이 보드 위에서 흔들려요. 원하는 곳에 왔을 때 던지기(또는 스페이스)를 누르세요. 3발씩 5라운드. 정중앙 불은 50점, 얇은 링은 2배·3배예요. 한 발마다 {s}초 안에 던져야 해요.',
    ja: '狙いがボードの上で揺れます。狙った所で「投げる」（またはスペース）。3投×5ラウンド。ブル50点、細いリングは2倍・3倍。1投ごとに{s}秒以内に投げてください。',
    zh: '准星会在靶上晃动，到想要的位置时按“投掷”（或空格）。每轮3镖，共5轮。靶心50分，细环是双倍和三倍。每一镖要在{s}秒内投出。',
    es: 'La mira se mueve sobre la diana: pulsa LANZAR (o Espacio) cuando esté donde quieras. 5 rondas de 3 dardos. Diana 50; los anillos finos valen doble y triple. Tienes {s} segundos para cada dardo.',
    id: 'Bidikan bergoyang di papan: tekan LEMPAR (atau Spasi) saat pas di tempat yang kamu mau. 5 ronde, 3 dart. Bull 50, cincin tipis bernilai ganda dan tiga kali. Kamu punya {s} detik untuk setiap dart.',
    vi: 'Tâm ngắm lắc lư trên bảng: nhấn NÉM (hoặc Space) khi nó ở đúng chỗ. 5 lượt, mỗi lượt 3 phi tiêu. Hồng tâm 50, vòng mảnh tính gấp đôi và gấp ba. Mỗi phi tiêu phải ném trong {s} giây.',
    hi: 'निशाना बोर्ड पर हिलता है: जहाँ चाहें वहाँ आए तो फेंकें (या Space) दबाएँ। 3 डार्ट के 5 राउंड। बुल 50, पतली रिंग डबल और ट्रिपल। हर डार्ट के लिए {s} सेकंड हैं।',
    fr: 'La mire oscille sur la cible : appuie sur LANCER (ou Espace) quand elle est où tu veux. 5 manches de 3 fléchettes. Le centre vaut 50, les anneaux fins comptent double et triple. Tu as {s} secondes par fléchette.',
    th: 'เป้าเล็งจะแกว่งไปมาบนกระดาน กด ปา (หรือ Space) เมื่ออยู่ตรงที่ต้องการ 5 รอบ รอบละ 3 ดอก บูลได้ 50 วงบางนับเป็นสองเท่าและสามเท่า มีเวลา {s} วินาทีต่อดอก',
    ar: 'التصويب يتمايل فوق اللوحة: اضغط «ارمِ» (أو المسافة) عندما يكون في المكان الذي تريده. 5 جولات من 3 سهام. المركز 50، والحلقات الرفيعة مضاعفة وثلاثية. لديك {s} ثوانٍ لكل سهم.',
  },
  best: { en: 'Your best: {n}', ko: '내 최고 점수: {n}', ja: '自己ベスト：{n}', zh: '我的最高分：{n}', es: 'Tu récord: {n}', id: 'Skor terbaikmu: {n}', vi: 'Điểm cao nhất: {n}', hi: 'आपका बेस्ट: {n}', fr: 'Ton record : {n}', th: 'สถิติดีที่สุด: {n}', ar: 'أفضل نتيجة لك: {n}' },
  solo: { en: 'Play alone', ko: '혼자 하기', ja: 'ひとりで', zh: '一个人玩', es: 'Jugar solo', id: 'Main sendiri', vi: 'Chơi một mình', hi: 'अकेले खेलें', fr: 'Jouer seul', th: 'เล่นคนเดียว', ar: 'العب وحدك' },
  challenge: { en: 'Challenge {name}', ko: '{name}님에게 대결 신청', ja: '{name}さんに挑戦', zh: '挑战{name}', es: 'Retar a {name}', id: 'Tantang {name}', vi: 'Thách đấu {name}', hi: '{name} को चुनौती दें', fr: 'Défier {name}', th: 'ท้า {name}', ar: 'تحدَّ {name}' },
  accept: { en: 'Play {name} (they challenged you)', ko: '{name}님의 대결 받기', ja: '{name}さんの挑戦を受ける', zh: '接受{name}的挑战', es: 'Jugar contra {name} (te retó)', id: 'Lawan {name} (dia menantangmu)', vi: 'Đấu với {name} (bạn ấy thách bạn)', hi: '{name} से खेलें (उन्होंने चुनौती दी)', fr: 'Jouer contre {name} (qui t\'a défié)', th: 'เล่นกับ {name} (เขาท้าคุณ)', ar: 'العب ضد {name} (تحدّاك)' },
  nobody: { en: 'Stand next to someone in the bar to challenge them.', ko: '바 안에서 다른 사람 옆에 서면 대결을 신청할 수 있어요.', ja: 'バーで誰かのそばに立つと挑戦できます。', zh: '站在酒吧里其他人旁边就能发起挑战。', es: 'Ponte al lado de alguien en el bar para retarle.', id: 'Berdiri di dekat orang lain di bar untuk menantangnya.', vi: 'Đứng cạnh ai đó trong quán để thách đấu.', hi: 'चुनौती देने के लिए बार में किसी के पास खड़े हों।', fr: 'Mets-toi à côté de quelqu\'un dans le bar pour le défier.', th: 'ยืนข้างใครสักคนในบาร์เพื่อท้าเขา', ar: 'قف بجانب شخص في البار لتتحداه.' },
  waiting: { en: 'Waiting for {name} to accept…', ko: '{name}님이 수락하길 기다리는 중…', ja: '{name}さんの返事を待っています…', zh: '等待{name}接受…', es: 'Esperando a que {name} acepte…', id: 'Menunggu {name} menerima…', vi: 'Đang chờ {name} đồng ý…', hi: '{name} के स्वीकार करने का इंतज़ार…', fr: 'En attente de l\'acceptation de {name}…', th: 'รอ {name} ตอบรับ…', ar: 'بانتظار قبول {name}…' },
  noAnswer: { en: '{name} didn\'t answer. Try again or play alone.', ko: '{name}님이 응답하지 않았어요. 다시 신청하거나 혼자 해 보세요.', ja: '{name}さんから返事がありません。もう一度か、ひとりで。', zh: '{name}没有回应。再试一次或一个人玩。', es: '{name} no respondió. Reintenta o juega solo.', id: '{name} tidak menjawab. Coba lagi atau main sendiri.', vi: '{name} không trả lời. Thử lại hoặc chơi một mình.', hi: '{name} ने जवाब नहीं दिया। फिर कोशिश करें या अकेले खेलें।', fr: '{name} n\'a pas répondu. Réessaie ou joue seul.', th: '{name} ไม่ตอบ ลองใหม่หรือเล่นคนเดียว', ar: 'لم يردّ {name}. حاول مجددًا أو العب وحدك.' },
  cancel: { en: 'Cancel', ko: '취소', ja: 'キャンセル', zh: '取消', es: 'Cancelar', id: 'Batal', vi: 'Hủy', hi: 'रद्द करें', fr: 'Annuler', th: 'ยกเลิก', ar: 'إلغاء' },
  throw: { en: 'THROW', ko: '던지기', ja: '投げる', zh: '投掷', es: 'LANZAR', id: 'LEMPAR', vi: 'NÉM', hi: 'फेंकें', fr: 'LANCER', th: 'ปา', ar: 'ارمِ' },
  hud: { en: 'Round {r}/{R} · total {p}', ko: '{r}/{R}라운드 · 합계 {p}', ja: '{r}/{R}ラウンド・合計 {p}', zh: '第{r}/{R}轮 · 合计 {p}', es: 'Ronda {r}/{R} · total {p}', id: 'Ronde {r}/{R} · total {p}', vi: 'Lượt {r}/{R} · tổng {p}', hi: 'राउंड {r}/{R} · कुल {p}', fr: 'Manche {r}/{R} · total {p}', th: 'รอบ {r}/{R} · รวม {p}', ar: 'الجولة {r}/{R} · المجموع {p}' },
  vs: { en: 'You {a} · {name} {b}', ko: '나 {a} · {name} {b}', ja: '自分 {a}・{name} {b}', zh: '我 {a} · {name} {b}', es: 'Tú {a} · {name} {b}', id: 'Kamu {a} · {name} {b}', vi: 'Bạn {a} · {name} {b}', hi: 'आप {a} · {name} {b}', fr: 'Toi {a} · {name} {b}', th: 'คุณ {a} · {name} {b}', ar: 'أنت {a} · {name} {b}' },
  vsHow: {
    en: 'With friends (up to 4 players): 1:1, 1:1:1, 1:1:1:1 or 2:2 teams. Take turns, one dart each; everyone watches every throw, and your darts stick in the wall board.',
    ko: '친구와 최대 4명까지: 1:1, 1:1:1, 1:1:1:1, 2:2 팀전. 한 발씩 돌아가며 던지고, 모두가 서로의 투구를 보며, 던진 다트는 벽 다트판에 꽂혀요.',
    ja: '友だちと最大4人：1:1、1:1:1、1:1:1:1、2:2チーム戦。1投ずつ交代で投げ、全員がすべての投球を見られます。ダーツは壁のボードに刺さります。',
    zh: '和朋友最多4人：1:1、1:1:1、1:1:1:1 或 2:2 组队。每人轮流投一镖，大家都能看到每一镖，镖会插在墙上的靶上。',
    es: 'Con amigos (hasta 4): 1:1, 1:1:1, 1:1:1:1 o 2:2 por equipos. Por turnos, un dardo cada uno; todos ven cada tiro y los dardos se quedan en la diana de la pared.',
    id: 'Dengan teman (maks. 4 pemain): 1:1, 1:1:1, 1:1:1:1 atau tim 2:2. Bergantian satu dart; semua melihat setiap lemparan, dan dart menancap di papan dinding.',
    vi: 'Chơi với bạn (tối đa 4 người): 1:1, 1:1:1, 1:1:1:1 hoặc đội 2:2. Lần lượt mỗi người một phi tiêu; ai cũng xem được mọi cú ném, phi tiêu cắm lại trên bảng tường.',
    hi: 'दोस्तों के साथ (4 खिलाड़ी तक): 1:1, 1:1:1, 1:1:1:1 या 2:2 टीम। बारी-बारी से एक-एक डार्ट; सब हर थ्रो देखते हैं, और डार्ट दीवार के बोर्ड में लगे रहते हैं।',
    fr: 'Entre amis (jusqu\'à 4 joueurs) : 1:1, 1:1:1, 1:1:1:1 ou équipes 2:2. Chacun son tour, une fléchette chacun ; tout le monde voit chaque lancer, et tes fléchettes restent plantées dans la cible murale.',
    th: 'เล่นกับเพื่อน (สูงสุด 4 คน): 1:1, 1:1:1, 1:1:1:1 หรือทีม 2:2 ผลัดกันปาคนละดอก ทุกคนเห็นทุกการปา และลูกดอกจะปักค้างอยู่บนกระดานติดผนัง',
    ar: 'مع الأصدقاء (حتى 4 لاعبين): 1:1 أو 1:1:1 أو 1:1:1:1 أو فريقان 2:2. تتناوبون سهمًا بسهم، ويرى الجميع كل رمية، وتبقى السهام في لوحة الحائط.',
  },
  yourTurn: { en: 'Your turn · dart {k}/{n}', ko: '내 차례 · {k}/{n}번째', ja: '自分の番・{k}/{n}投目', zh: '轮到你 · 第{k}/{n}镖', es: 'Tu turno · dardo {k}/{n}', id: 'Giliranmu · dart {k}/{n}', vi: 'Lượt của bạn · phi tiêu {k}/{n}', hi: 'आपकी बारी · डार्ट {k}/{n}', fr: 'À toi · fléchette {k}/{n}', th: 'ตาคุณ · ดอกที่ {k}/{n}', ar: 'دورك · السهم {k}/{n}' },
  theirTurn: { en: '{name}\'s turn · dart {k}/{n}', ko: '{name}님 차례 · {k}/{n}번째', ja: '{name}さんの番・{k}/{n}投目', zh: '轮到{name} · 第{k}/{n}镖', es: 'Turno de {name} · dardo {k}/{n}', id: 'Giliran {name} · dart {k}/{n}', vi: 'Lượt của {name} · phi tiêu {k}/{n}', hi: '{name} की बारी · डार्ट {k}/{n}', fr: 'Au tour de {name} · fléchette {k}/{n}', th: 'ตาของ {name} · ดอกที่ {k}/{n}', ar: 'دور {name} · السهم {k}/{n}' },
  timeUp: { en: '⏱ Time\'s up', ko: '⏱ 시간 초과', ja: '⏱ 時間切れ', zh: '⏱ 时间到', es: '⏱ Se acabó el tiempo', id: '⏱ Waktu habis', vi: '⏱ Hết giờ', hi: '⏱ समय ख़त्म', fr: '⏱ Temps écoulé', th: '⏱ หมดเวลา', ar: '⏱ انتهى الوقت' },
  done: { en: '{p} points!', ko: '{p}점!', ja: '{p}点！', zh: '{p}分！', es: '¡{p} puntos!', id: '{p} poin!', vi: '{p} điểm!', hi: '{p} अंक!', fr: '{p} points !', th: '{p} คะแนน!', ar: '{p} نقطة!' },
  won: { en: '🏆 You beat {name}, {a} to {b}!', ko: '🏆 {a} 대 {b}로 {name}님에게 이겼어요!', ja: '🏆 {a}対{b}で{name}さんに勝ちました！', zh: '🏆 {a}比{b}赢了{name}！', es: '🏆 ¡Ganaste a {name}, {a} a {b}!', id: '🏆 Kamu menang lawan {name}, {a} : {b}!', vi: '🏆 Bạn thắng {name}, {a} - {b}!', hi: '🏆 आपने {name} को {a}–{b} से हराया!', fr: '🏆 Tu as battu {name}, {a} à {b} !', th: '🏆 คุณชนะ {name} {a} ต่อ {b}!', ar: '🏆 فزت على {name}، {a} مقابل {b}!' },
  lost: { en: '{name} wins, {b} to {a}. Rematch?', ko: '{b} 대 {a}로 {name}님 승리. 한 판 더?', ja: '{b}対{a}で{name}さんの勝ち。もう一戦？', zh: '{name}以{b}比{a}获胜。再来一局？', es: 'Gana {name}, {b} a {a}. ¿Revancha?', id: '{name} menang, {b} : {a}. Tanding ulang?', vi: '{name} thắng, {b} - {a}. Đấu lại?', hi: '{name} जीते, {b}–{a}। फिर से?', fr: '{name} gagne, {b} à {a}. Revanche ?', th: '{name} ชนะ {b} ต่อ {a} แก้มือไหม?', ar: 'فاز {name}، {b} مقابل {a}. جولة أخرى؟' },
  tie: { en: 'A tie, {a} each!', ko: '{a}점 동점이에요!', ja: '{a}点で引き分け！', zh: '{a}分平局！', es: '¡Empate a {a}!', id: 'Seri, masing-masing {a}!', vi: 'Hòa, mỗi người {a}!', hi: 'बराबरी, दोनों के {a}!', fr: 'Égalité, {a} chacun !', th: 'เสมอ คนละ {a}!', ar: 'تعادل، {a} لكلٍّ منكما!' },
  left: { en: '{name} left the game.', ko: '{name}님이 게임을 나갔어요.', ja: '{name}さんが抜けました。', zh: '{name}离开了游戏。', es: '{name} dejó la partida.', id: '{name} keluar dari permainan.', vi: '{name} đã rời trò chơi.', hi: '{name} ने खेल छोड़ दिया।', fr: '{name} a quitté la partie.', th: '{name} ออกจากเกมแล้ว', ar: 'غادر {name} اللعبة.' },
  record: { en: '🏆 New best!', ko: '🏆 신기록!', ja: '🏆 自己ベスト更新！', zh: '🏆 新纪录！', es: '🏆 ¡Nuevo récord!', id: '🏆 Rekor baru!', vi: '🏆 Kỷ lục mới!', hi: '🏆 नया रिकॉर्ड!', fr: '🏆 Nouveau record !', th: '🏆 สถิติใหม่!', ar: '🏆 رقم جديد!' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次', es: 'Otra vez', id: 'Lagi', vi: 'Lần nữa', hi: 'फिर से', fr: 'Rejouer', th: 'อีกครั้ง', ar: 'مرة أخرى' },
  friends: { en: 'Play with friends (up to 4)', ko: '친구와 하기 (최대 4명)', ja: '友だちと（最大4人）', zh: '和朋友玩（最多4人）', es: 'Jugar con amigos (hasta 4)', id: 'Main dengan teman (maks. 4)', vi: 'Chơi với bạn (tối đa 4)', hi: 'दोस्तों के साथ (4 तक)', fr: 'Jouer entre amis (jusqu\'à 4)', th: 'เล่นกับเพื่อน (สูงสุด 4 คน)', ar: 'العب مع الأصدقاء (حتى 4)' },
  join: { en: 'Join {name}\'s game', ko: '{name}님 게임에 참가', ja: '{name}さんのゲームに参加', zh: '加入{name}的游戏', es: 'Unirte a la partida de {name}', id: 'Ikut permainan {name}', vi: 'Tham gia ván của {name}', hi: '{name} के खेल में शामिल हों', fr: 'Rejoindre la partie de {name}', th: 'เข้าร่วมเกมของ {name}', ar: 'انضم إلى لعبة {name}' },
  lobbyHow: { en: 'Invite up to 3 people near you, then pick how to play when they are in.', ko: '근처에 있는 사람을 최대 3명까지 초대하고, 다 들어오면 방식을 골라 시작하세요.', ja: '近くの人を3人まで招待して、そろったら遊び方を選んで開始。', zh: '邀请身边最多3个人，大家加入后选择玩法开始。', es: 'Invita hasta a 3 personas cerca de ti y elige cómo jugar cuando entren.', id: 'Undang hingga 3 orang di dekatmu, lalu pilih cara main saat mereka sudah masuk.', vi: 'Mời tối đa 3 người gần bạn, rồi chọn cách chơi khi họ đã vào.', hi: 'पास के 3 लोगों तक को बुलाएँ, फिर सब आ जाएँ तो खेलने का तरीका चुनें।', fr: 'Invite jusqu\'à 3 personnes près de toi, puis choisis comment jouer quand elles sont là.', th: 'ชวนคนใกล้ๆ ได้สูงสุด 3 คน แล้วเลือกรูปแบบการเล่นเมื่อทุกคนเข้ามาแล้ว', ar: 'ادعُ حتى 3 أشخاص بالقرب منك، ثم اختر طريقة اللعب عندما ينضمون.' },
  invite: { en: '➕ Invite {name}', ko: '➕ {name}님 초대', ja: '➕ {name}さんを招待', zh: '➕ 邀请{name}', es: '➕ Invitar a {name}', id: '➕ Undang {name}', vi: '➕ Mời {name}', hi: '➕ {name} को बुलाएँ', fr: '➕ Inviter {name}', th: '➕ ชวน {name}', ar: '➕ ادعُ {name}' },
  pending: { en: '⏳ {name}: invited…', ko: '⏳ {name}: 초대 중…', ja: '⏳ {name}：招待中…', zh: '⏳ {name}：邀请中…', es: '⏳ {name}: invitado…', id: '⏳ {name}: diundang…', vi: '⏳ {name}: đang mời…', hi: '⏳ {name}: बुलाया गया…', fr: '⏳ {name} : invité…', th: '⏳ {name}: ชวนแล้ว…', ar: '⏳ {name}: تمت دعوته…' },
  ready: { en: '✅ {name} is in', ko: '✅ {name}님 참가', ja: '✅ {name}さん参加', zh: '✅ {name}已加入', es: '✅ {name} está dentro', id: '✅ {name} ikut', vi: '✅ {name} đã vào', hi: '✅ {name} शामिल', fr: '✅ {name} est là', th: '✅ {name} เข้าร่วมแล้ว', ar: '✅ {name} انضم' },
  start: { en: '▶ Start {mode}', ko: '▶ {mode} 시작', ja: '▶ {mode}で開始', zh: '▶ 开始 {mode}', es: '▶ Empezar {mode}', id: '▶ Mulai {mode}', vi: '▶ Bắt đầu {mode}', hi: '▶ {mode} शुरू करें', fr: '▶ Lancer {mode}', th: '▶ เริ่ม {mode}', ar: '▶ ابدأ {mode}' },
  teamsMode: { en: '2:2 (teams)', ko: '2:2 (팀전)', ja: '2:2（チーム戦）', zh: '2:2（组队）', es: '2:2 (equipos)', id: '2:2 (tim)', vi: '2:2 (đội)', hi: '2:2 (टीम)', fr: '2:2 (équipes)', th: '2:2 (ทีม)', ar: '2:2 (فرق)' },
  waitHost: { en: 'You\'re in! Waiting for {name} to start…', ko: '참가했어요! {name}님이 시작하길 기다리는 중…', ja: '参加しました！{name}さんの開始を待っています…', zh: '已加入！等待{name}开始…', es: '¡Estás dentro! Esperando a que {name} empiece…', id: 'Kamu ikut! Menunggu {name} memulai…', vi: 'Bạn đã vào! Đang chờ {name} bắt đầu…', hi: 'आप शामिल हैं! {name} के शुरू करने का इंतज़ार…', fr: 'Tu es dedans ! En attente que {name} lance…', th: 'เข้าร่วมแล้ว! รอ {name} เริ่มเกม…', ar: 'انضممت! بانتظار أن يبدأ {name}…' },
  cancelled: { en: '{name} cancelled the game.', ko: '{name}님이 게임을 취소했어요.', ja: '{name}さんがゲームを取り消しました。', zh: '{name}取消了游戏。', es: '{name} canceló la partida.', id: '{name} membatalkan permainan.', vi: '{name} đã hủy ván.', hi: '{name} ने खेल रद्द कर दिया।', fr: '{name} a annulé la partie.', th: '{name} ยกเลิกเกมแล้ว', ar: 'ألغى {name} اللعبة.' },
  you: { en: 'You', ko: '나', ja: '自分', zh: '我', es: 'Tú', id: 'Kamu', vi: 'Bạn', hi: 'आप', fr: 'Toi', th: 'คุณ', ar: 'أنت' },
  team: { en: 'Team {n}', ko: '{n}팀', ja: 'チーム{n}', zh: '{n}队', es: 'Equipo {n}', id: 'Tim {n}', vi: 'Đội {n}', hi: 'टीम {n}', fr: 'Équipe {n}', th: 'ทีม {n}', ar: 'الفريق {n}' },
  youWin: { en: '🏆 You win with {p}!', ko: '🏆 {p}점으로 내가 1등!', ja: '🏆 {p}点で優勝！', zh: '🏆 你以{p}分获胜！', es: '🏆 ¡Ganas con {p}!', id: '🏆 Kamu menang dengan {p}!', vi: '🏆 Bạn thắng với {p} điểm!', hi: '🏆 आप {p} से जीते!', fr: '🏆 Tu gagnes avec {p} !', th: '🏆 คุณชนะด้วย {p}!', ar: '🏆 فزت بـ {p}!' },
  winner: { en: '{name} wins with {p}. Again?', ko: '{p}점으로 {name}님 1등. 한 판 더?', ja: '{p}点で{name}さんの優勝。もう一戦？', zh: '{name}以{p}分获胜。再来一局？', es: 'Gana {name} con {p}. ¿Otra?', id: '{name} menang dengan {p}. Lagi?', vi: '{name} thắng với {p} điểm. Chơi lại?', hi: '{name} {p} से जीते। फिर से?', fr: '{name} gagne avec {p}. On rejoue ?', th: '{name} ชนะด้วย {p} อีกรอบไหม?', ar: 'فاز {name} بـ {p}. مرة أخرى؟' },
  tieTop: { en: 'A tie for first, {p} each!', ko: '{p}점으로 공동 1등!', ja: '{p}点で同点1位！', zh: '{p}分并列第一！', es: '¡Empate en cabeza, {p} cada uno!', id: 'Seri di posisi pertama, masing-masing {p}!', vi: 'Đồng hạng nhất, mỗi người {p}!', hi: 'पहले स्थान पर बराबरी, {p} प्रत्येक!', fr: 'Égalité en tête, {p} chacun !', th: 'เสมอที่หนึ่ง คนละ {p}!', ar: 'تعادل على المركز الأول، {p} لكلٍّ!' },
  teamWon: { en: '🏆 Your team wins, {a} to {b}!', ko: '🏆 {a} 대 {b}로 우리 팀 승리!', ja: '🏆 {a}対{b}でチームの勝ち！', zh: '🏆 你的队伍以{a}比{b}获胜！', es: '🏆 ¡Tu equipo gana, {a} a {b}!', id: '🏆 Timmu menang, {a} : {b}!', vi: '🏆 Đội bạn thắng, {a} - {b}!', hi: '🏆 आपकी टीम {a}–{b} से जीती!', fr: '🏆 Ton équipe gagne, {a} à {b} !', th: '🏆 ทีมคุณชนะ {a} ต่อ {b}!', ar: '🏆 فاز فريقك، {a} مقابل {b}!' },
  teamLost: { en: 'The other team wins, {b} to {a}. Rematch?', ko: '{b} 대 {a}로 상대 팀 승리. 한 판 더?', ja: '{b}対{a}で相手チームの勝ち。もう一戦？', zh: '对方队伍以{b}比{a}获胜。再来一局？', es: 'Gana el otro equipo, {b} a {a}. ¿Revancha?', id: 'Tim lawan menang, {b} : {a}. Tanding ulang?', vi: 'Đội kia thắng, {b} - {a}. Đấu lại?', hi: 'दूसरी टीम {b}–{a} से जीती। फिर से?', fr: 'L\'autre équipe gagne, {b} à {a}. Revanche ?', th: 'อีกทีมชนะ {b} ต่อ {a} แก้มือไหม?', ar: 'فاز الفريق الآخر، {b} مقابل {a}. جولة أخرى؟' },
  allLeft: { en: 'Everyone else left the game.', ko: '다른 사람들이 모두 게임을 나갔어요.', ja: 'ほかの全員が抜けました。', zh: '其他人都离开了游戏。', es: 'Todos los demás dejaron la partida.', id: 'Semua yang lain keluar dari permainan.', vi: 'Mọi người khác đã rời ván.', hi: 'बाकी सब खेल छोड़ गए।', fr: 'Tous les autres ont quitté la partie.', th: 'คนอื่นออกจากเกมหมดแล้ว', ar: 'غادر الجميع اللعبة.' },
  again2: { en: 'Play again with {names}', ko: '{names}님과 한 판 더', ja: '{names}さんともう一戦', zh: '和{names}再来一局', es: 'Otra con {names}', id: 'Main lagi dengan {names}', vi: 'Chơi lại với {names}', hi: '{names} के साथ फिर से', fr: 'Rejouer avec {names}', th: 'เล่นอีกครั้งกับ {names}', ar: 'العب مجددًا مع {names}' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', id: 'Tutup', vi: 'Đóng', hi: 'बंद करें', fr: 'Fermer', th: 'ปิด', ar: 'إغلاق' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const S = 400, C = S / 2, R = 160; // canvas size, centre, board radius (r = 1) in px
const TOTAL = DART_ROUNDS * DARTS_PER_ROUND; // alone
const WAIT_ACCEPT = 30000; // ms an invite waits for an answer
const WAIT_START = 120000; // ms a guest who joined waits for the host to start
const LATE = 8; // s past a friend's 7 seconds (or waiting for their turn to start) before we call it a dropout
const FLY = 0.22; // s a dart takes to reach the board

function paintBoard() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.fillStyle = '#1b1b20'; c.beginPath(); c.arc(C, C, R * 1.22, 0, Math.PI * 2); c.fill();
  const ring = (r0, r1, colors) => {
    for (let i = 0; i < 20; i++) {
      const a0 = -Math.PI / 2 - Math.PI / 20 + (i * Math.PI) / 10, a1 = a0 + Math.PI / 10;
      c.fillStyle = colors[i % 2];
      c.beginPath(); c.arc(C, C, r1 * R, a0, a1); c.arc(C, C, r0 * R, a1, a0, true); c.closePath(); c.fill();
    }
  };
  ring(RING.doubleIn, 1, ['#d9473c', '#2f8f5b']);
  ring(RING.tripleOut, RING.doubleIn, ['#1b1b20', '#f3e6c4']);
  ring(RING.tripleIn, RING.tripleOut, ['#d9473c', '#2f8f5b']);
  ring(RING.outerBull, RING.tripleIn, ['#1b1b20', '#f3e6c4']);
  c.fillStyle = '#2f8f5b'; c.beginPath(); c.arc(C, C, RING.outerBull * R, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d9473c'; c.beginPath(); c.arc(C, C, RING.bull * R, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.font = 'bold 15px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
  BOARD_ORDER.forEach((n, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 10;
    c.fillText(String(n), C + Math.cos(a) * R * 1.11, C + Math.sin(a) * R * 1.11);
  });
  return cv;
}

export class DartsUI {
  // myId; nameOf(id); store: localStorage (records); friends(): people near
  // you [{ id, name }], closest first; invite(): a pending invite { from,
  // name } or null; clearInvite(); send(to, kind, thrown, total, extra);
  // sendGo(to, mode, ids) (the start message); onThrow(points); onDart(at,
  // color) as a dart of ours leaves the hand (it sticks in the wall board for
  // the room); colors(ids) → a flight colour (DART_COLORS index) per player;
  // rand for tests.
  constructor({ root, store, myId = 'me', nameOf = () => '?', friends, invite, clearInvite, send, sendGo, onThrow, onDart, colors, rand = Math.random }) {
    Object.assign(this, { root, store, myId, nameOf, friends, invite, clearInvite, send, sendGo, onThrow, onDart, colors, rand });
    this.raf = 0;
    this.lobby = null; // hosting: { list: [{ id, name, ready, at }] }
    this.joined = null; // a guest waiting for the host: { id, name }
    this.onKey = (e) => {
      if (!this.game || (e.code !== 'Space' && e.code !== 'Enter')) return;
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) this.throwDart();
    };
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); }
  close() {
    this._leaveAll();
    this._stop(); this.root.hidden = true;
  }
  // Tell everyone we were playing or waiting with that we are gone.
  _leaveAll() {
    const g = this.game;
    if (g?.multi && !g.over) for (const p of g.players) if (!p.me) this.send(p.id, 'n');
    if (this.lobby) for (const p of this.lobby.list) this.send(p.id, 'n');
    if (this.joined) this.send(this.joined.id, 'n');
    this.lobby = null; this.joined = null;
  }
  _stop() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    clearTimeout(this.timer);
    clearInterval(this.tick); this.tick = 0;
    window.removeEventListener('keydown', this.onKey, true);
    this.game = null;
  }

  // A message from someone (see dartsMsg): an invite, accept, a turn
  // starting, a dart landing, time running out or leaving.
  heard(from, m) {
    if (m.kind === 'i') { if (this.open && !this.game && !this.lobby && !this.joined) this.renderStart(); return; }
    const lob = this.lobby?.list.find((p) => p.id === from);
    if (m.kind === 'a' && lob) { lob.ready = true; this.renderLobby(); return; }
    if (m.kind === 'n' && lob) { this.lobby.list.splice(this.lobby.list.indexOf(lob), 1); this.renderLobby(); return; }
    if (m.kind === 'n' && this.joined?.id === from) { const h = this.joined; this.joined = null; this.renderStart(tt('cancelled', { name: h.name })); return; }
    const g = this.game;
    if (!g?.multi || g.over) return;
    const p = g.players.find((q) => q.id === from && !q.me);
    if (!p) return;
    if (m.kind === 'n') { this._gone(p); return; }
    if ('thx'.includes(m.kind)) { g.inbox.push({ ...m, from }); this._read(); }
  }
  // The host's start message (dartsGoMsg): the line-up and the mode.
  go(from, m) {
    if (this.joined?.id !== from || m.ids[0] !== from || !m.ids.includes(this.myId)) return;
    this.play(m.ids, m.mode);
  }
  // Act on the thrower's messages for the dart being thrown now. One for a
  // later dart waits (the next turn can start before a dart has landed here).
  _read() {
    const g = this.game;
    if (!g?.multi || g.over || g.flying || !g.turn || g.turn.mine) return;
    const who = g.players[g.turn.idx].id;
    for (;;) {
      const i = g.inbox.findIndex((m) => m.thrown === g.n && m.from === who);
      if (i < 0) break;
      const [m] = g.inbox.splice(i, 1);
      const now = performance.now() / 1000, turn = g.turn;
      if (m.kind === 't') {
        if (!turn.started) Object.assign(turn, { started: true, t0: now, sway: swayUnpack(m.total), deadline: now + DART_SECONDS });
      } else if (m.kind === 'h') {
        g.turn = null;
        g.flying = { at: { x: dartUnpack(m.total), y: dartUnpack(m.extra ?? 0) }, t: now, idx: turn.idx };
        break;
      } else if (m.kind === 'x') {
        g.turn = null;
        this._record(turn.idx, { points: 0, label: 'time' });
        break;
      }
    }
    if (this.game === g) g.inbox = g.inbox.filter((m) => m.thrown >= g.n);
  }
  // A player left (or went silent): their turns are skipped from now on.
  _gone(p) {
    const g = this.game;
    if (!g || p.left) return;
    p.left = true;
    if (g.turn && g.players[g.turn.idx] === p) { const idx = g.turn.idx; g.turn = null; this._record(idx, { points: 0, label: 'left' }); }
    else if (this._decided()) this._end();
    else this._hud();
  }

  _frame() {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🎯 ' + tt('title')));
  }
  _nearby() { return (this.friends?.() || []).slice(0, 6); }

  // again: the people of the game that just ended, for a rematch.
  renderStart(note, again = []) {
    this.lobby = null; this.joined = null;
    this._frame();
    this.root.append(el('p', 'order-hint', tt('howTo', { s: DART_SECONDS })));
    this.root.append(el('p', 'order-hint', tt('vsHow')));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const best = loadRecords(this.store).darts;
    if (best) this.root.append(el('p', 'order-hint', tt('best', { n: best })));
    const actions = el('div', 'order-actions arcade-actions');
    const inv = this.invite?.();
    if (inv) {
      const b = el('button', 'primary', '🤝 ' + tt('join', { name: inv.name }));
      b.onclick = () => { this.clearInvite?.(); this.send(inv.from, 'a'); this.renderJoined({ id: inv.from, name: inv.name }); };
      actions.append(b);
    }
    const near = this._nearby();
    const back = again.filter((p) => near.some((q) => q.id === p.id)).slice(0, DARTS_MAX_PLAYERS - 1);
    if (back.length) {
      const b = el('button', null, '🔁 ' + tt('again2', { names: back.map((p) => p.name).join(', ') }));
      b.onclick = () => this.startLobby(back);
      actions.append(b);
    }
    if (near.length) {
      const b = el('button', null, '⚔️ ' + tt('friends'));
      b.onclick = () => this.startLobby([]);
      actions.append(b);
    }
    const solo = el('button', inv ? null : 'primary', '🎯 ' + tt('solo'));
    solo.onclick = () => this.play(null);
    actions.append(solo);
    this.root.append(actions);
    if (!near.length && !inv) this.root.append(el('p', 'order-hint', tt('nobody')));
  }

  // Hosting: invite people (up to 3), then start with those who are in.
  startLobby(pre = []) {
    this.lobby = { list: [] };
    for (const p of pre) this.inviteOne(p, false);
    this.renderLobby();
  }
  inviteOne(p, render = true) {
    const lob = this.lobby;
    if (!lob || lob.list.length >= DARTS_MAX_PLAYERS - 1 || lob.list.some((q) => q.id === p.id)) return;
    lob.list.push({ id: p.id, name: p.name, ready: false, at: performance.now() });
    this.send(p.id, 'i');
    if (render) this.renderLobby();
  }
  renderLobby(note) {
    const lob = this.lobby;
    if (!lob) return;
    this._frame();
    this.lobby = lob;
    this.root.append(el('p', 'order-hint', tt('lobbyHow')));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const who = el('div', 'order-hint darts-lobby');
    for (const p of lob.list) who.append(el('div', null, tt(p.ready ? 'ready' : 'pending', { name: p.name })));
    this.root.append(who);
    const actions = el('div', 'order-actions arcade-actions');
    const room = DARTS_MAX_PLAYERS - 1 - lob.list.length;
    const fresh = this._nearby().filter((q) => !lob.list.some((p) => p.id === q.id));
    for (const q of fresh.slice(0, Math.max(0, room))) {
      const b = el('button', null, tt('invite', { name: q.name }));
      b.onclick = () => this.inviteOne(q);
      actions.append(b);
    }
    const ready = lob.list.filter((p) => p.ready).length;
    const modes = ready === 3 ? [['f', '1:1:1:1'], ['t', tt('teamsMode')]] : ready === 2 ? [['f', '1:1:1']] : ready === 1 ? [['f', '1:1']] : [];
    for (const [mode, label] of modes) {
      const b = el('button', 'primary', tt('start', { mode: label }));
      b.onclick = () => this.startGame(mode);
      actions.append(b);
    }
    const cancel = el('button', null, tt('cancel'));
    cancel.onclick = () => { this._leaveAll(); this.renderStart(); };
    actions.append(cancel);
    this.root.append(actions);
    // Invites nobody answers run out; people walking up or away change the
    // invite buttons.
    let seen = fresh.map((q) => q.id).join();
    this.tick = setInterval(() => {
      if (this.lobby !== lob) return;
      const now = performance.now();
      const late = lob.list.filter((p) => !p.ready && now - p.at > WAIT_ACCEPT);
      for (const p of late) { lob.list.splice(lob.list.indexOf(p), 1); this.send(p.id, 'n'); }
      const ids = this._nearby().filter((q) => !lob.list.some((p) => p.id === q.id)).map((q) => q.id).join();
      if (late.length) this.renderLobby(late.map((p) => tt('noAnswer', { name: p.name })).join(' '));
      else if (ids !== seen) { seen = ids; this.renderLobby(); }
    }, 1000);
  }
  startGame(mode) {
    const lob = this.lobby;
    if (!lob) return;
    const ready = lob.list.filter((p) => p.ready);
    for (const p of lob.list) if (!p.ready) this.send(p.id, 'n');
    if (!ready.length || (mode === 't' && ready.length !== 3)) return;
    const ids = [this.myId, ...ready.map((p) => p.id)];
    for (const p of ready) this.sendGo(p.id, mode, ids);
    this.play(ids, mode, ready);
  }
  // A guest who accepted waits here for the host to start.
  renderJoined(host) {
    this._frame();
    this.joined = host;
    this.root.append(el('p', 'order-hint claw-note', tt('waitHost', { name: host.name })));
    const cancel = el('button', null, tt('cancel'));
    cancel.onclick = () => { this._leaveAll(); this.renderStart(); };
    const actions = el('div', 'order-actions');
    actions.append(cancel);
    this.root.append(actions);
    this.timer = setTimeout(() => { if (this.joined === host) { this._leaveAll(); this.renderStart(tt('noAnswer', { name: host.name })); } }, WAIT_START);
  }

  // ids: the line-up in throwing order (null = alone); mode 'f' (each for
  // themselves) or 't' (2:2 teams); known: names we already have.
  play(ids, mode = 'f', known = []) {
    this.lobby = null; this.joined = null;
    this._frame();
    this.board ||= paintBoard();
    ids = ids || [this.myId];
    const cv = el('canvas', 'arcade-canvas darts-board');
    cv.width = cv.height = S;
    const status = el('p', 'karaoke-status');
    const vsLine = el('p', 'order-hint claw-note darts-vs');
    vsLine.hidden = ids.length < 2;
    const btn = el('button', 'primary karaoke-pad', '🎯 ' + tt('throw'));
    btn.onpointerdown = (e) => { e.preventDefault(); this.throwDart(); };
    this.root.append(cv, status, vsLine, btn);
    const colors = this.colors?.(ids) || ids.map((_, i) => i % DART_COLORS.length);
    const players = ids.map((id, i) => ({
      id, me: id === this.myId, name: id === this.myId ? tt('you') : known.find((p) => p.id === id)?.name || this.nameOf(id) || '?',
      darts: [], total: 0, left: false, color: colors[i] ?? 0, team: mode === 't' ? teamOf(i) : null,
    }));
    const multi = ids.length > 1;
    this.game = {
      cv, status, vsLine, btn, players, mode: multi ? mode : 'solo', multi, me: players.findIndex((p) => p.me),
      each: multi ? dartsEach(ids.length) : TOTAL, recent: [], flying: null, over: false, turn: null, last: null,
      n: 0, inbox: [], t0: performance.now() / 1000, sway: this.rand() * 20,
    };
    window.addEventListener('keydown', this.onKey, true);
    this._startTurn();
    this.tick = setInterval(() => this._clock(), 200);
    const loop = (now) => { this.draw(now / 1000); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  // The next dart: ours (the clock starts; the others are told the sway's
  // phase so their screens sway the same), someone else's (we wait for
  // their 't'), or a player who left (skipped).
  _startTurn() {
    const g = this.game;
    if (!g || g.over) return;
    const now = performance.now() / 1000;
    const idx = g.multi ? throwerOf(g.n, g.players.length) : 0;
    const p = g.players[idx];
    if (p.left) { this._record(idx, { points: 0, label: 'left' }); return; }
    if (p.me) {
      // Alone the aim keeps swaying from dart to dart, as before.
      const sway = g.multi ? swayUnpack(swayPack(this.rand() * 20)) : g.sway;
      g.turn = { mine: true, idx, started: true, t0: g.multi ? now : g.t0, sway, deadline: now + DART_SECONDS };
      if (g.multi) this._tell('t', g.n, swayPack(sway));
    } else g.turn = { mine: false, idx, started: false, since: now };
    g.btn.disabled = !p.me;
    this._hud();
    if (!p.me) this._read();
  }
  _tell(kind, n, total, extra) {
    for (const p of this.game.players) if (!p.me && !p.left) this.send(p.id, kind, n, total, extra);
  }

  // 7 seconds per dart: out of time is a miss. Someone who stays silent well
  // past their 7 seconds has dropped out.
  _clock() {
    const g = this.game;
    if (!g || g.over || g.flying || !g.turn) return;
    const now = performance.now() / 1000, t = g.turn;
    if (t.mine && now >= t.deadline) {
      g.turn = null;
      if (g.multi) this._tell('x', g.n);
      this._record(t.idx, { points: 0, label: 'time' });
    } else if (!t.mine && now >= (t.started ? t.deadline : t.since + DART_SECONDS) + LATE) {
      this._gone(g.players[t.idx]);
    }
  }

  _name(p) { return p.me ? tt('you') : p.name; }
  _teamTotals() {
    const g = this.game, tot = [0, 0];
    for (const p of g.players) tot[p.team] += p.total;
    return tot;
  }
  _hud() {
    const g = this.game;
    const last = g.last?.d;
    const what = !last ? '' : last.label === 'left' ? '' : last.label === 'time' ? tt('timeUp') : last.label === 'miss' ? '✖' : last.label === String(last.points) ? `+${last.points}` : `${last.label} +${last.points}`;
    let line = '';
    if (!g.multi) {
      const r = Math.min(DART_ROUNDS, Math.floor(g.players[0].darts.length / DARTS_PER_ROUND) + 1);
      line = tt('hud', { r, R: DART_ROUNDS, p: g.players[0].total });
    } else if (!g.over && g.turn) {
      const k = Math.floor(g.n / g.players.length) + 1;
      line = g.turn.mine ? tt('yourTurn', { k, n: g.each }) : tt('theirTurn', { name: g.players[g.turn.idx].name, k, n: g.each });
    }
    const lp = g.last && g.players[g.last.idx];
    const who = g.multi && lp && !lp.me ? lp.name + ' ' : '';
    g.status.textContent = line + (what ? (line ? '  ·  ' : '') + who + what : '');
    if (!g.multi) return;
    // The scoreboard: everyone's name in their dart colour.
    const tag = (p) => {
      const s = el('span', null, `${this._name(p)} ${p.total}${p.left ? ' ✖' : ''}`);
      s.style.color = DART_COLORS[p.color];
      return s;
    };
    const parts = [];
    if (g.mode === 't') {
      const tot = this._teamTotals();
      for (const tm of [0, 1]) {
        const box = el('span', 'darts-team');
        box.append(el('b', null, `${tt('team', { n: tm + 1 })} ${tot[tm]}: `));
        g.players.filter((p) => p.team === tm).forEach((p, i) => { if (i) box.append(' + '); box.append(tag(p)); });
        parts.push(box);
      }
    } else parts.push(...g.players.map(tag));
    g.vsLine.replaceChildren();
    parts.forEach((x, i) => { if (i) g.vsLine.append('  ·  '); g.vsLine.append(x); });
  }

  throwDart() {
    const g = this.game;
    if (!g || g.over || g.flying || !g.turn?.mine) return;
    const now = performance.now() / 1000, t = g.turn;
    const hit = dartLand(dartAim(now - t.t0 + t.sway), this.rand);
    // Rounded the way the message carries it, so every screen scores the same.
    const at = { x: dartUnpack(dartPack(hit.x)), y: dartUnpack(dartPack(hit.y)) };
    g.turn = null;
    g.btn.disabled = true;
    g.flying = { at, t: now, idx: t.idx };
    if (g.multi) this._tell('h', g.n, dartPack(at.x), dartPack(at.y));
    this.onDart?.(at, g.players[t.idx].color);
  }

  land() {
    const g = this.game;
    const { at, idx } = g.flying;
    g.flying = null;
    this._record(idx, { ...dartScore(at.x, at.y), x: at.x, y: at.y });
  }

  _record(idx, d) {
    const g = this.game;
    const p = g.players[idx];
    p.darts.push(d);
    p.total += d.points;
    if (d.label !== 'left') g.last = { idx, d };
    if (d.x != null) g.recent.push({ x: d.x, y: d.y, color: p.color });
    if (p.me) this.onThrow?.(d.points);
    if (g.multi) g.n++;
    if (g.multi ? g.n >= g.each * g.players.length || this._decided() : p.darts.length >= TOTAL) this._end();
    else this._startTurn();
  }
  // With friends: is the game over because people left?
  _decided() {
    const g = this.game;
    if (!g.multi) return false;
    const on = g.players.filter((p) => !p.left);
    if (g.mode === 't') return [0, 1].some((tm) => !on.some((p) => p.team === tm));
    return on.length < 2;
  }

  _end() {
    const g = this.game;
    if (!g || g.ended) return;
    Object.assign(g, { ended: true, over: true, turn: null });
    g.btn.disabled = true;
    this._hud();
    const me = g.players[g.me];
    const rest = g.players.filter((p) => !p.me);
    let note;
    if (!g.multi) {
      note = tt('done', { p: me.total });
      if (saveRecord(this.store, 'darts', me.total) && me.total > 0) note += '  ' + tt('record');
    } else if (rest.every((p) => p.left)) note = (rest.length === 1 ? tt('left', { name: rest[0].name }) : tt('allLeft')) + ' ' + g.vsLine.textContent;
    else if (g.mode === 't') {
      const tot = this._teamTotals(), a = tot[me.team], b = tot[1 - me.team];
      note = a > b ? tt('teamWon', { a, b }) : a < b ? tt('teamLost', { a, b }) : tt('tie', { a });
    } else if (g.players.length === 2) {
      const vs = rest[0], a = me.total, b = vs.total;
      note = a > b ? tt('won', { name: vs.name, a, b }) : a < b ? tt('lost', { name: vs.name, a, b }) : tt('tie', { a });
    } else {
      const top = Math.max(...g.players.map((p) => p.total));
      const firsts = g.players.filter((p) => p.total === top);
      note = firsts.length > 1 ? tt('tieTop', { p: top }) : firsts[0].me ? tt('youWin', { p: top }) : tt('winner', { name: firsts[0].name, p: top });
      note += '  ' + g.vsLine.textContent;
    }
    const again = rest.filter((p) => !p.left).map((p) => ({ id: p.id, name: p.name }));
    setTimeout(() => {
      if (this.game !== g) return;
      this.game = null; // the game is over: leaving now is not walking out on anyone
      this.renderStart(note, again);
    }, 1200);
  }

  draw(now) {
    const g = this.game;
    if (!g) return;
    const c = g.cv.getContext('2d');
    c.fillStyle = '#3a2a20'; c.fillRect(0, 0, S, S);
    c.drawImage(this.board, 0, 0);
    if (g.multi) {
      // The last darts thrown, two of each player's, each in their colour.
      for (const d of g.recent.slice(-2 * g.players.length)) this.dart(c, C + d.x * R, C + d.y * R, 1, d.color);
    } else {
      // This round's darts stay on the board until the next round starts.
      const ds = g.players[0].darts, n = ds.length, k = n % DARTS_PER_ROUND;
      const show = !n ? [] : k ? ds.slice(-k) : g.flying ? [] : ds.slice(-DARTS_PER_ROUND);
      for (const d of show) if (d.x != null) this.dart(c, C + d.x * R, C + d.y * R, 1, g.players[0].color);
    }
    if (g.flying) {
      const k = Math.min(1, (now - g.flying.t) / FLY);
      const x = C + g.flying.at.x * R, y = C + g.flying.at.y * R;
      this.dart(c, x, y + (1 - k) * 180, 1 + (1 - k) * 1.5, g.players[g.flying.idx].color);
      if (k >= 1) this.land();
    } else if (g.turn?.started && !g.over) {
      const t = g.turn;
      const a = dartAim(now - t.t0 + t.sway);
      const x = C + a.x * R, y = C + a.y * R;
      const col = t.mine ? '#ffffff' : DART_COLORS[g.players[t.idx].color];
      c.strokeStyle = col; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x - 18, y); c.lineTo(x - 6, y); c.moveTo(x + 6, y); c.lineTo(x + 18, y);
      c.moveTo(x, y - 18); c.lineTo(x, y - 6); c.moveTo(x, y + 6); c.lineTo(x, y + 18); c.stroke();
      // The 7-second clock: a bar along the top and the seconds left.
      const left = Math.max(0, Math.min(DART_SECONDS, t.deadline - now));
      const hot = left <= 3;
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, S, 10);
      c.fillStyle = hot ? '#ff5a4e' : t.mine ? '#ffd36e' : col;
      c.fillRect(0, 0, (S * left) / DART_SECONDS, 10);
      c.font = 'bold 26px system-ui'; c.textAlign = 'right'; c.textBaseline = 'top';
      c.fillText('⏱ ' + Math.ceil(left), S - 10, 16);
    }
  }
  // A dart stuck at (x, y) with flights in DART_COLORS[color].
  dart(c, x, y, s, color = 0) {
    const fl = DART_COLORS[color] || DART_COLORS[0];
    c.strokeStyle = '#c9ced3'; c.lineWidth = 2 * s;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10 * s, y + 16 * s); c.stroke();
    c.fillStyle = fl;
    c.beginPath(); c.moveTo(x + 10 * s, y + 16 * s); c.lineTo(x + 18 * s, y + 20 * s); c.lineTo(x + 12 * s, y + 26 * s); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#2b2b2e'; c.beginPath(); c.arc(x, y, 2.5 * s, 0, Math.PI * 2); c.fill();
  }
}
