import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { primaryRate, secondaryRate, splitUnlocked } from '../../systems/fleet';
import { stockGrowth } from '../../systems/workshopStats';
import { piecesInStock, premiumFor, stockPrice } from '../../systems/inventory';
import { BAL } from '../../content/balance';
import { MATERIAL, MATERIALS, materialDemand } from '../../content/materials';
import { ResearchPreview } from './Research';
import { useResearchUnlocked } from './Hud';
import { COLORS } from '../../content/colors';
import { AUTOMATIONS, NODE } from '../../content/tree';
import {
  autoCost, clickCost, clickPower, demand, drawP, gpu, material, model, droneCost, eff, fabCost, farmCost, inTrend, mktCost, panelCost, rate1, realizedPrice, spaceRate, spoolPrice, supply, trendOn, unitCost,
} from '../../core/formulas';
import { has, type GameState } from '../../core/state';
import { boostUnlocked } from '../../systems/boost';
import { canAfford } from '../../systems/marketEvents';
import { MARKET_EVENT } from '../../content/events';
import { STORY_MSG } from '../../content/story';
import { CALENDAR_EVENT, calendarOn } from '../../content/calendar';
import { MODEL, MODELS, type PrintModel } from '../../content/models';
import { qualityUnlocked } from '../../systems/printQuality';
import { materialStock } from '../../systems/materials';
import { autobuyOn, filamentRunway, stockedAlternative } from '../../systems/filament';
import { designCost, designVisible } from '../../systems/models';
import { platform } from '../platform';
import { act, game, adPending, useS, watchAdForBoost } from '../store';
import { clock, colorName, dict, dur, fmt, li, money, nf, t } from '../i18n';
import { BuyButton, CardHead, Item, Meter, Tile, useHold } from './common';
import { WorkshopStats } from './WorkshopStats';
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
  const cal = useS(s => (s.ph === 1 ? calendarOn(s.today).map(e => e.id).join(',') : ''));
  if (!fx && !cal) return null;
  return (
    <div class="mfx" aria-label={t('fxTitle')}>
      {cal && cal.split(',').map(id => {
        const e = CALENDAR_EVENT[id];
        return <span key={id} class="mchip cal" title={e.desc[li()]}>📅 {e.name[li()]}</span>;
      })}
      {fx && fx.split(',').map(item => {
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

/** Order of the day: ship from stock any time today; days in a row raise the pay. */
function DailyOrderCard() {
  const d = useS(s => (s.ph === 1 && s.dord && s.dord.day === s.dday ? { ...s.dord, inv: s.inv, streak: s.dstreak } : null));
  if (!d) return null;
  const client = dict().clients[d.c] ?? '';
  const streakShown = d.done ? d.streak : d.streak + 1;
  return (
    <div class={'ev daily' + (d.done ? ' done' : '')}>
      <div class="evt">
        <b>{t('dTitle')} <span class="dstreak">{t('dStreak', streakShown)}</span></b>
        <p>{d.done ? t('dDoneTxt') : t('dDesc', client, fmt(d.n), money(d.pay))}</p>
        {!d.done && <Meter tone="or" pct={Math.min(100, (100 * d.inv) / d.n)} />}
        {!d.done && <small>{t('dNeed', fmt(Math.floor(d.inv)), fmt(d.n))}</small>}
      </div>
      {!d.done && <div class="evb"><button class="btn-main" disabled={d.inv < d.n} onClick={() => act('daily')}>{t('dBtn', fmt(d.n))}</button></div>}
    </div>
  );
}

/** The open story message (content/story.ts), dismissed with OK. */
function StoryCard() {
  const id = useS(s => s.msg);
  const m = id ? STORY_MSG[id] : null;
  if (!m) return null;
  return (
    <div class="ev story" role="status">
      <div class="evt"><b>✉️ {m.from[li()]}</b><p>{m.text[li()]}</p></div>
      <div class="evb"><button onClick={() => act('msgok')}>{t('msgOk')}</button></div>
    </div>
  );
}

function filamentNotice(s: GameState) {
  if (s.ph !== 1 || s.total === 0) return null;
  const out = s.fil < gpu(s), runway = filamentRunway(s);
  if (!out && (runway >= BAL.filamentWarnSeconds || autobuyOn(s))) return null;
  const alt = out ? stockedAlternative(s) : null;
  return { out, runway, mat: material(s).name[li()], alt, altG: alt ? materialStock(s, alt) : 0 };
}

function Events() {
  const o = useS(s => (s.ph === 1 && s.ord ? { ...s.ord } : null));
  const brk = useS(s => (s.ph === 1 && s.brk > 0 ? { brk: s.brk, c: s.brkC, fixT: s.fixT, cam: has(s, 'kamera') && !!s.amOn.kamera } : null));
  const market = useS(s => s.ph === 1 && (!!s.mev || s.mfx.length > 0 || calendarOn(s.today).length > 0));
  const daily = useS(s => s.ph === 1 && !!s.dord && s.dord.day === s.dday);
  const msg = useS(s => !!s.msg);
  const filament = useS(s => !!filamentNotice(s));
  const count = Number(!!o) + Number(!!brk) + Number(market) + Number(daily) + Number(msg) + Number(filament);
  const notice = brk ? t('brkTitle') : filament ? t('workshopNoticeFilament') : o ? t('workshopNoticeOrder')
    : msg ? t('workshopNoticeMessage') : daily ? t('dTitle') : market ? t('fxTitle') : '';
  return (
    <details class="workshop-notices">
      <summary>
        <span>{t('workshopNotices')}</span>
        <span class="workshop-notice-status" aria-live="polite">
          {count > 0 && <><span class="workshop-notice-name">{notice}</span><b>{count}</b></>}
        </span>
      </summary>
      <div class="workshop-notice-body" tabIndex={0} role="region" aria-label={t('workshopNotices')}>
        {count ? <div class="events">
          <FilamentAlert />
          <StoryCard />
          <DailyOrderCard />
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
        </div> : <p class="hint">{t('workshopNoNotices')}</p>}
      </div>
    </details>
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

/** Filament about to run out, or out: how long it lasts, and a one-click switch to a material still in stock. */
function FilamentAlert() {
  const v = useS(filamentNotice);
  if (!v) return null;
  return (
    <div class={'fil-alert' + (v.out ? ' out' : '')} role="status">
      <span>{v.out ? t('filOut', v.mat) : t('filLow', dur(Math.max(1, Math.round(v.runway))))}</span>
      {v.alt && <button onClick={() => act(`material:${v.alt}`)}>{t('filSwitch', MATERIAL[v.alt].name[li()], fmt(v.altG))}</button>}
    </div>
  );
}

function Production() {
  const v = useS(s => ({
    rate: rate1(s), fil: s.fil, g: gpu(s), feedstock: material(s).name[li()], showFeedstock: s.total >= MATERIALS[1].unlockAt, clk: s.clk, clickPow: clickPower(s), clickCost: clickCost(s), printers: s.auto + s.farm * 60, zl: s.zl, bulk: s.spoolG > 1000, spool: spoolPrice(s), spoolD: s.spoolD,
    goal: s.goal, auto: s.auto, spd: s.spd, autoCost: autoCost(s), farmOn: s.farmOn, farm: s.farm, farmCost: farmCost(s),
  }));
  const spoolSub = !v.spoolD ? t('spoolSub') : t(v.spoolD > 0 ? 'spoolUp' : 'spoolDn', Math.abs(Math.round(v.spoolD * 100)));
  return (
    <section class="card workshop-production">
      <CardHead title={t('production')} aside={t('perS', fmt(v.rate, 1))} />
      <div class="tiles">
        <Tile label={t('filament')} value={fmt(v.fil) + ' g'} warn={v.fil < v.g} />
        <Tile label={t('perFigS')} value={nf(v.g, 1) + ' g'} />
        <Tile label={t('printersS')} value={fmt(v.printers)} />
      </div>
      <BoostRow />
      <Item className="spool-row" name={t(v.bulk ? 'spool5Item' : 'spoolItem')} sub={v.showFeedstock ? v.feedstock + ' · ' + spoolSub : spoolSub}>
        <BuyButton action="spool" cost={v.spool} have={v.zl} label={money(v.spool)} />
      </Item>
      {v.goal >= 1 && (
        <Item name={t('toolItem')} sub={t('toolSub', v.clk, nf(v.clickPow, 2))}>
          <BuyButton action="tool" cost={v.clickCost} have={v.zl} label={money(v.clickCost)} />
        </Item>
      )}
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

function PriceStepper({ id }: { id: string }) {
  const price = useS(s => stockPrice(s, id) * MODEL[id].seconds);
  const minus = useHold(`price-down:${id}`), plus = useHold(`price-up:${id}`);
  return (
    <div class="stepper">
      <button aria-label="−" {...minus}>−</button>
      <div class="pv"><small>{t('price')}</small><b>{money(price)}</b></div>
      <button aria-label="+" {...plus}>+</button>
    </div>
  );
}

function PrintQuality() {
  const v = useS(s => ({ unlocked: qualityUnlocked(s), precision: s.precision, bed: s.bedCalibrated, dryer: s.dryerInstalled, money: s.zl }));
  if (!v.unlocked) return null;
  return (
    <section class="card wide">
      <CardHead title={t('qualityTitle')} />
      <Item name={t('calibrateBed')} sub={t('calibrateHint')}>
        {v.bed ? t('qualityInstalled') : <BuyButton action="calibrate" cost={BAL.bedCalibrationCost} have={v.money} label={money(BAL.bedCalibrationCost)} />}
      </Item>
      <Item name={t('filamentDryer')} sub={t('dryerHint')}>
        {v.dryer ? t('qualityInstalled') : <BuyButton action="dryer" cost={BAL.filamentDryerCost} have={v.money} label={money(BAL.filamentDryerCost)} />}
      </Item>
      <Item name={t('precisionTitle')} sub={t('precisionHint', Math.round((1 - BAL.precisionSpeed) * 100), Math.round(BAL.precisionPremium * 100))}>
        <button aria-label={t('precisionTitle')} aria-pressed={v.precision} onClick={() => act('precision')}>
          {t(v.precision ? 'qualityOn' : 'qualityOff')}
        </button>
      </Item>
    </section>
  );
}

function Sales() {
  const [selected, setSelected] = useState<string | null>(null);
  const shop = useS(s => ({
    main: s.mdl, owned: s.mdls, sold: s.sold, auto: has(s, 'autocena') && !!s.amOn.autocena,
    goal: s.goal, mkt: s.mkt, mktCost: mktCost(s), zl: s.zl,
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
    <section class="card workshop-sales">
      <CardHead title={t('sales')} aside={t('soldT', fmt(v.sold))} />
      {v.owned.length > 1 && <div class="sales-model">
        <label for="sales-model">{t('salesModel')}</label>
        <select id="sales-model" value={id} onChange={e => setSelected(e.currentTarget.value)}>
          {v.owned.map(id => <option key={id} value={id}>{MODEL[id].name[li()]}</option>)}
        </select>
      </div>}
      <div class="tiles">
        <Tile label={t('stock')} value={t('statsPiecesSold', fmt(v.inv))} />
        <Tile label={t('buyRateS')} value={t('perS', fmt(v.piecesPerSecond, 1))} />
        <Tile label={t('unitCostS')} value={money(v.uc)} />
      </div>
      <ColorPicker />
      {v.auto
        ? <p class="hint sales-auto-price">{t('salesCurrentPrice', money(v.price))}</p>
        : <PriceStepper id={id} key={id} />}
      <div class="sales-notes">
        <div class="sales-flow">
          {v.growth
            ? <p class="stock-growth">{t('statsStockGrowth', fmt(v.growth.stocked), fmt(v.growth.sold))}</p>
            : v.fast && <p class="hint">{t('hFast')}</p>}
        </div>
        <p class={'hint' + (loss ? ' bad' : '')}>{hint}</p>
      </div>
      {v.goal >= 4 && (
        <Item name={t('mktItem')} sub={t('mktSub', v.mkt)}>
          <BuyButton action="mkt" cost={v.mktCost} have={v.zl} label={money(v.mktCost)} />
        </Item>
      )}
    </section>
  );
}

/** Silhouette of a model, drawn from the same layer widths the printer animation uses. */
function Shape({ m, size = 36 }: { m: PrintModel; size?: number }) {
  const h = m.shape.length * 8;
  return (
    <svg class="mshape" viewBox={`0 0 120 ${Math.max(h, 40)}`} width={size} height={size} aria-hidden="true">
      {m.shape.map((w, i) => <rect key={i} x={60 - w / 2} y={Math.max(h, 40) - (i + 1) * 8} width={w} height={8.4} rx={2.5} />)}
    </svg>
  );
}

function FleetSplit() {
  const v = useS(s => ({
    unlocked: splitUnlocked(s), main: model(s), selected: s.fleetModel,
    printers: s.fleetPrinters, total: s.auto,
    available: MODELS.filter(m => m.id !== s.mdl && s.mdls.includes(m.id)),
    primaryRate: primaryRate(s), secondaryRate: secondaryRate(s),
  }));
  if (!v.unlocked) return null;

  const secondary = v.available.find(m => m.id === v.selected);
  return (
    <details class="fleet-split">
      <summary>{t('fleetTitle')}{secondary && <small>{secondary.name[li()]} · {t('fleetCount', v.printers)}</small>}</summary>
      <div class="fleet-controls">
        <div>
          <label for="fleet-model">{t('fleetSecond')}</label>
          <select id="fleet-model" value={v.selected} onChange={e => act(`fleet-model:${e.currentTarget.value}`)}>
            <option value="">{t('fleetNone')}</option>
            {v.available.map(m => <option key={m.id} value={m.id}>{m.name[li()]}</option>)}
          </select>
        </div>
        {secondary && <>
          <label>{t('fleetCount', v.printers)}
            <input type="range" min="1" max={v.total - 1} step="1" value={v.printers}
              disabled={v.total === 2} onInput={e => act(`fleet-count:${e.currentTarget.valueAsNumber}`)} />
          </label>
          <div class="fleet-rates">
            <span>{v.main.name[li()]} · {t('fleetCount', v.total - v.printers)} · {t('fleetRate', nf(60 * v.primaryRate / v.main.seconds, 1))}</span>
            <span>{secondary.name[li()]} · {t('fleetCount', v.printers)} · {t('fleetRate', nf(60 * v.secondaryRate / secondary.seconds, 1))}</span>
          </div>
        </>}
        <p class="hint">{t('fleetHint')}</p>
      </div>
    </details>
  );
}

/** Print models: owned ones can be selected for the main group, visible ones bought as designs. Data: content/models.ts. */
function Models() {
  const v = useS(s => ({
    stock: Object.fromEntries(s.mdls.map(id => [id, piecesInStock(s, id)])),
    printed: Object.fromEntries(s.mdls.map(id => [id, s.modelStock[id]?.printed ?? 0])),
    prices: Object.fromEntries(s.mdls.map(id => [id, stockPrice(s, id)])),
    progress: s.modelStock[s.mdl]?.progress ?? 0,
    cur: s.mdl, owned: s.mdls.join(','), zl: s.zl, total: s.total, slow: s.slow || 1,
    visible: MODELS.filter(m => designVisible(s, m)).map(m => m.id).join(','),
  }));
  const visible = MODELS.filter(m => v.visible.split(',').includes(m.id));
  if (visible.length < 2) return null;
  const next = MODELS.find(m => !v.visible.split(',').includes(m.id));
  const cur = MODELS.find(m => m.id === v.cur) ?? MODELS[0];
  return (
    <section class="card models">
      <CardHead title={t('mdlTitle')} aside={t('mdlAside', cur.name[li()])} />
      <p class="hint">{t('mdlHint')}</p>
      <FleetSplit />
      {visible.map(m => {
        const have = v.owned.split(',').includes(m.id), on = m.id === v.cur;
        const secs = m.seconds * v.slow;
        const stats = [t('mdlTime', nf(secs, secs < 1 ? 1 : 0)), t('mdlPay', nf(m.value, 2)), t('mdlMkt', nf(m.market, 2)), t('mdlMat', nf(m.material, 2))].join(' · ');
        return (
          <div key={m.id} class={'item model' + (on ? ' active' : '')}>
            <Shape m={m} />
            <div class="it"><b>{m.name[li()]}</b><small>{m.desc[li()]}</small><small class="stats">{stats}</small>
              {have && <small>{t('modelPrinted', fmt(v.printed[m.id]))} · {t('modelPieces', fmt(v.stock[m.id]))} · {t('modelPiecePrice', money(v.prices[m.id] * m.seconds))}</small>}
              {on && <Meter pct={100 * v.progress / m.seconds} />}
            </div>
            {have
              ? <button class={on ? 'on' : ''} disabled={on} onClick={e => { if (act(`mdl:${m.id}`) && e.detail > 0) e.currentTarget.blur(); }}>{on ? t('mdlOn') : t('mdlUse')}</button>
              : <BuyButton action={`stl:${m.id}`} cost={designCost(game.s, m)} have={v.zl} label={money(designCost(game.s, m))} />}
          </div>
        );
      })}
      {next && <p class="hint">{t('mdlNext', fmt(next.unlockAt))}</p>}
    </section>
  );
}

function AutoMaterialToggle() {
  const on = useS(s => s.autoMat);
  return (
    <label class="am auto-mat">
      <input type="checkbox" checked={on} onChange={() => act('automat')} />
      <span>{t('autoMatL')}</span>
    </label>
  );
}

function Materials() {
  const rows = useS(s => MATERIALS.filter(m => s.total >= m.unlockAt).map(m => ({
    material: m, selected: s.materialId === m.id, stock: materialStock(s, m.id),
    price: spoolPrice(s, m) * 1000 / s.spoolG, bonus: materialDemand(m, s.mdl),
  })));
  if (rows.length < 2) return null;

  return (
    <section class="card wide">
      <CardHead title={t('materialsTitle')} />
      <AutoMaterialToggle />
      {rows.map(({ material: m, selected, stock, price, bonus }) => (
        <Item key={m.id} name={m.name[li()]} sub={[
          t('materialStock', fmt(stock)),
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

function WorkshopSupport({ research, farm, compact }: { research: boolean; farm: boolean; compact: boolean }) {
  const panel = useRef<HTMLDetailsElement>(null);
  useLayoutEffect(() => {
    const screen = matchMedia(compact ? '(min-width: 1740px)' : '(min-width: 821px)');
    const apply = () => { if (panel.current) panel.current.open = screen.matches; };
    apply();
    screen.addEventListener('change', apply);
    return () => screen.removeEventListener('change', apply);
  }, [compact]);

  return (
    <details class={'workshop-support' + (compact ? ' compact' : '')} ref={panel}>
      <summary>{t(research ? 'workshopSupportResearch' : 'workshopSupport')}</summary>
      <div class="workshop-stack">
        {research && <ResearchPreview />}
        <PrintQuality />
        {farm && <Energy />}
        <Automation />
      </div>
    </details>
  );
}

export function Workshop() {
  const v = useS(s => ({
    sp: s.ph === 2, sales: s.goal >= 1, farm: s.farmOn,
    designs: MODELS.some(m => m.design > 0 && designVisible(s, m)) || s.total >= MATERIALS[1].unlockAt,
    support: qualityUnlocked(s) || s.farmOn || AUTOMATIONS.some(id => has(s, id)),
  }));
  const research = useResearchUnlocked();

  if (v.sp) return (
    <div>
      <Events />
      <div class="grid">
        {research && <ResearchPreview />}
        <Space />
        <PrestigeCard />
        <Automation />
      </div>
    </div>
  );

  const support = research || v.support;
  return (
    <div class="workshop-layout">
      <Events />
      <div class="workshop-board">
        <div class="workshop-core">
          <Production />
          {v.sales && <Sales />}
          {v.sales && <WorkshopStats />}
        </div>
        {(v.designs || support) && <div class="workshop-tools">
          {v.designs && <div class="workshop-stack"><Models /><Materials /></div>}
          {support && <WorkshopSupport research={research} farm={v.farm} compact={v.designs} />}
        </div>}
      </div>
    </div>
  );
}
