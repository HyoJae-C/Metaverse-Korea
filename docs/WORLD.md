# World plan: Seoul at 1/4

The city is real Seoul shrunk to 1/4 (see "The Seoul grid" below): every area
sits on its real spot, with its big roads, river banks and landmarks on their
real lines. Inside the real blocks the side streets and buildings are made up,
and an area keeps its landmarks and a few characteristic streets rather than
every building. That way all of Seoul can fit, and Tokyo can follow the same way.

## Scope (first version)

- City: Gyeongbokgung, the Han River, Hongdae and Seongsu joined into one map
- Characters: an original, cute humanoid 3D avatar (cozy island-life mood)
- Getting around: free walking and bikes; taxis for coins
- NPCs: missions per area, daily rewards, tour guides, optional Korean chat
- Economy: earn coins; spend them on clothes, furniture and transport
- Social: sightseeing with friends, chat, meet-ups
- Ads: a big screen and a brand space on each area's central square
- Later: home decorating, seasonal events, brand coupons, a Tokyo world

Seongsu is hand-made too (`scripts/build-seongsu.mjs`), at 1/4 of the real
size like the rest of the map, with its main streets where they really are
(measured from OpenStreetMap; the blocks and buildings are made up). Seongsu
Station (the Achasan-ro / Seongsui-ro crossing, under Line 2) is the map's
origin. The streets are a grid turned 20.5° (`THETA`) from east-west, as in
Seoul: Achasan-ro, Yeonmujang-gil (56 m south of it), the lane (103 m),
Ttukseom-ro (155 m), Seongdeokjeong-gil (198 m) and Dulle-gil (245 m) run
east-south-east; Seongsuil-ro (127 m west of the station), the Red Brick
Lane, Seongsui-ro (30 m east), Yeonmujang 13-gil and 17-gil and Dongil-ro
(195 m) cross them. The grid is laid out in its own frame (`toMap` /
`toGrid`), then turned onto the map and cut back to Wangsimni-ro (north-south
at x -250, Seoul Forest Station on it), the map's edges and the riverside.
The shops crowd into the blocks round Yeonmujang-gil, between Seongsuil-ro
and Yeonmujang 17-gil (Seongsu's busiest shopping alleys, on Yozi's map),
with narrow fronts (9.5–12 m); the blocks west and east of them are offices.
Each street side that faces a shopping street there is lined with small shop
buildings (lots stand at the grid's slant; `lotFront` in `core/ad-posters.js`
finds their front from `f`). Seoul Forest lies west of Wangsimni-ro on its real
outline at 1/4 (`scripts/data/seoul-forest-osm.json`, OpenStreetMap): west
to x -549, with its piece north of Seoulsup-gil and its real ponds (Seoul
Forest Lake, the Mirror Pond, the wetland and the small ones). The roads round
and through it are real too: Seoulsup-gil and Gwangnaru-ro on the north,
Gosanja-ro down the west side to Ttukseom-ro (south of there it is Seongsu
Bridge's ramp, not drawn), and Ttukseom-ro across the park, drawn only at the
two open ends of the Rainbow Tunnel. The park is a little bigger than the real one
on three sides (Yozi, 2026-11-10: the real outline, cut into strips by the
roads, felt small and bare), never toward the river or across Wangsimni-ro:
the corner by Seoul Forest Station (really towers) is park, the land round
its north piece up to z -200, and its west end past Gosanja-ro to x -600
between Itaewon-ro and the riverside grass. There stand the Family Lawn (an
open picnic lawn) and, by the Eco Forest's pond, the Deer Meadow (a fenced
paddock; the deer, `core/forest-deer.js`, load the first time its fence is
on screen). Wildflower patches (`meadow`) fill the open spots between the
gardens; the tulip and sunflower gardens stand by the station's exits. What is in the park (Metasequoia Avenue, the hill,
the gardens, the greenhouse, the galleries) is drawn in its old frame (old =
world + 130, 154) and moved as one piece by `FOREST_SHIFT`, placed to keep
clear of the real roads and ponds. The links to Itaewon and Wangsimni start at
Ttukseom-ro's west end and Gosanja-ro's north end. The Han
River's bank is the real one (OpenStreetMap) all the way to Ttukseom Han
River Park, east of Cheongdam Bridge, whose straight bank (about 9° off
east-west, within about 10 m of the real one) runs on to Jamsil Bridge
(x 430); buildings stop 20 m short of the real bank (riverside grass and the
Han River path between). `--place` and `--square` still use the spots of the old
layout (`SPOTS`); check where they put a shop. (Seongsu was drawn full size
until it was redone at 1/4, then with an east-west grid until it was laid on
the real streets.)

## The Seoul grid: one fixed scale

Seoul is real Seoul at **1/4** around Seongsu Station (`src/core/seoul-grid.js`):
the distance and direction between two places is the real one divided by 4.
That goes for the inside of a district too: its streets are laid out at 1/4
of their real lengths and distances, while road widths and buildings stay a
normal size (a district looks like the real place, just shorter). So every
place has a known spot and a known amount of room before it is built, and
nothing needs moving when something new is added next to it. Before
building, check a few real distances (station to the main sight, the length
of the main street) and divide them by 4; a district drawn larger takes its
neighbours' room and pushes them off their spots.

