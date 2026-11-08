// Panels for the modern activities (rules in core/activities.js): bowling,
// the climbing wall and the PC방 aim game. Free to play, records only.
// Loaded the first time you play one (game/arcade.js).
import {
  PINS, FRAMES, rollBall, frameRolls, bowlingScores, bowlingTurn, frameMarks, ballX, LANE_HALF,
  CLIMB_ROUTES, routeHolds, judgeReach, gripAfter, gripDrain, climbOpen,
  AIM_SECONDS, aimLife, aimRadius, aimPoints, AIM_MISS, aimTier, accuracy,
  loadActivity, saveActivity,
} from '../core/activities.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', id: 'Tutup', vi: 'Đóng', hi: 'बंद करें', fr: 'Fermer', th: 'ปิด', ar: 'إغلاق' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次', es: 'Otra vez', id: 'Lagi', vi: 'Lần nữa', hi: 'फिर से', fr: 'Rejouer', th: 'อีกครั้ง', ar: 'مرة أخرى' },
  record: { en: '🏆 New personal best!', ko: '🏆 내 최고 기록 경신!', ja: '🏆 自己ベスト更新！', zh: '🏆 刷新个人纪录！', es: '🏆 ¡Nuevo récord personal!', id: '🏆 Rekor pribadi baru!', vi: '🏆 Kỷ lục cá nhân mới!', hi: '🏆 नया निजी रिकॉर्ड!', fr: '🏆 Nouveau record perso !', th: '🏆 ทำสถิติใหม่!', ar: '🏆 رقم شخصي جديد!' },
  // Bowling
  bTitle: { en: 'Bowling', ko: '볼링', ja: 'ボウリング', zh: '保龄球', es: 'Bolos', id: 'Bowling', vi: 'Bowling', hi: 'बॉलिंग', fr: 'Bowling', th: 'โบว์ลิ่ง', ar: 'البولينغ' },
  bHow: {
    en: 'A quick 5-frame game with real scoring. Tap once to stop the ball where you aim (just right of the middle pin is the pocket), then again to pick your power. Free: beat your best score.',
    ko: '진짜 점수 규칙으로 하는 5프레임 빠른 게임. 한 번 눌러 공의 방향을 멈추고(가운데 핀 살짝 오른쪽이 포켓), 한 번 더 눌러 힘을 정해요. 무료, 내 최고 점수에 도전!',
    ja: '本物のスコアで遊ぶ5フレームの早撃ちゲーム。1回目のタップで狙いを止め（真ん中のピンの少し右がポケット）、2回目で力を決めます。無料、自己ベストに挑戦！',
    zh: '用真实计分规则的5局快速赛。第一次点击停住方向（中间球瓶稍右是最佳击球点），第二次点击决定力度。免费，挑战最高分！',
    es: 'Partida rápida de 5 frames con puntuación real. Toca para fijar la dirección (justo a la derecha del bolo central está el bolsillo) y otra vez para la fuerza. Gratis: supera tu récord.',
    id: 'Permainan cepat 5 frame dengan skor asli. Ketuk sekali untuk mengunci arah (sedikit kanan pin tengah adalah pocket), lalu sekali lagi untuk tenaga. Gratis: kalahkan skor terbaikmu.',
    vi: 'Ván nhanh 5 frame với cách tính điểm thật. Chạm một lần để chốt hướng (hơi lệch phải ki giữa là điểm vàng), chạm lần nữa để chọn lực. Miễn phí: phá kỷ lục của bạn.',
    hi: 'असली स्कोरिंग के साथ 5 फ़्रेम का तेज़ खेल। एक बार टैप करके निशाना रोकें (बीच वाली पिन के ठीक दाएँ पॉकेट है), फिर ताक़त चुनें। मुफ़्त: अपना बेस्ट स्कोर तोड़ें।',
    fr: 'Partie rapide en 5 frames avec le vrai calcul des points. Touche pour fixer la visée (juste à droite de la quille du milieu, c\'est la poche), puis pour la puissance. Gratuit : bats ton record.',
    th: 'เกมเร็ว 5 เฟรมนับคะแนนจริง แตะครั้งแรกเพื่อหยุดทิศ (ขวาของพินกลางนิดหน่อยคือพ็อกเก็ต) แตะอีกครั้งเพื่อเลือกแรง เล่นฟรี ทำลายสถิติตัวเอง',
    ar: 'لعبة سريعة من 5 جولات بحساب نقاط حقيقي. انقر لتثبيت الاتجاه (يمين القارورة الوسطى قليلًا هو الجيب)، ثم انقر لاختيار القوة. مجانية: حطّم رقمك.',
  },
  bStart: { en: 'Start · {n} frames', ko: '시작 · {n}프레임', ja: 'スタート・{n}フレーム', zh: '开始 · {n}局', es: 'Empezar · {n} frames', id: 'Mulai · {n} frame', vi: 'Bắt đầu · {n} frame', hi: 'शुरू · {n} फ़्रेम', fr: 'Commencer · {n} frames', th: 'เริ่ม · {n} เฟรม', ar: 'ابدأ · {n} جولات' },
  bBest: { en: 'Best score: {n}', ko: '최고 점수: {n}', ja: 'ベストスコア：{n}', zh: '最高分：{n}', es: 'Mejor puntuación: {n}', id: 'Skor terbaik: {n}', vi: 'Điểm cao nhất: {n}', hi: 'बेस्ट स्कोर: {n}', fr: 'Meilleur score : {n}', th: 'คะแนนสูงสุด: {n}', ar: 'أفضل نتيجة: {n}' },
  bAim: { en: 'Frame {f} · ball {b}: tap to aim', ko: '{f}프레임 {b}구: 눌러서 방향', ja: '{f}フレーム {b}投目：タップで狙い', zh: '第{f}局 第{b}球：点击定方向', es: 'Frame {f} · bola {b}: toca para apuntar', id: 'Frame {f} · bola {b}: ketuk untuk membidik', vi: 'Frame {f} · bóng {b}: chạm để ngắm', hi: 'फ़्रेम {f} · बॉल {b}: निशाने के लिए टैप', fr: 'Frame {f} · boule {b} : touche pour viser', th: 'เฟรม {f} · ลูก {b}: แตะเพื่อเล็ง', ar: 'الجولة {f} · الكرة {b}: انقر للتصويب' },
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
export class BowlingUI extends Panel {
  // onRoll(pinsDown, kind) after each ball ('strike', 'spare', 'gutter', 'pins').
  constructor({ root, store, onRoll, rand = Math.random }) {
    super({ root, store, icon: '🎳', title: 'bTitle' });
    Object.assign(this, { onRoll, rand });
  }
  renderStart() {
    this._frame();
    this.root.append(el('p', 'order-hint', tt('bHow')));
    const best = loadActivity(this.store).bowling;
    if (best != null) this.root.append(el('p', 'order-hint claw-note', tt('bBest', { n: best })));
    this._actions(this._button('🎳 ' + tt('bStart', { n: FRAMES }), true, () => this.play()));
  }
  play() {
    this._play({ rolls: [], standing: PINS.map((_, i) => i), phase: 'aim', t0: now(), aim: 0, power: 0, roll: null }, '🎳 ' + tt('bThrow'));
    this.nextBall();
  }
  nextBall() {
    const g = this.game;
    if (!g) return;
    const turn = bowlingTurn(g.rolls);
    if (turn.over) { this.finish(); return; }
    if (turn.fresh) g.standing = PINS.map((_, i) => i);
    g.turn = turn;
    g.phase = 'aim'; g.t0 = now(); g.roll = null;
    g.status.textContent = tt('bAim', { f: turn.frame + 1, b: turn.ball + 1 });
  }
  tap() {
    const g = this.game;
    if (!g) return;
    const t = now() - g.t0;
    if (g.phase === 'aim') {
      g.aim = Math.sin(t * 2.3) * 1.05;
      g.phase = 'power'; g.t0 = now();
      g.status.textContent = tt('bPower');
    } else if (g.phase === 'power') {
      g.power = (1 - Math.cos(t * 3.2)) / 2;
      const down = rollBall({ aim: g.aim, power: g.power, standing: g.standing, first: g.turn.ball === 0 || g.turn.fresh, rand: this.rand });
      g.phase = 'roll';
      g.roll = { at: now(), down };
      this.timer = setTimeout(() => this.land(), 1100);
    }
  }
  land() {
    const g = this.game;
    if (!g) return;
    const { down } = g.roll;
    const wasFull = g.standing.length === 10;
    g.standing = g.standing.filter((i) => !down.includes(i));
    g.rolls.push(down.length);
    const kind = down.length === 0 ? 'gutter' : !g.standing.length ? (wasFull ? 'strike' : 'spare') : 'pins';
    g.status.textContent = kind === 'pins' ? tt('pins', { n: down.length }) : tt(kind);
    g.phase = 'fallen';
    this.onRoll?.(down.length, kind);
    this.timer = setTimeout(() => this.nextBall(), kind === 'strike' ? 1600 : 1200);
  }
  finish() {
    const total = bowlingScores(this.game.rolls).at(-1) ?? 0;
    const rec = saveActivity(this.store, 'bowling', total);
    this._end(tt('bDone', { n: total }) + (rec && total > 0 ? '  ' + tt('record') : ''), () => this.play());
  }
  draw(t) {
    const g = this.game, c = g.c;
    // The lane, seen from the approach: wide at the bottom, narrow at the pins.
    c.fillStyle = '#1d1f26'; c.fillRect(0, 0, W, H);
    const top = 70, bot = H - 20, wTop = 120, wBot = 360;
    const xAt = (lx, y) => W / 2 + (lx / LANE_HALF) * ((wTop + (wBot - wTop) * ((y - top) / (bot - top))) / 2);
    c.fillStyle = '#d9a86a';
    c.beginPath(); c.moveTo(W / 2 - wTop / 2, top); c.lineTo(W / 2 + wTop / 2, top); c.lineTo(W / 2 + wBot / 2, bot); c.lineTo(W / 2 - wBot / 2, bot); c.closePath(); c.fill();
    c.fillStyle = '#3a3f47';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(W / 2 + s * wTop / 2, top); c.lineTo(W / 2 + s * (wTop / 2 + 14), top); c.lineTo(W / 2 + s * (wBot / 2 + 34), bot); c.lineTo(W / 2 + s * wBot / 2, bot); c.closePath(); c.fill(); }
    c.fillStyle = '#5a3a22'; // the arrows
    for (let k = -2; k <= 2; k++) { const y = bot - 70 - Math.abs(k) * 8, x = xAt(k * 0.13, y); c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x - 5, y + 4); c.lineTo(x + 5, y + 4); c.fill(); }
    // The pins (seen from the front: back row higher up).
    const fallen = g.roll && g.phase !== 'roll' ? [] : null;
    const rollT = g.roll ? Math.min(1, (t - g.roll.at) / 1.0) : 0;
    PINS.forEach((p, i) => {
      const up = g.standing.includes(i);
      const goingDown = g.roll?.down.includes(i) && rollT >= 1;
      if (!up && !goingDown && !(g.roll?.down.includes(i))) return;
      const y = top - 6 - p.row * 9, x = W / 2 + p.x * 160;
      if (goingDown || (!up && fallen)) { c.fillStyle = 'rgba(251,250,246,0.35)'; c.fillRect(x - 8, y + 4, 16, 5); return; }
      c.fillStyle = '#fbfaf6'; c.fillRect(x - 4, y - 16, 8, 22);
      c.fillStyle = '#d9473c'; c.fillRect(x - 4, y - 10, 8, 3);
    });
    // The ball: sliding side to side while you aim, then rolling.
    let bx, by = bot - 16, r = 15;
    const ph = t - g.t0;
    if (g.phase === 'aim') bx = xAt(ballX(Math.sin(ph * 2.3) * 1.05), by);
    else if (g.phase === 'power') bx = xAt(ballX(g.aim), by);
    else if (g.phase === 'roll') {
      const u = rollT;
      by = bot - 16 - (bot - 16 - top) * u;
      r = 15 - 9 * u;
      const lx = Math.max(-LANE_HALF - 0.05, Math.min(LANE_HALF + 0.05, ballX(g.aim)));
      bx = xAt(lx, by);
    }
    if (bx != null) {
      c.fillStyle = '#3a64c8'; c.beginPath(); c.arc(bx, by, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1d2a55'; for (const [dx, dy] of [[-4, -4], [3, -5], [0, 2]]) { c.beginPath(); c.arc(bx + dx * r / 15, by + dy * r / 15, 2 * r / 15, 0, Math.PI * 2); c.fill(); }
    }
    // The power meter.
    if (g.phase === 'power') {
      const pw = (1 - Math.cos(ph * 3.2)) / 2;
      c.fillStyle = '#2b2d36'; c.fillRect(W - 46, 90, 22, 220);
      c.fillStyle = '#4caf7a'; c.fillRect(W - 46, 90 + 220 * (1 - 0.95), 22, 220 * 0.25); // the sweet spot
      c.fillStyle = pw > 0.95 ? '#d9473c' : '#ffd36e'; c.fillRect(W - 46, 90 + 220 * (1 - pw), 22, 220 * pw);
    }
    // The score sheet along the top.
    const frames = frameRolls(g.rolls), totals = bowlingScores(g.rolls);
    const fw = (W - 20) / FRAMES;
    for (let f = 0; f < FRAMES; f++) {
      const x = 10 + f * fw;
      c.fillStyle = g.turn?.frame === f ? '#3a3f6a' : '#2b2d36'; c.fillRect(x + 1, 4, fw - 2, 40);
      c.fillStyle = '#fff'; c.font = 'bold 14px system-ui'; c.textAlign = 'center';
      c.fillText(frames[f] ? frameMarks(frames[f]).join(' ') : '', x + fw / 2, 20);
      c.font = 'bold 15px system-ui';
      c.fillText(totals[f] != null ? String(totals[f]) : '', x + fw / 2, 39);
    }
    if (g.phase === 'fallen' && !g.standing.length) {
      c.fillStyle = '#ffd36e'; c.font = '900 40px system-ui'; c.textAlign = 'center';
      c.fillText(g.rolls.length && g.status.textContent, W / 2, H / 2 + 20);
    }
  }
}

