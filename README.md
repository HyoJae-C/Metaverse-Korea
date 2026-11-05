# Another Seoul

A browser-based 3D virtual trip to Korea for international visitors. No install: open the website and walk.
First stop: **Seongsu-dong, Seoul**.

## What works now (step 1)

- 3D streets and buildings around Seongsu Station: a hand-made game map inspired by the real neighbourhood
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
- Nyang Nyang Cat Café: six cats wander, sit, nap, play and come over to visitors; walk up to one and tap Pat (cats are local to each visitor). It is the only animal café in Seongsu
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
- Hongdae (Mapo-gu, in the north-west next to Seodaemun): a hand-made area loosely after the real one (Yanghwa-ro, Hongdae Walking Street, Wausan-ro and alleys), with Hongik Univ. Station, 5 cafés and 7 shops (fashion, beauty, stickers, records), all fictional
- Hongdae animal café row, on the south end of Hongdae Walking Street: Gogo Cat Café (six cats, Mochi among them), Neoguri Raccoon Café (five raccoons), Big Paws Dog Café (six big dogs) and Haemjji Hamster Café
- Hongdae Busking Zone: a busker plays on a street stage with a crowd, and the busking song plays while you're near. Step onto the stage and tap 🎤 Busk to perform yourself (others see you); now and then a listener tips 🪙 5 (6 tips a day)
- Starlight Tarot (별빛 타로), a tarot café in a Hongdae alley: sit at the reader's table and pay 🪙 10 to draw three cards (past, present, future) from the 22 major arcana, each with a short reading. Just for fun
- Perfume shops: 10 fictional perfumeries in Seongsu, 3 perfumes each, 6 per style (funny, elegant, cute, simple, clean), plus 4 handmade perfume workshops spread over the neighbourhood and a perfume pop-up with limited editions (`limited`: on sale only between two dates). A bottle goes in your bag and has 5 sprays; hold it and tap 🧴 Spray. In the shop, 👃 Smell the tester shows the effect for free (people in the same shop see it too). A spray lasts 3 minutes, and every ~7 seconds a small effect of that perfume (a stink cloud, hearts, petals, bubbles…) pops up next to you. Others within about 20 m see it too; it adds one short field to the state already sent, no extra messages. The two elegant houses (Maison Seoulsup, Atelier Noir) are larger, with 8 display tables, and their clerk walks around greeting visitors (`displays`, `clerkRoams`). Perfumes and their effects are data in stores.json (`perfume`, `fx`)
- Lip Street on Yeonmujang-gil (east of Seongsui-ro): six lip tint shops that each sell one colour family (red, coral, pink, purple, green, blue), with signs in their own colour. Sit at the mirror and try the shades on (fictional shops)
- Shop signs come in different shapes and sizes: wide and short boards, pills, circles, triangles, arches and tall blade signs that stick out from the wall. A store can pick one in stores.json (`"sign": { "shape": "circle" }`); otherwise its id picks one
- Ad posters on empty shop lots in Seongsu: a big "AD SPACE" poster with a spot number (L-07…) and a shutter covered in small posters. Spot numbers stay the same while shops come and go; a booked spot shows its ad from region.json (`"adPosters": { "L-07": { "image": "ads/brand.png" } }`, or `text`, `sub`, `color`). Buildings get taller towards the middle of the neighbourhood (scripts/build-seongsu.mjs)
- Sonmat Kimchi School (손맛 김치학교), a fictional kimchi class on Samcheong-ro east of Gyeongbokgung: stand at the long work table and make one napa cabbage of kimchi the kimjang way in 10 steps (pick a good cabbage, slit the root end and pull it apart by hand, salt the stems, soak 6-8 hours and turn it once, rinse three times, cook sweet rice paste, mix the seasoning from the recipe card while skipping the decoys, spread the filling stem first, pack the onggi jar and press out the air, choose how it ripens). The teacher speaks Korean with romanization and a meaning; the end shows a medal (coins once per new tier), each step's score, the Korean words used and a jar of homemade kimchi for the bag. Rules in `src/core/kimchi-game.js`, text in 9 languages in `src/ui/kimchi-text.js`
- Gifts for friends: in a shop, open a product (or the café menu) and tap 🎁 Gift to a friend, then pick someone in the same shop. You pay now; they get a card to Accept (it goes in their bag, or their items for clothes) or say No thanks. A no, no answer within 90 seconds, or either of you leaving the shop gives your coins back. Limits against spam: 10 accepted gifts a day, 3 waiting at a time and one per friend, blocked people's gifts are ignored, and after a no the same person can't ask again for 2 minutes. Coins only leave the giver and items can't be sold, so gifts can't farm coins. Rules in `src/core/gifts.js`, two-player check in `tests/e2e/gifts.mjs`
- Skirts in two lengths (mini and long) and many colours and patterns (pleats, tartan and gingham checks, polka dots, flowers, stripes, denim, leopard). Five skirt shops in Seongsu around the square (Jureum Pleats, CHECK ROOM, Ttaengttaengi Dots, Kkotbat Skirts, Nalgae Long Skirts), and three by the Hongdae busking square (Cheongchima Factory, Stripe Alley, WILD NEON), all fictional. A skirt goes on over your everyday clothes and the legs show bare under it; take it off (or put trousers on) to go back to trousers. Skirts are data in `src/data/skirts.js`, built in `src/core/skirt-mesh.js`. The gym and the jjimjilbang moved to Hongdae Walking Street to make room, and the convenience store is now DAILY MART
- Itaewon layout: World Food Street (12 restaurants) and four cafés in the north-west, Bar Hush and the three clubs in the north-east, and one each of a tailor, a shoe shop, an antique shop, a used bookshop and a halal grocery (on Usadan-ro, near the mosque), all fictional
- Yongmaru Market (용마루시장), a fictional traditional market just south-west of Itaewon Station, inspired by Yongsan's markets such as Yongmun Market: a covered alley with ten stalls (fruit and veg, rice cakes, jeon, dried seafood, a sesame oil mill, hotteok, gukbap, onggi and kitchenware, kalguksu, and side dishes). The side-dish stall's boss buys the homemade kimchi from Sonmat Kimchi School: 🥇 12, 🥈 9, 🥉 6, no medal 3 coins a jar, up to 3 jars a day so it can't farm coins. A jar keeps its score in the bag (`g: 'kimchi', q`). Rules in `src/core/kimchi-market.js`, text in 9 languages in `src/ui/market-text.js`
- Subway: five underground stations, each with two street exits and real stairwells: Seongsu (Line 2, by the Achasan-ro Crossing), Gyeongbokgung (Line 3), Itaewon (Line 6), Jamsil (Line 2) and Hongik Univ. (Line 2). Walk down the steps into the station hall, pay 2 coins at the ticket gates to reach the platform. Each platform has an up and a down track; a train comes every 15 seconds and keeps its doors open for 5, so walk in (or press Board) before they close. Arrivals, doors opening, the closing warning and departures each have their own sound (made in the browser, not real metro recordings). Inside the car, pick the station to get off at; the ride takes 2.5 seconds per stop and you step out onto that station's platform. Walk up either exit's stairs to come out on the street. Stations are a list in region.json (`subway.stations`), so more can be added as data
- Namsan Sky Cable (남산 하늘 케이블카, a fictional cable car) in Itaewon, next to the Namsan trail: two cabins shuttle up and down the hill on one shared clock (10 s at each station, 24 s on the way), so everyone sees the same cabin in the same place, and you can see them climbing from the street. Stand at a cabin bay and get in while the doors are open (🪙 4 for the round trip, the way down is free so nobody gets stuck), ride up over the forest and step out on the summit plaza round the look-out tower: railings hung with love locks, binoculars, and Seoul and the Han River below. Schedule and layout in `src/core/cablecar.js`. The real cable car's fares and hours are not used

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
```

To test multiplayer without a server, set `VITE_NET_PROVIDER=local` (e.g. in `.env.local`) and open two tabs.

## Project layout

```
public/regions/<id>/region.json   per-region settings (districts, spawn point, names)
public/regions/<id>/map.json      map data (Seongsu: generated by scripts/build-seongsu.mjs)
public/regions/<id>/stores.json   stores and products (fictional sample data)
public/regions/<id>/zones.json    meeting zones
scripts/build-seongsu.mjs         builds Seongsu's hand-made map and places its shops
src/core/                         shared engine: world, character, input, collision, i18n
src/net/                          multiplayer, behind a swappable adapter (local, supabase)
src/data/emotes.js                emote packs (data-driven, ready for a future shop)
src/data/characters/              character model packs (GLB files in public/models/)
src/i18n/strings.js               UI translations
```

### Adding a region

Areas of Seoul are districts of the Seongsu region (see `docs/WORLD.md`): draw a small hand-made
map file in `public/regions/seongsu/districts/`, add it to `districts` in `region.json` with an
offset, and place its stores, zone and bike station with `"at": [x, z]`.

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

All maps are hand-made game maps inspired by real places, not copies of any map service.
Store and product data are fictional sample data, not the real businesses at those locations.
Characters: [KayKit Adventurers 2.0 and Character Animations 1.1](https://kaylousberg.com/) by Kay Lousberg, CC0 (licences in `public/models/kaykit2/`).
Korean grammar textbooks (TOPIK 1–6) in the library: provided by the project owner.
Background music is generated live in the browser (Web Audio); no audio files are used.
