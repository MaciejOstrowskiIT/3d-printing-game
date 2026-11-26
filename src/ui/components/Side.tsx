import { useEffect, useRef, useState } from 'preact/hooks';
import { GOALS } from '../../content/goals';
import { rate1 } from '../../core/formulas';
import { fmt, li, logText, prefs, setPrefs, t } from '../i18n';
import { buildRoom, roomSignature, type Stage } from '../scene/room';
import { mountPrinter } from '../scene/printer';
import { dialog, game, printedListeners, resetGame, useS } from '../store';
import { useHold } from './common';

const STAGE_KEY = { garage: 'stGarage', shop: 'stShop', hall: 'stHall', space: 'stSpace' } as const;

/** Sidebar picture: isometric floor and printer close-up. The smaller view is a corner inset; clicking it swaps them. */
function Picture({ onToggleExpand }: { onToggleExpand: () => void }) {
  const closeRef = useRef<SVGSVGElement>(null);
  const roomRef = useRef<SVGSVGElement>(null);
  const [info, setInfo] = useState<{ stage: Stage; hidden: number }>({ stage: 'garage', hidden: 0 });
  const canRoom = useS(s => s.ph === 2 || s.auto > 0 || s.farm > 0);
  const sig = useS(roomSignature);
  const busy = useS(s => s.ph === 2 || (rate1(s) > 0 && s.fil >= s.g));
  const counts = useS(s => (s.ph === 2 ? `${s.drones}/${s.fabs}` : String(s.auto + s.farm * 60)));
  const lang = prefs.value.lang;
  const view = !canRoom ? 'close' : prefs.value.view ?? 'room';

  useEffect(() => {
    const p = mountPrinter(closeRef.current!, () => game.s);
    const feed = () => p.feed();
    printedListeners.add(feed);
    return () => { printedListeners.delete(feed); p.destroy(); };
  }, []);

  useEffect(() => { if (canRoom && roomRef.current) setInfo(buildRoom(roomRef.current, game.s)); }, [sig, canRoom]);

  const s = game.s;
  const cap = info.stage === 'space'
    ? t('capS', t('stSpace'), fmt(s.drones), fmt(s.fabs))
    : t('capP', t(STAGE_KEY[info.stage]), fmt(s.auto + s.farm * 60));
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

function PrintButton({ short }: { short?: boolean }) {
  const disabled = useS(s => s.fil < s.g);
  const hold = useHold('print');
  return (
    <button class="pbtn" disabled={disabled} {...hold}>
      {short ? t('printBtnS') : <><span>{t('printBtn')}</span><kbd>{t('kbd')}</kbd></>}
    </button>
  );
}

function Goal() {
  const g = useS(s => s.goal);
  const prog = useS(s => (s.goal < GOALS.length ? GOALS[s.goal].p(s).map(Math.floor).join('/') : ''));
  if (g >= GOALS.length) {
    return (<div class="goal"><div class="gt"><span>{t('goalEnd')}</span></div><h3>{t('goalEndT')}</h3><div class="meter or"><i style={{ width: '100%' }} /></div></div>);
  }
  const q = GOALS[g];
  const [a, b] = prog.split('/').map(Number);
  return (
    <div class="goal" aria-live="polite">
      <div class="gt"><span>{t('goalN', g + 1, GOALS.length)}</span><span>{fmt(Math.min(a, b))} / {fmt(b)}</span></div>
      <h3>{q.t[li()]}</h3>
      <p>{q.h[li()]}</p>
      <div class="meter or"><i style={{ width: Math.min(100, (100 * a) / b) + '%' }} /></div>
    </div>
  );
}

function Log() {
  const [open, setOpen] = useState(false);
  const entries = useS(s => s.log.map(logText).join('\u0000'));
  return (
    <ol class={'log' + (open ? ' open' : '')} onClick={() => setOpen(!open)}>
      {entries.split('\u0000').filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}
    </ol>
  );
}

export function Settings({ class: cls }: { class: string }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const id = setTimeout(() => setSure(false), 4000); return () => clearTimeout(id); }, [sure]);
  return (
    <div class={cls}>
      <button onClick={() => setPrefs({ mute: !prefs.value.mute })}>{prefs.value.mute ? t('mOff') : t('mOn')}</button>
      <button onClick={() => setPrefs({ lang: prefs.value.lang === 'pl' ? 'en' : 'pl' })}>{t('langBtn')}</button>
      <button onClick={() => { dialog.value = 'save'; }}>{t('sOpen')}</button>
      <button onClick={() => { if (sure) { resetGame('fresh'); setSure(false); } else setSure(true); }}>{sure ? t('sure') : t('reset')}</button>
    </div>
  );
}

export function Side() {
  const [expand, setExpand] = useState(false);
  const total = useS(s => fmt(Math.floor(s.total)));
  return (
    <aside class={'side' + (expand ? ' expand' : '')}>
      <div class="brand">
        <Picture onToggleExpand={() => setExpand(!expand)} />
        <h1>{t('title')}</h1>
        <div class="count"><span class="num">{total}</span><small>{t('printed')}</small></div>
      </div>
      <PrintButton />
      <Goal />
      <Log />
      <Settings class="settings" />
    </aside>
  );
}

export { PrintButton };
