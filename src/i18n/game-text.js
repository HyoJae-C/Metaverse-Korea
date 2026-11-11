// Text tables (every UI language) that main.js used to keep inline, one per
// feature. Keys are languages (en, ko, ja, zh, es, ar, vi, hi, fr, th, id)
// and L() picks the current one. What each feature does is described where
// it is used in main.js. New features keep their text next to their own
// module instead (see CLAUDE.md).

export const ID_TEXT = {
  back: { en: 'Welcome back! Change your name at the name tag workshop, and clothes at the Daily Closet or from your items.', ko: '다시 오셨네요! 이름은 네임택 공방에서, 옷은 데일리 클로젯이나 내 아이템에서 바꿀 수 있어요.', ja: 'おかえりなさい！名前はネームタグ工房で、服はデイリークローゼットかアイテムから変えられます。', zh: '欢迎回来！可以在名牌工坊改名，在日常衣橱或物品里换衣服。', es: '¡Bienvenido de nuevo! Cambia tu nombre en el taller de placas y la ropa en Armario Diario o desde tus objetos.', ar: 'أهلًا بعودتك! غيّر اسمك في ورشة بطاقات الأسماء، وملابسك في خزانة يومية أو من أغراضك.', vi: 'Chào mừng bạn trở lại! Đổi tên ở xưởng bảng tên, còn quần áo thì ở Daily Closet hoặc trong đồ của bạn.', hi: 'फिर से स्वागत है! नाम-टैग वर्कशॉप में अपना नाम बदलें, और कपड़े डेली क्लोज़ेट में या अपनी चीज़ों से।', fr: 'Bon retour ! Change ton nom à l\'atelier de badges, et tes vêtements au Daily Closet ou depuis tes objets.', th: 'ยินดีต้อนรับกลับ! เปลี่ยนชื่อได้ที่เวิร์กช็อปป้ายชื่อ และเปลี่ยนเสื้อผ้าได้ที่ Daily Closet หรือจากไอเทมของคุณ', id: 'Selamat datang kembali! Ganti namamu di bengkel papan nama, dan bajumu di Daily Closet atau dari barangmu.' },
  first: { en: 'Pick a name and a T-shirt colour. Later you can change your name at the name tag workshop, and buy clothes like hoodies or padded coats at the Daily Closet.', ko: '이름과 티셔츠 색을 골라요. 이름은 나중에 네임택 공방에서 바꿀 수 있고, 후드티·패딩 같은 옷은 데일리 클로젯에서 살 수 있어요.', ja: '名前とTシャツの色を選ぼう。名前はあとでネームタグ工房で変えられ、パーカーやダウンなどの服はデイリークローゼットで買えます。', zh: '选择名字和T恤颜色。之后可以在名牌工坊改名，卫衣、羽绒服等衣服可在日常衣橱购买。', es: 'Elige un nombre y el color de tu camiseta. Luego puedes cambiar tu nombre en el taller de placas y comprar ropa como sudaderas o abrigos acolchados en Armario Diario.', ar: 'اختر اسمًا ولون قميص. لاحقًا يمكنك تغيير اسمك في ورشة بطاقات الأسماء، وشراء ملابس مثل الهودي أو المعاطف المنفوخة من خزانة يومية.', vi: 'Chọn tên và màu áo phông. Sau này bạn có thể đổi tên ở xưởng bảng tên, và mua quần áo như áo hoodie hay áo phao ở Daily Closet.', hi: 'एक नाम और टी-शर्ट का रंग चुनें। बाद में नाम-टैग वर्कशॉप में नाम बदल सकते हैं, और डेली क्लोज़ेट से हुडी या पैडेड कोट जैसे कपड़े ख़रीद सकते हैं।', fr: 'Choisis un nom et une couleur de t-shirt. Plus tard, tu pourras changer de nom à l\'atelier de badges, et acheter des vêtements comme des sweats à capuche ou des doudounes au Daily Closet.', th: 'เลือกชื่อและสีเสื้อยืด ภายหลังเปลี่ยนชื่อได้ที่เวิร์กช็อปป้ายชื่อ และซื้อเสื้อผ้าอย่างฮู้ดดี้หรือเสื้อขนเป็ดได้ที่ Daily Closet', id: 'Pilih nama dan warna kaos. Nanti kamu bisa ganti nama di bengkel papan nama, dan beli baju seperti hoodie atau mantel puffer di Daily Closet.' },
};

export const LOGIN_TEXT = {
  title: { en: 'Keep your progress?', ko: '기록을 저장할까요?', ja: '記録を保存しますか？', zh: '要保存进度吗？' },
  text: {
    en: 'Sign in with Google and your money, items and home are saved to your account, so you can carry on from any device. As a guest, your progress may be lost when the game is updated, or if you clear this browser or switch devices.',
    ko: '구글로 로그인하면 돈, 아이템, 내 집이 계정에 저장돼서 어떤 기기에서든 이어서 할 수 있어요. 게스트는 게임이 업데이트될 때 기록이 사라질 수 있고, 브라우저 기록을 지우거나 기기를 바꿔도 사라질 수 있어요.',
    ja: 'Googleでログインすると、お金・アイテム・家がアカウントに保存され、どの端末でも続きから遊べます。ゲストの記録は、ゲームのアップデート時や、ブラウザの履歴を消したり端末を変えたときに消えることがあります。',
    zh: '用 Google 登录后，钱、物品和家会保存到账号，在任何设备上都能继续。游客的进度在游戏更新时可能会丢失，清除浏览器记录或换设备也可能丢失。',
  },
  google: { en: 'Sign in with Google (saves)', ko: '구글로 로그인 (저장돼요)', ja: 'Googleでログイン（保存されます）', zh: '用 Google 登录（会保存）' },
  guest: { en: 'Play as a guest', ko: '게스트로 시작', ja: 'ゲストで始める', zh: '以游客身份开始' },
  note: { en: 'You can link Google later in ⚙️ Settings too.', ko: '나중에 ⚙️ 설정에서도 구글을 연결할 수 있어요.', ja: 'あとで ⚙️ 設定からもGoogleを連携できます。', zh: '之后也可以在 ⚙️ 设置里绑定 Google。' },
};

export const OPERATOR_TEXT = {
  on: { en: '🛡️ Operator badge on', ko: '🛡️ 운영자 엠블럼을 달았어요', ja: '🛡️ 運営バッジをつけました', zh: '🛡️ 已戴上运营徽章' },
  off: { en: 'Operator badge off', ko: '운영자 엠블럼을 뗐어요', ja: '運営バッジを外しました', zh: '已摘下运营徽章' },
};

export const RESERVED_TEXT = { en: 'Names that look official (operator, admin…) can\'t be used.', ko: '운영자·관리자처럼 공식으로 보이는 이름은 쓸 수 없어요.', ja: '運営・管理者のような公式に見える名前は使えません。', zh: '不能使用像运营、管理员这样看起来官方的名字。' };

