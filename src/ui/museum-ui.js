// The card for one painting in the museum (core/museum.js): the picture,
// its title, artist and story in Korean and English, and the credit line
// (국립중앙박물관, 공공누리 제1유형) with a link to the museum's own page.
import { getLanguage, localName } from '../core/i18n.js';
import { CREDIT, DISCLAIMER, FLOORS, COMING_SOON } from '../data/paintings.js';
import { paintingUrl, hallsOn } from '../core/museum.js';
import { NOT_TRANSLATED } from '../data/war-memorial.js';

export const MUSEUM_TEXT = {
  look: { en: 'Look at the painting', ko: '그림 보기', ja: '絵を見る', zh: '看画', es: 'Ver la pintura', id: 'Lihat lukisan', vi: 'Xem tranh', hi: 'चित्र देखें', ar: 'شاهد اللوحة' },
  source: { en: 'See it on the National Museum of Korea site', ko: '국립중앙박물관 사이트에서 보기', ja: '国立中央博物館のサイトで見る', zh: '在国立中央博物馆网站查看', es: 'Verla en el sitio del Museo Nacional de Corea', id: 'Lihat di situs Museum Nasional Korea', vi: 'Xem trên trang của Bảo tàng Quốc gia Hàn Quốc', hi: 'राष्ट्रीय कोरिया संग्रहालय की साइट पर देखें', ar: 'شاهدها على موقع المتحف الوطني الكوري' },
  lift: { en: 'Elevator', ko: '엘리베이터', ja: 'エレベーター', zh: '电梯', es: 'Ascensor', id: 'Lift', vi: 'Thang máy', hi: 'लिफ़्ट', ar: 'المصعد' },
  pick: { en: 'Which floor?', ko: '몇 층으로 갈까요?', ja: '何階に行きますか？', zh: '去几楼？', es: '¿A qué planta?', id: 'Ke lantai berapa?', vi: 'Lên tầng mấy?', hi: 'किस मंज़िल पर?', ar: 'أي طابق؟' },
  here: { en: 'You are here', ko: '지금 있는 층', ja: '現在の階', zh: '当前楼层', es: 'Estás aquí', id: 'Anda di sini', vi: 'Bạn đang ở đây', hi: 'आप यहाँ हैं', ar: 'أنت هنا' },
  credit: { en: 'Image', ko: '이미지', ja: '画像', zh: '图片', es: 'Imagen', id: 'Gambar', vi: 'Ảnh', hi: 'तस्वीर', ar: 'الصورة' },
};
const T = (k) => localName(MUSEUM_TEXT[k], getLanguage());

// The War History Museum's history text comes in Korean, English, Japanese
// and Chinese (data/war-memorial.js): a card shows Korean and the player's
// language, or Korean and English with a notice in the other languages.
const langsShown = () => {
  const l = getLanguage();
  return l === 'ko' || !['en', 'ja', 'zh', 'zht'].includes(l) ? ['ko', 'en'] : ['ko', l];
};
const notTranslated = () => {
  const text = NOT_TRANSLATED[getLanguage()];
  return text && !['en', 'ko'].includes(getLanguage()) ? el('p', 'museum-notice', text) : null;
};

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
    img.onerror = () => { img.hidden = true; }; // (a War Memorial photo not added yet)
    // Korean and English; a War History Museum photo shows Korean and the
    // player's language where it has one (see langsShown).
    const blocks = (p.credit ? langsShown() : ['ko', 'en']).map((lang) => {
      const b = el('div', 'museum-lang');
      b.lang = lang === 'zht' ? 'zh-Hant' : lang;
      const L2 = (o) => (o ? localName(o, lang) : null);
      b.append(el('h3', null, L2(p.title)), el('p', 'museum-meta', [L2(p.artist), L2(p.era), L2(p.set)].filter(Boolean).join(' · ')), el('p', null, L2(p.desc)));
      return b;
    });
    const notice = p.credit ? notTranslated() : null;
    // A painting from the museum, or a War Memorial photo with its own credit.
    const credit0 = p.credit || CREDIT, disclaimer = p.disclaimer || DISCLAIMER;
    const link = el('a', null, (p.source ? localName(p.source, getLanguage()) : T('source')) + ' ↗');
    link.href = p.page;
    link.target = '_blank';
    link.rel = 'noopener';
    const credit = el('p', 'museum-credit', `🖼️ ${T('credit')}: ${credit0.ko} (${credit0.en}) · ${p.no} · `);
    credit.append(link);
    this.root.replaceChildren(x, img, ...(notice ? [notice] : []), ...blocks, credit, el('p', 'fine', localName(disclaimer, getLanguage())));
    this.root.hidden = false;
  }

  // A reading panel (the War History Museum's lobby boards): a title and
  // paragraphs in Korean, then in English.
  // t: { title, lines: [{ ko, en, ja, zh }] }.
  showText(t) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    const parts = [x];
    const notice = notTranslated();
    if (notice) parts.push(notice);
    for (const lang of langsShown()) {
      const box = el('div', 'museum-lang');
      box.lang = lang === 'zht' ? 'zh-Hant' : lang;
      box.append(el('h3', null, localName(t.title, lang)), ...t.lines.map((line) => el('p', null, localName(line, lang))));
      parts.push(box);
    }
    this.root.replaceChildren(...parts);
    this.root.hidden = false;
  }

  // The lift: one button per floor, with the halls on it.
  // floors: [{ floor, lines }] for another museum (the War History Museum);
  // the art museum's floors and halls by default.
  showLift(current, go, floors) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    const ko = getLanguage() === 'ko';
    floors ||= FLOORS.map((f) => ({
      floor: f,
      lines: hallsOn(f).map((h) => `${h.side} · ${ko ? h.name.ko : h.name.en}${h.paintings.length ? '' : ` · ${ko ? COMING_SOON.ko : COMING_SOON.en}`}`),
    }));
    const list = el('div', 'museum-floors');
    for (const { floor: f, lines } of [...floors].reverse()) {
      const b = el('button', 'museum-floor');
      b.disabled = f === current;
      b.append(el('b', null, `${f}F`));
      const halls = el('span');
      for (const line of lines) halls.append(el('span', null, line));
      if (f === current) halls.append(el('em', null, T('here')));
      b.append(halls);
      b.onclick = () => { this.close(); go(f); };
      list.append(b);
    }
    this.root.replaceChildren(x, el('h3', null, `🛗 ${T('lift')}`), el('p', 'museum-meta', T('pick')), list);
    this.root.hidden = false;
  }
}
