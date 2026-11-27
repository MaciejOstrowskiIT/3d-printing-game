import { BAL } from '../../../content/balance';
import { useEffect, useRef, useState } from 'preact/hooks';
import { gpu, rate1 } from '../../../core/formulas';
import { fmt, prefs, setPrefs, t } from '../../i18n';
import { buildRoom, roomSignature, type Stage } from '../../scene/room';
import { mountPrinter } from '../../scene/printer';
import { game, printedListeners, useS } from '../../store';

const STAGE_KEY = { garage: 'stGarage', shop: 'stShop', hall: 'stHall', space: 'stSpace' } as const;

/** Sidebar picture: isometric floor and printer close-up. The smaller view is a corner inset; clicking it swaps them. */
export function Picture({ onToggleExpand }: { onToggleExpand: () => void }) {
  const closeRef = useRef<SVGSVGElement>(null);
  const roomRef = useRef<SVGSVGElement>(null);
  const [info, setInfo] = useState<{ stage: Stage; hidden: number }>({ stage: 'garage', hidden: 0 });
  const canRoom = useS(s => s.ph === 2 || s.auto > 0 || s.farm > 0);
  const sig = useS(roomSignature);
  const busy = useS(s => s.ph === 2 || (rate1(s) > 0 && s.fil >= gpu(s)));
  const counts = useS(s => (s.ph === 2 ? `${s.drones}/${s.fabs}` : String(BAL.basePrinters + s.auto + s.farm * BAL.farmPrinters)));
  const lang = prefs.value.lang;
  const view = !canRoom ? 'close' : prefs.value.view ?? 'room';

  useEffect(() => {
    const p = mountPrinter(closeRef.current!, () => game.s);
    const feed = (share: number) => p.feed(share);
    printedListeners.add(feed);
    return () => { printedListeners.delete(feed); p.destroy(); };
  }, []);

  useEffect(() => { if (canRoom && roomRef.current) setInfo(buildRoom(roomRef.current, game.s)); }, [sig, canRoom]);

  const s = game.s;
  const cap = info.stage === 'space'
    ? t('capS', t('stSpace'), fmt(s.drones), fmt(s.fabs))
    : t('capP', t(STAGE_KEY[info.stage]), fmt(BAL.basePrinters + s.auto + s.farm * BAL.farmPrinters));
  void counts; void lang;

  const click = (which: 'room' | 'close') => () => {
    if (canRoom && view !== which) setPrefs({ view: which });
    else onToggleExpand();
  };

  return (
    <figure class="pic">
      <svg id="roomSvg" ref={roomRef} viewBox="0 0 320 240" role="img" aria-label={cap} hidden={!canRoom}
        class={(canRoom && view === 'close' ? 'inset' : '') + (busy ? '' : ' idle')} onClick={click('room')} />
      <svg ref={closeRef} viewBox="0 0 320 240" role="img" aria-label="3D printer"
        class={canRoom && view === 'room' ? 'inset' : ''} onClick={click('close')} />
      {canRoom && view === 'room' && <span class="cap">{cap}</span>}
      {canRoom && view === 'room' && info.hidden > 0 && <span class="more">+{fmt(info.hidden)}</span>}
    </figure>
  );
}
