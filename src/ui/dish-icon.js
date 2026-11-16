// The cooking-class dishes as small pictures of their 3D models (no emoji
// fits them: kimchi came out as a jar, like perfume). One sprite sheet,
// public/assets/food/dish-icons.webp, made by scripts/dish-icons.html.
import { isKimchi } from '../core/kimchi-market.js';

export const DISH_ICONS = ['kimchi', 'japchae', 'kimbap', 'tteok', 'bibimbap'];
// A bag entry's (or a recipe's) picture id, or null if it has none.
export const dishIconId = (e) => { const id = typeof e === 'string' ? e : isKimchi(e) ? 'kimchi' : e?.g; return DISH_ICONS.includes(id) ? id : null; };
export function dishIcon(id, cls = '') {
  const s = document.createElement('span');
  s.className = 'dish-icon' + (cls ? ' ' + cls : '');
  s.style.backgroundPosition = `${(DISH_ICONS.indexOf(id) / (DISH_ICONS.length - 1)) * 100}% 0`;
  s.setAttribute('aria-hidden', 'true');
  return s;
}
