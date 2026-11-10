// The live café's stage (Sinchon): step up to the mic, turn it on and sing;
// only the people inside this café hear you. This small part stays in the
// game; the voice itself (game/live-voice.js) downloads the first time you
// walk into the café.
import { t } from '../core/i18n.js';
import { LIVE_PREFIX } from '../core/live-rules.js';

export function createLiveStage(game) {
  let voice = null;
  let loading = null;
  const early = []; // messages that arrived while the voice code was downloading
  const inCafe = () => game.interior?.store?.workshop === 'livecafe';
  const load = () => (loading ??= import('./live-voice.js')
    .then((m) => (voice = m.createLiveVoice(game)))
    .catch((e) => { loading = null; console.warn('live voice', e); throw e; }));

  return {
    // Walking in: get the voice ready (others may already be singing).
    enter() {
      load().then((v) => {
        if (!inCafe()) return;
        v.enter();
        for (const [id, e] of early.splice(0)) v.onMsg(id, e);
      }, () => {});
    },
    leave() { early.length = 0; voice?.leave(); },
    // A room message: true if it was ours ('lv:…'), handled or dropped.
    onMsg(id, e) {
      if (typeof e !== 'string' || !e.startsWith(LIVE_PREFIX)) return false;
      if (!inCafe()) return true;
      if (voice?.active) voice.onMsg(id, e);
      else { early.push([id, e]); if (early.length > 30) early.shift(); }
      return true;
    },
    onJoin(id) { voice?.onJoin(id); },
    onLeave(id) { voice?.onLeave(id); },
    tick(p, dt) { if (voice?.active) voice.tick(p, dt); },
    // The action button by the mic.
    action(p) {
      const spot = inCafe() && game.interior.stations?.livestage?.[0];
      if (!spot || Math.hypot(p.x - spot.x, p.z - spot.z) > 1.6) return null;
      if (voice?.performing) return { key: 'live-off', label: '🎤 ' + t('live.stop'), run: () => voice.stop() };
      return { key: 'live-on', label: '🎤 ' + t('live.mic'), run: () => load().then((v) => v.start(spot), () => game.shop.toast(t('live.noVoice'))) };
    },
    get performing() { return !!voice?.performing; },
    get voice() { return voice; }, // (?debug: __mk.live)
  };
}
