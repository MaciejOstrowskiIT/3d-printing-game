import { useState } from 'preact/hooks';
import { logText, t } from '../../i18n';
import { useS } from '../../store';

export function Log() {
  const [open, setOpen] = useState(false);
  const entries = useS(s => s.log.map(logText).join('\u0000')).split('\u0000').filter(Boolean);
  return (
    <section class={'side-journal' + (open ? ' open' : '')} aria-label={t('stationLog')}>
      <h2>{t('stationLog')}</h2>
      <button class="journal-toggle" aria-expanded={open} aria-controls="workshop-log" onClick={() => setOpen(!open)}>
        <span>{open ? t('stationLog') : entries[0] ?? t('stationLog')}</span>
        <b aria-hidden="true">{open ? '▴' : '▾'}</b>
      </button>
      <ol class="log" id="workshop-log">
        {entries.map((entry, i) => <li key={i}>{entry}</li>)}
      </ol>
    </section>
  );
}
