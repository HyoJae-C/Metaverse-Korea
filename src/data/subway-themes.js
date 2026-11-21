// What each subway station is for, so the train's "where do you get off?"
// list can be cut down by theme (most visitors don't know station names).
// Keyed by the station id in region.json; a station may have more than one.
// A station that isn't listed shows only under "All".
export const SUBWAY_THEMES = [
  { id: 'culture', icon: '🏯', key: 'metro.tab.culture' },
  { id: 'shop', icon: '🛍', key: 'metro.tab.shop' },
  { id: 'park', icon: '🌳', key: 'metro.tab.park' },
];

export const STATION_THEMES = {
  'seongsu-station': ['shop'],
  'seoul-forest-station': ['park'],
  'gyeongbokgung-station': ['culture'],
  'anguk-station': ['culture'], // Bukchon
  'gwanghwamun-station': ['culture'],
  'sinchon-station': ['shop'],
  'hongik-univ-station': ['shop'],
  'mangwon-station': ['park'], // Mangwon Han River Park, the sunset
  'seoul-station': ['culture'], // Sungnyemun, the city wall
  'myeongdong-station': ['shop'],
  'yeouinaru-station': ['park'],
  'ddp-station': ['shop', 'culture'],
  'dongmyo-station': ['shop'],
  'itaewon-station': ['shop'],
  'samseong-station': ['shop', 'culture'], // COEX, Bongeunsa
  'jamsil-station': ['park', 'shop'], // the lake, Another Land, the tower
  'mongchontoseong-station': ['park', 'culture'], // Olympic Park
  'childrens-grand-park-station': ['park'],
  'ichon-station': ['culture', 'park'], // the art museum, Yongsan Family Park's weekend farm
  'gimpo-airport-station': ['culture'], // planes from the roof deck
};
