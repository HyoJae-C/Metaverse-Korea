// "A new version is live": the build writes its id into the code
// (__BUILD_ID__) and into version.json next to the page (vite.config.js).
// Now and then the game fetches version.json; when it holds another id, a
// newer build has been deployed and onNew() is called once.

export const UPDATE_CHECK_MS = 3 * 60 * 1000;

// Is the deployed build (remote) different from the one we run (current)?
export function isNewBuild(current, remote) {
  if (!current || current === 'dev' || !remote) return false;
  return String(remote) !== String(current);
}

// fetchVersion() resolves to the deployed id (or null when offline).
// Checks every `interval` ms and when the tab comes back into view.
// Returns stop().
export function startUpdateCheck({ current, fetchVersion, onNew, interval = UPDATE_CHECK_MS, doc = globalThis.document }) {
  if (!current || current === 'dev') return () => {};
  let done = false, busy = false;
  const check = async () => {
    if (done || busy) return;
    busy = true;
    try {
      const remote = await fetchVersion();
      if (!done && isNewBuild(current, remote)) { done = true; onNew(remote); }
    } catch { /* offline: try again later */ }
    busy = false;
  };
  const timer = setInterval(check, interval);
  const onVisible = () => { if (!doc.hidden) check(); };
  doc?.addEventListener?.('visibilitychange', onVisible);
  return () => { done = true; clearInterval(timer); doc?.removeEventListener?.('visibilitychange', onVisible); };
}

// A file of the game that failed to download (a shop, a minigame, a
// district…, loaded with import() when first used). Vite reports these as
// 'vite:preloadError'. Two causes:
// - a new build went live and the old one's files are gone: onNew(), the
//   "new version, refresh" banner;
// - the same build, but the download dropped (a phone on shaky wifi; Safari
//   says "Importing a module script failed."). The browser remembers the
//   failure, so that part stays broken until the page reloads: onBroken(), a
//   "part of the game didn't load, refresh" banner. Asked once per page.
export function watchMissingFiles({ current, fetchVersion, onNew, onBroken = () => {}, win = globalThis }) {
  let asked = false, broken = false;
  const onFail = async () => {
    if (asked) return;
    asked = true;
    let remote = null;
    try { remote = await fetchVersion(); } catch { /* offline */ }
    if (isNewBuild(current, remote)) { onNew(remote); return; }
    asked = false; // a later deploy can still offer the new-version banner
    if (!broken) { broken = true; onBroken(); }
  };
  win.addEventListener?.('vite:preloadError', onFail);
  return () => win.removeEventListener?.('vite:preloadError', onFail);
}

// The browsers' words for a game file that didn't download (Safari, Chrome,
// Firefox). The refresh banner above handles these, so the game shows no
// "small problem" box for them.
const MODULE_FAIL = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS/i;
export function isMissingFileError(msg) {
  return MODULE_FAIL.test(String(msg || ''));
}
