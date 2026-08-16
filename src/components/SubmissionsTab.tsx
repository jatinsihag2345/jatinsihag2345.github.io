import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, History, RotateCw } from 'lucide-react';
import { readJson } from '../utils/persistence';
import { PythonHighlighter } from './PythonHighlighter';
import { type Snapshot, isSnapshotList, relTime } from './PythonPlayground';

interface SubmissionsTabProps {
  questionId: string;
}

/**
 * This app runs no judge, so there is no submission history the way LeetCode
 * has one. What genuinely exists is the Code panel's own `snap-<questionId>`
 * list — every attempt that passed the shipped tests, newest first, capped at
 * 10 (see PythonPlayground.tsx's `execute()`). That is a real, much smaller
 * thing than a submission log, so this tab says so up front rather than
 * dressing it up as one. Read-only here — restoring a snapshot into the editor
 * stays in the Code panel's own "History" dropdown, which already does it.
 */
export const SubmissionsTab: React.FC<SubmissionsTabProps> = ({ questionId }) => {
  const [snaps, setSnaps] = useState<Snapshot[]>(() => readJson<Snapshot[]>(`snap-${questionId}`, [], isSnapshotList));
  const [openOn, setOpenOn] = useState<number | null>(null);

  useEffect(() => {
    setSnaps(readJson<Snapshot[]>(`snap-${questionId}`, [], isSnapshotList));
    setOpenOn(null);
  }, [questionId]);

  const refresh = () => setSnaps(readJson<Snapshot[]>(`snap-${questionId}`, [], isSnapshotList));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <History size={16} color="hsl(var(--secondary))" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your passing attempts</h3>
        <button
          className="btn btn-secondary"
          style={{ marginLeft: 'auto', padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
          onClick={refresh}
        >
          <RotateCw size={12} /><span>Refresh</span>
        </button>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
        Not a full submission log — there is no judge behind this app. This is every run from the
        Code panel that passed the shipped tests, auto-saved newest-first and capped at 10. Restore
        one into the editor from the Code panel's own "History" dropdown, right above it.
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
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Accepted — {relTime(s.on)}</span>
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
