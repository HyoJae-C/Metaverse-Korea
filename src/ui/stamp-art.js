// Rubber-stamp art for the stamp tour, as SVG (used by the stamp note and
// the board on each stamp stand). The ink filter makes it look hand-pressed.
const FONT_NAME = `'Black Han Sans','Noto Sans KR','Apple SD Gothic Neo',sans-serif`;
const FONT_SMALL = `'Noto Sans KR','Apple SD Gothic Neo',sans-serif`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const INK = `<filter id="INK" x="-5%" y="-5%" width="110%" height="110%">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.25" result="m"/>
<feComposite in="SourceGraphic" in2="m" operator="in" result="c"/>
<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed="2" result="w"/>
<feDisplacementMap in="c" in2="w" scale="2.2"/></filter>`;
const TILT = [-6, 4, -3, 7, -5, 3, -8, 5];
let uid = 0;

// The stamp as a standalone <svg> string. `i` picks a little tilt.
export function stampSvg(s, i = 0, { ink = true } = {}) {
  const id = 'st' + (uid++), rot = TILT[i % TILT.length], c = s.color;
  const name = esc(s.name.ko), gu = esc(s.gu.ko);
  let frame, text;
  if (s.shape === 'circle') {
    frame = `<circle cx="100" cy="100" r="92" stroke-width="5"/><circle cx="100" cy="100" r="80" stroke-width="1.8"/><circle cx="100" cy="100" r="54" stroke-width="1.8" stroke-dasharray="2 4"/>`;
    text = `<path id="${id}t" d="M 34 100 a 66 66 0 0 1 132 0" fill="none" stroke="none"/><path id="${id}b" d="M 26 100 a 74 74 0 0 0 148 0" fill="none" stroke="none"/>
<text font-family="${FONT_NAME}" font-weight="900" font-size="21" letter-spacing="2" fill="${c}" stroke="none"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">${name}</textPath></text>
<text font-family="${FONT_SMALL}" font-weight="700" font-size="12" letter-spacing="3" fill="${c}" stroke="none"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">ANOTHER SEOUL · ${gu}</textPath></text>`;
  } else {
    frame = `<rect x="12" y="12" width="176" height="176" rx="22" stroke-width="5"/><rect x="22" y="22" width="156" height="156" rx="14" stroke-width="1.8"/>`;
    text = `<text x="100" y="48" text-anchor="middle" font-family="${FONT_NAME}" font-weight="900" font-size="${name.length > 6 ? 18 : 21}" fill="${c}" stroke="none">${name}</text>
<text x="100" y="164" text-anchor="middle" font-family="${FONT_SMALL}" font-weight="700" font-size="10" letter-spacing="1.2" fill="${c}" stroke="none">ANOTHER SEOUL · ${gu}</text>`;
  }
  const icon = s.shape === 'circle'
    ? `<g transform="translate(100 100) scale(.62) translate(-100 -96)">${s.icon}</g>`
    : `<g transform="translate(100 104) scale(.72) translate(-100 -96)">${s.icon}</g>`;
  const f = ink ? INK.replace('id="INK"', `id="${id}i"`) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs>${f}</defs><g ${ink ? `filter="url(#${id}i)"` : ''} transform="rotate(${rot} 100 100)" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".9">${frame}${text}${icon}</g></svg>`;
}
