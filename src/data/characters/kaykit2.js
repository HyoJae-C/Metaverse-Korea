// Character model pack: KayKit "Adventurers" 2.0 with the "Character
// Animations" 1.1 pack, both by Kay Lousberg (CC0, https://kaylousberg.com).
// Capes, hats, helmets and the quiver are stripped from the GLBs, and only
// the clips we use are kept (scripts/models/build-kaykit2.mjs).
export default {
  id: 'kaykit2',
  models: {
    rogue: { url: 'models/kaykit2/rogue.glb', emoji: '🧝' },
    // The hooded rogue with its green outfit repainted black: our ninja.
    hooded: { url: 'models/kaykit2/rogue_hooded.glb', emoji: '🥷', recolor: { hue: [95, 185], sat: 0.25, to: '#2e2a36' } },
    mage: { url: 'models/kaykit2/mage.glb', emoji: '🧙' },
    knight: { url: 'models/kaykit2/knight.glb', emoji: '💂' },
    barbarian: { url: 'models/kaykit2/barbarian.glb', emoji: '🧔' },
    ranger: { url: 'models/kaykit2/ranger.glb', emoji: '🧭' },
  },
  // Every model shares one rig ("Rig_Medium"); the clips are in these files.
  // The first ones are needed right away, the rest load in the background.
  animFiles: [
    { url: 'models/kaykit2/anims-general.glb', eager: true },
    { url: 'models/kaykit2/anims-movementbasic.glb', eager: true },
    { url: 'models/kaykit2/anims-simulation.glb', eager: true },
    { url: 'models/kaykit2/anims-tools.glb' },
    { url: 'models/kaykit2/anims-combatmelee.glb' },
  ],
  scale: 0.57, // model is ~2.2 units tall; our characters are ~1.25 m
  sit: { y: -0.02, z: 0.24 }, // offset on a café chair (metres, after scale)
  ride: { y: 0.24, z: 0.16 }, // offset on a bike
  // On a bike the sitting clip is bent a little more: lean forward, head down,
  // arms reaching for the handlebar (radians added to the clip, per bone).
  ridePose: { spine: [0.35, 0, 0], head: [0.15, 0, 0], upperarml: [-1.25, 0, 0], upperarmr: [-1.25, 0, 0], lowerarml: [-0.25, 0, 0], lowerarmr: [-0.25, 0, 0] },
  hide: /Cape|Hat|Helmet|Visor|Quiver/i, // any leftover non-body meshes
  bones: { head: 'head', chest: 'chest' },
  // Cells of the 8×4 colour atlas (column, row from the top) that the hair
  // salon and the clinic repaint: hair (and beards), skin, and eyes.
  atlas: { cols: 8, rows: 4, hair: [1, 0], skin: [0, 0], eyes: [2, 0] },
  // Our action names -> clip names in the pack.
  anims: {
    idle: 'Idle_A', walk: 'Walking_A', run: 'Running_A', sit: 'Sit_Chair_Idle', ride: 'Sit_Chair_Idle',
    wave: 'Waving', cheer: 'Cheering', laugh: 'Jump_Full_Short', clap: 'Use_Item', bow: 'PickUp',
    angry: 'Melee_Unarmed_Attack_Punch_A', shrug: 'Interact', cry: 'Sit_Floor_Idle',
    // Activities: held as a pose while doing them (gym, fishing, sauna).
    pushup: 'Push_Ups', situp: 'Sit_Ups', fish: 'Fishing_Idle', cast: 'Fishing_Cast', reel: 'Fishing_Reeling', catch: 'Fishing_Catch', lie: 'Lie_Idle', floor: 'Sit_Floor_Idle',
  },
};
