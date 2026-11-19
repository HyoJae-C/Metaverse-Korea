// The game guide's panel (❓): a short book of topics that open and close.
// Downloaded with its text the first time ❓ is tapped (game/help-book.js);
// its few styles come with it, so the first download only has the button.

const CSS = `
.sheet.help-panel { z-index: 8; max-height: min(78vh, 640px); overflow-y: auto; display: grid; gap: 8px; align-content: start; }
.help-panel .help-title { margin: 0; padding-inline-end: 40px; font-size: 19px; font-weight: 900; }
.help-panel .help-intro { margin: 0 0 2px; font-size: 13px; opacity: .8; line-height: 1.5; }
.help-panel details { background: #fff; border-radius: 14px; box-shadow: 0 2px 0 rgba(74, 63, 53, .12); }
.help-panel summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 8px 14px; font-weight: 800; font-size: 15px; }
.help-panel summary::-webkit-details-marker { display: none; }
.help-panel summary .help-ico { font-size: 22px; width: 28px; text-align: center; flex: none; }
.help-panel summary::after { content: '▾'; margin-inline-start: auto; opacity: .5; transition: transform .15s; }
.help-panel details[open] summary::after { transform: rotate(180deg); }
.help-panel ul { margin: 0; padding: 0 16px 12px 52px; display: grid; gap: 7px; font-size: 14px; line-height: 1.55; }
html[dir="rtl"] .help-panel ul, body.rtl .help-panel ul { padding: 0 52px 12px 16px; }
.help-panel li { overflow-wrap: anywhere; word-break: keep-all; }
`;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export class HelpUI {
  // root: the empty #help-panel sheet. conv: turns each text into the
  // language shown (繁體中文 is made from the simplified text).
  constructor({ root, conv = (s) => s }) {
    this.root = root;
    this.conv = conv;
    this.book = null;
    if (!document.getElementById('help-css')) {
      const s = el('style', null, CSS);
      s.id = 'help-css';
      document.head.append(s);
    }
  }

  get open() { return !this.root.hidden; }

  // book: { title, intro, sections: [{ icon, title, lines }] } (src/help/<lang>.js)
  setBook(book) {
    this.book = book;
    this.render();
  }

  render() {
    const { root, book, conv } = this;
    if (!book) return;
    const keep = [...root.querySelectorAll('details')].map((d) => d.open);
    root.replaceChildren();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    root.append(x, el('h2', 'help-title', '❓ ' + conv(book.title)), el('p', 'help-intro', conv(book.intro)));
    book.sections.forEach((s, i) => {
      const d = el('details');
      d.open = keep.length ? !!keep[i] : i === 0;
      const sum = el('summary');
      sum.append(el('span', 'help-ico', s.icon), el('span', null, conv(s.title)));
      const ul = el('ul');
      for (const line of s.lines) ul.append(el('li', null, conv(line)));
      d.append(sum, ul);
      root.append(d);
    });
  }

  show() { this.root.hidden = false; this.root.scrollTop = 0; }
  close() { this.root.hidden = true; }
  toggle() { if (this.open) this.close(); else this.show(); }
}
