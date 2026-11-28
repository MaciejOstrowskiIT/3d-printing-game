// Runs the visual regression suite inside the official Playwright Docker image, so the screenshots render the same
// on Windows, macOS, Linux and in CI. Extra arguments go to `playwright test`, e.g.:
//   npm run e2e:visual:docker -- --update-snapshots
//   npm run e2e:visual:docker -- -g factory --project=mobile
// Plain Node (no dependencies), so CI can run it before `npm ci`.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const version = lock.packages['node_modules/@playwright/test']?.version;
if (!version) throw new Error('@playwright/test is missing from package-lock.json');

const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const cwd = process.cwd();
// The container runs as root; on a Linux or macOS host, hand the files it wrote back to the current user.
const owner = typeof process.getuid === 'function' ? `${process.getuid()}:${process.getgid()}` : '';
const chown = owner ? `chown -R ${owner} dist-qa e2e/out e2e/__screenshots__ playwright-report 2>/dev/null; ` : '';
const args = [
  'run', '--rm', '--init', '--ipc=host',
  // The repository is mounted; node_modules stays in the container, so Linux binaries never land on the host.
  '--mount', `type=bind,source=${cwd},target=/work`,
  '--mount', 'type=volume,target=/work/node_modules',
  '--workdir', '/work',
  '--env', 'VISUAL_DOCKER=1',
  ...(process.env.CI ? ['--env', 'CI'] : []),
  image,
  'bash', '-c', `npm ci --no-audit --no-fund && npx playwright test -c playwright.visual.config.ts "$@"; code=$?; ${chown}exit $code`,
  'bash',
  ...process.argv.slice(2),
];

console.log(`Visual suite in ${image}`);
const result = spawnSync('docker', args, { stdio: 'inherit' });
if (result.error) {
  console.error(`Could not start docker: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