- **Gu budgets.** The 25 gu are their real outlines at 1/4
  (`public/regions/another-seoul/seoul.json`, built by `scripts/build-seoul.mjs`
  from OpenStreetMap, `scripts/data/seoul-gu-osm.geojson`). A gu is the room
  its districts have to share, e.g. Mapo-gu about 1.5 km² for Hongdae,
  Yeonnam and Mangwon together, Jung-gu about 0.6 km² (790 m square).
  `node scripts/build-seoul.mjs` prints every gu's area.
- **Anchors.** Each district in `region.json` names one real spot (`anchor`);
  its offset follows from it. A `nudge` (with a `why`) moves it off that spot
  on purpose. A big area can be split so each part sits on its own real spot:
  Olympic Park is its own district (anchor: the World Peace Gate), joined to
  Songpa by Olympic-ro, which climbs north-east from Jamsil Station to the
  gate as it does in Seoul; the park sits on its real spot, with no nudge.
- **Seongsu** is at 1/4 too, with its station on the origin. Gyeongbokgung's
  palace grounds are exactly 1/4, but its halls are drawn wider (30%
  footprints, 50% heights; see the palace section), and DDP stands at close
  to its real size, so Euljiro's streets round it are wider apart; both are
  landmark buildings, which keep more of their size.
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
- `closed` (region.json) is land not built yet in Seocho, Gangnam and Dongjak:
  rectangles you can't walk into, drawn grey on the street, the map and the
  minimap. `node scripts/build-closed.mjs` writes it, leaving 30 m open around
  anything built (6 m each side of a bike path); run it again after building
  there.
- The Han River bike paths are links with `bike: true` (drawn red on the
  street and the maps): the north bank from Mangwon to Seongsu, and the south
  bank from the Saetgang's mouth to Banpo-Jamwon park and on to Jamsil
  Bridge, open through the closed land. `node scripts/build-bike-paths.mjs`
  writes them on OpenStreetMap's real cycleways at 1/4
  (`scripts/data/han-bike-osm.json`); run `build-closed.mjs` after it.
- `water` (region.json) adds river stretches between districts (the Han River
  from Mangwon to Seongsu): each is a water area plus a blocker; give it
  `blockers` split around a bridge to leave a gap. The Han's banks there
  are the real ones at 1/4 (`scripts/data/han-banks.json`, from OpenStreetMap):
  `scripts/han-bank.mjs` writes water[1] (from x -1420, west of Banpo Bridge,
  to Seongsu, with a gap for Jamsu Bridge), and `scripts/build-yeouido.mjs` writes water[0]
  (Mangwon to x -1420) from the same banks. Mangwon's map draws its own
  straight stretch of the real bank (west of x -3220).
- Stores, homes and meeting zones can be placed with
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
   A meeting zone's id is its gu's letter and the gu's next number (A-1,
   A-2 ... for Seongdong-gu; the letters are in zones.json "gu", and a newly
   opened gu takes the next unused letter, never I). Its `npc` is a new
   single letter: its two passers-by take their names from that letter
   (`src/data/npc-names.js`), so daily "find someone" missions name one
   person who stays in that area. `npm test`
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

Both are drawn by `scripts/build-mapo.mjs` and sit in Mapo-gu next to
Hongdae: one row of buildings along each street and the blocks behind left
open, like Seongsu (Yozi, 2026-11-10: filling the blocks with houses was too
dense; Mangwon went from 279 buildings to 89). Itaewon and Sinchon
(`seodaemun`) were thinned the same way: buildings behind the street rows
removed, neighbours in a row joined in pairs (Itaewon 234 to 163, Sinchon 137
to 80). Bukchon keeps its packed hanok on purpose (they look best in numbers).

