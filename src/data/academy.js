// 효재어학당 (Hyojae Korean Academy): the curriculum.
// Six courses in three stages: Hangul, Beginner (TOPIK 1-2), Intermediate
// (TOPIK 3-4) and Advanced. Each lesson has a goal, teaching points (Korean
// + explanation), new words and a short quiz.
//
// Explanations are in English with a Korean note; other languages fall back
// to English. Quiz: [question, [choices], index of the answer, why].

const lesson = (id, ko, en, goal, points, words, quiz) => ({
  id, title: { ko, en }, goal,
  points: points.map(([k, e, n]) => ({ ko: k, en: e, note: n || null })),
  words: words.map(([k, e]) => ({ ko: k, en: e })),
  quiz: quiz.map(([q, choices, answer, why]) => ({ q, choices, answer, why: why || null })),
});

export const STAGES = [
  { id: 'hangul', name: { en: 'Hangul', ko: '한글', ja: 'ハングル', zh: '韩文' } },
  { id: 'beginner', name: { en: 'Beginner', ko: '초급', ja: '初級', zh: '初级' } },
  { id: 'intermediate', name: { en: 'Intermediate', ko: '중급', ja: '中級', zh: '中级' } },
  { id: 'advanced', name: { en: 'Advanced', ko: '고급', ja: '上級', zh: '高级' } },
];

