import { BAL } from '../../content/balance';
import { COLORS } from '../../content/colors';
import { AUTOMATIONS, NODE } from '../../content/tree';
import {
  autoCost, demand, drawP, droneCost, eff, fabCost, farmCost, inTrend, mktCost, panelCost, rate1, spaceRate, spoolPrice, supply, trendOn, unitCost,
} from '../../core/formulas';
import { has } from '../../core/state';
import { boostUnlocked } from '../../systems/boost';
import { canAfford } from '../../systems/marketEvents';
import { MARKET_EVENT } from '../../content/events';
import { platform } from '../platform';
import { act, adPending, useS, watchAdForBoost } from '../store';
import { clock, colorName, dict, dur, fmt, li, money, nf, t } from '../i18n';
import { BuyButton, CardHead, Item, Meter, Tile, useHold } from './common';
import { PrestigeCard } from './Prestige';

/** A market event offer (content/events.ts) with its price, countdown and a take-it-or-leave-it choice. */
function MarketOffer() {
  const m = useS(s => (s.ph === 1 && s.mev ? { ...s.mev, ok: canAfford(s) } : null));
  if (!m) return null;
  const e = MARKET_EVENT[m.id];
  if (!e?.offer) return null;
  const cost = money(m.cost);
  return (
    <div class={'ev' + (e.counter ? ' bad' : '')}>
      <div class="evt">
        <b>{e.name[li()]}</b>
        <p>{e.desc[li()].replace('{0}', cost)} {t('mevExp', Math.ceil(m.offer))}</p>
        <Meter tone="or" pct={(100 * m.offer) / BAL.marketEventOffer} />
      </div>
      <div class="evb">
        <button class="btn-main" disabled={!m.ok} onClick={() => act('mevyes')}>{e.offer.btn[li()]}</button>
        <button onClick={() => act('mevno')}>{t('decline')}</button>
      </div>
    </div>
  );
}

/** Running market effects as small chips with a countdown; red when the effect hurts. */
function MarketEffects() {
  const fx = useS(s => (s.ph === 1 ? s.mfx.map(f => `${f.id}:${Math.ceil(f.t)}`).join(',') : ''));
  if (!fx) return null;
  return (
    <div class="mfx" aria-label={t('fxTitle')}>
      {fx.split(',').map(item => {
        const [id, left] = item.split(':');
        const e = MARKET_EVENT[id];
        if (!e) return null;
        const bad = (e.demand ?? 1) < 1 || (e.spool ?? 1) > 1;
        return (
          <span key={id} class={'mchip' + (bad ? ' bad' : '')} title={e.desc[li()].replace('{0}', '…')}>
            {e.name[li()]} · {t('fxLeft', clock(+left))}
          </span>
        );
      })}
    </div>
  );
}

function Events() {
  const o = useS(s => (s.ph === 1 && s.ord ? { ...s.ord } : null));
  const brk = useS(s => (s.ph === 1 && s.brk > 0 ? { brk: s.brk, c: s.brkC, fixT: s.fixT, cam: has(s, 'kamera') && !!s.amOn.kamera } : null));
  const market = useS(s => s.ph === 1 && (!!s.mev || s.mfx.length > 0));
  if (!o && !brk && !market) return null;
  return (
    <div class="events">
      <MarketEffects />
      <MarketOffer />
      {o && (
        <div class="ev">
          <div class="evt">
            <b>{t('oFrom', dict().clients[o.c])}</b>
            <p>{o.acc ? t('oProg', fmt(o.got), fmt(o.n), fmt(Math.ceil(o.left)), money(o.pay)) : t('oOffer', fmt(o.n), fmt(o.time), money(o.pay), fmt(Math.ceil(o.offer)))}</p>
            <Meter tone="or" pct={o.acc ? (100 * o.got) / o.n : (100 * o.offer) / BAL.orderOffer} />
            {o.acc && <p class="hint">{t('oHint')}</p>}
          </div>
          {!o.acc && (
            <div class="evb">
              <button class="btn-main" onClick={() => act('oacc')}>{t('accept')}</button>
              <button onClick={() => act('odec')}>{t('decline')}</button>
            </div>
          )}
        </div>
      )}
      {brk && (
        <div class="ev bad">
          <div class="evt">
            <b>{t('brkTitle')}</b>
            <p>{t('bDesc', Math.round(brk.brk * 100), dict().causes[brk.c])}{brk.cam ? ' ' + t('bAuto', Math.ceil(Math.max(0, brk.fixT))) : ''}</p>
          </div>
          {!brk.cam && <button class="btn-main" onClick={() => act('fix')}>{t('repair')}</button>}
        </div>
      )}
    </div>
  );
}

