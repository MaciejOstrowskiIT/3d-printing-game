import { reporter } from '../../report';
import { t } from '../../i18n';
import { dialog } from '../../store';

export function Settings({ class: cls }: { class: string }) {
  return (
    <div class={cls}>
      <button onClick={() => { dialog.value = 'settings'; }}>{t('setOpen')}</button>
      {reporter.enabled && <button class="report-btn" onClick={() => { dialog.value = 'report'; }}><span aria-hidden="true">🐞</span> {t('rOpen')}</button>}
    </div>
  );
}
