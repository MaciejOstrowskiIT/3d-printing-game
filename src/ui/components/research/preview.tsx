import { useLayoutEffect, useRef } from 'preact/hooks';
import { TREE, type TreeNode } from '../../../content/tree';
import { freePts } from '../../../core/formulas';
import { nextResearch, nodeStatus, nodeZl } from '../../../systems/research';
import { fmt, li, money, t } from '../../i18n';
import { act, game, ui, useS } from '../../store';
import { Meter } from '../common';
import { costText } from './tree';

/** What is still missing for a node, in words: compute, money, the "need" condition or memory. */
function missingText(n: TreeNode, ops: number, zl: number, memoryShort: boolean) {
  if (memoryShort) return t('rpMem', fmt(n.ops));
  const parts: string[] = [];
  if (ops < 1) parts.push(t('cOps', fmt(Math.ceil(n.ops - game.s.ops))));
  if (zl < 1) parts.push(money(nodeZl(game.s, n) - game.s.zl));
  return parts.length ? t('rpMissing', parts.join(' · ')) : '';
}

/** The next few research nodes, shown in the Workshop so progression is visible without opening the tree. */
export function ResearchPreview() {
  const v = useS(s => {
    const picks = nextResearch(s, 3);
    return {
      key: picks.map(p => `${p.node.id}:${p.status}:${p.ops.toFixed(2)}:${p.zl.toFixed(2)}:${p.need.toFixed(2)}:${p.memoryShort}`).join('|'),
      picks, fp: freePts(s), ready: TREE.filter(n => nodeStatus(s, n) === 'ready').length,
    };
  });
  // Keep surviving suggestions in their previous slots as affordability changes.
  const previousSlots = useRef<string[]>([]);
  const remaining = [...v.picks];
  const slots = Array.from({ length: v.picks.length }, (_, index) => {
    const retained = remaining.findIndex(pick => pick.node.id === previousSlots.current[index]);
    return retained < 0 ? undefined : remaining.splice(retained, 1)[0];
  });
  const picks = slots.map(pick => pick ?? remaining.shift()!);
  useLayoutEffect(() => { previousSlots.current = picks.map(pick => pick.node.id); });

  if (!picks.length && v.fp < 1) return null;
  return (
    <section class="card wide rprev">
      <div class="head rp-head">
        <h2>{t('rpTitle')}<span class="rp-badge" aria-hidden={!v.ready}>{t('rpReady', v.ready)}</span></h2>
        <button class="rp-all" onClick={() => ui(s => { s.tab = 'r'; })}>{t('rpAll')} →</button>
      </div>
      <div class="rp-points">
        <span>{t('rpPoints', fmt(v.fp))}</span>
        <span class="pts"><button disabled={v.fp < 1} onClick={() => act('proc1')}>{t('rpProc')}</button><button disabled={v.fp < 1} onClick={() => act('mem1')}>{t('rpMemBtn')}</button></span>
      </div>
      <div class="rp-list">
      {picks.map(({ node: n, status, ops, zl, need, memoryShort }) => {
        const val = n.need ? Math.floor(n.need.value(game.s)) : 0;
        const info = status === 'ready' ? costText(n)
          : status === 'need' && n.need ? t('needs', n.need.label[li()], fmt(val), fmt(n.need.target))
          : missingText(n, ops, zl, memoryShort);
        const pct = 100 * (status === 'need' ? need : Math.min(ops, zl));
        return (
          <div key={n.id} class={'rp-row ' + status}>
            <div class="it">
              <b>{n.n[li()]}</b>
              <small>{n.d[li()]}</small>
              <Meter pct={status === 'ready' ? 100 : pct} />
              <small class={'rp-info' + (memoryShort ? ' bad' : '')}>{info}</small>
            </div>
            {status === 'ready'
              ? <button class="buy ok" onClick={() => act(`t:${n.id}`)}>{t('rpBuy')}</button>
              : <span class="rp-pct">{Math.floor(pct)}%</span>}
          </div>
        );
      })}
      </div>
    </section>
  );
}
