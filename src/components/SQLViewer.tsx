import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Check, ExternalLink, Bookmark, CheckSquare, Square, Info } from 'lucide-react';
import type { SQLQuestion } from '../data/sqlQuestions';
import { readText, writeText } from '../utils/persistence';

interface SQLViewerProps {
  question: SQLQuestion;
  onBack: () => void;
  solvedSqlIds: string[];
  bookmarkedSqlIds: string[];
  onToggleSolved: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}

export const SQLViewer: React.FC<SQLViewerProps> = ({
  question,
  onBack,
  solvedSqlIds,
  bookmarkedSqlIds,
  onToggleSolved,
  onToggleBookmark,
}) => {
  const [copiedSolIdx, setCopiedSolIdx] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>(() => readText(`notes-${question.id}`));

  const isSolved = solvedSqlIds.includes(question.id);
  const isBookmarked = bookmarkedSqlIds.includes(question.id);

  useEffect(() => {
    setNotes(readText(`notes-${question.id}`));
    setCopiedSolIdx(null);
  }, [question.id]);

  const handleCopyQuery = async (queryText: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(queryText);
      setCopiedSolIdx(idx);
      setTimeout(() => setCopiedSolIdx(null), 2000);
    } catch {
      setCopiedSolIdx(null);
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
      {/* Header Bar */}
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
              LeetCode SQL Top 50 • Category: {question.topic}
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

        {/* Database Schema (SQL DDL) */}
        <div>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Database Schema (SQL DDL)</h4>
          <div className="code-container">
            <pre className="code-pre" style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
              <code>{question.schema}</code>
            </pre>
          </div>
        </div>

        {/* Example Tables */}
        {question.exampleData.length > 0 && (
          <div>
            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Example Tables</h4>
            <div className="sql-table-grid">
              {question.exampleData.map((table, tIdx) => (
                <div key={tIdx} className="sql-table">
                  <div className="sql-table-title">{table.tableName} Table</div>
                  <table className="sql-grid-data">
                    <thead>
                      <tr>
                        {table.headers.map((h, hIdx) => (
                          <th key={hIdx}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx}>{cell === null ? 'NULL' : cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expected Output */}
        {question.expectedOutput.rows.length > 0 && (
          <div>
            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'hsl(var(--secondary))' }}>
              Expected Output
            </h4>
            <div className="sql-table" style={{ width: 'fit-content', minWidth: '200px' }}>
              <table className="sql-grid-data">
                <thead>
                  <tr>
                    {question.expectedOutput.headers.map((h, hIdx) => (
                      <th key={hIdx}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {question.expectedOutput.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{cell === null ? 'NULL' : cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 2. SQL Solutions (Sequential) */}
      {question.solutions.length === 0 ? (
        /* SQL Challenge Sandbox fallback */
        <div className="glass" style={{ padding: '3rem 2rem', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <div 
            style={{
              background: 'hsl(var(--secondary-glow))',
              padding: '1.25rem',
              borderRadius: '50%',
              border: '1px solid hsl(var(--secondary))',
              color: 'hsl(var(--secondary))',
              width: '64px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}
          >
            📊
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>SQL Sandbox Workspace</h3>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
              We have not pre-coded optimal query solutions for this SQL problem yet. Open the link above to solve it on LeetCode, write your query, and record your join logic in the notes editor at the bottom!
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
        /* Queries in order */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {question.solutions.map((sol, solIdx) => (
            <div 
              key={sol.name}
              className="glass" 
              style={{ 
                borderRadius: '16px', 
                overflow: 'hidden',
                border: '1px solid hsl(var(--border-color))'
              }}
            >
              {/* Solution Title Bar */}
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Query Design: {sol.name}
                </h3>
              </div>

              {/* Solution Explanation */}
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Query evaluation breakdown</h4>
                  <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.6' }}>
                    {sol.explanation}
                  </p>
                </div>

                {/* Query Code Container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>SQL QUERY (ANSI standard)</span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => handleCopyQuery(sol.query, solIdx)}
                    >
                      {copiedSolIdx === solIdx ? <Check size={12} color="hsl(var(--easy))" /> : <Copy size={12} />}
                      <span>{copiedSolIdx === solIdx ? 'Copied' : 'Copy Query'}</span>
                    </button>
                  </div>

                  <div className="code-container">
                    <pre className="code-pre" style={{ background: '#090d16', fontSize: '0.85rem', color: 'hsl(var(--secondary))' }}>
                      <code>{sol.query}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. SQL Edge Cases */}
      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h4 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'hsl(var(--hard))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={16} /> SQL Edge Cases to watch
        </h4>
        <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {question.edgeCases.map((e, idx) => (
            <li key={idx}>{e}</li>
          ))}
        </ul>
      </div>

      {/* 4. Notes Scratchpad */}
      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h4 style={{ fontWeight: 700, fontSize: '1.25rem' }}>SQL Scratchpad & Joins Log</h4>
        <textarea
          placeholder="Write down join conditions, query steps, or CTE ideas..."
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
