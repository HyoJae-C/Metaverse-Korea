# Folk games (전통놀이)

Four traditional Korean games, built and tested but **not placed on the map
yet**. They are meant for a folk games yard, first planned for Namsangol
Hanok Village (남산골 한옥마을, Pil-dong, Jung-gu), once the Seoul map is
redrawn. Try them now at `dev/folk-games.html` (`npm run dev`, then open
`/dev/folk-games.html`; `?open=yut|tuho|jegi|neol` and `?lang=ko` work too).

| Game | Rules (no DOM) | Panel | What you do |
| --- | --- | --- | --- |
| 윷놀이 Yutnori | `src/core/yut-game.js` | `src/ui/yut-ui.js` | Board game against 1-3 locals (Grandma, Minjun, Seoyeon). Real rules: 도개걸윷모 and 빽도, extra throws for 윷/모 and catches, short cuts from the corners and the centre, stacking (업기), catching (잡기). |
| 투호 Tuho | `src/core/tuho-game.js` | `src/ui/tuho-ui.js` | Ten arrows, two taps each (direction, power). Mouth 2, ears 3. |
| 제기차기 Jegichagi | `src/core/jegi-game.js` | `src/ui/jegi-ui.js` | Tap KICK as the jegi reaches your foot; counted out in native Korean numbers (하나, 둘, 셋…). |
| 널뛰기 Neolttwigi | `src/core/neol-game.js` | `src/ui/neol-ui.js` | Seesaw jumping with Suni: push on landing to climb, peek over the hanok wall. |

Text for all four in 9 languages is in `src/ui/folk-text.js` (`FT`, plus
`FOLK_LINES` for what the locals say: Korean, romanization, meaning).
3D props are in `src/core/folk-props.js`: `makeYutMat`, `makeTuhoJar`,
`makeJegiStand`, `makeNeolBoard` (tilt it with `setNeolTilt`), and
`FOLK_GAMES`, which lists each game with its prop, where to stand
(`stand`, metres from the prop) and how close counts (`radius`).
Tests: `tests/folk-games.test.mjs`.

## Rewards

- Tuho, jegichagi and neolttwigi give medals through the grill's `Medals`
  (`core/grill-game.js`, game ids `tuho`, `jegi`, `neol`): each new tier pays
  once (bronze 10, silver 20, gold 30 coins), like the cooking classes.
- Yutnori calls `onWin()` when you win; return the coins you paid (or 0).
  Suggested: 15 coins, at most a few wins a day, so it can't farm coins.
  Wins are counted on the device (`mk.folk.yutWins`).

## Putting them on the map (later)

1. When the Seoul map is redrawn, add the hanok village as a district or as
   part of the Jung-gu district: hanok buildings, a wall with a gate, and an
   open yard of about 20 × 14 m. The map thread's notes (docs/WORLD.md):
   districts are placed with an anchor (real lat/lon + local spot) in
   region.json and `node scripts/place-districts.mjs --apply`; `npm test`
   checks overlaps and the gu outline. Jung-gu content goes in the band
   between the Gyeongbokgung/Cheonggyecheon strip and Itaewon/Namsan.
2. Build the props from `FOLK_GAMES` in the yard (like `palace-show.js` adds
   its dancers) and add their footprints to collision.
3. In `index.html`, add four panels:
   `<div class="sheet order-panel kimchi-panel folk-panel" id="yut-panel" hidden></div>`
   (and `tuho-panel`, `jegi-panel`, `neol-panel`).
4. In `main.js`, create the panels like the kimchi class (`onSay` makes
   Grandpa Kim, a `makeNpc` standing in the yard, speak; `onMedal` shows the
   medal toast, plays `cheer` and can count a mission), add them to
   `spaceBusy()` and to the list closed when you leave, and add an action
   button when you stand within `radius` of a game's `stand` spot
   (`'🎲 ' + FL('yut.open')` and so on).
5. Optional: let friends play yutnori together. `YutGame` is plain data
   (`snapshot()` / `YutGame.restore()`), so the host can send the state after
   each throw and move in the yard's room, and seats not taken by people
   stay computer players.
