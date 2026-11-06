// Bank UI: the teller's "send coins" sheet, and the card a friend sees when
// coins come in. The rules are in core/bank.js; main.js pays, sends and
// delivers.
import { localName, getLanguage } from '../core/i18n.js';
import { SEND_MIN, SEND_MAX, FEE, MIN_AGE_DAYS, MEMOS } from '../core/bank.js';

const L = (o) => localName(o, getLanguage());
const fmt = (s, v = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

export const BANK_TEXT = {
  teller: { en: 'Teller', ko: '창구 직원', ja: '窓口係', zh: '柜员', es: 'Cajero', ar: 'موظف الشباك', vi: 'Giao dịch viên', hi: 'कैशियर', id: 'Teller' },
  open: { en: 'Send coins to a friend', ko: '친구에게 송금하기', ja: '友だちに送金', zh: '给朋友转账', es: 'Enviar monedas a un amigo', ar: 'أرسل عملات لصديق', vi: 'Chuyển xu cho bạn bè', hi: 'दोस्त को सिक्के भेजें', id: 'Kirim koin ke teman' },
  title: { en: 'Send coins', ko: '송금', ja: '送金', zh: '转账', es: 'Enviar monedas', ar: 'إرسال العملات', vi: 'Chuyển xu', hi: 'सिक्के भेजें', id: 'Kirim koin' },
  to: { en: 'To', ko: '받는 사람', ja: '送り先', zh: '收款人', es: 'Para', ar: 'إلى', vi: 'Người nhận', hi: 'किसे', id: 'Kepada' },
  amount: { en: 'Amount', ko: '금액', ja: '金額', zh: '金额', es: 'Cantidad', ar: 'المبلغ', vi: 'Số xu', hi: 'राशि', id: 'Jumlah' },
  memo: { en: 'Memo', ko: '메모', ja: 'メモ', zh: '备注', es: 'Nota', ar: 'ملاحظة', vi: 'Lời nhắn', hi: 'संदेश', id: 'Catatan' },
  memos: {
    thanks: { en: '🙏 Thanks!', ko: '🙏 고마워요!', ja: '🙏 ありがとう！', zh: '🙏 谢谢！', es: '🙏 ¡Gracias!', ar: '🙏 شكرًا!', vi: '🙏 Cảm ơn nhé!', hi: '🙏 धन्यवाद!', id: '🙏 Terima kasih!' },
    food: { en: '🍜 For food', ko: '🍜 밥값이에요', ja: '🍜 ごはん代', zh: '🍜 饭钱', es: '🍜 Para comida', ar: '🍜 ثمن الطعام', vi: '🍜 Tiền ăn', hi: '🍜 खाने के लिए', id: '🍜 Buat makan' },
    coffee: { en: "☕ Coffee's on me", ko: '☕ 커피 한잔해요', ja: '☕ コーヒーおごるね', zh: '☕ 请你喝咖啡', es: '☕ Te invito un café', ar: '☕ القهوة على حسابي', vi: '☕ Mời bạn cà phê', hi: '☕ कॉफ़ी मेरी तरफ़ से', id: '☕ Traktir kopi' },
    birthday: { en: '🎂 Happy birthday', ko: '🎂 생일 축하해요', ja: '🎂 誕生日おめでとう', zh: '🎂 生日快乐', es: '🎂 Feliz cumpleaños', ar: '🎂 عيد ميلاد سعيد', vi: '🎂 Chúc mừng sinh nhật', hi: '🎂 जन्मदिन मुबारक', id: '🎂 Selamat ulang tahun' },
    payback: { en: '💸 Paying you back', ko: '💸 빌린 돈 갚아요', ja: '💸 借りてた分を返すね', zh: '💸 还你钱', es: '💸 Te devuelvo lo que te debo', ar: '💸 أردّ لك ما عليّ', vi: '💸 Trả tiền bạn nè', hi: '💸 आपका उधार वापस', id: '💸 Bayar utang' },
    trip: { en: '✈️ For your trip', ko: '✈️ 여행 잘 다녀와요', ja: '✈️ 旅行のおこづかい', zh: '✈️ 旅行零花钱', es: '✈️ Para tu viaje', ar: '✈️ لرحلتك', vi: '✈️ Cho chuyến đi của bạn', hi: '✈️ आपकी यात्रा के लिए', id: '✈️ Buat jalan-jalan' },
  },
  nobody: { en: 'Nobody else is in the bank right now. Come here with a friend to send them coins!', ko: '지금 은행에 다른 사람이 없어요. 친구와 함께 와서 송금해 보세요!', ja: '今、銀行には他に誰もいません。友だちと一緒に来て送金してね！', zh: '银行里现在没有其他人。和朋友一起来给他们转账吧！', es: 'No hay nadie más en el banco ahora. ¡Ven con un amigo para enviarle monedas!', ar: 'لا أحد غيرك في البنك الآن. تعال مع صديق لترسل له العملات!', vi: 'Hiện không có ai khác trong ngân hàng. Hãy đến cùng bạn bè để chuyển xu nhé!', hi: 'अभी बैंक में कोई और नहीं है। किसी दोस्त के साथ आइए और उन्हें सिक्के भेजिए!', id: 'Sekarang tidak ada orang lain di bank. Datang bersama teman untuk mengirim koin!' },
  total: { en: 'Fee 🪙 {fee} · You pay 🪙 {total}', ko: '수수료 🪙 {fee} · 결제 금액 🪙 {total}', ja: '手数料 🪙 {fee} · 支払い 🪙 {total}', zh: '手续费 🪙 {fee} · 共付 🪙 {total}', es: 'Comisión 🪙 {fee} · Pagas 🪙 {total}', ar: 'الرسوم 🪙 {fee} · تدفع 🪙 {total}', vi: 'Phí 🪙 {fee} · Bạn trả 🪙 {total}', hi: 'शुल्क 🪙 {fee} · आप देंगे 🪙 {total}', id: 'Biaya 🪙 {fee} · Kamu bayar 🪙 {total}' },
  today: { en: 'Today you can still send 🪙 {coins} in {sends} transfers, and receive 🪙 {in}.', ko: '오늘 남은 한도: 송금 🪙 {coins} ({sends}회), 받기 🪙 {in}', ja: '今日の残り：送金 🪙 {coins}（{sends}回）、受け取り 🪙 {in}', zh: '今天还可转出 🪙 {coins}（{sends}次），可收 🪙 {in}。', es: 'Hoy aún puedes enviar 🪙 {coins} en {sends} envíos y recibir 🪙 {in}.', ar: 'اليوم ما زال بإمكانك إرسال 🪙 {coins} في {sends} تحويلات، واستلام 🪙 {in}.', vi: 'Hôm nay bạn còn gửi được 🪙 {coins} trong {sends} lần, và nhận được 🪙 {in}.', hi: 'आज आप अभी भी {sends} बार में 🪙 {coins} भेज सकते हैं, और 🪙 {in} पा सकते हैं।', id: 'Hari ini kamu masih bisa mengirim 🪙 {coins} dalam {sends} transfer, dan menerima 🪙 {in}.' },
  send: { en: 'Send 🪙 {n}', ko: '🪙 {n} 보내기', ja: '🪙 {n} を送る', zh: '转出 🪙 {n}', es: 'Enviar 🪙 {n}', ar: 'أرسل 🪙 {n}', vi: 'Gửi 🪙 {n}', hi: '🪙 {n} भेजें', id: 'Kirim 🪙 {n}' },
  fine: { en: 'Coins are for fun and have no cash value. Your friend has to accept; if they say no or leave, the coins and the fee come back. Daily limits stop people from moving coins between their own accounts.', ko: '코인은 게임용이라 현금 가치가 없어요. 친구가 받아야 송금이 끝나고, 거절하거나 나가면 코인과 수수료가 돌아와요. 하루 한도는 여러 계정끼리 코인을 옮기는 걸 막기 위한 거예요.', ja: 'コインはゲーム用で現金の価値はありません。友だちが受け取ると完了し、断られたり相手が出たりするとコインと手数料が戻ります。1日の上限は、自分の複数アカウント間でコインを移すのを防ぐためです。', zh: '硬币仅供游戏使用，没有现金价值。朋友接受后才算完成；对方拒绝或离开时，硬币和手续费都会退回。每日限额是为了防止在自己的多个账号之间转移硬币。', es: 'Las monedas son de juego y no tienen valor en dinero. Tu amigo tiene que aceptar; si dice que no o se va, te devolvemos las monedas y la comisión. Los límites diarios evitan mover monedas entre cuentas propias.', ar: 'العملات للعب فقط وليست لها قيمة نقدية. يجب أن يقبل صديقك؛ وإن رفض أو غادر تعود إليك العملات والرسوم. الحدود اليومية تمنع نقل العملات بين حسابات الشخص نفسه.', vi: 'Xu chỉ để chơi, không có giá trị tiền mặt. Bạn của bạn phải nhận; nếu họ từ chối hoặc rời đi, xu và phí sẽ được hoàn. Hạn mức mỗi ngày ngăn việc chuyển xu giữa các tài khoản của cùng một người.', hi: 'सिक्के सिर्फ़ खेल के लिए हैं, इनका कोई नकद मूल्य नहीं। दोस्त को स्वीकार करना होगा; मना करने या चले जाने पर सिक्के और शुल्क वापस आ जाएँगे। रोज़ की सीमा अपने ही कई खातों के बीच सिक्के घुमाने से रोकती है।', id: 'Koin hanya untuk bermain dan tidak bernilai uang. Temanmu harus menerima; kalau ditolak atau dia pergi, koin dan biayanya kembali. Batas harian mencegah orang memindahkan koin antar akunnya sendiri.' },
  // Why I can't send now (Bank.why).
  why: {
    new: { en: 'Accounts can send coins after {days} days of play. {n} more to go!', ko: '송금은 게임을 시작하고 {days}일이 지나야 할 수 있어요. {n}일 남았어요!', ja: '送金はプレイ開始から{days}日たつとできます。あと{n}日！', zh: '开始游戏满{days}天后才能转账。还剩{n}天！', es: 'Las cuentas pueden enviar monedas tras {days} días de juego. ¡Faltan {n}!', ar: 'يمكن إرسال العملات بعد {days} أيام من اللعب. بقي {n}!', vi: 'Tài khoản chơi đủ {days} ngày mới chuyển xu được. Còn {n} ngày nữa!', hi: 'खेलना शुरू करने के {days} दिन बाद सिक्के भेज सकते हैं। {n} दिन और!', id: 'Akun bisa mengirim koin setelah {days} hari bermain. Tinggal {n} lagi!' },
    waiting: { en: 'Your transfer to {name} is still waiting for an answer.', ko: '{name} 님에게 보낸 송금이 아직 답을 기다리고 있어요.', ja: '{name}さんへの送金はまだ返事待ちです。', zh: '给{name}的转账还在等回应。', es: 'Tu envío a {name} aún espera respuesta.', ar: 'تحويلك إلى {name} ما زال بانتظار الرد.', vi: 'Khoản chuyển cho {name} vẫn đang chờ trả lời.', hi: '{name} को भेजे सिक्के अभी जवाब का इंतज़ार कर रहे हैं।', id: 'Transfermu ke {name} masih menunggu jawaban.' },
    sends: { en: "You've made today's {n} transfers. More tomorrow!", ko: '오늘 송금 {n}회를 다 썼어요. 내일 또 보내요!', ja: '今日の送金{n}回を使い切りました。また明日！', zh: '今天的{n}次转账已用完，明天再来吧！', es: 'Ya hiciste los {n} envíos de hoy. ¡Más mañana!', ar: 'أجريت تحويلات اليوم الـ{n}. المزيد غدًا!', vi: 'Bạn đã dùng hết {n} lần chuyển hôm nay. Mai nhé!', hi: 'आपने आज के {n} ट्रांसफ़र कर लिए। कल और!', id: 'Kamu sudah melakukan {n} transfer hari ini. Besok lagi ya!' },
    limit: { en: 'You can send 🪙 {n} more today.', ko: '오늘은 🪙 {n}까지 더 보낼 수 있어요.', ja: '今日はあと 🪙 {n} まで送れます。', zh: '今天还能转 🪙 {n}。', es: 'Hoy puedes enviar 🪙 {n} más.', ar: 'يمكنك إرسال 🪙 {n} أخرى اليوم.', vi: 'Hôm nay bạn còn gửi được 🪙 {n}.', hi: 'आज आप 🪙 {n} और भेज सकते हैं।', id: 'Hari ini kamu masih bisa mengirim 🪙 {n}.' },
    amount: { en: 'Send between 🪙 {min} and 🪙 {max}.', ko: '🪙 {min}에서 🪙 {max} 사이로 보내 주세요.', ja: '🪙 {min}〜🪙 {max} の間で送ってね。', zh: '请转 🪙 {min} 到 🪙 {max}。', es: 'Envía entre 🪙 {min} y 🪙 {max}.', ar: 'أرسل بين 🪙 {min} و🪙 {max}.', vi: 'Hãy gửi từ 🪙 {min} đến 🪙 {max}.', hi: '🪙 {min} से 🪙 {max} के बीच भेजें।', id: 'Kirim antara 🪙 {min} dan 🪙 {max}.' },
    poor: { en: 'You need 🪙 {n} with the fee.', ko: '수수료까지 🪙 {n}이(가) 필요해요.', ja: '手数料込みで 🪙 {n} 必要です。', zh: '加上手续费需要 🪙 {n}。', es: 'Necesitas 🪙 {n} con la comisión.', ar: 'تحتاج 🪙 {n} مع الرسوم.', vi: 'Bạn cần 🪙 {n} kể cả phí.', hi: 'शुल्क मिलाकर 🪙 {n} चाहिए।', id: 'Kamu perlu 🪙 {n} termasuk biaya.' },
    pick: { en: 'Pick who to send to first.', ko: '먼저 받는 사람을 골라 주세요.', ja: '先に送り先を選んでね。', zh: '请先选择收款人。', es: 'Primero elige a quién enviar.', ar: 'اختر أولًا لمن ترسل.', vi: 'Hãy chọn người nhận trước.', hi: 'पहले चुनें कि किसे भेजना है।', id: 'Pilih dulu penerimanya.' },
  },
  sent: { en: '🏦 Sent 🪙 {n} to {name}. Waiting for them to accept…', ko: '🏦 {name} 님에게 🪙 {n}을(를) 보냈어요. 받기를 기다리는 중…', ja: '🏦 {name}さんに 🪙 {n} を送りました。受け取りを待っています…', zh: '🏦 已向{name}转出 🪙 {n}，等待对方接受…', es: '🏦 Enviaste 🪙 {n} a {name}. Esperando a que lo acepte…', ar: '🏦 أرسلت 🪙 {n} إلى {name}. بانتظار القبول…', vi: '🏦 Đã gửi 🪙 {n} cho {name}. Đang chờ họ nhận…', hi: '🏦 {name} को 🪙 {n} भेजे। उनके स्वीकार करने का इंतज़ार…', id: '🏦 Mengirim 🪙 {n} ke {name}. Menunggu diterima…' },
  card: { en: '🏦 {name} sent you 🪙 {n}', ko: '🏦 {name} 님이 🪙 {n}을(를) 보냈어요', ja: '🏦 {name}さんから 🪙 {n} が届きました', zh: '🏦 {name}给你转了 🪙 {n}', es: '🏦 {name} te envió 🪙 {n}', ar: '🏦 أرسل لك {name} 🪙 {n}', vi: '🏦 {name} đã gửi bạn 🪙 {n}', hi: '🏦 {name} ने आपको 🪙 {n} भेजे', id: '🏦 {name} mengirimimu 🪙 {n}' },
  accepted: { en: '🎉 {name} accepted your 🪙 {n}!', ko: '🎉 {name} 님이 🪙 {n}을(를) 받았어요!', ja: '🎉 {name}さんが 🪙 {n} を受け取りました！', zh: '🎉 {name}收下了你的 🪙 {n}！', es: '🎉 ¡{name} aceptó tus 🪙 {n}!', ar: '🎉 قبل {name} الـ🪙 {n}!', vi: '🎉 {name} đã nhận 🪙 {n} của bạn!', hi: '🎉 {name} ने आपके 🪙 {n} स्वीकार किए!', id: '🎉 {name} menerima 🪙 {n} darimu!' },
  got: { en: '🏦 🪙 {n} from {name} are in your wallet!', ko: '🏦 {name} 님이 보낸 🪙 {n}이(가) 지갑에 들어왔어요!', ja: '🏦 {name}さんからの 🪙 {n} がお財布に入りました！', zh: '🏦 {name}转来的 🪙 {n} 已到账！', es: '🏦 ¡Los 🪙 {n} de {name} están en tu cartera!', ar: '🏦 وصلت 🪙 {n} من {name} إلى محفظتك!', vi: '🏦 🪙 {n} từ {name} đã vào ví của bạn!', hi: '🏦 {name} के भेजे 🪙 {n} आपके बटुए में आ गए!', id: '🏦 🪙 {n} dari {name} sudah masuk dompetmu!' },
  mineLimit: { en: 'You can receive 🪙 {max} a day, so it went back to {name}.', ko: '하루에 받을 수 있는 코인은 🪙 {max}까지라서 {name} 님에게 돌려보냈어요.', ja: '1日に受け取れるのは 🪙 {max} までなので、{name}さんに戻しました。', zh: '每天最多收 🪙 {max}，已退还给{name}。', es: 'Puedes recibir 🪙 {max} al día, así que volvió a {name}.', ar: 'يمكنك استلام 🪙 {max} يوميًا، فأُعيدت إلى {name}.', vi: 'Mỗi ngày bạn chỉ nhận được 🪙 {max}, nên đã trả lại cho {name}.', hi: 'आप एक दिन में 🪙 {max} ही पा सकते हैं, इसलिए यह {name} को लौट गया।', id: 'Kamu hanya bisa menerima 🪙 {max} sehari, jadi dikembalikan ke {name}.' },
  back: {
    no: { en: '{name} said no thanks. Your 🪙 {n} are back, fee included.', ko: '{name} 님이 사양했어요. 수수료 포함 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんは遠慮しました。手数料込みで 🪙 {n} が戻りました。', zh: '{name}婉拒了。🪙 {n}（含手续费）已退回。', es: '{name} dijo que no, gracias. Recuperas 🪙 {n}, comisión incluida.', ar: 'اعتذر {name}. استعدت 🪙 {n} مع الرسوم.', vi: '{name} đã từ chối. Bạn được hoàn 🪙 {n}, kể cả phí.', hi: '{name} ने मना कर दिया। शुल्क समेत आपके 🪙 {n} वापस आ गए।', id: '{name} menolak. 🪙 {n} milikmu kembali, termasuk biaya.' },
    limit: { en: "{name} can't receive more today. Your 🪙 {n} are back, fee included.", ko: '{name} 님은 오늘 더 받을 수 없어요. 수수료 포함 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんは今日これ以上受け取れません。手数料込みで 🪙 {n} が戻りました。', zh: '{name}今天不能再收了。🪙 {n}（含手续费）已退回。', es: '{name} no puede recibir más hoy. Recuperas 🪙 {n}, comisión incluida.', ar: 'لا يستطيع {name} استلام المزيد اليوم. استعدت 🪙 {n} مع الرسوم.', vi: 'Hôm nay {name} không nhận thêm được. Bạn được hoàn 🪙 {n}, kể cả phí.', hi: '{name} आज और नहीं ले सकते। शुल्क समेत आपके 🪙 {n} वापस आ गए।', id: '{name} tidak bisa menerima lagi hari ini. 🪙 {n} milikmu kembali, termasuk biaya.' },
    busy: { en: '{name} has another transfer waiting. Your 🪙 {n} are back, fee included.', ko: '{name} 님에게 기다리는 송금이 이미 있어요. 수수료 포함 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんには他の送金が届いています。手数料込みで 🪙 {n} が戻りました。', zh: '{name}还有别的转账没处理。🪙 {n}（含手续费）已退回。', es: '{name} tiene otro envío pendiente. Recuperas 🪙 {n}, comisión incluida.', ar: 'لدى {name} تحويل آخر بالانتظار. استعدت 🪙 {n} مع الرسوم.', vi: '{name} đang có khoản chuyển khác chờ nhận. Bạn được hoàn 🪙 {n}, kể cả phí.', hi: '{name} के पास एक और ट्रांसफ़र इंतज़ार में है। शुल्क समेत आपके 🪙 {n} वापस आ गए।', id: '{name} masih punya transfer lain yang menunggu. 🪙 {n} milikmu kembali, termasuk biaya.' },
    late: { en: "{name} didn't answer in time. Your 🪙 {n} are back, fee included.", ko: '{name} 님이 제시간에 답하지 않았어요. 수수료 포함 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんから返事がありませんでした。手数料込みで 🪙 {n} が戻りました。', zh: '{name}没有及时回应。🪙 {n}（含手续费）已退回。', es: '{name} no respondió a tiempo. Recuperas 🪙 {n}, comisión incluida.', ar: 'لم يرد {name} في الوقت. استعدت 🪙 {n} مع الرسوم.', vi: '{name} không trả lời kịp. Bạn được hoàn 🪙 {n}, kể cả phí.', hi: '{name} ने समय पर जवाब नहीं दिया। शुल्क समेत आपके 🪙 {n} वापस आ गए।', id: '{name} tidak menjawab tepat waktu. 🪙 {n} milikmu kembali, termasuk biaya.' },
    gone: { en: '{name} left. Your 🪙 {n} are back, fee included.', ko: '{name} 님이 나갔어요. 수수료 포함 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんが出て行きました。手数料込みで 🪙 {n} が戻りました。', zh: '{name}离开了。🪙 {n}（含手续费）已退回。', es: '{name} se fue. Recuperas 🪙 {n}, comisión incluida.', ar: 'غادر {name}. استعدت 🪙 {n} مع الرسوم.', vi: '{name} đã rời đi. Bạn được hoàn 🪙 {n}, kể cả phí.', hi: '{name} चले गए। शुल्क समेत आपके 🪙 {n} वापस आ गए।', id: '{name} sudah pergi. 🪙 {n} milikmu kembali, termasuk biaya.' },
  },
  // Budget book notes.
  ledgerOut: { en: '🏦 Transfer sent', ko: '🏦 송금', ja: '🏦 送金', zh: '🏦 转出', es: '🏦 Envío', ar: '🏦 تحويل مُرسل', vi: '🏦 Chuyển đi', hi: '🏦 ट्रांसफ़र भेजा', id: '🏦 Transfer keluar' },
  ledgerIn: { en: '🏦 Transfer received', ko: '🏦 입금', ja: '🏦 入金', zh: '🏦 转入', es: '🏦 Recibido', ar: '🏦 تحويل مُستلم', vi: '🏦 Nhận tiền', hi: '🏦 ट्रांसफ़र मिला', id: '🏦 Transfer masuk' },
  ledgerBack: { en: '🏦 Transfer returned', ko: '🏦 송금 반환', ja: '🏦 送金の返金', zh: '🏦 转账退回', es: '🏦 Envío devuelto', ar: '🏦 تحويل مُعاد', vi: '🏦 Hoàn chuyển khoản', hi: '🏦 ट्रांसफ़र वापस', id: '🏦 Transfer dikembalikan' },
  accept: { en: 'Accept', ko: '받기', ja: '受け取る', zh: '接受', es: 'Aceptar', ar: 'اقبل', vi: 'Nhận', hi: 'स्वीकार करें', id: 'Terima' },
  decline: { en: 'No thanks', ko: '괜찮아요', ja: '遠慮する', zh: '不用了', es: 'No, gracias', ar: 'لا، شكرًا', vi: 'Không, cảm ơn', hi: 'नहीं, धन्यवाद', id: 'Tidak, terima kasih' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', ar: 'إغلاق', vi: 'Đóng', hi: 'बंद करें', id: 'Tutup' },
};

// The message for a Bank.why() reason.
export function whyText(reason, { name = '', daysToGo = 0, left = 0, sends = 0, need = 0 } = {}) {
  const w = BANK_TEXT.why[reason];
  return w ? fmt(L(w), { name, days: MIN_AGE_DAYS, n: { new: daysToGo, sends, limit: left, poor: need }[reason] ?? '', min: SEND_MIN, max: SEND_MAX }) : '';
}

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const QUICK = [10, 50, 100, 200];

export class BankUI {
  // check(to, coins) -> a message why it can't go, or ''; onSend({ to, coins, memo });
  // onAnswer(tid, ok) from a card.
  constructor({ onSend, onAnswer, check }) {
    Object.assign(this, { onSend, onAnswer, check });
    this.panel = el('div', 'sheet bank-panel');
    this.panel.id = 'bank-panel';
    this.panel.hidden = true;
    this.cardsEl = el('div', 'gift-cards bank-cards');
    this.cardsEl.id = 'bank-cards';
    const host = document.getElementById('hud') || document.body;
    host.append(this.panel, this.cardsEl);
    this.draft = { to: null, coins: 50, memo: MEMOS[0] };
  }
  get open() { return !this.panel.hidden; }
  close() { this.panel.hidden = true; }

  // The teller's sheet. info: { bank (name), coins (balance), people: [{ id, name }],
  // left: { coins, sends, inCoins }, blocked: a reason it can't be used at all, or '' }.
  show(info) {
    this.info = info;
    const d = this.draft;
    if (!info.people.some((p) => p.id === d.to)) d.to = info.people[0]?.id ?? null;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', L(BANK_TEXT.close));
    x.onclick = () => this.close();
    const head = el('div', 'gift-thing');
    head.append(el('span', 'gift-icon', '🏦'), el('strong', null, info.bank), el('b', null, `🪙 ${info.coins.toLocaleString()}`));
    const parts = [x, el('h3', null, L(BANK_TEXT.title)), head];
    if (info.blocked) parts.push(el('p', 'order-hint', info.blocked));
    // To
    parts.push(el('div', 'bank-label', L(BANK_TEXT.to)));
    const people = el('div', 'gift-people bank-people');
    if (!info.people.length) people.append(el('p', 'order-hint', L(BANK_TEXT.nobody)));
    for (const p of info.people) {
      const b = el('button', 'chip gift-person' + (p.id === d.to ? ' on' : ''), '👤 ' + p.name);
      b.dataset.id = p.id;
      b.onclick = () => { d.to = p.id; this.show(this.info); };
      people.append(b);
    }
    parts.push(people);
    // Amount
    parts.push(el('div', 'bank-label', L(BANK_TEXT.amount)));
    const row = el('div', 'bank-amount');
    const input = el('input');
    Object.assign(input, { type: 'number', min: SEND_MIN, max: SEND_MAX, step: 1, inputMode: 'numeric', value: d.coins, id: 'bank-coins' });
    for (const n of QUICK) {
      const b = el('button', 'chip' + (n === d.coins ? ' on' : ''), `🪙 ${n}`);
      b.onclick = () => { d.coins = n; this.show(this.info); };
      row.append(b);
    }
    row.append(input);
    parts.push(row);
    // Memo
    parts.push(el('div', 'bank-label', L(BANK_TEXT.memo)));
    const memos = el('div', 'bank-memos');
    for (const m of MEMOS) {
      const b = el('button', 'chip' + (m === d.memo ? ' on' : ''), L(BANK_TEXT.memos[m]));
      b.onclick = () => { d.memo = m; this.show(this.info); };
      memos.append(b);
    }
    parts.push(memos);
    // Total, limits, send
    const total = el('p', 'bank-total');
    const err = el('p', 'bank-err');
    const send = el('button', 'primary', '');
    send.id = 'bank-send';
    const update = () => {
      const n = Math.floor(Number(input.value) || 0);
      d.coins = n;
      for (const b of row.querySelectorAll('.chip')) b.classList.toggle('on', b.textContent === `🪙 ${n}`);
      total.textContent = fmt(L(BANK_TEXT.total), { fee: FEE, total: n + FEE });
      send.textContent = fmt(L(BANK_TEXT.send), { n });
      const why = info.blocked || (d.to ? this.check(d.to, n) : whyText('pick'));
      err.textContent = info.blocked ? '' : why;
      send.disabled = !!why;
    };
    input.oninput = update;
    send.onclick = () => {
      update();
      if (send.disabled) return;
      const p = info.people.find((q) => q.id === d.to);
      this.close();
      this.onSend({ to: p, coins: d.coins, memo: d.memo });
    };
    update();
    const l = info.left;
    parts.push(total, err, send, el('p', 'bank-today', fmt(L(BANK_TEXT.today), { coins: l.coins, sends: l.sends, in: l.inCoins })), el('p', 'fine', L(BANK_TEXT.fine)));
    this.panel.replaceChildren(...parts);
    this.panel.hidden = false;
  }

  // The transfer cards I have waiting: [{ tid, name, coins, memo }].
  showCards(cards) {
    this.cardsEl.replaceChildren(...cards.map((c) => {
      const card = el('div', 'gift-card bank-card');
      const txt = el('div', 'gift-card-text');
      txt.append(el('strong', null, fmt(L(BANK_TEXT.card), { name: c.name, n: c.coins })), el('span', null, L(BANK_TEXT.memos[c.memo]) || ''));
      const yes = el('button', 'primary', L(BANK_TEXT.accept));
      yes.onclick = () => this.onAnswer(c.tid, true);
      const no = el('button', 'chip', L(BANK_TEXT.decline));
      no.onclick = () => this.onAnswer(c.tid, false);
      const btns = el('div', 'gift-card-btns');
      btns.append(no, yes);
      card.append(el('span', 'gift-card-icon', '🏦'), txt, btns);
      return card;
    }));
  }
}

