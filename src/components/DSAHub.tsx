import React, { useState } from 'react';
import { Search, Bookmark, BookOpen, CheckSquare, Square, Info, HelpCircle, Code } from 'lucide-react';
import { dsaTopics, dsaQuestions, dsaTheories } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { PythonHighlighter } from './PythonHighlighter';

interface DSAHubProps {
  solvedQuestionIds: string[];
  bookmarkedQuestionIds: string[];
  onToggleSolved: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onSelectQuestion: (question: Question) => void;
}

export const DSAHub: React.FC<DSAHubProps> = ({
  solvedQuestionIds,
  bookmarkedQuestionIds,
  onToggleSolved,
  onToggleBookmark,
  onSelectQuestion,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('Arrays');
  const [activeSubTab, setActiveSubTab] = useState<'theory' | 'questions'>('questions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const theory = dsaTheories[selectedTopic];

  // Filter questions based on selected topic, search query, difficulty, status
  const filteredQuestions = dsaQuestions.filter((q) => {
    if (q.topic !== selectedTopic) return false;

    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'All' || q.difficulty === difficultyFilter;

    const isSolved = solvedQuestionIds.includes(q.id);
    const isBookmarked = bookmarkedQuestionIds.includes(q.id);
    let matchesStatus = true;
    if (statusFilter === 'Solved') matchesStatus = isSolved;
    else if (statusFilter === 'Unsolved') matchesStatus = !isSolved;
    else if (statusFilter === 'Bookmarked') matchesStatus = isBookmarked;

    return matchesSearch && matchesDifficulty && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          DSA <span className="gradient-text">SDE Sheet</span>
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>
          Restructured python-only syllabus. Broad academic theory, data structure implementations, and detailed problem tracing.
        </p>
      </div>

      {/* Topic Horizontal Navigator */}
      <div 
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid hsl(var(--border-color))'
        }}
      >
        {dsaTopics.map((topic) => (
          <button
            key={topic}
            className={`tab ${selectedTopic === topic ? 'active' : ''}`}
            onClick={() => {
              setSelectedTopic(topic);
              setSearchQuery('');
              setActiveSubTab('questions'); // Default to questions on swap
            }}
            style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Sub-nav switch for Theory vs. Questions */}
      <div 
        style={{
          display: 'flex',
          gap: '1rem',
          background: 'hsl(var(--bg-secondary) / 0.5)',
          padding: '0.25rem',
          borderRadius: '8px',
          width: 'fit-content',
          border: '1px solid hsl(var(--border-color))'
        }}
      >
        <button
          className={`btn ${activeSubTab === 'questions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem', borderRadius: '6px' }}
          onClick={() => setActiveSubTab('questions')}
        >
          <HelpCircle size={14} /> Questions ({filteredQuestions.length})
        </button>
        <button
          className={`btn ${activeSubTab === 'theory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem', borderRadius: '6px' }}
          onClick={() => setActiveSubTab('theory')}
        >
          <BookOpen size={14} /> Broad Theory & Code
        </button>
      </div>

      {activeSubTab === 'theory' && theory ? (
        /* Academic Theory view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--secondary))' }}>
              <BookOpen size={24} />
              <span>{selectedTopic} Concepts</span>
            </h2>
            <p style={{ color: 'hsl(var(--text-secondary))', lineHeight: '1.7', fontSize: '1rem', whiteSpace: 'pre-line' }}>
              {theory.summary}
            </p>
          </div>

          {/* Layered deep-dive sections */}
          {(theory.sections || []).map((section, idx) => (
            <div key={idx} className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'hsl(var(--primary))', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.6rem' }}>
                {section.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Content may embed ASCII diagrams inside ``` fences — render those in monospace */}
                {section.content.split('```').map((segment, segIdx) =>
                  segIdx % 2 === 1 ? (
                    <pre
                      key={segIdx}
                      style={{
                        margin: 0,
                        padding: '1rem 1.25rem',
                        background: 'hsl(var(--bg-secondary) / 0.6)',
                        border: '1px solid hsl(var(--border-color))',
                        borderRadius: '8px',
                        overflowX: 'auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        lineHeight: '1.5',
                        color: 'hsl(var(--secondary))'
                      }}
                    >
                      {segment.replace(/^\n/, '').replace(/\n$/, '')}
                    </pre>
                  ) : (
                    segment.trim() && (
                      <div key={segIdx} style={{ color: 'hsl(var(--text-secondary))', lineHeight: '1.75', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                        {segment.trim()}
                      </div>
                    )
                  )
                )}
              </div>
              {section.code && (
                <div className="code-container">
                  <PythonHighlighter code={section.code} />
                </div>
              )}
            </div>
          ))}

          {/* Academic implementations */}
          {theory.implementations.map((impl, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Code size={18} color="hsl(var(--primary))" />
                <span>{impl.title}</span>
              </h3>
              <div className="code-container">
                <PythonHighlighter code={impl.code} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Questions view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Things to Know Before Solving Card */}
          {theory && (
            <div 
              className="glass"
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                borderLeft: '4px solid hsl(var(--primary))',
                display: 'grid',
                gridTemplateColumns: '1fr 1.2fr',
                gap: '2rem'
              }}
            >
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--primary))' }}>
                  <Info size={16} /> Prerequisite Knowledge
                </h4>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {theory.preRequisites.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--secondary))' }}>
                  <Info size={16} /> Core CS Cheat Sheets
                </h4>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {theory.cheatSheet.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div 
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search 
                size={16} 
                color="hsl(var(--text-muted))" 
                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input
                type="text"
                placeholder={`Search ${selectedTopic} problems...`}
                className="input-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Select Filters */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <select
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Solved">Solved</option>
                <option value="Unsolved">Unsolved</option>
                <option value="Bookmarked">Bookmarked</option>
              </select>
            </div>
          </div>

          {/* Questions Grid */}
          <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            {filteredQuestions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                No questions found. Try applying other filters!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div 
                  className="question-row" 
                  style={{
                    background: 'hsl(var(--bg-secondary) / 0.8)',
                    borderBottom: '1px solid hsl(var(--border-color))',
                    cursor: 'default',
                    fontWeight: 700,
                    color: 'hsl(var(--text-muted))',
                    fontSize: '0.85rem'
                  }}
                >
                  <div>Solve</div>
                  <div>Problem Title</div>
                  <div>Topic Category</div>
                  <div>Difficulty</div>
                  <div style={{ textAlign: 'right' }}>Bookmark</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredQuestions.map((q) => {
                    const isSolved = solvedQuestionIds.includes(q.id);
                    const isBookmarked = bookmarkedQuestionIds.includes(q.id);
                    return (
                      <div 
                        key={q.id}
                        className="question-row"
                        style={{
                          borderBottom: '1px solid hsl(var(--border-color) / 0.5)'
                        }}
                      >
                        {/* Checkbox */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSolved(q.id);
                          }}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          {isSolved ? (
                            <CheckSquare size={18} color="hsl(var(--easy))" />
                          ) : (
                            <Square size={18} color="hsl(var(--text-muted))" />
                          )}
                        </div>

                        {/* Title */}
                        <div 
                          className="question-title"
                          onClick={() => onSelectQuestion(q)}
                        >
                          {q.title}
                        </div>

                        {/* Day & Topic */}
                        <div 
                          style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}
                          onClick={() => onSelectQuestion(q)}
                        >
                          Day {q.day} • {q.topic}
                        </div>

                        {/* Difficulty */}
                        <div onClick={() => onSelectQuestion(q)}>
                          <span className={`badge badge-${q.difficulty.toLowerCase()}`}>
                            {q.difficulty}
                          </span>
                        </div>

                        {/* Bookmark */}
                        <div 
                          style={{ textAlign: 'right' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark(q.id);
                          }}
                        >
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: isBookmarked ? 'hsl(var(--accent))' : 'hsl(var(--text-muted))'
                            }}
                          >
                            <Bookmark size={16} fill={isBookmarked ? 'hsl(var(--accent))' : 'none'} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
