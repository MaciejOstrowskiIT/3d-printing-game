import { render } from 'preact';
import './styles.css';
import { App } from './ui/components/App';
import { game, startLoop } from './ui/store';

render(<App />, document.getElementById('app')!);
startLoop();

// Console handle for debugging, dev mode only (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { __drk: unknown }).__drk = game;
