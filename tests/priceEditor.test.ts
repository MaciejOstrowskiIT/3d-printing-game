import { expect, it } from 'vitest';
import { MODEL } from '../src/content/models';
import { createGame } from '../src/core/game';
import { exportSave, importSave } from '../src/core/save';
import { stockPrice } from '../src/systems/inventory';

it('edits the selected model by exact cents, fixed steps and percentages', () => {
  const game = createGame();
  game.s.mdls.push('helmet');
  const price = () => stockPrice(game.s, 'helmet') * MODEL.helmet.seconds;
  expect(game.act('price:helmet:set:1251')).toBe(true);
  expect(price()).toBeCloseTo(12.51, 8);
  expect(game.act('price:helmet:delta:10')).toBe(true);
  expect(price()).toBeCloseTo(12.61, 8);
  expect(game.act('price:helmet:percent:5')).toBe(true);
  expect(price()).toBeCloseTo(13.24, 8);
  expect(game.act('price:helmet:percent:-20')).toBe(true);
  expect(price()).toBeCloseTo(10.59, 8);
  expect(game.act('price:helmet:delta:-50')).toBe(true);
  expect(price()).toBeCloseTo(10.09, 8);
  expect(game.s.price).toBe(5);
  const saved = importSave(exportSave(game.s))!;
  expect(stockPrice(saved, 'helmet') * MODEL.helmet.seconds).toBeCloseTo(10.09, 8);
});

it('rejects invalid direct prices and keeps downward steps above zero', () => {
  const game = createGame();
  expect(game.act('price:fig:set:0')).toBe(false);
  expect(game.act('price:fig:set:0.5')).toBe(false);
  expect(game.act('price:helmet:set:100')).toBe(false);
  expect(game.act('price:fig:set:9')).toBe(true);
  expect(game.act('price:fig:delta:-10')).toBe(true);
  expect(game.s.price).toBe(0.01);
});
