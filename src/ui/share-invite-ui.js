// The "Invite a friend" card (game/share-invite.js decides when): my link,
// a Share button where the phone has one, Copy, and Later. Built on first
// use and removed when closed.
export function openShareInvite({ $, t, link, toast }) {
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const panel = el('div', 'overlay dim');
  panel.id = 'share-invite-panel';
  const card = el('div', 'panel small install-card share-card');
  const icon = el('img', 'install-icon');
  icon.src = './icon-192.png';
  icon.alt = '';
  const box = el('input', 'share-link');
  box.readOnly = true;
  // (readable here; the copied and shared link stays percent-encoded, which every app links)
  try { box.value = decodeURI(link); } catch { box.value = link; }
  box.onfocus = () => box.select();
  const close = () => panel.remove();
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast?.(t('invite.copied')); } catch { box.focus(); box.select(); }
  };
  const btns = el('div', 'share-btns');
  if (navigator.share) {
    const share = el('button', 'primary', `📤 ${t('invite.share')}`);
    share.onclick = async () => {
      try { await navigator.share({ title: 'MODU SEOUL', text: t('invite.message'), url: link }); close(); } catch { /* cancelled */ }
    };
    btns.append(share);
  }
  const copyBtn = el('button', navigator.share ? 'chip' : 'primary', `🔗 ${t('invite.copy')}`);
  copyBtn.onclick = copy;
  btns.append(copyBtn);
  const later = el('button', 'chip install-close', t('invite.later'));
  later.onclick = close;
  card.append(icon, el('h2', null, t('invite.title')), el('p', 'install-why', t('invite.why')), box, btns, later);
  panel.append(card);
  panel.onclick = (e) => { if (e.target === panel) close(); };
  ($('install-panel')?.parentNode || document.body).append(panel); // (where the other cards sit)
  return { close };
}
