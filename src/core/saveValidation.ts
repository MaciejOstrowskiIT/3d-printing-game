import { BAL } from '../content/balance';
import { COLORS } from '../content/colors';
import { GOALS } from '../content/goals';
import { KEPT_AUTOMATION, PATENT } from '../content/patents';
import { NODE, type TreeNode } from '../content/tree';
import { validMarketState } from '../systems/marketEvents';
import { validMaterialState } from '../systems/materials';
import { validFleet } from '../systems/fleet';
import { validInventory } from '../systems/inventory';
import { validModelState } from '../systems/models';
import { validOfflineBonus } from '../systems/offlineBonus';
import { validDailyState } from '../systems/dailyOrder';
import { validStoryState } from '../systems/story';
import { validWorkshopStats } from '../systems/workshopStats';
import type { GameState } from './state';

const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;

function validPatents(meta: GameState['meta']) {
  if (!record(meta) || !record(meta.pat) || !integer(meta.patents) ||
      !integer(meta.earned) || !integer(meta.runs)) return false;

  let spent = 0;
  for (const [id, level] of Object.entries(meta.pat)) {
    if (!Object.hasOwn(PATENT, id) || !integer(level, 0, PATENT[id].max)) return false;
    for (let i = 0; i < level; i++) spent += PATENT[id].cost(i);
  }
  return meta.patents + spent === meta.earned;
}

/** Check persisted data before any simulation, achievement lookup or offline reward. */
/** A bought node must have its prerequisites. Joins added after a save was made (`reqNew`) are not required of old saves. */
function savedPrereqMissing(done: string[], n: TreeNode) {
  return (n.req ?? []).some(r => !n.reqNew?.includes(r) && !done.includes(r)) || !!(n.reqAny?.length && !n.reqAny.some(r => done.includes(r)));
}

export function validSave(s: GameState, defaults: GameState) {
  for (const key of Object.keys(defaults) as (keyof GameState)[]) {
    const value = s[key];
    if (typeof defaults[key] === 'number' &&
        (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) return false;
    if (typeof defaults[key] === 'boolean' && typeof value !== 'boolean') return false;
  }
  if (!integer(s.goal, 0, GOALS.length) || !integer(s.ph, 1, 2) || !integer(s.br, 0, 3) ||
      !integer(s.col, 0, COLORS.length - 1) || !integer(s.trend, 0, COLORS.length - 1) ||
      !['w', 'r'].includes(s.tab) || s.total < 0 || s.g <= 0 || s.price <= 0) return false;
  if (![s.auto, s.farm, s.mkt, s.rep, s.drones, s.fabs, s.panels, s.sold].every(v => integer(v)) ||
      !integer(s.proc, 1) || !integer(s.mem, 1) || s.proc + s.mem - 2 > s.rep) return false;
  if (!Array.isArray(s.done) || !s.done.every(id => typeof id === 'string' && Object.hasOwn(NODE, id)) ||
      new Set(s.done).size !== s.done.length || !Array.isArray(s.ach) || !s.ach.every(id => typeof id === 'string')) return false;
  if (!record(s.amOn) || !Object.values(s.amOn).every(v => typeof v === 'boolean') ||
      !Array.isArray(s.log) || !s.log.every(e => record(e) && typeof e.k === 'string' && Array.isArray(e.a) &&
        e.a.every((v: unknown) => typeof v === 'string' || Number.isFinite(v)))) return false;
  if (s.ord !== null && !(record(s.ord) && typeof s.ord.acc === 'boolean' &&
      [s.ord.n, s.ord.got, s.ord.time, s.ord.left, s.ord.offer, s.ord.pay].every(v => Number.isFinite(v) && v >= 0) &&
      integer(s.ord.c, 0, 6) && s.ord.got <= s.ord.n)) return false;
  if (!validPatents(s.meta)) return false;
  const kept = KEPT_AUTOMATION[s.meta.pat.keep ?? 0];
  if (s.done.some(id => !kept.includes(id) && savedPrereqMissing(s.done, NODE[id]))) return false;
  if (!validMarketState(s) || !validModelState(s) || !validInventory(s) || !validFleet(s) || !validMaterialState(s) || !validOfflineBonus(s) || ![1, BAL.realisticSlow].includes(s.slow) || !validDailyState(s) || !validStoryState(s) || s.play < 0) return false;
  if (!validWorkshopStats(s)) return false;
  if (s.stockPremium < 0 || s.stockPremium > BAL.precisionPremium + 1e-9) return false;
  return s.boostT >= 0 && s.boostT <= BAL.boostSeconds &&
    s.boostCd >= s.boostT && s.boostCd <= BAL.boostCooldown;
}
