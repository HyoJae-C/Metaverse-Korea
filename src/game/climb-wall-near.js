// Ttukseom Han River Park's outdoor climbing wall (the real 뚝섬 인공암벽장):
// for now something to look at, not to climb. Waits for you to come near,
// then loads the wall itself (game/ttukseom-wall.js). Small on purpose: this
// is in the first download, the wall is not.
import { t } from '../core/i18n.js';

const LOAD = 220; // m: build it
const TALK = 6; // m from the foot of the wall: the button

// game: { scene, collision, spot: the map's 'climbwall' landmark { x, z, ry },
// mode(), toast(m) }.
export function createClimbWallNear(game) {
  const s = game.spot;
  let wall = null, loading = null;
  const load = () => (loading ||= import('./ttukseom-wall.js')
    .then(({ createTtukseomWall }) => (wall = createTtukseomWall(game)))
    .catch((e) => { loading = null; console.warn('climbing wall', e); return null; }));
  // Where you stand to look up at it: in front of the tower.
  const foot = s && [s.x + 5 * Math.sin(s.ry), s.z + 5 * Math.cos(s.ry)];
  return {
    // Every frame on the street.
    update(p) {
      if (!s || game.mode() !== 'street') return;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (wall) wall.update(d); else if (d < LOAD) load();
    },
    act(p) {
      if (!wall || Math.hypot(p.x - foot[0], p.z - foot[1]) > TALK) return null;
      return { key: 'climbwall', label: '🧗 ' + t('climbWall.name'), run: () => game.toast('🚧 ' + t('climbWall.soon')) };
    },
  };
}
