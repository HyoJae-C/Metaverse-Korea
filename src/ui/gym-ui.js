// Gym panel (rules in core/gym.js). Treadmill: tap ◀ ▶ in turn to run.
// Dumbbells, bench press, push-ups: tap when the marker is in the green
// zone. Each finished set makes you a tiny bit faster (up to +1%).
// The yoga & pilates studio uses it too (rules in core/studio.js): a yoga
// flow (keep your balance in each pose) and the reformer (push on the
// out-breath).
import { EXERCISES, MAX_BOOST, markerAt, zoneFor, inZone } from '../core/gym.js';
import { STUDIO_EX, YOGA_FLOW, SWAY, driftStep, nudge, inBalance, holdStep, BALANCE_ZONE, breathAt, goodRep } from '../core/studio.js';
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
  flowHow: {
    en: 'Follow the class through {n} poses. Keep your balance in the middle with ◀ ▶ until the pose fills up.',
    ko: '수업을 따라 {n}가지 자세를 해요. ◀ ▶로 균형을 가운데에 잡고 있으면 자세가 채워져요.',
    ja: 'クラスに合わせて{n}つのポーズ。◀ ▶でバランスを真ん中に保つとポーズが完成。',
    zh: '跟着课程做{n}个体式。用 ◀ ▶ 把平衡保持在中间，直到体式完成。',
  },
  breathHow: {
    en: 'Hold PUSH while you breathe out (the circle shrinks), let go while you breathe in. {n} reps.',
    ko: '숨을 내쉴 때(원이 작아질 때) 밀기를 누르고 있고, 들이쉴 때 손을 떼요. {n}회.',
    ja: '息を吐く間（円が縮む）は「押す」を押したまま、吸う間は離して。{n}回。',
    zh: '呼气时（圆圈缩小）按住“推”，吸气时松开。{n}次。',
  },
  begin: { en: 'Begin', ko: '시작', ja: '始める', zh: '开始' },
  push: { en: 'PUSH', ko: '밀기', ja: '押す', zh: '推' },
  inhale: { en: 'Breathe in · come back', ko: '들이쉬고 · 돌아오고', ja: '吸って · 戻して', zh: '吸气 · 收回' },
  exhale: { en: 'Breathe out · push', ko: '내쉬고 · 밀고', ja: '吐いて · 押して', zh: '呼气 · 推出' },
  wobble: { en: 'Wobbling!', ko: '흔들흔들!', ja: 'グラグラ！', zh: '晃了！' },
  steady: { en: 'Steady...', ko: '좋아요, 그대로...', ja: 'いい感じ、そのまま…', zh: '很好，保持…' },
  flowDone: { en: 'Namaste. Flow done! A tiny bit faster now. 🧘', ko: '나마스테. 플로우 완료! 아주 조금 빨라졌어요. 🧘', ja: 'ナマステ。フロー完了！ほんの少し速くなりました。🧘', zh: '合十。瑜伽流完成！速度稍微提升了。🧘' },
  flowFail: { en: "Time's up at pose {n}. Breathe and try again!", ko: '{n}번째 자세에서 시간 끝! 숨 고르고 다시!', ja: '{n}つ目のポーズで時間切れ！もう一回！', zh: '第{n}个体式时时间到！调整呼吸再来！' },
  breathFail: { en: '{n} good reps. Breathe with the circle and try again!', ko: '잘된 횟수 {n}회. 원에 맞춰 숨 쉬고 다시!', ja: 'うまくできたのは{n}回。円に合わせて呼吸してもう一回！', zh: '做好了{n}次。跟着圆圈呼吸再试一次！' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const pct = (boost) => ((boost - 1) * 100).toFixed(2);
const exOf = (kind) => EXERCISES[kind] || STUDIO_EX[kind];
// The pose your character holds for each kind (others see it too).
const POSE = { treadmill: 'run', dumbbell: 'curl', bench: 'bench', pushup: 'pushup', situp: 'situp', pullup: 'pullup', reformer: 'reformer' };

export class GymUI {
  // log: GymLog; onRep(kind) for a little animation; onSet(boost) after a set.
  constructor({ root, log, onRep, onSet }) {
    Object.assign(this, { root, log, onRep, onSet });
    this.raf = 0;
    this.timer = 0;
  }
  get open() { return !this.root.hidden; }
  // The pose to hold now: the yoga flow's current pose (mountain before you begin).
  get pose() {
    if (this.root.hidden) return null;
    if (this.kind === 'yoga') return YOGA_FLOW[this.run?.step ?? 0]?.id || 'ymountain';
    return POSE[this.kind] || null;
  }
  show(kind) { this.kind = kind; this.root.hidden = false; this.render(); }
  close() { this._stop(); this.root.hidden = true; }
  _stop() { cancelAnimationFrame(this.raf); clearInterval(this.timer); this.raf = this.timer = 0; this.run = null; }

  _frame() {
    this._stop();
    const ex = exOf(this.kind);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, `${ex.icon} ${L(ex.name)}`));
    return ex;
  }

  render(note) {
    const ex = this._frame();
    const how = ex.mode === 'mash' ? tt('mashHow', { n: ex.goal, s: ex.seconds }) : ex.mode === 'flow' ? tt('flowHow', { n: YOGA_FLOW.length }) : ex.mode === 'breath' ? tt('breathHow', { n: ex.reps }) : tt('timingHow', { n: ex.reps });
    this.root.append(el('p', 'order-hint', how),
      el('p', 'order-hint', tt('boost', { w: this.log.workouts, p: pct(this.log.boost), m: MAX_BOOST * 100 })));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const go = el('button', 'primary', ex.icon + ' ' + tt(ex.mode === 'flow' || ex.mode === 'breath' ? 'begin' : 'start'));
    go.onclick = () => (ex.mode === 'mash' ? this.mash(ex) : ex.mode === 'flow' ? this.flow(ex) : ex.mode === 'breath' ? this.breath(ex) : this.timing(ex));
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(actions);
  }

  finish() {
    const boost = this.log.finishSet(this.kind);
    this.onSet?.(boost, this.kind);
    this.render('🎉 ' + tt(this.kind === 'yoga' ? 'flowDone' : 'done'));
  }

  // Yoga: one pose after another; each fills while you keep your balance.
  flow(ex) {
    this._frame();
    const run = (this.run = { step: 0, held: 0, left: ex.seconds, bal: { x: 0.5, v: 0 }, last: performance.now() });
    const pips = el('p', 'karaoke-status');
    const title = el('p', 'order-hint yoga-pose');
    const cue = el('p', 'order-hint');
    const track = el('div', 'gym-track');
    const zone = el('div', 'gym-zone');
    const mark = el('div', 'gym-mark');
    zone.style.left = `${BALANCE_ZONE[0] * 100}%`;
    zone.style.width = `${(BALANCE_ZONE[1] - BALANCE_ZONE[0]) * 100}%`;
    track.append(zone, mark);
    const bar = el('div', 'sauna-meter gym');
    const fill = el('div', 'sauna-fill');
    bar.append(fill);
    const flash = el('p', 'order-hint gym-flash', ' ');
    const pads = el('div', 'duck-pads');
    for (const [dir, label] of [[-1, '◀'], [1, '▶']]) {
      const b = el('button', 'primary duck-pad', label);
      b.onpointerdown = (e) => { e.preventDefault(); if (this.run === run) nudge(run.bal, dir); };
      pads.append(b);
    }
    this.root.append(pips, title, cue, track, bar, flash, pads);
    const paintPose = () => {
      const p = YOGA_FLOW[run.step];
      pips.textContent = YOGA_FLOW.map((q, i) => (i < run.step ? '●' : i === run.step ? '◉' : '○')).join(' ') + ` · ${Math.max(0, run.left).toFixed(0)}s`;
      title.textContent = `${p.icon} ${L(p.name)}`;
      cue.textContent = L(p.cue);
    };
    paintPose();
    const tick = (now) => {
      if (this.run !== run) return;
      const dt = Math.min(0.1, (now - run.last) / 1000);
      run.last = now;
      const pose = YOGA_FLOW[run.step];
      driftStep(run.bal, dt, SWAY[pose.id] || 1);
      const ok = inBalance(run.bal.x);
      run.held = holdStep(run.held, ok, dt);
      run.left -= dt;
      mark.style.left = `${run.bal.x * 100}%`;
      fill.style.width = `${Math.min(100, (run.held / ex.hold) * 100)}%`;
      flash.textContent = ok ? tt('steady') : tt('wobble');
      if (run.held >= ex.hold) {
        run.step++;
        run.held = 0;
        run.bal = { x: 0.5, v: 0 };
        this.onRep?.(this.kind);
        if (run.step >= YOGA_FLOW.length) { this.finish(); return; }
      }
      paintPose();
      if (run.left <= 0) { this.render(tt('flowFail', { n: run.step + 1 })); return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  // Pilates reformer: hold PUSH on the out-breath, let go on the in-breath.
  breath(ex) {
    this._frame();
    const run = (this.run = { t0: performance.now(), good: 0, cycle: 0, right: 0, total: 0, holding: false });
    const ring = el('div', 'breath-ring');
    const say = el('p', 'order-hint yoga-pose');
    const info = el('p', 'karaoke-status');
    const flash = el('p', 'order-hint gym-flash', ' ');
    const push = el('button', 'primary duck-pad gym-lift', tt('push'));
    const pads = el('div', 'duck-pads');
    pads.append(push);
    push.onpointerdown = (e) => { e.preventDefault(); run.holding = true; };
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) push.addEventListener(ev, () => { run.holding = false; });
    this.root.append(ring, say, info, flash, pads);
    const maxCycles = ex.reps + 4;
    let last = run.t0;
    const tick = (now) => {
      if (this.run !== run) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const b = breathAt((now - run.t0) / 1000, ex.period);
      if (b.cycle !== run.cycle) { // a breath finished
        if (goodRep(run.right, run.total)) {
          run.good++;
          this.onRep?.(this.kind);
          flash.textContent = '✨ ' + run.good;
          if (run.good >= ex.reps) { this.finish(); return; }
        } else flash.textContent = tt('miss');
        run.cycle = b.cycle;
        run.right = run.total = 0;
        if (b.cycle >= maxCycles) { this.render(tt('breathFail', { n: run.good })); return; }
      }
      run.total += dt;
      if (run.holding === b.push) run.right += dt;
      push.classList.toggle('held', run.holding);
      // In: the circle grows; out: it shrinks.
      const size = b.push ? 1 - b.u : b.u;
      ring.style.transform = `scale(${0.45 + 0.55 * size})`;
      ring.classList.toggle('out', b.push);
      say.textContent = tt(b.push ? 'exhale' : 'inhale');
      info.textContent = `${run.good} / ${ex.reps}`;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
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
