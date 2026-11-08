// The free exhibition application (apply.html): the words in Korean and
// English, and the checks run before sending. The server checks the same
// things again (supabase/026_exhibit_apps.sql).

export const MAX_IMAGES = 10;
export const MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
export const KINDS = ['wall', 'solo', 'space', 'popup'];
export const WHO = ['artist', 'business', 'student', 'other'];
export const CHRISTMAS = ['continue', 'new', 'no'];

export const TEXT = {
  ko: {
    title: '모든 작가님들 주목!',
    lead: '며칠 밤새워서 웹에서 걷는 서울을 만들었어요. 여기 벽이랑 빈 가게, 성수 팝업 자리까지 전부 무료로 드릴게요. 같이 이 도시 채워 주세요.',
    dates: '11/16까지 신청 · 11/21 오픈 · 한 달 전시 · 🎄 12/23~31 크리스마스 특별전',
    play: '어나더서울 먼저 둘러보기',
    name: '이름 또는 활동명', nameHint: '작품 옆에 이렇게 표시돼요',
    email: '연락받을 이메일',
    sns: '인스타그램이나 SNS 계정 (선택)',
    kinds: '어떤 걸 원하세요? (여러 개 골라도 돼요)',
    kind: {
      wall: ['🖼 건물 벽', '홍대·연남·을지로 건물 벽에 크게'],
      solo: ['🎨 갤러리 개인전', '게임 속 갤러리에 작품 최대 8점'],
      space: ['🏠 공간 전시', '빈 가게 하나를 통째로 내 작품 세계로'],
      popup: ['🛍 성수동 팝업스토어', '내 브랜드·굿즈로 가상 팝업'],
    },
    who: '나는',
    whoOpt: { artist: '작가 (그림, 사진, 일러스트 등)', business: '개인사업자 (가게, 브랜드)', student: '학생', other: '기타' },
    intro: '작품이나 브랜드 소개 (2~3줄)',
    images: '이미지 올리기',
    imagesHint: '최대 10장, 한 장에 10MB까지. 가로 1600px 이상이면 더 선명해요.',
    pick: '사진 고르기',
    titles: '작품 제목 (이미지 순서대로, 선택)',
    mood: '공간 전시·팝업이라면 원하는 분위기 (색, 재질, 참고 링크, 선택)',
    christmas: '🎄 크리스마스 특별전(12/23~31)에도 이어서 할까요?',
    xmasOpt: { continue: '네, 이어서 할래요', new: '새 작품으로 바꿔서 할래요', no: '아니요' },
    consent: '보낸 이미지의 저작권은 저에게 있고, 사람이 나오는 사진은 그 사람의 동의를 받았어요. 어나더서울 게임과 홍보에 이 이미지를 쓰는 데 동의해요.',
    note: '요청하시면 언제든 내려 드려요. 선정적이거나 폭력적인 이미지, 다른 브랜드의 로고는 걸지 않아요.',
    send: '신청하기',
    sending: '보내는 중… ({n}/{total})',
    done: '신청 완료! 고마워요 🙌',
    doneBody: '확인하고 이메일로 연락드릴게요. 기다리는 동안 어나더서울을 둘러보고, 주변 작가님들께도 알려 주세요.',
    again: '하나 더 신청하기',
    err: {
      name: '이름을 적어 주세요.', email: '이메일 주소를 확인해 주세요.', kinds: '원하는 걸 하나 이상 골라 주세요.',
      who: '나는 어떤 사람인지 골라 주세요.', intro: '소개를 적어 주세요.', images: '이미지를 한 장 이상 올려 주세요.',
      tooMany: '이미지는 10장까지예요.', tooBig: '10MB가 넘는 이미지가 있어요: {f}', type: '이미지 파일만 올릴 수 있어요: {f}',
      christmas: '크리스마스 특별전 참여 여부를 골라 주세요.', consent: '저작권과 동의 항목에 체크해 주세요.',
      busy: '오늘 신청이 너무 많아요. 내일 다시 시도해 주세요.', send: '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.',
      setup: '신청 받기가 아직 준비 중이에요. 잠시 후 다시 시도해 주세요.',
    },
  },
  en: {
    title: 'Calling all artists!',
    lead: 'I stayed up for days building a Seoul you can walk in your browser. The walls, the empty shops and the Seongsu pop-up spots are all yours, free. Help me fill this city.',
    dates: 'Apply by Nov 16 · Opens Nov 21 · On show for a month · 🎄 Christmas special Dec 23–31',
    play: 'Look around Another Seoul first',
    name: 'Name or artist name', nameHint: 'Shown next to your work',
    email: 'Email to reach you',
    sns: 'Instagram or other social handle (optional)',
    kinds: 'What would you like? (pick any)',
    kind: {
      wall: ['🖼 Building wall', 'Big on a wall in Hongdae, Yeonnam or Euljiro'],
      solo: ['🎨 Solo gallery show', 'Up to 8 works in an in-game gallery'],
      space: ['🏠 Space exhibition', 'A whole empty shop, built around your work'],
      popup: ['🛍 Seongsu pop-up store', 'A virtual pop-up for your brand or goods'],
    },
    who: 'I am',
    whoOpt: { artist: 'An artist (painting, photo, illustration…)', business: 'A small business (shop, brand)', student: 'A student', other: 'Other' },
    intro: 'About your work or brand (2–3 lines)',
    images: 'Upload images',
    imagesHint: 'Up to 10, 10 MB each. 1600 px wide or more looks sharpest.',
    pick: 'Choose images',
    titles: 'Titles, in image order (optional)',
    mood: 'For a space or pop-up: the mood you want (colours, materials, links; optional)',
    christmas: '🎄 Stay on for the Christmas special (Dec 23–31)?',
    xmasOpt: { continue: 'Yes, keep my show', new: 'Yes, with new work', no: 'No' },
    consent: 'I own the rights to these images, and anyone shown in a photo agreed to it. Another Seoul may use them in the game and to promote it.',
    note: 'We take your work down any time you ask. No explicit or violent images, and no other brands\' logos.',
    send: 'Apply',
    sending: 'Sending… ({n}/{total})',
    done: 'Sent! Thank you 🙌',
    doneBody: 'We\'ll check it and email you. Meanwhile, look around Another Seoul and tell your artist friends.',
    again: 'Send another',
    err: {
      name: 'Please write your name.', email: 'Please check your email address.', kinds: 'Pick at least one option.',
      who: 'Tell us who you are.', intro: 'Please write a short introduction.', images: 'Add at least one image.',
      tooMany: 'Up to 10 images.', tooBig: 'This image is over 10 MB: {f}', type: 'Images only: {f}',
      christmas: 'Choose an answer for the Christmas special.', consent: 'Please tick the rights and consent box.',
      busy: 'Too many applications today. Please try again tomorrow.', send: 'Couldn\'t send. Check your connection and press Apply again.',
      setup: 'Applications aren\'t open yet. Please try again a little later.',
    },
  },
};

