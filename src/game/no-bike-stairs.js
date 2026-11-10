// Riding into stairs (a subway exit or down to a stream such as
// Cheonggyecheon) stops you at the top. Without a word that read as "the
// stairs are blocked", so say why and how to get down: at most once every
// few seconds while you keep pushing against them.
export const NO_BIKE_EVERY = 5000; // ms

export function createNoBikeStairs({ toast, text, now = () => performance.now() }) {
  let last = -Infinity;
  return function noBikeStairs() {
    const t = now();
    if (t - last < NO_BIKE_EVERY) return false;
    last = t;
    toast(text());
    return true;
  };
}
