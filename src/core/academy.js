// 효재어학당 progress (no DOM, unit-tested). You sign up for a course, take
// its lessons in order, and pass each lesson's quiz (3 of 4 right). Passing
// a lesson for the first time pays a little; finishing every lesson of a
// course gives a certificate (수료증) and a bigger reward.
import { COURSES, courseById } from '../data/academy.js';

export const PASS_RATIO = 0.75;
export const LESSON_COINS = 2;
export const COURSE_COINS = 10;
const KEY = 'mk.academy';

export class Academy {
  constructor(storage = globalThis.localStorage, courses = COURSES) {
    this.storage = storage;
    this.courses = courses;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* corrupt: start over */ }
    const known = new Set(courses.map((c) => c.id));
    const lessons = new Set(courses.flatMap((c) => c.lessons.map((l) => l.id)));
    this.enrolled = (Array.isArray(raw.enrolled) ? raw.enrolled : []).filter((id) => known.has(id));
    this.best = {};
    for (const [id, v] of Object.entries(raw.best || {})) if (lessons.has(id) && Number.isFinite(v)) this.best[id] = Math.max(0, Math.min(1, v));
    this.certs = {};
    for (const [id, at] of Object.entries(raw.certs || {})) if (known.has(id)) this.certs[id] = Number(at) || 0;
  }

  _course(id) { return this.courses.find((c) => c.id === id) || courseById(id); }
  _save() {
    try { this.storage?.setItem(KEY, JSON.stringify({ enrolled: this.enrolled, best: this.best, certs: this.certs })); } catch { /* storage blocked */ }
  }

  isEnrolled(courseId) { return this.enrolled.includes(courseId); }
  enroll(courseId) {
    if (!this._course(courseId) || this.isEnrolled(courseId)) return false;
    this.enrolled.push(courseId);
    this._save();
    return true;
  }

  passed(lessonId) { return (this.best[lessonId] || 0) >= PASS_RATIO; }
  // Lessons open one after another: the first, then each after a pass.
  unlocked(courseId, index) {
    const c = this._course(courseId);
    if (!c || !this.isEnrolled(courseId)) return false;
    return index === 0 || this.passed(c.lessons[index - 1]?.id);
  }
  progress(courseId) {
    const c = this._course(courseId);
    const done = c ? c.lessons.filter((l) => this.passed(l.id)).length : 0;
    return { done, total: c?.lessons.length || 0 };
  }
  certified(courseId) { return !!this.certs[courseId]; }

  // Record a quiz: score right answers of total. Returns what happened.
  finishQuiz(courseId, lessonId, score, total, now = Date.now()) {
    const c = this._course(courseId);
    if (!c || !c.lessons.some((l) => l.id === lessonId) || !(total > 0)) return null;
    const ratio = Math.max(0, Math.min(1, score / total));
    const wasPassed = this.passed(lessonId);
    this.best[lessonId] = Math.max(this.best[lessonId] || 0, ratio);
    const passed = ratio >= PASS_RATIO;
    let coins = passed && !wasPassed ? LESSON_COINS : 0;
    let certificate = false;
    if (passed && !this.certified(courseId) && c.lessons.every((l) => this.passed(l.id))) {
      this.certs[courseId] = now;
      certificate = true;
      coins += COURSE_COINS;
    }
    this._save();
    return { passed, ratio, coins, certificate, firstPass: passed && !wasPassed };
  }
}

// Shuffle a quiz question's choices (seeded so a re-render keeps the order).
export function shuffled(choices, answer, seed = Math.random()) {
  const order = choices.map((_, i) => i);
  let s = Math.floor(seed * 2 ** 31) || 1;
  for (let i = order.length - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { choices: order.map((i) => choices[i]), answer: order.indexOf(answer) };
}
