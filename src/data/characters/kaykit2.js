// Character model pack: KayKit "Adventurers" 2.0 with the "Character
// Animations" 1.1 pack, both by Kay Lousberg (CC0, https://kaylousberg.com).
// Capes, hats, helmets and the quiver are stripped from the GLBs, and only
// the clips we use are kept (scripts/models/build-kaykit2.mjs).
// Everyday clothes: each model's own torso, legs and sleeves are swapped for
// modern clothes built in code (core/outfit-mesh.js), keeping its head.
// outfit: the shape (hem height, sleeve length, collar, pockets...);
// colors: fixed colours for roles ("top" and "bottom" default to the look's
// T-shirt and trouser colours); wear: atlas rules for what is left of the
// model's head (core/model-pack.js, applyWear), e.g. no earrings.
const HANDS = [['Head', '3,0', 'cut']]; // no earrings
const wear = ({ outfit, colors, rules = [] }) => ({
  outfit,
  rules: [...rules, ...HANDS],
  colors: { shoes: 0xffffff, sole: 0x5d5952, accent: 0x3b3a40, stitch: 0x1d1d22, ...colors },
});
// A crew-neck T-shirt, jeans and sneakers.
const TEE = { outfit: { hem: 0.6, sleeve: 0.42, collar: 'top' } };
// A denim jacket, open over a white T-shirt.
const JACKET = { outfit: { hem: 0.58, sleeve: 0.84, cuff: 'top', panel: 'accent', collar: 'top', bulk: 0.012 }, colors: { top: 0x7f9fcc, accent: 0xf4f1ea } };
// A grey hoodie with a front pocket, hood up.
const HOODIE = { outfit: { hem: 0.56, sleeve: 0.84, cuff: 'top', pocket: 'accent', bulk: 0.012 }, colors: { top: 0x9d9fa6, accent: 0x8a8c93 }, rules: [['Head', '1,1', 'top']] };
// A black long padded coat (롱패딩) down to the knees.
const LONG_PADDING = { outfit: { hem: 0.6, coat: 0.2, sleeve: 0.84, cuff: 'top', quilt: true, bulk: 0.03, zip: 'accent', collar: 'top' }, colors: { top: 0x2b2b31, accent: 0x55565e, stitch: 0x111114 } };
// A short cream puffer jacket.
const PUFFER = { outfit: { hem: 0.5, sleeve: 0.84, cuff: 'top', quilt: true, bulk: 0.045, zip: 'accent', collar: 'top' }, colors: { top: 0xe8e2d6, accent: 0x8d8a84, stitch: 0xb9b2a5 } };
// A sleeveless sports top, shorts and white socks.
const TANK = { outfit: { hem: 0.6, sleeve: 0, shorts: 0.3, socks: 'accent2' }, colors: { accent2: 0xf4f1ea } };
// A short-sleeved shirt with a collar and a button placket.
const SHIRT = { outfit: { hem: 0.6, sleeve: 0.5, cuff: 'top', collar: 'top', placket: 'accent' }, colors: { accent: 0xf4f1ea } };
// A dark suit jacket, open over a white dress shirt (front and collar), with
// black leather shoes: the guide at the War History Museum's information
// desk wears it with a suit skirt (look.skirt).
const SUIT = { outfit: { hem: 0.6, sleeve: 0.84, cuff: 'top', panel: 'accent', collar: 'accent', bulk: 0.01 }, colors: { top: 0x2a2e38, accent: 0xf4f1ea, shoes: 0x1d1d22, sole: 0x111114 } };
// Men's clothes from the Dongdaemun fashion malls (Gentle Floor, Gwajam
// Club), all on the basic model so the face stays the same.
// A wool overcoat down to the knees, open over a knit (accent).
const OVERCOAT = { outfit: { hem: 0.6, coat: 0.2, sleeve: 0.84, cuff: 'top', panel: 'accent', collar: 'top', bulk: 0.018 }, colors: { accent: 0x2b2b31 } };
// A varsity jacket (과잠): wool body, sleeves in another colour (accent2),
// ribbed collar, cuffs and snap placket (accent).
const VARSITY = { outfit: { hem: 0.56, sleeve: 0.84, arms: 'accent2', cuff: 'accent', collar: 'accent', placket: 'accent', bulk: 0.016 } };
// A crew-neck knit jumper with ribbed cuffs.
const KNIT = { outfit: { hem: 0.56, sleeve: 0.84, cuff: 'accent', collar: 'accent', bulk: 0.012 } };

