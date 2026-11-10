// Potato Market (감자마켓) on the plaza by Dongmyo: players' mats with the
// clothes they put out, and the panel to buy from them or spread your own.
// The rules and the server talk: core/market.js (supabase/034_player_market.sql).
// Loaded by game/potato-market-near.js when you come near, or at the start
// when you have things on a mat.
//
// game: { scene, spot (the potatomarket landmark: x, z, spots [[dx, dz, ry]]),
// wallet, inventory, receipts, items, shop, sfx, refreshWallet, refreshItems,
// newOpId, takeOff(id), resync() (fetch the balance again: a sale while away) }.
import * as THREE from 'three';
import { makeMat, MAT, MAT_COLORS } from '../core/picnic-mat.js';
import { MarketClient, MARKET, priceRange, sellerGets, clampPrice, listable, mats, newlySold } from '../core/market.js';
import { MY_MAT } from './potato-market-near.js';
import { t } from '../core/i18n.js';
import { L } from '../ui/pocha-ui.js';

const SHOW = 120; // m: mats drawn this close
const PLAZA = 17; // m from the plaza's centre: "browse the market"
const BY_MAT = 2.2; // m from a mat: "look at this mat"
const EVERY = 45; // s between looks at the server while you're here

// Clothes colours from their names (outfit-hoodie-black → black).
const TINT = { black: '#2b2b30', white: '#f2f0ea', red: '#c8423a', blue: '#3d68b8', navy: '#2c3a5c', green: '#4f8a55', khaki: '#8a8458', beige: '#d8c6a4', brown: '#7a5236', grey: '#8d8f94', gray: '#8d8f94', pink: '#e391aa', yellow: '#e9c54a', purple: '#7f5aa8', denim: '#4a6a96', cream: '#efe5cf', orange: '#e0843a', mint: '#9fd8c0' };
const tint = (id) => TINT[String(id).split('-').reverse().find((w) => TINT[w])] || '#c9b48f';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const saveMine = (ids) => { try { localStorage.setItem(MY_MAT, JSON.stringify(ids)); } catch { /* storage blocked */ } };

