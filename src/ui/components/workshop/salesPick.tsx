import { signal } from '@preact/signals';

/** Model shown in Sales; set from the production line tiles or the Sales picker. */
export const salesPick = signal<string | null>(null);