Yeonnam (`scripts/build-yeonnam.mjs`, called by build-mapo) is at 1/4 on its
real place, north-west of Yanghwa-ro: Donggyo-ro, Yeonnam-ro, Seongmisan-ro,
Worldcup-buk-ro, Yeonhui-ro and Jandari-ro from `scripts/data/hongdae-osm.json`
(OpenStreetMap, within 0.7 m). The Gyeongui Line Forest Park ("Yeontral
Park") runs on its real line, 32° west of north, from Hongik Univ. Station's
exit 3 at Yanghwa-ro to past Seongmisan-ro (the anchor, no nudge). It is
drawn `PARK_W` = 16 m wide, twice its real width at 1/4 (about 8 m): Yozi
chose it so there is room to picnic; change `PARK_W` to redraw it. Shops face
the park from both sides; the old rails lie in the grass between the
streets that cross it.

Mangwon (`scripts/build-mangwon.mjs`, called by build-mapo) is at 1/4 on its
real place: its streets (Worldcup-ro, Poeun-ro, Mangwon-ro, Huiujeong-ro,
Gangbyeon-buk-ro and the lanes, from `scripts/data/mangwon-osm.json`,
OpenStreetMap), Mangwon Station's exits on Worldcup-ro, the market alley on
its real line, and the Han's bank, which is straight here (within 3 m) and
runs south-east at 42°. Buildings stand along the main streets between
Seongsan-ro and x -3197 (Yeonnam and Hongdae are east of that). It has Mangwon Market
under an arcade roof, Poeun-ro (Mangridan-gil) and Mangwon Han River Park
along its south edge, laid straight on the bank
(the `hanpark` landmark, `src/game/han-parks.js`): the fishing pier and fish
buyer west, the kiosk and food stalls where the path comes down, the duck
boat dock east of them, and Seoul Battleship Park's warship moored at the
east end. Every park's fishing spots share one catch table
(`src/core/fishing.js`), so no park pays better than another. The script also sets the `at` of
the shops it lists in `SHOPS`, so run it again after moving a district.

## Hongdae (Mapo-gu)

`node scripts/build-hongdae.mjs` draws Hongdae (`districts/hongdae.json`) at
1/4 on its real streets and puts its shops on their lots. The streets are
OpenStreetMap's (`scripts/data/hongdae-osm.json`, within 0.7 m; Yanghwa-ro is
drawn as one road on the line between its two carriageways, within 2.7 m of
each): Yanghwa-ro running south-west from Hongik Univ. Station to Hapjeong,
Hongik-ro at right angles to it, Hongdae Walking Street (Eoulmadang-ro)
leaving Hongik-ro south-south-west past the busking zone, Wausan-ro,
Jandari-ro, and Dongmak-ro from Hapjeong to Sangsu Station. Hongdae is
south-east of Yanghwa-ro; Yeonnam is north-west of it.

- **The busking zone keeps its game size**: the stage, its low steps and an
  open plaza round them (29 x 36 m) on the walking street, 11 m from the
  anchor (the zone's real place). The zones are not turned, so the plaza is
  square to the map while the street crosses it at an angle.
- Made up, inside the real blocks and in line with them: the walking
  street's last 33 m down to Jandari-ro and on to Dongmak-ro, the perfume
  alley east of it, and three lanes at right angles to Yanghwa-ro. Dongmak-ro's
  last 100 m to Sangsu Station is drawn straight (the export stops short).
- Hongik Univ. Station: exit 9 on the Hongdae side (5.6 m from the real one,
  moved out onto the pavement) and exit 3 at the forest park's south end (at
  the real one). `stationExits()` in the script works them out.
- Shops stay in their groups (`GROUPS` in the script: each group takes the
  free lots of its rows in order): the info centre and name tags at the top
  of Hongik-ro, salons, tarot cafés and clothes round the plaza, the perfume
  alley, animal cafés and desserts down the walking street, the sauna, gym,
  climbing wall and yoga on Wausan-ro, Korean restaurants on Jandari-ro.
- Run the script again after changing the map; it rewrites the shops' `at`.
- `meta.parts` (25 m strips) let Hongdae and Yeonnam meet along the diagonal
  Yanghwa-ro without their boxes overlapping (`strips()` in
  `scripts/street-rows.mjs`, the helpers both scripts share).

## Ttukseom Han River Park (Seongsu)

At its real place east of Cheongdam Bridge, on a straight bank in its own
frame (`parkAt` in `scripts/build-seongsu.mjs`: X along the bank, Z inland;
landmark `ry`), between the river and the Han River path (`PARK` in `scripts/build-seongsu.mjs`,
`game/han-parks.js`). West to east: the fishing pier and fish buyer; DAILY
MART with its ramen machine where the walk comes down from the riverside walk,
then the Riverside Market's six stalls; the open lawn for the drone light
show (`lawn: true`: picnic mats, frisbees), with the launch barge out on the
water and the show's board by the railing; the duck boat dock by the other
walk down. The drone show (`core/drone-show.js`) keeps its spots in the old
park room's metres; `core/han-park.js` sets them on the park (`drones` in
the layout), loads the drones only near show time, and turns the street's
sky dark in and around the park while it's on. Both Ttukseom stamps stand
on the lawn; the drone show's only while the drones are up.

## Banpo-Jamwon Han River Park (Seocho-gu)

Banpo and Jamwon Han River Parks lie side by side on the south bank, so the
game joins them into one riverside park at the south end of Banpo Bridge
(`scripts/build-banpo.mjs`, `districts/banpo-jamwon.json`). The river, the
bank and the bridge are on their real lines at 1/4 (OpenStreetMap, water[1]
from `scripts/han-bank.mjs`): the lawn, the river path and the trees follow
the real bank from the bay west of the bridge to Jamwon's inlet. Near the
bridge the bank runs straight at right angles to it, so the park there is
drawn in the bridge's frame (u along the bank, v inland). West of the bridge
the real bank turns into the bay where Sebitseom floats; Moonlight Square
stands out over it on a terrace (up to 16 m off the real bank) so its steps
and food trucks keep a straight bank facing the fountain. Jamsu Bridge, the
low deck under Banpo Bridge, crosses on the real bridge's line from the
north bank's bike path: the river's blocker has a gap for it, and the
`jamsu` landmark draws its kerbs, railings, lamps and Banpo Bridge overhead
(its middle is `BRIDGE` in `src/core/rainbow-fountain.js`). A link road
("To Banpo Bridge") comes down Noksapyeong-daero's real line from Itaewon's
Seobinggo-ro, through Yongsan Park, onto the bridge. Its ★5 legend is the manta ray (`PARK_LEGENDS` in
`src/core/fishing.js`).

