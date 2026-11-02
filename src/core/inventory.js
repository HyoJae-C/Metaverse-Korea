// Items the player owns (saved on this device for now, like the wallet).
// Later items will come from the shop or an account service; for testing,
// the developer master code (typed in chat) adds every item.

export const ITEMS = {
  tandem: {
    emoji: '🚲',
    name: { en: 'Tandem bike', ko: '2인 자전거', ja: '2人乗り自転車', zh: '双人自行车' },
    desc: {
      en: 'Two seats: you steer, a friend rides on the back. Ride it, walk up to someone and invite them.',
      ko: '두 명이 타는 자전거예요. 내가 운전하고 친구는 뒤에 타요. 타고 가서 옆 사람을 초대하세요.',
      ja: '2人乗り。あなたが運転して、友だちは後ろに乗ります。乗って近くの人を招待しましょう。',
      zh: '两个座位：你来骑，朋友坐后面。骑上车，走到别人旁边邀请他们。',
    },
  },
};

const KEY = 'mk.items';

export class Inventory {
  constructor() {
    try { this.ids = new Set(JSON.parse(localStorage.getItem(KEY) || '[]').filter((id) => ITEMS[id])); } catch { this.ids = new Set(); }
  }
  has(id) { return this.ids.has(id); }
  list() { return [...this.ids]; }
  // Returns the ids that were new.
  add(...ids) {
    const added = ids.filter((id) => ITEMS[id] && !this.ids.has(id));
    added.forEach((id) => this.ids.add(id));
    try { localStorage.setItem(KEY, JSON.stringify([...this.ids])); } catch { /* storage blocked */ }
    return added;
  }
}

// Developer master code. Only its SHA-256 is in the code. This keeps it out
// of plain sight but is NOT security: anyone can change their own browser.
// Real paid items must be checked on a server.
const MASTER_HASH = 'f368f463b616dadfcdc26126130b67a47f6faad781488925bb175e2240a26e10';

export async function isMasterCode(code) {
  if (!globalThis.crypto?.subtle) return false;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(code).trim()));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === MASTER_HASH;
}

// Tandem messages ride on the emote channel as 'tandem:<verb>:<target id>'.
export const TANDEM_VERBS = ['invite', 'join', 'leave', 'end'];
export function parseTandem(e) {
  const m = /^tandem:(invite|join|leave|end):([\w-]{1,64})$/.exec(String(e));
  return m ? { verb: m[1], target: m[2] } : null;
}
export const tandemMsg = (verb, target) => `tandem:${verb}:${target}`;
