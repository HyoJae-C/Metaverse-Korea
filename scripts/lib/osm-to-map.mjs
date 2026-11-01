// Converts an Overpass API JSON response into the compact map format the
// game loads at runtime (public/regions/<id>/map.json).
//
// Coordinates: local metres around the region centre.
//   x = east, z = south (so north is -z), matching three.js conventions.

const EARTH_R = 6378137;

export function makeProjector(center) {
  const lat0 = (center.lat * Math.PI) / 180;
  const mPerDegLat = (Math.PI / 180) * EARTH_R;
  const mPerDegLon = mPerDegLat * Math.cos(lat0);
  return {
    toLocal(lat, lon) {
      return [
        round1((lon - center.lon) * mPerDegLon),
        round1(-(lat - center.lat) * mPerDegLat),
      ];
    },
  };
}

function round1(v) {
  return Math.round(v * 10) / 10 + 0; // + 0 turns -0 into 0
}

// Road width in metres by OSM highway class.
export const ROAD_WIDTH = {
  motorway: 20, trunk: 18, primary: 14, secondary: 12, tertiary: 10,
  motorway_link: 7, trunk_link: 7, primary_link: 7, secondary_link: 7, tertiary_link: 7,
  unclassified: 6, residential: 6, living_street: 5, service: 4,
  pedestrian: 5, footway: 2.5, path: 2, cycleway: 2.5, steps: 2.5, track: 3,
};

const WALKWAY = new Set(['pedestrian', 'footway', 'path', 'cycleway', 'steps', 'track']);

const AREA_KIND = (tags) => {
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
  if (tags.landuse === 'grass' || tags.landuse === 'recreation_ground') return 'grass';
  if (tags.natural === 'water' || tags.waterway === 'riverbank') return 'water';
  if (tags.leisure === 'pitch' || tags.leisure === 'playground') return 'grass';
  return null;
};

export function buildingHeight(tags, id) {
  const h = parseFloat(tags.height);
  if (Number.isFinite(h) && h > 0) return Math.min(h, 250);
  const lv = parseFloat(tags['building:levels']);
  if (Number.isFinite(lv) && lv > 0) return Math.min(lv * 3.2, 250);
  // Seongsu is mostly low-rise; pick a stable pseudo-random 2-5 storey height.
  const storeys = 2 + (hash(id) % 4);
  return storeys * 3.2;
}

function hash(n) {
  let x = Number(n) | 0;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  return ((x >>> 16) ^ x) >>> 0;
}

function pickNames(tags) {
  const out = {};
  if (tags.name) out.ko = tags.name;
  if (tags['name:ko']) out.ko = tags['name:ko'];
  if (tags['name:en']) out.en = tags['name:en'];
  if (tags['name:ja']) out.ja = tags['name:ja'];
  if (tags['name:zh']) out.zh = tags['name:zh'];
  return Object.keys(out).length ? out : undefined;
}

function isElevated(tags) {
  return tags.bridge === 'yes' || tags.bridge === 'viaduct' || Number(tags.layer) > 0;
}

export function osmToMap(overpass, region) {
  const proj = makeProjector(region.center);
  const nodes = new Map();
  for (const el of overpass.elements) {
    if (el.type === 'node') nodes.set(el.id, el);
  }
  const ptsOf = (way) => {
    const pts = [];
    for (const id of way.nodes || []) {
      const n = nodes.get(id);
      if (n) pts.push(proj.toLocal(n.lat, n.lon));
    }
    return pts;
  };

  const roads = [];
  const buildings = [];
  const rail = [];
  const areas = [];
  const pois = [];

  for (const el of overpass.elements) {
    const tags = el.tags || {};
    if (el.type === 'node') {
      if (tags.railway === 'station' || tags.public_transport === 'station') {
        const [x, z] = proj.toLocal(el.lat, el.lon);
        pois.push({ kind: 'station', x, z, name: pickNames(tags) });
      }
      continue;
    }
    if (el.type !== 'way') continue;
    const p = ptsOf(el);
    if (p.length < 2) continue;

    if (tags.building || tags['building:part']) {
      if (p.length < 4) continue;
      if (tags.building === 'roof') continue; // canopies; skip for now
      const b = { h: round1(buildingHeight(tags, el.id)), p: closeless(p) };
      const minH = parseFloat(tags.min_height);
      if (Number.isFinite(minH) && minH > 0) b.m = round1(minH);
      const name = pickNames(tags);
      if (name) b.n = name;
      buildings.push(b);
    } else if (tags.highway && ROAD_WIDTH[tags.highway] && tags.area !== 'yes') {
      if (tags.tunnel === 'yes' || Number(tags.layer) < 0) continue;
      const lanes = parseInt(tags.lanes, 10);
      let w = ROAD_WIDTH[tags.highway];
      if (Number.isFinite(lanes) && !WALKWAY.has(tags.highway)) w = Math.max(w, lanes * 3.2);
      const r = { k: WALKWAY.has(tags.highway) ? 'walk' : tags.highway, w, p };
      const name = pickNames(tags);
      if (name) r.n = name;
      roads.push(r);
    } else if (tags.railway && ['subway', 'rail', 'light_rail'].includes(tags.railway)) {
      if (tags.tunnel === 'yes' || Number(tags.layer) < 0) continue;
      rail.push({ e: isElevated(tags) ? 1 : 0, p });
    } else {
      const k = AREA_KIND(tags);
      if (k && p.length >= 4) areas.push({ k, p: closeless(p) });
    }
  }

  return {
    meta: {
      region: region.id,
      generatedAt: new Date().toISOString(),
      source: 'OpenStreetMap',
      attribution: '© OpenStreetMap contributors',
      license: 'ODbL 1.0',
      licenseUrl: 'https://www.openstreetmap.org/copyright',
      center: region.center,
      counts: { roads: roads.length, buildings: buildings.length, rail: rail.length, areas: areas.length },
    },
    roads,
    buildings,
    rail,
    areas,
    pois,
  };
}

// OSM closed ways repeat the first node at the end; drop it.
function closeless(p) {
  const a = p[0];
  const b = p[p.length - 1];
  return a[0] === b[0] && a[1] === b[1] ? p.slice(0, -1) : p;
}

export function overpassQuery(bbox) {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:90];
(
  way["highway"](${b});
  way["building"](${b});
  way["building:part"](${b});
  way["railway"~"^(subway|rail|light_rail)$"](${b});
  way["leisure"~"^(park|garden|pitch|playground)$"](${b});
  way["landuse"~"^(grass|recreation_ground)$"](${b});
  way["natural"="water"](${b});
  node["railway"="station"](${b});
);
out body;
>;
out skel qt;`;
}
