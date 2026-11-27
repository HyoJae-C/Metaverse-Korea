// The "new features, refresh" banner shown when a newer build is live
// (core/update-check.js). Refresh reloads the page; Later hides it for a
// while and it comes back.
import { localName, getLanguage, onLanguageChange } from '../core/i18n.js';

export const UPDATE_TEXT = {
  title: { en: '✨ New features are here!', ko: '✨ 새로운 기능이 생겼어요!', ja: '✨ 新しい機能が追加されました！', zh: '✨ 新功能上线啦！', es: '✨ ¡Hay novedades!', id: '✨ Ada fitur baru!', ar: '✨ ميزات جديدة متاحة!', vi: '✨ Có tính năng mới!', fr: '✨ De nouvelles fonctions sont arrivées !', pt: "✨ Chegaram novidades!", th: '✨ มีฟีเจอร์ใหม่มาแล้ว!' },
  sub: { en: 'Refresh to get the latest version.', ko: '새로고침하면 바로 만날 수 있어요.', ja: '再読み込みするとすぐに使えます。', zh: '刷新页面即可体验。', es: 'Recarga para ver la nueva versión.', id: 'Muat ulang untuk mendapatkan versi terbaru.', ar: 'أعد تحميل الصفحة للحصول على أحدث إصدار.', vi: 'Tải lại trang để dùng phiên bản mới nhất.', fr: 'Actualise pour avoir la dernière version.', pt: "Atualize para pegar a versão mais nova.", th: 'รีเฟรชเพื่อรับเวอร์ชันล่าสุด' },
  go: { en: 'Refresh', ko: '새로고침', ja: '再読み込み', zh: '刷新', es: 'Recargar', id: 'Muat ulang', ar: 'إعادة التحميل', vi: 'Tải lại', fr: 'Actualiser', pt: "Atualizar", th: 'รีเฟรช' },
  later: { en: 'Later', ko: '나중에', ja: 'あとで', zh: '稍后', es: 'Más tarde', id: 'Nanti', ar: 'لاحقًا', vi: 'Để sau', fr: 'Plus tard', pt: "Depois", th: 'ไว้ทีหลัง' },
};

export const LATER_MS = 10 * 60 * 1000;

// text: { title, sub } in the player's language, to say something else (a
// part of the game that didn't download); the new-version words otherwise.
// Showing it again while it is up switches it to the new-version words only.
export function showUpdateBanner({ parent = document.body, reload = () => location.reload(), text = null } = {}) {
  let box = document.getElementById('update-banner');
  if (box) { if (!text) { box.custom = null; box.render?.(); } box.hidden = false; return box; }
  box = document.createElement('div');
  box.id = 'update-banner';
  box.className = 'update-banner';
  box.setAttribute('role', 'status');
  box.innerHTML = '<div class="ub-text"><b></b><span></span></div><button class="ub-go" type="button"></button><button class="ub-later" type="button"></button>';
  const L = (o) => localName(o, getLanguage());
  box.custom = text;
  const render = () => {
    box.querySelector('b').textContent = box.custom ? box.custom.title() : L(UPDATE_TEXT.title);
    box.querySelector('span').textContent = box.custom ? box.custom.sub() : L(UPDATE_TEXT.sub);
    box.querySelector('.ub-go').textContent = '🔄 ' + L(UPDATE_TEXT.go);
    box.querySelector('.ub-later').textContent = L(UPDATE_TEXT.later);
  };
  box.render = render;
  render();
  onLanguageChange(render);
  box.querySelector('.ub-go').onclick = () => reload();
  box.querySelector('.ub-later').onclick = () => {
    box.hidden = true;
    setTimeout(() => { box.hidden = false; }, LATER_MS);
  };
  parent.append(box);
  return box;
}
