// The notice board panel: read the posts, write one (20 lines, 3 a day),
// delete your own. One panel serves both boards.

import { L, fmt } from './pocha-ui.js';
import { cleanBody, MAX_LINES, MAX_CHARS, DAILY_POSTS } from '../core/board.js';

export const BOARD_TEXT = {
  free: { en: 'Free Board', ko: '자유게시판', ja: '自由掲示板', zh: '自由留言板' },
  ask: { en: 'Inquiry Board', ko: '문의게시판', ja: 'お問い合わせ掲示板', zh: '咨询留言板' },
  freeNote: { en: 'Everyone can read these. Be kind!', ko: '모두가 볼 수 있어요. 서로 예쁜 말 써요!', ja: 'みんなが読めます。やさしい言葉で！', zh: '所有人都能看到，请友善发言！' },
  askNote: { en: 'Only you and the operator can read your inquiries.', ko: '문의 글은 나와 운영자만 볼 수 있어요.', ja: 'お問い合わせは本人と運営だけが読めます。', zh: '咨询内容只有你和管理员能看到。' },
  local: { en: 'Not connected to the server yet: posts stay on this device.', ko: '아직 서버 연결 전이라 이 기기에서만 보여요.', ja: 'まだサーバーにつながっていないので、この端末だけに表示されます。', zh: '尚未连接服务器，帖子只保存在本设备。' },
  missing: { en: 'The board is being set up. Please come back soon!', ko: '게시판을 준비하고 있어요. 조금만 기다려 주세요!', ja: '掲示板を準備中です。もう少しお待ちください！', zh: '留言板准备中，请稍后再来！' },
  placeholder: { en: 'Write here (up to 20 lines)', ko: '여기에 써 주세요 (20줄까지)', ja: 'ここに書いてください（20行まで）', zh: '在这里写（最多20行）' },
  count: { en: '{lines}/{max} lines · {left}/{daily} posts left today', ko: '{lines}/{max}줄 · 오늘 남은 글 {left}/{daily}', ja: '{lines}/{max}行 · 今日あと{left}/{daily}件', zh: '{lines}/{max}行 · 今天还能发{left}/{daily}条' },
  post: { en: 'Post', ko: '올리기', ja: '投稿', zh: '发布' },
  del: { en: 'Delete', ko: '삭제', ja: '削除', zh: '删除' },
  delAsk: { en: 'Delete this post? It still counts for today.', ko: '이 글을 삭제할까요? 삭제해도 오늘 쓴 개수에는 포함돼요.', ja: 'この投稿を削除しますか？削除しても今日の件数に数えられます。', zh: '要删除这条吗？删除后仍计入今天的数量。' },
  none: { en: 'No posts yet. Be the first!', ko: '아직 글이 없어요. 첫 글을 남겨 보세요!', ja: 'まだ投稿がありません。最初の投稿をどうぞ！', zh: '还没有帖子，来发第一条吧！' },
  noneAsk: { en: 'No inquiries yet.', ko: '아직 남긴 문의가 없어요.', ja: 'まだお問い合わせはありません。', zh: '还没有咨询。' },
  reply: { en: 'Reply from the operator', ko: '운영자 답변', ja: '運営からの返信', zh: '管理员回复' },
  loading: { en: 'Loading…', ko: '불러오는 중…', ja: '読み込み中…', zh: '加载中…' },
  posted: { en: 'Posted!', ko: '글을 올렸어요!', ja: '投稿しました！', zh: '已发布！' },
  e_empty: { en: 'Write something first.', ko: '내용을 먼저 써 주세요.', ja: '先に内容を書いてください。', zh: '请先写点内容。' },
  e_lines: { en: 'Up to 20 lines, please.', ko: '20줄 이하로 써 주세요.', ja: '20行以内で書いてください。', zh: '请写在20行以内。' },
  e_chars: { en: 'Up to 1000 characters, please.', ko: '1000자 이하로 써 주세요.', ja: '1000文字以内で書いてください。', zh: '请写在1000字以内。' },
  e_limit: { en: 'You can post 3 times a day on each board. See you tomorrow!', ko: '게시판마다 하루 3개까지 쓸 수 있어요. 내일 또 써 주세요!', ja: '各掲示板1日3件までです。また明日！', zh: '每个留言板每天最多3条，明天再来吧！' },
  e_network: { en: 'Couldn’t reach the server. Try again in a moment.', ko: '서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.', ja: 'サーバーにつながりませんでした。少ししてからもう一度。', zh: '无法连接服务器，请稍后再试。' },
  now: { en: 'just now', ko: '방금', ja: 'たった今', zh: '刚刚' },
  min: { en: '{n} min ago', ko: '{n}분 전', ja: '{n}分前', zh: '{n}分钟前' },
  hour: { en: '{n} h ago', ko: '{n}시간 전', ja: '{n}時間前', zh: '{n}小时前' },
};

