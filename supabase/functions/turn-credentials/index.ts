// The live café's backup relay (TURN). Most players' browsers reach each
// other directly; the rest (strict home or office routers) need a relay.
// This hands a signed-in player short-lived Cloudflare TURN credentials, so
// the long-lived key never ships in the game.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   CF_TURN_KEY_ID      the TURN key's id (Cloudflare → Realtime → TURN)
//   CF_TURN_API_TOKEN   that key's API token
// Without them it answers { iceServers: [] } and the game stays direct-only.
//
// Deploy: supabase functions deploy turn-credentials (JWT check on: only
// signed-in players, guests included, can ask).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
const TTL = 3600; // seconds: one visit to the café, then the game asks again

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

type Ice = { urls: string | string[]; username?: string; credential?: string };

// Browsers can't use port 53 (it hangs the connection attempt): drop those URLs.
function clean(list: Ice[]): Ice[] {
  return list
    .map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }))
    .filter((s) => s.urls.length);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const id = Deno.env.get('CF_TURN_KEY_ID');
  const token = Deno.env.get('CF_TURN_API_TOKEN');
  if (!id || !token) return json({ iceServers: [] });
  const base = `https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials`;
  const ask = (path: string) => fetch(`${base}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: TTL }),
  });
  try {
    // Newer endpoint answers a list; the older one a single entry.
    let res = await ask('generate-ice-servers');
    if (res.status === 404) res = await ask('generate');
    if (!res.ok) return json({ iceServers: [], error: 'cloudflare ' + res.status });
    const body = await res.json();
    const list: Ice[] = Array.isArray(body.iceServers) ? body.iceServers : body.iceServers ? [body.iceServers] : [];
    return json({ iceServers: clean(list), ttl: TTL });
  } catch (e) {
    return json({ iceServers: [], error: String(e) });
  }
});
