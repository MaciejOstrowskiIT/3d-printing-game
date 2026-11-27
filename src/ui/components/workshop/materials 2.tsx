import { MATERIALS, materialDemand } from '../../../content/materials';
import { material, spoolPrice } from '../../../core/formulas';
import { materialStock } from '../../../systems/materials';
import { act, useS } from '../../store';
import { li, mass, money, t } from '../../i18n';
import { CardHead, Item } from '../common';

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
  const rows = useS(s => MATERIALS.filter(m => s.total >= m.unlockAt).map(m => ({
    material: m, selected: s.materialId === m.id, stock: materialStock(s, m.id),
    price: spoolPrice(s, m) * 1000 / s.spoolG, bonus: materialDemand(m, s.mdl),
  })));
  if (rows.length < 2) return null;

  return (
    <section class="card wide v-p materials">
      <CardHead title={t('materialsTitle')} />
      <AutoMaterialToggle />
      {rows.map(({ material: m, selected, stock, price, bonus }) => (
        <Item key={m.id} name={m.name[li()]} sub={[
          t('materialStock', mass(stock)),
          t('materialPrice', money(price)),
          t('materialDurability', m.durability),
          bonus > 1 ? t('materialMatch', Math.round((bonus - 1) * 100)) : '',
        ].filter(Boolean).join(' · ')}>
          <button aria-pressed={selected} disabled={selected} onClick={() => act(`material:${m.id}`)}>
            {t(selected ? 'mdlOn' : 'materialUse')}
          </button>
        </Item>
      ))}
    </section>
  );
}
