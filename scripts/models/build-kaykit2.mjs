// Builds the web GLBs for KayKit Adventurers 2.0 + Character Animations 1.1
// (both by Kay Lousberg, CC0, https://kaylousberg.com).
//  - Characters: drops capes, hats, helmets and the quiver (our hats and bags
//    go on instead), then dedups and quantizes.
//  - Animations: the clips live in separate files per theme (one shared
//    "Rig_Medium" skeleton). We keep only the clips we use, without meshes.
//
//   npm i --no-save @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions
//   node scripts/models/build-kaykit2.mjs <Adventurers_2.0 dir> <Character_Animations_1.1 dir> public/models/kaykit2
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize } from '@gltf-transform/functions';
import { mkdirSync } from 'node:fs';

const [adv, anim, out] = process.argv.slice(2);
// Only these three are worn in the game (src/data/characters/kaykit2.js): every
// outfit is the Rogue body repainted, Barbarian for the gym trainer's tank top.
const CHARS = ['Rogue', 'Rogue_Hooded', 'Barbarian'];
const DROP = /Cape|Hat|Helmet|Visor|Quiver/;
// file (Rig_Medium_<name>.glb) -> clips we keep. Keep in sync with
// src/data/characters/kaykit2.js.
export const CLIPS = {
  General: ['Idle_A', 'Interact', 'PickUp', 'Use_Item', 'Hit_A'],
  MovementBasic: ['Walking_A', 'Running_A', 'Jump_Full_Short'],
  Simulation: ['Cheering', 'Waving', 'Sit_Chair_Idle', 'Sit_Floor_Idle', 'Push_Ups', 'Sit_Ups', 'Lie_Idle'],
  Tools: ['Fishing_Idle', 'Fishing_Cast', 'Fishing_Reeling', 'Fishing_Catch', 'Holding_A'],
  CombatMelee: ['Melee_Unarmed_Attack_Punch_A'],
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
mkdirSync(out, { recursive: true });

for (const c of CHARS) {
  const doc = await io.read(`${adv}/Characters/gltf/${c}.glb`);
  for (const n of doc.getRoot().listNodes()) {
    if (n.getMesh() && DROP.test(n.getName())) { n.getMesh().dispose(); n.dispose(); }
  }
  await doc.transform(prune(), dedup(), quantize());
  await io.write(`${out}/${c.toLowerCase()}.glb`, doc);
}

for (const [file, keep] of Object.entries(CLIPS)) {
  const doc = await io.read(`${anim}/Animations/gltf/Rig_Medium/Rig_Medium_${file}.glb`);
  const root = doc.getRoot();
  for (const n of root.listNodes()) if (n.getMesh()) { n.getMesh().dispose(); n.setMesh(null); }
  for (const a of root.listAnimations()) {
    if (keep.includes(a.getName())) continue;
    for (const s of a.listSamplers()) s.dispose();
    for (const ch of a.listChannels()) ch.dispose();
    a.dispose();
  }
  await doc.transform(prune({ keepLeaves: true }), dedup());
  await io.write(`${out}/anims-${file.toLowerCase()}.glb`, doc);
}
