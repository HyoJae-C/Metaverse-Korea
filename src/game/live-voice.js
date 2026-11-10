// The live café's voice (downloaded on the first visit; see game/live-stage.js).
//
// One singer at a time. The singer's mic goes straight to each listener's
// browser (WebRTC, one connection per listener; the room is at most a dozen
// people, see net/area.js CROWD_CAP). The connection is set up with a few
// small 'lv:' messages on the room's channel (core/live-rules.js), so the
// voice is only ever sent to people inside this café, and stops the moment
// either side walks out. Nothing is recorded or stored.
//
// Singer: mic on/off (step off the stage and it turns off), mute.
// Listener: mute for me, volume, block or report the singer (the chat's
// person menu). A blocked singer is never heard.
import { t } from '../core/i18n.js';
import { config } from '../config.js';
import { canPerform, clock, lineOrder, liveMsg, nextUp, NEXT_GRACE_MS, offStage, parseLive, relayList, SLOT_MS, stageWinner, timeUp } from '../core/live-rules.js';

const ICE_WAIT_MS = 2500; // gathering ICE candidates: send what we have by then
const BITRATE = 48000; // Opus at 48 kbps: clear singing, ~0.6 Mbps up for 12 listeners
const HI_AFTER_MS = 2500; // walked in and nobody sent us a voice yet: ask once more

const supported = () => typeof RTCPeerConnection === 'function' && !!navigator.mediaDevices?.getUserMedia;

// The backup relay (TURN) for players whose routers block direct
// connections: short-lived credentials from our server (Supabase function
// turn-credentials), asked once per visit and kept for 50 minutes. If the
// server has no relay set up, or can't be reached, we go direct as before.
const RELAY_KEEP_MS = 50 * 60 * 1000;
let relay = { list: [], at: 0, asking: null };
function fetchRelay(cloud) {
  if (Date.now() - relay.at < RELAY_KEEP_MS) return Promise.resolve(relay.list);
  if (relay.asking) return relay.asking;
  const { url, key } = config.net;
  if (config.netProvider !== 'supabase' || !url) return Promise.resolve([]);
  relay.asking = (async () => {
    try {
      const token = await cloud?.accessToken?.();
      const res = await fetch(url.replace(/\/$/, '') + '/functions/v1/turn-credentials', {
        method: 'POST',
        headers: { apikey: key, Authorization: 'Bearer ' + (token || key) },
        signal: AbortSignal.timeout?.(4000),
      });
      relay.list = res.ok ? relayList(await res.json()) : [];
    } catch { relay.list = []; }
    relay.at = Date.now();
    relay.asking = null;
    return relay.list;
  })();
  return relay.asking;
}

function iceDone(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const check = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', check); resolve(); } };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(resolve, ICE_WAIT_MS);
  });
}

