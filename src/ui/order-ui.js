// Ordering practice panel (see data/order-missions.js). Pick a mission, build
// the order from word blocks, say it to the clerk, answer the clerk's
// question, collect a stamp, then listen to the sentence and record yourself
// saying it. No speech recognition: recording is only played back, never
// scored or uploaded.
import { t, getLanguage, localName } from '../core/i18n.js';
import { BLOCKS, LINES, ANSWERS, MENUS, stampId } from '../data/order-missions.js';
import { blocksFor, checkOrder, repeatBack, sentenceFor } from '../core/order-game.js';

const STAMP_KEY = 'mk.stamps';
export const ORDER_REWARD = 10000; // coins for the first time a mission is done

// Stamps collected on this device: { id: date }.
export class Stamps {
  constructor() {
    try { this.s = JSON.parse(localStorage.getItem(STAMP_KEY) || '{}') || {}; } catch { this.s = {}; }
  }
  has(id) { return !!this.s[id]; }
  // Returns true the first time a stamp is added.
  add(id) {
    if (this.s[id]) return false;
    this.s[id] = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(STAMP_KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ }
    return true;
  }
}

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const meaning = (tr) => localName(tr, getLanguage());
const blockMeaning = (b) => (getLanguage() === 'ko' ? b.rom : localName(b, getLanguage()));

