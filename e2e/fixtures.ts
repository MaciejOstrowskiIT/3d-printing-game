import type { Page } from '@playwright/test';
import garage from '../promo/states/garage.json' with { type: 'json' };
import workshop from '../promo/states/workshop.json' with { type: 'json' };
import factory from '../promo/states/factory.json' with { type: 'json' };
import research from '../promo/states/research.json' with { type: 'json' };
import space from '../promo/states/space.json' with { type: 'json' };

const saves = { garage, workshop, factory, research, space };
export type Stage = keyof typeof saves;

export async function loadStage(page: Page, stage: Stage) {
  await page.waitForFunction(() => Boolean(window.__drk));
  await page.evaluate(save => window.__drk!.load(save), JSON.stringify(saves[stage]));
}
