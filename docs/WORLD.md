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
  street and the maps): the north bank from Mangwon to Seongsu and from
  Ttukseom to Jamsil Bridge, and the south bank from Yeouido (across the
  Saetgang, whose blockers have a gap for it) to Banpo-Jamwon park and on to
  Jamsil Bridge, open through the closed land. `node scripts/build-bike-paths.mjs`
  writes them on OpenStreetMap's real cycleways at 1/4
  (`scripts/data/han-bike-osm.json`); run `build-closed.mjs` after it.
  Where the game had no real bank (Apgujeong, east of Ttukseom),
  `scripts/bike-bank.mjs` draws the bank a fixed distance from the real bike
  path; run `build-seongsu.mjs` before `build-bike-paths.mjs`.
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

## Gangnam Station (2026-11-24)

`districts/gangnam.json` (`node scripts/build-gangnam.mjs`, then
`build-base.mjs` and `build-closed.mjs`): Gangnam-daero on its real line at
1/4 from the Gangnam Station crossroads north past Sinnonhyeon to Nonhyeon
Station (461 m in the game), with the first stretch of Teheran-ro,
Seocho-daero, Bongeunsa-ro, Sapyeong-daero, Hakdong-ro and Sinbanpo-ro; the
base map carries them on. Data: `scripts/data/gangnam-osm.json` (the middle
line between each road's two carriageways, from the Korea extract).

- It was built to spread shops out, not to add any (Yozi): the two cosmetic
  clinics came from Seongsu, three clothes shops and four furniture showrooms
  from Euljiro, the appliance mart from Samseong. `GROUPS` in the script says
  which shop stands where; a moved shop's `why` says where it came from.
  `build-seongsu.mjs` lists them in `MOVED_AWAY` so it no longer places them.
- Shops stand in three places only: the crossroads (big screens, clothes, the
  appliance mart), the avenue by Sinnonhyeon (clinics) and Hakdong-ro east of
  Nonhyeon Station (the real Nonhyeon furniture street). The rows between are
  plain offices.
- Only Gangnam Station (Line 2, exits 10 and 11) has stairs and trains.
  Sinnonhyeon and Nonhyeon are names on the map.
- The six big screens are `region.json` "screens" lines marked
  `[build-gangnam screen]`; the script rewrites them and the station's exits.
- A `links` road fills Teheran-ro between Yeoksam and Seolleung, which is
  over 200 m from any district and so not in the base map.
- Apgujeong (Dosan Park, the way down to the Han) is the next step, not built.

## The base map: all of Seoul's big roads (2026-11-14)

Under the hand-built districts lies one base layer,
`public/regions/another-seoul/base.json` (`region.json` "base"), made from a
single OpenStreetMap pull of Seoul instead of a snippet per district:

- **Roads**: primary and secondary roads only (no expressways, tunnels or
  small streets), at 1/4 on the Seoul grid, 14 m and 10 m wide. A two-way road
  drawn as two lines in OSM is one road here. A base road stops where a
  district already has that road, at buildings, hills and the city wall, and
  is joined to a district road end within 45 m.
- **Water and green**: the Han beyond the districts, the streams, big parks
  and woods, as flat colours. They stop 12 m short of every district's box.
  Parks and woods are in their own file (`base-green.json`, "baseGreen") and
  are fetched a moment after the street is up (`game/base-green.js`): they
  are a colour only, so the start doesn't wait for them.
- **Decks**: where a road is over water you walk on a deck
  (`CollisionMap.addDeck`); it is the road painted over the river, not a
  modelled bridge yet.
- **Closed land** (`scripts/build-closed.mjs`): every gu now. Roads are open,
  the blocks between them are grey and can't be walked into. Stored as one
  bit per 10 m square (`core/closed-grid.js`), not as a list of rectangles.

**Only near what is built**: within 200 m (`REACH` in
`scripts/build-base.mjs`; 800 m real) of a district's box. Farther land has
no base roads or green and is all closed, in every gu; rivers are kept
whole, and a bridge that would lead only into closed land is left out rather
than stopping mid-river. The data for the whole city stays in
`scripts/data/seoul/`: when a district is added, the next `build-base.mjs`
run brings the base round it. Raise `REACH` to open more.

To rebuild: `node scripts/city/prep-seoul-osm.mjs <extract folder>` (only when
the OSM data changes; writes `scripts/data/seoul/`), then
`node scripts/build-base.mjs` and `node scripts/build-closed.mjs`. Run the
last two after adding or moving a district, so the base makes room for it.
`tests/base.test.mjs` checks it against the OSM lines.

In the game the base is drawn in 1 km tiles (`core/world.js` `tiles`) so only
the squares in view cost anything, and walking routes use a 1.4 km grid round
the walker (`core/nav-window.js`); farther goals go by the road graph.

Known gaps: no buildings, stations or names outside the districts; bridges
are flat; small seams remain where the base Han meets the districts' river;
parks are a colour only (and closed).

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
east end. Across the river (`scripts/data/mangwon-river-osm.json`,
OpenStreetMap, only to look at): the real south bank with Yanghwa Han River
Park, Seonyudo (a hole in the water area: an area's `holes`), and Seongsan
Bridge (west, red arches) and Yanghwa Bridge (east, over Seonyudo's end, one
arch) on their real lines at 1/4 (`banpobridge` landmarks, within 5 m),
starting high over the park from Gangbyeon-buk-ro with no piers on it.
The park's sunset steps (`steps` with `sunset: true`) face Seongsan Bridge:
sitting there turns the camera to the sunset and says how long until it
(`src/game/sunset-spot.js`). The sunset itself is the whole city's
(`src/core/sunset-sky.js`, run by weather.js): from 16:30 game time a sky
dome fades from the haze at the horizon to deep blue, with a glow and the
sun's disc going down due west a little south (behind Seongsan Bridge from
the steps; it comes up in the east), a path of light on the river (added to
the water's material) and the light swung low and warm. Each game day has
one of four sunsets (`SUNSETS`: purple with streak clouds over an orange
band, yellow with big golden clouds, pink (the first, clear and warm), and
orange with a big red sun in a banded sky), shuffled every four
days and the same for everyone (`sunsetLook`; `?sunset=0..3` picks one). The
weather is always clear from 10 minutes before the sunset until its glow has
gone (`sunsetClear` in `src/core/weather-roll.js`, for now). Every park's fishing spots share one catch table
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
  alley, animal cafés and desserts down the walking street, the sauna, gym
  and yoga on Wausan-ro, Korean restaurants on Jandari-ro.
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

## Banpo and Jamwon Han River Parks (Seocho-gu)

`scripts/build-banpo.mjs` draws `districts/banpo-jamwon.json`: Banpo Han
River Park (`banpo-hangang`) at the south end of Banpo Bridge, and Jamwon Han
River Park (`jamwon-hangang`) next to it upstream, as the real parks lie
(OpenStreetMap: Banpo's ends ~140 m east of the bridge, where Jamwon's begins
and runs on past Hannam Bridge). The district is L-shaped round Itaewon's
corner (`meta.parts`). The river, the banks and the bridges are on their real
lines at 1/4 (OpenStreetMap, water[1] from `scripts/han-bank.mjs`). Near
Banpo Bridge the bank runs straight at right angles to it, so Banpo's park
is drawn in the bridge's frame (u along the bank, v inland). West of the
bridge the real bank turns into the bay where Sebitseom floats; Moonlight
Square stands out over it on a terrace (up to 16 m off the real bank) so its
steps and food trucks keep a straight bank facing the fountain.

Jamsu Bridge, the low deck you walk on, crosses on Banpo Bridge's line from
the north bank's bike path: the river's blocker has a gap for it, and the
`jamsu` landmark draws its kerbs, railings and lamps (its middle is `BRIDGE`
in `src/core/rainbow-fountain.js`). Banpo Bridge overhead is its own
`banpobridge` landmark (`src/core/banpo-bridge.js`), the whole real bridge
at 1/4 (371 m) with a ramp down at each end; its north ramp keeps Jamsu
Bridge's width where Itaewon's houses stand close, and the link road ("To
Banpo Bridge", down Noksapyeong-daero's real line from Itaewon) runs beside
the ramp and goes in under the deck once it is high. The Moonlight Rainbow
Fountain's jets (`src/core/rainbow-jets.js`) cover the river under it
(164 m; the real fountain at 1/4 would be 285 m, longer than the game's river
is wide there). Dongjak Bridge downstream is a `banpobridge` too, only to look
at for now (Line 4's viaduct line, its arches and the track).

Both parks are laid straight on the street, with no room or door: each
`hanpark` landmark (`PARK` and `JAMWON` in the script) says where everything
goes, in the park's own frame (x along the bank, z inland from the bank's
edge). `src/core/han-park.js` builds what the map can't draw, and
`src/game/han-parks.js` sets it on the street the first time you come near.
- Banpo: Moonlight Square at the foot of Banpo Bridge, with stone steps
  facing the rainbow fountain, the night market's food trucks and the
  convenience store under the bridge; east of the bridge the fishing pier,
  the fish buyer, the duck boat dock and an open lawn. Its ★5 legend is the
  blobfish (Yeouido's kinds came here: `PARK_FISH` in `src/core/fishing.js`).
- Jamwon: a plain riverside park on the real park's outline (Yozi: lawn,
  path, trees and people), the bike path along the bank, a picnic lawn, a
  fishing pier and the fish buyer. Its ★5 legend is the manta ray.

## Itaewon and Gyeongnidan-gil (Yongsan-gu)

`node scripts/build-itaewon.mjs` draws Itaewon at 1/4 on its real streets
from OpenStreetMap (`scripts/data/itaewon-osm.json`, from the itaewon-namsan
export, and `scripts/data/gyeongnidan-osm.json`; © OpenStreetMap
contributors, ODbL): Itaewon-ro from Samgakji past Noksapyeong and Itaewon
Station to Hangangjin (about 630 m), Noksapyeong-daero south to the road to
Banpo Bridge, Bogwang-ro and Usadan-ro south of the station, Sinheung-ro up
through Haebangchon, Sowol-ro round Namsan's foot and Seobinggo-ro along the
south. Until 2026-11-11 Itaewon was hand-made: about 1.4 times too wide and
mirrored east to west (Noksapyeong-daero drawn east of the station, Bogwang-ro
and Usadan-ro west of it).

- **Made up, inside the real blocks**: the World Food Street lane north from
  Itaewon-ro (it carries on up as Hoenamu-ro 26-gil to Gyeongnidan-gil),
  and Yongmaru Market's lane north from Itaewon-ro (west of exit 1, up to the
  foot of Gyeongnidan's hill) with its arcade. Every building and shop is fictional; buildings are a
  normal size, one row along each street (`scripts/street-rows.mjs`).
- **Where things are**: every shop is north of Itaewon-ro or up
  Gyeongnidan-gil (Yozi 2026-11-11: the south side isn't needed). The
  restaurants and the halal grocer on the World Food Street, the market
  between it and the station, the clubs and bars in the club alley
  (Itaewon-ro 27ga-gil, behind the first row of Itaewon-ro's shops; on its
  real line but 9 m further north, because the game's Itaewon-ro is twice
  its real width), and the clothes, books and antiques up
  Gyeongnidan-gil. South of Itaewon-ro there are only the real roads
  (Bogwang-ro, Usadan-ro) with plain buildings. Itaewon Station's exits 1 and 4
  stand on the pavements 7-10 m from the real ones.
- **Open land**: west of Noksapyeong-daero and south of Itaewon-ro is the old
  army ground (Yongsan Garrison, becoming Yongsan Park): grass, no houses.
- The script also moves the shops' doors, the station's exits and the ends
  of the link roads (Itaewon-ro east, Sowol-ro north-west round Namsan to
  Sungnyemun, where Toegye-ro now starts, Sopa-ro's end on it, and the road
  to Banpo Bridge). It can be run again; it keeps Namsan (`ns`) and the
  museums (`ym`).

### Gyeongnidan-gil

Gyeongnidan-gil (경리단길) is Hoenamu-ro, the street people call
Gyeongnidan-gil, from its real foot on Noksapyeong-daero up to where
Hoenamu-ro 35-gil leaves it, about 160 m (650 m in Seoul).

- **Simple like the other neighbourhoods.** Only three lanes are kept
  (13-gil and 35-gil up to Sowol-ro, 26-gil down towards Itaewon-ro), and the
  buildings are one row along each street, at normal size; the blocks
  behind are left open. The real tangle of lanes, drawn 1:1, read as too
  busy next to the rest of the city. Seven of Itaewon's own places are up the
  street (an old-style café, two clothes shops, a vintage shop, books,
  antiques and the taproom); there are no new shops.
- **The hill.** The street climbs gently, about 5 m to the top; the lanes
  north climb a little and then ease back down before Sowol-ro, which stays
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

## Myeongdong and its cathedral (Jung-gu)

`scripts/build-myeongdong.mjs` builds `districts/myeongdong.json` from
OpenStreetMap (`scripts/data/myeongdong-osm.json`, Yozi's export of
2026-11-11). Its anchor is the middle of the cathedral's main hall.

- **Streets** on their real lines at 1/4: Samil-daero (east) and Namdaemun-ro
  (west, on to Sungnyemun's ring road by a short link), the shopping street
  north-south through the middle (Myeongdong 9-gil, 2-gil and 8-gil in OSM),
  Myeongdong-gil across it to the cathedral's front yard, and Myeongdong
  10-gil up from Myeongdong Station. Eulji-ro and Toegye-ro are the links
  north and south.
- **Buildings**: one row along each street (Yozi 2026-11-10); offices and
  hotels on the big roads, small shops on the lanes. The skincare and
  lip-tint shops that stood in for Myeongdong in Seongsu moved here
  (`SHOPS`); the Information Center is by the real tourist information
  centre on the shopping street.
- **Myeongdong Cathedral**: its grounds at 1/4 (the real outline, paved),
  the church at 50% of the real one (Yozi 2026-11-11, like Gwanghwamun): 34 m
  long, 14.5 m across the front, 23 m to the top of the cross. Its middle is
  the real main hall's, turned like it: bell tower north-north-west onto the
  front yard, apse south-south-east. The model (`src/core/cathedral-model.js`,
  sizes in `src/data/myeongdong.js`) loads with `import()` when the city is
  built. Stamp and board on the front yard.
- **Inside the cathedral** (stores.json `myeongdong-cathedral`, `front:
  "landmark"`: a ring at the bell tower's door, no shop sign): a made-up nave
  (`src/core/cathedral-hall.js`, room `cathedral`, loaded with the rooms):
  stone columns, stained glass, a ribbed vault, the sanctuary with the altar,
  the lectern and the apse windows, the organ loft over the door. 96 places
  on the pews; some have people, the rest are seats. A simple Mass
  (`src/core/cathedral-mass.js`) runs on the real clock, so everyone sees the
  same moment: the procession up the aisle, the greeting, a reading, the host
  lifted, the sign of peace, the blessing, the procession out, then a pause.
  Speech bubbles are small pictures only. The organ is the hidden track
  `organ` in `src/data/tracks.js`: an original chorale played live with Web
  Audio (no file, no words), quiet, about 70 s. Walking only inside (Yozi
  2026-11-11): running turns into a walk and gets a "shh".

## Seoul Station (Jung-gu)

`scripts/build-seoul-station.mjs` builds `districts/seoul-station.json` from
OpenStreetMap (`scripts/data/seoul-station-osm.json`, Yozi's export of
2026-11-12). Its anchor is the middle of the old station building. Sizes in
`src/data/seoul-station.js`; the models (`src/core/seoul-station-models.js`)
load with `import()` when the city is built.

- **The old station** (Culture Station Seoul 284) at 37.5% of the real one
  (Yozi 2026-11-12): a symbol to take photos of, between the 1/4 map and the
  50% landmarks. Its OSM outline grown 1.5x about its middle, so 52 x 10.5 m.
  Red brick over a stone ground floor, white bands, slate roofs, curved
  gables on the end pavilions, the arched front with the clock and three
  doors, two small domed towers and the green dome. Heights from Yozi's
  photos. The main block is symmetric about the arch (the photo); what OSM's
  outline has past it at the north end (about 9.5 m) is drawn as a lower
  wing. The back has the same walls, windows and roof; the arch, clock and
  doors are on the front only.
- **The glass station hall** at 1/4 on its real outline: glass walls, the
  "서울역 Seoul Station" sign in a stone box on the roof at the north end of
  the glass front with a blue strip under it, the rotunda, the wide steps
  down to the plaza and the round pillar in front of them (white, red ring,
  blue band, dark drum head; Yozi's photo). The Information Center kiosk is
  tucked in south of the hall's east wing.
- **Seoul Square** at 1/4 (23 storeys, 22.8 m); its whole west front is a
  media wall (region.json `screens`, "WELCOME TO 서울 SEOUL"; ads can go there
  later).
- **Streets**: Hangang-daero, Sejong-daero (north to Sungnyemun's ring) and
  Toegye-ro on their real lines; they meet at the station crossing where OSM's
  lines stop short. The plaza between the old station and Hangang-daero; the
  tracks behind are closed off with a fence.
- **Arrival start** (`spawn.starts` `arrive`, the fifth start): on the plaza
  at the foot of the hall's steps, as if just off the airport train, facing
  Seoul Square with the old station on the left. Subway exits 1 and 2
  (Line 1); exit 1 is 7.6 m east of the real one to keep the steps clear.
- Next (separate change): Seoullo 7017 as a walkway, length 1/4, width 2x.

## Namsan and its cable car (Yongsan-gu / Jung-gu)

`scripts/build-namsan.mjs` puts Namsan on its real place from OpenStreetMap
(`scripts/data/namsan-osm.json`) and writes it into `districts/itaewon.json`
(items marked `ns`), the cable car's door in `stores.json` and the Sopa-ro
link in `region.json`.

- **The hill**: its top, with the look-out tower, on N Seoul Tower's real
  spot, 56 m high (its relief at 1/4; it was 65 m, see the city wall section below). Its foot (380 × 320 m) fits between Sopa-ro
  and Sowol-ro on the west, Namsangol Hanok Village on the north and
  Itaewon's real Sowol-ro on the south (the south side was pulled 10 m in so
  the hill doesn't cover the road; `scripts/build-itaewon.mjs`); real Namsan
  runs on further east to Beotigogae.
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

## Itaewon's museums (Yongsan-gu)

Both stand on their real places (OpenStreetMap) at the real 1/4, site and
building: both are seen mostly from inside (Yozi 2026-11-11: "부지랑 박물관
전부 4분의1로"). Items are marked `ym`; `scripts/build-itaewon.mjs` keeps them.

- **War History Museum** (the real War Memorial of Korea): the site at 25%
  round the main building, which stands on the real main hall (35 m wide);
  heights 25%. The plaza in front reaches Itaewon-ro.
- **National Central Art Museum**: a made-up museum on the real National
  Museum of Korea's spot (not modelled on its building). The 100 m building
  is the size of the real one at 1/4; its grounds run from it down to the real
  Seobinggo-ro, and the Art Museum Way comes up from Seobinggo-ro to the door
  on its south side.

## Samseong-dong (Gangnam-gu)

Samseong Station (Line 2) on the corner of Teheran-ro and Yeongdong-daero,
drawn by `scripts/build-samseong.mjs` (`districts/samseong.json`). Teheran-ro,
Olympic-ro, Yeongdong-daero, Bongeunsa-ro, Samseong-ro and Tancheon are the
real OpenStreetMap lines at 1/4 (`scripts/data/samseong-osm.json`), within
3 m (Yeongdong-daero 6 m from each carriageway). The streets slant: the whole
grid is turned 21.5° (Teheran-ro runs east-north-east), so the buildings and
KONEXT are laid out in that grid and turned with it. Asem-ro, KONEXT's west
side, is 88 m west of Yeongdong-daero; Teheran-ro turns into Olympic-ro and
crosses Tancheon on Samseong Bridge where the real road does. KONEXT stands
on the real exhibition centre (52 x 82 m on its 59 x 87 m), and the other
buildings are made up, one row along the streets; heights stay real. (It was
a straight cross, up to 78 m off the real roads, before 2026-11-11.) The block north-west of the corner is KONEXT, a
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
like Banpo's (`PARK` in the script, `game/han-parks.js`), west to east
the boat dock by the Information Center, the night market's stalls round
Mul-bit Square's shallow pool by Yeouinaru Station, the open fireworks lawn
with no trees (`lawn: true`) and the corner towards the 63 tower (a pier to
look out from, the kiosk with its ramen machine). No fishing: the real park is
a no-fishing area, so its fish went to Banpo (`PARK_MOVED` in
`src/core/fishing.js` carries each player's legend count across); the Han River path,
Yunjung-ro (Yeouiseo-ro) with cherry trees that are only pink in spring
(`blossoms` with `seasonal`), the real street grid with plain office towers
in its blocks, Yeouido Park, the National Assembly at the west end, and the 63
tower at the east end (a blocker and a landmark, not walkable; 7 m west of its
real spot so Yeouidong-ro passes it). The island is about 850 x 440 m, as the
real one is at 1/4. The park's ★5 legend is the blobfish. Mapo and Wonhyo
Bridges (base map decks) land on the park's shore: the park's railing is left
open where a deck crosses it, and its lamps and benches are kept off the deck
(`clearBridges` in `game/han-parks.js`, for every street park). Run the script
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
Elsewhere one row of buildings along each street.

**Namsangol Hanok Village** is a part of its own south of Toegye-ro by
Chungmuro, added by `scripts/build-namsangol.mjs` (run after
`build-euljiro.mjs`, then `build-closed.mjs`). Redrawn 2026-11-24 on its real
ground at 1/4 from OSM (`scripts/data/namsangol-osm.json`): 58 x 88 m, the
gate on Toegye-ro 34-gil, Cheonugak and its plaza, the five hanok in the
north-east, Seoul Namsan Gugakdang, the stream down the west side, Gwaneoji,
the folk games yard on the real folk games ground (the `folkyard` landmark,
docs/FOLK-GAMES.md), the Time Capsule Plaza and Mangbungnu. Before that it was
a 104 x 55 m box at game size with five invented hanok.
Not at 1/4: the hanok are game size (5-8 m, each within 3 m of its real
middle), the Gugakdang is one hall, the folk yard is 24 x 14 m (the real
ground is 9 x 9 m at 1/4). Marked `approx`: Cheonghakji pond (not in OSM),
the straightened outer wall, the three paths and the four woods.
`tests/namsangol.test.mjs` keeps these numbers.

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

## Naksan and the Seoul City Wall (Jongno-gu)

`scripts/build-naksan.mjs` puts Naksan (낙산) and its stretch of the Seoul
City Wall (한양도성), from Heunginjimun up over the hill to Hyehwamun, into
the Dongmyo district (`districts/dongmyo.json`, items marked `nk`, a second
`meta.parts` box), the way Namsan is part of Itaewon's map. Run it after
`build-dongmyo.mjs` (which keeps the `nk` items).

- **The wall** is OpenStreetMap's line at 1/4 (`scripts/data/naksan-osm.json`,
  export of 2026-11-13), with its real gaps: by the top of the hill, where
  the paths go through, and where Changgyeonggung-ro cuts it just south of
  Hyehwamun. Sizes (Yozi, 2026-11-13): 50% high on its outer face (about
  3.5 m) and chest high (1.3 m) from inside, where the ground is higher, as
  on the real Naksan; the parapet's blocks (여장) stand on its outer edge.
  Its blockers are ordinary map blockers.
- **The hill** is `meta.ridge` (`src/core/ridge-ground.js`): the ridge's
  height along the wall's line, falling off to 0 either side, with the
  ground at the outer foot `step` lower. Its top is 23 m (Naksan's 125 m
  above the sea, less the plain, at 1/4), level by Jongno and Hyehwamun.
  The heights are a game approximation, not a survey.
- **Paths**: one outside along the wall's foot (the famous view of the wall
  with the mountains behind) and one inside along the top (roads, `k: walk`,
  `hill: 1`, kept clear of the wall). A row of small houses along each
  (Ihwa-dong and Changsin-dong; fictional).
- **Hyehwamun** at 43.75% of its OSM outline (5.1 x 3.3 m), on its real
  spot: between the small gates' 37.5% and the great gates' 50%, so you
  walk through its arch (1.2 m wide, 1.5 m high; its proportions are an
  approximation from photos) and it stays smaller than the great gates
  (Yozi, 2026-11-13).
- **Loaded when near.** The ground, the wall, the gate, the paths' paving,
  lamps, woods and walkers are `src/game/naksan.js`, loaded with `import()`
  within about 480 m (`src/game/naksan-near.js`) and hidden past 700 m.
  About 24k triangles and 24 draw calls.
- **On the map**: Naksan Park is a pin (landmark `naksanpin` with a label,
  like Olympic Park's Lone Tree), and the map's search finds it
  (`src/game/landmark-search.js`).
- `tests/naksan.test.mjs` keeps the wall on the real line, Hyehwamun on its
  spot, and the rest of the city's streets and buildings off the hill.

## The Seoul City Wall on Namsan, and Gwanghuimun

`scripts/build-namsan-wall.mjs` (run after `build-namsan-real.mjs --trail`)
puts the wall from Namsan's west slope over the summit and down through
Jangchung-dong to Gwanghuimun, and its trail from Baekbeom Square, into
Itaewon's map (items marked `hw`, and the namsan landmark's `wall` and
`wtrail`) and, east of Itaewon's box, Euljiro's (with a `meta.parts` box).

- **The wall** is OpenStreetMap's line at 1/4 (`scripts/data/namsan-wall-osm.json`,
  export of 2026-11-13), with its real gaps: OSM has none up the west slope
  from Baekbeom Square, none across Jangchungdan-ro by the National Theater
  and little between Jangchung-dong and Gwanghuimun. It also opens round the
  summit plaza and where a trail goes through it. 50% high (about 3.5 m;
  Yozi, 2026-11-13), on the hill's ground. On the hill it needs no blocker
  (the hill is one); off it, it has ordinary blockers.
- **The trail** (남산 성곽길) is OSM's 서울한양도성 남산구간 ways from Baekbeom
  Square up to the summit plaza and down to Gwanghuimun (the outside way
  where there are two), about 1.2 km. On the hill it is decks through the
  hill's blocker (`game/namsan-walk.js`) drawn on the slope
  (`core/landmarks.js`); off it, a walk road with a strip of park. East of
  the summit it shares the summit trail from Sowol-ro. Both are kept off the
  wall.
- **The way up**: Namsan is 56 m high, its relief at 1/4 (262 m above the
  sea, about 225 m above the city round it; it was 65 m, the height above
  the sea / 4). The hill's west side is short in the game (its foot is
  pulled in for the streets) and lumpy, so the trail up from Baekbeom Square
  climbed at up to 45°. Now the ground along each way up (this trail and the
  one from Sowol-ro) is eased, within 30 m of it, to an even climb from the
  foot to the summit plaza's edge (the namsan landmark's `spur`,
  `core/namsan-shape.js`): about 18-21° at the steepest (Yozi, 2026-11-13).
  The test keeps every trail under 22° and the plaza level.
- **Gwanghuimun** at 43.75% like Hyehwamun (Yozi, 2026-11-13), 5.1 x 3.3 m
  (OSM has no outline: its real size is taken as Hyehwamun's), on its real
  spot moved 5.7 m along the wall off Toegye-ro; you walk through its arch.
  Euljiro's made-up buildings there were narrowed to make room (Seoul Bank's
  door moved with its front).
- **Sungnyemun** is at 50% like Heunginjimun (`sc: [0.5]`, base 14 x 6 m;
  `scripts/build-euljiro.mjs` SUNGNYEMUN_SCALE), its wall stubs at
  Heunginjimun's 60%.
- **Loaded when near**: the wall, the gate and the woods off the hill are
  `src/game/namsan-wall.js` (with the Naksan wall's parts,
  `src/game/city-wall-parts.js`), loaded within about 480 m and hidden past
  700 m. About 22k triangles.
- `tests/namsan-wall.test.mjs` keeps the wall on the real line, the trail
  walkable end to end and off the wall, and both gates' arches open.

## Inwangsan, Bugaksan and the rest of the ring

`scripts/build-north-wall.mjs` puts Inwangsan (인왕산) and Bugaksan (북악산)
with the Seoul City Wall on their crest, Changuimun and Sukjeongmun, and the
lost wall's line downtown into `districts/gyeongbokgung.json` (landmark
`northwall`, items marked `bw`). It replaced the old cone `mountain` behind
the palace, which was not on the real hills.

- **The wall** follows its OpenStreetMap ways (`scripts/data/north-wall-osm.json`)
  at 1/4, from Sajik-ro up over Inwangsan, through Changuimun, over Bugaksan
  past Sukjeongmun to Waryong Park: about 1.76 km in 7 stretches, with the
  real gaps (Changuimun's road, the city east of Waryong Park). Same body and
  parapet as Namsan's (`thick` 1.4, `H` 3.5).
- **The hills' height** (`core/north-ground.js`) is a ridge along the wall,
  heights from the real ones above the plain at 1/4 (Inwangsan 76, Bugaksan
  77, Sukjeongmun 52 m), but the game's Gyeongbokgung map is bigger than the
  real palace and reaches within 10-90 m of the wall. So the city's boxes
  stay flat and the ground rises from them no steeper than `k` (about 28°),
  and along the wall the crest climbs at most `grade` (about 14°): the hills
  are low on the palace side and high outside, about 54 m at the top
  (Yozi chose this, 2026-11-13). The wall is never steeper than about 21°.
- **Changuimun and Sukjeongmun** at 43.75% like Hyehwamun (Yozi, 2026-11-13),
  5.1 x 3.3 m, arches walkable. Sukjeongmun is on its OSM building; Changuimun
  (no OSM gate) is at the wall's gap where its road crosses.
- **Where the wall is gone** downtown, from Sajik-ro past Donuimun's and
  Sowuimun's sites towards Sungnyemun: a line of dark stones in the ground
  (`marks`, 1.2 m wide, about 500 m) and a marker stone at each site (`sites`).
  Donuimun's is moved 20 m off a building; Sowuimun's spot is approximate
  (not from OSM).
- **Loaded when near**: `src/game/north-wall-near.js` loads
  `src/game/north-wall.js` (ground grid, wall, gates, woods in 120 m tiles,
  the stone line) within about 480 m; hidden past 700 m. It adds about
  40-45k triangles to a frame looking over the hills.
- `tests/north-wall.test.mjs` keeps the wall on the real line, its slope
  under 22°, the ground under 32°, the city flat, the gates open and the wall
  closed elsewhere.

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
terraces with the rank stones, Gyeonghoeru and Amisan have
their own (Hyangwonjeong: `core/palace-garden.js`, below); all other halls are one merged `palacehalls` landmark and all the
corridors one `cloister` (a few draw calls for the lot). Each ring of
corridors gets a door on its middle line (OSM draws most gates as part of
the corridor), and the script checks that every hall and yard can be walked
to from Gwanghwamun (`--check`, also a test). The royal procession keeps
to Geunjeongjeon's court (the 30% gates are too narrow for it two abreast).
Inside the wall the camera drops and looks up (`game/palace-view.js`), more
so in the courts, until the player steers it. Visitors in rented hanbok
stand about the courts (`PALACE_VISITORS`, core/palace-show.js).

### The palace's green and Hyangwonjeong (Yozi, 2026-11-26)

The lawns, woods and trees inside the wall come from OSM too
(`scripts/extract-gyeongbokgung-grounds.mjs` cuts them out of a Korea extract
into `scripts/data/gyeongbokgung-grounds-osm.json`;
`scripts/lib/palace-grounds.mjs` lays them out, drawn by
`core/palace-garden.js`, which is downloaded when you first walk in):

- **Real:** the lawns (`grass` areas) and woods (`park` areas) on OSM's
  outlines, cut back from the ponds and paved yards; the trees OSM maps one
  by one (the first `real` entries of the `palacetrees` landmark: the willows
  round Gyeonghoeji, the pines on its islets); Hyangwonjeong, the pond,
  Chwihyanggyo's line to the north bank and Yeolsangjinwon spring.
- **From a satellite photo** (`scripts/data/gyeongbokgung-canopy.json`):
  where the trees are. Yozi sent a satellite capture (2026-11-26); its dark
  green pixels were laid on the map (Gwanghwamun, the corridors and the
  ponds line up to about 1 m) and kept as 1 m cells. The made-up trees are
  thrown onto those cells, so the clumps and the open ground are the real
  ones (the ring round Hyangwonji, the groves west of the ponds, Noksan).
- **Made up** (marked `approx`): each of those trees' own spot, kind and
  height; the lotus leaves; the size of Gyeonghoeji's islets; the shrubs on
  Hyangwonjeong's island; and the two rectangles of lawn the fan dance and
  the royal procession use (`SHOW_LAWNS`, Yozi 2026-11-10; OSM has packed
  earth and a grove there, and no tree is planted on the king's lawn or in
  the dancers' ring). The south bank in front of Hyangwonjeong is kept open.
- Trees keep off buildings, yards, water, the shows and the visitors. They
  are one `palacetrees` landmark of instanced meshes (a draw call per shape:
  round, red pine, maple, willow, ginkgo, bush), not the city's street trees
  (those are capped city-wide). Kinds are told apart by shape; pines stay
  green, the rest take the season's colours (`core/season.js`).
- A tree is a quarter of its real height, like the buildings (Yozi
  2026-11-26: "buildings are 1/4 and trees have no rule; always only tall
  trees"). `TREE_REAL` (`scripts/lib/palace-grounds.mjs`) is how high each
  kind grows in real metres: broadleaf 8 to 13, pine 7 to 11, maple 4.5 to 7,
  willow 8 to 11, ginkgo 10 to 14, shrubs 1.5 to 2.6 (typical figures, not
  measured tree by tree). Trees at a clump's edge are 15% lower, about one in
  five inside a clump 25% higher, and the old trees OSM maps one by one 20%
  higher. In the game that is 1 to 4.1 m, half of them under 2.2 m. This rule
  is the palace's only; the city's street trees are as they were.
- **Hyangwonjeong** is a two-storey hexagonal pavilion with green lattice
  doors in red frames, on three courses of stone. It is 60% of the real one
  across and 54% high (`HYANG_SC`), bigger than the palace's other halls:
  it is what you come to this pond to see. (It was 37.5% across for a day so
  the island would not look full, then 50%; Yozi, 2026-11-27: "too upright
  and small", then "a little bigger, the island a little smaller".) The
  island is 5.4 m in radius (OSM: about 4 m at 1/4), 1.6 times the roof (in
  Seoul two and a half times), with a low fence, a walk of packed earth
  inside it, turf round the pavilion, shrubs and steps down to the water.
  Chwihyanggyo, white with crossed slats in its railing, is 1.5 m wide
  (0.4 m at 1/4) and 4.8 m long, so you can walk over its arch to the
  island: the pond's blocker has the island and the bridge cut out of it,
  and `isleHeight` (`core/temple-terrace.js`) lifts your feet. In Seoul the
  bridge is usually shut to visitors. The ponds have a dressed-stone kerb
  (`pondbank`).
- No two colours on one plane. A hall's red dado is a box under the wall's
  box, not inside it; beams are a little shorter or deeper than what they sit
  on; flat layers lie 4 cm apart. Where two faces of different colours share
  a plane, which one is drawn changes pixel by pixel as the camera moves
  (Yozi saw the walls flicker, 2026-11-27). `tests/palace-flicker.test.mjs`
  checks every side face of the palace's buildings.
- The palace's surfaces are small canvases drawn once (`core/palace-paint.js`,
  nothing to download): roof tiles in rows, the painted beam under the eaves
  (단청), lattice doors (창살), dressed stone in courses and plaster. A box of
  one of those colours gets the texture with its UVs in metres, so a tile or
  a stone is the same size on every building. Changdeokgung, Deoksugung's
  Daehanmun, Bongeunsa, Jogyesa and the Blue House's roofs use the same parts
  and get it too; the city's gates (Sungnyemun, Heunginjimun, and the small
  ones: Hyehwamun, Changuimun, Sukjeongmun, Gwanghuimun) have their own
  models and wear the stone, plaster, beam and tiles through `paintedBox` and
  `faceUV`. Jongmyo, Bosingak, the royal tombs and Bukchon's hanok do not. A
  textured material is marked `userData.metres` and merged like the plain
  ones (`mergeStatic`, bukchon-models.js), so the draw calls are what they
  were (`tests/palace-paint.test.mjs`). The patterns are drawn by hand, not
  copied from one building's real paintwork.
- A pattern is symmetric: the painted beam and the lattice door take a whole
  number of repeats on every face (`whole` in palace-paint.js), and a hall
  has one door box a bay, between its posts, never one long door behind
  them. A name board is a plank hung in front of the bracket course, tipped a
  little forward (`hang`, palace-model.js): set back behind the brackets it
  looked sunk into the band (Yozi, 2026-11-27).
- Stone you walk on lifts your feet: the throne hall's two terraces and their
  steps, a big gate's base and Yeongjegyo's deck (`palaceHeight`,
  core/temple-terrace.js), and a small gate's base. The terraces are walled
  along their edges (`terraceEdges`, scripts/lib/palace-plan.mjs), open only
  at the front steps, so nobody pops 0.8 m up through a railing; Amisan's
  flower beds are a blocker. The real terraces also have steps at the sides:
  those are not built. `tests/palace-walk.test.mjs`.
- The plan untangles what OSM overlaps (`planPalace`: `ownSolid`, `LONG`,
  `dedupe`, `gateBays`): a corridor or a hall is cut back where it enters a
  gate that has a model of its own, a long thin "building" is a corridor, a
  building mapped twice is drawn once. A small gate (`'g'`) is walked through
  across its short side, so one mapped longer front to back is turned a
  quarter (Yuhwamun, Geonchunmun, Changdeokgung's Jinseonmun and
  Sukjangmun open east-west); its middle bay is open with plank doors folded
  back, and in a gate of three bays the side ones are shut. Halls and the
  plain blocks have posts, a lattice door in every front bay and a window in
  every other one (the windows and the blocks' doors are made up: OSM has only
  the footprint).

## Cheong Wa Dae from the street (Jongno-gu)

Cheong Wa Dae is the president's office again (since 2025-12-29), a security
facility, so it is built to be looked at from the street only (Yozi,
2026-11-23): the fountain plaza, Sarangchae, the main gate and the main hall
behind its lawn with Bugaksan's woods round it. No guard posts, nothing of the
inside, and the fence shuts the grounds all round (a test floods from the gate
and checks the lawn and forecourt can't be reached). Coming up to the gate a
note says visitors can't go in (`game/cheongwadae-note.js`, key
`cheongwadae.note`), and an info board in the gate recess says the same.

`scripts/build-cheongwadae.mjs` writes it into the Gyeongbokgung district from
OSM (`scripts/data/cheongwadae-osm.json`); run it after
`build-gyeongbokgung.mjs` (`--svg F` draws an overlay). Everything it writes
is marked `cw: 1`, so it can be run again.

- On its real place at 1/4; the main hall and the gate are 50% (twice the map
  across, half the real height; `CW.HALL`), the rest 1/4.
- Hyoja-ro, Cheongwadae-ro, Samcheong-ro and Changuimun-ro are OSM's lines
  (within 10 m; game road widths push them up to about 5 m). Jahamun-ro is
  the base map's (already OSM's line); Hyoja-ro ends on it at the real
  junction. The old hand-drawn Hyoja-ro (130 m too far west, beside the real
  Jahamun-ro) and its row of blocks are gone, as is the hand-drawn
  Cheongwadae-ro; the hand-drawn x = 125 road lost the Samcheong-ro name
  (`approx`, `why`). The park round the palace stops at Jahamun-ro.
- Made up (`approx`): the lawn, forecourt and drive, Sarangchae's outline past
  the part OSM has, and one row of plain buildings along Jahamun-ro's west
  side (Seochon). How far
  things moved is in `meta.cheongwadae.moved`.
- Models: `core/bluehouse-model.js` (hall with blue tiles, gate, fence,
  fountain with its phoenix).

## Seoul City Hall and Seoul Plaza (Jung-gu)

The oval lawn, the 1926 stone hall (Seoul Metropolitan Library) and the glass
new hall behind it, with City Hall station and Daehanmun across Sejong-daero.
The whole place is 37.5% of real size (1.5 × the 1/4 map, Yozi 2026-11-24):
at 1/4 the lawn would be 17 × 21 m, too small to feel like the plaza.
Outsides only for now: no way into either hall.

`scripts/build-city-hall.mjs` writes it into the Gyeongbokgung district from
OSM (`scripts/data/city-hall-osm.json`), growing every shape from one fixed
point (`CH.real` → `CH.game`, by Sejong-daero at the plaza's north-west
corner). Run it after `build-cheonggyecheon.mjs` (`--svg F` draws the plan
over the real map). Everything it writes is marked `sp: 1`, so it can be run again.

- Because the place is bigger than the map round it, things are off their
  real spots: `meta.cityhall.moved` (lawn 15 m, new hall 18 m, old hall 11 m,
  Sogong-ro 21 m south). Sogong-ro and Eulji-ro go round the enlarged plaza
  (`approx`, `why`) and Eulji-ro is back on its real line by Namdaemun-ro,
  where the region's Eulji-ro link road now starts. Sejong-daero is the
  region's link road, on its real line.
- The real Eulji-ro, Sogong-ro and Sejong-daero 20-gil of the base map would
  cross the plaza: `meta.cityhall.noBase` keeps base roads out
  (`scripts/build-base.mjs` reads `noBase` from any district's meta).
- Made up (`approx`): the 4 m lane behind and beside the new hall, Mugyo-ro
  as a lane up to Cheonggyecheon-ro, the new hall's height (56 m real is an
  estimate), the bit of wall just south of Daehanmun.
- Deoksugung is not built: Daehanmun (50%, like the other palace gates, shut)
  and the stone wall on OSM's outline all the way round, closed against the
  plain block on the west, with trees inside. Nobody can get in (tested by a
  flood from the lawn).
- City Hall station (Line 1) has exits 4, 5 and 6 round the plaza
  (`region.json`), each within 15 m of where growing puts the real one.
  Exits 1 to 3 (Deoksugung side) are left out.
- The lawn is a picnic lawn (`lawn: 1`; `oval: 1` keeps mats inside the
  outline, `lawnFrom(p, true)` in core/picnic-mat.js). Seven people sit and
  stand on it, loaded when you come within 170 m (`game/city-hall-near.js` →
  `game/city-hall.js`) and hidden past 80 m.
- Models: `core/city-hall-model.js` (loaded by core/landmarks.js types
  `cityhall`, `oldcityhall` and `plazalawn`). Screenshots and a walk-through:
  `tests/e2e/city-hall.mjs`.
- Looks (Yozi 2026-11-24): the old hall's clock has a blue face and its door
  is under the clock tower; the new hall's two ends have the white panels
  with blue diamonds, the oval lounge is on the west end, and a small screen
  hangs low by its north corner (a made-up dusk picture, no real
  advertisement). The planting by the halls is `trees: 'low'` (bushes and
  small trees, below the old hall).
- The lawn is drawn as grass (mown stripes) with the Korean peninsula in
  lighter grass, north towards the halls (`plazalawn`; the picture's size
  and place are by eye from one aerial photo).
- Behind the new hall the Cheonggyecheon rows had three made-up towers of
  89 to 108 m. Now the Korea Press Center (Seoul Shinmun) stands there on
  OSM's outline at 1/4, 8.9 m north of its real spot (`approx`, `why`; 21 m
  is an estimate from 20 floors), and the other made-up blocks behind the
  place are capped at 30 m. Don't re-run `build-cheonggyecheon.mjs` alone:
  it reshuffles its blocks.
- The name desk: a clerk at a counter by the old hall's door opens the same
  name panel as the information centres (`ui/emblem-ui.js`), which stay as
  they are (Yozi: both). It comes with the people on the lawn
  (`game/city-hall.js`, `desk`).

## Bosingak (Jongno)

The bell pavilion stands on the south side of Jongno in the Gyeongbokgung
district's map, between Jongno and Cheonggyecheon-ro at the Gwanggyo corner,
11 m north of its real 1/4 spot (`src/data/bosingak.js`, model in
`core/bosingak-model.js`, people in `core/bosingak-show.js`), on its own
square with a few visitors already there. In front of the pavilion `🔔 Ring the bell` swings the striker into the bell and
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

## Changdeokgung and Huwon (Jongno-gu)

`districts/changdeokgung.json`, built by `scripts/build-changdeokgung.mjs`
from OpenStreetMap (`scripts/data/changdeokgung-osm.json`, made by
`scripts/extract-changdeokgung-osm.mjs`). Donhwamun, the main gate, is the
district's (0, 0) on its real spot, east of Bukchon and north of Jongmyo. Run
it before `scripts/build-bukchon.mjs` (Bukchon keeps its streets and hanok off
the palace and the forecourt), then `build-north-wall.mjs` and
`build-closed.mjs`.

Sizes (Yozi 2026-11-21): the site, the wall and the paths at 1/4; gates at
50%; halls at 50% where they fit between the corridors, which stay at 1/4
(most yards are tight, so most halls come out at 30%: `meta.halls`); each of
Huwon's four gardens whole at 50% (pond, pavilions and halls together, twice
the 1/4 map), moved along the valley so they stand clear of each other and of
the wall in their real order (`meta.gardens`: Aeryeonji 17 m, Gwallamji 38 m).

Made up or approximate, and marked so: Buyongji (not in OSM: drawn from the
path round it and its recorded size, `approx` on its water); the doors cut in
corridors so every yard can be walked into (`meta.doors`); the forecourt in
front of Donhwamun, deeper than the real one because the game's Yulgok-ro is
south of its real line. Left out: Uiduhap (no room by the wall at 50%), the
hills (the garden is flat) and the yard walls inside the garden.

The palace shares its planner with Gyeongbokgung (`scripts/lib/palace-plan.mjs`).
The pavilions (`jeongja`) and Buyongji's island (`pondisle`) are drawn by
`src/core/huwon-model.js`, loaded when you first walk in.
`node scripts/build-changdeokgung.mjs --check` fails if any hall, yard,
pavilion or garden cannot be walked to from the gate.

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

## Haneul Park and the Nanji Campground (Mapo-gu)

`scripts/build-nanji.mjs` writes `districts/nanji.json`, west of Mangwon,
from OpenStreetMap (`scripts/data/nanji-osm.json`) and the real ground
(SRTM, `scripts/data/nanji-dem.json`), all at the real 1/4.

- **The hill** (하늘공원, the old Nanji landfill): its foot is the park's
  OSM outline (about 280 × 310 m), less the bands of Gangbyeon-buk-ro and
  Haneulgongwon-ro. Its height is its relief above the riverside at 1/4
  (17.1 m), and the top is level. The shape comes from the DEM, in a 6 m
  grid on the `skypark` landmark (`core/skypark-ground.js`).
- **Ways up**: 하늘길 (north and south, under 20°), the south-east stairs and
  the west steps (about 35°). All are on their OSM lines. The hill is a
  blocker, and the top and the ways up are decks through it
  (`game/nanji-walk.js`, in the first download, because it is how you walk).
- **On the top** (`game/nanji-park.js`, loaded within 480 m): silver grass
  (억새) over most of it, the pink muhly (핑크뮬리) field in the north-west
  corner by the kochia (댑싸리) row, five wind turbines along the south, and
  the bowl look-out. The fields change with `SEASON` (`FIELD_COLORS`:
  green in summer, pink, silver and red in autumn, straw in winter).
- **Bigger on purpose**: only the muhly field, about 3× the real one
  (1,188 m²). The hill and the campground stay 1/4 (Yozi 2026-11-21).
- **The campground** (난지캠핑장), inside its OSM outline: 18 tents, 2 fire
  pits with 6 camp chairs each (sit with friends), the office (난지
  안내센터, the info desk) and showers. The layout is made up.
- **Made up**, listed in `meta.approx`: the muhly's size, the walk from
  Gangbyeon-buk-ro, the top of the stairs (OSM ends them on the lower loop
  road, not built), the turbines and the bowl (placed from the park's map),
  and the campground's layout.
- `tests/nanji.test.mjs` checks the real places, the slopes, that every way
  up is walkable, and the made-up list. `tests/e2e/nanji.mjs` walks up
  하늘길 and sits by a fire (`DAY=1` for daytime pictures).

## Mokdong Ice Rink (Yangcheon-gu)

`scripts/build-mokdong.mjs` writes `districts/mokdong.json` from
OpenStreetMap (`scripts/data/mokdong-osm.json`), all at the real 1/4. The
middle of the ice hall (37.530766, 126.879227) is the district's (0, 0).

- **Real, within 1 m:** the rink's outline (the ice hall about 17 × 25 m, the
  lobby in front), the baseball stadium and the main stadium next to it.
  Gukhoe-daero and Mokdongdong-ro are within 10 m.
- **Made up** (`meta.approx`): Gukhoe-daero as one road for its three
  carriageways, the paved ground as one plaza, a small lawn, the Information
  Center, and the stadiums' stands (you cannot go into the stadiums).
- **An island for now:** the land between Mokdong and Yeouido is closed, so
  you get here by taxi, the subway picker or the map.
- **Outside** is drawn by `src/game/mokdong-site.js`, loaded when you come
  near (`mokdong-near.js` is the small part in the first download).
- **Inside** is a game room, bigger than the building on purpose
  (`src/core/ice-rink-hall.js`, 56 × 40 m: a 46 × 25 m sheet of ice, stands,
  the skate counter). Entry is free and the skates go on at the gate.
- **Skating** (`src/core/ice-skate.js` the rules, `src/game/ice-rink.js` the
  play, both loaded on the way in): you glide and carve, the action button
  jumps, and arrows pressed in the air are the tricks. ← and → in turn
  spin (← single 100, ← → double 300, ← → ← triple 700, ← → ← → quad 1,500;
  begin with → to turn the other way; the same key twice is two singles); ↑↓ butterfly, ↓↑
  backflip, ↑↑ cartwheel, ↓↓ death drop. A trick still turning when you land
  is shaky (half) or a fall; landing just after it finishes is perfect
  (×1.5). Clean landings in a row raise a combo up to ×3. A faster run-up
  means a longer jump (0.75 s from a standstill, 1.1 s at full speed): a
  triple from a standstill, a quad with a little speed. A new trick tapped
  too late to do anything but fall is not started; raising a turn always is.
  Let go and you coast: after a moment the arms open wide, and a long fast
  glide becomes a spiral (one leg out behind); pushing, jumping or slowing
  ends it. The commands are on a board by the gates (readable from both
  sides) and in a list on the screen that its button opens and closes.
  Points are a personal best on this device (no coins). Other skaters' jumps
  are sent as a short code (`st.ik`) and played back.
- **Skating as a pair** (`src/game/ice-pair.js`, friends only): the 🤝 button is
  always there on the ice; within 5 m of a friend it names them and offers
  "hold hands" or "push from behind" (otherwise a tap says what is missing:
  come closer, be friends first, or no friend on the ice); the
  friend says yes or no, as with the tandem bike. The one who asked leads
  and steers; the other is carried at their right hand, or crouched just in
  front on their own skates (there is no sled). Either can let go with the
  action button; jumping is off while you are a pair, and stepping off the
  ice or leaving ends it (within 4 s if the news is lost). The asking goes over emotes
  (`ice:ask|yes|no|end:<to>`), and everyone else sees it from `st.ip`.

## Seoul Arts Center (Seocho-gu)

`scripts/build-arts-center.mjs` builds `districts/arts-center.json` from
OpenStreetMap (`scripts/data/arts-center-osm.json`, cut from the Geofabrik
extract on 2026-11-21). Its anchor is the crossing of Banpo-daero and
Nambusunhwan-ro in front of the gate.

- **Size**: the whole place (site, buildings, plaza, the gaps between them) at
  50% of the real one, not 1/4 (Yozi 2026-11-21: Seocho is mostly offices
  otherwise). Every OSM point is doubled about the anchor, so the layout keeps
  its proportions (map rule 11: one scale for a whole place). The two roads in
  front stay 1/4; the site grows south towards Umyeonsan, over real neighbours
  that are not built. `meta.scale` says so.
- **Estimated or made up** (`meta.approx`, roads with `approx: true`): the
  heights (photos, not OSM), the flat ground (the real site climbs in
  terraces), the doors' exact spots, and the walks from the gate to the plaza
  and to the two doors. Buildings, fountain and footways are OSM's.
- **Outside** (`src/core/arts-center-model.js`, landmark `artscenter`, loaded
  with `import()` when the city is built): the Opera House as a round hall
  under a roof like a gat (a brim and a crown) with its stage house behind,
  the fan-shaped Music Hall, the museums as plain blocks, the music fountain
  with moving jets, the lawn before the Opera House.
- **Opera Theater** (stores.json `arts-opera-theater`, `front: "landmark"`,
  room `opera`: `src/core/opera-hall.js`, loaded with the rooms): the stage
  behind a red curtain, the orchestra pit with the conductor's podium, the
  stalls and three horseshoe balconies. Some seats have people; the rest are
  free. Walking only, like the cathedral.
- **The show** (`src/core/stage-show.js`) runs on the real clock, so everyone
  in the hall sees and hears the same bar. Each piece's turn is a short real
  evening: the orchestra tunes to the oboe's A, the conductor walks in to
  applause and bows, the lights go down and the curtain opens, the piece is
  played and danced, applause and bows, the curtain closes. Then the next.
- **The music** is not a recording. `src/data/opera-scores.js` holds the notes
  (written by hand from the published scores; all four pieces are from before
  1900 and out of copyright) and `src/core/concert-player.js` plays them live
  with Web Audio as a small orchestra, into the game's music output. The
  game's own track is the silent hidden track `concert` while inside. Nobody
  sings: an instrument takes the singer's line. To add a piece, write a score
  object there and put it in `OPERA_PROGRAM`.
- **The Concert Hall** (`src/core/concert-hall.js`, room `concert`, store
  `arts-concert-hall` at the Music Hall's door) is for classical music only:
  a wooden hall with the orchestra on the platform (winds and brass on
  risers), a grand piano, and seats all round, behind the stage too. No
  curtain and no dancers. The same show runs it; for a piano piece
  (`kind: 'piano'`) the pianist walks on instead of the conductor and the
  orchestra sits still.
- Its programme is `CONCERT_PROGRAM` in `src/data/concert-scores.js`, a
  generated file: `node scripts/build-concert-scores.mjs` cuts the excerpts
  out of the MIDI in `scripts/data/scores/`, which LilyPond made from
  public-domain and CC BY editions (sources and thanks in
  `docs/CREDITS-MUSIC.md`). To add a piece, add its MIDI and a row in that
  script's `PIECES`. Each hall fetches its own programme when you walk in
  (`stations.stage.load`).


## Seoul Botanic Park (Magok, Gangseo-gu)

`scripts/build-magok.mjs` writes `districts/magok.json` from OpenStreetMap
(`scripts/data/magok-osm.json`, cut from the national extract). The middle of
the real greenhouse (37.569369, 126.835027) is the district's (0, 0).

- **Real, within 1 m, at 1/4:** the garden's outline (about 221 × 400 m; real
  884 × 1,595 m), the lake (호수원), the wetland's water (습지원), the pond and
  streams, the park's footways of 20 m or longer, and the outlines of the arts
  centre, the forest school and the research greenhouse (plain and unnamed;
  you cannot go in). Magokjungang 10-ro is within 10 m; the bigger roads round
  the garden come from the base map.
- **The greenhouse is the one size exception** (Yozi 2026-11-21: "땅 1/4, 온실
  50% 오픈형"): 45.6 m across instead of 22.8 m, and its middle is 10 m
  north-west of the real one so the glass stays 4 m off Magokdong-ro's kerb.
  It is an open building on the street: no room, you walk in through two
  doorways (`src/game/botanic-near.js` in the first download,
  `src/game/botanic-site.js` loaded near).
- **Made up** (`meta.approx`): the greenhouse's size, place, doors and the
  path round it; its support building is left out; everything planted (trees,
  flower beds, reeds outside; all of the inside); the Information Center (on
  the real visitor centre's spot); Magokjungang 10-ro as one road.
- **Inside the greenhouse** (`src/core/botanic-layout.js`): a lily pond, a
  ring of low beds, a wide walk, tall beds against the glass, and four walks
  through them. The half by the main door is tropical, the far half
  Mediterranean. Merged per colour: the whole place is about 30 draw calls.
- **Pot plants for the home** (`src/core/house-plants.js`, store
  `seoul-botanic-greenhouse`): ten pieces of furniture sold from stands on the
  beds' edge, bought through the usual product sheet (receipt as for any
  furniture). Five everyday ones by the main door (₩12,000–45,000), five rare
  ones at the far end of the main walk, each in front of the big one of the
  same plant (₩100,000–600,000, Yozi 2026-11-21: rare ones may cost more). The orchid and the flytrap can stand on a table.
- **The streams** are shut like the lake (Yozi 2026-11-21: no walking through
  the water): open only where a path crosses.
- **The garden's planting** (Yozi 2026-11-21: too bare for its size): about
  350 trees, round flower beds and benches beside the paths, reeds by the
  wetland, and a **flower field** in the theme garden between the pond and
  the greenhouse (about 1,270 m2 in nine pieces between the paths, made up).
  The field's flowers follow `SEASON` (`FIELD_FLOWERS` in
  `src/game/botanic-site.js`: tulips, hydrangeas, cosmos, silver grass). The
  real path over the lake has footbridge rails; a made-up lookout deck goes
  9 m out over the lake; a white photo frame stands in the biggest field.
- **The Cactus & Succulent House** (stores.json `botanic-cactus-house`, made
  up): a shop door on the forest school's real building. Its room
  (`src/core/cactus-house.js`, with the room builder) has a sand island of big
  cacti; it sells four theme plants (`THEME_PLANTS` in
  `src/core/house-plants.js`) that the greenhouse does not.
- **Magongnaru Station** (Line 9, 905) at the garden's west edge: exits at the
  real 3 and 4, moved onto open ground inside the garden
  (`stationExits()` in the script). The stamp stand is outside the
  greenhouse's main door. The land round Magok is still closed, and the boat
  taxi's Magok pier is not built.
- `tests/magok.test.mjs` checks the real outlines, the exception and its
  notes, that every stand can be walked to from the door, and the shop.
  `tests/e2e/botanic.mjs` walks in and buys a monstera (`DAY=1` for daytime
  pictures).
## Gimpo Airport (Gangseo-gu)

`scripts/build-gimpo.mjs` (data `scripts/data/gimpo-osm.json`, OpenStreetMap)
puts Gimpo International Airport on its real place at 1/4: the airfield's
fence (about 1,006 x 913 m, a blocker you can't walk into, grass with the
aprons paved), the two runways on their OSM centre lines and lengths (900
and 800 m) but half the real width (22.5 and 30 m), and the domestic and
international terminals on their OSM outlines (154 x 27 m and 153 x 33 m).
Planes are MODU AIR (made up), about half size (22 m): five stand nose-in
at the domestic terminal, and one takes off or lands every 20 minutes of
real time, a takeoff and then its landing back at the same stand, none at
night (`core/gimpo-flights.js`; Yozi 2026-11-21). The domestic terminal's
roof deck (OSM has the real one) is a balcony along its airside edge, a walk
across the roof and a stair down beside the front door (`game/gimpo-walk.js`:
decks through the terminal and the fence); a board there counts down to the
next flight. The international terminal (where visitors from abroad
arrive) has lighter glass, its own sign and a door canopy on a kerb road off
the access road, and two more MODU AIR planes parked at its jet bridges
(they don't fly). Both terminals have window frames. The big sign on the
domestic terminal reads 김포국제공항. The terminals, runways and planes load near
(`game/gimpo-site.js`). Gimpo Airport Station (Line 5) has its four exits
where OSM has them. What is made up is listed in the district's
`meta.approx`. The Seoul Botanic Park (Magok) is a separate district east of
x -5,280.

## Oksu: Dalmaji Park (2026-11-23)

`scripts/build-oksu.mjs` writes `districts/oksu.json`: Dalmaji Park
(달맞이근린공원), the wooded hill over the Han by Oksu Station, at 1/4 on
OSM's wood outline, its height from SRTM above Ttukseom-ro at 1/4 (peak
14.5 m: halfway between SRTM's 13 m and the 16 m the articles give). Every OSM footway, path and stair in the wood is one network
(`dalmaji` landmark trails): where two meet they share a height, paths stay
under about 20° and stairs under about 33°. Ways and the two photo islands
are decks through the hill's blocker (`game/oksu-walk.js`, first download);
woods, railings, lamps, gazebos and forsythia (yellow in spring by the real
date) load near (`game/oksu-park.js`). Made-up things are in `meta.approx`.
The Han River Boat Taxi calls at Oksu (`build-boat-taxi.mjs`, 8 m west of the
real pier to clear Dongho Bridge, which `build-base.mjs` joins into one road
across the river so it is raised for the boats).
After rebuilding it, run `build-base.mjs` and `build-closed.mjs`.

## Seonjeongneung (Gangnam-gu, 2026-11-24)

`scripts/extract-seonjeongneung-osm.mjs` cuts OSM's lines for the royal tombs
of Seolleung and Jeongneung (서울 선릉과 정릉) into
`scripts/data/seonjeongneung-osm.json`; `scripts/build-seonjeongneung.mjs`
writes `districts/seonjeongneung.json` (`--region` also places it in
`region.json` and the Information Center in `stores.json`; `--check` prints
the report; `--svg` draws the plan). The main gate by the ticket office is its
(0, 0). The grounds are OSM's outline at 1/4 less the streets round it; what
stands at the tombs (mounds, stone walls, shrine halls on their platforms, red
gates, stele sheds, the stone path) is 50% on its real spot (Yozi): the whole
tomb groups can't be 50%, the Seolleung group would need 94 m on a 70 m site.
So the made-up hills behind the mounds are cut short of each shrine hall and
fenced (blockers, you can't climb a tomb). The models are in
`core/royal-tomb-model.js`, loaded when you walk in through the wall; a few
visitors stand and stroll (`game/seonjeongneung-near.js`). The wood is drawn
whole (`core/wood-mass.js`): about 150 big crowns that reach the ground, one draw, over
patches you can't walk into. Moves are in
`meta.nudges`, made-up things in `meta.approx`.

## Seoul National Cemetery (국립서울현충원, 2026-11-24)

`scripts/build-hyeonchungwon.mjs` writes `districts/hyeonchungwon.json`: the
cemetery in Dongjak-gu at 1/4 on OSM's outline, with Hyeonchungmun on its real
spot (the anchor). The gate, the Memorial Tower and the court between them are
at 50% about the gate's middle (Yozi), so the tower stands 21 m behind its
real spot and the court covers most of plots 16 and 18. The ground is SRTM
above the valley floor at 1/4 (level from the main gate to the court); every
OSM road, path and stair inside is one network (`hyeonchung` landmark trails:
roads under 14°, paths under 18°). The hill is a blocker; ways, the court, the
terrace and the lawn are decks through it (`game/hyeonchungwon-walk.js`, first
download; heights in `core/hyeonchung-ground.js`). The gate, tower, fountain,
woods and headstones load near (`game/hyeonchungwon-park.js`): plain white
stones in rows on OSM's plot outlines, no names; the presidents' graves and
single graves are not drawn. A place of remembrance: nothing to play or win.
Before the altar you burn incense and bow (`game/prayer.js`, no reward; the
burner and the 충 혼 stone stand clear, nothing in front). Hyeonchungmun is
white on four square columns with a blue-green roof and two honour guards in
black (made up: their look), and its stone floor is walked on (`HC_GATE`). The
Memorial Tower is four granite slabs in a cross on a thick round canopy over
the offering place (Seoul's, from Yozi's photos; not Daejeon's), and near the
gate and the tower the view tilts up when dragged (`HC_LOOK`). The
slopes behind are bare green (no treetop mesh, Yozi 2026-11-25); trees stand
round the court, the gate and along the ways. A
note of dates shows at the main gate. Dongjak Station (drawn on Line 4 only)
has exits 8 and 6 at the main gate. Made-up things are in `meta.approx`.
After rebuilding it, run `build-base.mjs` and `build-closed.mjs`.

Detail (2026-11-24, from Yozi's photos): Hyeonchungmun has tiled roofs with
white ridges, a dancheong band, brackets and latticed wings; the tower is a
cross-plan shaft of block courses on a round base, with the verse wall
(`HC_VERSE`, the three lines as they are cut), the bronze burner and the 충혼
stone before it; the fountain has two basins and bronze figures with a flag
(it cannot be wider than the island of OSM's round road, 6.8 m, so it is tall
instead: 8.4 m). One Taegeukgi stands on the lawn by the forecourt. Headstones
are fewer and bigger (`HC_PARK.rows`/`stones`/`stone`; about a quarter fewer).
Past the hill's foot the land you cannot enter is a wooded ridge
(`landmark.ridge`: SRTM at 1/4 out to 90 m, 0 at streets, the entrance and
the ways; one mesh of treetops; `ridgeSolids` closes it to walking, added
before the decks so ways along it stay whole). Inside the grounds every slope that is not a plot, a lawn, a way or a
building is wood drawn whole (`hyeonchung-wood`, one mesh whose treetops come down
to the ground at its edges; single trees only at its edges), and two rows of tall trees stand
along the court behind the gate (Yozi: in the photos trees close the view).
Memorials (`landmark.memorials`, from Yozi's photos): the Tower of the Unknown
Student Volunteer Soldiers, Chungyeoldae, the Altar for Patriots without
Descendants and the Memorial to the Unknown Soldiers of the Korean
Independence Army stand just off the way nearest their OSM points (the altar
9.7 m from its point: Chungyeoldae at 50% covers its real spot), at 50% of
their estimated real size. A white chrysanthemum
lies before every headstone (one flat instanced quad a stone, near tiles
only). On the grounds the hidden track `hyeonchung` plays (an original slow
tune, `data/tracks.js`), and your own song comes back as you leave.
A sun and a moon always stand
over the hill (sprites that follow you; the sun fades at night, the moon by
day), after the verse "the sun and the moon will guard this hill".

## Bukhansan: the Baegundae course (Gangbuk-gu, 2026-11-26)

`scripts/build-bukhansan.mjs` writes `districts/bukhansan.json` and
`bukhansan-view.json`: the way up Bukhansan (북한산) from Bukhansan Ui Station
(the district's anchor, the end of the Ui-Sinseol Line) to Baegundae, at 1/4
on its real place.

- The way (1,081 m in the game, 4.3 km really): the station → Samyang-ro
  173-gil up the valley → the Baegundae Visitor Support Center → Harujae →
  Baegun Hut → Baegunbongammun (위문) → the top. Every stretch is on its OSM
  line (the open ways only), within 1 m (`tests/bukhansan.test.mjs`).
- The mountain is the real ground (AWS Terrain Tiles) at 1/4 above the
  station: Baegundae stands 191.9 m over it (835.6 m really). You walk on the
  way only: the mountain is a blocker and the way is decks through it
  (`game/bukhansan-walk.js`, in the first download; the ground, rock, woods
  and stops are `game/bukhansan-park.js`, loaded within 480 m).
- Paths climb at most about 18°; the last stretch, up the bare rock, is steps
  with a handrail (about 30°).
- The steeper the way, the slower you go (`climbPace`): full pace up to about
  7°, 60% at 18°, 45% on the steps. Station to top takes about 3 min 20 s on
  foot.
- At the flag on top a button opens a painted 360° view
  (`game/bukhansan-view.js`, loaded when asked for): the real skyline from the
  terrain, drawn in the game's style, and it says it is a drawing, not a photo.
- Made up (`meta.approx`): the mountain's outline (the real one has no edge
  here), the level stops, the steps over the whole last stretch, the even
  climb. Baegun Hut and the Visitor Support Center are plain game-size houses
  until there are photos of them.
- Data: `scripts/data/bukhansan-{osm,dem,horizon}.json`, made by
  `/mnt/project-files/bukhansan/data-prep/`. After rebuilding, run
  `build-base.mjs` and `build-closed.mjs`.
- Above the gate the top is drawn its own way, with no cut
  (`game/bukhansan-summit.js`, loaded within 140 m of the top; it opens as
  you climb the steps): the haze pulls back to about 590 m, the far country
  (the painted view's real skyline, 1.35 times taller) stands on a ring 900 m
  out, a sea of clouds lies 90 m under the top, and the wind blows (streaks,
  wisps, its sound, the flag). From the top what is under the clouds is not
  drawn.
- No bikes, cars or taxis on the mountain (inside its outline): you get off
  at its edge, and no taxi picks you up there.
- Away from the way (18 m) the wood is one mass: the ground in the canopy's
  greens with clumps on it, not trees (Yozi 2026-11-27).
- You stand on what is drawn (`core/bukhan-ground.js` `wayTop`): each stretch
  of the way is a strip, level across, running on at its own slope a little
  past its ends; the steps are blocks along their line. (Before, the ground
  eased towards every way near by and you sank up to half a metre into the
  path.) The camera stays 0.8 m over the mountain's ground (`camOver`), so
  turning the view never shows under it.
- Round the top you can walk out on the rock (`summit.rock`, made up from the
  real ground: out to where it has dropped 4.5 m or is steeper than 32°, 5 to
  15 m from the flag); the fence (posts and one cable) stands on its edge. The
  rock floor is carved as it really is: 北漢山 白雲臺 836m.
- Sunrise and sunset (`core/sunset-sky.js`): on the mountain a big sun and a
  warm glow on the ground (`BUKHAN_PARK.sun`, `glow`); at the top more: the
  far country and the sea of clouds take the sun's colour and its path of
  light lies over the clouds (`SUMMIT.warm`, `path`).
- Between the trees by the way (13 m) and the far clumps stand thickets: a
  big mass of leaves as one shape (`game/thicket.js`: `thicketGeometry`,
  `thicketSpots`, 40 triangles for 6-10 m of wood). Any park or hill can use
  them.
- Other players stand on the ground where you see them (`core/players.js`
  `groundAt`): their height comes a few times a second and their place runs
  ahead, so going up they sank; and the cap on a player's height (140 m) is
  lifted on the mountain, whose steps and top are 159-192 m up
  (`tests/e2e/bukhansan-friend.mjs`).
- The hiking paths are red-brown earth (`BUKHAN_PARK.pathColor`), apart from
  the town's grey roads. Running on them or on the steps you may trip
  (`TRIP`: each run has its own chance, 2-12% a second, more the steeper it
  is; you sit 2-8 s, each fall its own; the road up from the station and the
  plaza are safe), and a chip
  shows how high you really are (`bukhan.alt`: the game's height x 4 + 68 m).
- From elsewhere nothing of it is drawn: it loads within 480 m, and past the
  haze (600 m and more) it hands the renderer 0 triangles
  (`tests/e2e/bukhansan-far.mjs`).
