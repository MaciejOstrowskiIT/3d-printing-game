/** Moving parts of the isometric floor (scene/room.ts): print heads sliding, lights blinking, drones orbiting.
 *  Driven from script at a capped frame rate instead of CSS animations: a CSS animation inside the SVG makes the browser
 *  restyle, lay out and repaint the page on every display frame (60+ a second), which on a phone cost more than the
 *  whole game. The motion matches the old keyframes; it is just sampled less often (ui/frameCap.ts). */
import { frameGate } from '../frameCap';

const HEAD_S = 1.1, BLINK_S = 1.6;
/** The old `steps(2,end)` blink between 1 and .25 opacity: four equal steps per period. */
const BLINK = ['1', '0.625', '0.25', '0.625'];

/** CSS `ease-in-out` (cubic-bezier(.42,0,.58,1)) at progress x. */
export function easeInOut(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Solve bx(u) = x for the curve parameter u (Newton, then bisection as a fallback), then return by(u).
  const bx = (u: number) => 3 * u * (1 - u) ** 2 * 0.42 + 3 * u ** 2 * (1 - u) * 0.58 + u ** 3;
  const by = (u: number) => 3 * u ** 2 * (1 - u) + u ** 3;
  let u = x;
  for (let i = 0; i < 6; i++) {
    const d = 3 * (1 - u) ** 2 * 0.42 + 6 * u * (1 - u) * (0.58 - 0.42) + 3 * u ** 2 * (1 - 0.58);
    if (Math.abs(d) < 1e-6) break;
    u -= (bx(u) - x) / d;
  }
  if (!(u >= 0 && u <= 1) || Math.abs(bx(u) - x) > 1e-4) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { u = (lo + hi) / 2; if (bx(u) < x) lo = u; else hi = u; }
  }
  return by(u);
}

/** Head offset share (0..1) at time t: `alternate`, so it goes there and back. */
export const headAt = (t: number) => {
  const p = (t / HEAD_S) % 2;
  return easeInOut(p < 1 ? p : 2 - p);
};

export const blinkAt = (t: number) => BLINK[Math.floor(((t % BLINK_S) / BLINK_S) * 4) % 4];

interface Head { el: Element; dx: number; dy: number; t: number }
interface Light { el: Element; t: number }
interface Drone { el: Element; dur: number; t: number }

export interface RoomMotion {
  /** Call after the scene markup was rebuilt. */
  rescan(): void;
  /** Heads and lights run only while the workshop prints (`busy`); nothing moves while off screen or with reduced motion. */
  set(o: { busy: boolean; onScreen: boolean; reduced: boolean }): void;
  destroy(): void;
}

const put = (el: Element, name: string, value: string) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };

export function animateRoom(svg: SVGSVGElement): RoomMotion {
  let heads: Head[] = [], lights: Light[] = [], drones: Drone[] = [];
  let busy = false, onScreen = true, reduced = false;
  // Paused animations resume where they stopped, so each group keeps its own clock that only runs while it moves.
  let workT = 0, orbT = 0, last = performance.now(), raf = 0;
  const gate = frameGate();
  const num = (el: Element, k: string) => Number(el.getAttribute(k)) || 0;

  const draw = () => {
    if (reduced) {
      for (const h of heads) put(h.el, 'transform', 'translate(0 0)');
      for (const l of lights) put(l.el, 'opacity', '1');
      for (const d of drones) put(d.el, 'transform', 'rotate(0 160 120)');
      return;
    }
    for (const h of heads) {
      const k = headAt(workT + h.t);
      put(h.el, 'transform', `translate(${(h.dx * k).toFixed(1)} ${(h.dy * k).toFixed(1)})`);
    }
    for (const l of lights) put(l.el, 'opacity', blinkAt(workT + l.t));
    for (const d of drones) put(d.el, 'transform', `rotate(${((((orbT + d.t) % d.dur) / d.dur) * 360).toFixed(1)} 160 120)`);
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!gate(now)) return;
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (!onScreen || reduced) return;
    if (busy) workT += dt;
    orbT += dt;
    draw();
  };
  const running = () => onScreen && !reduced && (busy || drones.length > 0) && (heads.length + lights.length + drones.length > 0);
  const sync = () => {
    if (running()) {
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  };

  return {
    rescan() {
      heads = [...svg.querySelectorAll('.hd')].map(el => ({ el, dx: num(el, 'data-dx'), dy: num(el, 'data-dy'), t: num(el, 'data-t') }));
      lights = [...svg.querySelectorAll('.bl')].map(el => ({ el, t: num(el, 'data-t') }));
      drones = [...svg.querySelectorAll('.orb')].map(el => ({ el, dur: num(el, 'data-dur') || 1, t: num(el, 'data-t') }));
      draw();
      sync();
    },
    set(o) {
      const changed = o.reduced !== reduced;
      busy = o.busy; onScreen = o.onScreen; reduced = o.reduced;
      if (changed) draw();
      sync();
    },
    destroy() { cancelAnimationFrame(raf); raf = 0; },
  };
}
