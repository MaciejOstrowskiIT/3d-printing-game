import { render } from 'preact';
import './styles.css';
import { App } from './ui/components/App';
import { game, startLoop } from './ui/store';

render(<App />, document.getElementById('app')!);
startLoop();

// Podgląd stanu do testów w konsoli, tylko w trybie deweloperskim (nie trafia do builda produkcyjnego).
if (import.meta.env.DEV) (window as unknown as { __drk: unknown }).__drk = game;
