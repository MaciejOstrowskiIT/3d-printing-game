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

export const serialize = (s: GameState, ts = Date.now()) => JSON.stringify({ ...s, ts });

/** Prefix of exported save codes; bump the number if the code format (not the state) ever changes. */
export const EXPORT_PREFIX = 'DRK1:';

const toBase64 = (text: string) => {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin);
};
const fromBase64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

/** A portable text code for moving a save between browsers or devices. */
export const exportSave = (s: GameState) => EXPORT_PREFIX + toBase64(serialize(s));

/** Parses a save code (or raw save JSON). Returns null for anything that does not look like a save. */
export function importSave(text: string): GameState | null {
  const code = text.trim().replace(/\s+/g, '');
  if (!code) return null;
  try {
    const json = code.startsWith(EXPORT_PREFIX) ? fromBase64(code.slice(EXPORT_PREFIX.length)) : code;
    const raw = JSON.parse(json) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object' || typeof raw.total !== 'number' || !Array.isArray(raw.done)) return null;
    return migrate(raw);
  } catch {
    return null;
  }
}
