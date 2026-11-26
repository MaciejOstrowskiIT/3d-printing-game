import type { GameState, LogArg, LogEntry } from './state';

export type Sfx = 'click' | 'buy' | 'goal' | 'alert' | 'fail';

/** Zdarzenia, które rdzeń wysyła na zewnątrz. Słuchają ich dziennik, dźwięk, animacja i (później) analityka oraz SDK portalu. */
export type GameEvent =
  | { type: 'log'; entry: LogEntry }
  | { type: 'sfx'; name: Sfx }
  | { type: 'printed'; manual: boolean }
  | { type: 'goal'; index: number }
  | { type: 'node'; id: string }
  | { type: 'phase'; phase: 1 | 2 }
  | { type: 'order'; result: 'offered' | 'delivered' | 'failed' | 'expired' }
  | { type: 'end' };

export interface Ctx {
  /** Losowość przez kontekst, żeby testy były powtarzalne. */
  rng(): number;
  /** Symulacja czasu nieobecności: bez zdarzeń losowych, dźwięków i większości wpisów w dzienniku. */
  offline: boolean;
  emit(e: GameEvent): void;
}

export const rnd = (ctx: Ctx, a: number, b: number) => a + ctx.rng() * (b - a);
export const pick = (ctx: Ctx, range: readonly [number, number]) => rnd(ctx, range[0], range[1]);

const OFFLINE_LOGS = new Set(['off', 'off2', 'goal']);

export function log(s: GameState, ctx: Ctx, k: string, ...a: LogArg[]) {
  if (ctx.offline && !OFFLINE_LOGS.has(k)) return;
  const entry = { k, a };
  s.log.unshift(entry);
  s.log = s.log.slice(0, 5);
  ctx.emit({ type: 'log', entry });
}

export function sfx(ctx: Ctx, name: Sfx) {
  if (!ctx.offline) ctx.emit({ type: 'sfx', name });
}

/** Prosty generator do testów (Park–Miller). */
export function seededRng(seed = 1) {
  let x = seed % 2147483647 || 1;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}
