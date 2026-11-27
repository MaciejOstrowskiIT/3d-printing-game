import { BAL } from '../../../content/balance';
import { qualityUnlocked } from '../../../systems/printQuality';
import { act, useS } from '../../store';
import { money, t } from '../../i18n';
import { BuyButton, CardHead, Item } from '../common';

export function PrintQuality() {
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