export const ZOO_TEXT = {
  soon: { en: '🍖 Feeding time at {name} in a minute', ko: '🍖 1분 뒤 {name} 먹이 시간이에요', ja: '🍖 1分後に{name}のごはんの時間', zh: '🍖 1分钟后{name}喂食时间' },
  now: { en: '🍖 Feeding time at {name}!', ko: '🍖 {name} 먹이 시간!', ja: '🍖 {name}のごはんの時間！', zh: '🍖 {name}喂食时间到！' },
  melon: { en: 'Toss the hippo a watermelon', ko: '하마에게 수박 주기', ja: 'カバにスイカをあげる', zh: '给河马喂西瓜' },
  crunch: { en: '🍉 Crunch! The hippo loved it', ko: '🍉 아삭! 하마가 정말 좋아해요', ja: '🍉 ガブッ！カバは大喜び', zh: '🍉 咔嚓！河马很喜欢' },
  poor: { en: 'A watermelon costs 🪙 {n}', ko: '수박은 🪙 {n}이에요', ja: 'スイカは🪙 {n}', zh: '西瓜要🪙 {n}' },
  buy: { en: 'Watermelon for the hippo', ko: '하마 수박', ja: 'カバのスイカ', zh: '河马的西瓜' },
};

export const ONBOARD_TEXT = {
  hi5: { en: '👋 Welcome! Give the guide a 🙌 high five.', ko: '👋 환영해요! 안내원과 🙌 하이파이브 해보세요.', ja: '👋 ようこそ！案内係と🙌ハイタッチしてみよう。', zh: '👋 欢迎！和向导🙌击个掌吧。', es: '👋 ¡Bienvenido! Choca los cinco 🙌 con el guía.', ar: '👋 أهلًا! قدّم للمرشد 🙌 كفًّا عالية.', vi: '👋 Chào mừng! Hãy 🙌 đập tay với người hướng dẫn.', hi: '👋 स्वागत है! गाइड को 🙌 हाई-फ़ाइव दें।', fr: '👋 Bienvenue ! Tape 🙌 dans la main du guide.', th: '👋 ยินดีต้อนรับ! 🙌 ไฮไฟว์กับไกด์หน่อย', id: '👋 Selamat datang! Ajak pemandu 🙌 tos.' },
  button: { en: 'High five the guide', ko: '안내원과 하이파이브', ja: '案内係とハイタッチ', zh: '和向导击掌', es: 'Chocar los cinco con el guía', ar: 'كفّ عالية مع المرشد', vi: 'Đập tay với người hướng dẫn', hi: 'गाइड को हाई-फ़ाइव दें', fr: 'Taper dans la main du guide', th: 'ไฮไฟว์กับไกด์', id: 'Tos dengan pemandu' },
  // The guide, before the first mission: visit the info centre first.
  infoTip: { en: 'Before your mission, do drop by the Information Center! It shows you everything you can do.', ko: '미션 전에 근처 안내센터에 꼭 들러 보세요! 할 수 있는 걸 전부 알려줘요.', ja: 'ミッションの前に、ぜひインフォメーションセンターに寄ってみて！できることを全部教えてくれるよ。', zh: '做任务前，一定要先去一趟信息中心！那里会告诉你能做的所有事情。', es: '¡Antes de tu misión, pásate por el Centro de Información! Te enseña todo lo que puedes hacer.', ar: 'قبل مهمتك، مُرّ على مركز المعلومات! سيُريك كل ما يمكنك فعله.', vi: 'Trước khi làm nhiệm vụ, hãy ghé Trung tâm Thông tin nhé! Ở đó có tất cả những gì bạn có thể làm.', hi: 'मिशन से पहले सूचना केंद्र ज़रूर जाएँ! वहाँ वह सब दिखता है जो आप कर सकते हैं।', fr: 'Avant ta mission, passe au Centre d\'information ! Il te montre tout ce que tu peux faire.', th: 'ก่อนทำภารกิจ แวะศูนย์ข้อมูลก่อนนะ! ที่นั่นบอกทุกอย่างที่คุณทำได้', id: 'Sebelum misimu, mampirlah ke Pusat Informasi! Di sana ada semua yang bisa kamu lakukan.' },
  done: { en: '🙌 Nice! 🪙 +{n}. Here is your first mission.', ko: '🙌 좋아요! 🪙 +{n}. 첫 미션을 드릴게요.', ja: '🙌 いいね！🪙 +{n}。最初のミッションです。', zh: '🙌 太棒了！🪙 +{n}。这是你的第一个任务。', es: '🙌 ¡Genial! 🪙 +{n}. Aquí tienes tu primera misión.', ar: '🙌 رائع! 🪙 +{n}. هذه مهمتك الأولى.', vi: '🙌 Tuyệt! 🪙 +{n}. Đây là nhiệm vụ đầu tiên của bạn.', hi: '🙌 बढ़िया! 🪙 +{n}। यह रहा आपका पहला मिशन।', fr: '🙌 Super ! 🪙 +{n}. Voici ta première mission.', th: '🙌 เยี่ยม! 🪙 +{n} นี่คือภารกิจแรกของคุณ', id: '🙌 Mantap! 🪙 +{n}. Ini misi pertamamu.' },
};

export const DRINK_TEXT = {
  boost: { en: '⚡ Energy up! You can run without getting tired for 3 minutes.', ko: '⚡ 기운이 났어요! 3분 동안 지치지 않고 달릴 수 있어요.', ja: '⚡ 元気が出た！3分間、疲れずに走れます。', zh: '⚡ 精神满满！3分钟内奔跑不会累。', es: '⚡ ¡Con energía! Puedes correr sin cansarte durante 3 minutos.', ar: '⚡ نشاط! يمكنك الركض دون تعب لمدة 3 دقائق.', vi: '⚡ Tràn đầy năng lượng! Bạn có thể chạy mà không mệt trong 3 phút.', hi: '⚡ ऊर्जा भर गई! 3 मिनट तक आप बिना थके दौड़ सकते हैं।', fr: '⚡ Plein d\'énergie ! Tu peux courir sans te fatiguer pendant 3 minutes.', th: '⚡ พลังเพิ่ม! วิ่งได้ไม่เหนื่อย 3 นาที', id: '⚡ Semangat! Kamu bisa lari tanpa lelah selama 3 menit.' },
};

export const HOME_TEXT = {
  bought: { en: 'You bought {name}! At home, tap 🛋️ Decorate to place it.', ko: '{name}을(를) 샀어요! 집에서 🛋️ 꾸미기를 눌러 놓아 보세요.', ja: '{name}を買いました！家で🛋️模様替えを押して置いてね。', zh: '买了{name}！在家点🛋️装饰就能摆放。' },
};

export const GOODS_TEXT = {
  got: { en: 'You bought {name}!', ko: '{name}을(를) 샀어요!', ja: '{name}を買いました！', zh: '买了{name}！', es: '¡Compraste {name}!', ar: 'اشتريت {name}!', vi: 'Bạn đã mua {name}!', hi: 'आपने {name} ख़रीदा!', fr: 'Tu as acheté {name} !', th: 'คุณซื้อ {name} แล้ว!', id: 'Kamu membeli {name}!' },
  gift: { en: 'A shopping bag · {name}', ko: '쇼핑백 · {name}', ja: 'ショッピングバッグ · {name}', zh: '购物袋 · {name}', es: 'Bolsa de compras · {name}', ar: 'كيس تسوق · {name}', vi: 'Túi mua sắm · {name}', hi: 'शॉपिंग बैग · {name}', fr: 'Un sac de shopping · {name}', th: 'ถุงช้อปปิ้ง · {name}', id: 'Tas belanja · {name}' },
  soon: { en: '🚧 Coming soon: this shop is getting ready.', ko: '🚧 현재 준비중입니다.', ja: '🚧 現在準備中です。', zh: '🚧 正在准备中。', es: '🚧 Próximamente: la tienda se está preparando.', ar: '🚧 قريبًا: المتجر قيد التجهيز.', vi: '🚧 Sắp ra mắt: cửa hàng này đang chuẩn bị.', hi: '🚧 जल्द आ रहा है: यह दुकान तैयार हो रही है।', fr: '🚧 Bientôt : cette boutique se prépare.', th: '🚧 เร็วๆ นี้: ร้านนี้กำลังเตรียมเปิด', id: '🚧 Segera hadir: toko sedang disiapkan.' },
};