function ago(iso, now = Date.now()) {
  const s = (now - Date.parse(iso)) / 1000;
  if (s < 60) return L(BOARD_TEXT.now);
  if (s < 3600) return fmt(L(BOARD_TEXT.min), { n: Math.floor(s / 60) });
  if (s < 86400) return fmt(L(BOARD_TEXT.hour), { n: Math.floor(s / 3600) });
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export class BoardUI {
  // store(): the board backend (LocalBoard or SupabaseBoard); name(): my name.
  constructor({ root, store, name, toast }) {
    Object.assign(this, { root, store, name, toast });
    this.board = 'free';
    this.busy = false;
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }

  async show(board) {
    this.board = board;
    this.root.hidden = false;
    this.posts = null;
    this.left = DAILY_POSTS;
    this.render();
    const st = this.store();
    const [posts, left] = await Promise.all([st.list(board), st.left(board)]);
    if (this.board !== board) return;
    this.posts = posts;
    this.left = left;
    this.render();
  }

  render() {
    const st = this.store();
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    const title = el('strong', 'wallet-title', (this.board === 'ask' ? '📮 ' : '📋 ') + L(BOARD_TEXT[this.board]));
    const notes = [el('p', 'fine', L(this.board === 'ask' ? BOARD_TEXT.askNote : BOARD_TEXT.freeNote))];
    if (!st.shared) notes.push(el('p', 'fine board-warn', L(BOARD_TEXT.local)));
    const parts = [x, title, ...notes];
    if (st.missing || this.posts?.error === 'missing') {
      parts.push(el('p', 'board-empty', L(BOARD_TEXT.missing)));
      this.root.replaceChildren(...parts);
      return;
    }
    // Writing.
    const ta = el('textarea', 'board-input');
    ta.placeholder = L(BOARD_TEXT.placeholder);
    ta.maxLength = MAX_CHARS;
    ta.rows = 4;
    ta.value = this.draft || '';
    const count = el('small', 'board-count');
    const btn = el('button', 'primary board-post', L(BOARD_TEXT.post));
    const sync = () => {
      this.draft = ta.value;
      const lines = ta.value ? ta.value.replace(/\r\n?/g, '\n').split('\n').length : 0;
      count.textContent = fmt(L(BOARD_TEXT.count), { lines, max: MAX_LINES, left: this.left, daily: DAILY_POSTS });
      count.classList.toggle('over', lines > MAX_LINES);
      btn.disabled = this.busy || this.left <= 0 || !ta.value.trim() || lines > MAX_LINES;
    };
    ta.oninput = sync;
    // Typing in the box must not move the player.
    ta.addEventListener('keydown', (e) => e.stopPropagation());
    btn.onclick = () => this._post(ta.value);
    sync();
    const form = el('div', 'board-form');
    form.append(ta, el('div', 'board-row'));
    form.lastChild.append(count, btn);
    parts.push(form);
    // Reading.
    const list = el('div', 'board-list');
    if (!this.posts) list.append(el('p', 'fine', L(BOARD_TEXT.loading)));
    else if (this.posts.error) list.append(el('p', 'fine', L(BOARD_TEXT['e_' + this.posts.error] || BOARD_TEXT.e_network)));
    else if (!this.posts.length) list.append(el('p', 'board-empty', L(this.board === 'ask' ? BOARD_TEXT.noneAsk : BOARD_TEXT.none)));
    else for (const p of this.posts) {
      const card = el('div', 'board-post-card');
      const head = el('div', 'board-head');
      head.append(el('b', '', p.name), el('small', '', ago(p.created_at)));
      if (st.mine(p)) {
        const d = el('button', 'chip board-del', L(BOARD_TEXT.del));
        d.onclick = async () => {
          if (!confirm(L(BOARD_TEXT.delAsk))) return;
          const r = await st.remove(p.id);
          if (r.error) this.toast(L(BOARD_TEXT['e_' + r.error] || BOARD_TEXT.e_network));
          else this.show(this.board);
        };
        head.append(d);
      }
      card.append(head, el('p', 'board-body', p.body));
      if (p.reply) {
        const r = el('div', 'board-reply');
        r.append(el('b', '', '🛡️ ' + L(BOARD_TEXT.reply)), el('small', '', p.replied_at ? ' · ' + ago(p.replied_at) : ''), el('p', 'board-body', p.reply));
        card.append(r);
      }
      list.append(card);
    }
    parts.push(list);
    this.root.replaceChildren(...parts);
  }

  async _post(text) {
    const c = cleanBody(text);
    if (c.error) { this.toast(L(BOARD_TEXT['e_' + c.error])); return; }
    if (this.busy) return;
    this.busy = true;
    this.render();
    const r = await this.store().post(this.board, this.name(), c.body);
    this.busy = false;
    if (r.error) {
      this.toast(L(BOARD_TEXT['e_' + r.error] || BOARD_TEXT.e_network));
      if (r.error === 'limit') this.left = 0;
      this.render();
      return;
    }
    this.draft = '';
    this.toast(L(BOARD_TEXT.posted));
    this.show(this.board);
  }
}
