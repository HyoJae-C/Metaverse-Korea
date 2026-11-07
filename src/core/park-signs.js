// Wooden park information signs: a title and a short description on a board
// between two posts. Text is Korean by default; with signs translated it shows
// the player's language (setParkSignsLang). Built as a landmark { type: 'sign',
// title: {ko, en, …}, text: {ko, en, …} }, front facing local +z turned by ry
// (ry π: the board reads from the north).
import * as THREE from 'three';
import { localName } from './i18n.js';

const boards = []; // { l, mat } of every sign built, redrawn on a language change
const W = 2.2, H = 1.5;

function wrap(ctx, text, maxW) {
  // Korean/Chinese/Japanese wrap per character; others per word.
  const cjk = /[぀-ヿ㐀-鿿가-힯]/.test(text);
  const parts = cjk ? Array.from(text) : text.split(/(\s+)/);
  const lines = [];
  let line = '';
  for (const p of parts) {
    const next = line + p;
    if (ctx.measureText(next).width > maxW && line.trim()) { lines.push(line.trim()); line = p.trimStart(); }
    else line = next;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function draw(l, lang) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 436;
  const x = c.getContext('2d');
  x.fillStyle = '#f4ead2'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#6b4a2b'; x.lineWidth = 14; x.strokeRect(7, 7, c.width - 14, c.height - 14);
  const title = (lang ? localName(l.title, lang) : l.title?.ko) || '';
  const text = (lang ? localName(l.text, lang) : l.text?.ko) || '';
  const font = 'system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  x.fillStyle = '#2f6b3f'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `800 50px ${font}`;
  x.fillText(title, c.width / 2, 62, c.width - 60);
  x.fillStyle = '#7cb36a'; x.fillRect(60, 104, c.width - 120, 5);
  x.fillStyle = '#3b3128'; x.textAlign = 'left'; x.textBaseline = 'top';
  let size = 32, lines;
  for (; size >= 20; size -= 2) { // shrink until the description fits
    x.font = `500 ${size}px ${font}`;
    lines = wrap(x, text, c.width - 90);
    if (lines.length * size * 1.35 <= c.height - 150) break;
  }
  lines.forEach((ln, i) => x.fillText(ln, 45, 128 + i * size * 1.35));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function sign(g, l) {
  const wood = new THREE.MeshLambertMaterial({ color: '#7a5434' });
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 0.14), wood);
    post.position.set(sx * (W / 2 + 0.05), 1.15, 0);
    g.add(post);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, H + 0.1, 0.08), wood);
  back.position.y = 0.8 + H / 2;
  g.add(back);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.08, 0.4), wood);
  roof.position.y = 0.8 + H + 0.2;
  g.add(roof);
  const mat = new THREE.MeshBasicMaterial({ map: draw(l, null) });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  face.position.set(0, 0.8 + H / 2, 0.045); // front towards local +z
  face.userData.noShadow = true;
  g.add(face);
  boards.push({ l, mat });
}

// lang: the player's language, or null for the Korean original.
export function setParkSignsLang(lang) {
  for (const b of boards) {
    b.mat.map.dispose();
    b.mat.map = draw(b.l, lang);
    b.mat.needsUpdate = true;
  }
}
