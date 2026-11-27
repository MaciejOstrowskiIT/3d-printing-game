import { BAL } from '../../../content/balance';
import { droneCost, fabCost, spaceRate } from '../../../core/formulas';
import { useS } from '../../store';
import { fmt, nf, t } from '../../i18n';
import { BuyButton, CardHead, Item, Meter, Tile } from '../common';
import { BoostRow } from './investments';
import { tone } from './productionLine';

export function Space() {
  const v = useS(s => ({
    mat: s.mat, mat0: s.mat0, ft: s.ft, rate: spaceRate(s), inv: s.inv, drones: s.drones, fabs: s.fabs,
    dRate: BAL.droneMining * s.dMul, fRate: BAL.fabThroughput * s.fMul, dCost: droneCost(s), fCost: fabCost(s),
  }));
  const pct = 100 * (1 - v.mat / v.mat0);
  return (
    <section class="card space-belt">
      <CardHead title={t('belt')} aside={t('pct', nf(pct, pct < 1 ? 3 : 1))} />
      <Meter tone="or" pct={pct} style={{ margin: '0 0 10px' }} />
      <div class="tiles">
        <Tile label={t('matLeft')} value={fmt(v.mat, 1) + ' t'} />
        <Tile label={t('storage')} value={fmt(v.ft, 2) + ' t'} />
        <Tile label={t('mining')} value={t('perS', fmt(v.rate))} />
      </div>
      <BoostRow />
      <Item name={t('droneItem')} sub={t('droneSub', fmt(v.drones), fmt(v.dRate, 1))}>
        <BuyButton action="drone" cost={v.dCost} have={v.inv} label={t('figs', fmt(v.dCost))} unit={n => t('figs', fmt(n))} />
      </Item>
      <Item name={t('fabItem')} sub={t('fabSub', fmt(v.fabs), fmt(v.fRate, 1))}>
        <BuyButton action="fab" cost={v.fCost} have={v.inv} label={t('figs', fmt(v.fCost))} unit={n => t('figs', fmt(n))} />
      </Item>
      <p class="hint">{t('spaceHint')}</p>
    </section>
  );
}
