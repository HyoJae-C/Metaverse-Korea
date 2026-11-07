// Jongmyo Shrine and Seosunra-gil: places in the district's own metres (x
// east, z south, (0, 0) in the middle of Oedaemun, Jongmyo's main gate on the
// south wall). The game adds the district offset from region.json, so this
// file never changes when the district moves. Built by
// scripts/build-jongmyo.mjs.
//
// Jongmyo (종묘) is the Joseon royal family's ancestral shrine: the spirit
// tablets of the kings and queens are kept in two long halls, Jeongjeon and
// Yeongnyeongjeon, and the royal ancestral rite (Jongmyo Jerye) is held there
// with its music and dance (Jongmyo Jeryeak). The game squeezes it into the
// room between Jongno and Yulgok-ro: the gate and Jongmyo Square on Jongno,
// the stone path (samdo) through the woods, the two halls in their walled
// yards. Seosunra-gil is the lane along the shrine's west wall, where
// patrols once walked; now hanok cafés and jewellery workshops line it.
//
// Real facts here were checked on 2026-11-07:
// - Jongmyo: World Heritage since 1995; Jongmyo Jerye and Jeryeak on
//   UNESCO's intangible heritage list since 2001; Jeongjeon has 19 spirit
//   chambers with 49 tablets, Yeongnyeongjeon 16 chambers with 34 tablets
//   (Korea Heritage Service, royal.khs.go.kr; Korea Tourism Organization).
// - Visiting: closed on Tuesdays; adults 1,000 won; on weekdays you go in
//   with a guided tour at set times (English tours too), on Saturdays you
//   can walk around freely. Hours change with the season. (Korea Heritage
//   Service; checked against travel guides.)
// - Seosunra-gil: named after the patrols (sunra) that guarded Jongmyo's
//   west side in the Joseon era; jewellery workshops and hanok cafés by
//   Jongno 3-ga Station; car-free on weekends 10:00-18:00 (Seoul
//   Metropolitan Government, mediahub.seoul.go.kr).

const T = (en, ko, ja, zh) => ({ en, ko, ja, zh });

