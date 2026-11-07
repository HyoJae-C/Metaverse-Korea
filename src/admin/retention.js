// The operator page's Retention tab (admin.html): daily players, D1/D3/D7
// return by join day, session length, days played per week, first-session
// drop-off, alone vs together, devices and frame rate. Data comes from
// ops_retention() in supabase/011_play_sessions.sql. Below that, "More":
// the loading funnel, D1/D7 by country, rewarded ads, the first path, what
// new players did on day 1, languages, Google sign-in and errors, from
// ops_retention_more() in supabase/014_retention_more.sql.

const SETUP = 'Run <code>supabase/011_play_sessions.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run, then <code>notify pgrst, \'reload schema\';</code>), then reload this page. Numbers start from the first game session after that.';
const MORE_SETUP = 'For the loading funnel, countries, ads and errors: run <code>supabase/014_retention_more.sql</code> once (and <code>010_countries.sql</code> if not yet), then <code>notify pgrst, \'reload schema\';</code> and reload. Numbers start from then.';
const missing = (e) => e && (e.code === 'PGRST202' || e.code === '42883' || e.code === '42703' || e.code === '42P01');

// "3/7 (43%)" — with so few players the count matters more than the
// percentage, so both are shown. "–" while the day hasn't come yet.
export function ratio(n, of, ready = true) {
  if (!ready) return '–';
  if (!of) return '0/0';
  return `${n}/${of} (${Math.round((n / of) * 100)}%)`;
}

// Adds up cohorts (joined day × tagged) into one row per group:
// { all, tagged, other } → { players, d1, d1of, d3, d3of, d7, d7of, d7plus, under5 }.
// A cohort counts toward D1 only once its D1 day is over, and so on.
export function sumCohorts(cohorts = []) {
  const zero = () => ({ players: 0, d1: 0, d1of: 0, d3: 0, d3of: 0, d7: 0, d7of: 0, d7plus: 0, under5: 0 });
  const out = { all: zero(), tagged: zero(), other: zero() };
  for (const c of cohorts) {
    for (const g of [out.all, c.tagged ? out.tagged : out.other]) {
      g.players += c.players;
      g.under5 += c.first_under5;
      if (c.d1_ready) { g.d1 += c.d1; g.d1of += c.players; }
      if (c.d3_ready) { g.d3 += c.d3; g.d3of += c.players; }
      if (c.d7_ready) { g.d7 += c.d7; g.d7plus += c.d7plus; g.d7of += c.players; }
    }
  }
  return out;
}

// One loading-funnel row: each step as a share of the visits opened.
export function funnelRow(f) {
  const time = f.load_med_s ? `${f.load_med_s} s / ${f.load_p90_s} s` : '–';
  return [f.is_new ? 'First visit' : 'Returning', f.opened, ratio(f.pressed, f.opened), ratio(f.loaded, f.opened), ratio(f.minute, f.opened), ratio(f.failed, f.opened), time];
}

// 'KR' → '🇰🇷 South Korea'; 'XX' → 'Unknown'.
export function countryLabel(cc) {
  if (!/^[A-Z]{2}$/.test(cc || '') || cc === 'XX') return '❔ Unknown';
  const flag = String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  let name = cc;
  try { name = new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc; } catch { /* old browser */ }
  return `${flag} ${name}`;
}

