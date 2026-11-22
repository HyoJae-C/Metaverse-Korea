// The friend request card: when someone asks to be friends, a small card
// stays on screen with Accept right on it, until it is answered or put off.
// Several at once: one card, oldest first, "+2 more"; answering one shows the
// next. (Before, a request was only a 1.6 s toast, and requests arriving
// together overwrote each other's toast; the red dot was on the 👥 button
// inside the closed chat bar, so a missed toast left nothing to tap.)

import { t } from '../core/i18n.js';
import { nextAsk } from '../core/friends.js';
import { L } from './pocha-ui.js';
import { FRIEND_TEXT, whereText } from './friends-ui.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class FriendAskCard {
  // app: { accept(uid, name) → Promise of the result ('friends' when done), open() opens the friends panel,
  //        locate(name) → { id, m, dir } or null, ping(id), sound() }
  constructor(host, app) {
    this.app = app;
    this.root = el('div', 'friend-ask');
    this.root.id = 'friend-ask';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    host.append(this.root);
    this.incoming = [];
    this.skipped = new Set(); // put off with "Later" (until they ask again)
    this.busy = null; // uid being accepted
    this.shown = null; // uid on the card now
  }

  update(incoming) {
    this.incoming = incoming || [];
    const live = new Set(this.incoming.map((f) => f.uid));
    for (const u of this.skipped) if (!live.has(u)) this.skipped.delete(u); // withdrawn or answered elsewhere
    if (this.busy && !live.has(this.busy)) this.busy = null;
    this.render();
  }

  render() {
    const n = nextAsk(this.incoming, this.skipped);
    if (!n) { this.root.hidden = true; this.shown = null; return; }
    const { ask, more } = n;
    if (this.shown !== ask.uid) {
      this.shown = ask.uid;
      const at = this.app.locate(ask.name);
      if (at) this.app.ping(at.id); // 👋 over their head
      this.app.sound();
    }
    const at = this.app.locate(ask.name);
    const text = el('button', 'friend-ask-text');
    text.type = 'button';
    text.append(el('b', null, t('friends.ask', { name: ask.name })),
      el('small', at ? 'here' : null, (at ? '📍 ' + whereText(at) : L(FRIEND_TEXT.w_away)) + (more ? ' · ' + t('friends.askMore', { n: more }) : '')));
    text.onclick = () => this.app.open(); // all of them, with Decline
    const ok = el('button', 'chip primary', L(FRIEND_TEXT.accept));
    ok.type = 'button';
    ok.disabled = this.busy === ask.uid;
    ok.onclick = async () => {
      this.busy = ask.uid;
      this.render();
      try { if (await this.app.accept(ask.uid, ask.name) === 'friends') this.skipped.add(ask.uid); } finally { if (this.busy === ask.uid) { this.busy = null; this.render(); } }
    };
    const later = el('button', 'chip', t('friends.later'));
    later.type = 'button';
    later.onclick = () => { this.skipped.add(ask.uid); this.render(); };
    this.root.replaceChildren(el('span', 'fr-avatar', at ? '👋' : '🙂'), text, ok, later);
    this.root.hidden = false;
  }
}
