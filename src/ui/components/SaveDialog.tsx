import { useEffect, useRef, useState } from 'preact/hooks';
import { exportSave, importSave } from '../../core/save';
import { t } from '../i18n';
import { dialog, game, loadImported } from '../store';

type Msg = { kind: 'ok' | 'bad'; text: string } | null;

/** Export the save as a text code (copy or download) and import one from text or a file. */
export function SaveDialog() {
  const open = dialog.value === 'save';
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [copied, setCopied] = useState(false);
  const [sure, setSure] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setCode(exportSave(game.s));
    setInput(''); setMsg(null); setCopied(false); setSure(false);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dialog.value = null; };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => { if (!sure) return; const id = setTimeout(() => setSure(false), 4000); return () => clearTimeout(id); }, [sure]);
  if (!open) return null;

  const close = () => { dialog.value = null; };
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { (document.getElementById('save-code') as HTMLTextAreaElement | null)?.select(); }
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    a.download = `drukarnia-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const fromFile = async (e: Event) => {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (f) { setInput(await f.text()); setMsg(null); }
  };
  const load = () => {
    const s = importSave(input);
    if (!s) { setMsg({ kind: 'bad', text: t('sBad') }); return; }
    const hasProgress = game.s.total > 0 || game.s.meta.runs > 0;
    if (hasProgress && !sure) { setSure(true); return; }
    loadImported(s);
    setSure(false);
    setCode(exportSave(s));
    setMsg({ kind: 'ok', text: t('sOk') });
  };

  return (
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="save-title" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div class="modal-box">
        <div class="ch"><h2 id="save-title">{t('sTitle')}</h2><button ref={closeRef} class="x" onClick={close} aria-label={t('sClose')}>×</button></div>

        <h3>{t('sExport')}</h3>
        <p class="hint">{t('sExportHint')}</p>
        <textarea id="save-code" readOnly value={code} rows={3} onFocus={e => (e.currentTarget as HTMLTextAreaElement).select()} />
        <div class="ctl"><button class="btn-main" onClick={copy}>{copied ? t('sCopied') : t('sCopy')}</button><button onClick={download}>{t('sDownload')}</button></div>

        <h3>{t('sImport')}</h3>
        <textarea value={input} rows={3} placeholder={t('sImportPh')} onInput={e => { setInput((e.currentTarget as HTMLTextAreaElement).value); setMsg(null); setSure(false); }} />
        <div class="ctl">
          <label class="file-btn"><input type="file" accept=".txt,.json,text/plain,application/json" onChange={fromFile} />{t('sFile')}</label>
          <button class="btn-main" disabled={!input.trim()} onClick={load}>{sure ? t('sLoadSure') : t('sLoad')}</button>
        </div>
        {msg && <p class={'hint ' + (msg.kind === 'bad' ? 'bad' : 'good')} role="status">{msg.text}</p>}
      </div>
    </div>
  );
}
