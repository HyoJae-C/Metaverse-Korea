// Google rewarded ads for the web: the H5 Games Ads "Ad Placement API"
// (adBreak with type 'reward'), served through AdSense.
//
// Safe to ship before AdSense approves the site: with no publisher ID in
// config nothing is loaded, and when Google has no ad to show (not approved
// yet, no fill, ad blocker, frequency cap) the result is 'unavailable' so the
// caller can fall back to the demo countdown.
//
// Setup on Google's side (see config.rewardedAd): an AdSense account with
// moduseoul.com added and approved, H5 Games Ads enabled for the account,
// /ads.txt with the publisher line, and the AdSense "Privacy & messaging"
// consent message turned on for the EEA, UK and Switzerland.

const SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

// Adds the AdSense script once and defines adBreak/adConfig (Google's
// documented stub: calls are queued until the script arrives).
export function loadH5Ads({ client, test = false, frequencyHint = '30s', win = globalThis.window, doc = globalThis.document } = {}) {
  if (!client || !win || !doc) return false;
  if (win.__h5AdsLoaded) return true;
  win.__h5AdsLoaded = true;
  win.adsbygoogle = win.adsbygoogle || [];
  win.adBreak = win.adConfig = function (o) { win.adsbygoogle.push(o); };
  const s = doc.createElement('script');
  s.async = true;
  s.src = `${SRC}?client=${encodeURIComponent(client)}`;
  s.crossOrigin = 'anonymous';
  s.setAttribute('data-ad-frequency-hint', frequencyHint);
  if (test) s.setAttribute('data-adbreak-test', 'on'); // Google test ads, no real money
  doc.head.appendChild(s);
  win.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
  return true;
}

// Shows one rewarded ad. Resolves to:
//   'viewed'      the player watched it to the end (give the reward)
//   'dismissed'   the player closed it early (no reward)
//   'unavailable' no ad could be shown (fall back or say so)
// hooks.beforeAd/afterAd run around the ad itself (pause sound, say);
// hooks.status(why) gets Google's breakStatus, or 'no-script' / 'timeout'.
export function showRewarded({ name = 'coins', timeoutMs = 4000, hooks = {}, win = globalThis.window } = {}) {
  return new Promise((resolve) => {
    const tell = (why) => { try { hooks.status?.(why); } catch { /* ignore */ } };
    if (typeof win?.adBreak !== 'function') { tell('no-script'); resolve('unavailable'); return; }
    let result = null;
    let started = false;
    const done = (r) => {
      if (result) return;
      result = r;
      clearTimeout(timer);
      resolve(r);
    };
    // Google calls beforeReward (an ad is ready) or adBreakDone (none) quickly;
    // if neither comes the script is blocked or still missing.
    const timer = setTimeout(() => { if (!started) { tell('timeout'); done('unavailable'); } }, timeoutMs);
    try {
      win.adBreak({
        type: 'reward',
        name,
        beforeAd: () => { try { hooks.beforeAd?.(); } catch { /* ignore */ } },
        afterAd: () => { try { hooks.afterAd?.(); } catch { /* ignore */ } },
        // The player already chose to watch by pressing the button, so show it now.
        beforeReward: (showAdFn) => { started = true; clearTimeout(timer); showAdFn(); },
        adDismissed: () => done('dismissed'),
        adViewed: () => done('viewed'),
        adBreakDone: (info) => {
          tell(info?.breakStatus || 'unknown');
          if (result) return;
          done(info?.breakStatus === 'viewed' ? 'viewed' : info?.breakStatus === 'dismissed' ? 'dismissed' : 'unavailable');
        },
      });
    } catch { done('unavailable'); }
  });
}

// The "show" function Wallet.watchAd() takes: a Google ad when one is
// available, otherwise the fallback (the demo countdown) if given.
// show.last tells what happened the last time: { google, why, demo }
// (google: 'viewed' | 'dismissed' | 'unavailable' | 'off'), for ?adtest.
export function rewardedShow(cfg, fallback, hooks = {}, win = globalThis.window) {
  const useGoogle = cfg.provider === 'h5' && !!cfg.client;
  const show = async (seconds) => {
    const last = show.last = { google: 'off', why: useGoogle ? '' : 'no publisher ID', demo: false };
    if (useGoogle) {
      const r = await showRewarded({ name: 'coins', hooks: { ...hooks, status: (why) => { last.why = why; } }, win });
      last.google = r;
      if (r === 'viewed') return true;
      if (r === 'dismissed') return false;
    }
    last.demo = !!fallback;
    return fallback ? fallback(seconds) : false;
  };
  show.last = null;
  return show;
}
