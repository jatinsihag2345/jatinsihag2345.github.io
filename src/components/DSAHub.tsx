import React, { useEffect, useState } from 'react';
import { Search, Bookmark, BookOpen, CheckSquare, Square, Info, HelpCircle, Code } from 'lucide-react';
import { dsaTopics, dsaQuestions, dsaTheories } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { PythonHighlighter } from './PythonHighlighter';
import { RunnableCode } from './RunnableCode';
import { FigureBlock } from './FigureBlock';
import { GlossaryText } from './GlossaryText';
import { glossary } from '../data/glossary';
import { GlossDeck } from './GlossDeck';
import { TopicPackButton, TopicPackSheet } from './TopicPack';
import { useListNavigation } from '../utils/useListNavigation';
import { ReadingAids, CollapsibleSection } from './ReadingAids';
import { TransferTest } from './TransferTest';
import { CompanyCards, companiesOf } from './CompanyLens';
import { PatternDeck, tradeoffCount } from './PatternDeck';
import { consumePendingTheoryOpen } from './CommandPalette';

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
  // Interviews are pattern-matched, not topic-matched: nobody says "a Stack & Queue
  // question", they say "this smells like monotonic stack". The pattern lens regroups
  // the same 191 questions by the technique their optimal actually uses.
  const [lens, setLens] = useState<'topic' | 'pattern' | 'company'>('topic');
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  // Company folklore lens — the pattern lens's regrouping trick, keyed on where a
  // question is commonly reported. Null = the overview cards are on screen.
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  // Trade-off flashcards for one pattern: non-null replaces the pattern overview
  // grid with that pattern's deck (PatternDeck.tsx); its back button clears this.
  const [deckPattern, setDeckPattern] = useState<string | null>(null);

  // [discover] ⌘K Theory hits land here — same consume-then-listen shape as
  // CoreHub: sessionStorage covers "picked before this hub mounted", the
  // 'open-theory' event covers "picked while it was already on screen".
  const [theoryScrollIdx, setTheoryScrollIdx] = useState<number | null>(null);
  useEffect(() => {
    const applyPending = () => {
      const req = consumePendingTheoryOpen('dsa');
      if (!req) return;
      if (!dsaTheories[req.subjectOrTopic]) return;
      setLens('topic');
      setSelectedTopic(req.subjectOrTopic);
      setActiveSubTab('theory');
      setTheoryScrollIdx(req.sectionIndex);
    };
    applyPending();
    window.addEventListener('open-theory', applyPending);
    return () => window.removeEventListener('open-theory', applyPending);
  }, []);
  useEffect(() => {
    if (theoryScrollIdx === null) return;
    // Two frames: one for the topic swap to commit, one for layout to settle.
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelector(`[data-theory-section="${theoryScrollIdx}"]`)?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
      setTheoryScrollIdx(null);
    }));
    return () => cancelAnimationFrame(raf);
  }, [theoryScrollIdx]);

  const theory = dsaTheories[selectedTopic];

  // A question counts under EVERY pattern its optimal uses (primary first), so
  // "practice Monotonic Stack" surfaces all of them, not just the primary-tagged ones.
  const patternGroups = React.useMemo(() => {
    const map = new Map<string, Question[]>();
    dsaQuestions.forEach(q => (q.patterns || []).forEach(p => map.set(p, [...(map.get(p) || []), q])));
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, []);

  // Filter questions based on the active lens, search query, difficulty, status
  const filteredQuestions = dsaQuestions.filter((q) => {
    if (lens === 'topic') {
      if (q.topic !== selectedTopic) return false;
    } else if (lens === 'pattern') {
      if (!selectedPattern || !(q.patterns || []).includes(selectedPattern)) return false;
    } else {
      // Company lens: same shape as the pattern branch — no company picked yet means
      // the overview cards are on screen and this list stays empty behind them.
      if (!selectedCompany || !companiesOf(q.title).includes(selectedCompany)) return false;
    }

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

  // j/k walks a highlight cursor down the visible rows; o/Enter opens, s marks
  // solved, b bookmarks. The ⌘K palette jumps anywhere — this walks the list
  // you're already looking at, hands never leaving the keyboard.
  const listRef = React.useRef<HTMLDivElement>(null);
  const kbdIndex = useListNavigation({
    length: filteredQuestions.length,
    listRef,
    onOpen: (i) => onSelectQuestion(filteredQuestions[i]),
    onToggleSolved: (i) => onToggleSolved(filteredQuestions[i].id),
    onToggleBookmark: (i) => onToggleBookmark(filteredQuestions[i].id),
  });

  return (
    /* .dsa-screen scopes the "Print topic pack" page-swap CSS to this hub */
    <div className="dsa-screen" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Page header + lens switch share one row. Six stacked header blocks at a
          2rem gutter pushed the actual question list below the fold — a first-time
          visitor opened Arrays and concluded the sheet was empty. The list is the
          product; the chrome above it earns one row, not a screen. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.15 }}>
            DSA <span className="gradient-text">SDE Sheet</span>
          </h1>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.82rem' }}>
            191 problems · brute force → optimal · runnable, animated, reviewable
          </p>
        </div>

      {/* Lens switch — study by sheet topic, or by the pattern an interviewer would name */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.25rem', background: 'hsl(var(--bg-secondary) / 0.5)', padding: '0.25rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))' }}>
          <button
            className={`btn ${lens === 'topic' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.95rem', fontSize: '0.82rem', borderRadius: '6px' }}
            onClick={() => { setLens('topic'); setSelectedPattern(null); }}
          >
            By Topic
          </button>
          <button
            className={`btn ${lens === 'pattern' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.95rem', fontSize: '0.82rem', borderRadius: '6px' }}
            onClick={() => { setLens('pattern'); setActiveSubTab('questions'); }}
          >
            By Pattern
          </button>
          <button
            className={`btn ${lens === 'company' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.95rem', fontSize: '0.82rem', borderRadius: '6px' }}
            onClick={() => { setLens('company'); setActiveSubTab('questions'); }}
          >
            By Company
          </button>
        </div>
        {lens === 'pattern' && selectedPattern && (
          <button className="btn btn-secondary animate-fade" style={{ padding: '0.35rem 0.95rem', fontSize: '0.82rem' }} onClick={() => setSelectedPattern(null)}>
            ← All patterns
          </button>
        )}
        {lens === 'pattern' && selectedPattern && (
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedPattern}</span>
        )}
        {lens === 'company' && selectedCompany && (
          <button className="btn btn-secondary animate-fade" style={{ padding: '0.35rem 0.95rem', fontSize: '0.82rem' }} onClick={() => setSelectedCompany(null)}>
            ← All companies
          </button>
        )}
        {lens === 'company' && selectedCompany && (
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedCompany}</span>
        )}
      </div>

      </div>

      {/* Topic Horizontal Navigator */}
      {lens === 'topic' && (
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
      )}

      {/* Sub-nav switch for Theory vs. Questions */}
      {lens === 'topic' && (
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'hsl(var(--bg-secondary) / 0.5)',
          padding: '0.2rem',
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
      )}

      {/* [learnsci] Transfer test — on the pattern overview, any 100%-solved
          pattern earns a congratulation plus one of its own problems dealt back
          in disguise ("Mystery problem"). Renders nothing until then. */}
      {lens === 'pattern' && !selectedPattern && (
        <TransferTest solvedQuestionIds={solvedQuestionIds} onOpenQuestion={onSelectQuestion} />
      )}

      {lens === 'pattern' && !selectedPattern && deckPattern ? (
        /* Trade-off deck for one pattern — grades land in the same reviewSchedule
           ledger as problems and every other deck (ids tradeoff-<slug>-<i>). */
        <PatternDeck pattern={deckPattern} onBack={() => setDeckPattern(null)} />
      ) : lens === 'company' && !selectedCompany ? (
        /* Company overview — reported-question counts + solved coverage per company */
        <CompanyCards solvedQuestionIds={solvedQuestionIds} onPick={setSelectedCompany} />
      ) : lens === 'pattern' && !selectedPattern ? (
        /* Pattern overview — coverage per interview pattern, worst gaps obvious at a glance */
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem' }}>
          {patternGroups.map(([p, qs]) => {
            const solved = qs.filter(q => solvedQuestionIds.includes(q.id)).length;
            const pct = Math.round((solved / qs.length) * 100);
            const deckSize = tradeoffCount(p);
            return (
              <div
                key={p}
                className="glass lift"
                style={{
                  padding: '1.1rem 1.25rem', borderRadius: '14px',
                  border: '1px solid hsl(var(--border-color))',
                  display: 'flex', flexDirection: 'column', gap: '0.55rem',
                  background: 'transparent', color: 'hsl(var(--text-primary))',
                }}
              >
                <button
                  onClick={() => setSelectedPattern(p)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', padding: 0,
                    background: 'none', border: 'none', color: 'inherit',
                    display: 'flex', flexDirection: 'column', gap: '0.55rem',
                    font: 'inherit',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p}</span>
                  <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                    {solved}/{qs.length} solved
                  </span>
                </button>
                <div style={{ height: '6px', borderRadius: '3px', background: 'hsl(var(--bg-tertiary))', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: '3px',
                    background: pct === 100 ? 'hsl(var(--easy))' : 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                {deckSize > 0 && (
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', alignSelf: 'flex-start' }}
                    onClick={() => setDeckPattern(p)}
                    aria-label={`Open the ${p} trade-offs flashcard deck`}
                  >
                    Trade-offs · {deckSize} cards
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : activeSubTab === 'theory' && lens === 'topic' && theory ? (
        /* Academic Theory view — wrapped in ReadingAids (feature 49) for the
           progress bar, per-section collapse and back-to-top on this long read */
        <ReadingAids>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--secondary))' }}>
                <BookOpen size={24} />
                <span>{selectedTopic} Concepts</span>
              </h2>
              {/* Feature 34: this topic's theory + your notes + known slip-ups, on paper */}
              <TopicPackButton topic={selectedTopic} />
            </div>
            <p style={{ color: 'hsl(var(--text-secondary))', lineHeight: '1.7', fontSize: '1rem', whiteSpace: 'pre-line' }}>
              {theory.summary}
            </p>
          </div>

          {/* Layered deep-dive sections — collapsible for skimming (feature 49);
              CollapsibleSection reproduces the exact glass-card + h3 header this
              card had. Collapse state is session-only useState by design. */}
          {(theory.sections || []).map((section, idx) => (
            /* [discover] data-theory-section — ⌘K Theory hits scroll here */
            <div key={idx} data-theory-section={idx}>
              <CollapsibleSection title={section.title}>
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
                        <GlossaryText text={segment.trim()} />
                      </div>
                    )
                  )
                )}
              </div>
              {section.code && (
                <RunnableCode code={section.code} />
              )}
              <FigureBlock figKey={`dsa:${selectedTopic}:${idx}`} />
              </CollapsibleSection>
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

          {/* Glossary — every term the prose leans on, in one browsable place. The same
              definitions appear as hover tooltips wherever the terms occur in text. */}
          <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'hsl(var(--secondary))', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.6rem' }}>
              Glossary — the words this site keeps using
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
              Anywhere these appear in the text, hover (or focus) the dotted underline for the definition.
            </p>
            {/* Feature 33: the same terms as a recall deck — reading a definition
                is recognition; saying it before the flip is the interview skill. */}
            <GlossDeck />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '1.25rem' }}>
              {glossary.map(g => (
                <div key={g.term}>
                  <strong style={{ fontSize: '0.9rem', color: 'hsl(var(--text-primary))' }}>{g.term}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6, marginTop: '0.25rem' }}>
                    {g.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        </ReadingAids>
      ) : (
        /* Questions view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Things to Know Before Solving — COLLAPSED by default. It is genuinely
              useful and genuinely tall; expanded it was the last thing standing
              between a new visitor and the question list they came for. */}
          {lens === 'topic' && theory && (
            <details
              className="glass"
              style={{ borderRadius: '16px', borderLeft: '4px solid hsl(var(--primary))', padding: '0.9rem 1.25rem' }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: 'hsl(var(--primary))', listStyle: 'revert' }}>
                Before you start {selectedTopic}: prerequisites & cheat sheet
              </summary>
            <div 
              style={{
                paddingTop: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
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
            </details>
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

                <div className="stagger" ref={listRef} style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredQuestions.map((q, qi) => {
                    const isSolved = solvedQuestionIds.includes(q.id);
                    const isBookmarked = bookmarkedQuestionIds.includes(q.id);
                    return (
                      <div 
                        key={q.id}
                        className={`question-row${qi === kbdIndex ? ' kbd-focus' : ''}`}
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

                        {/* Title + the patterns an interviewer would name */}
                        <div
                          className="question-title"
                          onClick={() => onSelectQuestion(q)}
                        >
                          {q.title}
                          {(q.patterns || []).length > 0 && (
                            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                              {(q.patterns || []).slice(0, 2).map(p => (
                                <span
                                  key={p}
                                  style={{
                                    fontSize: '0.62rem', padding: '0.08rem 0.45rem', borderRadius: '999px',
                                    background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                                    color: 'hsl(var(--text-muted))', fontWeight: 600,
                                  }}
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
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

      {/* Feature 34: the paper topic pack — never visible on screen; revealed by
          html[data-print="topic"] while every on-screen sibling is hidden. */}
      <TopicPackSheet topic={selectedTopic} />
    </div>
  );
};
