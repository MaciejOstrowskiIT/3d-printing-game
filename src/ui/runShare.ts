import { GOALS } from '../content/goals';
import { MODEL } from '../content/models';
import type { RunSummary } from '../systems/runSummary';
import { fmt, li, money, playtime, t } from './i18n';

/** Plain-text result for the end screen's Copy button, in the player's language. */
export function shareText(r: RunSummary): string {
  const lines = [
    t('shareHead'),
    t('shareLine', r.line, playtime(r.play)),
    t('shareStats', fmt(r.prints), money(r.earned)),
  ];
  if (r.best) lines.push(t('shareBest', MODEL[r.best.id].name[li()]));
  lines.push(t('shareGoals', r.goals.length, GOALS.length));
  return lines.join('\n');
}
