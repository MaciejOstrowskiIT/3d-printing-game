import { useEffect } from 'preact/hooks';
import { HINTS } from '../../content/hints';
import { li, prefs, reducedMotion, t } from '../i18n';
import { act, dialog, mobileView, screen, ui, useS } from '../store';
import { Toasts } from './Achievements';
import { AlphaBadge } from './AlphaBadge';
import { AwayDialog } from './AwayDialog';
import { NotificationToasts } from './hud/notifications';
import { ReportDialog } from './ReportDialog';
import { SaveDialog } from './SaveDialog';
import { SettingsDialog } from './SettingsDialog';
import { Title } from './Title';
import { End } from './End';
import { Hud } from './Hud';
import { Tabs, useBadges, useResearchUnlocked } from './hud/tabs';
import { Research } from './Research';
import { AchievementsCard } from './Achievements';
import { Side } from './Side';
import { PrintButton } from './side/printControls';
import { Settings } from './side/settings';
import { Workshop } from './Workshop';

const NavIcon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>
);

/** Phone navigation: Production and Sales views of the Workshop, Print in the middle, Research. */
function Dock() {
  const v = useS(s => ({ sp: s.ph === 2, tab: s.tab, sales: s.goal >= 1 }));
  const research = useResearchUnlocked();
  const b = useBadges();
  if (v.sp) return <nav class="dock"><Tabs /></nav>;
  const go = (view: 'p' | 's') => { mobileView.value = view; ui(s => { s.tab = 'w'; }); window.scrollTo({ top: 0 }); };
  const on = (view: 'p' | 's') => v.tab === 'w' && (mobileView.value === view || (!v.sales && view === 'p'));
  return (
    <nav class="dock nav4" role="tablist">
      <button class="tab" role="tab" aria-selected={on('p')} onClick={() => go('p')}>
        <NavIcon d="M4 4h16v16H4zM8 15h8M10 4v6h4V4" /><span>{t('navProd')}</span>{b.workshop && <span class="dot">!</span>}
      </button>
      <button class="tab" role="tab" aria-selected={on('s')} disabled={!v.sales} onClick={() => go('s')}>
        <NavIcon d="M4 20V10M10 20V4M16 20v-7M22 20H2" /><span>{t('navSales')}</span>
      </button>
      <PrintButton short />
      <button class="tab" role="tab" aria-selected={v.tab === 'r'} disabled={!research} onClick={() => { ui(s => { s.tab = 'r'; }); window.scrollTo({ top: 0 }); }}>
        <NavIcon d="M6 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5M18 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5M12 15.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5M7.5 8l3.5 8M16.5 8 13 16" />
        <span>{t('tabR')}</span>{b.research > 0 && <span class="dot" key={b.research}>{b.research}</span>}
      </button>
      <button class="tab" role="tab" aria-selected={v.tab === 'a'} onClick={() => { ui(s => { s.tab = 'a'; }); window.scrollTo({ top: 0 }); }}>
        <NavIcon d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
        <span>{t('tabA')}</span>
      </button>
    </nav>
  );
}

function OnboardingHint() {
  const active = useS(s => s.hints.active);
  const hint = HINTS.find(item => item.id === active);
  if (!hint || prefs.value.hints === false) return null;
  return (
    <div class="onboarding-hint">
      <span role="status">{hint.text[li()]}</span>
      <button aria-label={t('dismissHint')} onClick={() => act('hint-dismiss')}>×</button>
    </div>
  );
}

export function App() {
  const tab = useS(s => s.tab);
  const sp = useS(s => s.ph === 2);
  const lang = prefs.value.lang;
  const motionReduced = reducedMotion();
  // Settings → Reduce motion (or the system setting) switches every animation off through one CSS hook.
  useEffect(() => { document.documentElement.dataset.motion = motionReduced ? 'reduced' : 'full'; }, [motionReduced]);

  useEffect(() => { document.body.classList.toggle('space', sp); }, [sp]);
  useEffect(() => { document.documentElement.lang = lang; document.title = t('title') + (lang === 'pl' ? ' — gra' : ' — game'); }, [lang]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const editing = document.activeElement?.matches('button:enabled, input, textarea, select, [contenteditable]:not([contenteditable="false"])');
      if (screen.value !== 'game' || dialog.value) return;
      if (e.code === 'Space' && !e.repeat && !editing && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); act('print'); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (screen.value === 'title') return (<><Title /><SaveDialog /><SettingsDialog /><ReportDialog /></>);

  return (
    <>
      <div class="app">
        <Side />
        <div class="main">
          <Hud />
          <div class="content">
            <OnboardingHint />
            {tab === 'r' ? <Research /> : tab === 'a' ? <AchievementsCard /> : <Workshop />}
            <Settings class="mset" />
          </div>
        </div>
      </div>
      <Dock />
      <AwayDialog />
      <NotificationToasts />
      <Toasts />
      <End />
      <SaveDialog />
      <SettingsDialog />
      <ReportDialog />
      <AlphaBadge />
    </>
  );
}
