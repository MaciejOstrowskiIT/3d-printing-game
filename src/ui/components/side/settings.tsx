import { reporter } from '../../report';
import { useEffect, useState } from 'preact/hooks';
import { prefs, setPrefs, t } from '../../i18n';
import { dialog, resetGame } from '../../store';

export function Settings({ class: cls }: { class: string }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const id = setTimeout(() => setSure(false), 4000); return () => clearTimeout(id); }, [sure]);
  return (
    <div class={cls}>
      <button onClick={() => setPrefs({ mute: !prefs.value.mute })}>{prefs.value.mute ? t('mOff') : t('mOn')}</button>
      <button onClick={() => setPrefs({ lang: prefs.value.lang === 'pl' ? 'en' : 'pl' })}>{t('langBtn')}</button>
      <button onClick={() => { dialog.value = 'save'; }}>{t('sOpen')}</button>
      <button class="gear" aria-label={t('setOpen')} title={t('setOpen')} onClick={() => { dialog.value = 'settings'; }}><span aria-hidden="true">⚙</span></button>
      {reporter.enabled && <button class="report-btn" onClick={() => { dialog.value = 'report'; }}><span aria-hidden="true">🐞</span> {t('rOpen')}</button>}
      <button onClick={() => { if (sure) { resetGame('fresh'); setSure(false); } else setSure(true); }}>{sure ? t('sure') : t('reset')}</button>
    </div>
  );
}
