import { COLORS } from '../../content/colors';
import { rate1 } from '../../core/formulas';
import type { GameState } from '../../core/state';

/** Zbliżenie na drukarkę: rysunek SVG. Elementy z data-p są sterowane przez animację. */
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

const VW = [34, 44, 52, 56, 56, 52, 46, 40, 36, 36, 40, 46];
const NL = VW.length;

/** Animacja druku warstwa po warstwie. Niezależna od ticków gry: rAF czyta stan i rysuje płynnie. */
export function mountPrinter(svg: SVGSVGElement, getState: () => GameState) {
  svg.innerHTML = PRINTER_SVG;
  const q = (k: string) => svg.querySelector(`[data-p="${k}"]`) as SVGElement;
  const vase = q('vase'), gantry = q('gantry'), head = q('head'), filpath = q('filpath'), glow = q('glow'), spool = q('spool'), led = q('led');
  const spoolBody = spool.previousElementSibling as SVGElement;
  vase.innerHTML = VW.map((_, i) => `<rect x="160" y="${188 - i * 8}" width="0" height="8.4" rx="2.5" stroke-width=".6"/>`).join('');
  const layers = [...vase.children] as SVGElement[];
  const A = { layer: 0, x: 0, work: 0, eject: 0, hx: 200, hy: 40, rot: 0, last: performance.now(), col: -1 };
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;

  const applyColor = (i: number) => {
    const C = COLORS[i] ?? COLORS[0];
    layers.forEach((l, k) => { l.setAttribute('fill', k % 2 ? C.c2 : C.c); l.setAttribute('stroke', C.st); });
    spoolBody.setAttribute('fill', C.c);
    filpath.setAttribute('stroke', C.c);
  };

  const frame = (now: number) => {
    const s = getState();
    const dt = Math.min(0.05, (now - A.last) / 1000);
    A.last = now;
    if (A.col !== s.col) { A.col = s.col; applyColor(s.col); }
    led.setAttribute('fill', s.brk > 0 ? '#ff4d3d' : '#3cc8e4');

    const sp = s.ph === 2, auto = sp || (s.ph === 1 && rate1(s) > 0 && s.fil >= s.g);
    if (auto && A.work < NL) A.work = NL;
    const r = sp ? 1e6 : rate1(s);
    const v = Math.min(45, 4 + (r > 0 ? Math.log10(r + 1) * 9 : 0) + A.work * 0.35);
    let printing = false;
    if (A.eject > 0) {
      A.eject -= dt;
      const k = Math.max(0, A.eject / 0.4);
      vase.setAttribute('transform', `translate(${(1 - k) * 70} 0)`);
      vase.setAttribute('opacity', k.toFixed(2));
      if (A.eject <= 0) { A.layer = 0; A.x = 0; vase.removeAttribute('transform'); vase.setAttribute('opacity', '1'); }
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
      layers[i].setAttribute('x', x.toFixed(1));
      layers[i].setAttribute('width', wd.toFixed(1));
    }
    let tx: number, ty: number;
    const li = Math.min(A.layer, NL - 1);
    if (printing && A.eject <= 0 && A.layer < NL) {
      const w = VW[li], left = 160 - w / 2, p = li % 2 ? 1 - A.x : A.x;
      tx = left + w * p; ty = 83 - li * 8;
    } else { tx = 210; ty = Math.max(0, 83 - A.layer * 8 - 34); }
    const f = RM.matches ? 1 : Math.min(1, dt * (printing ? 28 : 5));
    A.hx += (tx - A.hx) * f;
    A.hy += (ty - A.hy) * f;
    gantry.setAttribute('transform', `translate(0 ${A.hy.toFixed(1)})`);
    head.setAttribute('transform', `translate(${(A.hx - 160).toFixed(1)} 0)`);
    filpath.setAttribute('d', `M270 32 C 300 40, 300 ${(70 + A.hy).toFixed(1)}, ${A.hx.toFixed(1)} ${(58 + A.hy).toFixed(1)}`);
    glow.setAttribute('opacity', printing ? (0.5 + 0.3 * Math.sin(now / 60)).toFixed(2) : '0');
    if (printing) A.rot = (A.rot + v * dt * 14) % 360;
    spool.setAttribute('transform', `rotate(${A.rot.toFixed(1)} 292 40)`);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    /** Ręczny druk dokłada jedną figurkę do kolejki animacji. */
    feed() { A.work = Math.min(A.work + NL, NL * 3); },
    isBusy() { return A.work > 0; },
    destroy() { cancelAnimationFrame(raf); },
  };
}
