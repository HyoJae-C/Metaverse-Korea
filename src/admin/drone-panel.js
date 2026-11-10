// The operator page's Drone show tab (supabase/033_drone_show.sql): choose
// when the Ttukseom drone light show starts, 1 to 4 times a day on Korean
// time, for every player at once. Kept clear of the Yeouido fireworks.
import { DRONE_SHOW_HOURS_KST, MAX_SHOWS, MIN_GAP_MINUTES, checkShowTimes, clockText, nextDroneShow } from '../core/drone-show.js';
import { FIREWORKS_HOURS_KST, SHOW_SECONDS as FW_SECONDS, ALERT_SECONDS as FW_ALERT, DAWN_SECONDS } from '../core/fireworks-show.js';
import { setDroneShow } from '../core/drone-show-watch.js';

const SETUP = 'Run <code>supabase/033_drone_show.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run, then <code>notify pgrst, \'reload schema\';</code>), then reload this page.';
const DEFAULT = DRONE_SHOW_HOURS_KST.map((h) => Math.round(h * 60));
// The fireworks, from their notice to the end of their dawn (minutes KST).
const FIREWORKS = FIREWORKS_HOURS_KST.map((h) => [h * 60 - FW_ALERT / 60, h * 60 + (FW_SECONDS + DAWN_SECONDS) / 60]);
const WHY = {
  empty: 'Set at least one time.',
  many: `At most ${MAX_SHOWS} shows a day.`,
  bad: 'Times must be 00:00 to 23:59.',
  close: `Shows must be at least ${MIN_GAP_MINUTES} minutes apart.`,
  fireworks: `Too close to the Yeouido fireworks (an hour from ${FIREWORKS_HOURS_KST.map((h) => clockText(h * 60)).join(' and ')} KST). A drone show may start until ${FIREWORKS.map(([f0]) => clockText((f0 - 23 + 1440) % 1440)).join(' / ')} or from ${FIREWORKS.map(([, f1]) => clockText((f1 + 10) % 1440)).join(' / ')}.`,
};
const toMinutes = (v) => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const local = (ms) => new Date(ms).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });

export function createDronePanel({ client, $, escapeHtml, setStatus, notOperator }) {
  const inputs = Array.from({ length: MAX_SHOWS }, (_, i) => $('dsTime' + i));

  function fill(minutes) {
    inputs.forEach((el, i) => { el.value = minutes[i] != null ? clockText(minutes[i]) : ''; });
  }
  const chosen = () => inputs.map((el) => toMinutes(el.value)).filter((m) => m != null);

  function render(raw) {
    const set = Array.isArray(raw?.minutes) && raw.minutes.length ? raw.minutes : null;
    const minutes = set ? [...set].sort((a, b) => a - b) : DEFAULT;
    fill(minutes);
    const lines = [`Now: <b>${minutes.map(clockText).join(', ')}</b> KST${set ? '' : ' (default)'}`];
    // The next shows as every game will see them, in this computer's time.
    const hours = minutes.map((m) => m / 60);
    let t = Date.now();
    const next = [];
    for (let i = 0; i < Math.min(4, minutes.length * 2); i++) { t = nextDroneShow(t, hours); next.push(local(t)); t += 1000; }
    lines.push(`Next shows (your time): ${next.join(' · ')}`);
    if (raw?.at) lines.push(`<span class="muted">Changed ${new Date(raw.at).toLocaleString()}${raw.by ? ' by ' + escapeHtml(raw.by) : ''}</span>`);
    $('dsNow').innerHTML = lines.join('<br>');
  }

  async function load() {
    const { data, error } = await client.rpc('ops_drone_show');
    if (error) {
      if (error.code === '42501') return notOperator();
      $('dsNow').innerHTML = error.code === 'PGRST202' || error.code === '42883' ? SETUP : escapeHtml(error.message);
      return;
    }
    render(data);
  }

  async function save(minutes) {
    const label = minutes ? minutes.map(clockText).join(', ') + ' KST' : `the default (${DEFAULT.map(clockText).join(', ')} KST)`;
    if (!confirm(`Change the drone show times for every player now?\n\n${label}`)) return;
    $('dsSave').disabled = $('dsDefault').disabled = true;
    const r = await setDroneShow(client, minutes);
    $('dsSave').disabled = $('dsDefault').disabled = false;
    if (r.error === 'operator') return notOperator();
    if (!r.ok) { setStatus(r.error === 'setup' ? 'Run supabase/033_drone_show.sql first.' : 'Could not change: ' + r.error); return; }
    setStatus('Drone show times changed ' + new Date().toLocaleTimeString());
    render(r.data);
  }

  $('dsSave').onclick = () => {
    const r = checkShowTimes(chosen(), FIREWORKS);
    if (r.error) { setStatus(WHY[r.error]); alert(WHY[r.error]); return; }
    save(r.minutes);
  };
  $('dsDefault').onclick = () => save(null);
  $('dsReload').onclick = load;
  $('dsFireworks').textContent = FIREWORKS_HOURS_KST.map((h) => clockText(h * 60)).join(', ');
  return { load };
}
