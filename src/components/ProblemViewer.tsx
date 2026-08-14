import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Check, ExternalLink, Bookmark, CheckSquare, Square, Info } from 'lucide-react';
import type { Question } from '../data/dsaQuestions';
import { PythonHighlighter } from './PythonHighlighter';
import { DryRunSimulator } from './DryRunSimulator';
import { readText, writeText } from '../utils/persistence';

interface ProblemViewerProps {
  question: Question;
  onBack: () => void;
  solvedQuestionIds: string[];
  bookmarkedQuestionIds: string[];
  onToggleSolved: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}

export const ProblemViewer: React.FC<ProblemViewerProps> = ({
  question,
  onBack,
  solvedQuestionIds,
  bookmarkedQuestionIds,
  onToggleSolved,
  onToggleBookmark,
}) => {
  const [copiedAppIdx, setCopiedAppIdx] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>(() => readText(`notes-${question.id}`));

  const isSolved = solvedQuestionIds.includes(question.id);
  const isBookmarked = bookmarkedQuestionIds.includes(question.id);

  useEffect(() => {
    setNotes(readText(`notes-${question.id}`));
    setCopiedAppIdx(null);
  }, [question.id]);

  const handleCopyCode = async (codeText: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopiedAppIdx(idx);
      setTimeout(() => setCopiedAppIdx(null), 2000);
    } catch {
      setCopiedAppIdx(null);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    writeText(`notes-${question.id}`, e.target.value);
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2.5rem', 
        maxWidth: '900px', 
        margin: '0 auto', 
        paddingBottom: '5rem' 
      }}
    >
      {/* Header bar */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid hsl(var(--border-color))',
          paddingBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button className="btn btn-secondary" style={{ padding: '0.6rem' }} onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>{question.title}</h1>
              <span className={`badge badge-${question.difficulty.toLowerCase()}`}>
                {question.difficulty}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
              Day {question.day} • {question.topic}
            </span>
          </div>
        </div>

        {/* Action Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
            onClick={() => onToggleSolved(question.id)}
          >
            {isSolved ? (
              <>
                <CheckSquare size={16} color="hsl(var(--easy))" />
                <span style={{ color: 'hsl(var(--easy))' }}>Solved</span>
              </>
            ) : (
              <>
                <Square size={16} />
                <span>Mark Solved</span>
              </>
            )}
          </button>

          <button 
            className="btn btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontSize: '0.9rem',
              color: isBookmarked ? 'hsl(var(--accent))' : 'hsl(var(--text-primary))'
            }}
            onClick={() => onToggleBookmark(question.id)}
          >
            <Bookmark size={16} fill={isBookmarked ? 'hsl(var(--accent))' : 'none'} />
            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>

          <a 
            href={question.leetcodeLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.65rem 1.25rem' }}
          >
            <span>LeetCode</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* 1. Problem Description */}
      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.5rem' }}>
          Problem Statement
        </h3>
        <p style={{ lineHeight: '1.7', fontSize: '1rem', color: 'hsl(var(--text-secondary))' }}>
          {question.problemStatement}
        </p>

        {/* Examples */}
        {question.examples.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Example Walkthrough</h4>
            {question.examples.map((example, idx) => (
              <div 
                key={idx} 
                style={{
                  background: 'hsl(var(--bg-secondary) / 0.5)',
                  border: '1px solid hsl(var(--border-color))',
                  borderRadius: '8px',
                  padding: '1rem'
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  <div><strong>Input:</strong> {example.input}</div>
                  <div><strong>Output:</strong> {example.output}</div>
                  {example.explanation && (
                    <div style={{ marginTop: '0.5rem', color: 'hsl(var(--text-muted))' }}>
                      <strong>Explanation:</strong> {example.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Constraints */}
        <div style={{ marginTop: '0.5rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Data Constraints</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {question.constraints.map((c, idx) => (
              <li key={idx} style={{ fontFamily: 'var(--font-mono)' }}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 2. Prerequisites & What to Know */}
      <div 
        className="glass"
        style={{
          padding: '1.5rem 2rem',
          borderRadius: '16px',
          borderLeft: '4px solid hsl(var(--secondary))',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}
      >
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--secondary))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={16} /> Key Things to Know Before Solving
        </h4>
        {question.prerequisites && question.prerequisites.length > 0 ? (
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {question.prerequisites.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
            Make sure you understand how mutable references are handled in Python lists. Watch out for edge cases containing empty list elements, duplicate values, and potential integer overflow.
          </p>
        )}
      </div>

      {/* 3. Approaches (Brute Force to Optimal) */}
      {question.approaches.length === 0 ? (
        /* Personal Sandbox fallback if approaches not coded */
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
      ) : (
        /* Sequential approaches */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {question.approaches.map((app, appIdx) => (
            <div 
              key={app.name}
              className="glass" 
              style={{ 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: app.name === 'Optimal' ? '1px solid hsl(var(--secondary) / 0.4)' : '1px solid hsl(var(--border-color))' 
              }}
            >
              {/* Approach Title Bar */}
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: app.name === 'Optimal' ? 'hsl(var(--secondary))' : 'white' }}>
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

              {/* Approach Details */}
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Intuition & logic</h4>
                  <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.6' }}>
                    {app.intuition}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Step-by-step trace</h4>
                  <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {app.algorithm}
                  </p>
                </div>

                {/* Code Container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>PYTHON IMPLEMENTATION</span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => handleCopyCode(app.code, appIdx)}
                    >
                      {copiedAppIdx === appIdx ? <Check size={12} color="hsl(var(--easy))" /> : <Copy size={12} />}
                      <span>{copiedAppIdx === appIdx ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>

                  <div className="code-container">
                    <PythonHighlighter code={app.code} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Interactive Dry Run & Code Simulation Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Interactive Dry Run & Execution Simulation</h3>
        <DryRunSimulator 
          questionId={question.id} 
          optimalCode={question.approaches.find(app => app.name === 'Optimal')?.code || (question.approaches[0]?.code || '')} 
          trace={question.trace}
        />
      </div>

      {/* 5. Edge Cases & Follow Ups */}
      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'hsl(var(--hard))', marginBottom: '0.75rem' }}>MAANG Interview Edge Cases</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {question.edgeCases.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'hsl(var(--secondary))', marginBottom: '0.75rem' }}>MAANG Follow-up Questions</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {question.followUps.map((f, idx) => (
              <li key={idx}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. Notes Scratchpad */}
      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h4 style={{ fontWeight: 700, fontSize: '1.25rem' }}>My Notes & Complexity Trace</h4>
        <textarea
          placeholder="Write down edge cases, your thoughts, or checklist items here..."
          style={{
            width: '100%',
            height: '140px',
            background: 'hsl(var(--bg-secondary))',
            border: '1px solid hsl(var(--border-color))',
            borderRadius: '8px',
            color: 'white',
            padding: '1rem',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9rem',
            outline: 'none',
            resize: 'none',
            lineHeight: '1.6'
          }}
          value={notes}
          onChange={handleNotesChange}
        />
      </div>
    </div>
  );
};
