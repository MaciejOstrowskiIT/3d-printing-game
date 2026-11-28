import { BAL } from '../../../content/balance';
import { MATERIAL } from '../../../content/materials';
import { EXTRA_PRINTER_TYPES, type PrinterType } from '../../../content/printerTypes';
import { eff, spoolPrice, typeCost } from '../../../core/formulas';
import { fleetFilamentPerSecond, idlePrinters, poolSize } from '../../../systems/fleet';
import { materialStock } from '../../../systems/materials';
import { curingPieces, typeMissing, typeModels, typeVisible } from '../../../systems/printerTypes';
import { useS } from '../../store';
import { dur, fmt, li, mass, money, nf, nodeName, t } from '../../i18n';
import { BuyButton, CardHead, Item } from '../common';

/** Research node that brings the power supply (farms and panels); types that draw power wait for it. */
const POWER_NODE = 'farma';

/** One printer type other than FDM (content/printerTypes.ts): buying printers, its feedstock, the power and
 *  technician some types need, and the post-processing queue. Printers are split between models on the production
 *  line tiles. */
function PrinterTypeCard({ type }: { type: PrinterType }) {
  const v = useS(s => {
    const feed = MATERIAL[type.material];
    const use = fleetFilamentPerSecond(s, type);
    return {
      zl: s.zl, cost: typeCost(s, type), owned: poolSize(s, type), idle: idlePrinters(s, type),
      missing: typeMissing(s, type), grams: materialStock(s, feed.id), use,
      spool: spoolPrice(s, feed), spoolG: s.spoolG, hired: s.techs.includes(type.id),
      powerOn: s.farmOn, eff: Math.round(eff(s) * 100),
      curing: Math.round(typeModels(s, type).reduce((n, id) => n + curingPieces(s, id), 0)),
    };
  });
  const feed = MATERIAL[type.material];
  const why = v.missing === 'design' ? t('ptNeedDesign')
    : v.missing === 'power' ? t('ptNeedPower', nodeName(POWER_NODE))
    : v.missing === 'technician' ? t('ptNeedTech')
    : t('ptOwned', fmt(v.owned), fmt(v.idle));
  return (
    <section class="card printer-type v-p">
      <CardHead title={type.name[li()]} aside={t('ptCount', fmt(v.owned))} />
      <p class="hint">{type.desc[li()]}</p>
      <p class="hint pt-stats">{t('ptStats', nf(type.detail, 1), nf(type.speed, 1), type.plate[li()])}</p>
      {type.power > 0 && (
        <Item name={t('ptPower')} className={v.powerOn && v.eff < 100 && v.owned > 0 ? 'pt-low' : undefined}
          sub={!v.powerOn ? t('ptNeedPower', nodeName(POWER_NODE))
            : t('ptPowerSub', fmt(type.power), fmt(type.power * v.owned)) + (v.eff < 100 && v.owned > 0 ? ' · ' + t('ptPowerLow', v.eff) : '')}>
          <span />
        </Item>
      )}
      {type.technician > 0 && (
        <Item name={t('ptTech')} sub={t('ptTechSub', Math.round((1 - BAL.technicianBreakdown) * 100))}>
          {v.hired
            ? <span class="pt-hired">{t('ptHired')}</span>
            : <BuyButton action={`tech:${type.id}`} cost={type.technician} have={v.zl} label={money(type.technician)} />}
        </Item>
      )}
      <Item name={t('ptBuy')} sub={why}>
        {v.missing
          ? <button class="buy" disabled>{money(v.cost)}</button>
          : <BuyButton action={`printer:${type.id}`} cost={v.cost} have={v.zl} label={money(v.cost)} />}
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