export const PERFUME_TEXT = {
  spray: { en: 'Spray', ko: '뿌리기', ja: 'つける', zh: '喷', es: 'Rociar', ar: 'رشّ', vi: 'Xịt', hi: 'छिड़कें', fr: 'Vaporiser', th: 'ฉีด', id: 'Semprot' },
  got: { en: 'You bought {name}! It\'s in your 🎒 Bag › 👗 Wardrobe: spray it from there.', ko: '{name}을(를) 샀어요! 🎒 가방 › 👗 옷장에서 뿌릴 수 있어요.', ja: '{name}を買いました！🎒 バッグ › 👗 クローゼットからつけられます。', zh: '买了{name}！可以在🎒背包 › 👗衣橱里喷。', es: '¡Compraste {name}! Está en 🎒 Bolsa › 👗 Armario: rocíalo desde ahí.', ar: 'اشتريت {name}! إنه في 🎒 الحقيبة › 👗 الخزانة: رشّه من هناك.', vi: 'Bạn đã mua {name}! Nó ở 🎒 Túi › 👗 Tủ đồ: xịt từ đó nhé.', hi: 'आपने {name} ख़रीदा! यह 🎒 बैग › 👗 अलमारी में है: वहीं से छिड़कें।', fr: 'Vous avez acheté {name} ! Il est dans 🎒 Sac › 👗 Garde-robe : vaporisez-le de là.', th: 'ซื้อ {name} แล้ว! อยู่ใน 🎒 กระเป๋า › 👗 ตู้เสื้อผ้า ฉีดจากตรงนั้นได้เลย', id: 'Kamu membeli {name}! Ada di 🎒 Tas › 👗 Lemari: semprot dari sana.' },
  sprayed: { en: '🧴 {name} · lasts 3 min · {n} sprays left', ko: '🧴 {name} · 3분 동안 향이 나요 · {n}번 남음', ja: '🧴 {name} · 3分間香ります · 残り{n}回', zh: '🧴 {name} · 香味持续3分钟 · 还剩{n}次', es: '🧴 {name} · dura 3 min · quedan {n}', ar: '🧴 {name} · يدوم 3 دقائق · بقيت {n} رشّات', vi: '🧴 {name} · thơm trong 3 phút · còn {n} lần', hi: '🧴 {name} · 3 मिनट तक · {n} बार बाक़ी', fr: '🧴 {name} · dure 3 min · encore {n} vaporisations', th: '🧴 {name} · อยู่ได้ 3 นาที · ฉีดได้อีก {n} ครั้ง', id: '🧴 {name} · tahan 3 menit · sisa {n} semprot' },
  last: { en: '🧴 {name} · lasts 3 min · that was the last spray', ko: '🧴 {name} · 3분 동안 향이 나요 · 마지막 한 번이었어요', ja: '🧴 {name} · 3分間香ります · 最後の1回でした', zh: '🧴 {name} · 香味持续3分钟 · 这是最后一喷', es: '🧴 {name} · dura 3 min · era la última', ar: '🧴 {name} · يدوم 3 دقائق · كانت آخر رشّة', vi: '🧴 {name} · thơm trong 3 phút · đó là lần xịt cuối', hi: '🧴 {name} · 3 मिनट तक · यह आख़िरी बार था', fr: '🧴 {name} · dure 3 min · c\'était la dernière vaporisation', th: '🧴 {name} · อยู่ได้ 3 นาที · นี่คือครั้งสุดท้าย', id: '🧴 {name} · tahan 3 menit · itu semprotan terakhir' },
  gone: { en: 'Your perfume has worn off. Spray again from your bag.', ko: '향수 향이 날아갔어요. 가방에서 꺼내 다시 뿌려요.', ja: '香水の香りが消えました。バッグから出してまたつけてね。', zh: '香水味散了。从包里拿出来再喷一次吧。', es: 'Tu perfume se ha desvanecido. Vuelve a rociarlo desde la bolsa.', ar: 'تلاشى عطرك. رشّه مجددًا من الحقيبة.', vi: 'Mùi nước hoa đã bay hết. Lấy từ túi ra xịt lại nhé.', hi: 'आपकी ख़ुशबू उड़ गई। बैग से निकालकर फिर छिड़कें।', fr: 'Ton parfum s\'est dissipé. Vaporise à nouveau depuis ton sac.', th: 'กลิ่นน้ำหอมจางแล้ว ฉีดใหม่ได้จากกระเป๋า', id: 'Wangi parfummu sudah hilang. Semprot lagi dari tas.' },
  desc: { en: '{style} perfume · {n} sprays left. Hold it and tap 🧴 Spray.', ko: '{style} 향수 · {n}번 남음. 손에 들고 🧴 뿌리기를 눌러요.', ja: '{style}な香水 · 残り{n}回。手に持って🧴をタップ。', zh: '{style}香水 · 还剩{n}次。拿在手上点🧴。', es: 'Perfume {style} · quedan {n}. Sostenlo y toca 🧴.', ar: 'عطر {style} · بقيت {n} رشّات. أمسكه واضغط 🧴.', vi: 'Nước hoa {style} · còn {n} lần. Cầm lên và nhấn 🧴.', hi: '{style} ख़ुशबू · {n} बार बाक़ी। हाथ में लेकर 🧴 दबाएँ।', fr: 'Parfum {style} · encore {n} vaporisations. Tiens-le et touche 🧴 Vaporiser.', th: 'น้ำหอม {style} · ฉีดได้อีก {n} ครั้ง ถือไว้แล้วแตะ 🧴 ฉีด', id: 'Parfum {style} · sisa {n}. Pegang lalu ketuk 🧴.' },
};

export const UMB_TEXT = {
  bought: { en: 'Got an umbrella! It opens by itself when it rains or snows. ☂️', ko: '우산을 샀어요! 비나 눈이 오면 저절로 펴져요. ☂️', ja: '傘を買いました！雨や雪の日は自動で開きます。☂️', zh: '买到雨伞了！下雨或下雪时会自动撑开。☂️' },
};

