import { dialogsTexts } from './pl/dialogs';
import { eventsTexts } from './pl/events';
import { hudTexts } from './pl/hud';
import { lineTexts } from './pl/line';
import { printersTexts } from './pl/printers';
import { progressTexts } from './pl/progress';
import { qualityTexts } from './pl/quality';
import { researchTexts } from './pl/research';
import { sideTexts } from './pl/side';
import { statsTexts } from './pl/stats';
import { summaryTexts } from './pl/summary';
import { workshopTexts } from './pl/workshop';
import { clients, causes } from './pl/lists';
import { logTexts } from './pl/log';

/* UI strings, composed from src/content/i18n/pl/*.ts. Keys must match across languages (enforced by the Dict type). */
export const pl = {
  ...dialogsTexts,
  ...eventsTexts,
  ...hudTexts,
  ...lineTexts,
  ...printersTexts,
  ...progressTexts,
  ...qualityTexts,
  ...researchTexts,
  ...sideTexts,
  ...statsTexts,
  ...summaryTexts,
  ...workshopTexts,
  L: logTexts,
  clients,
  causes,
};

export type Dict = typeof pl;
