// Jobs (rules and keepers in core/career.js): which keeper to use, the last
// thing it said, and the shifts. The part-time panels (ui/job-ui.js) and
// the delivery run (game/delivery.js) start and end shifts here; the job
// picker (ui/career-ui.js) loads when an Information Center guide is asked.
import { LocalCareer, SupabaseCareer, skillOf, CAREER_JOBS } from '../core/career.js';

// game: { cloud, wallet }.
export function createCareer(game) {
  let keeper = null, local = null;
  let known = { job: null, next: 0, skills: {}, today: 0 };
  const store = () => {
    const live = game.cloud?.status === 'cloud' && game.cloud.client && game.cloud.user;
    if (live && !(keeper instanceof SupabaseCareer)) keeper = new SupabaseCareer(game.cloud, game.wallet);
    if (!live || keeper?.missing) return (local ||= new LocalCareer(game.wallet));
    return keeper;
  };
  // A keeper that said its tables aren't there yet is asked once more with the local one.
  async function ask(f) {
    let k = store(), r = await f(k);
    if (r?.error === 'missing') { k = store(); r = await f(k); }
    return r;
  }
  async function refresh() {
    const r = await ask((k) => k.info());
    if (!r.error) known = r;
    return known;
  }
  const skill = (job) => skillOf(known.skills?.[job]?.xp || 0);

  return {
    jobs: CAREER_JOBS,
    get known() { return known; },
    refresh,
    skill,
    mine: (job) => known.job === job,
    async choose(job) {
      const r = await ask((k) => k.choose(job));
      if (!r.error) known = { ...known, job: r.job, next: r.next };
      else if (r.next) known = { ...known, next: r.next };
      return r;
    },
    // A shift: begin() when it starts, end() when it is done. begin resolves
    // { run } (or { error: 'busy' }); end resolves { paid, xp, lv, up } or { error }.
    begin: (job, storeName) => ask((k) => k.start(job, storeName)),
    async end(run, score, note) {
      if (!run) return { error: 'run' };
      const r = await store().finish(run, score, note);
      if (!r.error) refresh(); // (the new skill and today's count)
      return r;
    },
  };
}
