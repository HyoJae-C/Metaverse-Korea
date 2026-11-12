// The name my account has on the server (player_names) wins over the one
// this browser remembers. The name can change somewhere else: on another
// phone or computer, by an operator in the Supabase table editor, or when a
// stale copy of the save on this device won over the cloud. Others already
// see the server's name (tag_names corrects name tags), so without this I
// would be the only one still seeing the old name over my own head.
//
// Asks once per visit, after this page's player id is mine (chat_claim):
// tag_names answers only when the announced name differs from the real one.
// Resolves to the server's name, or null (same name, no name kept on the
// server, or the server couldn't be asked).
import { cleanName } from '../core/identity.js';

export async function askMyServerName({ cloud, myId, name, claimChatId }) {
  if (!cloud || !myId || !name) return null;
  if ((await claimChatId?.()) !== 'ok') return null;
  const fixes = await cloud.tagNames([[myId, name]]);
  const real = cleanName(fixes.get(myId) || '').trim();
  return real && real !== name ? real : null;
}
