/** Portal covers, built from the game's own SVG art (printer close-up + isometric factory floor).
 *  Open /promo/covers.html?c=<name> on the Vite dev server; promo/render.py screenshots each one. */
import '../src/fonts.css';
import { COLORS } from '../src/content/colors';
import { createState } from '../src/core/state';
import { buildRoom } from '../src/ui/scene/room';
import { PRINTER_SVG } from '../src/ui/scene/printer';

type Box = { x: number; y: number; w: number };

const VW = [34, 44, 52, 56, 56, 52, 46, 40, 36, 36, 40, 46]; // vase layer widths, same as the game
const FRAME = '#24252c';

/** Big printer mid-print: `layers` of the vase done, head right above the last one, nozzle glowing. */
function printer({ x, y, w }: Box, col = 2, layers = 10) {
  const C = COLORS[col];
  const vase = VW.slice(0, layers)
    .map((vw, i) => `<rect x="${160 - vw / 2}" y="${188 - i * 8}" width="${vw}" height="8.4" rx="2.5" fill="${i % 2 ? C.c2 : C.c}" stroke="${C.st}" stroke-width=".6"/>`)
    .join('');
  const dy = 188 - (layers - 1) * 8 - 106; // nozzle tip (y=104) just above the top layer
  const art = PRINTER_SVG
    .replace('<g data-p="vase"></g>', `<g>${vase}</g>`)
    .replace('<g data-p="gantry">', `<g transform="translate(0 ${dy})">`)
    .replace('opacity="0"', 'opacity=".9"')
    .replace('stroke="#fff"', `stroke="${C.c}"`)
    .replace('<circle cx="292" cy="40" r="20" fill="#f4efe9"', `<circle cx="292" cy="40" r="20" fill="${C.c}"`)
    .replace('160 58"', `160 ${58 + dy}"`);
  // Lit build chamber, like the close-up card in the game, so the dark frame reads on a dark background.
  const chamber = `<defs><linearGradient id="ch${col}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f2f5"/><stop offset="1" stop-color="#cfd4dc"/></linearGradient></defs>
    <rect x="50" y="26" width="220" height="186" fill="url(#ch${col})"/>`;
  return `<svg x="${x}" y="${y}" width="${w}" height="${(w * 240) / 320}" viewBox="0 0 320 240" style="--frame:${FRAME}">${chamber}${art}</svg>`;
}

/** The in-game isometric factory floor: farms, stacked printers, spool shelf. */
function room({ x, y, w }: Box, farms = 6, col = 2) {
  const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  buildRoom(tmp, { ...createState(), auto: 60, farm: farms, farmOn: true, col });
  return `<svg x="${x}" y="${y}" width="${w}" height="${(w * 240) / 320}" viewBox="0 0 320 240">${tmp.innerHTML}</svg>`;
}

/** Filament spools in all game colours, lying in a row. */
function spools(x: number, y: number, r: number, gap = 2.3) {
  return COLORS.map((c, i) => {
    const cx = x + i * r * gap;
    return `<g><circle cx="${cx}" cy="${y}" r="${r}" fill="${c.c}" stroke="${c.st}" stroke-width="${r * 0.08}"/>
      <circle cx="${cx}" cy="${y}" r="${r * 0.72}" fill="none" stroke="#0002" stroke-width="${r * 0.05}"/>
      <circle cx="${cx}" cy="${y}" r="${r * 0.34}" fill="${FRAME}"/><circle cx="${cx}" cy="${y}" r="${r * 0.14}" fill="#555a66"/></g>`;
  }).join('');
}

/** Asteroid with orbiting drones: the late game, as a hint in the sky. */
function asteroid(cx: number, cy: number, r: number) {
  let pts = '';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, rr = r * (0.85 + ((i * 37) % 10) / 50);
    pts += `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr * 0.86).toFixed(1)} `;
  }
  let drones = '';
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.3, ox = cx + Math.cos(a) * r * 1.9, oy = cy + Math.sin(a) * r * 0.7;
    drones += `<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="${r * 0.09}" fill="#cfd6e6"/><circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="${r * 0.04}" fill="#3cc8e4"/>`;
  }
  return `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.9}" ry="${r * 0.7}" fill="none" stroke="#ffffff30" stroke-width="${r * 0.03}" stroke-dasharray="${r * 0.12} ${r * 0.1}"/>
    <polygon points="${pts}" fill="#6d6a78"/><circle cx="${cx - r * 0.3}" cy="${cy - r * 0.25}" r="${r * 0.18}" fill="#5c5967"/><circle cx="${cx + r * 0.35}" cy="${cy + r * 0.2}" r="${r * 0.12}" fill="#5c5967"/>${drones}`;
}