export const CODE_TEXT = {
  coins: { en: '+🪙 {n}!', ko: '🪙 {n}을 받았어요!', ja: '🪙 {n} もらいました！', zh: '获得 🪙 {n}！', es: '¡+🪙 {n}!', ar: '+🪙 {n}!', vi: '+🪙 {n}!', hi: '+🪙 {n}!', fr: '+🪙 {n} !', th: '+🪙 {n}!', id: '+🪙 {n}!' },
  used: { en: 'That code was already used on this device.', ko: '이 기기에서 이미 쓴 코드예요.', ja: 'この端末ではもう使ったコードです。', zh: '这个代码已在本设备上使用过。', es: 'Ese código ya se usó en este dispositivo.', ar: 'استُخدم هذا الرمز بالفعل على هذا الجهاز.', vi: 'Mã này đã được dùng trên thiết bị này.', hi: 'यह कोड इस डिवाइस पर पहले ही इस्तेमाल हो चुका है।', fr: 'Ce code a déjà été utilisé sur cet appareil.', th: 'โค้ดนี้ถูกใช้ในอุปกรณ์นี้แล้ว', id: 'Kode itu sudah dipakai di perangkat ini.' },
  fish: { en: '🎣 Something huge is waiting... Cast your line!', ko: '🎣 뭔가 거대한 게 기다리고 있어요... 낚싯대를 던져 보세요!', ja: '🎣 何か大きなものが待っています…竿を投げてみて！', zh: '🎣 有个大家伙在等着……快抛竿吧！', es: '🎣 Algo enorme te espera... ¡Lanza la caña!', ar: '🎣 شيء ضخم ينتظر... ارمِ صنارتك!', vi: '🎣 Có thứ gì đó rất lớn đang chờ... Hãy quăng cần!', hi: '🎣 कुछ बहुत बड़ा इंतज़ार कर रहा है... कांटा डालो!', fr: '🎣 Quelque chose d\'énorme attend... Lance ta ligne !', th: '🎣 มีอะไรตัวใหญ่มากรออยู่... เหวี่ยงเบ็ดเลย!', id: '🎣 Ada sesuatu yang besar menunggu... Lempar kailmu!' },
  tourOn: { en: '🎣 Fish-book tour on: every bite is the next one in the book.', ko: '🎣 도감 투어 시작: 낚을 때마다 도감 순서대로 한 마리씩 잡혀요.', ja: '🎣 図鑑ツアー開始：釣るたびに図鑑の順に1匹ずつ釣れます。', zh: '🎣 图鉴巡览开启：每次钓鱼按图鉴顺序钓到一条。', es: '🎣 Recorrido del libro: cada picada es la siguiente del libro.', ar: '🎣 جولة الكتاب: كل لدغة هي التالية في الكتاب.', vi: '🎣 Tham quan sổ cá: mỗi lần câu là con tiếp theo trong sổ.', hi: '🎣 मछली-पुस्तक टूर चालू: हर बार किताब की अगली मछली।', fr: '🎣 Visite du carnet : chaque touche est la suivante du carnet.', th: '🎣 ทัวร์สมุดปลา: ตกได้ตามลำดับในสมุดทีละตัว', id: '🎣 Tur buku ikan: setiap gigitan adalah ikan berikutnya di buku.' },
  tourOff: { en: '🎣 Fish-book tour off.', ko: '🎣 도감 투어를 껐어요.', ja: '🎣 図鑑ツアーを終了しました。', zh: '🎣 图鉴巡览已关闭。', es: '🎣 Recorrido del libro desactivado.', ar: '🎣 أُوقفت جولة الكتاب.', vi: '🎣 Đã tắt tham quan sổ cá.', hi: '🎣 मछली-पुस्तक टूर बंद।', fr: '🎣 Visite du carnet terminée.', th: '🎣 ปิดทัวร์สมุดปลาแล้ว', id: '🎣 Tur buku ikan dimatikan.' },
  wrong: { en: 'That event code doesn\'t exist.', ko: '없는 이벤트 코드예요.', ja: 'そのイベントコードはありません。', zh: '没有这个活动代码。', es: 'Ese código de evento no existe.', ar: 'رمز الفعالية هذا غير موجود.', vi: 'Mã sự kiện này không tồn tại.', hi: 'यह इवेंट कोड मौजूद नहीं है।', fr: 'Ce code d\'événement n\'existe pas.', th: 'ไม่มีโค้ดกิจกรรมนี้', id: 'Kode acara itu tidak ada.' },
};

export const OUTFIT_TEXT = {
  bought: { en: 'New clothes! You are wearing them now.', ko: '새 옷을 샀어요! 바로 입었어요.', ja: '新しい服を買いました！さっそく着ています。', zh: '买了新衣服！已经穿上了。', es: '¡Ropa nueva! Ya la llevas puesta.', ar: 'ملابس جديدة! أنت ترتديها الآن.', vi: 'Quần áo mới! Bạn đang mặc rồi.', hi: 'नए कपड़े! आपने इन्हें अभी पहन लिया है।', fr: 'Nouveaux vêtements ! Tu les portes maintenant.', th: 'เสื้อผ้าใหม่! ตอนนี้คุณใส่อยู่แล้ว', id: 'Baju baru! Sekarang sedang kamu pakai.' },
  on: { en: 'Changed clothes!', ko: '옷을 갈아입었어요!', ja: '着替えました！', zh: '换好衣服了！', es: '¡Te cambiaste de ropa!', ar: 'غيّرت ملابسك!', vi: 'Đã thay đồ!', hi: 'कपड़े बदल लिए!', fr: 'Vêtements changés !', th: 'เปลี่ยนชุดแล้ว!', id: 'Sudah ganti baju!' },
  off: { en: 'Back in your T-shirt.', ko: '티셔츠로 갈아입었어요.', ja: 'Tシャツに着替えました。', zh: '换回T恤了。', es: 'De vuelta a tu camiseta.', ar: 'عدت إلى قميصك.', vi: 'Đã trở lại áo phông.', hi: 'वापस अपनी टी-शर्ट में।', fr: 'Retour à ton t-shirt.', th: 'กลับมาใส่เสื้อยืดแล้ว', id: 'Kembali ke kaosmu.' },
  boughtThing: { en: 'Bought! You are wearing it now.', ko: '샀어요! 바로 착용했어요.', ja: '買いました！さっそく着けています。', zh: '买好了！已经穿戴上了。', es: '¡Comprado! Ya lo llevas puesto.', ar: 'تم الشراء! أنت ترتديه الآن.', vi: 'Đã mua! Bạn đang đeo/mặc rồi.', hi: 'ख़रीद लिया! आपने इसे अभी पहन लिया है।', fr: 'Acheté ! Tu le portes maintenant.', th: 'ซื้อแล้ว! ตอนนี้ใส่อยู่', id: 'Sudah dibeli! Sekarang sedang kamu pakai.' },
  offThing: { en: 'Taken off.', ko: '벗었어요.', ja: '外しました。', zh: '取下了。', es: 'Te lo quitaste.', ar: 'خلعته.', vi: 'Đã tháo ra.', hi: 'उतार दिया।', fr: 'Enlevé.', th: 'ถอดแล้ว', id: 'Sudah dilepas.' },
};

export const HAUNT_TEXT = {
  enter: { en: 'Enter the haunted house', ko: '귀신의 집 들어가기', ja: 'お化け屋敷に入る', zh: '进入鬼屋', es: 'Entrar en la casa encantada', id: 'Masuk rumah hantu', vi: 'Vào nhà ma', hi: 'भूतिया घर में जाएँ', fr: 'Entrer dans la maison hantée', th: 'เข้าบ้านผีสิง', ar: 'ادخل البيت المسكون' },
  back: { en: 'Back to the park', ko: '공원으로 나가기', ja: '遊園地に戻る', zh: '回到乐园', es: 'Volver al parque', id: 'Kembali ke taman', vi: 'Trở lại công viên', hi: 'पार्क में वापस', fr: 'Retour au parc', th: 'กลับไปสวนสนุก', ar: 'العودة إلى الحديقة' },
  hello: {
    en: '👻 Follow the arrows. In the back room, tap the ghosts your lantern finds!', ko: '👻 화살표를 따라가요. 안쪽 방에서 랜턴에 나타나는 유령을 탭해요!',
    ja: '👻 矢印に沿って進もう。奥の部屋でランタンに現れるおばけをタップ！', zh: '👻 跟着箭头走。在里屋点击灯笼照到的幽灵！',
    es: '👻 Sigue las flechas. En la sala del fondo, toca los fantasmas que encuentre tu farol.', id: '👻 Ikuti panah. Di ruang belakang, ketuk hantu yang ditemukan lenteramu!',
    vi: '👻 Đi theo mũi tên. Ở phòng trong, chạm vào bóng ma mà đèn lồng tìm thấy!', hi: '👻 तीरों के पीछे चलें। पीछे के कमरे में लालटेन में दिखे भूतों पर टैप करें!',
    fr: '👻 Suis les flèches. Dans la salle du fond, touche les fantômes que ta lanterne trouve !',
    th: '👻 เดินตามลูกศร ในห้องด้านหลัง แตะผีที่โคมไฟส่องเจอ!',
    ar: '👻 اتبع الأسهم. في الغرفة الخلفية، انقر على الأشباح التي يجدها فانوسك!',
  },
};

