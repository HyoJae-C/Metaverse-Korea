// "Buy me a coffee" poster: one per district, on an empty AD SPACE lot
// (core/ad-posters.js) or a wall, never more, so it stays a friendly note
// and not an ad wall. Shows English and switches to the player's language
// with the sign-translate button, like the other street posters.
// The QR (public/ads/support-qr.png) points at config.supportUrl.
import * as THREE from 'three';
import { localName } from './i18n.js';

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

export const SUPPORT_TEXT = {
  head: {
    en: 'Enjoying Modu Seoul?', ko: '모두서울, 재밌으셨나요?', ja: 'モドゥ・ソウル、楽しんでる？',
    zh: '喜欢Modu Seoul吗？', es: '¿Te gusta Modu Seoul?', vi: 'Bạn thích Modu Seoul chứ?',
    id: 'Suka Modu Seoul?', ar: 'هل تستمتع بـ Modu Seoul؟', hi: 'Modu Seoul पसंद आया?',
    fr: 'Tu aimes Modu Seoul ?',
    th: 'ชอบ Modu Seoul ไหม?',
  },
  body: {
    en: 'One person makes this city.', ko: '이 도시는 한 사람이 만들고 있어요.', ja: 'この街は一人で作っています。',
    zh: '这座城市由一个人制作。', es: 'Esta ciudad la hace una sola persona.', vi: 'Thành phố này do một người làm.',
    id: 'Kota ini dibuat oleh satu orang.', ar: 'يصنع هذه المدينة شخص واحد.', hi: 'इस शहर को एक व्यक्ति बना रहा है।',
    fr: 'Une seule personne crée cette ville.',
    th: 'เมืองนี้สร้างโดยคนคนเดียว',
  },
  ask: {
    en: 'A coffee keeps it growing!', ko: '커피 한 잔이 큰 힘이 돼요!', ja: 'コーヒー1杯が力になります！',
    zh: '请我喝杯咖啡吧！', es: '¡Un café ayuda a que crezca!', vi: 'Một ly cà phê giúp nó lớn lên!',
    id: 'Secangkir kopi membantu!', ar: 'فنجان قهوة يساعد على نموّها!', hi: 'एक कॉफ़ी से यह बढ़ता रहेगा!',
    fr: 'Un café l\'aide à grandir !',
    th: 'กาแฟหนึ่งแก้วช่วยให้เมืองเติบโต!',
  },
  how: {
    en: 'Scan, or ⚙️ Settings → Support', ko: 'QR 스캔 또는 ⚙️ 설정 → 후원', ja: 'QRか ⚙️ 設定 → 応援',
    zh: '扫码或 ⚙️ 设置 → 支持', es: 'Escanea o ⚙️ Ajustes → Apoyar', vi: 'Quét mã hoặc ⚙️ Cài đặt → Ủng hộ',
    id: 'Pindai atau ⚙️ Pengaturan → Dukung', ar: 'امسح الرمز أو ⚙️ الإعدادات ← ادعم', hi: 'स्कैन करें या ⚙️ सेटिंग्स → सहयोग',
    fr: 'Scanne, ou ⚙️ Réglages → Soutenir',
    th: 'สแกน หรือ ⚙️ การตั้งค่า → สนับสนุน',
  },
};

const fitFont = (g, text, px, weight, maxW, min = 14) => {
  g.font = `${weight} ${px}px ${FONT}`;
  while (g.measureText(text).width > maxW && px > min) g.font = `${weight} ${(px -= 2)}px ${FONT}`;
};

// Two-line wrap for the narrow text column.
function wrap(g, text, maxW) {
  if (g.measureText(text).width <= maxW) return [text];
  const words = text.split(' ');
  if (words.length < 2) return [text];
  let best = [text], bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(g.measureText(a).width, g.measureText(b).width);
    if (w < bw) { bw = w; best = [a, b]; }
  }
  return best;
}

// Draw on any canvas (designed at 640×400). qr: a loaded image or null.
export function drawSupport(g, lang, qr, label = '') {
  const { width: W, height: H } = g.canvas;
  const s = H / 400;
  const t = (k) => localName(SUPPORT_TEXT[k], lang);
  g.fillStyle = '#ffdd00'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(((i * 173) % 640) * s, ((i * 97) % 400) * s, (10 + (i % 3) * 8) * s, 0, Math.PI * 2); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const cx = 205 * s, colW = 360 * s;
  g.font = `${96 * s}px ${FONT}`;
  g.fillText('☕', cx, 70 * s);
  g.fillStyle = '#1d1d1f';
  fitFont(g, t('head'), 38 * s, 900, colW * 1.6);
  const head = wrap(g, t('head'), colW);
  if (head.length > 1 || g.measureText(head[0]).width > colW) fitFont(g, head.reduce((a, b) => (a.length > b.length ? a : b)), 38 * s, 900, colW);
  head.forEach((line, i) => g.fillText(line, cx, (head.length > 1 ? 140 : 156) * s + i * 40 * s));
  g.fillStyle = '#4a3f35';
  fitFont(g, t('body'), 26 * s, 700, colW);
  g.fillText(t('body'), cx, 236 * s);
  fitFont(g, t('ask'), 28 * s, 800, colW);
  g.fillText(t('ask'), cx, 276 * s);
  // Plate with how to find it in the game.
  g.fillStyle = '#1d1d1f';
  g.fillRect(28 * s, 318 * s, colW + 10 * s, 52 * s);
  g.fillStyle = '#fff';
  fitFont(g, t('how'), 24 * s, 800, colW - 16 * s);
  g.fillText(t('how'), cx, 345 * s);
  // QR on a white card.
  const qx = 412 * s, qy = 70 * s, qs = 204 * s;
  g.fillStyle = '#fff';
  g.fillRect(qx - 10 * s, qy - 10 * s, qs + 20 * s, qs + 20 * s);
  if (qr) g.drawImage(qr, qx, qy, qs, qs);
  if (label) {
    g.fillStyle = '#1d1d1f';
    fitFont(g, label, 20 * s, 700, qs + 16 * s);
    g.fillText(label, qx + qs / 2, qy + qs + 40 * s);
  }
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3 * s;
  g.strokeRect(6 * s, 6 * s, W - 12 * s, H - 12 * s);
}

// A canvas texture that redraws when the language changes or the QR loads.
export function supportTexture(lang, { qrUrl, label = '' } = {}, w = 640, h = 400) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  let qr = null, cur = lang;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.redraw = (l = cur) => { cur = l; drawSupport(g, l, qr, label); tex.needsUpdate = true; };
  tex.redraw(lang);
  if (qrUrl) {
    const img = new Image();
    img.onload = () => { qr = img; tex.redraw(); };
    img.src = qrUrl;
  }
  return tex;
}

// One spot per district: the free poster spot nearest a point people pass
// (`hubs`: { district: { x, z } }). spots: [{ id, b: { d }, front: { x, z } }].
export function pickSupportSpots(spots, hubs, isFree = () => true) {
  const out = {};
  for (const sp of spots) {
    const d = sp.b.d || 'map';
    const hub = hubs[d];
    if (!hub || !isFree(sp)) continue;
    const dist = Math.hypot(sp.front.x - hub.x, sp.front.z - hub.z);
    if (!out[d] || dist < out[d].dist) out[d] = { id: sp.id, dist };
  }
  return out;
}
