# Metaverse Korea

A browser-based 3D virtual trip to Korea for international visitors. No install: open the website and walk.
First stop: **Seongsu-dong, Seoul**.

## What works now (step 1)

- 3D streets and buildings around Seongsu Station, built from real OpenStreetMap data
- A cute chibi character you walk with WASD / arrow keys (desktop) or a touch joystick (phone)
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
- Text chat (💬, or T): speech bubbles over heads and a short log
- Homes: Forest Lane Apartments and Sunny Villa (fictional). Walk in and tap 🛋️ Decorate to place, rotate, move and remove furniture; you can sit on your own chairs and sofa. Saved on this device
- Bike share: rent a bike at a 🚲 station and ride faster than running (no stamina); get off anywhere
- Coins (🪙) with a demo "watch an ad" button (+20, 5 a day); virtual, no cash value, saved on this device
- NPCs: passers-by stroll the streets and every shop has a clerk; say hi and they answer in Korean with romanization and English

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
src/i18n/strings.js               UI translations
```

### Adding a region

1. Create `public/regions/<id>/region.json` (copy Seongsu's and change the bbox, centre and spawn).
2. Run the **Fetch OSM map data** workflow (Actions tab) with the region id, or `node scripts/fetch-osm.mjs <id>` locally.
3. Add the region to `public/regions/index.json`.

### Swapping the realtime provider

Game code talks only to the adapter interface in `src/net/index.js`. Add a file in `src/net/adapters/`,
register it in `FACTORIES`, and set `VITE_NET_PROVIDER`.

## Data and credits

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the ODbL.
Street trees and building colours are decorative and not part of the map data.
Store and product data are fictional sample data, not the real businesses at those locations.
Background music is generated live in the browser (Web Audio); no audio files are used.