// Swimwear (the changing rooms at Olympic Park Pool, core/pool-hall.js):
// a sleeveless one-piece, or a short-sleeved rash guard over swim shorts,
// barefoot, with a swim cap (cap: its colour; hood: the cap hides the hair).
// Only worn inside the pool hall, like trying clothes on.
const SWIM_ONE = { outfit: { hem: 0.6, sleeve: 0, shorts: 0.5, barefoot: true } };
const SWIM_GUARD = { outfit: { hem: 0.6, sleeve: 0.42, cuff: 'accent', shorts: 0.36, barefoot: true } };

// Hanbok (rented at the hanbok shop, data/hanbok.js). A short jeogori over a
// high chima (look.skirt), with a white collar (dongjeong), coloured cuffs
// (kkeutdong) and a ribbon (goreum); a longer jeogori over baji trousers;
// and a long durumagi overcoat. "bottom" is the baji's own colour.
const IVORY = 0xfbf6ea;
const JEOGORI = { outfit: { hem: 0.86, sleeve: 0.84, cuff: 'accent', collar: 'accent2', goreum: 'accent', bulk: 0.006 }, colors: { accent2: IVORY } };
const BAJI = { outfit: { hem: 0.6, sleeve: 0.84, cuff: 'accent', collar: 'accent2', goreum: 'accent', bulk: 0.014 }, colors: { accent2: IVORY } };
const DURUMAGI = { outfit: { hem: 0.6, coat: 0.2, sleeve: 0.84, cuff: 'top', collar: 'accent2', goreum: 'accent', bulk: 0.02 }, colors: { accent2: IVORY } };

// Colour variants of a garment: { id: colours } -> model defs on one GLB.
const variants = (glb, emoji, base, list, extra = {}) => Object.fromEntries(Object.entries(list).map(([id, colors]) => [id,
  { url: `models/kaykit2/${glb}.glb`, emoji, wear: wear({ ...base, colors: { ...base.colors, ...colors } }), ...extra }]));

