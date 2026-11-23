// The card suits of the café's own deck (Yozi 2026-11-24): four animal faces
// drawn here, instead of hearts, diamonds, spades and clubs. The rules still
// know the cards by the old suit letters (core/board-games.js SUITS); only the
// picture changes. Red numbers: tiger, Jindo dog. Black numbers: magpie, moon
// bear. Loaded with the board games panel.
const ART = {
  '♥': `<circle cx="14" cy="14" r="9" fill="#e8762a"/><circle cx="50" cy="14" r="9" fill="#e8762a"/><circle cx="14" cy="14" r="4.5" fill="#fff3e0"/><circle cx="50" cy="14" r="4.5" fill="#fff3e0"/><ellipse cx="32" cy="35" rx="26" ry="24" fill="#f08a34"/><ellipse cx="32" cy="45" rx="14" ry="11" fill="#fff3e0"/><path d="M32 11v10M24 12l2 8M40 12l-2 8M6 32l9 2M6 41l9-1M58 32l-9 2M58 41l-9-1" stroke="#2b2230" stroke-width="3.4" stroke-linecap="round" fill="none"/><circle cx="22" cy="32" r="3.6" fill="#2b2230"/><circle cx="42" cy="32" r="3.6" fill="#2b2230"/><path d="M28 40h8l-4 4z" fill="#d4573d"/><path d="M32 44v3M27 49q5 4 10 0" stroke="#2b2230" stroke-width="2.2" stroke-linecap="round" fill="none"/>`, // tiger
  '♦': `<path d="M8 26L12 4l16 12zM56 26L52 4 36 16z" fill="#d98a4a"/><path d="M12 20l2-10 8 7zM52 20l-2-10-8 7z" fill="#f7c9a8"/><ellipse cx="32" cy="36" rx="25" ry="23" fill="#e9a25e"/><path d="M32 22c-10 6-16 16-14 28 4 6 9 9 14 9s10-3 14-9c2-12-4-22-14-28z" fill="#fff6ea"/><circle cx="21" cy="32" r="3.6" fill="#2b2230"/><circle cx="43" cy="32" r="3.6" fill="#2b2230"/><ellipse cx="32" cy="42" rx="5" ry="3.6" fill="#2b2230"/><path d="M32 46v3M26 50q6 5 12 0" stroke="#2b2230" stroke-width="2.2" stroke-linecap="round" fill="none"/><ellipse cx="32" cy="54" rx="3.4" ry="3" fill="#e8607a"/>`, // Jindo dog
  '♠': `<path d="M26 10q2-9 7-8q-1 4 1 6q3-6 8-4q-3 4-2 8z" fill="#2f5aa8"/><ellipse cx="32" cy="35" rx="25" ry="24" fill="#2b2230"/><path d="M12 48q20 18 40 0q-4 11-20 11t-20-11z" fill="#fff"/><circle cx="21" cy="30" r="5.4" fill="#fff"/><circle cx="43" cy="30" r="5.4" fill="#fff"/><circle cx="22" cy="31" r="2.6" fill="#2b2230"/><circle cx="42" cy="31" r="2.6" fill="#2b2230"/><path d="M25 38h14l-7 12z" fill="#f2b233"/><ellipse cx="13" cy="40" rx="3.6" ry="2.4" fill="#e8607a" opacity=".7"/><ellipse cx="51" cy="40" rx="3.6" ry="2.4" fill="#e8607a" opacity=".7"/>`, // magpie
  '♣': `<circle cx="13" cy="15" r="10" fill="#2b2230"/><circle cx="51" cy="15" r="10" fill="#2b2230"/><circle cx="13" cy="15" r="4.5" fill="#6b5a66"/><circle cx="51" cy="15" r="4.5" fill="#6b5a66"/><ellipse cx="32" cy="34" rx="26" ry="23" fill="#2b2230"/><ellipse cx="32" cy="42" rx="12" ry="9.5" fill="#f3dcc0"/><circle cx="22" cy="30" r="3.2" fill="#fff"/><circle cx="42" cy="30" r="3.2" fill="#fff"/><ellipse cx="32" cy="38.5" rx="4.4" ry="3.2" fill="#2b2230"/><path d="M32 41v3M27 46q5 4 10 0" stroke="#2b2230" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M16 56q16 10 32 0q-16 3-32 0z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`, // moon bear
};
export const SUIT_ANIMAL = { '♥': 'tiger', '♦': 'dog', '♠': 'magpie', '♣': 'bear' };

// A span holding the suit's picture (the old letter is kept for screen readers and tests).
export function suitArt(suit) {
  const s = document.createElement('span');
  s.className = 'bg-suit';
  s.dataset.suit = SUIT_ANIMAL[suit] || '';
  s.setAttribute('aria-label', suit);
  s.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${ART[suit] || ''}</svg>`;
  return s;
}
