# Another Seoul

Browser 3D trip to Seoul (Vite + three.js). `npm test`, `npm run lint` and
`npm run build` must pass; CI also runs the multiplayer and memory e2e and the
download budget (`node scripts/check-size.mjs`).

## Keep the game light

Read `docs/PERFORMANCE.md` before adding a feature. In short:

- New features go in their own module under `src/game/` (a `createX(game)`
  factory), not into `src/main.js`. Don't add new top-level functions or
  `*_TEXT` tables to main.js.
- Things seen only after walking somewhere (store interiors, minigames,
  districts) load with `import()` when first used.
- Repeated props use InstancedMesh; static props are merged; far things are
  hidden.
- `src/boot.js` is the page's entry and must stay tiny; the game is
  `src/main.js`, loaded behind the start screen.
- Stay inside the budgets in `docs/PERFORMANCE.md`. Raise one only on purpose,
  in its own commit, saying why.

## Translations

UI strings live in `src/i18n/<lang>.js`, one file per language; the game
downloads only the language in use. Add a new key to `en.js` first, then to
each language file. `src/i18n/strings.js` gathers them all for tests only;
don't import it from game code.
