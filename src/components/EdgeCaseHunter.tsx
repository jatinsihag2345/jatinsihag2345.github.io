import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Crosshair, CheckCircle } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { fmtMs, shuffle } from './drillModes';

/**
 * Edge-case hunter — the "what could break this?" reflex, timed.
 *
 * Interviewers rarely fail candidates for a slow algorithm; they fail them for never
 * asking "what if the list is empty?". This mode gives you a statement and three
 * minutes to list every input that could hurt, THEN shows the cases interviewers
 * actually probe — self-checked, because only you know whether "empty input" in your
 * words and theirs are the same case. The score is self-reported on purpose, which is
 * also why it never feeds the drill log: claims must not masquerade as measured
 * outcomes in a history the readiness radar treats as measured.
 *
 * The countdown is a deadline timestamp — a sleeping tab delays the repaint, never
 * the deadline. A reload abandons the hunt; at three minutes, restarting is cheaper
 * than resurrection.
 */

const HUNT_MS = 3 * 60_000;

export const EdgeCaseHunter: React.FC = () => {
  const [q, setQ] = useState<Question | null>(null);
  const [phase, setPhase] = useState<'hunt' | 'check'>('hunt');
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [text, setText] = useState('');
  /** Indexes into q.edgeCases the learner claims to have covered. */
  const [claimed, setClaimed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!q || phase !== 'hunt') return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [q, phase]);

  // Time's up — straight to the comparison, whatever is in the box.
  useEffect(() => {
    if (q && phase === 'hunt' && now >= deadline) setPhase('check');
  }, [now, deadline, q, phase]);

  const start = () => {
    const picked = shuffle(dsaQuestions.filter(item => item.edgeCases.length > 0))[0];
    if (!picked) return;
    setQ(picked);
    setPhase('hunt');
    setText('');
    setClaimed(new Set());
    setNow(Date.now());
    setDeadline(Date.now() + HUNT_MS);
  };

  const toggleClaim = (i: number) => {
    setClaimed(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // ---- Setup --------------------------------------------------------------------
  if (!q) {
    return (
      <div
        className="glass animate-in"
        style={{
          padding: '1.5rem', borderRadius: '16px', maxWidth: '720px',
          border: '1px solid hsl(var(--border-color))',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Crosshair size={18} color="hsl(var(--secondary))" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Edge-case hunter</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          A random problem statement, three minutes, and one job: list every edge case you
          would test — one per line. Then you check yourself against the cases interviewers
          are known to probe for that problem. The score is whatever you honestly claim;
          nobody is grading you but the person the grade is for.
        </p>
        <div>
          <button className="btn btn-primary" onClick={start}>
            <Play size={16} /> Start hunting — {fmtMs(HUNT_MS)} on the clock
          </button>
        </div>
      </div>
    );
  }

  // ---- Hunting ------------------------------------------------------------------
  if (phase === 'hunt') {
    const remaining = Math.max(0, deadline - now);
    const frac = remaining / HUNT_MS;
    const clockColor =
      frac <= 0.1 ? 'hsl(var(--hard))' : frac <= 0.25 ? 'hsl(var(--medium))' : 'hsl(var(--text-primary))';
    return (
      <div className="animate-in" style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Crosshair size={18} color="hsl(var(--secondary))" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, flex: 1, minWidth: '180px' }}>{q.title}</h3>
          <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
          <span
            style={{
              fontSize: '1.4rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: clockColor, transition: 'color 0.5s ease',
            }}
          >
            {fmtMs(remaining)}
          </span>
        </div>

        <div
          className="glass"
          style={{
            padding: '1.25rem 1.5rem', borderRadius: '14px',
            border: '1px solid hsl(var(--border-color))',
            display: 'flex', flexDirection: 'column', gap: '0.9rem',
          }}
        >
          <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.65 }}>
            {q.problemStatement}
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            aria-label="Edge cases you would test, one per line"
            placeholder={'One edge case per line, e.g.\nempty input\nsingle element\nall duplicates\nvalues at the constraint limits'}
            rows={8}
            style={{
              width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.88rem',
              lineHeight: 1.6, padding: '0.85rem 1rem', borderRadius: '10px',
              background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-color))', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setPhase('check')}>
              <CheckCircle size={16} /> I'm done — check me
            </button>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              {text.split('\n').filter(l => l.trim()).length} listed. When the clock hits
              zero you get checked with whatever is here.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ---- Self-check ---------------------------------------------------------------
  const mine = text.split('\n').map(l => l.trim()).filter(Boolean);
  return (
    <div className="animate-in" style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>The reveal — {q.title}</h3>
        <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          Tick each probed case you genuinely had — different words, same case, counts.
          Anything you listed beyond these might still be a real case; interviewers keep
          short lists, not complete ones.
        </p>
      </div>

      <div
        className="glass"
        style={{
          padding: '1.25rem 1.5rem', borderRadius: '14px',
          border: '1px solid hsl(var(--border-color))',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '1.5rem',
        }}
      >
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.6rem' }}>
            What you hunted down ({mine.length})
          </h4>
          {mine.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))' }}>
              Nothing made it in before the clock. That, too, is data.
            </p>
          ) : (
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {mine.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          )}
        </div>

        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.6rem', color: 'hsl(var(--hard))' }}>
            What interviewers probe ({q.edgeCases.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {q.edgeCases.map((edge, i) => (
              <label
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer',
                  fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={claimed.has(i)}
                  onChange={() => toggleClaim(i)}
                  style={{ marginTop: '0.2rem', accentColor: 'hsl(var(--easy))' }}
                />
                <span>
                  {edge}{' '}
                  <span style={{ fontSize: '0.7rem', color: claimed.has(i) ? 'hsl(var(--easy))' : 'hsl(var(--text-muted))' }}>
                    {claimed.has(i) ? '— I had this' : '— I had this?'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: claimed.size === q.edgeCases.length ? 'hsl(var(--easy))' : 'hsl(var(--text-primary))' }}>
          {claimed.size}/{q.edgeCases.length} covered — self-reported, so it's only as honest as you were.
        </span>
        <button className="btn btn-primary" onClick={start}>
          <RotateCcw size={16} /> Hunt another
        </button>
      </div>
    </div>
  );
};
