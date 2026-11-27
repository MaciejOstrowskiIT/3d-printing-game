import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Action } from '../../core/game';
import { act } from '../store';
import { money, t } from '../i18n';

/** Holding the button repeats the action (printing, price changes). Keyboard activation works as a plain click. */
export function useHold(action: Action) {
  const timers = useRef<{ t?: number; i?: number }>({});
  const stop = () => { clearTimeout(timers.current.t); clearInterval(timers.current.i); timers.current = {}; };
  useEffect(() => {
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    return () => { stop(); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); window.removeEventListener('blur', stop); };
  }, []);
  return {
    'data-hold': true,
    onPointerDown: (e: PointerEvent) => {
      if (e.button > 0 || (e.currentTarget as HTMLButtonElement).disabled) return;
      act(action);
      stop();
      timers.current.t = window.setTimeout(() => { timers.current.i = window.setInterval(() => { if (!act(action)) stop(); }, 170); }, 380);
    },
    onClick: (e: MouseEvent) => { if (e.detail === 0) act(action); },
    onContextMenu: (e: Event) => e.preventDefault(),
  };
}

/** Purchase button: an outline that fills up as you save, with how much is missing; solid once you can afford it.
 *  `unit` formats the missing amount (money by default, figurines in space). */
export function BuyButton({ cost, have, label, action, unit = money }: { cost: number; have: number; label: string; action: Action; unit?: (n: number) => string }) {
  const ok = have >= cost;
  const pct = Math.max(0, Math.min(100, (100 * have) / cost)).toFixed(1) + '%';
  return (
    <button class={'buy' + (ok ? ' ok' : '')} disabled={!ok} style={{ '--pp': pct }} onClick={() => act(action)}>
      <span>{label}</span>
      {!ok && <small>{t('missing', unit(cost - Math.max(0, have)))}</small>}
    </button>
  );
}

export const Tile = ({ label, value, warn }: { label: string; value: string; warn?: boolean }) => (
  <div class={'tile' + (warn ? ' warn' : '')}><small>{label}</small><b>{value}</b></div>
);

export const Item = ({ name, sub, children, className }: { name: string; sub: string; children: ComponentChildren; className?: string }) => (
  <div class={className ? 'item ' + className : 'item'}><div class="it"><b>{name}</b><small>{sub}</small></div>{children}</div>
);

export const Meter = ({ pct, tone, style }: { pct: number; tone?: 'or' | 'bad'; style?: Record<string, string> }) => (
  <div class={'meter' + (tone ? ' ' + tone : '')} style={style}><i style={{ width: Math.max(0, Math.min(100, pct)) + '%' }} /></div>
);

export const CardHead = ({ title, aside }: { title: string; aside?: string }) => (
  <div class="ch"><h2>{title}</h2>{aside !== undefined && <span>{aside}</span>}</div>
);

/** A patent's shown value: plain text or an amount of money. */
export const showValue = (v: string | { money: number }) => (typeof v === 'string' ? v : money(v.money));
