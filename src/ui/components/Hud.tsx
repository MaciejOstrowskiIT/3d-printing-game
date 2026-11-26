import { BAL } from '../../content/balance';
import { autobuyOn, filamentRunway } from '../../systems/filament';
import { MODELS } from '../../content/models';
import { piecesInStock } from '../../systems/inventory';
import { TREE } from '../../content/tree';
import { eff, freePts, gpu, opsCap } from '../../core/formulas';
import { has } from '../../core/state';
import { nodeStatus } from '../../systems/research';
import { fmt, money, t } from '../i18n';
import { ui, useS } from '../store';

const Chip = ({ label, value, warn, show = true }: { label: string; value: string; warn?: boolean; show?: boolean }) =>
  show ? <div class={'chip' + (warn ? ' warn' : '')}><small>{label}</small><b>{value}</b></div> : null;

/** Whether the Research tab is unlocked yet. */
export const useResearchUnlocked = () => useS(s => s.goal >= 5 || s.rep > 0 || s.done.length > 0 || s.meta.runs > 0 || s.meta.patents > 0);

/** Pending items in Research (buyable nodes + free points) and the Workshop alert flag. */
export function useBadges() {
  const research = useS(s => TREE.filter(n => nodeStatus(s, n) === 'ready').length + Math.max(0, freePts(s)));
  const workshop = useS(s => s.tab === 'r' && s.ph === 1 && ((!!s.ord && !s.ord.acc) || (s.brk > 0 && !(has(s, 'kamera') && s.amOn.kamera))));
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
          <span>{t('tabR')}</span>{b.research > 0 && <span class="dot">{b.research}</span>}
        </button>
      )}
    </>
  );
}

export function Hud() {
  const v = useS(s => ({
    sp: s.ph === 2, g: s.goal, zl: money(s.zl), inv: fmt(s.ph === 2 ? Math.floor(s.inv) : MODELS.reduce((sum, m) => sum + piecesInStock(s, m.id), 0)), fil: fmt(s.fil) + ' g', filWarn: s.ph === 1 && (s.fil < gpu(s) || (filamentRunway(s) < BAL.filamentWarnSeconds && !autobuyOn(s) && s.total > 0)),
    real: (s.slow || 1) > 1, farmOn: s.farmOn, en: Math.round(eff(s) * 100), ops: fmt(Math.floor(s.ops)) + ' / ' + fmt(opsCap(s)), mat: fmt(s.mat) + ' t',
  }), );
  const unlocked = useResearchUnlocked();
  return (
    <nav class="hud">
      <div class="chips">
        <Chip show={!v.sp && v.g >= 1} label={t('funds')} value={v.zl} />
        <Chip show={v.g >= 1} label={t('stock')} value={v.inv} />
        <Chip show={!v.sp} label={t('filament')} value={v.fil} warn={v.filWarn} />
        <Chip show={!v.sp && v.farmOn} label={t('power')} value={v.en + '%'} warn={v.en < 100} />
        <Chip show={unlocked} label={t('compute')} value={v.ops} />
        <Chip show={v.sp} label={t('matter')} value={v.mat} />
        <Chip show={v.real} label={t('realBadge')} value={t('realBadgeV')} />
      </div>
      <div class="tabs" role="tablist"><Tabs /></div>
    </nav>
  );
}
