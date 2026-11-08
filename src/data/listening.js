// Songs at the record café's listening bar (청음): real recordings, played
// from a file through the headphones (unlike data/tracks.js, which the game
// plays live from notes). Only the listener hears them.
//
// To add a song: put the mp3 (128 kbps is plenty) and a square cover image
// in public/audio/listening/, then add an entry here. Only add songs we have
// the rights to share.
export const LISTEN_TRACKS = [
  {
    id: 'not-that-i-like-you',
    file: 'audio/listening/not-that-i-like-you.mp3',
    cover: 'audio/listening/not-that-i-like-you.webp',
    seconds: 168,
    title: { ko: '좋아하는 건 아닌데', en: "It's Not That I Like You", ja: '好きってわけじゃないけど', zh: '也不是喜欢啦' },
  },
];

export const listenTrackById = (id) => LISTEN_TRACKS.find((tr) => tr.id === id) || null;

// m:ss for a song's length.
export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
