// Curve Runway panel (rules in core/runway-game.js): walk the runway to the
// beat, then three poses for the cameras. Kept small at the bottom of the
// screen, so you can watch yourself walk; main.js moves the character from
// walkState() and plays the poses (onPose).
import { Music } from '../core/music.js';
import { trackById } from '../data/tracks.js';
import { Medals, medalFor, medalIcon } from '../core/grill-game.js';
import { RUNWAY_GAME, RUNWAY_TRACK, POSES, SHOW_BEATS, runwayChart, judgeTap, runwayScore, walkAt } from '../core/runway-game.js';
import { L, fmt } from './pocha-ui.js';

export const RUNWAY_TEXT = {
  open: { en: 'Walk the runway', ko: '런웨이 걷기', ja: 'ランウェイを歩く', zh: '走T台' },
  title: { en: 'Curve Runway', ko: '커브 런웨이', ja: 'カーブ・ランウェイ', zh: '曲线T台' },
  howTo: {
    en: 'Tap (or press Space) as each step reaches the line to walk to the beat. At the end, the big 📸 notes are your three poses for the cameras: they count double.',
    ko: '발자국이 선에 닿을 때 탭(스페이스바도 돼요)하면 박자에 맞춰 걸어요. 끝에 오는 큰 📸는 카메라 앞 포즈 세 번이에요. 점수가 두 배예요.',
    ja: '足あとが線に届いたらタップ（スペースキーも可）してリズムに合わせて歩こう。最後の大きな📸はカメラの前の3つのポーズ、得点は2倍です。',
    zh: '脚印到达线时点击（也可按空格），踩着节拍走。最后的大📸是镜头前的三个姿势，得分翻倍。',
  },
  fact: {
    en: 'Seoul Fashion Week has been held at DDP since the building opened in 2014.',
    ko: '서울패션위크는 2014년 DDP가 문을 연 뒤로 이곳에서 열리고 있어요.',
    ja: 'ソウルファッションウィークは、2014年にDDPが開館して以来ここで開かれています。',
    zh: '首尔时装周自2014年DDP开馆以来一直在这里举办。',
  },
  start: { en: 'Walk!', ko: '워킹 시작!', ja: 'ウォーキング！', zh: '开始走秀！' },
  tap: { en: 'STEP!', ko: '스텝!', ja: 'ステップ！', zh: '迈步！' },
  pose: { en: 'POSE!', ko: '포즈!', ja: 'ポーズ！', zh: '摆姿势！' },
  score: { en: 'Score {n}', ko: '점수 {n}', ja: 'スコア {n}', zh: '得分 {n}' },
  again: { en: 'Walk again', ko: '한 번 더', ja: 'もう一回', zh: '再走一次' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  best: { en: 'Best: {m}', ko: '최고 기록: {m}', ja: 'ベスト：{m}', zh: '最佳：{m}' },
  noBest: { en: 'No medal yet', ko: '아직 메달 없음', ja: 'まだメダルなし', zh: '还没有奖牌' },
  medal: { en: '{m} medal! 🪙 +{n}', ko: '{m} 메달! 🪙 +{n}', ja: '{m}メダル！🪙 +{n}', zh: '{m}奖牌！🪙 +{n}' },
  noMedal: { en: 'No medal this time', ko: '이번엔 메달 없음', ja: '今回はメダルなし', zh: '这次没有奖牌' },
  enter: { en: 'Go in to the Curve Runway', ko: '커브 런웨이로 들어가기', ja: 'カーブ・ランウェイに入る', zh: '进入曲线T台' },
  toHall: { en: 'Back to DDP Hall', ko: 'DDP 홀로 나가기', ja: 'DDPホールに戻る', zh: '回到DDP大厅' },
  back: { en: 'Walking back…', ko: '돌아가는 중…', ja: '戻っています…', zh: '往回走…' },
};
const tt = (k, v) => fmt(L(RUNWAY_TEXT[k]), v);
const MEDAL = { gold: { en: 'Gold', ko: '금', ja: '金', zh: '金' }, silver: { en: 'Silver', ko: '은', ja: '銀', zh: '银' }, bronze: { en: 'Bronze', ko: '동', ja: '銅', zh: '铜' } };
const LABEL = { perfect: 'PERFECT', great: 'GREAT', good: 'GOOD', miss: 'MISS' };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class RunwayUI {
  // wallet; onStart()/onEnd(): pause/resume the background music and take
  // or give back the camera; onPose(i, kind, label): pose i (POSES[i]) is
  // due, label null when missed; onMedal(medal, coins).
  constructor({ root, wallet, onStart, onEnd, onPose, onMedal }) {
    Object.assign(this, { root, wallet, onStart, onEnd, onPose, onMedal });
    this.medals = new Medals();
    this.raf = 0;
    this.music = null;
    this.game = null;
    this.onKey = (e) => {
      if (!this.game || (e.code !== 'Space' && e.code !== 'Enter') || e.repeat) return;
      e.preventDefault(); e.stopPropagation();
      this.tap();
    };
  }

  get open() { return !this.root.hidden; }
  // While the show is on: main.js walks the character.
  get walking() { return !!this.game?.start; }
  walkState() {
    const g = this.game;
    if (!g?.start || !this.music?.ctx) return null;
    return walkAt(this.music.ctx.currentTime - g.start, g.bpm);
  }
  show() { this.root.hidden = false; this.renderStart(); }
  close() { this._stop(); this.root.hidden = true; }
  _stop() {
    cancelAnimationFrame(this.raf);
    removeEventListener('keydown', this.onKey, true);
    if (this.game) { this.game = null; this.onEnd?.(); }
    const m = this.music;
    this.music = null;
    if (m?.ctx) m.setOn(false).then(() => setTimeout(() => m.ctx.close?.(), 800));
  }
  _frame() {
    this._stop();
    this.root.classList.remove('runway-live');
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '👠 ' + tt('title')));
  }

  renderStart() {
    this._frame();
    const best = this.medals.best(RUNWAY_GAME);
    this.root.append(
      el('p', 'order-hint', tt('howTo')),
      el('p', 'kimchi-fact', '🏙️ ' + tt('fact')),
      el('p', 'grill-best', best ? tt('best', { m: medalIcon(best) + ' ' + L(MEDAL[best]) }) : tt('noBest')),
    );
    const go = el('button', 'primary', '👠 ' + tt('start'));
    go.onclick = () => this.play();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(actions);
  }

  async play() {
    this._frame();
    this.root.classList.add('runway-live');
    const tr = trackById(RUNWAY_TRACK);
    const notes = runwayChart(tr.bpm);
    const g = (this.game = { notes, hit: notes.map(() => false), points: 0, combo: 0, start: 0, bpm: tr.bpm, flash: null, posed: new Set() });
    const cv = el('canvas', 'karaoke-lane');
    cv.width = 640; cv.height = 120;
    const pad = el('button', 'primary karaoke-pad runway-pad', '👣 ' + tt('tap'));
    pad.onpointerdown = (e) => { e.preventDefault(); this.tap(); };
    const status = el('p', 'karaoke-status', tt('score', { n: 0 }));
    this.root.append(cv, status, pad);
    addEventListener('keydown', this.onKey, true);
    this.music = new Music();
    this.music.setTrack(RUNWAY_TRACK);
    if (!(await this.music.setOn(true))) { this.renderStart(); return; } // no Web Audio
    if (this.game !== g) return;
    g.start = this.music.nextTime;
    this.onStart?.();
    const ctx = this.music.ctx;
    const beat = 60 / tr.bpm, end = SHOW_BEATS * beat;
    const draw = () => {
      if (this.game !== g) return;
      const t = ctx.currentTime - g.start;
      notes.forEach((n, i) => {
        if (!g.hit[i] && t - n.t > 0.22) {
          g.hit[i] = 'miss'; g.combo = 0; g.flash = { label: 'miss', at: t };
          if (n.kind === 'pose') this._pose(n.i, null);
        }
      });
      const c = cv.getContext('2d');
      c.fillStyle = '#1b1a22'; c.fillRect(0, 0, cv.width, cv.height);
      const lineX = 90, pps = 240, mid = 64;
      c.strokeStyle = 'rgba(255,255,255,0.07)';
      for (let b = Math.floor(t / beat); b < t / beat + 3; b++) { const x = lineX + (b * beat - t) * pps; c.beginPath(); c.moveTo(x, 14); c.lineTo(x, 114); c.stroke(); }
      c.strokeStyle = '#e8d9ff'; c.lineWidth = 4; c.beginPath(); c.moveTo(lineX, 10); c.lineTo(lineX, 118); c.stroke(); c.lineWidth = 1;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      notes.forEach((n, i) => {
        const x = lineX + (n.t - t) * pps;
        if (x < -40 || x > cv.width + 40 || (g.hit[i] && g.hit[i] !== 'miss')) return;
        const big = n.kind === 'pose';
        c.globalAlpha = g.hit[i] === 'miss' ? 0.35 : 1;
        c.fillStyle = big ? '#ffd166' : i % 2 ? '#c9b8ff' : '#f7a8d0';
        c.beginPath(); c.arc(x, mid + (big ? 0 : i % 2 ? 12 : -12), big ? 26 : 15, 0, Math.PI * 2); c.fill();
        c.font = `${big ? 26 : 16}px system-ui, sans-serif`;
        c.fillText(big ? '📸' : '👣', x, mid + (big ? 1 : i % 2 ? 13 : -11));
        c.globalAlpha = 1;
      });
      if (g.flash && t - g.flash.at < 0.5) {
        c.fillStyle = g.flash.label === 'miss' ? '#ff6b6b' : '#ffd166';
        c.font = '900 24px system-ui, sans-serif';
        c.fillText(LABEL[g.flash.label] + (g.combo > 2 ? `  ${g.combo} COMBO` : ''), cv.width / 2 + 40, 22);
      }
      const w = walkAt(t, g.bpm);
      if (w.phase === 'wait') {
        c.fillStyle = '#fff'; c.font = '900 40px system-ui, sans-serif';
        c.fillText(String(Math.max(1, Math.ceil(-t / beat + 4))), cv.width / 2, mid);
      }
      pad.textContent = w.phase === 'back' ? '👏' : w.phase === 'pose' || (w.phase === 'walk' && w.along > 0.9) ? '📸 ' + tt('pose') : '👣 ' + tt('tap');
      pad.disabled = w.phase === 'back';
      status.textContent = w.phase === 'back' ? tt('back') : tt('score', { n: runwayScore(g.points, notes) });
      if (t > end) { this.finish(g); return; }
      this.raf = requestAnimationFrame(draw);
    };
    this.raf = requestAnimationFrame(draw);
  }

  _pose(i, label) {
    const g = this.game;
    if (!g || g.posed.has(i)) return;
    g.posed.add(i);
    this.onPose?.(i, POSES[i], label);
  }

  tap() {
    const g = this.game;
    if (!g?.start || !this.music?.ctx) return;
    const t = this.music.ctx.currentTime - g.start;
    const j = judgeTap(g.notes, g.hit, t);
    if (!j) return;
    g.hit[j.index] = j.label;
    g.points += j.points;
    g.combo++;
    g.flash = { label: j.label, at: t };
    const n = g.notes[j.index];
    if (n.kind === 'pose') this._pose(n.i, j.label);
  }

  finish(g) {
    const score = runwayScore(g.points, g.notes);
    this._frame();
    const medal = medalFor(score);
    const coins = medal ? this.medals.add(RUNWAY_GAME, medal) : 0;
    if (coins) this.wallet.add(coins);
    const res = el('div', 'grill-result');
    res.append(el('span', 'grill-medal', medal ? medalIcon(medal) : '👠'), el('strong', null, tt('score', { n: score })));
    res.append(el('p', 'order-hint', medal ? (coins ? tt('medal', { m: L(MEDAL[medal]), n: coins }) : L(MEDAL[medal])) : tt('noMedal')));
    const again = el('button', 'primary', tt('again'));
    again.onclick = () => this.play();
    const actions = el('div', 'order-actions');
    actions.append(again);
    this.root.append(res, actions);
    this.onMedal?.(medal, coins);
  }
}
