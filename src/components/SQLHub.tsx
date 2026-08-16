import React, { useState } from 'react';
import { Search, Bookmark, Database, BookOpen, CheckSquare, Square, ChevronDown, ChevronUp, FlaskConical, Layers } from 'lucide-react';
import { SqlSandbox } from './SqlSandbox';
import { SqlDeck } from './SqlDeck';
import { sqlTopics, sqlQuestions, sqlTheories } from '../data/sqlQuestions';
import { FigureBlock } from './FigureBlock';
import type { SQLQuestion } from '../data/sqlQuestions';

interface SQLHubProps {
  solvedSqlIds: string[];
  bookmarkedSqlIds: string[];
  onToggleSolved: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onSelectQuestion: (question: SQLQuestion) => void;
}

export const SQLHub: React.FC<SQLHubProps> = ({
  solvedSqlIds,
  bookmarkedSqlIds,
  onToggleSolved,
  onToggleBookmark,
  onSelectQuestion,
}) => {
  // Two more surfaces share the hub: a freeform sandbox and a flashcard deck.
  const [activeTab, setActiveTab] = useState<'questions' | 'theory' | 'sandbox' | 'cards'>('questions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');
  const [expandedTheoryId, setExpandedTheoryId] = useState<string | null>('sql-th-1');

  // Filter SQL questions
  const filteredQuestions = sqlQuestions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
    const matchesTopic = topicFilter === 'All' || q.topic === topicFilter;

    return matchesSearch && matchesDifficulty && matchesTopic;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          SQL <span className="gradient-text">Top 50</span>
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>
          Master essential SQL query design. Learn Joins, Subqueries, CTEs, and Window Functions needed to solve LeetCode Top 50 SQL questions.
        </p>
      </div>

      {/* Mode Switcher */}
      <div 
        style={{
          display: 'flex',
          gap: '1.5rem',
          borderBottom: '1px solid hsl(var(--border-color))',
          paddingBottom: '0.5rem'
        }}
      >
        <button
          className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
          style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Database size={18} />
          <span>LeetCode SQL Top 50</span>
        </button>
        <button
          className={`tab ${activeTab === 'theory' ? 'active' : ''}`}
          onClick={() => setActiveTab('theory')}
          style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <BookOpen size={18} />
          <span>Interactive Syllabus / Theory</span>
        </button>
        <button
          className={`tab ${activeTab === 'sandbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('sandbox')}
          style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FlaskConical size={18} />
          <span>Sandbox</span>
        </button>
        <button
          className={`tab ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('cards')}
          style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Layers size={18} />
          <span>Flashcards</span>
        </button>
      </div>

      {/* Sandbox and Flashcards are additive surfaces with their own components;
          Questions/Theory keep their original ternary below untouched. */}
      {activeTab === 'sandbox' && <SqlSandbox />}
      {activeTab === 'cards' && <SqlDeck />}

      {activeTab === 'theory' ? (
        /* SQL Theory Layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sqlTheories.map((theory, theoryIdx) => {
            const isExpanded = expandedTheoryId === theory.id;
            return (
              <div 
                key={theory.id}
                className="glass"
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div
                  onClick={() => setExpandedTheoryId(isExpanded ? null : theory.id)}
                  style={{
                    padding: '1.5rem',
                    background: 'hsl(var(--bg-secondary) / 0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isExpanded ? '1px solid hsl(var(--border-color))' : 'none'
                  }}
                >
                  <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <BookOpen size={20} color="hsl(var(--secondary))" />
                    <span>{theory.title}</span>
                  </h3>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>

                {isExpanded && (
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <p style={{ color: 'hsl(var(--text-secondary))', lineHeight: '1.6', fontSize: '0.95rem' }}>
                      {theory.summary}
                    </p>

                    {/* The diagram for this section, when one exists — keyed by the
                        section's own title and position, same contract as the DSA and
                        Core CS hubs. */}
                    <FigureBlock figKey={`sql:${theory.title}:${theoryIdx}`} />

                    <div>
                      <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'hsl(var(--secondary))' }}>
                        Practical SQL Examples
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {theory.examples.map((example, idx) => (
                          <div 
                            key={idx}
                            style={{
                              borderLeft: '3px solid hsl(var(--primary))',
                              paddingLeft: '1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem'
                            }}
                          >
                            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                              {example.description}
                            </span>
                            <div className="code-container">
                              <pre className="code-pre" style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                <code>{example.query}</code>
                              </pre>
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', lineHeight: '1.4' }}>
                              💡 {example.explanation}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : activeTab === 'questions' ? (
        /* SQL Questions Layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                placeholder="Search SQL problems..."
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
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
              >
                <option value="All">All Topics</option>
                {sqlTopics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

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
            </div>
          </div>

          {/* SQL Questions List */}
          <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            {filteredQuestions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                No SQL questions found. Try applying other filters!
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
                  <div>SQL Problem Title</div>
                  <div>Topic Category</div>
                  <div>Difficulty</div>
                  <div style={{ textAlign: 'right' }}>Bookmark</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredQuestions.map((q) => {
                    const isSolved = solvedSqlIds.includes(q.id);
                    const isBookmarked = bookmarkedSqlIds.includes(q.id);
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

                        {/* Topic */}
                        <div 
                          style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}
                          onClick={() => onSelectQuestion(q)}
                        >
                          {q.topic}
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
      ) : null}
    </div>
  );
};
