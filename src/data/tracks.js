// Songs for the music player. Each is a short recipe that core/music.js plays
// live with Web Audio: no audio files, so nothing to download or license, and
// every tune is original. MIDI note numbers; e = eighth note in a bar (0–7).
//
// To add a song: copy one, change the notes, and give it a name and a short
// description in each UI language.

export const TRACKS = [
  {
    id: 'lofi',
    icon: '🌙',
    color: '#6d5bd0',
    name: { en: 'Seongsu Lo-fi', ko: '성수 로파이', ja: '聖水ローファイ', zh: '圣水低保真' },
    desc: {
      en: 'Lo-fi hip hop: slow, soft beats with warm keys. Made for studying and chatting.',
      ko: '로파이 힙합: 느리고 부드러운 비트에 따뜻한 건반. 공부하거나 수다 떨 때 좋아요.',
      ja: 'ローファイ・ヒップホップ：ゆったりした柔らかいビートと温かい鍵盤。勉強やおしゃべりに。',
      zh: 'Lo-fi 嘻哈：缓慢柔和的节拍和温暖的键盘，适合学习和聊天。',
    },
    bpm: 78, swing: 1.16,
    chords: [[53, 57, 60, 64], [50, 53, 57, 60], [46, 50, 53, 57], [48, 53, 55, 58]],
    bass: [41, 38, 34, 36], bassHits: [[0, 0, 1.8], [5, 7, 0.9]],
    kick: [0, 3], snare: [4], hat: 'odd',
    scale: [65, 67, 69, 72, 74, 77], melodyFrom: 32, melody: 0.42, lead: 'bell',
  },
  {
    id: 'jazz',
    icon: '🎷',
    color: '#b0682e',
    name: { en: 'Rainy Afternoon Jazz', ko: '비 오는 오후의 재즈', ja: '雨の午後のジャズ', zh: '雨天午后爵士' },
    desc: {
      en: 'Swing jazz: a walking bass, brushed drums and a ii–V–I chord loop, like a small café trio.',
      ko: '스윙 재즈: 걸어가는 듯한 베이스, 브러시 드럼, ii–V–I 코드. 작은 카페 트리오 느낌이에요.',
      ja: 'スウィング・ジャズ：ウォーキングベース、ブラシのドラム、ii–V–I進行。小さなカフェのトリオ風。',
      zh: '摇摆爵士：行走贝斯、刷子鼓和 ii–V–I 和弦，像咖啡馆里的小三重奏。',
    },
    bpm: 100, swing: 1.32,
    chords: [[48, 51, 55, 58], [48, 51, 53, 57], [46, 50, 53, 57], [50, 53, 55, 58]],
    bass: [36, 41, 34, 43], walk: true,
    kick: [0], snare: [2, 6], brush: true, hat: 'ride',
    scale: [67, 70, 72, 74, 77, 79], melodyFrom: 16, melody: 0.36, lead: 'bell',
  },
  {
    id: 'citypop',
    icon: '🌆',
    color: '#e0517a',
    name: { en: 'City Pop Drive', ko: '시티팝 드라이브', ja: 'シティポップ・ドライブ', zh: '城市流行兜风' },
    desc: {
      en: 'City pop: bright 80s-style chords and a bouncing bass. Think a night drive along the river.',
      ko: '시티팝: 반짝이는 80년대풍 코드와 통통 튀는 베이스. 강변 밤 드라이브 같은 곡이에요.',
      ja: 'シティポップ：きらめく80年代風コードと弾むベース。川沿いの夜のドライブ気分。',
      zh: '城市流行：明亮的 80 年代风和弦与跳跃的贝斯，像沿江夜间兜风。',
    },
    bpm: 112, swing: 1,
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [57, 60, 64, 67], [55, 60, 62, 65]],
    bass: [41, 40, 45, 43], octaveBass: true,
    kick: [0, 2, 4, 6], snare: [2, 6], hat: 'all',
    scale: [72, 74, 76, 79, 81, 84], melodyFrom: 16, melody: 0.5, lead: 'pluck',
  },
  {
    id: 'hangang',
    icon: '🌊',
    color: '#2f8fb0',
    name: { en: 'Han River Ambient', ko: '한강 앰비언트', ja: '漢江アンビエント', zh: '汉江氛围' },
    desc: {
      en: 'Ambient: no drums, long soft chords, little bells and the sound of water. Calm and slow.',
      ko: '앰비언트: 드럼 없이 길고 부드러운 화음, 작은 종소리, 물소리. 차분하고 느려요.',
      ja: 'アンビエント：ドラムなし、長く柔らかな和音と小さなベル、水の音。穏やかでゆっくり。',
      zh: '氛围音乐：没有鼓，只有绵长柔和的和弦、小铃声和水声，平静而缓慢。',
    },
    bpm: 60, swing: 1,
    chords: [[50, 57, 61, 64], [47, 54, 57, 62], [43, 50, 54, 59], [45, 52, 57, 61]],
    bass: [38, 35, 31, 33], bassHits: [[0, 0, 7.5]], pad: true, waves: true,
    kick: [], snare: [], hat: null,
    scale: [74, 76, 78, 81, 83, 86], melodyFrom: 0, melody: 0.22, lead: 'bell',
  },
  {
    id: 'gugak',
    icon: '🪕',
    color: '#c0392b',
    name: { en: 'Gugak Groove', ko: '국악 그루브', ja: '国楽グルーヴ', zh: '国乐律动' },
    desc: {
      en: 'Inspired by gugak, traditional Korean music: a plucked zither like the gayageum with bending notes, over a janggu drum rhythm.',
      ko: '국악에서 영감을 받은 곡: 가야금처럼 뜯는 소리와 꺾이는 음, 장구 장단 위에서 흘러가요.',
      ja: '韓国の伝統音楽「国楽」から着想：伽耶琴のようにはじく音と揺れる音程、チャング（杖鼓）のリズム。',
      zh: '灵感来自韩国传统国乐：像伽倻琴一样拨弦、滑音，伴着长鼓节奏。',
    },
    bpm: 84, swing: 1.34,
    chords: [[50, 57, 62], [48, 55, 60], [50, 57, 62], [45, 52, 57]],
    bass: [38, 36, 38, 33], bassHits: [[0, 0, 3.5]], pad: true,
    kick: [0, 3], snare: [], rim: [2, 5, 6], hat: null,
    scale: [62, 65, 67, 69, 72, 74], melodyFrom: 8, melody: 0.55, lead: 'gayageum',
  },
  {
    id: 'busking',
    icon: '🎸',
    color: '#e0457b',
    name: { en: 'Hongdae Street Song', ko: '홍대 거리의 노래', ja: '弘大ストリートソング', zh: '弘大街头之歌' },
    desc: {
      en: 'Acoustic pop, like a busker on Hongdae Walking Street: strummed guitar chords, a light beat and a catchy hook.',
      ko: '홍대 걷고싶은거리 버스커 같은 어쿠스틱 팝: 기타 스트로크, 가벼운 비트, 귀에 남는 멜로디.',
      ja: '弘大の歩きたい通りのバスカーのようなアコースティックポップ：ギターのストローク、軽いビート、耳に残るメロディ。',
      zh: '像弘大步行街街头艺人一样的原声流行乐：扫弦吉他、轻快节拍和朗朗上口的旋律。',
    },
    bpm: 96, swing: 1.08,
    chords: [[55, 59, 62, 67], [54, 57, 62, 66], [52, 55, 59, 64], [52, 55, 60, 64]],
    bass: [43, 38, 40, 36], bassHits: [[0, 0, 1.6], [4, 7, 1.4]],
    kick: [0, 4], snare: [2, 6], hat: 'odd',
    scale: [67, 69, 71, 74, 76, 79], melodyFrom: 8, melody: 0.5, lead: 'pluck',
  },
  {
    // The Ttukseom drone light show's music (not in the record list): no
    // drums, slow bright chords like a night sky, little bells, the river.
    id: 'droneshow',
    hidden: true,
    icon: '🛸',
    color: '#3b3f9e',
    name: { en: 'Drones over the River', ko: '강 위의 드론', ja: '川の上のドローン', zh: '江上的无人机' },
    desc: {
      en: 'Drone show music: slow bright chords, little bells and the sound of the river at night.',
      ko: '드론쇼 음악: 느리고 밝은 화음, 작은 종소리, 밤 강물 소리.',
      ja: 'ドローンショーの音楽：ゆっくり明るい和音、小さなベル、夜の川の音。',
      zh: '无人机表演音乐：缓慢明亮的和弦、小铃声和夜晚的江水声。',
    },
    bpm: 66, swing: 1,
    chords: [[53, 60, 64, 69], [48, 55, 64, 67], [50, 57, 62, 65], [46, 53, 62, 65]],
    bass: [41, 36, 38, 34], bassHits: [[0, 0, 7.5]], pad: true, waves: true,
    kick: [], snare: [], hat: null,
    scale: [72, 74, 76, 79, 81, 84], melodyFrom: 0, melody: 0.3, lead: 'bell',
  },
  {
    // The Curve Runway's show music (not in the music cafe's record list):
    // a steady four-on-the-floor kick, a dark minor loop and a low pulsing
    // bass, tense like a fashion show's catwalk.
    id: 'runway',
    hidden: true,
    icon: '👠',
    color: '#5b4a7a',
    name: { en: 'Catwalk', ko: '캣워크', ja: 'キャットウォーク', zh: '猫步' },
    desc: {
      en: 'Fashion show music: a steady kick, a dark minor loop and a pulsing bass.',
      ko: '패션쇼 음악: 일정한 킥, 어두운 단조 루프, 맥박 같은 베이스.',
      ja: 'ファッションショーの音楽：一定のキック、暗い短調のループ、脈打つベース。',
      zh: '时装秀音乐：稳定的底鼓、暗色小调循环和脉动的贝斯。',
    },
    bpm: 120, swing: 1,
    chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
    bass: [33, 29, 26, 28], octaveBass: true,
    kick: [0, 2, 4, 6], snare: [2, 6], hat: 'all',
    scale: [69, 71, 72, 76, 77, 81], melodyFrom: 16, melody: 0.28, lead: 'pluck',
  },
];

export const trackById = (id) => TRACKS.find((tr) => tr.id === id) || TRACKS[0];
