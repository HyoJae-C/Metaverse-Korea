// Multiplayer networking behind a small adapter interface, so the realtime
// provider can be swapped without touching game code.
//
// An adapter is an object with:
//   connect({ room, self, listenOnly })  → Promise<void>   self = { id, name, look }
//                             listenOnly: receive the room but don't appear in it
//   sendState(state)          state = { x, z, ry, s }  (position, heading, speed01)
//   sendEmote(emote)          e.g. 'wave'
//   sendLook(look)            outfit changed (e.g. trying something on)
//   disconnect()
//   setListenOnly(on)         optional: switch between joined and listen-only
//   updateSelf(self)          optional: keep name/look current for later announces
// and calls the handlers passed to its factory:
//   onJoin(peer)              peer = { id, name, look }
//   onLeave(id)
//   onState(id, state)
//   onEmote(id, emote)
//   onLook(id, look)
//
// Adapters live in ./adapters/. Pick one in src/config.js. The game talks to
// ./area.js, which splits big streets into cells and opens one adapter per cell.

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