export const HONK_TEXT = {
  bell: { en: 'Ring the bell', ko: '벨 울리기', ja: 'ベルを鳴らす', zh: '按车铃', es: 'Tocar el timbre', ar: 'اقرع الجرس', vi: 'Bấm chuông', hi: 'घंटी बजाएँ', fr: 'Sonner la sonnette', th: 'กดกริ่ง', id: 'Bunyikan bel' },
  horn: { en: 'Honk', ko: '경적 울리기', ja: 'クラクション', zh: '按喇叭', es: 'Tocar el claxon', ar: 'زمّور', vi: 'Bấm còi', hi: 'हॉर्न बजाएँ', fr: 'Klaxonner', th: 'บีบแตร', id: 'Klakson' },
};

export const VENDING_TEXT = {
  open: { en: 'Vending machine', ko: '음료 자판기', ja: '自動販売機', zh: '自动售货机' },
  note: { en: 'Cheap drinks, like a real station machine. Sip one to refill your stamina.', ko: '실제 역 자판기처럼 싼 음료예요. 마시면 체력이 채워져요.', ja: '本物の駅の自販機のように安い飲み物です。飲むとスタミナが回復します。', zh: '和真的车站售货机一样便宜。喝了可以恢复体力。' },
  buy: { en: 'Buy', ko: '사기', ja: '買う', zh: '购买' },
  got: { en: 'Clunk! {name} drops out.', ko: '덜컹! {name}이(가) 나왔어요.', ja: 'ガコン！{name}が出てきました。', zh: '咚！{name}掉出来了。' },
};

export const FIRST_TAXI_TEXT = {
  place: { en: 'Bukchon Hanok Village', ko: '북촌 한옥마을', ja: '北村韓屋村', zh: '北村韩屋村', es: 'Aldea Hanok de Bukchon', id: 'Desa Hanok Bukchon', ar: 'قرية بوكتشون هانوك', vi: 'Làng Hanok Bukchon', hi: 'बुकचोन हानोक गाँव', fr: 'Village hanok de Bukchon', th: 'หมู่บ้านฮันอกบุกชอน' },
  look: { en: 'Look around first', ko: '먼저 둘러보기', ja: '先に見て回る', zh: '先逛逛', es: 'Primero mirar', id: 'Lihat-lihat dulu', ar: 'أتجوّل أولًا', vi: 'Dạo một chút đã', hi: 'पहले घूम लूँ', fr: 'D\'abord faire un tour', th: 'เดินดูรอบๆ ก่อน' },
};

export const LOW_TEXT = {
  hint: { en: '🪙 Running low on money? Guides give paid missions: on Seongsu Square and at every Information Center.', ko: '🪙 돈이 얼마 안 남았어요! 성수 광장과 모든 안내소의 안내원이 보상 미션을 줘요.', ja: '🪙 お金が少なくなってきたよ！聖水の広場と各インフォメーションセンターの案内係が報酬つきミッションをくれるよ。', zh: '🪙 钱快用完了！圣水广场和每个信息中心的向导都会给有奖励的任务。', es: '🪙 ¿Te queda poco dinero? Los guías dan misiones pagadas: en la plaza de Seongsu y en cada Centro de Información.', id: '🪙 Uangmu menipis? Pemandu memberi misi berhadiah: di Alun-alun Seongsu dan di setiap Pusat Informasi.', ar: '🪙 مالك قليل؟ المرشدون يعطون مهام مدفوعة: في ساحة سونغسو وفي كل مركز معلومات.', vi: '🪙 Sắp hết tiền rồi? Người hướng dẫn giao nhiệm vụ có thưởng: ở Quảng trường Seongsu và mọi Trung tâm Thông tin.', hi: '🪙 पैसे कम हो रहे हैं? गाइड इनाम वाले मिशन देते हैं: सोंगसू चौक पर और हर सूचना केंद्र में।', fr: '🪙 Plus beaucoup d\'argent ? Les guides donnent des missions payées : sur la place de Seongsu et dans chaque Centre d\'information.', th: '🪙 เงินใกล้หมดแล้ว? ไกด์ให้ภารกิจมีรางวัล: ที่ลานซองซูและศูนย์ข้อมูลทุกแห่ง' },
  go: { en: '🧭 Nearest guide', ko: '🧭 가까운 안내원', ja: '🧭 近くの案内係', zh: '🧭 最近的向导', es: '🧭 Guía más cercano', id: '🧭 Pemandu terdekat', ar: '🧭 أقرب مرشد', vi: '🧭 Người hướng dẫn gần nhất', hi: '🧭 नज़दीकी गाइड', fr: '🧭 Guide le plus proche', th: '🧭 ไกด์ที่ใกล้ที่สุด' },
};

export const CHOOSER_TEXT = { en: 'What would you like to do?', ko: '무엇을 할까요?', ja: '何をしますか？', zh: '要做什么？' };

export const INGREDIENT_TEXT = {
  got: { en: '{name} is in your bag 🎒', ko: '{name}을(를) 가방에 넣었어요 🎒', ja: '{name}をバッグに入れました 🎒', zh: '{name}放进包里了 🎒' },
  sit: { en: 'Take the ramen to a parasol table ⛱️ and sit down to eat it.', ko: '라면은 파라솔 테이블 ⛱️에 앉아서 먹어요.', ja: 'ラーメンはパラソルのテーブル ⛱️ に座って食べよう。', zh: '把拉面端到遮阳伞桌 ⛱️ 坐下来吃吧。' },
};

export const MART_TEXT = { buy: { en: 'Buy at {name}', ko: '{name}에서 사기', ja: '{name}で買う', zh: '在{name}购买' } };