export default {
  id: 'kaykit2',
  models: {
    // Everyone wears everyday clothes: the adventurer outfits repainted part
    // by part (core/model-pack.js, applyWear). "top" takes the T-shirt
    // colour picked at the start (look.shirt), "bottom" the trousers colour.
    // basic: a T-shirt, jeans and sneakers on the rogue.
    basic: { url: 'models/kaykit2/rogue.glb', emoji: '👕', wear: wear(TEE) },
    // The rest are sold at the clothes shop (the old costume ids are kept so
    // bought items and saved looks still work).
    rogue: { url: 'models/kaykit2/rogue.glb', emoji: '🧥', wear: wear(JACKET) },
    hooded: { url: 'models/kaykit2/rogue_hooded.glb', emoji: '🧢', wear: wear(HOODIE), hood: true },
    // The padded coats, the tank top and the shirt are all on the basic
    // model too: every other head is someone else's face (the knight's is
    // blond with a big nose, the mage's has long black hair and thick brows,
    // the barbarian and ranger have a beard and a moustache), which players
    // saw as their face changing when they put the clothes on.
    mage: { url: 'models/kaykit2/rogue.glb', emoji: '🧥', wear: wear(LONG_PADDING) },
    knight: { url: 'models/kaykit2/rogue.glb', emoji: '🧥', wear: wear(PUFFER) },
    barbarian: { url: 'models/kaykit2/rogue.glb', emoji: '🎽', wear: wear(TANK) },
    ranger: { url: 'models/kaykit2/rogue.glb', emoji: '👔', wear: wear(SHIRT) },
    // The gym trainer (an NPC) keeps the bearded head.
    trainer: { url: 'models/kaykit2/barbarian.glb', emoji: '🎽', wear: wear(TANK) },
    // The museum guide (an NPC): a suit over a white shirt.
    suit: { url: 'models/kaykit2/rogue.glb', emoji: '👔', wear: wear(SUIT) },
    // The same clothes in other colours, sold at the other clothes shops.
    ...variants('rogue', '🧥', JACKET, {
      'jacket-black': { top: 0x2b2b31 }, 'jacket-indigo': { top: 0x34477a }, 'jacket-cocoa': { top: 0x8a5a3c }, 'jacket-olive': { top: 0x6b7a45 },
    }),
    ...variants('rogue_hooded', '🧢', HOODIE, {
      'hoodie-black': { top: 0x2b2b31, accent: 0x3a3a42 }, 'hoodie-wine': { top: 0x8a2f45, accent: 0x74263a }, 'hoodie-orange': { top: 0xff7a00, accent: 0xd96800 },
    }, { hood: true }),
    ...variants('rogue', '👔', SHIRT, {
      'shirt-white': { top: 0xf4f1ea, accent: 0xd9d4ca }, 'shirt-denim': { top: 0x8fb0d6 }, 'shirt-olive': { top: 0x7a8a55 },
    }),
    ...variants('rogue', '🧥', PUFFER, {
      'puffer-black': { top: 0x2b2b31, accent: 0x55565e, stitch: 0x111114 }, 'puffer-mustard': { top: 0xd9a43a, accent: 0x8d6a2a, stitch: 0xa8822e },
    }),
    ...variants('rogue', '🧥', LONG_PADDING, {
      'padding-white': { top: 0xeeeae2, accent: 0xa9a59c, stitch: 0xc4beb2 },
    }),
    // Men's clothes (Dongdaemun Fashion Town).
    ...variants('rogue', '🤵', SUIT, {
      'suit-charcoal': { top: 0x767a84 }, 'suit-navy': { top: 0x44589a },
    }),
    ...variants('rogue', '🧥', OVERCOAT, {
      'coat-camel': { top: 0xdcbc8e, accent: 0x2b2b31 }, 'coat-charcoal': { top: 0x7a7c84, accent: 0xe9e4d8 },
    }),
    ...variants('rogue', '🧥', VARSITY, {
      'varsity-navy': { top: 0x44589a, accent: 0xf3ecdc, accent2: 0xf3ecdc },
      'varsity-black': { top: 0x22222a, accent: 0xf4f1ea, accent2: 0xf4f1ea },
      'varsity-green': { top: 0x3f7a52, accent: 0xf3ecdc, accent2: 0xc9b38a },
    }),
    ...variants('rogue', '🧶', KNIT, {
      'knit-grey': { top: 0x9a9ca3, accent: 0x84868d }, 'knit-navy': { top: 0x51639a, accent: 0x44558a }, 'knit-cream': { top: 0xeee6d3, accent: 0xddd3bd },
    }),
    // Hanbok: all on the basic model, so the face stays the same.
    ...variants('rogue', '🪭', JEOGORI, {
      'hanbok-yellow': { top: 0xffd36e, accent: 0xc8323f },
      'hanbok-pink': { top: 0xffc2d2, accent: 0x2f3c66 },
      'hanbok-mint': { top: 0x9edccf, accent: 0xe0607e },
      // a court lady (궁녀) in the Gyeongbokgung procession
      'hanbok-gungnyeo': { top: 0x5f9e6e, accent: 0x7a2e3a },
      // the queen (왕비): a light green jeogori over a red chima
      'hanbok-queen': { top: 0xb4e07a, accent: 0xc8323f },
    }),
    ...variants('rogue', '🪭', BAJI, {
      'hanbok-baji': { top: 0x9cc3e6, accent: 0x2f3c66, bottom: 0xd8d2c2 },
      // more men's sets
      'hanbok-baji-navy': { top: 0x2f3c66, accent: 0xc8a24a, bottom: 0xd8d2c2 },
      'hanbok-baji-jade': { top: 0x5fae8f, accent: 0x2f3c66, bottom: 0xe8e0cc },
      'hanbok-baji-ivory': { top: 0xf3ecdc, accent: 0x8a5a34, bottom: 0x6b6f7a },
      // all in white: the Bukcheong lion dance musicians (core/bukcheong.js)
      'hanbok-baji-white': { top: 0xf7f4ec, accent: 0xe2dccd, bottom: 0xf3efe5 },
      // the pungmul troupe (core/pungmul.js): white clothes, a blue collar and ties
      'hanbok-pungmul': { top: 0xfbf8f0, accent: 0x2f5fb0, bottom: 0xfbf8f0 },
    }),
    ...variants('rogue', '🪭', DURUMAGI, {
      'hanbok-durumagi': { top: 0xb9a6f0, accent: 0x6b4fb8, bottom: 0xefe6d2 },
      'hanbok-durumagi-navy': { top: 0x34477a, accent: 0x1f2a4a, bottom: 0xefe6d2 },
      'hanbok-durumagi-gray': { top: 0x8f939a, accent: 0x4a4e57, bottom: 0xd8d2c2 },
      'hanbok-durumagi-white': { top: 0xf3eee2, accent: 0x9a8f7a, bottom: 0xefe6d2 },
      // the Gyeongbokgung procession: the king's red robe (곤룡포) and the
      // eunuch's dark green robe (단령)
      'hanbok-gonryongpo': { top: 0xc23a33, accent: 0xd9a43a, bottom: 0xc23a33 },
      'hanbok-dallyeong': { top: 0x2f5a4a, accent: 0x1d1b22, bottom: 0x2f5a4a },
      // the bearers of the red parasol and the ceremonial fan (홍포)
      'hanbok-hongpo': { top: 0xb8322c, accent: 0x1d1b22, bottom: 0xb8322c },
    }),
    // Sky view costumes (operators only, game/sky-flight.js): Seoulman's
    // green suit with blue trousers and red cuffs, collar and boots; the
    // flight suit's armoured under-layer with light-bar trims.
    'sky-seoulman': { url: 'models/kaykit2/rogue.glb', emoji: '🦸', wear: wear({ outfit: { hem: 0.6, sleeve: 0.84, cuff: 'accent', collar: 'accent', bulk: 0.004 }, colors: { top: 0x1f9e5a, bottom: 0x2f5fd6, accent: 0xe0302f, shoes: 0xe0302f, sole: 0xb8262a } }) },
    'sky-armor': { url: 'models/kaykit2/rogue.glb', emoji: '🤖', wear: wear({ outfit: { hem: 0.6, sleeve: 0.84, cuff: 'accent', collar: 'accent', placket: 'accent', bulk: 0.03 }, colors: { top: 0x3a4658, bottom: 0x2e3746, accent: 0x5ff5d8, shoes: 0x262e3b, sole: 0x1b2029, stitch: 0x5ff5d8 } }) },
    // Swimwear (Olympic Park Pool).
    ...variants('rogue', '🩱', SWIM_ONE, {
      'swim-navy': { top: 0x24407a, bottom: 0x24407a },
      'swim-coral': { top: 0xff7a6b, bottom: 0xff7a6b },
    }, { hood: true, cap: true }),
    ...variants('rogue', '🩳', SWIM_GUARD, {
      'swim-mint': { top: 0x7cd3c7, accent: 0x1f4e8c, bottom: 0x1f4e8c },
      'swim-yellow': { top: 0xffd93d, accent: 0x1d1b22, bottom: 0x1d1b22 },
      'swim-red': { top: 0xe5383b, accent: 0xffffff, bottom: 0xe5383b }, // the lifeguard's
    }, { hood: true, cap: true }),
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
  // Added to the chair clip, which leaves the legs hanging straight: thighs
  // forward along the seat, knees bent so the shins go down.
  sitPose: { upperlegl: [-1.45, 0, 0], upperlegr: [-1.45, 0, 0], lowerlegl: [1.3, 0, 0], lowerlegr: [1.3, 0, 0] },
  ride: { y: 0.24, z: 0.16 }, // offset on a bike
  // Lying flat on the back (the model is turned about its feet): up by half
  // the body's depth, and forward so the middle of the body is on the spot.
  lie: { y: 0.7, z: 0.6 }, // on a clinic bed (top at 0.55 m)
  lieMat: { y: 0.16, z: 0.6 }, // on a picnic mat on the grass
  // On a bike the sitting clip is bent a little more: lean forward, head down,
  // arms reaching for the handlebar (radians added to the clip, per bone).
  ridePose: { spine: [0.35, 0, 0], head: [0.15, 0, 0], upperarml: [-1.25, 0, 0], upperarmr: [-1.25, 0, 0], lowerarml: [-0.25, 0, 0], lowerarmr: [-0.25, 0, 0] },
  // Driving a car: sit upright, only the arms reach forward to the wheel.
  carPose: { upperarml: [-1.15, 0, 0], upperarmr: [-1.15, 0, 0], lowerarml: [-0.35, 0, 0], lowerarmr: [-0.35, 0, 0] },
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
