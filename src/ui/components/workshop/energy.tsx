import { drawP, eff, panelCost, supply } from '../../../core/formulas';
import { useS } from '../../store';
import { fmt, money, t } from '../../i18n';
import { BuyButton, CardHead, Item, Meter, Tile } from '../common';

export function Energy() {
  const v = useS(s => ({ sup: supply(s), drw: drawP(s), pan: s.panels, e: eff(s), cost: panelCost(s), zl: s.zl }));
  const low = v.e < 1;
  return (
    <section class="card">
      <CardHead title={t('power')} aside={t('effT', Math.round(v.e * 100))} />
      <div class="tiles">
        <Tile label={t('supplyS')} value={fmt(v.sup) + ' kW'} />
        <Tile label={t('drawS')} value={fmt(v.drw) + ' kW'} />
        <Tile label={t('panelsS')} value={fmt(v.pan)} />
      </div>
      <Meter pct={100 * v.e} tone={low ? 'bad' : undefined} />
      <p class={'hint' + (low ? ' bad' : '')}>{low ? t('enLow', Math.round(v.e * 100)) : t('enOk')}</p>
      <Item name={t('panelItem')} sub={t('panelSub')}>
        <BuyButton action="panel" cost={v.cost} have={v.zl} label={money(v.cost)} />
      </Item>
      <p class="hint">{t('enInfo')}</p>
    </section>
  );
}