export const BUSK_TEXT = {
  start: { en: 'Busk', ko: '버스킹하기', ja: 'バスキングする', zh: '街头表演', es: 'Tocar en la calle', ar: 'اعزف في الشارع', vi: 'Biểu diễn đường phố', hi: 'बस्किंग करें', fr: 'Jouer dans la rue', th: 'เปิดหมวกเล่นดนตรี', id: 'Ngamen' },
  stop: { en: 'Stop busking', ko: '버스킹 끝내기', ja: 'バスキングをやめる', zh: '结束表演', es: 'Terminar', ar: 'إنهاء العزف', vi: 'Dừng biểu diễn', hi: 'बस्किंग बंद करें', fr: 'Arrêter de jouer', th: 'หยุดเล่นดนตรี', id: 'Berhenti ngamen' },
  hi: { en: 'Say hi to the busker', ko: '버스커에게 인사', ja: 'バスカーにあいさつ', zh: '和街头艺人打招呼', es: 'Saludar al músico', ar: 'حيِّ العازف', vi: 'Chào nghệ sĩ', hi: 'कलाकार को नमस्ते', fr: 'Dire bonjour au musicien', th: 'ทักทายนักดนตรี', id: 'Sapa pengamen' },
  begin: { en: '🎤 You\'re on! The crowd is listening. Moving ends the show.', ko: '🎤 공연 시작! 관객이 듣고 있어요. 움직이면 공연이 끝나요.', ja: '🎤 本番スタート！観客が聴いています。動くと終わります。', zh: '🎤 开演了！观众在听。移动就会结束表演。', es: '🎤 ¡A escena! El público escucha. Si te mueves, termina.', ar: '🎤 بدأ العرض! الجمهور يستمع. الحركة تنهي العرض.', vi: '🎤 Bắt đầu! Khán giả đang nghe. Di chuyển sẽ kết thúc.', hi: '🎤 शो शुरू! भीड़ सुन रही है। चलने से शो ख़त्म होगा।', fr: '🎤 C\'est à toi ! Le public écoute. Bouger met fin au spectacle.', th: '🎤 เริ่มโชว์แล้ว! ผู้ชมกำลังฟัง ถ้าเดินโชว์จะจบ', id: '🎤 Mulai! Penonton mendengarkan. Bergerak mengakhiri pertunjukan.' },
  tip: { en: '👏 A listener is clapping along!', ko: '👏 관객이 박수를 쳐 줘요!', ja: '👏 観客が手拍子してくれています！', zh: '👏 有观众在跟着拍手！', es: '👏 ¡Alguien aplaude contigo!', ar: '👏 أحد المستمعين يصفّق معك!', vi: '👏 Một khán giả đang vỗ tay theo!', hi: '👏 एक श्रोता ताली बजा रहा है!', fr: '👏 Un auditeur tape dans ses mains en rythme !', th: '👏 มีผู้ชมปรบมือตามจังหวะ!', id: '👏 Penonton ikut bertepuk tangan!' },
};

export const DANCE_TEXT = {
  start: { en: 'Dance', ko: '춤추기', ja: '踊る', zh: '跳舞' },
  stop: { en: 'Stop dancing', ko: '춤 멈추기', ja: 'ダンスをやめる', zh: '停止跳舞' },
};

export const PALACE_TEXT = {
  enter: { en: 'Enter Gyeongbokgung', ko: '경복궁 입장', ja: '景福宮に入る', zh: '进入景福宫' },
  leave: { en: 'Leave the palace', ko: '궁 밖으로 나가기', ja: '宮の外へ出る', zh: '出宫' },
  back: { en: 'For a better view for everyone, please stay a few steps back.', ko: '원활한 관람을 위해 몇 발자국 떨어져 주세요.', ja: '皆さまが快適にご覧いただけるよう、数歩下がってください。', zh: '为了大家更好地观看，请往后退几步。' },
};

export const PUNGMUL_TEXT = {
  hello: {
    en: 'A pungmul troupe! Drums, gongs and the long white ribbons of the sangmo hats spinning. Walk in and join the fun.',
    ko: '풍물패예요! 북과 징, 그리고 상모의 긴 흰 끈이 빙글빙글. 안으로 들어가 함께 즐겨 보세요.',
    ja: 'プンムルの一団！太鼓や銅鑼、サンモの長い白いリボンがくるくる。中に入って一緒に楽しもう。',
    zh: '农乐队来啦！鼓声、锣声，象帽上的长白带飞旋。走进去一起热闹吧。',
    es: '¡Una banda de pungmul! Tambores, gongs y las largas cintas blancas de los sombreros sangmo girando. Entra y únete.',
    id: 'Rombongan pungmul! Genderang, gong, dan pita putih panjang topi sangmo yang berputar. Masuk dan ikut meriah.',
    vi: 'Đoàn pungmul! Trống, chiêng và dải băng trắng dài trên mũ sangmo xoay tròn. Vào trong cùng vui nhé.',
    hi: 'पुंगमुल मंडली! ढोल, घंटे और सांगमो टोपियों के लंबे सफ़ेद रिबन घूमते हुए। अंदर जाइए और मज़े में शामिल होइए।',
    fr: 'Une troupe de pungmul ! Tambours, gongs et les longs rubans blancs des chapeaux sangmo qui tournoient. Entre et joins-toi à la fête.',
    th: 'คณะพุงมุล! กลอง ฆ้อง และริบบิ้นขาวยาวบนหมวกซังโมที่หมุนวน เดินเข้าไปร่วมสนุกกันเลย',
    ar: 'فرقة بونغمول! طبول وصنوج وأشرطة بيضاء طويلة تدور فوق قبعات سانغمو. ادخل وشارك المرح.',
  },
};

export const JM_TEXT = {
  ask: { en: 'Ask the guide', ko: '해설사에게 묻기', ja: '解説員に聞く', zh: '问讲解员' },
  hi: { en: 'Say hi to the grandpas', ko: '어르신께 인사하기', ja: 'おじいさんにあいさつ', zh: '和老爷爷打招呼' },
  enter: { en: 'Enter Jongmyo', ko: '종묘 입장', ja: '宗廟に入る', zh: '进入宗庙' },
  leave: { en: 'Leave Jongmyo', ko: '종묘에서 나가기', ja: '宗廟を出る', zh: '离开宗庙' },
  sindo: { en: '🛤️ The raised middle strip is the path for the ancestors\' spirits (sindo). People walk on the strips beside it.', ko: '🛤️ 가운데 높은 길은 조상의 혼령이 다니는 신도예요. 사람은 양옆 길로 걸어요.', ja: '🛤️ 中央の高い道は祖先の霊が通る神道です。人は両脇の道を歩きます。', zh: '🛤️ 中间高起的是祖先神灵走的神道，人走两侧的路。' },
  manners: { en: '🙇 You walked the stone path the right way, off the spirits\' strip! (+🪙 {c})', ko: '🙇 혼령의 길을 밟지 않고 돌길을 바르게 걸었어요! (+🪙 {c})', ja: '🙇 霊の道を踏まずに石畳を正しく歩きました！（+🪙 {c}）', zh: '🙇 没有踩神灵的路，正确地走完了石路！（+🪙 {c}）' },
  mannersLedger: { en: 'Jongmyo manners', ko: '종묘 예절', ja: '宗廟のマナー', zh: '宗庙礼仪' },
  rite: { en: '🥁 You watched the ilmu, the ritual dance of Jongmyo Jeryeak. (+🪙 {c})', ko: '🥁 종묘제례악의 일무를 끝까지 지켜봤어요. (+🪙 {c})', ja: '🥁 宗廟祭礼楽の佾舞を見届けました。（+🪙 {c}）', zh: '🥁 看完了宗庙祭礼乐的佾舞。（+🪙 {c}）' },
  riteLedger: { en: 'Jongmyo Jeryeak', ko: '종묘제례악 관람', ja: '宗廟祭礼楽の観覧', zh: '观看宗庙祭礼乐' },
};

export const BOOK_SWAP_TEXT = { en: 'Swapped books. "{name}" went back on the shelf. Sit anywhere and tap 📖 to read.', ko: '책을 바꿨어요. "{name}"은 책장에 돌려놨어요. 어디든 앉아서 📖를 누르면 읽을 수 있어요.', ja: '本を交換しました。「{name}」は本棚に戻しました。どこでも座って📖を押すと読めます。', zh: '换了一本书。《{name}》已放回书架。随便坐下点📖就能读。' };

export const BOOK_SIT_TEXT = { en: 'Tap 📖 Read to read your book here.', ko: '📖 읽기를 누르면 여기서 책을 읽을 수 있어요.', ja: '📖 読むを押すと、ここで本が読めます。', zh: '点📖阅读，就能在这里看书。' };

