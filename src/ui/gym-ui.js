// Gym panel (rules in core/gym.js). Treadmill: tap ◀ ▶ in turn to run.
// Dumbbells, bench press, push-ups: tap when the marker is in the green
// zone. Each finished set makes you a tiny bit faster (up to +3%).
import { EXERCISES, MAX_BOOST, markerAt, zoneFor, inZone } from '../core/gym.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  mashHow: {
    en: 'Tap ◀ and ▶ in turn: {n} steps in {s} seconds.',
    ko: '◀ ▶를 번갈아 눌러요: {s}초 안에 {n}걸음.',
    ja: '◀ ▶を交互に押して：{s}秒で{n}歩。',
    zh: '交替按 ◀ ▶：{s}秒内跑{n}步。',
  },
  timingHow: {
    en: 'Tap LIFT when the marker is in the green zone: {n} reps. It gets heavier near the end!',
    ko: '표시가 초록 칸에 있을 때 들기를 눌러요: {n}회. 끝으로 갈수록 무거워져요!',
    ja: 'マーカーが緑のゾーンにある時に「上げる」：{n}回。後半は重くなる！',
    zh: '标记在绿色区域时按“举起”：{n}次。越到后面越重！',
  },
  boost: {
    en: 'Workouts: {w} · walking speed +{p}% (max +{m}%)',
    ko: '운동 횟수 {w}회 · 이동속도 +{p}% (최대 +{m}%)',
    ja: '運動 {w}回 · 移動速度 +{p}%（最大 +{m}%）',
    zh: '锻炼 {w}次 · 移动速度 +{p}%（最多 +{m}%）',
  },
  start: { en: 'Start a set', ko: '한 세트 시작', ja: '1セット開始', zh: '开始一组' },
  lift: { en: 'LIFT', ko: '들기', ja: '上げる', zh: '举起' },
  done: { en: 'Set done! A tiny bit faster now. 💪', ko: '한 세트 완료! 아주 조금 빨라졌어요. 💪', ja: '1セット完了！ほんの少し速くなりました。💪', zh: '完成一组！速度稍微提升了。💪' },
  fail: { en: "Time's up: {n} to go. Try again!", ko: '시간 끝! {n}회 남았어요. 다시 도전!', ja: '時間切れ！あと{n}回。もう一回！', zh: '时间到！还差{n}次，再来！' },
  miss: { en: 'Missed!', ko: '삐끗!', ja: 'ミス！', zh: '没对准！' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const pct = (boost) => ((boost - 1) * 100).toFixed(2);

export class GymUI {
  // log: GymLog; onRep(kind) for a little animation; onSet(boost) after a set.
  constructor({ root, log, onRep, onSet }) {
    Object.assign(this, { root, log, onRep, onSet });
    this.raf = 0;
    this.timer = 0;
  }
  get open() { return !this.root.hidden; }
  show(kind) { this.kind = kind; this.root.hidden = false; this.render(); }
  close() { this._stop(); this.root.hidden = true; }
  _stop() { cancelAnimationFrame(this.raf); clearInterval(this.timer); this.raf = this.timer = 0; this.run = null; }

  _frame() {
    this._stop();
    const ex = EXERCISES[this.kind];
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, `${ex.icon} ${L(ex.name)}`));
    return ex;
  }

  render(note) {
    const ex = this._frame();
    this.root.append(el('p', 'order-hint', ex.mode === 'mash' ? tt('mashHow', { n: ex.goal, s: ex.seconds }) : tt('timingHow', { n: ex.reps })),
      el('p', 'order-hint', tt('boost', { w: this.log.workouts, p: pct(this.log.boost), m: MAX_BOOST * 100 })));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const go = el('button', 'primary', ex.icon + ' ' + tt('start'));
    go.onclick = () => (ex.mode === 'mash' ? this.mash(ex) : this.timing(ex));
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(actions);
  }

  finish() {
    const boost = this.log.finishSet(this.kind);
    this.onSet?.(boost);
    this.render('🎉 ' + tt('done'));
  }

  mash(ex) {
    this._frame();
    const run = (this.run = { steps: 0, left: ex.seconds, last: null });
    const bar = el('div', 'sauna-meter gym');
    const fill = el('div', 'sauna-fill');
    bar.append(fill);
    const info = el('p', 'karaoke-status');
    const pads = el('div', 'duck-pads');
    const paint = () => {
      fill.style.width = `${Math.min(100, (run.steps / ex.goal) * 100)}%`;
      info.textContent = `${run.steps} / ${ex.goal} · ${Math.max(0, run.left).toFixed(1)}s`;
    };
    const step = (side) => (e) => {
      e.preventDefault();
      if (this.run !== run || side === run.last) return; // in turn
      run.last = side;
      run.steps++;
      if (run.steps % 4 === 0) this.onRep?.(this.kind);
      paint();
      if (run.steps >= ex.goal) this.finish();
    };
    for (const [side, label] of [['L', '◀'], ['R', '▶']]) {
      const b = el('button', 'primary duck-pad', label);
      b.onpointerdown = step(side);
      pads.append(b);
    }
    this.root.append(bar, info, pads);
    paint();
    this.timer = setInterval(() => {
      if (this.run !== run) return;
      run.left -= 0.1;
      paint();
      if (run.left <= 0) this.render(tt('fail', { n: ex.goal - run.steps }));
    }, 100);
  }

  timing(ex) {
    this._frame();
    const run = (this.run = { rep: 0, t0: performance.now(), left: ex.reps * 3 + 6 });
    const track = el('div', 'gym-track');
    const zone = el('div', 'gym-zone');
    const mark = el('div', 'gym-mark');
    track.append(zone, mark);
    const info = el('p', 'karaoke-status');
    const flash = el('p', 'order-hint gym-flash', ' ');
    const lift = el('button', 'primary duck-pad gym-lift', tt('lift'));
    const pads = el('div', 'duck-pads');
    pads.append(lift);
    this.root.append(track, info, flash, pads);
    let x = 0;
    const paintZone = () => {
      const [a, b] = zoneFor(run.rep, ex.reps);
      zone.style.left = `${a * 100}%`;
      zone.style.width = `${(b - a) * 100}%`;
      info.textContent = `${run.rep} / ${ex.reps} · ${Math.max(0, run.left).toFixed(0)}s`;
    };
    paintZone();
    const tick = (now) => {
      if (this.run !== run) return;
      x = markerAt((now - run.t0) / 1000, 1 + run.rep * 0.04);
      mark.style.left = `${x * 100}%`;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    lift.onpointerdown = (e) => {
      e.preventDefault();
      if (this.run !== run) return;
      if (inZone(x, zoneFor(run.rep, ex.reps))) {
        run.rep++;
        this.onRep?.(this.kind);
        flash.textContent = '💪 ' + run.rep;
        if (run.rep >= ex.reps) { this.finish(); return; }
      } else flash.textContent = tt('miss');
      paintZone();
    };
    this.timer = setInterval(() => {
      if (this.run !== run) return;
      run.left -= 1;
      paintZone();
      if (run.left <= 0) this.render(tt('fail', { n: ex.reps - run.rep }));
    }, 1000);
  }
}
