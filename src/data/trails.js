// Stamp trails (스탬프 코스): a few tour stamps (data/stamps.js) walked as one
// course. Finishing a course (every stamp in it, in any order) pays its
// reward once. To add a course, add an entry here.
//   stamps: the stamp ids, in the order the course is meant to be walked.
export const TRAILS = [
  {
    // The Joseon royal places in the game's Jongno-gu: the palace, the hanok
    // village beside it and the royal shrine, linked by Yulgok-ro.
    id: 'royal', icon: '👑', reward: 30000,
    name: { ko: '조선 왕실 산책', en: 'Joseon Royal Walk', ja: '朝鮮王室さんぽ', zh: '朝鲜王室漫步' },
    intro: {
      ko: '조선의 왕이 살던 경복궁에서 출발해 양반들이 살던 북촌 한옥마을을 지나, 왕실 조상을 모신 종묘까지 율곡로를 따라 걸어요.',
      en: 'Start at Gyeongbokgung, where the Joseon kings lived, walk through Bukchon, the hanok village of the noble families, and on along Yulgok-ro to Jongmyo, the shrine of the royal ancestors.',
      ja: '朝鮮の王が暮らした景福宮から、両班が住んだ北村韓屋村を通って、王室の祖先を祀る宗廟まで栗谷路を歩こう。',
      zh: '从朝鲜国王居住的景福宫出发，穿过两班贵族居住的北村韩屋村，沿栗谷路走到供奉王室祖先的宗庙。',
    },
    stamps: ['gyeongbokgung', 'bukchon', 'jongmyo'],
  },
];
