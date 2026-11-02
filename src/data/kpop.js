// K-POP café playlist: official music videos on YouTube, played in the
// embedded YouTube player (the video stays visible, as YouTube's terms ask).
// Each id was checked to come from the artist's or label's channel and to
// allow embedding (YouTube oEmbed answered). A video whose owner later blocks
// embedding is skipped with a note in the café.
export const KPOP = [
  { id: 'BS7tz2rAOSA', artist: 'DAY6', title: '예뻤어 (You Were Beautiful)', channel: 'JYP Entertainment' },
  { id: 'pZvTd430IgI', artist: 'iKON', title: '지못미 (APOLOGY) · Dance ver.', channel: 'iKON' },
  { id: 'FB5-rPa5wBA', artist: 'gareth.t', title: '玻璃 (glass)', channel: 'Gareth.T' },
  { id: 'gI882nr8bK8', artist: 'A2O LITE', title: 'NEON', channel: 'Moka Labels' },
];
export const kpopById = (id) => KPOP.find((s) => s.id === id) || null;

// Room messages (sent like emotes): "kpop:play:<id>:<tenths of a second in>"
// and "kpop:stop". Only songs on the list are accepted.
export function parseKpop(e) {
  const m = /^kpop:(play|stop)(?::([\w-]{11}):(\d{1,6}))?$/.exec(String(e));
  if (!m) return null;
  if (m[1] === 'stop') return { verb: 'stop' };
  if (!m[2] || !kpopById(m[2])) return null;
  return { verb: 'play', id: m[2], at: Number(m[3]) / 10 };
}
export const kpopMsg = (id, at) => (id ? `kpop:play:${id}:${Math.max(0, Math.round(at * 10))}` : 'kpop:stop');
