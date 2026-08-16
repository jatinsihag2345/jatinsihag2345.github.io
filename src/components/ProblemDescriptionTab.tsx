import React from 'react';
import { Info, Tag, Building2, Lightbulb } from 'lucide-react';
import type { Question } from '../data/dsaQuestions';
import { GlossaryText } from './GlossaryText';
import { CodeText } from './CodeText';
import { ReadAloud } from './ReadAloud';
import companyTags from '../data/companyTags.json';

interface ProblemDescriptionTabProps {
  question: Question;
  /** The pill row's "Hint" chip jumps to Editorial rather than owning its own
   *  gated hint content — HintLadder lives there and stays behind the single
   *  approachesRevealed gate ProblemViewer owns. */
  onOpenEditorial: () => void;
}

const pillStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
  padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
  color: 'hsl(var(--text-secondary))',
};

/** The indented example body: a left rule instead of a full box, which is what
 *  makes an example read as a quoted transcript rather than another card. */
const exampleBody: React.CSSProperties = {
  borderLeft: '3px solid hsl(var(--border-glow))',
  borderRadius: '0 6px 6px 0',
  background: 'hsl(var(--bg-secondary) / 0.45)',
  padding: '0.55rem 0.9rem',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  lineHeight: 1.75,
  color: 'hsl(var(--text-secondary))',
  // Long inputs scroll inside the block rather than widening the whole pane.
  overflowX: 'auto',
  wordBreak: 'break-word',
};

const exampleLabel: React.CSSProperties = { fontWeight: 700, color: 'hsl(var(--text-primary))' };

/**
 * The LeetCode "Description" tab: title + difficulty, the Topics/Companies/Hint
 * pill row, problem statement, example walkthrough, constraints, and the
 * "Key things to know" prerequisites card. Ungated — this is always the
 * default view of a problem, revealed or not.
 */
export const ProblemDescriptionTab: React.FC<ProblemDescriptionTabProps> = ({ question, onOpenEditorial }) => {
  const companies = (companyTags as Record<string, string[]>)[question.title] ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{question.title}</h2>
          <span className={`badge badge-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
          Day {question.day} • {question.topic}
        </span>
        {/* Folklore, not fact: aggregated from widely-shared interview reports, so
            the copy says "commonly reported at" — never "asked by". */}
        {companies.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>Commonly reported at</span>
            {companies.map((company) => (
              <span
                key={company}
                style={{
                  fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.55rem',
                  borderRadius: '999px', background: 'hsl(var(--bg-tertiary))',
                  border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-secondary))',
                  whiteSpace: 'nowrap',
                }}
              >
                {company}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Topics / Companies / Hint — LeetCode's pill row under the title. Topics
          and Companies are informational chips (the data's already shown above);
          Hint is the one live control, and it is honest about what it does: it
          switches to Editorial, which owns the real (gated) hint ladder — this
          pill never leaks a hint on its own. */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={pillStyle}><Tag size={12} />{question.topic}</span>
        <span style={pillStyle}>
          <Building2 size={12} />
          {companies.length > 0 ? `${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}` : 'No company data'}
        </span>
        <button type="button" style={{ ...pillStyle, cursor: 'pointer' }} onClick={onOpenEditorial}>
          <Lightbulb size={12} />Hint
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Description</h3>
        <ReadAloud text={question.problemStatement} label="the problem statement" />
      </div>
      <p style={{ lineHeight: '1.7', fontSize: '1rem', color: 'hsl(var(--text-secondary))' }}>
        <CodeText text={question.problemStatement} />
      </p>

      {/* Each example is its own "Example N:" heading plus an indented, left-ruled
          transcript — the shape the statement itself is written in, rather than a
          run of identical cards. */}
      {question.examples.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
          {question.examples.map((example, idx) => (
            <div key={idx}>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.45rem' }}>
                Example {idx + 1}:
              </h4>
              <div style={exampleBody}>
                <div><span style={exampleLabel}>Input:</span> {example.input}</div>
                <div><span style={exampleLabel}>Output:</span> {example.output}</div>
                {example.explanation && (
                  <div><span style={exampleLabel}>Explanation:</span> {example.explanation}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Constraints:</h4>
        <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: 1.6 }}>
          {question.constraints.map((c, idx) => (
            <li key={idx}><CodeText text={c} /></li>
          ))}
        </ul>
      </div>

      <div style={{ borderLeft: '4px solid hsl(var(--secondary))', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--secondary))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={16} /> Key Things to Know Before Solving
        </h4>
        {question.prerequisites && question.prerequisites.length > 0 ? (
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {question.prerequisites.map((p, idx) => (
              <li key={idx}><GlossaryText text={p} /></li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
            Make sure you understand how mutable references are handled in Python lists. Watch out for edge cases containing empty list elements, duplicate values, and potential integer overflow.
          </p>
        )}
      </div>
    </div>
  );
};
