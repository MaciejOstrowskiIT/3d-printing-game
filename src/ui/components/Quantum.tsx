import { BAL } from '../../content/balance';
import { eff, quantumDraw } from '../../core/formulas';
import { qpRate, quantumUpgradeCost, quantumVisible } from '../../systems/quantum';
import { fmt, t } from '../i18n';
import { act, useS } from '../store';
import { CardHead } from './common';

/** Quantum computer: switch on, add qubits, watch quantum points. Hidden until memory is within reach of the price. */
export function Quantum() {
  const v = useS(s => ({
    show: quantumVisible(s), on: s.qOn, lvl: s.qLvl, qp: s.qp, rate: qpRate(s), up: quantumUpgradeCost(s), ops: s.ops,
    draw: quantumDraw(s), low: s.ph === 1 && eff(s) < 1,
  }));
  if (!v.show) return null;
  const max = v.lvl >= BAL.quantumMaxLevel;
  return (
    <section class="card">
      <CardHead title={t('qTitle')} aside={v.on ? t('qRate', fmt(v.rate, 3)) : undefined} />
      {v.on ? (
        <div class="comp">
          <div class="cell"><small>{t('qPoints')}</small><div class="cv"><b>{fmt(Math.floor(v.qp))}</b></div></div>
          <div class="cell"><small>{t('qLevel')}</small><div class="cv"><b>{v.lvl} / {BAL.quantumMaxLevel}</b></div></div>
          <div class="cell"><div class="cv">
            {max ? <span class="hint">{t('qMax')}</span>
              : <button disabled={v.ops < v.up} onClick={() => act('qup')}>{t('qUp', fmt(v.up))}</button>}
          </div></div>
        </div>
      ) : (
        <div class="comp">
          <div class="cell"><div class="cv">
            <button class="btn-main" disabled={v.ops < BAL.quantumCost} onClick={() => act('qbuy')}>{t('qBuy', fmt(BAL.quantumCost))}</button>
          </div></div>
        </div>
      )}
      <p class="hint">{v.on ? t('qPower', fmt(v.draw)) + (v.low ? ' ' + t('qLow') : '') : t('qHint', fmt(BAL.quantumCost))}</p>
    </section>
  );
}
