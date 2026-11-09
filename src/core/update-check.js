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

// A file of the game that failed to download (a shop, a minigame…, loaded
// with import() when first used). Usually a new build went live and the old
// one's files are gone: then offer the refresh banner at once, instead of a
// tap that does nothing. Vite reports these as 'vite:preloadError'.
export function watchMissingFiles({ current, fetchVersion, onNew, win = globalThis }) {
  let asked = false;
  const onFail = async () => {
    if (asked) return;
    asked = true;
    try {
      const remote = await fetchVersion();
      if (isNewBuild(current, remote)) { onNew(remote); return; }
    } catch { /* offline */ }
    asked = false; // same build (a dropped connection): the next tap tries again
  };
  win.addEventListener?.('vite:preloadError', onFail);
  return () => win.removeEventListener?.('vite:preloadError', onFail);
}