// Korean speech from the browser's own voices (no server). Hidden if missing.
const canSpeak = typeof speechSynthesis !== 'undefined';
function speak(ko) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(ko);
  u.lang = 'ko-KR';
  u.rate = 0.85;
  const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith('ko'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
const canRecord = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export class OrderUI {
  // root: the sheet element; wallet: { add(n) }; onSay(line): the clerk says
  // a [ko, rom, en] line in a bubble; onStamp(n, total, coins): after a stamp.
  constructor({ root, wallet, onSay, onClose, onStamp }) {
    Object.assign(this, { root, wallet, onSay, onClose, onStamp });
    this.stamps = new Stamps();
    this.store = null;
    this.audioUrl = null;
  }

  get open() { return !this.root.hidden; }

  show(store) {
    this.store = store;
    this.menu = MENUS[store.orderMenu] || [];
    this.root.hidden = false;
    this.renderList();
  }

  close() {
    this._stopRec();
    if (canSpeak) speechSynthesis.cancel();
    this.root.hidden = true;
    this.store = null;
    this.onClose?.();
  }

  _frame(title) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, title));
  }

  // A Korean line: big Korean text with a 🔊 button, romanization, meaning.
  _line(ko, rom, tr, cls = 'order-line') {
    const box = el('div', cls);
    const top = el('div', 'order-ko');
    top.append(el('span', null, ko));
    if (canSpeak) {
      const b = el('button', 'order-speak', '🔊');
      b.setAttribute('aria-label', t('order.listen'));
      b.onclick = () => speak(ko);
      top.append(b);
    }
    box.append(top, el('small', 'order-rom', rom));
    if (tr) box.append(el('small', 'order-tr', meaning(tr)));
    return box;
  }

  _stampCount() { return this.menu.filter((m) => this.stamps.has(stampId(this.store.id, m.id))).length; }

  renderList() {
    this._frame(t('order.title'));
    this.root.append(el('p', 'fine', t('order.hint')));
    const list = el('div', 'order-missions');
    for (const m of this.menu) {
      const done = this.stamps.has(stampId(this.store.id, m.id));
      const b = el('button', 'order-mission' + (done ? ' done' : ''));
      b.append(el('span', 'order-mission-icon', done ? '✅' : m.icon), el('span', null, meaning(m.title)));
      b.onclick = () => this.start(m);
      list.append(b);
    }
    this.root.append(list, el('p', 'order-stamps', t('order.stamps', { n: this._stampCount(), total: this.menu.length })));
  }

  start(mission) {
    this.mission = mission;
    this.offer = blocksFor(mission);
    this.picked = [];
    this.feedback = null;
    this.onSay?.(LINES.greet);
    this.renderBuild();
  }

  renderBuild() {
    const m = this.mission;
    this._frame(t('order.mission'));
    const card = el('div', 'order-card');
    card.append(el('span', 'order-mission-icon', m.icon), el('strong', null, meaning(m.title)));
    const [gko, grom, gtr] = this.feedback?.line || LINES.greet;
    this.root.append(card, this._line(gko, grom, gtr, 'order-line clerk'));
    if (this.feedback?.hint) this.root.append(el('p', 'order-hint', this.feedback.hint));

    // The sentence being built; tap a word to take it back.
    const sentence = el('div', 'order-sentence');
    if (!this.picked.length) sentence.append(el('span', 'order-placeholder', t('order.tapBlocks')));
    this.picked.forEach((id, i) => {
      const b = el('button', 'order-block on', BLOCKS[id].ko);
      b.onclick = () => { this.picked.splice(i, 1); this.feedback = null; this.renderBuild(); };
      sentence.append(b);
    });
    const pool = el('div', 'order-pool');
    for (const id of this.offer) {
      const used = this.picked.includes(id);
      const b = el('button', 'order-block' + (used ? ' used' : ''));
      b.disabled = used;
      b.append(el('span', null, BLOCKS[id].ko), el('small', null, blockMeaning(BLOCKS[id])));
      b.onclick = () => { this.picked.push(id); this.feedback = null; this.renderBuild(); };
      pool.append(b);
    }
    const actions = el('div', 'order-actions');
    const back = el('button', 'chip', t('order.back'));
    back.onclick = () => this.renderList();
    const say = el('button', 'primary', '🗣️ ' + t('order.say'));
    say.disabled = !this.picked.length;
    say.onclick = () => this.submit();
    actions.append(back, say);
    this.root.append(el('small', 'order-label', t('order.yourOrder')), sentence, pool, actions);
  }

  submit() {
    const m = this.mission;
    const r = checkOrder(m, this.picked);
    const rb = repeatBack(this.picked);
    if (r.ok) {
      this.onSay?.([rb.ko + ' ' + LINES.gotIt[0], rb.rom + ' ' + LINES.gotIt[1], meaning(LINES.gotIt[2])]);
      this.renderQuestion();
      return;
    }
    let line, hint;
    if (r.noEnding || !rb) {
      line = LINES.pardon;
      hint = t('order.needPlease');
    } else {
      // The clerk repeats what you said; a funny reaction for some words.
      const reaction = this.picked.map((id) => BLOCKS[id].reaction).find(Boolean);
      line = reaction || [rb.ko + ' ' + LINES.confirmTail[0], rb.rom + ' ' + LINES.confirmTail[1], LINES.confirmTail[2]];
      const parts = [t('order.notQuite')];
      if (r.extra.length) parts.push(t('order.extra', { list: r.extra.map((id) => BLOCKS[id].ko).join(', ') }));
      if (r.missing.length) parts.push(t('order.missing', { list: r.missing.map((id) => blockMeaning(BLOCKS[id])).join(', ') }));
      hint = parts.join(' ');
    }
    this.onSay?.([line[0], line[1], meaning(line[2])]);
    this.feedback = { line, hint };
    this.renderBuild();
  }

  renderQuestion(wrong = false) {
    const m = this.mission;
    this._frame(t('order.mission'));
    const q = LINES[m.ask];
    this.onSay?.([q[0], q[1], meaning(q[2])]);
    this.root.append(this._line(q[0], q[1], q[2], 'order-line clerk'));
    if (wrong) this.root.append(el('p', 'order-hint', meaning(LINES.wrongAnswer[2])));
    const opts = el('div', 'order-answers');
    for (const id of m.options) {
      const [ko, rom, tr] = ANSWERS[id];
      const b = el('button', 'order-answer');
      b.append(el('strong', null, ko), el('small', null, `${rom} · ${meaning(tr)}`));
      b.onclick = () => (id === m.answer ? this.finish() : this.renderQuestion(true));
      opts.append(b);
    }
    this.root.append(opts);
  }

  finish() {
    const m = this.mission;
    this.onSay?.([LINES.done[0], LINES.done[1], meaning(LINES.done[2])]);
    const first = this.stamps.add(stampId(this.store.id, m.id));
    const coins = first ? ORDER_REWARD : 0;
    if (coins) this.wallet?.add(coins, undefined, { r: 'order', once: 'order:' + stampId(this.store.id, m.id) });
    this._frame(t('order.done'));
    this.root.append(this._line(LINES.done[0], LINES.done[1], LINES.done[2], 'order-line clerk'));
    this.root.append(el('p', 'order-stamp', (first ? '🎉 ' : '✅ ') + t('order.stamps', { n: this._stampCount(), total: this.menu.length }) + (coins ? ` · 🪙 +${coins}` : '')));
    this.onStamp?.(this._stampCount(), this.menu.length, coins);

    // Practise saying it: listen, record yourself, play it back to compare.
    const s = sentenceFor(m);
    const practice = el('div', 'order-practice');
    practice.append(el('small', 'order-label', t('order.practice')), this._line(s.ko, s.rom, null));
    const row = el('div', 'order-actions');
    if (canSpeak) {
      const l = el('button', 'chip', '🔊 ' + t('order.listen'));
      l.onclick = () => speak(s.ko);
      row.append(l);
    }
    if (canRecord) {
      const rec = el('button', 'chip', '🎙️ ' + t('order.record'));
      const mine = el('button', 'chip', '▶️ ' + t('order.playMine'));
      mine.hidden = !this.audioUrl;
      mine.onclick = () => this.audioUrl && new Audio(this.audioUrl).play();
      rec.onclick = () => this._toggleRec(rec, mine);
      row.append(rec, mine);
    }
    practice.append(row);
    if (canRecord) practice.append(el('p', 'fine', t('order.recordNote')));
    const actions = el('div', 'order-actions');
    const more = el('button', 'primary', t('order.again'));
    more.onclick = () => this.renderList();
    actions.append(more);
    this.root.append(practice, actions);
  }

  async _toggleRec(btn, mine) {
    if (this.rec) { this._stopRec(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
        btn.textContent = '🎙️ ' + t('order.record');
        mine.hidden = false;
        new Audio(this.audioUrl).play();
      };
      this.rec = rec;
      rec.start();
      btn.textContent = '⏹️ ' + t('order.stop');
      this._recTimer = setTimeout(() => this._stopRec(), 6000); // short lines only
    } catch {
      btn.disabled = true;
      btn.textContent = t('order.noMic');
    }
  }

  _stopRec() {
    clearTimeout(this._recTimer);
    if (this.rec?.state === 'recording') this.rec.stop();
    this.rec = null;
  }
}
