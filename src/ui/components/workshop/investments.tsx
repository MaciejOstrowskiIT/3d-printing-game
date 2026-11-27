import { MATERIAL, MATERIALS } from '../../../content/materials';
import { autoCost, clickCost, clickPower, material, farmCost, mktCost, spoolPrice } from '../../../core/formulas';
import { boostUnlocked } from '../../../systems/boost';
import { platform } from '../../platform';
import { act, adPending, useS, watchAdForBoost } from '../../store';
import { clock, dur, fmt, li, mass, money, nf, t } from '../../i18n';
import { BuyButton, CardHead, Item } from '../common';
import { filamentNotice } from './events';

/** Rewarded "overtime" boost. Shown only where the platform can serve rewarded ads. */
export function BoostRow() {
  const v = useS(s => ({ show: boostUnlocked(s), on: s.boostT > 0, left: s.boostT, cd: s.boostCd }));
  if (!platform.rewardedAvailable || !v.show) return null;
  const pending = adPending.value;
  const sub = v.on ? t('boostOn', clock(v.left)) : v.cd > 0 ? t('boostCd', clock(v.cd)) : t('boostSub');
  return (
    <div class={'item boost' + (v.on ? ' active' : '')}>
      <div class="it"><b>{t('boostItem')}</b><small>{sub}</small></div>
      <button class="buy ok" disabled={v.on || v.cd > 0 || pending} onClick={() => void watchAdForBoost()}>
        {pending ? t('boostWait') : t('boostBtn')}
      </button>
    </div>
  );
}

/** Filament about to run out, or out: how long it lasts, and a one-click switch to a material still in stock. */
export function FilamentAlert() {
  const v = useS(filamentNotice);
  if (!v) return null;
  return (
    <div class={'fil-alert' + (v.out ? ' out' : '')} role="status">
      <span>{v.out ? t('filOut', v.mat) : t('filLow', dur(Math.max(1, Math.round(v.runway))))}</span>
      {v.alt && <button onClick={() => act(`material:${v.alt}`)}>{t('filSwitch', MATERIAL[v.alt].name[li()], mass(v.altG))}</button>}
    </div>
  );
}

export function Investments() {
  const v = useS(s => ({
    feedstock: material(s).name[li()], showFeedstock: s.total >= MATERIALS[1].unlockAt, clk: s.clk, clickPow: clickPower(s), clickCost: clickCost(s), zl: s.zl, bulk: s.spoolG > 1000, spool: spoolPrice(s), spoolD: s.spoolD,
    goal: s.goal, auto: s.auto, spd: s.spd, autoCost: autoCost(s), farmOn: s.farmOn, farm: s.farm, farmCost: farmCost(s), mkt: s.mkt, mktCost: mktCost(s),
  }));
  const spoolSub = !v.spoolD ? t('spoolSub') : t(v.spoolD > 0 ? 'spoolUp' : 'spoolDn', Math.abs(Math.round(v.spoolD * 100)));
  return (
    <section class="card workshop-production v-p">
      <CardHead title={t(v.goal >= 2 ? 'investTitle' : 'production')} aside={v.goal >= 2 ? t('investAside') : undefined} />
      <BoostRow />
      <Item className="spool-row" name={t(v.bulk ? 'spool5Item' : 'spoolItem')} sub={v.showFeedstock ? v.feedstock + ' · ' + spoolSub : spoolSub}>
        <BuyButton action="spool" cost={v.spool} have={v.zl} label={money(v.spool)} />
      </Item>
      {v.goal >= 1 && (
        <Item name={t('toolItem')} sub={t('toolSub', v.clk, nf(v.clickPow, 2))}>
          <BuyButton action="tool" cost={v.clickCost} have={v.zl} label={money(v.clickCost)} />
        </Item>
      )}
      {v.goal >= 2 && (
        <Item name={t('autoItem')} sub={t('autoSub', fmt(v.auto), nf(v.spd, 2))}>
          <BuyButton action="auto" cost={v.autoCost} have={v.zl} label={money(v.autoCost)} />
        </Item>
      )}
      {v.goal >= 4 && (
        <Item name={t('mktItem')} sub={t('mktSub', v.mkt)}>
          <BuyButton action="mkt" cost={v.mktCost} have={v.zl} label={money(v.mktCost)} />
        </Item>
      )}
      {v.farmOn && (
        <Item name={t('farmItem')} sub={t('farmSub', fmt(v.farm))}>
          <BuyButton action="farm" cost={v.farmCost} have={v.zl} label={money(v.farmCost)} />
        </Item>
      )}
    </section>
  );
}
