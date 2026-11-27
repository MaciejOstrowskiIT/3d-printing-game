import { BAL } from '../../../content/balance';
import { gpu, material } from '../../../core/formulas';
import { has, type GameState } from '../../../core/state';
import { canAfford } from '../../../systems/marketEvents';
import { MARKET_EVENT } from '../../../content/events';
import { STORY_MSG } from '../../../content/story';
import { CALENDAR_EVENT, calendarOn } from '../../../content/calendar';
import { materialStock } from '../../../systems/materials';
import { autobuyOn, filamentRunway, stockedAlternative } from '../../../systems/filament';
import { act, useS } from '../../store';
import { clock, dict, fmt, li, money, t } from '../../i18n';
import { Meter } from '../common';
import { FilamentAlert } from './investments';

/** A market event offer (content/events.ts) with its price, countdown and a take-it-or-leave-it choice. */
function MarketOffer() {
  const m = useS(s => (s.ph === 1 && s.mev ? { ...s.mev, ok: canAfford(s) } : null));
  if (!m) return null;
  const e = MARKET_EVENT[m.id];
  if (!e?.offer) return null;
  const cost = money(m.cost);
  return (
    <div class={'ev' + (e.counter ? ' bad' : '')}>
      <div class="evt">
        <b>{e.name[li()]}</b>
        <p>{e.desc[li()].replace('{0}', cost)} {t('mevExp', Math.ceil(m.offer))}</p>
        <Meter tone="or" pct={(100 * m.offer) / BAL.marketEventOffer} />
      </div>
      <div class="evb">
        <button class="btn-main" disabled={!m.ok} onClick={() => act('mevyes')}>{e.offer.btn[li()]}</button>
        <button onClick={() => act('mevno')}>{t('decline')}</button>
      </div>
    </div>
  );
}

/** Running market effects as small chips with a countdown; red when the effect hurts. */
function MarketEffects() {
  const fx = useS(s => (s.ph === 1 ? s.mfx.map(f => `${f.id}:${Math.ceil(f.t)}`).join(',') : ''));
  const cal = useS(s => (s.ph === 1 ? calendarOn(s.today).map(e => e.id).join(',') : ''));
  if (!fx && !cal) return null;
  return (
    <div class="mfx" aria-label={t('fxTitle')}>
      {cal && cal.split(',').map(id => {
        const e = CALENDAR_EVENT[id];
        return <span key={id} class="mchip cal" title={e.desc[li()]}>📅 {e.name[li()]}</span>;
      })}
      {fx && fx.split(',').map(item => {
        const [id, left] = item.split(':');
        const e = MARKET_EVENT[id];
        if (!e) return null;
        const bad = (e.demand ?? 1) < 1 || (e.spool ?? 1) > 1;
        return (
          <span key={id} class={'mchip' + (bad ? ' bad' : '')} title={e.desc[li()].replace('{0}', '…')}>
            {e.name[li()]} · {t('fxLeft', clock(+left))}
          </span>
        );
      })}
    </div>
  );
}

/** Stopwatch badge: m:ss left, turns from orange to red as time runs out and pulses in the last seconds. */
function Countdown({ left, total }: { left: number; total: number }) {
  const sec = Math.max(0, Math.ceil(left));
  const frac = total > 0 ? Math.min(1, Math.max(0, left / total)) : 0;
  return (
    <div class={'countdown' + (sec <= 15 ? ' urgent' : '')} role="timer" aria-label={`${t('timeLeft')}: ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`} style={{ '--t': frac.toFixed(3) }}>
      <span aria-hidden="true">⏱</span> <b>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</b>
    </div>
  );
}

/** Order of the day: ship from stock any time today; days in a row raise the pay. */
function DailyOrderCard() {
  const d = useS(s => (s.ph === 1 && s.dord && s.dord.day === s.dday ? { ...s.dord, inv: s.inv, streak: s.dstreak } : null));
  if (!d) return null;
  const client = dict().clients[d.c] ?? '';
  const streakShown = d.done ? d.streak : d.streak + 1;
  return (
    <div class={'ev daily' + (d.done ? ' done' : '')}>
      <div class="evt">
        <b>{t('dTitle')} <span class="dstreak">{t('dStreak', streakShown)}</span></b>
        <p>{d.done ? t('dDoneTxt') : t('dDesc', client, fmt(d.n), money(d.pay))}</p>
        {!d.done && <Meter tone="or" pct={Math.min(100, (100 * d.inv) / d.n)} />}
        {!d.done && <small>{t('dNeed', fmt(Math.floor(d.inv)), fmt(d.n))}</small>}
      </div>
      {!d.done && <div class="evb"><button class="btn-main" disabled={d.inv < d.n} onClick={() => act('daily')}>{t('dBtn', fmt(d.n))}</button></div>}
    </div>
  );
}

