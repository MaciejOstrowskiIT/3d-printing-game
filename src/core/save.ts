import { ACHIEVEMENTS } from '../content/achievements';
import { createState, SAVE_VERSION, type GameState } from './state';

type Migration = (raw: Record<string, unknown>) => void;

/** Save migrations. Key = version being migrated from. Append new ones, never edit old ones. */
const MIGRATIONS: Record<number, Migration> = {
  // v3 (single-file version) had no v field and not every save stored the failed-order counter.
  3: raw => { raw.ordFail ??= 0; },
  // v5 added achievements; existing progress unlocks them silently in migrate() below.
};

/** Loads a raw save (including old versions) and returns a complete, current state. */
export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') return createState();
  const r = { ...(raw as Record<string, unknown>) };
  let v = typeof r.v === 'number' ? r.v : 3;
  while (v < SAVE_VERSION) { MIGRATIONS[v]?.(r); v++; }
  const hadAchievements = Array.isArray(r.ach);
  const s = Object.assign(createState(), r) as GameState;
  if (!hadAchievements) s.ach = ACHIEVEMENTS.filter(a => a.check(s)).map(a => a.id);
  s.v = SAVE_VERSION;
  return s;
}

export const serialize = (s: GameState) => JSON.stringify({ ...s, ts: Date.now() });
