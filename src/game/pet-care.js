// My pet: adopt at the pet shop (coins) or by code, then take it for walks.
// It poops now and then on the street; clean up within CLEAN_SECONDS or a
// fine notice (과태료) takes FINE coins. The poop is then cleared by the city.
//
// Moved out of main.js. The game's live state (the player, the scene, the
// wallet…) comes in through `g`, whose getters are read only when needed, so
// this can be created before everything it uses exists.
import { t, getLanguage } from '../core/i18n.js';
import { Companion, PoopTimers, makePoop, CLEAN_SECONDS, FINE } from '../core/companion.js';
import { ITEMS } from '../core/inventory.js';
import { customPetName } from '../core/pet-names.js';
import { say } from '../core/npcs.js';
import { L } from '../ui/pocha-ui.js';

const $ = (id) => document.getElementById(id);
const PET_KEY = 'mk.pet';

export const PET_NAME_TEXT = {
  rename: { en: 'Name', ko: '이름 짓기', ja: '名前をつける', zh: '起名', es: 'Nombre', ar: 'الاسم', vi: 'Đặt tên', hi: 'नाम रखें', fr: 'Nom', th: 'ชื่อ', id: 'Beri nama' },
  save: { en: 'Save', ko: '저장', ja: '保存', zh: '保存', es: 'Guardar', ar: 'حفظ', vi: 'Lưu', hi: 'सेव करें', fr: 'Enregistrer', th: 'บันทึก', id: 'Simpan' },
  placeholder: { en: 'Your pet\'s name', ko: '반려동물 이름', ja: 'ペットの名前', zh: '宠物的名字', es: 'Nombre de tu mascota', ar: 'اسم حيوانك', vi: 'Tên thú cưng', hi: 'पालतू का नाम', fr: 'Le nom de ton animal', th: 'ชื่อสัตว์เลี้ยงของคุณ', id: 'Nama hewanmu' },
  named: { en: 'Your pet is now called {name}!', ko: '이제 이름은 {name}이에요!', ja: 'これからの名前は{name}！', zh: '它现在叫{name}啦！', es: '¡Ahora se llama {name}!', ar: 'اسمه الآن {name}!', vi: 'Giờ bé tên là {name}!', hi: 'अब इसका नाम {name} है!', fr: 'Ton animal s\'appelle maintenant {name} !', th: 'ตอนนี้สัตว์เลี้ยงของคุณชื่อ {name} แล้ว!', id: 'Sekarang namanya {name}!' },
  hint: { en: 'Give it your own name in the bag (✏️).', ko: '가방(✏️)에서 이름을 직접 지어 줄 수 있어요.', ja: 'バッグ(✏️)で名前をつけられます。', zh: '可以在包里(✏️)给它起名字。', es: 'Ponle nombre en la bolsa (✏️).', ar: 'سمِّه من الحقيبة (✏️).', vi: 'Đặt tên cho bé trong túi (✏️).', hi: 'बैग (✏️) में इसका नाम रखें।', fr: 'Donne-lui ton propre nom dans le sac (✏️).', th: 'ตั้งชื่อเองได้ในกระเป๋า (✏️)', id: 'Beri nama di tas (✏️).' },
};

// Korean subject particle after a name: 이 after a final consonant, else 가.
const subjectParticle = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이' : '가'; };
// The name you gave your pet (bag → ✏️), else the shop's name.
export const petName = (id) => {
  const own = customPetName(id), def = ITEMS[id]?.pet;
  if (own) return own;
  return getLanguage() === 'ko' ? def.name : `${def.rom} (${def.name})`;
};

/**
 * g: { me, scene, activeScene, mode, riding, seated, clerk, inventory, wallet,
 * shop, sfx, fences (keep-out boxes, or null) } as getters, plus clearAction(), refreshQuestChip(),
 * refreshItems() and refreshWallet().
 */
