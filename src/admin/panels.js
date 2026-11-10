// The operator page's other tabs (admin.html): overview numbers, the inquiry
// board with replies, free board moderation and the player list. All data
// comes through operator-only functions in supabase/009_admin.sql.

const SETUP = 'Run <code>supabase/009_admin.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run, then <code>notify pgrst, \'reload schema\';</code>), then reload this page.';
const missing = (e) => e && (e.code === 'PGRST202' || e.code === '42883' || e.code === '42703');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
import { createRetention } from './retention.js';
import { MAX_NOTICE, cleanNotice, deleteNotice, sendNotice } from '../core/announce.js';
import { createWeatherPanel } from './weather-panel.js';
import { createDronePanel } from './drone-panel.js';

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '–');

export function createPanels({ client, $, escapeHtml, agoText, describePlace, setStatus, go, notOperator, badge }) {
  const since = (iso) => (iso ? agoText((Date.now() - Date.parse(iso)) / 1000) : '–');

  // Runs an operator function; shows setup / permission problems in `box`.
  async function call(fn, args, box) {
    const { data, error } = await client.rpc(fn, args);
    if (!error) return { data };
    if (error.code === '42501') notOperator();
    else if (box) box.innerHTML = `<p class="empty">${missing(error) ? SETUP : escapeHtml(error.message)}</p>`;
    else setStatus(error.message);
    return { error };
  }

  // ---------- Overview ----------
  let statsTimer = 0;
  async function overview() {
    clearTimeout(statsTimer);
    const box = $('stats');
    const { data } = await call('ops_stats', {}, box);
    if (!data) return;
    const tiles = [
      ['online_now', 'Online now', 'live'],
      ['played_today', 'Played today (KST)', 'live'],
      ['played_7d', 'Played in 7 days', null],
      ['open_inquiries', 'Open inquiries', 'ask'],
      ['inquiries_today', 'Inquiries today', 'ask'],
      ['free_today', 'Free board posts today', 'free'],
      ['accounts', 'Accounts', 'players'],
      ['accounts_google', 'Signed in with Google', 'players'],
      ['new_today', 'New accounts today', 'players'],
      ['names', 'Players with a name', 'players'],
      ['chat_bans', 'Chat bans', 'players'],
    ];
    box.replaceChildren(...tiles.map(([k, label, tab]) => {
      const t = el('div', 'stat' + (tab ? ' link' : '') + (k === 'open_inquiries' && data[k] ? ' alert' : ''));
      t.append(el('b', '', String(data[k] ?? '–')), el('span', 'muted', label));
      if (tab) t.onclick = () => go(tab);
      return t;
    }));
    badge('askBadge', data.open_inquiries);
    badge('liveBadge', data.online_now);
    $('statsNote').textContent = '"Played" counts accounts whose game reported a spot (since 008_player_where.sql was run). Updated ' + new Date().toLocaleTimeString() + '.';
    statsTimer = setTimeout(() => current === 'overview' && !document.hidden && overview(), 15000);
    countries();
  }

  // ---------- Countries (supabase/010_countries.sql) ----------
  const regionName = (() => {
    try { const d = new Intl.DisplayNames(['en'], { type: 'region' }); return (cc) => d.of(cc); } catch { return (cc) => cc; }
  })();
  const flag = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));
  async function countries() {
    const box = $('countryList');
    const { data, error } = await client.rpc('ops_countries', { days: +$('countryDays').value });
    if (error) {
      if (error.code === '42501') return notOperator();
      box.innerHTML = `<p class="empty">${missing(error) ? 'Run <code>supabase/010_countries.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run, then <code>notify pgrst, \'reload schema\';</code>), then reload this page.' : escapeHtml(error.message)}</p>`;
      $('countryTotal').textContent = '';
      return;
    }
    const rows = data || [];
    const total = rows.reduce((n, r) => n + Number(r.players), 0);
    const top = Math.max(1, ...rows.map((r) => Number(r.players)));
    $('countryTotal').textContent = rows.length ? `${rows.filter((r) => r.country !== 'XX').length} countries` : '';
    if (!rows.length) { box.innerHTML = '<p class="empty">No players counted in this period yet.</p>'; return; }
    box.replaceChildren(...rows.map((r) => {
      const n = Number(r.players);
      const known = r.country !== 'XX';
      const row = el('div', 'crow');
      const name = el('span', 'name', known ? `${flag(r.country)} ${regionName(r.country) || r.country}` : '❔ Unknown (UTC)');
      name.title = `${r.country} · ${r.visits} player-days`;
      const bar = el('span', 'bar');
      const fill = el('i');
      fill.style.width = `${Math.max(2, (n / top) * 100)}%`;
      bar.append(fill);
      row.append(name, bar, el('span', 'n', `${n} · ${Math.round((n / total) * 100)}%`));
      return row;
    }));
  }
  $('countryDays').onchange = countries;

  // ---------- Boards ----------
  async function board(b) {
    const box = $(b === 'ask' ? 'askList' : 'freeList');
    box.innerHTML = '<p class="empty">Loading…</p>';
    const onlyOpen = b === 'ask' && $('askOpen').checked;
    const { data } = await call('ops_board', { b, only_open: onlyOpen, lim: 200 }, box);
    if (!data) return;
    if (b === 'ask') badge('askBadge', onlyOpen ? data.length : data.filter((p) => !p.done && !p.deleted).length);
    if (!data.length) { box.innerHTML = `<p class="empty">${onlyOpen ? 'No open inquiries. 🎉' : 'No posts yet.'}</p>`; return; }
    box.replaceChildren(...data.map((p) => (b === 'ask' ? askCard(p) : freeCard(p))));
  }

  function head(p) {
    const h = el('div', 'head');
    h.append(el('b', '', p.name), el('span', 'muted', `${when(p.created_at)} · ${since(p.created_at)}`));
    if (p.deleted) h.append(el('span', 'tag red', 'deleted by writer'));
    if (p.hidden) h.append(el('span', 'tag red', 'hidden'));
    const who = el('button', '', 'Player');
    who.title = 'Find this account in Players';
    who.style.marginLeft = 'auto';
    who.onclick = () => { $('playerQ').value = p.name; go('players'); };
    h.append(who);
    return h;
  }

  function askCard(p) {
    const c = el('div', 'card' + (p.done ? ' done' : ''));
    const h = head(p);
    h.insertBefore(el('span', p.done ? 'tag green' : 'tag blue', p.done ? (p.reply ? 'answered' : 'done') : 'open'), h.children[2]);
    c.append(h, el('div', 'body', p.body));
    if (p.reply) c.append(el('div', 'reply', `🛡️ ${p.reply}\n— ${when(p.replied_at)}`));
    const ta = el('textarea');
    ta.placeholder = 'Reply (the player sees it under their inquiry in the game)';
    ta.maxLength = 2000;
    ta.value = p.reply || '';
    const row = el('div', 'row');
    const send = el('button', 'primary', p.reply ? 'Update reply' : 'Send reply');
    send.onclick = async () => {
      send.disabled = true;
      const { error } = await call('ops_reply', { post_id: p.id, reply_text: ta.value }, null);
      send.disabled = false;
      if (!error) { setStatus('Reply saved'); board('ask'); }
    };
    const done = el('button', '', p.done ? 'Reopen' : 'Mark done (no reply)');
    done.onclick = async () => { if (!(await call('ops_set_done', { post_id: p.id, on_off: !p.done }, null)).error) board('ask'); };
    row.append(send, done);
    c.append(ta, row);
    return c;
  }

  function freeCard(p) {
    const c = el('div', 'card' + (p.hidden || p.deleted ? ' off' : ''));
    c.append(head(p), el('div', 'body', p.body));
    const row = el('div', 'row');
    const hide = el('button', p.hidden ? '' : 'danger', p.hidden ? 'Show again' : 'Hide from everyone');
    hide.onclick = async () => { if (!(await call('ops_set_hidden', { post_id: p.id, on_off: !p.hidden }, null)).error) board('free'); };
    row.append(hide);
    c.append(row);
    return c;
  }

  // ---------- Players ----------
  async function players() {
    const box = $('playerList');
    const { data, error } = await call('ops_players', { q: $('playerQ').value.trim(), lim: 200 }, null);
    if (error) { box.innerHTML = `<tr><td colspan="5" class="empty">${missing(error) ? SETUP : escapeHtml(error.message)}</td></tr>`; return; }
    if (!data.length) { box.innerHTML = '<tr><td colspan="5" class="empty">Nobody found.</td></tr>'; return; }
    box.replaceChildren(...data.map((u) => {
      const tr = el('tr');
      const name = el('td');
      name.append(el('b', '', u.name || '(no name)'));
      if (u.operator) name.append(' ', el('span', 'tag blue', 'operator'));
      name.append(el('div', 'muted', u.uid));
      const acct = el('td');
      acct.append(el('span', u.guest ? 'tag' : 'tag green', u.guest ? 'guest' : 'Google'));
      if (u.email) acct.append(el('div', 'muted', u.email));
      if (u.posts) acct.append(el('div', 'muted', `${u.posts} board post${u.posts > 1 ? 's' : ''}`));
      const joined = el('td', 'muted', when(u.joined));
      const seen = el('td');
      const fresh = u.last_seen && Date.now() - Date.parse(u.last_seen) < 90000;
      seen.append(el('span', fresh ? 'tag green' : '', fresh ? 'online' : since(u.last_seen || u.last_save)));
      if (u.place && fresh) seen.append(el('div', 'muted', describePlace(u.place)));
      const chat = el('td');
      if (u.banned) chat.append(el('span', 'tag red', 'banned'), el('div', 'muted', u.ban_reason || ''));
      const b = el('button', u.banned ? '' : 'danger', u.banned ? 'Unban' : 'Ban chat');
      b.onclick = async () => {
        let why = null;
        if (!u.banned) {
          why = prompt(`Stop ${u.name || 'this account'} chatting? Reason (optional):`, '');
          if (why === null) return;
        }
        if (!(await call('ops_set_ban', { target: u.uid, on_off: !u.banned, why }, null)).error) players();
      };
      chat.append(b);
      tr.append(name, acct, joined, seen, chat);
      return tr;
    }));
  }

  // ---------- Announcements (012_announcements.sql) ----------
  const NOTICE_SETUP = 'Run <code>supabase/012_announcements.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run, then <code>notify pgrst, \'reload schema\';</code>), then reload this page.';
  async function notices() {
    const box = $('noticeList');
    const { data, error } = await client.rpc('ops_announcements', { lim: 30 });
    if (error) {
      if (error.code === '42501') return notOperator();
      box.innerHTML = `<p class="empty">${missing(error) ? NOTICE_SETUP : escapeHtml(error.message)}</p>`;
      return;
    }
    if (!data.length) { box.innerHTML = '<p class="empty">No notices sent yet.</p>'; return; }
    box.replaceChildren(...data.map((n) => {
      const c = el('div', 'card');
      const h = el('div', 'head');
      h.append(el('b', '', '📢 ' + (n.sender_name || 'operator') + (n.pinned ? ' · 📌 pinned on screen' : '')), el('span', 'muted', `${when(n.at)} · ${since(n.at)}`));
      c.append(h, el('div', 'body', n.body));
      const row = el('div', 'row');
      const del = el('button', 'danger', 'Delete');
      del.title = 'Remove it from the list, from everyone\'s screen and chat';
      del.onclick = async () => {
        if (!confirm(`Delete this notice? It also disappears from the screen and chat of everyone playing now.\n\n${n.body}`)) return;
        del.disabled = true;
        const r = await deleteNotice(client, n.id);
        if (r.error === 'operator') return notOperator();
        if (!r.ok) {
          del.disabled = false;
          setStatus(r.error === 'setup' ? 'Run supabase/013_announcement_delete.sql first.' : 'Could not delete: ' + r.error);
          return;
        }
        setStatus('Notice deleted ' + new Date().toLocaleTimeString());
        notices();
      };
      row.append(del);
      c.append(row);
      return c;
    }));
  }
  const noticeText = $('noticeText');
  noticeText.maxLength = MAX_NOTICE;
  const noticeCount = () => { $('noticeCount').textContent = `${cleanNotice(noticeText.value).length} / ${MAX_NOTICE}`; };
  noticeText.oninput = noticeCount;
  noticeCount();
  $('noticeSend').onclick = async () => {
    const body = cleanNotice(noticeText.value);
    if (!body) { noticeText.focus(); return; }
    if (!confirm(`Send this notice to every player now?\n\n${body}`)) return;
    $('noticeSend').disabled = true;
    const r = await sendNotice(client, body);
    $('noticeSend').disabled = false;
    const ERR = { operator: 'Only operators can send notices.', setup: 'Run supabase/012_announcements.sql first.', busy: 'Too many notices: wait a minute.', empty: 'Write a notice first.' };
    if (r.error === 'operator') notOperator();
    if (!r.ok) { setStatus(ERR[r.error] || 'Could not send: ' + r.error); return; }
    noticeText.value = '';
    noticeCount();
    setStatus('Notice sent ' + new Date().toLocaleTimeString());
    notices();
  };

  // ---------- Wiring ----------
  let current = null, searchTimer = 0;
  $('askOpen').onchange = () => board('ask');
  $('askReload').onclick = () => board('ask');
  $('freeReload').onclick = () => board('free');
  $('playerReload').onclick = () => players();
  $('noticeReload').onclick = () => notices();
  $('playerQ').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(players, 300); };
  const retention = createRetention({ client, $, escapeHtml, notOperator });
  const weatherPanel = createWeatherPanel({ client, $, escapeHtml, setStatus, notOperator });
  const dronePanel = createDronePanel({ client, $, escapeHtml, setStatus, notOperator });
  const OPEN = { overview, ask: () => board('ask'), free: () => board('free'), players, retention: retention.load, notice: notices, weather: weatherPanel.load, drone: dronePanel.load };
  // The open-inquiry badge stays current even while another tab is open.
  const badges = async () => {
    if (document.hidden || current === 'overview') return;
    const { data } = await client.rpc('ops_stats');
    if (data) { badge('askBadge', data.open_inquiries); badge('liveBadge', data.online_now); }
  };
  setInterval(badges, 60000);
  setTimeout(badges, 500);
  return {
    show(name) { current = name; OPEN[name]?.(); },
    wake(name) { if (name === 'overview') overview(); },
  };
}
