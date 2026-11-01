// Multiplayer networking behind a small adapter interface, so the realtime
// provider can be swapped without touching game code.
//
// An adapter is an object with:
//   connect({ room, self })   → Promise<void>   self = { id, name, outfit }
//   sendState(state)          state = { x, z, ry, s }  (position, heading, speed01)
//   sendEmote(emote)          e.g. 'wave'
//   disconnect()
// and calls the handlers passed to its factory:
//   onJoin(peer)              peer = { id, name, outfit }
//   onLeave(id)
//   onState(id, state)
//   onEmote(id, emote)
//
// Adapters live in ./adapters/. Pick one in src/config.js.

import { createLocalAdapter } from './adapters/local.js';

const FACTORIES = {
  local: async (handlers) => createLocalAdapter(handlers),
  // Loaded on demand so the provider SDK is only downloaded when used.
  supabase: async (handlers, cfg) => (await import('./adapters/supabase.js')).createSupabaseAdapter(handlers, cfg),
};

export async function createNet(provider, handlers, cfg = {}) {
  const make = FACTORIES[provider] || FACTORIES.local;
  return make(handlers, cfg);
}

export function registerAdapter(name, factory) {
  FACTORIES[name] = factory;
}
