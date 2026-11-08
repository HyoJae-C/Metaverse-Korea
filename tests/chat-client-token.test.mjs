// The shared realtime client must speak as the signed-in player even when
// the first one to make it (the online counter) had no sign-in token:
// otherwise the chat function refuses every line and nobody sees chat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedClient } from '../src/net/adapters/supabase.js';

test('a token getter brought later is used by the client made earlier', async () => {
  const url = 'https://example.supabase.co', key = 'sb_publishable_test';
  const first = sharedClient(url, key); // online counter: no token
  assert.equal(await first.realtime.accessToken(), key);
  const again = sharedClient(url, key, async () => 'player-jwt'); // a room joins
  assert.equal(again, first, 'still one websocket');
  assert.equal(await first.realtime.accessToken(), 'player-jwt');
  // A getter that fails or has no account falls back to the public key.
  sharedClient(url, key, async () => null);
  assert.equal(await first.realtime.accessToken(), key);
  first.realtime.disconnect();
});
