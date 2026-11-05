// Skirts from the skirt shops: two lengths (mini and long) in many colours
// and patterns. A skirt is worn over the everyday clothes (look.skirt), on
// top of whatever trousers you have; taking it off shows the trousers again.
// The skirt itself is built in code (core/skirt-mesh.js) and painted with
// its pattern; under a skirt the legs are bare.
//
//   length:  'mini' (mid-thigh) or 'long' (to the ankles)
//   pattern: solid, pleats, tartan, gingham, dots, floral, stripe, denim, leopard
//   color:   the main colour; accent: the pattern's second colour
//   tone:    the colour word for the name (COLOR_NAMES), null for none

export const SKIRT_LENGTHS = ['mini', 'long'];
export const SKIRT_PATTERNS = ['solid', 'pleats', 'tartan', 'gingham', 'dots', 'floral', 'stripe', 'denim', 'leopard'];
export const SKIRT_PRICE = { mini: 45, long: 55 }; // coins

const COLOR_NAMES = {
  navy: { en: 'Navy', ko: '네이비', ja: 'ネイビー', zh: '藏青色' },
  black: { en: 'Black', ko: '블랙', ja: 'ブラック', zh: '黑色' },
  white: { en: 'White', ko: '화이트', ja: 'ホワイト', zh: '白色' },
  pink: { en: 'Pink', ko: '핑크', ja: 'ピンク', zh: '粉色' },
  sage: { en: 'Sage green', ko: '세이지 그린', ja: 'セージグリーン', zh: '鼠尾草绿' },
  red: { en: 'Red', ko: '레드', ja: 'レッド', zh: '红色' },
  green: { en: 'Green', ko: '그린', ja: 'グリーン', zh: '绿色' },
  sky: { en: 'Sky blue', ko: '하늘색', ja: '水色', zh: '天蓝色' },
  butter: { en: 'Butter yellow', ko: '버터 옐로', ja: 'バターイエロー', zh: '奶油黄' },
  camel: { en: 'Camel', ko: '카멜', ja: 'キャメル', zh: '驼色' },
  cream: { en: 'Cream', ko: '크림', ja: 'クリーム', zh: '奶油色' },
  lilac: { en: 'Lilac', ko: '라일락', ja: 'ライラック', zh: '淡紫色' },
  mint: { en: 'Mint', ko: '민트', ja: 'ミント', zh: '薄荷色' },
  dark: { en: 'Dark', ko: '진청', ja: '濃色', zh: '深色' },
  light: { en: 'Light', ko: '연청', ja: '淡色', zh: '浅色' },
  neonpink: { en: 'Neon pink', ko: '네온 핑크', ja: 'ネオンピンク', zh: '荧光粉' },
  lime: { en: 'Lime', ko: '라임', ja: 'ライム', zh: '青柠色' },
};
const PATTERN_NAMES = {
  solid: { en: '', ko: '', ja: '', zh: '' },
  pleats: { en: 'pleated', ko: '플리츠', ja: 'プリーツ', zh: '百褶' },
  tartan: { en: 'tartan', ko: '타탄 체크', ja: 'タータンチェック', zh: '格纹' },
  gingham: { en: 'gingham', ko: '깅엄 체크', ja: 'ギンガムチェック', zh: '小格子' },
  dots: { en: 'polka-dot', ko: '도트', ja: 'ドット', zh: '波点' },
  floral: { en: 'floral', ko: '꽃무늬', ja: '花柄', zh: '碎花' },
  stripe: { en: 'striped', ko: '스트라이프', ja: 'ボーダー', zh: '条纹' },
  denim: { en: 'denim', ko: '데님', ja: 'デニム', zh: '牛仔' },
  leopard: { en: 'leopard', ko: '호피', ja: 'ヒョウ柄', zh: '豹纹' },
};
const LENGTH_NAMES = {
  mini: { en: 'mini skirt', ko: '미니스커트', ja: 'ミニスカート', zh: '短裙' },
  long: { en: 'long skirt', ko: '롱스커트', ja: 'ロングスカート', zh: '长裙' },
  chima: { en: 'chima', ko: '치마', ja: 'チマ', zh: '韩服裙' },
};

// The name of a skirt in en/ko/ja/zh, from its colour, pattern and length.
export function skirtName(s) {
  const c = s.tone ? COLOR_NAMES[s.tone] : null, p = PATTERN_NAMES[s.pattern], l = LENGTH_NAMES[s.length];
  const words = (lang, sep) => [c?.[lang], p[lang], l[lang]].filter(Boolean).join(sep);
  const en = words('en', ' ');
  return {
    en: en[0].toUpperCase() + en.slice(1),
    ko: words('ko', ' '),
    ja: c ? `${c.ja}の${p.ja}${l.ja}` : p.ja + l.ja,
    zh: words('zh', ''),
  };
}

const sk = (length, pattern, tone, color, accent = null) => ({ length, pattern, tone, color, accent });

