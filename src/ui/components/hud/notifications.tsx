import { useEffect, useRef } from 'preact/hooks';
import { STORY_MSG } from '../../../content/story';
import { MARKET_EVENT } from '../../../content/events';
import { game, pushNote, useS } from '../../store';
import { dict, li, t } from '../../i18n';
import { notifications, type NotificationKind } from '../../notifications';
import { Events } from '../workshop/events';
import { popHandlers, type PopControl } from './chip';

/** The HUD button between the resource chips and the tabs: a count of open notifications; hover or tap opens the panel. */
export function NotificationsButton({ pop }: { pop: PopControl }) {
  const key = useS(s => notifications(s).map(n => n.id + (n.urgent ? '!' : '')).join('|'));
  const list = key ? key.split('|') : [];
  const urgent = list.some(id => id.endsWith('!'));
  return (
    <div class={'chip has-pop notif' + (urgent ? ' urgent' : '') + (list.length ? ' some' : '')} {...popHandlers(pop, 'notif')}
      aria-label={t('notifTitle') + (list.length ? `: ${list.length}` : '')}>
      <small>{t('notifTitle')}</small>
      <b><span aria-hidden="true">🔔</span> {list.length}</b>
    </div>
  );
}

/** Content of the panel: the open notifications with their buttons (order, message, offer, breakdown, filament). */
export function NotificationPanel() {
  return (
    <section class="pop-body notif-panel">
      <h2>{t('notifTitle')}</h2>
      <Events panel />
    </section>
  );
}

const ICON: Record<NotificationKind, string> = { story: '✉️', order: '📦', daily: '📅', market: '📈', breakdown: '⚠️', filament: '🧵' };

/** What a toast says for a notification that just arrived. */
function describe(kind: NotificationKind, id: string): { title: string; body: string } {
  const s = game.s;
  switch (kind) {
    case 'story': { const m = STORY_MSG[s.msg ?? '']; return { title: t('toastStory'), body: m ? m.from[li()] : '' }; }
    case 'order': return { title: t('toastOrder'), body: s.ord ? t('oFrom', dict().clients[s.ord.c]) : '' };
    case 'daily': return { title: t('toastDaily'), body: t('dTitle') };
    case 'market': return { title: t('toastMarket'), body: s.mev ? MARKET_EVENT[s.mev.id]?.name[li()] ?? '' : '' };
    case 'breakdown': return { title: t('toastBreakdown'), body: t('brkTitle') };
    case 'filament': return { title: t('toastFilament'), body: id.endsWith(':out') ? t('toastFilOut') : t('toastFilLow') };
  }
}

/** Shows a toast when a new notification arrives, so the page itself never has to move. What was already open when
 *  the game loaded is not news. Renders nothing. */
export function NotificationToasts() {
  const key = useS(s => notifications(s).map(n => `${n.kind}|${n.id}`).join(';'));
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const items = key ? key.split(';').map(x => { const [kind, ...id] = x.split('|'); return { kind: kind as NotificationKind, id: id.join('|') }; }) : [];
    const ids = new Set(items.map(i => i.id));
    if (seen.current === null) { seen.current = ids; return; }
    for (const { kind, id } of items) {
      if (seen.current.has(id)) continue;
      pushNote({ icon: ICON[kind], ...describe(kind, id) });
    }
    seen.current = ids; // a notification that goes away and comes back (filament low again) is news again
  }, [key]);
  return null;
}
