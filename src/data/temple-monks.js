// The monks who live at Jogyesa and Bongeunsa (Yozi 2026-11-15: "2-3 is
// enough", and monks have shaved heads): two at each temple, one standing in
// front of Daeungjeon and bowing now and then, one walking the way in. In each district's own metres
// (the map's local x, z); game/temple-monks.js draws them.
//   bow: where a monk stands, bowing now and then to `face`.
//   walk: the points a monk walks, there and back, resting at each end.
export const MONK_LOOK = { model: 'hanbok-durumagi-gray', skirt: null, tee: null, hair: 'black', dye: 'black', hairStyle: 'shaved' };

export const MONK_SITES = [
  {
    id: 'jogyesa', district: 'gyeongbokgung', at: [115, 60], // (data/jogyesa.js)
    monks: [
      { bow: [113.6, 61.2], face: [113.6, 52.5] }, // at Daeungjeon's steps, beside the middle door
      { walk: [[125, 57.5], [121.5, 60], [121.5, 64.4], [104, 64.4]] }, // in through Iljumun, round under the canopy (clear of the baby Buddha and the pagoda tree)
    ],
  },
  {
    id: 'bongeunsa', district: 'samseong', at: [-124.2, -181.7], // (the courtyard's middle, scripts/bongeunsa-layout.mjs)
    monks: [
      { bow: [-122.7, -183.2], face: [-127.4, -187.7] }, // in the courtyard, facing Daeungjeon
      { walk: [[-114.1, -158.3], [-118.4, -170.2]] }, // the way in, from Jinyeomun to Beopwangru
    ],
  },
];
