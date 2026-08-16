import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp, X } from 'lucide-react';

/**
 * Big-O growth explorer — six canonical curves on one interactive chart.
 *
 * Lands at: src/components/BigOExplorer.tsx
 *
 * Complexity classes stay abstract until you SEE 2^n leave the chart while log n
 * hugs the floor. Everything is computed in log10 space because 2^n overflows a
 * double past n ≈ 1024, and a chart that silently renders Infinity as a flat line
 * would teach the exact opposite of the truth.
 */

export type CurveId = 'c1' | 'logn' | 'n' | 'nlogn' | 'n2' | 'exp';

interface Curve {
  id: CurveId;
  label: string;
  color: string;
  /** log10 of the step count at input size n. Log space keeps 2^n finite. */
  log10At: (n: number) => number;
}

// Inner log2 clamped to >= 1 so log10 of it never goes negative/-Infinity at tiny n:
// the chart's floor is "1 operation", which is the honest minimum anyway.
const log2c = (n: number) => Math.max(Math.log2(n), 1);

// Palette order mirrors the badge hues: cheap = easy green ... catastrophic = hard red.
const CURVES: Curve[] = [
  { id: 'c1',    label: 'O(1)',       color: 'hsl(var(--easy))',      log10At: () => 0 },
  { id: 'logn',  label: 'O(log n)',   color: 'hsl(var(--secondary))', log10At: n => Math.log10(log2c(n)) },
  { id: 'n',     label: 'O(n)',       color: 'hsl(var(--primary))',   log10At: n => Math.log10(n) },
  { id: 'nlogn', label: 'O(n log n)', color: 'hsl(var(--accent))',    log10At: n => Math.log10(n) + Math.log10(log2c(n)) },
  { id: 'n2',    label: 'O(n²)',      color: 'hsl(var(--medium))',    log10At: n => 2 * Math.log10(n) },
  { id: 'exp',   label: 'O(2ⁿ)',      color: 'hsl(var(--hard))',      log10At: n => n * Math.log10(2) },
];

/**
 * Map a complexity badge token ("O(N log N)", "O(n^2)", "O(2^N)") onto a curve id.
 * Anything this cannot name with certainty — O(m·n), O(V+E), O(n^3), amortised
 * forms — returns null, and the caller highlights nothing rather than guessing.
 */
export const parseBigO = (token: string): CurveId | null => {
  const t = token
    .toLowerCase()
    .replace(/²/g, '^2')
    .replace(/ⁿ/g, '^n')
    .replace(/[×·*\s]+/g, '')
    .replace(/log_?2/g, 'log')
    .replace(/lg/g, 'log');
  const m = /o\(([^)]*)\)/.exec(t);
  if (!m) return null;
  switch (m[1]) {
    case '1': return 'c1';
    case 'logn': return 'logn';
    case 'n': return 'n';
    case 'nlogn': return 'nlogn';
    case 'n^2': case 'nn': return 'n2';
    case '2^n': return 'exp';
    default: return null;
  }
};

// Chart geometry (viewBox units — the SVG itself scales to its container).
const VW = 520;
const VH = 240;
const PAD = { left: 44, right: 14, top: 12, bottom: 26 };
const PW = VW - PAD.left - PAD.right;
const PH = VH - PAD.top - PAD.bottom;
const SAMPLES = 120;

/** Human-format 10^lv operations. Past 10^12 only the exponent is meaningful. */
const fmtOps = (lv: number): string => {
  if (lv > 12) return `≈ 10^${Math.round(lv).toLocaleString()}`;
  const v = Math.pow(10, lv);
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return v >= 100 ? String(Math.round(v)) : v.toFixed(v === Math.round(v) ? 0 : 1);
};

interface BigOExplorerProps {
  /** Curve to spotlight (others dim). Unknown/absent = all curves equal. */
  highlight?: CurveId | null;
}

