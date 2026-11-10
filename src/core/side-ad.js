// One thin AdSense banner (468x60) at the top left, only on wide computer
// screens: on the start screen and in the game (not inside shops). Phones
// and small windows never see it.
//
// Needs the AdSense script (core/h5-ads.js loads it) and a display ad unit
// (config.sideAd.slot). Without a slot nothing is shown; when Google has no
// ad (before approval, no fill) the box hides itself (style.css).

export const SIDE_AD_MEDIA = '(min-width: 1200px) and (min-height: 640px) and (pointer: fine)';

// True when the banner should be set up at all.
export const sideAdOn = (cfg, client) => !!(cfg?.enabled && cfg.slot && client);

export function mountSideAd({ cfg, client, test = false, win = globalThis.window, doc = globalThis.document } = {}) {
  if (!sideAdOn(cfg, client) || !win || !doc) return null;
  const box = doc.createElement('aside');
  box.className = 'side-ad';
  box.id = 'side-ad';
  box.setAttribute('aria-label', 'Advertisement');
  const label = doc.createElement('small');
  label.textContent = 'Ad';
  const ins = doc.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.cssText = 'display:block;width:468px;height:60px';
  ins.setAttribute('data-ad-client', client);
  ins.setAttribute('data-ad-slot', String(cfg.slot));
  if (test) ins.setAttribute('data-adtest', 'on');
  box.append(label, ins);
  doc.body.appendChild(box);

  // AdSense needs a visible slot with a width, so fill it the first time the
  // screen is wide enough (now, or after the window is made bigger).
  let filled = false;
  const mq = win.matchMedia(SIDE_AD_MEDIA);
  const fill = () => {
    if (filled || !mq.matches) return;
    filled = true;
    try { (win.adsbygoogle = win.adsbygoogle || []).push({}); } catch { /* blocked */ }
  };
  fill();
  if (!filled) mq.addEventListener?.('change', fill);
  return box;
}
