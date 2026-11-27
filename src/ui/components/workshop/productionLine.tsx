import { dedicated, idlePrinters, printersOn, rateOn, splitUnlocked } from '../../../systems/fleet';
import { EXTRA_PRINTER_TYPES, FDM, typeOf, type PrinterType } from '../../../content/printerTypes';
import { modelValue } from '../../../core/formulas';
import { MATERIAL } from '../../../content/materials';
import { curingPieces } from '../../../systems/printerTypes';
import { piecesInStock } from '../../../systems/inventory';
import { MODEL, MODELS, type PrintModel } from '../../../content/models';
import { designCost, designVisible } from '../../../systems/models';
import { act, game, useS } from '../../store';
import { fmt, li, money, nf, t } from '../../i18n';
import { BuyButton, CardHead, Meter } from '../common';
import { salesPick } from './salesPick';

/** Silhouette of a model, drawn from the same layer widths the printer animation uses. */
function Shape({ m, size = 36 }: { m: PrintModel; size?: number }) {
  const h = m.shape.length * 8;
  return (
    <svg class="mshape" viewBox={`0 0 120 ${Math.max(h, 40)}`} width={size} height={size} aria-hidden="true">
      {m.shape.map((w, i) => <rect key={i} x={60 - w / 2} y={Math.max(h, 40) - (i + 1) * 8} width={w} height={8.4} rx={2.5} />)}
    </svg>
  );
}

/** Colour of a model in the allocation bar and on its tile. */
const MODEL_TONE = ['#ff6a1f', '#008ba7', '#7a5af5', '#2f9e5a', '#d6457a', '#c8a400'];

const tone = (id: string) => MODEL_TONE[Math.max(0, MODELS.findIndex(m => m.id === id)) % MODEL_TONE.length];

/** A relative bar (0–1) with a label, used on model tiles instead of raw multipliers. */
const Bar = ({ label, v, kind }: { label: string; v: number; kind: string }) => (
  <><span>{label}</span><div class={'mbar ' + kind} role="meter" aria-label={label} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: Math.max(6, v * 100) + '%' }} /></div></>
);

/** Footer of a tile for a printer type other than FDM: its own printer pool, no main model; idle printers wait here. */
function TypeFoot({ m, type, n, pool, idle, curing, rate }: { m: PrintModel; type: PrinterType; n: number; pool: number; idle: number; curing: number; rate: number }) {
  if (!pool) return <p class="mt-needs">{t('ptNeeds', type.name[li()])}</p>;
  return (
    <div class="mt-foot">
      <div class="stepper small">
        <button aria-label={t('lineLess', m.name[li()])} disabled={n === 0} onClick={() => act(`fleet:${m.id}:${n - 1}`)}>−</button>
        <div class="pv"><b>{fmt(n)}</b><small>{t('linePrintersShort')}</small></div>
        <button aria-label={t('lineMore', m.name[li()])} disabled={!idle} onClick={() => act(`fleet:${m.id}:${n + 1}`)}>+</button>
      </div>
      <small class="mt-rate">{[
        n > 0 ? t('fleetRate', nf(60 * rate / m.seconds, 1)) : idle ? t('ptIdle', fmt(idle)) : '',
        curing > 0 ? t('ptCuringTile', fmt(curing)) : '',
      ].filter(Boolean).join(' · ') || ' '}</small>
    </div>
  );
}

/** Production line: one tile per model. Printers are allocated per model; the main model also gets farms,
 *  manual printing and new printers. Tile click shows the model in Sales. Data: content/models.ts. */
