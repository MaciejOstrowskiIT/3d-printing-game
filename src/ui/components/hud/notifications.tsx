import { useEffect, useRef, useState } from 'preact/hooks';
import { STORY_MSG } from '../../../content/story';
import { MARKET_EVENT } from '../../../content/events';
import { clearAllNotes, clearNote, game, hideNoteToast, inbox, noteToasts, notifRequest, pushNote, useS, type Note } from '../../store';
import { dict, li, prefs, t } from '../../i18n';
import { notifications, type NotificationKind } from '../../notifications';
import { Events } from '../workshop/events';
import { popHandlers, type PopControl } from './chip';

/** The HUD button between the resource chips and the tabs: a count of open notifications; hover or tap opens the panel. */
export function NotificationsButton({ pop }: { pop: PopControl }) {
  const urgent = useS(s => notifications(s).some(n => n.urgent));
  const count = inbox.value.length;
  return (
    <div class={'chip has-pop notif' + (urgent ? ' urgent' : '') + (count ? ' some' : '')} {...popHandlers(pop, 'notif')}>
      <small>{t('notifTitle')}</small>
      <b><span aria-hidden="true">🔔</span> {count}</b>
    </div>
  );
}

const timeOf = (at: number) => new Date(at).toLocaleTimeString(prefs.value.lang === 'pl' ? 'pl-PL' : 'en-US', { hour: '2-digit', minute: '2-digit' });

/** Content of the panel: what needs a decision right now (order, message, offer, breakdown, filament), and below it the
 *  notifications received so far. Those stay until the player clears them here. */
export function NotificationPanel() {
  const live = useS(s => notifications(s).length);
  const list = inbox.value;
  return (
    <section class="pop-body notif-panel">
      <h2>{t('notifTitle')}</h2>
      {live > 0 && <><h3 class="notif-sub">{t('notifNow')}</h3><Events panel /></>}
      <div class="notif-head">
        <h3 class="notif-sub">{t('notifReceived')}</h3>
        {list.length > 0 && <button type="button" class="notif-clear-all" onClick={clearAllNotes}>{t('notifClearAll')}</button>}
      </div>
      {list.length === 0
        ? <p class="hint">{t('notifNone')}</p>
        : <ul class="notif-list">
            {list.map(n => (
              <li key={n.key}>
                <span class="ach-ico" aria-hidden="true">{n.icon}</span>
                <span class="notif-text"><b>{n.body || n.title}</b><small>{n.title} · {timeOf(n.at)}</small></span>
                <button type="button" class="notif-clear" aria-label={t('notifDismiss')} onClick={() => clearNote(n.key)}>×</button>
              </li>
            ))}
          </ul>}
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
    if (seen.current === null) {
      // Already open when the game loaded: kept in the panel, but not announced.
      seen.current = ids;
      for (const { kind, id } of items) pushNote({ icon: ICON[kind], ...describe(kind, id) }, true);
      return;
    }
    for (const { kind, id } of items) {
      if (seen.current.has(id)) continue;
      pushNote({ icon: ICON[kind], ...describe(kind, id) });
    }
    seen.current = ids; // a notification that goes away and comes back (filament low again) is news again
  }, [key]);
  return null;
}

/** Swipe sideways to hide a toast (a click or tap opens the panel instead). Hiding it never clears the notification. */
function NoteToast({ note }: { note: Note }) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; id: number } | null>(null);
  const moved = useRef(false);
  const out = Math.abs(dx) > 90;
  return (
    <div class="note-toast" style={{ transform: `translateX(${dx}px)`, opacity: out ? 0.3 : Math.max(0.35, 1 - Math.abs(dx) / 220), transition: start.current ? 'none' : 'transform .2s, opacity .2s' }}
      onPointerDown={e => { start.current = { x: e.clientX, id: e.pointerId }; moved.current = false; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }}
      onPointerMove={e => { if (!start.current) return; const d = e.clientX - start.current.x; if (Math.abs(d) > 8) moved.current = true; setDx(d); }}
      onPointerUp={() => { const d = dx; start.current = null; if (Math.abs(d) > 90) hideNoteToast(note.key); else setDx(0); }}
      onPointerCancel={() => { start.current = null; setDx(0); }}
      onClick={() => { if (!moved.current) notifRequest.value++; }}>
      <span class="ach-ico" aria-hidden="true">{note.icon}</span>
      <span><small>{note.title}</small><b>{note.body}</b></span>
    </div>
  );
}

/** New notifications, centred under the HUD bell. Hidden while the panel is open (it shows them already). */
export function NoteToasts({ hidden }: { hidden: boolean }) {
  const list = noteToasts.value;
  if (hidden || !list.length) return null;
  return <div class="note-toasts" aria-live="polite">{list.map(n => <NoteToast key={n.key} note={n} />)}</div>;
}
