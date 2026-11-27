import { model, spaceRate } from '../../../core/formulas';
import { rateOn } from '../../../systems/fleet';
import { fmt, li, t } from '../../i18n';
import { useS } from '../../store';

export function StationReadout() {
  const v = useS(s => {
    const m = model(s);
    const space = s.ph === 2;
    const speed = space ? spaceRate(s) : rateOn(s, s.mdl) / m.seconds;
    const out = !space && s.fil <= 0;
    const status = s.end ? 'stationDone' : out ? 'stationEmpty' : s.brk > 0 ? 'stationFault'
      : speed > 0 ? 'stationRunning' : space ? 'stationIdle' : 'stationManual';
    return { name: space ? t('stSpace') : m.name[li()], status, speed: out || s.end ? 0 : speed } as const;
  });
  return (
    <div class="station-readout">
      <div class="station-status">
        <span>{v.name}</span>
        <span class={'station-state ' + v.status}>{t(v.status)}</span>
      </div>
      <div class="station-rate">
        <span>{t('stationAutoRate')}</span>
        <strong>{fmt(v.speed * 60, 1)} <small>{t('stationUnits')}</small></strong>
      </div>
    </div>
  );
}
