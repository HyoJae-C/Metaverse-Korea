// One live game per browser. Every tab gets its own player id, so opening
// Modu Seoul in a second tab used to put a second copy of you on the
// street. Now the newest tab takes over: it announces itself on a
// BroadcastChannel and any older tab steps aside (leaves multiplayer, stops
// rendering and sound) and offers "Play here" to take over again.
//
// A tab only steps aside for a tab that is really there (Yozi 2026-11-15:
// "another tab" kept showing with one tab open). Before stepping aside it
// asks the new tab to answer; a page that is gone or frozen (left with the
// back button, discarded, prerendered) never answers, so its claim is
// ignored. A tab that starts hidden (opened in the background, restored on
// startup) doesn't take the game from the tab you are looking at: if a live
// tab answers its hello, the hidden one steps aside itself.
//
// claimTab(onTakenOver, { channel }) → release()
export function claimTab(onTakenOver, {
  channel = 'another-seoul-active-tab',
  Channel = globalThis.BroadcastChannel,
  isHidden = () => globalThis.document?.visibilityState === 'hidden',
  answerMs = 600,
} = {}) {
  if (typeof Channel !== 'function') return () => {};
  const id = globalThis.crypto?.randomUUID?.() || String(Math.random()).slice(2);
  const ch = new Channel(channel);
  let parked = false;
  const waiting = new Map(); // nonce → resolve, for pings and hellos sent from here
  const release = () => {
    if (parked) return;
    parked = true;
    ch.close();
    for (const done of waiting.values()) done(false);
    waiting.clear();
    globalThis.removeEventListener?.('pageshow', onShow);
  };
  const stepAside = () => { if (parked) return; release(); onTakenOver(); };
  const send = (msg) => { if (!parked) ch.postMessage({ ...msg, from: id }); };
  // Ask (one tab, or anyone when `to` is null) and wait for an answer.
  const ask = (type, to) => new Promise((resolve) => {
    const nonce = String(Math.random()).slice(2);
    const timer = setTimeout(() => { waiting.delete(nonce); resolve(false); }, answerMs);
    waiting.set(nonce, (ok) => { clearTimeout(timer); waiting.delete(nonce); resolve(ok); });
    send({ type, to, nonce });
  });
  const claim = () => send({ type: 'claim' });

  ch.onmessage = async ({ data }) => {
    if (parked || !data || data.from === id) return;
    if (data.to && data.to !== id) return;
    if (data.type === 'ping' || data.type === 'hello') { send({ type: 'here', to: data.from, nonce: data.nonce }); return; }
    if (data.type === 'here') { waiting.get(data.nonce)?.(true); return; }
    if (data.type === 'claim') {
      if (await ask('ping', data.from)) stepAside();
    }
  };
  // A tab restored from the back/forward cache is live again: take over.
  const onShow = (e) => { if (e.persisted && !parked) claim(); };
  globalThis.addEventListener?.('pageshow', onShow);
  if (isHidden()) {
    ask('hello', null).then((someone) => { if (parked) return; if (someone) stepAside(); else claim(); });
  } else {
    claim();
  }
  return release;
}

// Resolves once the page is shown: not prerendering, not a hidden tab.
export function whenShown(doc = globalThis.document) {
  const shown = () => !doc || (doc.visibilityState !== 'hidden' && !doc.prerendering);
  if (shown()) return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (!shown()) return;
      doc.removeEventListener('visibilitychange', check);
      doc.removeEventListener('prerenderingchange', check);
      resolve();
    };
    doc.addEventListener('visibilitychange', check);
    doc.addEventListener('prerenderingchange', check);
  });
}
