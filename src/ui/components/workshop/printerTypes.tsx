import { MATERIAL } from '../../../content/materials';
import { EXTRA_PRINTER_TYPES, type PrinterType } from '../../../content/printerTypes';
import { spoolPrice, typeCost } from '../../../core/formulas';
import { fleetFilamentPerSecond, idlePrinters, poolSize } from '../../../systems/fleet';
import { materialStock } from '../../../systems/materials';
import { curingPieces, typeModels, typeVisible } from '../../../systems/printerTypes';
import { useS } from '../../store';
import { dur, fmt, li, mass, money, nf, t } from '../../i18n';
import { BuyButton, CardHead, Item } from '../common';

/** One printer type other than FDM (content/printerTypes.ts): buying printers, its feedstock and the
 *  post-processing queue. Printers are split between models on the production line tiles. */
function PrinterTypeCard({ type }: { type: PrinterType }) {
  const v = useS(s => {
    const feed = MATERIAL[type.material];
    const use = fleetFilamentPerSecond(s, type);
    return {
      zl: s.zl, cost: typeCost(s, type), owned: poolSize(s, type), idle: idlePrinters(s, type),
      designs: typeModels(s, type).length, grams: materialStock(s, feed.id), use,
      spool: spoolPrice(s, feed), spoolG: s.spoolG,
      curing: Math.round(typeModels(s, type).reduce((n, id) => n + curingPieces(s, id), 0)),
    };
  });
  const feed = MATERIAL[type.material];
  return (
    <section class="card printer-type v-p">
      <CardHead title={type.name[li()]} aside={t('ptCount', fmt(v.owned))} />
      <p class="hint">{type.desc[li()]}</p>
      <p class="hint pt-stats">{t('ptStats', nf(type.detail, 1), nf(type.speed, 1))}</p>
      <Item name={t('ptBuy')} sub={v.designs ? t('ptOwned', fmt(v.owned), fmt(v.idle)) : t('ptNeedDesign')}>
        {v.designs
          ? <BuyButton action={`printer:${type.id}`} cost={v.cost} have={v.zl} label={money(v.cost)} />
          : <button class="buy" disabled>{money(v.cost)}</button>}
      </Item>
      {v.owned > 0 && (
        <Item name={feed.name[li()]} sub={v.use > 0 ? t('ptFeed', mass(v.grams), dur(Math.max(1, Math.round(v.grams / v.use)))) : t('ptFeedIdle', mass(v.grams))}>
          <BuyButton action={`spool:${feed.id}`} cost={v.spool} have={v.zl} label={t('materialBuy', mass(v.spoolG), money(v.spool))} />
        </Item>
      )}
      {v.owned > 0 && type.cure > 0 && (
        <Item name={t('ptCuring')} sub={t('ptCuringSub', fmt(v.curing), fmt(type.cure))}><span /></Item>
      )}
    </section>
  );
}

/** Cards for the printer types the player can see; none before the first one unlocks. */
export function PrinterTypes() {
  const shown = useS(s => EXTRA_PRINTER_TYPES.filter(type => typeVisible(s, type)).map(type => type.id).join(','));
  if (!shown) return null;
  return <>{EXTRA_PRINTER_TYPES.filter(type => shown.split(',').includes(type.id)).map(type => <PrinterTypeCard key={type.id} type={type} />)}</>;
}
