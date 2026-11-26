import { BAL } from '../../content/balance';
import { COLORS } from '../../content/colors';
import type { GameState } from '../../core/state';

/** Scena izometryczna. Zamiast rysować każdą drukarkę, zmienia skalę: garaż, pracownia, hala, orbita.
 *  Rysuje najwyżej kilkadziesiąt obiektów, a resztę zwraca jako liczbę „ukrytych”. */

const TW = 32, TH = 16, OX = 160, OY = 70;
type P = [number, number];
const iso = (gx: number, gy: number, z = 0): P => [OX + ((gx - gy) * TW) / 2, OY + ((gx + gy) * TH) / 2 - z];
const pts = (a: P[]) => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

function cub(gx: number, gy: number, w: number, d: number, h: number, z: number, top: string, lf: string, rt: string) {
  const A = iso(gx, gy, z + h), B = iso(gx + w, gy, z + h), C = iso(gx + w, gy + d, z + h), D = iso(gx, gy + d, z + h);
  const B0 = iso(gx + w, gy, z), C0 = iso(gx + w, gy + d, z), D0 = iso(gx, gy + d, z);
  return `<polygon points="${pts([D, C, C0, D0])}" fill="${lf}"/><polygon points="${pts([B, C, C0, B0])}" fill="${rt}"/><polygon points="${pts([A, B, C, D])}" fill="${top}"/>`;
}

function rng(seed: number) { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; }

function printerU(gx: number, gy: number, z: number, sz: number, h: number, k: number, col: string) {
  const o = (1 - sz) / 2, x0 = gx + o, y0 = gy + o;
  let s = cub(x0, y0, sz, sz, h, z, '#565b68', '#3b3f49', '#2d3038');
  const Pf = (u: number, v: number) => iso(x0 + sz, y0 + sz * u, z + h * v);
  s += `<polygon points="${pts([Pf(0.14, 0.12), Pf(0.86, 0.12), Pf(0.86, 0.84), Pf(0.14, 0.84)])}" fill="#ffe2c4"/>`;
  s += `<polygon points="${pts([Pf(0.4, 0.12), Pf(0.6, 0.12), Pf(0.6, 0.42), Pf(0.4, 0.42)])}" fill="${col}"/>`;
  const a = Pf(0.18, 0.7), b = Pf(0.62, 0.7);
  const q = [Pf(0.18, 0.76), Pf(0.34, 0.76), Pf(0.34, 0.64), Pf(0.18, 0.64)];
  s += `<g class="hd" style="--dx:${(b[0] - a[0]).toFixed(1)}px;--dy:${(b[1] - a[1]).toFixed(1)}px;animation-delay:-${((k * 0.37) % 1.1).toFixed(2)}s"><polygon points="${pts(q)}" fill="#ff6a1f"/></g>`;
  const l = iso(x0 + sz, y0 + sz * 0.92, z + h * 0.93);
  s += `<circle cx="${l[0].toFixed(1)}" cy="${l[1].toFixed(1)}" r="${sz > 1 ? 1.8 : 1.1}" fill="#3cc8e4" class="bl" style="animation-delay:-${((k * 0.29) % 1.6).toFixed(2)}s"/>`;
  return s;
}

function farmU(gx: number, gy: number, k: number, r: () => number) {
  let s = cub(gx + 0.1, gy + 0.1, 1.8, 1.8, 46, 0, '#4a4f5c', '#30343d', '#262930');
  const PR = (u: number, v: number) => iso(gx + 1.9, gy + 0.1 + 1.8 * u, 46 * v);
  const PL = (u: number, v: number) => iso(gx + 0.1 + 1.8 * u, gy + 1.9, 46 * v);
  for (const Pf of [PR, PL])
    for (let row = 0; row < 4; row++)
      for (let c = 0; c < 6; c++) {
        const p = Pf(0.1 + (0.8 * (c + 0.5)) / 6, 0.1 + (0.66 * (row + 0.5)) / 4);
        s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.4" fill="${(row + c + k) % 7 ? '#ffb37a' : '#3cc8e4'}" class="bl" style="animation-delay:-${(r() * 1.6).toFixed(2)}s"/>`;
      }
  s += `<polygon points="${pts([PL(0.06, 0.93), PL(0.94, 0.93), PL(0.94, 0.84), PL(0.06, 0.84)])}" fill="#ff6a1f"/>`;
  s += `<polygon points="${pts([PR(0.06, 0.93), PR(0.94, 0.93), PR(0.94, 0.84), PR(0.06, 0.84)])}" fill="#e2560f"/>`;
  return s;
}

function roomShell() {
  let s = `<polygon points="${pts([iso(0, 0, 56), iso(0, 8, 56), iso(0, 8), iso(0, 0)])}" fill="#d9dde3"/>`;
  s += `<polygon points="${pts([iso(0, 0, 56), iso(8, 0, 56), iso(8, 0), iso(0, 0)])}" fill="#c6cbd3"/>`;
  s += `<polygon points="${pts([iso(0, 0), iso(8, 0), iso(8, 8), iso(0, 8)])}" fill="#a9afb9"/>`;
  for (let i = 1; i < 8; i++) {
    const [a, b, c, d] = [iso(i, 0), iso(i, 8), iso(0, i), iso(8, i)];
    s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#b7bdc6" stroke-width=".6"/><line x1="${c[0]}" y1="${c[1]}" x2="${d[0]}" y2="${d[1]}" stroke="#b7bdc6" stroke-width=".6"/>`;
  }
  s += `<polygon points="${pts([iso(0, 2.2, 46), iso(0, 4.6, 46), iso(0, 4.6, 22), iso(0, 2.2, 22)])}" fill="#bfe3f2"/><polygon points="${pts([iso(0, 3.4, 46), iso(0, 3.5, 46), iso(0, 3.5, 22), iso(0, 3.4, 22)])}" fill="#d9dde3"/>`;
  s += `<polygon points="${pts([iso(2, 0, 30), iso(6, 0, 30), iso(6, 0, 27), iso(2, 0, 27)])}" fill="#8a7458"/>`;
  COLORS.forEach((c, i) => {
    const p = iso(2.4 + i * 0.65, 0, 34.5);
    s += `<ellipse cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" rx="3.6" ry="4.6" fill="${c.c}" stroke="#0003" stroke-width=".8"/>`;
  });
  return s;
}

