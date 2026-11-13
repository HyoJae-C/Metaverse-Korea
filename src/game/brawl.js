// Rooftop Rumble: the arcade's 3D one-on-one fighting game (rules in
// core/brawl.js). You fight as your own character, dressed as you are,
// against five rivals on a night rooftop. The stage is built in the room's
// own scene, far under its floor, and the game's camera goes there while
// you play (like darts and bowling: game/arcade.js). Loaded the first time
// you play, from the game cabinet in a claw-machine room.
import * as THREE from 'three';
import { createCharacter } from '../core/character.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { TICK, RING_R, ROUNDS_TO_WIN, moveTicks, createMatch, loadBrawl, afterMatch, saveStyle, RIVALS, STYLES, STYLE_IDS, movesFor } from '../core/brawl.js';

const T = {
  title: { en: 'Rooftop Rumble', ko: '옥상 격투왕', ja: '屋上ランブル', zh: '天台格斗王', es: 'Rooftop Rumble', id: 'Rooftop Rumble', vi: 'Rooftop Rumble', hi: 'रूफ़टॉप रंबल', fr: 'Rooftop Rumble', th: 'ศึกดาดฟ้า', ar: 'نزال السطح' },
  how: {
    en: 'You fight as your own character. Two punches and two kicks, one button per hand and foot. Hold away from your rival to guard, and step up or down to slip round a punch. Light hits chain into heavier ones. Best of three rounds.',
    ko: '내 캐릭터 그대로 싸워요. 주먹 둘, 발 둘, 손발마다 버튼 하나. 상대 반대쪽으로 누르고 있으면 막기, 위아래로 옆걸음해서 주먹을 피해요. 가벼운 공격에서 센 공격으로 이어져요. 3판 2선승.',
    ja: '自分のキャラクターのまま戦います。パンチ2つとキック2つ、手足ごとにボタン1つ。相手と反対に入れっぱなしでガード、上下で横移動してパンチをかわそう。軽い技から重い技へつながります。3本勝負。',
    zh: '用你自己的角色上场。两拳两脚，每只手脚一个按键。按住远离对手的方向防御，上下横移躲开直拳。轻攻击可以接重攻击。三局两胜。',
    es: 'Peleas con tu propio personaje. Dos puñetazos y dos patadas, un botón por mano y pie. Mantén hacia atrás para cubrirte y da un paso arriba o abajo para esquivar. Los golpes ligeros enlazan con los fuertes. Al mejor de tres.',
    id: 'Kamu bertarung dengan karaktermu sendiri. Dua pukulan dan dua tendangan, satu tombol tiap tangan dan kaki. Tahan menjauh dari lawan untuk bertahan, melangkah ke atas atau bawah untuk menghindar. Serangan ringan bisa disambung ke yang berat. Dua dari tiga ronde.',
    vi: 'Bạn chiến đấu bằng chính nhân vật của mình. Hai đấm, hai đá, mỗi tay chân một nút. Giữ hướng ra xa đối thủ để đỡ, bước lên hoặc xuống để né. Đòn nhẹ nối được sang đòn nặng. Thắng 2 trên 3 hiệp.',
    hi: 'आप अपने ही किरदार से लड़ते हैं। दो मुक्के, दो किक, हर हाथ-पैर का एक बटन। बचाव के लिए प्रतिद्वंद्वी से दूर दबाए रखें, मुक्के से बचने के लिए ऊपर या नीचे हटें। हल्के वार भारी वार से जुड़ते हैं। तीन में से दो राउंड।',
    fr: 'Tu te bats avec ton propre personnage. Deux poings, deux pieds, un bouton par main et par pied. Maintiens la direction opposée pour te protéger, fais un pas en haut ou en bas pour esquiver. Les coups légers s\'enchaînent vers les plus lourds. Deux manches gagnantes.',
    th: 'สู้ด้วยตัวละครของคุณเอง หมัดสอง เตะสอง ปุ่มละมือละเท้า กดค้างทิศออกจากคู่ต่อสู้เพื่อป้องกัน ก้าวขึ้นหรือลงเพื่อหลบหมัด ท่าเบาต่อเป็นท่าหนักได้ ชนะ 2 ใน 3 ยก',
    ar: 'تقاتل بشخصيتك كما هي. لكمتان وركلتان، زر لكل يد وقدم. اضغط مبتعدًا عن خصمك للصد، وتحرّك للأعلى أو الأسفل لتفادي اللكمة. الضربات الخفيفة تتصل بالأقوى. الأفضل من ثلاث جولات.',
  },
  moves: {
    en: '→ + right punch: launcher · both punches: guard breaker · both kicks: flying kick',
    ko: '→ + 오른 주먹: 띄우기 · 주먹 둘 같이: 가드 깨기 · 발 둘 같이: 날아차기',
    ja: '→＋右パンチ：浮かせ技 · パンチ同時：ガード崩し · キック同時：飛び蹴り',
    zh: '→ + 右拳：浮空 · 双拳同按：破防 · 双脚同按：飞踢',
    es: '→ + puño derecho: lanzador · dos puños: rompeguardias · dos patadas: patada voladora',
    id: '→ + pukulan kanan: pelontar · dua pukulan: pemecah pertahanan · dua tendangan: tendangan terbang',
    vi: '→ + đấm phải: hất tung · hai đấm: phá thủ · hai đá: đá bay',
    hi: '→ + दायाँ मुक्का: लॉन्चर · दोनों मुक्के: गार्ड तोड़ · दोनों किक: उड़ती किक',
    fr: '→ + poing droit : lanceur · deux poings : brise-garde · deux pieds : coup de pied sauté',
    th: '→ + หมัดขวา: งัดลอย · สองหมัดพร้อมกัน: ทำลายการ์ด · สองเท้าพร้อมกัน: กระโดดเตะ',
    ar: '→ + اللكمة اليمنى: رافعة · اللكمتان معًا: كاسرة الصد · الركلتان معًا: ركلة طائرة',
  },
  keys: {
    en: 'A D move · W S side-step · U I punches · J K kicks',
    ko: 'A D 이동 · W S 옆걸음 · U I 주먹 · J K 발',
    ja: 'A D 移動 · W S 横移動 · U I パンチ · J K キック',
    zh: 'A D 移动 · W S 横移 · U I 拳 · J K 脚',
    es: 'A D mover · W S paso lateral · U I puños · J K patadas',
    id: 'A D gerak · W S langkah samping · U I pukulan · J K tendangan',
    vi: 'A D di chuyển · W S bước ngang · U I đấm · J K đá',
    hi: 'A D चलें · W S बगल कदम · U I मुक्के · J K किक',
    fr: 'A D bouger · W S pas de côté · U I poings · J K pieds',
    th: 'A D เดิน · W S ก้าวข้าง · U I หมัด · J K เตะ',
    ar: 'A D تحرّك · W S خطوة جانبية · U I لكمات · J K ركلات',
  },
  start: { en: 'Fight {name}', ko: '{name}와 대결', ja: '{name}と対戦', zh: '挑战{name}', es: 'Pelear contra {name}', id: 'Lawan {name}', vi: 'Đấu với {name}', hi: '{name} से लड़ें', fr: 'Affronter {name}', th: 'สู้กับ {name}', ar: 'قاتل {name}' },
  rival: { en: 'Rival {n} of {max}', ko: '상대 {n} / {max}', ja: 'ライバル {n} / {max}', zh: '对手 {n} / {max}', es: 'Rival {n} de {max}', id: 'Lawan {n} dari {max}', vi: 'Đối thủ {n} / {max}', hi: 'प्रतिद्वंद्वी {n} / {max}', fr: 'Rival {n} sur {max}', th: 'คู่ต่อสู้ {n} / {max}', ar: 'الخصم {n} من {max}' },
  best: { en: 'Best: {n} rivals beaten', ko: '최고 기록: {n}명 격파', ja: 'ベスト：{n}人撃破', zh: '最佳：击败{n}人', es: 'Récord: {n} rivales vencidos', id: 'Terbaik: {n} lawan kalah', vi: 'Tốt nhất: hạ {n} đối thủ', hi: 'बेस्ट: {n} प्रतिद्वंद्वी हराए', fr: 'Record : {n} rivaux battus', th: 'ดีที่สุด: ชนะ {n} คน', ar: 'الأفضل: هزمت {n} خصوم' },
  crowns: { en: '👑 Champion × {n}', ko: '👑 챔피언 {n}회', ja: '👑 チャンピオン {n}回', zh: '👑 冠军 {n}次', es: '👑 Campeón × {n}', id: '👑 Juara × {n}', vi: '👑 Vô địch × {n}', hi: '👑 चैंपियन × {n}', fr: '👑 Champion × {n}', th: '👑 แชมป์ × {n}', ar: '👑 بطل × {n}' },
  won: { en: 'You beat {name}!', ko: '{name}를 이겼어요!', ja: '{name}に勝ちました！', zh: '你打败了{name}！', es: '¡Venciste a {name}!', id: 'Kamu mengalahkan {name}!', vi: 'Bạn đã thắng {name}!', hi: 'आपने {name} को हरा दिया!', fr: 'Tu as battu {name} !', th: 'คุณชนะ {name}!', ar: 'هزمت {name}!' },
  lost: { en: '{name} wins this time. Try again?', ko: '이번엔 {name}의 승리. 다시 해 볼까요?', ja: '今回は{name}の勝ち。もう一度？', zh: '这次{name}赢了。再来一次？', es: 'Esta vez gana {name}. ¿Otra vez?', id: 'Kali ini {name} menang. Coba lagi?', vi: 'Lần này {name} thắng. Thử lại nhé?', hi: 'इस बार {name} जीते। फिर कोशिश करें?', fr: 'Cette fois, {name} gagne. On réessaie ?', th: 'รอบนี้ {name} ชนะ ลองอีกครั้งไหม?', ar: 'فاز {name} هذه المرة. تحاول مجددًا؟' },
  champ: { en: '👑 You are the rooftop champion!', ko: '👑 옥상 챔피언이 됐어요!', ja: '👑 屋上チャンピオンになりました！', zh: '👑 你成了天台冠军！', es: '👑 ¡Eres el campeón de la azotea!', id: '👑 Kamu juara atap!', vi: '👑 Bạn là nhà vô địch sân thượng!', hi: '👑 आप छत के चैंपियन हैं!', fr: '👑 Tu es le champion du toit !', th: '👑 คุณคือแชมป์ดาดฟ้า!', ar: '👑 أنت بطل السطح!' },
  next: { en: 'Next rival', ko: '다음 상대', ja: '次のライバル', zh: '下一个对手', es: 'Siguiente rival', id: 'Lawan berikutnya', vi: 'Đối thủ tiếp theo', hi: 'अगला प्रतिद्वंद्वी', fr: 'Rival suivant', th: 'คู่ต่อไป', ar: 'الخصم التالي' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次', es: 'Otra vez', id: 'Lagi', vi: 'Lần nữa', hi: 'फिर से', fr: 'Rejouer', th: 'อีกครั้ง', ar: 'مرة أخرى' },
  close: { en: 'Leave', ko: '나가기', ja: 'やめる', zh: '离开', es: 'Salir', id: 'Keluar', vi: 'Rời đi', hi: 'बाहर', fr: 'Quitter', th: 'ออก', ar: 'خروج' },
  hits: { en: '{n} HITS', ko: '{n} 연타', ja: '{n} HITS', zh: '{n} 连击', es: '{n} GOLPES', id: '{n} HIT', vi: '{n} ĐÒN', hi: '{n} हिट', fr: '{n} COUPS', th: '{n} ฮิต', ar: '{n} ضربات' },
  pick: { en: 'Pick your style', ko: '스타일을 골라요', ja: 'スタイルを選ぼう', zh: '选择你的流派', es: 'Elige tu estilo', id: 'Pilih gayamu', vi: 'Chọn phong cách', hi: 'अपनी शैली चुनें', fr: 'Choisis ton style', th: 'เลือกสไตล์ของคุณ', ar: 'اختر أسلوبك' },
  dash: {
    en: 'Dash: tap ← or → twice (or hold Shift). An attack can cut a dash short.',
    ko: '대시: ← 또는 →를 두 번 톡톡 (또는 Shift). 대시 중에 공격으로 이어져요.',
    ja: 'ダッシュ：← か → を2回（またはShift）。ダッシュ中に攻撃へつなげます。',
    zh: '冲刺：连按两下 ← 或 →（或按住 Shift）。冲刺中可以接攻击。',
    es: 'Carrera: pulsa ← o → dos veces (o Shift). Un ataque puede cortar la carrera.',
    id: 'Dash: ketuk ← atau → dua kali (atau Shift). Serangan bisa memotong dash.',
    vi: 'Lướt: nhấn ← hoặc → hai lần (hoặc Shift). Có thể ra đòn giữa lúc lướt.',
    hi: 'डैश: ← या → दो बार दबाएँ (या Shift)। डैश के बीच वार किया जा सकता है।',
    fr: 'Dash : appuie deux fois sur ← ou → (ou Maj). Une attaque peut couper le dash.',
    th: 'แดช: กด ← หรือ → สองครั้ง (หรือ Shift) ออกท่าโจมตีระหว่างแดชได้',
    ar: 'اندفاع: اضغط ← أو → مرتين (أو Shift). يمكن أن يقطعه هجوم.',
  },
  you: { en: 'You', ko: '나', ja: '自分', zh: '你', es: 'Tú', id: 'Kamu', vi: 'Bạn', hi: 'आप', fr: 'Toi', th: 'คุณ', ar: 'أنت' },
};
const tt = (k, v) => fmt(L(T[k]), v);

// The five rivals (made up for this game), easy to champion: their look and
// the sky over their round.
// The eight styles: a name, a line about it, the signature move's name, and
// how it stands (bone offsets like STANCE below).
const STYLE = {
  brawler: {
    icon: '🥊',
    name: { en: 'Brawler', ko: '격투가', ja: '格闘家', zh: '格斗家', es: 'Luchador', id: 'Petarung', vi: 'Võ sĩ', hi: 'लड़ाका', fr: 'Bagarreur', th: 'นักสู้', ar: 'المقاتل' },
    line: { en: 'Good at everything. Keeps both the guard breaker and the flying kick.', ko: '뭐든 고르게 잘해요. 가드 깨기와 날아차기를 둘 다 써요.', ja: '何でもこなす万能型。ガード崩しも飛び蹴りも使えます。', zh: '样样均衡。破防和飞踢都能用。', es: 'Bueno en todo. Tiene rompeguardias y patada voladora.', id: 'Serba bisa. Punya pemecah pertahanan dan tendangan terbang.', vi: 'Giỏi đều mọi thứ. Có cả phá thủ lẫn đá bay.', hi: 'हर चीज़ में अच्छा। गार्ड तोड़ और उड़ती किक दोनों।', fr: 'Bon partout. Garde le brise-garde et le coup de pied sauté.', th: 'เก่งรอบด้าน ใช้ได้ทั้งทำลายการ์ดและกระโดดเตะ', ar: 'جيد في كل شيء. لديه كاسرة الصد والركلة الطائرة.' },
    sig: { en: 'Guard breaker', ko: '가드 깨기', ja: 'ガード崩し', zh: '破防掌', es: 'Rompeguardias', id: 'Pemecah pertahanan', vi: 'Phá thủ', hi: 'गार्ड तोड़', fr: 'Brise-garde', th: 'ทำลายการ์ด', ar: 'كاسرة الصد' },
  },
  ninja: {
    icon: '🥷',
    name: { en: 'Ninja', ko: '닌자', ja: '忍者', zh: '忍者', es: 'Ninja', id: 'Ninja', vi: 'Ninja', hi: 'निंजा', fr: 'Ninja', th: 'นินจา', ar: 'النينجا' },
    line: { en: 'Very fast, little health. Vanishes and strikes from behind.', ko: '아주 빠르지만 체력이 적어요. 사라졌다가 등 뒤에서 쳐요.', ja: 'とても速いが体力は少なめ。消えて背後から斬ります。', zh: '速度极快但血量少。瞬间消失，从背后出击。', es: 'Muy rápido, poca vida. Desaparece y golpea por la espalda.', id: 'Sangat cepat, darah sedikit. Menghilang lalu menyerang dari belakang.', vi: 'Rất nhanh, ít máu. Biến mất rồi đánh từ sau lưng.', hi: 'बहुत तेज़, कम सेहत। ग़ायब होकर पीछे से वार।', fr: 'Très rapide, peu de vie. Disparaît et frappe dans le dos.', th: 'เร็วมากแต่เลือดน้อย หายตัวแล้วโจมตีจากด้านหลัง', ar: 'سريع جدًا وقليل الصحة. يختفي ويضرب من الخلف.' },
    sig: { en: 'Shadow step', ko: '그림자 걸음', ja: '影歩き', zh: '影步', es: 'Paso sombra', id: 'Langkah bayangan', vi: 'Bước bóng', hi: 'छाया क़दम', fr: 'Pas de l\'ombre', th: 'ก้าวเงา', ar: 'خطوة الظل' },
    stance: { armL: [-1.1, 0, 0], foreL: [-0.6, 0, 0], armR: [0.5, 0, 0], foreR: [-1.2, 0, 0], legL: [-0.5, 0, 0], kneeL: [0.75, 0, 0], legR: [0.3, 0, 0], kneeR: [0.6, 0, 0], spine: [0.32, 0, 0] },
  },
  tank: {
    icon: '🛡️',
    name: { en: 'Tank', ko: '탱커', ja: 'タンク', zh: '坦克', es: 'Tanque', id: 'Tank', vi: 'Đỡ đòn', hi: 'टैंक', fr: 'Tank', th: 'แทงก์', ar: 'المدرّع' },
    line: { en: 'Slow, lots of health. Its charge keeps going through a hit.', ko: '느리지만 체력이 많아요. 돌진은 한 대 맞아도 멈추지 않아요.', ja: '遅いが体力たっぷり。突進は1発受けても止まりません。', zh: '慢但血厚。冲撞时挨一下也不会停。', es: 'Lento, mucha vida. Su carga aguanta un golpe sin pararse.', id: 'Lambat, darah banyak. Serudukannya tidak berhenti walau kena pukul.', vi: 'Chậm, nhiều máu. Cú húc không dừng dù trúng một đòn.', hi: 'धीमा, ढेर सेहत। इसका धावा एक वार खाकर भी नहीं रुकता।', fr: 'Lent, beaucoup de vie. Sa charge encaisse un coup sans s\'arrêter.', th: 'ช้าแต่เลือดเยอะ ท่าพุ่งชนไม่หยุดแม้โดนตีหนึ่งที', ar: 'بطيء وكثير الصحة. اندفاعه لا يتوقف عند ضربة.' },
    sig: { en: 'Shoulder charge', ko: '어깨 돌진', ja: 'ショルダーチャージ', zh: '肩撞', es: 'Carga de hombro', id: 'Seruduk bahu', vi: 'Húc vai', hi: 'कंधा धावा', fr: 'Charge d\'épaule', th: 'พุ่งชนไหล่', ar: 'اندفاع الكتف' },
    stance: { armL: [-0.5, -0.5, 0], foreL: [-1.2, 0, 0], armR: [-0.5, 0.5, 0], foreR: [-1.2, 0, 0], legL: [-0.35, 0, 0], kneeL: [0.55, 0, 0], legR: [0.3, 0, 0], kneeR: [0.5, 0, 0], spine: [0.22, 0, 0] },
  },
  kicker: {
    icon: '🦵',
    name: { en: 'Kicker', ko: '발차기 선수', ja: 'キッカー', zh: '踢击手', es: 'Pateador', id: 'Penendang', vi: 'Cao thủ đá', hi: 'किकर', fr: 'Kicker', th: 'นักเตะ', ar: 'الراكل' },
    line: { en: 'Fast, strong kicks and weak punches. A spinning kick hits three times.', ko: '발이 빠르고 세지만 주먹은 약해요. 돌려차기가 세 번 맞아요.', ja: 'キックは速くて強く、パンチは弱め。回し蹴りが3回当たります。', zh: '腿快而重，拳偏弱。旋踢连中三下。', es: 'Patadas rápidas y fuertes, puños flojos. Su patada giratoria golpea tres veces.', id: 'Tendangan cepat dan kuat, pukulan lemah. Tendangan putar kena tiga kali.', vi: 'Đá nhanh và mạnh, đấm yếu. Cú đá xoay trúng ba lần.', hi: 'तेज़ दमदार किक, कमज़ोर मुक्के। घूमती किक तीन बार लगती है।', fr: 'Pieds rapides et forts, poings faibles. Son coup tournant touche trois fois.', th: 'เตะเร็วและแรง หมัดเบา เตะหมุนโดนสามครั้ง', ar: 'ركلات سريعة قوية ولكمات ضعيفة. ركلته الدوّارة تصيب ثلاث مرات.' },
    sig: { en: 'Whirlwind kick', ko: '회오리 차기', ja: '旋風脚', zh: '旋风踢', es: 'Patada torbellino', id: 'Tendangan puting beliung', vi: 'Đá lốc xoáy', hi: 'बवंडर किक', fr: 'Coup de pied tourbillon', th: 'เตะพายุหมุน', ar: 'ركلة الإعصار' },
    stance: { armL: [-0.3, 0, 0], foreL: [-0.9, 0, 0], armR: [-0.2, 0, 0], foreR: [-0.8, 0, 0], legL: [-0.25, 0, 0], kneeL: [0.3, 0, 0], legR: [0.2, 0, 0], kneeR: [0.25, 0, 0], spine: [0.05, 0, 0] }, bounce: 0.05,
  },
  boxer: {
    icon: '👊',
    name: { en: 'Boxer', ko: '복서', ja: 'ボクサー', zh: '拳击手', es: 'Boxeador', id: 'Petinju', vi: 'Tay đấm', hi: 'मुक्केबाज़', fr: 'Boxeur', th: 'นักมวย', ar: 'الملاكم' },
    line: { en: 'Fast, heavy fists and long dashes. Kicks are slow.', ko: '주먹이 빠르고 묵직하고 대시가 길어요. 발은 느려요.', ja: 'パンチは速くて重く、ダッシュも長い。キックは遅め。', zh: '拳又快又重，冲刺距离长。腿比较慢。', es: 'Puños rápidos y duros, carreras largas. Patadas lentas.', id: 'Pukulan cepat dan berat, dash jauh. Tendangan lambat.', vi: 'Đấm nhanh và nặng, lướt xa. Đá chậm.', hi: 'तेज़ भारी मुक्के, लंबा डैश। किक धीमी।', fr: 'Poings rapides et lourds, longs dashs. Pieds lents.', th: 'หมัดเร็วและหนัก แดชไกล เตะช้า', ar: 'لكمات سريعة ثقيلة واندفاع طويل. ركلاته بطيئة.' },
    sig: { en: 'Haymaker', ko: '한 방 훅', ja: '渾身のフック', zh: '重勾拳', es: 'Gancho total', id: 'Hook pamungkas', vi: 'Cú móc trời giáng', hi: 'ज़ोरदार हुक', fr: 'Crochet massue', th: 'ฮุกเต็มแรง', ar: 'الخطّاف القاضي' },
    stance: { armL: [-1.3, 0.2, 0], foreL: [-2.1, 0, 0], armR: [-1.2, -0.2, 0], foreR: [-2.2, 0, 0], legL: [-0.3, 0, 0], kneeL: [0.4, 0, 0], legR: [0.25, 0, 0], kneeR: [0.35, 0, 0], spine: [0.25, 0, 0], head: [0.15, 0, 0] }, bounce: 0.035,
  },
  grappler: {
    icon: '🤼',
    name: { en: 'Grappler', ko: '레슬러', ja: 'レスラー', zh: '摔跤手', es: 'Luchador de agarre', id: 'Pegulat', vi: 'Đô vật', hi: 'पहलवान', fr: 'Lutteur', th: 'นักมวยปล้ำ', ar: 'المصارع' },
    line: { en: 'Sturdy and strong up close. Its throw cannot be guarded.', ko: '튼튼하고 붙으면 강해요. 메치기는 막을 수 없어요.', ja: '頑丈で接近戦に強い。投げはガードできません。', zh: '结实，贴身很强。摔技无法防御。', es: 'Robusto y fuerte de cerca. Su proyección no se puede cubrir.', id: 'Kokoh dan kuat dari dekat. Bantingannya tak bisa ditahan.', vi: 'Lì đòn, mạnh khi áp sát. Cú quật không thể đỡ.', hi: 'मज़बूत, पास से दमदार। इसका पटका रोका नहीं जा सकता।', fr: 'Solide et fort au corps à corps. Sa projection ne se pare pas.', th: 'แกร่งและแรงเมื่อประชิด ท่าทุ่มป้องกันไม่ได้', ar: 'متين وقوي عن قرب. رميته لا تُصدّ.' },
    sig: { en: 'Big throw', ko: '메치기', ja: '大投げ', zh: '大摔', es: 'Gran proyección', id: 'Bantingan besar', vi: 'Quật ngã', hi: 'बड़ा पटका', fr: 'Grande projection', th: 'ทุ่มใหญ่', ar: 'الرمية الكبرى' },
    stance: { armL: [-1.1, -0.6, 0], foreL: [-0.7, 0, 0], armR: [-1.1, 0.6, 0], foreR: [-0.7, 0, 0], legL: [-0.4, 0, 0], kneeL: [0.6, 0, 0], legR: [0.3, 0, 0], kneeR: [0.6, 0, 0], spine: [0.35, 0, 0] },
  },
  mystic: {
    icon: '🔮',
    name: { en: 'Mystic', ko: '기공사', ja: '気功師', zh: '气功师', es: 'Místico', id: 'Ahli tenaga dalam', vi: 'Khí công sư', hi: 'साधक', fr: 'Mystique', th: 'จอมพลังลมปราณ', ar: 'صاحب الطاقة' },
    line: { en: 'Fights from far away: throws a ball of light across the ring.', ko: '멀리서 싸워요. 링 건너편까지 빛 덩어리를 날려요.', ja: '遠くから戦います。光の玉をリングの向こうまで飛ばします。', zh: '远距离作战：把光球打到擂台另一头。', es: 'Pelea de lejos: lanza una bola de luz por el ring.', id: 'Bertarung dari jauh: melempar bola cahaya ke seberang ring.', vi: 'Đánh từ xa: phóng quả cầu ánh sáng ngang võ đài.', hi: 'दूर से लड़ता है: रिंग के पार रोशनी का गोला फेंकता है।', fr: 'Combat de loin : lance une boule de lumière à travers le ring.', th: 'สู้จากระยะไกล ปล่อยลูกแสงข้ามเวที', ar: 'يقاتل من بعيد: يرمي كرة ضوء عبر الحلبة.' },
    sig: { en: 'Light ball', ko: '빛 덩어리', ja: '光弾', zh: '光弹', es: 'Bola de luz', id: 'Bola cahaya', vi: 'Cầu ánh sáng', hi: 'रोशनी का गोला', fr: 'Boule de lumière', th: 'ลูกแสง', ar: 'كرة الضوء' },
    stance: { armL: [-1.4, 0, 0], foreL: [-0.3, 0, 0], armR: [-0.1, 0, 0], foreR: [-1.5, 0, 0], legL: [-0.35, 0, 0], kneeL: [0.45, 0, 0], legR: [0.3, 0, 0], kneeR: [0.4, 0, 0], spine: [0.05, 0, 0] },
  },
  dancer: {
    icon: '💃',
    name: { en: 'Dancer', ko: '춤꾼', ja: 'ダンサー', zh: '舞者', es: 'Bailarín', id: 'Penari', vi: 'Vũ công', hi: 'नर्तक', fr: 'Danseur', th: 'นักเต้น', ar: 'الراقص' },
    line: { en: 'Light on its feet. Spins across the floor with legs flying.', ko: '몸이 가벼워요. 다리를 휘돌리며 바닥을 쓸고 지나가요.', ja: '身軽。足を振り回しながら床を回って進みます。', zh: '身手轻盈。双腿飞旋着扫过地面。', es: 'Pies ligeros. Cruza el suelo girando con las piernas al aire.', id: 'Lincah. Berputar melintasi lantai dengan kaki melayang.', vi: 'Nhẹ nhàng. Xoay tròn trên sàn với đôi chân tung bay.', hi: 'फुर्तीला। टाँगें घुमाते हुए फ़र्श पार करता है।', fr: 'Léger sur ses pieds. Traverse le sol en tournant, jambes en l\'air.', th: 'ตัวเบา หมุนตัวกวาดขาไปทั่วพื้น', ar: 'خفيف القدمين. يدور على الأرض وساقاه تطيران.' },
    sig: { en: 'Floor spin', ko: '바닥 회전', ja: 'フロアスピン', zh: '地板旋转', es: 'Giro de suelo', id: 'Putaran lantai', vi: 'Xoay sàn', hi: 'फ़र्श चक्कर', fr: 'Vrille au sol', th: 'หมุนพื้น', ar: 'دوران الأرض' },
    stance: { armL: [-0.4, -0.7, 0], foreL: [-0.8, 0, 0], armR: [-0.4, 0.7, 0], foreR: [-0.8, 0, 0], legL: [-0.3, 0, 0], kneeL: [0.45, 0, 0], legR: [0.25, 0, 0], kneeR: [0.4, 0, 0], spine: [0.1, 0, 0] }, sway: 0.25, bounce: 0.04,
  },
};
const BTN = { lp: '👊ʟ', rp: '👊ʀ', lk: '🦶ʟ', rk: '🦶ʀ' };

const RIVAL = [
  { name: { en: 'Dalgona Kid', ko: '달고나 키드', ja: 'ダルゴナ・キッド', zh: '椪糖小子' }, style: 'brawler', look: { model: 'hoodie-orange', pants: 'denim', hair: 'caramel', skin: 'fair', hairStyle: 'bowl' }, sky: ['#2a1f4d', '#c9587a'] },
  { name: { en: 'Night-shift Mina', ko: '야간조 미나', ja: '夜勤のミナ', zh: '夜班米娜' }, style: 'ninja', look: { model: 'track-blue', pants: 'navy', hair: 'black', skin: 'light', hairStyle: 'pony' }, sky: ['#0d1233', '#3c4fa8'] },
  { name: { en: 'Busker Joon', ko: '버스커 준', ja: 'バスカー・ジュン', zh: '街头艺人俊' }, style: 'dancer', look: { model: 'jacket-black', pants: 'black', hair: 'ash', skin: 'warm', hairStyle: 'wolf' }, sky: ['#170d2e', '#7a3fb0'] },
  { name: { en: 'Auntie Kimchi', ko: '김치 이모', ja: 'キムチおばさん', zh: '泡菜阿姨' }, style: 'grappler', look: { model: 'cardigan-brown', pants: 'cocoa', hair: 'espresso', skin: 'fair', hairStyle: 'curly' }, sky: ['#101a2a', '#1f7a6a'] },
  { name: { en: 'Master Baekho', ko: '백호 관장', ja: '白虎館長', zh: '白虎馆长' }, style: 'kicker', look: { model: 'hanbok-durumagi-white', pants: 'cream', hair: 'ash', skin: 'tan', hairStyle: 'manbun' }, sky: ['#0a0a14', '#a8322e'] },
];

// The ring's build (× the street's): about three heads tall instead of two.
const BUILD = globalThis.__brawlBuild || { head: 0.75, torso: 1.08, arm: 1.3, leg: 1.4, lift: 0.1 };
const STAGE_Y = -80; // under the room, out of its sight
const FOV = 38;

const CSS = `
html.brawl-on #hud > *, html.brawl-on #labels, html.brawl-on .credit { visibility: hidden !important; }
#brawl { position: fixed; inset: 0; z-index: 60; pointer-events: none; font: 700 15px system-ui, sans-serif; color: #fff; user-select: none; -webkit-user-select: none; touch-action: none; }
#brawl * { box-sizing: border-box; }
.bw-top { position: absolute; top: max(8px, env(safe-area-inset-top)); left: 0; right: 0; display: grid; grid-template-columns: 1fr 58px 1fr; gap: 8px; padding: 0 max(54px, env(safe-area-inset-right)) 0 max(10px, env(safe-area-inset-left)); align-items: start; }
.bw-side { min-width: 0; }
.bw-bar { height: 18px; border-radius: 6px; background: rgba(10,10,20,.72); border: 2px solid #fff; overflow: hidden; position: relative; }
.bw-bar i { position: absolute; top: 0; bottom: 0; left: 0; width: 100%; transform-origin: left; }
.bw-side.r .bw-bar i { transform-origin: right; }
.bw-bar .ghost { background: #fff; transition: transform .5s .25s; }
.bw-bar .hp { background: linear-gradient(#ffe46b, #ff9a2e); }
.bw-side.rage .hp { background: linear-gradient(#ff8a7a, #e0242e); animation: bw-pulse .5s infinite alternate; }
@keyframes bw-pulse { to { filter: brightness(1.5); } }
.bw-name { display: flex; gap: 6px; align-items: center; margin-top: 3px; font-size: 13px; text-shadow: 0 1px 3px #000; white-space: nowrap; overflow: hidden; }
.bw-side.r .bw-name { flex-direction: row-reverse; }
.bw-name span { overflow: hidden; text-overflow: ellipsis; }
.bw-pip { flex: none; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #fff; background: rgba(0,0,0,.4); }
.bw-pip.on { background: #ffd23c; }
.bw-time { text-align: center; font: 900 28px system-ui, sans-serif; text-shadow: 0 2px 4px #000; line-height: 1; padding-top: 0; }
.bw-msg { position: absolute; left: 0; right: 0; top: 30%; text-align: center; font: 900 clamp(38px, 11vw, 92px) system-ui, sans-serif; font-style: italic; letter-spacing: 1px; color: #ffd23c; -webkit-text-stroke: 2px #2a1030; text-shadow: 0 5px 0 #2a1030, 0 0 24px rgba(255,120,60,.8); opacity: 0; }
.bw-msg.show { animation: bw-in .28s cubic-bezier(.2,1.6,.4,1) forwards; }
@keyframes bw-in { from { opacity: 0; transform: scale(2.2); } to { opacity: 1; transform: scale(1); } }
.bw-sub { position: absolute; left: 0; right: 0; top: calc(30% + clamp(46px, 13vw, 104px)); text-align: center; font: 800 clamp(16px, 4.2vw, 26px) system-ui, sans-serif; text-shadow: 0 2px 4px #000; }
.bw-combo { position: absolute; left: max(12px, env(safe-area-inset-left)); top: 22%; font: 900 clamp(20px, 6vw, 40px) system-ui, sans-serif; font-style: italic; color: #7df0ff; -webkit-text-stroke: 1px #0a2030; text-shadow: 0 3px 0 #0a2030; opacity: 0; transition: opacity .3s; }
.bw-combo.r { left: auto; right: max(12px, env(safe-area-inset-right)); color: #ff9aa8; }
.bw-combo.show { opacity: 1; transition: none; }
.bw-x { position: absolute; top: max(8px, env(safe-area-inset-top)); right: max(8px, env(safe-area-inset-right)); width: 38px; height: 38px; border-radius: 50%; border: 0; background: rgba(10,10,20,.7); color: #fff; font: 700 18px system-ui; pointer-events: auto; cursor: pointer; }
.bw-keys { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font-size: 13px; font-weight: 600; opacity: .85; text-shadow: 0 1px 3px #000; }
.bw-pad { position: absolute; left: 0; right: 0; bottom: 0; height: min(46%, 300px); pointer-events: auto; }
.bw-stick { position: absolute; left: 0; top: 0; bottom: 0; width: 50%; }
.bw-ring { position: absolute; width: 120px; height: 120px; margin: -60px; border-radius: 50%; border: 3px solid rgba(255,255,255,.55); background: rgba(10,10,20,.3); left: calc(28px + 60px + env(safe-area-inset-left)); bottom: calc(26px + 60px + env(safe-area-inset-bottom)); }
.bw-knob { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px; border-radius: 50%; background: rgba(255,255,255,.85); }
.bw-btns { position: absolute; right: calc(14px + env(safe-area-inset-right)); bottom: calc(18px + env(safe-area-inset-bottom)); display: grid; grid-template-columns: 68px 68px; gap: 10px; }
.bw-btns button { width: 68px; height: 68px; border-radius: 50%; border: 3px solid #fff; color: #fff; font: 800 22px system-ui; line-height: 1; padding: 0; touch-action: none; }
.bw-btns button small { display: block; font-size: 11px; margin-top: 2px; }
.bw-btns button.on { filter: brightness(1.6); transform: scale(.93); }
.bw-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92vw, 430px); max-height: 88vh; overflow: auto; background: rgba(18,14,34,.93); border: 2px solid #ffd23c; border-radius: 18px; padding: 16px 18px; pointer-events: auto; font-weight: 500; text-align: center; }
.bw-card h3 { margin: 0 0 4px; font: 900 26px system-ui; font-style: italic; color: #ffd23c; }
.bw-card p { margin: 8px 0; font-size: 14px; line-height: 1.45; }
.bw-card .dim { opacity: .8; font-size: 13px; }
.bw-card .big { font-size: 18px; font-weight: 800; }
.bw-ladder { display: flex; justify-content: center; gap: 6px; margin: 10px 0; }
.bw-ladder b { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: #2c2550; border: 2px solid #5a4f8c; font-size: 13px; }
.bw-ladder b.done { background: #ffd23c; color: #2a1030; border-color: #fff; }
.bw-ladder b.now { border-color: #ff5a6e; box-shadow: 0 0 10px #ff5a6e; }
.bw-styles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 8px 0; }
.bw-styles button { padding: 8px 1px; font-size: 12px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; border: 2px solid transparent; line-height: 1.2; }
.bw-styles button b { display: block; font-size: 22px; }
.bw-styles button.sel { border-color: #ffd23c; background: #4a3f86; }
.bw-stat { display: grid; grid-template-columns: 26px 1fr; gap: 6px; align-items: center; margin: 3px auto; max-width: 240px; font-size: 14px; }
.bw-stat i { height: 8px; border-radius: 4px; background: #2c2550; overflow: hidden; display: block; }
.bw-stat i u { display: block; height: 100%; background: #ffd23c; }
.bw-card .seq { font-size: 13px; margin: 4px 0; }
.bw-style { font-size: 11px; opacity: .9; margin-top: 1px; text-shadow: 0 1px 3px #000; white-space: nowrap; }
.bw-side.r .bw-style { text-align: right; }
.bw-dash { position: absolute; right: calc(170px + env(safe-area-inset-right)); bottom: calc(40px + env(safe-area-inset-bottom)); width: 56px; height: 56px; border-radius: 50%; border: 3px solid #fff; background: #6a5acd; color: #fff; font: 800 20px system-ui; padding: 0; touch-action: none; }
.bw-dash.on { filter: brightness(1.6); }
.bw-card .row { display: flex; gap: 10px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.bw-card button { border: 0; border-radius: 12px; padding: 12px 18px; font: 800 16px system-ui; cursor: pointer; background: #3a3260; color: #fff; }
.bw-card button.go { background: linear-gradient(#ffd23c, #ff8a2e); color: #2a1030; }
`;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const lerp = (a, b, k) => a + (b - a) * k;

// ── Poses ────────────────────────────────────────────────────────────────
// Bone offsets over the standing clip (core/model-pack.js): arm -x forward
// and up, fore -x bends the elbow, leg -x forward, knee +x bends.
const BONES = ['armL', 'armR', 'foreL', 'foreR', 'spine', 'head', 'legL', 'legR', 'kneeL', 'kneeR'];
const P = (o) => { const p = {}; for (const b of BONES) p[b] = o[b] || [0, 0, 0]; return p; };
const STANCE = P({ armL: [-0.95, 0, 0], foreL: [-1.5, 0, 0], armR: [-0.7, 0, 0], foreR: [-1.75, 0, 0], legL: [-0.32, 0, 0], kneeL: [0.42, 0, 0], legR: [0.26, 0, 0], kneeR: [0.3, 0, 0], spine: [0.12, 0, 0] });
const GUARD = P({ armL: [-1.5, 0.45, 0], foreL: [-2.0, 0, 0], armR: [-1.5, -0.45, 0], foreR: [-2.0, 0, 0], legL: [-0.2, 0, 0], kneeL: [0.5, 0, 0], legR: [0.3, 0, 0], kneeR: [0.5, 0, 0], spine: [0.28, 0, 0], head: [0.2, 0, 0] });
const HURT = P({ armL: [-0.3, -0.9, 0], armR: [-0.3, 0.9, 0], foreL: [-0.5, 0, 0], foreR: [-0.5, 0, 0], spine: [-0.5, 0, 0], head: [-0.45, 0, 0], legL: [-0.15, 0, 0], legR: [0.3, 0, 0], kneeL: [0.3, 0, 0], kneeR: [0.5, 0, 0] });
const LOOSE = P({ armL: [-1.2, -0.9, 0], armR: [-1.2, 0.9, 0], foreL: [-0.3, 0, 0], foreR: [-0.3, 0, 0], legL: [-0.7, 0, 0], legR: [-0.4, 0, 0], kneeL: [0.6, 0, 0], kneeR: [0.9, 0, 0], spine: [-0.2, 0, 0], head: [-0.3, 0, 0] });
const WIND = { // drawing back before the hit
  lp: P({ ...STANCE, armL: [-0.5, 0, 0], foreL: [-2.0, 0, 0] }),
  rp: P({ ...STANCE, armR: [-0.2, 0, 0], foreR: [-2.1, 0, 0], spine: [0.1, -0.35, 0] }),
  lk: P({ ...STANCE, legL: [-0.9, 0, 0], kneeL: [1.6, 0, 0] }),
  rk: P({ ...STANCE, legR: [-0.8, 0, 0], kneeR: [1.7, 0, 0], spine: [0.05, -0.5, 0] }),
  upper: P({ ...STANCE, armR: [0.2, 0, 0], foreR: [-1.6, 0, 0], legL: [-0.6, 0, 0], kneeL: [1.0, 0, 0], legR: [-0.1, 0, 0], kneeR: [0.9, 0, 0], spine: [0.45, 0, 0] }),
  palm: P({ ...STANCE, armL: [0.1, 0, 0], foreL: [-2.0, 0, 0], armR: [0.1, 0, 0], foreR: [-2.0, 0, 0], spine: [0.3, 0, 0] }),
  fly: P({ ...STANCE, legL: [-0.5, 0, 0], kneeL: [1.2, 0, 0], legR: [-0.3, 0, 0], kneeR: [1.2, 0, 0], spine: [0.35, 0, 0] }),
};
const HIT = { // the limb all the way out
  lp: P({ ...STANCE, armL: [-1.6, 0, 0], foreL: [0, 0, 0], spine: [0.15, -0.3, 0] }),
  rp: P({ ...STANCE, armR: [-1.6, 0, 0], foreR: [0, 0, 0], armL: [-0.6, 0, 0], spine: [0.2, 0.45, 0] }),
  lk: P({ ...STANCE, legL: [-1.45, 0, 0], kneeL: [0.05, 0, 0], spine: [-0.25, 0, 0] }),
  rk: P({ ...STANCE, legR: [-1.75, 0, 0], kneeR: [0, 0, 0], legL: [0.1, 0, 0], kneeL: [0.15, 0, 0], spine: [-0.4, 0.5, 0], armL: [-0.4, -0.8, 0], armR: [-0.2, 0.9, 0] }),
  upper: P({ ...STANCE, armR: [-2.75, 0, 0], foreR: [-0.5, 0, 0], legL: [-0.1, 0, 0], kneeL: [0.1, 0, 0], legR: [0.2, 0, 0], kneeR: [0.1, 0, 0], spine: [-0.25, 0.3, 0], head: [-0.3, 0, 0] }),
  palm: P({ ...STANCE, armL: [-1.55, 0.2, 0], foreL: [0, 0, 0], armR: [-1.55, -0.2, 0], foreR: [0, 0, 0], spine: [0.4, 0, 0], legL: [-0.6, 0, 0], kneeL: [0.7, 0, 0], legR: [0.5, 0, 0] }),
  fly: P({ ...STANCE, legR: [-1.6, 0, 0], kneeR: [0, 0, 0], legL: [-0.6, 0, 0], kneeL: [1.7, 0, 0], spine: [-0.3, 0, 0], armL: [-0.5, -0.9, 0], armR: [-0.5, 0.9, 0] }),
};
// The rival's pose is the player's in a mirror, so the limb on the camera's
// side is the one that swings for both.
const PAIRS = [['armL', 'armR'], ['foreL', 'foreR'], ['legL', 'legR'], ['kneeL', 'kneeR']];
function mirror(p) {
  for (const [l, r] of PAIRS) { const t = p[l]; p[l] = p[r]; p[r] = t; }
  for (const n of BONES) { p[n][1] = -p[n][1]; p[n][2] = -p[n][2]; }
}
WIND.charge = P({ ...STANCE, armL: [-0.9, 0.5, 0], foreL: [-2.0, 0, 0], armR: [-0.3, 0, 0], foreR: [-1.6, 0, 0], legL: [-0.6, 0, 0], kneeL: [1.0, 0, 0], legR: [0.2, 0, 0], kneeR: [0.9, 0, 0], spine: [0.5, 0, 0] });
HIT.charge = P({ ...STANCE, armL: [-1.2, 0.6, 0], foreL: [-2.1, 0, 0], armR: [0.3, 0, 0], foreR: [-1.0, 0, 0], legL: [-0.8, 0, 0], kneeL: [0.8, 0, 0], legR: [0.6, 0, 0], kneeR: [0.2, 0, 0], spine: [0.65, -0.4, 0], head: [-0.3, 0, 0] });
WIND.hook = P({ ...STANCE, armR: [-0.7, 1.1, 0], foreR: [-1.3, 0, 0], spine: [0.15, -0.6, 0] });
HIT.hook = P({ ...STANCE, armR: [-1.5, -0.7, 0], foreR: [-1.3, 0, 0], armL: [-0.7, 0, 0], spine: [0.25, 0.8, 0], legR: [0.4, 0, 0] });
WIND.grab = P({ ...STANCE, armL: [-1.3, -1.0, 0], foreL: [-0.3, 0, 0], armR: [-1.3, 1.0, 0], foreR: [-0.3, 0, 0], spine: [0.25, 0, 0] });
HIT.grab = P({ ...STANCE, armL: [-1.5, 0.35, 0], foreL: [-0.9, 0, 0], armR: [-1.5, -0.35, 0], foreR: [-0.9, 0, 0], spine: [0.55, 0, 0], legL: [-0.6, 0, 0], kneeL: [0.8, 0, 0] });
WIND.mill = P({ ...STANCE, armL: [-1.6, 0, 0], foreL: [-0.2, 0, 0], armR: [-1.6, 0, 0], foreR: [-0.2, 0, 0], legL: [-0.8, 0, 0], kneeL: [1.3, 0, 0], legR: [-0.4, 0, 0], kneeR: [1.2, 0, 0], spine: [0.7, 0, 0] });
HIT.mill = P({ armL: [-2.7, -0.3, 0], armR: [-2.7, 0.3, 0], foreL: [-0.2, 0, 0], foreR: [-0.2, 0, 0], legL: [-1.3, 0, 0], legR: [0.9, 0, 0], kneeL: [0.1, 0, 0], kneeR: [0.2, 0, 0], spine: [0.3, 0, 0], head: [-0.4, 0, 0] });
const DASH = P({ ...STANCE, armL: [0.5, 0, 0], foreL: [-1.0, 0, 0], armR: [0.6, 0, 0], foreR: [-1.0, 0, 0], legL: [-0.9, 0, 0], kneeL: [0.9, 0, 0], legR: [0.7, 0, 0], kneeR: [0.5, 0, 0], spine: [0.5, 0, 0] });
const STANCES = {};
for (const id of STYLE_IDS) STANCES[id] = STYLE[id].stance ? P({ ...STYLE[id].stance }) : STANCE;
const mix = (out, a, b, k) => { for (const n of BONES) for (let i = 0; i < 3; i++) out[n][i] = lerp(a[n][i], b[n][i], k); return out; };

// f: the fighter (core/brawl.js). Fills `out` with the bone offsets and
// returns { pitch (lying back), lift (off the floor), yaw (a body turn) }.
function poseOf(f, time, out, body) {
  const look = STYLE[f.style] || STYLE.brawler, S = STANCES[f.style] || STANCE;
  body.pitch = 0; body.lift = f.y; body.yaw = 0; body.hide = false;
  const bob = Math.sin(time * 5 + f.side * 2) * 0.05;
  if (f.st === 'atk') {
    const m = f.mv[f.move], t = f.t, key = m.pose || f.move;
    if (t <= m.startup) {
      const u = t / m.startup;
      if (u < 0.55) mix(out, S, WIND[key], smooth(u / 0.55));
      else mix(out, WIND[key], HIT[key], ((u - 0.55) / 0.45) ** 2);
    } else if (t <= m.startup + m.active) mix(out, HIT[key], HIT[key], 0);
    else mix(out, HIT[key], S, smooth((t - m.startup - m.active) / m.recover));
    const whole = Math.min(1, t / (m.startup + m.active));
    const out01 = Math.max(0, Math.min(1, (t - m.startup) / m.active));
    if (key === 'rk' && !m.spin) body.yaw = 0.2 * Math.sin(Math.min(1, t / moveTicks(m)) * Math.PI);
    if (m.spin) body.yaw = m.spin * Math.PI * 2 * smooth(out01);
    if (m.blink) body.hide = t >= m.startup - 7 && t < m.startup - 1; // gone for a moment
    if (key === 'mill') { const k = Math.sin(Math.min(1, t / (m.startup + m.active + 10)) * Math.PI); body.pitch = 1.25 * k; body.lift += 0.34 * k; }
    if (key === 'charge') body.pitch = 0.25 * Math.sin(whole * Math.PI * 0.5) * (t > m.startup + m.active ? 1 - smooth((t - m.startup - m.active) / 12) : 1);
    if (f.move === 'upper') body.lift += 0.16 * Math.sin(smooth((t - m.startup * 0.6) / (m.active + m.recover * 0.5)) * Math.PI);
    if (f.move === 'fly' && !m.pose) body.pitch = -0.35 * Math.sin(whole * Math.PI * 0.5) * (t > m.startup + m.active ? 1 - smooth((t - m.startup - m.active) / 14) : 1);
  } else if (f.st === 'dash') {
    mix(out, S, DASH, Math.sin(Math.min(1, f.t / 9) * Math.PI));
    if (f.dashDir < 0) { out.spine[0] = -0.2; }
    body.lift += 0.05;
  } else if (f.st === 'hit') {
    mix(out, S, HURT, Math.min(1, f.stun / 8) * Math.min(1, f.t / 2));
  } else if (f.st === 'block') {
    mix(out, GUARD, GUARD, 0); out.spine[0] += Math.min(1, f.stun / 6) * 0.12;
  } else if (f.st === 'air') {
    mix(out, HURT, LOOSE, Math.min(1, f.t / 8));
    body.pitch = -Math.min(1.35, f.t * 0.11);
    body.lift += 0.15 * Math.min(1, f.t / 6);
  } else if (f.st === 'down' || f.st === 'ko') {
    mix(out, LOOSE, LOOSE, 0);
    body.pitch = -1.45; body.lift = 0.14;
  } else if (f.st === 'getup') {
    const u = smooth(f.t / 16);
    mix(out, LOOSE, S, u);
    body.pitch = -1.45 * (1 - u); body.lift = 0.14 * (1 - u);
  } else {
    mix(out, S, GUARD, f.guard ? 1 : 0);
    out.armL[0] += bob; out.armR[0] -= bob; out.spine[0] += bob * 0.4;
    if (look.sway) { out.spine[1] += Math.sin(time * 3.2) * look.sway; out.spine[2] += Math.cos(time * 3.2) * look.sway * 0.4; }
    if (look.bounce) body.lift += Math.abs(Math.sin(time * 7 + f.side)) * look.bounce;
    const stepping = f.st === 'step';
    if (f.walk || stepping) { // a shuffle
      const s = Math.sin(time * 16) * (stepping ? 0.5 : 0.38);
      out.legL[0] += s; out.legR[0] -= s; out.kneeL[0] += Math.max(0, s) * 0.6; out.kneeR[0] += Math.max(0, -s) * 0.6;
    }
    if (stepping) body.lift += 0.06 * Math.sin((f.t / 13) * Math.PI);
  }
  return body;
}

// ── The stage ────────────────────────────────────────────────────────────
function skyTexture([top, glow]) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, top); grad.addColorStop(0.55, top); grad.addColorStop(0.8, glow); grad.addColorStop(1, '#05050a');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.fillStyle = '#fff';
  for (let i = 0; i < 120; i++) { g.globalAlpha = 0.3 + rnd() * 0.6; g.fillRect(rnd() * 1024, rnd() * 250, 2, 2); }
  g.globalAlpha = 1;
  g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(770, 110, 34, 0, Math.PI * 2); g.fill();
  // Far towers with lit windows, all the way round.
  for (let layer = 0; layer < 2; layer++) {
    let x = 0;
    while (x < 1024) {
      const w = 26 + rnd() * 46, h = (layer ? 60 : 110) + rnd() * (layer ? 90 : 120), y = 430 - h + layer * 20;
      g.fillStyle = layer ? '#0b0b18' : '#191a33';
      g.fillRect(x, y, w, 512 - y);
      for (let wy = y + 6; wy < 420; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 8) {
        if (rnd() < 0.3) { g.fillStyle = ['#ffd98a', '#9fd8ff', '#ffb0c8'][Math.floor(rnd() * 3)]; g.globalAlpha = 0.5 + rnd() * 0.5; g.fillRect(wx, wy, 4, 5); g.globalAlpha = 1; }
      }
      x += w + rnd() * 6;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function floorTexture() {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#2b2740'; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#37324f'; g.lineWidth = 2;
  for (let i = 0; i <= S; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
  g.fillStyle = '#3a3463'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffd23c'; g.lineWidth = 10; g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#ff5a6e'; g.lineWidth = 5; g.beginPath(); g.arc(S / 2, S / 2, S * 0.2, 0, Math.PI * 2); g.stroke();
  // An eight-point star in the middle.
  g.fillStyle = '#ff5a6e';
  g.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = S * (i % 2 ? 0.07 : 0.16); g[i ? 'lineTo' : 'moveTo'](S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); }
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function sparkTexture() {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.fillStyle = '#fff';
  g.beginPath();
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, r = i % 2 ? 16 : 58 - (i % 4) * 8; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  g.fill();
  return new THREE.CanvasTexture(c);
}
function buildStage(sky) {
  const g = new THREE.Group();
  g.position.y = STAGE_Y;
  const own = []; // to free
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); own.push(geo, mat); if (mat.map) own.push(mat.map); g.add(m); return m; };
  const dome = add(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ map: skyTexture(sky), side: THREE.BackSide, depthWrite: false }));
  dome.position.y = 6;
  const roof = add(new THREE.CircleGeometry(RING_R / 0.47 / 2, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: floorTexture() }));
  roof.position.y = 0;
  const slab = add(new THREE.CylinderGeometry(9.4, 9.4, 3, 40), new THREE.MeshLambertMaterial({ color: '#1b1830' }));
  slab.position.y = -1.52;
  // Neon posts round the ring, and a low glowing rail between them.
  // (Low: the camera looks in over them from outside the ring.)
  const N = 10, posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), new THREE.MeshLambertMaterial({ color: '#2a2540' }), N);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd9a0' }), N);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, r = RING_R + 0.9;
    posts.setMatrixAt(i, mtx.makeTranslation(Math.cos(a) * r, 0.22, Math.sin(a) * r));
    lamps.setMatrixAt(i, mtx.makeTranslation(Math.cos(a) * r, 0.5, Math.sin(a) * r));
    lamps.setColorAt(i, new THREE.Color(['#ff5a6e', '#ffd23c', '#7df0ff'][i % 3]));
  }
  own.push(posts.geometry, posts.material, lamps.geometry, lamps.material);
  g.add(posts, lamps);
  const rail = add(new THREE.TorusGeometry(RING_R + 0.9, 0.03, 6, 60).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff5a6e' }));
  rail.position.y = 0.3;
  // Hit sparks.
  const sparkMap = sparkTexture();
  own.push(sparkMap);
  const sparks = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.SpriteMaterial({ map: sparkMap, transparent: true, depthTest: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(mat);
    sp.visible = false; sp.renderOrder = 20;
    own.push(mat);
    g.add(sp);
    sparks.push({ sp, t: 1 });
  }
  const shots = [0, 1].map((i) => {
    const mat = new THREE.SpriteMaterial({ map: sparkMap, color: i ? '#ff9aa8' : '#7df0ff', transparent: true, depthTest: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(mat);
    sp.visible = false; sp.renderOrder = 21;
    own.push(mat);
    g.add(sp);
    return sp;
  });
  return { g, sparks, shots, dispose() { g.removeFromParent(); posts.dispose(); lamps.dispose(); for (const o of own) o.dispose(); } };
}

// ── The game ─────────────────────────────────────────────────────────────
export function createBrawl(game) {
  const store = localStorage;
  let on = null; // the stage, the two characters, the screen… while open
  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  if (!document.getElementById('brawl-css')) { const st = el('style'); st.id = 'brawl-css'; st.textContent = CSS; document.head.append(st); }

  // ── Input ──
  const held = new Set(), pressed = new Set();
  const stick = { mx: 0, mz: 0 };
  const KEYS = {
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyU: 'lp', KeyI: 'rp', KeyJ: 'lk', KeyK: 'rk', Numpad4: 'lp', Numpad5: 'rp', Numpad1: 'lk', Numpad2: 'rk',
  };
  const onKey = (e) => {
    if (!on) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const down = e.type === 'keydown';
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); if (down) close(); return; }
    if ((e.code === 'Enter' || e.code === 'Space') && on.card) { e.preventDefault(); e.stopPropagation(); if (down && !e.repeat) on.card.querySelector('.go')?.click(); return; }
    const k = KEYS[e.code];
    e.stopPropagation(); // (the game under us must not walk, chat or honk)
    if (!k) return;
    e.preventDefault();
    if (down) {
      if (!held.has(k)) {
        pressed.add(k);
        if (k === 'left' || k === 'right') tapped(k === 'right' ? 1 : -1);
      }
      held.add(k);
    } else held.delete(k);
  };
  // Twice the same way in a quarter of a second is a dash.
  let lastTap = 0, lastTapAt = 0, dashAsk = 0;
  function tapped(dir) {
    const now = performance.now();
    if (dir === lastTap && now - lastTapAt < 280) { dashAsk = dir; lastTap = 0; } else { lastTap = dir; lastTapAt = now; }
  }
  const onShift = (e) => {
    if (!on || e.key !== 'Shift' || e.repeat || e.type !== 'keydown') return;
    dashAsk = held.has('left') ? -1 : 1;
  };
  function readInput() {
    const inp = { mx: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0) || stick.mx, mz: (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0) || stick.mz };
    for (const b of ['lp', 'rp', 'lk', 'rk']) if (pressed.has(b)) inp[b] = true;
    if (dashAsk) { inp.dash = dashAsk; dashAsk = 0; }
    pressed.clear();
    return inp;
  }

  // ── The screen ──
  function buildHud() {
    const root = el('div');
    root.id = 'brawl';
    const side = (r) => {
      const s = el('div', 'bw-side' + (r ? ' r' : ''));
      const bar = el('div', 'bw-bar'), ghost = el('i', 'ghost'), hp = el('i', 'hp');
      bar.append(ghost, hp);
      const name = el('div', 'bw-name'), label = el('span');
      const pips = Array.from({ length: ROUNDS_TO_WIN }, () => el('i', 'bw-pip'));
      name.append(label, ...pips);
      const style = el('div', 'bw-style');
      s.append(bar, name, style);
      return { s, ghost, hp, label, pips, style, shown: -1 };
    };
    const a = side(0), b = side(1), time = el('div', 'bw-time', '45');
    const top = el('div', 'bw-top');
    top.append(a.s, time, b.s);
    const msg = el('div', 'bw-msg'), sub = el('div', 'bw-sub');
    const combo = [el('div', 'bw-combo'), el('div', 'bw-combo r')];
    const x = el('button', 'bw-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => close();
    root.append(top, msg, sub, ...combo, x);
    let pad = null;
    if (touch) {
      pad = el('div', 'bw-pad');
      const zone = el('div', 'bw-stick'), ring = el('div', 'bw-ring'), knob = el('div', 'bw-knob');
      ring.append(knob); zone.append(ring);
      let id = null, ox = 0, oy = 0;
      const move = (e) => {
        const dx = e.clientX - ox, dy = e.clientY - oy, d = Math.hypot(dx, dy), k = d > 44 ? 44 / d : 1;
        knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
        const was = stick.mx;
        stick.mx = Math.abs(dx) > 16 ? Math.sign(dx) : 0;
        if (stick.mx && stick.mx !== was) tapped(stick.mx);
        stick.mz = Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx) * 0.7 ? -Math.sign(dy) : 0;
      };
      zone.onpointerdown = (e) => {
        if (id != null) return;
        id = e.pointerId; zone.setPointerCapture(id);
        const r = ring.getBoundingClientRect();
        ox = r.left + r.width / 2; oy = r.top + r.height / 2;
        move(e);
      };
      zone.onpointermove = (e) => { if (e.pointerId === id) move(e); };
      zone.onpointerup = zone.onpointercancel = (e) => { if (e.pointerId !== id) return; id = null; stick.mx = stick.mz = 0; knob.style.transform = ''; };
      const btns = el('div', 'bw-btns');
      for (const [k, icon, tag, col] of [['lp', '👊', 'L', '#3f7fe0'], ['rp', '👊', 'R', '#e0483f'], ['lk', '🦶', 'L', '#2fa56a'], ['rk', '🦶', 'R', '#d9982a']]) {
        const b = el('button', null, icon);
        b.append(el('small', null, tag));
        b.style.background = col;
        b.onpointerdown = (e) => { e.preventDefault(); pressed.add(k); b.classList.add('on'); };
        b.onpointerup = b.onpointercancel = b.onpointerleave = () => b.classList.remove('on');
        btns.append(b);
      }
      const dash = el('button', 'bw-dash', '💨');
      dash.onpointerdown = (e) => { e.preventDefault(); dashAsk = stick.mx < 0 ? -1 : 1; dash.classList.add('on'); };
      dash.onpointerup = dash.onpointercancel = dash.onpointerleave = () => dash.classList.remove('on');
      pad.append(zone, btns, dash);
      root.append(pad);
    } else root.append(el('div', 'bw-keys', tt('keys')));
    root.oncontextmenu = (e) => e.preventDefault();
    document.body.append(root);
    return { root, a, b, time, msg, sub, combo, pad, comboT: [0, 0], msgT: 0 };
  }
  function say(text, sub = '', secs = 1.4) {
    const h = on.hud;
    h.msg.textContent = text; h.sub.textContent = sub;
    h.msg.classList.remove('show'); void h.msg.offsetWidth; h.msg.classList.add('show');
    h.msgT = secs;
  }
  function card(build) {
    on.card?.remove();
    const c = on.card = el('div', 'bw-card');
    build(c);
    on.hud.root.append(c);
    if (on.hud.pad) on.hud.pad.style.display = 'none';
    on.hud.root.querySelector('.bw-keys')?.style.setProperty('display', 'none');
  }
  const button = (text, cls, fn) => { const b = el('button', cls, text); b.onclick = fn; return b; };
  function ladder(c, rec, now) {
    const row = el('div', 'bw-ladder');
    for (let i = 0; i < RIVALS; i++) row.append(el('b', i < now ? 'done' : i === now ? 'now' : '', i === RIVALS - 1 ? '👑' : String(i + 1)));
    c.append(row);
  }
  const styleTag = (id) => STYLE[id].icon + ' ' + L(STYLE[id].name);
  const seqText = (seq) => seq.map((k) => BTN[k]).join(' ');
  function styleInfo(box, id) {
    const st = STYLES[id], mv = movesFor(id);
    box.replaceChildren();
    box.append(el('p', 'big', styleTag(id)), el('p', null, L(STYLE[id].line)));
    const power = (st.punch[1] + st.kick[1]) / 2;
    for (const [icon, k] of [['❤️', st.hp / 120], ['⚡', st.walk / 1.25], ['💪', (power - 0.7) / 0.5]]) {
      const row = el('div', 'bw-stat'), bar = el('i'), fill = el('u');
      fill.style.width = Math.round(Math.max(0.12, Math.min(1, k)) * 100) + '%';
      bar.append(fill); row.append(el('span', null, icon), bar);
      box.append(row);
    }
    box.append(el('p', 'seq', '⭐ ' + L(STYLE[id].sig) + ': ' + (st.slot === 'palm' ? `${BTN.lp} + ${BTN.rp}` : `${BTN.lk} + ${BTN.rk}`) + (mv[st.slot].hits ? ` ×${mv[st.slot].hits}` : '')));
    box.append(el('p', 'seq', '🔗 ' + st.combos.map(seqText).join('   ·   ')));
  }
  function menu() {
    const rec = loadBrawl(store);
    on.style = rec.style || on.style || 'brawler';
    setRival(rec.stage);
    on.match = null;
    card((c) => {
      c.append(el('h3', null, '🥊 ' + tt('title')));
      c.append(el('p', 'dim', tt('rival', { n: rec.stage + 1, max: RIVALS }) + ' · ' + L(RIVAL[rec.stage].name) + ' (' + styleTag(RIVAL[rec.stage].style) + ')'));
      ladder(c, rec, rec.stage);
      c.append(el('p', 'big', tt('pick')));
      const grid = el('div', 'bw-styles'), info = el('div');
      const pick = (id) => {
        on.style = id;
        saveStyle(store, id);
        for (const b of grid.children) b.classList.toggle('sel', b.dataset.id === id);
        styleInfo(info, id);
        showStyles();
      };
      for (const id of STYLE_IDS) {
        const b = button(L(STYLE[id].name), null, () => pick(id));
        b.dataset.id = id;
        b.prepend(el('b', null, STYLE[id].icon));
        grid.append(b);
      }
      c.append(grid, info);
      pick(on.style);
      const more = el('details');
      more.append(el('summary', 'dim', '❓'), el('p', null, tt('how')), el('p', 'dim', tt('moves')), el('p', 'dim', tt('dash')));
      if (!touch) more.append(el('p', 'dim', tt('keys')));
      c.append(more);
      if (rec.best) c.append(el('p', 'dim', tt('best', { n: rec.best }) + (rec.crowns ? ' · ' + tt('crowns', { n: rec.crowns }) : '')));
      const row = el('div', 'row');
      row.append(button('🥊 ' + tt('start', { name: L(RIVAL[rec.stage].name) }), 'go', () => begin(rec.stage)), button(tt('close'), null, () => close()));
      c.append(row);
    });
  }
  function result(stage, won) {
    const rec = afterMatch(store, stage, won), name = L(RIVAL[stage].name);
    const champ = won && stage === RIVALS - 1;
    card((c) => {
      c.append(el('h3', null, '🥊 ' + tt('title')));
      c.append(el('p', 'big', champ ? tt('champ') : won ? tt('won', { name }) : tt('lost', { name })));
      ladder(c, rec, champ ? RIVALS : rec.stage);
      if (rec.best) c.append(el('p', 'dim', tt('best', { n: rec.best }) + (rec.crowns ? ' · ' + tt('crowns', { n: rec.crowns }) : '')));
      const row = el('div', 'row');
      row.append(button('🥊 ' + (won && !champ ? tt('next') : tt('again')), 'go', () => { setRival(rec.stage); begin(rec.stage); }), button(styleTag(on.style) + ' ↺', null, () => menu()), button(tt('close'), null, () => close()));
      c.append(row);
    });
  }
  function showStyles() {
    if (!on.hud) return;
    on.hud.a.style.textContent = styleTag(on.style);
    if (on.rivalStage >= 0) on.hud.b.style.textContent = styleTag(RIVAL[on.rivalStage].style);
  }

  // ── The fighters ──
  function fighter(look, side) {
    const ch = createCharacter(look);
    const rig = ch.root.children.find((c) => c.rotation.order === 'YXZ') || ch.root;
    const f = { ch, rig, pose: P({}), body: {}, clipT: 0, live: true, side, shownX: side ? 1.1 : -1.1, shownZ: 0 };
    ch.root.position.set(f.shownX, 0, 0);
    ch.root.rotation.y = side ? -Math.PI / 2 : Math.PI / 2;
    ch.setMoves(() => (f.live ? f.pose : null));
    on.stage.g.add(ch.root);
    return f;
  }
  // In the ring only, fighters are built taller: a smaller head and longer
  // arms and legs, so a punch and a kick read from across the screen. Set
  // every frame after the clip's own pose (the model resets the head's size).
  function reshape(f) {
    const root = f.ch.root;
    if (!f.bones) {
      const get = (n) => root.getObjectByName(n);
      const b = { head: get('head'), spine: get('spine'), arms: [get('upperarml'), get('upperarmr')], legs: [get('upperlegl'), get('upperlegr')] };
      if (!b.head || !b.legs[0]) return; // (the model is still on its way)
      f.bones = b;
    }
    const b = f.bones;
    b.spine?.scale.setScalar(BUILD.torso);
    b.head.scale.multiplyScalar(BUILD.head / BUILD.torso);
    for (const a of b.arms) a?.scale.setScalar(BUILD.arm / BUILD.torso);
    for (const l of b.legs) l?.scale.setScalar(BUILD.leg);
  }
  function setRival(stage) {
    if (on.rivalStage === stage) return;
    on.rivalStage = stage;
    if (on.rival) { on.rival.ch.setMoves(null); on.rival.ch.root.removeFromParent(); }
    // The sky of this rival's round.
    const stageNow = buildStage(RIVAL[stage].sky);
    for (const f of [on.me, on.rival]) if (f) f.ch.root.removeFromParent();
    on.stage?.dispose();
    on.stage = stageNow;
    on.scene.add(stageNow.g);
    if (on.me) stageNow.g.add(on.me.ch.root); else on.me = fighter(game.look, 0);
    on.rival = fighter(RIVAL[stage].look, 1);
    on.hud.a.label.textContent = game.nickname || tt('you');
    on.hud.b.label.textContent = L(RIVAL[stage].name);
    showStyles();
  }
  function begin(stage) {
    on.card?.remove(); on.card = null;
    if (on.hud.pad) on.hud.pad.style.display = '';
    on.hud.root.querySelector('.bw-keys')?.style.removeProperty('display');
    held.clear(); pressed.clear();
    on.match = createMatch({ level: stage, style: on.style, rivalStyle: RIVAL[stage].style });
    on.stageNo = stage;
    on.acc = 0; on.freeze = 0; on.shake = 0; on.overT = 0;
    for (const s of [on.hud.a, on.hud.b]) { s.shown = -1; s.s.classList.remove('rage'); }
  }

  function spark(x, y, z, color, size) {
    const s = on.stage.sparks.reduce((a, b) => (b.t > a.t ? b : a));
    s.t = 0; s.size = size;
    s.sp.position.set(x, y, z);
    s.sp.material.color.set(color);
    s.sp.material.rotation = Math.random() * Math.PI;
    s.sp.visible = true;
  }
  function onEvents(ev) {
    const m = on.match, { sfx } = game;
    for (const e of ev) {
      if (e.k === 'round') {
        say(m.wins[0] === ROUNDS_TO_WIN - 1 && m.wins[1] === ROUNDS_TO_WIN - 1 ? 'FINAL ROUND' : 'ROUND ' + e.n, styleTag(m.a.style) + '  VS  ' + styleTag(m.b.style), 1.6);
        for (const f of [on.me, on.rival]) { f.clipT = 1.7; f.ch.play('bow'); }
        sfx.tock(0.5, 500);
      } else if (e.k === 'fight') { say('FIGHT!', '', 0.8); sfx.tock(0.9, 900); }
      else if (e.k === 'swing') sfx.tock(0.18, (e.by ? m.b : m.a).mv[e.move].level >= 3 ? 520 : 760);
      else if (e.k === 'dash') sfx.tock(0.2, 1100);
      else if (e.k === 'shot') sfx.tock(0.5, 1500);
      else if (e.k === 'blink') { spark(e.from[0], 0.7, e.from[1], '#b9a6f0', 1.2); spark(e.x, 0.7, e.z, '#b9a6f0', 1.2); sfx.tock(0.4, 1800); }
      else if (e.k === 'combo') { const c = on.hud.combo[e.by]; c.textContent = 'COMBO!'; c.classList.add('show'); on.hud.comboT[e.by] = 1.3; on.comboAt = on.time; }
      else if (e.k === 'block') { spark(e.x, e.y, e.z, '#7df0ff', 0.7); sfx.tock(0.45, 420); on.freeze = 3; }
      else if (e.k === 'hit') {
        const big = e.dmg >= 14 || e.launch || e.ko || e.fin;
        spark(e.x, e.y, e.z, e.armor ? '#9fb4c8' : e.counter ? '#ff6a5a' : '#ffe9a0', big ? 1.5 : 1);
        sfx.tock(big ? 1 : 0.7, big ? 170 : 250);
        on.freeze = e.ko ? 16 : big ? 7 : 4;
        on.shake = Math.max(on.shake, big ? 0.14 : 0.06);
        const c = on.hud.combo[e.by];
        if ((e.combo >= 2 || e.counter) && !(e.fin && on.comboAt === on.time)) {
          c.textContent = e.combo >= 2 ? tt('hits', { n: e.combo }) : 'COUNTER!';
          c.classList.add('show'); on.hud.comboT[e.by] = 1.1;
        }
      } else if (e.k === 'down') { sfx.tock(0.6, 110); on.shake = Math.max(on.shake, 0.08); }
      else if (e.k === 'rage') on.hud[e.who ? 'b' : 'a'].s.classList.add('rage');
      else if (e.k === 'ko' || e.k === 'time') {
        say(e.k === 'time' ? 'TIME UP' : 'K.O.', e.perfect ? 'PERFECT!' : '', 2.4);
        sfx.tock(1, 130);
        on.cheer = e.winner == null ? null : { who: e.winner, at: 55 };
      } else if (e.k === 'over') on.overT = 0.6;
    }
  }

  const v = new THREE.Vector3(), camAt = new THREE.Vector3(), camTo = new THREE.Vector3();
  function place(f, s, dt) {
    const root = f.ch.root;
    root.position.set(s.x, 0, s.z);
    poseOf(s, on.time, f.pose, f.body);
    if (s.side) mirror(f.pose);
    if (f.clipT > 0) f.clipT -= dt;
    f.live = !(f.clipT > 0) || s.st !== 'idle'; // (bowing or cheering: the clip alone)
    f.rig.position.y = f.body.lift + BUILD.lift * Math.cos(f.body.pitch);
    f.rig.rotation.x = f.body.pitch;
    root.visible = !f.body.hide;
    // Chest a little toward the camera, like a fighting stance.
    const open = (s.st === 'down' || s.st === 'ko' || s.st === 'air') ? 0 : (s.side ? 0.4 : -0.4);
    root.rotation.y = Math.PI / 2 - s.face + open + (s.side ? 1 : -1) * f.body.yaw;
    f.ch.animate(dt, 0, false);
    reshape(f);
  }

  function frame(dt) {
    const m = on.match, h = on.hud;
    on.time += dt;
    if (m) {
      if (on.freeze > 0) on.freeze -= dt * 60;
      else {
        on.acc = Math.min(on.acc + dt, 0.1);
        while (on.acc >= TICK && on.freeze <= 0) {
          on.acc -= TICK;
          onEvents(m.step(m.phase === 'fight' ? readInput() : undefined));
          if (on.cheer && m.phase === 'ko' && m.t === on.cheer.at) {
            const w = on.cheer.who ? on.rival : on.me, s = on.cheer.who ? m.b : m.a;
            if (s.st === 'idle') { w.clipT = 1.7; w.ch.play('cheer'); }
          }
        }
      }
      place(on.me, m.a, dt); place(on.rival, m.b, dt);
      // Balls of light in flight.
      for (const [i, f] of [m.a, m.b].entries()) {
        const sp = on.stage.shots[i];
        sp.visible = !!f.shot;
        if (f.shot) { sp.position.set(f.shot.x, 0.78, f.shot.z); sp.material.rotation += dt * 9; sp.scale.setScalar(0.75 + Math.sin(on.time * 30) * 0.08); }
      }
      // The bars, the clock, the rounds won.
      for (const [s, f] of [[h.a, m.a], [h.b, m.b]]) {
        if (s.shown !== f.hp) { s.shown = f.hp; const k = `scaleX(${f.hp / f.maxHp})`; s.hp.style.transform = k; s.ghost.style.transform = k; }
        if (!f.rage) s.s.classList.remove('rage');
        s.pips.forEach((p, i) => p.classList.toggle('on', i < m.wins[f.side]));
      }
      const left = String(Math.ceil(m.left / 60));
      if (h.time.textContent !== left) h.time.textContent = left;
      if (m.phase === 'over' && on.overT > 0 && (on.overT -= dt) <= 0) {
        const won = m.result === 0;
        if (won) game.me?.play?.('cheer');
        on.match = null;
        result(on.stageNo, won);
      }
    } else {
      // Waiting at the menu: both stand ready.
      for (const sp of on.stage.shots) sp.visible = false;
      on.idle[0].style = on.style; on.idle[1].style = RIVAL[on.rivalStage]?.style || 'brawler';
      for (const f of [on.me, on.rival]) {
        const s = on.idle[f.side];
        place(f, s, dt);
      }
    }
    for (let i = 0; i < 2; i++) if (h.comboT[i] > 0 && (h.comboT[i] -= dt) <= 0) h.combo[i].classList.remove('show');
    if (h.msgT > 0 && (h.msgT -= dt) <= 0) { h.msg.classList.remove('show'); h.sub.textContent = ''; }
    for (const s of on.stage.sparks) {
      if (!s.sp.visible) continue;
      s.t += dt / 0.22;
      if (s.t >= 1) { s.sp.visible = false; continue; }
      s.sp.scale.setScalar(s.size * (0.3 + s.t * 0.6));
      s.sp.material.opacity = 1 - s.t * s.t;
    }
  }

  function camera(dt) {
    const { camera: cam } = game;
    const a = on.match ? on.match.a : on.idle[0], b = on.match ? on.match.b : on.idle[1];
    const dx = b.x - a.x, dz = b.z - a.z, dist = Math.hypot(dx, dz) || 1;
    const ux = dx / dist, uz = dz / dist;
    const aspect = innerWidth / innerHeight;
    // Both fit across the screen; a phone held upright is narrow, so there
    // the view opens wider instead of backing far away.
    const tanH = Math.max(0.36, Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect);
    const fov = Math.max(FOV, THREE.MathUtils.radToDeg(2 * Math.atan(tanH / aspect)));
    if (Math.abs(cam.fov - fov) > 0.01 || cam.view) { cam.clearViewOffset(); cam.fov = fov; cam.updateProjectionMatrix(); }
    const half = dist / 2 + 0.95;
    const back = Math.max(3.1, half / tanH);
    const portrait = aspect < 0.9;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    camTo.set(mx, STAGE_Y + (portrait ? 0.2 : 0.72) + Math.max(a.y, b.y) * 0.3, mz);
    v.set(mx - uz * back, STAGE_Y + 1.0 + back * 0.09, mz + ux * back);
    if (!on.camSet) { camAt.copy(v); on.camSet = true; } else camAt.lerp(v, 1 - Math.exp(-dt * 7));
    cam.position.copy(camAt);
    if (on.shake > 0.001) { cam.position.x += (Math.random() - 0.5) * on.shake; cam.position.y += (Math.random() - 0.5) * on.shake; on.shake *= Math.exp(-dt * 12); }
    cam.lookAt(camTo);
  }

  function close() {
    if (!on) return;
    const o = on;
    on = null;
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('keydown', onShift, true);
    held.clear(); pressed.clear(); stick.mx = stick.mz = 0;
    for (const f of [o.me, o.rival]) { f.ch.setMoves(null); f.ch.root.removeFromParent(); }
    o.stage.dispose();
    o.hud.root.remove();
    document.documentElement.classList.remove('brawl-on');
    const cam = game.camera;
    cam.fov = o.fov; cam.updateProjectionMatrix();
  }

  return {
    get open() { return !!on; },
    get active() { return !!on; },
    close,
    show() {
      if (on || !game.interior || !game.activeScene) return;
      on = { interior: game.interior, scene: game.activeScene, fov: game.camera.fov, time: 0, acc: 0, freeze: 0, shake: 0, overT: 0, camSet: false, rivalStage: -1, style: 'brawler', comboAt: -1, stage: null, me: null, rival: null, match: null, card: null };
      on.idle = [{ side: 0, x: -1.1, z: 0, y: 0, face: 0, st: 'idle', t: 0, style: 'brawler' }, { side: 1, x: 1.1, z: 0, y: 0, face: Math.PI, st: 'idle', t: 0, style: 'brawler' }];
      on.hud = buildHud();
      document.documentElement.classList.add('brawl-on');
      addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true); addEventListener('keydown', onShift, true);
      menu();
    },
    // Each frame, after the game's own camera (game/arcade.js).
    update(dt) {
      if (!on) return;
      if (game.interior !== on.interior) { close(); return; }
      frame(dt);
      if (on) camera(dt);
    },
    // For tests: the match in play and a way to start one.
    get match() { return on?.match || null; },
    start(stage = 0) { if (on) { setRival(stage); begin(stage); } },
  };
}
