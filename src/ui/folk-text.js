// Text for the folk games (ui/yut-ui.js, tuho-ui.js, jegi-ui.js,
// neol-ui.js), in every UI language. English is the source; a missing
// language falls back to English and Traditional Chinese is made from zh
// (core/i18n.js localName). Lines the locals say are [Korean, romanization,
// meaning].
import { getLanguage, localName } from '../core/i18n.js';

export const FT = {
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', id: 'Tutup', vi: 'Đóng', hi: 'बंद करें', ar: 'إغلاق' },
  again: { en: 'Play again', ko: '한 판 더', ja: 'もう一回', zh: '再来一局', es: 'Jugar otra vez', id: 'Main lagi', vi: 'Chơi lại', hi: 'फिर से खेलें', ar: 'العب مرة أخرى' },
  start: { en: 'Start', ko: '시작', ja: 'スタート', zh: '开始', es: 'Empezar', id: 'Mulai', vi: 'Bắt đầu', hi: 'शुरू करें', ar: 'ابدأ' },
  teacher: { en: 'Grandpa Kim', ko: '김 할아버지', ja: 'キムおじいさん', zh: '金爷爷', es: 'Abuelo Kim', id: 'Kakek Kim', vi: 'Ông Kim', hi: 'दादाजी किम', ar: 'الجد كيم' },
  courtyard: { en: 'Folk games yard', ko: '전통놀이 마당', ja: '伝統遊びの広場', zh: '传统游戏广场', es: 'Patio de juegos tradicionales', id: 'Halaman permainan tradisional', vi: 'Sân trò chơi dân gian', hi: 'पारंपरिक खेलों का आँगन', ar: 'ساحة الألعاب الشعبية' },

  // 윷놀이
  'yut.open': { en: 'Play yutnori', ko: '윷놀이 하기', ja: 'ユンノリをする', zh: '玩掷柶', es: 'Jugar al yutnori', id: 'Main yutnori', vi: 'Chơi yutnori', hi: 'युतनोरी खेलें', ar: 'العب يوتنوري' },
  'yut.title': { en: 'Yutnori', ko: '윷놀이', ja: 'ユンノリ', zh: '掷柶（尤茨游戏）', es: 'Yutnori', id: 'Yutnori', vi: 'Yutnori', hi: 'युतनोरी', ar: 'يوتنوري' },
  'yut.howTo': {
    en: 'Throw four sticks. Count the flat sides up: 1 do, 2 gae, 3 geol, 4 yut, none mo (5 steps). Yut and mo give another throw. Move your pieces round the board; stop on a corner or the centre to take the short cut. Land on your own piece to stack them, land on someone else\'s to send it home (and throw again). Get all your pieces past the start to win.',
    ko: '윷가락 네 개를 던져요. 평평한 면이 1개면 도, 2개 개, 3개 걸, 4개 윷, 하나도 없으면 모(5칸)예요. 윷이나 모가 나오면 한 번 더 던져요. 말을 판 위로 옮기고, 모서리나 한가운데에 멈추면 지름길로 가요. 내 말 위에 서면 업고 가고, 남의 말 위에 서면 잡아서 집으로 보내고 한 번 더 던져요. 말을 모두 출발점 너머로 내보내면 이겨요.',
    ja: '棒を4本投げます。平らな面の数で、1つ ト、2つ ケ、3つ コル、4つ ユッ、0なら モ（5マス）。ユッとモはもう一回投げられます。駒を盤の上で進め、角か真ん中で止まると近道。自分の駒に止まると重ねて一緒に進み、相手の駒に止まると家に帰して、もう一回投げます。全部の駒を出発点の先へ出したら勝ち。',
    zh: '掷出四根木棍，数朝上的平面：1个是“刀”，2个“开”，3个“杰”，4个“尤”，一个都没有是“模”（走5格）。掷出“尤”或“模”可以再掷一次。在棋盘上移动棋子，停在角上或中心就能走近路。停在自己的棋子上可以叠在一起走，停在别人的棋子上就把它送回家，并再掷一次。所有棋子都越过起点就赢了。',
    es: 'Lanza cuatro palos y cuenta los lados planos hacia arriba: 1 do, 2 gae, 3 geol, 4 yut, ninguno mo (5 casillas). Yut y mo dan otro lanzamiento. Mueve tus fichas por el tablero; si te paras en una esquina o en el centro, tomas el atajo. Cae sobre tu ficha para apilarlas, o sobre la de otro para mandarla a casa (y lanza otra vez). Gana quien saque todas sus fichas pasando la salida.',
    id: 'Lempar empat tongkat. Hitung sisi datar yang di atas: 1 do, 2 gae, 3 geol, 4 yut, tidak ada mo (5 langkah). Yut dan mo dapat lemparan lagi. Jalankan bidakmu di papan; berhenti di sudut atau tengah untuk ambil jalan pintas. Mendarat di bidakmu sendiri untuk menumpuknya, di bidak orang lain untuk memulangkannya (dan lempar lagi). Keluarkan semua bidak melewati start untuk menang.',
    vi: 'Tung bốn que. Đếm mặt phẳng ngửa lên: 1 là do, 2 gae, 3 geol, 4 yut, không có là mo (5 bước). Yut và mo được tung thêm. Đi quân trên bàn; dừng ở góc hoặc giữa bàn để đi đường tắt. Dừng lên quân mình thì cõng đi cùng, dừng lên quân người khác thì đuổi về nhà (và tung thêm). Đưa hết quân qua điểm xuất phát là thắng.',
    hi: 'चार डंडियाँ फेंकें। ऊपर वाली चपटी तरफ़ गिनें: 1 दो, 2 गे, 3 गल, 4 युत, कोई नहीं तो मो (5 कदम)। युत और मो पर एक बार और फेंकें। अपनी गोटियाँ बोर्ड पर चलाएँ; कोने या बीच में रुकें तो छोटा रास्ता मिलता है। अपनी गोटी पर रुकें तो साथ चलेंगी, दूसरे की पर रुकें तो उसे घर भेजें (और फिर फेंकें)। सारी गोटियाँ शुरुआत से आगे निकालें और जीतें।',
    ar: 'ارمِ أربع عصيّ وعُدّ الوجوه المسطّحة للأعلى: 1 دو، 2 غيه، 3 غول، 4 يوت، ولا شيء مو (5 خطوات). يوت ومو يمنحانك رمية أخرى. حرّك قطعك على اللوحة؛ إن توقفت عند زاوية أو في الوسط تأخذ الطريق المختصر. قف على قطعتك لتتراكبا، أو على قطعة غيرك لتعيدها إلى البيت (وارمِ مجددًا). أخرج كل قطعك بعد نقطة البداية لتفوز.',
  },
  'yut.fact': {
    en: 'Families play yutnori together at Seollal, the Lunar New Year. Each throw is named after a farm animal: pig, dog, sheep, cow and horse.',
    ko: '윷놀이는 설날에 온 가족이 함께 하는 놀이예요. 도, 개, 걸, 윷, 모는 돼지, 개, 양, 소, 말을 뜻해요.',
    ja: 'ユンノリはソルラル（旧正月）に家族みんなで遊ぶゲーム。ト・ケ・コル・ユッ・モは、豚・犬・羊・牛・馬を表します。',
    zh: '掷柶是春节（설날）时全家一起玩的游戏。刀、开、杰、尤、模分别代表猪、狗、羊、牛、马。',
    es: 'Las familias juegan al yutnori en Seollal, el Año Nuevo lunar. Cada resultado lleva el nombre de un animal de granja: cerdo, perro, oveja, vaca y caballo.',
    id: 'Keluarga bermain yutnori bersama saat Seollal, Tahun Baru Imlek. Tiap lemparan dinamai hewan ternak: babi, anjing, domba, sapi, dan kuda.',
    vi: 'Các gia đình chơi yutnori cùng nhau vào Seollal, Tết âm lịch. Mỗi kết quả mang tên một con vật: lợn, chó, cừu, bò và ngựa.',
    hi: 'सल्लाल (चंद्र नववर्ष) पर परिवार मिलकर युतनोरी खेलते हैं। हर नतीजे का नाम एक जानवर पर है: सूअर, कुत्ता, भेड़, गाय और घोड़ा।',
    ar: 'تلعب العائلات اليوتنوري معًا في سولال، رأس السنة القمرية. كل رمية تحمل اسم حيوان من المزرعة: خنزير، كلب، خروف، بقرة وحصان.',
  },
  'yut.opponents': { en: 'Players', ko: '인원', ja: '人数', zh: '人数', es: 'Jugadores', id: 'Pemain', vi: 'Số người', hi: 'खिलाड़ी', ar: 'اللاعبون' },
  'yut.pieces': { en: 'Pieces each', ko: '말 개수', ja: '駒の数', zh: '每人棋子', es: 'Fichas por jugador', id: 'Bidak per orang', vi: 'Quân mỗi người', hi: 'हर एक की गोटियाँ', ar: 'القطع لكل لاعب' },
  'yut.you': { en: 'You', ko: '나', ja: 'あなた', zh: '你', es: 'Tú', id: 'Kamu', vi: 'Bạn', hi: 'आप', ar: 'أنت' },
  'yut.grandma': { en: 'Grandma', ko: '할머니', ja: 'おばあちゃん', zh: '奶奶', es: 'Abuela', id: 'Nenek', vi: 'Bà', hi: 'दादी', ar: 'الجدة' },
  'yut.throw': { en: 'Throw the sticks', ko: '윷 던지기', ja: '棒を投げる', zh: '掷木棍', es: 'Lanzar los palos', id: 'Lempar tongkat', vi: 'Tung que', hi: 'डंडियाँ फेंकें', ar: 'ارمِ العصي' },
  'yut.yourTurn': { en: 'Your turn: throw!', ko: '내 차례: 던져요!', ja: 'あなたの番：投げて！', zh: '轮到你：掷吧！', es: 'Tu turno: ¡lanza!', id: 'Giliranmu: lempar!', vi: 'Lượt bạn: tung đi!', hi: 'आपकी बारी: फेंकें!', ar: 'دورك: ارمِ!' },
  'yut.theirTurn': { en: '{name}\'s turn', ko: '{name} 차례', ja: '{name}の番', zh: '轮到{name}', es: 'Turno de {name}', id: 'Giliran {name}', vi: 'Lượt của {name}', hi: '{name} की बारी', ar: 'دور {name}' },
  'yut.pick': { en: 'Tap a piece, then where it goes', ko: '말을 누르고, 갈 곳을 눌러요', ja: '駒を押して、行き先を押してね', zh: '点一个棋子，再点要去的地方', es: 'Toca una ficha y luego adónde va', id: 'Ketuk bidak, lalu tujuannya', vi: 'Chạm vào quân, rồi chạm nơi muốn đi', hi: 'एक गोटी छुएँ, फिर जहाँ जाना है', ar: 'المس قطعة، ثم المكان الذي تذهب إليه' },
  'yut.oneMore': { en: 'One more throw!', ko: '한 번 더!', ja: 'もう一回！', zh: '再掷一次！', es: '¡Otro lanzamiento!', id: 'Lempar sekali lagi!', vi: 'Tung thêm lần nữa!', hi: 'एक बार और!', ar: 'رمية أخرى!' },
  'yut.caught': { en: 'Caught! Back home it goes, and one more throw', ko: '잡았다! 집으로 돌려보내고 한 번 더', ja: '捕まえた！家に帰して、もう一回', zh: '抓到了！送回家，再掷一次', es: '¡Atrapada! Vuelve a casa, y otro lanzamiento', id: 'Tertangkap! Pulang ke rumah, dan lempar lagi', vi: 'Bắt được! Về nhà đi, và tung thêm', hi: 'पकड़ लिया! वापस घर, और एक बार और', ar: 'أُمسكت! تعود إلى البيت، ورمية أخرى' },
  'yut.gotCaught': { en: '{name} caught your piece!', ko: '{name}에게 잡혔어요!', ja: '{name}に捕まった！', zh: '你的棋子被{name}抓了！', es: '¡{name} atrapó tu ficha!', id: '{name} menangkap bidakmu!', vi: '{name} bắt quân của bạn!', hi: '{name} ने आपकी गोटी पकड़ ली!', ar: '{name} أمسك قطعتك!' },
  'yut.stacked': { en: 'Stacked! They move together now', ko: '업었다! 이제 함께 가요', ja: 'おんぶ！一緒に進みます', zh: '叠上了！现在一起走', es: '¡Apiladas! Ahora se mueven juntas', id: 'Ditumpuk! Sekarang jalan bersama', vi: 'Cõng rồi! Giờ đi cùng nhau', hi: 'साथ हो गईं! अब एक साथ चलेंगी', ar: 'تراكبت! تتحرك معًا الآن' },
  'yut.out': { en: 'A piece made it home!', ko: '말이 났어요!', ja: '駒が上がった！', zh: '一个棋子到终点了！', es: '¡Una ficha llegó a la meta!', id: 'Satu bidak sampai!', vi: 'Một quân đã về đích!', hi: 'एक गोटी पहुँच गई!', ar: 'وصلت قطعة إلى النهاية!' },
  'yut.lost': { en: 'Back-do, but nothing on the board to move back', ko: '빽도인데 판 위에 물러날 말이 없어요', ja: 'バックトだけど、戻れる駒がない', zh: '是“后退刀”，但棋盘上没有能后退的棋子', es: 'Back-do, pero no hay fichas en el tablero para retroceder', id: 'Back-do, tapi tak ada bidak di papan untuk mundur', vi: 'Lùi do, nhưng không có quân nào trên bàn để lùi', hi: 'बैक-दो, पर पीछे जाने को बोर्ड पर कोई गोटी नहीं', ar: 'باك-دو، لكن لا قطع على اللوحة لترجع' },
  'yut.win': { en: 'You win! 🎉', ko: '이겼어요! 🎉', ja: '勝ち！🎉', zh: '你赢了！🎉', es: '¡Ganaste! 🎉', id: 'Kamu menang! 🎉', vi: 'Bạn thắng! 🎉', hi: 'आप जीत गए! 🎉', ar: 'فزت! 🎉' },
  'yut.lose': { en: '{name} wins this time', ko: '이번엔 {name} 승리', ja: '今回は{name}の勝ち', zh: '这次{name}赢了', es: 'Esta vez gana {name}', id: 'Kali ini {name} menang', vi: 'Lần này {name} thắng', hi: 'इस बार {name} जीते', ar: 'فاز {name} هذه المرة' },
  'yut.home': { en: 'Start', ko: '대기', ja: '待機', zh: '待命', es: 'Salida', id: 'Siap', vi: 'Chờ', hi: 'शुरू', ar: 'الانتظار' },
  'yut.wins': { en: 'Wins: {n}', ko: '승리: {n}번', ja: '勝利：{n}回', zh: '胜利：{n}次', es: 'Victorias: {n}', id: 'Menang: {n}', vi: 'Thắng: {n}', hi: 'जीत: {n}', ar: 'الانتصارات: {n}' },
  'yut.steps': { en: '{n} steps', ko: '{n}칸', ja: '{n}マス', zh: '{n}格', es: '{n} casillas', id: '{n} langkah', vi: '{n} bước', hi: '{n} कदम', ar: '{n} خطوات' },
  'yut.step1': { en: '1 step', ko: '1칸', ja: '1マス', zh: '1格', es: '1 casilla', id: '1 langkah', vi: '1 bước', hi: '1 कदम', ar: 'خطوة واحدة' },
  'yut.back': { en: '1 step back', ko: '1칸 뒤로', ja: '1マス戻る', zh: '后退1格', es: '1 casilla atrás', id: 'Mundur 1 langkah', vi: 'Lùi 1 bước', hi: '1 कदम पीछे', ar: 'خطوة للخلف' },
  'a.pig': { en: 'pig', ko: '돼지', ja: '豚', zh: '猪', es: 'cerdo', id: 'babi', vi: 'lợn', hi: 'सूअर', ar: 'خنزير' },
  'a.dog': { en: 'dog', ko: '개', ja: '犬', zh: '狗', es: 'perro', id: 'anjing', vi: 'chó', hi: 'कुत्ता', ar: 'كلب' },
  'a.sheep': { en: 'sheep', ko: '양', ja: '羊', zh: '羊', es: 'oveja', id: 'domba', vi: 'cừu', hi: 'भेड़', ar: 'خروف' },
  'a.cow': { en: 'cow', ko: '소', ja: '牛', zh: '牛', es: 'vaca', id: 'sapi', vi: 'bò', hi: 'गाय', ar: 'بقرة' },
  'a.horse': { en: 'horse', ko: '말', ja: '馬', zh: '马', es: 'caballo', id: 'kuda', vi: 'ngựa', hi: 'घोड़ा', ar: 'حصان' },

  // 투호
  'tuho.open': { en: 'Play tuho', ko: '투호 하기', ja: '投壺をする', zh: '玩投壶', es: 'Jugar al tuho', id: 'Main tuho', vi: 'Chơi tuho', hi: 'तूहो खेलें', ar: 'العب توهو' },
  'tuho.title': { en: 'Tuho (arrow toss)', ko: '투호', ja: '投壺（トゥホ）', zh: '投壶', es: 'Tuho (lanzar flechas)', id: 'Tuho (lempar panah)', vi: 'Tuho (ném tên vào bình)', hi: 'तूहो (तीर उछालना)', ar: 'توهو (رمي السهام)' },
  'tuho.howTo': {
    en: 'Toss 10 arrows into the jar. First tap to fix the direction while the marker swings, then tap to fix the power. The mouth scores 2, the small ears on its sides score 3.',
    ko: '화살 10개를 항아리에 던져 넣어요. 표시가 좌우로 움직일 때 눌러서 방향을 정하고, 다시 눌러서 힘을 정해요. 가운데 입은 2점, 양옆의 작은 귀는 3점이에요.',
    ja: '矢を10本、壺に投げ入れます。目印が左右に動くうちにタップで方向を決め、もう一度タップで力を決めます。真ん中の口は2点、両側の小さな耳は3点。',
    zh: '把10支箭投进壶里。标记左右摆动时点一下定方向，再点一下定力度。中间的壶口得2分，两边的小耳得3分。',
    es: 'Lanza 10 flechas al jarrón. Toca para fijar la dirección mientras el marcador oscila y vuelve a tocar para fijar la fuerza. La boca vale 2; las orejitas de los lados, 3.',
    id: 'Lempar 10 panah ke dalam guci. Ketuk untuk menetapkan arah saat penanda berayun, lalu ketuk lagi untuk kekuatan. Mulut guci bernilai 2, telinga kecil di sisinya 3.',
    vi: 'Ném 10 mũi tên vào bình. Chạm để chọn hướng khi vạch đang đung đưa, rồi chạm lần nữa để chọn lực. Miệng bình được 2 điểm, hai tai nhỏ hai bên được 3.',
    hi: 'जार में 10 तीर उछालें। निशान झूलते समय टैप करके दिशा तय करें, फिर टैप करके ज़ोर तय करें। मुँह में 2 अंक, बगल के छोटे कानों में 3।',
    ar: 'ارمِ 10 سهام في الجرّة. المس لتثبيت الاتجاه بينما يتأرجح المؤشر، ثم المس لتثبيت القوة. الفوهة بنقطتين، والأذنان الصغيرتان على الجانبين بثلاث.',
  },
  'tuho.fact': {
    en: 'Tuho was played at royal court banquets in the Joseon era. Today you will find it at palaces and folk villages during holidays.',
    ko: '투호는 조선 시대 궁중 잔치에서 즐기던 놀이예요. 지금은 명절에 고궁이나 민속마을에서 해 볼 수 있어요.',
    ja: '投壺は朝鮮時代の宮中の宴で楽しまれた遊び。今は祝日に古宮や民俗村で体験できます。',
    zh: '投壶是朝鲜时代宫廷宴会上的游戏。如今节日时可以在古宫和民俗村体验。',
    es: 'El tuho se jugaba en los banquetes de la corte en la era Joseon. Hoy se encuentra en palacios y aldeas tradicionales en las fiestas.',
    id: 'Tuho dimainkan di jamuan istana pada era Joseon. Kini bisa dicoba di istana dan desa tradisional saat hari raya.',
    vi: 'Tuho từng được chơi trong các yến tiệc cung đình thời Joseon. Ngày nay có thể chơi ở cung điện và làng dân gian vào dịp lễ.',
    hi: 'जोसॉन काल में शाही दावतों में तूहो खेला जाता था। आज त्योहारों पर महलों और लोक गाँवों में इसे आज़मा सकते हैं।',
    ar: 'كان التوهو يُلعب في ولائم البلاط الملكي في عهد جوسون. واليوم تجده في القصور والقرى الشعبية أيام الأعياد.',
  },
  'tuho.aim': { en: 'Tap to fix the direction', ko: '눌러서 방향 정하기', ja: 'タップで方向を決める', zh: '点一下定方向', es: 'Toca para fijar la dirección', id: 'Ketuk untuk arah', vi: 'Chạm để chọn hướng', hi: 'दिशा के लिए टैप करें', ar: 'المس لتثبيت الاتجاه' },
  'tuho.power': { en: 'Tap to fix the power', ko: '눌러서 힘 정하기', ja: 'タップで力を決める', zh: '点一下定力度', es: 'Toca para fijar la fuerza', id: 'Ketuk untuk kekuatan', vi: 'Chạm để chọn lực', hi: 'ज़ोर के लिए टैप करें', ar: 'المس لتثبيت القوة' },
  'tuho.tap': { en: 'Tap (Space)', ko: '누르기 (스페이스)', ja: 'タップ（スペース）', zh: '点击（空格）', es: 'Tocar (Espacio)', id: 'Ketuk (Spasi)', vi: 'Chạm (Space)', hi: 'टैप (Space)', ar: 'المس (المسافة)' },
  'tuho.mouth': { en: 'In the mouth! +2', ko: '입에 쏙! +2', ja: '口に入った！+2', zh: '进壶口了！+2', es: '¡En la boca! +2', id: 'Masuk mulut! +2', vi: 'Vào miệng bình! +2', hi: 'मुँह में! +2', ar: 'في الفوهة! +2' },
  'tuho.ear': { en: 'In an ear! +3', ko: '귀에 쏙! +3', ja: '耳に入った！+3', zh: '进壶耳了！+3', es: '¡En una oreja! +3', id: 'Masuk telinga! +3', vi: 'Vào tai bình! +3', hi: 'कान में! +3', ar: 'في الأذن! +3' },
  'tuho.rim': { en: 'Off the rim!', ko: '입구에 맞고 튕겼어요!', ja: '縁に当たって跳ねた！', zh: '碰到壶口弹出去了！', es: '¡Rebotó en el borde!', id: 'Memantul di bibir guci!', vi: 'Chạm miệng rồi bật ra!', hi: 'किनारे से उछल गया!', ar: 'ارتدّ عن الحافة!' },
  'tuho.short': { en: 'Too short: a bit more power', ko: '짧아요: 힘을 조금 더', ja: '手前：もう少し強く', zh: '太近了：再用点力', es: 'Corta: un poco más de fuerza', id: 'Terlalu pendek: tambah tenaga', vi: 'Ngắn quá: mạnh hơn chút', hi: 'छोटा पड़ा: थोड़ा और ज़ोर', ar: 'قصير: قوة أكثر قليلًا' },
  'tuho.long': { en: 'Too far: a bit less power', ko: '멀어요: 힘을 조금 덜', ja: '奥すぎ：もう少し弱く', zh: '太远了：轻一点', es: 'Larga: un poco menos de fuerza', id: 'Terlalu jauh: kurangi tenaga', vi: 'Xa quá: nhẹ hơn chút', hi: 'दूर गया: थोड़ा कम ज़ोर', ar: 'بعيد: قوة أقل قليلًا' },
  'tuho.left': { en: 'A bit to the left', ko: '왼쪽으로 빗나갔어요', ja: '左にそれた', zh: '偏左了', es: 'Un poco a la izquierda', id: 'Agak ke kiri', vi: 'Lệch trái một chút', hi: 'थोड़ा बाईं ओर', ar: 'إلى اليسار قليلًا' },
  'tuho.right': { en: 'A bit to the right', ko: '오른쪽으로 빗나갔어요', ja: '右にそれた', zh: '偏右了', es: 'Un poco a la derecha', id: 'Agak ke kanan', vi: 'Lệch phải một chút', hi: 'थोड़ा दाईं ओर', ar: 'إلى اليمين قليلًا' },
  'tuho.arrow': { en: 'Arrow {i}/{n}', ko: '화살 {i}/{n}', ja: '矢 {i}/{n}', zh: '第{i}/{n}支箭', es: 'Flecha {i}/{n}', id: 'Panah {i}/{n}', vi: 'Mũi tên {i}/{n}', hi: 'तीर {i}/{n}', ar: 'السهم {i}/{n}' },
  'tuho.score': { en: '{score} points · {n} in the jar', ko: '{score}점 · {n}개 들어감', ja: '{score}点・{n}本入った', zh: '{score}分 · 投进{n}支', es: '{score} puntos · {n} dentro', id: '{score} poin · {n} masuk', vi: '{score} điểm · {n} mũi vào', hi: '{score} अंक · {n} अंदर', ar: '{score} نقاط · {n} في الجرّة' },

  // 제기차기
  'jegi.open': { en: 'Kick the jegi', ko: '제기차기 하기', ja: 'チェギチャギをする', zh: '踢毽子', es: 'Patear el jegi', id: 'Tendang jegi', vi: 'Đá cầu jegi', hi: 'जेगी उछालें', ar: 'اركل الجيغي' },
  'jegi.title': { en: 'Jegichagi (jegi kicking)', ko: '제기차기', ja: 'チェギチャギ（羽根蹴り）', zh: '踢毽子', es: 'Jegichagi (patear el jegi)', id: 'Jegichagi (tendang jegi)', vi: 'Jegichagi (đá cầu)', hi: 'जेगीचागी (जेगी किक)', ar: 'جيغيتشاغي (ركل الجيغي)' },
  'jegi.howTo': {
    en: 'Tap KICK (or Space) when the jegi is just above your foot. A clean kick goes straight up; a sloppy one drifts away. Keep it in the air as long as you can. Count along in Korean!',
    ko: '제기가 발 바로 위에 왔을 때 차기(또는 스페이스)를 눌러요. 정확히 차면 똑바로 올라가고, 어설프게 차면 옆으로 흘러가요. 최대한 오래 떨어뜨리지 말고 한국어로 함께 세어 봐요!',
    ja: 'チェギが足のすぐ上に来たらキック（またはスペース）。きれいに蹴るとまっすぐ上がり、雑だと横に流れます。なるべく長く落とさずに、韓国語で数えてみよう！',
    zh: '毽子落到脚面正上方时按“踢”（或空格）。踢得准就笔直上升，踢歪了就会飘走。尽量不让它落地，还可以用韩语一起数！',
    es: 'Pulsa PATEAR (o Espacio) cuando el jegi esté justo encima de tu pie. Una patada limpia sube recta; una torpe se desvía. Mantenlo en el aire todo lo que puedas. ¡Cuenta en coreano!',
    id: 'Ketuk TENDANG (atau Spasi) saat jegi tepat di atas kakimu. Tendangan pas naik lurus; yang meleset bergeser ke samping. Jaga tetap di udara selama mungkin. Hitung dalam bahasa Korea!',
    vi: 'Nhấn ĐÁ (hoặc Space) khi cầu ở ngay trên bàn chân. Đá chuẩn thì cầu bay thẳng lên; đá lệch thì cầu trôi sang bên. Giữ cầu trên không càng lâu càng tốt. Đếm bằng tiếng Hàn nhé!',
    hi: 'जब जेगी पैर के ठीक ऊपर हो तब किक (या Space) दबाएँ। साफ़ किक सीधी ऊपर जाती है; ढीली किक बगल में भटकती है। जितनी देर हो सके हवा में रखें। कोरियाई में गिनते चलें!',
    ar: 'اضغط «اركل» (أو المسافة) عندما يكون الجيغي فوق قدمك مباشرة. الركلة النظيفة تصعد مستقيمة، والمتعثرة تنحرف جانبًا. أبقِه في الهواء أطول ما يمكن، وعُدّ بالكورية!',
  },
  'jegi.fact': {
    en: 'A jegi is a coin wrapped in paper or cloth with a long tassel. Children kicked it outdoors in winter, and counted each kick out loud.',
    ko: '제기는 엽전을 종이나 천으로 싸서 술을 길게 단 장난감이에요. 아이들이 겨울에 밖에서 차며 한 번 찰 때마다 소리 내어 셌어요.',
    ja: 'チェギは穴あき銭を紙や布で包み、長い房をつけたおもちゃ。子どもたちは冬に外で蹴り、蹴るたびに声に出して数えました。',
    zh: '毽子是用纸或布包住铜钱、再系上长穗的玩具。孩子们冬天在户外踢，每踢一下就大声数一个数。',
    es: 'Un jegi es una moneda envuelta en papel o tela con un largo fleco. Los niños lo pateaban al aire libre en invierno y contaban cada patada en voz alta.',
    id: 'Jegi adalah koin yang dibungkus kertas atau kain dengan rumbai panjang. Anak-anak menendangnya di luar saat musim dingin sambil menghitung keras-keras.',
    vi: 'Jegi là đồng xu bọc giấy hoặc vải có tua dài. Trẻ em đá ngoài trời vào mùa đông và đếm to từng cú đá.',
    hi: 'जेगी कागज़ या कपड़े में लिपटा एक सिक्का होता है जिसमें लंबा फुंदना लगा होता है। बच्चे सर्दियों में बाहर इसे उछालते और हर किक ज़ोर से गिनते थे।',
    ar: 'الجيغي عملة ملفوفة بالورق أو القماش ولها شُرّابة طويلة. كان الأطفال يركلونه في الخارج شتاءً ويعدّون كل ركلة بصوت عالٍ.',
  },
  'jegi.kick': { en: 'KICK', ko: '차기', ja: 'キック', zh: '踢', es: 'PATEAR', id: 'TENDANG', vi: 'ĐÁ', hi: 'किक', ar: 'اركل' },
  'jegi.perfect': { en: 'Perfect!', ko: '완벽해요!', ja: 'パーフェクト！', zh: '完美！', es: '¡Perfecto!', id: 'Sempurna!', vi: 'Hoàn hảo!', hi: 'परफ़ेक्ट!', ar: 'ممتاز!' },
  'jegi.good': { en: 'Good kick', ko: '좋아요', ja: 'いいキック', zh: '踢得好', es: 'Buena patada', id: 'Tendangan bagus', vi: 'Đá tốt', hi: 'बढ़िया किक', ar: 'ركلة جيدة' },
  'jegi.ok': { en: 'Saved it!', ko: '겨우 찼어요!', ja: 'なんとか！', zh: '险些！', es: '¡Por poco!', id: 'Nyaris!', vi: 'Suýt nữa!', hi: 'बच गया!', ar: 'بالكاد!' },
  'jegi.whiff': { en: 'Missed', ko: '헛발질', ja: '空振り', zh: '踢空了', es: 'Fallaste', id: 'Meleset', vi: 'Đá hụt', hi: 'चूक गए', ar: 'أخطأت' },
  'jegi.fell': { en: 'It fell! {n} kicks', ko: '떨어졌어요! {n}번', ja: '落ちた！{n}回', zh: '掉了！{n}下', es: '¡Se cayó! {n} patadas', id: 'Jatuh! {n} tendangan', vi: 'Rơi rồi! {n} cú', hi: 'गिर गई! {n} किक', ar: 'سقط! {n} ركلات' },
  'jegi.best': { en: 'Best: {n} kicks', ko: '최고: {n}번', ja: 'ベスト：{n}回', zh: '最佳：{n}下', es: 'Récord: {n} patadas', id: 'Terbaik: {n} tendangan', vi: 'Tốt nhất: {n} cú', hi: 'बेस्ट: {n} किक', ar: 'الأفضل: {n} ركلات' },
  'jegi.perfects': { en: '{n} perfect kicks', ko: '완벽한 차기 {n}번', ja: 'パーフェクト {n}回', zh: '完美 {n} 次', es: '{n} patadas perfectas', id: '{n} tendangan sempurna', vi: '{n} cú hoàn hảo', hi: '{n} परफ़ेक्ट किक', ar: '{n} ركلات ممتازة' },

  // 널뛰기
  'neol.open': { en: 'Jump on the seesaw', ko: '널뛰기 하기', ja: 'ノルティギをする', zh: '玩跳板', es: 'Saltar en el balancín', id: 'Main jungkat-jungkit', vi: 'Chơi bập bênh', hi: 'नल्त्तुइगी खेलें', ar: 'اقفز على الأرجوحة' },
  'neol.title': { en: 'Neolttwigi (seesaw jumping)', ko: '널뛰기', ja: 'ノルティギ（板跳び）', zh: '跳板（널뛰기）', es: 'Neolttwigi (balancín de salto)', id: 'Neolttwigi (lompat papan)', vi: 'Neolttwigi (nhảy ván)', hi: 'नल्त्तुइगी (तख़्ते पर कूद)', ar: 'نولتّويغي (القفز على اللوح)' },
  'neol.howTo': {
    en: 'You and Suni stand on the ends of the board and take turns flying up. Tap PUSH (or Space) right as you land: good timing sends Suni higher, and she sends you back up just as high. 10 jumps; how high can you fly in all?',
    ko: '나와 순이가 널 양 끝에 서서 번갈아 뛰어올라요. 내가 착지하는 순간 구르기(또는 스페이스)를 눌러요. 타이밍이 좋으면 순이가 더 높이 뛰고, 순이도 나를 그만큼 높이 올려 줘요. 10번 뛰어서 모두 몇 미터나 날 수 있을까요?',
    ja: 'あなたとスニが板の両端に立って、交互に跳び上がります。着地の瞬間にプッシュ（またはスペース）。タイミングが良いとスニが高く跳び、スニもあなたを同じくらい高く跳ばしてくれます。10回跳んで、合計何メートル飛べるかな？',
    zh: '你和顺伊站在跳板两端，轮流被弹上天。在你落地的瞬间按“踩”（或空格）：时机好，顺伊就跳得更高，她也会把你弹得一样高。跳10次，总共能飞多高？',
    es: 'Tú y Suni os ponéis en los extremos de la tabla y voláis por turnos. Pulsa EMPUJAR (o Espacio) justo al caer: con buen tiempo Suni sube más, y ella te devuelve igual de alto. 10 saltos: ¿cuánto puedes volar en total?',
    id: 'Kamu dan Suni berdiri di ujung papan dan bergantian melambung. Ketuk DORONG (atau Spasi) tepat saat mendarat: waktu yang pas membuat Suni lebih tinggi, dan dia membalasmu setinggi itu. 10 lompatan; berapa tinggi totalmu?',
    vi: 'Bạn và Suni đứng hai đầu tấm ván, thay phiên bay lên. Nhấn ĐẠP (hoặc Space) đúng lúc bạn đáp xuống: đúng nhịp thì Suni bay cao hơn, và cô ấy đẩy bạn lên cao y như vậy. 10 lần nhảy; tổng cộng bạn bay cao được bao nhiêu?',
    hi: 'आप और सुनी तख़्ते के दोनों सिरों पर खड़े होकर बारी-बारी उछलते हैं। उतरते ही पुश (या Space) दबाएँ: सही समय पर सुनी ऊँची जाती है, और वह आपको भी उतना ही ऊँचा भेजती है। 10 छलाँगें; कुल कितना ऊँचा उड़ पाएँगे?',
    ar: 'تقف أنت وسوني على طرفي اللوح وتطيران بالتناوب. اضغط «ادفع» (أو المسافة) لحظة هبوطك: التوقيت الجيد يرفع سوني أعلى، وهي ترفعك بالارتفاع نفسه. 10 قفزات؛ كم ترتفع في المجموع؟',
  },
  'neol.fact': {
    en: 'Neolttwigi is a New Year game. In the old days, it is said, girls who rarely left home could peek over the high walls while flying up.',
    ko: '널뛰기는 설날에 하던 놀이예요. 옛날에 바깥출입이 어려웠던 여자아이들이 높이 뛰어올라 담장 너머 세상을 구경했다는 이야기가 전해요.',
    ja: 'ノルティギはお正月の遊び。昔、なかなか外に出られなかった娘たちが、高く跳んで塀の向こうをのぞいたと言い伝えられています。',
    zh: '跳板是春节的游戏。相传古时很少出门的姑娘们，借着高高跃起偷看墙外的世界。',
    es: 'El neolttwigi es un juego de Año Nuevo. Se dice que antiguamente las chicas, que apenas salían de casa, se asomaban por encima de los altos muros al volar.',
    id: 'Neolttwigi adalah permainan Tahun Baru. Konon dulu para gadis yang jarang keluar rumah bisa mengintip dari balik tembok tinggi saat melambung.',
    vi: 'Neolttwigi là trò chơi ngày Tết. Tương truyền ngày xưa các cô gái ít được ra ngoài đã nhảy cao để ngó qua bức tường cao.',
    hi: 'नल्त्तुइगी नए साल का खेल है। कहा जाता है कि पुराने ज़माने में घर से कम निकलने वाली लड़कियाँ ऊँचा उछलकर ऊँची दीवारों के पार झाँक लेती थीं।',
    ar: 'النولتّويغي لعبة رأس السنة. يُقال إن الفتيات قديمًا، وقد كنّ نادرًا ما يخرجن، كنّ يطللن من فوق الأسوار العالية وهنّ يقفزن.',
  },
  'neol.push': { en: 'PUSH', ko: '구르기', ja: 'プッシュ', zh: '踩', es: 'EMPUJAR', id: 'DORONG', vi: 'ĐẠP', hi: 'पुश', ar: 'ادفع' },
  'neol.partner': { en: 'Suni', ko: '순이', ja: 'スニ', zh: '顺伊', es: 'Suni', id: 'Suni', vi: 'Suni', hi: 'सुनी', ar: 'سوني' },
  'neol.perfect': { en: 'Perfect push!', ko: '완벽한 구르기!', ja: '完璧！', zh: '完美！', es: '¡Empujón perfecto!', id: 'Dorongan sempurna!', vi: 'Đạp hoàn hảo!', hi: 'परफ़ेक्ट पुश!', ar: 'دفعة ممتازة!' },
  'neol.good': { en: 'Good push', ko: '좋아요', ja: 'いい感じ', zh: '不错', es: 'Buen empujón', id: 'Dorongan bagus', vi: 'Đạp tốt', hi: 'बढ़िया पुश', ar: 'دفعة جيدة' },
  'neol.ok': { en: 'A bit off', ko: '조금 어긋났어요', ja: 'ちょっとずれた', zh: '差了一点', es: 'Un poco desfasado', id: 'Agak meleset', vi: 'Hơi lệch nhịp', hi: 'थोड़ा चूके', ar: 'خارج التوقيت قليلًا' },
  'neol.miss': { en: 'Missed the beat', ko: '박자를 놓쳤어요', ja: 'タイミングを逃した', zh: '错过了时机', es: 'Perdiste el ritmo', id: 'Ketinggalan irama', vi: 'Lỡ nhịp', hi: 'ताल चूक गए', ar: 'فاتك الإيقاع' },
  'neol.jump': { en: 'Jump {i}/{n}', ko: '{i}/{n}번째', ja: '{i}/{n}回目', zh: '第{i}/{n}跳', es: 'Salto {i}/{n}', id: 'Lompatan {i}/{n}', vi: 'Lần {i}/{n}', hi: 'छलाँग {i}/{n}', ar: 'القفزة {i}/{n}' },
  'neol.total': { en: '{m} m in all · highest {b} m', ko: '모두 {m}m · 최고 {b}m', ja: '合計 {m}m・最高 {b}m', zh: '共 {m} 米 · 最高 {b} 米', es: '{m} m en total · máximo {b} m', id: 'Total {m} m · tertinggi {b} m', vi: 'Tổng {m} m · cao nhất {b} m', hi: 'कुल {m} मी · सबसे ऊँचा {b} मी', ar: 'المجموع {m} م · الأعلى {b} م' },
};

