// Bumper cars in Another Land (범퍼카): get in at the gate, wait for the
// countdown, then bump each other round the rink for a minute. Up to six
// drivers a round; when a round is on (or the cars are full) take a number
// and you're called for the next one. The rink is core/bumper-rink.js, the
// driving, round clock and rules are core/bumper-cars.js.
//
// What travels in my state: bc (my car, 1..6), br (the round's go time),
// bh (how many times I rammed someone), bq (my number in line).
import * as THREE from 'three';
import { L, fmt } from '../ui/pocha-ui.js';
import { t } from '../core/i18n.js';
import { buzz, shake } from '../core/haptics.js';
import { Contacts, touching, wobble } from '../core/bump.js';
import { TarotQueue } from '../core/tarot-queue.js';
import {
  BumperCar, BUMPER_BUMP, BUMPER_COST, CAR_R, BOARD_MS, GATE, HOMES, SEATS, TURN_MS,
  MIN_DRIVERS, phaseOf, roundGo, freeSlot, settleSlot, mayBoard, freeForLine, rammedBy, ranking, tooFew,
} from '../core/bumper-cars.js';

const FLOOR_Y = 0.11; // the rink floor is a step up from the grass

export const BUMPER_TEXT = {
  board: { en: 'Ride the bumper cars · 🪙 {n}', ko: '범퍼카 타기 · 🪙 {n}', ja: 'バンパーカーに乗る · 🪙 {n}', zh: '坐碰碰车 · 🪙 {n}', es: 'Subir a los autos de choque · 🪙 {n}', ar: 'اركب سيارات التصادم · 🪙 {n}', vi: 'Chơi xe điện đụng · 🪙 {n}', hi: 'बंपर कार चलाएँ · 🪙 {n}', fr: 'Monter dans les autos tamponneuses · 🪙 {n}', th: 'ขับรถบั๊มพ์ · 🪙 {n}', id: 'Naik bom-bom car · 🪙 {n}' },
  ticket: { en: 'Take a number for the next round', ko: '다음 판 대기 번호 받기', ja: '次の回の番号を取る', zh: '取号等下一轮', es: 'Tomar número para la próxima ronda', ar: 'خذ رقمًا للجولة التالية', vi: 'Lấy số chờ lượt sau', hi: 'अगले राउंड के लिए नंबर लें', fr: 'Prendre un ticket pour la prochaine manche', th: 'รับบัตรคิวรอบถัดไป', id: 'Ambil nomor untuk ronde berikutnya' },
  took: { en: 'You\'re No. {n} in line. Look around the park; we\'ll call you.', ko: '대기 {n}번이에요. 공원을 둘러보고 계시면 불러 드릴게요.', ja: '{n}番目です。園内を回っていてください。お呼びします。', zh: '你排第{n}位。可以先逛逛，轮到时会叫你。', es: 'Eres el n.º {n}. Pasea por el parque, te llamaremos.', ar: 'أنت رقم {n} في الطابور. تجوّل في الحديقة وسننادي عليك.', vi: 'Bạn là số {n}. Cứ đi dạo, đến lượt sẽ gọi.', hi: 'आप कतार में {n} नंबर पर हैं। पार्क घूमिए, हम बुलाएँगे।', fr: 'Tu es le n° {n} dans la file. Fais un tour du parc ; on t\'appellera.', th: 'คุณเป็นคิวที่ {n} เดินเล่นในสวนสนุกได้ แล้วเราจะเรียก', id: 'Kamu nomor {n}. Jalan-jalan dulu, nanti dipanggil.' },
  line: { en: 'No. {n} in line · leave the line', ko: '대기 {n}번 · 대기 취소', ja: '{n}番目 · 列を抜ける', zh: '排第{n}位 · 取消排队', es: 'N.º {n} en la fila · salir', ar: 'رقم {n} · مغادرة الطابور', vi: 'Số {n} · rời hàng', hi: 'कतार में {n} · कतार छोड़ें', fr: 'N° {n} dans la file · quitter la file', th: 'คิวที่ {n} · ออกจากคิว', id: 'Nomor {n} · keluar antrean' },
  left: { en: 'You left the line.', ko: '대기를 취소했어요.', ja: '列を抜けました。', zh: '已取消排队。', es: 'Saliste de la fila.', ar: 'غادرت الطابور.', vi: 'Bạn đã rời hàng.', hi: 'आपने कतार छोड़ दी।', fr: 'Tu as quitté la file.', th: 'คุณออกจากคิวแล้ว', id: 'Kamu keluar dari antrean.' },
  full: { en: 'A round is on. Take a number and you\'ll be called for the next one.', ko: '지금 한 판이 진행 중이에요. 대기 번호를 받으면 다음 판에 불러 드려요.', ja: '今は走行中です。番号を取れば次の回にお呼びします。', zh: '正在进行一轮。取号后下一轮会叫你。', es: 'Hay una ronda en marcha. Toma un número y te llamaremos.', ar: 'هناك جولة جارية. خذ رقمًا وسننادي عليك للجولة التالية.', vi: 'Đang có lượt chơi. Lấy số để được gọi lượt sau.', hi: 'अभी राउंड चल रहा है। नंबर लें, अगले में बुलाएँगे।', fr: 'Une manche est en cours. Prends un ticket et on t\'appellera pour la suivante.', th: 'มีรอบกำลังเล่นอยู่ รับบัตรคิวแล้วจะเรียกในรอบถัดไป', id: 'Ronde sedang berjalan. Ambil nomor, nanti dipanggil.' },
  turn: { en: 'Your turn! Get in a bumper car · {s}s', ko: '차례예요! 범퍼카 타기 · {s}초', ja: 'あなたの番！バンパーカーへ · {s}秒', zh: '轮到你了！上碰碰车 · {s}秒', es: '¡Tu turno! Sube a un auto · {s}s', ar: 'دورك! اركب سيارة · {s}ث', vi: 'Đến lượt bạn! Lên xe · {s}giây', hi: 'आपकी बारी! कार में बैठें · {s}से', fr: 'À toi ! Monte dans une auto tamponneuse · {s} s', th: 'ถึงคิวคุณแล้ว! ขึ้นรถบั๊มพ์ · {s} วิ', id: 'Giliranmu! Naik mobil · {s}d' },
  called: { en: '🔔 Your turn for the bumper cars! Press the button within 20 seconds.', ko: '🔔 범퍼카 차례예요! 20초 안에 버튼을 눌러 주세요.', ja: '🔔 バンパーカーの番です！20秒以内にボタンを押してください。', zh: '🔔 轮到你坐碰碰车了！请在20秒内按按钮。', es: '🔔 ¡Tu turno en los autos de choque! Pulsa el botón en 20 segundos.', ar: '🔔 دورك في سيارات التصادم! اضغط الزر خلال 20 ثانية.', vi: '🔔 Đến lượt xe điện đụng! Nhấn nút trong 20 giây.', hi: '🔔 बंपर कार की आपकी बारी! 20 सेकंड में बटन दबाएँ।', fr: '🔔 À toi pour les autos tamponneuses ! Appuie sur le bouton dans les 20 secondes.', th: '🔔 ถึงคิวรถบั๊มพ์แล้ว! กดปุ่มภายใน 20 วินาที', id: '🔔 Giliranmu naik bom-bom car! Tekan tombol dalam 20 detik.' },
  missed: { en: 'Your 20 seconds ran out, so your number was cleared. Take a new one any time.', ko: '20초가 지나 대기 번호가 초기화됐어요. 언제든 다시 받을 수 있어요.', ja: '20秒が過ぎたので番号がリセットされました。いつでも取り直せます。', zh: '20秒已过，号码已清除。可以随时重新取号。', es: 'Pasaron los 20 segundos y se borró tu número. Toma otro cuando quieras.', ar: 'انتهت العشرون ثانية وأُلغي رقمك. خذ رقمًا جديدًا متى شئت.', vi: 'Hết 20 giây nên số đã bị hủy. Có thể lấy số mới bất cứ lúc nào.', hi: '20 सेकंड बीत गए, नंबर हटा दिया गया। कभी भी नया लें।', fr: 'Tes 20 secondes sont écoulées, ton ticket a été annulé. Prends-en un nouveau quand tu veux.', th: 'หมด 20 วินาทีแล้ว บัตรคิวของคุณถูกยกเลิก รับใหม่ได้ทุกเมื่อ', id: '20 detik habis, nomormu dihapus. Ambil lagi kapan saja.' },
  out: { en: 'Get out', ko: '내리기', ja: '降りる', zh: '下车', es: 'Bajar', ar: 'انزل', vi: 'Xuống xe', hi: 'उतरें', fr: 'Sortir', th: 'ลงจากรถ', id: 'Turun' },
  starts: { en: '🏁 Starts in {s}s · {n}/6 cars', ko: '🏁 {s}초 뒤 출발 · {n}/6대', ja: '🏁 {s}秒後にスタート · {n}/6台', zh: '🏁 {s}秒后开始 · {n}/6辆', es: '🏁 Empieza en {s}s · {n}/6 autos', ar: '🏁 تبدأ بعد {s}ث · {n}/6 سيارات', vi: '🏁 Bắt đầu sau {s}giây · {n}/6 xe', hi: '🏁 {s} सेकंड में शुरू · {n}/6 कारें', fr: '🏁 Départ dans {s} s · {n}/6 autos', th: '🏁 เริ่มใน {s} วิ · {n}/6 คัน', id: '🏁 Mulai {s}d lagi · {n}/6 mobil' },
  wait: { en: 'Others can still hop in. Steer with the stick once it starts!', ko: '아직 다른 사람이 탈 수 있어요. 출발하면 스틱으로 운전하세요!', ja: 'まだ他の人も乗れます。スタートしたらスティックで運転！', zh: '其他人还能上车。开始后用摇杆驾驶！', es: 'Aún pueden subir otros. ¡Conduce con el joystick al empezar!', ar: 'ما زال بإمكان الآخرين الركوب. قُد بالعصا عند البدء!', vi: 'Người khác vẫn lên được. Bắt đầu thì lái bằng cần điều khiển!', hi: 'अभी और लोग बैठ सकते हैं। शुरू होते ही स्टिक से चलाएँ!', fr: 'D\'autres peuvent encore monter. Dirige avec le stick une fois parti !', th: 'คนอื่นยังขึ้นได้อยู่ พอเริ่มแล้วบังคับด้วยจอยนะ!', id: 'Yang lain masih bisa naik. Setir pakai stik saat mulai!' },
  go: { en: 'GO! Bump away! 🏁', ko: '출발! 마구 부딪혀 보세요! 🏁', ja: 'スタート！ぶつけまくろう！🏁', zh: '出发！尽情碰撞吧！🏁', es: '¡YA! ¡A chocar! 🏁', ar: 'انطلق! اصطدم! 🏁', vi: 'XUẤT PHÁT! Đụng thôi! 🏁', hi: 'चलो! टक्कर मारो! 🏁', fr: 'PARTEZ ! Tamponnez ! 🏁', th: 'ไปเลย! ชนให้สนุก! 🏁', id: 'MULAI! Tabrak-tabrakan! 🏁' },
  clock: { en: '⏱ {s}s · 💥 {h}', ko: '⏱ {s}초 · 💥 {h}', ja: '⏱ {s}秒 · 💥 {h}', zh: '⏱ {s}秒 · 💥 {h}', es: '⏱ {s}s · 💥 {h}', ar: '⏱ {s}ث · 💥 {h}', vi: '⏱ {s}giây · 💥 {h}', hi: '⏱ {s}से · 💥 {h}', fr: '⏱ {s} s · 💥 {h}', th: '⏱ {s} วิ · 💥 {h}', id: '⏱ {s}d · 💥 {h}' },
  ready: { en: '🚀 Boost ready (Shift or 🚀)', ko: '🚀 부스터 준비 완료 (Shift 또는 🚀)', ja: '🚀 ブースト準備OK（Shift か 🚀）', zh: '🚀 加速就绪（Shift 或 🚀）', es: '🚀 Turbo listo (Shift o 🚀)', ar: '🚀 التسارع جاهز (Shift أو 🚀)', vi: '🚀 Tăng tốc sẵn sàng (Shift hoặc 🚀)', hi: '🚀 बूस्ट तैयार (Shift या 🚀)', fr: '🚀 Turbo prêt (Maj ou 🚀)', th: '🚀 บูสต์พร้อม (Shift หรือ 🚀)', id: '🚀 Boost siap (Shift atau 🚀)' },
  charging: { en: '🚀 Charging boost…', ko: '🚀 부스터 충전 중…', ja: '🚀 ブースト充電中…', zh: '🚀 加速充能中…', es: '🚀 Cargando turbo…', ar: '🚀 يُشحن التسارع…', vi: '🚀 Đang nạp tăng tốc…', hi: '🚀 बूस्ट चार्ज हो रहा है…', fr: '🚀 Turbo en charge…', th: '🚀 กำลังชาร์จบูสต์…', id: '🚀 Mengisi boost…' },
  queue: { en: '🎫 No. {n} in line · next round in {s}s', ko: '🎫 대기 {n}번 · 다음 판까지 {s}초', ja: '🎫 {n}番目 · 次の回まで {s}秒', zh: '🎫 排第{n}位 · 下一轮还有{s}秒', es: '🎫 N.º {n} · próxima ronda en {s}s', ar: '🎫 رقم {n} · الجولة التالية بعد {s}ث', vi: '🎫 Số {n} · lượt sau {s}giây nữa', hi: '🎫 कतार में {n} · अगला राउंड {s} सेकंड में', fr: '🎫 N° {n} dans la file · prochaine manche dans {s} s', th: '🎫 คิวที่ {n} · รอบถัดไปใน {s} วิ', id: '🎫 Nomor {n} · ronde berikutnya {s}d lagi' },
  over: { en: '🏁 Round over! You rammed {h} times.', ko: '🏁 끝! {h}번 들이받았어요.', ja: '🏁 終了！{h}回ぶつけました。', zh: '🏁 结束！你撞了{h}次。', es: '🏁 ¡Fin! Chocaste {h} veces.', ar: '🏁 انتهت الجولة! اصطدمت {h} مرات.', vi: '🏁 Hết lượt! Bạn đã đụng {h} lần.', hi: '🏁 राउंड खत्म! आपने {h} बार टक्कर मारी।', fr: '🏁 Manche terminée ! Tu as tamponné {h} fois.', th: '🏁 จบรอบแล้ว! คุณชนไป {h} ครั้ง', id: '🏁 Selesai! Kamu menabrak {h} kali.' },
  champ: { en: '🏆 Bump king: {name} ({h})', ko: '🏆 범퍼킹: {name} ({h}번)', ja: '🏆 バンプキング：{name}（{h}回）', zh: '🏆 碰撞王：{name}（{h}次）', es: '🏆 Rey del choque: {name} ({h})', ar: '🏆 ملك التصادم: {name} ({h})', vi: '🏆 Vua đụng xe: {name} ({h})', hi: '🏆 टक्कर किंग: {name} ({h})', fr: '🏆 Roi du tamponnage : {name} ({h})', th: '🏆 ราชาแห่งการชน: {name} ({h})', id: '🏆 Raja tabrak: {name} ({h})' },
  you: { en: 'you', ko: '나', ja: 'あなた', zh: '你', es: 'tú', ar: 'أنت', vi: 'bạn', hi: 'आप', fr: 'toi', th: 'คุณ', id: 'kamu' },
  alone: { en: 'You need at least {n} drivers. If nobody else gets in, your coins come back.', ko: '최소 {n}명이 타야 출발해요. 아무도 안 타면 코인을 돌려드려요.', ja: '{n}人以上で出発します。誰も乗らなければコインを返します。', zh: '至少{n}人才能出发。没人上车的话会退还金币。', es: 'Hacen falta al menos {n} conductores. Si nadie más sube, te devolvemos las monedas.', ar: 'نحتاج إلى {n} سائقين على الأقل. إن لم يركب أحد، نعيد لك عملاتك.', vi: 'Cần ít nhất {n} người lái. Nếu không ai lên thêm, bạn sẽ được hoàn xu.', hi: 'कम से कम {n} ड्राइवर चाहिए। कोई और न बैठे तो आपके सिक्के लौट आएँगे।', fr: 'Il faut au moins {n} pilotes. Si personne d\'autre ne monte, tes pièces te sont rendues.', th: 'ต้องมีคนขับอย่างน้อย {n} คน ถ้าไม่มีใครขึ้นเพิ่ม จะคืนเหรียญให้', id: 'Butuh minimal {n} pengemudi. Kalau tidak ada yang naik lagi, koinmu dikembalikan.' },
  solo: { en: 'Not enough riders, so the bumper cars can\'t run this time. Your 🪙 {n} has been refunded.', ko: '사람이 없어서 이번 판은 운행할 수 없어요. 🪙 {n}을 환불해 드렸어요.', ja: '人が足りないので今回は運行できません。🪙 {n}を返金しました。', zh: '人数不够，这一轮无法开始。已退还 🪙 {n}。', es: 'No hay suficientes conductores, así que esta vez no funciona. Te devolvimos 🪙 {n}.', ar: 'لا يوجد عدد كافٍ من الركاب، لذا لن تعمل هذه المرة. أعدنا لك 🪙 {n}.', vi: 'Không đủ người nên lượt này không chạy được. Đã hoàn 🪙 {n} cho bạn.', hi: 'सवार कम हैं, इसलिए इस बार बंपर कार नहीं चलेगी। 🪙 {n} वापस कर दिए गए।', fr: 'Pas assez de pilotes, les autos tamponneuses ne peuvent pas tourner cette fois. Tes 🪙 {n} t\'ont été remboursées.', th: 'คนไม่พอ รอบนี้จึงเปิดเล่นไม่ได้ คืน 🪙 {n} ให้แล้ว', id: 'Pengemudi kurang, jadi kali ini bom-bom car tidak bisa jalan. 🪙 {n} sudah dikembalikan.' },
  soloFree: { en: 'Not enough riders, so the bumper cars can\'t run this time. Your next ride is still free.', ko: '사람이 없어서 이번 판은 운행할 수 없어요. 다음 탑승은 그대로 무료예요.', ja: '人が足りないので今回は運行できません。次の乗車は引き続き無料です。', zh: '人数不够，这一轮无法开始。下次乘坐仍然免费。', es: 'No hay suficientes conductores, así que esta vez no funciona. Tu próximo viaje sigue siendo gratis.', ar: 'لا يوجد عدد كافٍ من الركاب، لذا لن تعمل هذه المرة. ركوبك القادم ما زال مجانيًا.', vi: 'Không đủ người nên lượt này không chạy được. Lượt sau của bạn vẫn miễn phí.', hi: 'सवार कम हैं, इसलिए इस बार बंपर कार नहीं चलेगी। आपकी अगली सवारी अब भी मुफ़्त है।', fr: 'Pas assez de pilotes, les autos tamponneuses ne peuvent pas tourner cette fois. Ton prochain tour reste gratuit.', th: 'คนไม่พอ รอบนี้จึงเปิดเล่นไม่ได้ รอบหน้ายังขึ้นฟรีเหมือนเดิม', id: 'Pengemudi kurang, jadi kali ini bom-bom car tidak bisa jalan. Naik berikutnya tetap gratis.' },
  bounced: { en: 'Someone took that car at the same moment. You\'re first in line for the next round (already paid).', ko: '같은 순간에 다른 사람이 그 차를 탔어요. 다음 판 1번으로 대기할게요 (요금은 이미 냈어요).', ja: '同時に他の人がその車に乗りました。次の回の1番目です（料金は支払い済み）。', zh: '有人同时上了那辆车。你排下一轮第一位（已付款）。', es: 'Alguien tomó ese auto a la vez. Eres el primero para la próxima ronda (ya pagado).', ar: 'ركب شخص آخر السيارة في اللحظة نفسها. أنت الأول للجولة التالية (مدفوع).', vi: 'Có người lên xe cùng lúc. Bạn đứng đầu hàng lượt sau (đã trả tiền).', hi: 'किसी ने उसी पल वह कार ले ली। अगले राउंड में आप पहले हैं (भुगतान हो चुका)।', fr: 'Quelqu\'un a pris cette auto au même moment. Tu es premier dans la file pour la prochaine manche (déjà payé).', th: 'มีคนขึ้นรถคันนั้นพร้อมกันพอดี คุณได้คิวแรกของรอบถัดไป (จ่ายเงินแล้ว)', id: 'Ada yang naik mobil itu bersamaan. Kamu nomor satu ronde berikutnya (sudah bayar).' },
};

