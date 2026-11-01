// Build-time configuration. Values come from Vite env vars (VITE_*), set in
// .env.local for development or as GitHub repository variables for deploys.

export const config = {
  // 'local' = tabs in the same browser see each other (no server).
  netProvider: import.meta.env.VITE_NET_PROVIDER || 'local',
  net: {
    url: import.meta.env.VITE_REALTIME_URL || '',
    key: import.meta.env.VITE_REALTIME_PUBLIC_KEY || '',
  },
  // How often to send our position (per second).
  netSendRate: 10,
};
