import { reporter } from '../report';
import { useEffect, useRef, useState } from 'preact/hooks';
import { GOALS } from '../../content/goals';
import { DEFAULT_MODEL, MODEL } from '../../content/models';
import { gpu, model, rate1, spaceRate } from '../../core/formulas';
import { rateOn } from '../../systems/fleet';
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
  const busy = useS(s => s.ph === 2 || (rate1(s) > 0 && s.fil >= gpu(s)));
  const counts = useS(s => (s.ph === 2 ? `${s.drones}/${s.fabs}` : String(s.auto + s.farm * 60)));
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
  const disabled = useS(s => s.fil <= 0);
  const mdl = useS(s => s.mdl);
  const hold = useHold('print');
  const label = mdl === DEFAULT_MODEL.id ? t('printBtn') : t('printBtnM', MODEL[mdl]?.name[li()] ?? '');
  return (
    <button class="pbtn" disabled={disabled} {...hold}>
      {short ? t('printBtnS') : <><span>{label}</span><kbd>{t('kbd')}</kbd></>}
    </button>
  );
}

function Goal() {
  const [expanded, setExpanded] = useState(false);
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
      <h3><span class="goal-title">{q.t[li()]}</span><button class="goal-toggle" aria-expanded={expanded}
        aria-controls="goal-hint" onClick={() => setExpanded(!expanded)}>{q.t[li()]} <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button></h3>
      <p id="goal-hint" class={expanded ? 'expanded' : ''}>{q.h[li()]}</p>
      <div class="meter or"><i style={{ width: Math.min(100, (100 * a) / b) + '%' }} /></div>
    </div>
  );
}

function StationReadout() {
  const v = useS(s => {
    const m = model(s);
    const space = s.ph === 2;
    const speed = space ? spaceRate(s) : rateOn(s, s.mdl) / m.seconds;
    const out = !space && s.fil <= 0;
    const status = s.end ? 'stationDone' : out ? 'stationEmpty' : s.brk > 0 ? 'stationFault'
      : speed > 0 ? 'stationRunning' : space ? 'stationIdle' : 'stationManual';
    return { name: space ? t('stSpace') : m.name[li()], status, speed: out || s.end ? 0 : speed } as const;
  });
  return (
    <div class="station-readout">
      <div class="station-status">
        <span>{v.name}</span>
        <span class={'station-state ' + v.status}>{t(v.status)}</span>
      </div>
      <div class="station-rate">
        <span>{t('stationAutoRate')}</span>
        <strong>{fmt(v.speed * 60, 1)} <small>{t('stationUnits')}</small></strong>
      </div>
    </div>
  );
}

function Log() {
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

export function Settings({ class: cls }: { class: string }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const id = setTimeout(() => setSure(false), 4000); return () => clearTimeout(id); }, [sure]);
  return (
    <div class={cls}>
      <button onClick={() => setPrefs({ mute: !prefs.value.mute })}>{prefs.value.mute ? t('mOff') : t('mOn')}</button>
      <button onClick={() => setPrefs({ lang: prefs.value.lang === 'pl' ? 'en' : 'pl' })}>{t('langBtn')}</button>
      <button onClick={() => { dialog.value = 'save'; }}>{t('sOpen')}</button>
      {reporter.visible && <button onClick={() => { dialog.value = 'report'; }}>{t('rOpen')}</button>}
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
