import { stockGrowth } from '../../../systems/workshopStats';
import { piecesInStock, premiumFor, stockPrice } from '../../../systems/inventory';
import { COLORS } from '../../../content/colors';
import { demand, inTrend, realizedPrice, trendOn, unitCost } from '../../../core/formulas';
import { has } from '../../../core/state';
import { MODEL } from '../../../content/models';
import { act, useS } from '../../store';
import { colorName, dur, fmt, li, money, t } from '../../i18n';
import { CardHead, Tile } from '../common';
import { PriceEditor } from '../PriceEditor';
import { salesPick } from './salesPick';

function ColorPicker() {
  const v = useS(s => ({ col: s.col, trend: s.trend, trendT: s.trendT, on: trendOn(s), inT: inTrend(s) }));
  return (
    <div class="colors">
      <div class="crow"><b>{t('colL', colorName(v.col))}</b><span>{v.on ? t('trendIn', colorName(v.trend), dur(v.trendT)) : ''}</span></div>
      <div class="sw">
        {COLORS.map((c, i) => (
          <button key={i} style={{ background: c.c }} aria-pressed={i === v.col} aria-label={c.n[li()]} title={c.n[li()]}
            class={v.on && i === v.trend ? 'hot' : ''} onClick={() => act(`col:${i}`)} />
        ))}
      </div>
      {v.on && <p class={'hint' + (v.inT ? ' good' : '')}>{v.inT ? t('trendYes') : t('trendNo', colorName(v.trend))}</p>}
    </div>
  );
}

export function Sales() {
  const selected = salesPick.value;
  const shop = useS(s => ({
    main: s.mdl, owned: s.mdls, sold: s.sold, auto: has(s, 'autocena') && !!s.amOn.autocena,
    channels: Object.fromEntries(s.mdls.map(id => {
      const m = MODEL[id];
      const inv = piecesInStock(s, id);
      const price = stockPrice(s, id);
      return [id, {
        inv, piecesPerSecond: demand(s, m, price) / m.seconds,
        uc: unitCost(s, m) * m.seconds, price: realizedPrice(s, id) * m.seconds,
        premium: premiumFor(s, id), growth: inv > 0 ? stockGrowth(s, id) : null,
        fast: inv < 1 && s.sold > 0,
      }];
    })),
  }));
  const id = selected && shop.owned.includes(selected) ? selected : shop.main;
  const v = { ...shop, ...shop.channels[id] };
  const loss = v.price < v.uc;
  const hint = loss ? t('hLoss') : v.premium > 0 ? t('qualityPrice', money(v.price)) : v.auto ? t('hAuto') : t('hBase');
  return (
    <section class="card workshop-sales v-s">
      <CardHead title={v.owned.length > 1 ? t('salesOf', MODEL[id].name[li()]) : t('sales')} aside={t('soldT', fmt(v.sold))} />
      {v.owned.length > 1 && <div class="seg" role="group" aria-label={t('salesModel')}>
        {v.owned.map(o => <button key={o} aria-pressed={o === id} onClick={() => { salesPick.value = o; }}>{MODEL[o].name[li()]}</button>)}
      </div>}
      <div class="tiles">
        <Tile label={t('stock')} value={t('statsPiecesSold', fmt(v.inv))} />
        <Tile label={t('buyRateS')} value={t('perS', fmt(v.piecesPerSecond, 1))} />
        <Tile label={t('unitCostS')} value={money(v.uc)} />
      </div>
      <ColorPicker />
      {v.auto
        ? <p class="hint sales-auto-price">{t('salesCurrentPrice', money(v.price))}</p>
        : <PriceEditor id={id} key={id} />}
      <div class="sales-notes">
        <div class="sales-flow">
          {v.growth
            ? <p class="stock-growth">{t('statsStockGrowth', fmt(v.growth.stocked), fmt(v.growth.sold))}</p>
            : v.fast && <p class="hint">{t('hFast')}</p>}
        </div>
        <p class={'hint' + (loss ? ' bad' : '')}>{hint}</p>
      </div>
    </section>
  );
}
