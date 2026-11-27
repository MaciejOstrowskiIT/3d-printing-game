/** Keyboard support for a horizontal `role="tablist"` (WAI-ARIA tabs pattern, automatic activation):
 *  Left/Right move to the previous/next enabled tab and select it, Home/End jump to the first/last one.
 *  Only the selected tab is in the Tab order (`tabIndex` 0, the others -1), so Tab moves past the whole list. */
export function onTablistKey(e: KeyboardEvent) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
  const list = e.currentTarget as HTMLElement;
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')];
  const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  e.preventDefault();
  const n = tabs.length;
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
  tabs[j].focus();
  tabs[j].click();
}

/** Id of the element that shows the content of the main game tabs. */
export const MAIN_PANEL_ID = 'main-panel';
/** Id of a main game tab button (the tab panel is labelled by the selected one). */
export const tabId = (tab: string) => 'tab-' + tab;
