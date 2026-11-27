import { MODELS } from '../content/models';
import { PATENTS } from '../content/patents';
import { patentsFor } from '../core/prestige';
import { patLvl, type GameState } from '../core/state';

/** A patent whose next level the player could buy with the patents they have plus what this line pays. */
export interface PatentPick { id: string; level: number; cost: number }

/** Patents within reach after the reset, cheapest first. */
export function patentPreview(s: GameState, gain = patentsFor(s)): PatentPick[] {
  const budget = s.meta.patents + gain;
  return PATENTS
    .map(p => ({ id: p.id, level: patLvl(s, p.id) + 1, cost: p.cost(patLvl(s, p.id)), max: p.max }))
    .filter(p => p.level <= p.max && p.cost <= budget)
    .sort((a, b) => a.cost - b.cost)
    .map(({ id, level, cost }) => ({ id, level, cost }));
}

export interface RunSummary {
  /** Production line number, 1 for the first game. */
  line: number;
  realistic: boolean;
  play: number;
  totalPlay: number;
  prints: number;
  sold: number;
  earned: number;
  /** The model that earned the most on this line. */
  best: { id: string; revenue: number } | null;
  /** Reached goals in order; `at` is the play time in seconds, null when unknown. */
  goals: { index: number; at: number | null }[];
  /** Patents a reset pays now. */
  patents: number;
}

export function runSummary(s: GameState): RunSummary {
  let best: RunSummary['best'] = null;
  for (const m of MODELS) {
    const revenue = s.modelRev[m.id] ?? 0;
    if (revenue > 0 && revenue > (best?.revenue ?? 0)) best = { id: m.id, revenue };
  }
  const goals = Array.from({ length: s.goal }, (_, index) => {
    const at = s.goalAt[index];
    return { index, at: at == null || at < 0 ? null : at };
  });
  return {
    line: s.meta.runs + 1, realistic: (s.slow || 1) > 1,
    play: s.play, totalPlay: s.priorPlay + s.play,
    prints: s.total, sold: s.sold, earned: s.runEarned,
    best, goals, patents: patentsFor(s),
  };
}
