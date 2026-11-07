// Stamp trails (스탬프 코스): a few tour stamps (data/stamps.js) walked as one
// course. Finishing a course (every stamp in it, in any order) pays its
// reward once. To add a course, add an entry here.
//   stamps: the stamp ids, in the order the course is meant to be walked.
export const TRAILS = [
  {
    // Inspired by the real Seoul City Wall walk (한양도성 순성길), whose walkers
    // also collect stamps along the wall (Seoul Metropolitan Government).
    id: 'citywall', icon: '🏯', reward: 50,
    name: { ko: '한양도성 성곽길', en: 'Seoul City Wall Trail', ja: '漢陽都城 城郭の道', zh: '汉阳都城城墙路' },
    intro: {
      ko: '숭례문에서 남산 정상(케이블카)을 지나 이간수문, 흥인지문까지 옛 도성의 성곽을 따라 걸어요. 실제 서울에서도 성곽길을 걷는 사람들이 성문에서 스탬프를 모아요.',
      en: 'Walk the old city wall from Sungnyemun over the top of Namsan (take the cable car) to the Igansumun water gate and Heunginjimun. In real Seoul, people who walk the City Wall Trail collect stamps at the gates too.',
      ja: '崇礼門から南山の頂上（ケーブルカー）を通って二間水門、興仁之門まで、旧都城の城壁に沿って歩こう。実際のソウルでも城郭の道を歩く人が城門でスタンプを集めています。',
      zh: '从崇礼门经过南山山顶（坐缆车），到二间水门和兴仁之门，沿着旧都城的城墙走一走。在现实中的首尔，走城墙路的人也会在城门收集印章。',
    },
    stamps: ['sungnyemun', 'namsan', 'igansumun', 'heunginjimun'],
  },
  {
    // The Joseon royal places in the game's Jongno-gu: the palace, the hanok
    // village beside it and the royal shrine, linked by Yulgok-ro.
    id: 'royal', icon: '👑', reward: 40,
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
