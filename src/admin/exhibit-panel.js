// The operator page's 🎨 Exhibits tab (admin.html): applications sent from
// apply.html, newest first, with their images (signed links from the private
// "exhibit-uploads" bucket) and buttons to accept or decline. Data from
// supabase/026_exhibit_apps.sql.

const SETUP = 'Run <code>supabase/026_exhibit_apps.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run, then <code>notify pgrst, \'reload schema\';</code>), then reload this page.';
const KIND = { wall: '🖼 Wall', solo: '🎨 Solo show', space: '🏠 Space', popup: '🛍 Seongsu pop-up' };
const WHO = { artist: 'Artist', business: 'Small business', student: 'Student', other: 'Other' };
const XMAS = { continue: 'Christmas: keep', new: 'Christmas: new work', no: 'Christmas: no' };
const STATUS = { new: 'New', accepted: '✅ Accepted', declined: '❌ Declined' };

export function createExhibitPanel({ client, $, escapeHtml, badge, notOperator }) {
  let filter = 'new';

  async function load() {
    const box = $('exhibitList');
    const { data, error } = await client.rpc('ops_exhibit_apps');
    if (error) {
      if (error.code === '42501') notOperator();
      box.innerHTML = `<p class="empty">${error.code === 'PGRST202' || error.code === '42883' ? SETUP : escapeHtml(error.message)}</p>`;
      return;
    }
    const counts = { all: data.length, new: 0, accepted: 0, declined: 0 };
    for (const a of data) counts[a.status] = (counts[a.status] || 0) + 1;
    badge('exhibitBadge', counts.new);
    for (const b of document.querySelectorAll('#exhibitFilter button')) {
      b.classList.toggle('primary', b.dataset.f === filter);
      b.textContent = `${b.dataset.label} (${counts[b.dataset.f] || 0})`;
    }
    const rows = data.filter((a) => filter === 'all' || a.status === filter);
    if (!rows.length) { box.innerHTML = '<p class="empty">No applications here yet.</p>'; return; }
    const paths = rows.flatMap((a) => a.images || []);
    const urls = new Map();
    if (paths.length) {
      const { data: signed } = await client.storage.from('exhibit-uploads').createSignedUrls(paths, 3600);
      for (const s of signed || []) if (s.signedUrl) urls.set(s.path, s.signedUrl);
    }
    box.innerHTML = '';
    for (const a of rows) box.append(card(a, urls));
  }

  function card(a, urls) {
    const d = document.createElement('div');
    d.className = 'card';
    const kinds = (a.kinds || []).map((k) => KIND[k] || k).join(' · ');
    d.innerHTML = `
      <div class="head"><b>${escapeHtml(a.name)}</b><span class="muted">${escapeHtml(STATUS[a.status] || a.status)} · ${new Date(a.created_at).toLocaleString()}</span></div>
      <div class="body">
        <div>${escapeHtml(kinds)} · ${escapeHtml(WHO[a.who] || a.who)} · ${escapeHtml(XMAS[a.christmas] || a.christmas)}</div>
        <div class="muted">${escapeHtml(a.email)}${a.sns ? ' · ' + escapeHtml(a.sns) : ''}${a.lang ? ' · ' + escapeHtml(a.lang) : ''}</div>
        <p style="white-space:pre-wrap">${escapeHtml(a.intro)}</p>
        ${a.titles ? `<p class="muted" style="white-space:pre-wrap"><b>Titles</b>\n${escapeHtml(a.titles)}</p>` : ''}
        ${a.mood ? `<p class="muted" style="white-space:pre-wrap"><b>Mood</b>\n${escapeHtml(a.mood)}</p>` : ''}
        <div class="ximgs"></div>
        <div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
          <input class="xnote" type="text" maxlength="1000" placeholder="Note (only operators see it)" style="flex:1;min-width:160px">
          <button type="button" data-s="accepted">Accept</button>
          <button type="button" data-s="declined">Decline</button>
          <button type="button" data-s="new">Back to new</button>
        </div>
      </div>`;
    const imgs = d.querySelector('.ximgs');
    for (const p of a.images || []) {
      const url = urls.get(p);
      const link = document.createElement('a');
      link.href = url || '#'; link.target = '_blank'; link.rel = 'noopener';
      const img = document.createElement('img');
      img.src = url || ''; img.alt = p; img.loading = 'lazy';
      link.append(img);
      imgs.append(link);
    }
    const note = d.querySelector('.xnote');
    note.value = a.note || '';
    for (const b of d.querySelectorAll('button[data-s]')) {
      b.onclick = async () => {
        b.disabled = true;
        const { error } = await client.rpc('ops_exhibit_set', { app_id: a.id, new_status: b.dataset.s, new_note: note.value });
        if (error) alert(error.message);
        load();
      };
    }
    return d;
  }

  for (const b of document.querySelectorAll('#exhibitFilter button')) {
    b.dataset.label = b.textContent;
    b.onclick = () => { filter = b.dataset.f; load(); };
  }
  $('exhibitReload').onclick = load;
  load(); // (for the badge, even before the tab is opened)

  return { show(on) { if (on) load(); } };
}
