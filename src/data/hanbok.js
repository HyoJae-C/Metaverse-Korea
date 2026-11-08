// Hanbok you can rent at the hanbok shop near Gyeongbokgung (stores.json:
// each product's `rent` is an id here). A rental puts the hanbok on for
// RENT_HOURS of real time, then your own clothes come back by themselves
// (core/hanbok-rental.js). The look it puts on (wear) uses the hanbok
// models in data/characters and the chima skirts in data/skirts.js.
// Prices are game coins only. The shop and its sets are fictional examples.

export const RENT_HOURS = 2;

const set = (coins, wear) => ({ coins, wear }); // names: the shop's products

export const HANBOK = {
  'yellow-red': set(15000, { model: 'hanbok-yellow', skirt: 'chima-red', tee: null }),
  'pink-navy': set(15000, { model: 'hanbok-pink', skirt: 'chima-navy', tee: null }),
  'mint-pink': set(15000, { model: 'hanbok-mint', skirt: 'chima-pink', tee: null }),
  'baji-blue': set(15000, { model: 'hanbok-baji', skirt: null, tee: null }),
  'durumagi-lilac': set(18000, { model: 'hanbok-durumagi', skirt: null, tee: null }),
  // more men's sets
  'baji-navy': set(15000, { model: 'hanbok-baji-navy', skirt: null, tee: null }),
  'baji-jade': set(15000, { model: 'hanbok-baji-jade', skirt: null, tee: null }),
  'baji-ivory': set(15000, { model: 'hanbok-baji-ivory', skirt: null, tee: null }),
  'durumagi-navy': set(18000, { model: 'hanbok-durumagi-navy', skirt: null, tee: null }),
  'durumagi-gray': set(18000, { model: 'hanbok-durumagi-gray', skirt: null, tee: null }),
};

export const hanbokById = (id) => (typeof id === 'string' && Object.hasOwn(HANBOK, id) ? HANBOK[id] : null);
// Is this a hanbok model (only worn while renting)?
export const isHanbokModel = (model) => typeof model === 'string' && model.startsWith('hanbok-');
