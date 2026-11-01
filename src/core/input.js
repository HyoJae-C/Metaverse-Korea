// Keyboard, mouse and touch input. Produces a move vector (screen-relative)
// and camera orbit/zoom deltas.

export class Input {
  constructor(canvas, joystickEl) {
    this.keys = new Set();
    this.move = { x: 0, y: 0 }; // x: right, y: forward, length ≤ 1
    this.run = false;
    this.lookDX = 0;
    this.lookDY = 0;
    this.zoom = 0;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.enabled = true;

    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    this._setupLook(canvas);
    this._setupJoystick(joystickEl);
  }

  _setupLook(canvas) {
    const pointers = new Map();
    let pinchDist = 0;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) pinchDist = this._pinch(pointers);
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (pointers.size === 1) {
        this.lookDX += e.clientX - p.x;
        this.lookDY += e.clientY - p.y;
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 2) {
        const d = this._pinch(pointers);
        this.zoom -= (d - pinchDist) * 0.03;
        pinchDist = d;
      }
    });
    const up = (e) => pointers.delete(e.pointerId);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom += Math.sign(e.deltaY) * 1.2;
    }, { passive: false });
  }

  _pinch(pointers) {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  _setupJoystick(el) {
    if (!el) return;
    const knob = el.querySelector('.knob');
    let id = null, cx = 0, cy = 0;
    const R = 46;
    const reset = () => {
      id = null;
      this.stick = null;
      knob.style.transform = 'translate(-50%, -50%)';
    };
    el.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      el.setPointerCapture(id);
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      handle(e);
    });
    const handle = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx *= R / len; dy *= R / len; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.stick = { x: dx / R, y: -dy / R };
    };
    el.addEventListener('pointermove', handle);
    el.addEventListener('pointerup', reset);
    el.addEventListener('pointercancel', reset);
    reset();
  }

  update() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    this.run = k.has('ShiftLeft') || k.has('ShiftRight');
    if (this.stick) {
      x = this.stick.x;
      y = this.stick.y;
      this.run = Math.hypot(x, y) > 0.92;
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.move.x = this.enabled ? x : 0;
    this.move.y = this.enabled ? y : 0;
  }

  consumeLook() {
    const r = { dx: this.lookDX, dy: this.lookDY, zoom: this.zoom };
    this.lookDX = this.lookDY = this.zoom = 0;
    return r;
  }
}
