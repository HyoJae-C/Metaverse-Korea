// The game guide (❓ button) in English: the source text. Every other
// language file has the same sections, in the same order, with the same
// number of lines (tests/help.test.mjs). Only the player's language is
// downloaded, and only when ❓ is first tapped (game/help-book.js).
export const HELP = {
  title: 'Game guide',
  intro: 'Everything you need for your trip to Seoul. Tap a topic to open it.',
  sections: [
    { icon: '🚶', title: 'Moving around', lines: [
      'Phone: drag the stick at the bottom left to walk. Drag the screen to look around, pinch to zoom.',
      'Computer: W A S D to walk, Shift to run, drag the mouse to look, scroll to zoom. V switches to first person.',
      'Walk up to a door or a person and tap the big button (E or Space) to go in or talk.',
      'Emotes: the emote button, or keys 1–9. Esc closes any window.',
    ] },
    { icon: '🗺️', title: 'Map and getting around', lines: [
      '🗺️ Map: search for shops, food or products. Tap a place, and Auto walk takes you there for free.',
      '🛵 Vehicle: the share bike is free and much faster than walking. Faster rides are sold at bike shops.',
      '🚇 Subway: walk down the station stairs and pay at the gate. 🚕 Taxi: pick a place on the map; friends next to you share the fare.',
      '⛴️ Han River boat taxi between the river parks, and 🚡 the cable car up Namsan.',
    ] },
    { icon: '🪙', title: 'Earning money', lines: [
      '📅 Check in every day, and finish today\'s three missions for a bonus.',
      'Guides on the squares and at Information Centers hand out small missions. Do them and report back.',
      'Work: food deliveries for shops, a shift at the pocha stall, minigames with medals, cooking classes.',
      'Catch fish at the Han River and sell them at the fish market.',
      'Sell clothes you don\'t need at thrift shops, or to other players at the Potato Market in Dongmyo.',
      'Money is virtual won with no cash value. Tap your money to see your wallet.',
    ] },
    { icon: '🛍️', title: 'Shopping and your look', lines: [
      'Walk into a shop to look around, try things on and buy. What you buy goes in your 🎒 Bag.',
      'Change clothes from your Bag. Hair salons, a beauty clinic and the name tag workshop change the rest.',
      '⚙️ Settings → Translate shop signs shows every sign in your language.',
    ] },
    { icon: '🏠', title: 'Your home', lines: [
      'Your apartment is at Forest Lane Apartments, by Seoul Forest Station exit 2.',
      '🛋️ Decorate: place, turn and move furniture. Furniture, lamps, wallpaper and fish tanks come from shops around town.',
      '🏗️ Bigger home: make your home bigger, step by step, when you have saved up.',
      'Who can visit: Everyone, Friends (the default) or Nobody. Up to 4 people at once.',
    ] },
    { icon: '🎣', title: 'Fishing', lines: [
      'Go to a Han River park and tap Go fishing. Cast, wait, and tap Hook the moment a fish bites.',
      'Then tap both Reel buttons in turn (keys ← →) until it\'s in.',
      'Auto fishing is slow and never catches rare fish (★3 and up): catch those by hand.',
      'New fish go in your 📖 fish book. Bait from the grandpa\'s stall in the park helps a little.',
    ] },
    { icon: '👥', title: 'Friends and chat', lines: [
      '💬 Chat (T or Enter): talk to everyone nearby, all your friends, or one friend.',
      'Tap a name in the chat to add a friend, or add one by name with 👥 in the chat bar.',
      'With friends you can share a taxi, ride together, visit homes and give gifts. Doing things together gives a bonus.',
    ] },
    { icon: '📔', title: 'Your notebook', lines: [
      'Notes holds your place stamps, recipe book, food book, fish book and budget book.',
      'Collect stamps by visiting places. Fill the whole stamp book for a gold frame on the map.',
      '📒 The budget book shows where your money came from and where it went.',
    ] },
    { icon: '🎆', title: 'Day, night and shows', lines: [
      'A day in Seoul lasts 3 hours, so night comes often. Shows are rare on purpose.',
      '20:10 Korea time, every day: the lantern parade from Cheonggyecheon to Jogyesa.',
      '23:10 Korea time: fireworks over Yeouido or a drone show at Ttukseom, taking turns day by day.',
      'A notice at the top of the screen tells you before a show starts.',
    ] },
    { icon: '💾', title: 'Saving your progress', lines: [
      'As a guest, your progress can be lost if you clear this browser or change devices.',
      '⚙️ Settings → Link Google account keeps your money, items and home safe, and lets you play on any device.',
    ] },
  ],
};
