import { MATERIALS } from '../../../content/materials';
import { MODELS } from '../../../content/models';
import { piecesInStock } from '../../../systems/inventory';
import { materialStock } from '../../../systems/materials';
import { fmt, li, mass, t } from '../../i18n';
import { useS } from '../../store';

export function StockPanel() {
  const rows = useS(s => MODELS.filter(m => s.mdls.includes(m.id)).map(m => m.id + ':' + piecesInStock(s, m.id)).join(','));
  const list = rows.split(',').filter(Boolean).map(r => r.split(':')).map(([id, n]) => ({ m: MODELS.find(m => m.id === id)!, n: Number(n) }));
  return (
    <section class="pop-body">
      <h2>{t('popStock')}</h2>
      <ul class="pop-list">
        {list.map(({ m, n }) => <li key={m.id} class={n > 0 ? '' : 'zero'}><span>{m.name[li()]}</span><b>{fmt(Math.floor(n))}</b></li>)}
      </ul>
    </section>
  );
}

export function FilamentPanel() {
  const rows = useS(s => MATERIALS.filter(m => m.id === s.materialId || materialStock(s, m.id) > 0).map(m => m.id + ':' + materialStock(s, m.id)).join(','));
  const active = useS(s => s.materialId);
  const list = rows.split(',').filter(Boolean).map(r => r.split(':')).map(([id, g]) => ({ m: MATERIALS.find(m => m.id === id)!, g: Number(g) }));
  return (
    <section class="pop-body">
      <h2>{t('popFil')}</h2>
      <ul class="pop-list">
        {list.map(({ m, g }) => <li key={m.id} class={m.id === active ? 'active' : ''}>
          <span>{m.name[li()]}{m.id === active && <small>{t('popFilActive')}</small>}</span><b>{mass(g)}</b>
        </li>)}
      </ul>
    </section>
  );
}
