# Performance budget

The game keeps growing, so "it still runs" has to be checked, not hoped for.
These are the limits every change should stay inside, and how to stay there.

## Budgets

| What | Budget | Now (2026-11-10) | Checked by |
|---|---|---|---|
| Start screen download, gzipped (`src/boot.js` + CSS) | 80 KB | 50 KB | `node scripts/check-size.mjs` in CI |
| Game download before "Next" works, gzipped (`src/main.js` + static imports) | 1,150 KB | 909 KB | same |
| Any single script, gzipped | 1,000 KB | 518 KB (main.js) | same |
| Draw calls on a street | 600 | ~640 at Seongsu station looking west (was ~1,370 before 2026-11-11); ~620 in Seoul Forest looking east | `?debug`, then `__mk.renderInfo()` |
| Draw calls inside a room or park | 300 | ~180 | same |
| Triangles per frame on a street | 150k | ~87k | same |
| Page memory | see `tests/e2e/memory.mjs` | | CI e2e |

Known hot spots: the Banpo (~3,200), Ttukseom (~2,000) and Mangwon (~800)
park gates draw every prop as its own mesh. The Han River park work is merging
those.

## Frame rate and heat

The game draws at most 60 frames a second (30 with Battery saver in
Settings), and steps down resolution and shadows by itself when the frame
rate stays low (`src/core/graphics-quality.js`). Anything big added to the
street that is not in `FarCull` (main.js) is drawn even 2 km away behind the
fog: the zoo alone cost ~1,500 draw calls a frame from Bukchon until it was
added. Check `__mk.renderInfo()` facing every direction, not just one.

## How the page starts

`index.html` runs `src/boot.js`, which only shows the language step and starts
downloading `src/main.js`. On an emulated mid-range phone on 4G the language
step appears in about 0.5 s instead of about 6 s; the game arrives while the
player chooses. Keep `boot.js` tiny: anything it imports is on the critical
path.

## Rules for new features

1. **Start as a module.** New features live in their own file under
   `src/game/` (or `src/core/` for pure logic), created with a
   `createX(game)` factory that reads main.js state through getters. Do not
   add new top-level functions or `*_TEXT` tables to `src/main.js`.
2. **Load it when first used.** A store interior, a minigame or a district
   that you only see after walking somewhere should come in with
   `await import('./game/x.js')`, not a static import. Static imports all land
   in the first download. For a panel object, `lazyPanel()`
   (`src/core/lazy-panel.js`) stands in until it loads; see
   `src/game/cooking-classes.js`. Keep the few words the street needs (button
   label, name tag) in a small labels file, like `src/ui/cooking-labels.js`.
3. **Repeat with InstancedMesh, merge what never moves.** One mesh per bench,
   lamp or tree costs one draw call each. Use one InstancedMesh per kind, or
   merge static geometry (`BufferGeometryUtils.mergeGeometries`). Big instanced
   meshes are split into 80 m tiles at start-up (`src/core/split-instances.js`)
   so the off-screen ones are skipped.
4. **Hide what is far.** People past 150 m are skipped (`src/core/far-people.js`).
   Props smaller than a person can usually go at 60–100 m.
5. **Let rooms go.** Only the last few rooms visited stay built (4 on a
   phone, 10 on a computer: `src/game/room-cache.js`); an older one is
   rebuilt when walked into again. Keep a room's people in `built.xxxNpc` /
   `built.xxxNpcs` fields so their name tags leave with it, and anything else
   that must be freed in `built.dispose()`.
6. **Don't do per-frame work that can wait.** Distance checks, label
   positions and UI text can run every 0.1–0.25 s.
7. **Compress assets.** Prefer WebP/KTX2 textures at the size they are shown,
   and Opus/AAC audio. `dist/` is about 34 MB, mostly books and audio, which
   load only when used; keep it that way.

## When a budget fails

Find what grew (`node scripts/check-size.mjs` lists each file), and move it
behind `import()`. Raise a budget only on purpose, in its own commit, with the
reason in the message.
