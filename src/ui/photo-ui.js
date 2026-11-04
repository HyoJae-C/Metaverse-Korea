// Photo booths: 조각스튜디오 (four-cut strips with friends, two booths),
// 추억사진관 (one big portrait, just you) and 메모리즈 (black-and-white
// four-cut strips). Pay, pick a frame, then the shots with a 3-2-1
// countdown. Strike a pose with the emote wheel between shots. The picture
// can be saved or shared.
import { L, fmt } from './pocha-ui.js';

export const PHOTO_COST = 3;
export const SHOTS = 4;
export const FRAMES = { white: ['#ffffff', '#2b2630'], black: ['#1d1b22', '#ffffff'], pink: ['#ffc8de', '#7a2d55'], mint: ['#c6efe2', '#245a4a'] };
// Each booth kind (the store's workshop): shots, price, frames, black and white.
export const PHOTO_MODES = {
  photo: { shots: 4, cost: 3, frames: FRAMES, mono: false, label: 'JOGAK STUDIO', caption: '조각스튜디오' },
  photo1: { shots: 1, cost: 2, frames: { cream: ['#f6efe2', '#5a4632'], white: ['#ffffff', '#2b2630'], navy: ['#24324f', '#f3e9d2'], rose: ['#f3d0d6', '#6b2f3c'] }, mono: false, label: 'CHUEOK PHOTO', caption: '추억사진관' },
  photobw: { shots: 4, cost: 3, frames: { white: ['#ffffff', '#1d1b22'], black: ['#141316', '#f2f2f2'] }, mono: true, label: 'MEMORIES', caption: '메모리즈' },
};
export const PHOTO_WORKSHOPS = Object.keys(PHOTO_MODES);