export type Stage = 'garage' | 'shop' | 'hall' | 'space';
export interface RoomInfo { stage: Stage; hidden: number }

export const roomSignature = (s: GameState) => [s.ph, s.auto, s.farm, s.drones, s.fabs, s.col].join('/');

export function buildRoom(svg: SVGSVGElement, s: GameState): RoomInfo {
  const col = COLORS[s.col]?.c ?? COLORS[0].c;
  const r = rng(7);

  if (s.ph === 2) {
    let h = '';
    for (let i = 0; i < 60; i++) h += `<circle cx="${(r() * 320).toFixed(1)}" cy="${(r() * 240).toFixed(1)}" r="${(r() * 1.1 + 0.3).toFixed(1)}" fill="#fff" opacity="${(r() * 0.6 + 0.3).toFixed(2)}"/>`;
    const nd = Math.min(s.drones, 28), nf = Math.min(s.fabs, 10);
    for (let i = 0; i < nd; i++) {
      const rr = 58 + (i % 4) * 14, d = (14 + (i % 5) * 5) / (1 + Math.log10(s.dMul));
      h += `<g class="orb" style="animation-duration:${d.toFixed(1)}s;animation-delay:-${(r() * d).toFixed(1)}s"><circle cx="${160 + rr}" cy="120" r="2.4" fill="#cfd6e6"/><circle cx="${160 + rr}" cy="120" r="1" fill="#3cc8e4"/></g>`;
    }
    let ast = '';
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, rr = 40 + r() * 9; ast += (160 + Math.cos(a) * rr).toFixed(1) + ',' + (120 + Math.sin(a) * rr * 0.86).toFixed(1) + ' '; }
    h += `<polygon points="${ast}" fill="#6d6a78"/><circle cx="148" cy="108" r="7" fill="#5c5967"/><circle cx="176" cy="130" r="5" fill="#5c5967"/>`;
    for (let i = 0; i < nf; i++) {
      const a = -Math.PI / 2 + (i - (nf - 1) / 2) * 0.42, x = 160 + Math.cos(a) * 36, y = 120 + Math.sin(a) * 31;
      h += `<rect x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="8" rx="2" fill="#2d3038"/><rect x="${(x - 3).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="6" height="3" fill="${col}" class="bl"/>`;
    }
    svg.innerHTML = h;
    return { stage: 'space', hidden: Math.max(0, s.drones - nd) + Math.max(0, s.fabs - nf) };
  }

  const items: { d: number; s: string }[] = [];
  let shown = 0;
  const total = s.auto + s.farm * BAL.farmPrinters;
  items.push({ d: 5.2 + 5.2 + 1.6, s: printerU(5.2, 5.2, 0, 1.6, 32, 0, col) });
  const place = (cells: [number, number][], stack: number) => {
    let left = s.auto, k = 1;
    for (const [gx, gy] of cells) {
      if (left <= 0) break;
      const n = Math.min(stack, left);
      for (let j = 0; j < n; j++) { items.push({ d: gx + gy + 1 + j * 0.01, s: printerU(gx, gy, j * 19, 0.78, 18, k++, col) }); shown++; }
      left -= n;
    }
  };

  if (s.farm === 0) {
    const cells: [number, number][] = [];
    for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) { if ((gx >= 4 && gy >= 4) || gx >= 6 || gy >= 6) continue; cells.push([gx, gy]); }
    cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
    place(cells, s.auto <= 14 ? 1 : s.auto <= 40 ? 2 : 3);
  } else {
    const fs: [number, number][] = [[0, 0], [3, 0], [0, 3], [6, 0], [3, 3], [0, 6], [6, 3], [3, 6]];
    const nf = Math.min(s.farm, fs.length);
    for (let i = 0; i < nf; i++) { const [gx, gy] = fs[i]; items.push({ d: gx + gy + 2, s: farmU(gx, gy, i, r) }); shown += BAL.farmPrinters; }
    const used = fs.slice(0, nf);
    const cells = ([[2, 0], [2, 1], [0, 2], [1, 2], [5, 0], [5, 1], [2, 3], [2, 4], [0, 5], [1, 5]] as [number, number][])
      .filter(([x, y]) => !used.some(([fx, fy]) => x >= fx && x < fx + 2 && y >= fy && y < fy + 2));
    place(cells, 3);
  }
  items.sort((a, b) => a.d - b.d);
  svg.innerHTML = roomShell() + items.map(i => i.s).join('');
  return { stage: s.farm > 0 ? 'hall' : s.auto <= 8 ? 'garage' : 'shop', hidden: Math.max(0, total - shown) };
}
