import React from 'react';
import type { Question } from '../data/dsaQuestions';
import { LanguagePicker } from './LanguagePicker';
import { SolutionGate } from './SolutionGate';
import { SandboxFallback } from './SandboxFallback';

interface SolutionsTabProps {
  question: Question;
  approachesRevealed: boolean;
  onReveal: () => void;
  plan: string;
  onPlanChange: (next: string) => void;
}

/**
 * Leaner than Editorial on purpose: just each approach's name, complexity, and
 * code via LanguagePicker (Python and Java run; C++ and JavaScript are read-only
 * ports — see LanguagePicker.tsx for why). Intuition/algorithm prose lives in the
 * Editorial tab instead. Shares the exact same reveal gate as Editorial —
 * ProblemViewer owns the single `approachesRevealed` state.
 */
export const SolutionsTab: React.FC<SolutionsTabProps> = ({ question, approachesRevealed, onReveal, plan, onPlanChange }) => {
  if (question.approaches.length === 0) return <SandboxFallback question={question} />;
  if (!approachesRevealed) {
    return <SolutionGate question={question} plan={plan} onPlanChange={onPlanChange} onReveal={onReveal} />;
  }

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
              {app.name === 'Optimal' ? '🔥 Optimal Python Approach' : 'Approach: ' + app.name}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge" style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}>
                Time: {app.complexity.time}
              </span>
              <span className="badge" style={{ background: 'hsl(var(--secondary) / 0.15)', color: 'hsl(var(--secondary))' }}>
                Space: {app.complexity.space}
              </span>
            </div>
          </div>

          <div style={{ padding: '2rem' }}>
            <LanguagePicker pythonCode={app.code} translations={app.translations} examples={question.examples} />
          </div>
        </div>
      ))}
    </div>
  );
};
