

export type PopId = 'funds' | 'stock' | 'fil';

/** Chip that can open a panel on hover (mouse), tap or Enter (touch and keyboard). */
export interface PopControl { open: PopId | null; toggle: (id: PopId, el: HTMLElement) => void; show: (id: PopId, el: HTMLElement) => void; hideSoon: () => void }

export const Chip = ({ label, value, warn, show = true, sub, meter, big, pop, popId }: { label: string; value: string; warn?: boolean; show?: boolean; sub?: string; meter?: number; big?: boolean; pop?: PopControl; popId?: PopId }) =>
  show ? (
    <div class={'chip' + (warn ? ' warn' : '') + (big ? ' big' : '') + (pop && popId ? ' has-pop' : '')}
      {...(pop && popId ? {
        role: 'button', tabIndex: 0, 'aria-haspopup': 'dialog', 'aria-expanded': pop.open === popId,
        onPointerEnter: (e: PointerEvent) => { if (e.pointerType === 'mouse') pop.show(popId, e.currentTarget as HTMLElement); },
        onPointerLeave: (e: PointerEvent) => { if (e.pointerType === 'mouse') pop.hideSoon(); },
        onClick: (e: MouseEvent) => { if ((e as unknown as PointerEvent).pointerType !== 'mouse') pop.toggle(popId, e.currentTarget as HTMLElement); },
        onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter') pop.toggle(popId, e.currentTarget as HTMLElement); },
      } : {})}>
      <small>{label}</small><b>{value}</b>
      {sub && <small class="chip-sub">{sub}</small>}
      {meter !== undefined && <span class="chip-meter"><i style={{ width: Math.max(0, Math.min(100, meter)) + '%' }} /></span>}
    </div>
  ) : null;