export const FL = (k, vars) => {
  let s = localName(FT[k], getLanguage()) ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll('{' + a + '}', b);
  return s;
};

// Things the locals say: [Korean, romanization, meaning].
const tr = (en, ja, zh, es, id, vi, hi, ar) => ({ en, ja, zh, es, id, vi, hi, ar });
export const FOLK_LINES = {
  yutHello: ['윷놀이 한 판 할까요?', 'yunnori han pan halkkayo?', tr('Shall we play a round of yutnori?', 'ユンノリ、一局やりましょうか？', '来一局掷柶吧？', '¿Jugamos una partida de yutnori?', 'Main yutnori satu ronde, yuk?', 'Chơi một ván yutnori nhé?', 'युतनोरी की एक बाज़ी हो जाए?', 'هل نلعب جولة يوتنوري؟')],
  caught: ['잡았다!', 'jabatda!', tr('Got you!', '捕まえた！', '抓到了！', '¡Te pillé!', 'Kena kau!', 'Bắt được rồi!', 'पकड़ लिया!', 'أمسكتك!')],
  stacked: ['업어!', 'eobeo!', tr('Piggyback!', 'おんぶ！', '背上！', '¡A caballito!', 'Gendong!', 'Cõng nào!', 'पीठ पर चढ़ो!', 'على الظهر!')],
  won: ['이겼다!', 'igyeotda!', tr('I won!', '勝った！', '赢了！', '¡Gané!', 'Aku menang!', 'Thắng rồi!', 'मैं जीता!', 'فزت!')],
  tuhoHello: ['화살을 항아리에 넣어 봐요.', 'hwasareul hang-arie neo-eo bwayo.', tr('Try to get the arrows into the jar.', '矢を壺に入れてみて。', '试着把箭投进壶里吧。', 'Intenta meter las flechas en el jarrón.', 'Coba masukkan panah ke guci.', 'Thử ném tên vào bình xem.', 'तीर जार में डालकर देखो।', 'حاول إدخال السهام في الجرّة.')],
  inJar: ['들어갔다!', 'deureogatda!', tr('It went in!', '入った！', '进了！', '¡Entró!', 'Masuk!', 'Vào rồi!', 'अंदर गया!', 'دخل!')],
  jegiHello: ['제기 몇 번 찰 수 있어요?', 'jegi myeot beon chal su isseoyo?', tr('How many kicks can you do?', '何回蹴れるかな？', '你能踢几下？', '¿Cuántas patadas puedes dar?', 'Bisa tendang berapa kali?', 'Bạn đá được mấy cái?', 'कितनी किक लगा सकते हो?', 'كم ركلة تستطيع؟')],
  neolHello: ['같이 널 뛰어요!', 'gachi neol ttwieoyo!', tr('Let\'s jump together!', '一緒に跳ぼう！', '一起跳吧！', '¡Saltemos juntos!', 'Ayo lompat bersama!', 'Cùng nhảy nào!', 'चलो साथ कूदें!', 'لنقفز معًا!')],
  high: ['높이 올라간다!', 'nopi ollaganda!', tr('Up you go!', '高く上がるよ！', '飞高啦！', '¡Arriba!', 'Naik tinggi!', 'Bay cao nào!', 'ऊपर चले!', 'إلى الأعلى!')],
  cheer: ['잘한다!', 'jalhanda!', tr('Well done!', '上手！', '真棒！', '¡Muy bien!', 'Hebat!', 'Giỏi lắm!', 'शाबाश!', 'أحسنت!')],
};
export const lineText = (key) => {
  const [ko, rom, t] = FOLK_LINES[key];
  return [ko, rom, localName(t, getLanguage())];
};

// Native Korean numbers (하나, 둘, 셋…), the way a jegi count is called out.
const ONES = [['', ''], ['하나', 'hana'], ['둘', 'dul'], ['셋', 'set'], ['넷', 'net'], ['다섯', 'daseot'], ['여섯', 'yeoseot'], ['일곱', 'ilgop'], ['여덟', 'yeodeol'], ['아홉', 'ahop']];
const TENS = [['', ''], ['열', 'yeol'], ['스물', 'seumul'], ['서른', 'seoreun'], ['마흔', 'maheun'], ['쉰', 'swin'], ['예순', 'yesun'], ['일흔', 'ilheun'], ['여든', 'yeodeun'], ['아흔', 'aheun']];
export function koCount(n) {
  if (!(n >= 1 && n <= 99)) return [String(n), String(n)];
  const t = TENS[Math.floor(n / 10)], o = ONES[n % 10];
  return [t[0] + o[0], [t[1], o[1]].filter(Boolean).join('-')];
}
