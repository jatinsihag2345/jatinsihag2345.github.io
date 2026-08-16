import React, { useEffect, useState } from 'react';
import { HardDrive, AlertTriangle } from 'lucide-react';

/**
 * Storage meter — a Stats card that answers two honest questions: how much room
 * has the browser granted this origin, and which of the app's own habits is
 * eating the localStorage slice of it.
 *
 * Everything the learner writes (notes, code attempts, sketches, the review
 * schedule) lives in localStorage, which most browsers cap around 5 MB — and a
 * full store fails WRITES, silently costing the next note. This card measures
 * and names the problem before it happens; it deliberately migrates and deletes
 * NOTHING — the honest remedy is the Dashboard's export, and the warning says so.
 *
 * The bar list follows the Stats-tab chart idiom (TopicTimeChart): one hue for a
 * magnitude ranking, every row directly labeled with real text — identity and
 * value never ride on color alone, and the fills are pure decoration (aria-hidden).
 */

interface StorageMeterProps {
  /** True while the Stats tab is on screen. The panel stays mounted (App hides it
   *  with display:none), so this flag is the cue to re-measure. */
  active: boolean;
}

interface Bucket {
  label: string;
  bytes: number;
}

type Estimate = 'pending' | 'unsupported' | { usage: number; quota: number };

// The stores that grow with use, named by their actual key prefixes so the
// learner can connect a fat bucket to a habit. Everything unmatched folds into
// "everything else" instead of being silently dropped.
const BUCKETS: { label: string; match: (k: string) => boolean }[] = [
  { label: 'notes-', match: (k) => k.startsWith('notes-') },
  { label: 'attempt-', match: (k) => k.startsWith('attempt-') },
  { label: 'sketch-', match: (k) => k.startsWith('sketch-') },
  { label: 'sql-attempt-', match: (k) => k.startsWith('sql-attempt-') },
  { label: 'reviewSchedule', match: (k) => k === 'reviewSchedule' },
];

// Above this, the next big paste can start bouncing off the ~5 MB ceiling.
const WARN_BYTES = 3.5 * 1024 * 1024;

const measureLocal = (): { buckets: Bucket[]; totalBytes: number } => {
  const sums = new Map<string, number>(BUCKETS.map((b) => [b.label, 0]));
  let rest = 0;
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    const v = localStorage.getItem(k) ?? '';
    // localStorage stores UTF-16 code units: two bytes per .length unit is what
    // the quota actually charges, not the smaller UTF-8 size an export would be.
    const bytes = (k.length + v.length) * 2;
    totalBytes += bytes;
    const bucket = BUCKETS.find((b) => b.match(k));
    if (bucket) sums.set(bucket.label, (sums.get(bucket.label) ?? 0) + bytes);
    else rest += bytes;
  }
  return {
    buckets: [
      ...BUCKETS.map((b) => ({ label: b.label, bytes: sums.get(b.label) ?? 0 })),
      { label: 'everything else', bytes: rest },
    ],
    totalBytes,
  };
};

const fmtBytes = (n: number): string => {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
};

