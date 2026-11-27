import { fmt, t } from '../i18n';
import { runSummary } from '../../systems/runSummary';
import { resetGame, useS } from '../store';
import { PrestigeButton } from './Prestige';
import { GoalsTimeline, PatentPreview, RunStats, ShareSummary } from './RunSummary';

/** The end screen: the run summary, the patents a new line would bring, and a shareable result. */
export function End() {
  const r = useS(s => (s.end ? runSummary(s) : null));
  if (!r) return null;
  return (
    <div class="end" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div class="end-box">
        <h2 id="end-title">{t('endTitle')}</h2>
        <p>{t('endTxt', fmt(r.prints))}</p>
        <section class="run-block">
          <h3>{t('sumTitle')} · {t(r.realistic ? 'sumLineR' : 'sumLine', r.line)}</h3>
          <RunStats r={r} />
        </section>
        <section class="run-block run-cta">
          <h3>{t('sumNext')}</h3>
          <PatentPreview />
          <div class="end-actions">
            <PrestigeButton class="btn-main big" />
            <PrestigeButton class="big" realistic />
          </div>
        </section>
        <GoalsTimeline r={r} />
        <ShareSummary r={r} />
        <div class="end-actions"><button onClick={() => resetGame('again')}>{t('again')}</button></div>
      </div>
    </div>
  );
}
