// NEON STRIKE: the PC방's team shooter (rules in core/strike.js). You play
// your own character, dressed as you are, seen over the shoulder, on a team
// of up to four against four; empty places are bots. Pick a map, a team size
// and one of four guns. The arena is built in the room's own scene far under
// its floor and the game's camera goes there while you play (like the
// fighting game, game/brawl.js). Loaded the first time you sit at a free PC.
import * as THREE from 'three';
import { createCharacter } from '../core/character.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { TICK, HP, HB, GUNS, GUN_IDS, MAPS, MAP_IDS, BOT_NAMES, MATCH_SECS, createMatch, loadStrike, saveStrike, afterStrike, aimFrom, dirOf, rayWalls, damageOf, shotsToKill, solids } from '../core/strike.js';

const T = {
  title: { en: 'NEON STRIKE', ko: '네온 스트라이크', ja: 'NEON STRIKE', zh: 'NEON STRIKE' },
  tag: { en: 'Team battle · up to 4 vs 4', ko: '팀전 · 최대 4대4', ja: 'チーム戦・最大4対4', zh: '团队战 · 最多4对4' },
  map: { en: 'Map', ko: '맵', ja: 'マップ', zh: '地图' },
  size: { en: 'Team size', ko: '팀 인원', ja: 'チーム人数', zh: '每队人数' },
  gun: { en: 'Gun', ko: '총', ja: '銃', zh: '枪' },
  start: { en: 'Start', ko: '시작', ja: 'スタート', zh: '开始' },
  practice: { en: 'Aim practice', ko: '에임 연습', ja: 'エイム練習', zh: '瞄准练习' },
  close: { en: 'Leave', ko: '나가기', ja: 'やめる', zh: '离开' },
  bots: { en: 'Empty places are played by bots.', ko: '빈자리는 봇이 채워요.', ja: '空いた枠はボットが入ります。', zh: '空位由机器人补上。' },
  how: {
    en: 'First team to the kill target wins, or the team ahead after 5 minutes. You come back 3 s after going down. The body takes the most damage, hands and feet less. Hit the very middle of the head: the battle rifle and the sniper take a player down in one.',
    ko: '먼저 목표 킬에 닿은 팀이 이기고, 5분이 지나면 앞선 팀이 이겨요. 쓰러지면 3초 뒤에 다시 나와요. 몸통이 가장 아프고 손발은 덜 아파요. 머리 정중앙을 맞히면 전투소총과 저격총은 한 방이에요.',
    ja: '先にキル目標に届いたチーム、または5分後にリードしているチームの勝ち。倒れても3秒で復活。胴体が一番ダメージが大きく、手足は少なめ。頭のど真ん中に当てると、バトルライフルとスナイパーは一撃です。',
    zh: '先达到击杀目标的队伍获胜，或5分钟后领先的队伍获胜。倒下3秒后复活。身体伤害最高，手脚较低。命中头部正中央时，战斗步枪和狙击枪一枪击倒。',
  },
  keysPc: {
    en: 'Click to aim with the mouse · WASD move · click shoot · R reload · right-click scope · 1-4 next gun · Tab score · Esc pause',
    ko: '클릭하면 마우스로 조준 · WASD 이동 · 클릭 발사 · R 장전 · 우클릭 스코프 · 1-4 다음 총 · Tab 점수 · Esc 일시정지',
    ja: 'クリックでマウス照準 · WASD 移動 · クリック 射撃 · R リロード · 右クリック スコープ · 1-4 次の銃 · Tab スコア · Esc 一時停止',
    zh: '点击后用鼠标瞄准 · WASD 移动 · 点击 射击 · R 换弹 · 右键 瞄准镜 · 1-4 下一把枪 · Tab 比分 · Esc 暂停',
  },
  keysPhone: {
    en: 'Left thumb: walk · right thumb: drag to aim · 🔥 shoot (drag it to aim too) · 🔄 reload · 🔭 scope',
    ko: '왼손: 이동 · 오른손: 끌어서 조준 · 🔥 발사(누른 채 끌어도 조준) · 🔄 장전 · 🔭 스코프',
    ja: '左手：移動 · 右手：ドラッグで照準 · 🔥 射撃（押したままドラッグでも照準）· 🔄 リロード · 🔭 スコープ',
    zh: '左手：移动 · 右手：拖动瞄准 · 🔥 射击（按住拖动也能瞄准）· 🔄 换弹 · 🔭 瞄准镜',
  },
  clickToPlay: { en: 'Click to aim and shoot', ko: '클릭하면 조준·발사를 시작해요', ja: 'クリックで照準・射撃', zh: '点击开始瞄准射击' },
  paused: { en: 'Paused (the match goes on)', ko: '일시정지 (경기는 계속돼요)', ja: '一時停止（試合は続いています）', zh: '已暂停（比赛仍在进行）' },
  resume: { en: 'Back to the match', ko: '경기로 돌아가기', ja: '試合に戻る', zh: '回到比赛' },
  menu: { en: 'Menu', ko: '메뉴', ja: 'メニュー', zh: '菜单' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一局' },
  blue: { en: 'BLUE', ko: '블루', ja: 'ブルー', zh: '蓝队' },
  red: { en: 'RED', ko: '레드', ja: 'レッド', zh: '红队' },
  win: { en: 'Your team wins!', ko: '우리 팀 승리!', ja: 'チームの勝利！', zh: '我队获胜！' },
  lose: { en: 'The other team wins', ko: '상대 팀 승리', ja: '相手チームの勝利', zh: '对方获胜' },
  draw: { en: 'A draw', ko: '무승부', ja: '引き分け', zh: '平局' },
  killedBy: { en: 'Down by {name}', ko: '{name}에게 쓰러졌어요', ja: '{name}に倒されました', zh: '被{name}击倒' },
  back: { en: 'Back in {n}', ko: '{n}초 뒤 다시 출발', ja: '{n}秒後に復活', zh: '{n}秒后复活' },
  nextGun: { en: 'Gun for next time:', ko: '다음에 들 총:', ja: '次に持つ銃：', zh: '下次用的枪：' },
  you: { en: 'You', ko: '나', ja: 'あなた', zh: '你' },
  head: { en: 'HEADSHOT', ko: '헤드샷', ja: 'ヘッドショット', zh: '爆头' },
  kills: { en: 'K', ko: '킬', ja: 'K', zh: '杀' },
  deaths: { en: 'D', ko: '데스', ja: 'D', zh: '死' },
  target: { en: 'First to {n}', ko: '{n}킬 먼저', ja: '{n}キル先取', zh: '先到{n}杀' },
  record: { en: 'Played {p} · won {w} · best {b} kills', ko: '{p}판 · {w}승 · 최고 {b}킬', ja: '{p}試合 · {w}勝 · 最高{b}キル', zh: '{p}局 · {w}胜 · 最高{b}杀' },
  reload: { en: 'RELOADING', ko: '장전 중', ja: 'リロード中', zh: '换弹中' },
  shots: { en: '{n} to the body', ko: '몸통 {n}발', ja: '胴体{n}発', zh: '身体{n}发' },
  oneHead: { en: 'head middle: 1', ko: '머리 정중앙 1발', ja: '頭の真ん中 1発', zh: '头部正中 1发' },
};
const tt = (k, v) => fmt(L(T[k]), v);

// The guns' faces: made-up names (birds) and a line each.
const GUN = {
  sparrow: { icon: '🐦', name: { en: 'Sparrow SMG', ko: '참새 기관단총', ja: 'スズメ SMG', zh: '麻雀冲锋枪' }, line: { en: 'Fires fast, big magazine, weak bullets.', ko: '빠르게 쏘고 탄창이 크지만 한 발이 약해요.', ja: '連射が速く弾倉も大きいが、一発は弱い。', zh: '射速快、弹匣大，单发伤害低。' }, color: '#3a3f4a' },
  magpie: { icon: '🐧', name: { en: 'Magpie rifle', ko: '까치 돌격소총', ja: 'カササギ ライフル', zh: '喜鹊步枪' }, line: { en: 'Steady speed, big magazine, several hits needed.', ko: '보통 속도, 탄창 많음, 여러 발 맞혀야 해요.', ja: '標準の速さで弾倉は多め。何発も当てる必要あり。', zh: '射速普通、弹匣大，需要多发命中。' }, color: '#4a5a3a' },
  hawk: { icon: '🦅', name: { en: 'Hawk battle rifle', ko: '매 전투소총', ja: 'タカ バトルライフル', zh: '鹰式战斗步枪' }, line: { en: 'Steady speed, medium magazine, hits hard.', ko: '보통 속도, 탄창 중간, 데미지가 세요.', ja: '標準の速さ、弾倉は中くらい、威力が高い。', zh: '射速普通、弹匣中等，伤害高。' }, color: '#6b4a2e' },
  eagle: { icon: '🎯', name: { en: 'Eagle sniper', ko: '독수리 저격총', ja: 'ワシ スナイパー', zh: '雕式狙击枪' }, line: { en: 'One shot at a time, the hardest hit. Scope to aim.', ko: '한 발씩, 데미지 최고. 스코프로 조준해요.', ja: '一発ずつ、威力は最高。スコープで狙う。', zh: '单发射击，伤害最高。用瞄准镜瞄准。' }, color: '#2e3a4a' },
};
const MAP = {
  warehouse: { icon: '🏭', name: { en: 'Factory Warehouse', ko: '공장 창고', ja: '工場倉庫', zh: '工厂仓库' } },
  market: { icon: '🏮', name: { en: 'Night Market Alley', ko: '야시장 골목', ja: '夜市の路地', zh: '夜市小巷' } },
};
// What the bots wear (made up, from the shop's own clothes).
const BOT_LOOKS = [
  { model: 'hoodie-orange', pants: 'denim', hair: 'caramel', skin: 'fair', hairStyle: 'bowl' },
  { model: 'track-blue', pants: 'navy', hair: 'black', skin: 'light', hairStyle: 'pony' },
  { model: 'jacket-black', pants: 'black', hair: 'ash', skin: 'warm', hairStyle: 'wolf' },
  { model: 'cardigan-brown', pants: 'cocoa', hair: 'espresso', skin: 'fair', hairStyle: 'curly' },
  { model: 'hoodie-orange', pants: 'black', hair: 'black', skin: 'tan', hairStyle: 'wolf' },
  { model: 'track-blue', pants: 'denim', hair: 'espresso', skin: 'warm', hairStyle: 'bowl' },
  { model: 'jacket-black', pants: 'navy', hair: 'caramel', skin: 'light', hairStyle: 'pony' },
  { model: 'cardigan-brown', pants: 'denim', hair: 'ash', skin: 'tan', hairStyle: 'curly' },
];
const TEAM = ['#4aa8ff', '#ff5a5a'];

// In the arena (like the fighting game's ring) characters are built taller,
// about three heads instead of two, so the head is not most of the target.
// (core/strike.js HB is measured on this build.)
const BUILD = { head: 0.75, torso: 1.08, arm: 1.3, leg: 1.4, lift: 0.1 };
const STAGE_Y = -160; // under the room, out of its sight
const FOV = 70, SCOPE_FOV = 14;
const CAM_BACK = 2.5; // behind the aim point
const SENS = 0.0024; // mouse: radians a pixel
const TOUCH_SENS = 0.006;

const CSS = `
html.strike-on #hud > *, html.strike-on #labels, html.strike-on .credit { visibility: hidden !important; }
#strike { position: fixed; inset: 0; z-index: 60; pointer-events: none; font: 700 15px system-ui, sans-serif; color: #fff; user-select: none; -webkit-user-select: none; touch-action: none; }
#strike * { box-sizing: border-box; }
#strike.idle .sk-top, #strike.idle .sk-hp, #strike.idle .sk-ammo, #strike.idle .sk-cross, #strike.idle .sk-feed { display: none; }
.sk-catch { position: absolute; inset: 0; pointer-events: auto; cursor: crosshair; }
.sk-top { position: absolute; top: max(8px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; background: rgba(8,10,20,.6); border-radius: 12px; padding: 4px 12px; font: 900 22px system-ui; text-shadow: 0 1px 3px #000; }
.sk-top .b { color: #6cc0ff; } .sk-top .r { color: #ff7a7a; } .sk-top small { font: 700 12px system-ui; opacity: .85; display: block; text-align: center; }
.sk-feed { position: absolute; top: max(52px, calc(env(safe-area-inset-top) + 44px)); right: max(10px, env(safe-area-inset-right)); display: flex; flex-direction: column; gap: 4px; align-items: flex-end; font-size: 13px; }
.sk-feed div { background: rgba(8,10,20,.6); border-radius: 8px; padding: 3px 8px; white-space: nowrap; }
.sk-cross { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
.sk-cross i { position: absolute; background: #fff; box-shadow: 0 0 2px #000; }
.sk-cross .dot { width: 3px; height: 3px; left: -1.5px; top: -1.5px; border-radius: 50%; }
.sk-hit { position: absolute; left: 50%; top: 50%; width: 30px; height: 30px; margin: -15px; opacity: 0; }
.sk-hit::before, .sk-hit::after { content: ''; position: absolute; left: 14px; top: 0; width: 2px; height: 30px; background: currentColor; transform: rotate(45deg); box-shadow: 0 0 2px #000; }
.sk-hit::after { transform: rotate(-45deg); }
.sk-big { position: absolute; left: 0; right: 0; top: 30%; text-align: center; font: 900 clamp(28px, 8vw, 64px) system-ui; font-style: italic; color: #ffe066; -webkit-text-stroke: 1.5px #201030; text-shadow: 0 4px 0 #201030; opacity: 0; transition: opacity .25s; }
.sk-big.show { opacity: 1; transition: none; }
.sk-small { position: absolute; left: 0; right: 0; top: calc(50% + 34px); text-align: center; font: 900 18px system-ui; color: #ffe066; text-shadow: 0 2px 3px #000; opacity: 0; transition: opacity .3s; }
.sk-small.show { opacity: 1; transition: none; }
.sk-hp { position: absolute; left: max(12px, env(safe-area-inset-left)); bottom: max(12px, env(safe-area-inset-bottom)); width: min(38vw, 220px); }
.sk-hp .bar { height: 14px; border-radius: 7px; background: rgba(8,10,20,.7); border: 2px solid #fff; overflow: hidden; }
.sk-hp .bar i { display: block; height: 100%; background: linear-gradient(#8dffb0, #2fcf6a); transform-origin: left; }
.sk-hp .num { font: 900 22px system-ui; text-shadow: 0 1px 3px #000; }
.sk-ammo { position: absolute; right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); text-align: right; text-shadow: 0 1px 3px #000; }
.sk-ammo .n { font: 900 30px system-ui; } .sk-ammo .n small { font-size: 16px; opacity: .8; } .sk-ammo .g { font-size: 13px; opacity: .9; }
.sk-ammo .rl { color: #ffe066; font-size: 13px; }
.sk-hurt { position: absolute; inset: 0; box-shadow: inset 0 0 90px 30px rgba(255,30,30,.75); opacity: 0; }
.sk-scope { position: absolute; inset: 0; display: none; background: radial-gradient(circle at 50% 50%, transparent 0, transparent min(36vh, 36vw), #000 calc(min(36vh, 36vw) + 1px)); }
.sk-scope::before, .sk-scope::after { content: ''; position: absolute; background: rgba(0,0,0,.85); }
.sk-scope::before { left: 50%; top: 0; bottom: 0; width: 1px; } .sk-scope::after { top: 50%; left: 0; right: 0; height: 1px; }
.sk-x { position: absolute; top: max(8px, env(safe-area-inset-top)); right: max(8px, env(safe-area-inset-right)); width: 38px; height: 38px; border-radius: 50%; border: 0; background: rgba(10,10,20,.7); color: #fff; font: 700 18px system-ui; pointer-events: auto; cursor: pointer; }
.sk-hint { position: absolute; left: 0; right: 0; bottom: 64px; text-align: center; font-size: 13px; opacity: .85; text-shadow: 0 1px 3px #000; }
.sk-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(94vw, 460px); max-height: 90vh; overflow: auto; background: rgba(12,14,28,.94); border: 2px solid #5ad1ff; border-radius: 18px; padding: 14px 16px; pointer-events: auto; font-weight: 500; text-align: center; }
.sk-card h3 { margin: 0; font: 900 28px system-ui; font-style: italic; color: #5ad1ff; letter-spacing: 1px; text-shadow: 0 0 12px rgba(90,209,255,.6); }
.sk-card p { margin: 6px 0; font-size: 14px; line-height: 1.4; }
.sk-card .dim { opacity: .8; font-size: 13px; }
.sk-card .big { font-size: 20px; font-weight: 900; }
.sk-card .lab { margin: 10px 0 4px; font-size: 13px; font-weight: 800; opacity: .9; text-align: left; }
.sk-pick { display: grid; gap: 6px; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); }
.sk-card button { border: 2px solid transparent; border-radius: 12px; padding: 10px 8px; font: 800 15px system-ui; cursor: pointer; background: #262a48; color: #fff; min-width: 0; overflow-wrap: anywhere; }
.sk-card button.sel { border-color: #5ad1ff; background: #2f4a7a; }
.sk-card button.go { background: linear-gradient(#7de4ff, #3a8cff); color: #08122a; }
.sk-card .sk-pick button b { display: block; font-size: 22px; }
.sk-card .row { display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.sk-stat { display: grid; grid-template-columns: 88px 1fr 34px; gap: 6px; align-items: center; margin: 3px 0; font-size: 13px; text-align: left; }
.sk-stat i { height: 8px; border-radius: 4px; background: #262a48; overflow: hidden; display: block; } .sk-stat i u { display: block; height: 100%; background: #5ad1ff; }
.sk-board { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
.sk-board td { padding: 3px 4px; text-align: right; } .sk-board td:first-child { text-align: left; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sk-board tr.me td { color: #ffe066; font-weight: 800; }
.sk-board tr.t0 td:first-child { border-left: 4px solid #4aa8ff; padding-left: 6px; } .sk-board tr.t1 td:first-child { border-left: 4px solid #ff5a5a; padding-left: 6px; }
.sk-tab { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92vw, 420px); background: rgba(12,14,28,.9); border-radius: 14px; padding: 10px 14px; display: none; }
.sk-dead { position: absolute; left: 50%; bottom: 18%; transform: translateX(-50%); text-align: center; width: min(94vw, 460px); pointer-events: auto; background: rgba(12,14,28,.82); border-radius: 14px; padding: 10px; display: none; }
.sk-dead .sk-pick button { border: 2px solid transparent; border-radius: 10px; padding: 6px 4px; font: 800 12px system-ui; background: #262a48; color: #fff; cursor: pointer; } .sk-dead .sk-pick button b { display: block; font-size: 20px; }
.sk-dead .sk-pick button.sel { border-color: #5ad1ff; background: #2f4a7a; }
#strike.touch .sk-hp { bottom: auto; top: max(10px, env(safe-area-inset-top)); left: calc(66px + env(safe-area-inset-left)); width: min(26vw, 160px); }
.sk-pad { position: absolute; inset: 0; pointer-events: auto; }
.sk-ring { position: absolute; width: 116px; height: 116px; margin: -58px; border-radius: 50%; border: 3px solid rgba(255,255,255,.5); background: rgba(10,10,20,.25); left: calc(30px + 58px + env(safe-area-inset-left)); bottom: calc(40px + 58px + env(safe-area-inset-bottom)); }
.sk-knob { position: absolute; left: 50%; top: 50%; width: 50px; height: 50px; margin: -25px; border-radius: 50%; background: rgba(255,255,255,.85); }
.sk-btn { position: absolute; border-radius: 50%; border: 3px solid #fff; color: #fff; font: 800 24px system-ui; padding: 0; touch-action: none; background: rgba(40,44,80,.75); }
.sk-btn.on { filter: brightness(1.6); }
.sk-fire { width: 84px; height: 84px; right: calc(26px + env(safe-area-inset-right)); bottom: calc(110px + env(safe-area-inset-bottom)); background: rgba(220,60,60,.8); font-size: 32px; }
.sk-rl { width: 56px; height: 56px; right: calc(124px + env(safe-area-inset-right)); bottom: calc(70px + env(safe-area-inset-bottom)); }
.sk-sc { width: 56px; height: 56px; right: calc(124px + env(safe-area-inset-right)); bottom: calc(140px + env(safe-area-inset-bottom)); }
.sk-tb { width: 44px; height: 44px; left: calc(12px + env(safe-area-inset-left)); top: max(10px, env(safe-area-inset-top)); font-size: 18px; }
`;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const lerp = (a, b, k) => a + (b - a) * k;
const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const nameOf = (p, myName) => (p.nameKey != null ? L(BOT_NAMES[p.nameKey]) : p.id === 'me' ? myName : p.name || '?');

// ── The arena ────────────────────────────────────────────────────────────
function gridTexture(base) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2;
  for (let i = 0; i <= S; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.12)';
  for (let k = 0; k < 40; k++) g.fillRect((k * 97) % S, (k * 61) % S, 6, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function skyTexture([top, glow]) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top); grad.addColorStop(0.6, top); grad.addColorStop(0.85, glow); grad.addColorStop(1, '#05050a');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#0b0b18';
  let x = 0, s = 3;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  while (x < 512) { const w = 14 + rnd() * 30, h = 30 + rnd() * 60; g.fillRect(x, 216 - h, w, 40 + h); x += w + rnd() * 4; }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function glowTexture() {
  const S = 64, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,230,160,.8)'); r.addColorStop(1, 'rgba(255,200,80,0)');
  g.fillStyle = r; g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}
