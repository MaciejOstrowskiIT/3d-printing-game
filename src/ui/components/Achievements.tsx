import { ACH, ACHIEVEMENTS } from '../../content/achievements';
import { li, t } from '../i18n';
import { toasts, useS } from '../store';
import { CardHead } from './common';

export function AchievementsCard() {
  const unlocked = useS(s => s.ach.join(','));
  const set = new Set(unlocked ? unlocked.split(',') : []);
  return (
    <section class="card" style={{ marginTop: '14px' }}>
      <CardHead title={t('achTitle')} aside={`${set.size} / ${ACHIEVEMENTS.length}`} />
      <div class="ach-list">
        {ACHIEVEMENTS.map(a => {
          const got = set.has(a.id), secret = a.hidden && !got;
          return (
            <div key={a.id} class={'ach' + (got ? ' got' : '')}>
              <span class="ach-ico" aria-hidden="true">{got ? '★' : '☆'}</span>
              <span><b>{secret ? t('achHidden') : a.n[li()]}</b><small>{secret ? t('achHiddenD') : a.d[li()]}</small></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Toasts() {
  const list = toasts.value;
  if (!list.length) return null;
  return (
    <div class="toasts" aria-live="polite">
      {list.map(x => (
        <div key={x.key} class="toast">
          <span class="ach-ico" aria-hidden="true">★</span>
          <span><small>{t('achToast')}</small><b>{ACH[x.id]?.n[li()]}</b></span>
        </div>
      ))}
    </div>
  );
}