const T = {
  title: {
    photo: { en: 'Jogak Studio · four-cut photos', ko: '조각스튜디오 · 네 컷 사진', ja: 'チョガクスタジオ · 4カット写真', zh: '碎片工作室 · 四格照' },
    photo1: { en: 'Chueok Photo Studio · one big portrait', ko: '추억사진관 · 한 장 크게', ja: 'チュオク写真館 · 大きな1枚', zh: '回忆照相馆 · 一张大照片' },
    photobw: { en: 'Memories · black & white photos', ko: '메모리즈 · 흑백 네 컷', ja: 'メモリーズ · モノクロ4カット', zh: 'Memories · 黑白四格照' },
  },
  howTo: {
    photo: {
      en: 'Four shots, 3 seconds apart. Pose with the 😊 emote wheel between shots, and bring friends into the booth!',
      ko: '3초 간격으로 4장 찍어요. 사이사이 😊 이모티콘으로 포즈를 잡고, 친구도 같이 들어오세요!',
      ja: '3秒おきに4枚撮影。合間に😊エモートでポーズ、友だちも一緒にどうぞ！',
      zh: '每隔3秒拍一张，共4张。用😊表情摆姿势，叫上朋友一起拍！',
    },
    photo1: {
      en: 'One portrait, printed big. Strike your best pose with the 😊 emote wheel!',
      ko: '나 혼자 한 장을 크게 찍어요. 😊 이모티콘으로 멋진 포즈를 잡아 보세요!',
      ja: '自分だけの1枚を大きく。😊エモートで決めポーズ！',
      zh: '一个人拍一张大照片。用😊表情摆个最好看的姿势！',
    },
    photobw: {
      en: 'Four black-and-white shots, 3 seconds apart: a classic film look. Friends welcome!',
      ko: '3초 간격으로 흑백 사진 4장. 필름 감성 그대로! 친구도 같이 찍어요.',
      ja: '3秒おきにモノクロ4枚。フィルム風の雰囲気で、友だちも一緒に！',
      zh: '每隔3秒拍4张黑白照，复古胶片感，朋友也可以一起！',
    },
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
const pad2 = (n) => String(n).padStart(2, '0');
const dateText = (date) => `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;

// Black and white with a little more contrast, like film.
export function toMono(px) {
  for (let i = 0; i < px.length; i += 4) {
    const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const v = Math.max(0, Math.min(255, (y - 128) * 1.15 + 128));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  return px;
}
function monoCanvas(c) {
  const g = c.getContext('2d');
  const data = g.getImageData(0, 0, c.width, c.height);
  toMono(data.data);
  g.putImageData(data, 0, 0);
  return c;
}
// cover-crop a shot into a box
function drawCover(g, s, x, y, w, h) {
  const k = Math.max(w / s.width, h / s.height);
  const cw = w / k, ch = h / k;
  g.drawImage(s, (s.width - cw) / 2, (s.height - ch) / 2, cw, ch, x, y, w, h);
}

// Put four shots (canvases or images, any size) into a vertical strip.
export function composeStrip(shots, frame = 'white', label = 'ANOTHER SEOUL', date = new Date(), { frames = FRAMES, mono = false, caption = '조각스튜디오' } = {}) {
  const [bg, ink] = frames[frame] || Object.values(frames)[0];
  const W = 360, cellW = 320, cellH = 220, pad = 20, gap = 12, foot = 70;
  const c = document.createElement('canvas');
  c.width = W; c.height = pad + SHOTS * (cellH + gap) - gap + foot;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  shots.forEach((s, i) => drawCover(g, s, pad, pad + i * (cellH + gap), cellW, cellH));
  if (mono) monoCanvas(c);
  g.fillStyle = ink; g.textAlign = 'center';
  g.font = '900 20px system-ui, sans-serif';
  g.fillText(label, W / 2, c.height - foot / 2 - 2);
  g.font = '600 13px system-ui, sans-serif';
  g.fillText(`${dateText(date)} · ${caption}`, W / 2, c.height - foot / 2 + 20);
  return c;
}
// One big portrait with a wide frame and a caption under it (추억사진관).
export function composePortrait(shot, frame = 'cream', label = 'CHUEOK PHOTO', date = new Date(), { frames = PHOTO_MODES.photo1.frames, mono = false, caption = '추억사진관' } = {}) {
  const [bg, ink] = frames[frame] || Object.values(frames)[0];
  const W = 720, pad = 36, photoW = W - pad * 2, photoH = Math.round(photoW * 1.2), foot = 96;
  const c = document.createElement('canvas');
  c.width = W; c.height = pad + photoH + foot;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  drawCover(g, shot, pad, pad, photoW, photoH);
  if (mono) monoCanvas(c);
  g.fillStyle = ink; g.textAlign = 'center';
  g.font = '900 30px system-ui, sans-serif';
  g.fillText(label, W / 2, pad + photoH + foot / 2 - 4);
  g.font = '600 18px system-ui, sans-serif';
  g.fillText(`${dateText(date)} · ${caption}`, W / 2, pad + photoH + foot / 2 + 26);
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
    this.kind = 'photo';
  }
  get mode() { return PHOTO_MODES[this.kind] || PHOTO_MODES.photo; }
  get open() { return !this.root.hidden || this.busy; }
  // kind: the booth's workshop (photo, photo1, photobw).
  show(kind = 'photo') {
    this.kind = PHOTO_MODES[kind] ? kind : 'photo';
    if (!this.mode.frames[this.frame]) this.frame = Object.keys(this.mode.frames)[0];
    this.root.hidden = false;
    this.render();
  }
  close() { this.busy = false; this.root.hidden = true; this.countdown?.(''); this.onShoot?.(false); }

  render(note) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '📸 ' + L(T.title[this.kind])), el('p', 'order-hint', L(T.howTo[this.kind])), el('strong', null, tt('frame')));
    const row = el('div', 'beauty-row');
    for (const [id, [bg]] of Object.entries(this.mode.frames)) {
      const b = el('button', 'beauty-opt swatch');
      b.style.background = bg;
      b.setAttribute('aria-label', id);
      b.setAttribute('aria-pressed', String(this.frame === id));
      b.onclick = () => { this.frame = id; this.render(note); };
      row.append(b);
    }
    this.root.append(row);
    if (note) this.root.append(el('p', 'order-hint', note));
    const go = el('button', 'primary', '📸 ' + tt('start', { n: this.mode.cost }));
    go.onclick = () => this.shoot();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(actions);
  }

  async shoot() {
    const mode = this.mode, n = mode.shots;
    if (!this.wallet.spend(mode.cost)) { this.render(tt('noCoins', { n: mode.cost })); return; }
    this.busy = true;
    this.root.hidden = true;
    this.onShoot?.(true, this.kind);
    const shots = [];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await wait(600);
    for (let i = 0; i < n && this.busy; i++) {
      for (const c of ['3', '2', '1']) { this.countdown?.(n > 1 ? `${i + 1}/${n} · ${c}` : c); await wait(800); if (!this.busy) return; }
      this.countdown?.('📸');
      shots.push(await this.snap());
      await wait(400);
    }
    this.countdown?.('');
    this.onShoot?.(false, this.kind);
    if (!this.busy) return;
    this.busy = false;
    const opts = { frames: mode.frames, mono: mode.mono, caption: mode.caption };
    this.showStrip(n > 1 ? composeStrip(shots, this.frame, mode.label, new Date(), opts) : composePortrait(shots[0], this.frame, mode.label, new Date(), opts));
  }

  showStrip(strip) {
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    const img = el('img', 'photo-strip');
    img.src = strip.toDataURL('image/png');
    img.alt = `ANOTHER SEOUL · ${this.mode.caption}`;
    const name = `another-seoul-${Date.now()}.png`;
    const save = el('a', 'chip', '💾 ' + tt('save'));
    save.href = img.src;
    save.download = name;
    const actions = el('div', 'order-actions');
    actions.append(save);
    if (navigator.canShare) {
      const share = el('button', 'chip', '📤 ' + tt('share'));
      share.onclick = () => strip.toBlob(async (blob) => {
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'ANOTHER SEOUL' }); } catch { /* cancelled */ } }
      });
      actions.append(share);
    }
    const again = el('button', 'primary', '📸 ' + tt('again'));
    again.onclick = () => this.render();
    actions.append(again);
    img.classList.toggle('portrait', this.mode.shots === 1);
    this.root.replaceChildren(x, el('h3', null, '📸 ' + L(T.title[this.kind])), img, actions);
  }
}
