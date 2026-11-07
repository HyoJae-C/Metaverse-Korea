# World plan: a compressed Seoul

The city is not a copy of the real map. Each area keeps only its landmarks and
a few characteristic streets, squeezed close together so walking between them
is quick. That way all of Seoul can fit, and Tokyo can follow the same way.

## Scope (first version)

- City: Gyeongbokgung, the Han River, Hongdae and Seongsu joined into one map
- Characters: an original, cute humanoid 3D avatar (cozy island-life mood)
- Getting around: free walking and bikes; taxis for coins
- NPCs: missions per area, daily rewards, tour guides, optional Korean chat
- Economy: earn coins; spend them on clothes, furniture and transport
- Social: sightseeing with friends, chat, meet-ups
- Ads: a big screen and a brand space on each area's central square
- Later: home decorating, seasonal events, brand coupons, a Tokyo world

Seongsu is hand-made too (`scripts/build-seongsu.mjs`): a grid of shopping
streets loosely shaped like the real neighbourhood (Achasan-ro under Line 2,
Seongsui-ro, Yeonmujang-gil, the Red Brick Lane), with Seoul Forest to the west
and the Han River to the south. Each street side that faces a shopping street is
lined with small shop buildings; run `node scripts/build-seongsu.mjs --place`
after adding a shop to `PLACE_NEW` to give it a free lot.

## The Seoul grid: one fixed scale

Seoul is real Seoul at **1/4** around Seongsu Station (`src/core/seoul-grid.js`):
the distance and direction between two places is the real one divided by 4.
Inside a district, streets and buildings stay full size; only the empty land
between districts shrinks. So every place has a known spot before it is
built, and nothing needs moving when something new is added next to it.

- **Gu budgets.** The 25 gu are their real outlines at 1/4
  (`public/regions/another-seoul/seoul.json`, built by `scripts/build-seoul.mjs`
  from OpenStreetMap, `scripts/data/seoul-gu-osm.geojson`). A gu is the room
  its districts have to share, e.g. Mapo-gu about 1.5 km² for Hongdae,
  Yeonnam and Mangwon together, Jung-gu about 0.6 km² (790 m square).
  `node scripts/build-seoul.mjs` prints every gu's area.
- **Anchors.** Each district in `region.json` names one real spot (`anchor`);
  its offset follows from it. A `nudge` (with a `why`) moves it off that spot
  on purpose: Songpa is nudged north so its Han River bank lines up with
  Seongsu's. A big area can be split so each part sits on its own real spot:
  Olympic Park is its own district (anchor: the World Peace Gate), joined to
  Songpa by Olympic-ro.
- **Seongsu** is the exception: the first district, full size and larger
  than its 1/4 share, so the river and gu edges just south of it are pushed
  south to make room (`seongsuRoom` in `scripts/build-seoul.mjs`).
- **Moving a district** (`scripts/place-districts.mjs --apply`) also moves
  everything placed in world metres inside it: stores, zones, bike stations,
  homes, screens, subway exits, busking zones, stamps, and the ends of link
  roads. Check the link roads on the map afterwards.
- **Keep streets clear.** When you re-draw a road or move a district, move
  or trim the buildings (and blockers) that end up on it: the map still shows
  a street, but you walk into a wall. Songpa-daero once ran straight through
  three towers this way. `tests/roads-clear.test.mjs` (in `npm test`) fails
  when a building or blocker stands in the middle half of any street; a
  street blocked on purpose goes in its `ALLOWED` list with the reason.
- **Credit.** The gu outlines are © OpenStreetMap contributors (ODbL); the map
  shows that line in its corner (`credit` in `seoul.json`).

## How a region is put together

`public/regions/<id>/region.json` either names one map file (`mapFile`) or
lists **districts** joined into one map (`src/core/districts.js`):

```json
"districts": [
  { "id": "seongsu", "map": "map.json", "offset": [0, 0] },
  { "id": "hongdae", "map": "districts/hongdae.json", "offset": [-900, 0] }
],
"links": [{ "k": "primary", "w": 16, "p": [[-600, 0], [-480, 0]] }]
```

