// Build-time configuration. Values come from Vite env vars (VITE_*), set in
// .env.local for development or as GitHub repository variables for deploys.

export const config = {
  // 'local' = tabs in the same browser see each other (no server).
  netProvider: import.meta.env.VITE_NET_PROVIDER || 'local',
  net: {
    url: import.meta.env.VITE_REALTIME_URL || '',
    key: import.meta.env.VITE_REALTIME_PUBLIC_KEY || '',
    // Google OAuth web client ID (public). Enables Google's own sign-in button.
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  },
  // Max position updates per second while walking / running (other players
  // interpolate in between). Nothing is sent while standing still except a
  // heartbeat every netIdleInterval seconds.
  netSendRate: 6,
  netSendRateRun: 8,
  netIdleInterval: 10,
  // Couldn't join the room's realtime channel: play solo, try again after
  // this many seconds.
  netRetrySeconds: 8,
  // Riding (bike, car, any vehicle) moves fast, so a low rate shows as jumps:
  // riders send at the running rate and, while fewer than netRideFloorUntil
  // people are online, never less than netSendRateRide times a second.
  netSendRateRide: 3.5,
  netRideFloorUntil: 1000,
  // In a crowd each player sends less, so that what one player receives stays
  // near netRecvBudget messages a second (net/rate.js), never below
  // netSendRateMin. Realtime services count each message once per receiver.
  netRecvBudget: 20,
  netSendRateMin: 1.5,
  // Street multiplayer is split into square cells of this size (metres). You
  // see players in your cell and the 8 around it, i.e. at least this far.
  netCellSize: 200,
  // The live café's voice goes browser to browser (WebRTC). STUN finds a
  // way through most home routers; set VITE_ICE_SERVERS (JSON, the
  // RTCPeerConnection iceServers list) to add a TURN relay for the rest.
  voiceIceServers: (() => {
    try { return JSON.parse(import.meta.env.VITE_ICE_SERVERS || 'null'); } catch { return null; }
  })() || [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }],
  // Running uses stamina: a full bar lasts staminaMax seconds of running and
  // refills at staminaRegen per second after staminaDelay seconds of rest.
  // Once empty you walk until it is back to staminaResume (0..1).
  // staminaUnlimited is the hook for a future "unlimited stamina" pass.
  staminaMax: 10,
  staminaRegen: 2.5,
  staminaDelay: 1,
  staminaResume: 0.3,
  staminaUnlimited: false,
  // Text chat (speech bubbles + a short log). On while the world is small;
  // can be limited to some places later (e.g. only the café).
  chatEnabled: true,
  chatMaxLength: 80,
  chatCooldown: 1.2, // seconds between messages
  // On the street you only see chat from people this close (metres), and only
  // for a few seconds, so a busy street never fills up with strangers' chat.
  // Inside a shop or café everyone in the room hears everyone.
  chatStreetRadius: 15,
  chatStreetSeconds: 5,
  // Only players signed in with Google can send chat (guests can still read
  // it and see a sign-in prompt). Turn on together with chat_settings.google_only
  // in supabase/004_chat.sql, which enforces it on the server.
  chatGoogleOnly: false,
  // Rewarded ads behind "Watch an ad" (core/h5-ads.js). provider 'self':
  // the game's own short ad (a 1, 2, 3 count; core/wallet.js demoAd), no
  // Google. provider 'h5' uses Google's H5 Games Ads (AdSense) once `client`
  // is set; when Google has no ad to show, the game's own ad runs instead.
  // client: the AdSense publisher ID, e.g. 'ca-pub-1234567890123456'
  //   (VITE_ADSENSE_CLIENT overrides it at build time). Also put
  //   "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0" in public/ads.txt
  //   (public/ads.txt must match the ID used here).
  // test: true shows Google's test ads (no real money); set false after approval.
  rewardedAd: {
    provider: 'self', // back to 'h5' once Google serves ads
    client: import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-4337373973481597',
    test: true,
    reward: 5000, dailyLimit: 10, seconds: 3, // ₩5,000 per ad until the ad network approves the game (then ₩10,000), 10 a day (the server keeps its own numbers: wallet_settings)
  },
  // A thin 468x60 AdSense banner at the top left, wide computer screens only
  // (start screen and game; core/side-ad.js). slot: the display ad unit's
  // data-ad-slot number from AdSense (Ads > By ad unit > Display ads); empty =
  // no banner. Uses rewardedAd.client and rewardedAd.test.
  sideAd: { enabled: true, slot: import.meta.env.VITE_ADSENSE_SIDE_SLOT || '' },
  // "Support the creator" link in Settings (e.g. https://buymeacoffee.com/name).
  // Empty = the row stays hidden. VITE_SUPPORT_URL overrides it at build time.
  supportUrl: import.meta.env.VITE_SUPPORT_URL || 'https://buymeacoffee.com/hjseoul',
};
