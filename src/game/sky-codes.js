// The sky view's chat codes and carry messages (game/sky-flight.js), small
// enough for the chat and the message handler to know them before the sky
// code itself is downloaded.

// Chat codes (after "/"), upper or lower case.
export const SKY_CODES = {
  '서울맨': 'seoulman', seoulman: 'seoulman',
  '스카이슈트': 'suit', skysuit: 'suit',
  '날개': 'wings', wings: 'wings',
  '신천옹': 'albatross', albatross: 'albatross',
  '독수리': 'eagle', eagle: 'eagle',
  '양탄자': 'carpet', carpet: 'carpet',
  '손오공': 'wukong', wukong: 'wukong',
  '우주선': 'ufo', ufo: 'ufo',
  '착지': 'off', land: 'off',
};
export const skyCode = (code) => SKY_CODES[String(code ?? '').trim().toLowerCase()] || null;

// Carry messages on the emote channel: 'sky:<verb>:<target>[:<pose>:<slot>]'.
export const skyMsg = (verb, target, pose, slot) => `sky:${verb}:${target}` + (pose ? `:${pose}:${slot ? 1 : 0}` : '');
export function parseSkyMsg(e) {
  const m = /^sky:(invite|join|no|leave|end):([\w-]{1,64})(?::(arms2|arm1|princess|talons|ride|cabin):([01]))?$/.exec(String(e));
  return m ? { verb: m[1], target: m[2], pose: m[3] || null, slot: Number(m[4] || 0) } : null;
}
