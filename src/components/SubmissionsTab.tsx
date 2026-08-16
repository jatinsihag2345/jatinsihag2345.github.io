import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, History, RotateCw } from 'lucide-react';
import { readJson } from '../utils/persistence';
import { PythonHighlighter } from './PythonHighlighter';
import { type Snapshot, isSnapshotList, relTime } from './PythonPlayground';

interface SubmissionsTabProps {
  questionId: string;
  /** True while this is the tab on screen. `dsa:tests-passed` covers the green-run
   *  writer, but `startResolve()`'s stash writes the same list and fires nothing to
   *  subscribe to — re-reading when the tab is brought forward is what catches it,
   *  and anything else that ever writes `snap-`, without a poll. */
  active?: boolean;
}

/** `snap-` has two writers: `execute()` on a green graded run, and
 *  `startResolve()`, which stashes whatever is in the editor — passing, failing
 *  or half-typed — so wiping back to the starter can never cost work. Only the
 *  writer knows which, so this tab reads an optional flag rather than assuming:
 *  entries written before the flag existed simply do not carry it and get the
 *  neutral label. Calling every row "Accepted" was a claim the data does not
 *  support. */
type KeptRun = Snapshot & { passed?: boolean };

const verdictOf = (s: KeptRun): string =>
  s.passed === true ? 'Accepted' : s.passed === false ? 'Stashed before a re-solve' : 'Saved attempt';

/**
 * This app runs no judge, so there is no submission history the way LeetCode
 * has one. What genuinely exists is the Code panel's own `snap-<questionId>`
 * list — the code it keeps for you, newest first, capped at 10 (see
 * PythonPlayground.tsx). That is a real, much smaller thing than a submission
 * log, so this tab says so up front rather than dressing it up as one.
 * Read-only here — restoring a snapshot into the editor stays in the Code
 * panel's own "History" dropdown, which already does it.
 */
export const SubmissionsTab: React.FC<SubmissionsTabProps> = ({ questionId, active }) => {
  const [snaps, setSnaps] = useState<KeptRun[]>(() => readJson<KeptRun[]>(`snap-${questionId}`, [], isSnapshotList));
  const [openOn, setOpenOn] = useState<number | null>(null);

  useEffect(() => {
    const read = () => setSnaps(readJson<KeptRun[]>(`snap-${questionId}`, [], isSnapshotList));
    read();
    setOpenOn(null);
    // The Code panel writes this list from the RIGHT pane while this tab is on
    // screen — all four panels stay mounted (see ProblemViewer), so a read only
    // at mount left the learner watching a run go green next to "Nothing yet".
    // The playground dispatches dsa:tests-passed just BEFORE it writes the
    // snapshot, both in one synchronous stretch, so the re-read is queued a
    // microtask later to land after that write rather than before it.
    const onPassed = (e: Event) => {
      const id = (e as CustomEvent<{ questionId?: string }>).detail?.questionId;
      if (id && id !== questionId) return;
      queueMicrotask(read);
    };
    window.addEventListener('dsa:tests-passed', onPassed);
    return () => window.removeEventListener('dsa:tests-passed', onPassed);
  }, [questionId]);

  // Kept separate from the effect above so bringing the tab forward re-reads the
  // list without also collapsing an expanded row — surviving a tab switch is the
  // point of keeping all four panels mounted.
  useEffect(() => {
    if (active) setSnaps(readJson<KeptRun[]>(`snap-${questionId}`, [], isSnapshotList));
  }, [active, questionId]);

  const refresh = () => setSnaps(readJson<KeptRun[]>(`snap-${questionId}`, [], isSnapshotList));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <History size={16} color="hsl(var(--secondary))" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your saved attempts</h3>
        <button
          className="btn btn-secondary"
          style={{ marginLeft: 'auto', padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
          onClick={refresh}
        >
          <RotateCw size={12} /><span>Refresh</span>
        </button>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
        Not a full submission log — there is no judge behind this app. This is the code the Code
        panel kept: every run that passed the shipped tests, plus whatever was in the editor when
        you started a timed re-solve, since that wipe must never cost you work. Newest-first, capped
        at 10. Restore one into the editor from the Code panel's own "History" dropdown, right above
        it.
      </p>

      {snaps.length === 0 ? (
        <div style={{ padding: '1.25rem', borderRadius: '10px', border: '1px dashed hsl(var(--border-color))', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
          Nothing yet — pass the shipped tests once from the Code panel and it shows up here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {snaps.map((s) => (
            <div key={s.on} style={{ border: '1px solid hsl(var(--border-color))', borderRadius: '10px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setOpenOn(o => (o === s.on ? null : s.on))}
                aria-expanded={openOn === s.on}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 0.9rem', background: 'hsl(var(--bg-secondary) / 0.5)',
                  border: 'none', cursor: 'pointer', color: 'hsl(var(--text-primary))', textAlign: 'left',
                }}
              >
                {openOn === s.on ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{verdictOf(s)} — {relTime(s.on)}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>
                  {s.code.split('\n').length} lines
                </span>
              </button>
              {openOn === s.on && (
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  <PythonHighlighter code={s.code} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
