// A small channel of its own between a few players (a two-player match:
// game/brawl.js), so what they send each other is not broadcast to the whole
// room. openLink resolves once joined: { send(msg), close() }; onMsg(msg) is
// called for what the others send (never our own).
export async function openLink(provider, cfg, topic, onMsg) {
  if (provider === 'supabase') {
    const { sharedClient } = await import('./adapters/supabase.js');
    const client = sharedClient(cfg.url, cfg.key, cfg.accessToken);
    const ch = client.channel('link:' + topic, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'm' }, ({ payload }) => onMsg(payload));
    await new Promise((resolve, reject) => {
      let done = false;
      const fail = (why) => { if (done) return; done = true; clearTimeout(timer); client.removeChannel(ch).catch(() => {}); reject(new Error('Realtime ' + why)); };
      const timer = setTimeout(() => fail('connect timeout'), 10000);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') { if (!done) { done = true; clearTimeout(timer); resolve(); } }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') fail(status);
      });
    });
    return {
      send(msg) { ch.send({ type: 'broadcast', event: 'm', payload: msg }); },
      close() { client.removeChannel(ch).catch(() => {}); },
    };
  }
  // The test provider: other tabs of this browser.
  if (typeof BroadcastChannel === 'undefined') throw new Error('No channel');
  const bc = new BroadcastChannel('mk-link-' + topic);
  bc.onmessage = ({ data }) => onMsg(data);
  return { send(msg) { bc.postMessage(msg); }, close() { bc.close(); } };
}