The park is laid straight on the street, with no room or door: the
`hanpark` landmark (`PARK` in the script) says where everything goes, in
the park's own frame (x along the bank from the bridge, z inland from the
bank's edge). `src/core/han-park.js` builds what the map can't draw, and
`src/game/han-parks.js` sets it on the street the first time you come near.
You stay on the street: the same room, the same network, the map. As the
real parks are, at 1/4:
- Banpo (west of the bridge): Moonlight Square at the foot of Banpo Bridge,
  with stone steps facing the rainbow fountain, the night market's food
  trucks and the convenience store under the bridge.
- Jamwon (east): the fishing pier, the fish buyer, the duck boat dock and an
  open lawn by the water for picnic mats.

## Gyeongnidan-gil (Itaewon, Yongsan-gu)

The rest of Itaewon is hand-made, but Gyeongnidan-gil (경리단길) follows its
real roads: `node scripts/build-gyeongnidan.mjs` reads Hoenamu-ro (the
street people call Gyeongnidan-gil) and a few lanes off it from
OpenStreetMap (`scripts/data/gyeongnidan-osm.json`, © OpenStreetMap
contributors, ODbL) and writes them into `districts/itaewon.json` at a
quarter of the real size, like the rest of the map: from the foot by
Noksapyeong-daero up to where Hoenamu-ro 35-gil leaves it, about 160 m
(650 m in Seoul). It stays inside Itaewon's old east side, between
Sinheung-ro, Sowol-ro and the shops on Itaewon-ro.

- **Simple like the other neighbourhoods.** Only three lanes are kept
  (13-gil and 35-gil up to Sowol-ro, 26-gil down to Itaewon-ro), and the
  buildings are one row along each street, at normal size; the blocks
  behind are left open. The real tangle of lanes, drawn 1:1, read as too
  busy next to the rest of the city. The script also moves four of
  Itaewon's own places up the street (a diner, a trattoria, a café and the
  taproom); it makes no new shops.
