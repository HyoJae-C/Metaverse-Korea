// Shrinks the KayKit Adventurers GLBs for the web: drops weapons, capes and
// hats (the non-skinned meshes), keeps only the clips we use (in the first
// model only, since every model shares one rig), then dedups and quantizes.
// ~3.6 MB per file becomes ~160 KB (~650 KB for the one with the clips).
//
//   npm i --no-save @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions
//   for f in Rogue Rogue_Hooded Mage Knight Barbarian; do
//     node scripts/models/strip-kaykit.mjs <pack>/Characters/gltf/$f.glb public/models/kaykit/$(echo $f | tr A-Z a-z).glb $([ $f = Rogue ] && echo 1)
//   done
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize } from '@gltf-transform/functions';

const KEEP = new Set([
  'Idle', 'Walking_A', 'Running_A', 'Cheer', 'Interact', 'Sit_Chair_Idle', 'Sit_Floor_Idle',
  'Use_Item', 'PickUp', 'Hit_A', 'Jump_Idle', 'Unarmed_Melee_Attack_Punch_A', 'Lie_Idle', 'Death_A',
]);
const [src, out, keepAnims] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
const root = doc.getRoot();
for (const n of root.listNodes()) {
  if (n.getMesh() && !n.getSkin()) { n.getMesh().dispose(); n.dispose(); }
}
for (const a of root.listAnimations()) {
  if (keepAnims === '1' && KEEP.has(a.getName())) continue;
  // Only drop samplers and channels: clips share time accessors, and prune()
  // removes the ones nothing uses any more.
  for (const s of a.listSamplers()) s.dispose();
  for (const c of a.listChannels()) c.dispose();
  a.dispose();
}
await doc.transform(prune(), dedup(), quantize());
await io.write(out, doc);
