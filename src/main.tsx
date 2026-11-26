import { render } from 'preact';
// Fonts are bundled (Latin + Latin Extended for Polish) so the game makes no third-party requests.
import './fonts.css';
import './styles.css';
import { App } from './ui/components/App';
import { platform } from './ui/platform';
import { initAnalytics } from './ui/analytics';
import { game, startLoop } from './ui/store';

async function boot() {
  await platform.init();
  render(<App />, document.getElementById('app')!);
  const splash = document.getElementById('boot');
  splash?.classList.add('gone');
  setTimeout(() => splash?.remove(), 400);
  startLoop();
  platform.loadingFinished();
  initAnalytics();
}
void boot();

// Console handle for debugging, dev mode only (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { __drk: unknown }).__drk = game;
