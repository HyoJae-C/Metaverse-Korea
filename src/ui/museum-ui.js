// The card for one painting in the museum (core/museum.js): the picture,
// its title, artist and story in Korean and English, and the credit line
// (국립중앙박물관, 공공누리 제1유형) with a link to the museum's own page.
import { getLanguage, localName } from '../core/i18n.js';
import { CREDIT, DISCLAIMER } from '../data/paintings.js';
import { paintingUrl } from '../core/museum.js';

export const MUSEUM_TEXT = {
  look: { en: 'Look at the painting', ko: '그림 보기', ja: '絵を見る', zh: '看画', es: 'Ver la pintura', id: 'Lihat lukisan', vi: 'Xem tranh', hi: 'चित्र देखें', ar: 'شاهد اللوحة' },
  source: { en: 'See it on the museum’s site', ko: '박물관 사이트에서 보기', ja: '博物館のサイトで見る', zh: '在博物馆网站查看', es: 'Verla en el sitio del museo', id: 'Lihat di situs museum', vi: 'Xem trên trang của bảo tàng', hi: 'संग्रहालय की साइट पर देखें', ar: 'شاهدها على موقع المتحف' },
  credit: { en: 'Image', ko: '이미지', ja: '画像', zh: '图片', es: 'Imagen', id: 'Gambar', vi: 'Ảnh', hi: 'तस्वीर', ar: 'الصورة' },
};
const T = (k) => localName(MUSEUM_TEXT[k], getLanguage());

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class MuseumUI {
  constructor({ root }) { this.root = root; }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }

  show(p) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    const img = el('img', 'museum-img');
    img.src = paintingUrl(p);
    img.alt = `${p.title.en} (${p.title.ko})`;
    img.decoding = 'async';
    const ko = el('div', 'museum-lang');
    ko.lang = 'ko';
    ko.append(el('h3', null, p.title.ko), el('p', 'museum-meta', [p.artist.ko, p.era.ko, p.set?.ko].filter(Boolean).join(' · ')), el('p', null, p.desc.ko));
    const en = el('div', 'museum-lang');
    en.lang = 'en';
    en.append(el('h3', null, p.title.en), el('p', 'museum-meta', [p.artist.en, p.era.en, p.set?.en].filter(Boolean).join(' · ')), el('p', null, p.desc.en));
    const link = el('a', null, T('source') + ' ↗');
    link.href = p.page;
    link.target = '_blank';
    link.rel = 'noopener';
    const credit = el('p', 'museum-credit', `🖼️ ${T('credit')}: ${CREDIT.ko} (${CREDIT.en}) · ${p.no} · `);
    credit.append(link);
    this.root.replaceChildren(x, img, ko, en, credit, el('p', 'fine', localName(DISCLAIMER, getLanguage())));
    this.root.hidden = false;
  }
}
