// Jjimjilbang (찜질방) rules, no DOM so it can be unit-tested.
// Sit out the hot kiln (불가마) until the sweat meter is full, then cool off
// in the ice room within a minute for the hot-cold combo. It pays nothing:
// you pay to get in (a day pass at the door, core/day-pass.js), like a real
// jjimjilbang.

export const HOT_SECONDS = 20;
export const ICE_SECONDS = 8;
export const COMBO_WINDOW = 60; // seconds

export class SaunaLog {
  constructor(now = () => new Date()) {
    this.now = now;
    this.hotAt = null; // when the last kiln session finished (ms)
  }
  finishHot() { this.hotAt = this.now().getTime(); }
  // Ice room done: { combo } when you came straight from the kiln.
  finishIce() {
    const t = this.now().getTime();
    const combo = this.hotAt != null && t - this.hotAt <= COMBO_WINDOW * 1000;
    this.hotAt = null;
    return { combo };
  }
}
