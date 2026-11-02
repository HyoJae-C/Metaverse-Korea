# Roadmap

Decisions agreed with the project owner. Each step ships something playable.

## Step 1: Walk Seongsu together (done in PR #1)

- 3D streets around Seongsu Station from OpenStreetMap
- Cute chibi (2-heads-tall) original character, cozy pastel art style
- Start-screen language picker; English default
- Multiplayer with nicknames and emotes (Supabase Realtime, swappable adapter)

## Step 2: Café and shopping

- A virtual café near Seongsu Station as the meeting spot (first enterable place)
- 10 fictional stores (fashion, beauty, café, pop-up), clearly marked as sample data
- Browse products, try on, add to cart; no real payments
- Signs in Korean (or English) with a Translate button to the chosen language
- Background music: a cozy lo-fi loop generated in the browser (no audio files, no licensing), off by default, 🎵 toggle remembered per device
- **Sorimaru Record Café** (done): a record player with five original songs played live in the browser (lo-fi, swing jazz, city pop, Han River ambient, gugak groove), each with a short description. Only you hear your pick; leaving puts the usual music back. More songs are just new recipes in `src/data/tracks.js`

## Cost guardrails (done)

- Position is sent only while moving (6/s walking, 8/s running) plus a 5 s idle heartbeat
- Streets are split into 200 m cells: you announce yourself in your cell and listen to the 3×3 around it, so a message only reaches people nearby. Shops are their own rooms
- Later: cap a cell at about 30 people (open a second channel), and move position sync to a self-run realtime server, keeping Supabase for accounts and data

## Step 3: Social

- Voice chat **only inside the café**: opt-in, push-to-talk, mute and report
- Everywhere else: emoji only
- Toggle to hear / not hear strangers
- Friends list, and show / hide my online status
- Chat filter: "friends only" (on the street you already only see chat within 10 m, for a few seconds; inside shops and cafés everyone in the room hears everyone)
- Move the 10 m street-chat filter to the server once position sync runs on our own realtime server (today it is filtered on each player's screen)
- Needs a persistent identity: anonymous account per device first, optional Google sign-in later

## Step 3.5: Restaurants and brand spaces

- Food can't actually be eaten, so keep **only 2–3 restaurants**. Inside, each is a **Korean practice zone**: read the menu, practise ordering lines ("이거 주세요"), hear and repeat them
- First one done: **Ddeokip Bunsik** with three ordering missions (word blocks, the clerk's follow-up question, a stamp each). Missions are data in `src/data/order-missions.js`, so a new restaurant only needs a menu there and `"workshop": "order"` in stores.json
- Second one done: **Dwaejimaru Samgyeopsal** with a grilling minigame (flip each slice at golden brown; gold, silver and bronze medals, best medal kept, coins once per new tier)
- Next ideas: a Korean-only kiosk order, reading the menu board, building bibimbap, restaurant etiquette quiz. Speech recognition stays out for now (poor accuracy for learners' pronunciation, patchy browser support)
- The café and bakery stay as meeting spots
- All other buildings are **spare brand / ad slots**: sign and interior page come from advertiser data, so a brand can be swapped in without code changes. Until sold, they show a clear "Advertise here" sample

## Step 4: Game layer

- Stamps, shopping missions, recommended routes
- Verified place info for real visits (opening hours etc. fact-checked)

## Later
- **Teleport and membership**: free forever: walking, running, teleport to the meeting signposts (A–F) and the subway. Label paid features "free during beta" from the start and never take a free feature away later
- **Taxi** (first version done, free during beta): pick any point on the map and ride there: a short taxi scene (window view, the driver greets you in Korean) and you are dropped off. Normally paid with virtual currency (same wallet as the transit card). Early members get a few free taxi tickets per month for their first 3 months, plus a founder badge. Paid membership: unlimited taxi and "go to a friend"
- **Stamina**: running drains a stamina bar (about 10 s of running, then it refills while you walk or rest). Walking is always free and unlimited. Later, an "unlimited stamina" pass can be sold (`config.staminaUnlimited` is the hook); never shorten the free bar after launch.
- **Homes**: step 1 is one apartment and one villa with a private room you decorate (saved in the browser). Next: save rooms on the server and invite friends to visit (needs accounts), more furniture as rewards.

- **Character customisation** (outfits)
- **Emote shop**: emote packs are data with a `price`; purchases will come from an account service
- **Wallet and transit card**: virtual in-game currency only (no real money). Earned from missions, stamps and a daily login bonus. Subway fare is deducted per ride. When short: walk, do a small nearby mission, or take a small daily free top-up so nobody gets stuck. One wallet model shared with the emote shop.
- **Subway between regions**: stations act as doors to other regions. Seongsu → Hongik Univ. is about 30 min on Line 2 in real life; in game, about a 1-minute ride with station announcements, window scenery and a Skip button.
- **Hongdae** region with a **busking zone**
- More regions: other Seoul neighbourhoods, Busan, Jeju
- **Library** (shell done: Chaekmaru Library with bookshelves, reading tables and a quiet-please librarian). Later: study content such as reading Korean picture books, vocabulary cards, a quiet study timer
- **Elevators in tall buildings**: ride up to a rooftop, an upper-floor café or an observation deck, with floor announcements in Korean ("3층입니다")
- **Han River outing**: walk or ride to the riverside park, sit and watch the river, and cook instant ramen at a convenience-store ramen machine (a later minigame)
