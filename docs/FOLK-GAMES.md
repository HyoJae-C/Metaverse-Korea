# Folk games (전통놀이)

Four traditional Korean games in the folk games yard of Namsangol Hanok
Village (남산골 한옥마을, Pil-dong, Jung-gu): through the hanok gate south of
Toegye-ro, in the middle of the yard. Also at `dev/folk-games.html`
(`npm run dev`, then open `/dev/folk-games.html`; `?open=yut|tuho|jegi|neol`
and `?lang=ko` work too).

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
  once (bronze ₩5,000, silver ₩7,000, gold ₩10,000), like the cooking classes.
- Yutnori calls `onWin()` when you win and shows the coins it returns. In
  the yard that is ₩5,000 for the first three wins of the day, then 0, so it
  can't farm coins. All wins are counted on the device (`mk.folk.yutWins`).

## The yard (src/game/folk-yard.js)

- The yard is the `folkyard` landmark in `districts/euljiro.json`, at the
  centre of Namsangol's plaza (48 × 20 m, inside the hanok wall). Where the
  props and the locals stand is `src/data/folk-yard.js` (`FOLK_YARD`); the
  props are turned so you play facing the hanok houses with the gate behind
  you, and the lane straight in from the gate stays clear.
- The tuho jar and rack, the jegi stool and the seesaw are solid
  (`FOLK_SOLID`); `scripts/build-euljiro.mjs` writes them into the map's
  blockers. Move a prop, then run `node scripts/build-euljiro.mjs`.
- The locals are there before you: Grandma, Minjun and Seoyeon sit on three
  of the four cushions round the yut mat (you take the fourth), Grandpa Kim
  keeps the tuho jar, a boy keeps a jegi up by the stool, and Suni waits on
  the low end of the seesaw. Each game's lines come from its local
  (`FOLK_YARD.speaker`).
- Stand by a game for its action button (`🎲 Play yutnori` and so on). The
  panel closes when you walk away from it.
- Rewards: medals pay once per tier (wallet reason `medal`); a yutnori win
  pays ₩5,000, three wins a day (counted on the device, `mk.folk.yutPaid`).
- Tests: `tests/folk-yard.test.mjs` (layout, blockers, the open lane);
  end to end: `tests/e2e/folk-yard.mjs`.

## Later

- Let friends play yutnori together. `YutGame` is plain data
  (`snapshot()` / `YutGame.restore()`), so the host can send the state after
  each throw and move in the yard's room, and seats not taken by people
  stay computer players.
