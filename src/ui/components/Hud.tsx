import { useEffect, useRef, useState } from 'preact/hooks';
import { BAL } from '../../content/balance';
import { autobuyOn, filamentRunway } from '../../systems/filament';
import { MODELS } from '../../content/models';
import { piecesInStock } from '../../systems/inventory';
import { eff, gpu, opsCap } from '../../core/formulas';
import { dur, fmt, mass, money, playtime, t } from '../i18n';
import { currentSecondIncome } from '../../systems/workshopStats';
import { notifRequest, useS } from '../store';
import { WorkshopStats } from './WorkshopStats';
import { Chip, PopControl, PopId } from './hud/chip';
import { CountUp, GainFloats, countText } from './hud/countUp';
import { FundsSparkline } from './hud/fundsSparkline';
import { NoteToasts, NotificationPanel, NotificationsButton } from './hud/notifications';
import { FilamentPanel, StockPanel } from './hud/panels';
import { Tabs, useResearchUnlocked } from './hud/tabs';
import { onTablistKey } from '../tablist';

function PlaytimeChip() {
  const total = useS(s => Math.floor(s.priorPlay + s.play));
  return <Chip label={t('totalPlaytime')} value={playtime(total)} />;
}

export function Hud() {
  const v = useS(s => ({
    sp: s.ph === 2, g: s.goal, zl: s.zl, inv: s.ph === 2 ? Math.floor(s.inv) : MODELS.reduce((sum, m) => sum + piecesInStock(s, m.id), 0), fil: mass(s.fil), filWarn: s.ph === 1 && (s.fil < gpu(s) || (filamentRunway(s) < BAL.filamentWarnSeconds && !autobuyOn(s) && s.total > 0)),
    earn: s.ph === 1 ? currentSecondIncome(s) : 0, run: s.ph === 1 ? filamentRunway(s) : Infinity, auto: autobuyOn(s),
    real: (s.slow || 1) > 1, farmOn: s.farmOn, en: Math.round(eff(s) * 100), ops: fmt(Math.floor(s.ops)) + ' / ' + fmt(opsCap(s)), mat: fmt(s.mat) + ' t',
  }), );
  const unlocked = useResearchUnlocked();
  const hud = useRef<HTMLElement>(null);
  const [pop, setPop] = useState<{ id: PopId; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  // The chip that opened the panel: focus goes back to it when the panel closes from inside (Escape, the × button).
  const opener = useRef<HTMLElement | null>(null);
  const close = () => {
    clearTimeout(timer.current);
    if (document.activeElement?.closest('.hud-pop')) opener.current?.focus();
    setPop(null);
  };
  const show = (id: PopId, el: HTMLElement) => {
    clearTimeout(timer.current);
    opener.current = el;
    const bar = hud.current?.getBoundingClientRect(), chip = el.getBoundingClientRect();
    if (!bar) return;
    const width = Math.min(id === 'funds' ? 640 : id === 'notif' ? 440 : 320, bar.width - 16);
    setPop({ id, left: Math.max(8, Math.min(chip.left - bar.left, bar.width - width - 8)) });
  };
  const control: PopControl = {
    open: pop?.id ?? null, show,
    toggle: (id, el) => (pop?.id === id ? close() : show(id, el)),
    hideSoon: () => { clearTimeout(timer.current); timer.current = setTimeout(() => setPop(null), 200); },
  };
  // Escape closes; a tap outside the panel and its chips closes too (touch has no hover).
  useEffect(() => {
    if (!pop) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const away = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('.hud-pop, .chip.has-pop')) close(); };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', away);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', away); };
  }, [pop?.id]);
  useEffect(() => { if ((v.sp && pop?.id !== 'notif') || (v.g < 1 && pop?.id !== 'notif')) close(); }, [v.sp, v.g < 1]);
  // A click on a notification toast opens the panel.
  const request = notifRequest.value;
  useEffect(() => {
    // Two buttons exist (in the bar on desktop, floating on a phone); use the one that is on screen.
    const el = [...document.querySelectorAll<HTMLElement>('.hud-notif .chip, .notif-fab .chip')].find(e => e.getClientRects().length > 0);
    if (request > 0 && el) show('notif', el);
  }, [request]);
  return (
    <>
    <nav class="hud" ref={hud} aria-label={t('hudNav')}>
      {/* In space no chip opens a panel; the strip can still scroll sideways, so it takes the focus itself. */}
      <div class="chips" tabIndex={v.sp ? 0 : undefined} role={v.sp ? 'group' : undefined} aria-label={v.sp ? t('hudNav') : undefined}>
        <Chip show={!v.sp && v.g >= 1} big label={t('funds')} value={<CountUp value={v.zl} format={money} />} pop={control} popId="funds"
          sub={<>{(v.earn > 0 ? '+' : '') + t('moneyRate', money(v.earn))}<FundsSparkline /></>}><GainFloats /></Chip>
        <Chip show={v.g >= 1} label={t('stock')} value={<CountUp value={v.inv} format={countText} />} pop={v.sp ? undefined : control} popId="stock" />
        <Chip show={!v.sp} label={t('filament')} value={v.fil} warn={v.filWarn} pop={control} popId="fil"
          sub={Number.isFinite(v.run) && !v.auto ? t('filLeft', dur(Math.round(v.run))) : undefined}
          meter={Number.isFinite(v.run) && !v.auto ? (100 * v.run) / 600 : undefined} />
        <Chip show={!v.sp && v.farmOn} label={t('power')} value={v.en + '%'} warn={v.en < 100} />
        <Chip show={unlocked} label={t('compute')} value={v.ops} />
        <Chip show={v.sp} label={t('matter')} value={v.mat} />
        <Chip show={v.real} label={t('realBadge')} value={t('realBadgeV')} />
        <PlaytimeChip />
      </div>
      <div class="hud-notif"><NotificationsButton pop={control} /></div>
      <div class="hud-tabs"><div class="tabs" role="tablist" aria-label={t('tabsNav')} onKeyDown={onTablistKey}><Tabs /></div></div>
      <NoteToasts hidden={pop?.id === 'notif'} />
      {pop && (
        <div class={'hud-pop pop-' + pop.id} role="dialog" tabIndex={-1} aria-label={t(pop.id === 'funds' ? 'statsTitle' : pop.id === 'stock' ? 'popStock' : pop.id === 'notif' ? 'notifTitle' : 'popFil')}
          style={{ left: pop.left + 'px' }} onPointerEnter={() => clearTimeout(timer.current)} onPointerLeave={e => { if (e.pointerType === 'mouse') control.hideSoon(); }}
          onFocusOut={e => { const to = e.relatedTarget as HTMLElement | null; if (to && !to.closest('.hud-pop, .chip.has-pop')) close(); }}>
          <button class="pop-x" aria-label={t('popClose')} onClick={close}>×</button>
          {pop.id === 'funds' ? <WorkshopStats /> : pop.id === 'stock' ? <StockPanel /> : pop.id === 'notif' ? <NotificationPanel /> : <FilamentPanel />}
        </div>
      )}
    </nav>
    <div class="notif-fab"><NotificationsButton pop={control} /></div>
    </>
  );
}
