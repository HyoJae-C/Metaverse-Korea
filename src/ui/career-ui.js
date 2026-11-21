// The job picker (직업), at an Information Center: every job with my skill
// level and its pay, and a button to make one my job (once a week). Rules
// in core/career.js; loaded the first time a guide is asked about jobs.
import { t } from '../core/i18n.js';
import { L } from './pocha-ui.js';
import { JOB_TEXT } from '../core/jobs.js';
import { JOB_ICON, bonusPct, hourly } from '../core/career.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const day = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });

// root: the panel to draw in; career: game/career.js; toast(msg).
export async function showCareer({ root, career, toast, onClose }) {
  root.hidden = false;
  const draw = (msg) => {
    const k = career.known;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('career.close'));
    x.onclick = () => { root.hidden = true; onClose?.(); };
    const list = el('div', 'info-list');
    for (const job of career.jobs) {
      const sk = career.skill(job), mine = k.job === job;
      const row = el('div', 'info-row');
      const body = el('div');
      body.append(
        el('strong', null, `${JOB_ICON[job]} ${L(JOB_TEXT.role[job])}${mine ? ' · ' + t('career.mine') : ''}`),
        el('p', null, [
          t('career.lv', { lv: sk.lv }),
          sk.need ? t('career.next', { into: sk.into, need: sk.need }) : t('career.top'),
          mine ? t('career.bonus', { p: bonusPct(sk.mult) }) : '',
          t('career.hour', { n: hourly(mine ? sk.lv : null).toLocaleString() }),
        ].filter(Boolean).join(' · ')),
      );
      row.append(body);
      if (!mine && !(k.job && k.next)) { // (no button while the week isn't over)
        const pick = el('button', 'chip', t('career.pick'));
        pick.onclick = async () => {
          pick.disabled = true;
          const r = await career.choose(job);
          if (r.error === 'wait') draw(t('career.wait', { date: day(r.next) }));
          else if (r.error) draw(t('career.offline'));
          else { toast?.(t('career.chosen', { job: L(JOB_TEXT.role[job]) })); draw(); }
        };
        row.append(pick);
      }
      list.append(row);
    }
    const note = msg || (k.job && k.next ? t('career.wait', { date: day(k.next) }) : t('career.once'));
    root.replaceChildren(x, el('h3', null, '💼 ' + t('career.title')), el('p', 'order-hint', t('career.intro')), list, el('p', 'grill-best', note));
  };
  draw('…');
  await career.refresh();
  if (!root.hidden) draw();
}
