import React, { useId, useState } from 'react';
import { Sigma } from 'lucide-react';

/**
 * Recurrence checker — the master theorem, shown working instead of recited.
 *
 * Lands at: src/components/RecurrenceChecker.tsx (mounted on the Stats tab,
 * directly under the Big-O growth explorer).
 *
 * Learners memorise "three cases" and still cannot say WHY merge sort is n log n
 * but Karatsuba is n^1.585. The why is one number: r = a/b^k, the ratio between
 * the cost of a recursion-tree level and the level above it. This card takes
 * T(n) = a·T(n/b) + n^k, walks the tree argument step by step with the learner's
 * actual numbers substituted in, and only THEN names the case — the name is the
 * conclusion, not the method. Pure client-side math; nothing persisted.
 */

/** Tolerant float equality — log_b(a) for a=8, b=2 lands at 2.9999999999999996,
 *  and calling that "case 3" instead of "= 3" would be a floating-point lie. */
const near = (x: number, y: number) => Math.abs(x - y) < 1e-9;

/** n^e the way humans write it: 1, n, n², n³, n^4, n^1.585 … */
const powTxt = (e: number): string => {
  if (near(e, 0)) return '1';
  if (near(e, 1)) return 'n';
  if (near(e, 2)) return 'n²';
  if (near(e, 3)) return 'n³';
  if (near(e, Math.round(e))) return `n^${Math.round(e)}`;
  return `n^${e.toFixed(3)}`;
};

/** Numbers without float noise: 2, 1.5, 2.807. */
const fmtNum = (x: number): string =>
  near(x, Math.round(x)) ? String(Math.round(x)) : String(Number(x.toFixed(3)));

interface Preset {
  name: string;
  a: number;
  b: number;
  k: number;
  blurb: string;
}

// Eight classics, ordered easy → exotic. Each blurb says what a/b/k MEAN for that
// algorithm, because the whole point is connecting the symbols to real code.
const PRESETS: Preset[] = [
  { name: 'Merge sort', a: 2, b: 2, k: 1, blurb: 'two half-size sorts, then a linear merge' },
  { name: 'Binary search', a: 1, b: 2, k: 0, blurb: 'one half survives, O(1) work per level' },
  { name: 'Tree traversal', a: 2, b: 2, k: 0, blurb: 'recurse into both halves, O(1) at each node' },
  { name: 'Quickselect (even splits)', a: 1, b: 2, k: 1, blurb: 'linear partition, then recurse into one half' },
  { name: 'Karatsuba multiply', a: 3, b: 2, k: 1, blurb: '3 half-size multiplies instead of 4, linear combine' },
  { name: 'Schoolbook D&C multiply', a: 4, b: 2, k: 1, blurb: 'all 4 half-size multiplies — the one Karatsuba beat' },
  { name: 'Strassen matrix multiply', a: 7, b: 2, k: 2, blurb: '7 half-size multiplies plus n² additions' },
  { name: 'Stooge sort', a: 3, b: 1.5, k: 0, blurb: 'three overlapping 2/3-size sorts — famously terrible' },
];

interface Verdict {
  /** Critical exponent log_b(a): the exponent of the leaf count. */
  c: number;
  /** Per-level cost ratio a/b^k: level i costs n^k · r^i. */
  r: number;
  caseNo: 1 | 2 | 3;
  caseName: string;
  /** The Θ(...) argument, without the Θ wrapper. */
  bound: string;
  /** Exact non-decimal form ("n^log_2(3)") when c is not a clean number. */
  exact?: string;
  why: string;
}

const analyse = (a: number, b: number, k: number): Verdict => {
  const c = Math.log(a) / Math.log(b);
  const r = a / Math.pow(b, k);
  // r = 1 and c = k are the same condition algebraically; testing both keeps the
  // float tolerance symmetric no matter which side accumulated the rounding.
  if (near(r, 1) || near(c, k)) {
    return {
      c,
      r,
      caseNo: 2,
      caseName: 'balanced — every level costs the same',
      bound: near(k, 0) ? 'log n' : `${powTxt(k)} log n`,
      why:
        'Each level does exactly the same total work as the one above it, and the tree is ' +
        'log_b(n) levels deep — so the answer is one level’s cost times the number of levels.',
    };
  }
  if (r > 1) {
    return {
      c,
      r,
      caseNo: 1,
      caseName: 'leaves dominate',
      bound: powTxt(c),
      exact: near(c, Math.round(c)) ? undefined : `n^log_${fmtNum(b)}(${fmtNum(a)})`,
      why:
        'Level costs grow geometrically going down, so the last level — the leaves — carries ' +
        'almost all of the total. Counting leaves is the whole analysis.',
    };
  }
  return {
    c,
    r,
    caseNo: 3,
    caseName: 'the root dominates',
    bound: powTxt(k),
    why:
      'Level costs shrink geometrically going down, so the top call’s own work already ' +
      'dominates the sum — recursion below it is a rounding error.',
  };
};

