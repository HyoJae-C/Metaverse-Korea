// Panels for the modern activities (rules in core/activities.js): bowling,
// the climbing wall and the PC방 aim game. Free to play, records only.
// Loaded the first time you play one (game/arcade.js).
import {
  PINS, FRAMES, frameRolls, bowlingScores, bowlingTurn, frameMarks, isSplit,
  CLIMB_ROUTES, routeHolds, judgeReach, gripAfter, gripDrain, climbOpen,
  AIM_SECONDS, aimLife, aimRadius, aimPoints, AIM_MISS, aimTier, accuracy,
  loadActivity, saveActivity,
} from '../core/activities.js';
import { L, fmt } from './pocha-ui.js';
import { simulateRoll, throwFrom, rackSpot, LANE_HALF, LANE_LEN, BOARD, BALL_R, PIN_H, PIN_GAP } from '../core/bowling-physics.js';

const T = {
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', id: 'Tutup', vi: 'Đóng', hi: 'बंद करें', fr: 'Fermer', th: 'ปิด', ar: 'إغلاق' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次', es: 'Otra vez', id: 'Lagi', vi: 'Lần nữa', hi: 'फिर से', fr: 'Rejouer', th: 'อีกครั้ง', ar: 'مرة أخرى' },
  record: { en: '🏆 New personal best!', ko: '🏆 내 최고 기록 경신!', ja: '🏆 自己ベスト更新！', zh: '🏆 刷新个人纪录！', es: '🏆 ¡Nuevo récord personal!', id: '🏆 Rekor pribadi baru!', vi: '🏆 Kỷ lục cá nhân mới!', hi: '🏆 नया निजी रिकॉर्ड!', fr: '🏆 Nouveau record perso !', th: '🏆 ทำสถิติใหม่!', ar: '🏆 رقم شخصي جديد!' },
  // Bowling
  bTitle: { en: 'Bowling', ko: '볼링', ja: 'ボウリング', zh: '保龄球', es: 'Bolos', id: 'Bowling', vi: 'Bowling', hi: 'बॉलिंग', fr: 'Bowling', th: 'โบว์ลิ่ง', ar: 'البولينغ' },
  bHow: {
    en: 'A full 10-frame game with real scoring, and the ball and pins move like the real thing. Pick where you stand (◀ ▶) and your spin, tap to lock your line as it swings, then tap again for speed. Or swipe up from the ball to throw. The pocket is just beside the head pin: a ball that hooks into it strikes, straight into the head pin leaves splits. Free: beat your best score.',
    ko: '진짜 점수 규칙으로 하는 10프레임 게임. 공과 핀이 실제처럼 움직여요. 설 자리(◀ ▶)와 회전을 고르고, 흔들리는 방향선을 눌러 멈춘 뒤, 한 번 더 눌러 속도를 정해요. 공에서 위로 쓸어 올려 던져도 돼요. 포켓은 1번 핀 바로 옆: 휘어 들어가면 스트라이크, 1번 핀 정면이면 스플릿이 남기 쉬워요. 무료, 내 최고 점수에 도전!',
    ja: '本物のスコアで遊ぶ10フレーム。ボールとピンが本物のように動きます。立ち位置（◀ ▶）と回転を選び、揺れる狙いの線をタップで止め、もう一度タップで球速を決めます。ボールから上へスワイプして投げることもできます。ポケットはヘッドピンのすぐ横：曲がって入るとストライク、正面だとスプリットが残りがち。無料、自己ベストに挑戦！',
    zh: '真实计分的完整10局比赛，球和球瓶像真的一样运动。选好站位（◀ ▶）和旋转，点击停住摆动的瞄准线，再点击决定球速。也可以从球向上滑动来投球。最佳击球点在1号瓶旁边：弧线切入容易全中，正面击中1号瓶容易留下分瓶。免费，挑战最高分！',
    es: 'Una partida completa de 10 frames con puntuación real, y la bola y los bolos se mueven como de verdad. Elige dónde te pones (◀ ▶) y el efecto, toca para fijar la línea mientras oscila y otra vez para la velocidad. O desliza hacia arriba desde la bola. El bolsillo está junto al bolo 1: una bola con curva hace strike, de frente al bolo 1 deja splits. Gratis: supera tu récord.',
    id: 'Permainan penuh 10 frame dengan skor asli, bola dan pin bergerak seperti sungguhan. Pilih posisi berdiri (◀ ▶) dan putaran, ketuk untuk mengunci arah yang berayun, lalu ketuk lagi untuk kecepatan. Atau usap ke atas dari bola untuk melempar. Pocket ada di samping pin depan: bola melengkung masuk jadi strike, lurus ke pin depan sering menyisakan split. Gratis: kalahkan skor terbaikmu.',
    vi: 'Ván đủ 10 frame với cách tính điểm thật, bóng và ki chuyển động như thật. Chọn chỗ đứng (◀ ▶) và độ xoáy, chạm để chốt đường bóng đang lắc, rồi chạm lần nữa để chọn tốc độ. Hoặc vuốt lên từ quả bóng để ném. Điểm vàng ngay cạnh ki số 1: bóng cong vào đó dễ strike, đánh thẳng ki số 1 dễ để lại split. Miễn phí: phá kỷ lục của bạn.',
    hi: 'असली स्कोरिंग के साथ पूरा 10 फ़्रेम का खेल, गेंद और पिनें असली जैसी चलती हैं। खड़े होने की जगह (◀ ▶) और स्पिन चुनें, झूलती लाइन को टैप करके रोकें, फिर रफ़्तार के लिए दोबारा टैप करें। या गेंद से ऊपर स्वाइप करके फेंकें। पॉकेट हेड पिन के ठीक बगल में है: मुड़कर आई गेंद स्ट्राइक करती है, सीधी हेड पिन पर लगे तो स्प्लिट बचता है। मुफ़्त: अपना बेस्ट स्कोर तोड़ें।',
    fr: 'Une vraie partie de 10 frames avec le vrai calcul des points, et la boule et les quilles bougent comme en vrai. Choisis ta position (◀ ▶) et l\'effet, touche pour fixer ta ligne pendant qu\'elle oscille, puis encore pour la vitesse. Ou glisse vers le haut depuis la boule. La poche est juste à côté de la quille 1 : une boule qui y entre en courbe fait strike, de face sur la 1 elle laisse des splits. Gratuit : bats ton record.',
    th: 'เกมเต็ม 10 เฟรมนับคะแนนจริง ลูกและพินเคลื่อนที่เหมือนจริง เลือกจุดยืน (◀ ▶) และการหมุน แตะเพื่อหยุดเส้นเล็งที่แกว่งอยู่ แล้วแตะอีกครั้งเพื่อเลือกความเร็ว หรือปัดขึ้นจากลูกเพื่อโยน พ็อกเก็ตอยู่ข้างพินหัว ลูกที่โค้งเข้าไปจะสไตรก์ ตรงเข้าพินหัวมักเหลือสปลิต เล่นฟรี ทำลายสถิติตัวเอง',
    ar: 'لعبة كاملة من 10 جولات بحساب نقاط حقيقي، والكرة والقوارير تتحرك كالحقيقة. اختر مكان وقوفك (◀ ▶) والدوران، وانقر لتثبيت خطك وهو يتأرجح، ثم انقر مجددًا للسرعة. أو اسحب للأعلى من الكرة لترميها. الجيب بجانب القارورة الأولى: الكرة المنحنية إليه تحقق ضربة كاملة، والمباشرة على القارورة الأولى تترك انقسامًا. مجانية: حطّم رقمك.',
  },
  bStart: { en: 'Start · {n} frames', ko: '시작 · {n}프레임', ja: 'スタート・{n}フレーム', zh: '开始 · {n}局', es: 'Empezar · {n} frames', id: 'Mulai · {n} frame', vi: 'Bắt đầu · {n} frame', hi: 'शुरू · {n} फ़्रेम', fr: 'Commencer · {n} frames', th: 'เริ่ม · {n} เฟรม', ar: 'ابدأ · {n} جولات' },
  bBest: { en: 'Best score: {n}', ko: '최고 점수: {n}', ja: 'ベストスコア：{n}', zh: '最高分：{n}', es: 'Mejor puntuación: {n}', id: 'Skor terbaik: {n}', vi: 'Điểm cao nhất: {n}', hi: 'बेस्ट स्कोर: {n}', fr: 'Meilleur score : {n}', th: 'คะแนนสูงสุด: {n}', ar: 'أفضل نتيجة: {n}' },
  bAim: { en: 'Frame {f} · ball {b}: tap to lock your line, or swipe up', ko: '{f}프레임 {b}구: 눌러서 방향을 정하거나 위로 쓸어 던지기', ja: '{f}フレーム {b}投目：タップで線を決めるか、上へスワイプ', zh: '第{f}局 第{b}球：点击定线路，或向上滑动', es: 'Frame {f} · bola {b}: toca para fijar la línea o desliza hacia arriba', id: 'Frame {f} · bola {b}: ketuk untuk mengunci arah, atau usap ke atas', vi: 'Frame {f} · bóng {b}: chạm để chốt đường bóng, hoặc vuốt lên', hi: 'फ़्रेम {f} · बॉल {b}: लाइन तय करने को टैप करें, या ऊपर स्वाइप करें', fr: 'Frame {f} · boule {b} : touche pour fixer ta ligne, ou glisse vers le haut', th: 'เฟรม {f} · ลูก {b}: แตะเพื่อล็อกเส้น หรือปัดขึ้น', ar: 'الجولة {f} · الكرة {b}: انقر لتثبيت خطك أو اسحب للأعلى' },
  bStand: { en: 'Stand', ko: '서는 자리', ja: '立ち位置', zh: '站位', es: 'Posición', id: 'Posisi', vi: 'Chỗ đứng', hi: 'जगह', fr: 'Position', th: 'จุดยืน', ar: 'الموقف' },
  bSpin: { en: 'Spin', ko: '회전', ja: '回転', zh: '旋转', es: 'Efecto', id: 'Putaran', vi: 'Xoáy', hi: 'स्पिन', fr: 'Effet', th: 'การหมุน', ar: 'الدوران' },
  bSpeed: { en: '{n} km/h', ko: '시속 {n}km', ja: '時速{n}km', zh: '时速{n}公里', es: '{n} km/h', id: '{n} km/jam', vi: '{n} km/h', hi: '{n} किमी/घं', fr: '{n} km/h', th: '{n} กม./ชม.', ar: '{n} كم/س' },
  split: { en: 'Split!', ko: '스플릿!', ja: 'スプリット！', zh: '分瓶！', es: '¡Split!', id: 'Split!', vi: 'Split!', hi: 'स्प्लिट!', fr: 'Split !', th: 'สปลิต!', ar: 'انقسام!' },
  bPower: { en: 'Now tap for power', ko: '이제 눌러서 힘 조절', ja: '次はタップで力加減', zh: '现在点击定力度', es: 'Ahora toca para la fuerza', id: 'Sekarang ketuk untuk tenaga', vi: 'Giờ chạm để chọn lực', hi: 'अब ताक़त के लिए टैप करें', fr: 'Touche pour la puissance', th: 'แตะเพื่อเลือกแรง', ar: 'الآن انقر لاختيار القوة' },
  bThrow: { en: 'THROW', ko: '던지기', ja: '投げる', zh: '投球', es: 'LANZAR', id: 'LEMPAR', vi: 'NÉM', hi: 'फेंकें', fr: 'LANCER', th: 'โยน', ar: 'ارمِ' },
  strike: { en: 'STRIKE!', ko: '스트라이크!', ja: 'ストライク！', zh: '全中！', es: '¡STRIKE!', id: 'STRIKE!', vi: 'STRIKE!', hi: 'स्ट्राइक!', fr: 'STRIKE !', th: 'สไตรก์!', ar: 'ضربة كاملة!' },
  spare: { en: 'Spare!', ko: '스페어!', ja: 'スペア！', zh: '补中！', es: '¡Semipleno!', id: 'Spare!', vi: 'Spare!', hi: 'स्पेयर!', fr: 'Spare !', th: 'สแปร์!', ar: 'سبير!' },
  gutter: { en: 'Gutter ball…', ko: '거터…', ja: 'ガター…', zh: '洗沟球…', es: 'Al canal…', id: 'Masuk selokan…', vi: 'Bóng rơi rãnh…', hi: 'गटर बॉल…', fr: 'Dans la rigole…', th: 'ลงราง…', ar: 'في القناة…' },
  pins: { en: '{n} pins', ko: '핀 {n}개', ja: '{n}本', zh: '{n}个瓶', es: '{n} bolos', id: '{n} pin', vi: '{n} ki', hi: '{n} पिन', fr: '{n} quilles', th: '{n} พิน', ar: '{n} قوارير' },
  bDone: { en: 'Final score: {n}', ko: '최종 점수: {n}', ja: '最終スコア：{n}', zh: '最终得分：{n}', es: 'Puntuación final: {n}', id: 'Skor akhir: {n}', vi: 'Điểm cuối: {n}', hi: 'फ़ाइनल स्कोर: {n}', fr: 'Score final : {n}', th: 'คะแนนรวม: {n}', ar: 'النتيجة النهائية: {n}' },
  // Climbing
  cTitle: { en: 'Bouldering', ko: '볼더링', ja: 'ボルダリング', zh: '抱石', es: 'Búlder', id: 'Bouldering', vi: 'Leo tường', hi: 'बोल्डरिंग', fr: 'Bloc', th: 'โบลเดอริ่ง', ar: 'تسلق الصخور' },
  cHow: {
    en: 'Each problem uses holds of one colour; the colour is the grade. A ring closes on the next hold: tap REACH (or Space) as it closes. Your grip drains all the time, clean moves win some back, a slip costs a lot. Top a grade to open the next.',
    ko: '문제마다 한 가지 색 홀드만 써요. 색이 곧 난이도예요. 다음 홀드에 링이 좁혀질 때 잡기(또는 스페이스)를 누르세요. 악력은 계속 줄고, 깔끔하게 잡으면 조금 돌아오고, 미끄러지면 많이 줄어요. 완등하면 다음 난이도가 열려요.',
    ja: '課題ごとに1色のホールドだけを使います。色がグレードです。次のホールドにリングが閉じる瞬間に「つかむ」（またはスペース）。握力は減り続け、きれいに取ると少し回復、滑ると大きく減ります。完登すると次のグレードが開きます。',
    zh: '每条路线只用一种颜色的岩点，颜色就是难度。圆环收紧到下一个岩点时点“抓”（或空格）。握力一直在减少，抓得漂亮会恢复一点，打滑会掉很多。完攀后解锁下一难度。',
    es: 'Cada bloque usa presas de un color: el color es el grado. Un anillo se cierra sobre la siguiente presa: pulsa AGARRAR (o Espacio) cuando se cierre. Tu agarre se agota; los movimientos limpios lo recuperan y un resbalón cuesta mucho. Encadena un grado para abrir el siguiente.',
    id: 'Tiap jalur memakai pegangan satu warna; warnanya adalah tingkat kesulitan. Cincin mengecil ke pegangan berikutnya: ketuk RAIH (atau Spasi) saat menutup. Tenaga genggam terus berkurang, gerakan rapi menambahnya, tergelincir menguranginya banyak. Selesaikan satu tingkat untuk membuka berikutnya.',
    vi: 'Mỗi bài leo dùng một màu mấu; màu chính là độ khó. Vòng tròn thu lại quanh mấu tiếp theo: nhấn VỚI (hoặc Space) khi nó khép lại. Sức nắm giảm liên tục, bám chuẩn được hồi một chút, trượt tay mất nhiều. Leo xong một cấp để mở cấp sau.',
    hi: 'हर रूट एक ही रंग के होल्ड से बना है; रंग ही ग्रेड है। अगले होल्ड पर घेरा सिकुड़ते ही पकड़ें (या Space) दबाएँ। पकड़ लगातार घटती है, साफ़ मूव से थोड़ी लौटती है, फिसलने पर बहुत घटती है। एक ग्रेड पूरा करें तो अगला खुलेगा।',
    fr: 'Chaque bloc utilise des prises d\'une seule couleur : la couleur, c\'est le niveau. Un cercle se referme sur la prise suivante : appuie sur ATTRAPER (ou Espace) au bon moment. Ta force baisse sans cesse, un geste propre en rend un peu, une glissade en coûte beaucoup. Réussis un niveau pour ouvrir le suivant.',
    th: 'แต่ละโจทย์ใช้โฮลด์สีเดียว สีคือระดับความยาก วงแหวนจะหดเข้าหาโฮลด์ถัดไป กด คว้า (หรือ Space) ตอนที่มันหดสุด แรงบีบลดลงเรื่อย ๆ จับเป๊ะได้คืนนิดหน่อย ลื่นเสียเยอะ ปีนจบระดับหนึ่งเพื่อปลดล็อกระดับถัดไป',
    ar: 'كل مسار يستخدم مقابض بلون واحد، واللون هو الدرجة. تنغلق حلقة على المقبض التالي: اضغط «امسك» (أو المسافة) لحظة انغلاقها. قوة القبضة تنفد باستمرار، والحركة النظيفة تعيد بعضها، والانزلاق يكلّف كثيرًا. أنهِ درجة لتفتح التالية.',
  },
  cStart: { en: 'Climb {g}', ko: '{g} 도전', ja: '{g}に挑戦', zh: '挑战 {g}', es: 'Escalar {g}', id: 'Panjat {g}', vi: 'Leo {g}', hi: '{g} चढ़ें', fr: 'Grimper {g}', th: 'ปีน {g}', ar: 'تسلّق {g}' },
  cBest: { en: 'Topped · best {s}s', ko: '완등 · 최고 {s}초', ja: '完登・ベスト{s}秒', zh: '已完攀 · 最快{s}秒', es: 'Hecho · mejor {s} s', id: 'Selesai · terbaik {s} dtk', vi: 'Đã leo · nhanh nhất {s} giây', hi: 'पूरा · बेस्ट {s} से.', fr: 'Réussi · record {s} s', th: 'ปีนจบ · ดีสุด {s} วิ', ar: 'أُنجز · الأفضل {s} ث' },
  cOpen: { en: 'Not topped yet', ko: '아직 완등 전', ja: 'まだ完登していない', zh: '还没完攀', es: 'Aún sin hacer', id: 'Belum selesai', vi: 'Chưa leo xong', hi: 'अभी पूरा नहीं', fr: 'Pas encore réussi', th: 'ยังไม่จบ', ar: 'لم يُنجز بعد' },
  cLocked: { en: '🔒 Top {g} first', ko: '🔒 {g} 먼저 완등', ja: '🔒 先に{g}を完登', zh: '🔒 先完攀 {g}', es: '🔒 Primero {g}', id: '🔒 Selesaikan {g} dulu', vi: '🔒 Leo {g} trước', hi: '🔒 पहले {g} पूरा करें', fr: '🔒 Réussis d\'abord {g}', th: '🔒 ปีน {g} ให้จบก่อน', ar: '🔒 أنهِ {g} أولًا' },
  reach: { en: 'REACH', ko: '잡기', ja: 'つかむ', zh: '抓', es: 'AGARRAR', id: 'RAIH', vi: 'VỚI', hi: 'पकड़ें', fr: 'ATTRAPER', th: 'คว้า', ar: 'امسك' },
  grip: { en: 'Grip', ko: '악력', ja: '握力', zh: '握力', es: 'Agarre', id: 'Genggam', vi: 'Sức nắm', hi: 'पकड़', fr: 'Force', th: 'แรงบีบ', ar: 'القبضة' },
  perfect: { en: 'Clean!', ko: '깔끔!', ja: 'きれい！', zh: '漂亮！', es: '¡Limpio!', id: 'Rapi!', vi: 'Chuẩn!', hi: 'बढ़िया!', fr: 'Propre !', th: 'เป๊ะ!', ar: 'نظيف!' },
  good: { en: 'Got it', ko: '잡았다', ja: 'ナイス', zh: '抓住了', es: 'Bien', id: 'Dapat', vi: 'Được', hi: 'पकड़ लिया', fr: 'Pris', th: 'จับได้', ar: 'أمسكته' },
  slip: { en: 'Slipped!', ko: '미끄러졌어요!', ja: '滑った！', zh: '打滑了！', es: '¡Resbalón!', id: 'Tergelincir!', vi: 'Trượt tay!', hi: 'फिसल गए!', fr: 'Glissé !', th: 'ลื่น!', ar: 'انزلقت!' },
  fell: { en: 'Your grip gave out and you dropped onto the mat. Shake out your arms and try again!', ko: '악력이 다 떨어져 매트로 떨어졌어요. 팔 풀고 다시 도전!', ja: '握力が尽きてマットに落ちました。腕をほぐしてもう一度！', zh: '握力用完，掉到了垫子上。甩甩手再来！', es: 'Te quedaste sin agarre y caíste a la colchoneta. ¡Sacude los brazos y otra vez!', id: 'Genggamanmu habis dan kamu jatuh ke matras. Lemaskan tangan dan coba lagi!', vi: 'Hết sức nắm, bạn rơi xuống đệm. Thả lỏng tay rồi thử lại nhé!', hi: 'पकड़ छूट गई और आप मैट पर गिर गए। हाथ ढीले करें और फिर कोशिश करें!', fr: 'Plus de force, te voilà sur le tapis. Secoue les bras et réessaie !', th: 'แรงบีบหมด ตกลงเบาะ สะบัดแขนแล้วลองใหม่!', ar: 'نفدت قبضتك وسقطت على الحصيرة. حرّك ذراعيك وحاول مجددًا!' },
  topped: { en: '🧗 Topped {g} in {s}s!', ko: '🧗 {g} 완등! {s}초', ja: '🧗 {g}完登！{s}秒', zh: '🧗 完攀 {g}！{s}秒', es: '🧗 ¡{g} hecho en {s} s!', id: '🧗 {g} selesai dalam {s} dtk!', vi: '🧗 Leo xong {g} trong {s} giây!', hi: '🧗 {g} {s} सेकंड में पूरा!', fr: '🧗 {g} réussi en {s} s !', th: '🧗 ปีน {g} จบใน {s} วิ!', ar: '🧗 أنجزت {g} في {s} ث!' },
  // Aim
  aTitle: { en: 'Aim trainer', ko: '에임 연습', ja: 'エイム練習', zh: '瞄准练习', es: 'Entrenador de puntería', id: 'Latihan bidik', vi: 'Luyện ngắm', hi: 'निशाना अभ्यास', fr: 'Entraînement à la visée', th: 'ฝึกเล็ง', ar: 'تدريب التصويب' },
  aHow: {
    en: '30 seconds of NEON STRIKE target practice. Click or tap each target before it fades; faster hits score more, and a click on nothing costs a little. Your score earns a tier, like ranked games.',
    ko: '네온 스트라이크 30초 사격 연습. 과녁이 사라지기 전에 클릭하거나 탭하세요. 빨리 맞힐수록 점수가 높고, 빈 곳을 누르면 조금 깎여요. 점수에 따라 랭크 티어가 나와요.',
    ja: 'NEON STRIKEの30秒射撃練習。的が消える前にクリックかタップ。早く当てるほど高得点、空振りは少し減点。スコアでランクのティアが決まります。',
    zh: 'NEON STRIKE 30秒射击练习。在靶子消失前点击。越快打中分越高，点空会扣一点分。按分数获得段位。',
    es: '30 segundos de práctica de tiro de NEON STRIKE. Haz clic o toca cada diana antes de que desaparezca; cuanto antes, más puntos, y un clic al aire resta un poco. Tu puntuación te da un rango.',
    id: '30 detik latihan menembak NEON STRIKE. Klik atau ketuk target sebelum hilang; makin cepat makin tinggi skornya, klik meleset mengurangi sedikit. Skormu menentukan tier, seperti game ranked.',
    vi: '30 giây tập bắn NEON STRIKE. Nhấp hoặc chạm vào mục tiêu trước khi nó biến mất; bắn càng nhanh càng nhiều điểm, nhấp trượt bị trừ chút ít. Điểm số cho bạn một hạng như game xếp hạng.',
    hi: 'NEON STRIKE का 30 सेकंड का निशाना अभ्यास। हर टारगेट गायब होने से पहले क्लिक या टैप करें; जितना तेज़, उतने ज़्यादा अंक, ख़ाली क्लिक पर थोड़े कटते हैं। स्कोर से रैंक टियर मिलता है।',
    fr: '30 secondes d\'entraînement au tir NEON STRIKE. Clique ou touche chaque cible avant qu\'elle disparaisse ; plus c\'est rapide, plus ça rapporte, et un clic dans le vide coûte un peu. Ton score te donne un rang.',
    th: 'ฝึกยิง NEON STRIKE 30 วินาที คลิกหรือแตะเป้าก่อนหายไป ยิงเร็วได้คะแนนมาก คลิกพลาดเสียนิดหน่อย คะแนนจะได้แรงก์เหมือนเกมจัดอันดับ',
    ar: '30 ثانية من تدريب الرماية في NEON STRIKE. انقر أو المس كل هدف قبل أن يختفي؛ الإصابة الأسرع تعطي نقاطًا أكثر، والنقر في الفراغ يخصم قليلًا. نتيجتك تمنحك رتبة.',
  },
  aStart: { en: 'Start · 30 s', ko: '시작 · 30초', ja: 'スタート・30秒', zh: '开始 · 30秒', es: 'Empezar · 30 s', id: 'Mulai · 30 dtk', vi: 'Bắt đầu · 30 giây', hi: 'शुरू · 30 से.', fr: 'Commencer · 30 s', th: 'เริ่ม · 30 วิ', ar: 'ابدأ · 30 ث' },
  aBest: { en: 'Best: {n} · {tier}', ko: '최고: {n}점 · {tier}', ja: 'ベスト：{n}・{tier}', zh: '最佳：{n} · {tier}', es: 'Récord: {n} · {tier}', id: 'Terbaik: {n} · {tier}', vi: 'Tốt nhất: {n} · {tier}', hi: 'बेस्ट: {n} · {tier}', fr: 'Record : {n} · {tier}', th: 'ดีที่สุด: {n} · {tier}', ar: 'الأفضل: {n} · {tier}' },
  aDone: { en: '{n} points · {hits} hits · {acc}% accuracy', ko: '{n}점 · {hits}발 명중 · 정확도 {acc}%', ja: '{n}点・{hits}ヒット・命中率{acc}%', zh: '{n}分 · 命中{hits} · 准确率{acc}%', es: '{n} puntos · {hits} aciertos · {acc}% de precisión', id: '{n} poin · {hits} kena · akurasi {acc}%', vi: '{n} điểm · {hits} phát trúng · chính xác {acc}%', hi: '{n} अंक · {hits} हिट · {acc}% सटीकता', fr: '{n} points · {hits} touches · {acc} % de précision', th: '{n} คะแนน · โดน {hits} · แม่น {acc}%', ar: '{n} نقطة · {hits} إصابات · دقة {acc}%' },
  aRank: { en: 'Rank: {tier}', ko: '랭크: {tier}', ja: 'ランク：{tier}', zh: '段位：{tier}', es: 'Rango: {tier}', id: 'Peringkat: {tier}', vi: 'Hạng: {tier}', hi: 'रैंक: {tier}', fr: 'Rang : {tier}', th: 'แรงก์: {tier}', ar: 'الرتبة: {tier}' },
  bronze: { en: 'Bronze', ko: '브론즈', ja: 'ブロンズ', zh: '青铜', es: 'Bronce', id: 'Perunggu', vi: 'Đồng', hi: 'ब्रॉन्ज़', fr: 'Bronze', th: 'บรอนซ์', ar: 'برونزي' },
  silver: { en: 'Silver', ko: '실버', ja: 'シルバー', zh: '白银', es: 'Plata', id: 'Perak', vi: 'Bạc', hi: 'सिल्वर', fr: 'Argent', th: 'ซิลเวอร์', ar: 'فضي' },
  gold: { en: 'Gold', ko: '골드', ja: 'ゴールド', zh: '黄金', es: 'Oro', id: 'Emas', vi: 'Vàng', hi: 'गोल्ड', fr: 'Or', th: 'โกลด์', ar: 'ذهبي' },
  platinum: { en: 'Platinum', ko: '플래티넘', ja: 'プラチナ', zh: '铂金', es: 'Platino', id: 'Platinum', vi: 'Bạch kim', hi: 'प्लैटिनम', fr: 'Platine', th: 'แพลทินัม', ar: 'بلاتيني' },
  diamond: { en: 'Diamond', ko: '다이아몬드', ja: 'ダイヤモンド', zh: '钻石', es: 'Diamante', id: 'Berlian', vi: 'Kim cương', hi: 'डायमंड', fr: 'Diamant', th: 'ไดมอนด์', ar: 'ماسي' },
  master: { en: 'Master', ko: '마스터', ja: 'マスター', zh: '大师', es: 'Maestro', id: 'Master', vi: 'Cao thủ', hi: 'मास्टर', fr: 'Maître', th: 'มาสเตอร์', ar: 'أستاذ' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const W = 600, H = 340;
const now = () => performance.now() / 1000;

// What the three panels share: open/close, a header, a canvas loop and the
// Space key while a game runs.
class Panel {
  constructor({ root, store, icon, title }) {
    Object.assign(this, { root, store, icon, title });
    this.raf = 0;
    this.onKey = (e) => {
      if (!this.game || (e.code !== 'Space' && e.code !== 'Enter')) return;
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) this.tap();
    };
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); }
  close() { this._stop(); this.root.hidden = true; }
  _stop() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onKey, true);
    this.game?.unswipe?.();
    this.view?.stop();
    this.root.classList.remove('arcade-live');
    this.game = null;
  }
  _frame() {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, `${this.icon} ${tt(this.title)}`));
  }
  _actions(...buttons) {
    const row = el('div', 'order-actions');
    row.append(...buttons);
    this.root.append(row);
  }
  _button(text, primary, fn) {
    const b = el('button', primary ? 'primary' : null, text);
    b.onclick = fn;
    return b;
  }
  // A canvas and status line, the big tap button, and the draw loop.
  _play(game, padText) {
    this._frame();
    const cv = el('canvas', 'arcade-canvas');
    cv.width = W; cv.height = H;
    const status = el('p', 'karaoke-status');
    this.root.append(cv, status);
    if (padText) {
      const btn = el('button', 'primary karaoke-pad', padText);
      btn.onpointerdown = (e) => { e.preventDefault(); this.tap(); };
      this.root.append(btn);
      window.addEventListener('keydown', this.onKey, true);
    }
    this.game = { cv, c: cv.getContext('2d'), status, ...game };
    const loop = () => { if (!this.game) return; this.draw(now()); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
    return this.game;
  }
  _end(note, again) {
    this._frame();
    this.root.append(el('p', 'order-hint claw-note', note));
    this._actions(this._button(`${this.icon} ${tt('again')}`, true, again));
  }
}

