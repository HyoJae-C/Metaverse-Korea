// 📱 Phone view tab (Yozi 2026-11-15): the game in a phone-sized frame, so
// the operator can see on a computer what iPhone and Android players see.
// The game reads ?phone= (src/core/phone-preview.js): touch screen, phone
// CSS, its own guest save, and it leaves the operator's real game tab alone.
// The frame only exists while this tab is open, so no game runs behind the
// other tabs.

// Sizes are the browser's (CSS pixels), portrait.
export const PHONES = [
  { id: 'iphone16', name: 'iPhone 16 / 15', kind: 'ios', w: 393, h: 852 },
  { id: 'iphone16max', name: 'iPhone 16 Pro Max', kind: 'ios', w: 440, h: 956 },
  { id: 'iphonese', name: 'iPhone SE', kind: 'ios', w: 375, h: 667 },
  { id: 'galaxys24', name: 'Galaxy S24', kind: 'android', w: 360, h: 780 },
  { id: 'galaxys24u', name: 'Galaxy S24 Ultra', kind: 'android', w: 384, h: 824 },
  { id: 'pixel8', name: 'Pixel 8', kind: 'android', w: 412, h: 915 },
];

export function phoneUrl(base, phone, turned) {
  const [w, h] = turned ? [phone.h, phone.w] : [phone.w, phone.h];
  return `${base}?phone=${phone.kind}&w=${w}&h=${h}`;
}

// How much to shrink a w×h screen (plus bezel) to fit the stage; never enlarged.
export function fitScale(w, h, stageW, stageH, bezel = 24) {
  if (!stageW || !stageH) return 1;
  return Math.min(1, stageW / (w + bezel), stageH / (h + bezel));
}

const KEY = 'adminPhone';

export function createPhonePanel({ $, base }) {
  const sel = $('phoneModel'), frame = $('phoneFrame'), box = $('phoneBox'), stage = $('phoneStage');
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* storage blocked */ }
  let phone = PHONES.find((p) => p.id === saved.id) || PHONES[0];
  let turned = !!saved.turned;
  let iframe = null;
  let on = false;

  for (const p of PHONES) sel.add(new Option(`${p.name} · ${p.w}×${p.h}`, p.id));
  sel.value = phone.id;

  const remember = () => { try { localStorage.setItem(KEY, JSON.stringify({ id: phone.id, turned })); } catch { /* storage blocked */ } };
  const size = () => (turned ? [phone.h, phone.w] : [phone.w, phone.h]);
  function layout() {
    const [w, h] = size();
    const bezel = phone.kind === 'android' ? 18 : 24;
    const s = fitScale(w, h, stage.clientWidth - 24, stage.clientHeight - 24, bezel);
    frame.className = phone.kind;
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    frame.style.transform = `scale(${s})`;
    box.style.width = (w + bezel) * s + 'px';
    box.style.height = (h + bezel) * s + 'px';
  }
  function load() {
    iframe?.remove();
    iframe = null;
    if (!on) return;
    layout();
    iframe = document.createElement('iframe');
    iframe.title = phone.name;
    iframe.allow = 'autoplay; fullscreen; clipboard-write';
    iframe.src = phoneUrl(base, phone, turned);
    frame.append(iframe);
  }

  sel.onchange = () => { phone = PHONES.find((p) => p.id === sel.value) || PHONES[0]; remember(); load(); };
  $('phoneTurn').onclick = () => { turned = !turned; remember(); load(); };
  $('phoneReload').onclick = load;
  new ResizeObserver(() => { if (on) layout(); }).observe(stage);

  return {
    show(v) {
      if (v === on) return;
      on = v;
      load(); // on: start the game; off: drop it so it stops running
    },
  };
}