export function ProductionLine() {
  const v = useS(s => ({
    stock: Object.fromEntries(s.mdls.map(id => [id, piecesInStock(s, id)])),
    rate: Object.fromEntries(s.mdls.map(id => [id, rateOn(s, id)])),
    printers: Object.fromEntries(s.mdls.map(id => [id, printersOn(s, id)])),
    progress: Object.fromEntries(s.mdls.map(id => [id, s.modelStock[id]?.progress ?? 0])),
    cur: s.mdl, owned: s.mdls.join(','), zl: s.zl, slow: s.slow || 1, auto: s.auto, farm: s.farm,
    split: splitUnlocked(s), free: s.auto - dedicated(s) > 0 ? 1 : 0, total: s.total, sales: s.goal >= 1,
    visible: MODELS.filter(m => designVisible(s, m)).map(m => m.id).join(','),
    idle: Object.fromEntries(EXTRA_PRINTER_TYPES.map(type => [type.id, idlePrinters(s, type)])),
    pool: Object.fromEntries(EXTRA_PRINTER_TYPES.map(type => [type.id, s.printers[type.id] ?? 0])),
    curing: Object.fromEntries(s.mdls.map(id => [id, Math.round(curingPieces(s, id))])),
  }));
  const picked = salesPick.value;
  const owned = v.owned.split(',');
  // Main model first, then the other owned ones, then designs to buy.
  const rank = (id: string) => id === v.cur ? 0 : owned.includes(id) ? 1 : 2;
  const visible = MODELS.filter(m => v.visible.split(',').includes(m.id)).sort((a, b) => rank(a.id) - rank(b.id));
  if (visible.length < 2) return null;
  const next = MODELS.find(m => !v.visible.split(',').includes(m.id));
  const max = { pay: Math.max(...visible.map(m => modelValue(m))), mkt: Math.max(...visible.map(m => m.market)), mat: Math.max(...visible.map(m => m.material)) };
  const shown = picked && owned.includes(picked) ? picked : v.cur;
  return (
    <section class="card line v-p">
      <CardHead title={t('lineTitle')} aside={v.split ? t('linePrinters', fmt(v.auto)) : t('mdlAside', MODEL[v.cur].name[li()])} />
      <p class="hint">{t(v.split ? 'lineHint' : 'mdlHint')}</p>
      {v.split && <div class="alloc" aria-hidden="true">
        {owned.filter(id => typeOf(MODEL[id]) === FDM && v.printers[id] > 0).map(id => <i key={id} style={{ flexGrow: v.printers[id], background: tone(id) }} title={MODEL[id].name[li()]} />)}
      </div>}
      <div class="mtiles">
        {visible.map(m => {
          const have = owned.includes(m.id), main = m.id === v.cur, n = v.printers[m.id] ?? 0;
          const type = typeOf(m), fdm = type === FDM;
          const secs = m.seconds * v.slow / type.speed;
          return (
            <div key={m.id} class={'mtile' + (main ? ' main' : '') + (have ? '' : ' locked') + (have && v.sales && m.id === shown ? ' picked' : '')} style={{ '--tone': tone(m.id) }}>
              <button class="mt-head" disabled={!have || !v.sales} aria-pressed={have && v.sales ? m.id === shown : undefined}
                onClick={() => { salesPick.value = m.id; }} title={m.desc[li()]}>
                <Shape m={m} size={34} />
                <span><b>{m.name[li()]}{!fdm && <em class="mt-type">{type.tag[li()]}</em>}</b><small>{t('mdlTime', nf(secs, secs < 1 ? 1 : 0))}{have ? ' · ' + t('modelPieces', fmt(v.stock[m.id])) : ''}</small></span>
              </button>
              <div class="mbars">
                <Bar label={t('barPay')} v={modelValue(m) / max.pay} kind="pay" />
                <Bar label={t('barMkt')} v={m.market / max.mkt} kind="mkt" />
                <Bar label={fdm ? t('barMat') : MATERIAL[type.material]?.name[li()] ?? t('barMat')} v={m.material / max.mat} kind="mat" />
              </div>
              {!have
                ? <BuyButton action={`stl:${m.id}`} cost={designCost(game.s, m)} have={v.zl} label={t('mdlBuyDesign', money(designCost(game.s, m)))} />
                : !fdm
                  ? <TypeFoot m={m} type={type} n={n} pool={v.pool[type.id]} idle={v.idle[type.id]} curing={v.curing[m.id]} rate={v.rate[m.id]} />
                : v.split
                  ? <div class="mt-foot">
                      {main
                        ? <div class="mt-main"><b class="num">{fmt(n)}</b><small>{t(v.farm > 0 ? 'lineMainFarms' : 'lineMain')}</small></div>
                        : <div class="stepper small">
                            <button aria-label={t('lineLess', m.name[li()])} disabled={n === 0} onClick={() => act(`fleet:${m.id}:${n - 1}`)}>−</button>
                            <div class="pv"><b>{fmt(n)}</b><small>{t('linePrintersShort')}</small></div>
                            <button aria-label={t('lineMore', m.name[li()])} disabled={!v.free} onClick={() => act(`fleet:${m.id}:${n + 1}`)}>+</button>
                          </div>}
                      {!main && <button class="mt-mk" onClick={() => act(`mdl:${m.id}`)}>{t('lineMakeMain')}</button>}
                      <small class="mt-rate">{main || n > 0 ? t('fleetRate', nf(60 * v.rate[m.id] / m.seconds, 1)) : '\u00a0'}</small>
                    </div>
                  : <button class={main ? 'on' : ''} disabled={main} onClick={e => { if (act(`mdl:${m.id}`) && e.detail > 0) e.currentTarget.blur(); }}>{main ? t('mdlOn') : t('mdlUse')}</button>}
              {have && (v.split || main || (!fdm && v.pool[type.id] > 0)) && <Meter pct={100 * (v.progress[m.id] ?? 0) / m.seconds} style={!main && n === 0 ? { opacity: '.35' } : undefined} />}
            </div>
          );
        })}
        {next && (
          <div class="mtile next">
            <b>{t('lineNext')}</b>
            <small>{t('mdlNext', fmt(next.unlockAt))}</small>
            <Meter pct={100 * v.total / next.unlockAt} />
          </div>
        )}
      </div>
    </section>
  );
}
