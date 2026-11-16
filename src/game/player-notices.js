// Personal notices (개인 공지): a popup for one player only, shown once,
// e.g. "you were paid back for the cable car mission bug" (Yozi 2026-11-16).
// An operator adds a row to player_notices (supabase/049_player_notices.sql);
// the game asks for my unseen ones after the wallet opens, shows each, and
// marks it seen when closed. The server also sends my wallet, so money paid
// with the notice shows at once.
//
// Loaded with import() by main.js after the wallet opens.
//   runPlayerNotices({ wallet, refreshWallet, lang, t })
import { won } from '../core/money.js';

// A notice's text in my language: then English, then Korean.
export function noticeText(body, lang) {
  if (!body || typeof body !== 'object') return '';
  const base = String(lang || 'en').split('-')[0];
  return String(body[lang] || body[base] || (base === 'hant' ? body.zh : '') || body.en || body.ko || '').slice(0, 1200);
}

export async function runPlayerNotices(game) {
  const { wallet } = game;
  if (!wallet?.server || !wallet.client) return 0;
  let data = null;
  try {
    const res = await Promise.race([wallet.client.rpc('my_notices'), new Promise((r) => setTimeout(() => r({ error: { message: 'timeout' } }), 8000))]);
    data = res?.error ? null : res?.data;
  } catch { data = null; }
  const list = Array.isArray(data?.notices) ? data.notices : [];
  if (!list.length) return 0;
  const paid = list.reduce((s, n) => s + (Number(n.won) || 0), 0);
  if (paid > 0) { wallet.credited(paid, data, { k: 'notice.title' }); game.refreshWallet?.(); }
  for (const n of list) await show(n, game);
  return list.length;
}

function show(n, game) {
  return new Promise((done) => {
    const wrap = document.createElement('div');
    wrap.className = 'overlay dim';
    wrap.style.zIndex = '60';
    const card = document.createElement('div');
    card.className = 'panel small';
    const h = document.createElement('h2');
    h.textContent = '📮 ' + game.t('notice.title');
    const p = document.createElement('p');
    p.style.whiteSpace = 'pre-line';
    p.style.textAlign = 'start';
    p.textContent = noticeText(n.body, game.lang());
    const ok = document.createElement('button');
    ok.className = 'primary';
    ok.textContent = game.t('notice.ok');
    ok.onclick = () => {
      wrap.remove();
      game.wallet.client.rpc('notice_seen', { p_id: n.id }).then(() => {}, () => {});
      done();
    };
    card.append(h, p);
    if (Number(n.won) > 0) { const b = document.createElement('p'); b.className = 'wallet-balance'; const s = document.createElement('b'); s.textContent = '+' + won(Number(n.won)); b.append(s); card.append(b); }
    card.append(ok);
    wrap.append(card);
    document.body.append(wrap);
    ok.focus?.();
  });
}
