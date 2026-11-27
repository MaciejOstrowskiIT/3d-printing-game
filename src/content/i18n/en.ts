import type { Dict } from './pl';
import { dialogsTexts } from './en/dialogs';
import { eventsTexts } from './en/events';
import { hudTexts } from './en/hud';
import { lineTexts } from './en/line';
import { progressTexts } from './en/progress';
import { qualityTexts } from './en/quality';
import { researchTexts } from './en/research';
import { sideTexts } from './en/side';
import { statsTexts } from './en/stats';
import { summaryTexts } from './en/summary';
import { workshopTexts } from './en/workshop';
import { clients, causes } from './en/lists';
import { logTexts } from './en/log';

/* English strings, composed from src/content/i18n/en/*.ts. */
export const en: Dict = {
  ...dialogsTexts,
  ...eventsTexts,
  ...hudTexts,
  ...lineTexts,
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
