import { createReporter } from '../platform/report';
import { analytics } from './analytics';

/** Dev builds and the QA build with #debug show the form even without a transport (reports are only logged). */
const preview = import.meta.env.DEV || (import.meta.env.MODE === 'qa' && location.hash === '#debug');

/** Bug reporter for this build; endpoint comes from VITE_REPORT_ENDPOINT, else the Umami fallback. */
export const reporter = createReporter({ endpoint: import.meta.env.VITE_REPORT_ENDPOINT as string | undefined, analytics, preview });