- **The hill.** The street climbs gently, about 5 m to the top; the lanes
  north climb a little and then ease back down to Sowol-ro, which stays
  level, and the lanes south go down to the flat land by Itaewon-ro. The
  district's `meta.hill` holds the numbers and `src/core/hill-ground.js`
  turns them into a height (you, NPCs and shop fronts stand on it; a
  building's walls go from `y0`, the lowest ground under it, to `y + h`).
  The heights are a game approximation, not a survey.
- **Loaded when near.** The sloped ground, the streets drawn on it and the
  neighbours on the lanes are `src/game/gyeongnidan.js`, loaded with
  `import()` within about 480 m (`src/game/gyeongnidan-near.js`).
- **Keep things off the slope.** Anything drawn at y 0 (street trees, link
  roads) would be under the hill: `tests/gyeongnidan.test.mjs` checks the
  Itaewon-ro link stays clear of it.

## Namsan and its cable car (Yongsan-gu / Jung-gu)

`scripts/build-namsan.mjs` puts Namsan on its real place from OpenStreetMap
(`scripts/data/namsan-osm.json`) and writes it into `districts/itaewon.json`
(items marked `ns`), the cable car's door in `stores.json` and the Sopa-ro
link in `region.json`.

- **The hill**: its top, with the look-out tower, on N Seoul Tower's real
  spot, 65 m high (262 m / 4). Its foot (380 × 340 m) fits between Sopa-ro
  and Sowol-ro on the west, Namsangol Hanok Village on the north and
  Itaewon on the south; real Namsan runs on further east to Beotigogae.
  The summit is near the real hill's west end, so the hill leans west
  (`src/core/namsan-shape.js`).
- **The cable car**: the lower station on the real one by Sopa-ro, above
  Myeongdong (moved 5 m to clear the road), and the cable up to the real
  upper station by the tower, high enough over the trees.
- **Getting there**: Sopa-ro on its real line from Toegye-ro (by Myeongdong)
  round to Sowol-ro. From Itaewon, the Namsan trail runs up from Sowol-ro to
  the foot of the hill; the cable car is round the west side.
- `tests/namsan.test.mjs` keeps the tower, both stations and the cable within
  15 m of the real places.

## Samseong-dong (Gangnam-gu)

Samseong Station (Line 2) on the corner of Teheran-ro and Yeongdong-daero,
drawn by `scripts/build-samseong.mjs` (`districts/samseong.json`; street lines
after OpenStreetMap) at 1/4 of the real size: Asem-ro is 161 m west of the
station, Bongeunsa-ro 153 m north and Tancheon 130 m east, a quarter of their
real distances. The big buildings (KONEXT 88 x 60 m, the office towers) take
a quarter of their real footprint too; heights stay real. (It was drawn about
twice as large, then about 1.2 times, before this.) The block north-west of the corner is KONEXT, a
fictional shopping mall seen from outside only (`core/konext.js`: a custom
building, so its walls still block): a long, low glass box with a wave
skylight, its main entrance and a KONEXT pylon on KONEXT Square, and a media
wall round its corner made of two region.json `screens` with `"wave": true`
(a big wave rolling inside a box). The small glass pavilion on the square is
KONEXT Aquarium's way in: its door is the store "konext-aquarium"
(workshop "aquarium"), whose hall is `core/aquarium.js`: a lobby with a river
fish tank and a sea-floor tank, six jellyfish columns, a 1:2 blue whale model
over a 25 m line on the floor (the real length), a real-size giant squid
(12 m), coral reef tanks, a penguin room, and an ocean tank across the back
with a glass tunnel through it (sharks, a manta ray, turtles, dolphins, an
orca, a sunfish, and a diver keeper: a game character in a wetsuit with an
air tank and fins). Each species is drawn after the real animal in
`core/sea-life.js` (body shape, colour pattern, fins, and a swimming motion
bent in the vertex shader). Free for now.
Bongeunsa, north of Bongeunsa-ro, is left
as trees for now. Tancheon runs along the east edge; Teheran-ro crosses it on
Samseong Bridge and a link road ("Olympic-ro") runs on to Songpa's Olympic-ro
towards Jamsil. Songpa lists `meta.parts` (its river bank and its main body)
so the overlap check doesn't count the empty corner its bounding box covers.
The district sits on its real spot (Samseong Station on its corner). Meeting zone J-1 is on KONEXT Square.

## Yeouido (Yeongdeungpo-gu)

Yeouido is an island in the middle of the Han River
(`scripts/build-yeouido.mjs`, `districts/yeouido.json`), on its real spot at
1/4: the outline, the Saetgang, Yeouido Park and the main streets come from
OpenStreetMap (`scripts/data/yeouido-osm.json`), and the district's anchor is
Yeouinaru Station with no nudge. The script draws in the park's frame (u
along the straight 430 m of north shore the park lies on, v across it, 0 on
that shore; that bit of shore is drawn as a straight chord, about 7 m off the
real one) and also writes the first river line in `region.json`
(`water`[0]): the Han from Mangwon to Banpo-Jamwon runs round the island's
north shore, and its blocker is cut for Seogang Bridge. The south shore faces
the Saetgang: its OpenStreetMap water plus a strip of water and blocker 2-10 m
off the shore, open only where a street crosses to Yeongdeungpo. Seogang
Bridge starts on the Han River Bike Path where "To the Han River" comes down
from Hongdae and lands on Gukhoe-daero, as the real one does. On the island:
Yeouido Han River Park along the north shore, laid straight on the street
like Banpo-Jamwon's (`PARK` in the script, `game/han-parks.js`), west to east
the boat dock by the Information Center, the night market's stalls round
Mul-bit Square's shallow pool by Yeouinaru Station, the open fireworks lawn
with no trees (`lawn: true`) and the fishing corner towards the 63 tower (a
pier, the fish buyer, the kiosk with its ramen machine); the Han River path,
Yunjung-ro (Yeouiseo-ro) with cherry trees that are only pink in spring
(`blossoms` with `seasonal`), the real street grid with plain office towers
in its blocks, Yeouido Park, the National Assembly at the west end, and the 63
tower at the east end (a blocker and a landmark, not walkable; 7 m west of its
real spot so Yeouidong-ro passes it). The island is about 850 x 440 m, as the
real one is at 1/4. The park's ★5 legend is the blobfish. Run the script
again after moving the island: it rewrites the river and the doors.

### Yeouido fireworks

Twice a day, at 09:00 and 21:00 Korean time, for an hour
(`src/core/fireworks-show.js`: the schedule, the acts and a program of
bursts worked out from the show's start, so everyone sees the same sky).
Three launch barges (`fwbarge`) sit in the main channel facing the lawn.
During a show only Yeouido's sky turns to night: `weather.nightMix` is the
show's night times `nearYeouido()` (1 on the island, Seogang Bridge and the
Hongdae bank by the bridge, fading out over 90 m). The sparks (`src/core/fireworks-sky.js`,
one `THREE.Points`, moved on the graphics card) download only when you come
within about 900 m around show time. Ten minutes before, every player gets a
notice, like the drone show's.

## Sunken streams (Cheonggyecheon)

A district map can list `streams`: a stone channel below the street that runs
east from `at` for `len` metres, or along a bending `path` (corners as offsets
from `at`; `len` is its length), with walkways on both banks, water in the
middle, `bridges` (`arch` or `slab`), `stairs` down from the sidewalk and
`stones` (stepping stones). Positions along the channel are `u`, metres from
its west end, and `v` across it. See `src/core/stream.js`: everything is laid
out straight in (u, v) and `frameOf(stream)` maps it onto the ground, each
straight stretch as it is and mitred at the corners (collision, the hole in
the ground, the seats, the heron and the wish lanterns all go through it; the
3D model is built straight and bent in one pass). Keep a long thing on one
wall (like the procession mural) on one straight stretch: it is drawn as
long panels that don't bend.