/** Night-sky gradient fading into the graphite workshop, warm glow where the printer stands, a few stars. */
function background(w: number, h: number, glow: { x: number; y: number; r: number }) {
  let stars = '';
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < Math.round((w * h) / 9000); i++) {
    const y = rnd() * h * 0.55;
    stars += `<circle cx="${(rnd() * w).toFixed(1)}" cy="${y.toFixed(1)}" r="${(rnd() * 1.6 + 0.5).toFixed(1)}" fill="#fff" opacity="${((1 - y / (h * 0.55)) * 0.7 * rnd() + 0.1).toFixed(2)}"/>`;
  }
  return `<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191733"/><stop offset=".55" stop-color="#1e2128"/><stop offset="1" stop-color="#14151a"/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stop-color="#ff6a1f" stop-opacity=".38"/><stop offset="1" stop-color="#ff6a1f" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>${stars}
    <circle cx="${glow.x}" cy="${glow.y}" r="${glow.r}" fill="url(#glow)"/>`;
}

/** Game title only: CrazyGames allows no other text on covers (no taglines, no "Play now"). */
function title(x: number, y: number, size: number, anchor: 'start' | 'middle' = 'start') {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Barlow Condensed" font-weight="700" font-size="${size}" fill="#f1efe9" letter-spacing="${size * 0.01}">PRINTWORKS</text>`;
}

/** Rounded app icon: dark tile with the printer close-up. Also used as the favicon. */
function icon(s: number) {
  return `<rect width="${s}" height="${s}" rx="${s * 0.22}" fill="#1e2128"/>
    <circle cx="${s / 2}" cy="${s * 0.62}" r="${s * 0.42}" fill="url(#glow)"/>
    ${printer({ x: s * 0.02, y: s * 0.15, w: s * 0.94 }, 2, 11)}`;
}

export const COVERS: Record<string, { w: number; h: number; svg: () => string }> = {
  // CrazyGames: landscape 1920x1080, portrait 800x1200, square 800x800
  landscape: {
    w: 1920, h: 1080,
    svg: () => background(1920, 1080, { x: 500, y: 720, r: 620 }) +
      asteroid(1650, 170, 70) +
      room({ x: 760, y: 150, w: 1180 }) +
      printer({ x: 30, y: 330, w: 900 }) +
      spools(1170, 990, 30) +
      title(110, 250, 190),
  },
  portrait: {
    w: 800, h: 1200,
    svg: () => background(800, 1200, { x: 400, y: 930, r: 520 }) +
      asteroid(640, 320, 44) +
      title(400, 200, 130, 'middle') +
      room({ x: 60, y: 300, w: 700 }) +
      printer({ x: 50, y: 700, w: 680 }),
  },
  square: {
    w: 800, h: 800,
    svg: () => background(800, 800, { x: 300, y: 560, r: 440 }) +
      room({ x: 290, y: 150, w: 560 }) +
      printer({ x: -40, y: 300, w: 640 }) +
      title(400, 120, 104, 'middle'),
  },
  // Poki: full-bleed square, at least 628x628, no text
  poki: {
    w: 1024, h: 1024,
    svg: () => background(1024, 1024, { x: 470, y: 700, r: 560 }) +
      asteroid(860, 150, 56) +
      room({ x: 350, y: 120, w: 760 }) +
      printer({ x: -60, y: 360, w: 880 }),
  },
  icon512: {
    w: 512, h: 512,
    svg: () => `<defs><radialGradient id="glow"><stop offset="0" stop-color="#ff6a1f" stop-opacity=".45"/><stop offset="1" stop-color="#ff6a1f" stop-opacity="0"/></radialGradient></defs>${icon(512)}`,
  },
};

const name = new URLSearchParams(location.search).get('c') ?? 'landscape';
const cover = COVERS[name];
document.title = `cover: ${name}`;
const stage = document.getElementById('stage')!;
stage.style.width = cover.w + 'px';
stage.style.height = cover.h + 'px';
stage.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${cover.w}" height="${cover.h}" viewBox="0 0 ${cover.w} ${cover.h}">${cover.svg()}</svg>`;
// Fonts must be ready before the screenshot.
void document.fonts.ready.then(() => document.body.setAttribute('data-ready', '1'));
