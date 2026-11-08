// Seoul Bank's teller window (rules in core/bank.js, the money moves in
// supabase/028_bank.sql). Players who can't send yet see "coming soon";
// operators get the transfer form.
import { localName, getLanguage } from '../core/i18n.js';
import { won } from '../core/money.js';
import { MEMOS, QUICK } from '../core/bank.js';

export const L = (o) => localName(o, getLanguage());
export const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

export const BANK_TEXT = {
  teller: { en: 'Teller', ko: '창구 직원', ja: '窓口係', zh: '柜员', es: 'Cajero', ar: 'موظف الشباك', vi: 'Giao dịch viên', hi: 'काउंटर कर्मचारी', fr: 'Guichetier', th: 'พนักงานเคาน์เตอร์', id: 'Teller' },
  open: { en: 'Talk to the teller', ko: '창구 직원과 이야기하기', ja: '窓口係と話す', zh: '和柜员说话', es: 'Hablar con el cajero', ar: 'تحدث إلى موظف الشباك', vi: 'Nói chuyện với giao dịch viên', hi: 'काउंटर कर्मचारी से बात करें', fr: 'Parler au guichetier', th: 'คุยกับพนักงานเคาน์เตอร์', id: 'Bicara dengan teller' },
  soon: { en: '🚧 Coming soon', ko: '🚧 준비중입니다', ja: '🚧 準備中です', zh: '🚧 准备中', es: '🚧 Próximamente', ar: '🚧 قريبًا', vi: '🚧 Sắp ra mắt', hi: '🚧 जल्द आ रहा है', fr: '🚧 Bientôt disponible', th: '🚧 เร็วๆ นี้', id: '🚧 Segera hadir' },
  soonBody: { en: 'Sending money to other players is being prepared. Please come back soon!', ko: '다른 플레이어에게 돈을 보내는 송금 서비스를 준비하고 있어요. 조금만 기다려 주세요!', ja: '他のプレイヤーにお金を送る送金サービスを準備中です。もう少しお待ちください！', zh: '给其他玩家转账的服务正在准备中，请稍候再来！', es: 'Estamos preparando el envío de dinero a otros jugadores. ¡Vuelve pronto!', ar: 'نجهّز خدمة إرسال المال إلى اللاعبين الآخرين. عُد قريبًا!', vi: 'Dịch vụ gửi tiền cho người chơi khác đang được chuẩn bị. Hãy quay lại sau nhé!', hi: 'दूसरे खिलाड़ियों को पैसे भेजने की सेवा तैयार हो रही है। जल्द वापस आइए!', fr: 'L\'envoi d\'argent aux autres joueurs est en préparation. Reviens bientôt !', th: 'บริการโอนเงินให้ผู้เล่นคนอื่นกำลังเตรียมอยู่ แล้วกลับมาใหม่นะ!', id: 'Layanan kirim uang ke pemain lain sedang disiapkan. Datang lagi nanti ya!' },
  asking: { en: 'One moment…', ko: '잠시만요…', ja: '少々お待ちください…', zh: '请稍等…', es: 'Un momento…', ar: 'لحظة…', vi: 'Chờ một chút…', hi: 'एक पल…', fr: 'Un instant…', th: 'รอสักครู่…', id: 'Sebentar…' },
  send: { en: 'Send money', ko: '송금하기', ja: '送金する', zh: '转账', es: 'Enviar dinero', ar: 'أرسل مالًا', vi: 'Gửi tiền', hi: 'पैसे भेजें', fr: 'Envoyer de l\'argent', th: 'โอนเงิน', id: 'Kirim uang' },
  opOnly: { en: 'Testing: only operators can send for now.', ko: '테스트 중: 지금은 운영자만 보낼 수 있어요.', ja: 'テスト中：今は運営者だけが送れます。', zh: '测试中：目前只有运营者可以转账。', es: 'En pruebas: por ahora solo los operadores pueden enviar.', ar: 'تجربة: الإرسال للمشرفين فقط حاليًا.', vi: 'Đang thử nghiệm: hiện chỉ quản trị viên gửi được.', hi: 'परीक्षण: अभी केवल ऑपरेटर भेज सकते हैं।', fr: 'En test : pour l\'instant seuls les opérateurs peuvent envoyer.', th: 'กำลังทดสอบ: ตอนนี้เฉพาะผู้ดูแลเท่านั้นที่โอนได้', id: 'Uji coba: saat ini hanya operator yang bisa mengirim.' },
  balance: { en: 'Your money: {n}', ko: '내 돈: {n}', ja: '所持金：{n}', zh: '我的钱：{n}', es: 'Tu dinero: {n}', ar: 'مالك: {n}', vi: 'Tiền của bạn: {n}', hi: 'आपके पैसे: {n}', fr: 'Ton argent : {n}', th: 'เงินของคุณ: {n}', id: 'Uangmu: {n}' },
  to: { en: 'To (player name)', ko: '받는 사람 (플레이어 이름)', ja: '送り先（プレイヤー名）', zh: '收款人（玩家名）', es: 'Para (nombre del jugador)', ar: 'إلى (اسم اللاعب)', vi: 'Gửi đến (tên người chơi)', hi: 'किसे (खिलाड़ी का नाम)', fr: 'À (nom du joueur)', th: 'ถึง (ชื่อผู้เล่น)', id: 'Kepada (nama pemain)' },
  amount: { en: 'Amount ({min}–{max})', ko: '금액 ({min}~{max})', ja: '金額（{min}〜{max}）', zh: '金额（{min}–{max}）', es: 'Cantidad ({min}–{max})', ar: 'المبلغ ({min}–{max})', vi: 'Số tiền ({min}–{max})', hi: 'राशि ({min}–{max})', fr: 'Montant ({min}–{max})', th: 'จำนวน ({min}–{max})', id: 'Jumlah ({min}–{max})' },
  memo: { en: 'Note', ko: '메모', ja: 'メモ', zh: '备注', es: 'Nota', ar: 'ملاحظة', vi: 'Ghi chú', hi: 'नोट', fr: 'Note', th: 'บันทึก', id: 'Catatan' },
  memos: {
    thanks: { en: 'Thank you', ko: '고마워요', ja: 'ありがとう', zh: '谢谢', es: 'Gracias', ar: 'شكرًا', vi: 'Cảm ơn', hi: 'धन्यवाद', fr: 'Merci', th: 'ขอบคุณ', id: 'Terima kasih' },
    food: { en: 'For the meal', ko: '밥값', ja: 'ご飯代', zh: '饭钱', es: 'Por la comida', ar: 'ثمن الوجبة', vi: 'Tiền ăn', hi: 'खाने के लिए', fr: 'Pour le repas', th: 'ค่าอาหาร', id: 'Uang makan' },
    coffee: { en: 'Coffee\'s on me', ko: '커피 한잔', ja: 'コーヒーおごり', zh: '请你喝咖啡', es: 'Te invito un café', ar: 'القهوة عليّ', vi: 'Mời cà phê', hi: 'कॉफ़ी मेरी तरफ़ से', fr: 'Le café, c\'est moi', th: 'เลี้ยงกาแฟ', id: 'Traktir kopi' },
    birthday: { en: 'Happy birthday', ko: '생일 축하해요', ja: '誕生日おめでとう', zh: '生日快乐', es: 'Feliz cumpleaños', ar: 'عيد ميلاد سعيد', vi: 'Chúc mừng sinh nhật', hi: 'जन्मदिन मुबारक', fr: 'Joyeux anniversaire', th: 'สุขสันต์วันเกิด', id: 'Selamat ulang tahun' },
    payback: { en: 'Paying you back', ko: '빌린 돈 갚아요', ja: '借りたお金を返すね', zh: '还你钱', es: 'Te devuelvo', ar: 'أردّ لك دينك', vi: 'Trả lại tiền', hi: 'उधार लौटा रहा हूँ', fr: 'Je te rembourse', th: 'คืนเงินที่ยืม', id: 'Bayar utang' },
    trip: { en: 'Travel money', ko: '여행 경비', ja: '旅行費', zh: '旅费', es: 'Para el viaje', ar: 'مصروف السفر', vi: 'Tiền du lịch', hi: 'यात्रा के पैसे', fr: 'Pour le voyage', th: 'ค่าเที่ยว', id: 'Uang jalan-jalan' },
  },
  go: { en: 'Send {n}', ko: '{n} 보내기', ja: '{n} を送る', zh: '转 {n}', es: 'Enviar {n}', ar: 'أرسل {n}', vi: 'Gửi {n}', hi: '{n} भेजें', fr: 'Envoyer {n}', th: 'โอน {n}', id: 'Kirim {n}' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', ar: 'إغلاق', vi: 'Đóng', hi: 'बंद करें', fr: 'Fermer', th: 'ปิด', id: 'Tutup' },
  sent: { en: '🏦 Sent {n} to {name}.', ko: '🏦 {name} 님에게 {n}을 보냈어요.', ja: '🏦 {name}さんに{n}を送りました。', zh: '🏦 已向{name}转账{n}。', es: '🏦 Enviaste {n} a {name}.', ar: '🏦 أرسلت {n} إلى {name}.', vi: '🏦 Đã gửi {n} cho {name}.', hi: '🏦 {name} को {n} भेजे।', fr: '🏦 {n} envoyés à {name}.', th: '🏦 โอน {n} ให้ {name} แล้ว', id: '🏦 {n} terkirim ke {name}.' },
  got: { en: '🏦 {name} sent you {n}! "{memo}"', ko: '🏦 {name} 님이 {n}을 보냈어요! "{memo}"', ja: '🏦 {name}さんから{n}が届きました！「{memo}」', zh: '🏦 {name}给你转了{n}！“{memo}”', es: '🏦 ¡{name} te envió {n}! "{memo}"', ar: '🏦 أرسل لك {name} {n}! "{memo}"', vi: '🏦 {name} đã gửi bạn {n}! "{memo}"', hi: '🏦 {name} ने आपको {n} भेजे! "{memo}"', fr: '🏦 {name} t\'a envoyé {n} ! « {memo} »', th: '🏦 {name} โอนให้คุณ {n}! "{memo}"', id: '🏦 {name} mengirimimu {n}! "{memo}"' },
  // Why it didn't go (core/bank.js checkSend, or the server's answer).
  why: {
    name: { en: 'Type the player\'s name.', ko: '받는 사람 이름을 적어 주세요.', ja: '相手のプレイヤー名を入力してね。', zh: '请输入玩家名。', es: 'Escribe el nombre del jugador.', ar: 'اكتب اسم اللاعب.', vi: 'Hãy nhập tên người chơi.', hi: 'खिलाड़ी का नाम लिखें।', fr: 'Écris le nom du joueur.', th: 'พิมพ์ชื่อผู้เล่น', id: 'Ketik nama pemain.' },
    self: { en: 'You can\'t send money to yourself.', ko: '나에게는 보낼 수 없어요.', ja: '自分には送れません。', zh: '不能转给自己。', es: 'No puedes enviarte dinero a ti mismo.', ar: 'لا يمكنك إرسال المال لنفسك.', vi: 'Bạn không thể gửi tiền cho chính mình.', hi: 'आप खुद को पैसे नहीं भेज सकते।', fr: 'Tu ne peux pas t\'envoyer de l\'argent.', th: 'โอนให้ตัวเองไม่ได้', id: 'Kamu tidak bisa mengirim ke diri sendiri.' },
    amount: { en: 'Send between {min} and {max}.', ko: '{min}에서 {max} 사이로 보낼 수 있어요.', ja: '{min}〜{max}の間で送れます。', zh: '每次可转{min}到{max}。', es: 'Envía entre {min} y {max}.', ar: 'أرسل بين {min} و{max}.', vi: 'Gửi từ {min} đến {max}.', hi: '{min} से {max} के बीच भेजें।', fr: 'Envoie entre {min} et {max}.', th: 'โอนได้ระหว่าง {min} ถึง {max}', id: 'Kirim antara {min} dan {max}.' },
    poor: { en: 'You don\'t have enough money.', ko: '돈이 부족해요.', ja: 'お金が足りません。', zh: '钱不够。', es: 'No tienes suficiente dinero.', ar: 'ليس لديك مال كافٍ.', vi: 'Bạn không đủ tiền.', hi: 'आपके पास पर्याप्त पैसे नहीं हैं।', fr: 'Tu n\'as pas assez d\'argent.', th: 'เงินไม่พอ', id: 'Uangmu tidak cukup.' },
    nobody: { en: 'There\'s no player with that name.', ko: '그 이름의 플레이어가 없어요.', ja: 'その名前のプレイヤーはいません。', zh: '没有叫这个名字的玩家。', es: 'No hay ningún jugador con ese nombre.', ar: 'لا يوجد لاعب بهذا الاسم.', vi: 'Không có người chơi nào tên như vậy.', hi: 'इस नाम का कोई खिलाड़ी नहीं है।', fr: 'Aucun joueur ne porte ce nom.', th: 'ไม่มีผู้เล่นชื่อนี้', id: 'Tidak ada pemain dengan nama itu.' },
    nowallet: { en: 'That player can\'t receive money yet.', ko: '그 플레이어는 아직 돈을 받을 수 없어요.', ja: 'そのプレイヤーはまだ受け取れません。', zh: '该玩家暂时无法收款。', es: 'Ese jugador aún no puede recibir dinero.', ar: 'لا يمكن لهذا اللاعب استلام المال بعد.', vi: 'Người chơi đó chưa thể nhận tiền.', hi: 'वह खिलाड़ी अभी पैसे नहीं ले सकता।', fr: 'Ce joueur ne peut pas encore recevoir d\'argent.', th: 'ผู้เล่นคนนั้นยังรับเงินไม่ได้', id: 'Pemain itu belum bisa menerima uang.' },
    offline: { en: 'Couldn\'t reach the bank. Try again in a moment.', ko: '은행에 연결하지 못했어요. 잠시 후 다시 해 주세요.', ja: '銀行につながりませんでした。少し後でもう一度。', zh: '无法连接银行，请稍后再试。', es: 'No se pudo contactar con el banco. Inténtalo en un momento.', ar: 'تعذّر الوصول إلى البنك. حاول بعد قليل.', vi: 'Không kết nối được ngân hàng. Thử lại sau nhé.', hi: 'बैंक से जुड़ नहीं सके। थोड़ी देर में फिर कोशिश करें।', fr: 'Impossible de joindre la banque. Réessaie dans un instant.', th: 'เชื่อมต่อธนาคารไม่ได้ ลองใหม่อีกครั้ง', id: 'Tidak bisa terhubung ke bank. Coba lagi sebentar.' },
  },
};
// Server answers that share a message.
const WHY_OF = { closed: 'offline', open: 'offline', bad: 'offline', signin: 'offline' };
export function whyText(reason, { min = 0, max = 0 } = {}) {
  const k = BANK_TEXT.why[reason] ? reason : WHY_OF[reason] || 'offline';
  return fmt(L(BANK_TEXT.why[k]), { min: won(min), max: won(max) });
}
export const memoText = (m) => L(BANK_TEXT.memos[m] || BANK_TEXT.memos.thanks);

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class BankUI {
  constructor() {
    this.panel = el('div', 'sheet bank-panel');
    this.panel.id = 'bank-panel';
    this.panel.hidden = true;
    (document.getElementById('hud') || document.body).append(this.panel);
  }
  get open() { return !this.panel.hidden; }
  close() { this.panel.hidden = true; this.onClose?.(); }

  _frame(bank, ...body) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', L(BANK_TEXT.close));
    x.onclick = () => this.close();
    this.panel.replaceChildren(x, el('h3', null, '🏦 ' + bank), ...body);
    this.panel.hidden = false;
  }

  // While asking the server whether I can send.
  asking(bank) { this._frame(bank, el('p', 'order-hint', L(BANK_TEXT.asking))); }

  // Not open to me (yet): the teller says it's coming soon.
  soon(bank) {
    const ok = el('button', 'primary', L(BANK_TEXT.close));
    ok.onclick = () => this.close();
    this._frame(bank, el('p', 'bank-soon', L(BANK_TEXT.soon)), el('p', 'order-hint', L(BANK_TEXT.soonBody)), ok);
  }

  // The transfer form. people: [{ name }] here (tap to fill the name).
  // onSend({ to, amountText, memo }) resolves to an error text or '' (sent).
  form({ bank, coins, min, max, people, onSend }) {
    const err = el('p', 'bank-err');
    const name = el('input', 'bank-name');
    Object.assign(name, { type: 'text', maxLength: 16, autocomplete: 'off', placeholder: L(BANK_TEXT.to) });
    const chips = el('div', 'bank-chips');
    for (const p of people) {
      const b = el('button', 'chip', p.name);
      b.onclick = () => { name.value = p.name; };
      chips.append(b);
    }
    const amt = el('input', 'bank-amount');
    Object.assign(amt, { type: 'text', inputMode: 'numeric', maxLength: 11, placeholder: fmt(L(BANK_TEXT.amount), { min: won(min), max: won(max) }) });
    const quick = el('div', 'bank-chips');
    for (const q of QUICK.filter((v) => v >= min && v <= max)) {
      const b = el('button', 'chip', '+' + won(q));
      b.onclick = () => { const cur = Number(amt.value.replace(/[^\d]/g, '')) || 0; amt.value = String(Math.min(max, cur + q)); paint(); };
      quick.append(b);
    }
    let memo = MEMOS[0];
    const memos = el('div', 'bank-chips');
    const memoBtns = MEMOS.map((m) => {
      const b = el('button', 'chip', memoText(m));
      b.onclick = () => { memo = m; memoBtns.forEach((o) => o.classList.toggle('on', o === b)); };
      memos.append(b);
      return b;
    });
    memoBtns[0].classList.add('on');
    const go = el('button', 'primary bank-go');
    const paint = () => { const n = Number(amt.value.replace(/[^\d]/g, '')) || 0; go.textContent = fmt(L(BANK_TEXT.go), { n: won(n) }); };
    amt.oninput = paint;
    paint();
    go.onclick = async () => {
      go.disabled = true;
      err.textContent = '';
      const why = await onSend({ to: name.value, amountText: amt.value, memo });
      go.disabled = false;
      if (why) err.textContent = why; else this.close();
    };
    const label = (t) => el('label', 'bank-label', t);
    this._frame(bank,
      el('p', 'bank-bal', fmt(L(BANK_TEXT.balance), { n: won(coins) })),
      label(L(BANK_TEXT.to)), name, chips,
      label(fmt(L(BANK_TEXT.amount), { min: won(min), max: won(max) })), amt, quick,
      label(L(BANK_TEXT.memo)), memos,
      err, go,
      el('p', 'fine', L(BANK_TEXT.opOnly)));
  }
}
