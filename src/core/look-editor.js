// Character maker on the start screen: option buttons plus a live,
// slowly turning 3D preview.
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { t, onLanguageChange } from './i18n.js';
import { PALETTES, START_HAIR_STYLES, randomLook, sanitizeLook } from '../data/appearance.js';

const STORAGE_KEY = 'mk.look';

export function loadLook() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitizeLook(JSON.parse(raw));
  } catch { /* ignore */ }
  return randomLook();
}

export function saveLook(look) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(look));
  } catch { /* ignore */ }
}

export function createLookEditor({ optionsEl, canvas, randomBtn }) {
  let look = loadLook();

  // --- preview ---
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xc9d6b8, 1.6), new THREE.AmbientLight(0xfff0e0, 0.8));
  const key = new THREE.DirectionalLight(0xfff1d6, 1.3);
  key.position.set(2, 4, 3);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.0, 3.6);
  camera.lookAt(0, 0.62, 0);
  let ch = null;
  let spin = 0;
  let swayT = 0;
  let dragging = false;
  let lastX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    spin += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });

  const rebuild = () => {
    if (ch) scene.remove(ch.root);
    ch = createCharacter(look);
    scene.add(ch.root);
    saveLook(look);
  };

  const resize = () => {
    const w = canvas.clientWidth || 200, h = canvas.clientHeight || 260;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const timer = new THREE.Timer();
  let running = true;
  const loop = () => {
    if (!running) return;
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    // Gentle sway around the drag angle so the face stays visible.
    swayT += dt;
    ch.root.rotation.y = spin + (dragging ? 0 : Math.sin(swayT * 0.8) * 0.5);
    ch.animate(dt, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };

  // --- options ---
  const buttons = [];
  const section = (labelKey, content) => {
    const wrap = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'opt-label';
    label.dataset.i18n = labelKey;
    label.textContent = t(labelKey);
    wrap.append(label, content);
    optionsEl.appendChild(wrap);
  };
  const refreshPressed = () => {
    for (const { el, field, value } of buttons) el.setAttribute('aria-pressed', String(look[field] === value));
  };

  // Everyone starts in plain clothes: just pick the T-shirt colour. Costumes
  // (mage, ninja, knight…) and accessories are bought in town.
  {
    const row = document.createElement('div');
    row.className = 'acc-row';
    for (const [id, hex] of Object.entries(PALETTES.shirt)) {
      const b = document.createElement('button');
      b.className = 'acc swatch';
      b.style.background = '#' + hex.toString(16).padStart(6, '0');
      b.setAttribute('aria-label', id);
      b.onclick = () => {
        look = { ...look, shirt: id, model: 'basic' };
        refreshPressed();
        rebuild();
      };
      buttons.push({ el: b, field: 'shirt', value: id });
      row.appendChild(b);
    }
    section('look.tee', row);
  }

  // A few plain hairstyles (the rest are at the hair salon). Tapping the
  // picked one again goes back to the model's own hair.
  {
    const row = document.createElement('div');
    row.className = 'acc-row';
    for (const id of START_HAIR_STYLES) {
      const b = document.createElement('button');
      b.className = 'acc none';
      b.dataset.i18n = 'hair.' + id;
      b.textContent = t('hair.' + id);
      b.onclick = () => {
        look = { ...look, hairStyle: look.hairStyle === id ? null : id };
        refreshPressed();
        rebuild();
      };
      buttons.push({ el: b, field: 'hairStyle', value: id });
      row.appendChild(b);
    }
    section('beauty.hairStyle', row);
  }

  randomBtn.onclick = () => {
    const hair = [null, ...START_HAIR_STYLES];
    look = { ...look, shirt: randomLook().shirt, model: 'basic', hairStyle: hair[Math.floor(Math.random() * hair.length)] };
    refreshPressed();
    rebuild();
  };

  onLanguageChange(() => {
    optionsEl.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
  });

  refreshPressed();
  rebuild();
  resize();
  requestAnimationFrame(loop);

  return {
    getLook: () => look,
    dispose() {
      running = false;
      ro.disconnect();
      renderer.dispose();
    },
  };
}
