// Another Land's ticket guide (매표 안내원): a member of staff in the park's
// uniform by the little ticket booth in front of the candy castle, where the
// bridge lands on the island, so nobody has to wonder where the passes are
// sold. Walk up and they call out; the action list explains the tickets
// and sells them: the ride-all day pass (자유이용권) and the ride tickets
// (core/ride-tickets.js). The ticket booth below the island sells the same.
import { makeNpc, say } from '../core/npcs.js';
import { t, localName } from '../core/i18n.js';
import { TICKETS, BIG3 } from '../core/ride-tickets.js';
import { COASTER_NAME, RIDE_NAME, RIDE_PASS, PARK_UNIFORM } from '../core/park-rides.js';

const NEAR_GUIDE = 2.6, NEAR_BOOTH = 1.8, CALL = 9; // metres: talk, the booth's window, call out
const HELLO = [
  ['이용권 여기서 사세요!', 'iyonggwon yeogiseo saseyo!', 'Ride tickets right here!'],
  ['자유이용권 있어요~', 'jayu-iyonggwon isseoyo~', 'Ride-all passes here!'],
  ['어서 오세요, 어나더랜드예요!', 'eoseo oseyo, eonadeo-raendeu-yeyo!', 'Welcome to Another Land!'],
];
const ASK = ['어떤 이용권으로 드릴까요?', 'eotteon iyonggwon-euro deurilkkayo?', 'Which ticket would you like?'];
const THANKS = ['즐거운 시간 보내세요!', 'jeulgeoun sigan bonaeseyo!', 'Have a great time!'];
const won = (n) => n.toLocaleString();
const rideName = (k) => localName(k === 'coaster' ? COASTER_NAME : RIDE_NAME[k]);

export function createParkTickets(game) {
  const { $, shop, wallet, tickets } = game;
  let guide = null, calledAt = -1e9, wasNear = false;
  const label = () => '🎫 ' + t('tix.guide');
  const name = (id) => t('tix.' + id);
  const desc = (id) => (id === 'big3' ? t('tix.big3Desc', { rides: BIG3.map(rideName).join(' · ') }) : t('tix.' + id + 'Desc'));
  const talk = (phrase) => { if (guide && game.interior?.island) say(guide, $('labels'), phrase); };

  function buy(id) {
    const r = tickets.buy(id, wallet, { k: 'tix.' + id });
    if (r === 'held') {
      shop.toast(tickets.pass() ? t('tix.passHeld') : '🎟️ ' + t('tix.left', { name: name(id), n: tickets.left(id) }));
      return;
    }
    if (r === 'short') { shop.toast(t('tix.short', { name: name(id), n: won(TICKETS[id].price) })); return; }
    game.refreshWallet();
    game.sfx.cheer?.();
    talk(THANKS);
    shop.toast(t('tix.paid', { name: name(id), n: won(TICKETS[id].price), desc: desc(id) }));
    game.action = game.STALE;
  }
  function explain() {
    talk(ASK);
    shop.toast(t('tix.about', { pass: game.passName(), all: won(RIDE_PASS), any: won(TICKETS.any5.price), diff: won(TICKETS.diff5.price), big: won(TICKETS.big3.price), rides: BIG3.map(rideName).join(' · ') }));
  }
  // The guide's spot or the booth's window, when I'm at one.
  function nearDesk(p) {
    const st = game.interior?.stations;
    if (!st) return false;
    const by = (list, r) => (list || []).some((s) => Math.hypot(p.x - s.x, p.z - s.z) < r);
    return by(st.ticketGuide, NEAR_GUIDE) || by(st.booth, NEAR_BOOTH);
  }

  return {
    // Once per island room (it's built when you first come near, from the
    // street too, so they're there as you cross the bridge).
    spawn(built) {
      const st = built?.stations?.ticketGuide?.[0];
      if (!st) return null;
      if (!built.ticketGuide) {
        const o = makeNpc($('labels'), label(), { ...game.randomLook(), ...PARK_UNIFORM });
        o.ch.root.position.set(st.x, 0, st.z);
        o.ch.root.rotation.y = st.ry;
        built.scene.add(o.ch.root);
        built.ticketGuide = o;
      }
      guide = built.ticketGuide;
      return guide;
    },
    relabel() { if (guide) guide.tag.textContent = label(); },
    // What's on offer at the guide or the booth: what each ticket is, then
    // each one to buy (or how many rides are left on it).
    actions(p) {
      if (!nearDesk(p)) return [];
      const pass = tickets.pass(), passName = game.passName();
      const out = [{ key: 'tix-about', label: '💬 ' + t('tix.ask'), run: explain }];
      out.push(pass
        ? { key: 'ride-pass-held', label: '🎫 ' + t('tix.passHeld'), run: () => shop.toast('🎫 ' + t('tix.passHeld')) }
        : { key: 'ride-pass', label: `🎫 ${passName} · 🪙 ${won(RIDE_PASS)}`, run: () => game.buyRidePass() });
      if (!pass) {
        for (const id of Object.keys(TICKETS)) {
          const n = tickets.left(id);
          out.push({ key: `tix:${id}:${n}`, label: n ? `🎟️ ${t('tix.left', { name: name(id), n })} ✓` : `🎟️ ${name(id)} · 🪙 ${won(TICKETS[id].price)}`, run: () => buy(id) });
        }
      }
      return out;
    },
    // Every frame: on the island, the guide stands, calls out when someone
    // walks up, and keeps their name tag over their head.
    tick(dt, onIsland, camera, w, h, placeLabels, p) {
      if (!guide || !onIsland) { wasNear = false; return; }
      guide.ch.animate(dt, 0);
      placeLabels(guide, camera, w, h);
      const r = guide.ch.root.position, near = Math.hypot(p.x - r.x, p.z - r.z) < CALL;
      const now = performance.now();
      if (near && !wasNear && now - calledAt > 30000) {
        calledAt = now;
        guide.ch.wave?.();
        talk(HELLO[Math.floor(Math.random() * HELLO.length)]);
      }
      wasNear = near;
    },
    hideLabels() { if (guide) { guide.tag.style.display = 'none'; guide.bubble?.remove(); guide.bubble = null; } wasNear = false; },
  };
}