export const COASTER_TEXT = {
  staff: { en: 'Ride attendant', ko: '놀이기구 직원', ja: 'アトラクション係', zh: '游乐设施工作人员', es: 'Encargado de la atracción', id: 'Petugas wahana', vi: 'Nhân viên trò chơi', hi: 'राइड अटेंडेंट', fr: 'Agent de l\'attraction', th: 'พนักงานเครื่องเล่น', ar: 'موظف اللعبة' },
  enjoy: { en: 'Have a great ride! Keep your arms in… until the drop! 🎢', ko: '즐거운 탑승 되세요! 낙하 때는 두 팔 번쩍! 🎢', ja: 'いってらっしゃい！落ちる時は両手を上げて！🎢', zh: '祝你玩得开心！俯冲时举起双手！🎢', es: '¡Buen viaje! ¡Brazos arriba en la caída! 🎢', id: 'Selamat menikmati! Angkat tangan saat turun! 🎢', vi: 'Chúc vui vẻ! Giơ tay lên khi lao xuống nhé! 🎢', hi: 'मज़े करें! गिरते समय हाथ ऊपर! 🎢', fr: 'Bon tour ! Les bras en l\'air dans la descente ! 🎢', th: 'ขอให้สนุก! ตอนดิ่งยกมือขึ้นเลย! 🎢', ar: 'رحلة ممتعة! ارفع يديك عند الهبوط! 🎢' },
  full: { en: 'This train is full. The next one comes in 30 s.', ko: '이번 열차는 만석이에요. 30초 뒤 다음 열차가 와요.', ja: 'この列車は満席です。30秒後に次が来ます。', zh: '这班列车满了，30秒后下一班到。', es: 'Este tren está lleno. El siguiente llega en 30 s.', id: 'Kereta ini penuh. Berikutnya datang 30 dtk lagi.', vi: 'Tàu này đã đầy. Tàu sau đến sau 30 giây.', hi: 'यह ट्रेन भरी है। अगली 30 सेकंड में आएगी।', fr: 'Ce train est complet. Le suivant arrive dans 30 s.', th: 'ขบวนนี้เต็มแล้ว ขบวนถัดไปมาใน 30 วิ', ar: 'هذا القطار ممتلئ. التالي بعد 30 ث.' },
  board: { en: 'Ride the {name} · {fare}', ko: '{name} 타기 · {fare}', ja: '{name}に乗る · {fare}', zh: '乘坐{name} · {fare}', es: 'Subir al {name} · {fare}', id: 'Naik {name} · {fare}', vi: 'Đi {name} · {fare}', hi: '{name} पर बैठें · {fare}', fr: 'Monter dans l\'{name} · {fare}', th: 'นั่ง{name} · {fare}', ar: 'اركب {name} · {fare}' },
  wait: { en: 'Next train in {n} s', ko: '다음 열차까지 {n}초', ja: '次の列車まで {n} 秒', zh: '下一班列车 {n} 秒后到', es: 'Próximo tren en {n} s', id: 'Kereta berikutnya {n} dtk lagi', vi: 'Tàu tiếp theo sau {n} giây', hi: 'अगली ट्रेन {n} सेकंड में', fr: 'Prochain train dans {n} s', th: 'ขบวนถัดไปใน {n} วิ', ar: 'القطار التالي بعد {n} ث' },
  on: { en: 'Lap bar down. Hold on tight! 🎢', ko: '안전바가 내려왔어요. 꽉 잡으세요! 🎢', ja: '安全バーが下りました。しっかりつかまって！🎢', zh: '安全杆已放下，抓紧了！🎢', es: 'Barra bajada. ¡Agárrate fuerte! 🎢', id: 'Pengaman sudah turun. Pegangan yang erat! 🎢', vi: 'Thanh an toàn đã hạ. Bám chắc nhé! 🎢', hi: 'सेफ्टी बार नीचे। कसकर पकड़ें! 🎢', fr: 'Barre baissée. Accroche-toi bien ! 🎢', th: 'ราวกันตกลงแล้ว จับให้แน่น! 🎢', ar: 'نزل حاجز الأمان. تمسّك جيدًا! 🎢' },
  first: { en: 'View: from my seat', ko: '시점: 내 자리에서', ja: '視点：自分の席から', zh: '视角：从座位看', es: 'Vista: desde mi asiento', id: 'Tampilan: dari kursiku', vi: 'Góc nhìn: từ ghế của tôi', hi: 'दृश्य: मेरी सीट से', fr: 'Vue : depuis mon siège', th: 'มุมมอง: จากที่นั่ง', ar: 'المنظر: من مقعدي' },
  third: { en: 'View: behind me', ko: '시점: 내 뒤에서', ja: '視点：自分の後ろから', zh: '视角：从身后看', es: 'Vista: detrás de mí', id: 'Tampilan: dari belakang', vi: 'Góc nhìn: phía sau tôi', hi: 'दृश्य: मेरे पीछे से', fr: 'Vue : derrière moi', th: 'มุมมอง: จากด้านหลัง', ar: 'المنظر: من خلفي' },
  back: { en: 'Back in the station. Thanks for riding! 🍭', ko: '승강장에 도착했어요. 즐거우셨나요? 🍭', ja: '駅に戻りました。ご乗車ありがとう！🍭', zh: '回到站台了，玩得开心吗？🍭', es: '¡De vuelta en la estación! Gracias por subir 🍭', id: 'Kembali di stasiun. Terima kasih sudah naik! 🍭', vi: 'Đã về ga. Cảm ơn bạn đã đi! 🍭', hi: 'स्टेशन पर वापस। सवारी के लिए धन्यवाद! 🍭', fr: 'De retour à la gare. Merci d\'être monté ! 🍭', th: 'กลับถึงสถานีแล้ว ขอบคุณที่มาเล่น! 🍭', ar: 'عدت إلى المحطة. شكرًا على الركوب! 🍭' },
};

