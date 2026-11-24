// Yutnori with people in the folk games yard (game/folk-yard.js, ui/yut-ui.js):
// the room messages, no DOM.
//
// The one who opens the mat is the host. They invite people standing round
// it; once some say yes, the host starts and sends the seats (`ids`, '~' for
// a seat the locals play) and a seed. From then on every player sends only
// what they do on their own turn, numbered (`n`), and everybody applies the
// same moves in the same order. The sticks come from the shared seed, so a
// throw lands the same in every browser; how hard you threw (the gauge,
// 0-9) only changes how high the sticks fly. The host plays the locals'
// seats, and takes over a seat whose player left or is away too long.
//
//   yut:i:<to>                          host asks someone to play
//   yut:a:<host> / yut:n:<host>          yes / no (or leaving the lobby)
//   yut:g:<gid>:<seed>:<pieces>:<ids>    the game starts (ids by seat)
//   yut:x:<gid>:<n>:<seat>:<act>         move n: t<power> throw, m<i>.<from> move
//   yut:k:<gid>:<seat>                   that seat is played by the locals now
//   yut:c:<gid>                          the host closed the game
export const YUT_BOT = '~';
const ID = '[\\w-]{1,64}';
const RE = {
  i: new RegExp(`^yut:i:(${ID})$`),
  a: new RegExp(`^yut:([an]):(${ID})$`),
  g: new RegExp(`^yut:g:(\\w{1,12}):(\\d{1,10}):([24]):((?:${ID}|~)(?:,(?:${ID}|~)){1,3})$`),
  x: /^yut:x:(\w{1,12}):(\d{1,4}):([0-3]):(t\d|m\d\.-?\d{1,2})$/,
  k: /^yut:k:(\w{1,12}):([0-3])$/,
  c: /^yut:c:(\w{1,12})$/,
};

export const yutInvite = (to) => `yut:i:${to}`;
export const yutReply = (host, yes) => `yut:${yes ? 'a' : 'n'}:${host}`;
export const yutGo = (gid, seed, pieces, ids) => `yut:g:${gid}:${seed}:${pieces}:${ids.join(',')}`;
export const yutAct = (gid, n, seat, act) => `yut:x:${gid}:${n}:${seat}:${act.k === 't' ? 't' + act.power : 'm' + act.i + '.' + act.from}`;
export const yutKick = (gid, seat) => `yut:k:${gid}:${seat}`;
export const yutClose = (gid) => `yut:c:${gid}`;

// A room message as { k, ... }, or null when it isn't one of ours.
export function parseYut(e) {
  if (typeof e !== 'string' || !e.startsWith('yut:') || e.length > 400) return null;
  let m;
  if ((m = RE.i.exec(e))) return { k: 'i', to: m[1] };
  if ((m = RE.a.exec(e))) return { k: m[1], host: m[2] };
  if ((m = RE.g.exec(e))) {
    const ids = m[4].split(',');
    const people = ids.filter((id) => id !== YUT_BOT);
    if (new Set(people).size !== people.length) return null;
    return { k: 'g', gid: m[1], seed: +m[2], pieces: +m[3], ids };
  }
  if ((m = RE.x.exec(e))) {
    const s = m[4];
    const act = s[0] === 't' ? { k: 't', power: +s[1] } : { k: 'm', i: +s.slice(1, s.indexOf('.')), from: +s.slice(s.indexOf('.') + 1) };
    return { k: 'x', gid: m[1], n: +m[2], seat: +m[3], act };
  }
  if ((m = RE.k.exec(e))) return { k: 'k', gid: m[1], seat: +m[2] };
  if ((m = RE.c.exec(e))) return { k: 'c', gid: m[1] };
  return null;
}

// The shared dice: a small seeded random (mulberry32), the same in every browser.
export function yutRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The gauge: held for `ms`, how hard the throw is (0..1, up and down again
// about once a second, so letting go at the top takes a little timing).
export const YUT_GAUGE_MS = 1100;
export function gaugeAt(ms) {
  const t = (ms / YUT_GAUGE_MS) % 2;
  return t < 1 ? t : 2 - t;
}
