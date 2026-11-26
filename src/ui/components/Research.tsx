import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { BRANCHES, TREE, type TreeNode } from '../../content/tree';
import { freePts, opsCap, opsRate, repNext, repPrev } from '../../core/formulas';
import { has } from '../../core/state';
import { nodeStatus, nodeZl } from '../../systems/research';
import { fmt, li, money, nodeName, prefs, t } from '../i18n';
import { act, game, ui, useS } from '../store';
import { AchievementsCard } from './Achievements';
import { PatentsCard } from './Prestige';
import { CardHead, Meter } from './common';

function Computer() {
  const v = useS(s => ({
    fp: freePts(s), proc: s.proc, mem: s.mem, ops: s.ops, cap: opsCap(s), rate: opsRate(s), next: repNext(s),
    repPct: Math.min(100, (100 * (s.total - repPrev(s))) / (repNext(s) - repPrev(s))),
  }));
  const noPts = v.fp < 1;
  return (
    <section class="card">
      <CardHead title={t('computer')} aside={t('opsRate', fmt(v.rate))} />
      <div class="comp">
        <div class="cell"><small>{t('freePts')}</small><div class="cv"><b>{fmt(v.fp)}</b></div><Meter pct={v.repPct} /></div>
        <div class="cell"><small>{t('procs')}</small><div class="cv"><b>{fmt(v.proc)}</b><span class="pts">
          <button disabled={noPts} onClick={() => act('proc1')}>+1</button><button disabled={noPts} onClick={() => act('procmax')}>{t('all')}</button></span></div></div>
        <div class="cell"><small>{t('mem')}</small><div class="cv"><b>{fmt(v.mem)}</b><span class="pts">
          <button disabled={noPts} onClick={() => act('mem1')}>+1</button><button disabled={noPts} onClick={() => act('memmax')}>{t('all')}</button></span></div></div>
        <div class="cell"><small>{t('compute')}</small><div class="cv"><b>{fmt(Math.floor(v.ops))} / {fmt(v.cap)}</b></div><Meter pct={(100 * v.ops) / v.cap} /></div>
      </div>
      <p class="hint">{t('repNext', fmt(v.next))}</p>
    </section>
  );
}

function costText(n: TreeNode) {
  const c = [t('cOps', fmt(n.ops))];
  if (n.zl) c.push(money(nodeZl(game.s, n)));
  if (n.wyd) c.push(t('cFig', fmt(n.wyd)));
  return c.join(' · ');
}

function Node({ n, hidden }: { n: TreeNode; hidden: boolean }) {
  const st = useS(s => nodeStatus(s, n));
  const needVal = useS(s => (n.need ? Math.floor(n.need.value(s)) : 0));
  const missing = useS(s => (n.req ?? []).filter(r => !has(s, r)).join(','));
  const liftoff = useS(s => has(s, 'replik'));
  let rq = '';
  if (st === 'locked') rq = n.col === 3 && !liftoff ? t('firstSpace') : t('first', missing.split(',').map(nodeName).join(', '));
  else if (st === 'need' && n.need) rq = t('needs', n.need.label[li()], fmt(needVal), fmt(n.need.target));
  return (
    <button id={'n-' + n.id} class={'node ' + st + (hidden ? ' off' : '')} style={{ gridColumn: n.col + 1, gridRow: n.row + 1 }}
      disabled={st !== 'ready' && st !== 'done'} onClick={() => act(`t:${n.id}`)}>
      <b>{n.n[li()]}</b><small>{n.d[li()]}</small>
      <em class="rq">{rq}</em>
      <em class="cs">{st === 'done' ? t('done') : costText(n)}</em>
    </button>
  );
}

/** Connector lines between nodes, computed from DOM positions after every layout change. */
function useTreeLines(treeRef: { current: HTMLDivElement | null }, svgRef: { current: SVGSVGElement | null }, key: string) {
  const draw = () => {
    const tree = treeRef.current, svg = svgRef.current;
    if (!tree || !svg || !tree.offsetParent) return;
    const tr = tree.getBoundingClientRect();
    svg.setAttribute('width', String(tr.width));
    svg.setAttribute('height', String(tr.height));
    let h = '';
    for (const n of TREE) for (const r of n.req ?? []) {
      if (n.col === 3 && r === 'replik') continue;
      const A = tree.querySelector<HTMLElement>('#n-' + r), B = tree.querySelector<HTMLElement>('#n-' + n.id);
      if (!A?.offsetParent || !B?.offsetParent) continue;
      const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - tr.left, y1 = a.bottom - tr.top, x2 = b.left + b.width / 2 - tr.left, y2 = b.top - tr.top, m = (y1 + y2) / 2;
      h += `<path class="${A.classList.contains('done') ? 'on' : ''}" d="M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}"/>`;
    }
    svg.innerHTML = h;
  };
  useLayoutEffect(draw, [key]);
  useEffect(() => {
    const ro = new ResizeObserver(draw);
    if (treeRef.current) ro.observe(treeRef.current);
    return () => ro.disconnect();
  }, []);
}

function Tree() {
  const br = useS(s => s.br);
  const doneKey = useS(s => s.done.join(','));
  const ready = useS(s => [0, 1, 2, 3].map(c => TREE.filter(n => n.col === c && nodeStatus(s, n) === 'ready').length).join(','));
  const counts = ready.split(',').map(Number);
  const treeRef = useRef<HTMLDivElement>(null), svgRef = useRef<SVGSVGElement>(null);
  useTreeLines(treeRef, svgRef, doneKey + '|' + br + '|' + prefs.value.lang);
  return (
    <section class="card" style={{ marginTop: '14px' }}>
      <CardHead title={t('tree')} />
      <div class="legend">
        <span><i style={{ borderColor: 'var(--or)', background: 'var(--orS)' }} />{t('lgReady')}</span>
        <span><i style={{ borderColor: 'var(--acc)' }} />{t('lgAvail')}</span>
        <span><i style={{ borderColor: 'var(--line)', borderStyle: 'dashed' }} />{t('lgNeed')}</span>
        <span><i style={{ borderColor: 'var(--acc)', background: 'var(--accS)' }} />{t('lgDone')}</span>
      </div>
      <div class="brsel">
        {BRANCHES.map((b, i) => (
          <button key={i} aria-pressed={i === br} onClick={() => ui(s => { s.br = i; })}>{b[li()][0]}{counts[i] ? ` (${counts[i]})` : ''}</button>
        ))}
      </div>
      <div class="tscroll">
        <div class="tree" ref={treeRef}>
          <svg ref={svgRef} />
          {BRANCHES.map((b, i) => (
            <div key={'h' + i} class={'bh' + (i !== br ? ' off' : '')} style={{ gridColumn: i + 1, gridRow: 1 }}>
              {b[li()][0]}<small>{b[li()][1]}</small>
            </div>
          ))}
          {TREE.map(n => <Node key={n.id} n={n} hidden={n.col !== br} />)}
        </div>
      </div>
    </section>
  );
}

export function Research() {
  return (<div><Computer /><PatentsCard /><Tree /><AchievementsCard /></div>);
}
