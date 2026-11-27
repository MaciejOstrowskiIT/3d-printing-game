import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { fmtAs, prefs, reducedMotion, setPrefs, t, type Notation } from '../i18n';
import { dialog, resetGame } from '../store';

const NOTATIONS: [Notation, 'setNotationShort' | 'setNotationScientific' | 'setNotationFull'][] =
  [['short', 'setNotationShort'], ['scientific', 'setNotationScientific'], ['full', 'setNotationFull']];

/** Player preferences and access to save and reset actions. */
export function SettingsDialog() {
  const open = dialog.value === 'settings';
  const ref = useRef<HTMLDialogElement>(null);
  const [sure, setSure] = useState(false);
  useLayoutEffect(() => {
    const modal = ref.current;
    if (!open || !modal) return;
    setSure(false);
    modal.showModal();
    return () => modal.close();
  }, [open]);
  useEffect(() => {
    if (!open || !sure) return;
    const timeout = setTimeout(() => setSure(false), 4000);
    return () => clearTimeout(timeout);
  }, [open, sure]);
  const p = prefs.value;
  const close = () => { dialog.value = null; };
  const volume = Math.round((p.volume ?? 1) * 100);
  const notation = p.notation ?? 'short';
  const restart = () => {
    if (!sure) {
      setSure(true);
      return;
    }
    resetGame('fresh');
    close();
  };
  return (
    <dialog ref={ref} class="modal settings-dialog" aria-labelledby="settings-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div class="modal-box">
        <div class="ch"><h2 id="settings-title">{t('setTitle')}</h2><button autofocus class="x" onClick={close} aria-label={t('sClose')}>×</button></div>

        <div class="set-row">
          <label class="set-check"><input type="checkbox" checked={!p.mute} onChange={e => setPrefs({ mute: !e.currentTarget.checked })} />{t('setSound')}</label>
          <label class="set-range">{t('setVolume')}
            <input type="range" min="0" max="100" step="5" value={volume} disabled={p.mute} aria-valuetext={volume + '%'}
              onInput={e => setPrefs({ volume: Number(e.currentTarget.value) / 100 })} />
            <output>{volume}%</output>
          </label>
        </div>

        <div class="set-row">
          <b id="set-lang">{t('setLanguage')}</b>
          <div class="set-choice" role="group" aria-labelledby="set-lang">
            <button aria-pressed={p.lang === 'pl'} onClick={() => setPrefs({ lang: 'pl' })}>Polski</button>
            <button aria-pressed={p.lang === 'en'} onClick={() => setPrefs({ lang: 'en' })}>English</button>
          </div>
        </div>

        <div class="set-row">
          <b id="set-notation">{t('setNotation')}</b>
          <div class="set-choice" role="group" aria-labelledby="set-notation">
            {NOTATIONS.map(([id, key]) => (
              <button key={id} aria-pressed={notation === id} onClick={() => setPrefs({ notation: id })}>
                {t(key)}<small>{fmtAs(1234567, id)}</small>
              </button>
            ))}
          </div>
        </div>

        <div class="set-row">
          <label class="set-check"><input type="checkbox" checked={reducedMotion()} onChange={e => setPrefs({ motion: e.currentTarget.checked })} />{t('setMotion')}</label>
          <p class="hint">{t('setMotionHint')}</p>
        </div>

        <div class="set-row">
          <label class="set-check"><input type="checkbox" checked={p.hints !== false} onChange={e => setPrefs({ hints: e.currentTarget.checked })} />{t('setHints')}</label>
        </div>

        <div class="set-row set-actions">
          <button onClick={() => { dialog.value = 'save'; }}>{t('sOpen')}</button>
          <button onClick={restart}>{sure ? t('sure') : t('reset')}</button>
        </div>
      </div>
    </dialog>
  );
}
