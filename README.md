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
- Starlight Tarot (별빛 타로), a tarot café in a Hongdae alley: sit at the reader's table and pay 🪙 40 to draw three cards from the 78-card deck (past/present/future, dating, friendship or money luck), each with a short reading, then a summary that ties the three cards together and a funny one-word verdict. Just for fun
- Perfume shops: 10 fictional perfumeries, 3 perfumes each, 6 per style (funny, elegant, cute, simple, clean), plus 4 handmade perfume workshops and a perfume pop-up. Most are in Seongsu; five of the playful ones (KKEUNG KKEUNG & CO., OOPS PARFUM, HEART PPYONG PPYONG, MOAI SCENT LAB, PUNGGYEONG SCENT ROOM) make up a perfume alley in Hongdae, on the Hongdae alley just off the walking street with limited editions (`limited`: on sale only between two dates). A bottle goes in your bag and has 5 sprays; hold it and tap 🧴 Spray. In the shop, 👃 Smell the tester shows the effect for free (people in the same shop see it too). A spray lasts 3 minutes, and every ~7 seconds a small effect of that perfume (a stink cloud, hearts, petals, bubbles…) pops up next to you. Others within about 20 m see it too; it adds one short field to the state already sent, no extra messages. The two elegant houses (Maison Seoulsup, Atelier Noir) are larger, with 8 display tables, and their clerk walks around greeting visitors (`displays`, `clerkRoams`). Perfumes and their effects are data in stores.json (`perfume`, `fx`)
- Hair salons are spread over the areas: Gawison Hair and Mulgyeol Hair in Seongsu; Neon Punk Hair, Indie Hair Room, Groove Hair and Stage Idol Hair (idol cuts for men) in Hongdae; Gareuma Hair on the Seodaemun campus street; and Itaewon Barbershop, a classic men's barber, on Itaewon-ro
- Lip Street on Yeonmujang-gil (east of Seongsui-ro): six lip tint shops that each sell one colour family (red, coral, pink, purple, green, blue), with signs in their own colour. Sit at the mirror and try the shades on (fictional shops)
- Shop signs come in different shapes and sizes: wide and short boards, pills, circles, triangles, arches and tall blade signs that stick out from the wall. A store can pick one in stores.json (`"sign": { "shape": "circle" }`); otherwise its id picks one
- Ad posters on empty shop lots in Seongsu: a big "AD SPACE" poster with a spot number (L-07…) and a shutter covered in small posters. Spot numbers stay the same while shops come and go; a booked spot shows its ad from region.json (`"adPosters": { "L-07": { "image": "ads/brand.png" } }`, or `text`, `sub`, `color`). Buildings get taller towards the middle of the neighbourhood (scripts/build-seongsu.mjs)
- Sonmat Kimchi School (손맛 김치학교), a fictional kimchi class on Samcheong-ro east of Gyeongbokgung: stand at the long work table and make one napa cabbage of kimchi the kimjang way in 10 steps (pick a good cabbage, slit the root end and pull it apart by hand, salt the stems, soak 6-8 hours and turn it once, rinse three times, cook sweet rice paste, mix the seasoning from the recipe card while skipping the decoys, spread the filling stem first, pack the onggi jar and press out the air, choose how it ripens). The teacher speaks Korean with romanization and a meaning; the end shows a medal (coins once per new tier), each step's score, the Korean words used and a jar of homemade kimchi for the bag. Rules in `src/core/kimchi-game.js`, text in 9 languages in `src/ui/kimchi-text.js`
- Suragan Cooking Class (수라간 요리교실), a fictional cooking class next to the kimchi school, with two classes at one long table. At a stove on the far side: japchae in 8 steps (julienne the vegetables, marinate the beef, blanch and squeeze the spinach, fry yolk and white egg garnish on low heat, stir-fry each vegetable on its own light colours first, boil and snip the glass noodles, toss it all with the seasoning, plate it with egg strips and sesame). At a bamboo mat on the near side: free-style kimbap in 7 steps (season the rice, pick any 3-8 of 23 fillings, lay the gim shiny side down, spread the rice leaving the top edge bare, roll in three firm turns, oil it and rest it seam side down, slice with a wet knife). Kimbap has no set recipe: a classic roll is shown as an idea, and each filling has a hidden popularity score (classics high, polarizing ones like mala or cilantro low, clashing ones like ketchup or chocolate very low) that the teacher only hints at in words. Rules in `src/core/japchae-game.js` and `src/core/kimbap-game.js`, text in 9 languages in `src/ui/japchae-text.js` and `src/ui/kimbap-text.js`
- Gifts for friends: in a shop, open a product (or the café menu) and tap 🎁 Gift to a friend, then pick someone in the same shop. You pay now; they get a card to Accept (it goes in their bag, or their items for clothes) or say No thanks. A no, no answer within 90 seconds, or either of you leaving the shop gives your coins back. Limits against spam: 10 accepted gifts a day, 3 waiting at a time and one per friend, blocked people's gifts are ignored, and after a no the same person can't ask again for 2 minutes. Coins only leave the giver and items can't be sold, so gifts can't farm coins. Rules in `src/core/gifts.js`, two-player check in `tests/e2e/gifts.mjs`
- Skirts in two lengths (mini and long) and many colours and patterns (pleats, tartan and gingham checks, polka dots, flowers, stripes, denim, leopard). Five skirt shops in Seongsu around the square (Jureum Pleats, CHECK ROOM, Ttaengttaengi Dots, Kkotbat Skirts, Nalgae Long Skirts), and three by the Hongdae busking square (Cheongchima Factory, Stripe Alley, WILD NEON), all fictional. A skirt goes on over your everyday clothes and the legs show bare under it; take it off (or put trousers on) to go back to trousers. Skirts are data in `src/data/skirts.js`, built in `src/core/skirt-mesh.js`. The gym and the jjimjilbang moved to Hongdae Walking Street to make room, and the convenience store is now DAILY MART
- Itaewon layout: World Food Street (12 restaurants) and four cafés in the north-west, Bar Hush and the three clubs in the north-east, and one each of a tailor, a shoe shop, an antique shop, a used bookshop and a halal grocery (on Usadan-ro, near the mosque), all fictional
- Yongmaru Market (용마루시장), a fictional traditional market just south-west of Itaewon Station, inspired by Yongsan's markets such as Yongmun Market: a covered alley with ten stalls (fruit and veg, rice cakes, jeon, dried seafood, a sesame oil mill, hotteok, gukbap, onggi and kitchenware, kalguksu, and side dishes). The side-dish stall's boss buys the homemade kimchi from Sonmat Kimchi School: 🥇 12, 🥈 9, 🥉 6, no medal 3 coins a jar, up to 3 jars a day so it can't farm coins. A jar keeps its score in the bag (`g: 'kimchi', q`). Rules in `src/core/kimchi-market.js`, text in 9 languages in `src/ui/market-text.js`
- Subway: five underground stations, each with two street exits and real stairwells: Seongsu (Line 2, by the Achasan-ro Crossing), Gyeongbokgung (Line 3), Itaewon (Line 6), Jamsil (Line 2) and Hongik Univ. (Line 2). Walk down the steps into the station hall, pay 2 coins at the ticket gates to reach the platform. Each platform has an up and a down track; a train comes every 15 seconds and keeps its doors open for 5, so walk in (or press Board) before they close. Arrivals, doors opening, the closing warning and departures each have their own sound (made in the browser, not real metro recordings). Inside the car, pick the station to get off at; the ride takes 2.5 seconds per stop and you step out onto that station's platform. Walk up either exit's stairs to come out on the street. Stations are a list in region.json (`subway.stations`), so more can be added as data
- Cheonggyecheon Stream (청계천), a short stretch south of Gwanghwamun Square, on the Jongno-gu / Jung-gu line: it starts at Cheonggye Plaza with a two-step waterfall and flows east below the street. Six stairs lead down from the sidewalks to walkways on both banks; cross the water on two rows of stepping stones and walk under Mojeongyo (an arch), Gwangtonggyo (granite slabs on stone piers) and Jangtonggyo, or cross them on the street. A grey heron (왜가리) lives on the stream: it stands in the shallow water, wades a step or two and stabs at fish, then flies off over the street beside the stream and lands somewhere else on the water. It only ever lands on the water and ignores people, and it runs off the clock, so everyone sees it in the same place without any network traffic (`src/core/heron.js`, poses in `dev/heron.html`). A lantern festival runs along it all year (`src/core/lanterns.js`, data in the stream's `lanterns`): big hanji lantern figures in the water (a moon with its rabbit, two koi, two tigers and lotus flowers), cheongsachorong on the railings, strings of round lanterns across the channel, lit lanterns under the bridges, a light tunnel of colour-cycling arches over the south walkway, and a tiled wall drawing of King Jeongjo's 1795 royal procession with a sign and an "About the mural" panel (an original drawing in that spirit, not a copy). The east end is the wish lantern corner: from the walkway there, pay 🪙 5, pick a colour and one of eight wishes, and the lantern drifts down and comes to rest with the others for 10 minutes. Wishes come from a fixed list, so everyone reads them in their own language. Your lantern rides on your player state, so people nearby and people who arrive later see it too, and lanterns also float down from the clock so the corner is never empty. Meeting zone L is Cheonggye Plaza. Compressed and stylised, not to scale (the real stream runs on for about 11 km). The stream is data in the district map (`streams`), built in `src/core/stream.js`
- Lighting shops on Cheonggyecheon-ro, by the wish lantern corner: Bitdam Hanji Lamps, Dalbit Lighting, Neon Golmok, Mojeon Lamp Shop and Banjjak Bulbs (all fictional). Each sells three lamps for your home (15 in all: a round hanji lamp, a cheongsachorong stand, a lotus lamp, a moon lamp, a mushroom lamp, a star night light, neon signs, a rainbow LED tube, a retro desk lamp, a brass arc lamp, a lava lamp, a fairy light arch, a big bulb and a candle lantern). Buy one once with coins, then place it at home with 🛋️ Decorate. Models in `src/core/furniture.js` (all lamps in `dev/lamps.html`)
- Namsan Sky Cable (남산 하늘 케이블카, a fictional cable car) in Itaewon, next to the Namsan trail: two cabins shuttle up and down the hill on one shared clock (10 s at each station, 24 s on the way), so everyone sees the same cabin in the same place, and you can see them climbing from the street. Stand at a cabin bay and get in while the doors are open (🪙 4 for the round trip, the way down is free so nobody gets stuck), ride up over the forest and step out on the summit plaza round the look-out tower: railings hung with love locks, binoculars, and Seoul and the Han River below. Schedule and layout in `src/core/cablecar.js`. The real cable car's fares and hours are not used
- Seoul Forest: a big wood, with rows of tall trees round its edge and round trees (some ginkgo yellow), pointed pines and bushes inside. Off the trail there is a round rose garden: eight colours of roses in two rings of beds, rose arches at the four ways in and a hedge round it. There is also a grassy hill with a wide flat top and wooden stairs up to a big round look-out deck (you can walk all over the slope), Metasequoia Avenue (a long straight path north to south lined with tall autumn-orange trees), and park benches you can sit on. A glass butterfly greenhouse full of plants and fluttering butterflies, with a round pond and fountain outside it. Four ice cream sculptures designed by Yozi (strawberry, chocolate, mint chocolate, soft serve), all the same size, each mark a place: strawberry in the rose garden, soft serve on the hill's deck, chocolate at the south end of Metasequoia Avenue and mint chocolate inside the greenhouse. Picnic mats can be spread on the grass here as well as in the Han River park, and on a mat you can lie down or sit. Layout in `scripts/build-seongsu.mjs`, models in `public/models/icecream` (meshopt-compressed, about 90 KB each), drawing in `src/core/park-art.js`

## Operators

Open `/admin.html` in the browser where you play with your operator account (see `supabase/005_operators.sql`). Not linked from the game; anyone else sees "Operators only". Tabs:

- **Overview**: online now, played today / in 7 days, accounts (guest vs Google), new accounts, open inquiries, posts today, chat bans. Tap a number to jump to its tab.
- **Live map**: everyone playing right now on the map (green on the street, purple inside a shop, with the shop's name), refreshed every 3 seconds; tap a name to zoom to them. The game reports its own spot every few seconds while walking and every 20 s while standing still (`src/net/where.js`); only operators can read it.
- **Inquiries**: the inquiry board (문의게시판). Write a reply and the player sees it under their inquiry in the game; or mark it done without one.
- **Free board**: hide or show posts.
- **Players**: search by name or e-mail; guest/Google, joined, last seen, where they are; ban or unban from chat (`chat_bans`).

Needs `supabase/008_player_where.sql` and `supabase/009_admin.sql` run once. Page code in `src/admin/`.

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

### Chat permissions

Chat travels on private realtime channels (`chat:<room>`) so the server decides who may send. Run
`supabase/004_chat.sql` once; until then chat uses the public room channels (anyone can send). After it:

- `chat_settings.google_only` = true → only Google-signed-in players can send (guests still read). Also set
  `chatGoogleOnly: true` in `src/config.js` so guests get a "sign in to chat" prompt. Both start off.
- `chat_bans` → add an account's `user_id` (look it up by name in `player_names`) to stop it chatting.

### Friends and friend chat

Public chat is never stored; the last lines just stay on screen until newer ones push them up. Friend chat is
kept like a phone messenger. Run `supabase/006_friends.sql` once (needs 003 and 004); until then the 👥 panel
says friends are being set up.

- Add a friend by tapping their name in the chat log (➕ Add friend) or by player name in the 👥 panel; they
  accept in their panel. The chat bar's picker sends to 🌐 everyone nearby, 👥 all friends, or one friend.
- Messages are only readable by the two friends (or the sender's friends, for All friends), go through
  `friend_send` (same `can_chat()` rules: Google-only and chat bans apply), max 200 characters, 5 per 10 s, and
  are deleted after 180 days. New ones are pushed on a private realtime channel `friend:<account id>`.

### Swapping the realtime provider

Game code talks only to the adapter interface in `src/net/index.js`. Add a file in `src/net/adapters/`,
register it in `FACTORIES`, and set `VITE_NET_PROVIDER`.

## Data and credits

All maps are hand-made game maps inspired by real places, not copies of any map service.
Store and product data are fictional sample data, not the real businesses at those locations.
Characters: [KayKit Adventurers 2.0 and Character Animations 1.1](https://kaylousberg.com/) by Kay Lousberg, CC0 (licences in `public/models/kaykit2/`).
Korean grammar textbooks (TOPIK 1–6) in the library: provided by the project owner.
Seongsu fashion posters: photos from [Unsplash](https://unsplash.com/license) (Unsplash License); photographers and links in `public/ads/CREDITS.txt`.
Background music is generated live in the browser (Web Audio); no audio files are used.
