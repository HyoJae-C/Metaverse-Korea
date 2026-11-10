// A panel that is downloaded the first time it is used.
//
// Store and minigame panels (the kimchi class, the japchae class…) are big and
// most players never open most of them, so they stay out of the first
// download. lazyPanel(load) stands in for the panel object right away:
//   - `open` is false and close() does nothing until it has loaded,
//   - any other method call (show(), showText(p)…) downloads the panel, then
//     runs the call on it,
//   - once loaded, everything goes straight to the real panel.
// `load` returns a promise of the panel (usually `import(...).then(m => new
// m.SomeUI({...}))`). panel.ready() starts the download early and resolves
// to the panel.
export function lazyPanel(load) {
  let ui = null;
  let pending = null;
  const ready = () => (pending ??= Promise.resolve().then(load).then((u) => (ui = u)).catch((e) => {
    pending = null; // offline for a moment: try again on the next tap
    console.warn('panel failed to load', e);
    throw e;
  }));
  return new Proxy({}, {
    get(_, key) {
      if (key === 'ready') return ready;
      if (key === 'loaded') return !!ui;
      if (ui) {
        const v = ui[key];
        return typeof v === 'function' ? v.bind(ui) : v;
      }
      if (key === 'open') return false;
      if (key === 'close') return () => {};
      if (typeof key !== 'string' || key === 'then') return undefined; // not a promise
      return (...args) => ready().then((u) => u[key](...args), () => {});
    },
  });
}