- Each district map uses the usual format: `roads`, `buildings`, `areas`
  (`park`, `grass`, `water`), `rail` and `pois`, in metres around its own
  origin. The offset moves the district into place; `links` are the big roads
  between districts.
- `blockers` are polygons you can't walk into that aren't buildings, such as
  a river or a palace wall.
- Stores, homes, meeting zones and bike stations can be placed with
  `"at": [x, z]` in map metres (hand-made districts) instead of a lat/lon
  `anchor` (maps drawn from real coordinates).

## Adding a district later (e.g. Gyeongbokgung)

1. Draw the district as a small map file: a square, the main street, a few
   blocks of plain buildings, and blockers for walls or water.
2. Add the landmark as a 3D model on top (gate, palace hall, bridge…).
3. Add it to `districts` with an `anchor` (a real spot in it: `lat`, `lon`,
   and `local`, where that spot is in the district's map), run
   `node scripts/place-districts.mjs --apply` to get its offset, and add a
   `link` road to its neighbour. `node scripts/place-districts.mjs` (and
   `npm test`) then checks that it sits in its gu and overlaps no other
   district.
4. Put its stores, a meeting zone (square) and a bike station there with `at`.
   A meeting zone's id is a new single letter: its two passers-by take their
   names from that letter (`src/data/npc-names.js`), so daily "find someone"
   missions name one person who stays in that area. `npm test`
   (`tests/npc-missions.test.mjs`) checks every zone stands in a district
   next to its own streets.
5. Give it an Information Center: a store with `"workshop": "info"` and
   `"district": "<id>"`, and its name and intro in `AREA` (src/ui/info-ui.js).
   Inside, the game guide (left) explains the game and the area guide (right)
   lists the district's places.
6. Optional, for a big walled place: give the map `meta.enclosure`
   (`{ "box": [x0, z0, x1, z1] }` in its own metres) and a wall with gates
   on that box. From outside only the wall and gates are drawn; what stands
   inside appears once you walk in (`src/core/enclosure.js`). Gyeongbokgung
   does this, and a district's hanok inside an enclosure are only built on
   the first visit. Bukchon is small and open on the field instead. An L-shaped district can list `meta.parts` (boxes) for the overlap
   check and for `districtAt`.

## Yeonnam-dong and Mangwon-dong

Both are drawn by `scripts/build-mapo.mjs` (rows of small buildings along
the streets, like Seongsu) and sit in Mapo-gu next to Hongdae. Yeonnam's
Gyeongui Line Forest Park path runs straight on from Hongdae Walking Street;
Mangwon has Mangwon Market under an arcade roof, Poeun-ro (Mangridan-gil) and
an open Han River park along its south edge. Its Mangwon Fishing Pier is a
park room like Ttukseom's; every park's fishing spots share one catch table
(`src/core/fishing.js`), so no park pays better than another. The script also sets the `at` of
the shops it lists in `SHOPS`, so run it again after moving a district.

## Sunken streams (Cheonggyecheon)

A district map can list `streams`: a stone channel below the street that runs
east from `at` for `len` metres, with walkways on both banks, water in the
middle, `bridges` (`arch` or `slab`), `stairs` down from the sidewalk and
`stones` (stepping stones). Positions along the channel are `u`, metres from
its west end. See `src/core/stream.js`.

Collision is 2D, so a stream has two layers. On the street the channel is a
wall that only bridge decks cross (these walls are part of the normal
collision map, so routes, trees and passers-by keep out of it). Halfway down a
stair you switch to the low layer, where the banks' walls and the water are
what you bump into, and a bridge is a roof overhead.


## Euljiro & Dongdaemun (Jung-gu)

Drawn by `scripts/build-euljiro.mjs` in the band between the Cheonggyecheon
strip and Namsan, kept small on purpose (DDP and what is round it; the old
Euljiro alleys were taken out, since the game has plenty of streets of small
shops). Eulji-ro runs along its north edge just south of the Cheonggyecheon
towers, and three link roads (Changgyeonggung-ro along the west edge, the
walk to Ogansugyo Bridge, Jangchungdan-ro) go north between those towers to
Cheonggyecheon-ro; Eulji-ro and Toegye-ro run west to Sejong-daero and
Sungnyemun as links, and Toegye-ro on east to Wangsimni-ro. DDP is a custom
building drawn by its landmark (`core/euljiro-models.js`) from the outline in
the map, with Dongdaemun History & Culture Park and a stretch of the Seoul
City Wall on its west side, and the fashion malls across Jangchungdan-ro.
South of Toegye-ro, below the park (moved in from Pil-dong, not to scale),
Namsangol Hanok Village has a walled yard (`hanok.yard` in the script) kept
free for the folk games (docs/FOLK-GAMES.md).

DDP's main door on the plaza opens into DDP Hall (store `ddp-hall`, workshop
`ddp-hall`, size `hall`): a bright lobby with design pieces, benches and
visitors already there. Its back door leads into the Curve Runway
(`RUNWAY_STORE` in `core/runway-game.js`, workshop `runway`; entered from the
hall like the haunted house from Another Land, and its door leads back to the
hall). The runway is a rhythm walk in its own big room (size `runway`, seats either side, about a
third taken by a seated audience): a step a beat down the catwalk, then three poses for the
cameras (`core/runway-game.js`, `ui/runway-ui.js`; main.js walks the
character from `walkState()`). Medals as at the grill (game id `runway`).
Every step and pose is judged in three tiers (`core/runway-fx.js`): a random
sparkle burst (perfume effects), a small twinkle, or a wobble with a red "!";
a pose that lands shows a word (Cute!, Chic!/Sexy!, Confident!). Friends walk
it in turns (`core/runway-line.js`): a line of up to four kept by everyone in
the room from `rwq:` emotes, the latest walks ranked on the panel.

