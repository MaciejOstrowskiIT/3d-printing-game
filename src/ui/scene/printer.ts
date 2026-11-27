import { COLORS } from '../../content/colors';
import { gpu, model, rate1 } from '../../core/formulas';
import type { GameState } from '../../core/state';
import { frameGate } from '../frameCap';
import { reducedMotion } from '../i18n';

/** Printer close-up SVG. Elements tagged with data-p are driven by the animation. */
export const PRINTER_SVG = `<rect x="18" y="224" width="284" height="10" rx="4" fill="#0003"/>
<rect x="40" y="20" width="16" height="204" rx="3" fill="var(--frame)"/>
<rect x="264" y="20" width="16" height="204" rx="3" fill="var(--frame)"/>
<rect x="40" y="14" width="240" height="18" rx="4" fill="var(--frame)"/>
<rect x="44" y="16" width="232" height="3" rx="1.5" fill="#ffffff22"/>
<rect x="30" y="206" width="260" height="20" rx="5" fill="var(--frame)"/>
<rect x="66" y="196" width="188" height="12" rx="3" fill="#c9b37a"/>
<rect x="66" y="196" width="188" height="3" rx="1.5" fill="#fff6"/>
<circle cx="270" cy="216" r="4" data-p="led" fill="#3cc8e4"/>
<g data-p="vase"></g>
<g data-p="gantry">
<rect x="56" y="70" width="208" height="8" rx="3" fill="#3a3c45"/>
<rect x="56" y="70" width="208" height="2" fill="#ffffff26"/>
<g data-p="head">
<rect x="140" y="58" width="40" height="34" rx="5" fill="#2f3039"/>
<rect x="140" y="58" width="40" height="5" rx="2" fill="#ffffff2a"/>
<circle cx="160" cy="75" r="7" fill="#4a4c57"/><circle cx="160" cy="75" r="3" fill="#2f3039"/>
<path d="M154 92h12l-3 10h-6z" fill="#b8a46b"/>
<circle data-p="glow" cx="160" cy="104" r="5" fill="#ffb347" opacity="0"/>
<circle cx="160" cy="104" r="2" fill="#ff6a1f"/>
</g>
</g>
<path data-p="filpath" d="M270 32 C 300 40, 300 70, 160 58" stroke="#fff" stroke-width="2.5" fill="none" opacity=".9"/>
<circle cx="292" cy="40" r="20" fill="#f4efe9" stroke="var(--frame)" stroke-width="5"/>
<g data-p="spool"><circle cx="292" cy="40" r="6" fill="var(--frame)"/><rect x="290.5" y="22" width="3" height="10" rx="1.5" fill="var(--frame)" opacity=".55"/><rect x="290.5" y="48" width="3" height="10" rx="1.5" fill="var(--frame)" opacity=".55"/></g>`;


/** Writes an attribute only when its value changes: an unchanged write still invalidates style and paint. */
const put = (el: Element, name: string, value: string) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };

