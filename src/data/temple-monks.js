// The monks who live at Jogyesa and Bongeunsa (Yozi 2026-11-15: "2-3 is
// enough", and monks have shaved heads): two at each temple, one standing in
// front of Daeungjeon and bowing now and then, one walking the way in. In each district's own metres
// (the map's local x, z); game/temple-monks.js draws them.
//   bow: where a monk stands, bowing now and then to `face`.
//   walk: the points a monk walks, there and back, resting at each end.
export const MONK_LOOK = { model: 'hanbok-durumagi-gray', skirt: null, tee: null, hair: 'black', dye: 'black', hairStyle: 'shaved' };

export const MONK_SITES = [
  {
    id: 'jogyesa', district: 'gyeongbokgung', at: [106, 62], // (data/jogyesa.js)
    monks: [
      { bow: [103.4, 62.2], face: [103.4, 54.8] }, // at Daeungjeon's steps, beside the middle door
      { walk: [[124.8, 57.3], [118, 62.5], [118, 71], [99.5, 71]] }, // in through Iljumun, round under the canopy (clear of the baby Buddha, the stele and the pagoda tree)
    ],
  },
  {
    id: 'bongeunsa', district: 'samseong', at: [-133.3, -197.8], // (the courtyard's middle, scripts/bongeunsa-layout.mjs)
    monks: [
      { bow: [-136.9, -200.2], face: [-138.2, -206.9] }, // in the courtyard, facing Daeungjeon
      { walk: [[-117.6, -160.5], [-126, -183.5]] }, // the way in, from Jinyeomun to Beopwangru
    ],
  },
];
