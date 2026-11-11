// Information Centers: the words the street needs (the area names shown
// when you walk into a neighbourhood, the first-time hint that points new
// players to a center, the guides' name tags). The guides' panel itself
// (ui/info-ui.js) downloads the first time a guide is asked.
import { L } from './pocha-ui.js';

const T = {
  title: { en: 'Information Center', ko: '안내센터', ja: 'インフォメーションセンター', zh: '信息中心' },
  intro: {
    en: 'Welcome! Here is everything you can do around town. Tap "Go" and the guide line takes you there.',
    ko: '어서 오세요! 이 동네에서 할 수 있는 것들을 모았어요. "가기"를 누르면 길 안내 선이 데려다줘요.',
    ja: 'ようこそ！この街でできることをまとめました。「行く」を押すと道案内が表示されます。',
    zh: '欢迎！这里汇总了城里能做的事。点“前往”就会显示路线。',
  },
  go: { en: 'Go', ko: '가기', ja: '行く', zh: '前往', es: 'Ir', id: 'Pergi', vi: 'Đi', hi: 'चलें', fr: 'Y aller', th: 'ไป', ar: 'اذهب' },
  gameGuide: { en: 'Game Guide', ko: '게임 안내', ja: 'ゲーム案内', zh: '游戏向导', es: 'Guía del juego', id: 'Pemandu Game', vi: 'Hướng dẫn trò chơi', hi: 'गेम गाइड', fr: 'Guide du jeu', th: 'คู่มือเกม', ar: 'مرشد اللعبة' },
  areaGuide: { en: 'Area Guide', ko: '지역 안내', ja: 'エリア案内', zh: '地区向导', es: 'Guía de la zona', id: 'Pemandu Area', vi: 'Hướng dẫn khu vực', hi: 'इलाक़ा गाइड', fr: 'Guide du quartier', th: 'คู่มือพื้นที่', ar: 'مرشد المنطقة' },
  askGame: { en: 'Ask about the game', ko: '게임 안내 듣기', ja: 'ゲームについて聞く', zh: '询问游戏玩法', es: 'Preguntar por el juego', id: 'Tanya soal game', vi: 'Hỏi về trò chơi', hi: 'गेम के बारे में पूछें', fr: 'Questions sur le jeu', th: 'ถามเรื่องเกม', ar: 'اسأل عن اللعبة' },
  askArea: { en: 'Ask about {name}', ko: '{name} 안내 듣기', ja: '{name}について聞く', zh: '询问{name}', es: 'Preguntar por {name}', id: 'Tanya soal {name}', vi: 'Hỏi về {name}', hi: '{name} के बारे में पूछें', fr: 'Questions sur {name}', th: 'ถามเรื่อง {name}', ar: 'اسأل عن {name}' },
  gameTitle: { en: 'Game guide', ko: '게임 안내', ja: 'ゲーム案内', zh: '游戏指南', es: 'Guía del juego', id: 'Panduan game', vi: 'Hướng dẫn trò chơi', hi: 'गेम गाइड', fr: 'Guide du jeu', th: 'คู่มือเกม', ar: 'دليل اللعبة' },
  gameIntro: {
    en: 'Here is how things work in Another Seoul. Ask my colleague next to me about places in this neighbourhood.',
    ko: '어나더 서울에서 할 수 있는 것들을 알려 드릴게요. 이 동네 장소는 옆 동료에게 물어보세요.',
    ja: 'アナザーソウルの遊び方をご案内します。この辺りの場所は隣の同僚に聞いてください。',
    zh: '这里介绍Another Seoul的玩法。这一带有哪些地方，请问我旁边的同事。',
    es: 'Así funciona Another Seoul. Pregunta a mi compañero de al lado por los lugares de este barrio.',
    id: 'Begini cara main di Another Seoul. Tanyakan tempat-tempat di sekitar sini ke rekan di sebelahku.',
    vi: 'Đây là cách chơi Another Seoul. Hỏi đồng nghiệp bên cạnh tôi về các địa điểm trong khu này nhé.',
    hi: 'Another Seoul में चीज़ें ऐसे चलती हैं। इस इलाक़े की जगहों के बारे में मेरे बगल वाले साथी से पूछें।',
    fr: 'Voici comment ça marche dans Another Seoul. Demande à mon collègue à côté pour les lieux de ce quartier.',
    th: 'นี่คือวิธีเล่นใน Another Seoul ถ้าอยากรู้เรื่องสถานที่ในย่านนี้ ถามเพื่อนร่วมงานข้างๆ ฉันได้เลย',
    ar: 'إليك كيف تسير الأمور في Another Seoul. اسأل زميلي بجانبي عن أماكن هذا الحي.',
  },
  areaTitle: { en: '{name} guide', ko: '{name} 안내', ja: '{name}案内', zh: '{name}指南', es: 'Guía de {name}', id: 'Panduan {name}', vi: 'Hướng dẫn {name}', hi: '{name} गाइड', fr: 'Guide de {name}', th: 'คู่มือ {name}', ar: 'دليل {name}' },
  morePlaces: { en: 'More places here', ko: '이 동네의 다른 곳', ja: 'この辺りのほかの場所', zh: '这一带的其他地方', es: 'Más lugares aquí', id: 'Tempat lain di sini', vi: 'Thêm địa điểm ở đây', hi: 'यहाँ की और जगहें', fr: 'Plus de lieux ici', th: 'สถานที่อื่นๆ ที่นี่', ar: 'أماكن أخرى هنا' },
  otherAreas: { en: 'Other neighbourhoods', ko: '다른 동네', ja: 'ほかのエリア', zh: '其他街区', es: 'Otros barrios', id: 'Lingkungan lain', vi: 'Khu khác', hi: 'दूसरे इलाक़े', fr: 'Autres quartiers', th: 'ย่านอื่นๆ', ar: 'أحياء أخرى' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  hint: {
    en: 'New here? Visit the Information Center by the square to see everything you can do.',
    ko: '처음 오셨나요? 광장 앞 안내센터에서 할 수 있는 것들을 알려드려요.',
    ja: '初めてですか？広場前のインフォメーションセンターで、できることを紹介しています。',
    zh: '第一次来？去广场前的信息中心看看能做些什么吧。',
  },
  hintGo: { en: 'Show me the way', ko: '길 안내', ja: '道案内', zh: '带我去' },
  later: { en: 'Later', ko: '나중에', ja: 'あとで', zh: '以后再说' },
  never: { en: "Don't show again", ko: '다시 보지 않기', ja: '今後表示しない', zh: '不再显示' },
};

// Each neighbourhood: its name, what the area guide says first, and where
// "Go" leads from another neighbourhood's guide.
export const AREA = {
  seongsu: { icon: '🛍️', to: { zone: 'A-1' },
    name: { en: 'Seongsu', ko: '성수', ja: '聖水', zh: '圣水', es: 'Seongsu', id: 'Seongsu', vi: 'Seongsu', hi: 'सोंगसू', fr: 'Seongsu', th: 'ซองซู', ar: 'سونغسو' },
    intro: { en: 'Seongsu: café streets, fashion and beauty shops, perfume houses and pop-ups around Seongsu Square, with Seoul Forest and the Han River close by.', ko: '성수: 성수 광장을 둘러싼 카페 거리, 패션·뷰티 가게, 향수 가게와 팝업. 서울숲과 한강도 가까워요.', ja: '聖水：聖水広場を囲むカフェ通り、ファッション・ビューティーの店、香水店とポップアップ。ソウルの森と漢江もすぐ近く。', zh: '圣水：圣水广场周围的咖啡街、时装美妆店、香水店和快闪店，首尔林和汉江也很近。' } },
  gyeongbokgung: { icon: '🏯', to: { zone: 'B-1' },
    name: { en: 'Gyeongbokgung', ko: '경복궁', ja: '景福宮', zh: '景福宫', es: 'Gyeongbokgung', id: 'Gyeongbokgung', vi: 'Gyeongbokgung', hi: 'ग्योंगबोकगुंग', fr: 'Gyeongbokgung', th: 'เคียงบกกุง', ar: 'غيونغبوكغونغ' },
    intro: { en: 'Gyeongbokgung: Gwanghwamun Square and the palace, a hanbok rental, a traditional tea house and a kimchi class. South of the square, Cheonggyecheon Stream starts at Cheonggye Plaza, and east along Jongno you can ring the bell at Bosingak.', ko: '경복궁: 광화문광장과 궁궐, 한복대여점, 전통찻집, 김치 만들기 교실. 광장 남쪽 청계광장에서 청계천이 시작되고, 종로를 따라 동쪽으로 가면 보신각에서 종을 쳐 볼 수 있어요.', ja: '景福宮：光化門広場と王宮、韓服レンタル、伝統茶房、キムチ教室。広場の南、清渓広場から清渓川が始まり、鍾路を東へ行くと普信閣で鐘をつけます。', zh: '景福宫：光化门广场和宫殿、韩服租赁、传统茶馆、泡菜课。广场南边的清溪广场是清溪川的起点，沿钟路往东走可以在普信阁敲钟。' } },
  bukchon: { icon: '🏘️', to: { zone: 'B-3' },
    name: { en: 'Bukchon', ko: '북촌', ja: '北村', zh: '北村', es: 'Bukchon', id: 'Bukchon', vi: 'Bukchon', hi: 'बुकचोन', fr: 'Bukchon', th: 'บุกชอน', ar: 'بوكتشون' },
    intro: { en: 'Bukchon Hanok Village: hanok alleys on the hill between Gyeongbokgung and Changdeokgung, up from Anguk Station. Climb the alley to the hilltop for the famous photo, walk into the Open House, tie a knot charm or make a hanji lantern, and rent a hanbok. The alleys up the hill are a Quiet Zone: people live there, so walking only. Real Bukchon: in the Bukchon-ro 11-gil area visitors are welcome 10:00 to 17:00 (since Nov 2024). Check before you go.', ko: '북촌한옥마을: 안국역에서 올라가는 경복궁과 창덕궁 사이 언덕의 한옥 골목. 언덕 꼭대기에 올라 유명한 장면을 사진에 담고, 열린 한옥에 들어가 보고, 매듭 노리개와 한지 등을 만들고, 한복도 빌려요. 언덕 위 골목은 주민이 사는 조용한 골목이라 걸어서만 다녀요. 실제 북촌로11길 일대는 관광객 방문 시간이 오전 10시~오후 5시예요(2024년 11월부터). 가기 전에 확인하세요.', ja: '北村韓屋村：安国駅から上る、景福宮と昌徳宮の間の丘の韓屋の路地。丘のてっぺんで有名な景色を撮り、オープンハウスに入り、結びのお守りや韓紙の灯りを作り、韓服も借りられます。丘の路地は人が暮らす静かな路地なので歩いてのみ。実際の北村路11ギル一帯の観光客の訪問時間は10時〜17時（2024年11月から）。行く前に確認を。', zh: '北村韩屋村：从安国站往上走，景福宫和昌德宫之间山坡上的韩屋小巷。爬到坡顶拍下有名的景色，走进开放韩屋，编绳结挂饰、做韩纸灯，还能租韩服。坡上的小巷住着居民，是安静小巷，只能步行。现实中北村路11街一带游客参观时间为10:00至17:00（2024年11月起），出发前请确认。' } },
  jongmyo: { icon: '🏛️', to: { zone: 'B-4' },
    name: { en: 'Jongmyo Shrine', ko: '종묘', ja: '宗廟', zh: '宗庙', es: 'Santuario Jongmyo', id: 'Kuil Jongmyo', vi: 'Đền Jongmyo', hi: 'जोंगम्यो', fr: 'Sanctuaire de Jongmyo', th: 'ศาลเจ้าชงมโย', ar: 'ضريح جونغميو' },
    intro: { en: 'Jongmyo Shrine, on Jongno: the royal ancestral shrine of the Joseon dynasty, with its two long halls in the woods. Walk the stone path the right way (keep off the raised middle, it is for the spirits) and watch the ritual dance on Jeongjeon\'s terrace. Real Jongmyo: closed on Tuesdays, guided tours on weekdays, free walking on Saturdays. Check before you go.', ko: '종로의 종묘: 숲속에 긴 건물 두 채가 있는 조선 왕실의 사당이에요. 돌길을 바르게 걷고(가운데 높은 길은 혼령의 길이라 밟지 않아요) 정전 월대에서 제례 춤을 구경해요. 실제 종묘는 화요일에 쉬고, 평일에는 해설 관람, 토요일에는 자유 관람이에요. 가기 전에 확인하세요.', ja: '鍾路の宗廟：森の中に二棟の長い建物が建つ朝鮮王室の霊廟。石畳を正しく歩き（中央の高い道は霊の道なので歩きません）、正殿の月台で祭礼の舞を見よう。実際の宗廟は火曜休み、平日はガイドツアー、土曜は自由観覧。行く前に確認を。', zh: '钟路的宗庙：树林中有两座长殿的朝鲜王室宗庙。正确地走石路（中间高起的路是神灵的路，不要踩），在正殿月台上观看祭礼舞蹈。真实的宗庙周二闭馆，平日跟随讲解参观，周六自由参观，出发前请确认。' } },
  dongmyo: { icon: '🥔', to: { zone: 'B-5' },
    name: { en: 'Dongmyo', ko: '동묘', ja: '東廟', zh: '东庙', es: 'Dongmyo', id: 'Dongmyo', vi: 'Dongmyo', hi: 'दोंगम्यो', fr: 'Dongmyo', th: 'ทงมโย', ar: 'دونغميو' },
    intro: { en: 'Dongmyo, on Jong-ro east of Heunginjimun: a shrine to the Chinese general Guan Yu from the Joseon era, and beside it Seoul\'s best-known flea market for second-hand clothes. Here it is Potato Market: spread a mat, lay out clothes you bought, pick your price, and others can buy while you are away. Around the edge, 10 different markets are open, from New Potato Market to Steamed Potato Market: tap in front of a stall to see its name.', ko: '흥인지문 동쪽 종로의 동묘: 조선 시대에 지은 관우 장군의 사당이고, 그 옆은 서울에서 가장 유명한 헌옷 벼룩시장이에요. 여기서는 감자마켓: 돗자리를 펴고 내가 산 옷을 올려 값을 정하면, 내가 없을 때도 다른 사람이 살 수 있어요. 둘레에는 햇감자장터부터 찐감자장터까지 서로 다른 장터 10곳이 열려 있어요. 가판 앞에서 누르면 이름이 나와요.', ja: '興仁之門の東、鍾路の東廟：朝鮮時代に建てられた関羽将軍の霊廟で、隣はソウルで一番有名な古着の蚤の市。ここではポテトマーケット：シートを広げ、買った服を並べて値段を決めれば、留守の間も他の人が買えます。周りには新じゃが市場からふかし芋市場まで、10の違う市場が営業中です。露店の前で押すと名前が出ます。', zh: '兴仁之门东边钟路上的东庙：朝鲜时代修建的关羽将军庙，旁边是首尔最有名的二手衣跳蚤市场。这里是土豆市场：铺开垫子，摆上你买的衣服并定价，你不在时别人也能买。四周有从新土豆集市到蒸土豆集市的10个不同集市在营业，在摊位前点一下就能看到名字。' } },
  myeongdong: { icon: '⛪', to: { store: 'mulbangul-skin' },
    name: { en: 'Myeongdong', ko: '명동', ja: '明洞', zh: '明洞', es: 'Myeongdong', id: 'Myeongdong', vi: 'Myeongdong', hi: 'म्योंगदोंग', fr: 'Myeongdong', th: 'มย็องดง', ar: 'ميونغدونغ' },
    intro: { en: 'Myeongdong, between Eulji-ro and Toegye-ro: Seoul\'s busiest shopping streets, known for skincare and lip-tint shops, and at the top of the hill Myeongdong Cathedral, Korea\'s first Gothic brick church (1898). The cathedral is a place of prayer, so look round quietly.', ko: '을지로와 퇴계로 사이의 명동: 서울에서 가장 붐비는 쇼핑 거리로, 스킨케어와 립 틴트 가게로 유명해요. 언덕 위에는 한국 최초의 고딕 양식 벽돌 성당인 명동대성당(1898년)이 있어요. 기도하는 곳이니 조용히 둘러봐 주세요.', ja: '乙支路と退渓路の間の明洞：ソウルで一番にぎわうショッピング街で、スキンケアとリップティントの店で有名です。丘の上には韓国初のゴシック様式のれんが造りの聖堂、明洞大聖堂（1898年）があります。祈りの場なので静かに見学してください。', zh: '乙支路和退溪路之间的明洞：首尔最热闹的购物街，以护肤品和唇釉店闻名。山坡上是韩国第一座哥特式砖造教堂——明洞大教堂（1898年）。这里是祈祷的地方，请安静参观。' } },
  itaewon: { icon: '🌍', to: { zone: 'C-1' },
    name: { en: 'Itaewon', ko: '이태원', ja: '梨泰院', zh: '梨泰院', es: 'Itaewon', id: 'Itaewon', vi: 'Itaewon', hi: 'इतेवॉन', fr: 'Itaewon', th: 'อิแทวอน', ar: 'إيتايوون' },
    intro: { en: 'Itaewon: World Food Street and cafés in the north-west, bars and clubs in the north-east, and Yongmaru Market (traditional market) south-west of the station. West along Itaewon-ro: the War History Museum, a quiet place to remember.', ko: '이태원: 북서쪽 세계음식거리와 카페, 북동쪽 바와 클럽, 역 남서쪽의 용마루시장(전통시장). 이태원로를 따라 서쪽으로 가면 조용히 추모할 수 있는 전쟁역사박물관이 있어요.', ja: '梨泰院：北西に世界グルメ通りとカフェ、北東にバーとクラブ、駅の南西にヨンマル市場（伝統市場）。梨泰院路を西へ行くと、静かに追悼できる戦争歴史博物館があります。', zh: '梨泰院：西北是世界美食街和咖啡馆，东北是酒吧和夜店，车站西南是龙脊市场（传统市场）。沿梨泰院路往西是战争历史博物馆，一个可以静静缅怀的地方。' } },
  songpa: { icon: '🎡', to: { store: 'another-land' },
    name: { en: 'Songpa', ko: '송파', ja: '松坡', zh: '松坡', es: 'Songpa', id: 'Songpa', vi: 'Songpa', hi: 'सोंगपा', fr: 'Songpa', th: 'ซงพา', ar: 'سونغبا' },
    intro: { en: 'Songpa: walks around Seokchon Lake and Another Land, the theme park on the lake island, by Jamsil Station. On the north shore: HANEUL Department Store and HANEUL MALL, and Another Tower by Jamsil Station. Olympic Park is further east along Olympic-ro.', ko: '송파: 잠실역 옆 석촌호수 산책길과 호수 섬 위의 놀이공원 어나더랜드. 북쪽 호숫가에는 하늘 백화점과 하늘몰, 잠실역 옆에는 어나더타워가 있어요. 올림픽로를 따라 동쪽으로 가면 올림픽공원이에요.', ja: '松坡：蚕室駅のそば、石村湖の散歩道と湖の島の遊園地アナザーランド。北側の湖畔にはハヌル百貨店とハヌルモール、蚕室駅のそばにアナザータワー。オリンピック路を東へ行くとオリンピック公園。', zh: '松坡：蚕室站旁的石村湖步道和湖心岛上的游乐园另一乐园。北边湖畔有天空百货和天空购物中心，蚕室站旁有另一塔。沿奥林匹克路往东就是奥林匹克公园。' } },
  'olympic-park': { icon: '🛹', to: { zone: 'F-1' },
    name: { en: 'Olympic Park', ko: '올림픽공원', ja: 'オリンピック公園', zh: '奥林匹克公园', es: 'Parque Olímpico', id: 'Taman Olimpiade', vi: 'Công viên Olympic', hi: 'ओलंपिक पार्क', fr: 'Parc olympique', th: 'สวนโอลิมปิก', ar: 'الحديقة الأولمبية' },
    intro: { en: 'Olympic Park: built for the 1988 Seoul Olympics. The Peace Gate on the Peace Plaza, the lone tree on the lawn, and a skate park on the plaza for tricks on boards, inline skates and bikes.', ko: '올림픽공원: 1988 서울올림픽을 위해 만든 공원. 평화의광장의 평화의문, 잔디밭의 나홀로나무, 그리고 광장 스케이트파크에서 보드, 인라인, 자전거로 묘기를 부려 보세요.', ja: 'オリンピック公園：1988年ソウル五輪のために造られた公園。平和の広場の平和の門、芝生のひとりぼっちの木、広場のスケートパークでスケボー・インライン・自転車の技を。', zh: '奥林匹克公园：为1988年首尔奥运会而建。和平广场上的和平之门、草坪上的孤独树，还有广场上的滑板公园，可以用滑板、轮滑和自行车秀技巧。' } },
  'grand-park': { icon: '🦁', to: { zone: 'H-1' },
    name: { en: "Grown-ups' Grand Park", ko: '어른도대공원', ja: '大人も大公園', zh: '大人也大公园', es: 'Gran Parque para Adultos También', id: 'Taman Raya Dewasa Juga', vi: 'Công viên Cả Người lớn', hi: 'बड़ों का भी ग्रैंड पार्क', fr: 'Grand Parc des grands aussi', th: 'สวนผู้ใหญ่ก็เล่นได้', ar: 'حديقة الكبار أيضًا' },
    intro: { en: "Seoul Grown-ups' Grand Park in Gwangjin-gu, right by Children's Grand Park Station (Line 7). Walk in through the main gate and round the loop path; the zoo is being built along it. Real park: opened on Children's Day 1973, free entry. Animals in the game may differ from the real zoo.", ko: '광진구 서울어른도대공원, 7호선 어린이대공원역 바로 앞이에요. 정문으로 들어가 산책길을 한 바퀴 돌아 보세요. 동물원은 이 길을 따라 만들고 있어요. 실제 공원: 1973년 어린이날 개원, 입장 무료. 게임 속 동물은 실제 동물원과 다를 수 있어요.', ja: '広津区のソウル大人も大公園、地下鉄7号線子供大公園駅のすぐ前。正門から入って園内の散歩道をひと回り。動物園はこの道沿いに作っています。実際の公園：1973年こどもの日に開園、入場無料。ゲームの動物は実際の動物園と違うことがあります。', zh: '广津区首尔大人也大公园，就在7号线儿童大公园站旁。从正门进去，沿环路走一圈；动物园正沿着这条路建设中。真实公园：1973年儿童节开园，免费入场。游戏中的动物可能与真实动物园不同。' } },
  seodaemun: { icon: '📚', to: { zone: 'D-1' },
    name: { en: 'Sinchon', ko: '신촌', ja: '新村', zh: '新村', es: 'Sinchon', id: 'Sinchon', vi: 'Sinchon', hi: 'सिनचोन', fr: 'Sinchon', th: 'ชินชน', ar: 'سينتشون' },
    intro: { en: 'Sinchon (Seodaemun): a campus street with a Korean academy, a library full of Korean books, and three cinemas on Sinchon-ro: Byeolbit Cinema, Doodle Cinema 2D and the black-and-white Silver Screen Theater.', ko: '신촌(서대문): 어학당과 한국어 책이 가득한 도서관이 있는 대학가. 신촌로에는 별빛 시네마, 두들 시네마 2D, 흑백 영화관 은막 흑백극장이 모여 있어요.', ja: '新村（西大門）：語学堂と韓国語の本でいっぱいの図書館がある大学街。新村路にはビョルビッ シネマ、ドゥードゥル シネマ 2D、白黒の銀幕モノクロ劇場が並んでいます。', zh: '新村（西大门）：有语学堂和满是韩语书的图书馆的大学街。新村路上有星光影院、涂鸦影院 2D 和黑白的银幕黑白剧场。' } },
  hongdae: { icon: '🎸', to: { zone: 'E-1' },
    name: { en: 'Hongdae', ko: '홍대', ja: '弘大', zh: '弘大', es: 'Hongdae', id: 'Hongdae', vi: 'Hongdae', hi: 'होंगदे', fr: 'Hongdae', th: 'ฮงแด', ar: 'هونغداي' },
    intro: { en: 'Hongdae: buskers on the Walking Street, indie shops, animal cafés, tarot and a neon name tag shop.', ko: '홍대: 걷고싶은거리의 버스킹, 인디 가게, 동물 카페, 타로, 네온 네임택 가게.', ja: '弘大：歩きたい通りのバスキング、インディーの店、動物カフェ、タロット、ネオンのネームタグ店。', zh: '弘大：步行街的街头表演、独立小店、动物咖啡馆、塔罗和霓虹名牌店。' } },
  yeonnam: { icon: '🌳', to: { zone: 'E-2' },
    name: { en: 'Yeonnam-dong', ko: '연남동', ja: '延南洞', zh: '延南洞', es: 'Yeonnam-dong', id: 'Yeonnam-dong', vi: 'Yeonnam-dong', hi: 'योननाम-दोंग', fr: 'Yeonnam-dong', th: 'ยอนนัม-ดง', ar: 'يونّام دونغ' },
    intro: { en: 'Yeonnam-dong: the Gyeongui Line Forest Park ("Yeontral Park") runs north-west from Hongik Univ. Station on an old railway. Buy a picnic mat and kimbap at Sopung Picnic and spread out on the grass. Small shops, a bookshop, a photo booth and a Korean-Chinese restaurant line the lanes. Try the walk from here to Mangwon: the forest path, then Mangwon Market, then the Han River.', ko: '연남동: 홍대입구역에서 북서쪽으로 옛 철길 위의 경의선숲길(연트럴파크)이 이어져요. 소풍 피크닉에서 돗자리와 김밥을 사서 잔디에 펼쳐 보세요. 골목에는 소품샵, 책방, 사진관, 중식당이 있어요. 추천 코스: 숲길에서 망원시장을 지나 한강까지 걸어 보세요.', ja: '延南洞：弘大入口駅から北西へ、旧線路の上に京義線森の道（ヨントラルパーク）が続きます。ソプン・ピクニックでレジャーシートとキンパを買って芝生に広げよう。路地には雑貨店、書店、写真館、中華料理店。おすすめコース：森の道から望遠市場を通って漢江まで歩いてみて。', zh: '延南洞：从弘大入口站往西北，旧铁路上的京义线林荫路（延特尔公园）一路延伸。在郊游野餐买野餐垫和紫菜包饭，铺在草地上吧。小巷里有杂货店、书店、照相馆和中餐馆。推荐路线：从林荫路经望远市场走到汉江。' } },
  mangwon: { icon: '🐟', to: { zone: 'E-3' },
    name: { en: 'Mangwon-dong', ko: '망원동', ja: '望遠洞', zh: '望远洞', es: 'Mangwon-dong', id: 'Mangwon-dong', vi: 'Mangwon-dong', hi: 'मांगवॉन-दोंग', fr: 'Mangwon-dong', th: 'มังวอน-ดง', ar: 'مانغوون دونغ' },
    intro: { en: 'Mangwon-dong: Mangwon Market under its arcade roof (croquettes, dakgangjeong, rice cakes, side dishes, noodles), quiet cafés and a bakery on Poeun-ro (Mangridan-gil), and the open Han River park at the south end. The Mangwon Fishing Pier there has the same catch as every Han River park.', ko: '망원동: 아케이드 지붕 아래 망원시장(고로케, 닭강정, 떡, 반찬, 칼국수), 포은로(망리단길)의 조용한 카페와 빵집, 그리고 남쪽 끝의 탁 트인 한강공원. 망원 낚시 선착장에서는 다른 한강공원과 똑같은 물고기가 잡혀요.', ja: '望遠洞：アーケードの屋根の下の望遠市場（コロッケ、タッカンジョン、お餅、おかず、カルグクス）、圃隠路（望理団通り）の静かなカフェとパン屋、南の端の開放的な漢江公園。望遠釣り桟橋では、ほかの漢江公園と同じ魚が釣れます。', zh: '望远洞：拱廊顶棚下的望远市场（可乐饼、炸鸡块、年糕、小菜、刀切面），圃隐路（望理团路）上安静的咖啡馆和面包店，还有南端开阔的汉江公园。望远钓鱼码头能钓到和其他汉江公园一样的鱼。' } },
  samseong: { icon: '🐠', to: { zone: 'J-1' },
    name: { en: 'Samseong-dong', ko: '삼성동', ja: '三成洞', zh: '三成洞', es: 'Samseong-dong', id: 'Samseong-dong', vi: 'Samseong-dong', hi: 'सामसोंग-दोंग', fr: 'Samseong-dong', th: 'ซัมซอง-ดง', ar: 'سامسونغ دونغ' },
    intro: { en: 'Samseong-dong (Gangnam-gu): Samseong Station (Line 2) on Teheran-ro, and KONEXT next to it, a big shopping mall made up for the game. Its media wall shows the sea, and KONEXT Aquarium is open (free for now): walk in through the glass pavilion on the square. Teheran-ro runs on over Tancheon towards Jamsil.', ko: '삼성동(강남구): 테헤란로의 삼성역(2호선)과 그 옆의 대형 쇼핑몰 코넥스트(게임 속 가상 장소). 미디어 월에는 바다가 펼쳐지고, 광장의 유리 입구로 코넥스트 아쿠아리움에 들어갈 수 있어요(지금은 무료). 테헤란로는 탄천을 건너 잠실까지 이어져요.', ja: '三成洞（江南区）：テヘラン路のサムソン駅（2号線）と、そのそばの大型ショッピングモール・コネクスト（ゲームの架空の場所）。メディアウォールには海が広がり、広場のガラスの入口からコネクスト・アクアリウムに入れます（今は無料）。テヘラン路は炭川を渡って蚕室まで続きます。', zh: '三成洞（江南区）：德黑兰路上的三成站（2号线），旁边是游戏中虚构的大型购物中心KONEXT。媒体墙上是一片大海，从广场上的玻璃入口可以进入KONEXT水族馆（现在免费）。德黑兰路跨过炭川一直通到蚕室。' } },
  yeouido: { icon: '🌸', to: { store: 'yeouido-hangang' },
    name: { en: 'Yeouido Han River Park', ko: '여의도 한강공원', ja: '汝矣島漢江公園', zh: '汝矣岛汉江公园', es: 'Parque Yeouido del río Han', id: 'Taman Sungai Han Yeouido', vi: 'Công viên sông Hàn Yeouido', hi: 'योइदो हान नदी पार्क', fr: 'Parc Yeouido du fleuve Han', th: 'สวนริมแม่น้ำฮันยออีโด', ar: 'حديقة نهر هان يويدو' },
    intro: { en: 'Yeouido Han River Park: Yeouido is an island in the middle of the Han River. Walk across Seogang Bridge from Hongdae\'s riverside and you land on the widest lawn on the river: spread a mat, splash through the shallow pool of Mul-bit Square, and walk Yunjung-ro, where cherry trees bloom in spring. The gold 63 tower stands on the island\'s east tip. Inside the park: Han River ramen and picnic stalls (no fishing: it is a no-fishing area, as the real park). Fireworks light up the sky over the island every day at 9:00 and 21:00 Korean time, for an hour (the real Seoul International Fireworks Festival is once a year, in autumn).', ko: '여의도 한강공원: 여의도는 한강 한가운데 있는 섬이에요. 홍대 강변에서 서강대교를 걸어서 건너면 한강에서 가장 넓은 잔디밭이 나와요. 돗자리를 펴고, 물빛광장의 얕은 물을 걸어 보고, 봄이면 벚꽃이 피는 윤중로를 걸어 보세요. 섬 동쪽 끝에는 금빛 63빌딩이 서 있어요. 공원 안에서는 한강 라면과 피크닉 장터를 즐겨요(실제 공원처럼 낚시 금지 구역이에요). 매일 한국시간 9시와 21시에 한 시간씩 섬 위 하늘에 불꽃놀이가 열려요(실제 서울세계불꽃축제는 1년에 한 번, 가을에 열려요).', ja: '汝矣島漢江公園：汝矣島は漢江の真ん中にある島です。弘大の川辺から西江大橋を歩いて渡ると、漢江でいちばん広い芝生に着きます。シートを広げたり、水光広場の浅い水の中を歩いたり、春に桜が咲く輪中路を散歩してみましょう。島の東の端には金色の63ビルが立っています。公園では漢江ラーメンとピクニック屋台を楽しめます（実際の公園と同じく釣り禁止です）。毎日、韓国時間の9時と21時に1時間、島の空に花火が上がります（本物のソウル世界花火祭りは年に一度、秋に開かれます）。', zh: '汝矣岛汉江公园：汝矣岛是汉江正中的一座岛。从弘大江边走过西江大桥，就来到汉江上最大的草坪：铺开野餐垫，走进水光广场的浅水池，再沿着春天樱花盛开的轮中路散步。岛的东端矗立着金色的63大厦。公园里可以煮汉江拉面、逛野餐集市（和真实的公园一样，这里禁止钓鱼）。每天韩国时间9点和21点，岛上空会放一小时烟花（真实的首尔世界烟花节每年秋天举办一次）。' } },
  'banpo-jamwon': { icon: '🌈', to: { store: 'banpo-hangang' },
    name: { en: 'Banpo & Jamwon Han River Parks', ko: '반포·잠원 한강공원', ja: '盤浦・蚕院漢江公園', zh: '盘浦·蚕院汉江公园', es: 'Parque Banpo-Jamwon del río Han', id: 'Taman Sungai Han Banpo-Jamwon', vi: 'Công viên sông Hàn Banpo-Jamwon', hi: 'बानपो-जामवॉन हान नदी पार्क', fr: 'Parc Banpo-Jamwon du fleuve Han', th: 'สวนริมแม่น้ำฮันบันโพ-จัมวอน', ar: 'حديقة نهر هان بانبو-جاموون' },
    intro: { en: 'Banpo and Jamwon Han River Parks lie side by side on the south bank. Walk across Jamsu Bridge, the low deck under Banpo Bridge, from Itaewon. Banpo Han River Park: Moonlight Square, fishing (the blobfish, a legend, only bites here), Han River ramen, duck boats and food trucks. Jamwon Han River Park, next to it upstream: a quiet lawn and fishing (the manta ray, a legend, only bites there). At half past most hours the Moonlight Rainbow Fountain pours rainbow water from Banpo Bridge: watch it from the lawn.', ko: '반포한강공원과 잠원한강공원은 한강 남쪽 강변에 나란히 있어요. 이태원에서 반포대교 아래 낮은 다리인 잠수교를 걸어서 건너요. 반포한강공원에서는 달빛광장, 낚시(전설의 블롭피시는 여기서만 잡혀요), 한강 라면, 오리배, 푸드트럭을 즐겨요. 바로 동쪽 잠원한강공원은 조용한 잔디밭과 낚시(전설의 만타가오리는 거기서만 잡혀요)가 있어요. 대부분의 시간 매시 30분에는 반포대교에서 달빛무지개분수가 쏟아져요. 잔디밭에서 구경하세요.', ja: '盤浦漢江公園と蚕院漢江公園は漢江の南岸に並んでいます。梨泰院から、盤浦大橋の下の低い橋・潜水橋を歩いて渡ります。盤浦漢江公園では月光広場、釣り（伝説のブロブフィッシュはここでしか釣れません）、漢江ラーメン、アヒルボート、フードトラックを楽しめます。すぐ東の蚕院漢江公園には静かな芝生と釣り（伝説のマンタはそこでしか釣れません）があります。ほとんどの時間帯の毎時30分には、盤浦大橋から月光レインボー噴水が流れ落ちます。芝生から眺めましょう。', zh: '盘浦汉江公园和蚕院汉江公园并排位于汉江南岸。从梨泰院走过盘浦大桥下的低桥潜水桥就到了。盘浦汉江公园有月光广场、钓鱼（传说中的水滴鱼只在这里咬钩）、汉江拉面、鸭子船和餐车。紧邻东边的蚕院汉江公园有安静的草坪和钓鱼（传说中的蝠鲼只在那里咬钩）。大多数时段每小时30分，月光彩虹喷泉会从盘浦大桥倾泻而下，在草地上观赏吧。' } },
  euljiro: { icon: '👠', to: { zone: 'G-1' },
    name: { en: 'Euljiro & Dongdaemun', ko: '을지로·동대문', ja: '乙支路・東大門', zh: '乙支路·东大门', es: 'Euljiro y Dongdaemun', id: 'Euljiro & Dongdaemun', vi: 'Euljiro & Dongdaemun', hi: 'उलजीरो और दोंगदेमुन', fr: 'Euljiro et Dongdaemun', th: 'อึลจีโรและทงแดมุน', ar: 'أولجيرو ودونغدايمون' },
    intro: { en: 'Euljiro & Dongdaemun: DDP, the curved silver Dongdaemun Design Plaza, with Dongdaemun History & Culture Park and a piece of the Seoul City Wall beside it. Inside DDP, walk the Curve Runway to the beat and pose for the cameras. Across Jangchungdan-ro are the fashion malls, open late like the real ones, and south of Toegye-ro, Namsangol Hanok Village keeps its old houses inside a wall. Follow Toegye-ro west to Sungnyemun (Namdaemun), the old city\'s great south gate; north across Ogansugyo Bridge stands Heunginjimun, the east gate.', ko: '을지로·동대문: 은빛 곡선 건물 동대문디자인플라자(DDP)와 그 옆 동대문역사문화공원, 한양도성 성곽 한 자락이 있어요. DDP 안 커브 런웨이에서는 박자에 맞춰 워킹하고 카메라 앞에서 포즈를 잡아 보세요. 장충단로 건너편에는 실제처럼 밤늦게까지 여는 패션몰이, 퇴계로 남쪽에는 담장 안에 옛 한옥이 모여 있는 남산골 한옥마을이 있어요. 퇴계로를 따라 서쪽으로 가면 옛 서울의 남쪽 정문 숭례문(남대문), 오간수교 건너 북쪽에는 동쪽 정문 흥인지문이 서 있어요.', ja: '乙支路・東大門：銀色の曲線の建物、東大門デザインプラザ（DDP）と、隣の東大門歴史文化公園、漢陽都城の城壁の一部があります。DDPの中のカーブ・ランウェイでは、リズムに合わせて歩き、カメラの前でポーズをとってみましょう。奨忠壇路の向かいには本物のように夜遅くまで開くファッションモール、退渓路の南には塀の中に古い韓屋が集まる南山コル韓屋村があります。退渓路を西へ行くと旧ソウルの南の正門・崇礼門（南大門）、五間水橋を渡った北には東の正門・興仁之門が立っています。', zh: '乙支路·东大门：银色曲线建筑东大门设计广场（DDP），旁边是东大门历史文化公园和一段汉阳都城城墙。在DDP里的曲线T台，可以踩着节拍走秀，在镜头前摆姿势。奖忠坛路对面是像现实中一样营业到深夜的时装商场，退溪路南边是南山谷韩屋村，围墙里聚着一座座老韩屋。沿退溪路往西是旧首尔的南正门崇礼门（南大门），过五间水桥往北是东正门兴仁之门。' } },
};

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// The first-time hint card. storage key mk.infoHintOff = "don't show again".
const OFF = 'mk.infoHintOff';
export function showInfoHint(root, { onGo }) {
  try { if (localStorage.getItem(OFF)) return false; } catch { /* storage blocked: show it */ }
  const go = el('button', 'primary', '📍 ' + L(T.hintGo));
  const later = el('button', 'chip', L(T.later));
  const never = el('button', 'chip', L(T.never));
  const done = () => { root.hidden = true; };
  go.onclick = () => { done(); onGo(); };
  later.onclick = done;
  never.onclick = () => { try { localStorage.setItem(OFF, '1'); } catch { /* ignore */ } done(); };
  const actions = el('div', 'order-actions');
  actions.append(go, later, never);
  root.replaceChildren(el('p', null, 'ℹ️ ' + L(T.hint)), actions);
  root.hidden = false;
  return true;
}
export { T as INFO_TEXT, el };
