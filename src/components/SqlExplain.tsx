import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { runQuery, type SqlRunResult, type SqlTable } from '../utils/sqlRunner';

/**
 * "How SQLite ran it" — EXPLAIN QUERY PLAN for the learner's own query.
 *
 * Lands at: src/components/SqlExplain.tsx
 *
 * Getting the rows right is half of SQL; knowing WHAT the engine did to get them
 * is the half interviewers probe ("would this scan the whole table?"). After a
 * successful SELECT this offers the real SQLite plan, indented the way the engine
 * nests it, with the one distinction that matters spelled out: SCAN vs SEARCH.
 */

interface PlanRow {
  id: number;
  parent: number;
  detail: string;
}

// sql.js emits plan columns as [id, parent, notused, detail]; resolve by name with a
// positional fallback so a header rename upstream degrades instead of crashing.
// Module-level so the learner's plan and the reference plan parse identically.
const mapPlanRows = (res: SqlRunResult): PlanRow[] => {
  const idIdx = Math.max(res.headers.indexOf('id'), 0);
  const parentIdx = res.headers.indexOf('parent') >= 0 ? res.headers.indexOf('parent') : 1;
  const detailIdx = res.headers.indexOf('detail') >= 0 ? res.headers.indexOf('detail') : res.headers.length - 1;
  return res.rows.map(r => ({
    id: Number(r[idIdx]),
    parent: Number(r[parentIdx]),
    detail: String(r[detailIdx] ?? ''),
  }));
};

// SELECT (or a CTE that ends in one) only: EXPLAIN on a DELETE/UPDATE would run
// against a fresh throwaway database anyway, and the plan of a mutation teaches
// nothing this page is about. Leading comments/whitespace are skipped because the
// starter template begins with a `--` line.
const SELECT_RE = /^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*(?:select|with)\b/i;

/** Exported so the mount site can share the exact same definition of "a SELECT". */
export const isSelectQuery = (query: string) => SELECT_RE.test(query);

interface SqlExplainProps {
  query: string;
  tables: SqlTable[];
  /** The verified solution's SQL. When provided (and different from the learner's
   *  text), the details pane shows the two EXPLAIN QUERY PLANs side by side. */
  referenceQuery?: string;
}

