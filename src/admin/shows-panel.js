// The operator page's Shows tab (supabase/033_show_times.sql): when the
// Ttukseom drone show and the Yeouido fireworks start, 1 to 4 times a day
// each on Korean time, for every player at once. The two never overlap.
import { clockText, timesOverlap } from '../core/show-clock.js';
import * as drone from '../core/drone-show.js';
import * as fw from '../core/fireworks-show.js';
import { setShowTimes } from '../core/show-times-watch.js';

const SETUP = 'Run <code>supabase/033_show_times.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run, then <code>notify pgrst, \'reload schema\';</code>), then reload this page.';
const SHOWS = {
  drone: { name: 'Drone show', icon: '🛸', prefix: 'dsTime', defaults: drone.DRONE_SHOW_HOURS_KST, check: drone.checkShowTimes, gap: drone.MIN_GAP_MINUTES, next: drone.nextDroneShow },
  fireworks: { name: 'Fireworks', icon: '🎆', prefix: 'fwTime', defaults: fw.FIREWORKS_HOURS_KST, check: fw.checkFireworksTimes, gap: fw.MIN_GAP_MINUTES, next: fw.nextFireworks },
};
for (const s of Object.values(SHOWS)) s.defaults = s.defaults.map((h) => Math.round(h * 60));
const WHY = {
  empty: 'Set at least one time.',
  many: 'At most 4 shows a day.',
  bad: 'Times must be 00:00 to 23:59.',
};
const toMinutes = (v) => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const local = (ms) => new Date(ms).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
const list = (m) => m.map(clockText).join(', ');

export function createShowsPanel({ client, $, escapeHtml, setStatus, notOperator }) {
  const inputs = (key) => Array.from({ length: 4 }, (_, i) => $(SHOWS[key].prefix + i));
  const chosen = (key) => inputs(key).map((el) => toMinutes(el.value)).filter((m) => m != null);
  const fill = (key, minutes) => inputs(key).forEach((el, i) => { el.value = minutes[i] != null ? clockText(minutes[i]) : ''; });

  function render(raw) {
    const lines = [];
    for (const [key, s] of Object.entries(SHOWS)) {
      const set = Array.isArray(raw?.[key]) && raw[key].length ? [...raw[key]].sort((a, b) => a - b) : null;
      const minutes = set || s.defaults;
      fill(key, minutes);
      const hours = minutes.map((m) => m / 60), next = [];
      let t = Date.now();
      for (let i = 0; i < 3; i++) { t = s.next(t, hours); next.push(local(t)); t += 1000; }
      lines.push(`${s.icon} ${s.name}: <b>${list(minutes)}</b> KST${set ? '' : ' (default)'}<br><span class="muted">Next (your time): ${next.join(' · ')}</span>`);
    }
    if (raw?.at) lines.push(`<span class="muted">Changed ${new Date(raw.at).toLocaleString()}${raw.by ? ' by ' + escapeHtml(raw.by) : ''}</span>`);
    $('showsNow').innerHTML = lines.join('<br><br>');
  }

  async function load() {
    const { data, error } = await client.rpc('ops_show_times');
    if (error) {
      if (error.code === '42501') return notOperator();
      $('showsNow').innerHTML = error.code === 'PGRST202' || error.code === '42883' ? SETUP : escapeHtml(error.message);
      return;
    }
    render(data);
  }

  // → [drone minutes, fireworks minutes], or an error message.
  function check() {
    const out = {};
    for (const [key, s] of Object.entries(SHOWS)) {
      const r = s.check(chosen(key));
      if (r.error) return `${s.icon} ${s.name}: ${r.error === 'close' ? `shows must be at least ${s.gap} minutes apart.` : WHY[r.error]}`;
      out[key] = r.minutes;
    }
    if (timesOverlap(out.drone, drone.DRONE_SPAN, out.fireworks, fw.FIREWORKS_SPAN)) {
      return 'The drone show and the fireworks would overlap. Counting their 10-minute notices, each takes 33 minutes: keep their starts at least 33 minutes apart.';
    }
    return out;
  }

  async function save(times) {
    const label = (key) => (times ? list(times[key]) : list(SHOWS[key].defaults)) + ' KST';
    if (!confirm(`Change the show times for every player now?\n\n🛸 Drone show: ${label('drone')}\n🎆 Fireworks: ${label('fireworks')}${times ? '' : '\n(the defaults)'}`)) return;
    $('showsSave').disabled = $('showsDefault').disabled = true;
    const same = (key) => times && list(times[key]) === list(SHOWS[key].defaults);
    // Saving the defaults stores null, so a later change to them in the code still applies.
    const r = await setShowTimes(client, times && !same('drone') ? times.drone : null, times && !same('fireworks') ? times.fireworks : null);
    $('showsSave').disabled = $('showsDefault').disabled = false;
    if (r.error === 'operator') return notOperator();
    if (!r.ok) { setStatus(r.error === 'setup' ? 'Run supabase/033_show_times.sql first.' : 'Could not change: ' + r.error); return; }
    setStatus('Show times changed ' + new Date().toLocaleTimeString());
    render(r.data);
  }

  $('showsSave').onclick = () => {
    const r = check();
    if (typeof r === 'string') { setStatus(r); alert(r); return; }
    save(r);
  };
  $('showsDefault').onclick = () => save(null);
  $('showsReload').onclick = load;
  return { load };
}
