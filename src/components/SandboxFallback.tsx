import React from 'react';
import type { Question } from '../data/dsaQuestions';

interface SandboxFallbackProps {
  question: Question;
}

/**
 * No pre-coded approaches for this question yet — shown by both the Editorial
 * and Solutions tabs (neither has anything else to offer), same fallback the
 * old single "Approaches" section used to render in place of the gate.
 */
export const SandboxFallback: React.FC<SandboxFallbackProps> = ({ question }) => (
  <div className="glass" style={{ padding: '3rem 2rem', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
    <div
      style={{
        background: 'hsl(var(--primary-glow))',
        padding: '1.25rem',
        borderRadius: '50%',
        border: '1px solid hsl(var(--primary))',
        color: 'hsl(var(--secondary))',
        width: '64px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem'
      }}
    >
      🚀
    </div>
    <div>
      <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Personal Challenge Sandbox</h3>
      <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
        We have not pre-coded optimal solutions for this problem yet. Open the link above to solve it on LeetCode, write your commented Python code, and record your logic in the notes editor at the bottom!
      </p>
    </div>
    <a
      href={question.leetcodeLink}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary"
      style={{ fontSize: '0.9rem', padding: '0.65rem 1.75rem' }}
    >
      Start Coding on LeetCode
    </a>
  </div>
);
