// Text chat: a speech bubble over your head and a log of the last lines.
// Each line fades off the screen a minute after it arrives so it does not
// cover the view; opening the chat shows them all again (scroll back while
// typing). On phones the log can also be folded away (the small tab by it);
// while folded, a new line makes the 💬 button blink. Opens with 💬, or T or / on a keyboard. Text only, never HTML.
// The picker in the chat bar chooses who hears it: everyone nearby (public;
// the server keeps it 90 days for reports, supabase/024_chat_log.sql), all friends, or one friend. Friend chat is kept like
// a phone messenger (core/friends.js, the 👥 panel).
// In Myeongdong Cathedral's confession room (game.confession) nothing is
// sent at all: the line goes only to the priest on this device
// (core/confession-room.js), never into the chat log or any save.
import { ALL as FRIENDS_ALL, MAX_BODY as FRIEND_MAX_BODY, Inbox, LocalFriends, SupabaseFriends, cleanBody as cleanFriendText, convKey, whereIs } from '../core/friends.js';
import { FRIEND_TEXT, FriendsUI, whereText } from '../ui/friends-ui.js';
import { NOTICE_LABEL, NoticeFeed, PinnedNotices, parseNoticeCommand, sendNotice, watchNotices } from '../core/announce.js';
import { ITEMS, coinCode, eventCode, isEventCode, isMasterCode, redeemCode } from '../core/inventory.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { config } from '../config.js';
import { filterText } from '../core/safety.js';
import { fishCode, forceNextCatch, toggleTour, TOUR } from '../core/fish-luck.js';
import { getLanguage, localName, onLanguageChange, t } from '../core/i18n.js';
import { saveLook } from '../core/look-editor.js';
import { showBubble } from '../core/players.js';
import { opIdFor } from '../core/wallet.js';
import { skyCode } from './sky-codes.js';
import { nextShow, showNoticeText, nextSunset, sunsetNoticeText } from '../core/show-notice.js';

const NOTICE_TEXT = {
  empty: { en: 'Type the notice after /공지', ko: '/공지 뒤에 공지 내용을 적어 주세요', ja: '/공지 の後にお知らせを書いてください', zh: '请在 /공지 后输入公告内容' },
  operator: { en: 'Only operators can send notices', ko: '공지는 운영자만 보낼 수 있어요', ja: 'お知らせは運営者だけが送れます', zh: '只有运营者可以发送公告' },
  setup: { en: 'Notices are not set up yet', ko: '공지 기능이 아직 준비되지 않았어요', ja: 'お知らせはまだ準備中です', zh: '公告功能尚未开启' },
  busy: { en: 'Too many notices, wait a minute', ko: '공지가 너무 잦아요. 1분 뒤에 다시', ja: 'お知らせが多すぎます。1分後に', zh: '公告太频繁，请一分钟后再试' },
  failed: { en: 'Could not send the notice', ko: '공지를 보내지 못했어요', ja: 'お知らせを送れませんでした', zh: '公告发送失败' },
};

