import { useEffect, useState } from 'preact/hooks';
import { BAL } from '../../content/balance';
import { PATENTS } from '../../content/patents';
import { canPrestige, nextPatentAt, patentsFor } from '../../core/prestige';
import { patLvl } from '../../core/state';
import { fmt, li, money, t } from '../i18n';
import { act, useS } from '../store';
import { CardHead } from './common';

/** Two-click confirmation for the reset button. */
function usePrestigeButton(action: 'prestige' | 'prestigeR') {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const id = setTimeout(() => setSure(false), 4000); return () => clearTimeout(id); }, [sure]);
  return { sure, click: () => { if (sure) { act(action); setSure(false); } else setSure(true); } };
}

/** Starts a new line; with `realistic`, a realistic one (the challenge). Two clicks to confirm. */
export function PrestigeButton({ class: cls = 'btn-main', realistic = false }: { class?: string; realistic?: boolean }) {
  const v = useS(s => ({ can: canPrestige(s), gain: patentsFor(s) }));
  const b = usePrestigeButton(realistic ? 'prestigeR' : 'prestige');
  const label = t(realistic ? 'prBtnR' : 'prBtn', fmt(v.gain));
  return <button class={cls} disabled={!v.can} onClick={b.click}>{b.sure ? t('prSure') : label}</button>;
}

/** Offered in the space phase: start over with permanent patents. */
export function PrestigeCard() {
  const v = useS(s => ({ gain: patentsFor(s), next: nextPatentAt(s), real: (s.slow || 1) > 1 }));
  return (
    <section class="card wide prestige">
      <CardHead title={t('prTitle')} aside={v.real ? t('prRealNow', BAL.realisticPatentMult) : undefined} />
      <p class="hint" style={{ marginTop: 0 }}>{t('prDesc', fmt(v.gain))} {t('prKeep')}</p>
      <p class="hint">{t('prMore', fmt(v.next))}</p>
      <div class="ctl"><PrestigeButton /></div>
      <div class="real-offer">
        <b>{t('prReal')}</b>
        <p class="hint">{t('prRealDesc', BAL.realisticSlow, BAL.realisticOfflineMax / 3600, BAL.realisticPatentMult)}</p>
        <div class="ctl"><PrestigeButton class="" realistic /></div>
      </div>
    </section>
  );
}

const showValue = (v: string | { money: number }) => (typeof v === 'string' ? v : money(v.money));

/** Permanent upgrades bought with patents. */
export function PatentsCard() {
  const v = useS(s => ({
    show: s.ph === 2 || s.meta.runs > 0 || s.meta.patents > 0,
    patents: s.meta.patents,
    levels: PATENTS.map(p => patLvl(s, p.id)).join(','),
  }));
  if (!v.show) return null;
  const levels = v.levels.split(',').map(Number);
  return (
    <section class="card" style={{ marginTop: '14px' }}>
      <CardHead title={t('patTitle')} aside={t('patAvail', fmt(v.patents))} />
      <p class="hint" style={{ margin: '0 0 10px' }}>{t('patHint')}</p>
      <div class="pat-list">
        {PATENTS.map((p, i) => {
          const lvl = levels[i], maxed = lvl >= p.max, cost = p.cost(lvl), ok = !maxed && v.patents >= cost;
          return (
            <div class="item pat" key={p.id}>
              <div class="it">
                <b>{p.n[li()]} <span class="lvl">{t('patLvl', lvl, p.max)}</span></b>
                <small>{p.d[li()].replace('{0}', showValue(p.show(maxed ? lvl : lvl + 1, li())))}</small>
              </div>
              <button class={'buy' + (ok ? ' ok' : '')} disabled={!ok} onClick={() => act(`pat:${p.id}`)}>
                {maxed ? t('patMax') : t('patCost', cost)}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
