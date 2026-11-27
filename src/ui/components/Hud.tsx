import { useEffect, useRef, useState } from 'preact/hooks';
import { BAL } from '../../content/balance';
import { autobuyOn, filamentRunway } from '../../systems/filament';
import { MATERIALS } from '../../content/materials';
import { MODELS } from '../../content/models';
import { piecesInStock } from '../../systems/inventory';
import { materialStock } from '../../systems/materials';
import { TREE } from '../../content/tree';
import { eff, freePts, gpu, opsCap } from '../../core/formulas';
import { has } from '../../core/state';
import { nodeStatus, researchUnlocked } from '../../systems/research';
import { dur, fmt, li, mass, money, playtime, t } from '../i18n';
import { currentSecondIncome } from '../../systems/workshopStats';
import { ui, useS } from '../store';
import { WorkshopStats } from './WorkshopStats';

type PopId = 'funds' | 'stock' | 'fil';
/** Chip that can open a panel on hover (mouse), tap or Enter (touch and keyboard). */
interface PopControl { open: PopId | null; toggle: (id: PopId, el: HTMLElement) => void; show: (id: PopId, el: HTMLElement) => void; hideSoon: () => void }

const Chip = ({ label, value, warn, show = true, sub, meter, big, pop, popId }: { label: string; value: string; warn?: boolean; show?: boolean; sub?: string; meter?: number; big?: boolean; pop?: PopControl; popId?: PopId }) =>
  show ? (
    <div class={'chip' + (warn ? ' warn' : '') + (big ? ' big' : '') + (pop && popId ? ' has-pop' : '')}
      {...(pop && popId ? {
        role: 'button', tabIndex: 0, 'aria-haspopup': 'dialog', 'aria-expanded': pop.open === popId,
        onPointerEnter: (e: PointerEvent) => { if (e.pointerType === 'mouse') pop.show(popId, e.currentTarget as HTMLElement); },
        onPointerLeave: (e: PointerEvent) => { if (e.pointerType === 'mouse') pop.hideSoon(); },
        onClick: (e: MouseEvent) => { if ((e as unknown as PointerEvent).pointerType !== 'mouse') pop.toggle(popId, e.currentTarget as HTMLElement); },
        onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter') pop.toggle(popId, e.currentTarget as HTMLElement); },
      } : {})}>
      <small>{label}</small><b>{value}</b>
      {sub && <small class="chip-sub">{sub}</small>}
      {meter !== undefined && <span class="chip-meter"><i style={{ width: Math.max(0, Math.min(100, meter)) + '%' }} /></span>}
    </div>
  ) : null;

function StockPanel() {
  const rows = useS(s => MODELS.filter(m => s.mdls.includes(m.id)).map(m => m.id + ':' + piecesInStock(s, m.id)).join(','));
  const list = rows.split(',').filter(Boolean).map(r => r.split(':')).map(([id, n]) => ({ m: MODELS.find(m => m.id === id)!, n: Number(n) }));
  return (
    <section class="pop-body">
      <h2>{t('popStock')}</h2>
      <ul class="pop-list">
        {list.map(({ m, n }) => <li key={m.id} class={n > 0 ? '' : 'zero'}><span>{m.name[li()]}</span><b>{fmt(Math.floor(n))}</b></li>)}
      </ul>
    </section>
  );
}

function FilamentPanel() {
  const rows = useS(s => MATERIALS.filter(m => m.id === s.materialId || materialStock(s, m.id) > 0).map(m => m.id + ':' + materialStock(s, m.id)).join(','));
  const active = useS(s => s.materialId);
  const list = rows.split(',').filter(Boolean).map(r => r.split(':')).map(([id, g]) => ({ m: MATERIALS.find(m => m.id === id)!, g: Number(g) }));
  return (
    <section class="pop-body">
      <h2>{t('popFil')}</h2>
      <ul class="pop-list">
        {list.map(({ m, g }) => <li key={m.id} class={m.id === active ? 'active' : ''}>
          <span>{m.name[li()]}{m.id === active && <small>{t('popFilActive')}</small>}</span><b>{mass(g)}</b>
        </li>)}
      </ul>
    </section>
  );
}

/** Whether the Research tab is unlocked yet. */
export const useResearchUnlocked = () => useS(researchUnlocked);

/** Pending items in Research (buyable nodes + free points) and the Workshop alert flag. */
export function useBadges() {
  const research = useS(s => TREE.filter(n => nodeStatus(s, n) === 'ready').length + Math.max(0, freePts(s)));
  const workshop = useS(s => s.tab !== 'w' && s.ph === 1 && ((!!s.ord && !s.ord.acc) || (s.brk > 0 && !(has(s, 'kamera') && s.amOn.kamera))));
  return { research, workshop };
}

