// The 🪙 emoji is a silver coin on iPhones and hard to see on our light UI.
// Every 🪙 the game writes on the page is swapped for a gold coin drawn in
// CSS (.coin in style.css), so the code can keep writing the emoji.
const COIN = '🪙';
const SKIP = new Set(['TEXTAREA', 'INPUT', 'SCRIPT', 'STYLE', 'CANVAS']);

function swapText(node) {
  const text = node.nodeValue;
  if (!text || !text.includes(COIN) || SKIP.has(node.parentNode?.nodeName)) return;
  const frag = document.createDocumentFragment();
  text.split(COIN).forEach((part, i) => {
    if (i) {
      const c = document.createElement('i');
      c.className = 'coin';
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', 'coin');
      frag.append(c);
    }
    if (part) frag.append(part);
  });
  node.replaceWith(frag);
}

function swapIn(root) {
  if (root.nodeType === Node.TEXT_NODE) { swapText(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE || SKIP.has(root.nodeName)) return;
  if (!root.textContent.includes(COIN)) return;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const found = [];
  while (walk.nextNode()) if (walk.currentNode.nodeValue.includes(COIN)) found.push(walk.currentNode);
  found.forEach(swapText);
}

export function useGoldCoins(root = document.body) {
  swapIn(root);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') swapText(m.target);
      else m.addedNodes.forEach(swapIn);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}
