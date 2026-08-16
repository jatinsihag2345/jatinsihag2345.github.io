import React, { useMemo, useRef, useState } from 'react';
import { Users, Upload, X } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import { sqlQuestions } from '../data/sqlQuestions';
import { readStringArray, readStudyMeta, STORAGE_KEYS } from '../utils/persistence';
// parseBackup is the SAME validator the Dashboard's restore flow uses — one
// definition of "a real backup from this app". The difference is what happens
// next: restore writes localStorage, this component only ever reads the result.
import { parseBackup } from '../utils/backup';
import { longestStreakEver } from '../utils/achievements';

interface FriendCompareProps {
  /** Stats bumps this on activation so YOUR side of the mirror stays fresh. */
  refresh: number;
}

/** The friend's progress, decoded from their export — held in memory only. */
interface FriendData {
  solvedDsa: Set<string>;
  solvedSql: number;
  longestStreak: number;
  exportedOn: string | null;
}

const parseFriendFile = (raw: string): FriendData => {
  // Throws on anything that isn't this app's backup — the caller turns that
  // into one honest sentence instead of a half-rendered comparison.
  const entries = new Map(parseBackup(raw));
  const readArr = (key: string): string[] => {
    try {
      const v = JSON.parse(entries.get(key) ?? '[]');
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  };
  let studyDays: string[] = [];
  try {
    const meta = JSON.parse(entries.get('studyMeta') ?? '{}') as { studyDays?: unknown };
    if (Array.isArray(meta.studyDays)) studyDays = meta.studyDays.filter((d): d is string => typeof d === 'string');
  } catch { /* no streak data in this backup — 0 is the honest number */ }
  let exportedOn: string | null = null;
  try {
    const top = JSON.parse(raw) as { exportedAt?: unknown };
    if (typeof top.exportedAt === 'string') exportedOn = top.exportedAt.slice(0, 10);
  } catch { /* date is cosmetic */ }
  return {
    solvedDsa: new Set(readArr('solvedDsaIds').filter((id) => dsaQuestions.some((q) => q.id === id))),
    solvedSql: readArr('solvedSqlIds').length,
    longestStreak: longestStreakEver(studyDays).length,
    exportedOn,
  };
};

/**
 * Side-by-side comparison against a friend's exported progress file.
 *
 * READ-ONLY by construction: the file is parsed in memory, rendered, and thrown
 * away — no code path here touches localStorage writes, so there is nothing a
 * malformed (or malicious) file could overwrite. The restore flow on the
 * Dashboard exists for actually importing; this is a mirror, not a door.
 */
export const FriendCompare: React.FC<FriendCompareProps> = ({ refresh }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [friend, setFriend] = useState<FriendData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mine = useMemo(() => ({
    solvedDsa: new Set(readStringArray(STORAGE_KEYS.solvedDsaIds)),
    solvedSql: readStringArray(STORAGE_KEYS.solvedSqlIds).length,
    longestStreak: longestStreakEver(readStudyMeta().studyDays).length,
    // refresh is the deliberate re-read trigger; the data lives in localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [refresh]);

  // Patterns with enough questions to make a bar meaningful (same >= 5 rule as
  // the Dashboard's thinnest-patterns card), biggest first, capped at 8 rows.
  const patterns = useMemo(() => {
    const groups = new Map<string, string[]>();
    dsaQuestions.forEach((q) => (q.patterns ?? []).forEach((p) => groups.set(p, [...(groups.get(p) ?? []), q.id])));
    return [...groups.entries()]
      .filter(([, ids]) => ids.length >= 5)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);
  }, []);

  const onFile = async (file: File) => {
    try {
      setFriend(parseFriendFile(await file.text()));
      setError(null);
    } catch {
      setFriend(null);
      setError("That file isn't a progress backup exported from this site.");
    }
  };

  const bar = (solved: number, total: number, color: string, who: string, pattern: string) => {
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
    return (
      <div
        title={`${who}: ${solved}/${total} ${pattern}`}
        style={{ height: '5px', borderRadius: '3px', background: 'hsl(var(--bg-tertiary))', overflow: 'hidden' }}
      >
        <div style={{ width: `${Math.max(pct, solved > 0 ? 3 : 0)}%`, height: '100%', borderRadius: '3px', background: color }} />
      </div>
    );
  };

  const statRow = (label: string, yours: React.ReactNode, theirs: React.ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'baseline' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'hsl(var(--accent))', minWidth: '58px', textAlign: 'right' }}>{yours}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'hsl(var(--secondary))', minWidth: '58px', textAlign: 'right' }}>{theirs}</span>
    </div>
  );

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Users size={18} color="hsl(var(--accent))" />
        Compare with a friend
      </h3>

      {!friend && (
        <>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
            Ask a friend for their "Export progress" file (Dashboard) and load it here to see
            solves, streaks and pattern coverage side by side.
          </p>
          <button
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-start', padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={14} /> Load their export
          </button>
          {error && (
            <p role="alert" style={{ fontSize: '0.78rem', color: 'hsl(var(--hard))' }}>{error}</p>
          )}
        </>
      )}

      {friend && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem' }}>
            <span />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--accent))', textAlign: 'right', minWidth: '58px' }}>YOU</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--secondary))', textAlign: 'right', minWidth: '58px' }}>THEM</span>
          </div>
          {statRow('DSA solved', `${mine.solvedDsa.size}/${dsaQuestions.length}`, `${friend.solvedDsa.size}/${dsaQuestions.length}`)}
          {statRow('SQL solved', `${mine.solvedSql}/${sqlQuestions.length}`, `${friend.solvedSql}/${sqlQuestions.length}`)}
          {statRow('Longest streak', `${mine.longestStreak}d`, `${friend.longestStreak}d`)}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))' }}>
              Pattern coverage — you (pink) vs them (cyan)
            </span>
            {patterns.map(([p, ids]) => {
              const myCount = ids.filter((id) => mine.solvedDsa.has(id)).length;
              const theirCount = ids.filter((id) => friend.solvedDsa.has(id)).length;
              return (
                <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ fontWeight: 600 }}>{p}</span>
                    <span style={{ color: 'hsl(var(--text-muted))', fontVariantNumeric: 'tabular-nums' }}>
                      {myCount} vs {theirCount} of {ids.length}
                    </span>
                  </div>
                  {bar(myCount, ids.length, 'hsl(var(--accent))', 'You', p)}
                  {bar(theirCount, ids.length, 'hsl(var(--secondary))', 'They', p)}
                </div>
              );
            })}
          </div>

          <button
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-start', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            onClick={() => setFriend(null)}
          >
            <X size={13} /> Clear comparison{friend.exportedOn ? ` (their export: ${friend.exportedOn})` : ''}
          </button>
        </div>
      )}

      {/* The promise that makes handing a file over feel safe — kept loud on purpose. */}
      <p
        style={{
          fontSize: '0.72rem', lineHeight: 1.5, color: 'hsl(var(--text-secondary))',
          padding: '0.6rem 0.8rem', borderRadius: '10px',
          background: 'hsl(var(--easy) / 0.08)', border: '1px dashed hsl(var(--easy) / 0.5)',
        }}
      >
        <strong>Nothing is imported.</strong> Their file is read in memory for this comparison
        only — your progress, notes and schedule are untouched. Restoring a backup is a separate,
        explicit flow on the Dashboard.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        aria-label="Load a friend's exported progress file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = ''; // same file re-selectable after a Clear
        }}
      />
    </div>
  );
};
