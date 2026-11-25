// Gift UI: pick a friend in the shop (friends only), and the card a friend sees when a gift
// comes in. The rules are in core/gifts.js; main.js pays, sends and delivers.
import { localName, getLanguage } from '../core/i18n.js';

export const L = (o) => localName(o, getLanguage());
export const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

export const GIFT_TEXT = {
  button: { en: '🎁 Gift to a friend', ko: '🎁 친구에게 선물하기', ja: '🎁 友だちにプレゼント', zh: '🎁 送给朋友', es: '🎁 Regalar a un amigo', ar: '🎁 أهدِه لصديق', vi: '🎁 Tặng bạn bè', fr: '🎁 Offrir à un ami', pt: "🎁 Presente para um amigo", th: '🎁 ให้ของขวัญเพื่อน', id: '🎁 Hadiahkan ke teman' },
  pick: { en: 'Who is it for?', ko: '누구에게 선물할까요?', ja: '誰にプレゼントする？', zh: '送给谁？', es: '¿Para quién es?', ar: 'لمن الهدية؟', vi: 'Tặng cho ai?', fr: 'C\'est pour qui ?', pt: "Para quem é?", th: 'ให้ใครดี?', id: 'Untuk siapa?' },
  hint: { en: 'Your friends in this shop. You pay now; it goes to their bag or items once they accept. If they say no, your money comes back.', ko: '이 매장에 있는 친구들이에요. 지금 결제하고, 친구가 받으면 가방이나 아이템으로 들어가요. 거절하면 돈이 돌아와요.', ja: 'このお店にいる友だちです。今支払い、相手が受け取るとバッグかアイテムに入ります。断られたらお金は戻ります。', zh: '这家店里的好友。现在付款，对方接受后会放进包里或道具里。对方拒绝的话钱会退回。', es: 'Tus amigos en esta tienda. Pagas ahora; llega a su bolsa u objetos cuando lo acepten. Si dicen que no, recuperas tu dinero.', ar: 'أصدقاؤك في هذا المتجر. تدفع الآن، وتصل الهدية إلى حقيبتهم أو أغراضهم عند قبولها. إن رفضوا يعود مالك.', vi: 'Bạn bè của bạn trong cửa hàng này. Bạn trả ngay; món quà vào túi hoặc vật phẩm của họ khi họ nhận. Nếu họ từ chối, tiền sẽ được trả lại.', fr: 'Tes amis dans cette boutique. Tu paies maintenant ; ça arrive dans leur sac ou leurs objets une fois accepté. S\'ils refusent, ton argent revient.', pt: "Seus amigos nesta loja. Você paga agora; vai para a bolsa ou itens deles quando aceitarem. Se recusarem, seu dinheiro volta.", th: 'เพื่อนของคุณในร้านนี้ คุณจ่ายตอนนี้ แล้วของจะเข้ากระเป๋าหรือไอเทมของเขาเมื่อเขารับ ถ้าเขาปฏิเสธ เงินจะคืนให้คุณ', id: 'Teman-temanmu di toko ini. Kamu bayar sekarang; hadiah masuk ke tas atau item mereka setelah diterima. Kalau ditolak, uangmu kembali.' },
  nobody: { en: 'Nobody else is in this shop right now. Come back with a friend!', ko: '지금 이 매장에는 다른 사람이 없어요. 친구와 함께 와 보세요!', ja: '今このお店には他に誰もいません。友だちと来てね！', zh: '店里现在没有其他人。和朋友一起来吧！', es: 'No hay nadie más en esta tienda ahora. ¡Vuelve con un amigo!', ar: 'لا أحد غيرك في هذا المتجر الآن. عُد مع صديق!', vi: 'Hiện không có ai khác trong cửa hàng. Hãy quay lại cùng bạn bè!', fr: 'Personne d\'autre n\'est dans cette boutique pour l\'instant. Reviens avec un ami !', pt: "Não há mais ninguém nesta loja agora. Volte com um amigo!", th: 'ตอนนี้ไม่มีใครอื่นในร้าน มาใหม่พร้อมเพื่อนนะ!', id: 'Sekarang tidak ada orang lain di toko ini. Datang lagi bersama teman!' },
  noFriends: { en: 'None of your friends are in this shop. Gifts are for friends only.', ko: '이 매장에 친구가 없어요. 선물은 친구에게만 할 수 있어요.', ja: 'このお店に友だちがいません。プレゼントは友だちにだけ贈れます。', zh: '这家店里没有你的好友。礼物只能送给好友。', es: 'Ninguno de tus amigos está en esta tienda. Los regalos son solo para amigos.', ar: 'لا يوجد أي من أصدقائك في هذا المتجر. الهدايا للأصدقاء فقط.', vi: 'Không có bạn bè nào của bạn trong cửa hàng này. Chỉ có thể tặng quà cho bạn bè.', fr: 'Aucun de tes amis n\'est dans cette boutique. Les cadeaux sont réservés aux amis.', pt: "Nenhum dos seus amigos está nesta loja. Presentes são só para amigos.", th: 'ไม่มีเพื่อนของคุณอยู่ในร้านนี้ ให้ของขวัญได้เฉพาะเพื่อนเท่านั้น', id: 'Tidak ada temanmu di toko ini. Hadiah hanya untuk teman.' },
  addHint: { en: 'Also here. Add them as a friend, and once they accept you can send a gift.', ko: '이 매장의 다른 사람들이에요. 친구 추가하고 상대가 수락하면 선물할 수 있어요.', ja: 'このお店の他の人です。フレンド追加して承認されたらプレゼントできます。', zh: '店里的其他人。加为好友，对方接受后就能送礼物。', es: 'También aquí. Añádelos como amigos y, cuando acepten, podrás regalarles.', ar: 'موجودون هنا أيضًا. أضفهم كأصدقاء، وبعد قبولهم يمكنك إرسال هدية.', vi: 'Những người khác ở đây. Kết bạn với họ, khi họ đồng ý bạn có thể tặng quà.', fr: 'Aussi ici. Ajoute-les en ami ; une fois acceptés, tu pourras leur offrir un cadeau.', pt: "Também estão aqui. Adicione como amigo e, quando aceitarem, você pode mandar um presente.", th: 'คนอื่นในร้านนี้ เพิ่มเป็นเพื่อน เมื่อเขาตอบรับแล้วคุณจะให้ของขวัญได้', id: 'Juga ada di sini. Tambahkan sebagai teman; setelah mereka menerima, kamu bisa mengirim hadiah.' },
  notFriend: { en: '{name} isn\'t your friend anymore. Gifts are for friends only.', ko: '{name} 님은 이제 친구가 아니에요. 선물은 친구에게만 할 수 있어요.', ja: '{name}さんはもう友だちではありません。プレゼントは友だちにだけ贈れます。', zh: '{name}已不是你的好友。礼物只能送给好友。', es: '{name} ya no es tu amigo. Los regalos son solo para amigos.', ar: 'لم يعد {name} صديقك. الهدايا للأصدقاء فقط.', vi: '{name} không còn là bạn của bạn. Chỉ có thể tặng quà cho bạn bè.', fr: '{name} n\'est plus ton ami. Les cadeaux sont réservés aux amis.', pt: "{name} não é mais seu amigo. Presentes são só para amigos.", th: '{name} ไม่ได้เป็นเพื่อนคุณแล้ว ให้ของขวัญได้เฉพาะเพื่อนเท่านั้น', id: '{name} bukan temanmu lagi. Hadiah hanya untuk teman.' },
  cancel: { en: 'Cancel', ko: '취소', ja: 'キャンセル', zh: '取消', es: 'Cancelar', ar: 'إلغاء', vi: 'Hủy', fr: 'Annuler', pt: "Cancelar", th: 'ยกเลิก', id: 'Batal' },
  sent: { en: '🎁 Sent to {name}. Waiting for them to accept…', ko: '🎁 {name} 님에게 보냈어요. 받기를 기다리는 중…', ja: '🎁 {name}さんに送りました。受け取りを待っています…', zh: '🎁 已送给{name}，等待对方接受…', es: '🎁 Enviado a {name}. Esperando a que lo acepte…', ar: '🎁 أُرسلت إلى {name}. بانتظار قبولها…', vi: '🎁 Đã gửi cho {name}. Đang chờ họ nhận…', fr: '🎁 Envoyé à {name}. En attente de son acceptation…', pt: "🎁 Enviado para {name}. Esperando aceitar…", th: '🎁 ส่งให้ {name} แล้ว รอเขารับ…', id: '🎁 Terkirim ke {name}. Menunggu diterima…' },
  card: { en: '🎁 {name} bought you a gift!', ko: '🎁 {name} 님이 선물을 사 줬어요!', ja: '🎁 {name}さんからプレゼント！', zh: '🎁 {name}给你买了礼物！', es: '🎁 ¡{name} te compró un regalo!', ar: '🎁 اشترى لك {name} هدية!', vi: '🎁 {name} mua quà cho bạn!', fr: '🎁 {name} t\'a acheté un cadeau !', pt: "🎁 {name} comprou um presente para você!", th: '🎁 {name} ซื้อของขวัญให้คุณ!', id: '🎁 {name} membelikanmu hadiah!' },
  accept: { en: 'Accept', ko: '받기', ja: '受け取る', zh: '接受', es: 'Aceptar', ar: 'اقبل', vi: 'Nhận', fr: 'Accepter', pt: "Aceitar", th: 'รับ', id: 'Terima' },
  decline: { en: 'No thanks', ko: '괜찮아요', ja: '遠慮する', zh: '不用了', es: 'No, gracias', ar: 'لا، شكرًا', vi: 'Không, cảm ơn', fr: 'Non merci', pt: "Não, obrigado", th: 'ไม่เป็นไร', id: 'Tidak, terima kasih' },
  accepted: { en: '🎉 {name} accepted your gift: {item}!', ko: '🎉 {name} 님이 선물을 받았어요: {item}!', ja: '🎉 {name}さんがプレゼントを受け取りました：{item}！', zh: '🎉 {name}收下了你的礼物：{item}！', es: '🎉 ¡{name} aceptó tu regalo: {item}!', ar: '🎉 قبل {name} هديتك: {item}!', vi: '🎉 {name} đã nhận quà của bạn: {item}!', fr: '🎉 {name} a accepté ton cadeau : {item} !', pt: "🎉 {name} aceitou seu presente: {item}!", th: '🎉 {name} รับของขวัญของคุณแล้ว: {item}!', id: '🎉 {name} menerima hadiahmu: {item}!' },
  gotBag: { en: '🎁 {item} from {name} is in your bag!', ko: '🎁 {name} 님의 선물 {item}이(가) 가방에 들어갔어요!', ja: '🎁 {name}さんからの{item}がバッグに入りました！', zh: '🎁 {name}送的{item}放进包里了！', es: '🎁 ¡{item} de {name} está en tu bolsa!', ar: '🎁 {item} من {name} في حقيبتك!', vi: '🎁 {item} từ {name} đã vào túi của bạn!', fr: '🎁 {item} de {name} est dans ton sac !', pt: "🎁 {item} de {name} está na sua bolsa!", th: '🎁 {item} จาก {name} อยู่ในกระเป๋าของคุณแล้ว!', id: '🎁 {item} dari {name} ada di tasmu!' },
  gotHome: { en: '🎁 {item} from {name} is yours. Put it in your home with Decorate!', ko: '🎁 {name} 님의 선물 {item}을(를) 받았어요. 집에서 꾸미기로 놓아 보세요!', ja: '🎁 {name}さんから{item}をもらいました。家の「かざる」で置けます！', zh: '🎁 收到{name}送的{item}。回家用“布置”摆出来吧！', es: '🎁 {item} de {name} ya es tuyo. ¡Colócalo en tu casa con Decorar!', ar: '🎁 {item} من {name} صار لك. ضعه في بيتك من «تزيين»!', vi: '🎁 {item} từ {name} đã là của bạn. Hãy đặt ở nhà bằng Trang trí!', fr: '🎁 {item} de {name} est à vous. Placez-le chez vous avec Décorer !', pt: "🎁 {item} de {name} é seu. Coloque na sua casa com Decorar!", th: '🎁 ได้รับ {item} จาก {name} แล้ว วางในบ้านด้วยปุ่มตกแต่งได้เลย!', id: '🎁 {item} dari {name} jadi milikmu. Taruh di rumah lewat Dekorasi!' },
  gotItem: { en: '🎁 {item} from {name} is in your items. Wear it from the 🪙 panel!', ko: '🎁 {name} 님의 선물 {item}이(가) 아이템에 들어갔어요. 🪙 패널에서 착용해 보세요!', ja: '🎁 {name}さんからの{item}がアイテムに入りました。🪙パネルから着けられます！', zh: '🎁 {name}送的{item}已放进道具。可在🪙面板里穿戴！', es: '🎁 {item} de {name} está en tus objetos. ¡Póntelo desde el panel 🪙!', ar: '🎁 {item} من {name} في أغراضك. ارتدِه من لوحة 🪙!', vi: '🎁 {item} từ {name} đã vào vật phẩm. Mặc thử từ bảng 🪙 nhé!', fr: '🎁 {item} de {name} est dans tes objets. Porte-le depuis le panneau 🪙 !', pt: "🎁 {item} de {name} está nos seus itens. Vista pelo painel 🪙!", th: '🎁 {item} จาก {name} อยู่ในไอเทมของคุณแล้ว ใส่ได้จากแผง 🪙!', id: '🎁 {item} dari {name} ada di itemmu. Pakai dari panel 🪙!' },
  back: {
    no: { en: '{name} said no thanks. Your 🪙 {n} are back.', ko: '{name} 님이 사양했어요. 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんは遠慮しました。🪙 {n} が戻りました。', zh: '{name}婉拒了。🪙 {n} 已退回。', es: '{name} dijo que no, gracias. Recuperas 🪙 {n}.', ar: 'اعتذر {name}. استعدت 🪙 {n}.', vi: '{name} đã từ chối. Bạn được hoàn 🪙 {n}.', fr: '{name} a dit non merci. Tes 🪙 {n} sont revenus.', pt: "{name} recusou. Seus 🪙 {n} voltaram.", th: '{name} ปฏิเสธ คืน 🪙 {n} ให้คุณแล้ว', id: '{name} menolak. 🪙 {n} milikmu kembali.' },
    have: { en: '{name} already has this. Your 🪙 {n} are back.', ko: '{name} 님은 이미 갖고 있어요. 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんはもう持っています。🪙 {n} が戻りました。', zh: '{name}已经有了。🪙 {n} 已退回。', es: '{name} ya lo tiene. Recuperas 🪙 {n}.', ar: 'لدى {name} واحدة بالفعل. استعدت 🪙 {n}.', vi: '{name} đã có món này. Bạn được hoàn 🪙 {n}.', fr: '{name} l\'a déjà. Tes 🪙 {n} sont revenus.', pt: "{name} já tem isso. Seus 🪙 {n} voltaram.", th: '{name} มีของชิ้นนี้แล้ว คืน 🪙 {n} ให้คุณแล้ว', id: '{name} sudah punya. 🪙 {n} milikmu kembali.' },
    full: { en: "{name}'s bag is full. Your 🪙 {n} are back.", ko: '{name} 님의 가방이 꽉 찼어요. 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんのバッグがいっぱいです。🪙 {n} が戻りました。', zh: '{name}的包满了。🪙 {n} 已退回。', es: 'La bolsa de {name} está llena. Recuperas 🪙 {n}.', ar: 'حقيبة {name} ممتلئة. استعدت 🪙 {n}.', vi: 'Túi của {name} đã đầy. Bạn được hoàn 🪙 {n}.', fr: 'Le sac de {name} est plein. Tes 🪙 {n} sont revenus.', pt: "A bolsa de {name} está cheia. Seus 🪙 {n} voltaram.", th: 'กระเป๋าของ {name} เต็ม คืน 🪙 {n} ให้คุณแล้ว', id: 'Tas {name} penuh. 🪙 {n} milikmu kembali.' },
    busy: { en: '{name} has other gifts waiting. Your 🪙 {n} are back.', ko: '{name} 님에게 기다리는 선물이 이미 있어요. 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんには他のプレゼントが届いています。🪙 {n} が戻りました。', zh: '{name}还有别的礼物没处理。🪙 {n} 已退回。', es: '{name} tiene otros regalos pendientes. Recuperas 🪙 {n}.', ar: 'لدى {name} هدايا أخرى بالانتظار. استعدت 🪙 {n}.', vi: '{name} đang có quà khác chờ nhận. Bạn được hoàn 🪙 {n}.', fr: '{name} a d\'autres cadeaux en attente. Tes 🪙 {n} sont revenus.', pt: "{name} tem outros presentes esperando. Seus 🪙 {n} voltaram.", th: '{name} มีของขวัญอื่นรออยู่ คืน 🪙 {n} ให้คุณแล้ว', id: '{name} masih punya hadiah lain yang menunggu. 🪙 {n} milikmu kembali.' },
    late: { en: "{name} didn't answer in time. Your 🪙 {n} are back.", ko: '{name} 님이 제시간에 답하지 않았어요. 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんから返事がありませんでした。🪙 {n} が戻りました。', zh: '{name}没有及时回应。🪙 {n} 已退回。', es: '{name} no respondió a tiempo. Recuperas 🪙 {n}.', ar: 'لم يرد {name} في الوقت. استعدت 🪙 {n}.', vi: '{name} không trả lời kịp. Bạn được hoàn 🪙 {n}.', fr: '{name} n\'a pas répondu à temps. Tes 🪙 {n} sont revenus.', pt: "{name} não respondeu a tempo. Seus 🪙 {n} voltaram.", th: '{name} ไม่ตอบทันเวลา คืน 🪙 {n} ให้คุณแล้ว', id: '{name} tidak menjawab tepat waktu. 🪙 {n} milikmu kembali.' },
    gone: { en: '{name} left. Your 🪙 {n} are back.', ko: '{name} 님이 나갔어요. 🪙 {n}을(를) 돌려받았어요.', ja: '{name}さんが出て行きました。🪙 {n} が戻りました。', zh: '{name}离开了。🪙 {n} 已退回。', es: '{name} se fue. Recuperas 🪙 {n}.', ar: 'غادر {name}. استعدت 🪙 {n}.', vi: '{name} đã rời đi. Bạn được hoàn 🪙 {n}.', fr: '{name} est parti. Tes 🪙 {n} sont revenus.', pt: "{name} saiu. Seus 🪙 {n} voltaram.", th: '{name} ออกไปแล้ว คืน 🪙 {n} ให้คุณแล้ว', id: '{name} sudah pergi. 🪙 {n} milikmu kembali.' },
  },
  // Why I can't send one now (GiftBox.why).
  limit: { en: "You've sent today's {n} gifts. More tomorrow!", ko: '오늘 보낼 수 있는 선물 {n}개를 다 보냈어요. 내일 또 보내요!', ja: '今日のプレゼント{n}個を送りきりました。また明日！', zh: '今天的{n}份礼物都送完了，明天再送吧！', es: 'Ya enviaste los {n} regalos de hoy. ¡Más mañana!', ar: 'أرسلت هدايا اليوم الـ{n}. المزيد غدًا!', vi: 'Bạn đã gửi đủ {n} món quà hôm nay. Mai gửi tiếp nhé!', fr: 'Tu as envoyé tes {n} cadeaux du jour. D\'autres demain !', pt: "Você já enviou os {n} presentes de hoje. Mais amanhã!", th: 'วันนี้ส่งของขวัญครบ {n} ชิ้นแล้ว พรุ่งนี้ส่งได้อีก!', id: 'Kamu sudah mengirim {n} hadiah hari ini. Besok lagi ya!' },
  busy: { en: 'Wait for your other gifts to be answered first.', ko: '보낸 다른 선물의 답을 먼저 기다려 주세요.', ja: '他のプレゼントの返事を先に待ってね。', zh: '先等等你送出的其他礼物的回应吧。', es: 'Espera primero la respuesta a tus otros regalos.', ar: 'انتظر أولًا الرد على هداياك الأخرى.', vi: 'Hãy chờ các món quà khác được trả lời trước.', fr: 'Attends d\'abord la réponse à tes autres cadeaux.', pt: "Espere seus outros presentes serem respondidos primeiro.", th: 'รอให้ของขวัญชิ้นอื่นได้รับคำตอบก่อน', id: 'Tunggu dulu jawaban untuk hadiahmu yang lain.' },
  waiting: { en: 'Your gift to {name} is still waiting for an answer.', ko: '{name} 님에게 보낸 선물이 아직 답을 기다리고 있어요.', ja: '{name}さんへのプレゼントはまだ返事待ちです。', zh: '送给{name}的礼物还在等回应。', es: 'Tu regalo para {name} aún espera respuesta.', ar: 'هديتك إلى {name} ما زالت بانتظار الرد.', vi: 'Món quà gửi {name} vẫn đang chờ trả lời.', fr: 'Ton cadeau à {name} attend encore une réponse.', pt: "Seu presente para {name} ainda está esperando resposta.", th: 'ของขวัญที่ให้ {name} ยังรอคำตอบอยู่', id: 'Hadiahmu untuk {name} masih menunggu jawaban.' },
  // What happened on my side when a gift couldn't be taken.
  mineHave: { en: 'You already have {item}, so it went back to {name}.', ko: '{item}은(는) 이미 있어서 {name} 님에게 돌려보냈어요.', ja: '{item}はもう持っているので、{name}さんに返しました。', zh: '你已经有{item}了，已退还给{name}。', es: 'Ya tienes {item}, así que volvió a {name}.', ar: 'لديك {item} بالفعل، فأُعيدت إلى {name}.', vi: 'Bạn đã có {item}, nên quà được trả lại cho {name}.', fr: 'Tu as déjà {item}, alors il est retourné à {name}.', pt: "Você já tem {item}, então voltou para {name}.", th: 'คุณมี {item} อยู่แล้ว เลยคืนให้ {name}', id: 'Kamu sudah punya {item}, jadi dikembalikan ke {name}.' },
  mineFull: { en: 'Your bag is full, so the gift went back to {name}.', ko: '가방이 꽉 차서 선물이 {name} 님에게 돌아갔어요.', ja: 'バッグがいっぱいなので、プレゼントは{name}さんに戻りました。', zh: '你的包满了，礼物已退还给{name}。', es: 'Tu bolsa está llena, así que el regalo volvió a {name}.', ar: 'حقيبتك ممتلئة، فعادت الهدية إلى {name}.', vi: 'Túi của bạn đã đầy, nên quà được trả lại cho {name}.', fr: 'Ton sac est plein, alors le cadeau est retourné à {name}.', pt: "Sua bolsa está cheia, então o presente voltou para {name}.", th: 'กระเป๋าของคุณเต็ม ของขวัญเลยคืนให้ {name}', id: 'Tasmu penuh, jadi hadiahnya kembali ke {name}.' },
  // Budget book notes.
  ledger: { en: '🎁 Gift', ko: '🎁 선물', ja: '🎁 プレゼント', zh: '🎁 礼物', es: '🎁 Regalo', ar: '🎁 هدية', vi: '🎁 Quà tặng', fr: '🎁 Cadeau', pt: "🎁 Presente", th: '🎁 ของขวัญ', id: '🎁 Hadiah' },
  refund: { en: '🎁 Gift refunded', ko: '🎁 선물 환불', ja: '🎁 プレゼント返金', zh: '🎁 礼物退款', es: '🎁 Regalo reembolsado', ar: '🎁 استرداد هدية', vi: '🎁 Hoàn tiền quà', fr: '🎁 Cadeau remboursé', pt: "🎁 Presente reembolsado", th: '🎁 คืนเงินค่าของขวัญ', id: '🎁 Hadiah dikembalikan' },
};

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class GiftUI {
  constructor({ onAnswer }) {
    this.onAnswer = onAnswer; // (gid, ok) from a card
    this.picker = el('div', 'sheet gift-panel');
    this.picker.id = 'gift-panel';
    this.picker.hidden = true;
    this.cardsEl = el('div', 'gift-cards');
    this.cardsEl.id = 'gift-cards';
    const host = document.getElementById('hud') || document.body;
    host.append(this.picker, this.cardsEl);
  }
  get open() { return !this.picker.hidden; }
  close() { this.picker.hidden = true; }

  // Pick a friend for { icon, name, coins }; people = [{ id, name }],
  // closest first. onPick(person).
  // others = the rest here [{ id, name, status }] (status: 'out' I asked,
  // 'in' they asked, null), shown with an Add friend button: onAdd(person).
  pick(thing, people, others, onAdd, onPick) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', L(GIFT_TEXT.cancel));
    x.onclick = () => this.close();
    const head = el('div', 'gift-thing');
    head.append(el('span', 'gift-icon', thing.icon), el('strong', null, thing.name), el('b', null, `🪙 ${thing.coins}`));
    const list = el('div', 'gift-people');
    if (!people.length) list.append(el('p', 'order-hint', L(others.length ? GIFT_TEXT.noFriends : GIFT_TEXT.nobody)));
    for (const p of people) {
      const b = el('button', 'chip gift-person', '🎁 ' + p.name);
      b.onclick = () => { this.close(); onPick(p); };
      list.append(b);
    }
    const parts = [x, el('h3', null, L(GIFT_TEXT.pick)), head, list];
    if (others.length) {
      // Not friends yet: send a request from here (a gift once they accept).
      const add = el('div', 'gift-people gift-others');
      for (const p of others) {
        const label = p.status === 'out' ? '⏳ ' + p.name : (p.status === 'in' ? '✅ ' : '➕ ') + p.name;
        const b = el('button', 'chip gift-add', label);
        b.disabled = p.status === 'out';
        b.onclick = () => { b.disabled = true; b.textContent = '⏳ ' + p.name; onAdd(p); };
        add.append(b);
      }
      parts.push(el('p', 'fine', L(GIFT_TEXT.addHint)), add);
    }
    parts.push(el('p', 'fine', L(GIFT_TEXT.hint)));
    this.picker.replaceChildren(...parts);
    this.picker.hidden = false;
  }

  // The gift cards I have waiting: [{ gid, name, item, icon }].
  showCards(cards) {
    this.cardsEl.replaceChildren(...cards.map((c) => {
      const card = el('div', 'gift-card');
      const txt = el('div', 'gift-card-text');
      txt.append(el('strong', null, fmt(L(GIFT_TEXT.card), { name: c.name })), el('span', null, `${c.icon} ${c.item}`));
      const yes = el('button', 'primary', L(GIFT_TEXT.accept));
      yes.onclick = () => this.onAnswer(c.gid, true);
      const no = el('button', 'chip', L(GIFT_TEXT.decline));
      no.onclick = () => this.onAnswer(c.gid, false);
      const btns = el('div', 'gift-card-btns');
      btns.append(no, yes);
      card.append(el('span', 'gift-card-icon', '🎁'), txt, btns);
      return card;
    }));
  }
}
