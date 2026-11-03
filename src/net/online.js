// Everyone online right now, across the whole map: one small presence-only
// room that every player joins once. Nothing is broadcast in it, so it costs
// one presence update when someone comes or goes, not per move.
// onCount(n) is called with the number of people online (you included).
// Returns stop(), or null when the provider can't count (the local test
// adapter), in which case the game counts the people around you instead.
export async function watchOnline(provider, cfg, id, onCount) {
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
