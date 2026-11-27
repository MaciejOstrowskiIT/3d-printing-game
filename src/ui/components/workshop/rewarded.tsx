import { orderAdReady, repairAdReady } from '../../../systems/rewarded';
import { platform } from '../../platform';
import { adPending, useS, watchAdForOrder, watchAdForRepair } from '../../store';
import { clock, t } from '../../i18n';

/** Rewarded "Instant delivery" and "Skip breakdown", next to Overtime. A row shows only while it is useful (an accepted
 *  order, a breakdown) or cooling down, and only where the platform can serve rewarded ads. */
export function RewardedRows() {
  const v = useS(s => ({
    order: s.ph === 1 && !!s.ord?.acc, orderCd: s.adCd.order, orderReady: orderAdReady(s),
    repair: s.ph === 1 && s.brk > 0, repairCd: s.adCd.repair, repairReady: repairAdReady(s),
  }));
  if (!platform.rewardedAvailable) return null;
  const pending = adPending.value;
  const row = (key: 'adOrder' | 'adRepair', show: boolean, cd: number, ready: boolean, go: () => Promise<void>) => (show || cd > 0) && (
    <div class="item boost" key={key}>
      <div class="it"><b>{t(`${key}Item`)}</b><small>{cd > 0 ? t('boostCd', clock(cd)) : t(`${key}Sub`)}</small></div>
      <button class="buy ok" disabled={!ready || pending} onClick={() => void go()}>{pending ? t('boostWait') : t('boostBtn')}</button>
    </div>
  );
  return <>
    {row('adOrder', v.order, v.orderCd, v.orderReady, watchAdForOrder)}
    {row('adRepair', v.repair, v.repairCd, v.repairReady, watchAdForRepair)}
  </>;
}
