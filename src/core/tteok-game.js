// Songpyeon (송편) at the Tteok Making Class (떡만들기체험): half-moon rice cakes
// with a sweet filling, steamed on pine needles, made for Chuseok. The steps
// are of the shared kinds in core/cook-class.js:
//
//   1 dough   rice flour kneaded with hot water and a pinch of salt
//   2 knead   until smooth (three times)
//   3 fill    one or two fillings (free choice; the liking stays hidden)
//   4 shape   a ball, a hollow, the filling, the edges pinched shut (three pinches)
//   5 steam   on a bed of pine needles
//   6 finish  rinse in cold water, brush with sesame oil
export const TTEOK_GAME = 'tteok';

export const STEPS = [
  { id: 'dough', type: 'amounts', max: 4, items: [
    { id: 'salt', emoji: '🧂', ko: '소금', rom: 'sogeum', ok: [1, 1] },
    { id: 'hotwater', emoji: '♨️', ko: '뜨거운 물', rom: 'tteugeoun mul', ok: [2, 3] },
    { id: 'mugwort', emoji: '🌿', ko: '쑥가루', rom: 'ssukgaru', ok: [0, 1] },
    { id: 'coldwater', emoji: '🧊', ko: '찬물', rom: 'chanmul', decoy: true }, // the dough cracks
    { id: 'flour', emoji: '🌾', ko: '밀가루', rom: 'milgaru', decoy: true }, // that's bread
  ] },
  { id: 'knead', type: 'meter', times: 3, zone: [0.5, 0.75], speed: 0.9 },
  { id: 'fill', type: 'pick', min: 1, max: 2, full: 1, items: [
    { id: 'sesame', emoji: '🍯', ko: '깨꿀', rom: 'kkaekkul', pref: 100, classic: true },
    { id: 'chestnut', emoji: '🌰', ko: '밤', rom: 'bam', pref: 95, classic: true },
    { id: 'bean', emoji: '🫘', ko: '콩', rom: 'kong', pref: 90, classic: true },
    { id: 'redbean', emoji: '🟤', ko: '팥', rom: 'pat', pref: 90 },
    { id: 'mungbean', emoji: '🟢', ko: '녹두', rom: 'nokdu', pref: 85 },
    { id: 'sweetpotato', emoji: '🍠', ko: '고구마', rom: 'goguma', pref: 75 },
    { id: 'cheese', emoji: '🧀', ko: '치즈', rom: 'chijeu', pref: 40 },
    { id: 'choco', emoji: '🍫', ko: '초콜릿', rom: 'chokollit', pref: 30 },
    { id: 'kimchi', emoji: '🌶️', ko: '김치', rom: 'gimchi', pref: 10 },
    { id: 'ketchup', emoji: '🍅', ko: '케첩', rom: 'kecheop', pref: 5 },
  ] },
  { id: 'shape', type: 'meter', times: 3, zone: [0.4, 0.65], speed: 1 },
  { id: 'steam', type: 'choice', options: [
    { id: 'pine', emoji: '🌲', score: 100 },
    { id: 'cloth', emoji: '🧺', score: 60 },
    { id: 'bare', emoji: '🍳', score: 30 },
  ] },
  { id: 'finish', type: 'checks', base: 20, items: [
    { id: 'rinse', emoji: '💧', pts: 40 },
    { id: 'oil', emoji: '🫒', pts: 40 },
    { id: 'sugar', emoji: '🍬', pts: -20 },
  ] },
];

export const WORDS = [
  { ko: '떡', rom: 'tteok', key: 'tteok' },
  { ko: '송편', rom: 'songpyeon', key: 'songpyeon' },
  { ko: '빚다', rom: 'bitda', key: 'bitda' },
  { ko: '반달', rom: 'bandal', key: 'bandal' },
  { ko: '솔잎', rom: 'sollip', key: 'sollip' },
  { ko: '찌다', rom: 'jjida', key: 'jjida' },
  { ko: '쑥', rom: 'ssuk', key: 'ssuk' },
  { ko: '추석', rom: 'chuseok', key: 'chuseok' },
];
