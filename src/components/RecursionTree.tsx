import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, GitBranch } from 'lucide-react';

/**
 * Recursion call tree — rebuilt from the guided trace's call-stack snapshots.
 *
 * Lands at: src/components/RecursionTree.tsx
 *
 * The stack column in the guided player shows one path at a time; what it can
 * never show is the SHAPE of the recursion — how many branches, how deep, where
 * backtracking happens. This reconstructs the full call tree from the push/pop
 * sequence across steps and lights up the path that is on the stack right now,
 * so "the recursion tree" stops being a phrase and becomes a picture.
 */

interface CallNode {
  id: number;
  label: string;
  parent: number;
  children: number[];
  /** Step index at which this frame was first pushed. */
  createdAt: number;
  depth: number;
  /** Leaf-slot x (assigned by layout), in leaf-index units. */
  x: number;
}

interface RecursionTreeProps {
  trace: any[];
  currentStep: number;
}

interface BuiltTree {
  nodes: CallNode[];
  /** Active node-id path (root included) per trace step, carried forward across
   *  steps that have no stack of their own. */
  pathPerStep: number[][];
  distinctStates: number;
  maxDepth: number;
  leafCount: number;
}

const buildTree = (trace: any[]): BuiltTree => {
  // Only 'call stack' snapshots are recursion frames — monotonic stacks, queues
  // and "current path" accumulators use the same visual but are not call trees.
  const stacks: (string[] | null)[] = trace.map(s =>
    s && s.stackLabel === 'call stack' && Array.isArray(s.stack) ? s.stack.map(String) : null,
  );
  const distinctStates = new Set(
    stacks.filter((s): s is string[] => s !== null).map(s => JSON.stringify(s)),
  ).size;

  const nodes: CallNode[] = [
    { id: 0, label: 'start', parent: -1, children: [], createdAt: 0, depth: 0, x: 0 },
  ];
  // path[0] is the synthetic root; path[d+1] is the node for stack depth d.
  let path: number[] = [0];
  const pathPerStep: number[][] = [];

  stacks.forEach((stack, si) => {
    if (stack) {
      // Longest prefix where the snapshot agrees with the current path is kept;
      // everything past it was popped. A pop-then-repush of an IDENTICAL label
      // between two snapshots would merge into one node — traces record every
      // intermediate state, so in practice the shrink step is always visible.
      let d = 0;
      while (d < stack.length && d + 1 < path.length && nodes[path[d + 1]].label === stack[d]) d++;
      path = path.slice(0, d + 1);
      for (; d < stack.length; d++) {
        const parentId = path[path.length - 1];
        const node: CallNode = {
          id: nodes.length, label: stack[d], parent: parentId,
          children: [], createdAt: si, depth: d + 1, x: 0,
        };
        nodes.push(node);
        nodes[parentId].children.push(node.id);
        path.push(node.id);
      }
    }
    // Steps without a stack (e.g. a result row being emitted) keep the last known
    // path so the highlight never flickers off mid-walk.
    pathPerStep.push([...path]);
  });

  // Tidy layout: leaves get consecutive slots, parents center over their children.
  let nextLeaf = 0;
  const assignX = (id: number) => {
    const node = nodes[id];
    if (node.children.length === 0) {
      node.x = nextLeaf++;
      return;
    }
    node.children.forEach(assignX);
    const first = nodes[node.children[0]].x;
    const last = nodes[node.children[node.children.length - 1]].x;
    node.x = (first + last) / 2;
  };
  assignX(0);

  const maxDepth = Math.max(...nodes.map(nd => nd.depth));
  return { nodes, pathPerStep, distinctStates, maxDepth, leafCount: Math.max(nextLeaf, 1) };
};

const LEVEL_H = 54;

