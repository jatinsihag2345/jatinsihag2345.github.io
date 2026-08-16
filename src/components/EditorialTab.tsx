import React from 'react';
import type { Question } from '../data/dsaQuestions';
import { GlossaryText } from './GlossaryText';
import { ReadAloud } from './ReadAloud';
import { BigOCurveButton } from './BigOExplorer';
import { CommonMistakes } from './CommonMistakes';
import { WhyChain } from './WhyChain';
import { HintLadder } from './HintLadder';
import { ClozeRecall } from './ClozeRecall';
import { DryRunSimulator } from './DryRunSimulator';
import { FollowUpSim } from './FollowUpSim';
import { BugHunt } from './BugHunt';
import { ProbeDrill } from './ProbeDrill';
import { SolutionGate } from './SolutionGate';
import { SandboxFallback } from './SandboxFallback';

interface EditorialTabProps {
  question: Question;
  approachesRevealed: boolean;
  onReveal: () => void;
  plan: string;
  onPlanChange: (next: string) => void;
  onHintsUsed: (n: number) => void;
}

/**
 * The pedagogical half of what used to be ProblemViewer's single gated
 * "Approaches" section, plus every other spoiler panel that used to sit below
 * it (dry run, follow-ups, bug hunt, probe drill) and the hint ladder / cloze
 * recall that used to live in "Your Turn". All of it gives away information
 * about the solution, so all of it stays behind the same reveal gate.
 *
 * Raw solution code is deliberately NOT here — see SolutionsTab.tsx for the
 * leaner, code-first view. This tab is intuition + algorithm trace + drills.
 */
export const EditorialTab: React.FC<EditorialTabProps> = ({
  question, approachesRevealed, onReveal, plan, onPlanChange, onHintsUsed,
}) => {
  if (question.approaches.length === 0) return <SandboxFallback question={question} />;
  if (!approachesRevealed) {
    return <SolutionGate question={question} plan={plan} onPlanChange={onPlanChange} onReveal={onReveal} />;
  }

  const optimalCode = question.approaches.find(app => app.name === 'Optimal')?.code || question.approaches[0]?.code || '';

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {question.approaches.map((app) => (
        <div
          key={app.name}
          className="glass"
          style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: app.name === 'Optimal' ? '1px solid hsl(var(--secondary) / 0.4)' : '1px solid hsl(var(--border-color))'
          }}
        >
          <div
            style={{
              padding: '1.25rem 2rem',
              background: 'hsl(var(--bg-secondary) / 0.5)',
              borderBottom: '1px solid hsl(var(--border-color))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: app.name === 'Optimal' ? 'hsl(var(--secondary))' : 'hsl(var(--text-primary))' }}>
              {app.name === 'Optimal' ? '🔥 Optimal Approach' : 'Approach: ' + app.name}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge" style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}>
                Time: {app.complexity.time}
              </span>
              <span className="badge" style={{ background: 'hsl(var(--secondary) / 0.15)', color: 'hsl(var(--secondary))' }}>
                Space: {app.complexity.space}
              </span>
              <BigOCurveButton token={app.complexity.time} />
            </div>
          </div>

          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                Intuition & logic
                <ReadAloud text={app.intuition} label={`the ${app.name} approach's intuition`} />
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.6' }}>
                <GlossaryText text={app.intuition} />
              </p>
            </div>

            <div>
              <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Step-by-step trace</h4>
              <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                <GlossaryText text={app.algorithm} />
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Curated slip-ups for THIS problem, after the last approach card so the
          fix reads while the code it fixes is still fresh. Renders nothing when
          the title has no entries. */}
      <CommonMistakes title={question.title} />
      {/* [learnsci] Why-chain — three chained whys while the mechanism they
          interrogate is still on screen. */}
      <WhyChain questionId={question.id} />

      <div className="no-print">
        <HintLadder question={question} onUnlock={onHintsUsed} />
      </div>
      <div className="no-print">
        <ClozeRecall questionId={question.id} code={optimalCode} />
      </div>

      <div className="no-print">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Interactive Dry Run & Execution Simulation</h3>
        <DryRunSimulator questionId={question.id} optimalCode={optimalCode} trace={question.trace} />
      </div>

      {/* The follow-ups panel (below the split, further down the page) lists the
          questions passively; this walks them one at a time and demands a
          written answer before showing anything. */}
      <div className="no-print">
        <FollowUpSim question={question} />
      </div>

      {/* Debug-this — a planted bug in the reference solution, repaired under the
          same tests. Renders nothing for questions without a bugHunt.json entry. */}
      <div className="no-print">
        <BugHunt question={question} />
      </div>

      {/* Probe drill — three interviewer probes aimed at this question's primary
          PATTERN. Renders nothing when the probe bank doesn't cover the pattern. */}
      <div className="no-print">
        <ProbeDrill question={question} />
      </div>
    </div>
  );
};
