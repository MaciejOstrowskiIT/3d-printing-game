import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { REPORT_MAX, REPORT_MIN } from '../../platform/report';
import { prefs, t } from '../i18n';
import { reporter } from '../report';
import { game, dialog } from '../store';

type Status = 'idle' | 'sent' | 'short';

/** "Report a bug": one free-text field, no personal data, 15 s between reports. */
export function ReportDialog() {
  const open = dialog.value === 'report';
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [wait, setWait] = useState(0);
  const modalRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const modal = modalRef.current;
    if (!open || !modal) return;
    setText(''); setStatus('idle'); setWait(Math.ceil(reporter.wait() / 1000));
    modal.showModal();
    return () => modal.close();
  }, [open]);
  useEffect(() => {
    if (!open || wait <= 0) return;
    const id = setTimeout(() => setWait(Math.ceil(reporter.wait() / 1000)), 1000);
    return () => clearTimeout(id);
  }, [open, wait]);

  const close = () => { dialog.value = null; };
  const submit = (e: Event) => {
    e.preventDefault();
    const s = game.s;
    const r = reporter.send(text, {
      lang: prefs.value.lang, build: __BUILD__, min: Math.floor(s.play / 60), line: s.meta.runs + 1, goal: s.goal, phase: s.ph,
      view: `${innerWidth}x${innerHeight}`,
    });
    if (r.ok) { setStatus('sent'); setText(''); setWait(Math.ceil(reporter.wait() / 1000)); }
    else if (r.reason === 'short') setStatus('short');
    else if (r.reason === 'cooldown') setWait(Math.ceil((r.waitMs ?? 0) / 1000));
  };

  return (
    <dialog ref={modalRef} class="modal" aria-labelledby="report-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <form class="modal-box" onSubmit={submit}>
        <div class="ch"><h2 id="report-title">{t('rTitle')}</h2><button type="button" class="x" onClick={close} aria-label={t('sClose')}>×</button></div>
        <p class="hint">{t('rHint')}</p>
        {reporter.previewOnly && <p class="hint bad">{t('rPreview')}</p>}
        <textarea aria-label={t('rField')} placeholder={t('rPh')} rows={5} maxLength={REPORT_MAX} value={text} autofocus
          onInput={e => { setText((e.currentTarget as HTMLTextAreaElement).value); if (status !== 'idle') setStatus('idle'); }} />
        <div class="ctl">
          <button type="submit" class="btn-main" disabled={wait > 0 || text.trim().length < REPORT_MIN}>{wait > 0 ? t('rWait', wait) : t('rSend')}</button>
          <span class="hint">{text.length}/{REPORT_MAX}</span>
        </div>
        <p class="hint" role="status">{status === 'sent' ? t('rSent') : status === 'short' ? t('rShort', REPORT_MIN) : t('rPrivacy')}</p>
      </form>
    </dialog>
  );
}
