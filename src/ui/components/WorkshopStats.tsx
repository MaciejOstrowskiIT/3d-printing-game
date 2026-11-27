import { useEffect, useState } from 'preact/hooks';
import { MODELS } from '../../content/models';
import { CASH_KINDS, expenses, income, newPeriod, PERIOD_COUNT, PERIOD_SECONDS, periodIndex, type CashPeriod } from '../../systems/workshopStats';
import { fmt, li, money, t } from '../i18n';
import { useS } from '../store';

const DESKTOP = '(min-width: 821px)';
const signedMoney = (value: number) => value > 0 ? '+' + money(value) : money(value);

const PLOT_WIDTH = 1000;
const PLOT_HEIGHT = 128;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 116;

function smoothPath(points: { x: number; y: number }[]) {
  return points.map(({ x, y }, i) => {
    if (i === 0) return `M ${x} ${y}`;
    const previous = points[i - 1];
    // The control points stay between the samples, so the curve creates no extra peaks.
    const middle = (previous.x + x) / 2;
    return `C ${middle} ${previous.y} ${middle} ${y} ${x} ${y}`;
  }).join(' ');
}

function CashFlowChart({ periods, selected, periodLabel, onSelect }: {
  periods: CashPeriod[];
  selected: number;
  periodLabel: (index: number) => string;
  onSelect: (index: number) => void;
}) {
  const peak = Math.max(1, ...periods.map(p => Math.max(income(p), expenses(p))));
  const height = (value: number) => PLOT_BOTTOM - (PLOT_BOTTOM - PLOT_TOP) * value / peak;
  const points = periods.map((period, i) => ({
    period, x: PLOT_WIDTH * (i + 0.5) / periods.length,
    incomeY: height(income(period)), expensesY: height(expenses(period)),
  }));
  const active = points.find(point => point.period.index === selected);
  const grid = [PLOT_TOP, (PLOT_TOP + PLOT_BOTTOM) / 2, PLOT_BOTTOM];
  return (
    <div class="stats-chart" role="group" aria-label={t('statsChart')}>
      <svg aria-hidden="true" viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`} preserveAspectRatio="none">
        {grid.map(y => <line key={y} class="stats-gridline" x1="0" x2={PLOT_WIDTH} y1={y} y2={y} />)}
        {active && <line class="stats-crosshair" x1={active.x} x2={active.x} y1={PLOT_TOP} y2={PLOT_BOTTOM} />}
        <path class="stats-line stats-in" d={smoothPath(points.map(({ x, incomeY }) => ({ x, y: incomeY })))} />
        <path class="stats-line stats-out" d={smoothPath(points.map(({ x, expensesY }) => ({ x, y: expensesY })))} />
      </svg>
      <div class="stats-points" style={{ gridTemplateColumns: `repeat(${periods.length}, minmax(0, 1fr))` }}>
        {points.map(point => {
          const p = point.period;
          return (
            <button type="button" key={p.index} aria-pressed={point === active}
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
  const [open, setOpen] = useState(() => matchMedia(DESKTOP).matches);
  const [selected, setSelected] = useState<number | null>(null);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const { current, history } = useS(s => ({ current: periodIndex(s), history: s.finance.filter(p => p.index > periodIndex(s) - PERIOD_COUNT) }));
  useEffect(() => {
    const screen = matchMedia(DESKTOP);
    const resize = () => setOpen(screen.matches);
    screen.addEventListener('change', resize);
    return () => screen.removeEventListener('change', resize);
  }, []);

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
      <h2 id="workshop-stats-title">
        <button class="stats-toggle" aria-expanded={open} aria-controls="workshop-stats-body" onClick={() => setOpen(!open)}>
          <span>{t('statsTitle')}</span>
          <span class="stats-summary"><small>{t(filtered ? 'statsSelectedWindow' : 'statsWindow')}</small><strong class={'stats-money' + netClass}>{signedMoney(net)}</strong><i aria-hidden="true">{open ? '▴' : '▾'}</i></span>
        </button>
      </h2>
      <div id="workshop-stats-body" hidden={!open}>
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
          <CashFlowChart periods={periods} selected={detail.index} periodLabel={periodLabel} onSelect={setSelected} />
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
