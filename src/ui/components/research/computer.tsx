import { freePts, opsCap, opsRate, repNext, repPrev } from '../../../core/formulas';
import { fmt, t } from '../../i18n';
import { act, useS } from '../../store';
import { CardHead, Meter } from '../common';

export function Computer() {
  const v = useS(s => ({
    fp: freePts(s), proc: s.proc, mem: s.mem, ops: s.ops, cap: opsCap(s), rate: opsRate(s), next: repNext(s),
    repPct: Math.min(100, (100 * (s.total - repPrev(s))) / (repNext(s) - repPrev(s))),
  }));
  const noPts = v.fp < 1;
  return (
    <section class="card">
      <CardHead title={t('computer')} aside={t('opsRate', fmt(v.rate))} />
      <div class="comp">
        <div class="cell"><small>{t('freePts')}</small><div class="cv"><b>{fmt(v.fp)}</b></div><Meter pct={v.repPct} /></div>
        <div class="cell"><small>{t('procs')}</small><div class="cv"><b>{fmt(v.proc)}</b><span class="pts">
          <button disabled={noPts} onClick={() => act('proc1')}>+1</button><button disabled={noPts} onClick={() => act('procmax')}>{t('all')}</button></span></div></div>
        <div class="cell"><small>{t('mem')}</small><div class="cv"><b>{fmt(v.mem)}</b><span class="pts">
          <button disabled={noPts} onClick={() => act('mem1')}>+1</button><button disabled={noPts} onClick={() => act('memmax')}>{t('all')}</button></span></div></div>
        <div class="cell compute-cell"><small>{t('compute')}</small><div class="cv"><b>{fmt(Math.floor(v.ops))} / {fmt(v.cap)}</b></div><Meter pct={(100 * v.ops) / v.cap} /></div>
      </div>
      <p class="hint">{t('repNext', fmt(v.next))}</p>
    </section>
  );
}
