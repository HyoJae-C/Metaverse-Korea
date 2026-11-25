// "Invite a friend": once a player has played 30 minutes in all, a card
// offers them a link to share, once ever. The link carries their name
// (?ref=), and the start screen fills it into "Friend who invited you", so a
// friend who joins with it pays them through the existing friend invites
// (supabase/025_referrals.sql). ?src=friend also marks where that friend came
// from in the operator's numbers (core/sessions.js firstSrc).
//
// The minutes are counted here, once a minute while the tab is visible and
// the player is in town, in "mk." keys, so they follow the account's cloud
// save. Counting stops once the card has been shown. The card itself loads
// with import() when it's due (ui/share-invite-ui.js).

export const ASK_AFTER_MIN = 30;
const MIN_KEY = 'mk.playMin';
const ASKED_KEY = 'mk.shareAsked';

// The link to share: this site with my name, or null without a name.
export function inviteLink(base, name) {
  const n = String(name ?? '').trim();
  if (!n) return null;
  return `${base}?ref=${encodeURIComponent(n)}&src=friend`;
}

// The inviter's name from a link (?ref=), cleaned like a typed name, or ''.
export function refFromSearch(search, clean) {
  try { return clean(new URLSearchParams(search).get('ref') || '').trim(); } catch { return ''; }
}

// One minute of play: the new count, and whether the card is due now.
export function tickMinute(minutes, asked) {
  if (asked) return { minutes, due: false };
  const m = minutes + 1;
  return { minutes: m, due: m >= ASK_AFTER_MIN };
}

// playing(): visible, in town, not parked. busy(): a room, game or panel is
// up (wait a minute and try again). name(): my player name.
export function createShareInvite({ $, t, playing, busy, name, toast, storage = globalThis.localStorage }) {
  const get = (k) => { try { return storage.getItem(k); } catch { return null; } };
  const set = (k, v) => { try { storage.setItem(k, v); } catch { /* ignore */ } };
  let showing = false;
  const timer = setInterval(async () => {
    if (showing || get(ASKED_KEY)) { if (!showing) clearInterval(timer); return; }
    if (!playing()) return;
    const before = Number(get(MIN_KEY)) || 0;
    const { minutes, due } = tickMinute(before, false);
    if (minutes <= ASK_AFTER_MIN) set(MIN_KEY, String(minutes));
    if (!due || busy()) return;
    const link = inviteLink(location.origin + location.pathname, name());
    if (!link) return;
    showing = true;
    try {
      const { openShareInvite } = await import('../ui/share-invite-ui.js');
      set(ASKED_KEY, '1');
      clearInterval(timer);
      openShareInvite({ $, t, link, toast });
    } catch { showing = false; } // (offline: try again next minute)
  }, 60000);
}
