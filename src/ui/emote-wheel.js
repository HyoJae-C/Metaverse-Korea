// Emote wheel: one 😊 button. Press and drag onto a petal, then let go to
// send it; or tap to open the wheel and tap a petal. Keys 1–9 also work.
import { ownedPacks } from '../data/emotes.js';
import { showBubble } from '../core/players.js';

export function createEmoteWheel(game) {
  const { $, missionEvent, myLabel } = game;
  const emoteBar = $('emotes');
  const emoteList = ownedPacks().flatMap((pack) => pack.emotes);
  $('keys-emote-range').textContent = `1–${Math.min(9, emoteList.length)}`;
  $('keys-emote-range').closest('li').hidden = !emoteList.length;
  function sendEmote(em) {
    missionEvent('emote');
    if (game.onSquare()) missionEvent('squareEmote');
    if (em.anim) game.me.play(em.anim);
    showBubble(myLabel, $('labels'), em.emoji);
    game.net.sendEmote(em.id);
  }
  const petals = emoteList.map((em, i) => {
    const b = document.createElement('button');
    b.textContent = em.emoji;
    b.setAttribute('aria-label', em.id);
    // Fan out in a quarter circle above and to the left of the main button.
    // Rings of 3, 4 and 5 petals so up to 12 fit without overlapping.
    const ring = i < 3 ? 0 : i < 7 ? 1 : 2;
    const start = [0, 3, 7][ring];
    const n = Math.min([3, 4, 5][ring], emoteList.length - start);
    const ang = Math.PI / 2 + (n > 1 ? ((i - start) / (n - 1)) : 0.5) * (Math.PI / 2);
    const r = [80, 140, 200][ring];
    b.style.setProperty('--dx', `${Math.cos(ang) * r}px`);
    b.style.setProperty('--dy', `${-Math.sin(ang) * r}px`);
    b.onclick = (e) => { e.stopPropagation(); sendEmote(em); closeWheel(); };
    emoteBar.appendChild(b);
    return b;
  });
  let wheelOpen = false, dragHot = null, dragStart = null;
  function openWheel() { wheelOpen = true; emoteBar.hidden = false; $('emote-wheel').classList.add('open'); }
  function closeWheel() {
    wheelOpen = false; emoteBar.hidden = true; $('emote-wheel').classList.remove('open');
    petals.forEach((p) => p.classList.remove('hot'));
    dragHot = null;
  }
  const mainBtn = $('emote-main');
  mainBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    mainBtn.setPointerCapture(e.pointerId);
    dragStart = { x: e.clientX, y: e.clientY, wasOpen: wheelOpen, moved: false };
    openWheel();
  });
  mainBtn.addEventListener('pointermove', (e) => {
    if (!dragStart) return;
    if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 12) dragStart.moved = true;
    dragHot = null;
    let best = 44;
    for (const p of petals) {
      const r = p.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (d < best) { best = d; dragHot = p; }
    }
    petals.forEach((p) => p.classList.toggle('hot', p === dragHot));
  });
  const endDrag = () => {
    if (!dragStart) return;
    const { moved, wasOpen } = dragStart;
    dragStart = null;
    if (dragHot) { sendEmote(emoteList[petals.indexOf(dragHot)]); closeWheel(); }
    else if (moved || wasOpen) closeWheel(); // dragged off, or tapped again to close
    // a plain tap leaves the wheel open for tapping a petal
  };
  mainBtn.addEventListener('pointerup', endDrag);
  mainBtn.addEventListener('pointercancel', () => { dragStart = null; closeWheel(); });
  addEventListener('pointerdown', (e) => { if (wheelOpen && !e.target.closest('#emote-wheel')) closeWheel(); });
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const n = Number(e.key);
    if (n >= 1 && n <= emoteList.length) sendEmote(emoteList[n - 1]);
  });
  return { get wheelOpen() { return wheelOpen; }, closeWheel };
}
