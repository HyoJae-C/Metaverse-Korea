// One live game per browser. Every tab gets its own player id, so opening
// Modu Seoul in a second tab used to put a second copy of you on the
// street. Now the newest tab takes over: it announces itself on a
// BroadcastChannel and any older tab steps aside (leaves multiplayer, stops
// rendering and sound) and offers "Play here" to take over again.
//
// claimTab(onTakenOver, { channel }) → release()
export function claimTab(onTakenOver, { channel = 'another-seoul-active-tab', Channel = globalThis.BroadcastChannel } = {}) {
  if (typeof Channel !== 'function') return () => {};
  const id = globalThis.crypto?.randomUUID?.() || String(Math.random()).slice(2);
  const ch = new Channel(channel);
  let parked = false;
  const release = () => {
    if (parked) return;
    parked = true;
    ch.close();
    globalThis.removeEventListener?.('pageshow', onShow);
  };
  ch.onmessage = ({ data }) => {
    if (parked || data?.type !== 'claim' || data.id === id) return;
    release();
    onTakenOver();
  };
  // A tab restored from the back/forward cache is live again: take over.
  const onShow = (e) => { if (e.persisted && !parked) ch.postMessage({ type: 'claim', id }); };
  globalThis.addEventListener?.('pageshow', onShow);
  ch.postMessage({ type: 'claim', id });
  return release;
}
