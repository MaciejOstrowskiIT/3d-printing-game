import { useEffect, useState } from 'preact/hooks';
import { MODELS } from '../../content/models';
import { CASH_KINDS, expenses, income, newPeriod, PERIOD_COUNT, PERIOD_SECONDS, periodIndex } from '../../systems/workshopStats';
import { fmt, li, money, t } from '../i18n';
import { useS } from '../store';

const DESKTOP = '(min-width: 821px)';
const signedMoney = (value: number) => value > 0 ? '+' + money(value) : money(value);

export function WorkshopStats() {
  const [open, setOpen] = useState(() => matchMedia(DESKTOP).matches);
  const [selected, setSelected] = useState<number | null>(null);
  const { current, history } = useS(s => ({ current: periodIndex(s), history: s.finance.filter(p => p.index > periodIndex(s) - PERIOD_COUNT) }));
  useEffect(() => {
    const screen = matchMedia(DESKTOP);
    const resize = () => setOpen(screen.matches);
    screen.addEventListener('change', resize);
    return () => screen.removeEventListener('change', resize);
  }, []);

  const receipts = history.reduce((sum, p) => sum + income(p), 0);
  const costs = history.reduce((sum, p) => sum + expenses(p), 0);
  const net = receipts - costs;
  const netClass = net > 0 ? ' gain' : net < 0 ? ' loss' : '';
  const first = Math.max(0, current - PERIOD_COUNT + 1);
  const periods = Array.from({ length: current - first + 1 }, (_, i) => history.find(p => p.index === first + i) ?? newPeriod(first + i));
  const peak = Math.max(1, ...periods.map(p => Math.max(income(p), expenses(p))));
  const detail = periods.find(p => p.index === selected) ?? [...periods].reverse().find(p => income(p) || expenses(p));
  const periodLabel = (index: number) => current === index ? t('statsNow') : t('statsAgo', (current - index) * PERIOD_SECONDS);
  const models = MODELS.map(m => ({
    id: m.id, name: m.name[li()],
    pieces: history.reduce((sum, p) => sum + (p.models[m.id]?.pieces ?? 0), 0),
    revenue: history.reduce((sum, p) => sum + (p.models[m.id]?.revenue ?? 0), 0),
  })).filter(m => m.pieces > 0);

  return (
    <section class="card wide workshop-stats" aria-labelledby="workshop-stats-title">
      <h2 id="workshop-stats-title">
        <button class="stats-toggle" aria-expanded={open} aria-controls="workshop-stats-body" onClick={() => setOpen(!open)}>
          <span>{t('statsTitle')}</span>
          <span class="stats-summary"><small>{t('statsWindow')}</small><strong class={'stats-money' + netClass}>{signedMoney(net)}</strong><i aria-hidden="true">{open ? '▴' : '▾'}</i></span>
        </button>
      </h2>
      <div id="workshop-stats-body" hidden={!open}>
        {!history.length ? <p class="stats-empty">{t('statsEmpty')}</p> : <>
          <div class="stats-totals">
            <div><small>{t('statsNet')}</small><strong class={'stats-money' + netClass}>{signedMoney(net)}</strong></div>
            <div><small>{t('statsIncome')}</small><strong class="stats-money gain">{money(receipts)}</strong></div>
            <div><small>{t('statsExpenses')}</small><strong class="stats-money">{money(costs)}</strong></div>
          </div>
          <div class="stats-legend"><span class="stats-in-key">{t('statsIncome')}</span><span class="stats-out-key">{t('statsExpenses')}</span></div>
          <div class="stats-chart" role="group" aria-label={t('statsChart')}>
            {periods.map(p => (
              <button type="button" class="stats-column" key={p.index} aria-pressed={detail?.index === p.index}
                aria-label={t('statsPoint', periodLabel(p.index), money(income(p)), money(expenses(p)))} onClick={() => setSelected(p.index)}>
                <span class="stats-bar-slot"><i class="stats-in" style={{ height: 100 * income(p) / peak + '%' }} /></span>
                <span class="stats-bar-slot"><i class="stats-out" style={{ height: 100 * expenses(p) / peak + '%' }} /></span>
              </button>
            ))}
          </div>
          {periods.length > 1 && <div class="stats-axis" aria-hidden="true"><span>{periodLabel(first)}</span><span>{t('statsNow')}</span></div>}
          {detail && <div class="stats-detail">
            <strong>{periodLabel(detail.index)}</strong>
            <span>{CASH_KINDS.filter(kind => detail.cash[kind] > 0).map(kind => t(`statsDetail_${kind}`, money(detail.cash[kind]))).join(' · ') || t('statsNoMovement')}</span>
          </div>}
          {models.length > 0 && <table class="stats-models">
            <caption>{t('statsByModel')}</caption>
            <thead><tr><th scope="col">{t('statsModel')}</th><th scope="col">{t('statsSold')}</th><th scope="col">{t('statsIncome')}</th></tr></thead>
            <tbody>{models.map(m => <tr key={m.id}><th scope="row">{m.name}</th><td>{fmt(m.pieces)}</td><td>{money(m.revenue)}</td></tr>)}</tbody>
          </table>}
        </>}
      </div>
    </section>
  );
}
