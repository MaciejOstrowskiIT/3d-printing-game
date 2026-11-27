import { t } from '../i18n';

/** Faint corner badge: the game is an early version. Ignores pointer events so it never blocks the UI. */
export function AlphaBadge() {
  return <div class="alpha-badge" title={t('alphaTip')} aria-hidden="true">ALPHA</div>;
}