export const BigOExplorer: React.FC<BigOExplorerProps> = ({ highlight = null }) => {
  // Slider works in exponent space (10^1 .. 10^6): a linear slider over a million
  // would spend 90% of its travel between 100k and 1M, which is the boring part.
  const [exp, setExp] = useState(3);
  const [logScale, setLogScale] = useState(false);
  const n = Math.round(Math.pow(10, exp));

  const chart = useMemo(() => {
    // Y ceiling is the n² curve's top, NOT 2^n's: with 2^n as the ceiling every
    // other curve would flatten into one indistinguishable floor line. 2^n instead
    // exits through the top of the chart — which IS the lesson.
    const topLog = Math.max(2 * Math.log10(n), 1);
    const paths = CURVES.map(curve => {
      const pts: string[] = [];
      let clipped = false;
      for (let i = 0; i <= SAMPLES; i++) {
        const x = 1 + ((n - 1) * i) / SAMPLES;
        const lv = curve.log10At(x);
        // Linear mode compares raw values (as a fraction of the ceiling); log mode
        // compares exponents. Both clamp at 4% above the top so exits look like exits.
        const frac = logScale ? lv / topLog : Math.pow(10, Math.min(lv - topLog, 0.02));
        if (frac > 1.04) { clipped = true; break; }
        const px = PAD.left + (PW * i) / SAMPLES;
        const py = PAD.top + PH - Math.max(Math.min(frac, 1.04), 0) * PH;
        pts.push(`${pts.length === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
      return { curve, d: pts.join(' '), clipped };
    });
    return { topLog, paths };
  }, [n, logScale]);

  const fmtN = (v: number) => (v >= 1e6 ? '1M' : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));

  return (
    <div
      className="glass"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, flex: 1, minWidth: '180px' }}>
          <TrendingUp size={18} color="hsl(var(--primary))" />
          Big-O growth explorer
        </h3>
        <button
          className={`btn ${logScale ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.3rem 0.8rem', fontSize: '0.72rem' }}
          aria-pressed={logScale}
          onClick={() => setLogScale(v => !v)}
        >
          Log scale
        </button>
      </div>

      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label={`Growth curves for O(1) through O(2^n), plotted from n = 1 to n = ${n.toLocaleString()} on a ${logScale ? 'logarithmic' : 'linear'} operations axis.`}
      >
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top + PH} x2={PAD.left + PW} y2={PAD.top + PH} stroke="hsl(var(--border-color))" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="hsl(var(--border-color))" strokeWidth={1} />
        {/* X ticks: 1, n/2, n */}
        {[1, 0.5, 0].map(f => {
          const x = PAD.left + PW * (1 - f);
          const v = 1 + (n - 1) * (1 - f);
          return (
            <text key={f} x={x} y={VH - 8} fontSize="9" textAnchor={f === 1 ? 'start' : f === 0 ? 'end' : 'middle'} fill="hsl(var(--text-muted))" fontFamily="var(--font-mono)">
              {f === 1 ? '1' : fmtN(v)}
            </text>
          );
        })}
        {/* Y ticks: floor, midpoint, ceiling — labelled in operations */}
        {[0, 0.5, 1].map(f => {
          const y = PAD.top + PH - f * PH;
          const lv = logScale ? f * chart.topLog : Math.log10(Math.max(f, 1e-9)) + chart.topLog;
          return (
            <g key={f}>
              <line x1={PAD.left - 3} y1={y} x2={PAD.left + PW} y2={y} stroke="hsl(var(--border-color))" strokeWidth={f === 0 ? 0 : 0.5} strokeDasharray="3 4" />
              <text x={PAD.left - 6} y={y + 3} fontSize="8.5" textAnchor="end" fill="hsl(var(--text-muted))" fontFamily="var(--font-mono)">
                {f === 0 ? (logScale ? '1' : '0') : fmtOps(lv)}
              </text>
            </g>
          );
        })}
        <text x={PAD.left + PW} y={PAD.top + 8} fontSize="8.5" textAnchor="end" fill="hsl(var(--text-muted))">
          steps{logScale ? ' (log scale)' : ''}
        </text>
        {/* Curves — highlighted one drawn last so it sits on top */}
        {[...chart.paths]
          .sort((a, b) => Number(a.curve.id === highlight) - Number(b.curve.id === highlight))
          .map(({ curve, d, clipped }) => {
            const dim = highlight !== null && highlight !== curve.id;
            return (
              <path
                key={curve.id}
                d={d}
                fill="none"
                stroke={curve.color}
                strokeWidth={curve.id === highlight ? 3 : 1.8}
                strokeOpacity={dim ? 0.28 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <title>{`${curve.label}${clipped ? ' — leaves the chart' : ''}`}</title>
              </path>
            );
          })}
      </svg>

      {/* Legend — swatch colors match stroke colors 1:1 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.9rem' }}>
        {CURVES.map(c => (
          <span
            key={c.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
              fontWeight: c.id === highlight ? 700 : 500,
              color: highlight !== null && highlight !== c.id ? 'hsl(var(--text-muted))' : 'hsl(var(--text-secondary))',
            }}
          >
            <span style={{ width: '14px', height: '3px', borderRadius: '2px', background: c.color, opacity: highlight !== null && highlight !== c.id ? 0.35 : 1 }} />
            {c.label}
          </span>
        ))}
      </div>

      {/* n slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <input
          type="range"
          min={1}
          max={6}
          step={0.01}
          value={exp}
          onChange={e => setExp(Number(e.target.value))}
          aria-label="Input size n, from 10 to one million"
          style={{ flex: 1, accentColor: 'hsl(var(--primary))' }}
        />
        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'hsl(var(--text-primary))', minWidth: '96px', textAlign: 'right' }}>
          n = {n.toLocaleString()}
        </span>
      </div>

      {/* Readout: exact step counts at the slider's n */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
              <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Complexity</th>
              <th style={{ textAlign: 'right', padding: '0.3rem 0.5rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Steps at n = {fmtN(n)}</th>
            </tr>
          </thead>
          <tbody>
            {CURVES.map(c => {
              const hi = c.id === highlight;
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid hsl(var(--border-color) / 0.4)', background: hi ? 'hsl(var(--primary-glow))' : 'transparent' }}>
                  <td style={{ padding: '0.3rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: hi ? 700 : 500, color: c.color }}>{c.label}</td>
                  <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: hi ? 700 : 500, color: 'hsl(var(--text-secondary))' }}>
                    {fmtOps(c.log10At(n))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
        The ceiling is pinned to n² so the cheaper curves stay readable — 2ⁿ exits
        the top almost immediately, which is exactly why exponential solutions die
        past n ≈ 25.
      </p>
    </div>
  );
};

/**
 * The "see it on the curve" affordance next to a complexity badge: a small button
 * that opens the explorer in a modal with that approach's time complexity
 * highlighted. Unparseable forms (O(m·n), O(V+E), ...) still open the chart —
 * just with nothing spotlighted, never with a wrong guess.
 */
export const BigOCurveButton: React.FC<{ token: string }> = ({ token }) => {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus lands on the close button so Escape/Enter work immediately; no trap —
  // Tab can leave, Escape and backdrop click both close.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        className="btn btn-secondary"
        style={{ padding: '0.25rem 0.6rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
        onClick={() => setOpen(true)}
        title={`See ${token} on the growth curves`}
      >
        <TrendingUp size={11} />
        <span>see it on the curve</span>
      </button>
      {open && (
        <div data-floating-ui="true"
          onClick={() => setOpen(false)}
          className="animate-fade"
          style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'hsl(0 0% 0% / 0.55)', backdropFilter: 'blur(3px)',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            paddingTop: '8vh', overflowY: 'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
            role="dialog"
            aria-modal="true"
            aria-label={`Growth curves, ${token} highlighted`}
            className="animate-pop"
            style={{ width: 'min(640px, 94vw)', position: 'relative', marginBottom: '8vh' }}
          >
            <button
              ref={closeRef}
              className="btn btn-secondary"
              aria-label="Close the growth-curve chart"
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', padding: '0.35rem', zIndex: 1 }}
            >
              <X size={14} />
            </button>
            <BigOExplorer highlight={parseBigO(token)} />
          </div>
        </div>
      )}
    </>
  );
};
