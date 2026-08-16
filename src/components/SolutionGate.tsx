import React from 'react';
import type { Question } from '../data/dsaQuestions';
import { ComplexityQuiz } from './ComplexityQuiz';
import { CalibrationPrompt } from './CalibrationPrompt';

interface SolutionGateProps {
  question: Question;
  plan: string;
  onPlanChange: (next: string) => void;
  onReveal: () => void;
}

/**
 * Active-recall gate — reading a solution you have not attempted feels like
 * learning and mostly is not. The gate costs one honest sentence; skipping is
 * always allowed, never silently default.
 *
 * Shared verbatim by the Editorial and Solutions tabs (ProblemViewer owns the
 * single `approachesRevealed` state and passes the same `onReveal` to both, so
 * clearing the gate from either tab unlocks both). This is a straight
 * extraction of what used to be ProblemViewer's inline gate card — the INTERNAL
 * logic (textarea, ComplexityQuiz, CalibrationPrompt, the three unlock buttons)
 * is untouched; only where it renders from has moved.
 */
export const SolutionGate: React.FC<SolutionGateProps> = ({ question, plan, onPlanChange, onReveal }) => (
  <div className="glass animate-in" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid hsl(var(--secondary))', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    {/* The exit lives at the TOP. Buried under a textarea, a quiz and a
        calibration prompt, it read as "the solutions are gone". */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
        Solution ready — hints, approaches, dry run, all of it — one step first
      </h3>
      <button className="btn btn-secondary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
        onClick={onReveal}>
        Skip → View Solution
      </button>
    </div>
    <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.65 }}>
      In one or two sentences: what approach would you try, and what would it cost in time and
      space? Writing it down first is what makes the solution below stick — you will be
      comparing it against <em>your</em> idea instead of just nodding along.
    </p>
    <textarea
      value={plan}
      onChange={e => onPlanChange(e.target.value)}
      placeholder='e.g. "Sort, then walk two pointers from both ends — O(n log n) time, O(1) extra."'
      rows={3}
      style={{
        width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.88rem',
        lineHeight: 1.6, padding: '0.85rem 1rem', borderRadius: '10px',
        background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
        border: '1px solid hsl(var(--border-color))', outline: 'none',
      }}
    />
    <ComplexityQuiz question={question} />
    {/* [learnsci] Calibration: predict your first run BEFORE you can peek —
        scored by the Stats calibration card via dsa:tests-passed/-failed.
        Hard questions also get the optional pre-mortem line, echoed by the
        error journal if the predicted failure actually lands. */}
    <CalibrationPrompt questionId={question.id} difficulty={question.difficulty} />
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button
        className="btn btn-primary"
        disabled={plan.trim().length < 10}
        onClick={onReveal}
      >
        I have committed — View Solution
      </button>
      {plan.trim().length < 10 && (
        <span style={{ alignSelf: 'center', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
          at least one short sentence unlocks it
        </span>
      )}
      {/* "Just let me read this time" used to live here too, identical to the
          "Skip → View Solution" button above — a second copy of the same exit
          made sense when this card was reached by a long scroll and the top one
          could be missed; reached by a tab click, one is enough. */}
      <button
        className="btn btn-secondary"
        style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
        onClick={() => {
          // A gate you must re-clear on every visit becomes a toll booth.
          localStorage.setItem('gate-disabled', '1');
          onReveal();
        }}
        title="Solutions will open directly from now on. Re-enable in Settings."
      >
        Turn this gate off
      </button>
    </div>
  </div>
);
