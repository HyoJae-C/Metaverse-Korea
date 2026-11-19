// Daily check-in and five daily missions (see core/daily.js).
import { Daily, REWARD, checkInPay, missionPay } from '../core/daily.js';
import { NAME_ROMAN } from '../core/npcs.js';
import { getLanguage, localName, t } from '../core/i18n.js';

// A small picture for each kind of mission, so the list reads at a glance.
const MISSION_ICON = { talk: '👋', visit: '🛍️', pet: '🐾', sit: '☕', bike: '🚲', emote: '😊', square: '📜', fish: '🎣', job: '🧑‍🍳', cook: '🍳' };

export function createDaily(game) {
  const { $, leaveStore, npcs, setGuide, storefronts, wallet, zones } = game;
  game.daily = new Daily(wallet, {
    npcs: npcs.list.map((o) => o.name), // one person each (data/npc-names.js)
    stores: storefronts.items.map((i) => i.store).filter((st) => st.category !== 'home'),
  });
  const storeById = (id) => storefronts.items.find((i) => i.store.id === id);
  function missionText(m) {
    if (m.type === 'talk') {
      // Say where they hang out (their meeting zone), so it's clear which part of town to go to.
      const lang = getLanguage(), o = npcs.list.find((n) => n.name === m.target);
      // (a zone without a signpost: the nearest one with a sign, which you can find)
      const home = o && zones.items.find((z) => z.zone.id === o.zone);
      const near = home && (home.quiet ? zones.signs.reduce((b, z) => (!b || Math.hypot(z.x - home.x, z.z - home.z) < Math.hypot(b.x - home.x, b.z - home.z) ? z : b), null) : home);
      const zone = near?.zone;
      const where = zone ? localName(zone.name, lang) : '';
      const extra = [lang === 'ko' ? '' : NAME_ROMAN[m.target], where].filter(Boolean).join(', ');
      return t('mission.talk', { name: extra ? `${m.target} (${extra})` : m.target });
    }
    if (m.type === 'visit') return t('mission.visit', { store: localName(storeById(m.target)?.store.name, getLanguage()) || m.target });
    return t('mission.' + m.type + (m.type === 'square' && m.need > 1 ? 'N' : ''), { n: m.need });
  }
  function renderDaily() {
    const wd = game.daily.weekDay(), done = game.daily.checkedInToday();
    $('daily-week').replaceChildren(...Array.from({ length: 7 }, (_, i) => {
      const el = document.createElement('span');
      const day = i + 1;
      el.textContent = day === 7 ? '🎁' : String(day);
      if (day === 7) el.classList.add('big');
      if (day < wd || (day === wd && done)) el.classList.add('on');
      if (day === wd) el.classList.add('today');
      return el;
    }));
    const btn = $('checkin-btn');
    btn.disabled = done;
    btn.textContent = done ? t('daily.done') : t('daily.checkIn', { n: checkInPay(wd) });
    $('daily-streak').textContent = t('daily.streak', { n: done ? game.daily.streak : Math.max(0, wd - 1), w: REWARD.week });
    $('daily-missions').replaceChildren(...game.daily.missions.map((m) => {
      const li = document.createElement('li');
      const finished = m.n >= m.need;
      li.classList.toggle('done', finished);
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.setAttribute('aria-hidden', 'true');
      tick.textContent = finished ? '✓' : MISSION_ICON[m.type] || '⭐';
      const text = document.createElement('span');
      text.className = 'm-text';
      text.textContent = missionText(m);
      li.append(tick, text);
      // A paid place says the fare is paid back on top.
      if (missionPay(m) > REWARD.mission && !finished) {
        const pay = document.createElement('span');
        pay.className = 'm-prog';
        pay.textContent = t('daily.farePay', { n: missionPay(m).toLocaleString() });
        li.append(pay);
      }
      if (m.need > 1 && !finished) {
        const prog = document.createElement('span');
        prog.className = 'm-prog';
        prog.textContent = `${m.n}/${m.need}`;
        li.append(prog);
      }
      // Show the way: to the store, or to where the person is walking right now.
      const target = m.type === 'visit' ? storeById(m.target) : m.type === 'talk' ? npcs.list.find((o) => o.name === m.target) : null;
      if (target && !finished) {
        const go = document.createElement('button');
        go.className = 'm-go';
        go.textContent = '🧭 ' + t('mission.go');
        go.onclick = () => {
          $('daily-panel').hidden = true;
          if (game.mode === 'store') leaveStore();
          if (m.type === 'visit') setGuide({ kind: 'store', id: target.store.id, x: (target.go || target.door).x, z: (target.go || target.door).z, label: localName(target.store.name, getLanguage()) });
          else setGuide({ kind: 'npc', id: target.name, x: target.ch.root.position.x, z: target.ch.root.position.z, label: target.name });
        };
        li.append(go);
      }
      return li;
    }));
    const missions = game.daily.missions;
    $('daily-count').textContent = `${missions.filter((m) => m.n >= m.need).length}/${missions.length}`;
    $('daily-bonus').textContent = game.daily.allDone() ? t('daily.bonusDone') : t('daily.bonus', { n: REWARD.mission.toLocaleString() });
    $('daily-dot').hidden = !game.daily.hasNews();
  }
  return { renderDaily };
}