export const RecursionTree: React.FC<RecursionTreeProps> = ({ trace, currentStep }) => {
  const [open, setOpen] = useState(false);
  const built = useMemo(() => buildTree(trace), [trace]);

  // A new question's trace arrives through props (the simulator stays mounted),
  // so collapse again rather than greeting the next problem pre-expanded.
  useEffect(() => { setOpen(false); }, [trace]);

  // Fewer than 6 distinct stack states means the recursion is too shallow for a
  // tree to say anything the stack column doesn't already — render nothing.
  if (built.distinctStates < 6) return null;

  const { nodes, pathPerStep, maxDepth, leafCount } = built;
  const step = Math.min(Math.max(currentStep, 0), pathPerStep.length - 1);
  const activePath = new Set(pathPerStep[step] ?? [0]);
  const activeIds = pathPerStep[step] ?? [0];
  const topId = activeIds.length > 1 ? activeIds[activeIds.length - 1] : -1;

  // One column width fits the widest label; ~6.5px/char at font-size 10 mono.
  const maxLabel = Math.max(...nodes.map(nd => nd.label.length));
  const nodeW = Math.min(Math.max(maxLabel * 6.5 + 14, 44), 120);
  const colW = nodeW + 16;
  const nodeH = 22;
  const width = leafCount * colW;
  const height = (maxDepth + 1) * LEVEL_H + nodeH;

  const cx = (nd: CallNode) => nd.x * colW + colW / 2;
  const cy = (nd: CallNode) => nd.depth * LEVEL_H + nodeH / 2 + 8;

  return (
    <div style={{ borderTop: '1px solid hsl(var(--border-color))' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.85rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
          color: 'hsl(var(--text-primary))', fontSize: '0.8rem', fontWeight: 700,
          fontFamily: 'var(--font-sans)', textAlign: 'left',
        }}
      >
        <GitBranch size={14} color="hsl(var(--primary))" />
        <span style={{ flex: 1 }}>Call tree — how this recursion actually branches</span>
        <ChevronDown
          size={15}
          color="hsl(var(--text-muted))"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }}
        />
      </button>

      {open && (
        <div className="animate-fade" style={{ padding: '0 1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ overflowX: 'auto', border: '1px solid hsl(var(--border-color))', borderRadius: '10px', background: 'hsl(var(--bg-secondary) / 0.3)', padding: '0.5rem' }}>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`Recursion call tree with ${nodes.length - 1} calls, ${maxDepth} levels deep. Step ${step + 1}: ${activeIds.length - 1} frame${activeIds.length - 1 === 1 ? '' : 's'} on the stack.`}
              style={{ display: 'block', margin: '0 auto' }}
            >
              {/* Edges first so nodes draw over them */}
              {nodes.map(nd =>
                nd.children.map(cid => {
                  const child = nodes[cid];
                  const future = child.createdAt > step;
                  const onPath = activePath.has(nd.id) && activePath.has(cid);
                  return (
                    <line
                      key={`${nd.id}-${cid}`}
                      x1={cx(nd)} y1={cy(nd) + nodeH / 2}
                      x2={cx(child)} y2={cy(child) - nodeH / 2}
                      stroke={onPath ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}
                      strokeWidth={onPath ? 2.5 : 1.2}
                      opacity={future ? 0.15 : 1}
                    />
                  );
                }),
              )}
              {nodes.map(nd => {
                const isRoot = nd.id === 0;
                const future = nd.createdAt > step && !isRoot;
                const onPath = activePath.has(nd.id);
                const isTop = nd.id === topId;
                const w = isRoot ? 40 : nodeW;
                return (
                  <g key={nd.id} opacity={future ? 0.15 : 1}>
                    <rect
                      x={cx(nd) - w / 2}
                      y={cy(nd) - nodeH / 2}
                      width={w}
                      height={nodeH}
                      rx={6}
                      fill={isTop ? 'hsl(var(--secondary-glow))' : onPath && !isRoot ? 'hsl(var(--primary-glow))' : 'hsl(var(--bg-tertiary))'}
                      stroke={isTop ? 'hsl(var(--secondary))' : onPath && !isRoot ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}
                      strokeWidth={isTop ? 2 : onPath && !isRoot ? 1.6 : 1}
                      strokeDasharray={!onPath && !future && !isRoot ? '3 3' : undefined}
                    />
                    <text
                      x={cx(nd)}
                      y={cy(nd) + 3.5}
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontWeight={isTop ? 700 : 500}
                      fill={isTop ? 'hsl(var(--secondary))' : isRoot ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))'}
                    >
                      {nd.label}
                      <title>{isRoot ? 'program entry' : `${nd.label} — first entered at step ${nd.createdAt + 1}`}</title>
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
            Solid outline = frames on the call stack right now (cyan = the executing
            frame) · dashed = calls that already returned · faint = not reached yet.
            Step through the player and watch the path descend and backtrack.
          </p>
        </div>
      )}
    </div>
  );
};
