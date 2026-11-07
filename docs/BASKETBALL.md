# Mini basketball (미니 농구)

A half court with a mini hoop on Olympic Park's Peace Plaza, just south of
the skate park. Also try it at
`dev/basketball.html` (`npm run dev`, then open `/dev/basketball.html`;
`?open` opens the panel, `?move=dunk:3` plays one move, `?lang=ko`,
`?view=side|front|close`).

## How it plays

1. At the court, the action button opens the panel (`BL('open')`).
2. Pick one of four shots. A short gauge decides the level (1-3).
3. The panel steps aside and your character does the move for that level.
4. Five shots a round. A made shot scores its points (free throw 1, the
   others 2); a level 3 move gets +1 style point. Best is 15.
   Medals through the grill's `Medals` (game id `basket`): bronze 5,
   silver 9, gold 13 points.

| Shot | Gauge | Level 1 | Level 2 | Level 3 |
| --- | --- | --- | --- | --- |
| 🎯 Free throw (1) | needle: stop it in the green middle | off the rim (miss) | rolls in | clean swish |
| 💥 Dunk (2) | mash: tap fast for 2.4 s | two-hand dunk | one-hand dunk | clean back dunk |
| 🌙 Fadeaway (2) | double: top of the jump, then the release | airball (miss) | bank shot | clean fadeaway |
| 🏃 Layup (2) | rhythm: step, step, shoot on the beat | basic layup (off the glass) | finger roll | euro step layup |

## Code

| | |
| --- | --- |
| `src/core/basketball-game.js` | Rules, no DOM: `SHOTS`, `ShotMeter` (the four gauges), `shotMove(shot, tier)` (the whole move as a timeline: where you are, your limbs, the ball, events), `BasketRound`, medals. |
| `src/core/basketball-court.js` | The court, hoop, net and ball (`makeCourt`, `makeBall`), built in the hoop frame (origin under the rim, court along +z). `COURT_STAND`/`COURT_RADIUS`: where the action button shows; `COURT_POLE`: the pole's footprint for blockers. |
| `src/core/basketball-play.js` | `ShotPlayer`: plays a move on a character at the court (ball, limbs, rim shake, net). Hands back where to stand each frame. |
| `src/ui/basketball-ui.js` | The panel: start, shot picker, gauge canvas, result. `onShot` when a gauge is done, `resume()` when the move is over. |
| `src/ui/basketball-text.js` | Text in 9 languages (`BL`). |
| `tests/basketball.test.mjs` | Gauges, points, every move (finite, made shots go through the rim, misses don't). |

Moves pose the limbs through `character.setMoves(fn)` (added for this;
`core/model-pack.js` lays the offsets over the idle or running clip, like
the dances) and turn the body with `setTrick({ spin })` (the back dunk).

## On the map

The court is the `basketball` landmark in `districts/olympic-park.json`
(hoop at local x 1190, z 323, `ry` 0: the court runs south from the hoop,
between the skate park's fence and the lawn path), with a blocker for the
hoop's pole and a map label. `main.js` builds it from the landmark
(`courtLm`), shows "Play basketball" within `COURT_RADIUS` of
`COURT_STAND`, and `basketTick` plays each move (`ShotPlayer`): it places
you, lifts you with `basketY` (in `streetY`) and hands control back with
`ui.resume()` when the move is over. Other players see you move and jump
but not the ball (moves are not sent over the network yet).
