import { render } from 'preact';
import './styles.css';
import { App } from './ui/components/App';
import { platform } from './ui/platform';
import { initAnalytics } from './ui/analytics';
import { game, startLoop } from './ui/store';

async function boot() {
  await platform.init();
  render(<App />, document.getElementById('app')!);
  startLoop();
  platform.loadingFinished();
  initAnalytics();
}
void boot();

// Console handle for debugging, dev mode only (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { __drk: unknown }).__drk = game;
