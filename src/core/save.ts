import { createState, SAVE_VERSION, type GameState } from './state';

type Migration = (raw: Record<string, unknown>) => void;

/** Migracje zapisu. Klucz = wersja, z której migrujemy. Dopisuj nowe, nigdy nie zmieniaj starych. */
const MIGRATIONS: Record<number, Migration> = {
  // v3 (wersja jednoplikowa) nie miała pola v ani licznika nieudanych zamówień wprost w każdym zapisie.
  3: raw => { raw.ordFail ??= 0; },
};

/** Wczytuje surowy zapis (także ze starych wersji) i zwraca pełny, aktualny stan. */
export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') return createState();
  const r = { ...(raw as Record<string, unknown>) };
  let v = typeof r.v === 'number' ? r.v : 3;
  while (v < SAVE_VERSION) { MIGRATIONS[v]?.(r); v++; }
  const s = Object.assign(createState(), r) as GameState;
  s.v = SAVE_VERSION;
  return s;
}

export const serialize = (s: GameState) => JSON.stringify({ ...s, ts: Date.now() });
