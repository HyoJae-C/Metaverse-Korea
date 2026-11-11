// Developer codes for trying looks: "/랜덤복장789" puts a random item on in
// every outfit slot (clothes, trousers or a skirt, shoes, hat, glasses,
// earrings, neck, bag, paws), from every wearable item, owned or not. It only
// changes the look: nothing is added to the bag, so nothing needs a receipt.
// "/원래복장789" puts the look from before the first random one back on.
// Only the codes' SHA-256 is kept here. Not security: anyone can change their
// own browser, and a look is just a look.
import { ITEMS } from '../core/inventory.js';
import { saveLook } from '../core/look-editor.js';
import { L } from '../ui/pocha-ui.js';

const RANDOM = 'f3d657de53757fbc879d2e2aa75cb4c8f9d2ab13eab7fe040280627415cb3428';
const BACK = '1efd4f4638bb28b24bd53dea8224f9658f30cced2d6ca81e7241fa3028fa240c';
const SAVED = 'mk.lookBeforeRandom';
const TEXT = {
  random: { en: '🎲 Random outfit on. /원래복장789 to go back', ko: '🎲 랜덤 복장! 되돌리려면 /원래복장789' },
  back: { en: '👕 Your outfit is back', ko: '👕 원래 복장으로 돌아왔어요' },
  none: { en: 'No outfit to go back to', ko: '되돌릴 복장이 없어요' },
};

// Wearable items grouped by the look part they change ("model", "pants",
// "shoes", "head", ...). A skirt and trousers share the "bottom" slot.
export function outfitSlots(items = ITEMS) {
  const slots = {};
  for (const [id, it] of Object.entries(items)) {
    if (!it?.wear) continue;
    const keys = Object.keys(it.wear).filter((k) => it.wear[k] != null);
    if (keys.length !== 1) continue;
    const slot = keys[0] === 'pants' || keys[0] === 'skirt' ? 'bottom' : keys[0];
    (slots[slot] ||= []).push(id);
  }
  return slots;
}

// The look with one random item from every slot put on (hair, skin, face and
// badges stay as they were).
export function randomLook(look, items = ITEMS, rand = Math.random) {
  let next = { ...look };
  for (const ids of Object.values(outfitSlots(items))) {
    const id = ids[Math.floor(rand() * ids.length)];
    next = { ...next, ...items[id].wear };
  }
  if (next.skirt) next.pants = look.pants ?? next.pants; // keep a pair underneath for later
  return next;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text).trim()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function outfitCode(code) {
  if (!globalThis.crypto?.subtle) return null;
  const h = await sha256(code);
  return h === RANDOM ? 'random' : h === BACK ? 'back' : null;
}

// Runs a code on the game (game.myLook, game.setLook, game.shop). True when it was one.
export async function runOutfitCode(game, code) {
  const kind = await outfitCode(code);
  if (!kind) return false;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVED) || 'null'); } catch { /* broken or blocked */ }
  if (kind === 'random') {
    // Remember the real look only once, so several random ones in a row still go back to it.
    if (!saved) try { localStorage.setItem(SAVED, JSON.stringify(game.myLook)); } catch { /* storage blocked */ }
    game.myLook = randomLook(game.myLook);
    game.shop.toast(L(TEXT.random));
  } else {
    if (!saved) { game.shop.toast(L(TEXT.none)); return true; }
    try { localStorage.removeItem(SAVED); } catch { /* storage blocked */ }
    game.myLook = { ...saved, ...(game.myLook.op ? { op: true } : {}) };
    if (!game.myLook.op) delete game.myLook.op;
    game.shop.toast(L(TEXT.back));
  }
  saveLook(game.myLook);
  game.setLook(game.myLook);
  return true;
}
