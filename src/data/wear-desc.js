// Item descriptions for things you wear (data/wearables.js, Daily Closet).
export const WEAR_DESC = {
  clothes: {
    en: 'Clothes you bought. Tap Wear to put them on, Take off to go back to your T-shirt.',
    ko: '산 옷이에요. "입기"로 입고, "벗기"로 티셔츠로 돌아가요.',
    ja: '買った服。「着る」で着替え、「脱ぐ」でTシャツに戻ります。',
    zh: '买来的衣服。点“穿上”换上，点“脱下”换回T恤。',
    es: 'Ropa que compraste. Toca Poner para vestirla y Quitar para volver a tu camiseta.', ar: 'ملابس اشتريتها. اضغط ارتدِ لتلبسها، واخلع لتعود إلى قميصك.', vi: 'Quần áo bạn đã mua. Chạm Mặc để mặc vào, Cởi ra để trở lại áo phông.', hi: 'आपके ख़रीदे कपड़े। पहनने के लिए पहनें टैप करें, टी-शर्ट पर लौटने के लिए उतारें।', fr: 'Des vêtements que tu as achetés. Touche Porter pour les mettre, Enlever pour revenir à ton t-shirt.', th: 'เสื้อผ้าที่คุณซื้อ แตะ สวมใส่ เพื่อใส่ หรือ ถอด เพื่อกลับไปใส่เสื้อยืด', id: 'Baju yang kamu beli. Ketuk Pakai untuk memakainya, Lepas untuk kembali ke kaosmu.',
  },
  // Limited-time clothes (data/wearables.js `secs`; the days left are added after it).
  timed: {
    en: 'Limited-time clothes: gone 7 days after you buy them. They can\'t be sold or given.',
    ko: '기간제 옷이에요. 산 뒤 7일이 지나면 사라져요. 팔거나 선물할 수 없어요.',
    ja: '期間限定の服。買ってから7日たつと消えます。売ったり贈ったりできません。',
    zh: '限时服装：购买7天后消失，不能出售或赠送。',
    es: 'Ropa por tiempo limitado: desaparece 7 días después de comprarla. No se puede vender ni regalar.', ar: 'ملابس لفترة محدودة: تختفي بعد 7 أيام من شرائها. لا يمكن بيعها أو إهداؤها.', vi: 'Quần áo có thời hạn: biến mất 7 ngày sau khi mua. Không thể bán hay tặng.', hi: 'सीमित समय के कपड़े: ख़रीदने के 7 दिन बाद गायब हो जाते हैं। बेचे या तोहफ़े में नहीं दिए जा सकते।', fr: 'Vêtements à durée limitée : ils disparaissent 7 jours après l\'achat. Impossible de les vendre ou de les offrir.', th: 'เสื้อผ้าแบบจำกัดเวลา: หายไปหลังซื้อ 7 วัน ขายหรือให้เป็นของขวัญไม่ได้', id: 'Baju waktu terbatas: hilang 7 hari setelah dibeli. Tidak bisa dijual atau dihadiahkan.',
  },
  // Limited-time accessories (Santa Pop-up's Christmas line).
  timedAcc: {
    en: 'A limited-time accessory: gone 7 days after you buy it. Tap Wear to put it on, Take off to remove it. It can\'t be sold or given.',
    ko: '기간제 액세서리예요. 산 뒤 7일이 지나면 사라져요. "입기"로 쓰고 "벗기"로 벗어요. 팔거나 선물할 수 없어요.',
    ja: '期間限定のアクセサリー。買ってから7日たつと消えます。「着る」で着け、「脱ぐ」で外します。売ったり贈ったりできません。',
    zh: '限时配饰：购买7天后消失。点“穿上”戴上，点“脱下”取下。不能出售或赠送。',
    es: 'Un accesorio por tiempo limitado: desaparece 7 días después de comprarlo. Toca Poner para usarlo y Quitar para sacártelo. No se puede vender ni regalar.', ar: 'إكسسوار لفترة محدودة: يختفي بعد 7 أيام من شرائه. اضغط ارتدِ لتلبسه، واخلع لتنزعه. لا يمكن بيعه أو إهداؤه.', vi: 'Phụ kiện có thời hạn: biến mất 7 ngày sau khi mua. Chạm Mặc để đeo, Cởi ra để tháo. Không thể bán hay tặng.', hi: 'सीमित समय की एक्सेसरी: ख़रीदने के 7 दिन बाद गायब हो जाती है। पहनने के लिए पहनें, हटाने के लिए उतारें टैप करें। बेची या तोहफ़े में नहीं दी जा सकती।', fr: 'Un accessoire à durée limitée : il disparaît 7 jours après l\'achat. Touche Porter pour le mettre, Enlever pour l\'ôter. Impossible de le vendre ou de l\'offrir.', th: 'เครื่องประดับแบบจำกัดเวลา: หายไปหลังซื้อ 7 วัน แตะ สวมใส่ เพื่อใส่ หรือ ถอด เพื่อเอาออก ขายหรือให้เป็นของขวัญไม่ได้', id: 'Aksesori waktu terbatas: hilang 7 hari setelah dibeli. Ketuk Pakai untuk memakainya, Lepas untuk melepasnya. Tidak bisa dijual atau dihadiahkan.',
  },
  swap: {
    en: 'Trousers you bought. Tap Wear to change into them.',
    ko: '산 바지예요. "입기"를 누르면 갈아입어요.',
    ja: '買ったズボン。「着る」で履き替えます。',
    zh: '买来的裤子。点“穿上”就能换上。',
    es: 'Pantalones que compraste. Toca Poner para cambiarte.', ar: 'بنطال اشتريته. اضغط ارتدِ لتغيّر إليه.', vi: 'Quần bạn đã mua. Chạm Mặc để thay.', hi: 'आपकी ख़रीदी पतलून। बदलने के लिए पहनें टैप करें।', fr: 'Un pantalon que tu as acheté. Touche Porter pour le mettre.', th: 'กางเกงที่คุณซื้อ แตะ สวมใส่ เพื่อเปลี่ยน', id: 'Celana yang kamu beli. Ketuk Pakai untuk menggantinya.',
  },
  shoes: {
    en: 'Shoes you bought. Tap Wear to put them on, Take off to go back to white sneakers.',
    ko: '산 신발이에요. "입기"로 신고, "벗기"로 흰 운동화로 돌아가요.',
    ja: '買った靴。「着る」で履き、「脱ぐ」で白いスニーカーに戻ります。',
    zh: '买来的鞋。点“穿上”换上，点“脱下”换回白色运动鞋。',
    es: 'Zapatos que compraste. Toca Poner para calzarlos y Quitar para volver a las zapatillas blancas.', ar: 'حذاء اشتريته. اضغط ارتدِ لتلبسه، واخلع لتعود إلى الحذاء الرياضي الأبيض.', vi: 'Giày bạn đã mua. Chạm Mặc để đi, Cởi ra để trở lại giày thể thao trắng.', hi: 'आपके ख़रीदे जूते। पहनने के लिए पहनें, सफ़ेद स्नीकर्स पर लौटने के लिए उतारें।', fr: 'Des chaussures que tu as achetées. Touche Porter pour les mettre, Enlever pour revenir aux baskets blanches.', th: 'รองเท้าที่คุณซื้อ แตะ สวมใส่ เพื่อใส่ หรือ ถอด เพื่อกลับไปใส่รองเท้าผ้าใบสีขาว', id: 'Sepatu yang kamu beli. Ketuk Pakai untuk memakainya, Lepas untuk kembali ke sneakers putih.',
  },
  skirt: {
    en: 'A skirt you bought. Tap Wear to put it on, Take off to go back to your trousers.',
    ko: '산 치마예요. "입기"로 입고, "벗기"로 바지로 돌아가요.',
    ja: '買ったスカート。「着る」ではき、「脱ぐ」でズボンに戻ります。',
    zh: '买来的裙子。点“穿上”换上，点“脱下”换回裤子。',
    es: 'Una falda que compraste. Toca Poner para ponértela y Quitar para volver a tus pantalones.', ar: 'تنورة اشتريتها. اضغط ارتدِ لتلبسها، واخلع لتعود إلى بنطالك.', vi: 'Chân váy bạn đã mua. Chạm Mặc để mặc vào, Cởi ra để trở lại quần.', hi: 'आपकी ख़रीदी स्कर्ट। पहनने के लिए पहनें, पतलून पर लौटने के लिए उतारें टैप करें।', fr: 'Une jupe que tu as achetée. Touche Porter pour la mettre, Enlever pour revenir à ton pantalon.', th: 'กระโปรงที่คุณซื้อ แตะ สวมใส่ เพื่อใส่ หรือ ถอด เพื่อกลับไปใส่กางเกง', id: 'Rok yang kamu beli. Ketuk Pakai untuk memakainya, Lepas untuk kembali ke celanamu.',
  },
  accessory: {
    en: 'An accessory you bought. Tap Wear to put it on, Take off to remove it.',
    ko: '산 액세서리예요. "입기"로 착용하고, "벗기"로 벗어요.',
    ja: '買ったアクセサリー。「着る」で着け、「脱ぐ」で外します。',
    zh: '买来的配饰。点“穿上”戴上，点“脱下”取下。',
    es: 'Un accesorio que compraste. Toca Poner para usarlo y Quitar para quitártelo.', ar: 'إكسسوار اشتريته. اضغط ارتدِ لتضعه، واخلع لتنزعه.', vi: 'Phụ kiện bạn đã mua. Chạm Mặc để đeo, Cởi ra để tháo.', hi: 'आपकी ख़रीदी एक्सेसरी। लगाने के लिए पहनें, हटाने के लिए उतारें टैप करें।', fr: 'Un accessoire que tu as acheté. Touche Porter pour le mettre, Enlever pour le retirer.', th: 'เครื่องประดับที่คุณซื้อ แตะ สวมใส่ เพื่อใส่ หรือ ถอด เพื่อเอาออก', id: 'Aksesori yang kamu beli. Ketuk Pakai untuk memakainya, Lepas untuk melepasnya.',
  },
};
