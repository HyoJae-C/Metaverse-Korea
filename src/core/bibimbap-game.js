// Bibimbap (비빔밥) at the Bibimbap Making Class (비빔밥만들기체험): a bowl of rice
// with seasoned vegetables (namul), a fried egg and gochujang, mixed just
// before eating. The steps are of the shared kinds in core/cook-class.js:
//
//   1 namul    season the blanched vegetables
//   2 top      pick the toppings (free choice; the liking stays hidden)
//   3 arrange  lay them round the bowl by colour
//   4 egg      fry an egg, the yolk still soft
//   5 sauce    gochujang and sesame oil
//   6 mix      mix it all up (three stirs)
export const BIBIMBAP_GAME = 'bibimbap';

export const STEPS = [
  { id: 'namul', type: 'amounts', max: 4, items: [
    { id: 'sesameoil', emoji: '🫒', ko: '참기름', rom: 'chamgireum', ok: [1, 2] },
    { id: 'salt', emoji: '🧂', ko: '소금', rom: 'sogeum', ok: [1, 1] },
    { id: 'garlic', emoji: '🧄', ko: '다진 마늘', rom: 'dajin maneul', ok: [1, 1] },
    { id: 'sugar', emoji: '🍬', ko: '설탕', rom: 'seoltang', decoy: true },
    { id: 'vinegar', emoji: '🧴', ko: '식초', rom: 'sikcho', decoy: true },
  ] },
  { id: 'top', type: 'pick', min: 3, max: 7, full: 5, items: [
    { id: 'spinach', emoji: '🥬', ko: '시금치', rom: 'sigeumchi', pref: 100, classic: true },
    { id: 'sprouts', emoji: '🌱', ko: '콩나물', rom: 'kongnamul', pref: 100, classic: true },
    { id: 'carrot', emoji: '🥕', ko: '당근', rom: 'danggeun', pref: 95, classic: true },
    { id: 'fern', emoji: '🌿', ko: '고사리', rom: 'gosari', pref: 95, classic: true },
    { id: 'zucchini', emoji: '🥒', ko: '애호박', rom: 'aehobak', pref: 95, classic: true },
    { id: 'mushroom', emoji: '🍄', ko: '표고버섯', rom: 'pyogo beoseot', pref: 90, classic: true },
    { id: 'beef', emoji: '🥩', ko: '소고기', rom: 'sogogi', pref: 90, classic: true },
    { id: 'radish', emoji: '🥗', ko: '무생채', rom: 'musaengchae', pref: 90 },
    { id: 'lettuce', emoji: '🥬', ko: '상추', rom: 'sangchu', pref: 85 },
    { id: 'kimchi', emoji: '🌶️', ko: '김치', rom: 'gimchi', pref: 80 },
    { id: 'tuna', emoji: '🐟', ko: '참치', rom: 'chamchi', pref: 70 },
    { id: 'avocado', emoji: '🥑', ko: '아보카도', rom: 'abokado', pref: 65 },
    { id: 'cheese', emoji: '🧀', ko: '치즈', rom: 'chijeu', pref: 40 },
    { id: 'pineapple', emoji: '🍍', ko: '파인애플', rom: 'painaepeul', pref: 15 },
    { id: 'banana', emoji: '🍌', ko: '바나나', rom: 'banana', pref: 5 },
    { id: 'marshmallow', emoji: '🍡', ko: '마시멜로', rom: 'masimello', pref: 0 },
  ] },
  { id: 'arrange', type: 'choice', options: [
    { id: 'colours', emoji: '🌈', score: 100 },
    { id: 'rows', emoji: '📏', score: 70 },
    { id: 'pile', emoji: '⛰️', score: 40 },
  ] },
  { id: 'egg', type: 'meter', times: 1, zone: [0.45, 0.65], speed: 0.8 },
  { id: 'sauce', type: 'amounts', max: 4, items: [
    { id: 'gochujang', emoji: '🌶️', ko: '고추장', rom: 'gochujang', ok: [1, 2] },
    { id: 'sesameoil', emoji: '🫒', ko: '참기름', rom: 'chamgireum', ok: [1, 1] },
    { id: 'sesame', emoji: '✨', ko: '깨', rom: 'kkae', ok: [0, 1] },
    { id: 'ketchup', emoji: '🍅', ko: '케첩', rom: 'kecheop', decoy: true },
    { id: 'mayo', emoji: '🥚', ko: '마요네즈', rom: 'mayonejeu', decoy: true },
  ] },
  { id: 'mix', type: 'meter', times: 3, zone: [0.5, 0.8], speed: 1 },
];

export const WORDS = [
  { ko: '비빔밥', rom: 'bibimbap', key: 'bibimbap' },
  { ko: '비비다', rom: 'bibida', key: 'bibida' },
  { ko: '나물', rom: 'namul', key: 'namul' },
  { ko: '고추장', rom: 'gochujang', key: 'gochujang' },
  { ko: '참기름', rom: 'chamgireum', key: 'chamgireum' },
  { ko: '계란 프라이', rom: 'gyeran peurai', key: 'egg' },
  { ko: '오방색', rom: 'obangsaek', key: 'obangsaek' },
  { ko: '돌솥', rom: 'dolsot', key: 'dolsot' },
];