export const SqlExplain: React.FC<SqlExplainProps> = ({ query, tables, referenceQuery }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PlanRow[] | null>(null);
  // The reference solution's plan. null while unfetched, on fetch failure, or when no
  // referenceQuery was supplied — every null path falls back to the single-column view.
  const [refRows, setRefRows] = useState<PlanRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Monotonic run id: a slow EXPLAIN finishing after the query changed must not
  // paint a plan for text that is no longer in the editor.
  const runIdRef = useRef(0);

  // Any edit invalidates the plan we computed — close and forget rather than
  // showing a plan that no longer matches the visible query.
  useEffect(() => {
    runIdRef.current += 1;
    setOpen(false);
    setRows(null);
    setRefRows(null);
    setError(null);
    setLoading(false);
  }, [query, tables, referenceQuery]);

  if (!isSelectQuery(query)) return null;

  const fetchPlan = async () => {
    const runId = ++runIdRef.current;
    setLoading(true);
    setError(null);
    // EXPLAIN QUERY PLAN never executes the query — it only asks the planner, so
    // re-running it on open is cheap and side-effect free.
    const res = await runQuery(`EXPLAIN QUERY PLAN ${query}`, tables);
    if (runId !== runIdRef.current) return;
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'SQLite could not explain this query.');
      return;
    }
    setRows(mapPlanRows(res));
    // The reference plan rides along in the same fetch cycle. A failure here is
    // swallowed (refRows stays null, so the single-column view renders): the
    // comparison is a bonus, and a reference written in MySQL-only syntax must
    // not take the learner's own plan down with it.
    if (referenceQuery?.trim() && referenceQuery.trim() !== query.trim()) {
      const ref = await runQuery(`EXPLAIN QUERY PLAN ${referenceQuery}`, tables);
      if (runId !== runIdRef.current) return;
      if (ref.ok) setRefRows(mapPlanRows(ref));
    }
  };

  // Same traversal as renderTree, but yielding plain {detail, depth} lines — the
  // side-by-side comparison needs data it can index and compare, not ReactNodes.
  const flattenTree = (all: PlanRow[]): { detail: string; depth: number }[] => {
    const ids = new Set(all.map(r => r.id));
    const roots = all.filter(r => !ids.has(r.parent));
    const out: { detail: string; depth: number }[] = [];
    const emit = (row: PlanRow, depth: number, seen: Set<number>) => {
      if (seen.has(row.id)) return; // defensive: a malformed plan must not loop forever
      seen.add(row.id);
      out.push({ detail: row.detail, depth });
      all.filter(r => r.parent === row.id && r.id !== row.id).forEach(c => emit(c, depth + 1, seen));
    };
    const seen = new Set<number>();
    roots.forEach(r => emit(r, 0, seen));
    return out;
  };

  const renderTree = (all: PlanRow[]) => {
    const ids = new Set(all.map(r => r.id));
    // Roots are rows whose parent is not itself a plan node (SQLite uses 0).
    const roots = all.filter(r => !ids.has(r.parent));
    const lines: React.ReactNode[] = [];
    const emit = (row: PlanRow, depth: number, seen: Set<number>) => {
      if (seen.has(row.id)) return; // defensive: a malformed plan must not loop forever
      seen.add(row.id);
      const op = row.detail.startsWith('SCAN') ? 'scan' : row.detail.startsWith('SEARCH') ? 'search' : 'other';
      lines.push(
        <div
          key={row.id}
          style={{
            paddingLeft: `${depth * 16}px`, fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem', lineHeight: 1.9, whiteSpace: 'nowrap',
            color: op === 'scan' ? 'hsl(var(--medium))' : op === 'search' ? 'hsl(var(--easy))' : 'hsl(var(--text-secondary))',
          }}
        >
          {depth > 0 ? '└ ' : ''}{row.detail}
        </div>,
      );
      all.filter(r => r.parent === row.id && r.id !== row.id).forEach(c => emit(c, depth + 1, seen));
    };
    const seen = new Set<number>();
    roots.forEach(r => emit(r, 0, seen));
    return lines;
  };

  return (
    <details
      open={open}
      onToggle={e => {
        const isOpen = (e.currentTarget as HTMLDetailsElement).open;
        setOpen(isOpen);
        if (isOpen && rows === null && !loading) void fetchPlan();
      }}
      style={{
        border: '1px solid hsl(var(--border-color))', borderRadius: '10px',
        background: 'hsl(var(--bg-secondary) / 0.3)',
      }}
    >
      <summary
        style={{
          cursor: 'pointer', padding: '0.6rem 1rem', fontSize: '0.78rem',
          fontWeight: 700, color: 'hsl(var(--text-secondary))', userSelect: 'none',
        }}
      >
        How SQLite ran it
      </summary>
      <div style={{ padding: '0.25rem 1rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {loading && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            <Loader2 size={12} className="spin" /> Asking the planner…
          </span>
        )}
        {error && (
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            SQLite could not explain this query: {error}
          </span>
        )}
        {rows && rows.length === 0 && (
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            The planner returned an empty plan — nothing to show for this query.
          </span>
        )}
        {rows && rows.length > 0 && (
          <>
            {!refRows || refRows.length === 0 ? (
              <div style={{ overflowX: 'auto' }}>{renderTree(rows)}</div>
            ) : (
              /* 15 · Plan compare — the learner's plan beside the reference solution's,
                 line i against line i. A tinted line differs from its counterpart;
                 different is a conversation starter, not automatically worse. */
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', minWidth: '540px' }}>
                  {[
                    { label: 'YOUR PLAN', own: flattenTree(rows), other: flattenTree(refRows) },
                    { label: 'REFERENCE PLAN', own: flattenTree(refRows), other: flattenTree(rows) },
                  ].map(({ label, own, other }) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: 'hsl(var(--text-muted))', marginBottom: '0.3rem' }}>
                        {label}
                      </div>
                      {Array.from({ length: Math.max(own.length, other.length) }, (_, i) => {
                        const line = own[i];
                        const differs = line?.detail !== other[i]?.detail;
                        const op = line?.detail.startsWith('SCAN') ? 'scan' : line?.detail.startsWith('SEARCH') ? 'search' : 'other';
                        return (
                          <div
                            key={i}
                            style={{
                              paddingLeft: `${(line?.depth ?? 0) * 16 + 4}px`, paddingRight: '4px',
                              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.9,
                              whiteSpace: 'nowrap', borderRadius: '4px',
                              background: differs ? 'hsl(var(--medium) / 0.12)' : 'transparent',
                              color: !line ? 'hsl(var(--text-muted))'
                                : op === 'scan' ? 'hsl(var(--medium))'
                                  : op === 'search' ? 'hsl(var(--easy))'
                                    : 'hsl(var(--text-secondary))',
                            }}
                          >
                            {line ? `${line.depth > 0 ? '└ ' : ''}${line.detail}` : '—'}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '0.4rem' }}>
                  Tinted lines differ between the two plans; a dash means the other plan has no step at that position.
                </p>
              </div>
            )}
            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
              SCAN = the engine reads every row of the table (full read) · SEARCH =
              it seeks straight to matching rows via an index. These sample tables
              have no indexes, so SCAN here is normal — on a million-row table it is
              the difference that matters.
            </p>
          </>
        )}
      </div>
    </details>
  );
};
