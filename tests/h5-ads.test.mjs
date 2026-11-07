import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadH5Ads, showRewarded, rewardedShow } from '../src/core/h5-ads.js';

// A fake window whose adBreak replays what Google would call.
const fakeWin = (play) => ({ adBreak: (o) => setTimeout(() => play(o), 0) });

test('no publisher ID: nothing is loaded', () => {
  const doc = { head: { appendChild: () => assert.fail('loaded') }, createElement: () => ({}) };
  assert.equal(loadH5Ads({ client: '', win: {}, doc }), false);
});

test('with a publisher ID the AdSense script is added once, in test mode', () => {
  const added = [];
  const el = () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  const doc = { head: { appendChild: (s) => added.push(s) }, createElement: el };
  const win = {};
  assert.equal(loadH5Ads({ client: 'ca-pub-123', test: true, win, doc }), true);
  loadH5Ads({ client: 'ca-pub-123', test: true, win, doc });
  assert.equal(added.length, 1);
  assert.match(added[0].src, /adsbygoogle\.js\?client=ca-pub-123$/);
  assert.equal(added[0].attrs['data-adbreak-test'], 'on');
  assert.equal(typeof win.adBreak, 'function');
  assert.deepEqual(win.adsbygoogle[0], { preloadAdBreaks: 'on', sound: 'on' });
});

test('watched to the end: viewed; closed early: dismissed', async () => {
  const watched = fakeWin((o) => { o.beforeReward(() => { o.beforeAd(); o.adViewed(); o.afterAd(); o.adBreakDone({ breakStatus: 'viewed' }); }); });
  let paused = 0;
  assert.equal(await showRewarded({ win: watched, hooks: { beforeAd: () => paused++, afterAd: () => paused-- } }), 'viewed');
  assert.equal(paused, 0);
  const closed = fakeWin((o) => { o.beforeReward(() => { o.adDismissed(); o.adBreakDone({ breakStatus: 'dismissed' }); }); });
  assert.equal(await showRewarded({ win: closed }), 'dismissed');
});

test('no ad from Google, a blocked script or no script: unavailable', async () => {
  const none = fakeWin((o) => o.adBreakDone({ breakStatus: 'notReady' }));
  assert.equal(await showRewarded({ win: none }), 'unavailable');
  assert.equal(await showRewarded({ win: { adBreak: () => {} }, timeoutMs: 20 }), 'unavailable');
  assert.equal(await showRewarded({ win: {} }), 'unavailable');
});

test('rewardedShow uses the demo when Google has no ad, but not after a skip', async () => {
  let demo = 0;
  const fallback = async () => { demo++; return true; };
  const cfg = { provider: 'h5', client: 'ca-pub-123' };
  const none = fakeWin((o) => o.adBreakDone({ breakStatus: 'other' }));
  assert.equal(await rewardedShow(cfg, fallback, {}, none)(5), true);
  assert.equal(demo, 1);
  const closed = fakeWin((o) => o.beforeReward(() => o.adDismissed()));
  assert.equal(await rewardedShow(cfg, fallback, {}, closed)(5), false);
  assert.equal(demo, 1);
  const watched = fakeWin((o) => o.beforeReward(() => o.adViewed()));
  assert.equal(await rewardedShow(cfg, fallback, {}, watched)(5), true);
  assert.equal(demo, 1);
  // No publisher ID yet: straight to the demo.
  assert.equal(await rewardedShow({ provider: 'h5', client: '' }, fallback, {}, watched)(5), true);
  assert.equal(demo, 2);
});

test('ads.txt, the AdSense meta tag and config use the same publisher ID', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const id = read('src/config.js').match(/VITE_ADSENSE_CLIENT \|\| 'ca-(pub-\d{16})'/)?.[1];
  assert.ok(id, 'publisher ID in config');
  assert.match(read('public/ads.txt'), new RegExp(`^google\\.com, ${id}, DIRECT, f08c47fec0942fa0$`, 'm'));
  assert.match(read('index.html'), new RegExp(`name="google-adsense-account" content="ca-${id}"`));
});
