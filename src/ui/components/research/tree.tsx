import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { BRANCHES, NODE, prereqs, TREE, TREE_PAGES, type TreeNode } from '../../../content/tree';
import { nodeShown, nodeStatus, nodeZl } from '../../../systems/research';
import { has } from '../../../core/state';
import { fmt, li, money, prefs, reducedMotion, t } from '../../i18n';
import { act, game, ui, useS } from '../../store';
import { CardHead } from '../common';

export function costText(n: TreeNode) {
  const c = n.ops ? [t('cOps', fmt(n.ops))] : [];
  if (n.qp) c.push(t('cQp', fmt(n.qp)));
  if (n.zl) c.push(money(nodeZl(game.s, n)));
  if (n.wyd) c.push(t('cFig', fmt(n.wyd)));
  return c.join(' · ');
}

/** Everything a node depends on, transitively (alternatives included), plus the node itself. */
function pathOf(id: string): Set<string> {
  const out = new Set<string>();
  const walk = (x: string) => { if (out.has(x)) return; out.add(x); prereqs(NODE[x]).forEach(walk); };
  walk(id);
  return out;
}

interface NodeProps {
  n: TreeNode; hidden: boolean; col: number; row: number;
  /** Highlight state: this node is the focus, is on its prerequisite path, or something else is focused. */
  mark: 'focus' | 'path' | 'dim' | '';
  onFocusNode: (id: string | null) => void;
  onPin: (id: string) => void;
  onJump: (id: string) => void;
}

function Node({ n, hidden, col, row, mark, onFocusNode, onPin, onJump }: NodeProps) {
  const st = useS(s => nodeStatus(s, n));
  const needVal = useS(s => (n.need ? Math.floor(n.need.value(s)) : 0));
  const requirement = st === 'need' && n.need
    ? t('needs', n.need.label[li()], fmt(needVal), fmt(n.need.target))
    : '';
  // Prerequisites that live in another branch are not always on screen (other page, narrow layout): name them here.
  const links = st === 'done' ? [] : [...(n.req ?? []).map(id => ({ id, alt: false })), ...(n.reqAny ?? []).map(id => ({ id, alt: true }))]
    .filter(l => NODE[l.id].col !== n.col);
  const disabled = st !== 'ready' && st !== 'done';
  return (
    <div class={'ncell' + (hidden ? ' off' : '') + (mark ? ' ' + mark : '')} style={{ gridColumn: col + 1, gridRow: row }}
      tabIndex={disabled ? 0 : undefined} aria-label={disabled ? n.n[li()] : undefined}
      onPointerEnter={e => { if (e.pointerType === 'mouse') onFocusNode(n.id); }} onPointerLeave={e => { if (e.pointerType === 'mouse') onFocusNode(null); }}
      onFocusIn={() => onFocusNode(n.id)} onFocusOut={() => onFocusNode(null)} onClick={e => { if ((e as unknown as PointerEvent).pointerType !== 'mouse') onPin(n.id); }}>
      <button id={'n-' + n.id} class={'node ' + st} disabled={disabled} onClick={() => act(`t:${n.id}`)}>
        <b>{n.n[li()]}</b><small>{n.d[li()]}</small>
        <em class="rq">{requirement}</em>
        <em class="cs">{st === 'done' ? t('done') : costText(n)}</em>
      </button>
      {links.length > 0 && (
        <div class="rqlinks">
          {links.map(l => {
            const p = NODE[l.id];
            const text = t(l.alt ? 'rqAlt' : 'rqChip', p.n[li()], BRANCHES[p.col][li()][0]);
            const known = has(game.s, p.id) || nodeStatus(game.s, p) !== 'locked';
            return known
              ? <button key={l.id} type="button" class={'rqchip' + (l.alt ? ' alt' : '') + (has(game.s, p.id) ? ' met' : '')} aria-label={t('rqGo', p.n[li()])}
                  onClick={e => { e.stopPropagation(); onJump(p.id); }}>{text}</button>
              : <span key={l.id} class={'rqchip' + (l.alt ? ' alt' : '')}>{text}</span>;
          })}
        </div>
      )}
    </div>
  );
}