/** Rewarded "overtime" boost. Shown only where the platform can serve rewarded ads. */
function BoostRow() {
  const v = useS(s => ({ show: boostUnlocked(s), on: s.boostT > 0, left: s.boostT, cd: s.boostCd }));
  if (!platform.rewardedAvailable || !v.show) return null;
  const pending = adPending.value;
  const sub = v.on ? t('boostOn', clock(v.left)) : v.cd > 0 ? t('boostCd', clock(v.cd)) : t('boostSub');
  return (
    <div class={'item boost' + (v.on ? ' active' : '')}>
      <div class="it"><b>{t('boostItem')}</b><small>{sub}</small></div>
      <button class="buy ok" disabled={v.on || v.cd > 0 || pending} onClick={() => void watchAdForBoost()}>
        {pending ? t('boostWait') : t('boostBtn')}
      </button>
    </div>
  );
}

function Production() {
  const v = useS(s => ({
    rate: rate1(s), fil: s.fil, g: s.g, printers: s.auto + s.farm * 60, zl: s.zl, bulk: s.spoolG > 1000, spool: spoolPrice(s), spoolD: s.spoolD,
    goal: s.goal, auto: s.auto, spd: s.spd, autoCost: autoCost(s), farmOn: s.farmOn, farm: s.farm, farmCost: farmCost(s),
  }));
  const spoolSub = !v.spoolD ? t('spoolSub') : t(v.spoolD > 0 ? 'spoolUp' : 'spoolDn', Math.abs(Math.round(v.spoolD * 100)));
  return (
    <section class="card">
      <CardHead title={t('production')} aside={t('perS', fmt(v.rate, 1))} />
      <div class="tiles">
        <Tile label={t('filament')} value={fmt(v.fil) + ' g'} warn={v.fil < v.g} />
        <Tile label={t('perFigS')} value={nf(v.g, 1) + ' g'} />
        <Tile label={t('printersS')} value={fmt(v.printers)} />
      </div>
      <BoostRow />
      <Item name={t(v.bulk ? 'spool5Item' : 'spoolItem')} sub={spoolSub}>
        <BuyButton action="spool" cost={v.spool} have={v.zl} label={money(v.spool)} />
      </Item>
      {v.goal >= 2 && (
        <Item name={t('autoItem')} sub={t('autoSub', fmt(v.auto), nf(v.spd, 2))}>
          <BuyButton action="auto" cost={v.autoCost} have={v.zl} label={money(v.autoCost)} />
        </Item>
      )}
      {v.farmOn && (
        <Item name={t('farmItem')} sub={t('farmSub', fmt(v.farm))}>
          <BuyButton action="farm" cost={v.farmCost} have={v.zl} label={money(v.farmCost)} />
        </Item>
      )}
    </section>
  );
}

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

function PriceStepper() {
  const price = useS(s => s.price);
  const minus = useHold('pminus'), plus = useHold('pplus');
  return (
    <div class="stepper">
      <button aria-label="−" {...minus}>−</button>
      <div class="pv"><small>{t('price')}</small><b>{money(price)}</b></div>
      <button aria-label="+" {...plus}>+</button>
    </div>
  );
}

