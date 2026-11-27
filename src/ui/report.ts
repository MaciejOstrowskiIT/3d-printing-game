import { createReporter } from '../platform/report';
import { analytics } from './analytics';

/** Bug reporter for this build; endpoint comes from VITE_REPORT_ENDPOINT, else the Umami fallback. */
export const reporter = createReporter({ endpoint: import.meta.env.VITE_REPORT_ENDPOINT as string | undefined, analytics });
