// --- Mini basketball: a half court on Olympic Park's Peace Plaza (a
// "basketball" landmark; rules and moves in core/basketball-game.js, see
// docs/BASKETBALL.md). Pick a shot, play its gauge, and the panel steps
// aside while you do the move: basketTick places you each frame.
import { BL } from '../ui/basketball-text.js';
import { BasketballUI } from '../ui/basketball-ui.js';
import { COURT_RADIUS, COURT_STAND, makeBall, makeCourt } from '../core/basketball-court.js';
import { ShotPlayer } from '../core/basketball-play.js';
import * as THREE from 'three';
import { buzz } from '../core/haptics.js';
import { shotMove } from '../core/basketball-game.js';
import { t } from '../core/i18n.js';

export function createBasketball(game) {
  const { $, STALE, scene, setAutoWalk, sfx, shop, wallet } = game;
  const courtLm = game.map.landmarks.find((l) => l.type === 'basketball') || null;
  let court = null, courtBall = null;
  if (courtLm) {
    court = makeCourt();
    court.group.position.set(courtLm.x, 0, courtLm.z);
    court.group.rotation.y = courtLm.ry || 0;
    court.group.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    scene.add(court.group);
    court.group.updateMatrixWorld(true);
    courtBall = makeBall();
    courtBall.visible = false;
    scene.add(courtBall);
  }
  let basketShot = null; // the move playing (ShotPlayer)
  let basketY = 0; // feet off the floor while jumping
  const _courtV = new THREE.Vector3();
  function nearCourt(p) {
    if (!court || game.mode !== 'street') return false;
    const v = court.group.worldToLocal(_courtV.set(p.x, 0, p.z));
    return Math.hypot(v.x - COURT_STAND[0], v.z - COURT_STAND[1]) < COURT_RADIUS;
  }
  const BASKET_SFX = {
    bounce: () => sfx.bump(0.35, 0.7),
    rim: () => sfx.tock(1, 620),
    board: () => sfx.tock(0.8, 320),
    dunk: () => { sfx.bump(1, 1); buzz(40); },
    net: () => sfx.plip(),
    cheer: () => sfx.landed(),
  };
  const basketUi = new BasketballUI({
    root: $('basket-panel'),
    wallet,
    onShot: ({ shot, tier }) => startBasketShot(shot, tier),
    onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); game.me.play(medal ? 'cheer' : 'wave'); },
    onClose: () => { game.action = STALE; },
  });
  function startBasketShot(shot, tier) {
    const p = game.me.root.position;
    if (!court || !nearCourt(p) || game.riding || game.seated) { basketUi.resume(); return; }
    setAutoWalk(false);
    const move = shotMove(shot, tier);
    basketShot = new ShotPlayer({
      ch: game.me, court, ball: courtBall, move,
      onEvent: (ev, m) => {
        BASKET_SFX[ev.kind]?.();
        if (ev.kind === 'cheer') shop.toast('🏀 ' + BL('made', { n: m.points }) + (m.tier === 3 ? ' · ' + BL('style') : ''));
        else if (ev.kind === 'bounce' && !m.made && ev.t > m.release && !basketShot.said) { basketShot.said = true; shop.toast(BL('missed')); }
      },
    });
    game.action = STALE;
  }
  function stopBasketShot() {
    basketShot?.stop();
    basketShot = null;
    basketY = 0;
    if (courtBall) courtBall.visible = false;
    game.me.setTrick(null, 0);
  }
  // Every frame, before the ground height is used.
  function basketTick(dt, p) {
    if (!court) return;
    if (!basketShot) {
      court.update(dt);
      if (basketUi.open && !nearCourt(p)) basketUi.close(); // walked away
      return;
    }
    if (game.mode !== 'street' || game.riding) { stopBasketShot(); basketUi.close(); return; }
    const s = basketShot.step(dt);
    p.x = s.x; p.z = s.z;
    basketY = s.y;
    game.me.root.rotation.y = s.ry;
    game.me.setTrick({ spin: s.spin }, s.y);
    game.speed01 = s.speed;
    if (s.done) { stopBasketShot(); basketUi.resume(); game.action = STALE; }
  }

  return { get basketY() { return basketY; }, basketUi, get basketShot() { return basketShot; },
    nearCourt, basketTick };
}
