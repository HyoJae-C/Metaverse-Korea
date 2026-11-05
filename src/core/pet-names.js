// Your own name for a pet (bag → ✏️ Name). Kept per pet in this browser and
// in the cloud save (an "mk." key). Pets aren't shown to other players, so
// only you see the name. Empty name = back to the shop's name.
import { cleanName } from './identity.js';

const KEY = 'mk.petNames';
export const PET_NAME_MAX = 10;
export const cleanPetName = (s) => cleanName(s).trim().slice(0, PET_NAME_MAX).trim();

export function readPetNames(storage = globalThis.localStorage) {
  try {
    const o = JSON.parse(storage?.getItem(KEY) || '{}');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch { return {}; }
}

export function customPetName(id, storage = globalThis.localStorage) {
  const n = readPetNames(storage)[id];
  return typeof n === 'string' ? cleanPetName(n) : '';
}

// Returns the name that was kept ('' when cleared).
export function setPetName(id, name, storage = globalThis.localStorage) {
  const all = readPetNames(storage);
  const n = cleanPetName(name);
  if (n) all[id] = n; else delete all[id];
  try { storage?.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
  return n;
}