export function createBumper(game) {
  const { $, STALE, myId, shop, sfx, wallet, input, moveRef, cam } = game;
  const queue = new TarotQueue(undefined, TURN_MS);
  let car = null; // my BumperCar while I'm in one
  let mySlot = -1; // which car (0..5)
  let myGo = 0; // my round's go time (ms)
  let hits = 0; // times I rammed someone this round
  let ticket = 0; // my number in line (when I took it, ms); 1 = bounced to the front
  let paid = false; // already paid (bounced out of a car): the next ride is free
  let payOp = null; // this ride's payment (wallet op id), to refund it if nobody else comes; false: rode free
  let turn = { order: [], callable: [], expired: [] };
  let view = { phase: 'idle', left: 0, riders: [], count: 0 }; // this frame, for the button
  let board = []; // the scores while driving, for the results
  let wentGo = false; // said "GO!" already
  let shiftWas = false;
  const contacts = new Contacts();
  const hud = $('bumper-hud'), boostBtn = $('boost-btn');
  boostBtn?.addEventListener('pointerdown', (e) => { e.preventDefault(); fireBoost(); });

  // Everyone else in a car right now (their round not over).
  function riders(now) {
    const out = [];
    for (const [id, o] of game.others.players) {
      if (o.hidden) continue;
      const bc = o.target?.bc | 0, go = Number(o.target?.br) || 0;
      if (bc < 1 || bc > SEATS || !go || phaseOf(go, now).phase === 'over') continue;
      out.push({ id, slot: bc - 1, go, hits: o.target.bh | 0, o });
    }
    return out;
  }
  function line() {
    const out = [];
    for (const [id, o] of game.others.players) if (!o.hidden && o.target?.bq) out.push({ id, tq: Number(o.target.bq) });
    if (ticket) out.push({ id: myId, tq: ticket });
    return out;
  }

  function reset() {
    ticket = 0; paid = false;
    if (mySlot >= 0 && game.seated?.bumper != null) game.standUp();
    clearCar();
  }
  function clearCar() {
    car = null; mySlot = -1; myGo = 0; hits = 0; board = []; wentGo = false;
    if (boostBtn) boostBtn.hidden = true;
  }

  function takeTicket() {
    ticket = Date.now();
    game.sendTimer = 0;
    turn = queue.update(line(), freeForLine(view.phase, view.count));
    shop.toast(fmt(L(BUMPER_TEXT.took), { n: turn.order.indexOf(myId) + 1 }));
    game.action = STALE;
  }
  function leaveLine() {
    ticket = 0; paid = false;
    game.sendTimer = 0;
    shop.toast(L(BUMPER_TEXT.left));
    game.action = STALE;
  }

  function boardCar() {
    const park = game.interior?.bumper;
    if (!park || game.seated) return;
    const now = Date.now(), rs = riders(now);
    const go = roundGo(rs, now), phase = phaseOf(go, now).phase;
    if (!mayBoard({ phase, riders: rs.length, turn, myId })) { shop.toast(L(BUMPER_TEXT.full)); return; }
    const slot = freeSlot(rs.map((r) => r.slot));
    if (slot < 0) { shop.toast(L(BUMPER_TEXT.full)); return; }
    if (!paid && !wallet.spend(BUMPER_COST, { k: 'ledger.ride' })) { shop.toast(t('ride.noCoins', { n: BUMPER_COST })); return; }
    payOp = paid ? false : wallet.lastOp;
    paid = false; ticket = 0;
    mySlot = slot; hits = 0; wentGo = false;
    myGo = phase === 'boarding' ? go : now + BOARD_MS;
    const h = HOMES[slot];
    car = new BumperCar(h);
    game.sitDown({ x: h.x, z: h.z, y: FLOOR_Y, ry: h.ry, stand: [GATE.x - 0.5, GATE.z + (slot - 2.5) * 0.6], bumper: slot });
    cam.pitch = Math.min(cam.pitch, 0.55); cam.dist = Math.max(cam.dist, 7.5); // see the whole rink
    game.missionEvent?.('ride');
    shop.toast(L(BUMPER_TEXT.wait));
    sfx.doorOpen?.();
    game.action = STALE;
  }

  function fireBoost() {
    if (!car || phaseOf(myGo, Date.now()).phase !== 'driving') return;
    if (car.boost()) { sfx.skatePop?.(); buzz(25); }
  }

  // The countdown ran out with only me in a car: out, and the fare back
  // (or, if this ride was the free one, still free next time).
  function soloOut() {
    const free = payOp === false;
    game.standUp();
    if (free) { paid = true; shop.toast(L(BUMPER_TEXT.soloFree)); }
    else {
      wallet.refund(BUMPER_COST, payOp, { k: 'ledger.ride' });
      shop.toast(fmt(L(BUMPER_TEXT.solo), { n: BUMPER_COST }));
    }
    payOp = null;
    sfx.doorClose?.();
    game.action = STALE;
  }

  // My round is over: get out and show who bumped the most.
  function finish() {
    const mine = hits;
    const list = board.length ? board : [{ id: myId, hits: mine }];
    const best = ranking(list)[0];
    game.standUp();
    let msg = fmt(L(BUMPER_TEXT.over), { h: mine });
    if (list.length > 1 && best.hits > 0) {
      const name = best.id === myId ? L(BUMPER_TEXT.you) : game.others.nameOf(best.id) || '?';
      msg += ' ' + fmt(L(BUMPER_TEXT.champ), { name, h: best.hits });
      if (best.id === myId) sfx.cheer?.();
    }
    shop.toast(msg);
    game.me.play?.('cheer');
  }

  // Little stars where two cars meet.
  let pows = null;
  function pow(x, z, big) {
    const scene = game.interior.scene;
    if (!pows || pows.scene !== scene) {
      const geo = new THREE.OctahedronGeometry(0.22);
      pows = { scene, list: [0, 1, 2, 3].map(() => {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, depthWrite: false }));
        m.visible = false; scene.add(m); return m;
      }) };
    }
    const m = pows.list.find((r) => !r.visible) || pows.list[0];
    m.visible = true; m.position.set(x, 0.7, z);
    m.userData.t = 0; m.userData.size = 0.8 + big * 1.6;
  }

  function tick(dt) {
    const park = game.interior?.bumper;
    if (!park) {
      if (ticket || mySlot >= 0) reset();
      if (hud) hud.hidden = true;
      return;
    }
    const now = Date.now();
    const rs = riders(now);
    if (mySlot >= 0 && game.seated?.bumper == null) clearCar(); // got up some other way
    const mine = mySlot >= 0;
    // Everyone on the earliest clock (two people who got in at once agree).
    const go = roundGo(mine ? [...rs, { go: myGo }] : rs, now);
    if (mine && go && go < myGo && phaseOf(myGo, now).phase === 'boarding') myGo = go;
    const ph = phaseOf(go, now);
    view = { phase: ph.phase, left: ph.left, riders: rs, count: rs.length + (mine ? 1 : 0) };

    // The line.
    const was = turn.callable.includes(myId);
    turn = queue.update(line(), freeForLine(ph.phase, view.count));
    if (ticket && turn.expired.includes(myId)) { ticket = 0; paid = false; shop.toast(L(BUMPER_TEXT.missed)); game.action = STALE; game.sendTimer = 0; }
    if (ticket && !was && turn.callable.includes(myId)) { shop.toast(L(BUMPER_TEXT.called)); sfx.pop?.(); buzz(60); game.action = STALE; }

    // My car.
    if (mine) {
      const slot = settleSlot(myId, mySlot, rs);
      if (slot < 0) { // seven people got in at once and I lost: first in line, already paid
        game.standUp(); ticket = 1; paid = true; game.sendTimer = 0;
        shop.toast(L(BUMPER_TEXT.bounced));
        return;
      }
      if (slot !== mySlot) { mySlot = slot; game.seated.bumper = slot; car = new BumperCar(HOMES[slot]); game.sendTimer = 0; }
      const mp = phaseOf(myGo, now);
      if (mp.phase === 'over') { finish(); return; }
      // Time to go but nobody else got in: no round alone. Give the fare back.
      if (mp.phase === 'driving' && !wentGo && tooFew(1 + rs.length)) { soloOut(); return; }
      if (mp.phase === 'driving') {
        if (!wentGo) { wentGo = true; shop.toast(L(BUMPER_TEXT.go)); sfx.arrivalChime?.(); buzz([40, 40, 80]); game.action = STALE; }
        const shift = input.keys?.has('ShiftLeft') || input.keys?.has('ShiftRight');
        if (shift && !shiftWas) fireBoost();
        shiftWas = shift;
        const { x: mx, y: my } = input.move;
        const yaw = moveRef.yaw;
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        const { wall } = car.drive(fx * my + rx * mx, fz * my + rz * mx, dt);
        // A car coming at me is drawn a little behind where it really is
        // (network lag), and its driver bounces off me on their screen before
        // it ever quite reaches me on mine: so moving cars count as a bit
        // bigger, and I still feel the hit.
        const others = park.cars.filter((c) => c.i !== mySlot).map((c) => ({
          x: c.g.position.x, z: c.g.position.z, vx: c.vx || 0, vz: c.vz || 0, i: c.i, fixed: !rs.some((r) => r.slot === c.i),
          r: CAR_R + Math.min(0.35, Math.hypot(c.vx || 0, c.vz || 0) * 0.1),
        }));
        car.bump(others);
        if (wall > 0.08) {
          const c = park.cars[mySlot];
          c.bumpAt = now / 1000; c.bumpAmp = 0.06 + wall * 0.12;
          sfx.bump?.(wall * 0.6, 0.6); buzz(20);
        }
        board = [{ id: myId, hits }, ...rs.filter((r) => r.go === myGo).map((r) => ({ id: r.id, hits: r.hits }))];
        if (boostBtn) { boostBtn.hidden = false; boostBtn.classList.toggle('ready', car.charge >= 1); }
      } else {
        const h = HOMES[mySlot];
        car.x = h.x; car.z = h.z; car.ry = h.ry; car.speed = 0; car.vx = car.vz = 0;
        if (boostBtn) boostBtn.hidden = true;
      }
      game.me.root.position.set(car.x, FLOOR_Y, car.z);
      game.me.root.rotation.y = car.ry;
    }

    // Put every car where its driver is, the empty ones back home.
    const placed = new Set();
    if (mine) { const c = park.cars[mySlot]; c.g.position.set(car.x, FLOOR_Y, car.z); c.g.rotation.y = car.ry; placed.add(mySlot); }
    for (const r of rs) {
      if (placed.has(r.slot)) continue;
      const c = park.cars[r.slot], root = r.o.ch.root;
      c.g.position.set(root.position.x, FLOOR_Y, root.position.z);
      c.g.rotation.y = root.rotation.y;
      placed.add(r.slot);
    }
    for (const c of park.cars) if (!placed.has(c.i)) {
      const k = Math.min(1, dt * 2), p = c.g.position;
      p.x += (c.home.x - p.x) * k; p.z += (c.home.z - p.z) * k;
      c.g.rotation.y += Math.atan2(Math.sin(c.home.ry - c.g.rotation.y), Math.cos(c.home.ry - c.g.rotation.y)) * k;
    }
    // How fast each car goes (smoothed: network updates are jumpy), then bumps.
    for (const c of park.cars) {
      const p = c.g.position;
      if (dt > 0 && c.px != null) {
        const k = Math.min(1, dt * 10);
        c.vx = (c.vx || 0) + ((p.x - c.px) / dt - (c.vx || 0)) * k;
        c.vz = (c.vz || 0) + ((p.z - c.pz) / dt - (c.vz || 0)) * k;
      }
      c.px = p.x; c.pz = p.z;
    }
    if (mine) { const c = park.cars[mySlot]; c.vx = car.vx; c.vz = car.vz; }
    const poses = park.cars.map((c) => ({ x: c.g.position.x, z: c.g.position.z }));
    const tnow = now / 1000;
    for (const [i, j] of contacts.update(touching(poses, BUMPER_BUMP))) {
      const a = park.cars[i], b = park.cars[j];
      const hard = Math.min(1, Math.hypot((a.vx || 0) - (b.vx || 0), (a.vz || 0) - (b.vz || 0)) / BUMPER_BUMP.maxKick);
      if (hard < 0.05 && !placed.has(i) && !placed.has(j)) continue; // two parked cars side by side
      a.bumpAt = b.bumpAt = tnow; a.bumpAmp = b.bumpAmp = 0.08 + hard * 0.18;
      const mx = (a.g.position.x + b.g.position.x) / 2, mz = (a.g.position.z + b.g.position.z) / 2;
      pow(mx, mz, hard);
      const p = game.me.root.position, far = Math.hypot(p.x - mx, p.z - mz);
      sfx.bump?.(hard, Math.max(0, 1 - far / 30));
      if (mine && (i === mySlot || j === mySlot)) {
        // Feel it: a buzz on phones, a shake on screen (Settings → Vibration).
        buzz(hard > 0.5 ? [60, 30, 90] : 40);
        shake([$('scene')], hard > 0.5);
        const other = i === mySlot ? b : a; // (only my own driving counts, not a bounce, and only into someone's car)
        if (phaseOf(myGo, now).phase === 'driving' && rs.some((r) => r.slot === other.i) && rammedBy({ x: car.x, z: car.z, vx: Math.sin(car.ry) * car.speed, vz: Math.cos(car.ry) * car.speed }, { x: other.g.position.x, z: other.g.position.z, vx: other.vx, vz: other.vz })) {
          hits++; game.sendTimer = 0;
        }
      }
    }
    for (const c of park.cars) {
      const tt = tnow - (c.bumpAt ?? -99);
      c.g.rotation.z = wobble(tt, c.bumpAmp || 0, 13, 5);
      c.g.rotation.x = wobble(tt - 0.04, (c.bumpAmp || 0) * 0.6, 10, 5);
    }
    if (pows) for (const m of pows.list) if (m.visible) {
      m.userData.t += dt;
      const k = m.userData.t / 0.45;
      if (k >= 1) { m.visible = false; continue; }
      m.scale.setScalar(0.3 + k * m.userData.size);
      m.rotation.y += dt * 8;
      m.material.opacity = 1 - k;
    }
    showHud(now);
  }

  function showHud(now) {
    if (!hud) return;
    let main = '', sub = '';
    if (mySlot >= 0) {
      const mp = phaseOf(myGo, now);
      if (mp.phase === 'boarding') { main = fmt(L(BUMPER_TEXT.starts), { s: mp.left, n: view.count }); sub = tooFew(view.count) ? fmt(L(BUMPER_TEXT.alone), { n: MIN_DRIVERS }) : L(BUMPER_TEXT.wait); }
      else if (mp.phase === 'driving') { main = fmt(L(BUMPER_TEXT.clock), { s: mp.left, h: hits }); sub = L(car.charge >= 1 ? BUMPER_TEXT.ready : BUMPER_TEXT.charging); }
    } else if (ticket) {
      const n = turn.order.indexOf(myId) + 1;
      if (n > 0) main = fmt(L(BUMPER_TEXT.queue), { n, s: view.phase === 'driving' ? view.left : 0 });
    }
    hud.hidden = !main;
    if (main) {
      const b = hud.querySelector('b'), s = hud.querySelector('small');
      if (b.textContent !== main) b.textContent = main;
      if (s.textContent !== sub) s.textContent = sub;
    }
  }

  // What the action button offers about the bumper cars (null: nothing).
  function action(p) {
    if (!game.interior?.bumper) return null;
    if (game.seated?.bumper != null) { // get out before it starts; once driving, the round runs its minute (no stray taps)
      return phaseOf(myGo, Date.now()).phase === 'driving' ? null : { key: 'bumper-out', label: '🚪 ' + L(BUMPER_TEXT.out), run: () => game.standUp() };
    }
    if (game.seated) return null;
    const cost = paid ? '' : ` · 🪙 ${BUMPER_COST}`;
    if (ticket && turn.callable.includes(myId)) { // called: get in from anywhere in the park
      const s = queue.secondsLeft(myId) ?? 0;
      return { key: 'bumper-turn:' + s, label: '🔔 ' + fmt(L(BUMPER_TEXT.turn), { s }) + cost, run: boardCar };
    }
    if (Math.hypot(p.x - GATE.x, p.z - GATE.z) > 2.2) return null;
    if (ticket) {
      const n = turn.order.indexOf(myId) + 1;
      return { key: 'bumper-line:' + n, label: '🎫 ' + fmt(L(BUMPER_TEXT.line), { n }), run: leaveLine };
    }
    if (mayBoard({ phase: view.phase, riders: view.riders.length, turn, myId })) {
      return { key: 'bumper-board', label: '🚗 ' + fmt(L(BUMPER_TEXT.board), { n: BUMPER_COST }), run: boardCar };
    }
    return { key: 'bumper-ticket', label: '🎫 ' + L(BUMPER_TEXT.ticket), run: () => { if (view.phase === 'driving') shop.toast(L(BUMPER_TEXT.full)); takeTicket(); } };
  }

  // My bits of the shared state.
  function state(st) {
    if (mySlot >= 0) { st.bc = mySlot + 1; st.br = myGo; if (hits) st.bh = hits; }
    if (ticket) st.bq = ticket;
  }

  return {
    tick, action, state, BUMPER_TEXT,
    onStandUp: clearCar, // main's standUp(): we're out of the car
    get driving() { return !!car && phaseOf(myGo, Date.now()).phase === 'driving'; },
    get inCar() { return mySlot >= 0; },
    debug: () => ({ slot: mySlot, go: myGo, hits, ticket, paid, phase: view.phase, count: view.count, turn, car: car && { x: +car.x.toFixed(2), z: +car.z.toFixed(2), ry: +car.ry.toFixed(2), speed: +car.speed.toFixed(2), charge: +car.charge.toFixed(2), kx: +car.knock.vx.toFixed(2), kz: +car.knock.vz.toFixed(2) } }),
    board: boardCar, boost: fireBoost,
  };
}