export function createRetention({ client, $, escapeHtml, notOperator }) {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function tile(value, label, hint) {
    const t = el('div', 'stat');
    t.append(el('b', '', String(value)), el('span', 'muted', label));
    if (hint) t.title = hint;
    return t;
  }

  async function load() {
    const box = $('retBody');
    const { data, error } = await client.rpc('ops_retention', { days: +$('retDays').value });
    if (error) {
      if (error.code === '42501') return notOperator();
      box.innerHTML = `<p class="empty">${missing(error) ? SETUP : escapeHtml(error.message)}</p>`;
      return;
    }
    if (!data?.since) { box.innerHTML = '<p class="empty">No sessions recorded yet. They appear a minute after someone plays.</p>'; return; }
    const w = data.week;
    const parts = [];

    // Last 7 days
    const h1 = el('h3', '', 'Last 7 days');
    const tiles = el('div', 'stats');
    tiles.append(
      tile(w.players, 'Players'),
      tile(w.days_4plus, 'Played 4+ of 7 days', 'The habit number: how many people play most days.'),
      tile(w.days_2_3, 'Played 2–3 days'),
      tile(w.days_1, 'Played 1 day'),
      tile(`${w.median_min} min`, 'Median session', 'Half of the sessions were longer than this.'),
      tile(w.sessions_per_player_day, 'Sessions per player-day'),
      tile(`${Math.round(w.together_share * 100)}%`, 'Time with someone near', `Share of play time with another player within 25 m.`),
      tile(w.fishing_players, 'Players who fished', `${w.fish} fish caught`),
      tile(w.buying_players, 'Players who spent coins', `${w.coins_in} coins earned, ${w.coins_out} spent`),
      tile(w.chatting_players, 'Players who chatted'),
    );
    parts.push(h1, tiles);

    // Return rate by group
    const s = sumCohorts(data.cohorts);
    const h2 = el('h3', '', `Coming back (players who started in the last ${data.days} days)`);
    const t2 = el('table', 'grid');
    t2.innerHTML = '<thead><tr><th>Group</th><th>Players</th><th>D1</th><th>D3</th><th>D7</th><th>Any day after D7</th><th>First session under 5 min</th></tr></thead>';
    const tb2 = el('tbody');
    for (const [key, label] of [['all', 'Everyone'], ['tagged', 'From a tagged link (?src=)'], ['other', 'Others']]) {
      const g = s[key];
      if (key !== 'all' && !g.players) continue;
      const tr = el('tr');
      for (const v of [label, g.players, ratio(g.d1, g.d1of), ratio(g.d3, g.d3of), ratio(g.d7, g.d7of), ratio(g.d7plus, g.d7of), ratio(g.under5, g.players)]) tr.append(el('td', '', String(v)));
      tb2.append(tr);
    }
    t2.append(tb2);
    const n2 = el('p', 'muted', 'D1 = played again the next Korean day, D3/D7 = on that day exactly. A day is only counted once it is over. With under ~30 players a single person moves these a lot: read the counts, not just the %.');
    const wrap2 = el('div', 'scroll-x');
    wrap2.append(t2);
    parts.push(h2, wrap2, n2);

    // Daily players
    const h3 = el('h3', '', 'Players per day (KST)');
    const daily = el('div', 'card');
    const top = Math.max(1, ...data.daily.map((d) => d.players));
    if (!data.daily.length) daily.append(el('p', 'empty', 'No days yet.'));
    for (const d of data.daily.slice().reverse()) {
      const row = el('div', 'rrow');
      const bar = el('span', 'bar');
      const fill = el('i');
      fill.style.width = `${Math.max(2, (d.players / top) * 100)}%`;
      bar.append(fill);
      row.append(el('span', 'name', d.day), bar, el('span', 'n', `${d.players}${d.new ? ` (+${d.new} new)` : ''} · ${d.median_min} min`));
      row.title = `${d.sessions} sessions, median ${d.median_min} min`;
      daily.append(row);
    }
    parts.push(h3, daily);

    // Join-day cohorts
    const h4 = el('h3', '', 'By start day');
    const t4 = el('table', 'grid');
    t4.innerHTML = '<thead><tr><th>Started</th><th>From</th><th>Players</th><th>D1</th><th>D3</th><th>D7</th><th>First &lt; 5 min</th></tr></thead>';
    const tb4 = el('tbody');
    for (const c of data.cohorts) {
      const tr = el('tr');
      for (const v of [c.joined, c.tagged ? 'tagged link' : 'other', c.players, ratio(c.d1, c.players, c.d1_ready), ratio(c.d3, c.players, c.d3_ready), ratio(c.d7, c.players, c.d7_ready), ratio(c.first_under5, c.players)]) tr.append(el('td', '', String(v)));
      tb4.append(tr);
    }
    t4.append(tb4);
    const wrap4 = el('div', 'scroll-x');
    wrap4.append(t4);
    parts.push(h4, wrap4);

    // Devices
    const h5 = el('h3', '', 'Devices (last 7 days)');
    const t5 = el('table', 'grid');
    t5.innerHTML = '<thead><tr><th>Device</th><th>Players</th><th>Median frame rate</th></tr></thead>';
    const tb5 = el('tbody');
    for (const d of data.devices) {
      const tr = el('tr');
      for (const v of [d.device, d.players, d.fps ? `${d.fps} fps` : '–']) tr.append(el('td', '', String(v)));
      tb5.append(tr);
    }
    t5.append(tb5);
    parts.push(h5, t5);

    parts.push(...await more());

    parts.push(el('p', 'muted', `Recording since ${data.since}. A session is one visit; the game reports once a minute while its tab is visible, so very short visits (under a minute) may not show. A player "starts" on their first recorded session. Updated ${new Date().toLocaleTimeString()}.`));
    box.replaceChildren(...parts);
  }

  // A table from a header row and rows of cells.
  function table(head, rows) {
    const t = el('table', 'grid');
    const tr0 = el('tr');
    for (const h of head) tr0.append(el('th', '', h));
    const th = el('thead'); th.append(tr0);
    const tb = el('tbody');
    for (const r of rows) {
      const tr = el('tr');
      for (const v of r) tr.append(el('td', '', String(v)));
      tb.append(tr);
    }
    t.append(th, tb);
    const w = el('div', 'scroll-x');
    w.append(t);
    return w;
  }

  // The "More" numbers (ops_retention_more, supabase/014_retention_more.sql).
  async function more() {
    const { data: m, error } = await client.rpc('ops_retention_more', { days: +$('retDays').value });
    if (error) {
      const p = el('p', 'empty');
      p.innerHTML = missing(error) ? MORE_SETUP : escapeHtml(error.message);
      return [el('h3', '', 'More'), p];
    }
    const out = [];

    // 1. Loading funnel
    out.push(el('h3', '', `Loading funnel (page visits, last ${m.days} days)`));
    out.push(table(['Visitor', 'Opened', 'Pressed Play', 'World loaded', 'Played 1 min', 'Load failed', 'Load time (median / slowest 10%)'],
      m.funnel.map((f) => funnelRow(f))));
    out.push(table(['Device', 'Opened', 'World loaded', 'Played 1 min', 'Median load'],
      m.funnel_devices.map((f) => [f.device, f.opened, ratio(f.loaded, f.opened), ratio(f.minute, f.opened), f.load_med_s ? `${f.load_med_s} s` : '–'])));
    out.push(el('p', 'muted', 'One row per page visit. "First visit" = nothing saved on that device yet. Load time runs from pressing Play to the world showing. People who close the page before the game reaches the server (very slow connections, blocked sites) can\'t show here.'));

    // 2. Countries
    out.push(el('h3', '', `Coming back by country (players who started in the last ${m.days} days)`));
    out.push(table(['Country', 'Players', 'D1', 'D7'],
      m.countries.map((c) => [countryLabel(c.country), c.players, ratio(c.d1, c.d1of), ratio(c.d7, c.d7of)])));
    out.push(el('p', 'muted', 'Country is guessed from the device time zone (no IP addresses), so a traveller in Korea counts for home. Unknown = UTC or no country report yet.'));

    // 3. Ads
    const a = m.ads;
    out.push(el('h3', '', 'Rewarded ads (last 7 days)'));
    const at = el('div', 'stats');
    at.append(
      tile(a.watched, 'Ads watched'),
      tile(ratio(a.watchers, a.players), 'Players who watched one'),
      tile(a.per_player_day, 'Ads per player-day', 'All players, including those who watched none.'),
      tile(a.per_watcher_day, 'Ads per watcher-day', 'Only days when the player watched at least one.'),
      tile(a.max_day, 'Most by one player in a day'),
    );
    out.push(at);

    // 4. First day
    const st = m.starter;
    out.push(el('h3', '', 'New players: the first path'));
    out.push(table(['Errands done', ...st.reached.map((_, i) => String(i + 1))],
      [['Players', ...st.reached.map((n) => ratio(n, st.players))]]));
    out.push(el('h3', '', 'New players: what they did on day 1, and D1'));
    out.push(table(['On day 1', 'Did it', 'D1 if did', "Didn't", "D1 if didn't"],
      m.first_day.map((f) => [f.label, f.yes, ratio(f.yes_d1, f.yes_of), f.no, ratio(f.no_d1, f.no_of)])));
    out.push(el('p', 'muted', 'The first path and the missions send every new player to shops, coffee and food, so those say little about taste. Fishing, chatting, time near others and ads are things nobody is told to do on day 1. A gap here is a hint, not proof: keen players do more of everything.'));

    // 5. Language, Google, errors
    out.push(el('h3', '', 'Language and sign-in (last 7 days)'));
    out.push(table(['Language', 'Players'], m.languages.map((l) => [l.lang, l.players])));
    out.push(el('p', '', `Linked to Google: ${ratio(m.google.linked, m.google.players)}`));
    const e = m.errors;
    out.push(el('h3', '', 'Errors (last 7 days)'));
    out.push(el('p', '', `Sessions with an error: ${ratio(e.with_errors, e.sessions)}`));
    if (e.top.length) out.push(table(['Message (numbers shown as #)', 'Times'], e.top.map((x) => [x.msg, x.n])));
    return out;
  }

  $('retDays').onchange = load;
  $('retReload').onclick = load;
  return { load };
}
