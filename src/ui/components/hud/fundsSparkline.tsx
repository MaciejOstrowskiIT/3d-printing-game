import { periodIndex } from '../../../systems/workshopStats';
import { t } from '../../i18n';
import { useS } from '../../store';
import { sparkline } from '../../sparkline';

const W = 36, H = 12;

/** Tiny income (green) and spending (red) trend of the last few minutes, next to the money rate in the Funds chip. */
export function FundsSparkline() {
  const line = useS(s => (s.ph === 1 ? sparkline(s.finance, periodIndex(s), W, H) : null));
  if (!line) return null;
  return (
    <svg class="funds-spark" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={t('sparkLabel')}>
      <polyline vector-effect="non-scaling-stroke" class="spark-out" points={line.spend} />
      <polyline vector-effect="non-scaling-stroke" class="spark-in" points={line.income} />
    </svg>
  );
}
