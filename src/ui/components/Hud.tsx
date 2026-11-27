import { BAL } from '../../content/balance';
import { autobuyOn, filamentRunway } from '../../systems/filament';
import { MODELS } from '../../content/models';
import { piecesInStock } from '../../systems/inventory';
import { TREE } from '../../content/tree';
import { eff, freePts, gpu, opsCap } from '../../core/formulas';
import { has } from '../../core/state';
import { nodeStatus, researchUnlocked } from '../../systems/research';
import { dur, fmt, mass, money, playtime, t } from '../i18n';
import { incomePerSecond } from '../../systems/workshopStats';
import { ui, useS } from '../store';

const Chip = ({ label, value, warn, show = true, sub, meter, big }: { label: string; value: string; warn?: boolean; show?: boolean; sub?: string; meter?: number; big?: boolean }) =>
  show ? (
    <div class={'chip' + (warn ? ' warn' : '') + (big ? ' big' : '')}>
      <small>{label}</small><b>{value}</b>
      {sub && <small class="chip-sub">{sub}</small>}
      {meter !== undefined && <span class="chip-meter"><i style={{ width: Math.max(0, Math.min(100, meter)) + '%' }} /></span>}
    </div>
  ) : null;

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

function PlaytimeChips() {
  const line = useS(s => Math.floor(s.play));
  const total = useS(s => Math.floor(s.priorPlay + s.play));
  return (
    <>
      <Chip label={t('linePlaytime')} value={playtime(line)} />
      <Chip label={t('totalPlaytime')} value={playtime(total)} />
    </>
  );
}

export function Hud() {
  const v = useS(s => ({
    sp: s.ph === 2, g: s.goal, zl: money(s.zl), inv: fmt(s.ph === 2 ? Math.floor(s.inv) : MODELS.reduce((sum, m) => sum + piecesInStock(s, m.id), 0)), fil: mass(s.fil), filWarn: s.ph === 1 && (s.fil < gpu(s) || (filamentRunway(s) < BAL.filamentWarnSeconds && !autobuyOn(s) && s.total > 0)),
    earn: s.ph === 1 ? incomePerSecond(s) : 0, run: s.ph === 1 ? filamentRunway(s) : Infinity, auto: autobuyOn(s),
    real: (s.slow || 1) > 1, farmOn: s.farmOn, en: Math.round(eff(s) * 100), ops: fmt(Math.floor(s.ops)) + ' / ' + fmt(opsCap(s)), mat: fmt(s.mat) + ' t',
  }), );
  const unlocked = useResearchUnlocked();
  return (
    <nav class="hud">
      <div class="chips">
        <Chip show={!v.sp && v.g >= 1} big label={t('funds')} value={v.zl} sub={v.earn > 0 ? '+' + t('moneyRate', money(v.earn)) : '\u00a0'} />
        <Chip show={v.g >= 1} label={t('stock')} value={v.inv} />
        <Chip show={!v.sp} label={t('filament')} value={v.fil} warn={v.filWarn}
          sub={Number.isFinite(v.run) && !v.auto ? t('filLeft', dur(Math.round(v.run))) : undefined}
          meter={Number.isFinite(v.run) && !v.auto ? (100 * v.run) / 600 : undefined} />
        <Chip show={!v.sp && v.farmOn} label={t('power')} value={v.en + '%'} warn={v.en < 100} />
        <Chip show={unlocked} label={t('compute')} value={v.ops} />
        <Chip show={v.sp} label={t('matter')} value={v.mat} />
        <Chip show={v.real} label={t('realBadge')} value={t('realBadgeV')} />
        <PlaytimeChips />
      </div>
      <div class="tabs" role="tablist"><Tabs /></div>
    </nav>
  );
}
