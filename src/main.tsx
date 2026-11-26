import { render } from 'preact';
// Fonts are bundled (Latin + Latin Extended for Polish) so the game makes no third-party requests.
import './fonts.css';
import './styles.css';
import { App } from './ui/components/App';
import { platform } from './ui/platform';
import { initAnalytics } from './ui/analytics';
import { reloadPrefs } from './ui/i18n';
import { game, loadSavedGame, startLoop } from './ui/store';

async function boot() {
  await platform.init();
  // Saves and preferences are read only now: on CrazyGames they come from the SDK's data module.
  reloadPrefs();
  loadSavedGame();
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
