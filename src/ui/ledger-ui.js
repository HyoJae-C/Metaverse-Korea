// Budget book (가계부): today's totals and the latest coins in and out.
import { getLanguage, localName, onLanguageChange, t } from '../core/i18n.js';

export function createLedger(game) {
  const { $, wallet } = game;
  function ledgerLabel(e) {
    const lang = getLanguage(), n = e.note || {};
    const parts = [n.k && t(n.k, n.v), n.name && localName(n.name, lang), n.at && localName(n.at, lang)].filter(Boolean);
    return parts.length ? parts.join(' · ') : t(e.n > 0 ? 'ledger.in' : 'ledger.out');
  }
  function renderLedger() {
    const lang = getLanguage();
    const day = wallet.dayTotals();
    $('ledger-today').textContent = t('ledger.today', { in: day.in.toLocaleString(), out: day.out.toLocaleString() });
    const when = (ms) => {
      const d = new Date(ms), now = new Date();
      const time = d.toLocaleTimeString(lang === 'zht' ? 'zh-Hant' : lang, { hour: 'numeric', minute: '2-digit' });
      return d.toDateString() === now.toDateString() ? time : d.toLocaleDateString(lang === 'zht' ? 'zh-Hant' : lang, { month: 'short', day: 'numeric' }) + ' ' + time;
    };
    const rows = wallet.log.slice().reverse().map((e) => {
      const row = document.createElement('div');
      row.className = 'ledger-row';
      const what = document.createElement('span');
      what.className = 'ledger-what';
      const label = document.createElement('strong');
      label.textContent = ledgerLabel(e);
      const at = document.createElement('small');
      at.textContent = when(e.t);
      what.append(label, at);
      const amt = document.createElement('span');
      amt.className = 'ledger-amt ' + (e.n > 0 ? 'in' : 'out');
      amt.textContent = (e.n > 0 ? '+' : '−') + Math.abs(e.n).toLocaleString();
      const bal = document.createElement('small');
      bal.className = 'ledger-bal';
      bal.textContent = '🪙 ' + Number(e.bal ?? 0).toLocaleString();
      amt.append(bal);
      row.append(what, amt);
      return row;
    });
    if (!rows.length) {
      const p = document.createElement('p');
      p.className = 'fine';
      p.textContent = t('ledger.empty');
      rows.push(p);
    }
    $('ledger-list').replaceChildren(...rows);
  }
  $('ledger-btn').onclick = () => { $('wallet-panel').hidden = true; renderLedger(); $('ledger-panel').hidden = false; };
  $('ledger-close').onclick = () => { $('ledger-panel').hidden = true; };
  wallet.onChange(() => { if (!$('ledger-panel').hidden) renderLedger(); });
  onLanguageChange(() => { if (!$('ledger-panel').hidden) renderLedger(); });
  return {  };
}
