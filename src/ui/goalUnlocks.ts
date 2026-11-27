import { signal } from '@preact/signals';
import { GOALS } from '../content/goals';
import { li, t } from './i18n';
import { game, pushNote } from './store';

/** How long the goal card shows what the last goal opened. */
export const UNLOCK_SHOW_MS = 45_000;

/** The last finished goal that opened something, while the goal card still shows it. */
export const recentUnlock = signal<number | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

/** After a goal that opens something: a received notification in the inbox, and a line in the goal card for a while. */
export function installGoalUnlocks() {
  game.on(e => {
    if (e.type !== 'goal') return;
    const goal = GOALS[e.index];
    if (!goal?.u) return;
    pushNote({ icon: '🔓', title: t('goalUnlockNote', goal.t[li()]), body: goal.u[li()] });
    recentUnlock.value = e.index;
    clearTimeout(timer);
    timer = setTimeout(() => { recentUnlock.value = null; }, UNLOCK_SHOW_MS);
  });
}
