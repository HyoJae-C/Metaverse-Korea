// Character model pack: KayKit Character Pack "Adventurers" 1.0 by Kay Lousberg
// (CC0, https://kaylousberg.com). Weapons, capes and hats are stripped from the
// GLBs (scripts/models/strip-kaykit.mjs). To switch to another pack later, add a
// file like this one and point src/data/characters/index.js at it.
export default {
  id: 'kaykit',
  // Every model shares one rig; the clips live in the first model's file.
  animsFrom: 'rogue',
  models: {
    rogue: { url: 'models/kaykit/rogue.glb', emoji: '🧝' },
    hooded: { url: 'models/kaykit/rogue_hooded.glb', emoji: '🥷' },
    mage: { url: 'models/kaykit/mage.glb', emoji: '🧙' },
    knight: { url: 'models/kaykit/knight.glb', emoji: '💂' },
    barbarian: { url: 'models/kaykit/barbarian.glb', emoji: '🧔' },
  },
  scale: 0.57, // model is ~2.2 units tall; our characters are ~1.25 m
  sit: { y: -0.02, z: 0.24 }, // offset on a café chair (metres, after scale)
  ride: { y: 0.24, z: 0.16 }, // offset on a bike
  hide: /Cape|Hat|Helmet/i, // any leftover non-body meshes
  bones: { head: 'head', chest: 'chest' },
  // Our action names -> clip names in the pack.
  anims: {
    idle: 'Idle', walk: 'Walking_A', run: 'Running_A', sit: 'Sit_Chair_Idle', ride: 'Sit_Chair_Idle',
    wave: 'Cheer', cheer: 'Jump_Idle', laugh: 'Cheer', clap: 'Use_Item', bow: 'PickUp',
    angry: 'Unarmed_Melee_Attack_Punch_A', shrug: 'Interact', cry: 'Sit_Floor_Idle',
  },
};