export const JONGMYO = {
  district: 'jongmyo',
  // The shrine's outer wall [x0, z0 (south, the gate's line), x1, z1
  // (north)]. Inside it is drawn once you walk in (meta.enclosure).
  wall: [-56, 0, 84, -92],
  gate: { at: [0, 0], w: 8 }, // Oedaemun, three doors under one roof
  // The streets (district metres): Jongno along the south, Seosunra-gil
  // along the west wall, an alley west to the Sejong-ro side street.
  jongno: 24, // Jongno's centre line (z)
  lane: -62, // Seosunra-gil's centre line (x)
  // The stone path (삼도, samdo): three strips, the raised middle one (신도,
  // sindo) for the spirits. Runs from the gate to each hall's south gate.
  samdo: [
    [[0, -1], [0, -22]],
    [[0, -22], [40, -22]],
    [[40, -22], [40, -34]],
    [[0, -22], [-34, -22]],
    [[-34, -22], [-34, -40]],
  ],
  samdoW: 3.6, sindoW: 1.2,
  // Jeongjeon's yard [x0, z0, x1, z1], its gate (Namsinmun), the stone
  // terrace (woldae) and the hall.
  jeongjeon: { yard: [2, -34, 80, -90], gate: [40, -34], woldae: [6, -40, 76, -73], hall: [6, -75, 76, -87] },
  yeongnyeongjeon: { yard: [-52, -40, -14, -90], gate: [-34, -40], woldae: [-48, -48, -18, -73], hall: [-48, -75, -18, -86] },
  pond: [-46, -4, -26, -16], // the square pond with a round island (중지당지)
  // The ritual dance on Jeongjeon's woldae (36 dancers, 6 × 6) and the
  // musicians along the top of the terrace.
  rite: { at: [41, -56], rows: 6, gap: 1.9, band: { z: -71.5, x0: 22, x1: 60 } },
  // People: the guide inside the gate, two grandpas playing janggi on
  // Jongmyo Square (the real square is known for it).
  guide: { at: [6, -4], ry: Math.PI },
  janggi: [{ at: [26, 9] }, { at: [52, 9] }],
  // At the gate: what Jongmyo is, and how to visit.
  welcome: {
    title: T('Jongmyo Shrine', '종묘', '宗廟', '宗庙'),
    text: T(
      'The royal ancestral shrine of the Joseon dynasty. The spirit tablets of the kings and queens are kept in its two long halls, and the royal rite is still held here with its own music and dance. A UNESCO World Heritage site.',
      '조선 왕실의 사당이에요. 역대 왕과 왕비의 신주를 두 채의 긴 건물에 모셨고, 지금도 이곳에서 음악과 춤이 함께하는 제례를 올려요. 유네스코 세계유산이에요.',
      '朝鮮王朝の王室の霊廟。歴代の王と王妃の位牌を二棟の長い建物に祀り、今もここで音楽と舞を伴う祭礼が行われます。ユネスコ世界遺産です。',
      '朝鲜王朝的王室宗庙。两座长长的殿堂里供奉着历代国王和王后的神位，至今仍在这里举行伴有音乐和舞蹈的祭礼。联合国教科文组织世界遗产。'),
    rules: T(
      'Jongmyo is a shrine: walk quietly. The raised middle strip of the stone path is for the spirits, so walk on the side strips.',
      '종묘는 제사를 지내는 곳이에요. 조용히 걸어 주세요. 돌길 가운데 높은 길은 혼령이 다니는 길이니 양옆 길로 걸어요.',
      '宗廟は祭祀の場所です。静かにお歩きください。石畳の中央の高い道は霊の道なので、両脇の道を歩きましょう。',
      '宗庙是举行祭祀的地方，请安静行走。石路中间高起的路是神灵走的路，请走两侧的路。'),
  },
  // The guide's cards (tap the guide inside the gate).
  guideCards: [
    {
      icon: '🏛️', name: T('Jeongjeon', '정전', '正殿', '正殿'),
      text: T(
        'Jeongjeon is the main hall: 19 spirit chambers in one row, holding the tablets of 49 kings and queens. It is one of the longest wooden buildings in Korea. The plain, long roof and the wide stone terrace in front are meant to feel solemn, not grand.',
        '정전은 종묘의 중심 건물이에요. 신실 19칸이 한 줄로 이어져 왕과 왕비 49분의 신주를 모셨어요. 우리나라에서 가장 긴 목조 건물 가운데 하나예요. 단순하고 긴 지붕과 넓은 월대는 화려함보다 엄숙함을 보여 줘요.',
        '正殿は宗廟の中心の建物。19の神室が一列に並び、王と王妃49位の位牌を祀っています。韓国で最も長い木造建築の一つ。簡素で長い屋根と広い月台は、華やかさより厳かさを表しています。',
        '正殿是宗庙的中心建筑，19间神室连成一排，供奉着49位国王和王后的神位，是韩国最长的木结构建筑之一。简朴修长的屋顶和宽阔的月台，表现的是庄严而不是华丽。'),
    },
    {
      icon: '🏯', name: T('Yeongnyeongjeon', '영녕전', '永寧殿', '永宁殿'),
      text: T(
        'Yeongnyeongjeon, "the hall of eternal peace", was built for more tablets when Jeongjeon was full: 16 chambers with 34 tablets. Its middle four chambers stand taller, for the ancestors of the dynasty\'s founder.',
        '영녕전("영원히 평안하라")은 정전이 가득 차자 신주를 더 모시려고 지었어요. 신실 16칸에 34분의 신주를 모셨어요. 가운데 네 칸은 태조의 선대 조상을 모셔서 지붕이 더 높아요.',
        '永寧殿（「永遠に安らかに」）は正殿がいっぱいになり、さらに位牌を祀るために建てられました。16の神室に34位の位牌。中央の4室は太祖の祖先を祀るため屋根が高くなっています。',
        '永宁殿（“永远安宁”）是在正殿放满后，为供奉更多神位而建的，16间神室供奉34位神位。中间四间供奉太祖的先祖，所以屋顶更高。'),
    },
    {
      icon: '🛤️', name: T('The stone path (samdo)', '삼도', '三道', '三道'),
      text: T(
        'The path from the gate is three strips of stone. The raised middle one (sindo) is for the spirits of the ancestors; the king walked on the east strip and the crown prince on the west. Visitors still keep off the middle.',
        '정문에서 이어지는 돌길은 세 갈래예요. 가운데 높은 길(신도)은 조상의 혼령이 다니는 길이고, 동쪽 길은 임금, 서쪽 길은 세자가 걸었어요. 지금도 방문객은 가운데 길을 밟지 않아요.',
        '正門から続く石畳は三本。中央の高い道（神道）は祖先の霊の道で、東側を王、西側を世子が歩きました。今も訪問者は中央を歩きません。',
        '从正门延伸的石路分三条。中间高起的路（神道）是祖先神灵走的路，东侧由国王走，西侧由世子走。现在游客也不会踩中间的路。'),
    },
    {
      icon: '🥁', name: T('Jongmyo Jeryeak', '종묘제례악', '宗廟祭礼楽', '宗庙祭礼乐'),
      text: T(
        'At the royal rite the court orchestra plays on the terrace while dancers in red robes perform the ilmu, a dance in rows: the full rite has 64 dancers, eight rows of eight. Jongmyo Jerye and its music are on UNESCO\'s list of intangible heritage (2001).',
        '제례 때는 월대 위에서 궁중 악단이 음악을 연주하고, 붉은 옷을 입은 무용수들이 줄을 맞춰 일무를 춰요. 실제 제례에서는 여덟 줄에 여덟 명씩, 64명이 춰요. 종묘제례와 종묘제례악은 2001년 유네스코 인류무형유산이 되었어요.',
        '祭礼では月台の上で宮廷楽団が演奏し、赤い衣装の舞人が列を揃えて佾舞を舞います。実際の祭礼では8列×8人の64人。宗廟祭礼と祭礼楽は2001年にユネスコ無形文化遺産になりました。',
        '祭礼时，宫廷乐队在月台上演奏，身穿红衣的舞者排成行列跳佾舞。真正的祭礼是八行八列共64人。宗庙祭礼和祭礼乐于2001年列入联合国教科文组织人类非物质文化遗产。'),
    },
    {
      icon: '🎫', name: T('Visiting the real Jongmyo', '실제 종묘 방문', '実際の宗廟を訪ねる', '参观真实的宗庙'),
      text: T(
        'Real Jongmyo is by Jongno 3-ga Station. It is closed on Tuesdays and costs 1,000 won for adults. On weekdays you go in with a guided tour at set times (there are English tours); on Saturdays you can walk around on your own. Hours change with the season, so check the Korea Heritage Service website before you go.',
        '실제 종묘는 종로3가역 근처에 있어요. 화요일은 쉬고, 어른 관람료는 1,000원이에요. 평일에는 정해진 시간의 해설 관람으로만 들어가고(영어 해설도 있어요), 토요일에는 자유롭게 둘러볼 수 있어요. 계절마다 관람 시간이 달라지니 가기 전에 국가유산청 누리집에서 확인하세요.',
        '実際の宗廟は鍾路3街駅のそば。火曜休み、大人1,000ウォン。平日は決まった時間のガイドツアーでのみ入場（英語ツアーあり）、土曜日は自由観覧。季節で観覧時間が変わるので、行く前に国家遺産庁のサイトで確認を。',
        '真实的宗庙在钟路3街站附近。周二闭馆，成人门票1,000韩元。平日只能跟随定时讲解参观（有英语讲解），周六可以自由参观。开放时间随季节变化，出发前请在国家遗产厅网站确认。'),
    },
  ],
  // Seosunra-gil's sign (at the lane's south end, on Jongno).
  laneSign: {
    at: [-56.5, 13], ry: 0,
    title: T('Seosunra-gil', '서순라길', '西巡邏キル', '西巡逻路'),
    text: T(
      'The lane along Jongmyo\'s west stone wall. In the Joseon era patrols (sunra) walked here at night to guard the shrine, which gave the lane its name. Today it is lined with hanok cafés, restaurants and jewellery workshops; the real lane is car-free on weekends, 10:00-18:00.',
      '종묘 서쪽 돌담을 따라 난 길이에요. 조선 시대에 순라군이 밤마다 이 길을 돌며 종묘를 지켜서 서순라길이라는 이름이 붙었어요. 지금은 한옥 카페와 식당, 주얼리 공방이 늘어서 있고, 실제 서순라길은 주말 10시~18시에 차 없는 거리가 돼요.',
      '宗廟の西の石垣に沿った道。朝鮮時代、巡邏軍が夜ごとにこの道を巡って宗廟を守ったことから名前がつきました。今は韓屋カフェや食堂、ジュエリー工房が並び、実際の西巡邏キルは週末10時〜18時に歩行者天国になります。',
      '沿着宗庙西侧石墙的小路。朝鲜时代巡逻兵每晚沿这条路巡视守卫宗庙，因此得名。如今这里开满了韩屋咖啡馆、餐厅和首饰工坊，真实的西巡逻路周末10:00至18:00为步行街。'),
  },
};

