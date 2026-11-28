/** Rewrites the generated part of docs/pacing.md and keeps the hand-written notes below the marker.
 *  Run: npm run pacing (a few minutes: it plays the balance bot with 5 seeds at the shipped pace). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildReport } from '../tests/pacing';

const MARKER = '<!-- NOTES: hand-written, kept by `npm run pacing` -->';
const report = buildReport();
const file = new URL('../docs/pacing.md', import.meta.url);
const old = existsSync(file) ? readFileSync(file, 'utf8') : '';
const kept = old.includes(MARKER) ? old.slice(old.indexOf(MARKER)) : `${MARKER}\n\n## Backlog cards\n\n(not written yet)\n`;
mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(file, report + '\n' + kept);
console.log(report);