A landmark's `p` is moved as world points when districts are joined
(`core/districts.js`), so a shape drawn relative to the landmark's own
`x, z` uses another name (DDP's `outline`).

Two more parts of the same district stand at their gates' spots: Sungnyemun
(on a lawn island in a ring of Sejong-daero, where Toegye-ro starts) and
Heunginjimun (north of the Cheonggyecheon strip, straight up from Ogansugyo
Bridge, with its half-moon ongseong). The district's `meta.parts` lists the
three boxes for the overlap check.

## Jongmyo (Jongno-gu)

Drawn by `scripts/build-jongmyo.mjs` from `src/data/jongmyo.js`, in the room
between Jongno and Yulgok-ro east of Bukchon. Jongno runs on east from
Gwanghwamun (z -765); Oedaemun, the shrine's gate, stands on its north side
behind Jongmyo Square (meeting zone R, the janggi grandpas, the stamp). The
shrine is a walled place you walk into (`meta.enclosure`): the stone path
(samdo; its raised middle strip is the spirits', `onSamdo`), Jeongjeon and
Yeongnyeongjeon on their terraces in walled yards, the square pond, and the
woods (one instanced landmark that also lines the square, so the treetops show
over the wall). `core/jongmyo-show.js` has the guide inside the gate, the
ritual dance on Jeongjeon's terrace at about a quarter scale (16 dancers: the
civil dance on the west half, the military dance with wooden swords and spears
on the east half; 15 musicians behind them), built the first time you come
near, and the grandpas. A sign below the terrace explains the two dances (at
the real rite they take turns). Stepping onto the spirits' strip slides you
back beside it (`offSindo`). Outside the west wall: a grove and the
Information Center's hanok on Jongno. Seosunra-gil (the lane along the west
wall with six hanok shops) was taken out for now because it felt too much
like Bukchon; to bring it back, start from commit e4ebd13. Run the script
again after moving the district: it also sets the Information Center's `at`
in stores.json.

## Stamp courses

`src/data/trails.js` groups tour stamps into courses (the Seoul City Wall
Trail: Sungnyemun, Namsan, Igansumun, Heunginjimun; the Joseon Royal Walk:
Gyeongbokgung, Bukchon, Jongmyo). The stamp note shows
each course's stops; the last stamp of a course pays its reward once
(`core/trails.js`, saved under `mk.trails`).
