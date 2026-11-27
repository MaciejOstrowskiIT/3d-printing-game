import { AUTOMATIONS, NODE } from '../../../content/tree';
import { has } from '../../../core/state';
import { act, useS } from '../../store';
import { li, t } from '../../i18n';
import { CardHead } from '../common';

export function Automation() {
  const list = useS(s => AUTOMATIONS.filter(id => has(s, id)).map(id => id + (s.amOn[id] ? '+' : '-')).join(','));
  if (!list) return null;
  return (
    <section class="card wide">
      <CardHead title={t('automation')} aside={t('amHint')} />
      <div class="am-list">
        {list.split(',').map(x => {
          const id = x.slice(0, -1), checked = x.endsWith('+');
          return (
            <label class="am" key={id}>
              <input type="checkbox" checked={checked} onChange={e => act(`am:${id}:${(e.currentTarget as HTMLInputElement).checked ? 1 : 0}`)} />
              <span><b>{NODE[id].n[li()]}</b><small>{NODE[id].d[li()]}</small></span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