export function Tabs({ class: cls }: { class?: string }) {
  const tab = useS(s => s.tab);
  const unlocked = useResearchUnlocked();
  const b = useBadges();
  return (
    <>
      <button class={'tab tabW ' + (cls ?? '')} role="tab" aria-selected={tab === 'w'} onClick={() => ui(s => { s.tab = 'w'; })}>
        <span>{t('tabW')}</span>{b.workshop && <span class="dot">!</span>}
      </button>
      {unlocked && (
        <button class={'tab tabR ' + (cls ?? '')} role="tab" aria-selected={tab === 'r'} onClick={() => ui(s => { s.tab = 'r'; })}>
          <span>{t('tabR')}</span>{b.research > 0 && <span class="dot" key={b.research}>{b.research}</span>}
        </button>
      )}
      <button class={'tab tabA ' + (cls ?? '')} role="tab" aria-selected={tab === 'a'} onClick={() => ui(s => { s.tab = 'a'; })}>
        <span>{t('tabA')}</span>
      </button>
    </>
  );
}

function PlaytimeChip() {
  const total = useS(s => Math.floor(s.priorPlay + s.play));
  return <Chip label={t('totalPlaytime')} value={playtime(total)} />;
}

export function Hud() {
  const v = useS(s => ({
    sp: s.ph === 2, g: s.goal, zl: money(s.zl), inv: fmt(s.ph === 2 ? Math.floor(s.inv) : MODELS.reduce((sum, m) => sum + piecesInStock(s, m.id), 0)), fil: mass(s.fil), filWarn: s.ph === 1 && (s.fil < gpu(s) || (filamentRunway(s) < BAL.filamentWarnSeconds && !autobuyOn(s) && s.total > 0)),
    earn: s.ph === 1 ? currentSecondIncome(s) : 0, run: s.ph === 1 ? filamentRunway(s) : Infinity, auto: autobuyOn(s),
    real: (s.slow || 1) > 1, farmOn: s.farmOn, en: Math.round(eff(s) * 100), ops: fmt(Math.floor(s.ops)) + ' / ' + fmt(opsCap(s)), mat: fmt(s.mat) + ' t',
  }), );
  const unlocked = useResearchUnlocked();
  const hud = useRef<HTMLElement>(null);
  const [pop, setPop] = useState<{ id: PopId; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const close = () => { clearTimeout(timer.current); setPop(null); };
  const show = (id: PopId, el: HTMLElement) => {
    clearTimeout(timer.current);
    const bar = hud.current?.getBoundingClientRect(), chip = el.getBoundingClientRect();
    if (!bar) return;
    const width = Math.min(id === 'funds' ? 640 : 320, bar.width - 16);
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
  useEffect(() => { if (v.sp || v.g < 1) close(); }, [v.sp, v.g < 1]);
  return (
    <nav class="hud" ref={hud}>
      <div class="chips">
        <Chip show={!v.sp && v.g >= 1} big label={t('funds')} value={v.zl} pop={control} popId="funds"
          sub={(v.earn > 0 ? '+' : '') + t('moneyRate', money(v.earn))} />
        <Chip show={v.g >= 1} label={t('stock')} value={v.inv} pop={v.sp ? undefined : control} popId="stock" />
        <Chip show={!v.sp} label={t('filament')} value={v.fil} warn={v.filWarn} pop={control} popId="fil"
          sub={Number.isFinite(v.run) && !v.auto ? t('filLeft', dur(Math.round(v.run))) : undefined}
          meter={Number.isFinite(v.run) && !v.auto ? (100 * v.run) / 600 : undefined} />
        <Chip show={!v.sp && v.farmOn} label={t('power')} value={v.en + '%'} warn={v.en < 100} />
        <Chip show={unlocked} label={t('compute')} value={v.ops} />
        <Chip show={v.sp} label={t('matter')} value={v.mat} />
        <Chip show={v.real} label={t('realBadge')} value={t('realBadgeV')} />
        <PlaytimeChip />
      </div>
      <div class="tabs" role="tablist"><Tabs /></div>
      {pop && (
        <div class={'hud-pop pop-' + pop.id} role="dialog" aria-label={t(pop.id === 'funds' ? 'statsTitle' : pop.id === 'stock' ? 'popStock' : 'popFil')}
          style={{ left: pop.left + 'px' }} onPointerEnter={() => clearTimeout(timer.current)} onPointerLeave={e => { if (e.pointerType === 'mouse') control.hideSoon(); }}>
          <button class="pop-x" aria-label={t('popClose')} onClick={close}>×</button>
          {pop.id === 'funds' ? <WorkshopStats /> : pop.id === 'stock' ? <StockPanel /> : <FilamentPanel />}
        </div>
      )}
    </nav>
  );
}
