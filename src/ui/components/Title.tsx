import { useEffect, useRef, useState } from 'preact/hooks';
import { createState } from '../../core/state';
import { AlphaBadge } from './AlphaBadge';
import { fmt, prefs, setPrefs, t } from '../i18n';
import { mountPrinter } from '../scene/printer';
import { reporter } from '../report';
import { dialog, game, startGame, useS } from '../store';

/** Title screen: animated printer, continue / new game / load save, language and sound. */
export function Title() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [sure, setSure] = useState(false);
  const playRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // The title printer always prints, in the player's current filament colour.
    const demo = { ...createState(), auto: 2, col: game.s.col };
    const p = mountPrinter(svgRef.current!, () => demo);
    playRef.current?.focus();
    return () => p.destroy();
  }, []);
  useEffect(() => { if (!sure) return; const id = setTimeout(() => setSure(false), 4000); return () => clearTimeout(id); }, [sure]);

  const v = useS(s => ({ has: s.total > 0 || s.meta.runs > 0, total: Math.floor(s.total), line: s.meta.runs + 1 }));
  const hadSave = v.has;
  return (
    <div class="title-screen">
      <div class="title-box">
        <figure class="title-pic"><svg ref={svgRef} viewBox="0 0 320 240" role="img" aria-hidden="true" /></figure>
        <h1>{t('title')}</h1>
        <p class="tagline">{t('tagline')}</p>
        {hadSave && <p class="summary">{t('tSummary', fmt(v.total), v.line)}</p>}
        <div class="title-actions">
          <button ref={playRef} class="pbtn" onClick={() => startGame()}>{hadSave ? t('tContinue') : t('tPlay')}</button>
          {hadSave && (
            <button class="ghost" onClick={() => { if (sure) startGame(true); else setSure(true); }}>{sure ? t('tNewSure') : t('tNew')}</button>
          )}
          <button class="ghost" onClick={() => { dialog.value = 'save'; }}>{t('tLoad')}</button>
        </div>
        <div class="settings title-settings">
          <button onClick={() => setPrefs({ lang: prefs.value.lang === 'pl' ? 'en' : 'pl' })}>{t('langBtn')}</button>
          {reporter.enabled && <button class="report-btn" onClick={() => { dialog.value = 'report'; }}><span aria-hidden="true">🐞</span> {t('rOpen')}</button>}
          <button onClick={() => setPrefs({ mute: !prefs.value.mute })}>{prefs.value.mute ? t('mOff') : t('mOn')}</button>
        </div>
      </div>
      <AlphaBadge />
      <p class="build-id">v{__BUILD__}</p>
    </div>
  );
}