function Sales() {
  const v = useS(s => ({
    sold: s.sold, inv: s.inv, dem: demand(s), uc: unitCost(s), price: s.price, auto: has(s, 'autocena') && !!s.amOn.autocena,
    slow: rate1(s) > demand(s) * 1.1, fast: s.inv < 1 && s.sold > 0, goal: s.goal, mkt: s.mkt, mktCost: mktCost(s), zl: s.zl,
  }));
  const loss = v.price < v.uc;
  const hint = loss ? t('hLoss') : v.auto ? t('hAuto') : v.slow ? t('hSlow') : v.fast ? t('hFast') : t('hBase');
  return (
    <section class="card">
      <CardHead title={t('sales')} aside={t('soldT', fmt(v.sold))} />
      <div class="tiles">
        <Tile label={t('stock')} value={fmt(Math.floor(v.inv))} />
        <Tile label={t('buyRateS')} value={t('perS', fmt(v.dem, 1))} />
        <Tile label={t('unitCostS')} value={money(v.uc)} />
      </div>
      <ColorPicker />
      {!v.auto && <PriceStepper />}
      <p class={'hint' + (loss ? ' bad' : '')}>{hint}</p>
      {v.goal >= 4 && (
        <Item name={t('mktItem')} sub={t('mktSub', v.mkt)}>
          <BuyButton action="mkt" cost={v.mktCost} have={v.zl} label={money(v.mktCost)} />
        </Item>
      )}
    </section>
  );
}

function Energy() {
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

function Space() {
  const v = useS(s => ({
    mat: s.mat, mat0: s.mat0, ft: s.ft, rate: spaceRate(s), inv: s.inv, drones: s.drones, fabs: s.fabs,
    dRate: BAL.droneMining * s.dMul, fRate: BAL.fabThroughput * s.fMul, dCost: droneCost(s), fCost: fabCost(s),
  }));
  const pct = 100 * (1 - v.mat / v.mat0);
  return (
    <section class="card">
      <CardHead title={t('belt')} aside={t('pct', nf(pct, pct < 1 ? 3 : 1))} />
      <Meter tone="or" pct={pct} style={{ margin: '0 0 10px' }} />
      <div class="tiles">
        <Tile label={t('matLeft')} value={fmt(v.mat, 1) + ' t'} />
        <Tile label={t('storage')} value={fmt(v.ft, 2) + ' t'} />
        <Tile label={t('mining')} value={t('perS', fmt(v.rate))} />
      </div>
      <BoostRow />
      <Item name={t('droneItem')} sub={t('droneSub', fmt(v.drones), fmt(v.dRate, 1))}>
        <BuyButton action="drone" cost={v.dCost} have={v.inv} label={t('figs', fmt(v.dCost))} />
      </Item>
      <Item name={t('fabItem')} sub={t('fabSub', fmt(v.fabs), fmt(v.fRate, 1))}>
        <BuyButton action="fab" cost={v.fCost} have={v.inv} label={t('figs', fmt(v.fCost))} />
      </Item>
      <p class="hint">{t('spaceHint')}</p>
    </section>
  );
}

function Automation() {
  const list = useS(s => AUTOMATIONS.filter(id => has(s, id)).map(id => id + (s.amOn[id] ? '+' : '-')).join(','));
  if (!list) return null;
  return (
    <section class="card wide">
      <CardHead title={t('automation')} aside={t('amHint')} />
      <div class="am-list">
        {list.split(',').map(x => {
          const id = x.slice(0, -1), checked = x.endsWith('+');
          return (
            <label class="am" key={id}>
              <input type="checkbox" checked={checked} onChange={e => act(`am:${id}:${(e.currentTarget as HTMLInputElement).checked ? 1 : 0}`)} />
              <span><b>{NODE[id].n[li()]}</b><small>{NODE[id].d[li()]}</small></span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export function Workshop() {
  const v = useS(s => ({ sp: s.ph === 2, g: s.goal, farmOn: s.farmOn }));
  return (
    <div>
      <Events />
      <div class="grid">
        {!v.sp && <Production />}
        {!v.sp && v.g >= 1 && <Sales />}
        {!v.sp && v.farmOn && <Energy />}
        {v.sp && <Space />}
        {v.sp && <PrestigeCard />}
        <Automation />
      </div>
    </div>
  );
}