export function createPetCare(g) {
  let pet = null; // Companion
  const poopTimers = new PoopTimers();
  const poops = new Map(); // id -> { id, mesh, x, z }

  function setPet(id) {
    pet?.dispose();
    pet = null;
    if (id && g.inventory.has(id) && ITEMS[id]?.pet) {
      pet = new Companion(id, ITEMS[id].pet);
      g.activeScene.add(pet.root);
      pet.place(g.me.root.position.x, g.me.root.position.z, g.me.root.rotation.y, g.me.root.position.y);
    }
    try { if (pet) localStorage.setItem(PET_KEY, id); else localStorage.removeItem(PET_KEY); } catch { /* storage blocked */ }
    g.refreshQuestChip();
    if (!$('wallet-panel').hidden || !$('bag-panel').hidden) g.refreshItems();
  }
  // Bring back the pet I was walking last time.
  function restorePet() {
    try { const saved = localStorage.getItem(PET_KEY); if (saved) setPet(saved); } catch { /* storage blocked */ }
  }
  function adoptPet(id) {
    const it = ITEMS[id];
    if (!it?.pet || !it.price) return;
    if (g.inventory.has(id)) { setPet(id); return; }
    const { wallet, shop } = g;
    if (!wallet.spend(it.price, { name: it.name })) { shop.toast(t('pet.noCoins', { n: it.price - wallet.coins })); return; }
    g.inventory.add(id);
    setPet(id);
    shop.closeProduct();
    g.clerk && say(g.clerk, $('labels'), ['잘 키워 주세요!', 'jal kiwo juseyo!', t('pet.takeCare')]);
    shop.toast(t('pet.adopted', { name: petName(id) }) + ' ' + L(PET_NAME_TEXT.hint));
  }
  function nearestPoop(p) {
    let best = null, bd = 1.6;
    for (const po of poops.values()) {
      const d = Math.hypot(po.x - p.x, po.z - p.z);
      if (d < bd) { bd = d; best = po; }
    }
    return best;
  }
  function cleanPoop(po) {
    poopTimers.clean(po.id);
    po.mesh.removeFromParent();
    poops.delete(po.id);
    g.me.play('bow'); // bend down
    g.shop.toast(t('pet.cleaned'));
    g.clearAction();
  }
  function updatePet(dt, p) {
    // Fines for poop left too long (the timer runs even inside shops).
    for (const late of poopTimers.step(dt)) {
      const po = poops.get(late.id);
      po?.mesh.removeFromParent();
      poops.delete(late.id);
      const taken = g.wallet.take(FINE, { k: 'ledger.fine' });
      showFine(taken, po?.street);
    }
    const soon = poopTimers.list.reduce((m, x) => Math.min(m, x.left), Infinity);
    $('poop-chip').hidden = soon === Infinity;
    if (soon !== Infinity) $('poop-chip').textContent = `💩 ${t('pet.cleanIn', { s: Math.ceil(soon) })}`;
    if (!pet) return;
    const me = g.me, activeScene = g.activeScene;
    if (pet.root.parent !== activeScene) { activeScene.add(pet.root); pet.place(p.x, p.z, me.root.rotation.y, p.y); }
    // Waits out of sight while you ride or are indoors. Sitting down (a bench,
    // a picnic mat) it stays and sits by you.
    const hidden = g.riding > 0 || g.indoors;
    pet.fences = g.fences || null; // (kept out of the bumper car rink)
    const poop = pet.update(dt, { x: p.x, z: p.z, y: p.y, ry: me.root.rotation.y }, hidden, g.mode === 'street');
    if (g.mode !== 'street') pet.root.position.y = p.y; // up on the Namsan summit too, not 34 m under it
    if (poop) {
      const pos = pet.root.position;
      const mesh = makePoop();
      mesh.position.set(pos.x, pos.y, pos.z); // down by the stream too
      g.scene.add(mesh);
      const { id } = poopTimers.add();
      poops.set(id, { id, mesh, x: pos.x, z: pos.z, street: $('street-name')?.textContent || '' });
      g.sfx.pop?.();
      g.shop.toast(t('pet.pooped', { name: petName(pet.id), ga: subjectParticle(customPetName(pet.id) || pet.def.name), s: CLEAN_SECONDS }));
    }
  }
  let fineShown = null; // { count, taken } while the notice is open (two fines at once add up)
  function showFine(taken, street) {
    const box = $('fine-panel');
    fineShown = box.hidden || !fineShown ? { count: 1, taken } : { count: fineShown.count + 1, taken: fineShown.taken + taken };
    $('fine-street').textContent = street || t('pet.fineStreet');
    $('fine-amount').textContent = `🪙 ${FINE}` + (fineShown.count > 1 ? ` × ${fineShown.count}` : '');
    $('fine-paid').textContent = t('pet.finePaid', { n: fineShown.taken, left: g.wallet.coins });
    box.hidden = false;
    g.refreshWallet();
  }
  $('fine-close').onclick = () => { $('fine-panel').hidden = true; };

  return {
    get pet() { return pet; },
    poops, poopTimers,
    setPet, restorePet, adoptPet, nearestPoop, cleanPoop, updatePet,
  };
}
