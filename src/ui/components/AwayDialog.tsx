import { useLayoutEffect, useRef } from 'preact/hooks';
import { offlineBonusReady } from '../../systems/offlineBonus';
import { dur, fmt, mass, money, t } from '../i18n';
import { platform } from '../platform';
import { adPending, awayReport, useS, watchAdForOfflineBonus } from '../store';

/** Rewarded ad offer: doubles what the shop earned while the player was away. */
function OfflineBonusButton() {
  const v = useS(s => (offlineBonusReady(s) ? { zl: s.offB, fig: s.offBi } : null));
  if (!v || !platform.rewardedAvailable) return null;
  const gain = v.zl ? money(v.zl) : t('figs', fmt(v.fig));
  return (
    <button class="btn-main ad-x2" disabled={adPending.value} onClick={() => void watchAdForOfflineBonus()}>
      {t('offx2Btn', gain)}
    </button>
  );
}

/** Overlay shown after an offline catch-up: what happened while the player was away. A modal, so the workshop
 *  behind it does not shift. */
export function AwayDialog() {
  const report = awayReport.value;
  const r = report?.summary;
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const modal = ref.current;
    if (!r || !modal) return;
    if (!modal.open) modal.showModal();
    return () => { if (modal.open) modal.close(); };
  }, [r]);
  if (!r) return null;
  const close = () => { awayReport.value = undefined; };
  const sales = r.ph === 1 && (r.sold > 0 || r.revenue > 0);
  const rows: [string, string][] = [[t(r.ph === 1 ? 'awMade' : 'awMadeS'), t('figs', fmt(r.made))]];
  if (sales) rows.push([t('awSold'), t('figs', fmt(r.sold))], [t('awRevenue'), money(r.revenue)], [t('awNet'), (r.net > 0 ? '+' : '') + money(r.net)]);
  if (r.filament > 0) rows.push([t('awFil'), mass(r.filament)]);
  if (r.idle > 0) rows.push([t('awIdle'), dur(r.idle)]);
  return (
    <dialog ref={ref} class="modal away" aria-labelledby="away-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div class="modal-box">
        <div class="ch"><h2 id="away-title">{t('awTitle')}</h2><button class="x" onClick={close} aria-label={t('sClose')}>×</button></div>
        <p>{r.capped ? t('awCapped', dur(r.away), dur(r.simulated)) : t('awAway', dur(r.away))}</p>
        <dl class="away-stats">
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        {r.idle > 0 && <p class="hint">{t('offIdleTail', dur(r.idle))}</p>}
        <p class="hint">{t('awPaused')}</p>
        <div class="ctl"><OfflineBonusButton /><button class="btn-main" autofocus onClick={close}>{t('awOk')}</button></div>
      </div>
    </dialog>
  );
}
