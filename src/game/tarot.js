// Tarot cafés (Starlight and Lucky Piggy in Hongdae, Moon & Rose in Seongsu):
// sit at a reader's table and draw three cards, alone or with a friend. When
// the tables are taken, take a number and wait on the sofa (core/tarot-queue.js).
import { L, fmt } from '../ui/pocha-ui.js';
import { TarotQueue, tarotMsg } from '../core/tarot-queue.js';
import { TarotUI } from '../ui/tarot-ui.js';
import { say } from '../core/npcs.js';
import { showBubble } from '../core/players.js';
import { t } from '../core/i18n.js';

export function createTarot(game) {
  const { $, STALE, myId, myLabel, refreshWallet, safety, sfx, shop, sitDown, standUp, wallet } = game;
  const TAROT_TEXT = {
    reader: { en: 'Tarot reader', ko: '타로 마스터', ja: 'タロット占い師', zh: '塔罗师', es: 'Tarotista', ar: 'قارئة التاروت', vi: 'Thầy bói tarot', hi: 'टैरो रीडर', id: 'Pembaca tarot' },
    open: { en: 'Tarot reading', ko: '타로 보기', ja: 'タロット占い', zh: '塔罗占卜', es: 'Lectura de tarot', ar: 'قراءة التاروت', vi: 'Xem bài tarot', hi: 'टैरो रीडिंग', id: 'Baca tarot' },
    hint: { en: 'Have a seat at my table and I\'ll read your cards.', ko: '테이블에 앉으시면 타로를 봐 드릴게요.', ja: 'テーブルに座ってください。カードを読みますね。', zh: '请在我的桌前坐下，我来为你解牌。', es: 'Siéntate a mi mesa y te leo las cartas.', ar: 'اجلس إلى طاولتي وسأقرأ لك البطاقات.', vi: 'Mời ngồi vào bàn, tôi sẽ xem bài cho bạn.', hi: 'मेरी मेज़ पर बैठिए, मैं आपके कार्ड पढ़ूँगी।', id: 'Silakan duduk di mejaku, aku bacakan kartumu.' },
    sit: { en: 'Sit for a reading', ko: '타로 테이블에 앉기', ja: '占いの席に座る', zh: '入座占卜', es: 'Sentarse para la lectura', ar: 'اجلس للقراءة', vi: 'Ngồi xem bài', hi: 'रीडिंग के लिए बैठें', id: 'Duduk untuk dibaca' },
    ticket: { en: 'Take a number', ko: '대기 번호 받기', ja: '順番待ちの番号を取る', zh: '取号排队', es: 'Tomar número', ar: 'خذ رقمًا', vi: 'Lấy số thứ tự', hi: 'नंबर लें', id: 'Ambil nomor antrean' },
    took: { en: 'You\'re No. {n} in line. Have a seat on the sofa; we\'ll call you.', ko: '대기 {n}번이에요. 소파에 앉아 기다리시면 불러 드릴게요.', ja: '{n}番目です。ソファで待っていてください。お呼びします。', zh: '你排第{n}位。请在沙发上稍候，轮到时会叫你。', es: 'Eres el n.º {n}. Siéntate en el sofá, te llamaremos.', ar: 'أنت رقم {n} في الطابور. اجلس على الأريكة وسننادي عليك.', vi: 'Bạn là số {n}. Mời ngồi sofa chờ gọi.', hi: 'आप कतार में {n} नंबर पर हैं। सोफ़े पर बैठिए, हम बुलाएँगे।', id: 'Kamu nomor {n}. Duduk di sofa, nanti dipanggil.' },
    line: { en: 'No. {n} in line · leave the line', ko: '대기 {n}번 · 대기 취소', ja: '{n}番目 · 列を抜ける', zh: '排第{n}位 · 取消排队', es: 'N.º {n} en la fila · salir', ar: 'رقم {n} · مغادرة الطابور', vi: 'Số {n} · rời hàng', hi: 'कतार में {n} · कतार छोड़ें', id: 'Nomor {n} · keluar antrean' },
    busy: { en: 'Someone is having a reading. Please take a number and wait your turn.', ko: '지금 다른 손님이 타로를 보고 있어요. 대기 번호를 받고 차례를 기다려 주세요.', ja: '今ほかのお客さんが占い中です。番号を取って順番をお待ちください。', zh: '有其他客人正在占卜。请取号等候。', es: 'Alguien está en una lectura. Toma un número y espera tu turno.', ar: 'هناك من يقرأ الآن. خذ رقمًا وانتظر دورك.', vi: 'Có người đang xem bài. Hãy lấy số và chờ đến lượt.', hi: 'कोई रीडिंग ले रहा है। नंबर लेकर अपनी बारी का इंतज़ार करें।', id: 'Ada yang sedang dibaca. Ambil nomor dan tunggu giliran.' },
    turn: { en: 'Your turn! Sit at the free table · {s}s', ko: '차례예요! 빈 테이블에 앉으세요 · {s}초', ja: 'あなたの番！空いた席へ · {s}秒', zh: '轮到你了！请坐到空桌 · {s}秒', es: '¡Tu turno! Siéntate en la mesa libre · {s}s', ar: 'دورك! اجلس إلى الطاولة الفارغة · {s}ث', vi: 'Đến lượt bạn! Ngồi vào bàn trống · {s}giây', hi: 'आपकी बारी! खाली मेज़ पर बैठें · {s}से', id: 'Giliranmu! Duduk di meja kosong · {s}d' },
    called: { en: '🔔 Your turn! A table is free. Please sit down within 10 seconds.', ko: '🔔 차례예요! 테이블이 비었어요. 10초 안에 앉아 주세요.', ja: '🔔 あなたの番です！席が空きました。10秒以内に座ってください。', zh: '🔔 轮到你了！有空桌了。请在10秒内入座。', es: '🔔 ¡Tu turno! Hay una mesa libre. Siéntate en 10 segundos.', ar: '🔔 دورك! هناك طاولة فارغة. اجلس خلال 10 ثوانٍ.', vi: '🔔 Đến lượt bạn! Có bàn trống. Hãy ngồi trong 10 giây.', hi: '🔔 आपकी बारी! मेज़ खाली है। 10 सेकंड में बैठें।', id: '🔔 Giliranmu! Ada meja kosong. Duduk dalam 10 detik.' },
    missed: { en: 'Your 10 seconds ran out, so your number was cleared. Take a new one any time.', ko: '10초가 지나 대기 번호가 초기화됐어요. 언제든 다시 받을 수 있어요.', ja: '10秒が過ぎたので番号がリセットされました。いつでも取り直せます。', zh: '10秒已过，号码已清除。可以随时重新取号。', es: 'Pasaron los 10 segundos y se borró tu número. Toma otro cuando quieras.', ar: 'انتهت الثواني العشر وأُلغي رقمك. خذ رقمًا جديدًا متى شئت.', vi: 'Hết 10 giây nên số của bạn đã bị hủy. Có thể lấy số mới bất cứ lúc nào.', hi: '10 सेकंड बीत गए, आपका नंबर हटा दिया गया। कभी भी नया लें।', id: '10 detik habis, nomormu dihapus. Ambil lagi kapan saja.' },
    leftLine: { en: 'You left the line.', ko: '대기를 취소했어요.', ja: '列を抜けました。', zh: '已取消排队。', es: 'Saliste de la fila.', ar: 'غادرت الطابور.', vi: 'Bạn đã rời hàng.', hi: 'आपने कतार छोड़ दी।', id: 'Kamu keluar dari antrean.' },
    joinFriend: { en: 'Sit with {name} for the reading', ko: '{name} 님 옆에 앉아 같이 보기', ja: '{name}さんの隣で一緒に占う', zh: '坐到{name}旁边一起占', es: 'Sentarse con {name}', ar: 'اجلس مع {name}', vi: 'Ngồi cùng {name}', hi: '{name} के साथ बैठें', id: 'Duduk bersama {name}' },
    invited: { en: '💞 {name} invites you to a tarot reading together!', ko: '💞 {name} 님이 타로를 같이 보자고 해요!', ja: '💞 {name}さんが一緒にタロットを占おうと誘っています！', zh: '💞 {name}邀请你一起占塔罗！', es: '💞 ¡{name} te invita a una lectura de tarot juntos!', ar: '💞 {name} يدعوك لقراءة تاروت معًا!', vi: '💞 {name} mời bạn cùng xem bài tarot!', hi: '💞 {name} आपको साथ में टैरो रीडिंग के लिए बुला रहे हैं!', id: '💞 {name} mengajakmu baca tarot bersama!' },
  };
  const TAROT_LINES = [
    ['어서 오세요, 앉으세요.', 'eoseo oseyo, anjeuseyo.', 'Welcome, have a seat.'],
    ['카드가 좋게 나왔네요!', 'kadeuga joke nawanneyo!', 'The cards look good!'],
    ['마음을 편하게 하고 골라 보세요.', 'maeumeul pyeonhage hago golla boseyo.', 'Relax and pick a card.'],
    ['잠시만 기다려 주세요.', 'jamsiman gidaryeo juseyo.', 'Please wait a moment.'],
    ['다음 손님, 오세요!', 'daeum sonnim, oseyo!', 'Next guest, please!'],
  ];
  // The reader at the table you sit at (a café with two tables has two readers).
  const tarotReader = () => (game.seated?.table ? game.interior?.readerNpcs?.[game.seated.table - 1] : null) || game.clerk;
  const tarotUi = new TarotUI({
    root: $('tarot-panel'),
    wallet,
    onPick: () => sfx.pop?.(),
    onTension: (last) => sfx.heartbeat?.(last ? 5 : 3),
    onReveal: (last) => sfx.reveal?.(last),
    onRead: (cards) => {
      refreshWallet();
      const r = tarotReader();
      if (r) { r.ch.wave(); say(r, $('labels'), TAROT_LINES[1]); }
      showBubble(myLabel, $('labels'), cards.map((c) => c.icon).join(' '), 4000);
    },
    // A friend for a reading together: someone right beside us, not on a bike.
    partner: () => {
      if (!game.seated?.tarot) return null;
      const p = game.me.root.position;
      const o = game.others.nearestFree(p.x, p.z, 2.6);
      return o && !safety.isBlocked(o.id, o.name) ? o : null;
    },
    send: (verb, to, a, b) => game.net.sendEmote(tarotMsg(verb, to, a, b)),
    myName: () => game.nickname,
  });
  // The waiting line.
  const tarotQueue = new TarotQueue();
  let myTicket = 0; // when we took our number (0: not in line)
  let tarotTurn = { order: [], callable: [], expired: [] };
  const tarotChairs = (k) => (game.interior?.seats || []).filter((s) => s.tarot && s.table === k);
  const chairBusy = (s) => s === game.seated || !!game.others.sitterAt(s.x, s.z);
  const tableBusy = (k) => tarotChairs(k).some(chairBusy);
  function tarotTick() {
    const tables = game.interior.stations?.tarotTables?.length || 0;
    let free = 0;
    for (let k = 0; k < tables; k++) if (!tableBusy(k)) free++;
    const line = game.others.tickets();
    if (myTicket) line.push({ id: myId, tq: myTicket });
    const was = tarotTurn.callable.includes(myId);
    tarotTurn = tarotQueue.update(line, free);
    if (myTicket && tarotTurn.expired.includes(myId)) { myTicket = 0; shop.toast(L(TAROT_TEXT.missed)); game.action = STALE; game.sendTimer = 0; }
    if (myTicket && !was && tarotTurn.callable.includes(myId)) {
      shop.toast(L(TAROT_TEXT.called));
      sfx.pop?.();
      if (game.clerk) say(game.clerk, $('labels'), TAROT_LINES[4]);
      game.action = STALE;
    }
  }
  // May we sit on this reading chair? Not while someone else is at that table
  // (unless they asked us to read together), and not ahead of the line.
  function tarotSeatOk(s) {
    const busy = tarotChairs(s.table).map((c) => game.others.sitterAt(c.x, c.z)).filter(Boolean);
    if (busy.length) return !!tarotUi.offer && busy.includes(tarotUi.offer.from);
    return tarotQueue.maySit(myId, tarotTurn);
  }
  function takeTicket() {
    myTicket = Date.now();
    game.sendTimer = 0;
    tarotTick();
    shop.toast(fmt(L(TAROT_TEXT.took), { n: tarotTurn.order.indexOf(myId) + 1 }));
    if (game.clerk) say(game.clerk, $('labels'), TAROT_LINES[3]);
    game.action = STALE;
  }
  function leaveTarotLine(quiet) {
    if (!myTicket) return;
    myTicket = 0;
    game.sendTimer = 0;
    if (!quiet) shop.toast(L(TAROT_TEXT.leftLine));
    game.action = STALE;
  }
  // What the action button offers in a tarot café (null: the usual).
  function tarotAction(p, seat) {
    const offer = tarotUi.offer;
    if (offer && !offer.accepted && !game.seated) { // a friend asked: sit beside them
      const host = game.others.positionOf(offer.from);
      const chair = host && (game.interior.seats || []).find((s) => s.tarot && !chairBusy(s) && tarotChairs(s.table).some((c) => game.others.sitterAt(c.x, c.z) === offer.from));
      if (chair) return { key: 'tarot-join:' + offer.from, label: '💞 ' + fmt(L(TAROT_TEXT.joinFriend), { name: offer.name }), run: () => { leaveTarotLine(true); sitDown(chair); tarotUi.show(); tarotUi.accept(); } };
    }
    if (!game.seated && seat?.tarot) {
      if (tarotSeatOk(seat)) return { key: 'tarot-sit', label: '🔮 ' + L(TAROT_TEXT.sit), run: () => { leaveTarotLine(true); sitDown(seat); const r = tarotReader(); if (r) { r.ch.wave(); say(r, $('labels'), TAROT_LINES[0]); } tarotUi.show(); } };
      if (!myTicket) return { key: 'tarot-ticket', label: '🎫 ' + L(TAROT_TEXT.ticket), run: () => { shop.toast(L(TAROT_TEXT.busy)); takeTicket(); } };
    }
    if (myTicket) {
      if (!game.seated && seat?.wait) return sofa(seat); // (sit on the sofa while waiting)
      const s = tarotQueue.secondsLeft(myId);
      if (tarotTurn.callable.includes(myId) && s != null) return { key: 'tarot-turn:' + s, label: '🔔 ' + fmt(L(TAROT_TEXT.turn), { s }), run: () => { if (game.seated) standUp(); } };
      const n = tarotTurn.order.indexOf(myId) + 1;
      return { key: 'tarot-line:' + n, label: '🎫 ' + fmt(L(TAROT_TEXT.line), { n }),
        run: () => leaveTarotLine() };
    }
    // Every table taken, or people already waiting: offer a number.
    const tables = game.interior.stations?.tarotTables?.length || 0;
    const full = tables > 0 && [...Array(tables).keys()].every(tableBusy);
    if ((full || tarotTurn.order.length) && (seat?.wait || game.seated?.wait || !game.seated)) return { key: 'tarot-ticket', label: '🎫 ' + L(TAROT_TEXT.ticket), run: () => takeTicket() };
    if (!game.seated && seat?.wait) return sofa(seat);
    return null;
  }
  const sofa = (seat) => ({ key: 'sit', label: '🪑 ' + t('shop.sit'), run: () => sitDown(seat) });
  return { tarotUi, TAROT_TEXT, leaveTarotLine, tarotAction, tarotReader, TAROT_LINES, tarotTick,
    get myTicket() { return myTicket; }, get tarotTurn() { return tarotTurn; } };
}
