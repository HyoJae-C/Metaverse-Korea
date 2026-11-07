// Hat workshop: pick a shape, colour and embroidered patch; the hat shows on
// your character while you edit, and Save keeps it (others see it too).
import { HAT_SHAPES, PALETTES, PATCHES, accessory } from '../data/appearance.js';
import { saveLook } from '../core/look-editor.js';
import { t } from '../core/i18n.js';

export function createHatWorkshop(game) {
  const { $, cam, setLook, shop } = game;
  let hatDraft = null, savedCam = null;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  function hatButtons(rowId, items, render, onPick) {
    const row = $(rowId);
    row.replaceChildren(...items.map((id) => {
      const b = document.createElement('button');
      b.className = 'hat-opt';
      b.dataset.id = id ?? '';
      render(b, id);
      b.onclick = () => { onPick(id); refreshHat(); };
      return b;
    }));
  }
  function refreshHat() {
    for (const [row, key] of [['hat-shapes', 'head'], ['hat-colors', 'hatColor'], ['hat-patches', 'hatPatch']]) {
      for (const b of $(row).children) b.classList.toggle('on', (hatDraft[key] ?? '') === b.dataset.id);
    }
    setLook(hatDraft);
  }
  function openHatWorkshop() {
    hatDraft = { ...game.myLook, head: HAT_SHAPES.includes(game.myLook.head) ? game.myLook.head : 'bucket', hatColor: game.myLook.hatColor || 'butter' };
    hatButtons('hat-shapes', HAT_SHAPES, (b, id) => { b.textContent = accessory('head', id).emoji; b.title = id; }, (id) => { hatDraft.head = id; });
    hatButtons('hat-colors', Object.keys(PALETTES.hat), (b, id) => { b.style.background = hex(PALETTES.hat[id]); b.classList.add('swatch'); b.title = id; }, (id) => { hatDraft.hatColor = id; });
    hatButtons('hat-patches', [null, ...Object.keys(PATCHES)], (b, id) => { b.textContent = id ? PATCHES[id] : '∅'; }, (id) => { hatDraft.hatPatch = id; });
    $('hat-panel').hidden = false;
    savedCam = { ...cam };
    Object.assign(cam, { dist: 2.6, pitch: 0.12, yaw: game.me.root.rotation.y }); // close-up, facing you
    refreshHat();
  }
  function closeHatWorkshop(save) {
    if (!hatDraft) return;
    $('hat-panel').hidden = true;
    if (save) {
      game.myLook = { ...hatDraft };
      saveLook(game.myLook);
      shop.toast(t('hat.saved'));
    }
    setLook(game.myLook);
    hatDraft = null;
    if (savedCam) Object.assign(cam, savedCam);
  }
  $('hat-save').onclick = () => closeHatWorkshop(true);
  $('hat-cancel').onclick = () => closeHatWorkshop(false);
  return { closeHatWorkshop, openHatWorkshop, get hatDraft() { return hatDraft; } };
}
