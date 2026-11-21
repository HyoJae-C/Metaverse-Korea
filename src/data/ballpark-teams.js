// Modu Ballpark's eight teams (core/ballgame.js plays their games; the team
// shop sells their jersey, cap and cheer towel: data/wearables.js,
// data/appearance.js, data/characters/kaykit2.js). Small, as the clothes data
// is in the first download.
// Fictional teams ("district + animal"): Seoul's eight most populous gu, so
// many Seoulites find their own team (Yozi 2026-11-15). Each animal has a tie
// to its gu (Gangseo's wetland herons, Gangdong's Han River otters, Bukhansan's
// squirrels in Eunpyeong, the poem "Seongbuk-dong Pigeons"...). None is a real
// KBO team or a well-known mascot. color: the jersey; trim: the letters and the cap.
export const TEAM_LIST = [
  { id: 'herons', short: 'GSO', color: '#2f6fd6', trim: '#ffffff', name: { en: 'Gangseo Herons', ko: '강서 왜가리', ja: '江西アオサギ', zh: '江西苍鹭' }, chant: ['강서! 왜가리!', 'gangseo! waegari!'] },
  { id: 'comets', short: 'SPA', color: '#f28a1e', trim: '#1d2440', name: { en: 'Songpa Comets', ko: '송파 혜성', ja: '松坡コメッツ', zh: '松坡彗星' }, chant: ['송파! 혜성!', 'songpa! hyeseong!'] },
  { id: 'magpies', short: 'GWA', color: '#26262c', trim: '#f4f4f4', name: { en: 'Gwanak Magpies', ko: '관악 까치', ja: '冠岳カササギ', zh: '冠岳喜鹊' }, chant: ['관악! 까치!', 'gwanak! kkachi!'] },
  { id: 'otters', short: 'GDG', color: '#2f9e5b', trim: '#f6e7b0', name: { en: 'Gangdong Otters', ko: '강동 수달', ja: '江東カワウソ', zh: '江东水獭' }, chant: ['강동! 수달!', 'gangdong! sudal!'] },
  { id: 'cats', short: 'GNM', color: '#8a5cc9', trim: '#ffd84a', name: { en: 'Gangnam Cats', ko: '강남 고양이', ja: '江南キャッツ', zh: '江南猫咪' }, chant: ['강남! 고양이!', 'gangnam! goyangi!'] },
  { id: 'pigeons', short: 'SBK', color: '#8c96a3', trim: '#2c3a6b', name: { en: 'Seongbuk Pigeons', ko: '성북 비둘기', ja: '城北ハト', zh: '城北鸽子' }, chant: ['성북! 비둘기!', 'seongbuk! bidulgi!'] },
  { id: 'squirrels', short: 'EPY', color: '#8a5a34', trim: '#f3e2c4', name: { en: 'Eunpyeong Squirrels', ko: '은평 다람쥐', ja: '恩平リス', zh: '恩平松鼠' }, chant: ['은평! 다람쥐!', 'eunpyeong! daramjwi!'] },
  { id: 'deer', short: 'NWN', color: '#f2c230', trim: '#6b4a2f', name: { en: 'Nowon Water Deer', ko: '노원 고라니', ja: '蘆原キバノロ', zh: '芦原獐子' }, chant: ['노원! 고라니!', 'nowon! gorani!'] },
];
