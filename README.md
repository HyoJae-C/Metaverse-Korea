# Another Seoul

A browser-based 3D virtual trip to Korea for international visitors. No install: open the website and walk.
First stop: **Seongsu-dong, Seoul**.

## What works now (step 1)

- 3D streets and buildings around Seongsu Station, built from real OpenStreetMap data
- A 3D character (five models to pick from) you walk with WASD / arrow keys (desktop) or a touch joystick (phone), with walk, run, sit, bike and emote animations
- Language picker on the start screen (English, 한국어, 日本語, 中文); English is the default
- Street name card in the original Korean, with a Translate button
- Multiplayer: see other travellers in real time, with nicknames and emotes (Supabase Realtime)

## Step 2 (in progress)

- Meeting zones A–F with tall lettered signposts ("meet at B!")
- Map (M key or 🗺️): streets, zones, shops, you and other players; tap to get walking guidance
- 11 fictional sample stores with Korean signs and a Translate signs toggle
- Store interiors with product displays, try-on for clothes and accessories, a virtual shopping bag
- Each store interior is its own multiplayer room (the café is the meeting spot)
- Background music on/off (🎵), generated in the browser
- Walking route drawn on the ground along real streets when you pick a destination
- Behind-the-back camera that follows as you walk and stays out of walls; you start in front of the café
- Running uses a stamina bar that refills while you walk or rest
- Cafés have seats: walk up to a chair and tap Sit (others see you sitting). Ongi Café is a large café; Haneul Hand Drip and Sandgrain Bakery are small ones
- Daily check-in (7-day row, bonus coins every 7th day) and three daily missions that change every day, the same for everyone: find a named passer-by and say hi, visit a shop, pat an animal, sit in a café, ride a bike or use emotes. "Show the way" guides you there. Progress is kept in this browser for now
- Chat safety: a word filter that also hides links, emails and phone numbers; tap a name in the chat log to block or report someone (blocked people disappear from your screen; reports are kept on the device until there is a server to send them to); unblock everyone in Settings
- Neoguri Raccoon Café (five raccoons) and Big Paws Dog Café (six big dogs), built like the cat café
- Nyang Nyang Cat Café: six cats wander, sit, nap, play and come over to visitors; walk up to one and tap Pat (cats are local to each visitor)
- Text chat (💬, or T): speech bubbles over heads and a short log
- Homes: Forest Lane Apartments and Sunny Villa (fictional). Walk in and tap 🛋️ Decorate to place, rotate, move and remove furniture; you can sit on your own chairs and sofa. Saved on this device
- Bike share: rent a bike at a 🚲 station and ride faster than running (no stamina); get off anywhere
- Coins (🪙) with a demo "watch an ad" button (+20, 5 a day); virtual, no cash value, saved on this device
- NPCs: passers-by stroll the streets and every shop has a clerk; say hi and they answer in Korean with romanization and English
- Hat workshop (Seongsu Hat Atelier): pick a shape, colour and embroidered patch; see it on your character live and save it
- Ddeokip Bunsik (snack bar): ordering practice in Korean. Pick a mission ("1 serving of tteokbokki, not spicy, to eat here"), build the order from word blocks, answer the clerk's question, and get a stamp (+15 coins the first time). Then listen to the sentence and record yourself to compare; the recording stays on the device and is never scored. Food can't be bought or eaten here
- Street chat is heard only within 10 m and shows for a few seconds; inside shops and cafés everyone in the room sees it
- Taxi (🚕 in the map, the fare grows with the distance: 30 coins plus 1 per 50 m): tap any spot or pick a place from the list; a short back-seat ride where the driver speaks Korean, then you are dropped off on the nearest road a car can use
- Map search and category filter: search shop names (any language), food and products
- Auto-walk: after picking a destination on the map, tap 🚶 Auto in the guidance bar to walk (or bike) there along the streets without steering; touching the stick or keys takes over again
- Tandem bike (an item): ride it up to someone and invite them onto the back seat; they ride along while you steer. Items are listed in the coin panel
- Emotes with body motions: wave, bow (인사), laugh, angry, shrug, cheer, clap, cry, plus smile, heart and photo
- Subway: four underground stations, each with two street exits and real stairwells: Seongsu (Line 2, by the Achasan-ro Crossing), Gyeongbokgung (Line 3), Itaewon (Line 6) and Jamsil (Line 2). Walk down the steps into the station hall, pay 2 coins at the ticket gates to reach the platform. Each platform has an up and a down track; a train comes every 10 seconds and keeps its doors open for 5, so walk in (or press Board) before they close. Inside the car, pick the station to get off at; the ride takes 2.5 seconds per stop and you step out onto that station's platform. Walk up either exit's stairs to come out on the street. Stations are a list in region.json (`subway.stations`), so more can be added as data

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
```

To test multiplayer without a server, set `VITE_NET_PROVIDER=local` (e.g. in `.env.local`) and open two tabs.

## Project layout

```
public/regions/<id>/region.json   per-region settings (bbox, spawn point, names)
public/regions/<id>/map.json      generated map data (do not edit by hand)
public/regions/<id>/stores.json   stores and products (fictional sample data)
public/regions/<id>/zones.json    meeting zones
scripts/fetch-osm.mjs             downloads OSM data and writes map.json
src/core/                         shared engine: world, character, input, collision, i18n
src/net/                          multiplayer, behind a swappable adapter (local, supabase)
src/data/emotes.js                emote packs (data-driven, ready for a future shop)
src/data/characters/              character model packs (GLB files in public/models/)
src/i18n/strings.js               UI translations
```

### Adding a region

1. Create `public/regions/<id>/region.json` (copy Seongsu's and change the bbox, centre and spawn).
2. Run the **Fetch OSM map data** workflow (Actions tab) with the region id, or `node scripts/fetch-osm.mjs <id>` locally.
3. Add the region to `public/regions/index.json`.

### Swapping the character model pack

Characters come from the pack named in `src/data/characters/index.js`. A pack file lists its GLB models,
scale, sit and bike offsets, and maps our actions (idle, walk, run, sit, ride, wave, bow…) to its clip
names. All models in a pack share one rig; the clips come from the `animFiles` (or one model, `animsFrom`). To use another
pack (for example a paid chibi pack), add its GLBs under `public/models/<pack>/`, write a pack file like
`kaykit2.js`, and point `index.js` at it. Hats, glasses and bags move onto the model's head and chest bones
automatically. While a model loads, or if it fails, the simple built-in chibi is shown instead.
`scripts/models/build-kaykit2.mjs` shows how the KayKit files were shrunk (capes and hats removed, only the clips we use kept).

### Domain and Google sign-in

The site lives at https://another-seoul.com/ (GitHub Pages with a custom domain). DNS, Google Cloud and
Supabase settings for the domain and Google sign-in are in `docs/DOMAIN-AND-GOOGLE.md`.

### Cloud saves (guest accounts)

Game data lives in localStorage keys starting with `mk.`. `src/core/cloud-save.js` signs the player in as an
anonymous Supabase guest and copies those keys to the `saves` table (the newer copy wins), so a save survives
clearing the browser. A guest can later link a Google login and keep the same account. One-time setup in the
Supabase dashboard:

1. Authentication → Sign In / Providers → turn on **Allow anonymous sign-ins**.
2. SQL Editor → run `supabase/001_saves.sql` (table + row-level security: each player reads and writes only their own save).

Until both are done the game keeps saving on the device only (Settings shows which). Automated test rooms
(`?debug`) skip cloud saves. The browser writes its own save, so coins and items are not cheat-proof yet.

### Swapping the realtime provider

Game code talks only to the adapter interface in `src/net/index.js`. Add a file in `src/net/adapters/`,
register it in `FACTORIES`, and set `VITE_NET_PROVIDER`.

## Data and credits

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the ODbL.
Street trees and building colours are decorative and not part of the map data.
Store and product data are fictional sample data, not the real businesses at those locations.
Characters: [KayKit Adventurers 2.0 and Character Animations 1.1](https://kaylousberg.com/) by Kay Lousberg, CC0 (licences in `public/models/kaykit2/`).
Korean grammar textbooks (TOPIK 1–6) in the library: provided by the project owner.
Background music is generated live in the browser (Web Audio); no audio files are used.
