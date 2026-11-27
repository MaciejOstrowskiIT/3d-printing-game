import { useEffect, useRef, useState } from 'preact/hooks';
import { GOALS } from '../../content/goals';
import { MODEL } from '../../content/models';
import { PATENT } from '../../content/patents';
import { patentPreview, runSummary, type RunSummary } from '../../systems/runSummary';
import { fmt, li, money, playtime, t } from '../i18n';
import { shareText } from '../runShare';
import { useS } from '../store';
import { showValue } from './common';

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div class="run-stat"><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>
);

/** Line totals: play time, prints, money earned, best model and goals. */
export function RunStats({ r }: { r: RunSummary }) {
  const best = r.best ? MODEL[r.best.id] : null;
  return (
    <div class="run-stats">
      <Stat label={t('linePlaytime')} value={playtime(r.play)} sub={`${t('totalPlaytime')} ${playtime(r.totalPlay)}`} />
      <Stat label={t('sumPrints')} value={fmt(r.prints)} sub={`${t('sumSold')} ${fmt(r.sold)}`} />
      <Stat label={t('sumEarned')} value={money(r.earned)} />
      <Stat label={t('sumBest')} value={best ? best.name[li()] : t('sumBestNone')} sub={r.best ? t('sumBestOf', money(r.best.revenue)) : undefined} />
      <Stat label={t('sumGoals')} value={t('sumGoalsOf', r.goals.length, GOALS.length)} />
    </div>
  );
}

/** Every reached goal with the line time it was reached at. */
export function GoalsTimeline({ r }: { r: RunSummary }) {
  if (!r.goals.length) return null;
  return (
    <section class="run-block">
      <h3>{t('sumTimeline')}</h3>
      <ol class="run-timeline">
        {r.goals.map(g => (
          <li key={g.index}>
            <time>{g.at == null ? t('sumEarlier') : playtime(g.at)}</time>
            <span>{GOALS[g.index].t[li()]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const PREVIEW_MAX = 4;

/** What the patents of a new line could buy: the call to action for prestige. */
export function PatentPreview() {
  const v = useS(s => ({ gain: runSummary(s).patents, have: s.meta.patents, picks: patentPreview(s) }));
  const shown = v.picks.slice(0, PREVIEW_MAX);
  return (
    <div class="run-next">
      <p class="hint">{v.picks.length ? t('sumNextDesc', fmt(v.gain), fmt(v.have + v.gain)) : t('sumNextNone')}</p>
      {shown.length > 0 && (
        <ul class="run-picks">
          {shown.map(p => {
            const pat = PATENT[p.id];
            return (
              <li key={p.id}>
                <b>{pat.n[li()]} <span class="lvl">{t('patLvl', p.level, pat.max)}</span></b>
                <small>{pat.d[li()].replace('{0}', showValue(pat.show(p.level, li())))}</small>
                <em>{t('patCost', p.cost)}</em>
              </li>
            );
          })}
        </ul>
      )}
      {v.picks.length > PREVIEW_MAX && <p class="hint run-more">{t('sumNextMore', v.picks.length - PREVIEW_MAX)}</p>}
    </div>
  );
}

/** The shareable text and a Copy button; if the clipboard is blocked, the text is selected for a manual copy. */
export function ShareSummary({ r }: { r: RunSummary }) {
  const text = shareText(r);
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => { if (state !== 'copied') return; const id = setTimeout(() => setState('idle'), 2000); return () => clearTimeout(id); }, [state]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState('copied'); }
    catch { if (ref.current) getSelection()?.selectAllChildren(ref.current); setState('failed'); }
  };
  return (
    <section class="run-block run-share">
      <h3>{t('sumShare')}</h3>
      <pre ref={ref} class="run-share-text">{text}</pre>
      <div class="run-share-row">
        <button onClick={copy}>{state === 'copied' ? t('sumCopied') : t('sumCopy')}</button>
        <span class="hint" role="status">{state === 'failed' ? t('sumCopyFail') : ''}</span>
      </div>
    </section>
  );
}