/** The open story message (content/story.ts), dismissed with OK. */
function StoryCard() {
  const id = useS(s => s.msg);
  const m = id ? STORY_MSG[id] : null;
  if (!m) return null;
  return (
    <div class="ev story" role="status">
      <div class="evt"><b>✉️ {m.from[li()]}</b><p>{m.text[li()]}</p></div>
      <div class="evb"><button onClick={() => act('msgok')}>{t('msgOk')}</button></div>
    </div>
  );
}

export function filamentNotice(s: GameState) {
  if (s.ph !== 1 || s.total === 0) return null;
  const out = s.fil < gpu(s), runway = filamentRunway(s);
  if (!out && (runway >= BAL.filamentWarnSeconds || autobuyOn(s))) return null;
  const alt = out ? stockedAlternative(s) : null;
  return { out, runway, mat: material(s).name[li()], alt, altG: alt ? materialStock(s, alt) : 0 };
}

/** Every open notification as a card. Lives in the HUD notification panel (`panel`), so the Workshop page never moves. */
export function Events({ panel = false }: { panel?: boolean }) {
  const maintenance = useS(s => s.ph === 1 && s.farmOn);
  const o = useS(s => (s.ph === 1 && s.ord ? { ...s.ord } : null));
  const brk = useS(s => (s.ph === 1 && s.brk > 0 ? { brk: s.brk, c: s.brkC, fixT: s.fixT, cam: has(s, 'kamera') && !!s.amOn.kamera } : null));
  const market = useS(s => s.ph === 1 && (!!s.mev || s.mfx.length > 0 || calendarOn(s.today).length > 0));
  const daily = useS(s => s.ph === 1 && !!s.dord && s.dord.day === s.dday);
  const msg = useS(s => !!s.msg);
  const filament = useS(s => !!filamentNotice(s));
  if (!o && !brk && !maintenance && !market && !daily && !msg && !filament) return panel ? <p class="hint">{t('workshopNoNotices')}</p> : null;
  return (
    <div class="events" aria-label={t('workshopNotices')} role="region">
      <FilamentAlert />
      {(brk || maintenance) && (
        <div class={`ev${brk ? ' bad' : ''}${maintenance ? ' maintenance' : ''}`}>
          <div class="evt">
            <b>{t(brk ? 'brkTitle' : 'maintenanceTitle')}</b>
            <p>{brk ? t('bDesc', Math.round(brk.brk * 100), dict().causes[brk.c]) : t('maintenanceReady')}
              {brk?.cam ? ' ' + t('bAuto', Math.ceil(Math.max(0, brk.fixT))) : ''}
            </p>
          </div>
          {brk && !brk.cam && <div class="evb"><button class="btn-main" onClick={() => act('fix')}>{t('repair')}</button></div>}
        </div>
      )}
      {o && (
        <div class="ev order-card">
          <div class="evt">
            <b>{t('oFrom', dict().clients[o.c])}</b>
            <div class="order-card-state">
              <p aria-hidden={o.acc}>{t('oOffer', fmt(o.n), fmt(o.time), money(o.pay))}</p>
              <p aria-hidden={!o.acc}>{t('oProg', fmt(o.got), fmt(o.n), money(o.pay))}</p>
            </div>
            <Meter tone="or" pct={o.acc ? (100 * o.got) / o.n : (100 * o.offer) / BAL.orderOffer} />
          </div>
          <Countdown left={o.acc ? o.left : o.offer} total={o.acc ? o.time : BAL.orderOffer} />
          <div class="order-card-state order-card-footer">
            <div class="evb" aria-hidden={o.acc}>
              <button class="btn-main" onClick={() => act('oacc')}>{t('accept')}</button>
              <button onClick={() => act('odec')}>{t('decline')}</button>
            </div>
            <p class="hint" aria-hidden={!o.acc}>{t('oHint')}</p>
          </div>
        </div>
      )}
      <StoryCard />
      <DailyOrderCard />
      <MarketOffer />
      <MarketEffects />
    </div>
  );
}
