import { useEffect } from 'preact/hooks';
import { fmt, prefs, t } from '../i18n';
import { act, resetGame, useS } from '../store';
import { Toasts } from './Achievements';
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

export function App() {
  const tab = useS(s => s.tab);
  const sp = useS(s => s.ph === 2);
  const lang = prefs.value.lang;

  useEffect(() => { document.body.classList.toggle('space', sp); }, [sp]);
  useEffect(() => { document.documentElement.lang = lang; document.title = t('title') + (lang === 'pl' ? ' — gra' : ' — game'); }, [lang]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement?.tagName;
      if (e.code === 'Space' && !e.repeat && el !== 'BUTTON' && el !== 'INPUT' && el !== 'TEXTAREA') { e.preventDefault(); act('print'); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div class="app">
        <Side />
        <div class="main">
          <Hud />
          <div class="content">
            {tab === 'r' ? <Research /> : <Workshop />}
            <Settings class="mset" />
          </div>
        </div>
      </div>
      <Dock />
      <Toasts />
      <End />
    </>
  );
}
