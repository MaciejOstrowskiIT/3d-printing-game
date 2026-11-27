import { TREE } from '../../../content/tree';
import { freePts } from '../../../core/formulas';
import { has } from '../../../core/state';
import { nodeStatus, researchUnlocked } from '../../../systems/research';
import { t } from '../../i18n';
import { ui, useS } from '../../store';

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