export function createPotatoMarket(game) {
  const { spot, items } = game;
  const client = new MarketClient(game.wallet);
  let rules = null, rows = null, mine = null, busy = false, wait = 0, near = false;
  const centre = { x: spot.x, z: spot.z };
  // Mats fill the middle of the plaza first.
  const spots = (spot.spots || []).map(([dx, dz, ry = 0]) => ({ x: spot.x + dx, z: spot.z + dz, ry, d: Math.hypot(dx, dz) }))
    .sort((a, b) => a.d - b.d);

  // ---- the mats on the ground ----
  const group = new THREE.Group();
  group.visible = false;
  game.scene.add(group);
  const CLOTH = new THREE.BoxGeometry(0.5, 0.07, 0.38);
  const clothMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  const cloth = new THREE.InstancedMesh(CLOTH, clothMat, spots.length * MARKET.openMax);
  cloth.count = 0;
  cloth.frustumCulled = false;
  group.add(cloth);
  const matMeshes = [];
  let drawn = []; // [{ mat, x, z, name }] where each mat lies
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  function draw() {
    const list = rows ? mats(rows, items, rules?.openMax || MARKET.openMax) : [];
    drawn = [];
    let n = 0;
    list.slice(0, spots.length).forEach((m, i) => {
      const s = spots[i];
      let mesh = matMeshes[i];
      if (!mesh) { mesh = matMeshes[i] = makeMat(i % MAT_COLORS.length); group.add(mesh); }
      mesh.visible = true;
      mesh.position.set(s.x, 0, s.z);
      mesh.rotation.y = s.ry;
      drawn.push({ mat: m.mat, x: s.x, z: s.z, name: m.mine ? t('potato.mine') : m.name || t('potato.someone') });
      // Folded clothes in two rows of three.
      m.things.forEach((th, k) => {
        const lx = ((k % 3) - 1) * 0.75, lz = (k < 3 ? -0.4 : 0.4);
        v.set(lx * Math.cos(s.ry) + lz * Math.sin(s.ry), 0.075, -lx * Math.sin(s.ry) + lz * Math.cos(s.ry)).add({ x: s.x, y: 0, z: s.z });
        q.setFromAxisAngle(up, s.ry + ((th.id * 7) % 5 - 2) * 0.06);
        cloth.setMatrixAt(n, m4.compose(v, q, one));
        cloth.setColorAt(n, c.set(tint(th.item)));
        n++;
      });
    });
    for (let i = list.length; i < matMeshes.length; i++) matMeshes[i].visible = false;
    cloth.count = n;
    cloth.instanceMatrix.needsUpdate = true;
    if (cloth.instanceColor) cloth.instanceColor.needsUpdate = true;
  }

  // ---- the server ----
  async function refresh() {
    if (!game.wallet.server) { rules = null; return; }
    if (!rules) await client.info();
    rules = client.rules;
    if (!rules) return;
    const r = await client.browse();
    if (r) { rows = r; draw(); }
  }
  // My mat: keeps it out (I'm in the game), tells what sold, takes back
  // what stayed too long.
  async function checkMine() {
    if (!game.wallet.server) return;
    const r = await client.mine();
    if (!r) return;
    mine = r;
    const sold = newlySold(r);
    for (const s of sold) {
      const it = items[s.item];
      game.shop.toast(t('potato.soldToast', { name: it ? L(it.name) : s.item, n: s.got }));
    }
    if (sold.length) { game.sfx.pop?.(); await game.resync?.(); }
    for (const x of r.filter((x) => x.status === 'open' && x.expired)) {
      const res = await client.cancel(x.id);
      if (res.ok) {
        putBack(res.item, res.rc, x.list);
        const it = items[res.item];
        game.shop.toast(t('potato.expired', { name: it ? L(it.name) : res.item, days: rules?.days || MARKET.days }));
      }
    }
    if (r.some((x) => x.expired)) mine = await client.mine() || mine;
    saveMine(mine.filter((x) => x.status === 'open').map((x) => x.id));
  }
  function putBack(item, rc, list) {
    if (!items[item]) return;
    game.inventory.add(item);
    if (rc?.paid > 0) game.receipts.record(item, rc.paid, rc.op, null, list);
    game.refreshItems?.();
  }
  const why = (res, name) => {
    switch (res.why) {
      case 'gone': return t('potato.gone');
      case 'own': return t('potato.own');
      case 'poor': return t('pet.noCoins', { n: res.short || '' });
      case 'young': return t('potato.young', { h: rules?.minHours || MARKET.minHours });
      case 'closed': return t('potato.closed');
      case 'price': return t('potato.price', { min: res.min, max: res.max });
      case 'noref': return t('potato.noref', { name });
      case 'full': return t('potato.full', { n: rules?.openMax || MARKET.openMax });
      case 'sold': return t('potato.noref', { name });
      default: return t('potato.offline');
    }
  };

  // ---- what a tap does ----
  async function buy(th) {
    const it = items[th.item];
    if (!it || game.inventory.has(th.item)) return null;
    const op = game.newOpId();
    const note = { name: it.name, at: { en: 'Potato Market', ko: '감자마켓' } };
    const res = await client.buy(th.id, op, note);
    if (!res.ok) {
      if (res.why === 'gone') await refresh();
      return why(res.why === 'poor' ? { why: 'poor', short: Math.max(0, th.price - game.wallet.coins) } : res, L(it.name));
    }
    game.inventory.add(th.item);
    // Its receipt: back to a vintage shop or onto my own mat, priced from
    // its new price (res.list), not what I paid.
    game.receipts.record(th.item, res.n, op, note, res.list);
    game.refreshWallet();
    game.sfx.pop?.();
    game.shop.toast(t('potato.bought') + ' ' + (it.emoji || '👕') + ' ' + L(it.name));
    game.refreshItems?.();
    await refresh();
    return t('potato.bought');
  }
  async function put(id, price) {
    const it = items[id], rc = game.receipts.get(id);
    if (!it || !rc || !game.inventory.has(id)) return null;
    const res = await client.list(id, price, rc);
    if (!res.ok) {
      // It drops out of the list below, so say why where it can't be
      // missed (a small line in the panel read as "it went on the mat").
      const msg = why(res, L(it.name));
      if (res.why === 'noref' || res.why === 'sold') { game.receipts.forget(id); game.shop.toast(msg); }
      return msg;
    }
    // On the mat: it leaves the closet (and comes back if taken back).
    game.takeOff(id);
    game.inventory.remove(id);
    game.receipts.forget(id);
    game.refreshItems?.();
    game.sfx.pop?.();
    await Promise.all([checkMine(), refresh()]);
    return t('potato.listed');
  }
  async function takeBack(x) {
    const res = await client.cancel(x.id);
    const it = items[x.item];
    if (!res.ok) { await checkMine(); return why(res, it ? L(it.name) : x.item); }
    putBack(res.item, res.rc, x.list);
    await Promise.all([checkMine(), refresh()]);
    return t('potato.back', { name: it ? L(it.name) : x.item });
  }

  // ---- the panel ----
  const root = el('div', 'sheet order-panel fish-panel potato-panel');
  root.hidden = true;
  document.getElementById('hud')?.append(root) ?? document.body.append(root);
  const ui = {
    tab: 'mats', only: null, msg: '',
    get open() { return !root.hidden; },
    close() { root.hidden = true; },
    async show(only = null) {
      Object.assign(ui, { tab: 'mats', only, msg: '' });
      root.hidden = false;
      ui.render(t('potato.wait'));
      await Promise.all([refresh(), checkMine()]).catch(() => {});
      if (ui.open && !busy) ui.render();
    },
    render(note) {
      const x = el('button', 'sheet-x', '✕');
      x.setAttribute('aria-label', 'Close');
      x.onclick = () => ui.close();
      root.replaceChildren(x, el('h3', null, '🥔 ' + t('potato.title')));
      if (!rules) { root.append(el('p', 'fine', note || t('potato.closed'))); return; }
      const tabs = el('div', 'chips');
      for (const k of ['mats', 'mine']) {
        const b = el('button', 'chip' + (ui.tab === k ? ' on' : ''), t(k === 'mats' ? 'potato.mats' : 'potato.mine'));
        b.onclick = () => { ui.tab = k; ui.only = null; ui.msg = ''; ui.render(); };
        tabs.append(b);
      }
      root.append(tabs);
      if (note || ui.msg) root.append(el('p', 'fine resale-msg', note || ui.msg));
      if (ui.tab === 'mats') renderMats(); else renderMine();
    },
  };
  // Run a tap: one at a time, buttons off, the answer shown in the panel.
  const tap = (btn, f) => async () => {
    if (busy) return;
    busy = true;
    root.querySelectorAll('button.chip, button.potato-go').forEach((b) => { b.disabled = true; });
    btn.textContent = t('potato.wait');
    let out;
    try { out = await f(); } catch { out = t('potato.offline'); } finally { busy = false; }
    ui.msg = out || '';
    if (ui.open) ui.render();
  };
  const row = (emoji, name, small, btn) => {
    const r = el('div', 'fish-row');
    const label = el('span', 'fish-name', name);
    if (small) label.append(el('small', 'resale-paid', ' · ' + small));
    r.append(el('span', 'fish-emoji', emoji || '👕'), label);
    if (btn) r.append(btn);
    return r;
  };
  function renderMats() {
    const list = mats(rows, items, rules.openMax).filter((m) => ui.only == null || m.mat === ui.only);
    if (!list.length) { root.append(el('p', 'fine', t('potato.empty'))); return; }
    for (const m of list) {
      const seller = m.mine ? t('potato.mine') : m.name || t('potato.someone');
      root.append(el('h4', 'resale-rack', '🧺 ' + (m.mine ? seller : t('potato.matOf', { name: seller }))));
      const box = el('div', 'fish-list');
      for (const th of m.things) {
        const it = items[th.item], name = L(it.name), have = game.inventory.has(th.item);
        const b = el('button', 'chip', t('used.buy', { n: th.price }));
        b.disabled = busy || m.mine || have;
        b.onclick = () => confirm(t('potato.ask', { name, seller, n: th.price })) && tap(b, () => buy(th))();
        box.append(row(it.emoji, name, have ? t('used.have') : t('potato.new', { n: th.list }), b));
      }
      root.append(box);
    }
  }
  function renderMine() {
    const max = rules.openMax, open = (mine || []).filter((x) => x.status === 'open' && !x.expired);
    root.append(el('p', 'fine', t('potato.rule', { n: max, min: rules.minPct, max: rules.maxPct, fee: rules.feePct, days: rules.days })));
    root.append(el('h4', 'resale-rack', '🧺 ' + t('potato.onMat', { n: open.length, max })));
    const box = el('div', 'fish-list');
    for (const x of open) {
      const it = items[x.item];
      if (!it) continue;
      const b = el('button', 'chip', t('potato.take'));
      b.disabled = busy;
      b.onclick = tap(b, () => takeBack(x));
      box.append(row(it.emoji, L(it.name), `🪙 ${x.price} · ${t('potato.youGet', { n: sellerGets(x.price, rules.feePct) })}`, b));
    }
    for (const x of (mine || []).filter((x) => x.status === 'sold').slice(0, 6)) {
      const it = items[x.item];
      if (it) box.append(row(it.emoji, L(it.name), t('potato.sold', { n: Number(x.got) || 0 })));
    }
    if (box.childElementCount) root.append(box);
    root.append(el('h4', 'resale-rack', '👕 ' + t('potato.canPut')));
    if (open.length >= max) { root.append(el('p', 'fine', t('potato.full', { n: max }))); return; }
    const can = listable(game.inventory.list(), items, game.receipts, new Set(open.map((x) => x.item)));
    if (!can.length) root.append(el('p', 'fine', t('potato.nothing')));
    const list = el('div', 'fish-list');
    for (const r of can) {
      const it = items[r.id], range = priceRange(r.list, rules);
      if (!range) continue;
      const input = el('input', 'potato-price');
      Object.assign(input, { type: 'number', min: range.min, max: range.max, step: 100, value: clampPrice(r.list / 2, range) });
      input.style.width = '6.5em';
      input.addEventListener('keydown', (e) => e.stopPropagation()); // don't walk while typing
      const get = el('small', 'resale-paid');
      const sync = () => { get.textContent = ' ' + t('potato.youGet', { n: sellerGets(clampPrice(input.value, range), rules.feePct) }); };
      input.oninput = sync;
      input.onchange = () => { input.value = clampPrice(input.value, range); sync(); };
      sync();
      const b = el('button', 'chip potato-go', t('potato.put'));
      b.disabled = busy;
      b.onclick = tap(b, () => put(r.id, clampPrice(input.value, range)));
      const line = row(it.emoji, L(it.name), t('potato.new', { n: r.list }));
      line.querySelector('.fish-name').append(el('br'), input, get);
      line.append(b);
      list.append(line);
    }
    // The rest of my clothes, greyed: no receipt (gifts, code items, clothes
    // from before receipts), so they can't go on a mat (Yozi 2026-11-11).
    const ok = new Set(can.map((r) => r.id)), onMat = new Set(open.map((x) => x.item));
    for (const id of game.inventory.list()) {
      const it = items[id];
      if (!it?.wear || ok.has(id) || onMat.has(id)) continue;
      const b = el('button', 'chip', t('potato.put'));
      b.disabled = true;
      const line = row(it.emoji, L(it.name), t('potato.noReceipt'), b);
      line.style.opacity = '0.5';
      list.append(line);
    }
    if (list.childElementCount) root.append(list);
  }

  return {
    ui, checkMine,
    update(p, dt) {
      const d = Math.hypot(p.x - centre.x, p.z - centre.z);
      group.visible = d < SHOW;
      const here = d < 60;
      if (here && (!near || (wait -= dt) <= 0)) { wait = EVERY; refresh().catch(() => {}); }
      near = here;
    },
    act(p) {
      if (Math.hypot(p.x - centre.x, p.z - centre.z) > PLAZA) return null;
      const by = drawn.map((m) => ({ m, d: Math.hypot(p.x - m.x, p.z - m.z) })).filter((o) => o.d < BY_MAT + MAT.w / 2).sort((a, b) => a.d - b.d)[0];
      if (by) return { key: 'potato:' + by.m.mat, label: '🧺 ' + (by.m.name === t('potato.mine') ? t('potato.mine') : t('potato.look', { name: by.m.name })), run: () => ui.show(by.m.mat) };
      return { key: 'potato', label: '🥔 ' + t('potato.open'), run: () => ui.show() };
    },
  };
}
