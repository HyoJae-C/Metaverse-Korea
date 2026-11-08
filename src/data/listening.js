// Songs at the record café's listening bar (청음): real recordings, played
// from a file through the headphones (unlike data/tracks.js, which the game
// plays live from notes). Only the listener hears them.
//
// To add a song: put the mp3 (128 kbps is plenty) and a square cover image
// in public/audio/listening/, then add an entry here (lyrics are optional).
// Only add songs we have the rights to share.
export const LISTEN_TRACKS = [
  {
    id: 'not-that-i-like-you',
    file: 'audio/listening/not-that-i-like-you.mp3',
    cover: 'audio/listening/not-that-i-like-you.webp',
    seconds: 168,
    title: { ko: '좋아하는 건 아닌데', en: "It's Not That I Like You", ja: '好きってわけじゃないけど', zh: '也不是喜欢啦' },
  },
  {
    id: 'same-heart',
    file: 'audio/listening/same-heart.mp3',
    cover: 'audio/listening/same-heart.webp',
    seconds: 182,
    title: { ko: '같은 마음일까', en: 'Do You Feel the Same?', ja: '同じ気持ちかな', zh: '你也和我一样吗' },
    // Korean lyrics: [section] lines, blank lines between verses.
    lyrics: `[Verse 1]
어젯밤 네 이름이 뜬 화면에
불 꺼진 방이 잠깐 밝아졌어
답장을 쓰고 지우는 사이
화면에 비친 내가 웃고 있었어

오늘은 집에 가는 길이
평소보다 짧게만 느껴져
네 발걸음에 보폭을 맞추니
익숙한 골목도 처음 같아

[Pre-Chorus]
정류장 불빛 아래
우리 그림자가 겹쳐
소매 끝에 닿은 온기가
손바닥까지 번져 와

[Chorus]
너도 나랑 같은 마음일까
이 밤이 조금 더 길었으면 할까
버스 한 대가 멀어져 가도
네 옆에 조금 더 있고 싶어

너도 나랑 같은 마음일까
가로등 아래 발끝이 멈춰
한 뼘도 안 되는 우리 사이
손끝이 자꾸 너를 향해

[Verse 2 – Melodic Rap]
도착 안내판엔 삼 분 뒤
평소라면 제일 반가울 숫자
오늘은 숫자 하나 줄 때마다
네 옆의 밤이 짧아지는 기분

두 손을 주머니에 넣었다가
네가 가까워질 때 슬쩍 빼
유리창 너머 나란히 선 우리
어깨 사이 틈이 조금씩 줄어

[Chorus]
너도 나랑 같은 마음일까
이 밤이 조금 더 길었으면 할까
버스 한 대가 멀어져 가도
네 옆에 조금 더 있고 싶어

너도 나랑 같은 마음일까
가로등 아래 발끝이 멈춰
한 뼘도 안 되는 우리 사이
손끝이 자꾸 너를 향해

[Bridge]
버스가 모퉁이를 돌아가고
붉은 불빛마저 사라질 때
네 손이 내 손을 찾아와
우리 그림자가 다시 움직여

[Final Chorus]
너도 나랑 같은 마음이네
이 밤이 조금 더 길었으면 했네
버스 한 대가 멀어져 가고
우린 왔던 길을 다시 걸어

너도 나랑 같은 마음이네
맞잡은 손이 조금씩 따뜻해
한 뼘도 안 되는 우리 사이
이제는 바람도 못 지나가

[Outro]
한 정거장만 더
너와 걷고 싶어`,
  },
];

export const listenTrackById = (id) => LISTEN_TRACKS.find((tr) => tr.id === id) || null;

// m:ss for a song's length.
export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
