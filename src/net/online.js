// Everyone online right now, across the whole map.
//
// Asks the server for the number once a minute (live_count,
// supabase/022_live_count.sql: accounts whose game reported its spot in the
// last 90 seconds). One tiny request a minute per player, and nothing when
// people come or go. Before, every player joined one presence room for the
// whole map, and each arrival or departure was sent to everyone in it: the
// cost grew with the square of the players and hit Supabase's presence limit
// first when many people arrive at once.
//
// live_counts (supabase/072_today_count.sql) answers that number and how many
// accounts played since midnight Korea time in the same request; without it
// live_count is asked and today stays 0. Without either the old presence
// room is used. onCount(n, today) is called with the number of people online
// (you included) and today's visitors (0 when unknown). Returns stop(), or null when
// the provider can't count (the local test adapter), in which case the game
// counts the people around you instead.
export const ONLINE_POLL_MS = 60000;

export async function watchOnline(provider, cfg, id, onCount, { pollMs = ONLINE_POLL_MS } = {}) {
  if (provider !== 'supabase' || !cfg?.url || !cfg?.key) return null;
  const { sharedClient, isMissingFunction } = await import('./adapters/supabase.js');
  const client = sharedClient(cfg.url, cfg.key); // the same websocket as the rooms
  let both = true; // live_counts is there (072); else just live_count
  const ask = async () => {
    if (both) {
      const { data, error } = await client.rpc('live_counts');
      if (!error) return { n: Number(data?.now), today: Number(data?.today) || 0 };
      if (!isMissingFunction(error)) return {};
      both = false;
    }
    const { data, error } = await client.rpc('live_count');
    if (error) return { missing: isMissingFunction(error) };
    return { n: Number(data), today: 0 };
  };
  const first = await ask().catch(() => ({}));
  if (!first.missing) {
    let stopped = false;
    if (Number.isFinite(first.n)) onCount(Math.max(1, first.n), first.today ? Math.max(1, first.n, first.today) : 0);
    const timer = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const r = await ask().catch(() => ({}));
      if (!stopped && Number.isFinite(r.n)) onCount(Math.max(1, r.n), r.today ? Math.max(1, r.n, r.today) : 0);
    }, pollMs);
    return () => { stopped = true; clearInterval(timer); };
  }
  return watchPresence(client, id, onCount);
}

// The old way: one presence-only room every player joins.
function watchPresence(client, id, onCount) {
  const channel = client.channel('online:all', { config: { presence: { key: id } } });
  channel.on('presence', { event: 'sync' }, () => {
    onCount(Math.max(1, Object.keys(channel.presenceState()).length));
  });
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') channel.track({ t: 1 });
  });
  return () => client.removeChannel(channel);
}
