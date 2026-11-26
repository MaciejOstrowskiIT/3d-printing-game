import { useEffect } from 'preact/hooks';
import { dur, fmt, logText, money, prefs, t } from '../i18n';
import { act, adPending, awayReport, dialog, mobileView, resetGame, screen, ui, useS, watchAdForOfflineBonus } from '../store';
import { offlineBonusReady } from '../../systems/offlineBonus';
import { platform } from '../platform';
import { Toasts } from './Achievements';
import { SaveDialog } from './SaveDialog';
import { Title } from './Title';
import { PrestigeButton } from './Prestige';
import { Hud, Tabs, useBadges, useResearchUnlocked } from './Hud';
import { Research } from './Research';
import { PrintButton, Settings, Side } from './Side';
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
    </nav>
  );
}

function End() {
  const total = useS(s => (s.end ? s.total : 0));
  if (!total) return null;
  return (
    <div class="end">
      <div>
        <h2>{t('endTitle')}</h2>
        <p>{t('endTxt', fmt(total))}</p>
        <div class="end-actions">
          <PrestigeButton class="btn-main big" />
          <PrestigeButton class="big" realistic />
          <button onClick={() => resetGame('again')}>{t('again')}</button>
        </div>
      </div>
    </div>
  );
}

/** Rewarded ad offer on the away report: doubles what the shop earned while the player was away. */
function OfflineBonusButton() {
  const v = useS(s => (offlineBonusReady(s) ? { zl: s.offB, fig: s.offBi } : null));
  if (!v || !platform.rewardedAvailable) return null;
  const gain = v.zl ? money(v.zl) : t('figs', fmt(v.fig));
  return (
    <button class="btn-main ad-x2" disabled={adPending.value} onClick={() => void watchAdForOfflineBonus()}>
      {t('offx2Btn', gain)}
    </button>
  );
}

export function App() {
  const tab = useS(s => s.tab);
  const sp = useS(s => s.ph === 2);
  const lang = prefs.value.lang;

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

  if (screen.value === 'title') return (<><Title /><SaveDialog /></>);

  return (
    <>
      <div class="app">
        <Side />
        <div class="main">
          <Hud />
          <div class="content">
            {awayReport.value && <div class="away-report">
              <span role="status">{logText(awayReport.value)}{awayReport.value.idle ? ' ' + t('offIdleTail', dur(awayReport.value.idle)) : ''}</span>
              <OfflineBonusButton />
              <button aria-label={t('sClose')} onClick={() => { awayReport.value = undefined; }}>×</button>
            </div>}
            {tab === 'r' ? <Research /> : <Workshop />}
            <Settings class="mset" />
          </div>
        </div>
      </div>
      <Dock />
      <Toasts />
      <End />
      <SaveDialog />
    </>
  );
}