// Rewards (coins), each paid once.
export const MANNERS_REWARD = 15; // reach Jeongjeon's terrace without stepping on the sindo
export const RITE_REWARD = 15; // watch the ritual dance for a while
export const RITE_WATCH = 20; // seconds of watching that count

// Which way a point is on the stone path: 'sindo' on the raised middle strip,
// 'side' on one of the side strips, null off the path. (x, z) district metres.
export function onSamdo(x, z) {
  const { samdo, samdoW, sindoW } = JONGMYO;
  let best = null;
  for (const [[ax, az], [bx, bz]] of samdo) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d <= sindoW / 2) return 'sindo';
    if (d <= samdoW / 2) best = 'side';
  }
  return best;
}

// Inside a box [x0, z0, x1, z1] (any corner order).
export function inBox(x, z, [ax, az, bx, bz]) {
  return x > Math.min(ax, bx) && x < Math.max(ax, bx) && z > Math.min(az, bz) && z < Math.max(az, bz);
}

// The manners walk and the rite: what you have done, saved on this device.
// A walk counts when you go in through the gate and reach Jeongjeon's
// terrace without stepping on the sindo. Watching the dance pays once.
const KEY = 'mk.jongmyo';
export class JongmyoBook {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let s = {};
    try { s = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* broken save */ }
    this.manners = s.manners === true;
    this.rite = s.rite === true;
    this.walk = null; // this visit: 'clean' after the gate, 'stepped' once on the sindo
  }
  save() {
    try { this.storage?.setItem(KEY, JSON.stringify({ manners: this.manners, rite: this.rite })); } catch { /* storage blocked */ }
  }
  // Walking in through the gate starts a walk.
  enter() { this.walk = 'clean'; }
  step() { if (this.walk) this.walk = 'stepped'; }
  // On the terrace: the coins this earns (0 unless a clean walk, first time).
  arrive() {
    const ok = this.walk === 'clean' && !this.manners;
    this.walk = null;
    if (!ok) return 0;
    this.manners = true;
    this.save();
    return MANNERS_REWARD;
  }
  // Watched the rite: the coins this earns (first time only).
  watched() {
    if (this.rite) return 0;
    this.rite = true;
    this.save();
    return RITE_REWARD;
  }
}
