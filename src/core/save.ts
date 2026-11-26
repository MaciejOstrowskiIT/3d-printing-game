import { STORY } from '../content/story';
import { ACHIEVEMENTS } from '../content/achievements';
import { NODE } from '../content/tree';
import { createState, SAVE_VERSION, type GameState } from './state';
import { validSave } from './saveValidation';

type Migration = (raw: Record<string, unknown>) => void;

/** Save migrations. Key = version being migrated from. Append new ones, never edit old ones. */
const MIGRATIONS: Record<number, Migration> = {
  // v3 (single-file version) had no v field and not every save stored the failed-order counter.
  3: raw => { raw.ordFail ??= 0; },
  // v5 stock was pooled in figurine equivalents, with no model provenance.
  // Keep it as figurines. Old partially printed work was not paid for yet.
  5: raw => { raw.acc = 0; raw.mp = 0; },
};

/** Loads a raw save (including old versions) and returns a complete, current state. */
export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') return createState();
  const r = { ...(raw as Record<string, unknown>) };
  let v = typeof r.v === 'number' ? r.v : 3;
  if (!Number.isInteger(v) || v < 3 || v > SAVE_VERSION) throw new Error('Unsupported save version');
  while (v < SAVE_VERSION) { MIGRATIONS[v]?.(r); v++; }
  const hadAchievements = Array.isArray(r.ach);
  const hadStory = Array.isArray(r.story);
  const defaults = createState();
  const knownFields = Object.entries(r).filter(([key]) => Object.hasOwn(defaults, key));
  const s = { ...defaults, ...Object.fromEntries(knownFields) } as GameState;
  if (!validSave(s, defaults)) throw new Error('Invalid saved progress');
  // These multipliers come exclusively from research. Rebuild them from the
  // purchased projects, on a scratch state so one-time rewards never replay.
  const researched = createState();
  for (const id of s.done) NODE[id].fx?.(researched);
  s.spd = researched.spd;
  s.dem = researched.dem;
  s.dMul = researched.dMul;
  s.fMul = researched.fMul;
  if (!hadAchievements) s.ach = ACHIEVEMENTS.filter(a => a.check(s)).map(a => a.id);
  // Saves from before story messages: milestones already passed count as read, so nobody gets a backlog of notes.
  if (!hadStory) s.story = STORY.filter(m => m.when(s)).map(m => m.id);
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
  const code = text.trim();
  if (!code) return null;
  try {
    const json = code.startsWith(EXPORT_PREFIX) ? fromBase64(code.slice(EXPORT_PREFIX.length).replace(/\s+/g, '')) : code;
    const raw = JSON.parse(json) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object' || typeof raw.total !== 'number' || !Array.isArray(raw.done)) return null;
    return migrate(raw);
  } catch {
    return null;
  }
}