Cheonggyecheon is built by `scripts/build-cheonggyecheon.mjs` into the
Gyeongbokgung map (its items carry `"cg": 1`), on the stream's real centre
line from OpenStreetMap (`scripts/data/cheonggyecheon-osm.json`,
`scripts/cheonggyecheon-line.mjs`): 1023 m from the source at Cheonggye Plaza
to just past Hwanghakgyo, within 3 m of the real line, with all 16 bridges at
their real spots (Mojeongyo 8 m east, off the stairs at the falls). The
channel itself is game size (24 m, the real one is about 7 m at 1/4), so
Cheonggyecheon-ro runs 22.5 m either side of the middle rather than on its
real carriageways. One row of buildings faces the stream from each road:
towers at the west end, lower buildings east of Sewoon; south of the stream
east of Changgyeonggung-ro the rows are Euljiro's. The lantern festival sits
in the gaps between bridges: figures and strings at the west end, the tunnel
of light between Sewoongyo and Baeogae, the mural between Naraegyo and
Ogansugyo, the wish corner between Ogansugyo and Dasangyo. Run
`scripts/build-euljiro.mjs` first, then this one.

Collision is 2D, so a stream has two layers. On the street the channel is a
wall that only bridge decks cross (these walls are part of the normal
collision map, so routes, trees and passers-by keep out of it). Halfway down a
stair you switch to the low layer, where the banks' walls and the water are
what you bump into, and a bridge is a roof overhead.


## Euljiro & Dongdaemun (Jung-gu)

Drawn by `scripts/build-euljiro.mjs` on the real streets at 1/4
(OpenStreetMap, `scripts/data/euljiro-osm.json`); the anchor is
Dongdaemun History & Culture Park Station, where Jangchungdan-ro crosses
Eulji-ro, with no nudge. Eulji-ro runs east-north-east to Gwanghuimun, where
it meets Toegye-ro, which goes on east to Sindang; Jangchungdan-ro comes up
from the south, crosses Eulji-ro and goes north-east to Cheonggyecheon-ro;
Dasan-ro leaves Toegye-ro south-east. Eulji-ro and Toegye-ro run west to
Sejong-daero and Sungnyemun as links on their real lines. Changgyeonggung-ro,
the west edge, is on its real line from Toegye-ro up to Baeogae Bridge; the
north edge is Cheonggyecheon-ro's south road (`scripts/cheonggyecheon-line.mjs`).

DDP is a custom building drawn by its landmark (`core/euljiro-models.js`)
from the outline in the map. It keeps its game size (Yozi, 2026-11-10),
bigger than its real block at 1/4, so it fills the block north of Eulji-ro
east of the park and Jangchungdan-ro; its middle stands about 38 m east of
the real one.
Its way in faces Eulji-ro, on a small plaza. West of it, in the corner
between Jangchungdan-ro and Eulji-ro, is Dongdaemun History & Culture Park
with a stretch of the Seoul City Wall and its water gate; the fashion malls
stand across Jangchungdan-ro and east of DDP round Fashion Town Lane.
Elsewhere one row of buildings along each street. Namsangol Hanok Village is
a part of its own at its real place south of Toegye-ro by Chungmuro, at game
size, with a walk up to Toegye-ro: a walled yard (`HANOK.yard` in the script)
with the folk games yard in its middle (the `folkyard` landmark,
docs/FOLK-GAMES.md).

DDP's main door on Eulji-ro opens into DDP Hall (store `ddp-hall`, workshop
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
Heunginjimun (just north of Cheonggyecheon-ro, straight up from Ogansugyo
Bridge, with its half-moon ongseong: about 42 m north of its real spot,
which is too close to the stream for the island). The district's
`meta.parts` lists the main part in 25 m strips (its north edge follows the
south road) and a box for each of the three parts of their own.

## Gyeongbokgung's palace

