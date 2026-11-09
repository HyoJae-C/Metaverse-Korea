# Library: free books

Each `.txt` file here is one book on the library shelf. `@kind` picks the
shelf: `lang` (어학), `story` (소설), `poems` (시), `children` (동화) or
`life` (생활). The Learn Korean shelf (한국어) lives in `src/core/books.js`.
Pages can leave out the `---` English part: those books are Korean only. Run
`node scripts/build-library.mjs` after editing; it writes
`public/library/<id>.json` and `src/data/library-shelf.js`.

Only works that are free to use go here:

- Korean works whose author died before 1963. Korean copyright then lasted
  50 years after death, so these works were already public domain when the
  term became 70 years in 2013. The Korean text comes from Korean Wikisource.
- Folk tales with no author, and centuries-old Joseon novels and sijo,
  retold or respaced in our own words.
- Books written new for the game (everyday life, languages).

Every English translation, retelling and new book is written for the game and
released as CC0.

| Book | Works | Author (died) | Source |
| --- | --- | --- | --- |
| oldtales | 혹부리 영감, 금도끼 은도끼, 흥부와 놀부, 토끼의 간, 팥죽 할머니와 호랑이 | folk tales, retold | written new |
| shirt | 만년 샤쓰 (1927) | 방정환 (1931) | ko.wikisource.org/wiki/만년_셔츠 |
| shortest | 제일 짧은 동화 (1930) | 방정환 (1931) | ko.wikisource.org/wiki/제일_짧은_동화 |
| dongbaek | 동백꽃 (1936) | 김유정 (1937) | ko.wikisource.org/wiki/동백꽃 |
| memil | 메밀꽃 필 무렵 (1936) | 이효석 (1942) | ko.wikisource.org/wiki/메밀꽃_필_무렵 |
| unsu | 운수 좋은 날 (1924) | 현진건 (1943) | ko.wikisource.org/wiki/운수_좋은_날 |
| sowol | 진달래꽃, 엄마야 누나야, 산유화, 먼 후일 | 김소월 (1934) | ko.wikisource.org/wiki/진달래꽃_(시집) |
| dongju | 서시, 별 헤는 밤, 해바라기 얼굴, 편지, 눈, 햇비, 빗자루 | 윤동주 (1945) | ko.wikisource.org/wiki/저자:윤동주 |
| springcat | 봄은 고양이로다 / 향수, 호수, 홍시 / 모란이 피기까지는, 돌담에 속삭이는 햇발 / 청포도 | 이장희 (1929), 정지용 (1950), 김영랑 (1950), 이육사 (1944) | Korean Wikisource |
| yongun | 님의 침묵, 알 수 없어요, 나룻배와 행인 | 한용운 (1944) | ko.wikisource.org/wiki/님의_침묵 |

Korean only (no translation):

| Book | Shelf | Works | Author (died) | Source / copyright basis |
| --- | --- | --- | --- | --- |
| bombom | 소설 | 봄봄 (1935) | 김유정 (1937) | ko.wikisource.org/wiki/봄봄, died before 1963 |
| bsagam | 소설 | B사감과 러브레터 (1925) | 현진건 (1943) | ko.wikisource.org/wiki/B사감과_러브레터, died before 1963 |
| gojeon | 소설 | 춘향전, 심청전, 홍길동전 | anonymous / 허균 (1618) | retold new, CC0 |
| dongsi | 시 | 병아리, 오줌싸개 지도, 참새, 조개껍데기, 굴뚝, 반딧불, 무얼 먹고 사나, 겨울, 귀뚜라미와 나와, 기왓장 내외 | 윤동주 (1945) | ko.wikisource.org/wiki/하늘과_바람과_별과_시_(1955년), modern spelling |
| sowol2 | 시 | 못 잊어, 예전엔 미처 몰랐어요, 개여울, 가는 길, 왕십리, 부모, 풀 따기 | 김소월 (1934) | ko.wikisource.org/wiki/진달래꽃_(시집) |
| sijo | 시 | 12 sijo (양사언, 이방원, 정몽주, 황진이, 정철, 이조년, 우탁, 윤선도, 월산대군, 송순, 길재) | 14th–17th c. | centuries old; notes written new, CC0 |
| haedal | 동화 | 해님 달님, 선녀와 나무꾼, 견우와 직녀, 콩쥐 팥쥐, 은혜 갚은 까치 | folk tales | retold new, CC0 |
| funnytales | 동화 | 방귀쟁이 며느리, 호랑이와 곶감, 젊어지는 샘물, 바닷물은 왜 짤까, 도깨비 감투 | folk tales | retold new, CC0 |
| english, japanese, chinese | 어학 | travel English, Japanese, Chinese first steps | Another Seoul | written new, CC0 |
| jachi, homecafe, clean, stretch, plants, money, trash, pyeonuijeom | 생활 | recipes, drinks, cleaning, stretches, plants, money, recycling, convenience-store combos | Another Seoul | written new, CC0 |
| howto, japhak | 생활 | a silly how-to book, true fun facts | Another Seoul | written new, CC0 (wikiHow is not used: its CC BY-NC-SA license forbids commercial use) |

Left out on purpose: 황순원 「소나기」, 주요섭 「사랑손님과 어머니」 and
백석's poems are still under copyright. Works with a strong political or
religious message are not chosen.
