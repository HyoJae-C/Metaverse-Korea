// Olympic Park Pool (core/pool.js, core/pool-hall.js): the words shown in
// the game, in every language the game speaks (English is the fallback).
// Kept out of main.js so the hall's clerk label can use them early.

export const POOL_TEXT = {
  lifeguard: { en: 'Lifeguard', ko: '안전요원', ja: 'ライフガード', zh: '救生员', es: 'Socorrista', ar: 'منقذ', vi: 'Cứu hộ', hi: 'लाइफ़गार्ड', id: 'Penjaga pantai' },
  welcome: {
    en: '🏊 Welcome to Olympic Park Pool! You\'re in swimwear: race 50 m from the blocks, climb the diving tower or grab a tube. Other swimsuits are in the lockers by the door.',
    ko: '🏊 올림픽공원 수영장에 오신 걸 환영해요! 수영복으로 갈아입었어요. 출발대에서 50m 레이스, 다이빙대, 튜브 놀이를 즐겨요. 다른 수영복은 입구 옆 보관함에서 골라요.',
    ja: '🏊 オリンピック公園プールへようこそ！水着に着替えたよ。スタート台から50mレース、飛び込み台、浮き輪を楽しもう。ほかの水着は入口のロッカーで。',
    zh: '🏊 欢迎来到奥林匹克公园游泳馆！已换上泳衣。从出发台开始50米比赛、上跳台或借泳圈吧。想换泳衣请到门口的储物柜。',
    es: '🏊 ¡Bienvenido a la Piscina del Parque Olímpico! Ya llevas bañador: compite en 50 m desde los poyetes, sube a la torre de saltos o coge un flotador. Hay más bañadores en las taquillas de la entrada.',
    ar: '🏊 أهلًا بك في مسبح الحديقة الأولمبية! أنت بملابس السباحة: تسابق 50 م من منصات الانطلاق، أو اصعد برج القفز، أو خذ عوامة. ملابس سباحة أخرى في الخزائن عند الباب.',
    vi: '🏊 Chào mừng đến Hồ bơi Công viên Olympic! Bạn đã mặc đồ bơi: đua 50 m từ bục xuất phát, leo tháp nhảy cầu hoặc lấy phao. Đồ bơi khác ở tủ đồ cạnh cửa.',
    hi: '🏊 ओलंपिक पार्क पूल में स्वागत है! आपने स्विमवियर पहन लिया: ब्लॉक से 50 मी. रेस, डाइविंग टावर या ट्यूब। दूसरे स्विमसूट दरवाज़े के पास लॉकर में हैं।',
    id: '🏊 Selamat datang di Kolam Taman Olimpiade! Kamu sudah pakai baju renang: balapan 50 m dari balok start, naik menara loncat atau ambil ban. Baju renang lain ada di loker dekat pintu.',
  },
  locker: { en: 'Locker · {name}', ko: '보관함 · {name}', ja: 'ロッカー · {name}', zh: '储物柜 · {name}', es: 'Taquilla · {name}', ar: 'خزانة · {name}', vi: 'Tủ đồ · {name}', hi: 'लॉकर · {name}', id: 'Loker · {name}' },
  suits: {
    'swim-navy': { en: 'Navy swimsuit', ko: '네이비 수영복', ja: 'ネイビーの水着', zh: '藏青泳衣', es: 'Bañador azul marino', ar: 'لباس سباحة كحلي', vi: 'Đồ bơi xanh navy', hi: 'नेवी स्विमसूट', id: 'Baju renang biru dongker' },
    'swim-coral': { en: 'Coral swimsuit', ko: '코랄 수영복', ja: 'コーラルの水着', zh: '珊瑚色泳衣', es: 'Bañador coral', ar: 'لباس سباحة مرجاني', vi: 'Đồ bơi màu san hô', hi: 'कोरल स्विमसूट', id: 'Baju renang koral' },
    'swim-mint': { en: 'Mint rash guard', ko: '민트 래시가드', ja: 'ミントのラッシュガード', zh: '薄荷色防晒泳衣', es: 'Licra menta', ar: 'قميص سباحة نعناعي', vi: 'Áo bơi bạc hà', hi: 'मिंट रैश गार्ड', id: 'Rash guard mint' },
    'swim-yellow': { en: 'Yellow rash guard', ko: '옐로 래시가드', ja: 'イエローのラッシュガード', zh: '黄色防晒泳衣', es: 'Licra amarilla', ar: 'قميص سباحة أصفر', vi: 'Áo bơi vàng', hi: 'पीला रैश गार्ड', id: 'Rash guard kuning' },
  },
  tubeTake: { en: 'Take a tube', ko: '튜브 빌리기', ja: '浮き輪を借りる', zh: '借泳圈', es: 'Coger un flotador', ar: 'خذ عوامة', vi: 'Lấy phao', hi: 'ट्यूब लें', id: 'Ambil ban' },
  tubePut: { en: 'Put the tube back', ko: '튜브 반납하기', ja: '浮き輪を返す', zh: '归还泳圈', es: 'Devolver el flotador', ar: 'أعد العوامة', vi: 'Trả phao', hi: 'ट्यूब लौटाएँ', id: 'Kembalikan ban' },
  race: { en: '50 m race · lane {n}', ko: '50m 레이스 · {n}레인', ja: '50mレース · {n}レーン', zh: '50米比赛 · 第{n}泳道', es: 'Carrera de 50 m · calle {n}', ar: 'سباق 50 م · الحارة {n}', vi: 'Đua 50 m · làn {n}', hi: '50 मी. रेस · लेन {n}', id: 'Balap 50 m · lintasan {n}' },
  stroke: { en: 'Stroke!', ko: '스트로크!', ja: 'ストローク！', zh: '划水！', es: '¡Brazada!', ar: 'جدّف!', vi: 'Quạt tay!', hi: 'स्ट्रोक!', id: 'Kayuh!' },
  ready: { en: 'On your marks…', ko: '제자리에…', ja: '位置について…', zh: '各就各位…', es: 'En sus marcas…', ar: 'استعد…', vi: 'Vào vị trí…', hi: 'अपनी जगह पर…', id: 'Bersiap…' },
  go: { en: 'GO!', ko: '출발!', ja: 'スタート！', zh: '出发！', es: '¡YA!', ar: 'انطلق!', vi: 'XUẤT PHÁT!', hi: 'शुरू!', id: 'MULAI!' },
  raceHint: { en: '🏁 Tap Stroke! in a steady rhythm. Tapping too fast just splashes!', ko: '🏁 스트로크 버튼을 일정한 박자로 눌러요. 너무 빨리 누르면 물만 튀어요!', ja: '🏁 ストロークを一定のリズムでタップ。速すぎると水しぶきだけ！', zh: '🏁 按固定节奏点“划水”。点太快只会溅水花！', es: '🏁 Pulsa Brazada a un ritmo constante. ¡Demasiado rápido solo salpica!', ar: '🏁 اضغط «جدّف» بإيقاع ثابت. السرعة الزائدة ترشّ الماء فقط!', vi: '🏁 Bấm Quạt tay đều nhịp. Bấm quá nhanh chỉ té nước thôi!', hi: '🏁 स्ट्रोक को एक जैसी लय में दबाएँ। बहुत तेज़ दबाने से बस छींटे उड़ेंगे!', id: '🏁 Tekan Kayuh dengan ritme tetap. Terlalu cepat cuma bikin cipratan!' },
  splash: { en: 'Splash! 💦', ko: '첨벙! 💦', ja: 'バシャ！💦', zh: '溅水！💦', es: '¡Chapoteo! 💦', ar: 'رشّة! 💦', vi: 'Té nước! 💦', hi: 'छपाक! 💦', id: 'Ciprat! 💦' },
  finish: { en: '{medal} Finish! {time} s', ko: '{medal} 도착! {time}초', ja: '{medal} ゴール！{time}秒', zh: '{medal} 到达！{time}秒', es: '{medal} ¡Llegada! {time} s', ar: '{medal} وصلت! {time} ث', vi: '{medal} Về đích! {time} giây', hi: '{medal} फ़िनिश! {time} से.', id: '{medal} Finis! {time} dtk' },
  newBest: { en: 'New best! 🎉', ko: '최고 기록! 🎉', ja: '自己ベスト！🎉', zh: '新纪录！🎉', es: '¡Nuevo récord! 🎉', ar: 'رقم قياسي جديد! 🎉', vi: 'Kỷ lục mới! 🎉', hi: 'नया बेस्ट! 🎉', id: 'Rekor baru! 🎉' },
  coins: { en: '+{n} coins', ko: '+{n}코인', ja: '+{n}コイン', zh: '+{n}金币', es: '+{n} monedas', ar: '+{n} عملات', vi: '+{n} xu', hi: '+{n} सिक्के', id: '+{n} koin' },
  hudRace: { en: '🏊 {m} / 50 m · {t} s', ko: '🏊 {m} / 50m · {t}초', ja: '🏊 {m} / 50m · {t}秒', zh: '🏊 {m} / 50米 · {t}秒', es: '🏊 {m} / 50 m · {t} s', ar: '🏊 {m} / 50 م · {t} ث', vi: '🏊 {m} / 50 m · {t} giây', hi: '🏊 {m} / 50 मी. · {t} से.', id: '🏊 {m} / 50 m · {t} dtk' },
  hudPool: { en: '🏁 Best {race} · 🤸 Best {dive}', ko: '🏁 최고 {race} · 🤸 최고 {dive}', ja: '🏁 ベスト {race} · 🤸 ベスト {dive}', zh: '🏁 最佳 {race} · 🤸 最佳 {dive}', es: '🏁 Mejor {race} · 🤸 Mejor {dive}', ar: '🏁 الأفضل {race} · 🤸 الأفضل {dive}', vi: '🏁 Tốt nhất {race} · 🤸 {dive}', hi: '🏁 बेस्ट {race} · 🤸 {dive}', id: '🏁 Terbaik {race} · 🤸 {dive}' },
  climb: { en: 'Climb up · {h} m', ko: '올라가기 · {h}m', ja: '登る · {h}m', zh: '爬上去 · {h}米', es: 'Subir · {h} m', ar: 'اصعد · {h} م', vi: 'Leo lên · {h} m', hi: 'ऊपर चढ़ें · {h} मी.', id: 'Naik · {h} m' },
  dive: { en: 'Dive!', ko: '다이빙!', ja: '飛び込み！', zh: '跳水！', es: '¡Salta!', ar: 'اقفز!', vi: 'Nhảy!', hi: 'डाइव!', id: 'Loncat!' },
  flip: { en: 'Flip!', ko: '회전!', ja: '回転！', zh: '翻转！', es: '¡Mortal!', ar: 'شقلبة!', vi: 'Lộn!', hi: 'फ़्लिप!', id: 'Salto!' },
  diveHint: { en: '🤸 Tap Dive! to jump, then Flip! to somersault. Finish each flip before you hit the water! Walk away to climb down.', ko: '🤸 다이빙 버튼으로 뛰고, 회전 버튼으로 공중제비! 물에 닿기 전에 회전을 끝내야 해요! 움직이면 내려가요.', ja: '🤸 飛び込みでジャンプ、回転で宙返り！着水までに回り切ろう！', zh: '🤸 按“跳水”起跳，按“翻转”空翻！入水前要转完！', es: '🤸 Pulsa Salta y luego Mortal para girar. ¡Termina cada giro antes de tocar el agua!', ar: '🤸 اضغط «اقفز» ثم «شقلبة». أكمل كل شقلبة قبل أن تلمس الماء!', vi: '🤸 Bấm Nhảy rồi Lộn để nhào lộn. Lộn xong trước khi chạm nước!', hi: '🤸 डाइव दबाकर कूदें, फिर फ़्लिप से कलाबाज़ी। पानी छूने से पहले फ़्लिप पूरा करें!', id: '🤸 Tekan Loncat, lalu Salto untuk berputar. Selesaikan putaran sebelum menyentuh air!' },
  clean: { en: '🌊 Clean entry! {n} flips +{p}', ko: '🌊 깔끔한 입수! {n}회전 +{p}', ja: '🌊 きれいな入水！{n}回転 +{p}', zh: '🌊 漂亮入水！{n}周 +{p}', es: '🌊 ¡Entrada limpia! {n} giros +{p}', ar: '🌊 دخول نظيف! {n} شقلبات +{p}', vi: '🌊 Vào nước đẹp! {n} vòng +{p}', hi: '🌊 साफ़ एंट्री! {n} फ़्लिप +{p}', id: '🌊 Masuk air mulus! {n} salto +{p}' },
  flop: { en: 'Belly flop! 💦 +{p}', ko: '배치기! 💦 +{p}', ja: '腹打ち！💦 +{p}', zh: '肚子拍水！💦 +{p}', es: '¡Panzazo! 💦 +{p}', ar: 'ارتطام بالبطن! 💦 +{p}', vi: 'Tiếp nước bằng bụng! 💦 +{p}', hi: 'पेट के बल! 💦 +{p}', id: 'Perut duluan! 💦 +{p}' },
  talk: { en: 'Talk to the lifeguard', ko: '안전요원과 이야기하기', ja: 'ライフガードと話す', zh: '和救生员聊天', es: 'Hablar con el socorrista', ar: 'تحدث إلى المنقذ', vi: 'Nói chuyện với cứu hộ', hi: 'लाइफ़गार्ड से बात करें', id: 'Bicara dengan penjaga' },
  // The lifeguard's tips: [Korean, romanised, translation].
  tips: [
    ['수영모 꼭 쓰세요!', 'suyeongmo kkok sseuseyo!', { en: 'Always wear a swim cap! (Most Korean pools ask for one.)', ko: '수영모는 꼭 써요! (한국 수영장은 대부분 수영모가 필수예요.)' }],
    ['뛰지 마세요!', 'ttwiji maseyo!', { en: 'No running on the deck!', ko: '수영장 바닥에서는 뛰지 마세요!' }],
    ['준비운동 하셨어요?', 'junbiundong hasyeosseoyo?', { en: 'Did you warm up first?', ko: '준비운동은 하셨어요?' }],
    ['박자 맞춰서 저어요!', 'bakja matchwoseo jeoeoyo!', { en: 'Race tip: stroke in a steady rhythm, not as fast as you can.', ko: '레이스 팁: 최대한 빨리가 아니라 일정한 박자로 저어요.' }],
  ],
};

export const SWIMSUITS = ['swim-navy', 'swim-coral', 'swim-mint', 'swim-yellow'];
export const RIVAL_NAMES = ['🏊 Haneul', '🏊 Doyun', '🏊 Sora'];
export const RIVAL_LOOKS = [
  { model: 'swim-navy', hair: 'black', skin: 'warm', shirt: 'sky' },
  { model: 'swim-yellow', hair: 'espresso', skin: 'fair', shirt: 'butter' },
  { model: 'swim-coral', hair: 'black', skin: 'tan', shirt: 'coral' },
];
export const MEDALS = ['🥇', '🥈', '🥉', '4️⃣'];
