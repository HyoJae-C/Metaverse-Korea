// Banpo Bridge Moonlight Rainbow Fountain (core/rainbow-fountain.js: the
// schedule and the program; core/rainbow-jets.js: the water, downloaded
// only near the bridge around show time). Here: the sky's own night round
// the bridge during a show (weather.nightMix, added to the fireworks'),
// the notices for whoever is near, and the show's music.
//
// `game.worldPos()` is where I am in world metres ([x, z]), also on the
// lawn of the open-air park (its own room, drawn over the street), or null
// inside any other room.
import { fountainAt, nextFountain, nearBridge, FINALE } from '../core/rainbow-fountain.js';
import { t as tr } from '../core/i18n.js';

const LOAD_NEAR = 700; // metres from the bridge: the water is built from here
export function createRainbowFountain(game) {
  const st = { here: false, soon: 0, on: 0, photo: 0, nextFor: 0, wasNear: false, jets: null, loading: false, music: null };
  const landmark = () => game.landmarks.find((l) => l.type === 'jamsu');
  function update() {
    const s = fountainAt();
    const at = game.worldPos();
    const near = at ? nearBridge(at[0], at[1]) : 0;
    // The show's night, on top of anything the fireworks set this frame.
    if (s && near > 0) game.weather.nightMix = Math.max(game.weather.nightMix || 0, s.night * near);
    const close = near > 0.95; // on the bridge, the lawn or the riverside
    st.here = !!(s?.on && close); // watching the show (others' fishing trophies hide)
    if (close) {
      if (s && s.t < 0 && st.soon !== s.start) { st.soon = s.start; game.toast(tr('fountain.soon')); }
      else if (s?.on && s.t < FINALE[0] && st.on !== s.start && st.soon !== s.start) { st.on = s.start; game.toast(tr('fountain.on')); }
      if (s?.on && s.t >= FINALE[0] && st.photo !== s.start) { st.photo = s.start; st.on = s.start; game.toast(tr('fountain.photo')); }
      // Walking up between shows: when the next one is.
      if (!st.wasNear && !s) {
        const next = nextFountain();
        if (next && st.nextFor !== next) { st.nextFor = next; game.toast(tr('fountain.next', { min: Math.max(1, Math.round((next - Date.now()) / 60e3)) })); }
      }
    }
    st.wasNear = close;
    // The water: built the first time you're near around show time.
    const l = landmark();
    if (!l) return;
    const d = at ? Math.hypot(at[0] - l.x, at[1] - l.z) : Infinity;
    if (s && d < LOAD_NEAR && !st.jets && !st.loading) {
      st.loading = true;
      import('../core/rainbow-jets.js').then((m) => { st.jets = m.createRainbowJets(game.scene, l, { phone: game.phone() }); })
        .catch(() => { st.loading = false; }); // (offline: try again later)
    }
    if (st.jets) {
      const show = !!(s?.on && d < LOAD_NEAR + 200);
      st.jets.group.visible = show;
      if (show) st.jets.update(s.t);
    }
    // Its music, while the jets run and you're close (if the music is on).
    const music = game.music;
    const want = !!(s?.on && close);
    if (want && !st.music && music.on && music.track.id !== 'rainbowfountain') { st.music = music.track.id; music.setTrack('rainbowfountain'); }
    else if (!want && st.music) { if (music.track.id === 'rainbowfountain') music.setTrack(st.music); st.music = null; }
  }
  return { update, get jets() { return st.jets; }, get showHere() { return st.here; } };
}
