// Counts the realtime messages this game sends and receives, by what they
// are for, so the operator can see which play uses the server most. The
// realtime service bills every message once when sent and once for each
// player who receives it, so both are counted. Reported with the session
// (core/sessions.js, supabase/046_realtime_counts.sql); presence (who is in
// a room) is not counted here.
//   mv / mvr   movement sent / received
//   em / emr   emotes, minigame messages, outfit changes and room chat
//   vs / vsr   a two-player match's own channel (net/link.js); vsn: matches
export const rt = { mv: 0, mvr: 0, em: 0, emr: 0, vs: 0, vsr: 0, vsn: 0 };
export function count(kind) { rt[kind]++; }
