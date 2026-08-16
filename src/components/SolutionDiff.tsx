import React, { useMemo, useState } from 'react';
import { GitCompare, ChevronUp } from 'lucide-react';

interface SolutionDiffProps {
  /** Context line above the diff. The default speaks for the playground's passing
   *  case; BugHunt overrides it — its learner code may still be the buggy one. */
  caption?: React.ReactNode;
  /** The attempt that just passed the tests. */
  learnerCode: string;
  /** The reference it is measured against. */
  solutionCode: string;
}

/**
 * Passing the tests proves the solution is CORRECT; it says nothing about whether it
 * is the solution you would want to produce on a whiteboard. Once the green banner is
 * up, this offers a line-level look at what the reference does differently — the point
 * is not "yours is wrong" but "here is a tighter phrasing you might steal".
 */

type DiffKind = 'same' | 'yours' | 'reference';
interface DiffOp {
  kind: DiffKind;
  text: string;
}

/**
 * Longest-common-subsequence over lines — the textbook diff. Both inputs are
 * solution-sized (tens of lines), so the O(n·m) table is a few thousand cells and
 * costs microseconds; nothing fancier is warranted. Suffix formulation (lcs[i][j] =
 * LCS of a[i..] vs b[j..]) so the walk that emits ops runs forward, in display order.
 */
const diffLines = (a: string[], b: string[]): DiffOp[] => {
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: 'same', text: a[i] });
      i++; j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      // Ties go to the learner's line first so their code reads contiguously.
      ops.push({ kind: 'yours', text: a[i] });
      i++;
    } else {
      ops.push({ kind: 'reference', text: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ kind: 'yours', text: a[i++] });
  while (j < m) ops.push({ kind: 'reference', text: b[j++] });
  return ops;
};

/** Trailing whitespace and trailing blank lines are editor noise, not differences. */
const toLines = (code: string): string[] => {
  const lines = code.split('\n').map(l => l.replace(/\s+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
};

const ROW_STYLE: Record<DiffKind, { bg: string; border: string; marker: string; color: string }> = {
  same:      { bg: 'transparent',               border: 'transparent',        marker: ' ', color: 'hsl(var(--text-muted))' },
  yours:     { bg: 'hsl(var(--easy) / 0.1)',    border: 'hsl(var(--easy))',   marker: '+', color: 'hsl(var(--text-primary))' },
  // --primary is the app's violet; the reference reads as "the house's voice".
  reference: { bg: 'hsl(var(--primary) / 0.12)', border: 'hsl(var(--primary))', marker: '−', color: 'hsl(var(--text-primary))' },
};

export const SolutionDiff: React.FC<SolutionDiffProps> = ({
  learnerCode,
  solutionCode,
  caption = 'Both are correct — the tests said so. Read the violet lines for phrasings worth adopting; different is not wrong.',
}) => {
  const [open, setOpen] = useState(false);

  const ops = useMemo(
    () => diffLines(toLines(learnerCode), toLines(solutionCode)),
    [learnerCode, solutionCode],
  );
  const identical = ops.every(op => op.kind === 'same');

  if (!open) {
    return (
      <div>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
          onClick={() => setOpen(true)}
        >
          <GitCompare size={13} />
          <span>Compare with the reference</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="animate-in"
      style={{
        border: '1px solid hsl(var(--border-color))',
        borderRadius: '10px',
        background: 'hsl(var(--bg-secondary) / 0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        padding: '0.9rem 1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <GitCompare size={15} color="hsl(var(--secondary))" />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, flex: 1, minWidth: '140px' }}>
          Yours vs the reference
        </span>
        <span style={{ fontSize: '0.68rem', color: 'hsl(var(--easy))', whiteSpace: 'nowrap' }}>+ only in yours</span>
        <span style={{ fontSize: '0.68rem', color: 'hsl(var(--primary))', whiteSpace: 'nowrap' }}>− only in the reference</span>
        <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>shared lines dimmed</span>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}
          onClick={() => setOpen(false)}
        >
          <ChevronUp size={12} />
          <span>Hide</span>
        </button>
      </div>

      {identical ? (
        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--easy))', fontWeight: 600 }}>
          Line for line, your solution matches the reference. Nothing to steal — this one is yours.
        </p>
      ) : (
        <>
          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
            {caption}
          </p>
          <div
            style={{
              borderRadius: '8px',
              background: 'hsl(var(--bg-tertiary))',
              border: '1px solid hsl(var(--border-color))',
              overflowX: 'auto',
              padding: '0.5rem 0',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              lineHeight: 1.55,
            }}
          >
            {ops.map((op, idx) => {
              const s = ROW_STYLE[op.kind];
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '0.6rem',
                    padding: '0.05rem 0.75rem',
                    background: s.bg,
                    borderLeft: `3px solid ${s.border}`,
                  }}
                >
                  {/* The tint carries the meaning; the marker is a bonus for anyone
                      who can't tell the tints apart. Hidden from screen readers —
                      "+ minus plus" read aloud per line is noise, not information. */}
                  <span aria-hidden="true" style={{ width: '1ch', flexShrink: 0, color: s.border === 'transparent' ? 'transparent' : s.border }}>
                    {s.marker}
                  </span>
                  <span style={{ whiteSpace: 'pre', color: s.color }}>{op.text || ' '}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
