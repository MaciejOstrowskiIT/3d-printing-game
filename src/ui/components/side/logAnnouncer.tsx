import { useEffect, useState } from 'preact/hooks';
import { createAnnouncer } from '../../announce';
import { logText } from '../../i18n';
import { game } from '../../store';

/** Reads new workshop log lines to screen readers through a polite live region, throttled (see `createAnnouncer`).
 *  Visually hidden: the log in the side panel shows the same lines. */
export function LogAnnouncer() {
  const [said, setSaid] = useState({ n: 0, text: '' });
  useEffect(() => {
    const announcer = createAnnouncer(text => setSaid(p => ({ n: p.n + 1, text })));
    const off = game.on(e => { if (e.type === 'log') announcer.push(logText(e.entry)); });
    return () => { off(); announcer.dispose(); };
  }, []);
  // A new node for every announcement, so the same text twice in a row is read twice.
  return <div class="sr-only" role="log" aria-live="polite" aria-atomic="false">{said.text && <p key={said.n}>{said.text}</p>}</div>;
}
