// Build-time configuration. Values come from Vite env vars (VITE_*), set in
// .env.local for development or as GitHub repository variables for deploys.

export const config = {
  // 'local' = tabs in the same browser see each other (no server).
  netProvider: import.meta.env.VITE_NET_PROVIDER || 'local',
  net: {
    url: import.meta.env.VITE_REALTIME_URL || '',
    key: import.meta.env.VITE_REALTIME_PUBLIC_KEY || '',
  },
  // Max position updates per second while walking / running (other players
  // interpolate in between). Nothing is sent while standing still except a
  // heartbeat every netIdleInterval seconds.
  netSendRate: 6,
  netSendRateRun: 8,
  netIdleInterval: 5,
  // Street multiplayer is split into square cells of this size (metres). You
  // see players in your cell and the 8 around it, i.e. at least this far.
  netCellSize: 200,
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
  chatStreetRadius: 10,
  chatStreetSeconds: 5,
  // Rewarded ads (demo until an ad network is set up; see core/wallet.js).
  rewardedAd: { provider: 'demo', reward: 20, dailyLimit: 5, seconds: 5 },
};
