// 효재대학교 어학당 course book: pick a course (grouped by stage), sign up, study
// each lesson (teaching points and new words), then take its quiz. A course
// finished end to end gives a certificate (수료증). Rules in core/academy.js.
import { COURSES, STAGES, courseById } from '../data/academy.js';
import { PASS_RATIO, LESSON_COINS, COURSE_COINS, shuffled } from '../core/academy.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Hyojae University Korean Academy', ko: '효재대학교 어학당', ja: 'ヒョジェ大学 語学堂', zh: '孝在大学语学堂' },
  intro: {
    en: 'Choose a course and sign up. Lessons open one by one: study, then pass the quiz (3 of 4) to move on. Finish every lesson for a certificate!',
    ko: '과정을 골라 수강 신청하세요. 레슨은 하나씩 열려요. 공부하고 퀴즈(4문제 중 3개)를 통과하면 다음 레슨으로! 모두 마치면 수료증을 드려요.',
    ja: 'コースを選んで受講申請しよう。レッスンは順番に開きます。勉強してクイズ（4問中3問）に合格すると次へ。全部終えると修了証！',
    zh: '选择课程并报名。课程按顺序开放：学习后通过测验（4题对3题）进入下一课。全部完成可获得结业证书！',
  },
  lessons: { en: '{n} lessons', ko: '{n}강', ja: '{n}レッスン', zh: '{n}课' },
  progress: { en: '{d}/{n} done', ko: '{d}/{n}강 완료', ja: '{d}/{n} 完了', zh: '已完成 {d}/{n}' },
  enroll: { en: 'Sign up', ko: '수강 신청', ja: '受講申請', zh: '报名' },
  enrolled: { en: 'Signed up! Lesson 1 is open.', ko: '수강 신청 완료! 1강이 열렸어요.', ja: '受講申請完了！レッスン1が開きました。', zh: '报名成功！第1课已开放。' },
  studying: { en: 'Studying', ko: '수강 중', ja: '受講中', zh: '学习中' },
  certified: { en: 'Certified', ko: '수료', ja: '修了', zh: '已结业' },
  back: { en: '◀ Back', ko: '◀ 뒤로', ja: '◀ 戻る', zh: '◀ 返回' },
  locked: { en: 'Pass the lesson before to open this one.', ko: '앞 레슨을 통과하면 열려요.', ja: '前のレッスンに合格すると開きます。', zh: '通过上一课后开放。' },
  goal: { en: 'Goal', ko: '학습 목표', ja: '学習目標', zh: '学习目标' },
  points: { en: 'Key points', ko: '핵심 표현', ja: 'ポイント', zh: '重点表达' },
  words: { en: 'New words', ko: '새 단어', ja: '新しい単語', zh: '生词' },
  quiz: { en: 'Take the quiz', ko: '퀴즈 풀기', ja: 'クイズに挑戦', zh: '做测验' },
  qOf: { en: 'Question {i} / {n}', ko: '{i} / {n}번 문제', ja: '{i} / {n}問目', zh: '第{i} / {n}题' },
  right: { en: 'Correct! 🎉', ko: '정답이에요! 🎉', ja: '正解！🎉', zh: '答对了！🎉' },
  wrong: { en: 'Not quite. The answer is: {a}', ko: '아쉬워요. 정답은 {a}', ja: '残念。正解は {a}', zh: '不对哦。正确答案是：{a}' },
  next: { en: 'Next ▶', ko: '다음 ▶', ja: '次へ ▶', zh: '下一题 ▶' },
  score: { en: 'Score: {s} / {n}', ko: '점수: {s} / {n}', ja: '点数: {s} / {n}', zh: '得分：{s} / {n}' },
  pass: { en: 'Passed! The next lesson is open.', ko: '통과! 다음 레슨이 열렸어요.', ja: '合格！次のレッスンが開きました。', zh: '通过！下一课已开放。' },
  passAgain: { en: 'Passed again. Nice review!', ko: '또 통과! 복습 잘했어요.', ja: 'また合格！いい復習でした。', zh: '又通过了！复习得不错。' },
  fail: { en: 'You need {k} right to pass. Review the lesson and try again!', ko: '{k}개 이상 맞혀야 통과예요. 레슨을 다시 보고 도전해요!', ja: '合格には{k}問正解が必要です。復習してもう一度！', zh: '答对{k}题才能通过。复习一下再试试！' },
  coins: { en: '🪙 +{n}', ko: '🪙 +{n}', ja: '🪙 +{n}', zh: '🪙 +{n}' },
  retry: { en: 'Try again', ko: '다시 풀기', ja: 'もう一度', zh: '再试一次' },
  toLesson: { en: 'Back to the lesson', ko: '레슨 다시 보기', ja: 'レッスンに戻る', zh: '回到课程' },
  toCourse: { en: 'Course list', ko: '레슨 목록', ja: 'レッスン一覧', zh: '课程列表' },
  cert: { en: 'Certificate of Completion', ko: '수료증', ja: '修了証', zh: '结业证书' },
  certText: { en: '{name} has completed the {course} course at Hyojae University Korean Academy.', ko: '위 사람은 효재대학교 어학당 {course} 과정을 성실히 마쳤기에 이 수료증을 드립니다.', ja: '{name}さんは、ヒョジェ大学 語学堂{course}コースを修了しました。', zh: '{name} 已完成孝在大学语学堂{course}课程。' },
  certShow: { en: '🎓 See certificate', ko: '🎓 수료증 보기', ja: '🎓 修了証を見る', zh: '🎓 查看证书' },
  certNew: { en: 'Course complete! 🎓 Here is your certificate.', ko: '과정 수료! 🎓 수료증을 받았어요.', ja: 'コース修了！🎓 修了証をどうぞ。', zh: '课程结业！🎓 这是你的证书。' },
  rewards: { en: 'Rewards: 🪙 {l} for each lesson you pass, 🪙 {c} for finishing a course.', ko: '보상: 레슨 통과마다 🪙 {l}, 과정 수료 시 🪙 {c}', ja: '報酬：レッスン合格ごとに🪙 {l}、コース修了で🪙 {c}', zh: '奖励：每通过一课 🪙 {l}，结业 🪙 {c}' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const NEED = (n) => Math.ceil(n * PASS_RATIO);

export class AcademyUI {
  // academy: Academy (core); name(): the player's name; onReward(coins).
  constructor({ root, academy, name, onReward, sfx }) {
    Object.assign(this, { root, academy, name, onReward, sfx });
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  _head(title, back) {
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    const kids = [x];
    if (back) {
      const b = el('button', 'chip ac-back', tt('back'));
      b.onclick = back;
      kids.push(b);
    }
    kids.push(el('h3', null, title));
    this.root.replaceChildren(...kids);
    this.root.scrollTop = 0;
  }

  // All courses, grouped by stage.
  show() {
    this._head('🏫 ' + tt('title'));
    this.root.append(el('p', 'order-hint', tt('intro')), el('p', 'order-hint', tt('rewards', { l: LESSON_COINS, c: COURSE_COINS })));
    for (const st of STAGES) {
      const list = COURSES.filter((c) => c.stage === st.id);
      if (!list.length) continue;
      this.root.append(el('div', 'ac-stage', L(st.name)));
      const grid = el('div', 'ac-grid');
      for (const c of list) {
        const { done, total } = this.academy.progress(c.id);
        const card = el('button', 'ac-card');
        card.style.setProperty('--course', c.color);
        const status = this.academy.certified(c.id) ? '🎓 ' + tt('certified')
          : this.academy.isEnrolled(c.id) ? tt('studying') + ' · ' + tt('progress', { d: done, n: total })
            : tt('lessons', { n: total });
        card.append(el('span', 'ac-icon', c.icon), el('strong', null, L(c.name)), el('small', null, status));
        if (this.academy.isEnrolled(c.id)) {
          const bar = el('span', 'ac-bar');
          const fill = el('span');
          fill.style.width = `${(done / total) * 100}%`;
          bar.append(fill);
          card.append(bar);
        }
        card.onclick = () => this.course(c.id);
        grid.append(card);
      }
      this.root.append(grid);
    }
  }

  course(id, note) {
    const c = courseById(id);
    if (!c) return;
    this._head(`${c.icon} ${L(c.name)}`, () => this.show());
    this.root.append(el('p', 'order-hint', L(c.about)));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    if (!this.academy.isEnrolled(id)) {
      const go = el('button', 'primary', '📝 ' + tt('enroll'));
      go.onclick = () => { this.academy.enroll(id); this.sfx?.(); this.course(id, '✅ ' + tt('enrolled')); };
      const a = el('div', 'order-actions');
      a.append(go);
      this.root.append(a);
    } else if (this.academy.certified(id)) {
      const cb = el('button', 'primary', tt('certShow'));
      cb.onclick = () => this.certificate(id);
      const a = el('div', 'order-actions');
      a.append(cb);
      this.root.append(a);
    }
    const list = el('ol', 'ac-lessons');
    c.lessons.forEach((l, i) => {
      const open = this.academy.unlocked(id, i);
      const done = this.academy.passed(l.id);
      const row = el('li');
      const b = el('button', 'ac-lesson' + (done ? ' done' : '') + (open ? '' : ' locked'));
      b.append(el('span', 'ac-num', done ? '✓' : open ? String(i + 1) : '🔒'), el('span', null, `${l.title.ko}`), el('small', null, l.title.en));
      b.disabled = !open;
      if (!open && this.academy.isEnrolled(id)) b.title = tt('locked');
      b.onclick = () => this.lesson(id, i);
      row.append(b);
      list.append(row);
    });
    this.root.append(list);
  }

  lesson(courseId, i) {
    const c = courseById(courseId);
    const l = c?.lessons[i];
    if (!l) return;
    this._head(`${i + 1}. ${l.title.ko}`, () => this.course(courseId));
    this.root.append(el('p', 'ac-sub', l.title.en));
    const goal = el('div', 'ac-box');
    goal.style.setProperty('--course', c.color);
    goal.append(el('b', null, '🎯 ' + tt('goal')), el('p', null, L(l.goal)));
    this.root.append(goal, el('div', 'ac-stage', '📌 ' + tt('points')));
    for (const p of l.points) {
      const card = el('div', 'ac-point');
      card.style.setProperty('--course', c.color);
      card.append(el('p', 'ac-ko', p.ko), el('p', 'ac-en', p.en));
      if (p.note) card.append(el('p', 'ac-note', '💡 ' + p.note));
      this.root.append(card);
    }
    this.root.append(el('div', 'ac-stage', '📒 ' + tt('words')));
    const words = el('div', 'ac-words');
    for (const w of l.words) {
      const row = el('div', 'ac-word');
      row.append(el('b', null, w.ko), el('span', null, w.en));
      words.append(row);
    }
    this.root.append(words);
    const a = el('div', 'order-actions');
    const q = el('button', 'primary', '✏️ ' + tt('quiz'));
    q.onclick = () => this.quiz(courseId, i);
    a.append(q);
    this.root.append(a);
  }

  quiz(courseId, i) {
    const c = courseById(courseId);
    const l = c.lessons[i];
    const qs = l.quiz.map((q) => ({ ...q, ...shuffled(q.choices, q.answer) }));
    let k = 0, score = 0;
    const ask = () => {
      const q = qs[k];
      this._head(`✏️ ${l.title.ko}`, () => this.lesson(courseId, i));
      this.root.append(el('p', 'ac-sub', tt('qOf', { i: k + 1, n: qs.length })), el('p', 'ac-q', q.q));
      const opts = el('div', 'ac-opts');
      const fb = el('p', 'ac-fb', '');
      const next = el('button', 'primary', '');
      next.hidden = true;
      q.choices.forEach((txt, j) => {
        const b = el('button', 'ac-opt', txt);
        b.onclick = () => {
          for (const o of opts.children) o.disabled = true;
          opts.children[q.answer].classList.add('right');
          if (j === q.answer) { score++; fb.textContent = tt('right'); this.sfx?.(); } else {
            b.classList.add('wrong');
            fb.textContent = tt('wrong', { a: q.choices[q.answer] });
          }
          if (q.why) fb.textContent += ' ' + q.why;
          next.textContent = k + 1 < qs.length ? tt('next') : '🏁 ' + tt('score', { s: score, n: qs.length });
          next.hidden = false;
        };
        opts.append(b);
      });
      next.onclick = () => { k++; if (k < qs.length) ask(); else this._result(courseId, i, score, qs.length); };
      const a = el('div', 'order-actions');
      a.append(next);
      this.root.append(opts, fb, a);
    };
    ask();
  }

  _result(courseId, i, score, n) {
    const c = courseById(courseId);
    const l = c.lessons[i];
    const r = this.academy.finishQuiz(courseId, l.id, score, n);
    if (r?.coins) this.onReward?.(r.coins);
    this._head(`🏁 ${l.title.ko}`, () => this.course(courseId));
    this.root.append(el('p', 'ac-score', tt('score', { s: score, n })));
    const msg = r.passed ? (r.firstPass ? tt('pass') : tt('passAgain')) : tt('fail', { k: NEED(n) });
    this.root.append(el('p', 'order-hint claw-note', (r.passed ? '🎉 ' : '📖 ') + msg + (r.coins ? '  ' + tt('coins', { n: r.coins }) : '')));
    const a = el('div', 'order-actions');
    if (r.certificate) {
      this.root.append(el('p', 'order-hint claw-note', tt('certNew')));
      const cb = el('button', 'primary', tt('certShow'));
      cb.onclick = () => this.certificate(courseId);
      a.append(cb);
    } else if (r.passed && i + 1 < c.lessons.length) {
      const nx = el('button', 'primary', `${i + 2}. ${c.lessons[i + 1].title.ko} ▶`);
      nx.onclick = () => this.lesson(courseId, i + 1);
      a.append(nx);
    } else if (!r.passed) {
      const again = el('button', 'primary', tt('retry'));
      again.onclick = () => this.quiz(courseId, i);
      const back = el('button', 'chip', tt('toLesson'));
      back.onclick = () => this.lesson(courseId, i);
      a.append(again, back);
    }
    const list = el('button', 'chip', tt('toCourse'));
    list.onclick = () => this.course(courseId);
    a.append(list);
    this.root.append(a);
  }

  certificate(courseId) {
    const c = courseById(courseId);
    const at = this.academy.certs[courseId];
    if (!c || !at) return;
    this._head('🎓 ' + tt('cert'), () => this.course(courseId));
    const card = el('div', 'ac-cert');
    card.style.setProperty('--course', c.color);
    const d = new Date(at);
    card.append(
      el('p', 'ac-cert-title', '수 료 증'),
      el('p', 'ac-cert-sub', 'Certificate of Completion'),
      el('p', 'ac-cert-name', this.name()),
      el('p', 'ac-cert-course', `${c.icon} ${c.name.ko} · ${c.name.en}`),
      el('p', 'ac-cert-text', tt('certText', { name: this.name(), course: L(c.name) })),
      el('p', 'ac-cert-date', `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`),
      el('p', 'ac-cert-seal', '효재대학교 어학당장 🔴'),
    );
    this.root.append(card);
  }
}
