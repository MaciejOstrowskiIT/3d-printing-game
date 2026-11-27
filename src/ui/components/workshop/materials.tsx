import { MATERIALS, materialDemand } from '../../../content/materials';
import { spoolPrice } from '../../../core/formulas';
import { act, useS } from '../../store';
import { li, mass, money, t } from '../../i18n';
import { BuyButton, CardHead, Item } from '../common';

function AutoMaterialToggle() {
  const on = useS(s => s.autoMat);
  return (
    <label class="am auto-mat">
      <input type="checkbox" checked={on} onChange={() => act('automat')} />
      <span>{t('autoMatL')}</span>
    </label>
  );
}

export function Materials() {
  const { rows, grams, funds } = useS(s => ({
    grams: s.spoolG,
    funds: s.zl,
    rows: MATERIALS.filter(m => s.total >= m.unlockAt).map(m => ({
      material: m, selected: s.materialId === m.id,
      cost: spoolPrice(s, m), bonus: materialDemand(m, s.mdl),
    })),
  }));
  if (rows.length < 2) return null;

  return (
    <section class="card wide v-p materials">
      <CardHead title={t('materialsTitle')} />
      <AutoMaterialToggle />
      {rows.map(({ material: m, selected, cost, bonus }) => (
        <Item key={m.id} name={m.name[li()]} sub={[
          t('materialPrice', money(cost * 1000 / grams)),
          t('materialMatch', Math.round((bonus - 1) * 100)),
        ].join(' · ')}>
          <div class="material-actions" role="group" aria-label={m.name[li()]}>
            <BuyButton action={`spool:${m.id}`} cost={cost} have={funds} label={t('materialBuy', mass(grams), money(cost))} />
            <button aria-pressed={selected} disabled={selected} onClick={() => act(`material:${m.id}`)}>
              {t(selected ? 'mdlOn' : 'materialUse')}
            </button>
          </div>
        </Item>
      ))}
    </section>
  );
}
