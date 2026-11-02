// Korean learning books from the library. Carry one out and read it while
// sitting anywhere. Each page: Korean, romanization, and the meaning
// (English, with a Korean note where it helps; other languages fall back to
// English).

const P = (ko, rom, en, kn) => ({ ko, rom, mean: kn ? { en, ko: kn } : { en } });

export const BOOKS = [
  {
    id: 'hangul', icon: '🔤', color: '#d8452f',
    title: { en: 'Hangul in 10 Minutes', ko: '10분 한글', ja: '10分でハングル', zh: '10分钟学韩文' },
    pages: [
      P('ㄱ ㄴ ㄷ ㄹ ㅁ', 'g n d r/l m', 'Five basic consonants. ㄱ looks like the tongue touching the back of the mouth.', '기본 자음 다섯 개예요.'),
      P('ㅂ ㅅ ㅇ ㅈ ㅎ', 'b s (silent)/ng j h', 'ㅇ is silent at the start of a syllable and "ng" at the end.', 'ㅇ은 첫소리에선 소리가 없고 받침에선 "ng"예요.'),
      P('ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ', 'a eo o u eu i', 'Six basic vowels: made from a dot (sky), a flat line (earth) and a standing line (person).', '하늘(·), 땅(ㅡ), 사람(ㅣ)으로 만든 기본 모음이에요.'),
      P('ㄱ + ㅏ = 가', 'g + a = ga', 'A consonant and a vowel make one syllable block.', '자음과 모음이 모여 한 글자가 돼요.'),
      P('ㅎ ㅏ ㄴ = 한', 'h a n = han', 'A final consonant (받침) goes underneath.', '받침은 아래에 써요.'),
      P('한 + 글 = 한글', 'han + geul = hangeul', 'Hangul: the Korean alphabet, made by King Sejong in 1443.', '세종대왕이 1443년에 만든 글자예요.'),
      P('ㄲ ㄸ ㅃ ㅆ ㅉ', 'kk tt pp ss jj', 'Doubled consonants are said tense and strong.', '된소리는 힘을 주어 세게 발음해요.'),
      P('ㅋ ㅌ ㅍ ㅊ', 'k t p ch', 'Aspirated consonants: say them with a puff of air.', '거센소리는 바람을 내뿜으며 발음해요.'),
    ],
  },
  {
    id: 'greetings', icon: '👋', color: '#2f8f6b',
    title: { en: 'Everyday Greetings', ko: '매일 쓰는 인사말', ja: '毎日のあいさつ', zh: '日常问候语' },
    pages: [
      P('안녕하세요', 'annyeonghaseyo', 'Hello (polite). Works any time of day.'),
      P('안녕히 가세요 / 안녕히 계세요', 'annyeonghi gaseyo / gyeseyo', 'Goodbye: "go well" to the one leaving, "stay well" to the one staying.', '떠나는 사람에겐 "가세요", 남는 사람에겐 "계세요".'),
      P('감사합니다', 'gamsahamnida', 'Thank you (polite).'),
      P('죄송합니다 / 미안해요', 'joesonghamnida / mianhaeyo', "I'm sorry (very polite / polite)."),
      P('처음 뵙겠습니다', 'cheoeum boepgetseumnida', 'Nice to meet you (formal, first meeting).'),
      P('잘 먹겠습니다', 'jal meokgetseumnida', 'Said before eating: "I will eat well."', '밥 먹기 전에 하는 인사예요.'),
      P('수고하셨습니다', 'sugohasyeotseumnida', 'Thanks for your hard work: said at the end of work.', '일이 끝났을 때 하는 인사예요.'),
      P('밥 먹었어요?', 'bap meogeosseoyo?', '"Have you eaten?" A friendly way to say hi.', '안부를 묻는 다정한 인사예요.'),
    ],
  },
  {
    id: 'idioms', icon: '📜', color: '#7a4a2e',
    title: { en: 'Four-Character Idioms', ko: '사자성어', ja: '四字熟語', zh: '四字成语' },
    pages: [
      P('일석이조 (一石二鳥)', 'ilseogijo', 'Two birds with one stone.', '돌 하나로 새 두 마리를 잡음.'),
      P('작심삼일 (作心三日)', 'jaksimsamil', 'A resolution that lasts only three days.', '결심이 사흘을 못 감.'),
      P('대기만성 (大器晩成)', 'daegimanseong', 'Great talents bloom late.', '큰 그릇은 늦게 이루어짐.'),
      P('동문서답 (東問西答)', 'dongmunseodap', 'Asked about the east, answers about the west: an off-topic answer.', '묻는 말에 엉뚱한 대답을 함.'),
      P('유비무환 (有備無患)', 'yubimuhwan', 'Be prepared and you have nothing to worry about.', '준비가 있으면 걱정이 없음.'),
      P('이심전심 (以心傳心)', 'isimjeonsim', 'Heart to heart: understanding without words.', '말하지 않아도 마음이 통함.'),
      P('우공이산 (愚公移山)', 'ugongisan', 'Keep at it and you can move a mountain.', '꾸준히 하면 산도 옮길 수 있음.'),
      P('자업자득 (自業自得)', 'jaeopjadeuk', 'You reap what you sow.', '자기가 한 일의 결과를 자기가 받음.'),
    ],
  },
  {
    id: 'slang', icon: '😎', color: '#7b3fe4',
    title: { en: 'Fun New Words', ko: '재미있는 신조어', ja: '面白い新語', zh: '有趣的新词' },
    pages: [
      P('갑분싸', 'gapbunssa', 'The mood suddenly went cold (갑자기 분위기 싸해짐).', '갑자기 분위기가 싸해짐.'),
      P('소확행', 'sohwakhaeng', 'A small but certain happiness (소소하지만 확실한 행복).', '소소하지만 확실한 행복.'),
      P('워라밸', 'worabael', 'Work-life balance.', '일과 삶의 균형.'),
      P('혼밥 / 혼술', 'honbap / honsul', 'Eating alone / drinking alone (혼자 밥 / 혼자 술).', '혼자 먹는 밥 / 혼자 마시는 술.'),
      P('꿀잼 / 노잼', 'kkuljaem / nojaem', 'Super fun (honey + fun) / no fun.', '아주 재미있음 / 재미없음.'),
      P('인싸 / 아싸', 'inssa / assa', 'Insider, the popular one / outsider.', '무리에 잘 어울리는 사람 / 혼자 지내는 사람.'),
      P('얼죽아', 'eoljuga', '"Iced Americano even if I freeze to death" (얼어 죽어도 아이스 아메리카노).', '얼어 죽어도 아이스 아메리카노.'),
      P('TMI', 'ti-em-ai', 'Too much information.', '굳이 알려주지 않아도 되는 정보.'),
    ],
  },
  {
    id: 'dadjokes', icon: '🤭', color: '#e07a1f',
    title: { en: 'Dad Joke Dictionary', ko: '아재개그 사전', ja: 'おやじギャグ辞典', zh: '大叔冷笑话词典' },
    pages: [
      P('세상에서 가장 가난한 왕은? → 최저임금', 'Q: the poorest king? A: choejeo-imgeum', '임금 means both "king" and "wage": the minimum-wage king.', '"임금"은 왕이면서 월급이에요.'),
      P('바나나가 웃으면? → 바나나킥', 'banana-kik', '"Banana laughs" = 킥킥 (giggle) + a famous snack name.', '웃음소리 "킥킥"과 과자 이름이 같아요.'),
      P('소금의 유통기한은? → 천일', 'cheon-il', '천일염 is sea salt, and 천일 also means "a thousand days".', '천일염과 천 일이 같은 소리예요.'),
      P('왕이 넘어지면? → 킹콩', 'king-kong', 'King + 콩 (thud): the sound of a king falling.', '킹(왕)이 "콩" 하고 넘어져요.'),
      P('딸기가 직장을 잃으면? → 딸기시럽', 'ttalgi-sireop', '시럽 sounds like 실업 (unemployment).', '시럽 = 실업.'),
      P('오리가 얼면? → 언덕', 'eondeok', '언 덕 (a frozen duck) sounds like 언덕 (hill). 덕 = duck.', '언(얼은) 덕(duck) = 언덕.'),
      P('자동차를 톡 치면? → 카톡', 'katok', 'Car (카) + tap (톡) = KakaoTalk, the chat app everyone uses.', '카(car) + 톡 = 카톡.'),
      P('세상에서 가장 뜨거운 과일은? → 천도복숭아', 'cheondo-boksunga', '천도 = a peach variety, and also "1000 degrees".', '천 도(1000°)짜리 복숭아.'),
    ],
  },
  {
    id: 'numbers', icon: '🔢', color: '#2f6fd6',
    title: { en: 'Counting in Korean', ko: '숫자 세기', ja: '韓国語の数え方', zh: '韩语数字' },
    pages: [
      P('하나 둘 셋 넷 다섯', 'hana dul set net daseot', 'Native Korean 1–5: for counting things and age.', '고유어 숫자: 물건, 나이를 셀 때.'),
      P('여섯 일곱 여덟 아홉 열', 'yeoseot ilgop yeodeol ahop yeol', 'Native Korean 6–10.'),
      P('일 이 삼 사 오', 'il i sam sa o', 'Sino-Korean 1–5: for money, dates, phone numbers.', '한자어 숫자: 돈, 날짜, 전화번호.'),
      P('육 칠 팔 구 십', 'yuk chil pal gu sip', 'Sino-Korean 6–10.'),
      P('백 / 천 / 만', 'baek / cheon / man', '100 / 1,000 / 10,000. Prices count in 만: 3만 원 = 30,000 won.', '3만 원 = 삼만 원.'),
      P('커피 두 잔 주세요', 'keopi du jan juseyo', 'Two coffees, please. (하나 → 한, 둘 → 두 before a counter)', '하나→한, 둘→두로 바뀌어요.'),
      P('세 시 삼십 분', 'se si samsip bun', '3:30. Hours use native numbers, minutes use Sino-Korean.', '시는 고유어, 분은 한자어.'),
      P('몇 살이에요? 스무 살이에요.', 'myeot sarieyo? seumu sarieyo.', 'How old are you? I am twenty.'),
    ],
  },
  {
    id: 'food', icon: '🍚', color: '#c8573a',
    title: { en: 'Food Words', ko: '음식 이름', ja: '食べ物の名前', zh: '食物名称' },
    pages: [
      P('밥 / 국 / 반찬', 'bap / guk / banchan', 'Rice / soup / side dishes: a Korean meal.'),
      P('김치찌개', 'gimchi-jjigae', 'Kimchi stew. 찌개 is a thick stew, 국 a lighter soup.'),
      P('떡볶이', 'tteokbokki', 'Rice cakes in sweet and spicy sauce.'),
      P('비빔밥', 'bibimbap', 'Mixed rice: 비비다 means "to mix".', '비비다 = 섞다.'),
      P('맛있어요! / 맛없어요', 'masisseoyo / madeopseoyo', "It's delicious! / It's not tasty."),
      P('매워요 / 달아요 / 짜요', 'maewoyo / darayo / jjayo', "It's spicy / sweet / salty."),
      P('여기요! 물 좀 주세요', 'yeogiyo! mul jom juseyo', 'Excuse me! Some water, please.'),
      P('계산해 주세요', 'gyesanhae juseyo', 'The bill, please.'),
    ],
  },
  {
    id: 'polite', icon: '🙇', color: '#4f6b3a',
    title: { en: 'Polite and Casual Speech', ko: '존댓말과 반말', ja: '敬語とタメ口', zh: '敬语和平语' },
    pages: [
      P('먹어요 / 먹어', 'meogeoyo / meogeo', 'Eat (polite / casual). Adding 요 makes it polite.', '"요"를 붙이면 존댓말.'),
      P('드세요', 'deuseyo', 'Please eat (honorific): used for elders and customers.', '어른께 쓰는 높임말.'),
      P('고마워요 / 고마워', 'gomawoyo / gomawo', 'Thanks (polite / casual with friends).'),
      P('말 놓아도 돼요?', 'mal noado dwaeyo?', 'May I speak casually with you? Ask before switching to 반말.', '반말을 해도 되는지 묻는 말.'),
      P('씨 / 님', 'ssi / nim', 'Name + 씨 (Mr/Ms), title + 님 (very respectful): 선생님, 사장님.'),
      P('언니 / 오빠 / 누나 / 형', 'eonni / oppa / nuna / hyeong', 'Older sister/brother words: depend on your own gender too.', '부르는 사람의 성별에 따라 달라요.'),
      P('네 / 응', 'ne / eung', 'Yes (polite / casual).'),
      P('저 / 나', 'jeo / na', 'I (humble / casual).'),
    ],
  },
  {
    id: 'proverbs', icon: '🐯', color: '#d4a73a',
    title: { en: 'Korean Proverbs', ko: '속담', ja: 'ことわざ', zh: '韩国俗语' },
    pages: [
      P('호랑이도 제 말 하면 온다', 'horangido je mal hamyeon onda', 'Speak of the tiger and it appears (speak of the devil).'),
      P('가는 말이 고와야 오는 말이 곱다', 'ganeun mari gowaya oneun mari gopda', 'Kind words out, kind words back.'),
      P('티끌 모아 태산', 'tikkeul moa taesan', 'Gather dust and make a mountain: small savings add up.'),
      P('누워서 떡 먹기', 'nuwoseo tteok meokgi', 'Eating rice cake lying down: a piece of cake.'),
      P('발 없는 말이 천 리 간다', 'bal eomneun mari cheolli ganda', 'Words without feet travel a thousand li: rumours spread fast.'),
      P('백지장도 맞들면 낫다', 'baekjijangdo matdeulmyeon natda', 'Even a sheet of paper is easier lifted by two.'),
      P('원숭이도 나무에서 떨어진다', 'wonsungido namueseo tteoreojinda', 'Even monkeys fall from trees.'),
      P('금강산도 식후경', 'geumgangsando sikhugyeong', 'Even Mount Geumgang is best seen after a meal: food first!'),
    ],
  },
  {
    id: 'feelings', icon: '💗', color: '#d6458a',
    title: { en: 'Feelings', ko: '감정 표현', ja: '気持ちの表現', zh: '情感表达' },
    pages: [
      P('기뻐요 / 행복해요', 'gippeoyo / haengbokhaeyo', "I'm glad / I'm happy."),
      P('슬퍼요', 'seulpeoyo', "I'm sad."),
      P('화나요', 'hwanayo', "I'm angry."),
      P('심심해요', 'simsimhaeyo', "I'm bored."),
      P('설레요', 'seolleyo', 'My heart is fluttering: excited, often about love or a trip.', '두근두근 기대되는 마음.'),
      P('답답해요', 'dapdaphaeyo', 'Stuffy, frustrated: when things are stuck.', '마음이나 상황이 꽉 막힌 느낌.'),
      P('대박!', 'daebak!', 'Awesome! / No way!'),
      P('보고 싶어요', 'bogo sipeoyo', 'I miss you.'),
    ],
  },
];

export const bookById = (id) => BOOKS.find((b) => b.id === id) || null;
