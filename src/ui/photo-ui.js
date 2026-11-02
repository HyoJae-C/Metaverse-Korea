// Four-cut photo booth (인생네컷): pay, pick a frame colour, then four shots
// with a 3-2-1 countdown. Strike a pose with the emote wheel between shots;
// friends standing next to you are in the picture too. The strip can be
// saved or shared.
import { L, fmt } from './pocha-ui.js';

export const PHOTO_COST = 3;
export const SHOTS = 4;
export const FRAMES = { white: ['#ffffff', '#2b2630'], black: ['#1d1b22', '#ffffff'], pink: ['#ffc8de', '#7a2d55'], mint: ['#c6efe2', '#245a4a'] };

const T = {
  title: { en: 'Four-cut photo booth', ko: '인생네컷 포토부스', ja: '4カットフォトブース', zh: '四格照相馆' },
  howTo: {
    en: 'Four shots, 3 seconds apart. Pose with the 😊 emote wheel between shots, and bring friends into the booth!',
    ko: '3초 간격으로 4장 찍어요. 사이사이 😊 이모티콘으로 포즈를 잡고, 친구도 같이 들어오세요!',
    ja: '3秒おきに4枚撮影。合間に😊エモートでポーズ、友だちも一緒にどうぞ！',
    zh: '每隔3秒拍一张，共4张。用😊表情摆姿势，叫上朋友一起拍！',
  },
  frame: { en: 'Frame colour', ko: '프레임 색', ja: 'フレームの色', zh: '相框颜色' },
  start: { en: 'Take photos · 🪙 {n}', ko: '사진 찍기 · 🪙 {n}', ja: '撮影する · 🪙 {n}', zh: '拍照 · 🪙 {n}' },
  noCoins: { en: 'You need 🪙 {n}.', ko: '🪙 {n}개가 필요해요.', ja: '🪙 {n}枚必要です。', zh: '需要 🪙 {n}。' },
  save: { en: 'Save', ko: '저장하기', ja: '保存', zh: '保存' },
  share: { en: 'Share', ko: '공유하기', ja: '共有', zh: '分享' },
  again: { en: 'Again', ko: '다시 찍기', ja: 'もう一度', zh: '再拍一次' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// Put four shots (canvases or images, any size) into a vertical strip.
export function composeStrip(shots, frame = 'white', label = 'METAVERSE SEOUL', date = new Date()) {
  const [bg, ink] = FRAMES[frame] || FRAMES.white;
  const W = 360, cellW = 320, cellH = 220, pad = 20, gap = 12, foot = 70;
  const c = document.createElement('canvas');
  c.width = W; c.height = pad + SHOTS * (cellH + gap) - gap + foot;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  shots.forEach((s, i) => {
    const y = pad + i * (cellH + gap);
    // cover-crop the shot into the cell
    const sw = s.width, sh = s.height, k = Math.max(cellW / sw, cellH / sh);
    const cw = cellW / k, ch = cellH / k;
    g.drawImage(s, (sw - cw) / 2, (sh - ch) / 2, cw, ch, pad, y, cellW, cellH);
  });
  g.fillStyle = ink; g.textAlign = 'center';
  g.font = '900 20px system-ui, sans-serif';
  g.fillText(label, W / 2, c.height - foot / 2 - 2);
  g.font = '600 13px system-ui, sans-serif';
  const p = (n) => String(n).padStart(2, '0');
  g.fillText(`${date.getFullYear()}.${p(date.getMonth() + 1)}.${p(date.getDate())} · 인생네컷`, W / 2, c.height - foot / 2 + 20);
  return c;
}

export class PhotoUI {
  // wallet; snap(): Promise<canvas> of the current view; onShoot(on): turn the
  // booth camera on/off (main.js hides the HUD and frames the shot);
  // countdown(text): show the big countdown over the game.
  constructor({ root, wallet, snap, onShoot, countdown }) {
    Object.assign(this, { root, wallet, snap, onShoot, countdown });
    this.frame = 'white';
    this.busy = false;
  }
  get open() { return !this.root.hidden || this.busy; }
  show() { this.root.hidden = false; this.render(); }
  close() { this.busy = false; this.root.hidden = true; this.countdown?.(''); this.onShoot?.(false); }

  render(note) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '📸 ' + tt('title')), el('p', 'order-hint', tt('howTo')), el('strong', null, tt('frame')));
    const row = el('div', 'beauty-row');
    for (const [id, [bg]] of Object.entries(FRAMES)) {
      const b = el('button', 'beauty-opt swatch');
      b.style.background = bg;
      b.setAttribute('aria-label', id);
      b.setAttribute('aria-pressed', String(this.frame === id));
      b.onclick = () => { this.frame = id; this.render(note); };
      row.append(b);
    }
    this.root.append(row);
    if (note) this.root.append(el('p', 'order-hint', note));
    const go = el('button', 'primary', '📸 ' + tt('start', { n: PHOTO_COST }));
    go.onclick = () => this.shoot();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(actions);
  }

  async shoot() {
    if (!this.wallet.spend(PHOTO_COST)) { this.render(tt('noCoins', { n: PHOTO_COST })); return; }
    this.busy = true;
    this.root.hidden = true;
    this.onShoot?.(true);
    const shots = [];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await wait(600);
    for (let i = 0; i < 4 && this.busy; i++) {
      for (const n of ['3', '2', '1']) { this.countdown?.(`${i + 1}/4 · ${n}`); await wait(800); if (!this.busy) return; }
      this.countdown?.('📸');
      shots.push(await this.snap());
      await wait(400);
    }
    this.countdown?.('');
    this.onShoot?.(false);
    if (!this.busy) return;
    this.busy = false;
    this.showStrip(composeStrip(shots, this.frame));
  }

  showStrip(strip) {
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    const img = el('img', 'photo-strip');
    img.src = strip.toDataURL('image/png');
    img.alt = 'METAVERSE SEOUL 인생네컷';
    const name = `metaverse-seoul-${Date.now()}.png`;
    const save = el('a', 'chip', '💾 ' + tt('save'));
    save.href = img.src;
    save.download = name;
    const actions = el('div', 'order-actions');
    actions.append(save);
    if (navigator.canShare) {
      const share = el('button', 'chip', '📤 ' + tt('share'));
      share.onclick = () => strip.toBlob(async (blob) => {
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'METAVERSE SEOUL' }); } catch { /* cancelled */ } }
      });
      actions.append(share);
    }
    const again = el('button', 'primary', '📸 ' + tt('again'));
    again.onclick = () => this.render();
    actions.append(again);
    this.root.replaceChildren(x, el('h3', null, '📸 ' + tt('title')), img, actions);
  }
}
