import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { MODELS } from '../../content/models';
import { CASH_KINDS, expenses, income, newPeriod, PERIOD_COUNT, PERIOD_SECONDS, periodIndex, type CashPeriod } from '../../systems/workshopStats';
import { fmt, li, money, reducedMotion, t } from '../i18n';
import { useS } from '../store';

const signedMoney = (value: number) => value > 0 ? '+' + money(value) : money(value);

const PLOT_WIDTH = 1000;
const PLOT_HEIGHT = 128;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 116;
const SCROLL_MS = 420;

type CashPoint = { x: number; incomeY: number; expensesY: number };
type PlotRange = { start: number; end: number; live: boolean; peak: number; first: CashPeriod };
type ScrollFrame = { from: PlotRange; start: number; end: number; progress: number };

const interpolate = (from: number, to: number, fraction: number) => from + (to - from) * fraction;

function smoothPath(points: { x: number; y: number }[]) {
  return points.map(({ x, y }, i) => {
    if (i === 0) return `M ${x} ${y}`;
    const previous = points[i - 1];
    // The control points stay between the samples, so the curve creates no extra peaks.
    const middle = (previous.x + x) / 2;
    return `C ${middle} ${previous.y} ${middle} ${y} ${x} ${y}`;
  }).join(' ');
}

function CashFlowLines({ points }: { points: CashPoint[] }) {
  return <>
    <path class="stats-line stats-in" d={smoothPath(points.map(({ x, incomeY }) => ({ x, y: incomeY })))} />
    <path class="stats-line stats-out" d={smoothPath(points.map(({ x, expensesY }) => ({ x, y: expensesY })))} />
  </>;
}

/** Animate consecutive live periods. A range chosen by the player takes effect immediately. */
function useChartScroll(range: PlotRange) {
  const previous = useRef(range);
  const request = useRef(0);
  const [frame, setFrame] = useState<ScrollFrame>();

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = range;
    const { start, end, live } = range;
    if (from.start === start && from.end === end) return;

    cancelAnimationFrame(request.current);
    if (!from.live || !live || end !== from.end + 1 || start < from.start || start > from.end ||
        start > from.start + 1 || reducedMotion()) {
      setFrame(undefined);
      return;
    }

    const started = performance.now();
    const update = (now: number) => {
      const time = Math.max(0, (now - started) / SCROLL_MS);
      if (time >= 1) {
        setFrame(undefined);
        return;
      }
      setFrame({ from, start, end, progress: time * time * (3 - 2 * time) });
      request.current = requestAnimationFrame(update);
    };

    setFrame({ from, start, end, progress: 0 });
    request.current = requestAnimationFrame(update);
  });

  useLayoutEffect(() => () => cancelAnimationFrame(request.current), []);
  return frame?.start === range.start && frame.end === range.end ? frame : undefined;
}

