// The friends panel, laid out like a phone messenger: a list of chats
// (All friends, then each friend, with the newest line and unread count),
// friend requests, adding a friend by name, and a chat view whose messages
// stay (they are kept on the server, see core/friends.js).

import { L, fmt } from './pocha-ui.js';
import { ALL, MAX_BODY } from '../core/friends.js';

export const FRIEND_TEXT = {
  title: { en: 'Friends', ko: '친구', ja: 'フレンド', zh: '好友', es: 'Amigos', id: 'Teman', vi: 'Bạn bè', hi: 'दोस्त', fr: 'Amis', th: 'เพื่อน', ar: 'الأصدقاء' },
  allFriends: { en: 'All friends', ko: '전체 친구', ja: 'フレンド全員', zh: '全部好友', es: 'Todos mis amigos', id: 'Semua teman', vi: 'Tất cả bạn bè', hi: 'सभी दोस्त', fr: 'Tous les amis', th: 'เพื่อนทั้งหมด', ar: 'كل الأصدقاء' },
  everyone: { en: 'Everyone nearby', ko: '전체', ja: '全体', zh: '全体', es: 'Todos cerca', id: 'Semua di sekitar', vi: 'Mọi người', hi: 'सब लोग', fr: 'Tout le monde autour', th: 'ทุกคนที่อยู่ใกล้', ar: 'الجميع' },
  keepNote: { en: 'Chats with friends are saved, so you can read them later. Only you and the friend (or your friends, in All friends) can read them.', ko: '친구와의 대화는 저장돼서 나중에 다시 볼 수 있어요. 나와 그 친구(전체 친구 방은 내 친구들)만 볼 수 있어요.', ja: 'フレンドとの会話は保存され、あとで読み返せます。読めるのは自分と相手（「フレンド全員」は自分のフレンド）だけです。', zh: '和好友的聊天会被保存，之后还能再看。只有你和对方（“全部好友”里是你的好友）能看到。', es: 'Los chats con amigos se guardan para que puedas leerlos después. Solo tú y tu amigo (o tus amigos, en Todos mis amigos) pueden leerlos.', id: 'Obrolan dengan teman disimpan, jadi bisa dibaca lagi nanti. Hanya kamu dan temanmu (atau teman-temanmu, di Semua teman) yang bisa membacanya.', vi: 'Tin nhắn với bạn bè được lưu lại để đọc sau. Chỉ bạn và người đó (hoặc bạn bè của bạn, trong Tất cả bạn bè) đọc được.', hi: 'दोस्तों से बातचीत सेव रहती है, ताकि आप बाद में पढ़ सकें। इसे सिर्फ़ आप और वह दोस्त (सभी दोस्त में आपके दोस्त) पढ़ सकते हैं।', fr: 'Les discussions avec les amis sont enregistrées, tu peux donc les lire plus tard. Seuls toi et l\'ami (ou tes amis, dans Tous les amis) pouvez les lire.', th: 'แชทกับเพื่อนจะถูกบันทึกไว้ อ่านย้อนหลังได้ มีแค่คุณกับเพื่อน (หรือเพื่อนทุกคนในเพื่อนทั้งหมด) ที่อ่านได้', ar: 'تُحفظ محادثات الأصدقاء لتقرأها لاحقًا. لا يقرؤها إلا أنت وصديقك (أو أصدقاؤك في «كل الأصدقاء»).' },
  local: { en: 'Not connected to the server: friends here are other tabs of this browser.', ko: '서버에 연결되지 않아, 이 브라우저의 다른 탭끼리만 친구가 돼요.', ja: 'サーバー未接続のため、このブラウザの別タブ同士だけがフレンドになれます。', zh: '未连接服务器：只能和本浏览器的其他标签页互加好友。', es: 'Sin conexión al servidor: aquí tus amigos son otras pestañas de este navegador.', id: 'Belum terhubung ke server: teman di sini hanya tab lain di browser ini.', vi: 'Chưa kết nối máy chủ: bạn bè ở đây chỉ là các tab khác của trình duyệt này.', hi: 'सर्वर से नहीं जुड़े: यहाँ दोस्त इसी ब्राउज़र के दूसरे टैब हैं।', fr: 'Non connecté au serveur : les amis ici sont d\'autres onglets de ce navigateur.', th: 'ไม่ได้เชื่อมต่อเซิร์ฟเวอร์ เพื่อนที่เห็นคือแท็บอื่นของเบราว์เซอร์นี้', ar: 'غير متصل بالخادم: الأصدقاء هنا هم علامات تبويب أخرى في هذا المتصفح.' },
  missing: { en: 'Friends are being set up. Please come back soon!', ko: '친구 기능을 준비하고 있어요. 조금만 기다려 주세요!', ja: 'フレンド機能を準備中です。もう少しお待ちください！', zh: '好友功能准备中，请稍后再来！', es: 'Estamos preparando los amigos. ¡Vuelve pronto!', id: 'Fitur teman sedang disiapkan. Kembali lagi nanti ya!', vi: 'Tính năng bạn bè đang được chuẩn bị. Quay lại sau nhé!', hi: 'दोस्त फ़ीचर तैयार हो रहा है। जल्द लौटें!', fr: 'Les amis sont en cours de mise en place. Reviens bientôt !', th: 'ระบบเพื่อนกำลังเตรียมพร้อม แวะมาใหม่เร็วๆ นี้นะ!', ar: 'نجهّز ميزة الأصدقاء. عد قريبًا!' },
  noAccount: { en: 'Friends need an online save. Please try again in a moment.', ko: '친구 기능은 온라인 저장이 연결돼야 쓸 수 있어요. 잠시 후 다시 해 주세요.', ja: 'フレンド機能にはオンライン保存が必要です。少ししてからもう一度。', zh: '好友功能需要在线存档，请稍后再试。', es: 'Los amigos necesitan una partida en línea. Inténtalo en un momento.', id: 'Fitur teman butuh simpanan online. Coba lagi sebentar lagi.', vi: 'Tính năng bạn bè cần lưu trực tuyến. Vui lòng thử lại sau.', hi: 'दोस्तों के लिए ऑनलाइन सेव चाहिए। थोड़ी देर में फिर कोशिश करें।', fr: 'Les amis nécessitent une sauvegarde en ligne. Réessaie dans un moment.', th: 'ระบบเพื่อนต้องใช้การบันทึกออนไลน์ โปรดลองใหม่อีกสักครู่', ar: 'تحتاج ميزة الأصدقاء إلى حفظ عبر الإنترنت. حاول بعد قليل.' },
  requests: { en: 'Friend requests', ko: '친구 신청', ja: 'フレンド申請', zh: '好友申请', es: 'Solicitudes', id: 'Permintaan teman', vi: 'Lời mời kết bạn', hi: 'दोस्ती अनुरोध', fr: 'Demandes d\'ami', th: 'คำขอเป็นเพื่อน', ar: 'طلبات الصداقة' },
  accept: { en: 'Accept', ko: '수락', ja: '承認', zh: '接受', es: 'Aceptar', id: 'Terima', vi: 'Đồng ý', hi: 'स्वीकारें', fr: 'Accepter', th: 'รับ', ar: 'قبول' },
  decline: { en: 'Decline', ko: '거절', ja: '断る', zh: '拒绝', es: 'Rechazar', id: 'Tolak', vi: 'Từ chối', hi: 'मना करें', fr: 'Refuser', th: 'ปฏิเสธ', ar: 'رفض' },
  waiting: { en: 'Waiting for {name} to accept', ko: '{name} 님의 수락을 기다리는 중', ja: '{name}さんの承認待ち', zh: '等待 {name} 接受', es: 'Esperando a que {name} acepte', id: 'Menunggu {name} menerima', vi: 'Đang chờ {name} đồng ý', hi: '{name} के स्वीकारने का इंतज़ार', fr: 'En attente de l\'acceptation de {name}', th: 'รอ {name} ตอบรับ', ar: 'بانتظار موافقة {name}' },
  cancel: { en: 'Cancel', ko: '취소', ja: '取り消す', zh: '取消', es: 'Cancelar', id: 'Batal', vi: 'Hủy', hi: 'रद्द करें', fr: 'Annuler', th: 'ยกเลิก', ar: 'إلغاء' },
  addPh: { en: 'Add a friend by player name', ko: '플레이어 이름으로 친구 추가', ja: 'プレイヤー名でフレンド追加', zh: '输入玩家名添加好友', es: 'Añadir amigo por nombre', id: 'Tambah teman lewat nama', vi: 'Thêm bạn bằng tên người chơi', hi: 'खिलाड़ी के नाम से दोस्त जोड़ें', fr: 'Ajouter un ami par son nom de joueur', th: 'เพิ่มเพื่อนด้วยชื่อผู้เล่น', ar: 'أضف صديقًا باسم اللاعب' },
  add: { en: 'Add', ko: '추가', ja: '追加', zh: '添加', es: 'Añadir', id: 'Tambah', vi: 'Thêm', hi: 'जोड़ें', fr: 'Ajouter', th: 'เพิ่ม', ar: 'إضافة' },
  addFriend: { en: 'Add friend', ko: '친구 추가', ja: 'フレンド追加', zh: '加好友', es: 'Añadir amigo', id: 'Tambah teman', vi: 'Kết bạn', hi: 'दोस्त जोड़ें', fr: 'Ajouter en ami', th: 'เพิ่มเพื่อน', ar: 'إضافة صديق' },
  isFriend: { en: 'Message', ko: '메시지', ja: 'メッセージ', zh: '发消息', es: 'Mensaje', id: 'Pesan', vi: 'Nhắn tin', hi: 'संदेश', fr: 'Message', th: 'ข้อความ', ar: 'رسالة' },
  noFriends: { en: 'No friends yet. Tap a name in the chat, or add one by name below.', ko: '아직 친구가 없어요. 채팅에서 이름을 누르거나 아래에 이름을 써서 추가해 보세요.', ja: 'まだフレンドがいません。チャットの名前をタップするか、下に名前を入力して追加しましょう。', zh: '还没有好友。点聊天里的名字，或在下方输入名字添加。', es: 'Aún no tienes amigos. Toca un nombre en el chat o añade uno abajo.', id: 'Belum ada teman. Ketuk nama di obrolan, atau tambah lewat nama di bawah.', vi: 'Chưa có bạn bè. Chạm vào tên trong chat, hoặc thêm bằng tên bên dưới.', hi: 'अभी कोई दोस्त नहीं। चैट में नाम पर टैप करें या नीचे नाम लिखकर जोड़ें।', fr: 'Pas encore d\'amis. Touche un nom dans le chat, ou ajoute-en un par son nom ci-dessous.', th: 'ยังไม่มีเพื่อน แตะชื่อในแชท หรือเพิ่มด้วยชื่อด้านล่าง', ar: 'لا أصدقاء بعد. اضغط اسمًا في الدردشة أو أضف اسمًا بالأسفل.' },
  noMessages: { en: 'No messages yet. Say hi!', ko: '아직 대화가 없어요. 인사해 보세요!', ja: 'まだメッセージがありません。あいさつしてみよう！', zh: '还没有消息，打个招呼吧！', es: 'Aún no hay mensajes. ¡Saluda!', id: 'Belum ada pesan. Sapa dulu!', vi: 'Chưa có tin nhắn. Chào một câu nhé!', hi: 'अभी कोई संदेश नहीं। नमस्ते कहें!', fr: 'Pas encore de messages. Dis bonjour !', th: 'ยังไม่มีข้อความ ทักทายกันหน่อย!', ar: 'لا رسائل بعد. قل مرحبًا!' },
  ph: { en: 'Message', ko: '메시지 보내기', ja: 'メッセージ', zh: '发消息', es: 'Mensaje', id: 'Pesan', vi: 'Tin nhắn', hi: 'संदेश', fr: 'Message', th: 'ข้อความ', ar: 'رسالة' },
  send: { en: 'Send', ko: '보내기', ja: '送信', zh: '发送', es: 'Enviar', id: 'Kirim', vi: 'Gửi', hi: 'भेजें', fr: 'Envoyer', th: 'ส่ง', ar: 'إرسال' },
  back: { en: 'Back', ko: '뒤로', ja: '戻る', zh: '返回', es: 'Atrás', id: 'Kembali', vi: 'Quay lại', hi: 'वापस', fr: 'Retour', th: 'กลับ', ar: 'رجوع' },
  unfriend: { en: 'Remove friend', ko: '친구 끊기', ja: 'フレンド解除', zh: '删除好友', es: 'Quitar amigo', id: 'Hapus teman', vi: 'Hủy kết bạn', hi: 'दोस्ती हटाएँ', fr: 'Retirer l\'ami', th: 'ลบเพื่อน', ar: 'إزالة الصديق' },
  unfriendAsk: { en: 'Remove {name} from your friends? Your chat with them will be hidden.', ko: '{name} 님을 친구에서 뺄까요? 그 친구와의 대화도 안 보이게 돼요.', ja: '{name}さんをフレンドから外しますか？会話も見えなくなります。', zh: '要把 {name} 移出好友吗？和对方的聊天也会隐藏。', es: '¿Quitar a {name} de tus amigos? Tu chat con esa persona se ocultará.', id: 'Hapus {name} dari teman? Obrolan dengannya akan disembunyikan.', vi: 'Xóa {name} khỏi bạn bè? Cuộc trò chuyện cũng sẽ bị ẩn.', hi: '{name} को दोस्तों से हटाएँ? उनसे बातचीत छिप जाएगी।', fr: 'Retirer {name} de tes amis ? Ta discussion avec cette personne sera masquée.', th: 'ลบ {name} ออกจากเพื่อนไหม? แชทกับเขาจะถูกซ่อน', ar: 'إزالة {name} من أصدقائك؟ ستُخفى محادثتكما.' },
  you: { en: 'You', ko: '나', ja: '自分', zh: '我', es: 'Tú', id: 'Kamu', vi: 'Bạn', hi: 'आप', fr: 'Toi', th: 'คุณ', ar: 'أنت' },
  loading: { en: 'Loading…', ko: '불러오는 중…', ja: '読み込み中…', zh: '加载中…', es: 'Cargando…', id: 'Memuat…', vi: 'Đang tải…', hi: 'लोड हो रहा है…', fr: 'Chargement…', th: 'กำลังโหลด…', ar: 'جارٍ التحميل…' },
  // Results and errors (shown as a toast).
  r_requested: { en: 'Friend request sent to {name}.', ko: '{name} 님에게 친구 신청을 보냈어요.', ja: '{name}さんにフレンド申請を送りました。', zh: '已向 {name} 发送好友申请。', es: 'Solicitud enviada a {name}.', id: 'Permintaan teman terkirim ke {name}.', vi: 'Đã gửi lời mời kết bạn tới {name}.', hi: '{name} को दोस्ती अनुरोध भेजा।', fr: 'Demande d\'ami envoyée à {name}.', th: 'ส่งคำขอเป็นเพื่อนถึง {name} แล้ว', ar: 'أُرسل طلب صداقة إلى {name}.' },
  r_friends: { en: 'You and {name} are now friends!', ko: '{name} 님과 친구가 됐어요!', ja: '{name}さんとフレンドになりました！', zh: '你和 {name} 成为好友了！', es: '¡{name} y tú ahora son amigos!', id: 'Kamu dan {name} sekarang berteman!', vi: 'Bạn và {name} đã là bạn bè!', hi: 'आप और {name} अब दोस्त हैं!', fr: '{name} et toi êtes maintenant amis !', th: 'คุณกับ {name} เป็นเพื่อนกันแล้ว!', ar: 'أنت و{name} صديقان الآن!' },
  r_notfound: { en: 'No player called "{name}".', ko: '"{name}" 이름의 플레이어가 없어요.', ja: '「{name}」というプレイヤーはいません。', zh: '没有叫“{name}”的玩家。', es: 'No hay ningún jugador llamado "{name}".', id: 'Tidak ada pemain bernama "{name}".', vi: 'Không có người chơi tên "{name}".', hi: '"{name}" नाम का कोई खिलाड़ी नहीं।', fr: 'Aucun joueur nommé « {name} ».', th: 'ไม่มีผู้เล่นชื่อ "{name}"', ar: 'لا يوجد لاعب باسم "{name}".' },
  r_self: { en: "That's you!", ko: '나 자신이에요!', ja: 'それはあなたです！', zh: '那是你自己！', es: '¡Ese eres tú!', id: 'Itu kamu sendiri!', vi: 'Đó là bạn mà!', hi: 'यह तो आप हैं!', fr: 'C\'est toi !', th: 'นั่นคือคุณเอง!', ar: 'هذا أنت!' },
  r_full: { en: 'You can have up to 200 friends.', ko: '친구는 200명까지 둘 수 있어요.', ja: 'フレンドは200人までです。', zh: '最多可以有200个好友。', es: 'Puedes tener hasta 200 amigos.', id: 'Maksimal 200 teman.', vi: 'Tối đa 200 bạn bè.', hi: 'अधिकतम 200 दोस्त।', fr: 'Tu peux avoir jusqu\'à 200 amis.', th: 'มีเพื่อนได้สูงสุด 200 คน', ar: 'الحد الأقصى 200 صديق.' },
  r_signin: { en: 'Friends need an online save. Please try again in a moment.', ko: '친구 기능은 온라인 저장이 연결돼야 쓸 수 있어요.', ja: 'フレンド機能にはオンライン保存が必要です。', zh: '好友功能需要在线存档。', es: 'Los amigos necesitan una partida en línea.', id: 'Fitur teman butuh simpanan online.', vi: 'Tính năng bạn bè cần lưu trực tuyến.', hi: 'दोस्तों के लिए ऑनलाइन सेव चाहिए।', fr: 'Les amis nécessitent une sauvegarde en ligne. Réessaie dans un moment.', th: 'ระบบเพื่อนต้องใช้การบันทึกออนไลน์ โปรดลองใหม่อีกสักครู่', ar: 'تحتاج ميزة الأصدقاء إلى حفظ عبر الإنترنت.' },
  e_network: { en: 'Couldn’t reach the server. Try again in a moment.', ko: '서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.', ja: 'サーバーにつながりませんでした。少ししてからもう一度。', zh: '无法连接服务器，请稍后再试。', es: 'No se pudo conectar. Inténtalo en un momento.', id: 'Tidak bisa terhubung ke server. Coba lagi nanti.', vi: 'Không kết nối được máy chủ. Thử lại sau nhé.', hi: 'सर्वर से नहीं जुड़ पाए। थोड़ी देर में फिर कोशिश करें।', fr: 'Impossible de joindre le serveur. Réessaie dans un moment.', th: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ โปรดลองใหม่อีกสักครู่', ar: 'تعذّر الاتصال بالخادم. حاول بعد قليل.' },
  e_rate: { en: 'Slow down a little!', ko: '조금 천천히 보내 주세요!', ja: '少しゆっくり送ってください！', zh: '发慢一点哦！', es: '¡Más despacio!', id: 'Pelan-pelan ya!', vi: 'Gửi chậm lại chút nhé!', hi: 'थोड़ा धीरे!', fr: 'Doucement, ralentis un peu !', th: 'ช้าลงหน่อยนะ!', ar: 'تمهّل قليلًا!' },
  e_notfriend: { en: "You're not friends anymore.", ko: '이제 친구가 아니에요.', ja: 'もうフレンドではありません。', zh: '你们已经不是好友了。', es: 'Ya no son amigos.', id: 'Kalian sudah tidak berteman.', vi: 'Hai bạn không còn là bạn bè.', hi: 'अब आप दोस्त नहीं हैं।', fr: 'Vous n\'êtes plus amis.', th: 'คุณไม่ได้เป็นเพื่อนกันแล้ว', ar: 'لم تعودا صديقين.' },
  e_nofriends: { en: 'Add a friend first.', ko: '먼저 친구를 추가해 주세요.', ja: '先にフレンドを追加してください。', zh: '请先添加好友。', es: 'Primero añade un amigo.', id: 'Tambah teman dulu.', vi: 'Hãy thêm bạn trước.', hi: 'पहले कोई दोस्त जोड़ें।', fr: 'Ajoute d\'abord un ami.', th: 'เพิ่มเพื่อนก่อน', ar: 'أضف صديقًا أولًا.' },
  e_chat: { en: "You can't send chat right now (only players signed in with Google can chat).", ko: '지금은 채팅을 보낼 수 없어요 (구글로 로그인한 플레이어만 채팅할 수 있어요).', ja: '今はチャットを送れません（Googleでログインしたプレイヤーのみ）。', zh: '现在无法发送消息（只有用 Google 登录的玩家可以聊天）。', es: 'Ahora no puedes enviar mensajes (solo jugadores con Google).', id: 'Kamu belum bisa mengirim obrolan (hanya pemain yang masuk dengan Google).', vi: 'Hiện bạn chưa gửi được tin nhắn (chỉ người chơi đăng nhập Google).', hi: 'अभी आप चैट नहीं भेज सकते (सिर्फ़ Google से साइन-इन खिलाड़ी)।', fr: 'Tu ne peux pas chatter pour l\'instant (seuls les joueurs connectés avec Google peuvent chatter).', th: 'ตอนนี้ส่งแชทไม่ได้ (เฉพาะผู้เล่นที่เข้าสู่ระบบด้วย Google เท่านั้นที่แชทได้)', ar: 'لا يمكنك إرسال الدردشة الآن (فقط لمن سجّل الدخول بحساب Google).' },
  e_missing: { en: 'Friends are being set up. Please come back soon!', ko: '친구 기능을 준비하고 있어요. 조금만 기다려 주세요!', ja: 'フレンド機能を準備中です。', zh: '好友功能准备中。', es: 'Estamos preparando los amigos.', id: 'Fitur teman sedang disiapkan.', vi: 'Tính năng bạn bè đang được chuẩn bị.', hi: 'दोस्त फ़ीचर तैयार हो रहा है।', fr: 'Les amis sont en cours de mise en place. Reviens bientôt !', th: 'ระบบเพื่อนกำลังเตรียมพร้อม แวะมาใหม่เร็วๆ นี้นะ!', ar: 'نجهّز ميزة الأصدقاء.' },
  newRequest: { en: '{name} wants to be friends. Open 💬 → 👥 to answer.', ko: '{name} 님이 친구 신청을 했어요. 💬 → 👥 에서 확인하세요.', ja: '{name}さんからフレンド申請が届きました。💬 → 👥 で確認できます。', zh: '{name} 想加你为好友。在 💬 → 👥 查看。', es: '{name} quiere ser tu amigo. Abre 💬 → 👥 para responder.', id: '{name} ingin berteman. Buka 💬 → 👥 untuk menjawab.', vi: '{name} muốn kết bạn. Mở 💬 → 👥 để trả lời.', hi: '{name} दोस्त बनना चाहते हैं। जवाब देने के लिए 💬 → 👥 खोलें।', fr: '{name} veut devenir ton ami. Ouvre 💬 → 👥 pour répondre.', th: '{name} อยากเป็นเพื่อนกับคุณ เปิด 💬 → 👥 เพื่อตอบ', ar: '{name} يريد صداقتك. افتح 💬 ← 👥 للرد.' },
};
const T = (k, v) => fmt(L(FRIEND_TEXT[k]), v);

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

function clock(iso, now = Date.now()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return now - d.getTime() < 20 * 3600e3 && new Date(now).getDate() === d.getDate() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

export class FriendsUI {
  // app: { store() → backend or null, inbox() → Inbox or null, me() → my uid,
  //        friends() → current list, refresh() → reload the list, toast(s),
  //        clean(text) → filtered text, isBlocked(uid, name), onRead() }
  constructor(root, app) {
    this.root = root;
    this.app = app;
    this.view = null; // null = the list; otherwise a conversation key
    this.loaded = new Set(); // conversations whose history we fetched
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; this.view = null; }

  show(key = null) {
    this.root.hidden = false;
    this.view = key;
    this.render();
    if (key) this._load(key);
    else this.app.refresh();
  }

  async _load(key) {
    const st = this.app.store(), inbox = this.app.inbox();
    if (!st || !inbox) return;
    if (!this.loaded.has(key)) {
      const h = await st.history(key);
      if (Array.isArray(h)) { inbox.add(h); this.loaded.add(key); }
    }
    if (this.view === key) { this.app.onRead(key); this.render(); }
  }

  // Called by the game when something changed (new message, list changed).
  update() {
    if (!this.open) return;
    if (this.view) this.app.onRead(this.view);
    this.render();
  }

  nameOf(key) {
    if (key === ALL) return L(FRIEND_TEXT.allFriends);
    return this.app.friends().friends.find((f) => f.uid === key)?.name || '?';
  }

  render() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    const st = this.app.store();
    if (!st || st.missing) {
      const parts = [x, el('strong', 'wallet-title', '👥 ' + L(FRIEND_TEXT.title)), el('p', 'board-empty', L(st ? FRIEND_TEXT.missing : FRIEND_TEXT.noAccount))];
      // What the server said, so a setup problem can be told apart.
      if (st?.lastError) parts.push(el('p', 'fine', st.lastError));
      this.root.replaceChildren(...parts);
      // Ask again: it may have been set up since.
      if (st && !this._retrying) { this._retrying = true; setTimeout(() => { this._retrying = false; if (this.open) this.app.refresh(); }, 5000); }
      return;
    }
    if (this.view) this.renderChat(x, this.view);
    else this.renderList(x, st);
  }

  renderList(x, st) {
    const inbox = this.app.inbox();
    const list = this.app.friends();
    const parts = [x, el('strong', 'wallet-title', '👥 ' + L(FRIEND_TEXT.title))];
    if (!st.shared) parts.push(el('p', 'fine board-warn', L(FRIEND_TEXT.local)));

    if (list.incoming.length) {
      parts.push(el('div', 'fr-section', L(FRIEND_TEXT.requests)));
      for (const f of list.incoming) {
        const row = el('div', 'fr-row fr-request');
        const ok = el('button', 'chip primary', L(FRIEND_TEXT.accept));
        ok.onclick = async () => { const r = await st.accept(f.uid); this._result(r, f.name); };
        const no = el('button', 'chip', L(FRIEND_TEXT.decline));
        no.onclick = async () => { await st.remove(f.uid); this.app.refresh(); };
        row.append(el('span', 'fr-avatar', '🙂'), el('b', 'fr-name', f.name), ok, no);
        parts.push(row);
      }
    }

    const convs = [{ key: ALL, name: L(FRIEND_TEXT.allFriends), icon: '👥' },
      ...list.friends.map((f) => ({ key: f.uid, name: f.name, icon: '💌' }))];
    if (list.friends.length) {
      // Newest chat first, like a phone.
      const at = (k) => Date.parse(inbox?.last(k)?.at || 0) || 0;
      convs.sort((a, b) => (a.key === ALL ? -1 : b.key === ALL ? 1 : at(b.key) - at(a.key)));
    }
    const box = el('div', 'fr-list');
    for (const c of convs) {
      const row = el('button', 'fr-row fr-conv');
      const last = inbox?.last(c.key);
      const n = inbox?.unread(c.key) || 0;
      const text = el('span', 'fr-text');
      text.append(el('b', 'fr-name', c.name), el('small', 'fr-last', last ? (last.from === this.app.me() ? L(FRIEND_TEXT.you) + ': ' : '') + this.app.clean(last.body) : ''));
      row.append(el('span', 'fr-avatar', c.icon), text, el('small', 'fr-time', last ? clock(last.at) : ''));
      if (n) row.append(el('b', 'fr-unread', String(n > 99 ? '99+' : n)));
      row.onclick = () => this.show(c.key);
      box.append(row);
    }
    parts.push(box);
    if (!list.friends.length) parts.push(el('p', 'board-empty', L(FRIEND_TEXT.noFriends)));

    for (const f of list.outgoing) {
      const row = el('div', 'fr-row fr-out');
      const c = el('button', 'chip', L(FRIEND_TEXT.cancel));
      c.onclick = async () => { await st.remove(f.uid); this.app.refresh(); };
      row.append(el('small', 'fr-wait', '⏳ ' + T('waiting', { name: f.name })), c);
      parts.push(row);
    }

    const form = el('form', 'fr-add');
    const inp = el('input');
    inp.placeholder = L(FRIEND_TEXT.addPh);
    inp.maxLength = 16;
    inp.autocomplete = 'off';
    const go = el('button', 'chip primary', L(FRIEND_TEXT.add));
    go.type = 'submit';
    form.append(inp, go);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = inp.value.trim();
      if (!name) return;
      inp.value = '';
      this._result(await st.add(name), name);
    };
    parts.push(form, el('p', 'fine', '🔒 ' + L(FRIEND_TEXT.keepNote)));
    this.root.replaceChildren(...parts);
  }

  _result(r, name) {
    const msg = { friends: 'r_friends', requested: 'r_requested', notfound: 'r_notfound', self: 'r_self', full: 'r_full', signin: 'r_signin', missing: 'e_missing' }[r] || (r === 'none' ? null : 'e_network');
    if (msg) this.app.toast(T(msg, { name }));
    this.app.refresh();
  }

  renderChat(x, key) {
    const st = this.app.store(), inbox = this.app.inbox();
    const head = el('div', 'fr-head');
    const back = el('button', 'chip fr-back', '‹ ' + L(FRIEND_TEXT.back));
    back.onclick = () => this.show(null);
    head.append(back, el('strong', 'fr-title', (key === ALL ? '👥 ' : '💌 ') + this.nameOf(key)));
    if (key !== ALL) {
      const rm = el('button', 'chip fr-remove', L(FRIEND_TEXT.unfriend));
      rm.onclick = async () => {
        const name = this.nameOf(key);
        if (!confirm(T('unfriendAsk', { name }))) return;
        await st.remove(key);
        this.app.refresh();
        this.show(null);
      };
      head.append(rm);
    }
    const msgs = el('div', 'fr-msgs');
    const list = inbox?.messages(key) || [];
    if (!this.loaded.has(key) && !list.length) msgs.append(el('p', 'board-empty', L(FRIEND_TEXT.loading)));
    else if (!list.length) msgs.append(el('p', 'board-empty', L(FRIEND_TEXT.noMessages)));
    const me = this.app.me();
    for (const m of list) {
      const mine = m.from === me;
      if (!mine && this.app.isBlocked(m.from, m.name)) continue;
      const b = el('div', 'fr-msg' + (mine ? ' mine' : ''));
      if (!mine && key === ALL) b.append(el('b', 'fr-from', m.name || '?'));
      b.append(el('span', 'fr-body', this.app.clean(m.body)), el('small', 'fr-at', clock(m.at)));
      msgs.append(b);
    }
    const form = el('form', 'fr-send');
    const inp = el('input');
    inp.placeholder = L(FRIEND_TEXT.ph);
    inp.maxLength = MAX_BODY;
    inp.autocomplete = 'off';
    inp.setAttribute('enterkeyhint', 'send');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.isComposing) e.preventDefault(); e.stopPropagation(); });
    const go = el('button', 'primary', L(FRIEND_TEXT.send));
    go.type = 'submit';
    form.append(inp, go);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const text = inp.value;
      if (!text.trim()) return;
      inp.value = '';
      await this.app.send(key, text);
      inp.focus();
    };
    this.root.replaceChildren(x, head, msgs, form);
    msgs.scrollTop = msgs.scrollHeight;
    // Keep what was being typed when a new message re-renders the view.
    if (this._draft?.key === key) { inp.value = this._draft.text; }
    inp.addEventListener('input', () => { this._draft = { key, text: inp.value }; });
    form.addEventListener('submit', () => { this._draft = null; });
  }

  errorText(code) {
    return T({ rate: 'e_rate', notfriend: 'e_notfriend', nofriends: 'e_nofriends', missing: 'e_missing', chat: 'e_chat' }[code] || 'e_network');
  }
}