/** Connector lines between nodes, computed from DOM positions after every layout change. */
function useTreeLines(treeRef: { current: HTMLDivElement | null }, svgRef: { current: SVGSVGElement | null }, key: string, path: Set<string> | null) {
  const draw = () => {
    const tree = treeRef.current, svg = svgRef.current;
    if (!tree || !svg || !tree.offsetParent) return;
    const tr = tree.getBoundingClientRect();
    svg.setAttribute('width', String(tr.width));
    svg.setAttribute('height', String(tr.height));
    let h = '';
    for (const n of TREE) for (const r of [...(n.req ?? []), ...(n.reqAny ?? [])]) {
      if (n.col === 3 && r === 'replik') continue;
      const A = tree.querySelector<HTMLElement>('#n-' + r), B = tree.querySelector<HTMLElement>('#n-' + n.id);
      if (!A?.offsetParent || !B?.offsetParent) continue;
      const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - tr.left, y1 = a.bottom - tr.top, x2 = b.left + b.width / 2 - tr.left, y2 = b.top - tr.top, m = (y1 + y2) / 2;
      h += `<path class="${(A.classList.contains('done') ? 'on' : '') + (n.reqAny?.includes(r) ? ' alt' : '') + (path?.has(n.id) && path.has(r) ? ' hl' : '')}" d="M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}"/>`;
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

export function Tree() {
  const selectedBranch = useS(s => s.br);
  const doneKey = useS(s => s.done.join(','));
  const ready = useS(s => BRANCHES.map((_, c) => TREE.filter(n => n.col === c && nodeStatus(s, n) === 'ready').length).join(','));
  const counts = ready.split(',').map(Number);
  const allVisible = TREE.filter(n => nodeStatus(game.s, n) !== 'locked' && nodeShown(game.s, n));
  // Pages group branches (4 per page); a page shows up once one of its nodes is visible.
  const pages = TREE_PAGES.map((cols, i) => ({ i, cols: cols.filter(c => allVisible.some(n => n.col === c)) })).filter(p => p.cols.length);
  const page = pages.find(p => p.cols.includes(selectedBranch)) ?? pages[0];
  const branches = page?.cols ?? [];
  const visibleNodes = allVisible.filter(n => branches.includes(n.col));
  const br = branches.includes(selectedBranch) ? selectedBranch : branches[0];
  // Rows with nothing visible yet collapse, so the tree has no empty gaps (row 1 holds the branch headers).
  const rows = [...new Set(visibleNodes.map(n => n.row))].sort((a, b) => a - b);
  const treeRef = useRef<HTMLDivElement>(null), svgRef = useRef<SVGSVGElement>(null);
  // Highlight: hover or keyboard focus shows a node's whole prerequisite path; a tap pins it (touch has no hover).
  const [hover, setHover] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [jump, setJump] = useState<string | null>(null);
  const active = pin ?? hover;
  const path = active ? pathOf(active) : null;
  useTreeLines(treeRef, svgRef, doneKey + '|' + br + '|' + (page?.i ?? 0) + '|' + prefs.value.lang + '|' + (active ?? ''), path);
  const jumpTo = (id: string) => { ui(s => { s.br = NODE[id].col; }); setPin(id); setJump(id); };
  useEffect(() => {
    if (!jump) return;
    const el = document.getElementById('n-' + jump) as HTMLButtonElement | null;
    if (!el?.offsetParent) return;
    el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    (el.disabled ? el.parentElement : el)?.focus({ preventScroll: true });
    setJump(null);
  }, [jump, selectedBranch, doneKey]);
  return (
    <section class="card" style={{ marginTop: '14px' }}>
      <CardHead title={t('tree')} />
      <div class="legend">
        <span><i style={{ borderColor: 'var(--or)', background: 'var(--orS)' }} />{t('lgReady')}</span>
        <span><i style={{ borderColor: 'var(--acc)' }} />{t('lgAvail')}</span>
        <span><i style={{ borderColor: 'var(--line)', borderStyle: 'dashed' }} />{t('lgNeed')}</span>
        <span><i style={{ borderColor: 'var(--acc)', background: 'var(--accS)' }} />{t('lgDone')}</span>
        <span><i class="lg-alt" />{t('lgAlt')}</span>
      </div>
      <p class="hint tree-hint">{t('tHint')}</p>
      {pages.length > 1 && (
        <div class="tpages" role="tablist">
          {pages.map(p => {
            const n = p.cols.reduce((a, c) => a + counts[c], 0);
            return (
              <button key={p.i} role="tab" aria-selected={p.i === page.i} onClick={() => ui(s => { s.br = p.cols[0]; })}>
                {t((['tpMain', 'tpBack', 'tpQuantum'] as const)[p.i])}{n ? <span class="dot-in">{n}</span> : null}
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
        <div class="tree" ref={treeRef} style={{ '--branch-count': branches.length }} onKeyDown={e => { if (e.key === 'Escape') setPin(null); }}>
          <svg ref={svgRef} />
          {branches.map(i => (
            <div key={'h' + i} class={'bh' + (i !== br ? ' off' : '')} style={{ gridColumn: branches.indexOf(i) + 1, gridRow: 1 }}>
              {BRANCHES[i][li()][0]}<small>{BRANCHES[i][li()][1]}</small>
            </div>
          ))}
          {visibleNodes.map(n => <Node key={n.id} n={n} hidden={n.col !== br} col={branches.indexOf(n.col)} row={rows.indexOf(n.row) + 2}
            mark={!path ? '' : n.id === active ? 'focus' : path.has(n.id) ? 'path' : 'dim'}
            onFocusNode={setHover} onPin={id => setPin(p => (p === id ? null : id))} onJump={jumpTo} />)}
        </div>
      </div>
    </section>
  );
}
