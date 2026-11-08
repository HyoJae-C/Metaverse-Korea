// The free exhibition application page (apply.html). Images go to the
// private "exhibit-uploads" bucket, then submit_exhibit_app() stores the
// rest (supabase/026_exhibit_apps.sql). Operators see it in admin.html.
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { TEXT, KINDS, WHO, CHRISTMAS, MAX_IMAGES, fill, checkFiles, firstError, uploadPath } from './form.js';

const $ = (id) => document.getElementById(id);
const client = config.net.url && config.net.key
  ? createClient(config.net.url, config.net.key, { auth: { storageKey: 'mkauth', persistSession: true, autoRefreshToken: true } })
  : null;

// Korean for Korean browsers, English for everyone else, unless picked before.
let lang = (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
try { const saved = localStorage.getItem('mk.applyLang'); if (TEXT[saved]) lang = saved; } catch { /* private window */ }
let files = []; // { file, url }
let lastErr = null; // { key, vars } shown under the form (redrawn on a language switch)

function options(box, type, name, keys, label) {
  const picked = new Set([...box.querySelectorAll('input:checked')].map((i) => i.value));
  box.innerHTML = '';
  for (const k of keys) {
    const l = document.createElement('label');
    l.className = 'opt';
    const i = document.createElement('input');
    i.type = type; i.name = name; i.value = k; i.id = `${name}-${k}`; i.checked = picked.has(k);
    const s = document.createElement('span');
    const [main, sub] = [].concat(label(k));
    const b = document.createElement('b'); b.textContent = main; s.append(b);
    if (sub) { const sm = document.createElement('small'); sm.textContent = sub; s.append(sm); }
    l.append(i, s);
    box.append(l);
  }
}

function render() {
  const T = TEXT[lang];
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t] ?? '';
  for (const b of document.querySelectorAll('.lang button')) b.classList.toggle('on', b.dataset.lang === lang);
  options($('kinds'), 'checkbox', 'kind', KINDS, (k) => T.kind[k]);
  options($('who'), 'radio', 'who', WHO, (k) => T.whoOpt[k]);
  options($('christmas'), 'radio', 'christmas', CHRISTMAS, (k) => T.xmasOpt[k]);
  showErr(lastErr);
}

function showErr(e) {
  lastErr = e;
  $('err').textContent = e ? fill(TEXT[lang].err[e.key] || e.key, e.vars) : '';
}

function drawThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  files.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'thumb';
    const img = document.createElement('img');
    img.src = f.url; img.alt = f.file.name;
    const s = document.createElement('span'); s.textContent = `${i + 1}. ${f.file.name}`;
    const x = document.createElement('button');
    x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove');
    x.onclick = () => { URL.revokeObjectURL(f.url); files.splice(i, 1); drawThumbs(); };
    d.append(img, s, x);
    box.append(d);
  });
  $('pick').hidden = files.length >= MAX_IMAGES;
}

function collect() {
  const picked = (name) => [...document.querySelectorAll(`input[name=${name}]:checked`)].map((i) => i.value);
  return {
    name: $('name').value, email: $('email').value, sns: $('sns').value,
    kinds: picked('kind'), who: picked('who')[0] || '', intro: $('intro').value,
    titles: $('titles').value, mood: $('mood').value, christmas: picked('christmas')[0] || '',
    consent: $('consent').checked, lang,
  };
}

async function send(e) {
  e.preventDefault();
  const app = collect();
  const list = files.map((f) => f.file);
  const key = firstError(app, list);
  if (key) {
    const bad = checkFiles(list).find((b) => b.key === key);
    showErr({ key, vars: bad?.f ? { f: bad.f } : {} });
    return;
  }
  if (!client) { showErr({ key: 'setup' }); return; }
  const btn = $('send');
  btn.disabled = true;
  const folder = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, '');
  try {
    const paths = [];
    for (let i = 0; i < list.length; i++) {
      btn.textContent = fill(TEXT[lang].sending, { n: i + 1, total: list.length });
      const path = uploadPath(folder, i, list[i]);
      const { error } = await client.storage.from('exhibit-uploads').upload(path, list[i], { contentType: list[i].type || undefined, upsert: false });
      if (error) throw error;
      paths.push(path);
    }
    const { error } = await client.rpc('submit_exhibit_app', { app: { ...app, images: paths } });
    if (error) throw error;
    $('form').hidden = true;
    $('done').hidden = false;
    scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    const msg = String(err?.message || '');
    showErr({ key: /busy/.test(msg) ? 'busy' : /bucket|not found|PGRST202|does not exist/i.test(msg) ? 'setup' : 'send' });
  } finally {
    btn.disabled = false;
    btn.textContent = TEXT[lang].send;
  }
}

for (const b of document.querySelectorAll('.lang button')) {
  b.onclick = () => { lang = b.dataset.lang; try { localStorage.setItem('mk.applyLang', lang); } catch { /* private window */ } render(); };
}
$('pick').onclick = () => $('files').click();
$('files').onchange = () => {
  const add = [...$('files').files].slice(0, MAX_IMAGES - files.length);
  const bad = checkFiles(add)[0];
  showErr(bad ? { key: bad.key, vars: bad.f ? { f: bad.f } : {} } : null);
  for (const file of add) if (!checkFiles([file]).length) files.push({ file, url: URL.createObjectURL(file) });
  $('files').value = '';
  drawThumbs();
};
$('form').onsubmit = send;
$('again').onclick = () => {
  $('form').reset();
  for (const f of files) URL.revokeObjectURL(f.url);
  files = [];
  drawThumbs();
  showErr(null);
  $('done').hidden = true;
  $('form').hidden = false;
};
render();
drawThumbs();