const MAX_TRACERS = 40;
function buildArena(mapId) {
  const m = MAPS[mapId];
  const g = new THREE.Group();
  g.position.y = STAGE_Y;
  const own = [];
  const keep = (...xs) => { own.push(...xs); return xs[0]; };
  // The sky, the floor and every box (one instanced mesh, coloured by the map's palette).
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(120, 24, 12)), keep(new THREE.MeshBasicMaterial({ map: keep(skyTexture(m.sky)), side: THREE.BackSide, depthWrite: false, fog: false })));
  sky.position.y = 10;
  const floorTex = keep(gridTexture(m.floor));
  floorTex.repeat.set(m.size[0] / 4, m.size[1] / 4);
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(m.size[0] + 2, m.size[1] + 2).rotateX(-Math.PI / 2)), keep(new THREE.MeshLambertMaterial({ map: floorTex })));
  const boxes = solids(mapId);
  const inst = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), keep(new THREE.MeshLambertMaterial()), boxes.length);
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  boxes.forEach((b, i) => {
    mtx.makeScale(b[3] - b[0], b[4] - b[1], b[5] - b[2]).setPosition((b[0] + b[3]) / 2, 0, (b[2] + b[5]) / 2);
    inst.setMatrixAt(i, mtx);
    inst.setColorAt(i, col.set(m.palette[m.boxes[i][5]] || m.palette[0]));
  });
  // A neon edge along the top of the tall boxes, so walls read at night.
  const tall = boxes.filter((b) => b[4] > 2);
  const edges = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 0.06, 1)), keep(new THREE.MeshBasicMaterial({ color: mapId === 'market' ? '#ff6ab0' : '#5ad1ff' })), tall.length);
  tall.forEach((b, i) => { edges.setMatrixAt(i, mtx.makeScale(b[3] - b[0] + 0.04, 1, b[5] - b[2] + 0.04).setPosition((b[0] + b[3]) / 2, b[4] + 0.03, (b[2] + b[5]) / 2)); });
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x403848, 1.4);
  const sun = new THREE.DirectionalLight(0xffe0c0, 1.1);
  sun.position.set(12, 30, 8);
  g.add(sky, floor, inst, edges, hemi, sun);
  // Bullet tracers: one line set, each segment fading.
  const pos = new Float32Array(MAX_TRACERS * 6), colors = new Float32Array(MAX_TRACERS * 6);
  const lg = keep(new THREE.BufferGeometry());
  lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  lg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const lines = new THREE.LineSegments(lg, keep(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  lines.frustumCulled = false;
  g.add(lines);
  const glow = keep(glowTexture());
  const sprites = (n, size) => Array.from({ length: n }, () => {
    const mat = keep(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const sp = new THREE.Sprite(mat);
    sp.visible = false; sp.scale.setScalar(size);
    g.add(sp);
    return { sp, t: 1 };
  });
  return {
    g, lines, pos, colors, tracers: Array.from({ length: MAX_TRACERS }, () => ({ t: 1, c: [1, 1, 1] })), next: 0,
    sparks: sprites(12, 0.35), flashes: sprites(8, 0.5),
    dispose() { g.removeFromParent(); inst.dispose(); edges.dispose(); for (const o of own) o.dispose(); },
  };
}
// A gun out of boxes, held along +z (the muzzle at userData.tip).
function makeGun(id) {
  const g = new THREE.Group();
  const own = [];
  const mat = (c) => { const m = new THREE.MeshLambertMaterial({ color: c }); own.push(m); return m; };
  const add = (w, h, d, x, y, z, m) => { const geo = new THREE.BoxGeometry(w, h, d); own.push(geo); const b = new THREE.Mesh(geo, m); b.position.set(x, y, z); g.add(b); };
  const body = mat(GUN[id].color), dark = mat('#15171d'), glow = mat('#5ad1ff');
  const len = { sparrow: 0.42, magpie: 0.58, hawk: 0.68, eagle: 0.9 }[id];
  add(0.07, 0.09, len, 0, 0, len / 2 - 0.1, body); // body
  add(0.03, 0.03, len * 0.35, 0, 0.015, len - 0.1 + len * 0.17, dark); // barrel
  add(0.05, 0.14, 0.06, 0, -0.1, 0.02, dark); // grip
  add(0.05, id === 'eagle' ? 0.08 : 0.16, 0.07, 0, -0.1, 0.17, dark); // magazine
  add(0.075, 0.012, len * 0.6, 0, 0.05, len * 0.3, glow); // a neon stripe
  if (id === 'eagle') add(0.05, 0.05, 0.24, 0, 0.08, 0.2, dark); // the scope
  if (id !== 'sparrow') add(0.06, 0.08, 0.16, 0, -0.01, -0.18, body); // stock
  g.userData.tip = new THREE.Vector3(0, 0.015, len - 0.1 + len * 0.35);
  g.userData.own = own;
  return g;
}
function nameTag(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 56;
  const g = c.getContext('2d');
  g.font = '800 30px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(text, 128, 28, 244);
  g.fillStyle = color; g.fillText(text, 128, 28, 244);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  sp.scale.set(0.9, 0.2, 1);
  sp.renderOrder = 30;
  return sp;
}

// Holding a gun: bone offsets over the standing or walking clip (arm -x
// forward and up, fore -x bends the elbow). The aim's pitch tilts the arms
// and the chest.
const HOLD = { armR: [-1.25, 0.25, 0], foreR: [-0.55, 0, 0], armL: [-1.35, 0.45, 0], foreL: [-0.45, 0, 0], spine: [0, 0, 0], head: [0, 0, 0] };
function holdPose(out, pitch, dead) {
  if (dead) { for (const k in HOLD) out[k] = [0, 0, 0]; return out; }
  for (const k in HOLD) out[k] = HOLD[k].slice();
  out.armR[0] -= pitch * 0.8; out.armL[0] -= pitch * 0.8;
  out.spine[0] = -pitch * 0.25; out.head[0] = -pitch * 0.35;
  return out;
}

// ── The game ─────────────────────────────────────────────────────────────
export function createStrike(game, { practice } = {}) {
  const store = localStorage;
  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  let on = null;
  if (!document.getElementById('strike-css')) { const st = el('style'); st.id = 'strike-css'; st.textContent = CSS; document.head.append(st); }

  // ── Input ──
  const held = new Set();
  const look = { yaw: 0, pitch: 0 };
  const stick = { x: 0, y: 0 };
  let fireHeld = false, scopeHeld = false, scopeToggle = false, reloadAsk = false;
  const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  const locked = () => document.pointerLockElement === game.canvas;
  const onKey = (e) => {
    if (!on) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const down = e.type === 'keydown';
    e.stopPropagation(); // (the game under us must not walk, chat or honk)
    if (e.code === 'Escape') { e.preventDefault(); if (down && !locked()) { if (on.match && on.match.phase !== 'over' && !on.card) pause(); else if (!on.match) close(); } return; }
    if ((e.code === 'Enter' || e.code === 'Space') && on.card) { e.preventDefault(); if (down && !e.repeat) on.card.querySelector('.go')?.click(); return; }
    if (e.code === 'Tab') { e.preventDefault(); on.hud.tab.style.display = down && on.match ? 'block' : 'none'; if (down) fillBoard(on.hud.tab); return; }
    if (e.code === 'KeyR' && down) reloadAsk = true;
    if (down && /^Digit[1-4]$/.test(e.code)) chooseGun(GUN_IDS[+e.code.slice(5) - 1]);
    const k = KEYS[e.code];
    if (!k) return;
    e.preventDefault();
    if (down) held.add(k); else held.delete(k);
  };
  const onMouseMove = (e) => {
    if (!on || !locked()) return;
    const k = on.me?.scoped ? SCOPE_FOV / FOV : 1;
    look.yaw -= e.movementX * SENS * k;
    look.pitch = Math.max(-1.1, Math.min(1.1, look.pitch - e.movementY * SENS * k));
  };
  const onMouse = (e) => {
    if (!on || !locked()) return;
    const down = e.type === 'mousedown';
    if (e.button === 0) fireHeld = down;
    if (e.button === 2) scopeHeld = down;
  };
  const onLock = () => {
    if (!on) return;
    if (!locked()) { fireHeld = scopeHeld = false; held.clear(); if (on.match && on.match.phase !== 'over' && !on.card && !on.wantClose) pause(); }
    else on.hud.hint.textContent = '';
  };
  const lockMouse = () => { if (touch || locked()) return; try { const r = game.canvas.requestPointerLock?.(); r?.catch?.(() => {}); } catch { /* not allowed */ } };
  function readInput() {
    const mz = (held.has('f') ? 1 : 0) - (held.has('b') ? 1 : 0) || stick.y;
    const mx = (held.has('r') ? 1 : 0) - (held.has('l') ? 1 : 0) || stick.x;
    const inp = { mx, mz, yaw: look.yaw, pitch: look.pitch, fire: fireHeld, reload: reloadAsk, scope: scopeHeld || scopeToggle };
    reloadAsk = false;
    return inp;
  }
  function chooseGun(id) {
    if (!on?.match || !GUNS[id]) return;
    on.gun = id;
    on.match.chooseGun('me', id);
    const rec = loadStrike(store); rec.gun = id; saveStrike(store, rec);
    deadPicks();
    if (on.match.phase !== 'warmup' && !on.me.dead) small(L(GUN[id].name) + ' ⟳', 1.2);
  }

  // ── The screen ──
  function buildHud() {
    const root = el('div');
    root.id = 'strike';
    const catcher = el('div', 'sk-catch');
    catcher.onmousedown = (e) => { if (!locked() && on.match && !on.card) { e.preventDefault(); lockMouse(); } };
    catcher.oncontextmenu = (e) => e.preventDefault();
    const top = el('div', 'sk-top'), sb = el('span', 'b', '0'), mid = el('div'), clock = el('div', null, '5:00'), goal = el('small'), sr = el('span', 'r', '0');
    mid.append(clock, goal); top.append(sb, mid, sr);
    const feed = el('div', 'sk-feed');
    const cross = el('div', 'sk-cross'), lines = [0, 1, 2, 3].map(() => el('i'));
    cross.append(el('i', 'dot'), ...lines);
    const hit = el('div', 'sk-hit'), big = el('div', 'sk-big'), smallMsg = el('div', 'sk-small'), hurt = el('div', 'sk-hurt'), scope = el('div', 'sk-scope');
    const hp = el('div', 'sk-hp'), hpNum = el('div', 'num', String(HP)), hpBar = el('div', 'bar'), hpFill = el('i');
    hpBar.append(hpFill); hp.append(hpNum, hpBar);
    const ammo = el('div', 'sk-ammo'), ammoN = el('div', 'n'), ammoG = el('div', 'g'), ammoR = el('div', 'rl');
    ammo.append(ammoR, ammoN, ammoG);
    const tab = el('div', 'sk-tab'), dead = el('div', 'sk-dead'), hint = el('div', 'sk-hint');
    const x = el('button', 'sk-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => close();
    root.append(scope, hurt, catcher, top, feed, cross, hit, big, smallMsg, hp, ammo, hint, dead, tab);
    let pad = null;
    if (touch) { pad = touchPad(root); root.classList.add('touch'); }
    root.append(x);
    root.oncontextmenu = (e) => e.preventDefault();
    document.body.append(root);
    return { root, catcher, sb, sr, clock, goal, feed, cross, lines, hit, big, small: smallMsg, hurt, scope, hpNum, hpFill, ammoN, ammoG, ammoR, tab, dead, hint, pad, x, bigT: 0, smallT: 0, hitT: 0, hurtT: 0, shown: {} };
  }
  function touchPad(root) {
    const pad = el('div', 'sk-pad');
    const ring = el('div', 'sk-ring'), knob = el('div', 'sk-knob');
    ring.append(knob);
    const fire = el('button', 'sk-btn sk-fire', '🔥'), rl = el('button', 'sk-btn sk-rl', '🔄'), sc = el('button', 'sk-btn sk-sc', '🔭'), tb = el('button', 'sk-btn sk-tb', '📋');
    pad.append(ring, fire, rl, sc, tb);
    // Any finger: on the left half it walks (the stick), on the right half it
    // turns the view; the fire button turns the view too while held.
    const fingers = new Map(); // pointerId → { kind, x, y, ox, oy }
    const stickAt = () => { const r = ring.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const moveStick = (f, e) => {
      const dx = e.clientX - f.ox, dy = e.clientY - f.oy, d = Math.hypot(dx, dy), k = d > 46 ? 46 / d : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      stick.x = Math.abs(dx) > 8 ? Math.max(-1, Math.min(1, dx / 46)) : 0;
      stick.y = Math.abs(dy) > 8 ? Math.max(-1, Math.min(1, -dy / 46)) : 0;
    };
    const turn = (f, e) => {
      const k = (on?.me?.scoped ? SCOPE_FOV / FOV : 1) * TOUCH_SENS;
      look.yaw -= (e.clientX - f.x) * k;
      look.pitch = Math.max(-1.1, Math.min(1.1, look.pitch - (e.clientY - f.y) * k));
      f.x = e.clientX; f.y = e.clientY;
    };
    const down = (kind) => (e) => {
      e.preventDefault(); e.stopPropagation();
      const t = e.currentTarget;
      try { t.setPointerCapture(e.pointerId); } catch { /* gone */ }
      const f = { kind, x: e.clientX, y: e.clientY, ox: 0, oy: 0 };
      if (kind === 'pad') f.kind = e.clientX < innerWidth / 2 ? 'stick' : 'look';
      if (f.kind === 'stick') { if ([...fingers.values()].some((q) => q.kind === 'stick')) return; [f.ox, f.oy] = stickAt(); moveStick(f, e); }
      if (f.kind === 'fire') { fireHeld = true; fire.classList.add('on'); }
      fingers.set(e.pointerId, f);
    };
    const move = (e) => { const f = fingers.get(e.pointerId); if (!f) return; if (f.kind === 'stick') moveStick(f, e); else turn(f, e); };
    const up = (e) => {
      const f = fingers.get(e.pointerId);
      if (!f) return;
      fingers.delete(e.pointerId);
      if (f.kind === 'stick') { stick.x = stick.y = 0; knob.style.transform = ''; }
      if (f.kind === 'fire') { fireHeld = false; fire.classList.remove('on'); }
    };
    pad.onpointerdown = down('pad'); fire.onpointerdown = down('fire');
    for (const t of [pad, fire]) { t.onpointermove = move; t.onpointerup = t.onpointercancel = up; }
    rl.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); reloadAsk = true; };
    sc.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); scopeToggle = !scopeToggle; sc.classList.toggle('on', scopeToggle); };
    tb.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); const s = on.hud.tab; s.style.display = s.style.display === 'block' ? 'none' : 'block'; fillBoard(s); };
    root.append(pad);
    return { pad, sc, fingers, release() { fingers.clear(); stick.x = stick.y = 0; knob.style.transform = ''; fireHeld = false; fire.classList.remove('on'); } };
  }
  function big(text, secs = 1.4) { const h = on.hud; h.big.textContent = text; h.big.classList.add('show'); h.bigT = secs; }
  function small(text, secs = 1) { const h = on.hud; h.small.textContent = text; h.small.classList.add('show'); h.smallT = secs; }
  function feed(html) {
    const f = on.hud.feed, d = el('div');
    d.append(...html);
    f.prepend(d);
    while (f.children.length > 5) f.lastChild.remove();
    setTimeout(() => d.remove(), 6000);
  }
  const who = (p) => { const s = el('span', null, nameOf(p, on.myName)); s.style.color = TEAM[p.team]; return s; };
  function card(build) {
    on.card?.remove();
    const c = on.card = el('div', 'sk-card');
    build(c);
    on.hud.root.append(c);
    on.hud.catcher.style.display = 'none';
    if (on.hud.pad) { on.hud.pad.release(); on.hud.pad.pad.style.display = 'none'; }
    if (locked()) { on.wantClose = true; document.exitPointerLock?.(); on.wantClose = false; }
  }
  function uncard() {
    on.card?.remove(); on.card = null;
    on.hud.catcher.style.display = '';
    if (on.hud.pad) on.hud.pad.pad.style.display = '';
  }
  const button = (text, cls, fn) => { const b = el('button', cls, text); b.onclick = fn; return b; };
  function picker(c, label, items, sel, onPick, n = items.length) {
    c.append(el('div', 'lab', label));
    const row = el('div', 'sk-pick');
    row.style.setProperty('--n', n);
    for (const it of items) {
      const b = button(it.text, it.id === sel ? 'sel' : '', () => { for (const q of row.children) q.classList.toggle('sel', q === b); onPick(it.id); });
      if (it.icon) b.prepend(el('b', null, it.icon));
      row.append(b);
    }
    c.append(row);
    return row;
  }
  function gunInfo(box, id) {
    const g = GUNS[id];
    box.replaceChildren(el('p', null, L(GUN[id].line)));
    const maxDmg = GUNS.eagle.body, maxRate = GUNS.sparrow.rate, maxMag = GUNS.sparrow.mag;
    for (const [lab, k, txt] of [['💥', g.body / maxDmg, g.body], ['⚡', g.rate / maxRate, g.rate >= 1 ? g.rate + '/s' : (1 / g.rate).toFixed(1) + 's'], ['🧺', g.mag / maxMag, g.mag], ['⏱', g.reload / 3, g.reload + 's']]) {
      const row = el('div', 'sk-stat'), bar = el('i'), fill = el('u');
      fill.style.width = Math.round(Math.max(0.08, Math.min(1, k)) * 100) + '%';
      bar.append(fill); row.append(el('span', null, lab), bar, el('span', null, String(txt)));
      box.append(row);
    }
    box.append(el('p', 'dim', tt('shots', { n: shotsToKill(id, 'body') }) + (damageOf(id, 'core') >= HP ? ' · ' + tt('oneHead') : '')));
  }
  function menu() {
    const rec = loadStrike(store);
    on.match = null;
    on.hud.root.classList.add('idle');
    on.cfg = { map: rec.map, size: rec.size };
    on.gun = rec.gun;
    if (on.arenaMap !== on.cfg.map) setArena(on.cfg.map);
    lineUpPreview();
    card((c) => {
      c.append(el('h3', null, '🔫 ' + tt('title')), el('p', 'dim', tt('tag')));
      picker(c, tt('map'), MAP_IDS.map((id) => ({ id, icon: MAP[id].icon, text: L(MAP[id].name) })), on.cfg.map, (id) => { on.cfg.map = id; setArena(id); lineUpPreview(); });
      picker(c, tt('size'), [1, 2, 3, 4].map((n) => ({ id: n, text: n + ' vs ' + n })), on.cfg.size, (n) => { on.cfg.size = n; lineUpPreview(); });
      c.append(el('p', 'dim', tt('bots') + ' ' + tt('target', { n: [10, 20, 25, 30][on.cfg.size - 1] })));
      const info = el('div');
      picker(c, tt('gun'), GUN_IDS.map((id) => ({ id, icon: GUN[id].icon, text: L(GUN[id].name) })), on.gun, (id) => { on.gun = id; gunInfo(info, id); lineUpPreview(); }, 4);
      gunInfo(info, on.gun);
      c.append(info);
      const more = el('details');
      more.append(el('summary', 'dim', '❓'), el('p', null, tt('how')), el('p', 'dim', tt(touch ? 'keysPhone' : 'keysPc')));
      c.append(more);
      if (rec.played) c.append(el('p', 'dim', tt('record', { p: rec.played, w: rec.wins, b: rec.best })));
      const row = el('div', 'row');
      row.append(button('🔫 ' + tt('start'), 'go', () => begin()));
      if (practice) row.append(button('🎯 ' + tt('practice'), null, () => { close(); practice(); }));
      row.append(button(tt('close'), null, () => close()));
      c.append(row);
    });
  }
  function pause() {
    card((c) => {
      c.append(el('h3', null, tt('title')), el('p', 'big', tt('paused')));
      fillBoard(c);
      const row = el('div', 'row');
      row.append(button('▶ ' + tt('resume'), 'go', () => { uncard(); lockMouse(); }), button(tt('menu'), null, () => { endMatch(); menu(); }), button(tt('close'), null, () => close()));
      c.append(row);
    });
  }
  function fillBoard(box) {
    const m = on.match;
    box.querySelector('.sk-board')?.remove();
    if (!m) return;
    const tb = el('table', 'sk-board');
    const head = el('tr');
    head.append(el('td', null, ''), el('td', null, tt('kills')), el('td', null, tt('deaths')));
    tb.append(head);
    for (const team of m.board()) for (const p of team) {
      const tr = el('tr', 't' + p.team + (p.id === 'me' ? ' me' : ''));
      tr.append(el('td', null, (p.bot ? '🤖 ' : '') + nameOf(p, on.myName)), el('td', null, String(p.kills)), el('td', null, String(p.deaths)));
      tb.append(tr);
    }
    box.append(tb);
  }

  // ── The players on screen ──
  function setArena(mapId) {
    clearPeople();
    on.arena?.dispose();
    on.arena = buildArena(mapId);
    on.arenaMap = mapId;
    on.scene.add(on.arena.g);
  }
  function person(p) {
    const ch = createCharacter(p.id === 'me' ? game.look : p.look || BOT_LOOKS[(p.nameKey ?? p.slot) % BOT_LOOKS.length]);
    const rig = ch.root.children.find((c) => c.rotation.order === 'YXZ') || ch.root;
    const v = { ch, rig, pose: {}, gun: null, gunId: null, tag: null, mark: null, px: p.x, pz: p.z, yaw: p.yaw, seen: false, seenT: 0, bones: null, fall: 0 };
    ch.setMoves(() => v.pose);
    // A ring in the team's colour under the feet.
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.42, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: TEAM[p.team], transparent: true, opacity: 0.8, depthWrite: false }));
    ring.position.y = 0.02;
    ch.root.add(ring);
    v.mark = ring;
    if (p.id !== 'me') { v.tag = nameTag(nameOf(p, on.myName), TEAM[p.team]); v.tag.position.y = 1.42; ch.root.add(v.tag); }
    on.arena.g.add(ch.root);
    return v;
  }
  function setGun(v, id) {
    if (v.gunId === id) return;
    if (v.gun) { v.gun.removeFromParent(); for (const o of v.gun.userData.own) o.dispose(); }
    v.gun = makeGun(id); v.gunId = id;
    v.gun.position.set(-0.13, 0.65, 0.24); v.gun.scale.setScalar(0.8);
    v.rig.add(v.gun);
  }
  function clearPeople(o = on) {
    for (const v of o?.people?.values() || []) {
      v.ch.setMoves(null); v.ch.root.removeFromParent();
      v.mark.geometry.dispose(); v.mark.material.dispose();
      if (v.tag) { v.tag.material.map.dispose(); v.tag.material.dispose(); }
      if (v.gun) for (const o of v.gun.userData.own) o.dispose();
    }
    if (o) o.people = new Map();
  }
  // The taller build: a smaller head, longer arms and legs (like the ring's).
  function reshape(v) {
    const root = v.ch.root;
    if (!v.bones) {
      const get = (n) => root.getObjectByName(n);
      const b = { head: get('head'), spine: get('spine'), arms: [get('upperarml'), get('upperarmr')], legs: [get('upperlegl'), get('upperlegr')] };
      if (!b.head || !b.legs[0]) return;
      v.bones = b;
    }
    const b = v.bones;
    b.spine?.scale.setScalar(BUILD.torso);
    b.head.scale.multiplyScalar(BUILD.head / BUILD.torso);
    for (const a of b.arms) a?.scale.setScalar(BUILD.arm / BUILD.torso);
    for (const l of b.legs) l?.scale.setScalar(BUILD.leg);
  }
  // At the menu: your team lined up, your gun in hand, the map behind.
  function lineUpPreview() {
    clearPeople();
    const m = createMatch({ map: on.cfg.map, size: on.cfg.size, players: [{ id: 'me', team: 0, gun: on.gun }], seed: 5 });
    on.preview = m;
    for (const p of m.players) {
      if (p.team !== 0) continue;
      const v = person(p);
      on.people.set(p.id, v);
      setGun(v, p.gun);
      if (v.tag) v.tag.visible = false;
    }
    on.camSet = false;
  }
  function begin() {
    const rec = loadStrike(store);
    rec.map = on.cfg.map; rec.size = on.cfg.size; rec.gun = on.gun;
    saveStrike(store, rec);
    uncard();
    clearPeople();
    on.preview = null;
    on.hud.root.classList.remove('idle');
    on.match = createMatch({ map: on.cfg.map, size: on.cfg.size, players: [{ id: 'me', name: on.myName, team: 0, gun: on.gun }], seed: (Math.random() * 1e9) | 0 });
    on.me = on.match.byId('me');
    for (const p of on.match.players) { const v = person(p); on.people.set(p.id, v); setGun(v, p.gun); }
    look.yaw = on.me.yaw; look.pitch = 0;
    on.acc = 0; on.camSet = false; on.over = 0; on.deadShown = false;
    on.hud.goal.textContent = tt('target', { n: on.match.target });
    on.hud.feed.replaceChildren();
    if (!touch) on.hud.hint.textContent = tt('clickToPlay');
    lockMouse();
  }
  function endMatch() { on.match = null; on.me = null; clearPeople(); on.hud.dead.style.display = 'none'; on.hud.tab.style.display = 'none'; }
  function result() {
    const m = on.match, won = m.winner === 0, rec = afterStrike(store, { won, kills: on.me.kills });
    if (won) game.me?.play?.('cheer');
    card((c) => {
      c.append(el('h3', null, tt('title')));
      c.append(el('p', 'big', m.winner === -1 ? tt('draw') : won ? '🏆 ' + tt('win') : tt('lose')));
      c.append(el('p', 'big', `${tt('blue')} ${m.score[0]} : ${m.score[1]} ${tt('red')}`));
      fillBoard(c);
      c.append(el('p', 'dim', tt('record', { p: rec.played, w: rec.wins, b: rec.best })));
      const row = el('div', 'row');
      row.append(button('🔫 ' + tt('again'), 'go', () => { endMatch(); begin(); }), button(tt('menu'), null, () => { endMatch(); menu(); }), button(tt('close'), null, () => close()));
      c.append(row);
    });
  }
  function deadPicks() {
    const d = on.hud.dead;
    if (d.style.display !== 'block') return;
    for (const b of d.querySelectorAll('.sk-pick button')) b.classList.toggle('sel', b.dataset.id === on.gun);
  }
  function showDead(killer) {
    const d = on.hud.dead;
    d.replaceChildren();
    const msg = el('p', 'big', tt('killedBy', { name: killer ? nameOf(killer, on.myName) : '?' }));
    if (killer) msg.style.color = TEAM[killer.team];
    on.hud.backIn = el('p', 'dim');
    d.append(msg, on.hud.backIn, el('p', 'dim', tt('nextGun')));
    const row = el('div', 'sk-pick');
    row.style.setProperty('--n', 4);
    for (const id of GUN_IDS) { const b = button(L(GUN[id].name), id === on.gun ? 'sel' : '', () => chooseGun(id)); b.dataset.id = id; b.prepend(el('b', null, GUN[id].icon)); row.append(b); }
    d.append(row);
    d.style.display = 'block';
  }

  // ── Effects ──
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function tracer(from, to, color) {
    const a = on.arena, i = a.next++ % MAX_TRACERS, tr = a.tracers[i];
    tr.t = 0; tr.c = color;
    a.pos.set([from[0], from[1], from[2], to[0], to[1], to[2]], i * 6);
    a.lines.geometry.attributes.position.needsUpdate = true;
  }
  function puff(list, x, y, z, size) {
    const s = list.reduce((a, b) => (b.t > a.t ? b : a));
    s.t = 0; s.size = size; s.sp.position.set(x, y, z); s.sp.visible = true;
  }
  function gunSound(gun, near) {
    const { sfx } = game, g = GUNS[gun];
    if (!sfx || near < 0.04) return;
    sfx.tock(0.55 * near, g.sound);
    sfx._hiss?.(0, gun === 'eagle' ? 0.22 : 0.07, 0.07 * near, 2600, 500);
  }
  function muzzle(v) {
    if (!v?.gun) return null;
    v.gun.updateWorldMatrix(true, false);
    return v.gun.localToWorld(tmp.copy(v.gun.userData.tip)).sub(on.arena.g.position);
  }
  function onEvents(ev) {
    const m = on.match, me = on.me;
    for (const e of ev) {
      if (e.k === 'go') { big('GO!', 0.9); game.sfx?.tock(0.9, 900); }
      else if (e.k === 'shot') {
        const p = m.byId(e.by), v = on.people.get(e.by);
        const from = muzzle(v);
        const f = from ? [from.x, from.y, from.z] : e.from;
        tracer(f, e.to, p.team ? [1, 0.45, 0.4] : [0.5, 0.8, 1]);
        puff(on.arena.flashes, f[0], f[1], f[2], e.gun === 'eagle' ? 0.7 : 0.45);
        if (e.wall) puff(on.arena.sparks, e.to[0], e.to[1], e.to[2], 0.3);
        const dist = Math.hypot(p.x - me.x, p.z - me.z);
        gunSound(e.gun, e.by === 'me' ? 1 : Math.max(0, 1 - dist / 40) * 0.6);
        if (e.by === 'me') on.kick = Math.min(0.06, on.kick + (e.gun === 'eagle' ? 0.05 : 0.012));
      } else if (e.k === 'hit') {
        if (e.by === 'me') {
          const h = on.hud;
          h.hit.style.color = e.zone === 'core' ? '#ff4040' : e.zone === 'limb' ? '#cfd8e8' : '#ffffff';
          h.hit.style.opacity = '1'; h.hitT = 0.2;
          game.sfx?.tock(0.35, e.zone === 'core' ? 2200 : 1700);
        }
        if (e.to === 'me') {
          on.hud.hurtT = 0.5;
          const p = m.byId(e.by);
          on.hurtFrom = p ? Math.atan2(p.x - me.x, p.z - me.z) : null;
        }
      } else if (e.k === 'kill') {
        const by = m.byId(e.by), to = m.byId(e.to);
        const zone = e.zone === 'core' ? ' 🎯' : '';
        feed([who(by), document.createTextNode(` ${GUN[e.gun].icon}${zone} `), who(to)]);
        if (e.by === 'me') { if (e.zone === 'core') big(tt('head'), 1); else small('+1', 0.8); game.sfx?.tock(0.6, 600); }
        if (e.to === 'me') { showDead(by); on.hud.tab.style.display = 'none'; }
        const v = on.people.get(e.to);
        if (v) v.fall = 0.001;
      } else if (e.k === 'spawn') {
        const v = on.people.get(e.id), p = m.byId(e.id);
        if (v) { v.fall = 0; v.px = p.x; v.pz = p.z; v.yaw = p.yaw; setGun(v, p.gun); }
        if (e.id === 'me') { on.hud.dead.style.display = 'none'; look.yaw = p.yaw; look.pitch = 0; scopeToggle = false; on.hud.pad?.sc.classList.remove('on'); }
      } else if (e.k === 'reload' && e.id === 'me') game.sfx?.tock(0.3, 300);
      else if (e.k === 'loaded' && e.id === 'me') game.sfx?.tock(0.35, 520);
      else if (e.k === 'over') { on.over = 2.2; big(m.winner === -1 ? tt('draw') : m.winner === 0 ? tt('win') : tt('lose'), 2.2); on.hud.dead.style.display = 'none'; }
    }
  }

  // ── Each frame ──
  function frame(dt) {
    on.time += dt;
    const m = on.match;
    if (m) {
      on.acc = Math.min(on.acc + dt, 0.25);
      while (on.acc >= TICK && on.match === m) {
        on.acc -= TICK;
        for (const p of m.players) { const v = on.people.get(p.id); if (v) { v.lx = p.x; v.lz = p.z; v.lyaw = p.yaw; } }
        onEvents(m.step(m.phase === 'over' || on.card ? { me: { yaw: look.yaw, pitch: look.pitch } } : { me: readInput() }));
      }
      if (on.match !== m) return;
      if (m.phase === 'over' && on.over > 0 && (on.over -= dt) <= 0) { result(); }
      const k = on.acc / TICK;
      // Who can I see? (enemy names only show then)
      for (const p of m.players) {
        const v = on.people.get(p.id);
        if (!v) continue;
        if (p.id === 'me') { v.px = p.x; v.pz = p.z; v.yaw = look.yaw; }
        else { v.px = lerp(v.lx ?? p.x, p.x, k); v.pz = lerp(v.lz ?? p.z, p.z, k); v.yaw = lerpAngle(v.lyaw ?? p.yaw, p.yaw, k); }
        if (v.tag) {
          if (p.team === 0) v.tag.visible = !p.dead;
          else {
            if ((v.seenT -= dt) <= 0) {
              v.seenT = 0.25;
              const o = aimFrom(on.me), tx = p.x - o[0], ty = HB.head.y - o[1], tz = p.z - o[2], len = Math.hypot(tx, ty, tz);
              v.seen = !p.dead && len < 30 && rayWalls(m.map, o, [tx / len, ty / len, tz / len], len) >= len - 0.3;
            }
            v.tag.visible = v.seen;
          }
        }
        place(v, p, dt);
      }
      hud(dt);
    } else if (on.preview) {
      // You in front, the rest of your team in a row behind.
      on.preview.players.filter((p) => p.team === 0).forEach((p, i, all) => {
        const v = on.people.get(p.id);
        p.x = i ? -16.6 : -15.2; p.z = i ? (i - all.length / 2) * 1.2 : 0; p.yaw = Math.PI / 2 + (globalThis.__strikeYaw ?? 0.45); p.pitch = 0; p.protect = 0;
        if (p.id === 'me' && v.gunId !== on.gun) { p.gun = on.gun; setGun(v, on.gun); }
        v.px = p.x; v.pz = p.z; v.yaw = p.yaw;
        place(v, p, dt);
      });
    }
    // Effects fade.
    const a = on.arena;
    let dirty = false;
    a.tracers.forEach((tr, i) => {
      if (tr.t >= 1) return;
      tr.t = Math.min(1, tr.t + dt / 0.12);
      const f = 1 - tr.t;
      a.colors.set([tr.c[0] * f, tr.c[1] * f, tr.c[2] * f, tr.c[0] * f * 0.3, tr.c[1] * f * 0.3, tr.c[2] * f * 0.3], i * 6);
      dirty = true;
    });
    if (dirty) a.lines.geometry.attributes.color.needsUpdate = true;
    for (const list of [a.sparks, a.flashes]) for (const s of list) {
      if (!s.sp.visible) continue;
      s.t += dt / 0.08;
      if (s.t >= 1) { s.sp.visible = false; continue; }
      s.sp.scale.setScalar(s.size * (1 - s.t * 0.5));
      s.sp.material.opacity = 1 - s.t;
    }
  }
  function place(v, p, dt) {
    const root = v.ch.root;
    root.position.set(v.px, 0, v.pz);
    root.rotation.y = v.yaw;
    const speed = p.dead ? 0 : Math.min(1, Math.hypot(p.vx || 0, p.vz || 0) / 4.5);
    holdPose(v.pose, p.id === 'me' ? look.pitch : p.pitch, p.dead);
    if (p.dead) v.fall = Math.min(1, v.fall + dt * 3);
    v.rig.rotation.x = -1.45 * v.fall;
    v.rig.position.y = BUILD.lift * (1 - v.fall) + 0.12 * v.fall;
    if (v.gun) { v.gun.visible = !p.dead; v.gun.rotation.x = -(p.id === 'me' ? look.pitch : p.pitch) * 0.9; }
    v.mark.visible = !p.dead;
    // Blink while protected after coming back.
    root.visible = !(p.protect > 0 && Math.floor(on.time * 10) % 2 === 0) && !(p.dead && v.fall >= 1 && p.respawn < 1.2);
    v.ch.animate(dt, speed, false);
    reshape(v);
  }
  function hud(dt) {
    const h = on.hud, m = on.match, me = on.me, g = GUNS[me.gun];
    const set = (k, el, val) => { if (h.shown[k] !== val) { h.shown[k] = val; el.textContent = val; } };
    set('sb', h.sb, String(m.score[0])); set('sr', h.sr, String(m.score[1]));
    const left = m.phase === 'warmup' ? MATCH_SECS : Math.ceil(m.left);
    set('clock', h.clock, Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'));
    if (m.phase === 'warmup') { const n = String(Math.ceil(3 - m.t)); if (h.shown.count !== n) { h.shown.count = n; big(n, 0.9); game.sfx?.tock(0.5, 500); } }
    set('hp', h.hpNum, String(Math.max(0, me.hp)));
    if (h.shown.hpk !== me.hp) { h.shown.hpk = me.hp; h.hpFill.style.transform = `scaleX(${Math.max(0, me.hp) / HP})`; }
    set('ammo', h.ammoN, `${me.ammo} / ${g.mag}`);
    set('gun', h.ammoG, GUN[me.gun].icon + ' ' + L(GUN[me.gun].name));
    set('rl', h.ammoR, me.reload > 0 ? tt('reload') + ' ' + me.reload.toFixed(1) : '');
    // The cross opens with the spread.
    const moving = Math.hypot(me.vx, me.vz) > 0.5;
    const spread = g.scope && me.scoped ? 0 : g.spread[moving ? 1 : 0];
    const px = 6 + spread * (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    if (h.shown.spread !== Math.round(px)) {
      h.shown.spread = Math.round(px);
      const [a, b, c, d] = h.lines, L2 = 8;
      Object.assign(a.style, { left: '-1px', top: -(px + L2) + 'px', width: '2px', height: L2 + 'px' });
      Object.assign(b.style, { left: '-1px', top: px + 'px', width: '2px', height: L2 + 'px' });
      Object.assign(c.style, { top: '-1px', left: -(px + L2) + 'px', height: '2px', width: L2 + 'px' });
      Object.assign(d.style, { top: '-1px', left: px + 'px', height: '2px', width: L2 + 'px' });
    }
    h.scope.style.display = me.scoped && !me.dead ? 'block' : 'none';
    h.cross.style.display = me.dead || me.scoped ? 'none' : '';
    if (on.hud.pad) on.hud.pad.sc.style.display = g.scope ? '' : 'none';
    if (me.dead && h.backIn) h.backIn.textContent = m.phase === 'play' ? tt('back', { n: Math.max(0, Math.ceil(me.respawn)) }) : '';
    if (h.hitT > 0 && (h.hitT -= dt) <= 0) h.hit.style.opacity = '0';
    h.hurt.style.opacity = h.hurtT > 0 ? String(Math.min(1, (h.hurtT -= dt) * 2)) : '0';
    if (h.bigT > 0 && (h.bigT -= dt) <= 0) h.big.classList.remove('show');
    if (h.smallT > 0 && (h.smallT -= dt) <= 0) h.small.classList.remove('show');
    if (h.tab.style.display === 'block' && (on.tabT = (on.tabT || 0) - dt) <= 0) { on.tabT = 0.5; fillBoard(h.tab); }
  }

  const camAt = new THREE.Vector3(), camTo = new THREE.Vector3();
  function camera(dt) {
    const cam = game.camera;
    let fov = FOV;
    if (on.match && on.me) {
      const me = on.me, v = on.people.get('me');
      const p = { x: v?.px ?? me.x, z: v?.pz ?? me.z, yaw: look.yaw };
      const o = aimFrom(p);
      on.kick = Math.max(0, (on.kick || 0) - dt * 0.4);
      const pitch = look.pitch + on.kick, d = dirOf(look.yaw, pitch);
      if (me.scoped && !me.dead) {
        fov = SCOPE_FOV;
        camAt.set(o[0] + d[0] * 0.3, o[1] + d[1] * 0.3, o[2] + d[2] * 0.3);
      } else {
        // Behind the aim point, pulled in where a wall is in the way.
        const back = [-d[0], -d[1], -d[2]];
        let dist = CAM_BACK;
        if (me.dead) dist = 4.5;
        const wall = rayWalls(on.match.map, o, back, dist + 0.3) - 0.3;
        dist = Math.max(0.4, Math.min(dist, wall));
        camAt.set(o[0] + back[0] * dist, Math.max(0.3, o[1] + back[1] * dist), o[2] + back[2] * dist);
      }
      camTo.set(o[0] + d[0] * 40, o[1] + d[1] * 40, o[2] + d[2] * 40);
      if (v) v.ch.root.visible = v.ch.root.visible && !(me.scoped && !me.dead);
    } else {
      // At the menu: looking at your team from the front.
      // (on a wide screen the team stands to the left of the menu card)
      const wide = innerWidth > innerHeight * 1.2;
      camAt.set(-11.6, 1.2, wide ? -1.2 : 1.2);
      camTo.set(-15.6, 0.7, wide ? -2.4 : 0);
    }
    const dbg = globalThis.__strikeCam; // (tests: look from anywhere) [x, y, z, at x, y, z]
    if (dbg) { camAt.set(dbg[0], dbg[1], dbg[2]); camTo.set(dbg[3], dbg[4], dbg[5]); }
    if (Math.abs(cam.fov - fov) > 0.01 || cam.view) { cam.clearViewOffset(); cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.position.set(camAt.x, camAt.y + STAGE_Y, camAt.z);
    cam.lookAt(camTo.x, camTo.y + STAGE_Y, camTo.z);
  }

  function close() {
    if (!on) return;
    const o = on;
    o.wantClose = true;
    if (locked()) document.exitPointerLock?.();
    on = null;
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true);
    removeEventListener('mousemove', onMouseMove, true); removeEventListener('mousedown', onMouse, true); removeEventListener('mouseup', onMouse, true);
    document.removeEventListener('pointerlockchange', onLock);
    held.clear(); fireHeld = scopeHeld = scopeToggle = false; stick.x = stick.y = 0;
    clearPeople(o);
    o.arena?.dispose();
    o.hud.root.remove();
    document.documentElement.classList.remove('strike-on');
    const cam = game.camera;
    cam.fov = o.fov; cam.updateProjectionMatrix();
  }

  return {
    get open() { return !!on; },
    get active() { return !!on; },
    close,
    show() {
      if (on || !game.interior || !game.activeScene) return;
      on = { interior: game.interior, scene: game.activeScene, fov: game.camera.fov, time: 0, acc: 0, match: null, me: null, people: new Map(), arena: null, arenaMap: null, card: null, cfg: null, gun: 'magpie', kick: 0, myName: game.nickname || L(T.you), preview: null };
      on.hud = buildHud();
      document.documentElement.classList.add('strike-on');
      addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
      addEventListener('mousemove', onMouseMove, true); addEventListener('mousedown', onMouse, true); addEventListener('mouseup', onMouse, true);
      document.addEventListener('pointerlockchange', onLock);
      menu();
    },
    // Each frame, after the game's own camera (game/arcade.js).
    update(dt) {
      if (!on) return;
      if (game.interior !== on.interior) { close(); return; }
      frame(dt);
      if (on) camera(dt);
    },
    // For tests.
    get match() { return on?.match || null; },
    start() { if (on) begin(); },
    aim(yaw, pitch) { look.yaw = yaw; look.pitch = pitch; },
    trigger(down) { fireHeld = !!down; },
    // Bone positions of your own character, to measure the hit boxes (core/strike.js HB).
    measure() {
      const v = on?.people?.get('me');
      if (!v?.bones) return null;
      const out = {};
      v.ch.root.updateWorldMatrix(true, true);
      const inv = new THREE.Matrix4().copy(v.ch.root.matrixWorld).invert();
      for (const n of ['head', 'spine', 'hips', 'upperarml', 'upperarmr', 'lowerarml', 'lowerarmr', 'handl', 'handr', 'upperlegl', 'lowerlegl', 'footl', 'footr']) {
        const b = v.ch.root.getObjectByName(n);
        if (b) { b.getWorldPosition(tmp2).applyMatrix4(inv); out[n] = [tmp2.x, tmp2.y, tmp2.z].map((x) => +x.toFixed(3)); }
      }
      // The skinned body in 5 cm slices: [min x, max x, min z, max z].
      const bins = {};
      v.ch.root.traverse((mesh) => {
        if (!mesh.isSkinnedMesh || !mesh.visible) return;
        for (let i = 0, n = mesh.geometry.attributes.position.count; i < n; i++) {
          mesh.getVertexPosition(i, tmp2); mesh.localToWorld(tmp2); tmp2.applyMatrix4(inv);
          const k = (Math.floor(tmp2.y * 20) / 20).toFixed(2), b = bins[k] || (bins[k] = [9, -9, 9, -9]);
          b[0] = Math.min(b[0], +tmp2.x.toFixed(2)); b[1] = Math.max(b[1], +tmp2.x.toFixed(2)); b[2] = Math.min(b[2], +tmp2.z.toFixed(2)); b[3] = Math.max(b[3], +tmp2.z.toFixed(2));
        }
      });
      out.bins = bins;
      return out;
    },
  };
}