Everything inside the palace wall is built from OpenStreetMap by
`scripts/build-gyeongbokgung.mjs` (data in `scripts/data/gyeongbokgung-osm.json`):
the wall is OSM's outline of the palace grounds, the ponds are OSM's, and
every hall, gate and roofed corridor (행각) stands on its real spot, measured
from Gwanghwamun (the district's (0, 0)) at 1/4. Yozi's calls (2026-11-09):

- the site is exactly 1/4 (about 139 x 217 m inside the wall);
- building footprints are 30% of the real ones (1.2 x the 1/4 map), so the
  yards between them keep almost their real shape; the corridors round the
  yards stay at the 1/4 map's size, since they are the yards' edges;
- heights are half the real ones, so a hall stands taller than Bukchon's
  houses and a gate's passage is higher than the people;
- Gwanghwamun alone is half the real size across as well as up (Yozi,
  2026-11-10): at 30% across its stone base came out narrower than its
  roofs, like a tower; the wall either side meets its wider base, and its
  wooden tower is drawn at half height again so the whole gate keeps the
  real one's shape (about two thirds as high as it is wide);
- about a quarter of the buildings: 30 of the 73 old ones inside the wall
  (every hall and gate on the middle line, the big halls either side, the
  gates in the wall; the script's `KEEP` list), and every corridor ring.
  Modern buildings (the Palace Museum, offices, sheds) and the Folk Museum's
  grounds are left out;
- where a real building was left out, a plain block stands instead: walls and
  a big tiled roof, no posts or doors (neighbours that line up share one;
  none on or beside the two museums, which stay empty).

The models are `core/palace-model.js`: Gwanghwamun, Heungnyemun and
Geunjeongmun, Yeongjegyo over the palace stream, Geunjeongjeon on its
terraces with the rank stones, Gyeonghoeru, Hyangwonjeong and Amisan have
their own; all other halls are one merged `palacehalls` landmark and all the
corridors one `cloister` (a few draw calls for the lot). Each ring of
corridors gets a door on its middle line (OSM draws most gates as part of
the corridor), and the script checks that every hall and yard can be walked
to from Gwanghwamun (`--check`, also a test). Where the old halls were pulled
down (west of the throne hall, north of the ponds) there are lawns, and the
palace woods line the wall round the north half. The royal procession keeps
to Geunjeongjeon's court (the 30% gates are too narrow for it two abreast).
Inside the wall the camera drops and looks up (`game/palace-view.js`), more
so in the courts, until the player steers it. Visitors in rented hanbok
stand about the courts (`PALACE_VISITORS`, core/palace-show.js).

## Bosingak (Jongno)

The bell pavilion stands on the north side of Jongno in the Gyeongbokgung
district's map, east of Sejong-daero (`src/data/bosingak.js`, model in
`core/bosingak-model.js`, people in `core/bosingak-show.js`), on its own
square where a plain building used to be, with a few visitors already there.
In front of the steps `🔔 Ring the bell` swings the striker into the bell and
plays a long synthesised hum (`Sfx.bigBell`), heard only round the square
(`hear.ring`, about 20 m); other players there hear it too (emote
`bosingak:ring`). The first ring pays once (reward rule `view`) and shows its
card. On 1 January at midnight and at noon (KST) the bell keeper comes out on
the upper floor and rings it 33 times, one stroke every 15 seconds, heard all
along Jongno (`hear.ceremony`). It is worked out from the clock, so every
player hears the same stroke. No real event times are shown in the game: they
change each year.

## Jongmyo (Jongno-gu)

Drawn by `scripts/build-jongmyo.mjs` from `src/data/jongmyo.js`, in the room
between Jongno and Yulgok-ro east of Bukchon. Jongno runs on east from
Gwanghwamun (z -725; 12 m south of the real Jong-ro, to leave Cheonggyecheon
room; Jongmyo carries a 6 m nudge so it lines up); Oedaemun, the shrine's
gate, stands on its north side behind Jongmyo Square (meeting zone B-4, the
janggi grandpas, the stamp). The shrine is a walled place you walk into
(`meta.enclosure`): the stone path (samdo; its raised middle strip is the
spirits', `onSamdo`), Jeongjeon and Yeongnyeongjeon on their terraces in
walled yards, the square pond, and the woods (one instanced landmark that also
lines the square, so the treetops show over the wall). `core/jongmyo-show.js`
has the guide inside the gate, the ritual dance on Jeongjeon's terrace at
about a quarter scale (16 dancers: the civil dance on the west half, the
military dance with wooden swords and spears on the east half; 15 musicians
behind them), built the first time you come near, and the grandpas. A sign
below the terrace explains the two dances (at the real rite they take turns).
Stepping onto the spirits' strip slides you back beside it (`offSindo`). `🏛️
Enter Jongmyo` in front of the stamp takes you inside the gate and `🚪 Leave
Jongmyo` just inside brings you back (walking through the gate works too).
Landmarks marked `inner` (the halls, terraces, stone path, inner woods, rite
sign) are built only on the first visit. Outside the west wall: a grove and
the Information Center's hanok on Jongno. Seosunra-gil (the lane along the
west wall with six hanok shops) was taken out for now because it felt too much
like Bukchon; to bring it back, start from commit e4ebd13. Run the script
again after moving the district: it also sets the Information Center's `at` in
stores.json.

## Stamp courses

`src/data/trails.js` groups tour stamps into courses (the Seoul City Wall
Trail: Sungnyemun, Namsan, Igansumun, Heunginjimun; the Joseon Royal Walk:
Gyeongbokgung, Bukchon, Jongmyo). The stamp note shows
each course's stops; the last stamp of a course pays its reward once
(`core/trails.js`, saved under `mk.trails`).

## Seokchon Lake's north shore (Songpa)

HANEUL (하늘), a fictional brand, has a department store (north of the west
lake) and a mall (north of the east lake) between Olympic-ro and the lakes,
where the real shopping complex by Jamsil Station stands. Another Tower
(어나더타워, fictional) stands at the real 555 m tower's place just south-east
of Jamsil Station, at half height (278 m to the tip, 35 m across: the real shape at that height, a map exception Yozi chose). Their footprints are `custom` buildings in `districts/songpa.json`
drawn by `core/haneul.js` (landmarks `haneulstore`, `haneultower`); the shops
are `haneul-dept` and `haneul-mall` in stores.json, and meeting zone F-2
(Seokchon Lakeside) keeps two passers-by on the shore.

Songpa's streets and river are the real ones at 1/4 (OpenStreetMap,
`/mnt/project-files/osm/songpa-seokchon.json` at the time): the Han's south
bank with Jamsil Han River Park's grass along it, Jamsil Bridge (Songpa-daero)
crossing from the north bank, Songpa-daero past Jamsil Station and on
south-east, Olympic-ro, Baekjegobun-ro, Hangaram-ro, Jamsil-ro, Samjeon-ro and
Seokchonhosu-ro's west part. The river from Seongsu to past Jamsil Bridge is
region water, its blockers split for the bridge. Seokchon Lake and Another
Land keep their game size (the island is about four times the real Magic
Island, on purpose, for the rides) and were moved as one piece (+50, -45) so
the channel between the lakes lies on the real Songpa-daero; the real lake is
smaller and narrower. Seoul Another Dome stands by Olympic-ro near the real
baseball stadium, the HANEUL department store south of Olympic-ro where the
real one is, the mall east of the east lake.

The lakes themselves are at the real 1/4: both lakes and the west-lake island
were traced from the real map around the lake's centre (on Songpa-daero
between the lakes, about 146 m south of Jamsil Station at 1/4) and shrunk to
1/4, about 13,150 m² of water against the real 217,850 m² / 16 = 13,616
(`tests/themepark.test.mjs` checks it stays within 5%). Songpa-daero bends
through the gap between the lakes (about 35 m wide), the mall stands west of
the east lake's north tip, and the land the old, larger lakes took is
lakeside park. Two spits of land that cut into the water (the south shore's
west end, and the west lake's east side by Songpa-daero) are lake now.

The water lies about a metre below the ground behind stone banks, and the two
lakes are one water, joined by a channel under Songpa-daero, which crosses it
on a bridge (landmark `lakeshore`, `core/lakeshore.js`; the shore is cut out
of the ground, the water areas are `sunk`). One walk goes round both lakes,
with a railing along the shore, lamps with flowers at their feet and benches
facing the water.

### Another Land on the island

The island is Another Land itself, open to the street: no gate, you walk over
Another Land Bridge (south from Olympic-ro) onto it. It is the store
`another-land-island` with `"open"` like the Han River parks (main.js
`openParks`), but its edge is its own shore: `open.lawn` (walk onto it and
you're in) and the slightly wider `open.out` (walk past it and you're back on
the street), in the room's metres, which are the Cotton Candy Express's own
(`core/park-island.js`, room size `island`). The coaster stands on it exactly
as it was, track, speed, station and attendant, with its candy wood. Where
the bridge lands, a candy castle is the park's gate
(`core/park-candy-house.js`, `open.house`: a gingerbread keep with icing
battlements, a round tower under a pink cone to about 11 m between two small
towers under mint and coral cones, a heart cookie, candy-cane posts round the
archway the walk goes through, swirl lollipops on its corners, and the name
in raised icing letters, 어나더랜드 over ANOTHER LAND, front and back; its
windows, letters and bulbs light up at night through the island's
`setNight`). In the
middle of the island a round candy hall with a mint dome and a lollipop on
top holds the stairs down to the rest of the park (`core/park-hall.js`,
`open.hall`; the room `another-land`, which has `"below":
"another-land-island"`: no storefront, its door is the hall's, `at` just
outside it and `face` the way you face coming out; leaving it puts you back
on the island). The island grew to the south-east to hold the whole track,
and again a little east of the bridge's landing for the castle's
square (about 4,050 m², the track at least 2 m in from the shore and about
5 m of water round it), so the water is about 12,980 m², 95% of the real
1/16. The coaster is its first design (83 m across, the helix round
(8, -27) with the little hill before the chocolate tunnel), with a vertical
loop added after the airtime hill (`LOOP` in `core/coaster.js`: 10.5 m
tall, a teardrop that pulls hard at its foot and floats over the top, out
3.5 m to the side of the way in; the lap is 374 m, still a minute). In the
loop the track's right stays the loop's side, so the train, its riders and
the ride camera turn right over; its top is held up by a leaning pair of
legs from either side, clear of the train inside.

Four more rides stand round the coaster, each in its fenced yard with a
named gate and an attendant (`core/park-yards.js`), off biscuit walks from
the main one (`SPURS` in `park-island.js`): the Rainbow Wheel by the
bridge, the Lollipop Drop between the long run and the helix, the Sugar
Swing in the coaster's north-west loop (in under the airtime hill) and the
Macaron Gyro Swing south of the middle (`core/park-gyro.js`: a ring of 16 seats
on a long arm that swings up past level between two A-frames). Which rides
are where is `ISLAND_RIDES` / `UNDER_RIDES` in `park-rides.js`; the pirate
ship, carousel, teacups, train and log flume stay in the room below. The
coaster's station loop is still free for one more. `tests/coaster.test.mjs`
checks the track is on the island, the only way off is the bridge, every
ride's gate is a walk from it and nothing that moves comes within 2 m of
the track; `tests/themepark.test.mjs` checks the island lies on the map's
island.
