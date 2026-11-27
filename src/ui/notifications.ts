import { has, type GameState } from '../core/state';
import { filamentWarning } from '../systems/filament';

/** Things that want the player's attention, derived from the game state (the notification centre and its toasts).
 *  The id is stable while the same thing stays open (an order keeps its id after it is accepted), so a toast
 *  appears once, when it arrives. Informational chips (running market effects, calendar) are not notifications. */
export type NotificationKind = 'story' | 'order' | 'daily' | 'market' | 'breakdown' | 'filament';
export interface Notification { id: string; kind: NotificationKind; urgent: boolean }

export function notifications(s: GameState): Notification[] {
  const out: Notification[] = [];
  if (s.msg) out.push({ id: `story:${s.msg}`, kind: 'story', urgent: false });
  if (s.ph !== 1) return out;
  const warning = filamentWarning(s);
  if (warning) out.push({ id: `filament:${warning}`, kind: 'filament', urgent: warning === 'out' });
  if (s.brk > 0) out.push({ id: `breakdown:${s.fails}`, kind: 'breakdown', urgent: !(has(s, 'kamera') && s.amOn.kamera) });
  if (s.ord) out.push({ id: `order:${s.ordDone + s.ordFail}:${s.ord.c}:${s.ord.n}`, kind: 'order', urgent: !s.ord.acc });
  if (s.dord && s.dord.day === s.dday && !s.dord.done) out.push({ id: `daily:${s.dord.day}`, kind: 'daily', urgent: false });
  if (s.mev) out.push({ id: `market:${s.mev.id}:${s.mev.cost}`, kind: 'market', urgent: true });
  return out;
}
