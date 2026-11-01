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
};