export const CABLE_TEXT = {
  board: { en: 'Get in · 🪙 {n} round trip', ko: '탑승 · 왕복 🪙 {n}', ja: '乗車 · 往復 🪙 {n}', zh: '上车 · 往返 🪙 {n}', es: 'Subir · ida y vuelta 🪙 {n}', id: 'Naik · pulang-pergi 🪙 {n}', ar: 'اركب · ذهاب وعودة 🪙 {n}', vi: 'Lên cabin · khứ hồi 🪙 {n}', hi: 'बैठें · आना-जाना 🪙 {n}', fr: 'Monter · 🪙 {n} aller-retour', th: 'ขึ้นกระเช้า · 🪙 {n} ไปกลับ' },
  down: { en: 'Ride down (your ticket covers it)', ko: '내려가기 (왕복권 포함)', ja: '下りに乗る（往復券に含まれます）', zh: '乘缆车下山（往返票已含）', es: 'Bajar (incluido en el billete)', id: 'Turun (sudah termasuk tiket)', ar: 'انزل (مشمول في التذكرة)', vi: 'Đi xuống (đã gồm trong vé)', hi: 'नीचे जाएँ (टिकट में शामिल)', fr: 'Redescendre (inclus dans ton ticket)', th: 'นั่งลง (รวมในตั๋วแล้ว)' },
  wait: { en: 'Next cabin in {n} s', ko: '다음 캐빈까지 {n}초', ja: '次のキャビンまで {n} 秒', zh: '下一班缆车 {n} 秒后到', es: 'Próxima cabina en {n} s', id: 'Kabin berikutnya {n} dtk lagi', ar: 'المقصورة التالية بعد {n} ث', vi: 'Cabin tiếp theo sau {n} giây', hi: 'अगला केबिन {n} सेकंड में', fr: 'Prochaine cabine dans {n} s', th: 'กระเช้าถัดไปใน {n} วิ' },
  leaves: { en: 'Get off (leaves in {n} s)', ko: '내리기 ({n}초 뒤 출발)', ja: '降りる（{n} 秒後に出発）', zh: '下车（{n} 秒后出发）', es: 'Bajar (sale en {n} s)', id: 'Turun (berangkat {n} dtk lagi)', ar: 'انزل (تنطلق بعد {n} ث)', vi: 'Xuống (khởi hành sau {n} giây)', hi: 'उतरें ({n} सेकंड में रवाना)', fr: 'Descendre (départ dans {n} s)', th: 'ลง (ออกใน {n} วิ)' },
  toTop: { en: 'Going up to the summit · {n} s', ko: '정상으로 올라가는 중 · {n}초', ja: '山頂へ向かっています · {n} 秒', zh: '正在上山 · {n} 秒', es: 'Subiendo a la cima · {n} s', id: 'Naik ke puncak · {n} dtk', ar: 'صعودًا إلى القمة · {n} ث', vi: 'Đang lên đỉnh · {n} giây', hi: 'चोटी की ओर · {n} सेकंड', fr: 'Montée vers le sommet · {n} s', th: 'กำลังขึ้นยอดเขา · {n} วิ' },
  toLow: { en: 'Going down to the lower station · {n} s', ko: '아래 승강장으로 내려가는 중 · {n}초', ja: '下の乗り場へ向かっています · {n} 秒', zh: '正在下山 · {n} 秒', es: 'Bajando a la estación · {n} s', id: 'Turun ke stasiun bawah · {n} dtk', ar: 'نزولًا إلى المحطة السفلى · {n} ث', vi: 'Đang xuống ga dưới · {n} giây', hi: 'नीचे स्टेशन की ओर · {n} सेकंड', fr: 'Descente vers la gare inférieure · {n} s', th: 'กำลังลงสถานีล่าง · {n} วิ' },
  top: { en: 'Welcome to the top of Namsan! Walk round the tower and look out over Seoul.', ko: '남산 정상에 오신 걸 환영해요! 타워 주변을 걸으며 서울을 내려다보세요.', ja: '南山の山頂へようこそ！タワーの周りを歩いてソウルを見渡してみましょう。', zh: '欢迎来到南山山顶！绕着塔走一走，俯瞰首尔吧。', es: '¡Bienvenido a la cima de Namsan! Pasea alrededor de la torre y mira Seúl.', id: 'Selamat datang di puncak Namsan! Jalan-jalan di sekitar menara dan lihat Seoul.', ar: 'أهلًا بك في قمة نامسان! تجوّل حول البرج وشاهد سيول من الأعلى.', vi: 'Chào mừng lên đỉnh Namsan! Đi quanh tháp và ngắm Seoul nhé.', hi: 'नामसान की चोटी पर स्वागत है! टावर के चारों ओर घूमें और सियोल देखें।', fr: 'Bienvenue au sommet de Namsan ! Fais le tour de la tour et admire Séoul.', th: 'ยินดีต้อนรับสู่ยอดเขานัมซาน! เดินรอบหอคอยแล้วชมวิวโซล' },
  low: { en: 'Back at the lower station. The exit is behind you.', ko: '아래 승강장에 도착했어요. 출구는 뒤쪽이에요.', ja: '下の乗り場に着きました。出口は後ろです。', zh: '回到下站了，出口在身后。', es: 'De vuelta en la estación. La salida está detrás.', id: 'Kembali di stasiun bawah. Pintu keluar ada di belakang.', ar: 'عدت إلى المحطة السفلى. المخرج خلفك.', vi: 'Đã về ga dưới. Lối ra ở phía sau.', hi: 'नीचे स्टेशन पर वापस। निकास पीछे है।', fr: 'De retour à la gare inférieure. La sortie est derrière toi.', th: 'กลับถึงสถานีล่างแล้ว ทางออกอยู่ด้านหลังคุณ' },
};

export const DRONE_TEXT = {
  soon: { en: '🛸 Drone light show at Ttukseom Han River Park in 10 minutes', ko: '🛸 10분 뒤 뚝섬 한강공원에서 드론 라이트쇼가 시작돼요', ja: '🛸 10分後にトゥクソム漢江公園でドローンライトショー', zh: '🛸 10分钟后纛岛汉江公园有无人机灯光秀' },
  lift: { en: '🛸 The drones are rising over the river. Look up!', ko: '🛸 강 위로 드론이 떠올라요. 하늘을 보세요!', ja: '🛸 川の上にドローンが上がります。空を見上げて！', zh: '🛸 无人机正从江面升起，抬头看！' },
  photo: { en: '📸 Photo time! Stand by the river', ko: '📸 사진 찍을 시간! 강가에 서 보세요', ja: '📸 撮影タイム！川辺に立ってみて', zh: '📸 拍照时间！站到江边吧' },
};

export const FIREWORKS_TEXT = {
  soon: { en: '🎆 Fireworks at Yeouido Han River Park in 10 minutes! Cross Seogang Bridge from Hongdae', ko: '🎆 10분 뒤 여의도 한강공원에서 불꽃놀이가 시작돼요! 홍대에서 서강대교를 건너요', ja: '🎆 10分後に汝矣島漢江公園で花火！弘大から西江大橋を渡って', zh: '🎆 10分钟后汝矣岛汉江公园有烟花！从弘大走过西江大桥' },
  dusk: { en: '🎆 The sky over Yeouido is getting dark. Find a spot on the lawn!', ko: '🎆 여의도 하늘이 어두워지고 있어요. 잔디밭에 자리를 잡으세요!', ja: '🎆 汝矣島の空が暗くなってきました。芝生に場所を取って！', zh: '🎆 汝矣岛的天空暗下来了，去草坪占个位置吧！' },
  count: { en: '🎆 10 seconds to the first firework!', ko: '🎆 첫 불꽃까지 10초!', ja: '🎆 最初の花火まであと10秒！', zh: '🎆 距离第一发烟花还有10秒！' },
  photo: { en: '📸 Photo time! Gold willows are falling. Pose with the fireworks behind you', ko: '📸 사진 찍을 시간! 금빛 버드나무 불꽃이 내려와요. 불꽃을 등지고 포즈를 잡아 보세요', ja: '📸 撮影タイム！金色の柳の花火。花火を背にポーズ', zh: '📸 拍照时间！金色柳树烟花落下来了，背对烟花摆个姿势' },
  finale: { en: '🎆 The finale!', ko: '🎆 대피날레!', ja: '🎆 グランドフィナーレ！', zh: '🎆 压轴大结局！' },
};

export const ADOPT_TEXT = {
  meet: { en: 'Meet {name} · adopt', ko: '{name} 만나기 · 분양', ja: '{name}に会う · 迎える', zh: '认识{name} · 领养' },
  desc: { en: '{desc}\nWaiting for a family. The adoption fee helps the café care for the animals.', ko: '{desc}\n가족을 기다리고 있어요. 분양비는 카페 동물들을 돌보는 데 쓰여요.', ja: '{desc}\n家族を待っています。譲渡費はカフェの動物たちのお世話に使われます。', zh: '{desc}\n正在等待家人。领养费用于照顾咖啡馆里的动物。' },
};
