import { useState } from 'preact/hooks';
import { fmt, t } from '../i18n';
import { useS } from '../store';
import { Goal } from './side/goal';
import { Log } from './side/log';
import { Picture } from './side/picture';
import { PrintButton, PrintProgress } from './side/printControls';
import { Settings } from './side/settings';
import { StationReadout } from './side/station';

export function Side() {
  const [expand, setExpand] = useState(false);
  const total = useS(s => fmt(Math.floor(s.total)));
  return (
    <aside class={'side' + (expand ? ' expand' : '')}>
      <div class="brand">
        <Picture onToggleExpand={() => setExpand(!expand)} />
        <h1>{t('title')}</h1>
        <div class="count"><span class="num">{total}</span><small>{t('printed')}</small></div>
        <PrintProgress />
        <StationReadout />
      </div>
      <PrintButton />
      <Goal />
      <Log />
      <Settings class="settings" />
    </aside>
  );
}

export { PrintButton };
