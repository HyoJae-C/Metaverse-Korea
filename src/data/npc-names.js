// Names of the passers-by who stroll around each meeting zone (core/npcs.js).
//
// Every passer-by has their own name, and it belongs to their zone's letter:
// zone A is always Minji and Jihun, zone G always Yujin and Taemin, and so on.
// The daily mission "Find Jia and say hi" names one person, so the name must
// point at exactly one of them, and it must not move to another part of town
// when a zone is added, removed or reordered in zones.json (that used to
// happen: names were handed out by list position and repeated after twelve).
// No DOM, so it can be unit-tested.

export const PER_ZONE = 2;

// Two names per letter, A..Z, in order (A gets the first two).
export const NAMES = [
  '민지', '지훈', '서연', '도윤', '하은', '준서', '지아', '현우', '수빈', '예준', '다은', '시우', // A-F
  '유진', '태민', '소희', '건우', '채원', '민재', '나연', '동현', '윤서', '성민', '예린', '재원', // G-L
  '하린', '승우', '지민', '우진', '수아', '은호', '서윤', '민혁', '가은', '정우', '보람', '상훈', // M-R
  '미나', '영호', '혜진', '진수', '아름', '경민', '다인', '주원', '연우', '한결', '이서', '시현', // S-X
  '슬기', '태양', '은비', '도현', // Y-Z
];

// Revised Romanization, shown next to the Hangul in missions.
export const NAME_ROMAN = {
  민지: 'Minji', 지훈: 'Jihun', 서연: 'Seoyeon', 도윤: 'Doyun', 하은: 'Haeun', 준서: 'Junseo',
  지아: 'Jia', 현우: 'Hyeonu', 수빈: 'Subin', 예준: 'Yejun', 다은: 'Daeun', 시우: 'Siu',
  유진: 'Yujin', 태민: 'Taemin', 소희: 'Sohui', 건우: 'Geonu', 채원: 'Chaewon', 민재: 'Minjae',
  나연: 'Nayeon', 동현: 'Donghyeon', 윤서: 'Yunseo', 성민: 'Seongmin', 예린: 'Yerin', 재원: 'Jaewon',
  하린: 'Harin', 승우: 'Seungu', 지민: 'Jimin', 우진: 'Ujin', 수아: 'Sua', 은호: 'Eunho',
  서윤: 'Seoyun', 민혁: 'Minhyeok', 가은: 'Gaeun', 정우: 'Jeongu', 보람: 'Boram', 상훈: 'Sanghun',
  미나: 'Mina', 영호: 'Yeongho', 혜진: 'Hyejin', 진수: 'Jinsu', 아름: 'Areum', 경민: 'Gyeongmin',
  다인: 'Dain', 주원: 'Juwon', 연우: 'Yeonu', 한결: 'Hangyeol', 이서: 'Iseo', 시현: 'Sihyeon',
  슬기: 'Seulgi', 태양: 'Taeyang', 은비: 'Eunbi', 도현: 'Dohyeon',
};

// Where a zone's names start in NAMES: by its letter (zone ids are A..Z).
// Any other id falls back to a hash, so it still gets the same names every
// time (the test keeps zones.json to single letters, so they never clash).
function slotOf(id) {
  const s = String(id);
  if (/^[A-Z]$/.test(s)) return s.charCodeAt(0) - 65;
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % (NAMES.length / PER_ZONE);
}

// The k-th passer-by of zone `id`.
export function npcName(id, k) {
  return NAMES[(slotOf(id) * PER_ZONE + k) % NAMES.length];
}
