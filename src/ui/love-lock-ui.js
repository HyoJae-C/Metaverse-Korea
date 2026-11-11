// The love-lock panel at the Namsan summit (사랑의 자물쇠).
//   show('write'): pick a lock, write on a memo, check the price and the
//                  note, pay and hang it.
//   show('list'):  everyone's notes, newest first, a page at a time; tap one
//                  to read it whole on its memo.
// Notes are put on the page with textContent only (plain text: HTML in a
// note shows as typed and never runs), with their line breaks kept by CSS.

import { L, fmt } from './pocha-ui.js';
import { getLanguage } from '../core/i18n.js';
import { LOCK_SHAPES, LOVE_LOCK, countLines, cleanNote, preview, newRequestId } from '../core/love-locks.js';
import { LOCK_LABELS } from './love-lock-labels.js';

export const LOCK_TEXT = {
  ...LOCK_LABELS,
  spot: { en: 'Love locks', ko: '사랑의 자물쇠', ja: '愛の南京錠', zh: '爱情锁' },
  pick: { en: 'Pick a lock', ko: '자물쇠 고르기', ja: '南京錠を選ぶ', zh: '选一把锁' },
  heart: { en: 'Heart', ko: '하트', ja: 'ハート', zh: '心形' },
  circle: { en: 'Circle', ko: '원', ja: '丸', zh: '圆形' },
  square: { en: 'Square', ko: '네모', ja: '四角', zh: '方形' },
  star: { en: 'Star', ko: '별', ja: '星', zh: '星形' },
  public: { en: 'This message is public: other players can read it.', ko: '다른 플레이어에게 공개되는 메시지입니다.', ja: 'このメッセージは他のプレイヤーに公開されます。', zh: '这条留言会公开给其他玩家。' },
  local: { en: 'Not connected to the server yet: your lock stays on this device.', ko: '아직 서버 연결 전이라 이 기기에서만 보여요.', ja: 'まだサーバーにつながっていないので、この端末だけに保存されます。', zh: '尚未连接服务器，只保存在本设备。' },
  placeholder: { en: 'Write your message (line breaks are kept)', ko: '메시지를 적어 주세요 (줄바꿈도 그대로 남아요)', ja: 'メッセージを書いてください（改行もそのまま残ります）', zh: '写下你的留言（换行会保留）' },
  lines: { en: '{n}/{max} lines', ko: '{n}/{max}줄', ja: '{n}/{max}行', zh: '{n}/{max}行' },
  over: { en: 'Up to {max} lines. Please take out {n}.', ko: '최대 {max}줄까지 쓸 수 있어요. {n}줄을 줄여 주세요.', ja: '{max}行までです。{n}行減らしてください。', zh: '最多{max}行，请删掉{n}行。' },
  price: { en: 'Price', ko: '가격', ja: '料金', zh: '价格' },
  have: { en: 'You have 🪙 {n}', ko: '보유 🪙 {n}', ja: '所持 🪙 {n}', zh: '持有 🪙 {n}' },
  next: { en: 'Next: check', ko: '다음: 확인하기', ja: '次へ：確認', zh: '下一步：确认' },
  check: { en: 'Check before you hang it', ko: '걸기 전에 확인해 주세요', ja: 'かける前に確認してください', zh: '挂锁前请确认' },
  after: { en: 'After: 🪙 {n}', ko: '등록 후 🪙 {n}', ja: '登録後 🪙 {n}', zh: '登记后 🪙 {n}' },
  edit: { en: 'Edit', ko: '고치기', ja: '直す', zh: '修改' },
  pay: { en: 'Pay 🪙 {n} and hang it', ko: '🪙 {n} 내고 걸기', ja: '🪙 {n} 払ってかける', zh: '支付 🪙 {n} 挂上' },
  hanging: { en: 'Hanging your lock…', ko: '자물쇠를 거는 중…', ja: '南京錠をかけています…', zh: '正在挂锁…' },
  done: { en: 'Your lock is on!', ko: '자물쇠를 걸었어요!', ja: '南京錠をかけました！', zh: '锁挂好啦！' },
  doneSub: { en: 'Other players can read your message in the list.', ko: '다른 플레이어도 목록에서 메시지를 볼 수 있어요.', ja: '他のプレイヤーも一覧でメッセージを読めます。', zh: '其他玩家也能在列表里看到你的留言。' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  listTitle: { en: 'Love lock messages', ko: '사랑의 자물쇠 메시지', ja: '愛の南京錠メッセージ', zh: '爱情锁留言' },
  none: { en: 'No locks yet. Be the first to hang one!', ko: '아직 걸린 자물쇠가 없어요. 첫 자물쇠를 걸어 보세요!', ja: 'まだ南京錠がありません。最初の一つをかけてみましょう！', zh: '还没有人挂锁，来挂第一把吧！' },
  loading: { en: 'Loading…', ko: '불러오는 중…', ja: '読み込み中…', zh: '加载中…' },
  more: { en: 'Show more', ko: '더 보기', ja: 'もっと見る', zh: '查看更多' },
  back: { en: '‹ Back to the list', ko: '‹ 목록으로', ja: '‹ 一覧へ', zh: '‹ 返回列表' },
  by: { en: 'From {name} · {date}', ko: '{name} · {date}', ja: '{name} · {date}', zh: '{name} · {date}' },
  missing: { en: 'The love locks are being set up. Please come back soon!', ko: '사랑의 자물쇠를 준비하고 있어요. 조금만 기다려 주세요!', ja: '愛の南京錠を準備中です。もう少しお待ちください！', zh: '爱情锁正在准备中，请稍后再来！' },
  e_empty: { en: 'Write a message first.', ko: '메시지를 먼저 적어 주세요.', ja: '先にメッセージを書いてください。', zh: '请先写留言。' },
  e_lines: { en: 'Up to 20 lines, please.', ko: '20줄 이하로 써 주세요.', ja: '20行以内で書いてください。', zh: '请写在20行以内。' },
  e_chars: { en: 'Up to 1000 characters, please.', ko: '1000자 이하로 써 주세요.', ja: '1000文字以内で書いてください。', zh: '请写在1000字以内。' },
  e_coins: { en: 'Not enough money: a lock costs 🪙 {n}.', ko: '돈이 부족해요. 자물쇠는 🪙 {n}이에요.', ja: 'お金が足りません。南京錠は 🪙 {n} です。', zh: '钱不够，一把锁要 🪙 {n}。' },
  e_price: { en: 'The price has changed to 🪙 {n}. Please check again.', ko: '가격이 🪙 {n}(으)로 바뀌었어요. 다시 확인해 주세요.', ja: '料金が 🪙 {n} に変わりました。もう一度確認してください。', zh: '价格已变为 🪙 {n}，请再确认一次。' },
  e_limit: { en: 'That’s all the locks for today. Come back tomorrow!', ko: '오늘은 더 걸 수 없어요. 내일 또 와 주세요!', ja: '今日はもうかけられません。また明日！', zh: '今天不能再挂了，明天再来吧！' },
  e_network: { en: 'Couldn’t reach the server. No money was taken. Try again in a moment.', ko: '서버에 연결하지 못했어요. 돈은 빠져나가지 않았어요. 잠시 후 다시 해 주세요.', ja: 'サーバーにつながりませんでした。お金は減っていません。少ししてからもう一度。', zh: '无法连接服务器，没有扣钱。请稍后再试。' },
};
const COLORS = { heart: '#ff5d8f', circle: '#ffc93c', square: '#5dade2', star: '#af7ac5' };

// A lock picture (SVG, built from fixed shapes and colours only).
const NS = 'http://www.w3.org/2000/svg';
export function lockSvg(shape, size = 56) {
  if (!LOCK_SHAPES.includes(shape)) shape = 'heart';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 110');
  svg.setAttribute('width', size);
  svg.setAttribute('height', Math.round(size * 1.1));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('lock-svg');
  const add = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); svg.append(e); return e; };
  add('path', { d: 'M32 58 V36 a18 18 0 0 1 36 0 V58', fill: 'none', stroke: '#a9b0ba', 'stroke-width': 9, 'stroke-linecap': 'round' });
  const fill = COLORS[shape], body = { fill, stroke: 'rgba(0,0,0,.18)', 'stroke-width': 2 };
  if (shape === 'heart') add('path', { ...body, d: 'M50 105 C22 86 8 72 8 59 C8 48 17 41 28 41 C37 41 44 46 50 53 C56 46 63 41 72 41 C83 41 92 48 92 59 C92 72 78 86 50 105Z' });
  else if (shape === 'circle') add('circle', { ...body, cx: 50, cy: 75, r: 31 });
  else if (shape === 'square') add('rect', { ...body, x: 18, y: 46, width: 64, height: 58, rx: 9 });
  else {
    const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 16 : 37; return `${(50 + Math.cos(a) * r).toFixed(1)},${(75 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
    add('polygon', { ...body, points: pts });
  }
  add('circle', { cx: 50, cy: 72, r: 5.5, fill: 'rgba(40,30,40,.55)' });
  add('rect', { x: 47.5, y: 73, width: 5, height: 11, rx: 2, fill: 'rgba(40,30,40,.55)' });
  return svg;
}

export function dateLabel(iso, lang = getLanguage()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try { return d.toLocaleDateString(lang === 'zht' ? 'zh-TW' : lang, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d.toISOString().slice(0, 10); }
}

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export class LoveLockUI {
  // store(): the backend (LocalLoveLocks / SupabaseLoveLocks); wallet: the
  // game's Wallet; name(): my name; toast(msg); onHung(lock): after a lock is hung.
  constructor({ root, store, wallet, name, toast, onHung }) {
    Object.assign(this, { root, store, wallet, name, toast, onHung });
    this.view = 'write';
    this.shape = 'heart';
    this.draft = '';
    this.price = LOVE_LOCK.price;
    this.busy = false;
    this.requestId = newRequestId();
    this.rows = null;
    // Keys typed in the panel must not move the player or fire shortcuts.
    root.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
  }
  get open() { return !this.root.hidden; }
  close() { if (this.busy) return; this.root.hidden = true; }

  async show(view) {
    this.root.hidden = false;
    this.err = null;
    if (view === 'list') return this.showList();
    this.view = 'write';
    this.render();
    const p = await this.store().price();
    if (Number.isFinite(p) && p !== this.price) { this.price = p; if (this.view === 'write') this.render(); }
  }

  async showList() {
    this.view = 'list';
    this.rows = null;
    this.more = false;
    this.render();
    await this.loadMore();
  }
  async loadMore() {
    if (this.loading) return;
    this.loading = true;
    const before = this.rows?.length ? this.rows[this.rows.length - 1].id : null;
    const r = await this.store().page(before);
    this.loading = false;
    if (this.view !== 'list') return;
    if (r.error) { this.listErr = r.error; this.rows ||= []; } else { this.listErr = null; this.rows = (this.rows || []).concat(r.rows); this.more = r.more; }
    this.render();
  }

  _head(icon, text) {
    const x = el('button', 'sheet-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    x.disabled = this.busy;
    return [x, el('strong', 'wallet-title', icon + ' ' + text)];
  }

  render() {
    const st = this.store();
    this.root.classList.toggle('lock-busy', this.busy);
    const parts = this['_' + this.view](st);
    this.root.replaceChildren(...parts);
  }

  _write(st) {
    const parts = this._head('🔒', L(LOCK_TEXT.hang));
    if (st.missing) { parts.push(el('p', 'board-empty', L(LOCK_TEXT.missing))); return parts; }
    parts.push(el('p', 'fine lock-public', '🌐 ' + L(LOCK_TEXT.public)));
    if (!st.shared) parts.push(el('p', 'fine board-warn', L(LOCK_TEXT.local)));
    // The four locks.
    parts.push(el('b', 'lock-sub', L(LOCK_TEXT.pick)));
    const row = el('div', 'lock-shapes');
    row.setAttribute('role', 'radiogroup');
    for (const s of LOCK_SHAPES) {
      const b = el('button', 'lock-shape' + (s === this.shape ? ' on' : ''));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(s === this.shape));
      b.append(lockSvg(s, 40), el('small', '', L(LOCK_TEXT[s])));
      b.onclick = () => { this.shape = s; this.render(); };
      row.append(b);
    }
    parts.push(row);
    // The memo.
    const memo = el('div', 'lock-memo');
    const ta = el('textarea', 'lock-memo-text');
    ta.placeholder = L(LOCK_TEXT.placeholder);
    ta.maxLength = LOVE_LOCK.maxChars;
    ta.rows = 6;
    ta.value = this.draft;
    ta.setAttribute('aria-label', L(LOCK_TEXT.placeholder));
    memo.append(ta);
    const count = el('small', 'board-count');
    const warn = el('p', 'lock-warn');
    const price = el('div', 'lock-price');
    const next = el('button', 'primary', L(LOCK_TEXT.next));
    next.type = 'button';
    const sync = () => {
      this.draft = ta.value;
      const n = countLines(ta.value), over = n - LOVE_LOCK.maxLines;
      count.textContent = fmt(L(LOCK_TEXT.lines), { n, max: LOVE_LOCK.maxLines });
      count.classList.toggle('over', over > 0);
      const poor = this.wallet.coins < this.price;
      warn.textContent = over > 0 ? fmt(L(LOCK_TEXT.over), { max: LOVE_LOCK.maxLines, n: over }) : poor ? fmt(L(LOCK_TEXT.e_coins), { n: this.price }) : '';
      warn.hidden = !warn.textContent;
      next.disabled = over > 0 || !ta.value.trim() || poor;
    };
    ta.oninput = sync;
    price.append(el('span', '', `${L(LOCK_TEXT.price)} 🪙 ${this.price}`), el('small', '', fmt(L(LOCK_TEXT.have), { n: this.wallet.coins })));
    next.onclick = () => {
      const c = cleanNote(ta.value);
      if (c.error) { this.toast(L(LOCK_TEXT['e_' + c.error])); return; }
      if (this.wallet.coins < this.price) { this.toast(fmt(L(LOCK_TEXT.e_coins), { n: this.price })); return; }
      this.view = 'confirm';
      this.render();
    };
    sync();
    const foot = el('div', 'board-row');
    foot.append(count, price);
    parts.push(memo, foot, warn, next);
    return parts;
  }

  _confirm() {
    const parts = this._head('🔒', L(LOCK_TEXT.check));
    const body = cleanNote(this.draft).body || '';
    parts.push(this._paper(this.shape, body, this.name()));
    const sum = el('div', 'lock-price lock-sum');
    sum.append(el('span', '', `${L(LOCK_TEXT.price)} 🪙 ${this.price}`), el('small', '', `${fmt(L(LOCK_TEXT.have), { n: this.wallet.coins })} → ${fmt(L(LOCK_TEXT.after), { n: Math.max(0, this.wallet.coins - this.price) })}`));
    parts.push(sum, el('p', 'fine lock-public', '🌐 ' + L(LOCK_TEXT.public)));
    if (this.err) parts.push(el('p', 'lock-warn', this.err));
    const row = el('div', 'lock-btns');
    const edit = el('button', 'chip', L(LOCK_TEXT.edit));
    edit.type = 'button';
    edit.disabled = this.busy;
    edit.onclick = () => { this.err = null; this.view = 'write'; this.render(); };
    const pay = el('button', 'primary', this.busy ? L(LOCK_TEXT.hanging) : fmt(L(LOCK_TEXT.pay), { n: this.price }));
    pay.type = 'button';
    pay.disabled = this.busy;
    pay.onclick = () => this._hang();
    row.append(edit, pay);
    parts.push(row);
    return parts;
  }

  async _hang() {
    if (this.busy) return; // one tap at a time; the request id covers retries
    const c = cleanNote(this.draft);
    if (c.error) { this.toast(L(LOCK_TEXT['e_' + c.error])); return; }
    if (this.wallet.coins < this.price) { this.err = fmt(L(LOCK_TEXT.e_coins), { n: this.price }); this.render(); return; }
    this.busy = true;
    this.err = null;
    this.render();
    let r;
    try {
      r = await this.store().hang({ requestId: this.requestId, shape: this.shape, name: this.name(), text: c.body, price: this.price }, { k: 'ledger.loveLock' });
    } catch { r = { error: 'network' }; }
    this.busy = false;
    if (r.error) {
      if (r.error === 'price' && Number.isFinite(r.price)) this.price = r.price;
      const key = 'e_' + (LOCK_TEXT['e_' + r.error] ? r.error : 'network');
      this.err = fmt(L(LOCK_TEXT[key]), { n: this.price });
      if (r.error === 'missing') { this.view = 'write'; this.err = null; }
      this.render();
      return;
    }
    // Hung: a fresh request id and an empty memo for the next one.
    this.done = { shape: this.shape, body: r.lock?.body ?? c.body, name: r.lock?.name ?? this.name() };
    this.draft = '';
    this.requestId = newRequestId();
    this.view = 'done';
    this.render();
    this.toast(L(LOCK_TEXT.done));
    this.onHung?.(r.lock);
  }

  _done() {
    const parts = this._head('💕', L(LOCK_TEXT.spot));
    const big = el('div', 'lock-done');
    big.append(lockSvg(this.done.shape, 92), el('strong', '', L(LOCK_TEXT.done)), el('p', 'fine', L(LOCK_TEXT.doneSub)));
    const row = el('div', 'lock-btns');
    const list = el('button', 'chip', '💌 ' + L(LOCK_TEXT.read));
    list.type = 'button';
    list.onclick = () => this.showList();
    const ok = el('button', 'primary', L(LOCK_TEXT.close));
    ok.type = 'button';
    ok.onclick = () => this.close();
    row.append(list, ok);
    parts.push(big, row);
    return parts;
  }

  _list(st) {
    const parts = this._head('💌', L(LOCK_TEXT.listTitle));
    if (!st.shared) parts.push(el('p', 'fine board-warn', L(LOCK_TEXT.local)));
    if (st.missing || this.listErr === 'missing') { parts.push(el('p', 'board-empty', L(LOCK_TEXT.missing))); return parts; }
    const list = el('div', 'lock-list');
    if (!this.rows) list.append(el('p', 'fine', L(LOCK_TEXT.loading)));
    else if (!this.rows.length && !this.listErr) list.append(el('p', 'board-empty', L(LOCK_TEXT.none)));
    for (const lock of this.rows || []) {
      const b = el('button', 'lock-item');
      b.type = 'button';
      const txt = el('span', 'lock-item-text');
      const head = el('span', 'lock-item-head');
      head.append(el('b', '', lock.name), el('small', '', dateLabel(lock.created_at)));
      txt.append(head, el('span', 'lock-item-preview', preview(lock.body)));
      b.append(lockSvg(lock.shape, 34), txt);
      b.onclick = () => { this.reading = lock; this.view = 'detail'; this.render(); };
      list.append(b);
    }
    if (this.listErr) list.append(el('p', 'lock-warn', L(LOCK_TEXT.e_network)));
    if (this.more || this.listErr) {
      const more = el('button', 'chip lock-more', this.loading ? L(LOCK_TEXT.loading) : L(LOCK_TEXT.more));
      more.type = 'button';
      more.disabled = !!this.loading;
      more.onclick = () => { this.loadMore(); this.render(); };
      list.append(more);
    }
    parts.push(list);
    return parts;
  }

  _detail() {
    const lock = this.reading;
    const parts = this._head('💌', L(LOCK_TEXT.listTitle));
    const back = el('button', 'chip lock-back', L(LOCK_TEXT.back));
    back.type = 'button';
    back.onclick = () => { this.view = 'list'; this.render(); };
    parts.push(back, this._paper(lock.shape, lock.body, lock.name, lock.created_at));
    return parts;
  }

  // The lock and its memo, the note in full with its line breaks.
  _paper(shape, body, name, at) {
    const box = el('div', 'lock-read');
    const pic = el('div', 'lock-read-pic');
    pic.append(lockSvg(shape, 72));
    const memo = el('div', 'lock-memo lock-memo-read');
    memo.append(el('p', 'lock-memo-body', body));
    memo.append(el('small', 'lock-memo-by', at ? fmt(L(LOCK_TEXT.by), { name, date: dateLabel(at) }) : name));
    box.append(pic, memo);
    return box;
  }
}