export function createChat(game) {
  const { $, OPERATOR_TEXT, cloud, input, myId, myLabel, recentLines, refreshItems, refreshWallet,
    safety, setLook } = game;
  const chatLog = $('chat-log'), chatBar = $('chat-bar'), chatInput = $('chat-input');
  let lastChatAt = 0, chatNoticeShown = false;
  const cleanChat = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, config.chatMaxLength);
  const CHAT_LOG_LINES = 40;
  const CHAT_LINE_MS = 60000; // how long a line stays on screen when the chat is closed
  const chatFoldBtn = $('chat-fold');
  let chatFolded = false;
  try { chatFolded = localStorage.getItem('mk.chatFolded') === '1'; } catch { /* ignore */ }
  function setChatFolded(on) {
    chatFolded = on;
    $('hud').classList.toggle('chat-folded', on);
    chatFoldBtn.textContent = on ? '💬 ▸' : '◂';
    chatFoldBtn.setAttribute('aria-label', on ? 'Show chat' : 'Hide chat');
    if (!on) $('chat-btn').classList.remove('chat-blink');
    try { localStorage.setItem('mk.chatFolded', on ? '1' : '0'); } catch { /* ignore */ }
  }
  chatFoldBtn.onclick = () => setChatFolded(!chatFolded);
  setChatFolded(chatFolded);
  // A line goes "stale" after a minute: it fades out, then takes no room.
  function ageChatLine(line) {
    setTimeout(() => {
      if (line.dataset.stay === '1') { delete line.dataset.stay; ageChatLine(line); return; } // notices: a second minute
      line.classList.add('stale');
      setTimeout(() => line.classList.add('gone'), 1000);
    }, CHAT_LINE_MS);
  }
  function nudgeChatBtn() {
    if (!chatFolded || !chatBar.hidden) return;
    const btn = $('chat-btn');
    btn.classList.remove('chat-blink');
    void btn.offsetWidth; // restart the animation
    btn.classList.add('chat-blink');
  }
  // opts.onName: what tapping the name does (default: the block/report menu
  // for someone else's id). opts.tag: a small label before the name (friend chat).
  function addChatLine(name, text, kind = '', id = null, opts = {}) {
    const line = document.createElement('div');
    line.className = 'chat-line ' + kind;
    if (opts.tag) line.append(Object.assign(document.createElement('span'), { className: 'chat-tag', textContent: opts.tag }));
    // Someone else's name is a button: tap it to block or report them.
    const tap = opts.onName || (id ? () => openPersonMenu(id, name) : null);
    const b = document.createElement(tap ? 'button' : 'b');
    b.textContent = name;
    if (tap) { b.className = 'chat-name'; b.onclick = tap; }
    line.append(b, document.createTextNode(' ' + text));
    if (id) line.dataset.who = name;
    const atEnd = chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 24;
    chatLog.append(line);
    while (chatLog.children.length > CHAT_LOG_LINES) chatLog.firstChild.remove();
    if (atEnd || !chatBar || chatBar.hidden) chatLog.scrollTop = chatLog.scrollHeight;
    ageChatLine(line);
    if (!/\bmine\b/.test(kind)) nudgeChatBtn();
    return line;
  }
  let personFor = null;
  function openPersonMenu(id, name) {
    personFor = { id, name };
    $('person-name').textContent = name;
    refreshPersonFriend();
    $('person-menu').hidden = false;
  }
  function blockPerson(report) {
    if (!personFor) return;
    const { id, name } = personFor;
    if (report) safety.report(id, name, recentLines.get(id) || []);
    else safety.block(id, name);
    game.others.hide(id);
    for (const el of chatLog.querySelectorAll('.chat-line')) {
      if (el.dataset.who === name || el.querySelector('.chat-name')?.textContent === name) el.remove();
    }
    // Blocking a friend also ends the friendship.
    const f = friendList.friends.concat(friendList.incoming, friendList.outgoing).find((x) => x.name === name);
    if (f) friendStore()?.remove(f.uid).then(refreshFriends);
    $('person-menu').hidden = true;
    game.shop.toast(t(report ? 'safety.reported' : 'safety.blocked', { name }));
    refreshUnblock();
  }
  $('person-block').onclick = () => blockPerson(false);
  $('person-report').onclick = () => blockPerson(true);
  $('person-close').onclick = () => { $('person-menu').hidden = true; };
  function refreshUnblock() {
    $('unblock-label').textContent = t('safety.unblockAll', { n: safety.blockedCount });
    $('unblock-btn').disabled = safety.blockedCount === 0;
  }
  $('unblock-btn').onclick = () => { safety.unblockAll(); refreshUnblock(); game.shop.toast(t('safety.unblocked')); };
  onLanguageChange(refreshUnblock);
  refreshUnblock();
  function openChat() {
    // Close any open panel first (daily missions, wallet, cart…) so the chat bar is not hidden behind it.
    for (const x of document.querySelectorAll('#hud .sheet:not([hidden]) .sheet-x')) x.click();
    chatBar.hidden = false;
    $('hud').style.setProperty('--chat-bar-h', chatBar.offsetHeight + 'px'); // the log sits under it on phones
    $('hud').classList.add('chat-open');
    $('chat-btn').classList.remove('chat-blink');
    chatLog.scrollTop = chatLog.scrollHeight;
    input.keys.clear();
    chatInput.focus();
    if (game.confession) { chatInput.placeholder = game.confession.placeholder; $('chat-to').hidden = true; return; } // (no public-chat notice in there)
    renderChatTo(); // (back from the confession room: the picker and its words)
    if (!chatNoticeShown) { chatNoticeShown = true; if (mustSignInToChat()) chatSignInPrompt(); else addChatLine('ℹ️', t('chat.notice'), 'note'); }
  }
  function closeChat() { chatBar.hidden = true; chatInput.blur(); $('hud').classList.remove('chat-open'); chatLog.scrollTop = chatLog.scrollHeight; }
  const mustSignInToChat = () => config.chatGoogleOnly && config.netProvider === 'supabase' && !(cloud.user && !cloud.guest);
  // A note in the chat log with a Google sign-in button (links this guest, so
  // the save stays).
  function chatSignInPrompt() {
    const line = document.createElement('div');
    line.className = 'chat-line note';
    const btn = document.createElement('button');
    btn.className = 'chat-signin';
    btn.textContent = 'G  ' + t('chat.signInBtn');
    btn.onclick = async () => game.googleFail(await cloud.linkGoogle());
    line.append(document.createTextNode('🔒 ' + t('chat.signIn') + ' '), btn);
    chatLog.append(line);
    while (chatLog.children.length > CHAT_LOG_LINES) chatLog.firstChild.remove();
    chatLog.scrollTop = chatLog.scrollHeight;
    // Only this notice goes away by itself; chat lines stay.
    setTimeout(() => line.classList.add('old'), 15000);
    setTimeout(() => line.remove(), 16000);
  }
  $('chat-btn').hidden = !config.chatEnabled;
  chatFoldBtn.hidden = !config.chatEnabled;
  $('chat-btn').onclick = () => (chatBar.hidden ? openChat() : closeChat());
  chatBar.addEventListener('submit', async (e) => {
    e.preventDefault();
    // The confession room: to the priest only, and kept nowhere (not even
    // in the chat log): just a bubble over your head.
    const booth = game.confession;
    if (booth) {
      const text = cleanChat(chatInput.value);
      chatInput.value = '';
      if (text) { showBubble(myLabel, $('labels'), text, 6000, 'chat'); booth.hear(text); }
      if (input.isTouch) closeChat();
      return;
    }
    // Commands start with "/" and are never sent to other people.
    const raw = cleanChat(chatInput.value);
    // Operators: "/공지 message" sends a notice to everyone (the server checks).
    const notice = parseNoticeCommand(chatInput.value);
    if (notice !== null) {
      chatInput.value = '';
      const r = notice ? await sendNotice(cloud.client, notice) : { error: 'empty' };
      if (!r.ok) game.shop.toast(L(NOTICE_TEXT[r.error] || NOTICE_TEXT.failed));
      return;
    }
    // Event codes for everyone: "./EVENTSTART1" — coins, once per device.
    if (isEventCode(raw)) {
      chatInput.value = '';
      const ev = await eventCode(raw);
      if (!ev) { game.shop.toast(L(game.CODE_TEXT.wrong)); return; }
      let used = [];
      try { used = JSON.parse(localStorage.getItem('mk.eventCodes') || '[]'); } catch { /* broken save */ }
      if (used.includes(ev.id)) { game.shop.toast(L(game.CODE_TEXT.used)); return; }
      used.push(ev.id);
      try { localStorage.setItem('mk.eventCodes', JSON.stringify(used)); } catch { /* storage blocked */ }
      // A fixed op id: the server wallet also takes it once per account.
      game.wallet.add(ev.coins, { k: 'ledger.gift' }, { r: 'event', id: await opIdFor(`event:${ev.id}`) });
      refreshWallet();
      game.shop.toast(fmt(L(game.CODE_TEXT.coins), { n: ev.coins }));
      return;
    }
    if (raw.startsWith('/')) {
      chatInput.value = '';
      // Developer codes: "/<code>". A wrong one reads like any unknown command.
      const code = raw.slice(1).trim();
      // The master code also switches the 🛡️ operator badge on or off.
      if (await isMasterCode(code)) {
        game.myLook = { ...game.myLook, op: !game.myLook.op || undefined };
        if (!game.myLook.op) delete game.myLook.op;
        saveLook(game.myLook);
        setLook(game.myLook);
        game.shop.toast(L(game.myLook.op ? OPERATOR_TEXT.on : OPERATOR_TEXT.off));
      }
      // Sky view (operators only, game/sky-flight.js): /서울맨, /스카이슈트, /날개, /신천옹, /독수리,
      // /양탄자, /손오공, /착지.
      if (skyCode(code) && await game.sky?.command(skyCode(code))) return;
      // Fishing code: the next bite (fishing by hand) is that fish, once.
      const fishFromCode = await fishCode(code);
      if (fishFromCode === TOUR) {
        game.shop.toast(L(toggleTour() ? game.CODE_TEXT.tourOn : game.CODE_TEXT.tourOff));
        return;
      }
      if (fishFromCode) {
        forceNextCatch(fishFromCode);
        game.shop.toast(L(game.CODE_TEXT.fish));
        return;
      }
      const coinsFromCode = await coinCode(code);
      if (coinsFromCode) {
        game.wallet.add(coinsFromCode, { k: 'ledger.gift' }, { r: 'code' }); // operators only on the server
        refreshWallet();
        game.shop.toast(fmt(L(game.CODE_TEXT.coins), { n: coinsFromCode }));
        return;
      }
      const unlocked = await redeemCode(code);
      if (unlocked) {
        const added = game.inventory.add(...unlocked);
        game.shop.toast(added.length ? t('items.added', { list: added.map((id) => ITEMS[id].emoji + ' ' + localName(ITEMS[id].name, getLanguage())).join(', ') }) : t('items.already'));
        refreshItems();
      } else if (!await (await import('./random-outfit.js')).runOutfitCode(game, code)) game.shop.toast(t('chat.unknownCommand')); // /랜덤복장…, loaded on first use
      return;
    }
    // Google-only chat (config.chatGoogleOnly): guests get a sign-in prompt
    // instead. Event and developer codes above still work for them.
    if (mustSignInToChat()) { chatSignInPrompt(); return; }
    if (chatTo !== PUBLIC) {
      const body = filterText(cleanFriendBody(chatInput.value));
      if (!body) return;
      chatInput.value = '';
      sendFriend(chatTo, body);
      if (input.isTouch) closeChat();
      return;
    }
    const text = filterText(cleanChat(chatInput.value));
    const now = performance.now() / 1000;
    if (!text || now - lastChatAt < config.chatCooldown) return;
    lastChatAt = now;
    chatInput.value = '';
    const quiet = game.whisper; // the library: grey, like a whisper
    showBubble(myLabel, $('labels'), text, 6000, quiet ? 'chat whisper' : 'chat');
    addChatLine(game.nickname, text, quiet ? 'mine whisper' : 'mine');
    game.net.sendChat?.(text);
    game.onChatSent?.();
    if (input.isTouch) closeChat(); // hide the keyboard, give the joystick back
  });
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.isComposing) e.preventDefault(); // Korean/Japanese IME: finish the word first
    if (e.key === 'Escape') closeChat();
  });
  addEventListener('keydown', (e) => {
    if (!config.chatEnabled || e.target instanceof HTMLInputElement) return;
    if (e.code === 'KeyT' || e.code === 'Slash') { e.preventDefault(); openChat(); }
  });


  // ---------- Friends and friend chat ----------
  // Friends are accounts (found by player name), so friend chat works across
  // rooms and areas, and its messages are kept. On Supabase it needs the
  // online save (a guest account is enough to add friends; sending follows the
  // same chat rules as public chat). Local play: other tabs of this browser.
  const PUBLIC = 'public';
  let chatTo = PUBLIC; // who the chat bar sends to: PUBLIC, FRIENDS_ALL or a friend's uid
  let friendList = { friends: [], incoming: [], outgoing: [] };
  let friendBackend = null, friendInbox = null, stopFriendWatch = null;
  const cleanFriendBody = (s) => cleanFriendText(s);
  const READ_KEY = 'mk.friendRead'; // last read message per chat (in the save, so it follows the account)
  function readMarks() {
    try { const r = JSON.parse(localStorage.getItem(READ_KEY) || '{}'); return r && typeof r === 'object' ? r : {}; } catch { return {}; }
  }
  function saveMarks(m) { try { localStorage.setItem(READ_KEY, JSON.stringify(m)); } catch { /* storage blocked */ } }
  function friendStore() {
    const live = cloud.status === 'cloud' && cloud.client && cloud.user;
    let want = null;
    if (live) want = friendBackend instanceof SupabaseFriends && friendBackend.uid === cloud.user.id ? friendBackend : new SupabaseFriends(cloud.client, cloud.user.id);
    else if (config.netProvider !== 'supabase') want = friendBackend instanceof LocalFriends ? friendBackend : new LocalFriends(myId, game.nickname);
    if (want !== friendBackend) {
      stopFriendWatch?.();
      friendBackend = want;
      friendInbox = want ? new Inbox(want.uid, readMarks()) : null;
      friendList = { friends: [], incoming: [], outgoing: [] };
      friendsUi.loaded.clear();
      refreshFriends.primed = false;
      knownRequests = null;
      stopFriendWatch = want ? want.watch(onFriendMessage, () => refreshFriends()) : null;
      if (want) setTimeout(refreshFriends, 0);
    }
    return friendBackend;
  }
  let knownRequests = null; // uids of requests already seen (null = first load)
  async function refreshFriends() {
    const st = friendStore();
    if (!st) return;
    const r = await st.list();
    if (r.error || st !== friendBackend) { friendsUi.update(); return; }
    // Hide people I've blocked.
    const ok = (f) => !safety.isBlocked(null, f.name);
    friendList = { friends: r.friends.filter(ok), incoming: r.incoming.filter(ok), outgoing: r.outgoing };
    game.net?.refilter?.(); // on the street only friends are shown (net/area.js)
    const seen = new Set(friendList.incoming.map((f) => f.uid));
    // A new request: say who, and if they're around me, where — and make
    // them easy to spot (their name tag glows, a 👋 pops over their head).
    if (knownRequests) {
      for (const f of friendList.incoming) {
        if (knownRequests.has(f.uid)) continue;
        const at = locatePlayer(f.name);
        if (at) game.others.ping(at.id);
        game.shop.toast(fmt(L(FRIEND_TEXT.newRequest), { name: f.name }) + (at ? ' 📍 ' + whereText(at) : ''));
      }
    }
    knownRequests = seen;
    if (chatTo !== PUBLIC && chatTo !== FRIENDS_ALL && !friendList.friends.some((f) => f.uid === chatTo)) chatTo = PUBLIC;
    // Fetch the newest lines of each chat once, for unread counts and previews.
    if (!refreshFriends.primed) {
      refreshFriends.primed = true;
      for (const k of [FRIENDS_ALL, ...friendList.friends.map((f) => f.uid)]) {
        st.history(k).then((h) => { if (Array.isArray(h) && st === friendBackend) { friendInbox.add(h); friendsUi.loaded.add(k); refreshFriendBadge(); friendsUi.update(); } });
      }
    }
    renderChatTo();
    refreshFriendBadge();
    refreshPersonFriend();
    friendsUi.update();
  }
  // Someone in this area by name, and where they are from me as the screen
  // sees it: { id, m, dir }, or null.
  function locatePlayer(name) {
    const others = game.others, me = game.me, cam = game.camera;
    const id = others?.idByName(name);
    const pos = id != null ? others.positionOf(id) : null;
    if (!pos || !me || !cam) return null;
    const f = cam.getWorldDirection(cam.position.clone());
    return { id, ...whereIs(game.streetPos?.() || me.root.position, pos, { x: f.x, z: f.z }) }; // (streetPos: on an open-air park's lawn too)
  }
  function friendName(uid) { return friendList.friends.find((f) => f.uid === uid)?.name; }
  function onFriendMessage(m) {
    if (!friendInbox || m.from === friendBackend?.uid) return;
    const name = friendName(m.from) || m.name || '?';
    if (safety.isBlocked(null, name)) return;
    if (!friendInbox.add({ ...m, name }).length) return;
    const key = convKey(m, friendBackend.uid);
    const reading = friendsUi.open && friendsUi.view === key;
    if (!reading) {
      addChatLine(name, filterText(cleanFriendBody(m.body)), 'friend', null, {
        tag: key === FRIENDS_ALL ? '👥' : '💌',
        onName: () => { closeChat(); friendsUi.show(key); },
      });
      try { game.sfx.pop?.(); } catch { /* sound not set up yet */ }
    }
    refreshFriendBadge();
    friendsUi.update();
  }
  async function sendFriend(key, body) {
    const st = friendStore();
    if (!st) { game.shop.toast(L(FRIEND_TEXT.noAccount)); return false; }
    const r = await st.send(key, body);
    if (r.error) {
      if (r.error === 'chat' && mustSignInToChat()) chatSignInPrompt();
      else game.shop.toast(friendsUi.errorText(r.error));
      return false;
    }
    friendInbox?.add({ ...r.message, name: game.nickname });
    friendInbox && saveMarks(friendInbox.markRead(key));
    const to = key === FRIENDS_ALL ? L(FRIEND_TEXT.allFriends) : friendName(key) || '?';
    if (!(friendsUi.open && friendsUi.view === key)) {
      addChatLine(game.nickname + ' → ' + to, body, 'mine friend', null, { tag: key === FRIENDS_ALL ? '👥' : '💌', onName: () => { closeChat(); friendsUi.show(key); } });
    }
    friendsUi.update();
    return true;
  }
  const friendsUi = new FriendsUI($('friends-panel'), {
    store: () => friendStore(),
    inbox: () => friendInbox,
    me: () => friendBackend?.uid,
    friends: () => friendList,
    refresh: () => refreshFriends(),
    toast: (m) => game.shop.toast(m),
    clean: (s) => filterText(cleanFriendBody(s)),
    isBlocked: (uid, name) => safety.isBlocked(null, name),
    locate: (name) => locatePlayer(name),
    ping: (id) => game.others.ping(id),
    onRead: (key) => { if (friendInbox) { saveMarks(friendInbox.markRead(key)); refreshFriendBadge(); } },
    send: (key, text) => {
      if (mustSignInToChat()) { game.shop.toast(friendsUi.errorText('chat')); return false; }
      const body = filterText(cleanFriendBody(text));
      return body ? sendFriend(key, body) : false;
    },
  });
  function refreshFriendBadge() {
    const n = friendInbox?.totalUnread() || 0;
    $('chat-unread').hidden = !n;
    $('chat-unread').textContent = n > 99 ? '99+' : String(n);
    $('friends-dot').hidden = !(n || friendList.incoming.length);
  }
  // The chat bar's "send to" picker.
  function renderChatTo() {
    const sel = $('chat-to');
    const opts = [[PUBLIC, '🌐 ' + L(FRIEND_TEXT.everyone)]];
    if (friendBackend) {
      opts.push([FRIENDS_ALL, '👥 ' + L(FRIEND_TEXT.allFriends)]);
      for (const f of friendList.friends) opts.push([f.uid, '💌 ' + f.name]);
    }
    sel.replaceChildren(...opts.map(([v, label]) => Object.assign(document.createElement('option'), { value: v, textContent: label })));
    sel.value = opts.some(([v]) => v === chatTo) ? chatTo : PUBLIC;
    chatTo = sel.value;
    sel.hidden = opts.length < 2;
    applyChatTo();
  }
  function applyChatTo() {
    const friend = chatTo !== PUBLIC;
    chatBar.classList.toggle('to-friend', friend);
    chatInput.maxLength = friend ? FRIEND_MAX_BODY : config.chatMaxLength;
    chatInput.placeholder = friend
      ? '💬 ' + (chatTo === FRIENDS_ALL ? L(FRIEND_TEXT.allFriends) : friendName(chatTo) || '') + ' · ' + L(FRIEND_TEXT.ph)
      : t('chat.placeholder');
  }
  $('chat-to').onchange = (e) => { chatTo = e.target.value; applyChatTo(); chatInput.focus(); };
  $('friends-btn').onclick = () => { closeChat(); friendsUi.show(null); };
  // Person menu: add as a friend, or open the chat with a friend.
  function refreshPersonFriend() {
    const btn = $('person-friend');
    if (!personFor || !friendBackend) { btn.hidden = true; return; }
    const f = friendList.friends.find((x) => x.name === personFor.name);
    const out = friendList.outgoing.some((x) => x.name === personFor.name);
    btn.hidden = false;
    btn.disabled = out;
    const asked = friendList.incoming.some((x) => x.name === personFor.name); // they sent me one
    btn.textContent = f ? '💌 ' + L(FRIEND_TEXT.isFriend) : out ? '⏳ ' + fmt(L(FRIEND_TEXT.waiting), { name: personFor.name }) : asked ? '✅ ' + L(FRIEND_TEXT.acceptReq) : '➕ ' + L(FRIEND_TEXT.addFriend);
  }
  // Gifts go to friends only (game/gifts.js): what someone is to me, by name
  // like the person menu: 'friend', 'out' (I asked), 'in' (they asked) or null.
  let testFriends = null; // e2e only (__mk.giftFriends): names taken as friends
  function friendStatus(name) {
    if (testFriends?.has(name)) return 'friend';
    if (!friendBackend) return null;
    if (friendList.friends.some((x) => x.name === name)) return 'friend';
    if (friendList.outgoing.some((x) => x.name === name)) return 'out';
    if (friendList.incoming.some((x) => x.name === name)) return 'in';
    return null;
  }
  async function addFriend(name) {
    const st = friendStore();
    if (!st) { game.shop.toast(L(FRIEND_TEXT.noAccount)); return; }
    friendsUi._result(await st.add(name), name);
  }
  $('person-friend').onclick = async () => {
    if (!personFor) return;
    const st = friendStore();
    if (!st) { game.shop.toast(L(FRIEND_TEXT.noAccount)); return; }
    const f = friendList.friends.find((x) => x.name === personFor.name);
    $('person-menu').hidden = true;
    if (f) { friendsUi.show(f.uid); return; }
    friendsUi._result(await st.add(personFor.name), personFor.name);
  };
  // ---------- Notices (공지) from operators ----------
  // Every area, every player; a gold line that stays a while, plus a toast.
  const noticeLines = new Map(); // notice id → its chat line (to take it back out when deleted)
  // Operator notices are also pinned at the top of the screen until deleted
  // (030_pinned_notices.sql). The ▴ folds them to a small 📢 chip; a new one
  // opens them again.
  // Under them, always one more: the next fireworks or drone show
  // (core/show-notice.js), in the player's own time, and the next sunset
  // (Yozi 2026-11-11: like the shows). Folded or not is
  // remembered on this device.
  const pinBox = $('notice-pin');
  const FOLD_KEY = 'noticePinFolded';
  let pinFolded = false;
  try { pinFolded = localStorage.getItem(FOLD_KEY) === '1'; } catch { /* no storage */ }
  const setFolded = (v) => { pinFolded = v; try { localStorage.setItem(FOLD_KEY, v ? '1' : '0'); } catch { /* no storage */ } };
  // A pinned notice opens them again, but only one this device hasn't seen
  // (the ones still up come again on every start).
  const SEEN_KEY = 'noticePinSeen';
  const isNewPin = (id) => {
    let seen = 0;
    try { seen = Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { /* no storage */ }
    if (id <= seen) return false;
    try { localStorage.setItem(SEEN_KEY, String(id)); } catch { /* no storage */ }
    return true;
  };
  const pinned = new PinnedNotices(renderPinned);
  const clock = (ms) => {
    const lang = getLanguage(), d = new Date(ms), o = { hour: 'numeric', minute: '2-digit' };
    try { return d.toLocaleTimeString(lang === 'zht' ? 'zh-TW' : lang, o); } catch { return d.toLocaleTimeString([], o); }
  };
  let showLine = '';
  function renderPinned(list = pinned.list()) {
    const now = Date.now(), show = showNoticeText(nextShow(now), now, t, clock), sun = sunsetNoticeText(nextSunset(now), now, t, clock);
    showLine = show.label + show.text + sun.label + sun.text;
    const count = list.length + 2;
    pinBox.hidden = false;
    pinBox.classList.toggle('folded', pinFolded);
    const fold = document.createElement('button');
    fold.type = 'button';
    fold.className = 'notice-pin-fold';
    fold.textContent = pinFolded ? '📢 ' + count : '▴';
    fold.setAttribute('aria-label', pinFolded ? 'Show notices' : 'Hide notices');
    fold.onclick = () => { setFolded(!pinFolded); renderPinned(); };
    const row = (label, body) => {
      const r = document.createElement('div');
      r.className = 'notice-pin-row';
      const b = document.createElement('b');
      b.textContent = label;
      r.append(b, document.createTextNode(' ' + body));
      return r;
    };
    const rows = pinFolded ? [] : [...list.map((n) => row('📢 ' + L(NOTICE_LABEL), n.body)), row(show.label, show.text), row(sun.label, sun.text)];
    pinBox.replaceChildren(...rows, fold);
  }
  // The countdown: checked every 15 s, drawn again only when its words change.
  setInterval(() => {
    const now = Date.now(), show = showNoticeText(nextShow(now), now, t, clock), sun = sunsetNoticeText(nextSunset(now), now, t, clock);
    if (show.label + show.text + sun.label + sun.text !== showLine) renderPinned();
  }, 15000);
  renderPinned();
  const noticeFeed = new NoticeFeed(({ id, body, at, pinned: pin }) => {
    // A pinned one stays at the top until deleted, so it does not go into the
    // chat log as well (it showed twice there while typing).
    if (pin) { if (isNewPin(id)) setFolded(false); pinned.add({ id, body, at, pinned: true }); try { game.sfx.pop?.(); } catch { /* not set up yet */ } return; }
    const line = addChatLine('📢 ' + L(NOTICE_LABEL), body, 'notice');
    line.dataset.stay = '1';
    noticeLines.set(id, line);
    if (noticeLines.size > 20) noticeLines.delete(noticeLines.keys().next().value);
    game.shop.toast('📢 ' + body);
    try { game.sfx.pop?.(); } catch { /* sound not set up yet */ }
  }, (id) => { noticeLines.get(id)?.remove(); noticeLines.delete(id); pinned.remove(id); });
  let noticeClient = null, stopNotices = null;
  function watchForNotices() {
    if (!config.chatEnabled || !cloud.client || cloud.client === noticeClient) return;
    stopNotices?.();
    noticeClient = cloud.client;
    stopNotices = watchNotices(noticeClient, noticeFeed);
  }
  // Start a little after the world is up, so this join never competes with
  // the multiplayer room joins; pinned notices still come.
  setTimeout(() => { cloud.onChange(watchForNotices); watchForNotices(); }, 8000);

  onLanguageChange(() => { renderChatTo(); friendsUi.update(); renderPinned(); });
  cloud.onChange(() => friendStore());
  friendStore();
  renderChatTo();
  return { cleanChat, addChatLine, openPersonMenu, friendStatus, addFriend, testFriends: (names) => { testFriends = new Set(names); game.net?.refilter?.(); }, debugNotice: (n) => noticeFeed.add(n), get friendBackend() { return friendBackend; } };
}
