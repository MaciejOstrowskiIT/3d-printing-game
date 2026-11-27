import { useId, useState } from 'preact/hooks';
import { MODEL } from '../../content/models';
import { stockPrice } from '../../systems/inventory';
import { li, t } from '../i18n';
import { act, useS } from '../store';

const PERCENT_STEPS = [1, 5, 20];
const CENT_STEPS = [10, 20, 50, 100];

export function PriceEditor({ id }: { id: string }) {
  const price = useS(s => stockPrice(s, id) * MODEL[id].seconds);
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const inputId = useId();
  const errorId = useId();
  const display = (Math.round(price * 100) / 100).toFixed(2).replace('.', li() === 0 ? ',' : '.');
  const reset = () => { setDraft(null); setInvalid(false); };

  const submit = (event: Event) => {
    event.preventDefault();
    if (draft === null) return;
    const text = draft.trim().replace(/^\$\s*|\s*zł$/gi, '');
    const cents = Math.round(Number(text.replace(',', '.')) * 100);
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(text) || !act(`price:${id}:set:${cents}`)) {
      setInvalid(true);
      return;
    }
    reset();
  };

  return (
    <div class="price-editor">
      <form class="price-form" onSubmit={submit}>
        <label for={inputId}>{t('price')}</label>
        <input id={inputId} type="text" inputMode="decimal" value={draft ?? display}
          aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined}
          onInput={event => { setDraft(event.currentTarget.value); setInvalid(false); }}
          onKeyDown={event => { if (event.key === 'Escape') reset(); }} />
        <button type="submit" disabled={draft === null}>{t('priceApply')}</button>
      </form>
      {invalid && <p id={errorId} class="hint bad" role="alert">{t('priceInvalid')}</p>}
      {([
        ['percent', PERCENT_STEPS, t('priceRelative')],
        ['delta', CENT_STEPS, t('priceFixed')],
      ] as const).map(([mode, steps, label]) => (
        <div class="price-adjustments" role="group" aria-label={label} key={mode}>
          {steps.map(step => {
            const amount = mode === 'percent' ? `${step}%` : step < 100 ? t('priceMinor', step) : t('priceMajor', step / 100);
            return (
              <div class="price-pair" key={step}>
                {([-1, 1] as const).map(direction => (
                  <button type="button" key={direction}
                    aria-label={t(direction < 0 ? 'priceDecrease' : 'priceIncrease', amount)}
                    onClick={() => { if (act(`price:${id}:${mode}:${direction * step}`)) reset(); }}>
                    {direction < 0 ? '−' : '+'}{amount}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
