// Builds the plain-HTML pages that search engines read, so Modu Seoul can
// show up in Google and other search results:
//   public/about/<lang>/index.html  one short "what is this" page per language
//   public/sitemap.xml              every public page, with language alternates
// The game itself is a 3D canvas with almost no text a crawler can index, so
// these pages carry the words people search for ("virtual Seoul", "Seongsu 3D"…).
// Edit the text below, then run: node scripts/build-seo-pages.mjs
// (tests/seo.test.mjs fails if the committed files are out of date.)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://moduseoul.com/';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// path: where the page lives under the site root ('' = /about/).
export const PAGES = [
  {
    lang: 'en', path: 'about/', label: 'English',
    title: 'Modu Seoul (모두서울): walk Seoul in 3D, right in your browser',
    description: 'A free 3D virtual trip to Seoul, Korea. Walk Seongsu-dong, Hongdae and Itaewon with friends, shop in sample stores, visit cafés and practise Korean. No download, on PC and phone.',
    h1: 'Modu Seoul',
    lead: 'A 3D virtual trip to Seoul, Korea, that you play right in your web browser. No download, no install.',
    sections: [
      ['Walk the streets of Seoul', 'Start in Seongsu-dong, the neighbourhood of cafés, pop-up stores and old brick factories, then take the subway or a taxi to Hongdae and Itaewon. The streets are a game map inspired by the real neighbourhoods, with street names in Korean and a Translate button.'],
      ['Shop, eat and play', 'Walk into fashion, beauty and lifestyle stores, try clothes on your character and fill a virtual shopping bag. Sit in cafés, pat the cats at a cat café, order snacks in Korean at a bunsik snack bar, rent a bike and finish daily missions to collect stamps and coins.'],
      ['Travel together', 'See other travellers in real time, wave with emotes and chat with people near you. Make your own character and keep your progress by signing in.'],
      ['Before your real trip', 'Learn how a Korean street looks and sounds, practise simple Korean phrases with romanization and English, and get to know the neighbourhoods you want to visit.'],
    ],
    langsNote: 'The game is available in English, Español, 한국어, 简体中文, 繁體中文, Bahasa Indonesia, Tiếng Việt, हिन्दी, العربية and 日本語. You choose your language on the first screen.',
    devices: 'Works on PC (keyboard) and on phones and tablets (touch).',
    disclaimer: 'All shops, brands and products in the game are fictional samples, not real businesses. Shopping is virtual: no real payment.',
    play: 'Play now',
    otherLangs: 'Other languages',
    legal: ['Privacy', 'Terms'],
  },
  {
    lang: 'ko', path: 'about/ko/', label: '한국어',
    title: '모두서울 (Modu Seoul): 브라우저에서 바로 걷는 3D 서울 여행',
    description: '설치 없이 브라우저에서 바로 즐기는 3D 가상 서울 여행. 친구와 함께 성수동, 홍대, 이태원 거리를 걷고, 가상 매장에서 쇼핑하고, 카페에 들르고, 한국어를 연습해 보세요. PC와 스마트폰 모두 지원.',
    h1: '모두서울 (Modu Seoul)',
    lead: '웹 브라우저에서 바로 즐기는 3D 가상 서울 여행이에요. 다운로드도 설치도 필요 없어요.',
    sections: [
      ['서울 거리를 걸어요', '카페와 팝업스토어, 붉은 벽돌 공장 건물이 있는 성수동에서 시작해 지하철이나 택시로 홍대와 이태원까지 가 볼 수 있어요. 거리는 실제 동네를 참고해 새로 그린 게임 지도이고, 거리 이름은 한국어로 보여 주며 번역 버튼으로 내 언어로 바꿀 수 있어요.'],
      ['쇼핑하고, 먹고, 놀아요', '패션, 뷰티, 라이프스타일 매장에 들어가 캐릭터에게 옷을 입혀 보고 가상 장바구니에 담아요. 카페에 앉아 쉬고, 고양이 카페에서 고양이를 쓰다듬고, 분식집에서 한국어로 주문하고, 자전거를 빌려 타고, 매일 바뀌는 미션으로 스탬프와 코인을 모아요.'],
      ['함께 여행해요', '다른 여행자를 실시간으로 만나고, 이모트로 인사하고, 가까이 있는 사람과 채팅해요. 나만의 캐릭터를 만들고 로그인하면 진행 상황이 저장돼요.'],
      ['실제 여행 전에', '한국 거리의 모습과 분위기를 미리 익히고, 로마자와 영어가 함께 나오는 간단한 한국어 표현을 연습하고, 가 보고 싶은 동네를 미리 둘러봐요.'],
    ],
    langsNote: '게임은 English, Español, 한국어, 简体中文, 繁體中文, Bahasa Indonesia, Tiếng Việt, हिन्दी, العربية, 日本語로 즐길 수 있어요. 첫 화면에서 언어를 고르면 돼요.',
    devices: 'PC(키보드)와 스마트폰, 태블릿(터치)에서 모두 즐길 수 있어요.',
    disclaimer: '게임 속 가게, 브랜드, 상품은 모두 가상의 예시이며 실제 가게와 관계가 없어요. 쇼핑은 가상이라 실제 결제가 없어요.',
    play: '지금 시작하기',
    otherLangs: '다른 언어',
    legal: ['개인정보처리방침', '이용약관'],
  },
  {
    lang: 'ja', path: 'about/ja/', label: '日本語',
    title: 'モドゥ・ソウル：ブラウザでそのまま歩く3Dソウル旅行',
    description: 'インストール不要、ブラウザですぐ遊べる3Dバーチャルソウル旅行。友だちと聖水洞・弘大・梨泰院の街を歩き、サンプルのお店でショッピング、カフェめぐり、韓国語の練習も。PCとスマホに対応。',
    h1: 'モドゥ・ソウル (Modu Seoul)',
    lead: 'ウェブブラウザでそのまま遊べる、3Dのバーチャルソウル旅行です。ダウンロードもインストールも必要ありません。',
    sections: [
      ['ソウルの街を歩こう', 'カフェやポップアップストア、赤レンガの工場が並ぶ聖水洞（ソンスドン）からスタートし、地下鉄やタクシーで弘大（ホンデ）や梨泰院（イテウォン）へ。街は実在のエリアを参考に描いたゲーム用の地図で、通りの名前は韓国語で表示され、翻訳ボタンで自分の言語に切り替えられます。'],
      ['ショッピング・グルメ・遊び', 'ファッション、ビューティー、雑貨のお店に入り、キャラクターに服を試着させて、バーチャルのショッピングバッグに入れられます。カフェでひと休みしたり、猫カフェで猫をなでたり、粉食店で韓国語で注文したり、自転車を借りたり。毎日のミッションでスタンプとコインを集めましょう。'],
      ['みんなで旅しよう', 'ほかの旅行者とリアルタイムで出会い、エモートであいさつし、近くの人とチャットできます。自分だけのキャラクターを作り、ログインすれば進み具合が保存されます。'],
      ['本当の旅行の前に', '韓国の街の雰囲気を先に体験し、ローマ字と英語つきのかんたんな韓国語フレーズを練習して、行ってみたいエリアを下見できます。'],
    ],
    langsNote: 'ゲームは English、Español、한국어、简体中文、繁體中文、Bahasa Indonesia、Tiếng Việt、हिन्दी、العربية、日本語 で遊べます。最初の画面で言語を選んでください。',
    devices: 'PC（キーボード）でも、スマートフォンやタブレット（タッチ）でも遊べます。',
    disclaimer: 'ゲーム内のお店・ブランド・商品はすべて架空のサンプルで、実在の店とは関係ありません。ショッピングはバーチャルで、実際の支払いはありません。',
    play: '今すぐ遊ぶ',
    otherLangs: 'ほかの言語',
    legal: ['プライバシー', '利用規約'],
  },
  {
    lang: 'zh-Hans', path: 'about/zh-hans/', label: '简体中文',
    title: 'Modu Seoul：在浏览器里直接漫步3D首尔',
    description: '无需安装，在浏览器中直接畅游的3D虚拟首尔之旅。和朋友一起漫步圣水洞、弘大和梨泰院，在示例商店购物，逛咖啡馆，练习韩语。支持电脑和手机。',
    h1: 'Modu Seoul（모두서울）',
    lead: '一款在网页浏览器里直接游玩的3D虚拟首尔之旅。无需下载，无需安装。',
    sections: [
      ['漫步首尔街头', '从遍布咖啡馆、快闪店和红砖老工厂的圣水洞出发，再乘地铁或出租车前往弘大和梨泰院。街道是参考真实街区绘制的游戏地图，街名以韩语显示，点击翻译按钮即可切换成你的语言。'],
      ['购物、美食、游玩', '走进时装、美妆和生活方式商店，给角色试穿衣服，放进虚拟购物袋。在咖啡馆坐一坐，在猫咪咖啡馆摸摸猫，在粉食店用韩语点餐，租一辆自行车，完成每日任务收集印章和金币。'],
      ['结伴同游', '实时遇见其他旅行者，用表情动作打招呼，和附近的人聊天。创建专属角色，登录后即可保存进度。'],
      ['真正出发之前', '提前感受韩国街头的样子和氛围，练习附有罗马音和英文的简单韩语，先逛逛你想去的街区。'],
    ],
    langsNote: '游戏支持 English、Español、한국어、简体中文、繁體中文、Bahasa Indonesia、Tiếng Việt、हिन्दी、العربية 和 日本語。在第一个画面选择语言即可。',
    devices: '支持电脑（键盘）以及手机和平板（触控）。',
    disclaimer: '游戏中的商店、品牌和商品均为虚构示例，与真实商家无关。购物为虚拟购物，不会产生真实付款。',
    play: '立即开始',
    otherLangs: '其他语言',
    legal: ['隐私政策', '使用条款'],
  },
  {
    lang: 'zh-Hant', path: 'about/zh-hant/', label: '繁體中文',
    title: 'Modu Seoul：在瀏覽器裡直接漫步3D首爾',
    description: '免安裝，在瀏覽器中直接暢遊的3D虛擬首爾之旅。和朋友一起漫步聖水洞、弘大和梨泰院，在示範商店購物，逛咖啡廳，練習韓語。支援電腦和手機。',
    h1: 'Modu Seoul（모두서울）',
    lead: '一款在網頁瀏覽器裡直接遊玩的3D虛擬首爾之旅。無需下載，無需安裝。',
    sections: [
      ['漫步首爾街頭', '從遍布咖啡廳、快閃店和紅磚老工廠的聖水洞出發，再搭地鐵或計程車前往弘大和梨泰院。街道是參考真實街區繪製的遊戲地圖，街名以韓語顯示，點擊翻譯按鈕即可切換成你的語言。'],
      ['購物、美食、遊玩', '走進時裝、美妝和生活風格商店，幫角色試穿衣服，放進虛擬購物袋。在咖啡廳坐一坐，在貓咪咖啡廳摸摸貓，在粉食店用韓語點餐，租一台腳踏車，完成每日任務收集印章和金幣。'],
      ['結伴同遊', '即時遇見其他旅人，用表情動作打招呼，和附近的人聊天。建立專屬角色，登入後即可保存進度。'],
      ['真正出發之前', '提前感受韓國街頭的樣貌和氛圍，練習附有羅馬拼音和英文的簡單韓語，先逛逛你想去的街區。'],
    ],
    langsNote: '遊戲支援 English、Español、한국어、简体中文、繁體中文、Bahasa Indonesia、Tiếng Việt、हिन्दी、العربية 和 日本語。在第一個畫面選擇語言即可。',
    devices: '支援電腦（鍵盤）以及手機和平板（觸控）。',
    disclaimer: '遊戲中的商店、品牌和商品均為虛構示例，與真實商家無關。購物為虛擬購物，不會產生真實付款。',
    play: '立即開始',
    otherLangs: '其他語言',
    legal: ['隱私權政策', '使用條款'],
  },
  {
    lang: 'es', path: 'about/es/', label: 'Español',
    title: 'Modu Seoul: recorre Seúl en 3D desde tu navegador',
    description: 'Un viaje virtual y gratuito en 3D por Seúl, Corea. Pasea por Seongsu-dong, Hongdae e Itaewon con amigos, compra en tiendas de muestra, visita cafés y practica coreano. Sin descargas, en PC y móvil.',
    h1: 'Modu Seoul',
    lead: 'Un viaje virtual en 3D por Seúl, Corea, que juegas directamente en tu navegador. Sin descargas ni instalación.',
    sections: [
      ['Pasea por las calles de Seúl', 'Empieza en Seongsu-dong, el barrio de cafés, tiendas pop-up y antiguas fábricas de ladrillo, y luego toma el metro o un taxi hasta Hongdae e Itaewon. Las calles son un mapa de juego inspirado en los barrios reales, con los nombres en coreano y un botón para traducirlos.'],
      ['Compra, come y juega', 'Entra en tiendas de moda, belleza y estilo de vida, pruébale ropa a tu personaje y llena una bolsa de compras virtual. Siéntate en cafés, acaricia a los gatos de un café de gatos, pide comida en coreano en un bunsik, alquila una bici y completa misiones diarias para reunir sellos y monedas.'],
      ['Viaja en compañía', 'Ve a otros viajeros en tiempo real, salúdalos con gestos y chatea con quien esté cerca. Crea tu propio personaje y guarda tu progreso iniciando sesión.'],
      ['Antes de tu viaje real', 'Descubre cómo se ve y se siente una calle coreana, practica frases sencillas en coreano con romanización e inglés y conoce los barrios que quieres visitar.'],
    ],
    langsNote: 'El juego está disponible en English, Español, 한국어, 简体中文, 繁體中文, Bahasa Indonesia, Tiếng Việt, हिन्दी, العربية y 日本語. Eliges el idioma en la primera pantalla.',
    devices: 'Funciona en PC (teclado) y en móviles y tabletas (táctil).',
    disclaimer: 'Todas las tiendas, marcas y productos del juego son ejemplos ficticios, no negocios reales. Las compras son virtuales: no hay pagos reales.',
    play: 'Jugar ahora',
    otherLangs: 'Otros idiomas',
    legal: ['Privacidad', 'Términos'],
  },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Relative link from a page at `from` (e.g. 'about/ko/') to `to` (e.g. 'privacy.html').
const rel = (from, to) => '../'.repeat(from.split('/').filter(Boolean).length) + to;

export function aboutPage(p) {
  const alternates = PAGES.map((q) => `<link rel="alternate" hreflang="${q.lang}" href="${SITE}${q.path}" />`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${SITE}${PAGES[0].path}" />`).join('\n');
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Modu Seoul',
    alternateName: ['모두서울', 'モドゥ・ソウル', 'Another Seoul', '어나더서울'],
    url: SITE,
    description: p.description,
    inLanguage: p.lang,
    image: `${SITE}og.png`,
    applicationCategory: 'Game',
    operatingSystem: 'Any (web browser)',
    playMode: ['SinglePlayer', 'MultiPlayer'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  return `<!doctype html>
<html lang="${p.lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}" />
<link rel="canonical" href="${SITE}${p.path}" />
${alternates}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Modu Seoul" />
<meta property="og:title" content="${esc(p.title)}" />
<meta property="og:description" content="${esc(p.description)}" />
<meta property="og:url" content="${SITE}${p.path}" />
<meta property="og:image" content="${SITE}og.png?v=4" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/png" href="${rel(p.path, 'favicon.png')}" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
  :root { --ink: #3d3530; --soft: #7a6e66; --bg: #fffaf2; --card: #ffffff; --accent: #e0604d; }
  @media (prefers-color-scheme: dark) { :root { --ink: #f3ece4; --soft: #b9aea5; --bg: #221e1b; --card: #2d2824; --accent: #ff8a75; } }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 17px/1.65 system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Hiragino Sans", "PingFang SC", sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 30px; margin: 8px 0 4px; }
  h2 { font-size: 20px; margin: 0 0 6px; }
  .lead { font-size: 19px; }
  .hero { width: 100%; height: auto; border-radius: 18px; display: block; margin: 18px 0; }
  .play { display: inline-block; background: var(--accent); color: #fff; text-decoration: none; font-weight: 700; padding: 12px 26px; border-radius: 999px; font-size: 18px; }
  section { background: var(--card); border-radius: 18px; padding: 16px 18px; margin-top: 16px; }
  .soft { color: var(--soft); font-size: 15px; }
  a { color: var(--accent); }
  nav { margin-top: 28px; font-size: 15px; }
</style>
</head>
<body>
<main>
  <h1>${esc(p.h1)}</h1>
  <p class="lead">${esc(p.lead)}</p>
  <p><a class="play" href="${rel(p.path, '')}">▶ ${esc(p.play)}</a></p>
  <img class="hero" src="${rel(p.path, 'og.png')}" width="1200" height="630" alt="Modu Seoul" />
${p.sections.map(([h, t]) => `  <section>\n    <h2>${esc(h)}</h2>\n    <p>${esc(t)}</p>\n  </section>`).join('\n')}
  <p>${esc(p.langsNote)}</p>
  <p>${esc(p.devices)}</p>
  <p class="soft">${esc(p.disclaimer)}</p>
  <p><a class="play" href="${rel(p.path, '')}">▶ ${esc(p.play)}</a></p>
  <nav>
    <b>${esc(p.otherLangs)}:</b>
    ${PAGES.filter((q) => q !== p).map((q) => `<a href="${rel(p.path, q.path)}" hreflang="${q.lang}" lang="${q.lang}">${esc(q.label)}</a>`).join(' · ')}
  </nav>
  <p class="soft">Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="${rel(p.path, 'privacy.html')}">${esc(p.legal[0])}</a> · <a href="${rel(p.path, 'terms.html')}">${esc(p.legal[1])}</a></p>
</main>
</body>
</html>
`;
}

export function sitemap() {
  const alts = PAGES.map((q) => `    <xhtml:link rel="alternate" hreflang="${q.lang}" href="${SITE}${q.path}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${PAGES[0].path}"/>`).join('\n');
  const urls = [
    `  <url>\n    <loc>${SITE}</loc>\n  </url>`,
    ...PAGES.map((p) => `  <url>\n    <loc>${SITE}${p.path}</loc>\n${alts}\n  </url>`),
    `  <url>\n    <loc>${SITE}privacy.html</loc>\n  </url>`,
    `  <url>\n    <loc>${SITE}terms.html</loc>\n  </url>`,
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

export function files() {
  const out = { 'public/sitemap.xml': sitemap() };
  for (const p of PAGES) out[`public/${p.path}index.html`] = aboutPage(p);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [path, text] of Object.entries(files())) {
    mkdirSync(dirname(join(ROOT, path)), { recursive: true });
    writeFileSync(join(ROOT, path), text);
    console.log('wrote', path);
  }
}