// ── Climbing ─────────────────────────────────────────────────────────────
export class ClimbUI extends Panel {
  // onTop(route) when you top a problem; onFall().
  constructor({ root, store, onTop, onFall }) {
    super({ root, store, icon: '🧗', title: 'cTitle' });
    Object.assign(this, { onTop, onFall });
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
    this._play({ route: r, holds: routeHolds(r), at: 0, grip: 1, t0: now(), start: now(), last: now(), flash: null }, '✋ ' + tt('reach'));
    this.game.status.textContent = `${r.grade} · ${tt('reach')}!`;
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
    if (g.at >= g.holds.length - 1) this.top();
    else if (g.grip <= 0) this.fall();
  }
  top() {
    const g = this.game;
    g.over = true;
    const s = Math.round((now() - g.start) * 10) / 10;
    const rec = saveActivity(this.store, 'climb', s, g.route.id);
    this.onTop?.(g.route);
    this.timer = setTimeout(() => this.renderStart(tt('topped', { g: g.route.grade, s }) + (rec ? '  ' + tt('record') : '')), 900);
  }
  fall() {
    const g = this.game;
    g.over = true;
    this.onFall?.();
    this.timer = setTimeout(() => this.renderStart(tt('fell')), 700);
  }
  draw(t) {
    const g = this.game, c = g.c;
    if (!g.over) {
      g.grip = gripDrain(g.grip, g.route, t - g.last);
      if (g.grip <= 0) this.fall();
    }
    g.last = t;
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
