// Songs at the record café's listening bar (청음): real recordings, played
// from a file through the headphones (unlike data/tracks.js, which the game
// plays live from notes). Only the listener hears them.
//
// To add a song: put the mp3 (128 kbps is plenty) and a square cover image
// in public/audio/listening/, then add an entry here (lyrics are optional).
// Only add songs we have the rights to share.
export const LISTEN_TRACKS = [
  {
    id: 'pretend',
    file: 'audio/listening/pretend.mp3',
    cover: 'audio/listening/pretend.webp',
    seconds: 168,
    title: { ko: '아닌 척해봐도', en: 'Even If I Pretend', ja: '違うふりをしても', zh: '就算假装不在乎' },
    lyrics: `너를 좋아하는 것 같진 않은데
왜 자꾸자꾸 네가 떠오르는데
보고 싶은 건지 그냥 궁금한 건지
나도 아직 잘 모르겠는데
네가 특별한 것 같진 않은데
왜 하루 끝엔 네 이름이 남는데
기다리는 건지 그냥 심심한 건지
나도 설명할 수가 없는데
알 듯 말 듯 내 마음도 모르겠고
다가가려 하면 또 아닌 것 같고
멀어지면 괜히 조금 아쉽고
아닌 척해봐도 네 생각은 나고
아직도, 지금도
별일 아닌 순간에 네가 떠오르고
나도 왜 이러는지 잘 모르고
아니라고 해놓고 결국 또
네 연락 하나에 괜히 웃고
답장 늦으면 또 신경 쓰고
좋아하는 건 아니라고
말은 해도 마음은 그대로
너도 가끔 나를 생각하고
나도 가끔 너를 떠올리고
그 정도면 됐다고 말해놓고
왜 오늘도 네 이름을 적고`,
  },
  {
    id: 'same-heart',
    file: 'audio/listening/same-heart.mp3',
    cover: 'audio/listening/same-heart.webp',
    seconds: 182,
    title: { ko: '같은 마음일까', en: 'Do You Feel the Same?', ja: '同じ気持ちかな', zh: '你也和我一样吗' },
    // Korean lyrics, a blank line between verses.
    lyrics: `어젯밤 네 이름이 뜬 화면에
불 꺼진 방이 잠깐 밝아졌어
답장을 쓰고 지우는 사이
화면에 비친 내가 웃고 있었어

오늘은 집에 가는 길이
평소보다 짧게만 느껴져
네 발걸음에 보폭을 맞추니
익숙한 골목도 처음 같아

정류장 불빛 아래
우리 그림자가 겹쳐
소매 끝에 닿은 온기가
손바닥까지 번져 와

너도 나랑 같은 마음일까
이 밤이 조금 더 길었으면 할까
버스 한 대가 멀어져 가도
네 옆에 조금 더 있고 싶어

너도 나랑 같은 마음일까
가로등 아래 발끝이 멈춰
한 뼘도 안 되는 우리 사이
손끝이 자꾸 너를 향해

도착 안내판엔 삼 분 뒤
평소라면 제일 반가울 숫자
오늘은 숫자 하나 줄 때마다
네 옆의 밤이 짧아지는 기분

두 손을 주머니에 넣었다가
네가 가까워질 때 슬쩍 빼
유리창 너머 나란히 선 우리
어깨 사이 틈이 조금씩 줄어

너도 나랑 같은 마음일까
이 밤이 조금 더 길었으면 할까
버스 한 대가 멀어져 가도
네 옆에 조금 더 있고 싶어

너도 나랑 같은 마음일까
가로등 아래 발끝이 멈춰
한 뼘도 안 되는 우리 사이
손끝이 자꾸 너를 향해

버스가 모퉁이를 돌아가고
붉은 불빛마저 사라질 때
네 손이 내 손을 찾아와
우리 그림자가 다시 움직여

너도 나랑 같은 마음이네
이 밤이 조금 더 길었으면 했네
버스 한 대가 멀어져 가고
우린 왔던 길을 다시 걸어

너도 나랑 같은 마음이네
맞잡은 손이 조금씩 따뜻해
한 뼘도 안 되는 우리 사이
이제는 바람도 못 지나가

한 정거장만 더
너와 걷고 싶어`,
  },
  {
    id: 'one-more-lap',
    file: 'audio/listening/one-more-lap.mp3',
    cover: 'audio/listening/one-more-lap.webp',
    seconds: 175,
    title: { ko: '한 바퀴만 더', en: 'Just One More Lap', ja: 'もう一周だけ', zh: '再走一圈' },
    lyrics: `커튼 틈으로 햇살이 들어와
늦은 오후에 운동화를 신어
골목 입구에 서 있는 네 쪽으로
끈도 대충 묶고 뛰어가

햇살이 눈부셔 눈을 찡그리면
넌 내가 웃는 줄 알고 따라 웃어
바람이 앞머리를 다 흩뜨려도
손으로 한 번 쓸고 다시 걸어

우리 한 바퀴만 더
바람 좋은 쪽으로
햇살이 길게 누운
담벼락을 따라서

우리 한 바퀴만 더
발이 닿는 쪽으로
네 걸음에 맞추다
나도 모르게 콧노래

빨래가 펄럭이는 골목
바람이 먼저 모퉁이를 돌아
처음 보는 초록색 대문 앞에
고양이 한 마리 낮잠을 자

얼음이 다 녹은 커피를 들고
어디쯤 왔는지도 잊어버려
네 어깨에 내 어깨가 닿을 때
발걸음이 저절로 느려져

우리 한 바퀴만 더
바람 좋은 쪽으로
햇살이 길게 누운
담벼락을 따라서

우리 한 바퀴만 더
발이 닿는 쪽으로
네 걸음에 맞추다
나도 모르게 콧노래

늘 헤어지던 모퉁이에서
오늘은 네가 먼저 길을 돌아
네 셔츠 끝이 바람에 들뜨고
나는 네 옆으로 가볍게 뛰어

우리 한 바퀴만 더
바람 좋은 쪽으로
해가 낮아질수록
그림자는 길어져

우리 한 바퀴만 더
발이 닿는 쪽으로
내가 흥얼댄 멜로딜
너도 따라 부르네

한 바퀴만 더
바람 좋은 쪽으로`,
  },
];

export const listenTrackById = (id) => LISTEN_TRACKS.find((tr) => tr.id === id) || null;

// m:ss for a song's length.
export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