export const COURSES = [
  {
    id: 'hangul', stage: 'hangul', icon: '🔤', color: '#d8452f',
    name: { en: 'Learn Hangul', ko: '한글 배우기', ja: 'ハングルを学ぼう', zh: '学习韩文' },
    about: { en: 'Read and write the Korean alphabet: vowels, consonants, syllable blocks and final consonants.', ko: '모음, 자음, 글자 만들기, 받침까지 한글을 읽고 쓸 수 있어요.' },
    lessons: [
      lesson('h1', '기본 모음', 'Basic vowels', { en: 'Read the six basic vowels.', ko: '기본 모음 여섯 개를 읽어요.' }, [
        ['ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ', 'a, eo, o, u, eu, i. Vowels are built from a dot (the sky), a flat line (the earth) and a standing line (a person).', '하늘(·), 땅(ㅡ), 사람(ㅣ)으로 만들었어요.'],
        ['아 어 오 우 으 이', 'A vowel never stands alone: write a silent ㅇ in front of it.', '모음만 쓸 때는 앞에 소리 없는 ㅇ을 붙여요.'],
        ['ㅑ ㅕ ㅛ ㅠ', 'ya, yeo, yo, yu: one extra stroke adds a "y" sound.', '획을 하나 더하면 "y" 소리가 나요.'],
      ], [['아이', 'child'], ['오이', 'cucumber'], ['우유', 'milk'], ['여우', 'fox'], ['이', 'tooth; two']], [
        ['Which vowel is "o"?', ['ㅓ', 'ㅗ', 'ㅜ', 'ㅡ'], 1],
        ['How do you read 우유?', ['oyu', 'uyu', 'eoyu', 'uyo'], 1, '우 = u, 유 = yu.'],
        ['Which one has a "y" sound?', ['ㅏ', 'ㅗ', 'ㅕ', 'ㅣ'], 2],
        ['What is the ㅇ in 아 for?', ['It sounds "ng"', 'It is silent', 'It sounds "h"', 'It makes the vowel long'], 1],
      ]),
      lesson('h2', '기본 자음', 'Basic consonants', { en: 'Read the basic consonants.', ko: '기본 자음을 읽어요.' }, [
        ['ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ', 'g/k, n, d/t, r/l, m, b/p, s. The shapes copy the mouth: ㄱ is the tongue touching the back of the mouth, ㅁ is the closed lips.', 'ㄱ은 혀뿌리, ㅁ은 입 모양을 본떴어요.'],
        ['ㅇ ㅈ ㅎ', 'silent/ng, j, h.'],
        ['가 나 다 라 마 바 사 아 자 하', 'Put a consonant before ㅏ to read it: ga, na, da, ra, ma, ba, sa, a, ja, ha.'],
      ], [['나라', 'country'], ['바다', 'sea'], ['나무', 'tree'], ['모자', 'hat'], ['하마', 'hippo']], [
        ['Which consonant is "m"?', ['ㄴ', 'ㅁ', 'ㅂ', 'ㄹ'], 1],
        ['How do you read 바다?', ['pada', 'bada', 'mada', 'bata'], 1],
        ['What does 나무 mean?', ['country', 'sea', 'tree', 'hat'], 2],
        ['ㄹ sounds like…', ['s', 'r or l', 'h', 'ng'], 1],
      ]),
      lesson('h3', '글자 만들기', 'Building syllables', { en: 'Put consonants and vowels together into syllable blocks.', ko: '자음과 모음을 모아 글자를 만들어요.' }, [
        ['ㄱ + ㅏ = 가', 'Tall vowels (ㅏ ㅓ ㅣ) go to the right of the consonant.', '세로 모음은 오른쪽에 써요.'],
        ['ㄱ + ㅗ = 고', 'Flat vowels (ㅗ ㅜ ㅡ) go under the consonant.', '가로 모음은 아래에 써요.'],
        ['한 / 국', 'A final consonant (받침) goes at the bottom: ㅎ+ㅏ+ㄴ = 한, ㄱ+ㅜ+ㄱ = 국.', '받침은 맨 아래에 써요.'],
      ], [['한국', 'Korea'], ['가구', 'furniture'], ['고기', 'meat'], ['구두', 'dress shoes'], ['나비', 'butterfly']], [
        ['ㄴ + ㅜ =', ['나', '누', '노', '너'], 1],
        ['ㅎ + ㅏ + ㄴ =', ['한', '항', '학', '함'], 0],
        ['Where does ㅗ go?', ['Right of the consonant', 'Under the consonant', 'Before the consonant', 'On top'], 1],
        ['What does 고기 mean?', ['furniture', 'meat', 'shoes', 'Korea'], 1],
      ]),
      lesson('h4', '거센소리와 된소리', 'Aspirated and tense consonants', { en: 'Hear the difference between plain, aspirated and tense sounds.', ko: '예사소리, 거센소리, 된소리를 구별해요.' }, [
        ['ㅋ ㅌ ㅍ ㅊ', 'k, t, p, ch with a puff of air (aspirated). Hold a hand in front of your mouth: you should feel air.', '바람을 내뿜으며 발음해요.'],
        ['ㄲ ㄸ ㅃ ㅆ ㅉ', 'kk, tt, pp, ss, jj: tense, no air, a tight throat.', '목에 힘을 주고 바람 없이 발음해요.'],
        ['가 / 카 / 까', 'Plain / aspirated / tense. Changing the sound changes the word: 불 (fire), 풀 (grass), 뿔 (horn).', '소리가 바뀌면 뜻도 바뀌어요.'],
      ], [['코', 'nose'], ['토끼', 'rabbit'], ['커피', 'coffee'], ['아빠', 'dad'], ['짜다', 'to be salty']], [
        ['Which is aspirated (with air)?', ['ㄱ', 'ㄲ', 'ㅋ', 'ㅇ'], 2],
        ['Which is tense?', ['ㅂ', 'ㅃ', 'ㅍ', 'ㅁ'], 1],
        ['What does 토끼 mean?', ['nose', 'rabbit', 'coffee', 'dad'], 1],
        ['불, 풀, 뿔 are…', ['the same word', 'three different words', 'all "fire"', 'not real words'], 1],
      ]),
      lesson('h5', '받침 읽기', 'Final consonants', { en: 'Read the seven final sounds and linking.', ko: '받침 일곱 소리와 연음을 읽어요.' }, [
        ['ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅇ', 'At the end of a syllable every consonant sounds like one of these seven: 옷 sounds "ot", 부엌 sounds "bu-eok".', '받침은 일곱 가지 소리로만 나요.'],
        ['음악 → [으막]', 'Linking: a final consonant moves over when the next syllable starts with a silent ㅇ.', '받침 뒤에 ㅇ이 오면 소리가 넘어가요.'],
        ['한국어 → [한구거]', 'Read it smoothly: han-gu-geo.'],
      ], [['밥', 'rice, a meal'], ['물', 'water'], ['책', 'book'], ['옷', 'clothes'], ['음악', 'music']], [
        ['옷 sounds like…', ['os', 'ot', 'oj', 'och'], 1],
        ['How is 음악 pronounced?', ['[음악]', '[으막]', '[음막]', '[으낙]'], 1],
        ['What does 물 mean?', ['rice', 'water', 'book', 'clothes'], 1],
        ['Which is NOT one of the seven final sounds?', ['ㄴ', 'ㅁ', 'ㅅ', 'ㅇ'], 2, 'ㅅ at the end sounds like ㄷ.'],
      ]),
      lesson('h6', '이중 모음과 읽기 연습', 'Compound vowels and reading', { en: 'Read compound vowels and real signs around town.', ko: '이중 모음을 익히고 거리 간판을 읽어요.' }, [
        ['ㅐ ㅔ', 'ae, e: today they sound almost the same.', '요즘은 거의 같게 발음해요.'],
        ['ㅘ ㅝ ㅚ ㅟ ㅢ', 'wa, wo, oe, wi, ui: two vowels glide into one.'],
        ['카페 · 편의점 · 화장실', 'Café, convenience store, toilet: you can read these signs in town now!', '이제 거리 간판을 읽을 수 있어요!'],
      ], [['사과', 'apple'], ['회사', 'company'], ['의자', 'chair'], ['화장실', 'toilet'], ['편의점', 'convenience store']], [
        ['How do you read 사과?', ['sagwa', 'sago', 'sagu', 'sagae'], 0],
        ['What does 의자 mean?', ['doctor', 'chair', 'company', 'apple'], 1],
        ['Where do you buy rice balls at night?', ['화장실', '편의점', '회사', '의자'], 1],
        ['ㅐ and ㅔ today sound…', ['very different', 'almost the same', 'silent', 'like "o"'], 1],
      ]),
    ],
  },
  {
    id: 'topik1', stage: 'beginner', icon: '🌱', color: '#2f8f6b',
    name: { en: 'TOPIK Level 1', ko: '토픽 1급', ja: 'TOPIK 1級', zh: 'TOPIK 1级' },
    about: { en: 'Introduce yourself, count, shop, tell the time and talk about your day.', ko: '자기소개, 숫자, 물건 사기, 시간, 하루 일과를 말해요.' },
    lessons: [
      lesson('t1a', '자기소개', 'Introducing yourself', { en: 'Say who you are with 은/는 and 이에요/예요.', ko: '은/는, 이에요/예요로 자기소개를 해요.' }, [
        ['저는 민수예요.', 'N + 예요 after a vowel, N + 이에요 after a consonant: 학생이에요, 의사예요.', '받침 있으면 이에요, 없으면 예요.'],
        ['저는 학생이에요.', '은/는 marks the topic: 저는 = "as for me". 은 after a consonant, 는 after a vowel.', '받침 있으면 은, 없으면 는.'],
        ['만나서 반갑습니다.', 'Nice to meet you.'],
      ], [['저', 'I (polite)'], ['학생', 'student'], ['선생님', 'teacher'], ['회사원', 'office worker'], ['나라', 'country'], ['이름', 'name']], [
        ['저___ 학생이에요.', ['은', '는', '이', '가'], 1, '저 ends in a vowel → 는.'],
        ['선생님___.', ['예요', '이에요', '은', '를'], 1, '님 ends in a consonant → 이에요.'],
        ['What does 회사원 mean?', ['student', 'teacher', 'office worker', 'doctor'], 2],
        ['"Nice to meet you" is…', ['안녕히 가세요', '만나서 반갑습니다', '감사합니다', '괜찮아요'], 1],
      ]),
      lesson('t1b', '이것은 뭐예요?', 'What is this?', { en: 'Point at things and ask what they are.', ko: '물건을 가리키며 무엇인지 물어요.' }, [
        ['이것 / 그것 / 저것', 'this (near me) / that (near you) / that over there.', '말하는 사람과 듣는 사람의 거리에 따라 달라요.'],
        ['이게 뭐예요? — 책이에요.', '이게 = 이것이 (spoken). 뭐예요? = What is it?'],
        ['이 가방은 제 거예요.', '이/그/저 + noun: this bag. 제 거 = mine.'],
      ], [['책', 'book'], ['가방', 'bag'], ['휴대폰', 'mobile phone'], ['우산', 'umbrella'], ['시계', 'watch, clock'], ['뭐', 'what']], [
        ['Something far from both of you is…', ['이것', '그것', '저것', '제 거'], 2],
        ['이게 뭐예요? — ___', ['네, 맞아요', '우산이에요', '저는 학생이에요', '안녕하세요'], 1],
        ['What does 시계 mean?', ['bag', 'watch', 'phone', 'book'], 1],
        ['이게 is short for…', ['이것이', '이것은', '이것을', '이거예요'], 0],
      ]),
      lesson('t1c', '있어요 / 없어요', 'There is / there isn’t', { en: 'Say what you have and where things are.', ko: '가진 것과 물건의 위치를 말해요.' }, [
        ['동생이 있어요. 차가 없어요.', '이/가 marks the subject. N이/가 있어요 = have / there is; 없어요 = don’t have / there isn’t.', '받침 있으면 이, 없으면 가.'],
        ['편의점이 어디에 있어요?', 'Where is the convenience store? 에 marks the place where something is.'],
        ['책상 위에 / 의자 밑에 / 가방 안에', 'on the desk / under the chair / in the bag: N + 위·밑·안·옆·앞·뒤 + 에.'],
      ], [['위', 'top, above'], ['밑', 'under'], ['안', 'inside'], ['옆', 'next to'], ['앞', 'in front'], ['뒤', 'behind']], [
        ['돈___ 없어요.', ['이', '가', '은', '를'], 0, '돈 ends in a consonant → 이.'],
        ['"The cat is under the chair": 고양이가 의자 ___에 있어요.', ['위', '밑', '안', '옆'], 1],
        ['편의점이 어디___ 있어요?', ['에', '를', '은', '가'], 0],
        ['What does 옆 mean?', ['behind', 'next to', 'inside', 'above'], 1],
      ]),
      lesson('t1d', '숫자와 물건 사기', 'Numbers and shopping', { en: 'Count with Sino-Korean numbers and buy things.', ko: '한자어 숫자로 값을 말하고 물건을 사요.' }, [
        ['일 이 삼 사 오 육 칠 팔 구 십', '1-10 (Sino-Korean). Used for money, phone numbers, dates and minutes.', '돈, 전화번호, 날짜, 분에 써요.'],
        ['백 · 천 · 만', '100, 1,000, 10,000. 15,000원 = 만 오천 원 (no 일 before 만, 천, 백).'],
        ['이거 얼마예요? — 삼천 원이에요.', 'How much is this? — 3,000 won.'],
        ['이거 주세요.', 'Please give me this one: the most useful sentence for shopping!'],
      ], [['얼마', 'how much'], ['원', 'won (money)'], ['주세요', 'please give me'], ['비싸다', 'to be expensive'], ['싸다', 'to be cheap'], ['개', 'counter for things']], [
        ['4,500 원 is…', ['사천오백 원', '사만 오백 원', '넷천 오백 원', '사천오십 원'], 0],
        ['"How much is it?"', ['뭐예요?', '얼마예요?', '어디예요?', '누구예요?'], 1],
        ['10,000 is…', ['천', '만', '십만', '백'], 1],
        ['"Please give me this" →', ['이거 주세요', '이거 있어요', '이거 비싸요', '이거 뭐예요'], 0],
      ]),
      lesson('t1e', '시간과 하루', 'Time and my day', { en: 'Tell the time with native Korean numbers.', ko: '고유어 숫자로 시간을 말해요.' }, [
        ['하나 둘 셋 넷 다섯 여섯 일곱 여덟 아홉 열', '1-10 native Korean: used for hours, age and counting things. Before a counter: 한 시, 두 시, 세 시, 네 시.', '시간의 "시", 나이, 개수에 써요.'],
        ['지금 몇 시예요? — 세 시 삼십 분이에요.', 'Hours use native numbers, minutes use Sino-Korean: 세 시 삼십 분 (3:30). 반 = half: 세 시 반.'],
        ['아침 일곱 시에 일어나요.', 'At + time = time + 에.'],
      ], [['시', "o'clock"], ['분', 'minute'], ['반', 'half'], ['아침', 'morning'], ['점심', 'lunch, midday'], ['저녁', 'evening']], [
        ['2:00 is…', ['이 시', '두 시', '둘 시', '이십 시'], 1],
        ['5:30 is…', ['다섯 시 반', '오 시 반', '다섯 시 서른 분', '오 시 삼십'], 0],
        ['"I get up at 7": 일곱 시___ 일어나요.', ['에', '를', '이', '은'], 0],
        ['What does 저녁 mean?', ['morning', 'lunch', 'evening', 'night'], 2],
      ]),
      lesson('t1f', '-아요/어요', 'Polite present tense', { en: 'Make verbs polite with -아요/어요.', ko: '-아요/어요로 동사를 활용해요.' }, [
        ['가다 → 가요, 오다 → 와요', 'Stem ending in ㅏ or ㅗ → -아요.', '어간 끝이 ㅏ, ㅗ면 -아요.'],
        ['먹다 → 먹어요, 마시다 → 마셔요', 'Any other vowel → -어요.'],
        ['하다 → 해요', '하다 verbs always become 해요: 공부해요, 운동해요.'],
        ['카페에 가요. 커피를 마셔요.', '을/를 marks the object: 커피를 (vowel), 밥을 (consonant).'],
      ], [['가다', 'to go'], ['먹다', 'to eat'], ['마시다', 'to drink'], ['공부하다', 'to study'], ['보다', 'to see, watch'], ['읽다', 'to read']], [
        ['먹다 →', ['먹아요', '먹어요', '먹해요', '먹요'], 1],
        ['보다 →', ['보아요/봐요', '보어요', '보해요', '봐어요'], 0],
        ['공부하다 →', ['공부하요', '공부해요', '공부하어요', '공부아요'], 1],
        ['밥___ 먹어요.', ['을', '를', '이', '는'], 0, '밥 ends in a consonant → 을.'],
      ]),
      lesson('t1g', '안 / 못, 장소에 가요', 'Negatives and places', { en: 'Say what you don’t or can’t do, and where you go.', ko: '안/못으로 부정하고 장소에 가는 것을 말해요.' }, [
        ['안 먹어요 / 못 먹어요', '안 = don’t (choice), 못 = can’t (ability or situation).', '안은 의지, 못은 능력·상황이에요.'],
        ['공부 안 해요.', 'With 하다 verbs, 안 goes before 해요: 공부 안 해요, not 안 공부해요.'],
        ['학교에 가요. 도서관에서 공부해요.', '에 = to (a place you go), 에서 = at (where an action happens).', '에는 목적지, 에서는 행동하는 장소.'],
      ], [['학교', 'school'], ['도서관', 'library'], ['식당', 'restaurant'], ['집', 'home'], ['시장', 'market'], ['병원', 'hospital']], [
        ['"I can’t swim (I don’t know how)": 수영___ 해요.', ['안', '못', '은', '도'], 1],
        ['도서관___ 책을 읽어요.', ['에', '에서', '을', '이'], 1],
        ['공부하다 (negative) →', ['안 공부해요', '공부 안 해요', '공부 못 안 해요', '공부해요 안'], 1],
        ['집___ 가요.', ['에', '에서', '를', '도'], 0],
      ]),
    ],
  },
  {
    id: 'topik2', stage: 'beginner', icon: '🌿', color: '#3f8fbf',
    name: { en: 'TOPIK Level 2', ko: '토픽 2급', ja: 'TOPIK 2級', zh: 'TOPIK 2级' },
    about: { en: 'Past and future, wants and plans, reasons, requests, comparisons and abilities.', ko: '과거와 미래, 바람과 계획, 이유, 부탁, 비교, 능력을 말해요.' },
    lessons: [
      lesson('t2a', '-았/었어요', 'Past tense', { en: 'Talk about what you did.', ko: '한 일을 말해요.' }, [
        ['갔어요, 먹었어요, 했어요', 'Same rule as -아요/어요: ㅏ/ㅗ → -았어요, others → -었어요, 하다 → 했어요.'],
        ['어제 친구를 만났어요.', 'I met a friend yesterday.'],
        ['주말에 뭐 했어요?', 'What did you do at the weekend?'],
      ], [['어제', 'yesterday'], ['주말', 'weekend'], ['지난주', 'last week'], ['만나다', 'to meet'], ['놀다', 'to play, hang out'], ['여행하다', 'to travel']], [
        ['만나다 (past) →', ['만났어요', '만나었어요', '만났아요', '만나요'], 0],
        ['먹다 (past) →', ['먹았어요', '먹었어요', '먹했어요', '먹어요'], 1],
        ['"What did you do?"', ['뭐 해요?', '뭐 했어요?', '뭐 할 거예요?', '뭐예요?'], 1],
        ['What does 지난주 mean?', ['next week', 'this week', 'last week', 'weekend'], 2],
      ]),
      lesson('t2b', '-고 싶어요, -(으)ㄹ 거예요', 'Wants and plans', { en: 'Say what you want to do and will do.', ko: '하고 싶은 것과 할 일을 말해요.' }, [
        ['떡볶이를 먹고 싶어요.', 'Verb stem + -고 싶어요 = I want to…'],
        ['내일 한강에 갈 거예요.', 'Vowel stem + -ㄹ 거예요, consonant stem + -을 거예요 = will / am going to: 먹을 거예요.'],
        ['같이 갈래요?', 'Shall we go together? (-(으)ㄹ래요: a casual offer or question about someone’s wishes.)'],
      ], [['내일', 'tomorrow'], ['다음 주', 'next week'], ['같이', 'together'], ['보내다', 'to send; to spend (time)'], ['배우다', 'to learn'], ['방학', 'school holidays']], [
        ['"I want to learn Korean": 한국어를 배우___.', ['고 싶어요', 'ㄹ 거예요', '았어요', '세요'], 0],
        ['먹다 + -(으)ㄹ 거예요 →', ['먹ㄹ 거예요', '먹을 거예요', '먹을 거여요', '먹겠어요'], 1],
        ['"Shall we go together?"', ['같이 갈래요?', '같이 갔어요?', '같이 가요!', '같이 가고 싶어요'], 0],
        ['What does 방학 mean?', ['weekend', 'school holidays', 'library', 'homework'], 1],
      ]),
      lesson('t2c', '-(으)세요, -아/어 주세요', 'Requests and instructions', { en: 'Ask people politely to do things.', ko: '정중하게 부탁하고 안내해요.' }, [
        ['여기 앉으세요. 들어오세요.', '-(으)세요: polite instruction. Consonant stem + 으세요 (앉으세요), vowel stem + 세요 (가세요).'],
        ['천천히 말해 주세요.', '-아/어 주세요: please do it for me.'],
        ['사진 좀 찍어 주시겠어요?', 'Could you take a photo for me? (more polite)'],
      ], [['천천히', 'slowly'], ['다시', 'again'], ['앉다', 'to sit'], ['기다리다', 'to wait'], ['찍다', 'to take (a photo)'], ['좀', 'a little; please (softener)']], [
        ['앉다 + -(으)세요 →', ['앉세요', '앉으세요', '앉아세요', '앉어요'], 1],
        ['"Please say it again" →', ['다시 말해 주세요', '다시 말했어요', '다시 말할 거예요', '다시 말하고 싶어요'], 0],
        ['기다리다 + -아/어 주세요 →', ['기다리어 주세요', '기다려 주세요', '기다리 주세요', '기다라 주세요'], 1],
        ['What does 천천히 mean?', ['quickly', 'again', 'slowly', 'together'], 2],
      ]),
      lesson('t2d', '-고, -지만, -아서/어서', 'Linking sentences', { en: 'Join ideas: and, but, so.', ko: '그리고, 그렇지만, 그래서를 한 문장으로 이어요.' }, [
        ['이 카페는 싸고 맛있어요.', '-고 = and: lists two facts or actions.'],
        ['한국어는 어렵지만 재미있어요.', '-지만 = but.'],
        ['배가 고파서 라면을 먹었어요.', '-아서/어서 = because/so (reason). The tense goes at the end only: never 고팠어서.', '-아서/어서 앞에는 과거형을 쓰지 않아요.'],
      ], [['맛있다', 'to be tasty'], ['어렵다', 'to be difficult'], ['재미있다', 'to be fun'], ['배고프다', 'to be hungry'], ['피곤하다', 'to be tired'], ['그래서', 'so, therefore']], [
        ['"Expensive but good": 비싸___ 좋아요.', ['고', '지만', '아서', '면'], 1],
        ['"I was tired so I slept": 피곤해___ 잤어요.', ['서', '고', '지만', '도'], 0],
        ['Which is wrong?', ['배가 고파서 먹었어요', '배가 고팠어서 먹었어요', '싸고 맛있어요', '어렵지만 재미있어요'], 1],
        ['What does 어렵다 mean?', ['to be easy', 'to be difficult', 'to be fun', 'to be tasty'], 1],
      ]),
      lesson('t2e', '-(으)ㄹ 수 있어요', 'Can and can’t', { en: 'Talk about abilities and possibilities.', ko: '할 수 있는 것과 없는 것을 말해요.' }, [
        ['한국어를 할 수 있어요.', 'Verb + -(으)ㄹ 수 있어요 = can. Consonant stem + -을 수: 먹을 수 있어요.'],
        ['매운 음식을 먹을 수 없어요.', '-(으)ㄹ 수 없어요 = can’t (same as 못).'],
        ['자전거를 탈 줄 알아요.', '-(으)ㄹ 줄 알아요 = know how to (a learned skill).'],
      ], [['맵다', 'to be spicy'], ['타다', 'to ride'], ['운전하다', 'to drive'], ['수영하다', 'to swim'], ['노래하다', 'to sing'], ['요리하다', 'to cook']], [
        ['먹다 + -(으)ㄹ 수 있어요 →', ['먹ㄹ 수 있어요', '먹을 수 있어요', '먹는 수 있어요', '먹어 수 있어요'], 1],
        ['"I can’t drive" →', ['운전할 수 없어요', '운전할 수 있어요', '운전하고 싶어요', '운전했어요'], 0],
        ['"Know how to swim" →', ['수영할 줄 알아요', '수영하고 알아요', '수영해서 알아요', '수영을 알아요'], 0],
        ['What does 맵다 mean?', ['salty', 'sweet', 'spicy', 'sour'], 2],
      ]),
      lesson('t2f', '비교와 정도', 'Comparing', { en: 'Compare things and say "the most".', ko: '비교하고 최고를 말해요.' }, [
        ['버스보다 지하철이 빨라요.', 'A보다 B가 더 … = B is more … than A. 보다 = than.'],
        ['제일 좋아하는 음식은 비빔밥이에요.', '제일 / 가장 = the most.'],
        ['조금 / 아주 / 너무', 'a little / very / too (or "so", in casual speech).'],
      ], [['빠르다', 'to be fast'], ['느리다', 'to be slow'], ['크다', 'to be big'], ['작다', 'to be small'], ['제일', 'the most'], ['더', 'more']], [
        ['"The subway is faster than the bus": 버스___ 지하철이 빨라요.', ['보다', '에서', '하고', '도'], 0],
        ['"the most" →', ['더', '제일', '조금', '보다'], 1],
        ['What does 느리다 mean?', ['fast', 'slow', 'big', 'small'], 1],
        ['너무 비싸요 means…', ['a bit cheap', 'too expensive', 'not expensive', 'very cheap'], 1],
      ]),
      lesson('t2g', '-(으)면, -는데요', 'If, and softening', { en: 'Make conditions and soften what you say.', ko: '조건을 말하고 말을 부드럽게 해요.' }, [
        ['비가 오면 우산을 쓰세요.', '-(으)면 = if/when. Consonant stem + 으면: 먹으면.'],
        ['시간이 있으면 같이 가요.', 'If you have time, let’s go together.'],
        ['지금 좀 바쁜데요…', '-(으)ㄴ데요/는데요 leaves the sentence open, softening it: "I’m a bit busy right now…"', '말끝을 흐려 부드럽게 해요.'],
      ], [['비가 오다', 'to rain'], ['눈이 오다', 'to snow'], ['우산을 쓰다', 'to use an umbrella'], ['바쁘다', 'to be busy'], ['시간', 'time'], ['날씨', 'weather']], [
        ['"If it rains" →', ['비가 오면', '비가 와서', '비가 오고', '비가 오지만'], 0],
        ['먹다 + -(으)면 →', ['먹면', '먹으면', '먹어면', '먹는면'], 1],
        ['What does 우산을 쓰다 mean?', ['to buy an umbrella', 'to use an umbrella', 'to write', 'to lose an umbrella'], 1],
        ['-는데요 at the end of a sentence…', ['makes it a question', 'softens it', 'makes it past', 'makes it a command'], 1],
      ]),
    ],
  },
  {
    id: 'topik3', stage: 'intermediate', icon: '🌳', color: '#c9822b',
    name: { en: 'TOPIK Level 3', ko: '토픽 3급', ja: 'TOPIK 3級', zh: 'TOPIK 3级' },
    about: { en: 'Guesses, reasons, reported speech, experiences and everyday problems.', ko: '추측, 이유, 전달, 경험, 생활 속 문제를 말해요.' },
    lessons: [
      lesson('t3a', '-(으)ㄴ/는 것 같다', 'It seems…', { en: 'Make guesses politely.', ko: '추측을 부드럽게 말해요.' }, [
        ['비가 올 것 같아요.', 'Future guess: -(으)ㄹ 것 같다 (it looks like it will…).'],
        ['밖에 비가 오는 것 같아요.', 'Present guess: verb + -는 것 같다.'],
        ['이 옷이 좀 작은 것 같아요.', 'Adjective + -(으)ㄴ 것 같다. Koreans use it to soften opinions too.', '의견을 부드럽게 말할 때도 써요.'],
      ], [['밖', 'outside'], ['아마', 'probably'], ['느낌', 'feeling'], ['어울리다', 'to suit'], ['늦다', 'to be late'], ['막히다', 'to be blocked (traffic)']], [
        ['"It looks like it will snow" →', ['눈이 올 것 같아요', '눈이 오는 것 같아요', '눈이 온 것 같아요', '눈이 와요'], 0],
        ['Adjective 작다 + -(으)ㄴ 것 같다 →', ['작는 것 같다', '작은 것 같다', '작어 것 같다', '작은 같다'], 1],
        ['Why do Koreans often say -것 같아요?', ['To sound rude', 'To soften opinions', 'To make the past tense', 'To ask questions'], 1],
        ['What does 막히다 mean (traffic)?', ['to move fast', 'to be blocked', 'to stop working', 'to arrive'], 1],
      ]),
      lesson('t3b', '-기 때문에, -(으)니까', 'Because', { en: 'Give reasons in different situations.', ko: '상황에 맞게 이유를 말해요.' }, [
        ['감기에 걸렸기 때문에 학교에 못 갔어요.', '-기 때문에: a clear, formal reason. N + 때문에: 비 때문에 (because of the rain).'],
        ['추우니까 따뜻하게 입으세요.', '-(으)니까: a reason followed by a suggestion or command (-아서 can’t do this).', '명령이나 제안 앞에는 -(으)니까를 써요.'],
        ['늦어서 죄송합니다.', 'Apologies and thanks use -아서/어서: 와 주셔서 감사합니다.'],
      ], [['감기에 걸리다', 'to catch a cold'], ['춥다', 'to be cold'], ['덥다', 'to be hot'], ['따뜻하다', 'to be warm'], ['약', 'medicine'], ['이유', 'reason']], [
        ['"It’s cold, so wear a coat!" →', ['추워서 코트를 입으세요', '추우니까 코트를 입으세요', '춥기 때문에 코트를 입으세요', '춥고 입으세요'], 1],
        ['"Because of the rain" →', ['비 때문에', '비 니까', '비라서만', '비 기 때문에'], 0],
        ['"Sorry I’m late" →', ['늦어서 죄송합니다', '늦으니까 죄송합니다', '늦기 죄송합니다', '늦고 죄송합니다'], 0],
        ['What does 감기에 걸리다 mean?', ['to take medicine', 'to catch a cold', 'to feel better', 'to be hot'], 1],
      ]),
      lesson('t3c', '-다고 하다', 'Reported speech', { en: 'Pass on what someone said.', ko: '다른 사람의 말을 전해요.' }, [
        ['민수 씨가 내일 바쁘다고 했어요.', 'Statement: adjective + -다고 하다; verb + -ㄴ/는다고: 간다고, 먹는다고.'],
        ['친구가 같이 가자고 했어요.', 'Suggestion: -자고 하다.'],
        ['선생님이 숙제를 하라고 하셨어요.', 'Command: -(으)라고 하다. Question: -냐고 하다 (어디 가냐고 물었어요).'],
      ], [['숙제', 'homework'], ['묻다', 'to ask'], ['전하다', 'to pass on'], ['약속', 'appointment, promise'], ['취소하다', 'to cancel'], ['연락하다', 'to contact']], [
        ['"He said he is busy" →', ['바쁘다고 했어요', '바쁘자고 했어요', '바쁘라고 했어요', '바쁘냐고 했어요'], 0],
        ['"She said let’s eat" →', ['먹는다고 했어요', '먹자고 했어요', '먹으라고 했어요', '먹냐고 했어요'], 1],
        ['가다 (statement) →', ['가다고', '간다고', '가는다고', '가냐다고'], 1],
        ['What does 취소하다 mean?', ['to book', 'to cancel', 'to contact', 'to promise'], 1],
      ]),
      lesson('t3d', '-아/어 보다, -(으)ㄴ 적이 있다', 'Trying and experiences', { en: 'Talk about trying things and past experiences.', ko: '시도와 경험을 말해요.' }, [
        ['이 옷 한번 입어 보세요.', '-아/어 보다 = to try doing something.'],
        ['한복을 입어 본 적이 있어요.', '-(으)ㄴ 적이 있다/없다 = have (never) done before. Often with 보다: 가 본 적이 있어요.'],
        ['제주도에 가 봤어요?', 'Have you been to Jeju? (가 봤어요 = went and experienced.)'],
      ], [['한번', 'once; give it a try'], ['경험', 'experience'], ['처음', 'the first time'], ['입다', 'to wear (clothes)'], ['신다', 'to wear (shoes)'], ['드디어', 'finally']], [
        ['"Try it on" →', ['입어 보세요', '입고 보세요', '입을 보세요', '입어 봤어요'], 0],
        ['"I have never eaten it" →', ['먹은 적이 없어요', '먹을 적이 없어요', '먹는 적이 없어요', '먹어 없어요'], 0],
        ['신다 is used for…', ['hats', 'shoes and socks', 'shirts', 'glasses'], 1],
        ['What does 처음 mean?', ['last', 'the first time', 'again', 'always'], 1],
      ]),
      lesson('t3e', '-(으)ㄹ 때, -는 동안', 'When and while', { en: 'Talk about the time something happens.', ko: '어떤 일이 일어나는 때를 말해요.' }, [
        ['한국에 처음 왔을 때 많이 힘들었어요.', '-(으)ㄹ 때 = when. Past: -았/었을 때.'],
        ['기다리는 동안 책을 읽었어요.', '-는 동안 = while (during the time).'],
        ['밥을 먹다가 전화를 받았어요.', '-다가 = in the middle of doing A, B happened (A stops).', '하던 일이 멈추고 다른 일이 일어나요.'],
      ], [['힘들다', 'to be hard, tiring'], ['동안', 'during'], ['전화를 받다', 'to answer the phone'], ['갑자기', 'suddenly'], ['어릴 때', 'when young'], ['쉬다', 'to rest']], [
        ['"When I was young" →', ['어릴 때', '어려서 때', '어린 동안', '어리다가'], 0],
        ['"While waiting" →', ['기다리는 동안', '기다릴 동안', '기다리다가만', '기다려서'], 0],
        ['-다가 means…', ['after finishing A', 'in the middle of A, something else happened', 'because of A', 'instead of A'], 1],
        ['What does 갑자기 mean?', ['slowly', 'suddenly', 'finally', 'always'], 1],
      ]),
      lesson('t3f', '-(으)면 좋겠다, -아/어야 하다', 'Wishes and obligations', { en: 'Say what you hope for and what you must do.', ko: '바람과 의무를 말해요.' }, [
        ['내일 날씨가 좋으면 좋겠어요.', '-(으)면 좋겠다 = I hope / I wish.'],
        ['내일까지 숙제를 내야 해요.', '-아/어야 하다 (or 되다) = must, have to.'],
        ['안 가도 돼요.', '-아/어도 되다 = may, it’s OK to; 안 -아/어도 되다 = don’t have to.'],
      ], [['내다', 'to hand in; to pay'], ['까지', 'until, by'], ['꼭', 'surely, without fail'], ['괜찮다', 'to be OK'], ['규칙', 'rule'], ['지키다', 'to keep (a rule)']], [
        ['"I hope it’s sunny" →', ['맑으면 좋겠어요', '맑아야 해요', '맑아도 돼요', '맑을 거예요'], 0],
        ['"You must keep the rules" →', ['규칙을 지켜야 해요', '규칙을 지켜도 돼요', '규칙을 지키면 좋겠어요', '규칙을 지켰어요'], 0],
        ['"You don’t have to come" →', ['안 와도 돼요', '와야 해요', '오면 좋겠어요', '못 와요'], 0],
        ['What does 까지 mean?', ['from', 'until, by', 'with', 'than'], 1],
      ]),
      lesson('t3g', '생활 속 한국어', 'Korean for daily life', { en: 'Handle the bank, the doctor and the phone.', ko: '은행, 병원, 전화에서 쓰는 표현을 익혀요.' }, [
        ['어디가 아프세요? — 머리가 아프고 열이 나요.', 'At the doctor: where does it hurt? — I have a headache and a fever.'],
        ['통장을 만들고 싶은데요.', 'At the bank: I’d like to open an account. (-고 싶은데요 = a soft request.)'],
        ['잠깐만 기다려 주시겠어요?', 'On the phone: could you hold on a moment?'],
      ], [['열이 나다', 'to have a fever'], ['기침', 'cough'], ['처방전', 'prescription'], ['통장', 'bankbook, account'], ['신분증', 'ID card'], ['잠깐만', 'just a moment']], [
        ['"I have a fever" →', ['열이 나요', '열이 해요', '열을 해요', '열이 와요'], 0],
        ['You need this to open a bank account:', ['처방전', '신분증', '기침', '우산'], 1],
        ['"Just a moment" →', ['잠깐만요', '천천히요', '다시요', '갑자기요'], 0],
        ['What does 처방전 mean?', ['receipt', 'prescription', 'ID card', 'bankbook'], 1],
      ]),
    ],
  },
  {
    id: 'topik4', stage: 'intermediate', icon: '🍂', color: '#a8553a',
    name: { en: 'TOPIK Level 4', ko: '토픽 4급', ja: 'TOPIK 4級', zh: 'TOPIK 4级' },
    about: { en: 'Recollections, near misses, unexpected results, passives and causatives, news and work topics.', ko: '회상, 아슬아슬한 일, 뜻밖의 결과, 피동과 사동, 뉴스와 직장 주제를 다뤄요.' },
    lessons: [
      lesson('t4a', '-더라고요, -던', 'Recalling what you saw', { en: 'Share things you saw or felt yourself.', ko: '직접 보고 느낀 것을 회상하며 말해요.' }, [
        ['그 식당 정말 맛있더라고요.', '-더라고요: reporting something you experienced yourself, with a sense of discovery.', '직접 경험하고 새로 알게 된 것을 말해요.'],
        ['어제 보던 드라마 다 봤어요?', '-던 + noun: something that was going on (and not finished).'],
        ['자주 가던 카페가 없어졌어요.', 'The café I used to go to has gone (-던 = used to).'],
      ], [['정말', 'really'], ['자주', 'often'], ['없어지다', 'to disappear'], ['드라마', 'TV drama'], ['분위기', 'atmosphere'], ['생각보다', 'than expected']], [
        ['"(I found) the food was really tasty" →', ['맛있더라고요', '맛있겠어요', '맛있을 거예요', '맛있으면 좋겠어요'], 0],
        ['"The café I used to go to" →', ['가던 카페', '갈 카페', '가던다 카페', '가 카페'], 0],
        ['-더라고요 is about…', ['the speaker’s own experience', 'the future', 'commands', 'hopes'], 0],
        ['What does 생각보다 mean?', ['as planned', 'than expected', 'by thinking', 'after thinking'], 1],
      ]),
      lesson('t4b', '-(으)ㄹ 뻔하다, -는 바람에', 'Near misses and mishaps', { en: 'Say what almost happened and what went wrong.', ko: '거의 일어날 뻔한 일과 뜻밖의 원인을 말해요.' }, [
        ['길이 미끄러워서 넘어질 뻔했어요.', '-(으)ㄹ 뻔하다 = almost (but didn’t). Always past: 뻔했어요.'],
        ['늦잠을 자는 바람에 지각했어요.', '-는 바람에 = because of (an unexpected cause, usually a bad result).', '예상하지 못한 원인으로 나쁜 결과가 생겨요.'],
        ['휴대폰을 집에 두고 오는 바람에 연락을 못 했어요.', 'Because I (unexpectedly) left my phone at home, I couldn’t call.'],
      ], [['미끄럽다', 'to be slippery'], ['넘어지다', 'to fall over'], ['늦잠을 자다', 'to oversleep'], ['지각하다', 'to be late (for school/work)'], ['놓치다', 'to miss (a bus)'], ['두고 오다', 'to leave behind']], [
        ['"I almost missed the bus" →', ['버스를 놓칠 뻔했어요', '버스를 놓쳤을 뻔해요', '버스를 놓치는 바람에', '버스를 놓쳐 봤어요'], 0],
        ['-는 바람에 usually leads to…', ['a good result', 'a bad, unexpected result', 'a plan', 'a wish'], 1],
        ['"I overslept so I was late" →', ['늦잠을 자는 바람에 지각했어요', '늦잠을 잘 뻔해서 지각했어요', '늦잠을 자면 지각해요', '늦잠을 자도 돼요'], 0],
        ['What does 넘어지다 mean?', ['to stand up', 'to fall over', 'to slip away', 'to run'], 1],
      ]),
      lesson('t4c', '-(으)ㄹ수록, -다 보니', 'The more…, and as it turned out', { en: 'Describe gradual change and how things turned out.', ko: '점점 변하는 것과 하다 보니 생긴 결과를 말해요.' }, [
        ['한국어는 배울수록 재미있어요.', '-(으)ㄹ수록 = the more…, the more…. Often -(으)면 -(으)ㄹ수록: 보면 볼수록.'],
        ['매일 연습하다 보니 실력이 늘었어요.', '-다 보니 = from doing it repeatedly, I found / it turned out…'],
        ['이야기하다 보니 벌써 열두 시네요.', 'We were chatting and (I realise) it’s already twelve.'],
      ], [['실력', 'skill, ability'], ['늘다', 'to increase, improve'], ['연습하다', 'to practise'], ['벌써', 'already'], ['점점', 'gradually'], ['익숙하다', 'to be used to']], [
        ['"The more I see it, the better it is" →', ['보면 볼수록 좋아요', '보다 보니 좋아요', '볼 뻔했어요', '보는 바람에 좋아요'], 0],
        ['"Practising every day, my skills improved" →', ['연습하다 보니 실력이 늘었어요', '연습하자고 실력이 늘었어요', '연습하는 바람에 늘었어요', '연습할 뻔했어요'], 0],
        ['What does 익숙하다 mean?', ['to be new', 'to be used to', 'to be tired', 'to be strange'], 1],
        ['What does 벌써 mean?', ['still', 'already', 'not yet', 'soon'], 1],
      ]),
      lesson('t4d', '피동', 'Passive verbs', { en: 'Use passive verbs: something gets done.', ko: '피동사를 써서 "~이/가 되다"를 말해요.' }, [
        ['문이 열렸어요. 글씨가 잘 보여요.', 'Passive with -이/히/리/기-: 보다 → 보이다, 열다 → 열리다, 닫다 → 닫히다, 안다 → 안기다.'],
        ['소리가 들려요.', '듣다 → 들리다: I can hear a sound.'],
        ['불이 켜져 있어요.', '-아/어지다 makes a passive too, and -아/어 있다 shows the state: the light is on.'],
      ], [['열리다', 'to be opened'], ['닫히다', 'to be closed'], ['보이다', 'to be seen'], ['들리다', 'to be heard'], ['팔리다', 'to be sold'], ['켜지다', 'to be turned on']], [
        ['닫다 (passive) →', ['닫히다', '닫리다', '닫기다', '닫이다'], 0],
        ['"I can hear music" →', ['음악이 들려요', '음악이 듣어요', '음악이 들어요', '음악이 들렸어 해요'], 0],
        ['"This sold out quickly" →', ['빨리 팔렸어요', '빨리 팔았어요', '빨리 팔려야 해요', '빨리 팔 뻔했어요'], 0],
        ['What does 보이다 mean?', ['to show', 'to be seen', 'to look for', 'to watch'], 1],
      ]),
      lesson('t4e', '사동', 'Causative verbs', { en: 'Make someone do something.', ko: '남에게 무엇을 하게 하는 표현을 써요.' }, [
        ['아이에게 밥을 먹여요.', 'Causative with -이/히/리/기/우/구/추-: 먹다 → 먹이다 (feed), 입다 → 입히다 (dress someone).'],
        ['아이를 재웠어요.', '자다 → 재우다: put a child to sleep.'],
        ['동생을 웃게 했어요.', '-게 하다 works with any verb: made my sibling laugh.'],
      ], [['먹이다', 'to feed'], ['입히다', 'to dress (someone)'], ['재우다', 'to put to sleep'], ['울리다', 'to make cry'], ['웃기다', 'to make laugh, be funny'], ['알리다', 'to let know']], [
        ['자다 (causative) →', ['자이다', '재우다', '자히다', '자기다'], 1],
        ['"I fed the dog" →', ['개에게 밥을 먹였어요', '개가 밥을 먹혔어요', '개를 먹었어요', '개에게 밥을 먹어 봤어요'], 0],
        ['"-게 하다" means…', ['to be done', 'to make someone do', 'to want to do', 'to almost do'], 1],
        ['What does 알리다 mean?', ['to know', 'to let know', 'to forget', 'to ask'], 1],
      ]),
      lesson('t4f', '뉴스와 사회', 'News and society', { en: 'Understand news-style Korean.', ko: '뉴스와 사회 주제의 표현을 이해해요.' }, [
        ['물가가 오르고 있습니다.', '-고 있습니다: formal news style for ongoing change.'],
        ['정부는 새로운 정책을 발표했습니다.', 'The government announced a new policy.'],
        ['-에 따르면 …-다고 합니다', 'According to …, it is said that … (a very common news pattern).'],
      ], [['물가', 'prices (cost of living)'], ['오르다', 'to rise'], ['떨어지다', 'to fall'], ['정부', 'government'], ['정책', 'policy'], ['발표하다', 'to announce']], [
        ['"Prices are rising" →', ['물가가 오르고 있습니다', '물가가 떨어지고 있습니다', '물가를 올렸습니다', '물가가 없습니다'], 0],
        ['"According to the report" →', ['보도에 따르면', '보도 때문에', '보도할수록', '보도하는 바람에'], 0],
        ['What does 발표하다 mean?', ['to hide', 'to announce', 'to vote', 'to rise'], 1],
        ['떨어지다 is the opposite of…', ['오르다', '발표하다', '정책', '정부'], 0],
      ]),
      lesson('t4g', '직장 생활', 'Working life', { en: 'Polite Korean at work: honorifics and reports.', ko: '직장에서 쓰는 높임말과 보고 표현을 익혀요.' }, [
        ['사장님께서 회의실에 계십니다.', 'Honorifics: 께서 (subject), 계시다 (be, for people), -(으)시- in the verb.', '윗사람에게는 께서, 계시다, -(으)시-를 써요.'],
        ['보고서를 드렸습니다.', '드리다 = give (to someone senior), 여쭙다 = ask (humble).'],
        ['확인하는 대로 연락드리겠습니다.', '-는 대로 = as soon as. -겠습니다 = I will (formal, polite).'],
      ], [['회의', 'meeting'], ['보고서', 'report'], ['확인하다', 'to check'], ['출장', 'business trip'], ['퇴근하다', 'to leave work'], ['동료', 'colleague']], [
        ['Honorific subject marker →', ['께서', '에게', '한테', '부터'], 0],
        ['"I gave (to the boss)" →', ['드렸습니다', '줬습니다', '주셨습니다', '받았습니다'], 0],
        ['"As soon as I check" →', ['확인하는 대로', '확인할수록', '확인하다 보니', '확인할 뻔'], 0],
        ['What does 퇴근하다 mean?', ['to go to work', 'to leave work', 'to have a meeting', 'to go on a business trip'], 1],
      ]),
    ],
  },
  {
    id: 'advanced', stage: 'advanced', icon: '🏔️', color: '#5a4fb0',
    name: { en: 'Advanced Class', ko: '고급반', ja: '上級クラス', zh: '高级班' },
    about: { en: 'TOPIK 5-6 grammar, idioms and proverbs, written style and debate.', ko: '토픽 5·6급 문법, 관용어와 속담, 문어체, 토론 표현을 배워요.' },
    lessons: [
      lesson('adv1', '-기 마련이다, -는 셈이다', 'Bound to, and as good as', { en: 'Express inevitability and approximation.', ko: '당연한 결과와 사실상의 의미를 말해요.' }, [
        ['열심히 하면 좋은 결과가 나오기 마련이에요.', '-기 마련이다 = it is natural / bound to happen.'],
        ['이 정도면 다 끝난 셈이에요.', '-(으)ㄴ/는 셈이다 = it is as good as / practically.'],
        ['누구나 실수하기 마련이니까 너무 걱정하지 마세요.', 'Everyone makes mistakes, so don’t worry too much.'],
      ], [['결과', 'result'], ['실수', 'mistake'], ['누구나', 'anyone, everyone'], ['정도', 'degree, extent'], ['당연하다', 'to be natural, obvious'], ['사실상', 'in effect']], [
        ['"Anyone is bound to make mistakes" →', ['누구나 실수하기 마련이에요', '누구나 실수할 뻔해요', '누구나 실수하는 바람에', '누구나 실수할수록'], 0],
        ['"It’s practically finished" →', ['다 끝난 셈이에요', '다 끝나기 마련이에요', '다 끝날 뻔했어요', '다 끝나는 대로'], 0],
        ['What does 당연하다 mean?', ['to be strange', 'to be obvious', 'to be rare', 'to be hard'], 1],
        ['-기 마련이다 expresses…', ['a wish', 'something natural or inevitable', 'a near miss', 'a command'], 1],
      ]),
      lesson('adv2', '-(으)ㄴ/는 반면에, -는 데 반해', 'Contrast', { en: 'Contrast two sides formally.', ko: '두 가지를 격식 있게 대조해요.' }, [
        ['도시는 편리한 반면에 공기가 안 좋아요.', '-(으)ㄴ/는 반면(에) = while, on the other hand.'],
        ['수입은 늘어난 데 반해 지출은 줄었다.', '-(으)ㄴ/는 데 반해 = in contrast to (written style).'],
        ['장점이 있는가 하면 단점도 있다.', '-는가 하면 = while there is A, there is also B.'],
      ], [['편리하다', 'to be convenient'], ['공기', 'air'], ['수입', 'income'], ['지출', 'spending'], ['장점', 'advantage'], ['단점', 'disadvantage']], [
        ['"Convenient, but on the other hand…" →', ['편리한 반면에', '편리할 뻔해서', '편리하기 마련이라', '편리한 셈이라'], 0],
        ['What is the opposite of 장점?', ['단점', '수입', '지출', '공기'], 0],
        ['-는 데 반해 is mostly used in…', ['casual chat', 'writing and formal speech', 'commands', 'questions'], 1],
        ['What does 지출 mean?', ['income', 'spending', 'savings', 'tax'], 1],
      ]),
      lesson('adv3', '-고자, -(으)ㄹ 지경이다', 'Purpose and extremes', { en: 'State purpose formally and describe extreme states.', ko: '목적을 격식 있게 말하고 극단적인 상태를 표현해요.' }, [
        ['한국 문화를 알리고자 이 책을 썼습니다.', '-고자 = in order to (formal, written). Also -고자 하다 = intend to.'],
        ['너무 바빠서 쓰러질 지경이에요.', '-(으)ㄹ 지경이다 = to the point of (an extreme, usually bad, state).'],
        ['배가 고파 죽겠어요.', 'Casual extreme: -아/어 죽겠다 = so … I could die.'],
      ], [['목적', 'purpose'], ['쓰러지다', 'to collapse'], ['문화', 'culture'], ['상태', 'state, condition'], ['한계', 'limit'], ['견디다', 'to endure']], [
        ['"In order to introduce Korean culture" (formal) →', ['한국 문화를 알리고자', '한국 문화를 알리는 바람에', '한국 문화를 알릴 뻔', '한국 문화를 알리기 마련'], 0],
        ['"So busy I could collapse" →', ['쓰러질 지경이에요', '쓰러진 셈이에요', '쓰러지기 마련이에요', '쓰러지고자 해요'], 0],
        ['What does 견디다 mean?', ['to endure', 'to give up', 'to collapse', 'to rest'], 0],
        ['-고자 sounds…', ['casual', 'formal', 'childish', 'rude'], 1],
      ]),
      lesson('adv4', '관용어', 'Idioms', { en: 'Use common body-part idioms.', ko: '자주 쓰는 신체 관용어를 익혀요.' }, [
        ['발이 넓다', 'Wide feet = knows lots of people.', '아는 사람이 많다.'],
        ['손이 크다', 'Big hands = generous (makes or gives a lot).', '씀씀이가 후하다.'],
        ['귀가 얇다', 'Thin ears = easily persuaded.', '남의 말에 쉽게 넘어간다.'],
        ['눈이 높다 / 입이 짧다', 'High eyes = picky standards; short mouth = a picky eater.', '기준이 까다롭다 / 음식을 가린다.'],
      ], [['발', 'foot'], ['손', 'hand'], ['귀', 'ear'], ['눈', 'eye'], ['입', 'mouth'], ['얼굴', 'face']], [
        ['Someone who knows lots of people is…', ['발이 넓다', '손이 크다', '귀가 얇다', '입이 짧다'], 0],
        ['Someone easily persuaded is…', ['눈이 높다', '귀가 얇다', '발이 넓다', '손이 크다'], 1],
        ['손이 크다 means…', ['is very tall', 'is generous', 'is strong', 'is clumsy'], 1],
        ['A picky eater is…', ['입이 짧다', '입이 무겁다', '눈이 높다', '발이 넓다'], 0],
      ]),
      lesson('adv5', '속담', 'Proverbs', { en: 'Understand and use well-known proverbs.', ko: '자주 쓰는 속담을 이해하고 써요.' }, [
        ['가는 말이 고와야 오는 말이 곱다.', 'Kind words out, kind words back: treat others as you want to be treated.', '내가 남에게 잘해야 남도 나에게 잘한다.'],
        ['낮말은 새가 듣고 밤말은 쥐가 듣는다.', 'Birds hear daytime words, mice hear night-time words: walls have ears.', '말조심하라는 뜻.'],
        ['티끌 모아 태산', 'Gather dust and make a mountain: small things add up.', '작은 것도 모이면 크게 된다.'],
        ['백지장도 맞들면 낫다.', 'Even a sheet of paper is easier carried by two: teamwork helps.', '쉬운 일도 함께하면 더 쉽다.'],
      ], [['속담', 'proverb'], ['곱다', 'to be fine, gentle'], ['티끌', 'speck of dust'], ['태산', 'a great mountain'], ['맞들다', 'to lift together'], ['쥐', 'mouse']], [
        ['"Walls have ears" →', ['낮말은 새가 듣고 밤말은 쥐가 듣는다', '티끌 모아 태산', '백지장도 맞들면 낫다', '가는 말이 고와야 오는 말이 곱다'], 0],
        ['Saving a little every day: which proverb?', ['티끌 모아 태산', '귀가 얇다', '발이 넓다', '작심삼일'], 0],
        ['백지장도 맞들면 낫다 is about…', ['paper', 'teamwork', 'money', 'talking'], 1],
        ['가는 말이 고와야 오는 말이 곱다 teaches…', ['speak kindly to get kindness back', 'talk less', 'save money', 'work hard'], 0],
      ]),
      lesson('adv6', '문어체: -ㄴ/는다', 'Written style', { en: 'Read and write the plain written style of essays and news.', ko: '글과 신문에 쓰는 한다체를 읽고 써요.' }, [
        ['나는 매일 아침 신문을 읽는다.', 'Plain style: verb + -ㄴ/는다 (간다, 먹는다), adjective + -다 (좋다), noun + -이다.'],
        ['한국의 인구는 점점 줄고 있다.', 'Essays and news use this style, with 나 / 우리 instead of 저 / 저희.'],
        ['따라서 / 그러므로 / 한편', 'Therefore / thus / meanwhile: linking words for writing.'],
      ], [['인구', 'population'], ['줄다', 'to decrease'], ['따라서', 'therefore'], ['한편', 'meanwhile'], ['주장', 'claim, argument'], ['근거', 'basis, evidence']], [
        ['먹다 (written plain style) →', ['먹는다', '먹다요', '먹어요', '먹습니다'], 0],
        ['가다 (written plain style) →', ['가는다', '간다', '가다', '갑니다'], 1],
        ['"Therefore" in writing →', ['따라서', '근데', '그래서요', '아무튼'], 0],
        ['What does 근거 mean?', ['claim', 'evidence', 'population', 'meanwhile'], 1],
      ]),
      lesson('adv7', '토론과 발표', 'Debate and presentations', { en: 'Give opinions, agree and disagree politely.', ko: '의견을 말하고 정중하게 찬성·반대해요.' }, [
        ['제 생각에는 … -다고 봅니다.', 'In my view, I believe that… (a formal opinion).'],
        ['그 의견에 동의합니다. / 저는 생각이 조금 다릅니다.', 'I agree with that view. / I see it a little differently: a polite way to disagree.', '반대할 때도 부드럽게 말해요.'],
        ['결론적으로 말씀드리면…', 'To conclude… (wrapping up a presentation).'],
      ], [['의견', 'opinion'], ['동의하다', 'to agree'], ['반대하다', 'to oppose'], ['결론', 'conclusion'], ['발표', 'presentation'], ['예를 들면', 'for example']], [
        ['A polite way to disagree →', ['저는 생각이 조금 다릅니다', '틀렸어요', '아니거든요', '몰라요'], 0],
        ['"To conclude" →', ['결론적으로 말씀드리면', '예를 들면', '그런데', '한편'], 0],
        ['"For example" →', ['예를 들면', '따라서', '결론적으로', '반면에'], 0],
        ['What does 동의하다 mean?', ['to oppose', 'to agree', 'to present', 'to conclude'], 1],
      ]),
    ],
  },
];

export const courseById = (id) => COURSES.find((c) => c.id === id) || null;
export const lessonCount = () => COURSES.reduce((n, c) => n + c.lessons.length, 0);
