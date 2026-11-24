# Folk games (전통놀이)

Four traditional Korean games in the folk games yard of Namsangol Hanok
Village (남산골 한옥마을, Pil-dong, Jung-gu): through the hanok gate south of
Toegye-ro, past Cheonugak's plaza, south of the hanok quarter (the real
folk games ground). Also at `dev/folk-games.html`
(`npm run dev`, then open `/dev/folk-games.html`; `?open=yut|tuho|jegi|neol`
and `?lang=ko` work too).

| Game | Rules (no DOM) | Panel | What you do |
| --- | --- | --- | --- |
| 윷놀이 Yutnori | `src/core/yut-game.js` | `src/ui/yut-ui.js` | Board game with 1-3 locals (Grandma, Minjun, Seoyeon) or with people at the mat (see below). Hold the throw button and let go: the gauge only changes how high the sticks fly. Real rules: 도개걸윷모 and 빽도, extra throws for 윷/모 and catches, short cuts from the corners and the centre, stacking (업기), catching (잡기). |
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

- The yard is the `folkyard` landmark in `districts/euljiro.json`: a
  24 × 14 m plaza round the real folk games ground
  (`scripts/build-namsangol.mjs`). Where the props and the locals stand is
  `src/data/folk-yard.js` (`FOLK_YARD`); you play facing north, to the hanok
  houses, and the way in from the plaza (the north-west corner) stays clear.
  Pigeumjeong, the little pavilion, stands on its real spot in the yard.
- The tuho jar and rack, the jegi stool and the seesaw are solid
  (`FOLK_SOLID`); `scripts/build-namsangol.mjs` writes them into the map's
  blockers. Move a prop, then run it again.
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

## Yutnori with people (core/yut-net.js)

Opened 2026-11-23 (Yozi: "남산골 오픈하고 윷놀이 넣어주자").

- Whoever opens the mat is the host. The start sheet lists the people within
  9 m of the mat (not anyone you blocked) with an Invite button, up to three.
  The invited get a card (`#yut-ask`, 28 s); saying yes from by the mat opens
  their panel waiting for the host. Seats nobody takes stay with the locals.
- Start sends the seats and a seed (`yut:g`). After that each player sends
  only their own turn (`yut:x`, numbered), and every browser applies the same
  moves in order. The sticks come from the seed (`yutRng`), so a throw shows
  the same everywhere; the gauge (0-9) only sets how high they fly.
- The host plays the locals' seats. A player who leaves, walks away from the
  mat (9 m), or doesn't play their turn for 40 s gives the seat to a local
  (`yut:k`). The host leaving ends the game for everyone (`yut:c`).
- Play again (host) restarts with the same people; the others' panels wait for it.
- Each player's win pays the same ₩5,000, three a day, as against the locals.
- Tests: `tests/yut-net.test.mjs`; end to end with two players:
  `tests/e2e/yut-mp.mjs`.

## Later

- People walking past can't watch a game yet (only the players see the board).
