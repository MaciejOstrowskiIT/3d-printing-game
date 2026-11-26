import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { BRANCHES, TREE, TREE_PAGES, type TreeNode } from '../../content/tree';
import { freePts, opsCap, opsRate, repNext, repPrev } from '../../core/formulas';
import { nextResearch, nodeStatus, nodeZl } from '../../systems/research';
import { fmt, li, money, prefs, t } from '../i18n';
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
  if (!v.picks.length && v.fp < 1) return null;
  return (
    <section class="card wide rprev">
      <div class="head rp-head">
        <h2>{t('rpTitle')}{v.ready ? <span class="rp-badge">{t('rpReady', v.ready)}</span> : null}</h2>
        <button class="rp-all" onClick={() => ui(s => { s.tab = 'r'; })}>{t('rpAll')} →</button>
      </div>
      {v.fp >= 1 && (
        <div class="rp-points">
          <span>{t('rpPoints', fmt(v.fp))}</span>
          <span class="pts"><button onClick={() => act('proc1')}>{t('rpProc')}</button><button onClick={() => act('mem1')}>{t('rpMemBtn')}</button></span>
        </div>
      )}
      <div class="rp-list">
      {v.picks.map(({ node: n, status, ops, zl, need, memoryShort }) => {
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
              {status !== 'ready' && <Meter pct={pct} />}
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

function costText(n: TreeNode) {
  const c = [t('cOps', fmt(n.ops))];
  if (n.zl) c.push(money(nodeZl(game.s, n)));
  if (n.wyd) c.push(t('cFig', fmt(n.wyd)));
  return c.join(' · ');
}

function Node({ n, hidden, col, row }: { n: TreeNode; hidden: boolean; col: number; row: number }) {
  const st = useS(s => nodeStatus(s, n));
  const needVal = useS(s => (n.need ? Math.floor(n.need.value(s)) : 0));
  const requirement = st === 'need' && n.need
    ? t('needs', n.need.label[li()], fmt(needVal), fmt(n.need.target))
    : '';
  return (
    <button id={'n-' + n.id} class={'node ' + st + (hidden ? ' off' : '')} style={{ gridColumn: col + 1, gridRow: row }}
      disabled={st !== 'ready' && st !== 'done'} onClick={() => act(`t:${n.id}`)}>
      <b>{n.n[li()]}</b><small>{n.d[li()]}</small>
      <em class="rq">{requirement}</em>
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
  const selectedBranch = useS(s => s.br);
  const doneKey = useS(s => s.done.join(','));
  const ready = useS(s => BRANCHES.map((_, c) => TREE.filter(n => n.col === c && nodeStatus(s, n) === 'ready').length).join(','));
  const counts = ready.split(',').map(Number);
  const allVisible = TREE.filter(n => nodeStatus(game.s, n) !== 'locked');
  // Pages group branches (4 per page); a page shows up once one of its nodes is visible.
  const pages = TREE_PAGES.map((cols, i) => ({ i, cols: cols.filter(c => allVisible.some(n => n.col === c)) })).filter(p => p.cols.length);
  const page = pages.find(p => p.cols.includes(selectedBranch)) ?? pages[0];
  const branches = page?.cols ?? [];
  const visibleNodes = allVisible.filter(n => branches.includes(n.col));
  const br = branches.includes(selectedBranch) ? selectedBranch : branches[0];
  // Rows with nothing visible yet collapse, so the tree has no empty gaps (row 1 holds the branch headers).
  const rows = [...new Set(visibleNodes.map(n => n.row))].sort((a, b) => a - b);
  const treeRef = useRef<HTMLDivElement>(null), svgRef = useRef<SVGSVGElement>(null);
  useTreeLines(treeRef, svgRef, doneKey + '|' + br + '|' + (page?.i ?? 0) + '|' + prefs.value.lang);
  return (
    <section class="card" style={{ marginTop: '14px' }}>
      <CardHead title={t('tree')} />
      <div class="legend">
        <span><i style={{ borderColor: 'var(--or)', background: 'var(--orS)' }} />{t('lgReady')}</span>
        <span><i style={{ borderColor: 'var(--acc)' }} />{t('lgAvail')}</span>
        <span><i style={{ borderColor: 'var(--line)', borderStyle: 'dashed' }} />{t('lgNeed')}</span>
        <span><i style={{ borderColor: 'var(--acc)', background: 'var(--accS)' }} />{t('lgDone')}</span>
      </div>
      {pages.length > 1 && (
        <div class="tpages" role="tablist">
          {pages.map(p => {
            const n = p.cols.reduce((a, c) => a + counts[c], 0);
            return (
              <button key={p.i} role="tab" aria-selected={p.i === page.i} onClick={() => ui(s => { s.br = p.cols[0]; })}>
                {t(p.i === 0 ? 'tpMain' : 'tpBack')}{n ? <span class="dot-in">{n}</span> : null}
              </button>
            );
          })}
        </div>
      )}
      <div class="brsel">
        {branches.map(i => (
          <button key={i} aria-pressed={i === br} onClick={() => ui(s => { s.br = i; })}>{BRANCHES[i][li()][0]}{counts[i] ? ` (${counts[i]})` : ''}</button>
        ))}
      </div>
      <div class="tscroll">
        <div class="tree" ref={treeRef} style={{ '--branch-count': branches.length }}>
          <svg ref={svgRef} />
          {branches.map(i => (
            <div key={'h' + i} class={'bh' + (i !== br ? ' off' : '')} style={{ gridColumn: branches.indexOf(i) + 1, gridRow: 1 }}>
              {BRANCHES[i][li()][0]}<small>{BRANCHES[i][li()][1]}</small>
            </div>
          ))}
          {visibleNodes.map(n => <Node key={n.id} n={n} hidden={n.col !== br} col={branches.indexOf(n.col)} row={rows.indexOf(n.row) + 2} />)}
        </div>
      </div>
    </section>
  );
}

export function Research() {
  return (<div><Computer /><PatentsCard /><Tree /><AchievementsCard /></div>);
}