export const fill = (s, vars = {}) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// Problems with the files picked: [] when fine, else error keys with the file
// name ({ key, f }).
export function checkFiles(files) {
  const out = [];
  if (files.length > MAX_IMAGES) out.push({ key: 'tooMany' });
  for (const f of files) {
    if (!IMAGE_TYPES.includes(f.type) && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name)) out.push({ key: 'type', f: f.name });
    else if (f.size > MAX_BYTES) out.push({ key: 'tooBig', f: f.name });
  }
  return out;
}

// The first problem with the form, as an error key, or null when it can be
// sent. `app` holds the fields, `files` the picked images.
export function firstError(app, files) {
  if (!app.name?.trim()) return 'name';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(app.email?.trim() || '')) return 'email';
  if (!app.kinds?.length || app.kinds.some((k) => !KINDS.includes(k))) return 'kinds';
  if (!WHO.includes(app.who)) return 'who';
  if (!app.intro?.trim()) return 'intro';
  if (!files.length) return 'images';
  const bad = checkFiles(files)[0];
  if (bad) return bad.key;
  if (!CHRISTMAS.includes(app.christmas)) return 'christmas';
  if (!app.consent) return 'consent';
  return null;
}

// Where an image goes in the bucket: apps/<application folder>/<n>.<ext>.
export function uploadPath(folder, i, file) {
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(file.name || '');
  const ext = (m ? m[1] : (file.type || '').split('/')[1] || 'img').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `apps/${folder}/${String(i + 1).padStart(2, '0')}.${ext || 'img'}`;
}