export const StorageMeter: React.FC<StorageMeterProps> = ({ active }) => {
  const [local, setLocal] = useState<{ buckets: Bucket[]; totalBytes: number } | null>(null);
  const [est, setEst] = useState<Estimate>('pending');

  // Re-measure on every activation, like the rest of the Stats tab: this card is
  // a report, not a live feed, and other screens write storage while it's hidden.
  useEffect(() => {
    if (!active) return;
    setLocal(measureLocal());
    // navigator.storage.estimate() is the only browser-blessed view of the origin
    // quota. Where it's missing (older WebKit, some embeds) the card says so and
    // still shows the localStorage breakdown, which needs no API at all.
    if (!('storage' in navigator) || typeof navigator.storage.estimate !== 'function') {
      setEst('unsupported');
      return;
    }
    let cancelled = false;
    navigator.storage
      .estimate()
      .then((e) => {
        if (!cancelled) setEst({ usage: e.usage ?? 0, quota: e.quota ?? 0 });
      })
      .catch(() => {
        if (!cancelled) setEst('unsupported');
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const rows = local ? [...local.buckets].filter((b) => b.bytes > 0).sort((a, b) => b.bytes - a.bytes) : [];
  const maxBytes = rows.length > 0 ? rows[0].bytes : 1;
  const fattest = rows[0];
  const overBudget = local !== null && local.totalBytes > WARN_BYTES;

  const pct =
    typeof est === 'object' && est.quota > 0 ? (est.usage / est.quota) * 100 : 0;

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <HardDrive size={18} color="hsl(var(--secondary))" />
        Storage
      </h3>

      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
        Everything you write here lives in this browser's localStorage — roughly a 5 MB
        budget in most browsers, and a full store silently drops your next note. This
        card only measures; exporting a backup from the Dashboard is the pressure valve.
      </p>

      {/* ---- Origin-wide estimate ------------------------------------------------ */}
      {est === 'unsupported' ? (
        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
          This browser doesn't report an origin storage estimate — the app-data breakdown
          below is measured directly and doesn't need it.
        </p>
      ) : est === 'pending' ? (
        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: 0 }}>Measuring…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div
            aria-hidden="true"
            style={{ height: '8px', borderRadius: '4px', background: 'hsl(var(--bg-tertiary))', overflow: 'hidden' }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(pct, 0.5))}%`, height: '100%',
                borderRadius: '4px', background: 'hsl(var(--secondary))',
              }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontVariantNumeric: 'tabular-nums' }}>
            {fmtBytes(est.usage)} of {fmtBytes(est.quota)} origin storage used
            {' '}({pct < 1 ? '<1' : Math.round(pct)}%)
          </span>
          <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
            Counts every cache on this origin — the offline Python runtime alone can be tens
            of MB. The bars below are just this app's own localStorage.
          </span>
        </div>
      )}

      {/* ---- Per-prefix breakdown ------------------------------------------------ */}
      {local !== null && rows.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
          Nothing stored yet — solve something and come back.
        </p>
      )}
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--text-muted))' }}>
            APP DATA · {fmtBytes(local!.totalBytes)} TOTAL
          </span>
          {rows.map((b) => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  flex: '0 0 110px', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))',
                  fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}
                title={b.label}
              >
                {b.label}
              </span>
              <div
                aria-hidden="true"
                style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'hsl(var(--bg-tertiary))', overflow: 'hidden' }}
              >
                <div
                  style={{
                    width: `${Math.max((b.bytes / maxBytes) * 100, 1)}%`, height: '100%',
                    borderRadius: '4px', background: 'hsl(var(--primary))',
                  }}
                />
              </div>
              <span
                style={{
                  flex: '0 0 64px', textAlign: 'right', fontSize: '0.72rem',
                  fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmtBytes(b.bytes)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ---- Honest warning — status hue + icon + words, never color alone ------- */}
      {overBudget && fattest && (
        <div
          style={{
            display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
            padding: '0.75rem 1rem', borderRadius: '10px',
            background: 'hsl(var(--medium) / 0.1)',
            borderLeft: '3px solid hsl(var(--medium))',
          }}
        >
          <AlertTriangle size={16} color="hsl(var(--medium))" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55, margin: 0 }}>
            <strong style={{ color: 'hsl(var(--medium))' }}>
              {fmtBytes(local!.totalBytes)} of a ~5 MB budget.
            </strong>{' '}
            The fattest slice is <code style={{ fontSize: '0.75rem' }}>{fattest.label}</code>{' '}
            ({fmtBytes(fattest.bytes)}). Export a backup from the Dashboard now — once the
            budget is spent, the browser refuses new writes and whatever you type next is lost.
            Nothing is deleted automatically here.
          </p>
        </div>
      )}
    </div>
  );
};
