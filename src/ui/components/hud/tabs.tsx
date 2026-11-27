import { TREE } from '../../../content/tree';
import { freePts } from '../../../core/formulas';
import { has } from '../../../core/state';
import { nodeStatus, researchUnlocked } from '../../../systems/research';
import { t } from '../../i18n';
import { ui, useS } from '../../store';
import { MAIN_PANEL_ID, tabId } from '../../tablist';

/** Whether the Research tab is unlocked yet. */
export const useResearchUnlocked = () => useS(researchUnlocked);

/** Pending items in Research (buyable nodes + free points) and the Workshop alert flag. */
export function useBadges() {
  const research = useS(s => TREE.filter(n => nodeStatus(s, n) === 'ready').length + Math.max(0, freePts(s)));
  const workshop = useS(s => s.tab !== 'w' && s.ph === 1 && ((!!s.ord && !s.ord.acc) || (s.brk > 0 && !(has(s, 'kamera') && s.amOn.kamera))));
  return { research, workshop };
}

/** Tab badges: the dot is decoration, screen readers hear the hidden text instead. */
export const AlertDot = () => <><span class="dot" aria-hidden="true">!</span><span class="sr-only">{t('tabAlert')}</span></>;
export const CountDot = ({ n }: { n: number }) =>
  <><span class="dot" key={n} aria-hidden="true">{n}</span><span class="sr-only">{t('tabReady', n)}</span></>;

/** The main game tabs. In the HUD they sit in a `role="tablist"`; with `nav` they are plain navigation buttons that
 *  mark the current view with `aria-current` (the phone dock in space). */
export function Tabs({ class: cls, nav }: { class?: string; nav?: boolean }) {
  const tab = useS(s => s.tab);
  const unlocked = useResearchUnlocked();
  const b = useBadges();
  const props = (id: 'w' | 'r' | 'a') => nav
    ? { 'aria-current': tab === id ? ('page' as const) : undefined }
    : { id: tabId(id), role: 'tab' as const, 'aria-selected': tab === id, 'aria-controls': MAIN_PANEL_ID, tabIndex: tab === id ? 0 : -1 };
  return (
    <>
      <button class={'tab tabW ' + (cls ?? '')} {...props('w')} onClick={() => ui(s => { s.tab = 'w'; })}>
        <span>{t('tabW')}</span>{b.workshop && <AlertDot />}
      </button>
      {unlocked && (
        <button class={'tab tabR ' + (cls ?? '')} {...props('r')} onClick={() => ui(s => { s.tab = 'r'; })}>
          <span>{t('tabR')}</span>{b.research > 0 && <CountDot n={b.research} />}
        </button>
      )}
      <button class={'tab tabA ' + (cls ?? '')} {...props('a')} onClick={() => ui(s => { s.tab = 'a'; })}>
        <span>{t('tabA')}</span>
      </button>
    </>
  );
}
