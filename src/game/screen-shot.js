// Screenshot button (Yozi): a 📷 under the 👁️ in the top-left corner. It
// copies the game view only (no buttons, name tags or chat: those are page
// elements, not the 3D canvas), adds a small "MODU SEOUL" mark, and shows it
// with Save and Share. Phones share through the system sheet (which also has
// "Save image"); computers download a .jpg.
// Loaded after the street is up, so none of it is in the first download.

// A copy of the frame with the mark in the corner. src: the 3D canvas, read
// right after it was drawn (the buffer is cleared after that).
export function copyFrame(src, doc = document) {
  const W = src.width, H = src.height;
  if (!W || !H) return null;
  const c = doc.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; // (the K-POP café's screen is a see-through hole)
  g.fillRect(0, 0, W, H);
  g.drawImage(src, 0, 0);
  const px = Math.max(12, Math.round(Math.min(W, H) * 0.028));
  g.font = `800 ${px}px system-ui, sans-serif`;
  g.textAlign = 'right';
  g.textBaseline = 'bottom';
  g.shadowColor = 'rgba(0, 0, 0, 0.45)';
  g.shadowBlur = px * 0.3;
  g.fillStyle = 'rgba(255, 255, 255, 0.9)';
  g.fillText('MODU SEOUL · moduseoul.com', W - px * 0.8, H - px * 0.6);
  return c;
}

const pad2 = (n) => String(n).padStart(2, '0');
export function shotName(d = new Date()) {
  return `modu-seoul-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}.jpg`;
}

// game: { hud, t, toast(text), isTouch, grabFrame(cb): cb(canvas) runs right
//   after the next frame is drawn }
export function createScreenShot(game) {
  const { t } = game;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ui-shot';
  btn.textContent = '📷';
  btn.ariaLabel = btn.title = t('shot.take');
  game.hud.append(btn);

  const flash = document.createElement('div');
  flash.className = 'shot-flash';
  flash.setAttribute('aria-hidden', 'true');
  document.body.append(flash); // (not in the HUD: its children all take taps)

  const panel = document.createElement('div');
  panel.className = 'sheet shot-panel';
  panel.setAttribute('role', 'dialog');
  panel.hidden = true;
  game.hud.append(panel);

  let url = null;
  const close = () => {
    panel.hidden = true;
    panel.replaceChildren();
    if (url) { URL.revokeObjectURL(url); url = null; }
  };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

  // Resolves with the frame copy, or null when no frame comes (tab hidden).
  const grab = () => new Promise((resolve) => {
    let done = false;
    const end = (c) => { if (!done) { done = true; resolve(c); } };
    game.grabFrame((src) => { try { end(copyFrame(src)); } catch { end(null); } });
    setTimeout(() => end(null), 1500);
  });

  const show = (blob) => {
    const name = shotName();
    url = URL.createObjectURL(blob);
    const x = document.createElement('button');
    x.className = 'sheet-x';
    x.textContent = '✕';
    x.ariaLabel = 'Close';
    x.onclick = close;
    const img = document.createElement('img');
    img.className = 'shot-img';
    img.src = url;
    img.alt = 'MODU SEOUL';
    const row = document.createElement('div');
    row.className = 'shot-actions';
    const save = document.createElement('a');
    save.className = 'chip';
    save.href = url;
    save.download = name;
    save.textContent = '💾 ' + t('shot.save');
    const file = new File([blob], name, { type: 'image/jpeg' });
    let canShare = false;
    try { canShare = !!navigator.canShare?.({ files: [file] }); } catch { /* not here */ }
    row.append(save);
    if (canShare) {
      const share = document.createElement('button');
      share.className = game.isTouch ? 'primary' : 'chip';
      share.textContent = '📤 ' + t('shot.share');
      share.onclick = async () => { try { await navigator.share({ files: [file], title: 'MODU SEOUL' }); } catch { /* cancelled */ } };
      if (game.isTouch) row.prepend(share); else row.append(share);
    } else save.className = 'primary';
    panel.replaceChildren(x, img, row);
    panel.hidden = false;
  };

  let busy = false;
  btn.onclick = async () => {
    if (busy) return;
    busy = true;
    close();
    const c = await grab();
    if (!c) { busy = false; game.toast(t('shot.fail')); return; }
    flash.classList.remove('on');
    void flash.offsetWidth; // (restart the flash)
    flash.classList.add('on');
    c.toBlob((blob) => {
      busy = false;
      if (blob) show(blob); else game.toast(t('shot.fail'));
    }, 'image/jpeg', 0.92);
  };

  return { get open() { return !panel.hidden; }, close };
}
