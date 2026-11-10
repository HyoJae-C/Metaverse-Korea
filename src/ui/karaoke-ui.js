// Noraebang panel (rules in core/karaoke-game.js): pick a song, tap the big
// pad as each note reaches the line. The song is the game's own generated
// music (core/music.js), so the notes line up with the audio clock.
import { Music } from '../core/music.js';
import { trackById } from '../data/tracks.js';
import { Medals, medalFor, medalIcon } from '../core/grill-game.js';
import { KARAOKE_GAME, SONGS, LEAD_BEATS, NOTE_BEATS, chartFor, judge, karaokeScore } from '../core/karaoke-game.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Noraebang', ko: '코인 노래방', ja: 'カラオケ', zh: 'KTV' },
  howTo: {
    en: 'Tap the pad (or press Space) as each note reaches the line. Everyone in the room sees your score!',
    ko: '음표가 선에 닿을 때 패드를 탭하세요(스페이스바도 돼요). 같은 방 사람들에게 점수가 보여요!',
    ja: '音符が線に届いたらパッドをタップ（スペースキーも可）。同じ部屋の人にスコアが表示されます！',
    zh: '音符到达线时点击按键区（也可按空格）。同一房间的人都能看到你的分数！',
  },
  pick: { en: 'Pick a song', ko: '노래 고르기', ja: '曲を選ぶ', zh: '选歌' },
  easy: { en: 'easy', ko: '쉬움', ja: 'やさしい', zh: '简单' },
  normal: { en: 'normal', ko: '보통', ja: 'ふつう', zh: '普通' },
  hard: { en: 'hard', ko: '어려움', ja: 'むずかしい', zh: '困难' },
  tap: { en: 'TAP!', ko: '탭!', ja: 'タップ！', zh: '点！' },
  score: { en: 'Score {n}', ko: '점수 {n}', ja: 'スコア {n}', zh: '得分 {n}' },
  board: { en: 'Scores in this room', ko: '이 방 점수', ja: 'この部屋のスコア', zh: '本房间分数' },
  again: { en: 'Sing again', ko: '한 곡 더', ja: 'もう一曲', zh: '再唱一首' },
  you: { en: 'You', ko: '나', ja: '自分', zh: '我' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  medal: { en: '{m} medal! 🪙 +{n}', ko: '{m} 메달! 🪙 +{n}', ja: '{m}メダル！🪙 +{n}', zh: '{m}奖牌！🪙 +{n}' },
  noMedal: { en: 'No medal this time', ko: '이번엔 메달 없음', ja: '今回はメダルなし', zh: '这次没有奖牌' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const MEDAL = { gold: { en: 'Gold', ko: '금', ja: '金', zh: '金' }, silver: { en: 'Silver', ko: '은', ja: '銀', zh: '银' }, bronze: { en: 'Bronze', ko: '동', ja: '銅', zh: '铜' } };
const LABEL = { perfect: 'PERFECT', great: 'GREAT', good: 'GOOD', miss: 'MISS' };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class KaraokeUI {
  // wallet; onStart()/onEnd(): pause/resume the background music;
  // onScore(n): tell the room; onMedal(medal, coins).
  constructor({ root, wallet, onStart, onEnd, onScore, onMedal }) {
    Object.assign(this, { root, wallet, onStart, onEnd, onScore, onMedal });
    this.medals = new Medals();
    this.board = []; // [{ name, score, at }]
    this.raf = 0;
    this.music = null;
    this.onKey = (e) => { if (e.code === 'Space' && this.game) { e.preventDefault(); this.tap(); } };
  }

  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); }
  close() {
    this._stop();
    this.root.hidden = true;
  }
  _stop() {
    cancelAnimationFrame(this.raf);
    removeEventListener('keydown', this.onKey);
    if (this.game) { this.game = null; this.onEnd?.(); }
    // Each song gets its own player, so its first beat is known exactly.
    const m = this.music;
    this.music = null;
    if (m?.ctx) m.setOn(false).then(() => setTimeout(() => m.ctx.close?.(), 800));
  }

  // Someone in the room finished a song.
  addScore(name, score) {
    this.board = [{ name, score, at: Date.now() }, ...this.board.filter((b) => b.name !== name)].slice(0, 8);
    if (this.open && !this.game) this._boardEl?.replaceWith((this._boardEl = this._renderBoard()));
  }
  _renderBoard() {
    const box = el('div', 'karaoke-board');
    const list = this.board.filter((b) => Date.now() - b.at < 30 * 60 * 1000).sort((a, b) => b.score - a.score);
    if (!list.length) return box;
    box.append(el('strong', null, '🏆 ' + tt('board')));
    list.forEach((b, i) => box.append(el('div', 'karaoke-row', `${['🥇', '🥈', '🥉'][i] || '·'} ${b.name} · ${b.score}`)));
    return box;
  }

  _frame() {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🎤 ' + tt('title')));
  }

  renderStart() {
    this._frame();
    this.root.append(el('p', 'order-hint', tt('howTo')), el('strong', null, tt('pick')));
    const list = el('div', 'lp-list');
    SONGS.forEach((id, i) => {
      const tr = trackById(id);
      const b = el('button', 'lp-row');
      const best = this.medals.best(KARAOKE_GAME + ':' + id);
      b.append(el('span', 'lp-disc', '🎵'), el('span', 'lp-text', `${L(tr.name)} · ${tt(i < 2 ? 'easy' : i < 3 ? 'normal' : 'hard')} · ${tr.bpm} BPM ${best ? medalIcon(best) : ''}`));
      b.onclick = () => this.play(id);
      list.append(b);
    });
    this._boardEl = this._renderBoard();
    this.root.append(list, this._boardEl);
  }

  async play(id) {
    this._frame();
    const tr = trackById(id);
    const notes = chartFor(id, tr.bpm);
    const g = (this.game = { id, notes, hit: notes.map(() => false), points: 0, combo: 0, start: 0, flash: null });
    const cv = el('canvas', 'karaoke-lane');
    cv.width = 640; cv.height = 160;
    const pad = el('button', 'primary karaoke-pad', '🎤 ' + tt('tap'));
    pad.onpointerdown = (e) => { e.preventDefault(); this.tap(); };
    const status = el('p', 'karaoke-status', tt('score', { n: 0 }));
    this.root.append(cv, status, pad);
    addEventListener('keydown', this.onKey);
    this.onStart?.();
    this.music = new Music();
    this.music.setTrack(id);
    if (!(await this.music.setOn(true))) { this.renderStart(); return; } // no Web Audio
    if (this.game !== g) return;
    g.start = this.music.nextTime; // the song's first step
    const ctx = this.music.ctx;
    const end = notes[notes.length - 1] + 1.2;
    const beat = 60 / tr.bpm;
    const draw = () => {
      if (this.game !== g) return;
      const t = ctx.currentTime - g.start;
      // Notes that passed the line unhit are misses.
      for (let i = 0; i < notes.length; i++) if (!g.hit[i] && t - notes[i] > 0.22) { g.hit[i] = 'miss'; g.combo = 0; g.flash = { label: 'miss', at: t }; }
      const c = cv.getContext('2d');
      c.fillStyle = '#1d1630'; c.fillRect(0, 0, cv.width, cv.height);
      const lineX = 90, pps = 260; // pixels per second
      // beat lines
      c.strokeStyle = 'rgba(255,255,255,0.08)';
      for (let b = Math.floor(t / beat); b < t / beat + 3; b++) { const x = lineX + (b * beat - t) * pps; c.beginPath(); c.moveTo(x, 20); c.lineTo(x, 140); c.stroke(); }
      c.strokeStyle = '#ffd166'; c.lineWidth = 4; c.beginPath(); c.moveTo(lineX, 14); c.lineTo(lineX, 146); c.stroke(); c.lineWidth = 1;
      for (let i = 0; i < notes.length; i++) {
        const x = lineX + (notes[i] - t) * pps;
        if (x < -30 || x > cv.width + 30) continue;
        if (g.hit[i] && g.hit[i] !== 'miss') continue;
        c.fillStyle = g.hit[i] === 'miss' ? '#6b6478' : ['#ff7eb6', '#7ee0ff', '#b9ff7e'][i % 3];
        c.beginPath(); c.arc(x, 80, 20, 0, Math.PI * 2); c.fill();
      }
      if (g.flash && t - g.flash.at < 0.5) {
        c.fillStyle = g.flash.label === 'miss' ? '#ff6b6b' : '#ffd166';
        c.font = '900 30px system-ui, sans-serif'; c.textAlign = 'center';
        c.fillText(LABEL[g.flash.label] + (g.combo > 2 ? `  ${g.combo} COMBO` : ''), cv.width / 2 + 40, 40);
      }
      if (t < LEAD_BEATS * beat) {
        c.fillStyle = '#fff'; c.font = '900 40px system-ui, sans-serif'; c.textAlign = 'center';
        c.fillText(String(Math.max(1, Math.ceil((LEAD_BEATS * beat - t) / beat / 2))), cv.width / 2, 95);
      }
      status.textContent = tt('score', { n: karaokeScore(g.points, notes.length) });
      if (t > end) { this.finish(g); return; }
      this.raf = requestAnimationFrame(draw);
    };
    this.raf = requestAnimationFrame(draw);
  }

  tap() {
    const g = this.game;
    if (!g?.start || !this.music?.ctx) return;
    const t = this.music.ctx.currentTime - g.start;
    const j = judge(g.notes, g.hit, t);
    if (!j) return;
    g.hit[j.index] = j.label;
    g.points += j.points;
    g.combo++;
    g.flash = { label: j.label, at: t };
  }

  finish(g) {
    const score = karaokeScore(g.points, g.notes.length);
    this._frame();
    const medal = medalFor(score);
    const coins = medal ? this.medals.add(KARAOKE_GAME + ':' + g.id, medal) : 0;
    if (coins) this.wallet.add(coins, undefined, { r: 'medal', once: 'medal:' + KARAOKE_GAME + ':' + g.id + ':' + medal });
    this.onScore?.(score);
    this.addScore(tt('you'), score);
    const res = el('div', 'grill-result');
    res.append(el('span', 'grill-medal', medal ? medalIcon(medal) : '🎤'), el('strong', null, tt('score', { n: score })));
    res.append(el('p', 'order-hint', medal ? (coins ? tt('medal', { m: L(MEDAL[medal]), n: coins }) : L(MEDAL[medal])) : tt('noMedal')));
    const again = el('button', 'primary', tt('again'));
    again.onclick = () => this.renderStart();
    const actions = el('div', 'order-actions');
    actions.append(again);
    this._boardEl = this._renderBoard();
    this.root.append(res, this._boardEl, actions);
    this.onMedal?.(medal, coins);
  }
}

export { NOTE_BEATS };
