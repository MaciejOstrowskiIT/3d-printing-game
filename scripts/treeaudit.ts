/** Rewrites the generated part of docs/tree-audit.md and keeps the hand-written proposals below the marker.
 *  Run: npm run treeaudit (about a minute: it plays the balance bot with 5 seeds). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildReport, MARKER } from '../tests/treeAudit';

const report = buildReport();
const file = new URL('../docs/tree-audit.md', import.meta.url);
const old = existsSync(file) ? readFileSync(file, 'utf8') : '';
const kept = old.includes(MARKER) ? old.slice(old.indexOf(MARKER)) : `${MARKER}\n\n## Proposals\n\n(not written yet)\n`;
mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(file, report + '\n' + kept);
console.log(report);
