import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mountSideAd, sideAdOn, SIDE_AD_MEDIA } from '../src/core/side-ad.js';

function fakeDom() {
  const el = (tag) => ({ tag, attrs: {}, style: {}, kids: [], setAttribute(k, v) { this.attrs[k] = v; }, append(...k) { this.kids.push(...k); } });
  const body = { kids: [], appendChild(k) { this.kids.push(k); } };
  return { body, createElement: el };
}
function fakeWin(matches) {
  const mq = { matches, fns: [], addEventListener(_, f) { this.fns.push(f); } };
  return { mq, matchMedia: (q) => { assert.equal(q, SIDE_AD_MEDIA); return mq; } };
}
const cfg = { enabled: true, slot: '1234567890' };

test('no slot or no publisher ID: no banner', () => {
  assert.equal(sideAdOn({ enabled: true, slot: '' }, 'ca-pub-1'), false);
  assert.equal(sideAdOn(cfg, ''), false);
  assert.equal(sideAdOn({ ...cfg, enabled: false }, 'ca-pub-1'), false);
  assert.equal(mountSideAd({ cfg: { enabled: true, slot: '' }, client: 'ca-pub-1', win: fakeWin(true), doc: fakeDom() }), null);
});

test('wide screen: the 468x60 slot is added and filled once', () => {
  const doc = fakeDom(), win = fakeWin(true);
  const box = mountSideAd({ cfg, client: 'ca-pub-1', test: true, win, doc });
  assert.equal(doc.body.kids[0], box);
  const ins = box.kids[1];
  assert.equal(ins.attrs['data-ad-client'], 'ca-pub-1');
  assert.equal(ins.attrs['data-ad-slot'], '1234567890');
  assert.equal(ins.attrs['data-adtest'], 'on');
  assert.equal(win.adsbygoogle.length, 1);
});

test('small screen: not filled until the window is made wide enough', () => {
  const doc = fakeDom(), win = fakeWin(false);
  mountSideAd({ cfg, client: 'ca-pub-1', win, doc });
  assert.equal(win.adsbygoogle, undefined);
  win.mq.matches = true;
  win.mq.fns.forEach((f) => f());
  win.mq.fns.forEach((f) => f());
  assert.equal(win.adsbygoogle.length, 1);
});

test('the CSS shows the banner only for the same screens as the code', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.ok(css.includes(`@media ${SIDE_AD_MEDIA}`));
  assert.match(css, /\.side-ad:has\(ins\[data-ad-status="unfilled"\]\) \{ display: none; \}/);
});

test('the banner steps aside for shop banners and the update notice', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.in-store \.side-ad \{ display: none; \}/);
  assert.match(css, /body:has\(\.update-banner:not\(\[hidden\]\)\) \.side-ad \{ display: none; \}/);
});