/** Layer-by-layer print animation. Independent of game ticks: rAF reads the state and draws smoothly. */
export function mountPrinter(svg: SVGSVGElement, getState: () => GameState) {
  svg.innerHTML = PRINTER_SVG;
  const q = (k: string) => svg.querySelector(`[data-p="${k}"]`) as SVGElement;
  const vase = q('vase'), gantry = q('gantry'), head = q('head'), filpath = q('filpath'), glow = q('glow'), spool = q('spool'), led = q('led');
  const spoolBody = spool.previousElementSibling as SVGElement;
  // The piece being printed takes its layer widths from the selected model (content/models.ts).
  let VW: number[] = [], NL = 0, layers: SVGElement[] = [], mdl = '';
  const A = { layer: 0, x: 0, work: 0, eject: 0, hx: 200, hy: 40, rot: 0, last: performance.now(), col: -1 };
  const applyShape = (id: string, shape: number[]) => {
    mdl = id; VW = shape; NL = shape.length;
    vase.innerHTML = VW.map((_, i) => `<rect x="160" y="${188 - i * 8}" width="0" height="8.4" rx="2.5" stroke-width=".6"/>`).join('');
    layers = [...vase.children] as SVGElement[];
    A.layer = 0; A.x = 0; A.work = Math.min(A.work, NL); A.col = -1;
  };
  let raf = 0;
  // Off screen (scrolled away on a phone) the animation pauses; it picks up where it was when it comes back.
  let onScreen = true;
  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => { onScreen = entries[entries.length - 1].isIntersecting; })
    : null;
  io?.observe(svg);

  const applyColor = (i: number) => {
    const C = COLORS[i] ?? COLORS[0];
    layers.forEach((l, k) => { put(l, 'fill', k % 2 ? C.c2 : C.c); put(l, 'stroke', C.st); });
    put(spoolBody, 'fill', C.c);
    put(filpath, 'stroke', C.c);
  };

  const gate = frameGate();
  const frame = (now: number) => {
    // Capped frame rate (ui/frameCap.ts); skipped frames leave A.last alone, so the next step covers the whole gap.
    if (!gate(now)) { raf = requestAnimationFrame(frame); return; }
    const s = getState();
    const dt = Math.min(0.1, (now - A.last) / 1000);
    A.last = now;
    if (!onScreen) { raf = requestAnimationFrame(frame); return; }
    const m = model(s);
    if (m.id !== mdl) applyShape(m.id, m.shape);
    if (A.col !== s.col) { A.col = s.col; applyColor(s.col); }
    put(led, 'fill', s.brk > 0 ? '#ff4d3d' : '#3cc8e4');

    if (reducedMotion()) {
      // Static printer: finished piece, head parked, nothing moving.
      A.work = 0; A.eject = 0; A.layer = NL; A.x = 0;
      vase.removeAttribute('transform'); put(vase, 'opacity', '1');
      layers.forEach((l, i) => { const w = VW[i]; put(l, 'x', (160 - w / 2).toFixed(1)); put(l, 'width', w.toFixed(1)); });
      A.hx = 210; A.hy = 0;
      put(gantry, 'transform', 'translate(0 0)');
      put(head, 'transform', `translate(${(A.hx - 160).toFixed(1)} 0)`);
      put(filpath, 'd', `M270 32 C 300 40, 300 70, ${A.hx.toFixed(1)} 58`);
      put(glow, 'opacity', '0');
      raf = requestAnimationFrame(frame);
      return;
    }
    const sp = s.ph === 2, auto = sp || (s.ph === 1 && rate1(s) > 0 && s.fil >= gpu(s));
    if (auto && A.work < NL) A.work = NL;
    const r = sp ? 1e6 : rate1(s);
    const v = Math.min(45, 4 + (r > 0 ? Math.log10(r + 1) * 9 : 0) + A.work * 0.35);
    let printing = false;
    if (A.eject > 0) {
      A.eject -= dt;
      const k = Math.max(0, A.eject / 0.4);
      put(vase, 'transform', `translate(${(1 - k) * 70} 0)`);
      put(vase, 'opacity', k.toFixed(2));
      if (A.eject <= 0) { A.layer = 0; A.x = 0; vase.removeAttribute('transform'); put(vase, 'opacity', '1'); }
    } else if (A.work > 0) {
      printing = true;
      A.x += v * dt;
      while (A.x >= 1 && A.work > 0) {
        A.x -= 1; A.work--; A.layer++;
        if (A.layer >= NL) { A.eject = 0.4; A.x = 0; break; }
      }
      if (A.work <= 0) A.x = 0;
    }
    for (let i = 0; i < NL; i++) {
      const w = VW[i], left = 160 - w / 2;
      let x = 160, wd = 0;
      if (i < A.layer) { x = left; wd = w; }
      else if (i === A.layer && A.eject <= 0 && A.x > 0) { wd = w * A.x; x = i % 2 ? left + w - wd : left; }
      put(layers[i], 'x', x.toFixed(1));
      put(layers[i], 'width', wd.toFixed(1));
    }
    let tx: number, ty: number;
    const li = Math.min(A.layer, NL - 1);
    if (printing && A.eject <= 0 && A.layer < NL) {
      const w = VW[li], left = 160 - w / 2, p = li % 2 ? 1 - A.x : A.x;
      tx = left + w * p; ty = 83 - li * 8;
    } else { tx = 210; ty = Math.max(0, 83 - A.layer * 8 - 34); }
    const f = Math.min(1, dt * (printing ? 28 : 5));
    A.hx += (tx - A.hx) * f;
    A.hy += (ty - A.hy) * f;
    put(gantry, 'transform', `translate(0 ${A.hy.toFixed(1)})`);
    put(head, 'transform', `translate(${(A.hx - 160).toFixed(1)} 0)`);
    put(filpath, 'd', `M270 32 C 300 40, 300 ${(70 + A.hy).toFixed(1)}, ${A.hx.toFixed(1)} ${(58 + A.hy).toFixed(1)}`);
    put(glow, 'opacity', printing ? (0.5 + 0.3 * Math.sin(now / 60)).toFixed(2) : '0');
    if (printing) A.rot = (A.rot + v * dt * 14) % 360;
    put(spool, 'transform', `rotate(${A.rot.toFixed(1)} 292 40)`);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    /** A click queues its share of a piece (1 = a whole piece) in the animation. */
    feed(share = 1) { A.work = Math.min(A.work + NL * share, NL * 3); },
    isBusy() { return A.work > 0; },
    destroy() { cancelAnimationFrame(raf); io?.disconnect(); },
  };
}
