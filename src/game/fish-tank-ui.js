// The fish tank panel: walk up to a tank at home (game/decor.js tankAct) to
// see what swims in it, put in fish from your fish bag, or take them back
// out to sell. Loaded with import() the first time it opens.
import { t, getLanguage, localName } from '../core/i18n.js';
import { fishById, BAG_MAX } from '../core/fishing.js';
import { TankStore, tankById, used, blockedBy, sizeClass, spacesOf, NO_TANK } from '../core/fish-tank.js';
import { el, fishStampIcon } from '../ui/fishing-ui.js';

// root: where the panel goes; bag: the FishBag; toast(text); onChange(tankId)
// after a fish moves (the tank redraws, visitors see it).
export function createTankPanel({ root, bag, toast, onChange }) {
  const box = el('div', 'sheet order-panel tank-panel');
  box.hidden = true;
  root.append(box);
  let tankId = null;
  const name = (f) => (getLanguage() === 'ko' ? f.ko : localName(f.name, getLanguage()));
  const why = (k) => t({ size: 'tank.tooBig', full: 'tank.full', bagFull: 'tank.bagFull', one: 'tank.onlyOne' }[k] || 'tank.full');

  function row(f, n, button, onClick, note) {
    const r = el('div', 'tank-row');
    const b = el('button', 'chip', button);
    b.disabled = !onClick;
    if (onClick) b.onclick = onClick;
    const label = el('span', 'tank-name', `${name(f)}${n > 1 ? ' ×' + n : ''} `);
    label.append(el('small', 'tank-size', `${sizeClass(f.id)} · ${t('tank.spaces', { n: spacesOf(f.id) })}`));
    r.append(fishStampIcon(f, 'fish-emoji'), label, note ? el('small', 'tank-note', note) : b);
    return r;
  }
  function render() {
    const tank = tankById(tankId), store = new TankStore();
    const list = store.list(tankId);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = close;
    box.replaceChildren(x, el('h3', null, `${tank.emoji} ${localName(tank.name, getLanguage())}`),
      el('p', 'tank-space', `🐟 ${list.length} / ${tank.fish} · ` + t('tank.space', { n: used(list), max: tank.spaces, size: tank.max })));
    // In the tank, a row a kind.
    box.append(el('h4', null, t('tank.inTank')));
    if (!list.length) box.append(el('p', 'tank-empty', t('tank.empty')));
    const kinds = [...new Set(list)];
    for (const id of kinds) {
      const f = fishById(id);
      box.append(row(f, list.filter((k) => k === id).length, '↩ ' + t('tank.take'), () => {
        const err = store.take(bag, tankId, id);
        if (err) { toast(why(err)); return; }
        onChange?.(tankId);
        render();
      }));
    }
    // From the fish bag: what fits, then what's too big (greyed, with why).
    box.append(el('h4', null, t('tank.fromBag', { n: bag.size, max: BAG_MAX })));
    const mine = bag.list();
    if (!mine.length) box.append(el('p', 'tank-empty', t('tank.noFish')));
    for (const { fish: f, n } of mine) {
      const err = blockedBy(tank, list, f.id);
      box.append(row(f, n, '➕ ' + t('tank.put'), err === 'size' ? null : () => {
        const e = store.put(bag, tankId, f.id);
        if (e) { toast(why(e)); return; }
        onChange?.(tankId);
        render();
      }, err === 'size' ? t(NO_TANK.has(f.id) ? 'tank.noHuge' : 'tank.tooBig') : null));
    }
    box.append(el('p', 'tank-hint', t('tank.note')));
  }
  function open(id) { tankId = id; box.hidden = false; render(); }
  function close() { box.hidden = true; tankId = null; }
  return { open, close, get isOpen() { return !box.hidden; }, get tankId() { return tankId; } };
}
