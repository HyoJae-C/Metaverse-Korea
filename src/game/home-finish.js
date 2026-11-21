// Wallpaper, flooring and doors in Decorate (core/home-finish.js): a row of
// the wallpapers I own, a row of the floors and a row of the doors, each with "Basic" (the room's own
// look) first. The choice is saved in mk.homeFinish and sent to visitors
// (game/home-visits.js). The patterns load with the rooms
// (core/home-finish-art.js).
import { FINISHES, cleanFinish, finishById, readFinish, writeFinish } from '../core/home-finish.js';
import { getLanguage, localName, onLanguageChange, t } from '../core/i18n.js';

export function createHomeFinish(game) {
  const { $, inventory } = game;
  let built = null, guest = false, shown = cleanFinish(null);
  const owns = (id) => inventory.has(id);
  const mine = () => readFinish(owns);
  const art = () => import('../core/home-finish-art.js');
  function put(sel) {
    shown = sel;
    const b = built;
    if (b) art().then((m) => { if (built === b) m.applyFinish(b, shown); }).catch(() => {});
  }

  const box = document.createElement('div');
  box.className = 'finish-rows';
  box.id = 'finish-rows';
  $('decor-grid').before(box);
  function chip(kind, f) {
    const b = document.createElement('button');
    b.className = 'chip finish-chip';
    const sw = document.createElement('i');
    sw.className = 'finish-swatch';
    sw.style.background = f ? `linear-gradient(135deg, ${f.swatch[0]} 55%, ${f.swatch[1]} 55%)` : 'repeating-linear-gradient(45deg, #fff 0 4px, #e6ded2 4px 8px)';
    const name = document.createElement('span');
    name.textContent = f ? localName(f.name, getLanguage()) : t('finish.basic');
    b.append(sw, name);
    b.dataset.kind = kind;
    b.dataset.id = f?.id || '';
    b.onclick = () => choose(kind, f?.id || null);
    return b;
  }
  function label() {
    const rows = [];
    for (const [kind, icon] of [['wall', '🧱'], ['floor', '🪵'], ['door', '🚪']]) {
      const have = FINISHES.filter((f) => f.kind === kind && owns(f.id));
      if (!have.length) continue;
      const row = document.createElement('div');
      row.className = 'visit-row finish-row';
      const head = document.createElement('span');
      head.textContent = icon + ' ' + t('finish.' + kind);
      row.append(head, chip(kind, null), ...have.map((f) => chip(kind, f)));
      rows.push(row);
    }
    if (!rows.length) { // nothing bought yet: where to buy it
      const p = document.createElement('p');
      p.className = 'fine';
      p.textContent = '🧱 ' + t('finish.where');
      rows.push(p);
    }
    box.replaceChildren(...rows);
    mark();
  }
  function mark() {
    const sel = mine();
    for (const b of box.querySelectorAll('.finish-chip')) b.classList.toggle('on', (sel[b.dataset.kind] || '') === b.dataset.id);
  }
  function choose(kind, id) {
    if (guest) return;
    if (id && !owns(id)) return;
    const sel = { ...mine(), [kind]: id };
    writeFinish(sel);
    mark();
    put(cleanFinish(sel, owns));
    game.onLayout?.(); // (visitors see it too)
  }
  label();
  onLanguageChange(label);

  return {
    label,
    // Walked into a home (decor.js): mine, or someone else's (their choice
    // comes in show()).
    open(b, isGuest) {
      built = b; guest = !!isGuest;
      put(guest ? cleanFinish(null) : mine());
    },
    close() { built = null; guest = false; },
    show(v) { if (guest) put(cleanFinish(v)); }, // the host's choice, sent by their game
    current: () => (guest ? null : mine()), // to send to visitors
    byId: finishById,
  };
}