function CashFlowChart({ periods, liveProgress, selected, periodLabel, onSelect }: {
  periods: CashPeriod[];
  liveProgress: number | null;
  selected: number;
  periodLabel: (index: number) => string;
  onSelect: (index: number) => void;
}) {
  const first = periods[0];
  const start = first.index;
  const end = periods[periods.length - 1].index;
  const samples = periods.map(period => ({ period, receipts: income(period), costs: expenses(period) }));
  const latest = samples[samples.length - 1];
  const previous = samples[samples.length - 2];
  const rolling = liveProgress !== null && previous !== undefined;
  if (rolling) {
    // The stored totals are per bucket. Estimate the trailing window by keeping the
    // unelapsed share of the previous bucket until the current one fills in.
    latest.receipts += previous.receipts * (1 - liveProgress);
    latest.costs += previous.costs * (1 - liveProgress);
  }
  const peak = Math.max(1, ...samples.map(({ receipts, costs }) => Math.max(receipts, costs)));
  const scroll = useChartScroll({ start, end, live: liveProgress !== null, peak, first });
  const targetWidth = PLOT_WIDTH / periods.length;
  const oldWidth = scroll ? PLOT_WIDTH / (scroll.from.end - scroll.from.start + 1) : targetWidth;
  const width = scroll ? interpolate(oldWidth, targetWidth, scroll.progress) : targetWidth;
  const left = scroll ? interpolate((start - scroll.from.start) * oldWidth, 0, scroll.progress) : 0;
  const scale = scroll ? interpolate(scroll.from.peak, peak, scroll.progress) : peak;
  const height = (value: number) => PLOT_BOTTOM - (PLOT_BOTTOM - PLOT_TOP) * value / scale;
  const plot = (period: CashPeriod, receipts = income(period), costs = expenses(period)) => ({
    period, x: left + width * (period.index - start + 0.5),
    incomeY: height(receipts), expensesY: height(costs),
  });
  const points = samples.map(({ period, receipts, costs }) => plot(period, receipts, costs));
  const leaving = scroll && start > scroll.from.start ? plot(scroll.from.first) : null;
  const active = points.find(point => point.period.index === selected);
  const grid = [PLOT_TOP, (PLOT_TOP + PLOT_BOTTOM) / 2, PLOT_BOTTOM];
  return (
    <div class="stats-chart" role="group" aria-label={t('statsChart')}>
      <svg aria-hidden="true" viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`} preserveAspectRatio="none">
        {grid.map(y => <line key={y} class="stats-gridline" x1="0" x2={PLOT_WIDTH} y1={y} y2={y} />)}
        {active && <line class="stats-crosshair" x1={active.x} x2={active.x} y1={PLOT_TOP} y2={PLOT_BOTTOM} />}
        <CashFlowLines points={points} />
        {scroll && leaving && <g opacity={1 - scroll.progress}><CashFlowLines points={[leaving, points[0]]} /></g>}
      </svg>
      <div class="stats-points">
        {points.map(point => {
          const p = point.period;
          return (
            <button type="button" key={p.index} aria-pressed={point === active}
              style={{ left: 100 * (point.x - width / 2) / PLOT_WIDTH + '%', width: 100 * width / PLOT_WIDTH + '%' }}
              title={rolling && p.index === end ? t('statsLiveHint') : undefined}
              aria-label={t('statsPoint', periodLabel(p.index), money(income(p)), money(expenses(p)))} onClick={() => onSelect(p.index)}>
              <i aria-hidden="true" class="stats-marker stats-in" style={{ top: 100 * point.incomeY / PLOT_HEIGHT + '%' }} />
              <i aria-hidden="true" class="stats-marker stats-out" style={{ top: 100 * point.expensesY / PLOT_HEIGHT + '%' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WorkshopStats() {
  const [selected, setSelected] = useState<number | null>(null);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const { current, financeTime, history } = useS(s => {
    const current = periodIndex(s);
    return { current, financeTime: s.financeTime, history: s.finance.filter(p => p.index > current - PERIOD_COUNT) };
  });
  const first = Math.max(0, current - PERIOD_COUNT + 1);
  const available = Array.from({ length: current - first + 1 }, (_, i) => first + i);
  const start = from !== null && from > first && from <= current ? from : first;
  const end = to !== null && to >= start && to < current ? to : current;
  const filtered = start !== first || end !== current;
  const periods = available.slice(start - first, end - first + 1)
    .map(index => history.find(p => p.index === index) ?? newPeriod(index));
  const receipts = periods.reduce((sum, p) => sum + income(p), 0);
  const costs = periods.reduce((sum, p) => sum + expenses(p), 0);
  const net = receipts - costs;
  const netClass = net > 0 ? ' gain' : net < 0 ? ' loss' : '';
  const detail = periods.find(p => p.index === selected)
    ?? [...periods].reverse().find(p => income(p) || expenses(p)) ?? periods[periods.length - 1];
  const periodLabel = (index: number) => current === index ? t('statsNow') : t('statsAgo', (current - index) * PERIOD_SECONDS);
  const hasTransactions = history.some(p => income(p) || expenses(p));
  const models = MODELS.flatMap(m => {
    const sales = periods.flatMap(p => p.models[m.id]?.pieces ? [p.models[m.id]] : []);
    if (!sales.length) return [];
    return [{
      id: m.id, name: m.name[li()],
      pieces: sales.reduce((sum, p) => sum + p.pieces, 0),
      revenue: sales.reduce((sum, p) => sum + p.revenue, 0),
      cost: sales.some(p => p.cost == null) ? null : sales.reduce((sum, p) => sum + (p.cost ?? 0), 0),
    }];
  });

  return (
    <section class="card wide workshop-stats" aria-labelledby="workshop-stats-title">
      <h2 id="workshop-stats-title" class="stats-head">
        <span>{t('statsTitle')}</span>
        <span class="stats-summary"><small>{t(filtered ? 'statsSelectedWindow' : 'statsWindow')}</small><strong class={'stats-money' + netClass}>{signedMoney(net)}</strong></span>
      </h2>
      <div id="workshop-stats-body">
        {!hasTransactions ? <p class="stats-empty">{t('statsEmpty')}</p> : <>
          <div class="stats-totals">
            <div><small>{t('statsNet')}</small><strong class={'stats-money' + netClass}>{signedMoney(net)}</strong></div>
            <div><small>{t('statsIncome')}</small><strong class="stats-money gain">{money(receipts)}</strong></div>
            <div><small>{t('statsExpenses')}</small><strong class="stats-money">{money(costs)}</strong></div>
          </div>
          {available.length > 1 && <div class="stats-range">
            <label>
              {t('statsFrom')}
              <select value={start} onChange={e => {
                const index = Number(e.currentTarget.value);
                setFrom(index === first ? null : index);
              }}>
                {available.map(index => <option key={index} value={index} disabled={index > end}>{periodLabel(index)}</option>)}
              </select>
            </label>
            <label>
              {t('statsTo')}
              <select value={end} onChange={e => {
                const index = Number(e.currentTarget.value);
                setTo(index === current ? null : index);
              }}>
                {available.map(index => <option key={index} value={index} disabled={index < start}>{periodLabel(index)}</option>)}
              </select>
            </label>
            {filtered && <button type="button" onClick={() => { setFrom(null); setTo(null); }}>{t('statsWindow')}</button>}
          </div>}
          <div class="stats-legend"><span class="stats-in-key">{t('statsIncome')}</span><span class="stats-out-key">{t('statsExpenses')}</span></div>
          <CashFlowChart periods={periods} liveProgress={end === current ? financeTime / PERIOD_SECONDS - current : null} selected={detail.index} periodLabel={periodLabel} onSelect={setSelected} />
          {periods.length > 1 && <div class="stats-axis" aria-hidden="true"><span>{periodLabel(start)}</span><span>{periodLabel(end)}</span></div>}
          <div class="stats-detail">
            <strong>{periodLabel(detail.index)}</strong>
            <span>{CASH_KINDS.filter(kind => detail.cash[kind] > 0).map(kind => t(`statsDetail_${kind}`, money(detail.cash[kind]))).join(' · ') || t('statsNoMovement')}</span>
          </div>
          {models.length > 0 && <>
            <table class="stats-models stats-margins">
              <caption>{t('statsByModel')}</caption>
              <thead><tr><th scope="col">{t('statsModel')}</th><th scope="col">{t('statsIncome')}</th><th scope="col">{t('statsFilamentCost')}</th><th scope="col">{t('statsMargin')}</th></tr></thead>
              <tbody>{models.map(m => <tr key={m.id}>
                <th scope="row">{m.name}<small>{t('statsPiecesSold', fmt(m.pieces))}</small></th>
                <td>{money(m.revenue)}</td><td>{m.cost === null ? '—' : money(m.cost)}</td>
                <td class={m.cost !== null && m.revenue < m.cost ? 'loss' : ''}>{m.cost === null ? '—' : signedMoney(m.revenue - m.cost)}</td>
              </tr>)}</tbody>
            </table>
            <p class="stats-detail">{t('statsCostBasis')}{models.some(m => m.cost === null) ? ' ' + t('statsUnknownCost') : ''}</p>
          </>}

        </>}
      </div>
    </section>
  );
}
