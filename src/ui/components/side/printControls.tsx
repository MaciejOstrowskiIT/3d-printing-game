import { DEFAULT_MODEL, MODEL } from '../../../content/models';
import { printProgress } from '../../../systems/fleet';
import { li, t } from '../../i18n';
import { useS } from '../../store';
import { Meter, useHold } from '../common';

export function PrintButton({ short }: { short?: boolean }) {
  const disabled = useS(s => s.fil <= 0);
  const mdl = useS(s => s.mdl);
  const hold = useHold('print');
  const label = mdl === DEFAULT_MODEL.id ? t('printBtn') : t('printBtnM', MODEL[mdl]?.name[li()] ?? '');
  return (
    <button class="pbtn" disabled={disabled} {...hold}>
      {short ? t('printBtnS') : <><span>{label}</span><kbd>{t('kbd')}</kbd></>}
    </button>
  );
}

/** Progress of the piece being printed. Only early on, while a piece takes a few seconds: once printing is fast
 *  the bar would just flicker, so it hides (BAL.printProgressMinSeconds). */
export function PrintProgress() {
  const v = useS(printProgress);
  if (v === null) return null;
  return (
    <div class="print-progress" role="meter" aria-label={t('printProgress')} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <span>{t('printProgress')}</span><b>{v}%</b>
      <Meter pct={v} tone="or" />
    </div>
  );
}
