// A developer fishing code: "/<code>" in chat makes the next bite (fishing by
// hand) a chosen fish, once. The code itself is only kept as a SHA-256 hash,
// like the other developer codes in core/inventory.js.
//
// The chosen fish comes as a copy marked `sure`: it does not fight back while
// reeling and never slips off the hook, so it is really caught.
const FISH_CODES = {
  '5a270d4a3fedea529185c14297f4d531176ba757549f520a6cae28ff07edf485': 'whale', // the blue whale (흰수염고래)
};

let pending = null; // the fish id the next bite will be, or null

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text).trim()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The fish id a code sets up, or null.
export async function fishCode(code, codes = FISH_CODES) {
  if (!globalThis.crypto?.subtle) return null;
  return codes[await sha256(code)] || null;
}

export function forceNextCatch(id) { pending = id || null; }
export const pendingCatch = () => pending;
// Takes the pending fish id (and clears it), or null.
export function takeForcedCatch() { const id = pending; pending = null; return id; }