// Shared bits of the input row styling.
const numInputStyle: React.CSSProperties = {
  width: '5.5rem',
  padding: '0.45rem 0.6rem',
  borderRadius: '8px',
  background: 'hsl(var(--bg-tertiary))',
  color: 'hsl(var(--text-primary))',
  border: '1px solid hsl(var(--border-color))',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  outline: 'none',
};

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' };

export const RecurrenceChecker: React.FC = () => {
  // Strings, not numbers: the learner must be able to type "1." or clear a field
  // without the input snapping back under their cursor.
  const [aStr, setAStr] = useState('2');
  const [bStr, setBStr] = useState('2');
  const [kStr, setKStr] = useState('1');
  const uid = useId();

  const a = Number(aStr);
  const b = Number(bStr);
  const k = Number(kStr);

  const problems: string[] = [];
  if (aStr.trim() === '' || bStr.trim() === '' || kStr.trim() === '' || !Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(k)) {
    problems.push('All three of a, b, k must be numbers.');
  } else {
    if (a < 1) problems.push('a must be ≥ 1 — the recurrence needs at least one recursive call per level.');
    if (b <= 1) problems.push('b must be > 1 — each call has to shrink the input, or the recursion never bottoms out.');
    if (k < 0) problems.push('k must be ≥ 0 — negative-exponent driving work is outside this simple form.');
  }
  const v = problems.length === 0 ? analyse(a, b, k) : null;

  const setPreset = (p: Preset) => {
    setAStr(fmtNum(p.a));
    setBStr(fmtNum(p.b));
    setKStr(fmtNum(p.k));
  };
  const presetActive = (p: Preset) => near(a, p.a) && near(b, p.b) && near(k, p.k);

  // The three derivation steps, with the learner's numbers substituted in. Built as
  // data so the render below stays a dumb list.
  const steps: { title: string; body: React.ReactNode }[] = v
    ? [
        {
          title: 'Draw the recursion tree',
          body: (
            <>
              Every call spawns <span style={mono}>a = {fmtNum(a)}</span> calls on inputs{' '}
              <span style={mono}>{fmtNum(b)}×</span> smaller, so level <span style={mono}>i</span> holds{' '}
              <span style={mono}>{fmtNum(a)}^i</span> subproblems of size <span style={mono}>n/{fmtNum(b)}^i</span>. The tree
              bottoms out after <span style={mono}>log_{fmtNum(b)}(n)</span> levels, where{' '}
              <span style={mono}>{fmtNum(a)}^log_{fmtNum(b)}(n) = n^log_{fmtNum(b)}({fmtNum(a)}) = {powTxt(v.c)}</span> leaves sit.
            </>
          ),
        },
        {
          title: 'Price one level',
          body: (
            <>
              A size-<span style={mono}>m</span> subproblem does <span style={mono}>m^{fmtNum(k)}</span> local work, so level{' '}
              <span style={mono}>i</span> costs{' '}
              <span style={mono}>
                {fmtNum(a)}^i · (n/{fmtNum(b)}^i)^{fmtNum(k)} = {powTxt(k)} · r^i
              </span>{' '}
              with{' '}
              <span style={{ ...mono, fontWeight: 700, color: 'hsl(var(--secondary))' }}>
                r = a/b^k = {fmtNum(a)}/{fmtNum(b)}^{fmtNum(k)} = {fmtNum(v.r)}
              </span>
              . One number now decides everything: does a level cost more or less than the level above it?
            </>
          ),
        },
        {
          title: 'Compare the exponents',
          body: (
            <>
              Leaf-count exponent <span style={mono}>c = log_{fmtNum(b)}({fmtNum(a)}) = {fmtNum(v.c)}</span> versus driving-work
              exponent <span style={mono}>k = {fmtNum(k)}</span>.{' '}
              {v.caseNo === 1 && (
                <>
                  Since <span style={mono}>r = {fmtNum(v.r)} &gt; 1</span> (equivalently{' '}
                  <span style={mono}>c &gt; k</span>), the per-level costs form a GROWING geometric series — its sum is dominated
                  by the last term, the <span style={mono}>{powTxt(v.c)}</span> leaves doing O(1) work each.
                </>
              )}
              {v.caseNo === 2 && (
                <>
                  Since <span style={mono}>r = 1</span> (equivalently <span style={mono}>c = k</span>), every one of the{' '}
                  <span style={mono}>Θ(log n)</span> levels costs the same <span style={mono}>{powTxt(k)}</span> — total = level
                  cost × level count.
                </>
              )}
              {v.caseNo === 3 && (
                <>
                  Since <span style={mono}>r = {fmtNum(v.r)} &lt; 1</span> (equivalently{' '}
                  <span style={mono}>c &lt; k</span>), the per-level costs form a SHRINKING geometric series — its sum is
                  dominated by the first term, the root&rsquo;s own <span style={mono}>{powTxt(k)}</span>. (The textbook&rsquo;s
                  &ldquo;regularity condition&rdquo; is automatic here: for f(n) = n^k it is exactly r &lt; 1.)
                </>
              )}
            </>
          ),
        },
      ]
    : [];

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem',
        borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Sigma size={18} color="hsl(var(--secondary))" />
        Recurrence checker — master theorem
      </h3>
      <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        For divide-and-conquer recurrences of the shape{' '}
        <span style={{ ...mono, color: 'hsl(var(--text-primary))' }}>T(n) = a·T(n/b) + n^k</span>: type your{' '}
        <span style={mono}>a</span>, <span style={mono}>b</span>, <span style={mono}>k</span> or start from a classic, and read
        the bound off the recursion tree — derivation first, case number last.
      </p>

      {/* Presets — recognising a recurrence in the wild is half the skill. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {PRESETS.map(p => {
          const active = problems.length === 0 && presetActive(p);
          return (
            <button
              key={p.name}
              className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.7rem' }}
              aria-pressed={active}
              title={`T(n) = ${fmtNum(p.a)}·T(n/${fmtNum(p.b)}) + ${powTxt(p.k)} — ${p.blurb}`}
              onClick={() => setPreset(p)}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem', alignItems: 'flex-end' }}>
        {(
          [
            { id: 'a', label: 'a — subproblems per call', val: aStr, set: setAStr },
            { id: 'b', label: 'b — input shrink factor', val: bStr, set: setBStr },
            { id: 'k', label: 'k — exponent of local work n^k', val: kStr, set: setKStr },
          ] as const
        ).map(f => (
          <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label htmlFor={`${uid}-${f.id}`} style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>
              {f.label}
            </label>
            <input
              id={`${uid}-${f.id}`}
              type="number"
              inputMode="decimal"
              step="any"
              value={f.val}
              onChange={e => f.set(e.target.value)}
              style={numInputStyle}
            />
          </div>
        ))}
        {v && (
          <div
            style={{
              ...mono,
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'hsl(var(--text-primary))',
              padding: '0.45rem 0.7rem',
              borderRadius: '8px',
              background: 'hsl(var(--bg-secondary) / 0.5)',
              border: '1px dashed hsl(var(--border-color))',
            }}
          >
            T(n) = {fmtNum(a)}·T(n/{fmtNum(b)}) + {powTxt(k)}
          </div>
        )}
      </div>

      {problems.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {problems.map(p => (
            <li key={p} style={{ fontSize: '0.75rem', color: 'hsl(var(--medium))', lineHeight: 1.5 }}>
              {p}
            </li>
          ))}
        </ul>
      )}

      {v && (
        <>
          {/* The derivation — three numbered steps, learner's numbers substituted in */}
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {steps.map((s, i) => (
              <li key={s.title} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: '0.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    background: 'hsl(var(--secondary) / 0.15)',
                    color: 'hsl(var(--secondary))',
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: '0.15rem' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6, wordBreak: 'break-word' }}>
                    {s.body}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* The verdict — named only after the argument has been made */}
          <div
            style={{
              background: 'hsl(var(--primary-glow))',
              border: '1px solid hsl(var(--primary) / 0.4)',
              borderRadius: '10px',
              padding: '0.9rem 1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
            }}
          >
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'hsl(var(--primary))',
              }}
            >
              Case {v.caseNo} — {v.caseName}
            </span>
            <span style={{ ...mono, fontSize: '1.3rem', fontWeight: 800, color: 'hsl(var(--text-primary))', wordBreak: 'break-word' }}>
              T(n) = Θ({v.bound})
            </span>
            {v.exact && (
              <span style={{ ...mono, fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                exact form Θ({v.exact}) — the decimal {fmtNum(v.c)} is its value
              </span>
            )}
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>{v.why}</p>
          </div>
        </>
      )}

      {/* Scope honesty: name what this card cannot do, so it never gets trusted past it. */}
      <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
        This form covers driving work that is a pure power n^k. A log factor in the work term (like merge
        sort&rsquo;s cousin n log n) needs the extended master theorem, and subtract-style recurrences such as
        T(n) = T(n−1) + n are not divide-and-conquer at all — different tool.
      </p>
    </div>
  );
};
