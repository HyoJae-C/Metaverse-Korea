// Money is Korean won. The game's text writes amounts as "🪙 4500" (or
// "+20000 🪙"); every 🪙 on the page is turned into a won amount here:
// "₩4,500", "+₩20,000". A 🪙 with no number next to it becomes "₩". So the
// code and the translations can keep writing the emoji.
const COIN = '🪙';
const SKIP = new Set(['TEXTAREA', 'INPUT', 'SCRIPT', 'STYLE', 'CANVAS']);
const NUM = '(\\d[\\d,]*)';
const BEFORE = new RegExp(`([+\\-−]\\s*)?${COIN}\\s*([+\\-−]\\s*)?${NUM}`, 'gu');
const AFTER = new RegExp(`([+\\-−]\\s*)?${NUM}\\s*${COIN}`, 'gu');
const amount = (sign, digits) => `${(sign || '').trim().replace('−', '-')}₩${Number(digits.replace(/,/g, '')).toLocaleString('en-US')}`;

// The text with every 🪙 turned into won (exported for tests).
export function wonText(text) {
  if (!text || !text.includes(COIN)) return text;
  return text
    .replace(BEFORE, (_, s1, s2, d) => amount(s1 || s2, d))
    .replace(AFTER, (_, s, d) => amount(s, d))
    .replace(new RegExp(`${COIN}\\s?`, 'gu'), '₩');
}

function swapText(node) {
  const text = node.nodeValue;
  if (!text || !text.includes(COIN) || SKIP.has(node.parentNode?.nodeName)) return;
  node.nodeValue = wonText(text);
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