// Grouped by the shop that sells them (stores.json: each product's item is
// 'skirt-' + the skirt id).
export const SKIRTS = {
  // 주름 플리츠 (Seongsu): pleated skirts.
  'pleats-mini-navy': sk('mini', 'pleats', 'navy', 0x2f3c66),
  'pleats-mini-pink': sk('mini', 'pleats', 'pink', 0xf4a6c0),
  'pleats-mini-white': sk('mini', 'pleats', 'white', 0xf4f1ea),
  'pleats-long-black': sk('long', 'pleats', 'black', 0x2b2b31),
  'pleats-long-sage': sk('long', 'pleats', 'sage', 0x9db39a),
  // 체크룸 (Seongsu): tartan and gingham checks.
  'tartan-mini-red': sk('mini', 'tartan', 'red', 0xc0283a, 0x1f2a4a),
  'tartan-mini-green': sk('mini', 'tartan', 'green', 0x2f6b4a, 0x1f2a4a),
  'gingham-mini-sky': sk('mini', 'gingham', 'sky', 0xffffff, 0x6fa3e0),
  'gingham-long-butter': sk('long', 'gingham', 'butter', 0xffffff, 0xf2c94c),
  'tartan-long-camel': sk('long', 'tartan', 'camel', 0xc49a6c, 0x5a3e2b),
  // 땡땡이 상점 (Seongsu): polka dots.
  'dots-mini-black': sk('mini', 'dots', 'black', 0x2b2b31, 0xffffff),
  'dots-mini-red': sk('mini', 'dots', 'red', 0xd8303f, 0xffffff),
  'dots-long-navy': sk('long', 'dots', 'navy', 0x2f3c66, 0xffffff),
  'dots-long-pink': sk('long', 'dots', 'pink', 0xf7b6c8, 0xffffff),
  // 꽃밭 스커트 (Seongsu): flowers.
  'floral-mini-cream': sk('mini', 'floral', 'cream', 0xf6eedc, 0xf07aa0),
  'floral-mini-sky': sk('mini', 'floral', 'sky', 0x8fbbe8, 0xffffff),
  'floral-long-butter': sk('long', 'floral', 'butter', 0xf6d77a, 0xffffff),
  'floral-long-black': sk('long', 'floral', 'black', 0x2b2b31, 0xe0405a),
  'floral-long-lilac': sk('long', 'floral', 'lilac', 0xc4b0ec, 0xfff6d6),
  // 날개 롱스커트 (Seongsu): plain colours, mostly long.
  'solid-mini-black': sk('mini', 'solid', 'black', 0x2b2b31),
  'solid-mini-camel': sk('mini', 'solid', 'camel', 0xc49a6c),
  'solid-long-cream': sk('long', 'solid', 'cream', 0xefe6d2),
  'solid-long-lilac': sk('long', 'solid', 'lilac', 0xb9a6f0),
  'solid-long-butter': sk('long', 'solid', 'butter', 0xffd36e),
  // 청치마 공장 (Hongdae): denim skirts.
  'denim-mini-dark': sk('mini', 'denim', 'dark', 0x34477a, 0xe0a640),
  'denim-mini-light': sk('mini', 'denim', 'light', 0x8fb0d6, 0xe0a640),
  'denim-long-dark': sk('long', 'denim', 'dark', 0x34477a, 0xe0a640),
  'denim-long-light': sk('long', 'denim', 'light', 0x8fb0d6, 0xe0a640),
  // 줄무늬 골목 (Hongdae): stripes.
  'stripe-mini-navy': sk('mini', 'stripe', 'navy', 0xffffff, 0x2f3c66),
  'stripe-mini-red': sk('mini', 'stripe', 'red', 0xffffff, 0xd8303f),
  'stripe-long-black': sk('long', 'stripe', 'black', 0xffffff, 0x2b2b31),
  'stripe-long-mint': sk('long', 'stripe', 'mint', 0xffffff, 0x6fcdb8),
  // 와일드 네온 (Hongdae): leopard and neon.
  'leopard-mini': sk('mini', 'leopard', null, 0xd9a35a, 0x3a2414),
  'leopard-long': sk('long', 'leopard', null, 0xd9a35a, 0x3a2414),
  'solid-mini-neonpink': sk('mini', 'solid', 'neonpink', 0xff2e8a),
  'solid-mini-lime': sk('mini', 'solid', 'lime', 0xb5e04a),
  'pleats-mini-black': sk('mini', 'pleats', 'black', 0x2b2b31),
};

// Hanbok skirts (chima): only worn with a rented hanbok (data/hanbok.js),
// never sold on their own, so they are kept out of SKIRTS.
export const CHIMAS = {
  'chima-red': sk('chima', 'pleats', 'red', 0xc8323f),
  'chima-navy': sk('chima', 'pleats', 'navy', 0x2f3c66),
  'chima-pink': sk('chima', 'pleats', 'pink', 0xf29bb6),
};

export const skirtById = (id) => (typeof id !== 'string' ? null
  : Object.hasOwn(SKIRTS, id) ? SKIRTS[id] : Object.hasOwn(CHIMAS, id) ? CHIMAS[id] : null);
