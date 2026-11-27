import type { ComponentChildren } from 'preact';



export type PopId = 'funds' | 'stock' | 'fil' | 'notif';

/** Chip that can open a panel on hover (mouse), tap or Enter (touch and keyboard). */
export interface PopControl { open: PopId | null; toggle: (id: PopId, el: HTMLElement) => void; show: (id: PopId, el: HTMLElement) => void; hideSoon: () => void }

/** Pointer, tap and keyboard wiring that makes an element open its HUD panel. */
export const popHandlers = (pop: PopControl, popId: PopId) => ({
  role: 'button' as const, tabIndex: 0, 'aria-haspopup': 'dialog' as const, 'aria-expanded': pop.open === popId,
  onPointerEnter: (e: PointerEvent) => { if (e.pointerType === 'mouse') pop.show(popId, e.currentTarget as HTMLElement); },
  onPointerLeave: (e: PointerEvent) => { if (e.pointerType === 'mouse') pop.hideSoon(); },
  onClick: (e: MouseEvent) => { if ((e as unknown as PointerEvent).pointerType !== 'mouse') pop.toggle(popId, e.currentTarget as HTMLElement); },
  onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter') pop.toggle(popId, e.currentTarget as HTMLElement); },
});

export const Chip = ({ label, value, warn, show = true, sub, meter, big, pop, popId, children }: { label: string; value: ComponentChildren; warn?: boolean; show?: boolean; sub?: string; meter?: number; big?: boolean; pop?: PopControl; popId?: PopId; children?: ComponentChildren }) =>
  show ? (
    <div class={'chip' + (warn ? ' warn' : '') + (big ? ' big' : '') + (pop && popId ? ' has-pop' : '')}
      {...(pop && popId ? popHandlers(pop, popId) : {})}>
      <small>{label}</small><b>{value}</b>
      {sub && <small class="chip-sub">{sub}</small>}
      {meter !== undefined && <span class="chip-meter"><i style={{ width: Math.max(0, Math.min(100, meter)) + '%' }} /></span>}
      {children}
    </div>
  ) : null;
