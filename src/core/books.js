// Korean learning books from the library. Carry one out and read it while
// sitting anywhere. Each page: Korean, romanization, and the meaning
// (English, with a Korean note where it helps; other languages fall back to
// English).

import { LIBRARY } from '../data/library-shelf.js';

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
    id: 'netslang', icon: '💬', color: '#1f9e8f',
    title: { en: 'Korean Internet Slang Dictionary', ko: '한국 인터넷 용어 사전', ja: '韓国ネット用語辞典', zh: '韩国网络用语词典' },
    pages: [
      P('한국 인터넷 용어 사전', 'han-guk inteonet yong-eo sajeon', 'Real Korean for chatting and reading comments: 50 key expressions, beginner to intermediate, about 5 minutes. Most are casual: use plain Korean with teachers, bosses and in formal places.', '카톡과 SNS 댓글에서 자주 보는 표현 모음. 대부분 비격식 표현이니 공식적인 자리에서는 일반 한국어를 써요.'),
      // 1. Initial consonants (초성체)
      P('1장. 초성으로 대화하기', 'choseongche', 'Koreans often type only the first consonant of each syllable to chat fast. This is called 초성체.', '한글의 첫 자음만 써서 빠르게 보내는 말투예요.'),
      P('ㅎㅇ / ㅎ2 → 하이', 'hai', 'Hi!', '안녕!'),
      P('ㅂㅂ → 바이바이', 'baibai', 'Bye!', '잘 가!'),
      P('ㄱㄱ → 고고', 'gogo', "Let's go! / Let's start!", '가자! 시작하자!'),
      P('ㅇㅋ → 오케이', 'okei', 'OK!', '알겠어!'),
      P('ㅇㅇ → 응응', 'eung-eung', 'Yeah, right.', '응, 맞아.'),
      P('ㄴㄴ → 노노', 'nono', "No, I don't want to.", '아니, 싫어.'),
      P('ㄱㅅ → 감사', 'gamsa', 'Thanks.', '고마워.'),
      P('ㅈㅅ → 죄송', 'joesong', 'Sorry.', '미안해.'),
      P('ㅊㅋ → 축하', 'chuka', 'Congrats!', '축하해!'),
      P('ㅅㄱ → 수고', 'sugo', 'Good work. (said after someone worked hard)', '수고했어.'),
      P('ㅇㅈ → 인정', 'injeong', 'I agree, true.', '동의해, 맞아.'),
      P('ㄹㅇ → 리얼', 'rieol', 'For real, really.', '진짜, 정말.'),
      P('ㄷㄷ → 덜덜', 'deoldeol', 'Wow, scary or shocking (the sound of shivering).', '놀랍거나 무섭다.'),
      P('ㅁㄹ → 몰라', 'molla', "I don't know.", '모르겠어.'),
      P('ㄱㅊ → 괜찮아', 'gwaenchana', 'No problem, it is fine.', '문제없어.'),
      P('ㅎㅇ 오늘 저녁 ㄱㄱ? / ㅇㅋ 몇 시? / 7시 ㄱㅊ? / ㅇㅇ ㄱㄱ ㅋㅋ', 'a real KakaoTalk chat', '"Hi, dinner tonight?" "OK, what time?" "Is 7 OK?" "Yes, let\'s go, haha."', '안녕, 오늘 저녁 같이 갈래? → 좋아, 몇 시? → 7시 괜찮아? → 응, 가자. 하하.'),
      // 2. Feelings in chat
      P('2장. 채팅에서 감정 표현하기', 'gamjeong pyohyeon', 'In Korean chat, laughing and crying are written with letters. The more letters, the stronger the feeling.', '같은 글자라도 개수에 따라 느낌이 달라져요.'),
      P('ㅋㅋ / ㅋㅋㅋ', 'kk / kkk', 'Laughing, like LOL. Tip: a short ㅋㅋ can also feel half-hearted or mocking.', '웃음. 상황에 따라 성의 없거나 비웃는 느낌도 줄 수 있어요. "이 영상 진짜 웃기네 ㅋㅋㅋ"'),
      P('ㅎㅎ', 'hh', 'A soft, light laugh.', '부드럽고 가벼운 웃음.'),
      P('ㅠㅠ / ㅜㅜ', 'yuyu / uu', 'Crying eyes: sad, moved, or disappointed.', '슬픔, 감동, 아쉬움. "시험 망했어 ㅠㅠ"'),
      P('ㅋㅋㅋㅋㅠㅠ', 'kkkk yuyu', 'Funny and sad at the same time.', '웃기면서 슬플 때.'),
      P('헐', 'heol', 'Whoa! / No way! (surprise)', '놀랐을 때.'),
      P('킹받네', 'kingbanne', 'So annoying! (playfully)', '장난스럽게 짜증 날 때.'),
      P('긁?', 'geuk?', '"Did that get to you?" Teasing someone who seems upset. It provokes, so don\'t use it with people you aren\'t close to.', '상대가 기분 상했는지 놀리는 말. 친하지 않은 사람에게는 쓰지 않는 게 좋아요.'),
      P('억까', 'eokka', 'Unfair criticism, attacking for no good reason.', '억지로 비판하거나 불공평하게 공격함. "왜 나만 떨어져? 억까 아니야?"'),
      P('억빠', 'eokppa', 'Praising or taking someone\'s side too much, for no reason.', '이유 없이 지나치게 칭찬하거나 편들기.'),
      // 3. New words
      P('3장. 요즘 한국인이 쓰는 신조어', 'sinjo-eo', 'New words from social media, YouTube and online communities. How popular they are depends on age and community.', 'SNS, 유튜브, 온라인 커뮤니티에서 볼 수 있는 표현.'),
      P('느좋 (느낌 좋다)', 'neujo', 'Good vibes: stylish, just my taste.', '분위기나 스타일이 세련되고 마음에 든다. "여기 카페 완전 느좋이다."'),
      P('추구미', 'chugumi', 'The look or image I want to have.', '내가 되고 싶은 스타일이나 분위기. "내 추구미는 깔끔한 스타일이야."'),
      P('감다살 (감 다 살았다)', 'gamdasal', 'Great sense, nailed it (a compliment).', '센스나 감각이 좋다는 칭찬. "이번 디자인 감다살이네!"'),
      P('갓생 (God + 인생)', 'gatsaeng', 'A hard-working, productive life: study, exercise, self-improvement.', '성실한 삶. "오늘 운동도 하고 공부도 했어. 갓생 살았다."'),
      P('럭키비키', 'reokkibiki', 'Looking on the bright side, even when something goes wrong.', '안 좋은 상황에서도 좋은 점 찾기. "버스를 놓쳤지만 산책했네? 완전 럭키비키!"'),
      P('스불재 (스스로 불러온 재앙)', 'seubulje', 'A disaster I brought on myself.', '내 행동 때문에 생긴 나쁜 결과. "새벽까지 게임하다 지각했어. 완전 스불재."'),
      P('뇌절', 'noejeol', 'Repeating the same joke or act way too much.', '"그 농담 이제 그만해. 뇌절이야."'),
      P('도파민', 'dopamin', 'Dopamine: strong fun and thrill, for exciting content.', '"이 드라마 도파민 터진다!"'),
      // 4. Everyday social media words
      P('4장. SNS와 일상에서 자주 보는 단어', 'SNS', 'Words you often see on social media and in daily life.', '자주 보는 단어 모음.'),
      P('점메추 / 저메추', 'jeommechu / jeomechu', 'Recommend a lunch / dinner menu.', '점심 / 저녁 메뉴 추천. "오늘 저메추 해줘."'),
      P('알잘딱깔센', 'aljalttakkkalsen', 'Do it well on your own, neat and with good sense.', '알아서 잘, 딱 깔끔하고 센스 있게. "알잘딱깔센으로 해줘."'),
      P('꾸안꾸', 'kkuankku', 'Effortlessly stylish: dressed up but not too much.', '꾸민 듯 안 꾸민 듯. "오늘 꾸안꾸 스타일이네."'),
      P('플러팅', 'peulleoting', 'Flirting, showing you like someone.', '"지금 나한테 플러팅하는 거야?"'),
      P('현생', 'hyeonsaeng', 'Real life, outside the internet.', '"현생이 바빠서 게임 못 해."'),
      P('본계 / 부계', 'bongye / bugye', 'Main account / second account.', '본계정 / 부계정. "이건 내 부계야."'),
      P('손절', 'sonjeol', 'Cutting ties with someone.', '관계를 끊음. "그 친구랑 손절했어."'),
      P('과몰입', 'gwamorip', 'Getting way too into something.', '"드라마에 과몰입했어."'),
      P('폼 미쳤다', 'pom michyeotda', 'Amazing form! Here 미쳤다 ("crazy") is praise, not an insult.', '실력이나 상태가 대단하다. "오늘 노래 폼 미쳤다!"'),
      P('중꺾마', 'jungkkeongma', 'What matters is a heart that does not break.', '중요한 건 꺾이지 않는 마음. "포기하지 마. 중꺾마!"'),
      P('테토남 / 테토녀', 'tetonam / tetonyeo', 'A man / woman with a strong, take-charge image. Just an internet label, not a real personality test.', '"그 사람 테토남 느낌이야."'),
      // 5. Quiz
      P('퀴즈 1. 이 카페 완전 느좋인데? ㄹㅇ', 'quiz', 'A) I don\'t like the café  B) The café has really nice vibes  C) The café is too noisy. Answer: B', '정답: 카페 분위기가 정말 좋다.'),
      P('퀴즈 2. 밤새 게임하다 늦잠 잤어. 스불재 ㅠㅠ', 'quiz', 'A) The game was really fun  B) A friend woke me up  C) My own actions caused the problem. Answer: C', '정답: 내 행동 때문에 문제가 생겼다.'),
      P('퀴즈 3. 이번 영상 편집 감다살 ㅋㅋ', 'quiz', 'A) Great editing sense  B) The video is too long  C) The video was deleted. Answer: A', '정답: 영상 편집 센스가 좋다.'),
      P('퀴즈 4. ㅎㅇ 오늘 저메추 ㄱㄱ?', 'quiz', 'A) Recommend a dinner menu for tonight  B) Cancel tonight\'s plans  C) Skip lunch today. Answer: A', '정답: 오늘 저녁 메뉴를 추천해 달라.'),
      P('마무리: 짧게 · 합치기 · 새 의미', 'summary', 'Three keys: write it short (안녕 → ㅎㅇ), join words (점심 메뉴 추천 → 점메추), make new meanings (감다살, 느좋, 럭키비키). Use them with friends; use plain Korean in formal places.', '친구와 채팅할 때 유용하지만, 대부분 비격식 표현이에요.'),
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

// Korean grammar textbooks (TOPIK 1 to 6), one book per level in three
// editions: English, simplified Chinese (简体) and traditional Chinese
// (繁體). Each page is an image in public/books/<id>/<edition>/NN.webp.
export const EDITIONS = [
  { id: 'en', label: 'English', title: 'Korean Grammar Textbook' },
  { id: 'hans', label: '简体中文', title: '韩语文法教材' },
  { id: 'hant', label: '繁體中文', title: '韓語文法教材' },
];
const TB = (level, pages, color) => ({
  id: 'topik' + level, icon: '📗', color, textbook: { level: level.replace('-', '–'), pages },
  title: { en: `Korean Grammar · TOPIK ${level}`, ko: `한국어 문법 · TOPIK ${level}`, ja: `韓国語文法 · TOPIK ${level}`, zh: `韩语文法 · TOPIK ${level}` },
  pages: [],
});
BOOKS.push(TB('1', 29, '#145249'), TB('2', 36, '#1f6f8b'), TB('3-4', 38, '#6b4fa0'), TB('5-6', 36, '#9c3d54'));
// Free stories and poems (public-domain Korean works and retold folk
// tales). The shelf knows only the title; the text is loaded from
// public/library/<id>.json when the book is opened.
export const LIT_KINDS = ['children', 'story', 'poems'];
// The library's bookshelves: each shelf holds one section, labeled on top.
export const SHELF_SECTIONS = [
  { id: 'learn', icon: '🇰🇷', name: { en: 'Learn Korean', ko: '한국어 공부', ja: '韓国語の勉強', zh: '学韩语' } },
  { id: 'children', icon: '🧸', name: { en: "Children's stories", ko: '어린이 동화', ja: '子ども向けのお話', zh: '儿童故事' } },
  { id: 'story', icon: '📖', name: { en: 'Short stories', ko: '단편소설', ja: '短編小説', zh: '短篇小说' } },
  { id: 'poems', icon: '🌸', name: { en: 'Poetry', ko: '시집', ja: '詩集', zh: '诗集' } },
];
export const booksInSection = (id) => BOOKS.filter((b) => (id === 'learn' ? !b.lit : b.lit?.kind === id));
for (const b of LIBRARY) {
  BOOKS.push({ id: b.id, icon: b.icon, color: b.color, title: b.title, lit: { kind: b.kind, author: b.author, pages: b.pages }, pages: [] });
}
export const pageCount = (b) => (b.textbook ? b.textbook.pages : b.lit ? b.lit.pages : b.pages.length);
export const litUrl = (b) => `library/${b.id}.json`;
// The edition to show first: the reader's Chinese, else English.
export const defaultEdition = (lang) => (lang === 'zh' ? 'hans' : lang === 'zht' ? 'hant' : 'en');
export const pageUrl = (b, ed, i) => `books/${b.id}/${ed}/${String(i + 1).padStart(2, '0')}.webp`;

export const bookById = (id) => BOOKS.find((b) => b.id === id) || null;
