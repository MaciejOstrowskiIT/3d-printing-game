import { expect } from '@playwright/test';
import { createState } from '../src/core/state';
import { bookCash, PERIOD_SECONDS } from '../src/systems/workshopStats';
import { expectHealthy, test } from './helpers';

test('selects chart points and filters the workshop results by period', async ({ page, isMobile }) => {
  const state = { ...createState(), total: 50, goal: 2 };
  bookCash(state, 'sales', 10, { modelId: 'fig', pieces: 1, cost: 2 });
  state.financeTime += PERIOD_SECONDS;
  bookCash(state, 'equipment', 20);
  state.financeTime += PERIOD_SECONDS;
  bookCash(state, 'sales', 30, { modelId: 'fig', pieces: 3, cost: 6 });
  state.financeTime += PERIOD_SECONDS;

  await page.goto('/');
  await page.getByRole('button', { name: 'Load a save', exact: true }).click();
  const save = page.getByRole('dialog', { name: 'Saved game' });
  await save.getByRole('textbox', { name: 'Load a save' }).fill(JSON.stringify(state));
  await save.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(save.getByRole('status')).toHaveText('Save loaded.');
  await save.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  if (isMobile) {
    await page.getByRole('tab', { name: 'Sales', exact: true }).tap();
    await page.getByRole('button', { name: /^Workshop results/ }).tap();
  }

  const panel = page.getByRole('region', { name: /^Workshop results/ });
  const chart = panel.getByRole('group', { name: 'Income and spending in 30-second intervals' });
  const points = chart.getByRole('button');
  const detail = panel.locator('.stats-detail').first();
  const from = panel.getByRole('combobox', { name: 'From', exact: true });
  const to = panel.getByRole('combobox', { name: 'To', exact: true });
  const totals = panel.locator('.stats-totals');
  const modelSales = panel.getByRole('table', { name: 'Sales by model' });

  await expect(points).toHaveCount(4);
  await expect(chart.locator('path').first()).toHaveAttribute('d', /C/);
  await expect(totals).toContainText(/40[\s\S]*20/);
  await expect(modelSales).toContainText('4 pcs');

  const expense = chart.getByRole('button', { name: /^About 60s ago/ });
  if (isMobile) await expense.tap();
  else {
    await expense.focus();
    await expense.press('Enter');
  }
  await expect(expense).toHaveAttribute('aria-pressed', 'true');
  await expect(detail).toContainText(/Equipment.*20/);

  await from.selectOption('1');
  await to.selectOption('2');
  await expect(points).toHaveCount(2);
  await expect(expense).toHaveAttribute('aria-pressed', 'true');
  await expect(totals).toContainText(/30[\s\S]*20/);
  await expect(modelSales).toContainText('3 pcs');

  await to.selectOption('1');
  await expect(points).toHaveCount(1);
  await expect(detail).toContainText(/Equipment.*20/);
  await expect(modelSales).toBeHidden();

  await panel.getByRole('button', { name: 'Last 5 min', exact: true }).click();
  await expect(points).toHaveCount(4);
  await expect(modelSales).toContainText('4 pcs');
  await page.getByRole('button', { name: 'Polski', exact: true }).click();
  const polishPanel = page.getByRole('region', { name: /^Wyniki warsztatu/ });
  await expect(polishPanel.getByRole('combobox', { name: 'Od', exact: true })).toBeVisible();
  await expect(polishPanel.getByRole('combobox', { name: 'Do', exact: true })).toBeVisible();
  await expectHealthy(page);
});
