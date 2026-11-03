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
    // The hooded rogue with its green outfit repainted black: our ninja.
    hooded: { url: 'models/kaykit/rogue_hooded.glb', emoji: '🥷', recolor: { hue: [95, 185], sat: 0.25, to: '#2e2a36' } },
    mage: { url: 'models/kaykit/mage.glb', emoji: '🧙' },
    knight: { url: 'models/kaykit/knight.glb', emoji: '💂' },
    barbarian: { url: 'models/kaykit/barbarian.glb', emoji: '🧔' },
  },
  scale: 0.57, // model is ~2.2 units tall; our characters are ~1.25 m
  sit: { y: -0.02, z: 0.24 }, // offset on a café chair (metres, after scale)
  ride: { y: 0.24, z: 0.16 }, // offset on a bike
  // On a bike the sitting clip is bent a little more: lean forward, head down,
  // arms reaching for the handlebar (radians added to the clip, per bone).
  ridePose: { spine: [0.35, 0, 0], head: [0.15, 0, 0], upperarml: [-1.25, 0, 0], upperarmr: [-1.25, 0, 0], lowerarml: [-0.25, 0, 0], lowerarmr: [-0.25, 0, 0] },
  hide: /Cape|Hat|Helmet/i, // any leftover non-body meshes
  bones: { head: 'head', chest: 'chest' },
  // Cells of the 8×4 colour atlas (column, row from the top) that the hair
  // salon and the clinic repaint: hair (and beards), skin, and eyes.
  atlas: { cols: 8, rows: 4, hair: [1, 0], skin: [0, 0], eyes: [2, 0] },
  // Our action names -> clip names in the pack.
  anims: {
    idle: 'Idle', walk: 'Walking_A', run: 'Running_A', sit: 'Sit_Chair_Idle', ride: 'Sit_Chair_Idle',
    wave: 'Cheer', cheer: 'Jump_Idle', laugh: 'Cheer', clap: 'Use_Item', bow: 'PickUp',
    angry: 'Unarmed_Melee_Attack_Punch_A', shrug: 'Interact', cry: 'Sit_Floor_Idle',
  },
};