export function createLiveVoice(game) {
  const send = (m) => game.net?.sendEmote(liveMsg(m));
  const nameOf = (id) => game.others?.nameOf(id) || '?';
  const blocked = (id) => game.safety.isBlocked(id, game.others?.nameOf(id));
  // Direct first (STUN); the relay is only used when direct doesn't work.
  const newPc = () => new RTCPeerConnection({ iceServers: [...config.voiceIceServers, ...relay.list] });

  let active = false; // inside the café
  // Singing:
  let mic = null; // our MediaStream
  let since = 0;
  let muted = false;
  let spot = null;
  const outs = new Map(); // listener id → RTCPeerConnection
  // Listening:
  let stage = null; // { id, since, muted } who is singing now
  let inPc = null;
  let audio = null;
  let hearOff = false;
  let volume = 1;
  let needTap = false; // the browser wouldn't play sound before a tap
  let hiTimer = null;
  let music = null; // { wasOn } while a song is on: the café's music pauses
  // Taking turns (core/live-rules.js): who is waiting, and when the stage freed up.
  const line = new Map(); // id → when they joined the line
  let freeAt = 0;
  let turnTimer = null;
  const lineList = () => lineOrder([...line].map(([id, at]) => ({ id, at })));
  const myPlace = () => lineList().findIndex((q) => q.id === game.myId) + 1; // 0: not in line
  let timerEl = null;

  // ---------- the panel ----------
  const panel = document.createElement('div');
  panel.className = 'live-panel';
  panel.hidden = true;
  document.body.append(panel);
  const btn = (text, run, cls = '') => {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = text;
    b.onclick = run;
    return b;
  };
  function render() {
    panel.replaceChildren();
    timerEl = null;
    const text = document.createElement('p');
    if (mic) {
      text.textContent = (muted ? '🔇 ' : '🎤 ') + t('live.onAir');
      timerEl = document.createElement('p');
      timerEl.className = 'fine';
      panel.append(text, timerEl, btn(muted ? t('live.unmute') : t('live.mute'), () => setMuted(!muted), 'primary'), btn(t('live.stop'), () => stop()));
    } else if (stage) {
      text.textContent = '🎶 ' + t('live.performing', { name: nameOf(stage.id) }) + (stage.muted ? ' ' + t('live.muted') : '');
      panel.append(text);
      if (needTap) panel.append(btn('🔊 ' + t('live.tapToHear'), () => { needTap = false; audio?.play().catch(() => {}); render(); }, 'primary'));
      panel.append(btn(hearOff ? t('live.hearOn') : t('live.hearOff'), () => { hearOff = !hearOff; if (audio) audio.muted = hearOff; render(); }));
      const vol = document.createElement('input');
      vol.type = 'range';
      vol.min = '0'; vol.max = '1'; vol.step = '0.05';
      vol.value = String(volume);
      vol.setAttribute('aria-label', t('live.volume'));
      vol.oninput = () => { volume = Number(vol.value); if (audio) audio.volume = volume; };
      const id = stage.id;
      panel.append(vol, btn(t('live.report'), () => game.openPersonMenu?.(id, nameOf(id))));
    } else if (line.size) {
      const head = lineList()[0];
      text.textContent = '🙋 ' + t('live.next', { name: head.id === game.myId ? game.nickname || '?' : nameOf(head.id) });
      panel.append(text);
    }
    // The line: anyone not singing can join it while the stage is busy (or
    // others are already waiting).
    if (!mic && (stage || line.size)) {
      const n = myPlace();
      if (n) panel.append(btn(t('live.lineLeave') + ' (' + t('live.lineAt', { n }) + ')', () => leaveLine()));
      else panel.append(btn('🙋 ' + t('live.line') + (line.size ? ` (${line.size})` : ''), () => joinLine()));
    }
    panel.hidden = !mic && !stage && !line.size;
  }
  function joinLine() {
    if (line.has(game.myId)) return;
    const at = Date.now();
    line.set(game.myId, at);
    send({ k: 'q', at });
    render();
  }
  function leaveLine() {
    clearTimeout(turnTimer);
    if (!line.delete(game.myId)) return;
    send({ k: 'uq' });
    render();
  }
  // The stage just freed up: the first in line gets a moment to step up.
  function stageFreed() {
    freeAt = Date.now();
    const head = lineList()[0];
    if (head?.id !== game.myId) return;
    game.shop.toast('🎤 ' + t('live.yourTurn'));
    game.sfx?.pop?.();
    clearTimeout(turnTimer);
    turnTimer = setTimeout(() => { if (!mic) leaveLine(); }, NEXT_GRACE_MS);
  }

  // The café's own background music pauses while someone sings.
  function holdMusic(on) {
    const m = game.music;
    if (on && !music) {
      music = { wasOn: m.on };
      if (m.on) Promise.resolve(m.setOn(false)).then(() => game.applyMusicBtn?.());
    } else if (!on && music && !mic && !inPc) {
      const { wasOn } = music;
      music = null;
      if (wasOn && !m.on) Promise.resolve(m.setOn(true)).then(() => game.applyMusicBtn?.());
    }
  }
  // The two fans by the stage clap while someone sings.
  function fans(on) {
    const fanSpots = game.interior?.stations?.patrons || [];
    (game.interior?.patronNpcs || []).forEach((o, i) => { if (fanSpots[i]?.fan) o.ch.activity(on ? 'clap' : null); });
  }

  // ---------- singing ----------
  async function start(at) {
    if (mic) return;
    if (!supported()) { game.shop.toast(t('live.noVoice')); return; }
    if (stage && stage.id !== game.myId) { game.shop.toast(t('live.taken', { name: nameOf(stage.id) })); return; }
    const first = nextUp({ me: game.myId, line: lineList(), freeAt, now: Date.now() });
    if (first) { game.shop.toast('🙋 ' + t('live.next', { name: nameOf(first) })); return; }
    if (!canPerform({ user: game.cloud?.user, required: config.netProvider === 'supabase' && !game.testRoom })) { game.shop.toast(t('live.newbie')); return; }
    game.shop.toast(t('live.allow'));
    let s;
    try {
      // Echo cancellation keeps the room's sound out; noise suppression off,
      // so a guitar or a long note isn't cut as "noise".
      s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
    } catch {
      game.shop.toast(t('live.denied'));
      return;
    }
    // Walked away while the browser was asking, or someone else got there first.
    if (!active || mic || (stage && stage.id !== game.myId)) { s.getTracks().forEach((tr) => tr.stop()); if (stage) game.shop.toast(t('live.taken', { name: nameOf(stage.id) })); return; }
    mic = s;
    spot = at;
    // Up to the mic, facing the audience (like a busker). The camera stays
    // where it was, out in the room, so you see your singer's face.
    game.standAt?.(at.x, at.z, at.ry ?? 0);
    since = Date.now();
    muted = false;
    send({ k: 'on', since, muted });
    clearTimeout(turnTimer);
    line.delete(game.myId); // (the others drop us from the line on 'on')
    for (const id of game.others?.players?.keys() || []) offerTo(id);
    holdMusic(true);
    fans(true);
    game.shop.toast('🎤 ' + t('live.onAir'));
    render();
  }
  function stop(silent = false) {
    if (!mic) return;
    mic.getTracks().forEach((tr) => tr.stop());
    mic = null;
    for (const pc of outs.values()) pc.close();
    outs.clear();
    if (!silent) send({ k: 'off' });
    freeAt = Date.now();
    fans(!!stage);
    holdMusic(false);
    game.me?.play?.('bow');
    render();
  }
  function setMuted(on) {
    if (!mic) return;
    muted = on;
    for (const tr of mic.getAudioTracks()) tr.enabled = !on;
    send({ k: 'm', muted });
    render();
  }
  async function offerTo(id) {
    if (!mic || blocked(id)) return;
    await fetchRelay(game.cloud);
    if (!mic) return;
    outs.get(id)?.close();
    const pc = newPc();
    outs.set(id, pc);
    for (const tr of mic.getAudioTracks()) pc.addTrack(tr, mic);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && outs.get(id) === pc) { pc.close(); outs.delete(id); }
    };
    try {
      await pc.setLocalDescription(await pc.createOffer());
      await iceDone(pc);
      if (outs.get(id) !== pc || !mic) return;
      send({ k: 'o', to: id, sdp: pc.localDescription.sdp, since, muted });
    } catch (e) { console.warn('live offer', e); }
  }
  async function onAnswer(id, sdp) {
    const pc = outs.get(id);
    if (!pc || pc.signalingState !== 'have-local-offer') return;
    try {
      await pc.setRemoteDescription({ type: 'answer', sdp });
      for (const sender of pc.getSenders()) {
        const p = sender.getParameters();
        if (!p.encodings?.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = BITRATE;
        await sender.setParameters(p).catch(() => {});
      }
    } catch (e) { console.warn('live answer', e); }
  }

  // ---------- listening ----------
  function closeIn() {
    inPc?.close();
    inPc = null;
    if (audio) { audio.pause(); audio.srcObject = null; audio.remove(); audio = null; }
    needTap = false;
  }
  function stageGone() {
    closeIn();
    stage = null;
    fans(!!mic);
    holdMusic(false);
    render();
  }
  async function onOffer(id, m) {
    if (mic || blocked(id)) return;
    await fetchRelay(game.cloud); // (usually already here: asked on walking in)
    if (mic || blocked(id) || !active) return;
    if (stage && stage.id !== id && stageWinner(stage, { id, since: m.since }) === stage) return; // (the other singer has the stage)
    closeIn();
    stage = { id, since: m.since, muted: !!m.muted };
    const pc = (inPc = newPc());
    pc.ontrack = (ev) => {
      if (inPc !== pc) return;
      if (!audio) { audio = document.createElement('audio'); audio.autoplay = true; document.body.append(audio); }
      audio.srcObject = ev.streams[0] || new MediaStream([ev.track]);
      audio.muted = hearOff;
      audio.volume = volume;
      audio.play().then(() => { if (needTap) { needTap = false; render(); } }, () => { needTap = true; render(); });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && inPc === pc) { closeIn(); render(); }
    };
    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await iceDone(pc);
      if (inPc !== pc) return;
      send({ k: 'a', to: id, sdp: pc.localDescription.sdp });
    } catch (e) { console.warn('live listen', e); closeIn(); }
    holdMusic(true);
    fans(true);
    render();
  }

  function onMsg(id, e) {
    const m = parseLive(e);
    if (!m || !active) return;
    if (m.to && m.to !== game.myId) return; // someone else's offer or answer
    if (m.k === 'on') {
      if (blocked(id)) return;
      line.delete(id); // (they left the line to sing)
      const them = { id, since: m.since };
      if (mic && stageWinner({ id: game.myId, since }, them) === them) { stop(true); game.shop.toast(t('live.taken', { name: nameOf(id) })); }
      if (mic) return;
      if (stage && stage.id !== id && stageWinner(stage, them) === stage) return;
      if (stage?.id !== id) closeIn();
      stage = { id, since: m.since, muted: !!m.muted };
      render();
    } else if (m.k === 'off') {
      if (stage?.id === id) { stageGone(); stageFreed(); }
    } else if (m.k === 'q') {
      if (!blocked(id)) { line.set(id, m.at); render(); }
    } else if (m.k === 'uq') {
      if (line.delete(id)) render();
    } else if (m.k === 'm') {
      if (stage?.id === id) { stage.muted = !!m.muted; render(); }
    } else if (m.k === 'hi') {
      if (mic && !outs.has(id)) offerTo(id);
    } else if (m.k === 'o') onOffer(id, m);
    else if (m.k === 'a') onAnswer(id, m.sdp);
  }

  return {
    get active() { return active; },
    get performing() { return !!mic; },
    enter() {
      active = true;
      fetchRelay(game.cloud); // (ready by the time anyone sings)
      // Nobody sent us a voice yet: ask (the singer might have missed us arriving).
      clearTimeout(hiTimer);
      hiTimer = setTimeout(() => { if (active && !inPc && !mic) send({ k: 'hi' }); }, HI_AFTER_MS);
    },
    leave() {
      if (!active) return;
      stop(); // (tells the room, while we are still in it)
      leaveLine();
      line.clear();
      stageGone();
      clearTimeout(hiTimer);
      active = false;
      panel.hidden = true;
    },
    start,
    stop: () => stop(),
    // (?debug: __mk.live())
    debug: () => ({ performing: !!mic, muted, stage: stage?.id ?? null, stageMuted: !!stage?.muted, heard: inPc?.connectionState ?? null, sent: [...outs.values()].map((pc) => pc.connectionState), playing: !!audio && !audio.paused && !!audio.srcObject, line: lineList().map((q) => q.id), panel: !panel.hidden && panel.textContent }),
    setMuted,
    joinLine,
    onMsg,
    // Someone walked in: the singer sends them the voice.
    onJoin(id) {
      if (mic) setTimeout(() => offerTo(id), 400);
      if (line.has(game.myId)) setTimeout(() => line.has(game.myId) && send({ k: 'q', at: line.get(game.myId) }), 600); // (so they see the line too)
    },
    onLeave(id) {
      outs.get(id)?.close();
      outs.delete(id);
      if (line.delete(id)) render();
      if (stage?.id === id) { stageGone(); stageFreed(); }
    },
    tick(p) {
      if (mic && offStage(p, spot)) { stop(); game.shop.toast(t('live.steppedOff')); }
      if (mic) {
        const now = Date.now(), waiting = line.size;
        if (timeUp({ since, now, waiting })) {
          const head = lineList()[0];
          stop();
          game.shop.toast(t('live.timeUp', { name: nameOf(head.id) }));
          return;
        }
        const left = waiting ? '⏱ ' + t('live.left', { time: clock(SLOT_MS - (now - since)), n: waiting }) : '';
        if (timerEl && timerEl.textContent !== left) timerEl.textContent = left;
      }
      if (stage && blocked(stage.id)) stageGone(); // (blocked from the person menu just now)
    },
  };
}