// ── Bowling ──────────────────────────────────────────────────────────────
// The lane seen from behind the ball, with a camera that follows it down to
// the pins. You pick where you stand and your spin, lock the swinging line
// with a tap and the speed with another (or swipe up from the ball); then the
// roll from core/bowling-physics.js plays back.
const SPINS = [-1, -0.5, 0, 0.5, 1], SPIN_ICON = ['↰↰', '↰', '│', '↱', '↱↱'];
const BOWL_KEY = 'bowling10'; // 10-frame bests (older 5-frame ones were under 'bowling')
const HZ = 70, F = 430; // the horizon's height on the canvas and the focal length
export class BowlingUI extends Panel {
  // onRoll(pinsDown, kind) after each ball ('strike', 'spare', 'split', 'gutter', 'pins'); onHit() when the ball meets the pins.
  // view: the game on the room's real lane (game/bowling-view.js; without it
  // the panel draws its own lane).
  constructor({ root, store, onRoll, onHit, view = null, rand = Math.random }) {
    super({ root, store, icon: '🎳', title: 'bTitle' });
    Object.assign(this, { onRoll, onHit, view, rand });
    this.stance = 0; this.spin = 0;
    const tapKey = this.onKey;
    this.onKey = (e) => {
      const g = this.game;
      if (g?.phase === 'aim' && /^(ArrowLeft|ArrowRight|KeyA|KeyD)$/.test(e.code)) {
        e.preventDefault(); e.stopPropagation();
        this.move(e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 1);
      } else if (g?.phase === 'aim' && /^(ArrowUp|ArrowDown|KeyW|KeyS)$/.test(e.code)) {
        e.preventDefault(); e.stopPropagation();
        this.setSpin(SPINS[Math.max(0, Math.min(4, SPINS.indexOf(this.spin) + (e.code === 'ArrowUp' || e.code === 'KeyW' ? 1 : -1)))]);
      } else tapKey(e);
    };
  }
  renderStart() {
    this._frame();
    this.root.append(el('p', 'order-hint', tt('bHow')));
    const best = loadActivity(this.store)[BOWL_KEY];
    if (best != null) this.root.append(el('p', 'order-hint claw-note', tt('bBest', { n: best })));
    this._actions(this._button('🎳 ' + tt('bStart', { n: FRAMES }), true, () => this.play()));
  }
  play() {
    const g = this._play({ rolls: [], rack: freshRack(), phase: 'aim', t0: now(), aim: 0, power: 0, sim: null }, '🎳 ' + tt('bThrow'));
    // Where you stand and your spin, under the lane.
    const row = el('div', null);
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;margin:6px 0';
    const left = this._button('◀', false, () => this.move(-1)), right = this._button('▶', false, () => this.move(1));
    left.setAttribute('aria-label', tt('bStand') + ' ◀'); right.setAttribute('aria-label', tt('bStand') + ' ▶');
    g.spinBtns = SPINS.map((s, k) => {
      const b = this._button(SPIN_ICON[k], false, () => this.setSpin(s));
      b.className = 'chip';
      b.style.cssText = 'min-width:44px;padding:6px 8px';
      b.setAttribute('aria-label', `${tt('bSpin')} ${SPIN_ICON[k]}`);
      return b;
    });
    const row2 = row.cloneNode();
    row.append(left, el('small', null, tt('bStand')), right);
    row2.append(el('small', null, tt('bSpin')), ...g.spinBtns);
    g.status.after(row, row2);
    g.controls = [left, right, ...g.spinBtns];
    this.setSpin(this.spin);
    // On the room's real lane: the panel keeps the score sheet (a strip), a
    // power meter and the controls; you swipe up on the world to throw.
    g.live = !!this.view?.start(this.root);
    if (g.live) {
      this.root.classList.add('arcade-live');
      g.cv.height = 52;
      g.cv.classList.add('bowl-sheet');
      g.meter = el('div', 'arcade-meter');
      const track = el('span');
      track.append(el('i'));
      g.meter.append(track, el('b'));
      g.meter.style.visibility = 'hidden';
      row2.after(g.meter);
      this.swipe(g, this.view.surface, (e) => ({ x: (e.clientX / innerWidth) * W, y: (e.clientY / innerHeight) * H, t: now() }));
    } else this.swipe(g);
    this.nextBall();
  }
  move(d) {
    if (this.game?.phase !== 'aim') return;
    this.stance = Math.max(-1, Math.min(1, Math.round((this.stance + d * 0.1) * 10) / 10));
  }
  setSpin(s) {
    this.spin = s;
    this.game?.spinBtns?.forEach((b, k) => b.setAttribute('aria-pressed', String(SPINS[k] === s)));
  }
  // Swipe up from the ball to throw: the swipe's slant is your line, its
  // speed is the ball's.
  // surface: what you swipe on (the panel's canvas, or the world) and pos(e)
  // the point in canvas units.
  swipe(g, surface = g.cv, pos = (e) => { const r = g.cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, t: now() }; }) {
    let pts = null;
    const down = (e) => { if (g.phase === 'aim' || g.phase === 'power') { pts = [pos(e)]; surface.setPointerCapture?.(e.pointerId); } };
    const move = (e) => { if (pts) pts.push(pos(e)); };
    const up = (e) => {
      if (!pts) return;
      pts.push(pos(e));
      const a = pts[0], b = pts.at(-1), recent = pts.filter((p) => b.t - p.t < 0.12)[0] || a;
      pts = null;
      const up = a.y - b.y;
      if (up < 50 || !this.game || this.game !== g) return;
      const vy = (recent.y - b.y) / Math.max(0.016, b.t - recent.t);
      g.aim = Math.max(-1, Math.min(1, ((b.x - a.x) / up) / 0.6));
      this.throw(Math.max(0, Math.min(1, (vy - 150) / 1500)));
    };
    surface.addEventListener('pointerdown', down);
    surface.addEventListener('pointermove', move);
    surface.addEventListener('pointerup', up);
    g.unswipe = () => { surface.removeEventListener('pointerdown', down); surface.removeEventListener('pointermove', move); surface.removeEventListener('pointerup', up); };
  }
  nextBall() {
    const g = this.game;
    if (!g) return;
    const turn = bowlingTurn(g.rolls);
    if (turn.over) { this.finish(); return; }
    if (turn.fresh) g.rack = freshRack();
    else if (g.sim) g.rack = g.sim.left;
    g.turn = turn;
    g.phase = 'aim'; g.t0 = now(); g.sim = null;
    g.controls.forEach((b) => { b.disabled = false; });
    g.status.textContent = tt('bAim', { f: turn.frame + 1, b: turn.ball + 1 });
  }
  aimAt(t) { return Math.sin(t * 1.35) * 0.9; }
  // In the world: the ball, the pins and your line go to the real lane; the
  // power meter and the score sheet stay in the panel.
  drawLive(t, ball, pins) {
    const g = this.game, aiming = g.phase === 'aim' || g.phase === 'power';
    this.view.show(ball, pins, aiming ? (g.phase === 'aim' ? this.aimAt(t - g.t0) : g.aim) : null, g.phase === 'power');
    g.meter.style.visibility = g.phase === 'power' ? 'visible' : 'hidden';
    if (g.phase === 'power') {
      const pw = this.powerAt(t - g.t0), bar = g.meter.firstChild.firstChild;
      bar.style.width = `${pw * 100}%`;
      bar.style.background = pw > 0.85 ? '#d9473c' : pw > 0.45 ? '#4caf7a' : '#ffd36e';
      g.meter.lastChild.textContent = `${Math.round(throwFrom({ power: pw }).speed * 3.6)} km/h`;
    }
    g.c.clearRect(0, 0, W, 52);
    drawSheet(g.c, g);
  }
  powerAt(t) { return (1 - Math.cos(t * 2.6)) / 2; }
  tap() {
    const g = this.game;
    if (!g) return;
    const t = now() - g.t0;
    if (g.phase === 'aim') {
      g.aim = this.aimAt(t);
      g.phase = 'power'; g.t0 = now();
      g.status.textContent = tt('bPower');
    } else if (g.phase === 'power') this.throw(this.powerAt(t));
    else if (g.phase === 'roll') { g.at -= 60; clearTimeout(this.timer); this.land(); } // skip to the end
  }
  throw(power) {
    const g = this.game;
    g.power = power;
    g.ball = throwFrom({ stance: this.stance, aim: g.aim, power, spin: this.spin });
    g.sim = simulateRoll(g.ball, g.rack, this.rand);
    g.phase = 'roll'; g.at = now(); g.hit = false;
    g.controls.forEach((b) => { b.disabled = true; });
    g.status.textContent = tt('bSpeed', { n: Math.round(g.ball.speed * 3.6) });
    this.timer = setTimeout(() => this.land(), (g.sim.frames.length / 60) * 1000 + 150);
  }
  land() {
    const g = this.game;
    if (!g || g.phase !== 'roll') return;
    const { down, left } = g.sim;
    const wasFull = g.rack.length === 10;
    g.rolls.push(down.length);
    const ids = left.map((p) => p.i);
    const kind = !left.length ? (wasFull ? 'strike' : 'spare') : down.length === 0 ? 'gutter' : wasFull && isSplit(ids) ? 'split' : 'pins';
    g.status.textContent = kind === 'pins' ? tt('pins', { n: down.length }) : kind === 'split' ? `${tt('split')} ${tt('pins', { n: down.length })}` : tt(kind);
    if (kind === 'gutter' && !g.sim.gutter) g.status.textContent = tt('pins', { n: 0 });
    g.phase = 'fallen'; g.kind = kind;
    this.onRoll?.(down.length, kind);
    this.timer = setTimeout(() => this.nextBall(), kind === 'strike' ? 1700 : 1300);
  }
  finish() {
    const total = bowlingScores(this.game.rolls).at(-1) ?? 0;
    const rec = saveActivity(this.store, BOWL_KEY, total);
    this._end(tt('bDone', { n: total }) + (rec && total > 0 ? '  ' + tt('record') : ''), () => this.play());
  }
  draw(t) {
    const g = this.game, c = g.c;
    // What to show: the playback frame while rolling, else the rack.
    let ball, pins;
    if (g.sim && (g.phase === 'roll' || g.phase === 'fallen')) {
      const fr = g.sim.frames, k = Math.min(fr.length - 1, Math.floor((t - g.at) * 60));
      const f = fr[k];
      ball = { x: f.b[0], z: f.b[1], roll: f.b[2] };
      pins = g.rack.map((p, j) => ({ x: f.p[j][0], z: f.p[j][1], tilt: f.p[j][2], heading: f.p[j][3], gone: f.p[j][4] }));
      if (!g.hit && g.sim.hitAt != null && k / 60 >= g.sim.hitAt) { g.hit = true; this.onHit?.(); }
    } else {
      ball = { x: throwFrom({ stance: this.stance }).x, z: 0, roll: 0 };
      pins = g.rack.map((p) => ({ x: p.x, z: p.z, tilt: 0, heading: 0, gone: 0 }));
    }
    if (g.live) { this.drawLive(t, ball, pins); return; }
    // The camera stands behind the foul line and follows the ball down.
    const camZ = Math.max(-2.8, Math.min(LANE_LEN - 3.6, ball.z - 2.8));
    const u = (camZ + 2.8) / (LANE_LEN - 0.8);
    const camY = 1.5 - 0.45 * u, camX = ball.x * 0.35 * u;
    const P = (x, y, z) => { const d = Math.max(0.05, z - camZ); return [W / 2 + (F * (x - camX)) / d, HZ + (F * (camY - y)) / d, d]; };
    const near = camZ + 0.35;
    const quad = (x0, x1, z0, z1, color, y0 = 0, y1 = 0) => {
      z0 = Math.max(z0, near); if (z1 <= z0) return;
      const a = P(x0, y0, z0), b = P(x1, y1, z0), cc = P(x1, y1, z1), d = P(x0, y0, z1);
      c.fillStyle = color; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill();
    };
    const deckZ = LANE_LEN - 0.6, end = LANE_LEN + 1.05;
    c.fillStyle = '#15161b'; c.fillRect(0, 0, W, H);
    // The side walls and, past the deck, the dark pit.
    quad(-1.6, -LANE_HALF - 0.24, -3, end, '#23252d'); quad(LANE_HALF + 0.24, 1.6, -3, end, '#23252d');
    quad(-LANE_HALF - 0.24, LANE_HALF + 0.24, end, end + 1.2, '#050506');
    // The approach, the lane and the pin deck; the gutters either side.
    quad(-LANE_HALF - 0.24, LANE_HALF + 0.24, -3, 0, '#e3c18e');
    quad(-LANE_HALF, LANE_HALF, 0, deckZ, '#d9a86a');
    quad(-LANE_HALF, LANE_HALF, deckZ, end, '#e8c48f');
    for (const s of [-1, 1]) {
      quad(s * LANE_HALF, s * (LANE_HALF + 0.235), 0, end, '#3a3f47');
      // The kickback: the wall beside the pin deck that pins bounce off.
      const a = P(s * (LANE_HALF + 0.24), 0, Math.max(deckZ, near)), b = P(s * (LANE_HALF + 0.24), 0.5, Math.max(deckZ, near)), cc = P(s * (LANE_HALF + 0.24), 0.5, end), d = P(s * (LANE_HALF + 0.24), 0, end);
      c.fillStyle = '#30333c'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill();
    }
    // Boards every five, the foul line, the dots and the arrows.
    c.strokeStyle = 'rgba(120,80,40,0.25)'; c.lineWidth = 1;
    for (let bd = 5; bd < 39; bd += 5) {
      const x = -LANE_HALF + bd * BOARD, a = P(x, 0, Math.max(0, near)), b = P(x, 0, deckZ);
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    quad(-LANE_HALF - 0.24, LANE_HALF + 0.24, -0.02, 0.02, '#d9473c');
    c.fillStyle = '#5a3a22';
    for (const bd of [5, 10, 15, 20, 25, 30, 35]) {
      const x = LANE_HALF - bd * BOARD, z = 3.66 + (20 - Math.abs(20 - bd)) * 0.061;
      if (z > near) { const a = P(x, 0, z + 0.15), b = P(x - 0.025, 0, z - 0.05), cc = P(x + 0.025, 0, z - 0.05); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.fill(); }
      if (2.13 > near) { const [dx, dy, d] = P(x, 0, 2.13); c.beginPath(); c.ellipse(dx, dy, (0.012 * F) / d, (0.006 * F) / d, 0, 0, Math.PI * 2); c.fill(); }
    }
    // Your line while you aim: out to the arrows.
    if (g.phase === 'aim' || g.phase === 'power') {
      const aim = g.phase === 'aim' ? this.aimAt(t - g.t0) : g.aim, th = throwFrom({ aim }).angle;
      c.strokeStyle = g.phase === 'aim' ? 'rgba(255,211,110,0.9)' : 'rgba(255,211,110,0.5)'; c.lineWidth = 3; c.setLineDash([10, 8]);
      const a = P(ball.x, 0.01, 0.15), b = P(ball.x + Math.tan(th) * 6, 0.01, 6);
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
      if (this.spin) { // which way it will hook
        const [hx, hy] = P(ball.x + Math.tan(th) * 6, 0.01, 6);
        c.fillStyle = 'rgba(255,211,110,0.9)'; c.font = 'bold 18px system-ui'; c.textAlign = 'center';
        c.fillText(SPIN_ICON[SPINS.indexOf(this.spin)], hx, hy - 6);
      }
    }
    // The ball and the pins, far ones first.
    const things = pins.filter((p) => !p.gone && p.z < end).map((p) => ({ z: p.z, draw: () => drawPin(c, P, p) }));
    things.push({ z: ball.z, draw: () => drawBall(c, P, ball, near) });
    things.sort((a, b) => b.z - a.z).forEach((o) => o.draw());
    // The power meter.
    if (g.phase === 'power') {
      const pw = this.powerAt(t - g.t0);
      c.fillStyle = '#2b2d36'; c.fillRect(W - 46, 90, 22, 220);
      c.fillStyle = pw > 0.85 ? '#d9473c' : pw > 0.45 ? '#4caf7a' : '#ffd36e'; c.fillRect(W - 46, 90 + 220 * (1 - pw), 22, 220 * pw);
      c.fillStyle = '#fff'; c.font = 'bold 12px system-ui'; c.textAlign = 'center';
      c.fillText(String(Math.round(throwFrom({ power: pw }).speed * 3.6)), W - 35, 84);
    }
    // The rack as the screen above a real lane shows it: pins still up.
    const standing = new Set(g.phase === 'fallen' ? g.sim.left.map((p) => p.i) : g.rack.map((p) => p.i));
    PINS.forEach((p, i) => {
      const x = 46 + (p.x / PIN_GAP) * 16, y = H - 22 - p.row * 14;
      c.fillStyle = standing.has(i) ? '#fbfaf6' : 'rgba(255,255,255,0.15)';
      c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
    });
    drawSheet(c, g);
    if (g.phase === 'fallen' && (g.kind === 'strike' || g.kind === 'spare' || g.kind === 'split')) {
      c.fillStyle = g.kind === 'split' ? '#ff9a6e' : '#ffd36e'; c.font = '900 40px system-ui'; c.textAlign = 'center';
      c.fillText(tt(g.kind), W / 2, H / 2 + 20);
    }
  }
}
// The score sheet along the top: ten frames, three boxes in the last.
function drawSheet(c, g) {
  const frames = frameRolls(g.rolls), totals = bowlingScores(g.rolls);
  const fw = (W - 12) / (FRAMES + 0.5);
  for (let f = 0; f < FRAMES; f++) {
    const x = 6 + f * fw, w = f === FRAMES - 1 ? fw * 1.5 : fw;
    c.fillStyle = g.turn?.frame === f && !g.turn?.over ? '#3a3f6a' : '#2b2d36'; c.fillRect(x + 1, 4, w - 2, 44);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.font = '9px system-ui'; c.textAlign = 'left'; c.fillText(String(f + 1), x + 4, 13);
    c.fillStyle = '#fff'; c.font = 'bold 12px system-ui'; c.textAlign = 'right';
    c.fillText(frames[f] ? frameMarks(frames[f]).join(' ') : '', x + w - 5, 16);
    c.font = 'bold 14px system-ui'; c.textAlign = 'center';
    c.fillText(totals[f] != null ? String(totals[f]) : '', x + w / 2, 41);
  }
}
const freshRack = () => PINS.map((_, i) => ({ i, ...rackSpot(i) }));
// A pin as a few thick strokes up its axis, tipping over towards its heading.
const PIN_PARTS = [[0, 0.28, 0.1, '#fbfaf6'], [0.28, 0.5, 0.12, '#fbfaf6'], [0.5, 0.62, 0.07, '#fbfaf6'], [0.62, 0.7, 0.05, '#d9473c'], [0.7, 0.9, 0.055, '#fbfaf6']];
function drawPin(c, P, p) {
  const tip = p.tilt * (Math.PI / 2) * 0.97, sx = Math.sin(tip) * Math.sin(p.heading), sz = Math.sin(tip) * Math.cos(p.heading), cy = Math.cos(tip);
  const at = (f) => P(p.x + sx * PIN_H * f, PIN_H * f * cy + (p.tilt > 0.9 ? 0.05 : 0), p.z + sz * PIN_H * f);
  c.lineCap = 'round';
  for (const [f0, f1, w, col] of PIN_PARTS) {
    const a = at(f0), b = at(f1);
    c.strokeStyle = col; c.lineWidth = Math.max(1, (w * F) / a[2]);
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  c.lineCap = 'butt';
}
function drawBall(c, P, b, near) {
  if (b.z < near - 0.3 || b.z > LANE_LEN + 1.05) return; // behind the camera, or in the pit
  const [x, y, d] = P(b.x, BALL_R, Math.max(b.z, near));
  const r = (BALL_R * F) / d;
  c.fillStyle = 'rgba(0,0,0,0.25)'; const s = P(b.x, 0, Math.max(b.z, near)); c.beginPath(); c.ellipse(s[0], s[1], r, r * 0.3, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a64c8'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  // The finger holes turn as it rolls.
  const k = Math.cos(b.roll), vis = Math.sin(b.roll) > -0.2;
  if (vis) { c.fillStyle = '#1d2a55'; for (const [dx, dy] of [[-0.25, -0.3], [0.2, -0.35], [0, 0.15]]) { c.beginPath(); c.arc(x + dx * r, y + (dy * k) * r, r * 0.12, 0, Math.PI * 2); c.fill(); } }
}

// ── Climbing ─────────────────────────────────────────────────────────────
export class ClimbUI extends Panel {
  // onTop(route) when you top a problem; onFall().
  // view: the climb on the room's real wall (game/climb-view.js; without it
  // the panel draws its own wall).
  constructor({ root, store, onTop, onFall, view = null }) {
    super({ root, store, icon: '🧗', title: 'cTitle' });
    Object.assign(this, { onTop, onFall, view });
    this.route = CLIMB_ROUTES[0];
  }
  renderStart(note) {
    this._frame();
    this.root.append(el('p', 'order-hint', tt('cHow')));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const rec = loadActivity(this.store);
    const row = el('div', 'arcade-speeds');
    CLIMB_ROUTES.forEach((r, i) => {
      const open = climbOpen(rec, r);
      const b = el('button', 'chip arcade-speed');
      b.setAttribute('aria-pressed', String(r === this.route));
      b.disabled = !open;
      const name = el('strong', null, r.grade);
      name.style.borderLeft = `14px solid ${r.color}`;
      name.style.paddingLeft = '6px';
      const best = rec.climb?.[r.id];
      b.append(name, el('small', null, !open ? tt('cLocked', { g: CLIMB_ROUTES[i - 1].grade }) : best != null ? tt('cBest', { s: best }) : tt('cOpen')));
      b.onclick = () => { this.route = r; this.renderStart(); };
      row.append(b);
    });
    this.root.append(row);
    if (!climbOpen(rec, this.route)) this.route = CLIMB_ROUTES[0];
    this._actions(this._button('🧗 ' + tt('cStart', { g: this.route.grade }), true, () => this.play()));
  }
  play() {
    const r = this.route;
    const g = this._play({ route: r, holds: routeHolds(r), at: 0, grip: 1, t0: now(), start: now(), last: now(), flash: null }, '✋ ' + tt('reach'));
    g.status.textContent = `${r.grade} · ${tt('reach')}!`;
    // On the room's real wall: the panel keeps a strip (your grip and how
    // far up you are) and the button; tapping the world reaches too.
    g.live = !!this.view?.start(this.root, r, g.holds);
    if (g.live) {
      this.root.classList.add('arcade-live');
      g.cv.height = 52;
      g.cv.classList.add('bowl-sheet');
      const surface = this.view.surface, down = (e) => { if (e.isPrimary !== false) this.tap(); };
      surface.addEventListener('pointerdown', down);
      g.unswipe = () => surface.removeEventListener('pointerdown', down);
    }
  }
  tap() {
    const g = this.game;
    if (!g || g.over) return;
    const phase = ((now() - g.t0) / g.route.period) % 1;
    const res = judgeReach(phase, g.route);
    g.grip = gripAfter(g.grip, res);
    g.flash = { res, at: now() };
    g.status.textContent = tt(res);
    if (res !== 'slip') g.at++;
    g.t0 = now();
    if (g.live) this.view.reach(res, g.at);
    if (g.at >= g.holds.length - 1) this.top();
    else if (g.grip <= 0) this.fall();
  }
  top() {
    const g = this.game;
    g.over = true;
    const s = Math.round((now() - g.start) * 10) / 10;
    const rec = saveActivity(this.store, 'climb', s, g.route.id);
    if (g.live) this.view.top(() => this.onTop?.(g.route)); // (the cheer once you are down on the mat)
    else this.onTop?.(g.route);
    this.timer = setTimeout(() => this.renderStart(tt('topped', { g: g.route.grade, s }) + (rec ? '  ' + tt('record') : '')), g.live ? 2200 : 900);
  }
  fall() {
    const g = this.game;
    g.over = true;
    this.onFall?.();
    if (g.live) this.view.fall();
    this.timer = setTimeout(() => this.renderStart(tt('fell')), g.live ? 1300 : 700);
  }
  draw(t) {
    const g = this.game, c = g.c;
    if (!g.over) {
      g.grip = gripDrain(g.grip, g.route, t - g.last);
      if (g.grip <= 0) this.fall();
    }
    g.last = t;
    if (g.live) { this.drawLive(t); return; }
    // The wall, plywood with bolt holes, and the mat at the bottom.
    c.fillStyle = '#e8e2d6'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 18; y < H; y += 30) for (let x = 18 + ((y / 30) % 2) * 15; x < W; x += 30) c.fillRect(x, y, 2, 2);
    c.fillStyle = '#2f6fb5'; c.fillRect(0, H - 14, W, 14);
    const pos = ([x, y]) => [60 + x * (W - 160), H - 24 - y * (H - 44)];
    // Other routes' holds in grey, so you have to follow your colour.
    for (const other of CLIMB_ROUTES) if (other !== g.route) for (const h of routeHolds(other)) { const [x, y] = pos(h); c.fillStyle = 'rgba(120,120,120,0.35)'; c.beginPath(); c.arc(x + 9, y + 4, 6, 0, Math.PI * 2); c.fill(); }
    g.holds.forEach((h, i) => {
      const [x, y] = pos(h);
      c.fillStyle = g.route.color; c.beginPath(); c.arc(x, y, i === g.holds.length - 1 ? 11 : 9, 0, Math.PI * 2); c.fill();
      if (i === g.holds.length - 1) { c.fillStyle = '#2b2b2e'; c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillText('TOP', x, y - 15); }
    });
    // You, holding on, and the closing ring on the next hold.
    const [cx, cy] = pos(g.holds[g.at]);
    c.fillStyle = '#ff8a5c'; c.beginPath(); c.arc(cx, cy + 22, 11, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ff8a5c'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx, cy + 12); c.lineTo(cx, cy); c.stroke();
    if (!g.over && g.at + 1 < g.holds.length) {
      const [nx, ny] = pos(g.holds[g.at + 1]);
      const phase = ((t - g.t0) / g.route.period) % 1;
      c.strokeStyle = '#2b2b2e'; c.lineWidth = 3;
      c.beginPath(); c.arc(nx, ny, 11 + (1 - phase) * 42, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(43,43,46,0.25)'; c.lineWidth = 2; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(nx, ny); c.stroke(); c.setLineDash([]);
    }
    if (g.flash && t - g.flash.at < 0.6) {
      c.fillStyle = g.flash.res === 'slip' ? '#d9473c' : '#2e9a5a'; c.font = '900 24px system-ui'; c.textAlign = 'center';
      c.fillText(tt(g.flash.res), cx, cy - 22);
    }
    // The grip bar.
    c.fillStyle = '#2b2d36'; c.fillRect(W - 46, 30, 22, H - 70);
    c.fillStyle = g.grip < 0.25 ? '#d9473c' : g.grip < 0.5 ? '#ffb84a' : '#4caf7a';
    c.fillRect(W - 46, 30 + (H - 70) * (1 - g.grip), 22, (H - 70) * g.grip);
    c.fillStyle = '#2b2b2e'; c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillText(tt('grip'), W - 35, 22);
  }
  // On the real wall: the ring goes to the world; the strip shows your grip
  // and a dot for each hold, filled up to where you are.
  drawLive(t) {
    const g = this.game, c = g.c, h = g.cv.height;
    this.view.show(g.over ? 0 : ((t - g.t0) / g.route.period) % 1);
    c.clearRect(0, 0, W, h);
    c.fillStyle = '#2b2d36'; c.beginPath(); c.roundRect(0, 0, W, h, 10); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 24px system-ui'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(`${g.route.grade} · ${tt('grip')}`, 16, h / 2, 150);
    const x0 = 175, bw = 190;
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x0, h / 2 - 12, bw, 24);
    c.fillStyle = g.grip < 0.25 ? '#d9473c' : g.grip < 0.5 ? '#ffb84a' : '#4caf7a';
    c.fillRect(x0, h / 2 - 12, bw * g.grip, 24);
    const n = g.holds.length, gap = Math.min(30, (W - x0 - bw - 40) / (n - 1));
    for (let i = 0; i < n; i++) {
      c.fillStyle = i <= g.at ? g.route.color : 'rgba(255,255,255,0.22)';
      c.beginPath(); c.arc(x0 + bw + 26 + i * gap, h / 2, i === n - 1 ? 10 : 7, 0, Math.PI * 2); c.fill();
    }
    c.textBaseline = 'alphabetic';
  }
}

// ── Aim (PC방) ───────────────────────────────────────────────────────────
export class AimUI extends Panel {
  // onHit() for each target hit.
  constructor({ root, store, onHit, rand = Math.random }) {
    super({ root, store, icon: '🎮', title: 'aTitle' });
    Object.assign(this, { onHit, rand });
  }
  renderStart(note) {
    this._frame();
    this.root.append(el('p', 'order-hint', tt('aHow')));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const best = loadActivity(this.store).aim;
    if (best != null) { const tier = aimTier(best); this.root.append(el('p', 'order-hint claw-note', tt('aBest', { n: best, tier: `${tier.icon} ${tt(tier.id)}` }))); }
    this._actions(this._button('🎮 ' + tt('aStart'), true, () => this.play()));
  }
  play() {
    const g = this._play({ start: now(), score: 0, hits: 0, misses: 0, target: null, pops: [] });
    g.cv.style.cursor = 'crosshair';
    g.cv.onpointerdown = (e) => {
      e.preventDefault();
      const r = g.cv.getBoundingClientRect();
      this.shoot(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
    };
    this.spawn();
  }
  tap() {}
  spawn() {
    const g = this.game, t = now() - g.start, rad = aimRadius(t) * W;
    g.target = { x: rad + this.rand() * (W - rad * 2), y: 40 + rad + this.rand() * (H - 50 - rad * 2), r: rad, born: now(), life: aimLife(t) };
  }
  shoot(x, y) {
    const g = this.game;
    if (!g || g.over) return;
    const tg = g.target;
    if (tg && Math.hypot(x - tg.x, y - tg.y) <= tg.r) {
      g.score += aimPoints((now() - tg.born) * 1000);
      g.hits++;
      g.pops.push({ x: tg.x, y: tg.y, at: now() });
      this.onHit?.();
      this.spawn();
    } else {
      g.score = Math.max(0, g.score - AIM_MISS);
      g.misses++;
    }
  }
  finish() {
    const g = this.game;
    g.over = true;
    const tier = aimTier(g.score);
    const rec = saveActivity(this.store, 'aim', g.score);
    const note = `${tt('aDone', { n: g.score, hits: g.hits, acc: accuracy(g.hits, g.misses) })}  ${tier.icon} ${tt('aRank', { tier: tt(tier.id) })}` + (rec && g.score > 0 ? '  ' + tt('record') : '');
    this._end(note, () => this.play());
  }
  draw(t) {
    const g = this.game, c = g.c;
    const left = AIM_SECONDS - (t - g.start);
    if (left <= 0) { this.finish(); return; }
    if (g.target && t - g.target.born > g.target.life) { g.misses++; this.spawn(); } // too slow
    c.fillStyle = '#0d0e17'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(90,209,255,0.12)'; c.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y <= H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    const tg = g.target;
    if (tg) {
      const k = 1 - (t - tg.born) / tg.life; // shrinks as it fades
      const r = tg.r * (0.55 + 0.45 * k);
      for (const [f, col] of [[1, '#ff5aa8'], [0.66, '#fbfaf6'], [0.33, '#ff5aa8']]) { c.fillStyle = col; c.beginPath(); c.arc(tg.x, tg.y, r * f, 0, Math.PI * 2); c.fill(); }
      tg.hitR = r;
    }
    for (const p of g.pops) { const a = 1 - (t - p.at) / 0.4; if (a > 0) { c.strokeStyle = `rgba(90,209,255,${a})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 20 + (1 - a) * 30, 0, Math.PI * 2); c.stroke(); } }
    g.pops = g.pops.filter((p) => t - p.at < 0.4);
    c.fillStyle = '#5ad1ff'; c.font = 'bold 18px system-ui'; c.textAlign = 'left';
    c.fillText(`⏱ ${Math.ceil(left)}s`, 12, 26);
    c.textAlign = 'right'; c.fillText(`${g.score}`, W - 12, 26);
    g.status.textContent = `🎯 ${g.hits} · ${accuracy(g.hits, g.misses)}%`;
  }
}
