import { useState } from 'preact/hooks';
import { GOALS } from '../../../content/goals';
import { fmt, li, t } from '../../i18n';
import { useS } from '../../store';
import { recentUnlock } from '../../goalUnlocks';
import { Meter } from '../common';

export function Goal() {
  const [expanded, setExpanded] = useState(false);
  const g = useS(s => s.goal);
  const done = recentUnlock.value;
  const unlock = done !== null ? GOALS[done]?.u?.[li()] : undefined;
  const unlockLine = unlock && <div class="goal-unlock"><b>🔓 {t('goalUnlocked')}:</b> {unlock}</div>;
  const prog = useS(s => (s.goal < GOALS.length ? GOALS[s.goal].p(s).map(Math.floor).join('/') : ''));
  if (g >= GOALS.length) {
    return (<div class="goal"><div class="gt"><span>{t('goalEnd')}</span></div><h3>{t('goalEndT')}</h3><Meter tone="or" pct={100} />{unlockLine}</div>);
  }
  const q = GOALS[g];
  const [a, b] = prog.split('/').map(Number);
  return (
    <div class="goal" aria-live="polite">
      <div class="gt"><span>{t('goalN', g + 1, GOALS.length)}</span><span>{fmt(Math.min(a, b))} / {fmt(b)}</span></div>
      <h3><span class="goal-title">{q.t[li()]}</span><button class="goal-toggle" aria-expanded={expanded}
        aria-controls="goal-hint" onClick={() => setExpanded(!expanded)}>{q.t[li()]} <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button></h3>
      <p id="goal-hint" class={expanded ? 'expanded' : ''}>{q.h[li()]}</p>
      <Meter tone="or" pct={(100 * a) / b} />
      {unlockLine}
    </div>
  );
}
