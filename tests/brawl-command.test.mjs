import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newFighter, stepFight, startMove, moveTicks, STYLE_IDS, copyMatch, newMatch, packMatch, unpackMatch } from '../src/core/brawl.js';
import { createSoloCaster, createScreens, KEY_EVERY, TV } from '../src/core/brawl-tv.js';

const pair = () => { const a = newFighter(0), b = newFighter(1); a.x = -0.4; b.x = 0.4; return [a, b]; };
function command(button, delay = 0, meter = 100) {
  const [a, b] = pair(); a.sp = meter;
  stepFight(a, b, { mz: -1 });
  for (let i = 0; i < delay; i++) stepFight(a, b);
  stepFight(a, b, { mx: 1, [button]: true });
  for (let i = 0; i < 18 && a.st !== 'atk'; i++) stepFight(a, b);
  return a;
}
test('simple down/toward commands select either special and spend the same bar', () => {
  for (const [button, move] of [['p', 'palm'], ['k', 'fly']]) {
    const a = command(button);
    assert.equal(a.move, move); assert.equal(a.sp, 50);
  }
});
test('expired command and insufficient bar leave normal attacks available', () => {
  assert.equal(command('p', 31).move, 'upper');
  assert.equal(command('k', 0, 0).move, 'rk'); // (toward + kick without the bar: the roundhouse)
});
test('command history survives transmission and copies never share mutable state', () => {
  const m = newMatch('brawler', 'ninja', true);
  m.a.command.stage = 1; m.a.command.left = 20;
  const c = copyMatch(m), u = unpackMatch(JSON.parse(JSON.stringify(packMatch(m))));
  assert.deepEqual(u.a.command, m.a.command);
  c.a.command.stage = 2; assert.equal(m.a.command.stage, 1);
});
test('all styles normal hits lose 25 percent before rounding; specials keep their damage', () => {
  for (const style of STYLE_IDS) for (const id of ['lp', 'rp', 'lk', 'rk', 'upper', 'palm', 'fly']) {
    const [a, b] = pair(); a.style = style;
    const f = newFighter(0, style); a.mv = f.mv; a.sp = 100;
    startMove(a, id);
    const hits = [];
    for (let i = 0; i < moveTicks(a.mv[id]) + 90; i++) hits.push(...stepFight(a, b));
    const h = hits.find(e => e.k === 'hit');
    assert.ok(h, style + '/' + id);
    const base = id === 'palm' && a.mv[id].shot ? a.mv[id].shot.dmg : a.mv[id].dmg;
    assert.equal(h.dmg, Math.max(1, Math.round(base * (['palm', 'fly'].includes(id) ? 1 : 0.75))), style + '/' + id);
  }
});
test('solo broadcast sends status only, keeps late viewers informed, and clears on exit', () => {
  const messages = [], tv = createScreens(2);
  const cast = createSoloCaster(text => { messages.push(text); tv.heard('solo-player', text); });
  cast.start();
  for (let i = 0; i < KEY_EVERY * 3; i++) { cast.step(); tv.views.forEach(v => v.tick()); }
  assert.ok(messages.every(s => s === TV + 'p'));
  assert.equal(messages.length, 4);
  assert.equal(tv.views[0].info.solo, true); assert.equal(tv.views[0].match, null);
  cast.end(); assert.equal(tv.views[0].from, null);
  const count = messages.length; cast.step(); cast.end(); assert.equal(messages.length, count);
});
