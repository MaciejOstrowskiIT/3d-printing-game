import { useEffect } from 'preact/hooks';
import { fmt, logText, money, prefs, t } from '../i18n';
import { act, adPending, awayReport, dialog, resetGame, screen, useS, watchAdForOfflineBonus } from '../store';
import { offlineBonusReady } from '../../systems/offlineBonus';
import { platform } from '../platform';
import { Toasts } from './Achievements';
import { SaveDialog } from './SaveDialog';
import { Title } from './Title';
import { PrestigeButton } from './Prestige';
import { Hud, Tabs } from './Hud';
import { Research } from './Research';
import { PrintButton, Settings, Side } from './Side';
import { Workshop } from './Workshop';

function Dock() {
  const sp = useS(s => s.ph === 2);
  return (
    <nav class="dock">
      <Tabs />
      {!sp && <PrintButton short />}
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
      const el = document.activeElement?.tagName;
      if (screen.value !== 'game' || dialog.value) return;
      if (e.code === 'Space' && !e.repeat && el !== 'BUTTON' && el !== 'INPUT' && el !== 'TEXTAREA') { e.preventDefault(); act('print'); }
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
              <span role="status">{logText(awayReport.value)}</span>
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
