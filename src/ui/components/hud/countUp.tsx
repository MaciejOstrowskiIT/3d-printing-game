import { useEffect, useRef, useState } from 'preact/hooks';
import { useS } from '../../store';
import { fmt, money, reducedMotion } from '../../i18n';
import { incomeSinceLoad } from '../../../systems/workshopStats';
import { GAIN_GAP_MS, countValue, gainQueue, takeGain } from '../../gainFloats';
import { frameGate } from '../../frameCap';

/** A number that slides to its new value instead of jumping; jumps straight there with Reduce motion. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const anim = useRef({ from: value, to: value, start: 0, frame: 0, shown: value });
  const fmtRef = useRef(format);
  fmtRef.current = format;
  useEffect(() => {
    const a = anim.current;
    if (value === a.to) return;
    cancelAnimationFrame(a.frame);
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') { a.from = a.to = a.shown = value; setShown(value); return; }
    a.from = shownNow(a); a.to = value; a.start = performance.now();
    const gate = frameGate();
    const step = (now: number) => {
      if (!gate(now)) { a.frame = requestAnimationFrame(step); return; }
      const v = countValue(a.from, a.to, performance.now() - a.start);
      // Re-render only when the text changes: a frame that would print the same digits costs a layout for nothing.
      if (v === a.to || fmtRef.current(v) !== fmtRef.current(a.shown)) { a.shown = v; setShown(v); }
      if (v !== a.to) a.frame = requestAnimationFrame(step);
    };
    a.frame = requestAnimationFrame(step);
  }, [value]);
  useEffect(() => () => cancelAnimationFrame(anim.current.frame), []);
  return <>{format(shown)}</>;
}

const shownNow = (a: { from: number; to: number; start: number }) =>
  a.start ? countValue(a.from, a.to, performance.now() - a.start) : a.to;

/** Whole-number counter text (pieces): rounds the in-between values. */
export const countText = (n: number) => fmt(Math.round(n));

let nextId = 1;

/** Short "+$12.50" floats over the Funds chip when sales and orders pay; at most one per GAIN_GAP_MS, merged. */
export function GainFloats() {
  const earned = useS(s => incomeSinceLoad(s));
  const seen = useRef(earned);
  const queue = useRef(gainQueue());
  const [floats, setFloats] = useState<{ id: number; text: string }[]>([]);
  const flush = useRef<ReturnType<typeof setTimeout>>();
  const pump = (add: number) => {
    clearTimeout(flush.current);
    if (reducedMotion()) { queue.current = gainQueue(); return; }
    const q = queue.current, now = performance.now(), amount = takeGain(q, now, add);
    if (amount > 0) {
      const id = nextId++;
      setFloats(f => [...f.slice(-3), { id, text: '+' + money(amount) }]);
      setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1200);
    } else if (q.pending > 0) {
      flush.current = setTimeout(() => pump(0), GAIN_GAP_MS - (now - q.last));
    }
  };
  useEffect(() => {
    const add = earned - seen.current;
    seen.current = earned;
    if (add > 0) pump(add);
  }, [earned]);
  useEffect(() => () => clearTimeout(flush.current), []);
  return <span class="gain-floats" aria-hidden="true">{floats.map(f => <i key={f.id} class="gain-float">{f.text}</i>)}</span>;
}
