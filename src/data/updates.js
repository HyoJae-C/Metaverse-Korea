// The update board (⚙️ → 📢 Updates): notices for players, newest first.
// Each notice is short and plain (what changed for players, no technical
// details), and is checked by the game's owner before it goes in.
//   id:    unique, also used to show the "new" dot once per notice
//   at:    when it was announced, Korea time ('YYYY.MM.DD HH:MM')
//   title / items: per language; a language without its own text shows English.
export const UPDATES = [
  {
    id: '2026-11-04-a',
    at: '2026.11.04 05:00',
    title: {
      ko: '탈것 꾸미기 · 오리배 · 상점 개편',
      en: 'Ride skins, duck boats and coin shops',
    },
    items: {
      ko: [
        '페달랩에서 자전거, 보드, 인라인, 킥보드를 고를 수 있어요. 종류마다 ★ 3단계가 있어요.',
        '탈것 색상과 패턴(꽃, 번개, 하트, 별, 한글) 스킨이 생겼어요.',
        '뚝섬 한강공원 오리배 4척을 타고 강으로 나갈 수 있어요.',
        '모든 가격이 코인으로 바뀌었어요. 식당은 앉아서, 카페는 직원에게 주문해요.',
        '음료를 마시면 잠시 체력이 유지되고, 술을 마시면 살짝 느려져요.',
        '광장 안내원이 인형탈을 쓰고 춤추며 기다려요. NPC 이름표는 노란색이에요.',
        '이름은 다른 사람과 겹칠 수 없어요. 부적절한 이름은 경고 없이 바뀌거나 삭제될 수 있어요.',
        '지도에서 다른 지역으로 바로 갈 수 있고, 검색이 더 편해졌어요.',
      ],
      en: [
        'Pedal Lab now has bikes, skateboards, inline skates and kick scooters, each in 3 tiers.',
        'New ride skins: colours and patterns (flowers, lightning, hearts, stars, Hangul).',
        'Take one of four duck boats out on the river at Ttukseom Hangang Park.',
        'Everything is priced in coins now. Order seated at restaurants and from the staff at cafés.',
        'Drinks keep your stamina up for a while; alcohol makes you a little slower.',
        'The square guide now wears a mascot costume and dances. NPC name tags are yellow.',
        'Names must be unique. Inappropriate names may be changed or removed without warning.',
        'Jump to other districts from the map, and search is easier.',
      ],
    },
  },
];

// The text of a notice in a language (English when it has none).
export function updateText(u, lang) {
  return { title: u.title[lang] || u.title.en, items: u.items[lang] || u.items.en };
}

// Whether there is a notice newer than the last one seen.
export function hasNew(seenId, list = UPDATES) {
  return list.length > 0 && list[0].id !== seenId;
}
