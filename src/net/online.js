// Everyone online right now, across the whole map.
//
// First choice: ask the server every half minute how many accounts reported
// their spot in the last 90 seconds (supabase/021_online_count.sql). That is
// the same number admin.html shows, one per account, so the game and the
// operator page agree.
//
// Until that SQL is run (or without an account), the old way: one small
// presence-only room that every player joins once. It counts open
// connections, so one account on two devices or a connection the server
// hasn't dropped yet counts twice.
//
// onCount(n) is called with the number of people online (you included).
// Returns stop(), or null when nothing can count (the local test adapter),
// in which case the game counts the people around you instead.

export const ONLINE_POLL_MS = 30000;

// fetchCount() resolves to a number, 'missing' (the server can't count this
// way) or null (try again next time).
export async function pollOnline(fetchCount, onCount, { every = ONLINE_POLL_MS, doc = globalThis.document } = {}) {
  let first;
  try { first = await fetchCount(); } catch { first = null; }
  if (first === 'missing') return null;
  if (typeof first === 'number') onCount(Math.max(1, first));
  let timer = 0, off = false;
  const tick = async () => {
    if (off) return;
    if (!doc?.hidden) { // a hidden tab doesn't show the count: skip the request
      try {
        const n = await fetchCount();
        if (off) return;
        if (n === 'missing') return stop(); // dropped since: keep the last number
        if (typeof n === 'number') onCount(Math.max(1, n));
      } catch { /* try again next time */ }
    }
    timer = setTimeout(tick, every);
  };
  const onShow = () => {
    if (doc.hidden || off) return;
    clearTimeout(timer);
    tick();
  };
  function stop() {
    off = true;
    clearTimeout(timer);
    doc?.removeEventListener?.('visibilitychange', onShow);
  }
  timer = setTimeout(tick, every);
  doc?.addEventListener?.('visibilitychange', onShow);
  return stop;
}

export async function watchOnline(provider, cfg, id, onCount, { fetchCount } = {}) {
  if (fetchCount) {
    const stop = await pollOnline(fetchCount, onCount);
    if (stop) return stop;
  }
  if (provider !== 'supabase' || !cfg?.url || !cfg?.key) return null;
  const { sharedClient } = await import('./adapters/supabase.js');
  const client = sharedClient(cfg.url, cfg.key); // the same websocket as the rooms
  const channel = client.channel('online:all', { config: { presence: { key: id } } });
  channel.on('presence', { event: 'sync' }, () => {
    onCount(Math.max(1, Object.keys(channel.presenceState()).length));
  });
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') channel.track({ t: 1 });
  });
  return () => client.removeChannel(channel);
}
