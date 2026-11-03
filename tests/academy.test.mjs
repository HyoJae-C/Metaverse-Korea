import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Academy, shuffled, LESSON_COINS, COURSE_COINS } from '../src/core/academy.js';
import { COURSES } from '../src/data/academy.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('the curriculum is complete and every quiz has a valid answer', () => {
  assert.deepEqual(COURSES.map((c) => c.id), ['hangul', 'topik1', 'topik2', 'topik3', 'topik4', 'advanced']);
  const ids = new Set();
  for (const c of COURSES) {
    assert.ok(c.lessons.length >= 6, c.id);
    for (const l of c.lessons) {
      assert.ok(!ids.has(l.id), 'unique lesson id ' + l.id);
      ids.add(l.id);
      assert.ok(l.points.length >= 3 && l.words.length >= 5 && l.quiz.length === 4, l.id);
      for (const q of l.quiz) {
        assert.ok(q.answer >= 0 && q.answer < q.choices.length, `${l.id}: ${q.q}`);
        assert.equal(new Set(q.choices).size, q.choices.length, `${l.id}: duplicate choice`);
      }
    }
  }
});

test('enrol, unlock in order, pass, and get a certificate', () => {
  const tiny = [{ id: 'c', lessons: [{ id: 'a' }, { id: 'b' }] }];
  const s = mem();
  const ac = new Academy(s, tiny);
  assert.equal(ac.unlocked('c', 0), false, 'not before signing up');
  assert.ok(ac.enroll('c'));
  assert.ok(ac.unlocked('c', 0));
  assert.equal(ac.unlocked('c', 1), false);
  assert.equal(ac.finishQuiz('c', 'a', 2, 4).passed, false);
  const r = ac.finishQuiz('c', 'a', 3, 4);
  assert.deepEqual([r.passed, r.coins, r.certificate], [true, LESSON_COINS, false]);
  assert.equal(ac.finishQuiz('c', 'a', 4, 4).coins, 0, 'paid once');
  assert.ok(ac.unlocked('c', 1));
  const last = ac.finishQuiz('c', 'b', 4, 4);
  assert.deepEqual([last.certificate, last.coins], [true, LESSON_COINS + COURSE_COINS]);
  const again = new Academy(s, tiny);
  assert.ok(again.certified('c'));
  assert.deepEqual(again.progress('c'), { done: 2, total: 2 });
});

test('shuffled choices keep the right answer', () => {
  for (let k = 0; k < 20; k++) {
    const r = shuffled(['a', 'b', 'c', 'd'], 2, k / 20);
    assert.equal(r.choices[r.answer], 'c');
    assert.deepEqual([...r.choices].sort(), ['a', 'b', 'c', 'd']);
  }
});
