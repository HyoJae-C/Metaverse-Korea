# Mini basketball (미니 농구)

A half court with a mini hoop, planned for Olympic Park's Peace Plaza, just
south of the skate park (Olympic Park district, local x about 1190, z 335;
the map thread keeps x 1170-1210, z 320-350 free for it). Try it now at
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

## Putting it on the map

After the Olympic Park district is in (`districts/olympic-park.json`):

1. Add a landmark `{ "type": "basketball", "x": 1190, "z": 335, "ry": … }`
   and a blocker for the pole (`COURT_POLE`).
2. In `index.html`, add `<div class="sheet order-panel kimchi-panel folk-panel" id="basket-panel" hidden></div>`.
3. In `main.js`, build the court from the landmark, show the action button
   within `COURT_RADIUS` of `COURT_STAND`, open `BasketballUI`, and on
   `onShot` run a `ShotPlayer` each frame: place `me` at its x/z (the height
   on top of the ground), `setTrick({ spin }, y)`, and animate with its
   `speed`; call `ui.resume()` when it is done. Add the panel to
   `spaceBusy()` and to what closes when you leave.
