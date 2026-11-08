// Seoul Bank (서울은행): talk to the teller to send won to another player.
// The server moves the money (supabase/028_bank.sql) and decides who may:
// operators only for now, so everyone else hears "coming soon".
import { checkSend, parseAmount } from '../core/bank.js';
import { BankUI, BANK_TEXT, L, fmt, memoText, whyText } from '../ui/bank-ui.js';
import { localName, getLanguage } from '../core/i18n.js';
import { newOpId } from '../core/wallet.js';
import { won } from '../core/money.js';

export function createBank(game) {
  const { cloud, shop, refreshWallet } = game;
  const ui = new BankUI();
  let asking = 0;
  const bankName = () => localName(game.interior?.store?.name, getLanguage()) || '🏦';
  const inBank = () => game.interior?.store?.workshop === 'bank';

  async function openBank() {
    const my = ++asking;
    ui.asking(bankName());
    const st = await cloud.bankStatus();
    if (my !== asking || !ui.open || !inBank()) return;
    if (!st.open) { ui.soon(bankName()); return; }
    await game.wallet.flush?.(); // so the balance shown is the server's
    if (my !== asking || !ui.open) return;
    ui.form({
      bank: bankName(), coins: game.wallet.coins, min: st.min, max: st.max,
      people: game.peopleHere(),
      onSend: async ({ to, amountText, memo }) => {
        const n = parseAmount(amountText);
        const name = String(to).trim();
        const why = checkSend({ to: name, n, balance: game.wallet.coins, min: st.min, max: st.max, me: game.nickname });
        if (why) return whyText(why, st);
        const r = await cloud.bankSend({ op: newOpId(), to: name, n, memo });
        if (r.status !== 'ok') return whyText(r.status, st);
        const shown = r.name || name;
        game.wallet.charged(n, r, { k: 'ledger.bankOut', v: { name: shown } });
        refreshWallet();
        game.sfx?.pop?.();
        shop.toast(fmt(L(BANK_TEXT.sent), { name: shown, n: won(n) }));
        return '';
      },
    });
  }

  // Money other players sent me: on start, every few minutes, and whenever
  // I walk into a bank.
  async function checkNews() {
    if (!game.wallet.server || document.hidden) return;
    const r = await cloud.bankNews();
    if (!r?.items.length) return;
    r.items.forEach((it, i) => {
      game.wallet.credited(it.n, r, { k: 'ledger.bankIn', v: { name: it.name || '?' } });
      setTimeout(() => shop.toast(fmt(L(BANK_TEXT.got), { name: it.name || '?', n: won(it.n), memo: memoText(it.memo) })), 800 + i * 3500);
    });
    refreshWallet();
  }

  // Leaving the bank closes the window.
  setInterval(() => { if (ui.open && !inBank()) ui.close(); }, 1000);

  return { openBank, checkNews, bankUi: ui, tellerLabel: () => '🏦 ' + L(BANK_TEXT.teller), actionLabel: () => '🏦 ' + L(BANK_TEXT.open) };
}
