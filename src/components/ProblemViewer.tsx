import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ExternalLink, Bookmark, CheckSquare, Square, ChevronLeft, ChevronRight, Shuffle,
  FileText, BookOpen, FlaskConical, History,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Question } from '../data/dsaQuestions';
import { PythonPlayground } from './PythonPlayground';
import { RecallRating } from './RecallRating';
import { readHintsUsed } from './HintLadder';
import { PrintButton } from './PrintButton';
import { readText, writeText, STORAGE_KEYS } from '../utils/persistence';
import { ResizeHandle, useSplitRatio } from './ResizeHandle';
import { pushRecentQuestion } from '../utils/recentQuestions';
import { ExplainBack } from './ExplainBack';
import { Whiteboard } from './Whiteboard';
import { PeerReviewComposer } from './PeerReviewComposer';
import { SimilarProblems } from './SimilarProblems';
import { NoteHistory, maybeSnapshotNote } from './NoteHistory';
import { ProblemDescriptionTab } from './ProblemDescriptionTab';
import { EditorialTab } from './EditorialTab';
import { SolutionsTab } from './SolutionsTab';
import { SubmissionsTab } from './SubmissionsTab';
import { SolutionGate, SolutionGateHoisted } from './SolutionGate';

interface ProblemViewerProps {
  question: Question;
  onBack: () => void;
  solvedQuestionIds: string[];
  bookmarkedQuestionIds: string[];
  onToggleSolved: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  /** Topic-order navigation. All optional: the viewer renders one question and
   *  works standalone (drill jumps, palette jumps) when App wires no neighbours. */
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  /** Jump to a random unsolved problem anywhere in the sheet. */
  onRandom?: () => void;
  /** Optional: lets the similar-problems card swap the open problem in place. */
  onOpenQuestion?: (q: Question) => void;
}

type TabKey = 'description' | 'editorial' | 'solutions' | 'submissions';

/** ≈ the 1fr / 1.2fr this split shipped with, now expressed as the left pane's share. */
const DEFAULT_COLUMN_SPLIT = 0.45;

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'description', label: 'Description', icon: FileText },
  { key: 'editorial', label: 'Editorial', icon: BookOpen },
  { key: 'solutions', label: 'Solutions', icon: FlaskConical },
  { key: 'submissions', label: 'Submissions', icon: History },
];

/**
 * A LeetCode-style split page: a tabbed left column (Description / Editorial /
 * Solutions / Submissions) and a right column carrying the Code panel and its
 * Testcase/Result panel (PythonPlayground — see its own file for the internal
 * pp-code-pane / pp-test-pane split). Everything that doesn't fit either column
 * — the whiteboard, peer review, edge cases, similar problems, notes — keeps
 * scrolling below the split, same as the rest of this app's pages.
 */
export const ProblemViewer: React.FC<ProblemViewerProps> = ({
  question,
  onBack,
  solvedQuestionIds,
  bookmarkedQuestionIds,
  onToggleSolved,
  onToggleBookmark,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onRandom,
  onOpenQuestion,
}) => {
  const [notes, setNotes] = useState<string>(() => readText(`notes-${question.id}`));
  // Active-recall gate: sessionStorage (not localStorage) on purpose — the gate should
  // greet you again on your NEXT visit, because re-deriving the plan is the exercise.
  const [approachesRevealed, setApproachesRevealed] = useState<boolean>(
    () =>
      localStorage.getItem('gate-disabled') === '1' ||
      sessionStorage.getItem(`revealed-${question.id}`) === '1',
  );
  // Tracked, not just read inline, because the "gate is off" line below needs to
  // appear the moment the gate card turns itself off — and disappear again when
  // the learner turns it back on without leaving the page.
  const [gateDisabled, setGateDisabled] = useState<boolean>(() => localStorage.getItem('gate-disabled') === '1');
  const [plan, setPlan] = useState<string>(() => readText(`plan-${question.id}`));
  // Lifted from HintLadder so RecallRating can caveat the rating with the hint count.
  const [hintsUsed, setHintsUsed] = useState<number>(() => readHintsUsed(question.id));
  const [activeTab, setActiveTab] = useState<TabKey>('description');
  const splitRef = useRef<HTMLDivElement>(null);
  const columnSplit = useSplitRatio(STORAGE_KEYS.viewerSplitRatio, DEFAULT_COLUMN_SPLIT);

  const isSolved = solvedQuestionIds.includes(question.id);
  const isBookmarked = bookmarkedQuestionIds.includes(question.id);

  useEffect(() => {
    setNotes(readText(`notes-${question.id}`));
    setApproachesRevealed(
      localStorage.getItem('gate-disabled') === '1' ||
        sessionStorage.getItem(`revealed-${question.id}`) === '1',
    );
    setGateDisabled(localStorage.getItem('gate-disabled') === '1');
    setPlan(readText(`plan-${question.id}`));
    setHintsUsed(readHintsUsed(question.id));
    setActiveTab('description');
    // Tell the focus timer (and anything else listening) which problem is on screen —
    // and, on the way out, that no problem is. Without the close half, minutes keep
    // banking against a problem the learner left an hour ago.
    window.dispatchEvent(new CustomEvent('question-open', { detail: { id: question.id } }));
    // Feed the Dashboard's "Continue where you left off" trail — opening IS the signal.
    pushRecentQuestion(question.id);
    return () => {
      window.dispatchEvent(new CustomEvent('question-open', { detail: { id: null } }));
    };
  }, [question.id]);

  const revealApproaches = () => {
    sessionStorage.setItem(`revealed-${question.id}`, '1');
    setApproachesRevealed(true);
  };

  /** The way back from "Turn this gate off", which is otherwise a one-way door:
   *  nothing else in the app clears `gate-disabled`. The problem already on
   *  screen stays open — re-gating it under the reader mid-sentence would hide
   *  what they came for — so this visit is marked revealed and the gate returns
   *  on the next problem. */
  const reenableGate = () => {
    localStorage.removeItem('gate-disabled');
    sessionStorage.setItem(`revealed-${question.id}`, '1');
    setGateDisabled(false);
  };

  const handlePlanChange = (next: string) => {
    setPlan(next);
    writeText(`plan-${question.id}`, next);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    writeText(`notes-${question.id}`, e.target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingBottom: '5rem' }}>
      {/* Top toolbar — LeetCode's toolbar also carries a run/submit/notepad/AI
          zone (center-right) and a login/premium zone (far right); this app has
          no accounts to log into and Run/Check already lives in the Code
          panel's own toolbar (see PythonPlayground.tsx), so both are simply
          omitted rather than filled with dead buttons. What's left maps
          directly: back + prev/next/shuffle on the left, this app's own real
          per-problem actions on the right. */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" style={{ padding: '0.6rem' }} onClick={onBack} aria-label="Back to problem list" title="Problem List">
            <ArrowLeft size={18} />
          </button>
          {(onPrev || onNext) && (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.6rem' }}
                aria-label="Previous problem in this topic"
                title="Previous in topic"
                disabled={!hasPrev}
                onClick={onPrev}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.6rem' }}
                aria-label="Next problem in this topic"
                title="Next in topic"
                disabled={!hasNext}
                onClick={onNext}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          {onRandom && (
            <button
              className="btn btn-secondary"
              style={{ padding: '0.6rem' }}
              aria-label="Open a random unsolved problem"
              title="Random unsolved problem"
              onClick={onRandom}
            >
              <Shuffle size={16} />
            </button>
          )}
        </div>

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

          <PrintButton />

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

      {/* The split: Description/Editorial/Solutions/Submissions on the left,
          Code + Testcase/Result on the right. .viewer-container / .viewer-pane /
          .pane-header / .pane-body already existed in index.css for exactly
          this shape (collapses to one column at <=1024px — see that file). */}
      <div
        className="viewer-container"
        ref={splitRef}
        style={{ ['--viewer-split' as string]: columnSplit.ratio }}
      >
        <div className="viewer-pane glass">
          {/* .tabs-container already carries the header look (border, background,
              padding) this pane's header needs — no separate .pane-header. */}
          <div className="tabs-container" role="tablist" aria-label="Problem sections">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`tab${activeTab === key ? ' active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={() => setActiveTab(key)}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="pane-body">
            {/* ONE gate for both tabs. Editorial and Solutions each render their
                own <SolutionGate>, and since all four panels stay mounted (below),
                both were alive at once — two ComplexityQuiz/CalibrationPrompt
                pairs, each writing its whole store back from what it read at
                mount, so answering on the second tab wiped the first tab's
                history. Hoisting the gate here makes it a single instance with a
                single store, exactly as `plan` already is; the copies inside the
                panels stand down via SolutionGateHoisted. It stays mounted while
                the gate is up (hidden on Description) so a half-answered quiz
                survives a tab switch, same reason the panels do. Approach-less
                questions never gate — both tabs return SandboxFallback first. */}
            {!approachesRevealed && question.approaches.length > 0 && (
              <div style={{ display: activeTab === 'editorial' || activeTab === 'solutions' ? undefined : 'none' }}>
                <SolutionGate
                  question={question}
                  plan={plan}
                  onPlanChange={handlePlanChange}
                  onReveal={revealApproaches}
                  onDisableGate={() => setGateDisabled(true)}
                />
              </div>
            )}
            {/* "Turn this gate off" is app-wide and permanent, and Settings has no
                control for it — so the way back lives where the gate used to be. */}
            {gateDisabled && question.approaches.length > 0 && (activeTab === 'editorial' || activeTab === 'solutions') && (
              <div
                className="no-print"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                  marginBottom: '1.5rem', padding: '0.6rem 0.9rem', borderRadius: '10px',
                  border: '1px dashed hsl(var(--border-color))', fontSize: '0.78rem',
                  color: 'hsl(var(--text-muted))',
                }}
              >
                <span>Recall gate is off — every problem opens straight to the solution.</span>
                <button
                  className="btn btn-secondary"
                  style={{ marginLeft: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                  onClick={reenableGate}
                >
                  Turn the gate back on
                </button>
              </div>
            )}
            {/* All four tabs stay MOUNTED (never conditionally unmount) — only CSS
                visibility toggles which one shows. Two reasons: (1) print — the print
                stylesheet forces every .tab-panel visible (see index.css), which only
                works if the content actually exists in the DOM; unmounting inactive
                tabs silently dropped Editorial/Solutions from a printed page even
                though the learner had already revealed them. (2) it keeps each tab's
                own internal state (HintLadder's unlock count, DryRunSimulator's step,
                etc.) alive across tab switches instead of resetting on every visit. */}
            <SolutionGateHoisted.Provider value={true}>
              <div className="tab-panel" style={{ display: activeTab === 'description' ? undefined : 'none' }}>
                <ProblemDescriptionTab question={question} onOpenEditorial={() => setActiveTab('editorial')} />
              </div>
              <div className="tab-panel" style={{ display: activeTab === 'editorial' ? undefined : 'none' }}>
                <EditorialTab
                  question={question}
                  approachesRevealed={approachesRevealed}
                  onReveal={revealApproaches}
                  plan={plan}
                  onPlanChange={handlePlanChange}
                  onHintsUsed={setHintsUsed}
                />
              </div>
              <div className="tab-panel" style={{ display: activeTab === 'solutions' ? undefined : 'none' }}>
                <SolutionsTab
                  question={question}
                  approachesRevealed={approachesRevealed}
                  onReveal={revealApproaches}
                  plan={plan}
                  onPlanChange={handlePlanChange}
                />
              </div>
              <div className="tab-panel" style={{ display: activeTab === 'submissions' ? undefined : 'none' }}>
                <SubmissionsTab questionId={question.id} active={activeTab === 'submissions'} />
              </div>
            </SolutionGateHoisted.Provider>
          </div>
        </div>

        {/* The divider rides in the grid's own column gap (position:absolute, see
            index.css) so the two panes keep the exact spacing they had, and so the
            <=1024px single-column collapse has nothing to undo — the handle simply
            hides there, since there are no columns left to split. */}
        <ResizeHandle
          orientation="vertical"
          containerRef={splitRef}
          split={columnSplit}
          label="Problem and code panes"
        />

        {/* Right column: dedicated ENTIRELY to the Code panel (top) and its
            Testcase/Result panel (bottom), which live inside PythonPlayground
            itself — see that file's pp-code-pane / pp-test-pane split. Real
            LeetCode's right pane is code+testcase and nothing else; RecallRating
            and ExplainBack used to share this fixed-height scrolling column with
            the editor and crowded it into a strip of its own card — moved below
            the whole split-pane instead (see the "Your Turn" reflection section
            further down), same place Whiteboard/PeerReview/etc. already live. */}
        <div className="viewer-pane glass no-print">
          <div className="pane-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Code</h3>
          </div>
          <div className="pane-body" style={{ padding: 0 }}>
            <PythonPlayground
              questionId={question.id}
              solutionCode={question.approaches.find(app => app.name === 'Optimal')?.code || question.approaches[0]?.code || ''}
              tests={question.tests}
            />
          </div>
        </div>
      </div>

      {/* "Your Turn" reflection — how did the attempt actually go, and can you say
          why out loud. Used to live squeezed inside the code column's fixed-height
          scroll; now full width like everything else below the split, with real
          room to breathe. */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 data-tour="your-turn" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Your Turn</h3>
        <div data-tour="recall">
          <RecallRating questionId={question.id} hintsUsed={hintsUsed} />
        </div>
        {/* Feynman box — unlocks when tests pass (event from the playground) or
            the approaches are revealed; resurfaces inside RecallRating at
            review time. */}
        <ExplainBack questionId={question.id} revealed={approachesRevealed} />
      </div>

      {/* Below the split: pieces with no LeetCode-tab home of their own — this
          app's own value-adds (whiteboard, peer review), plus edge cases,
          similar problems and notes, same as the rest of this app's long
          scrolling pages. */}
      <Whiteboard questionId={question.id} />
      <PeerReviewComposer questionId={question.id} questionTitle={question.title} />

      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'hsl(var(--hard))', marginBottom: '0.75rem' }}>Edge Cases Interviewers Probe</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {question.edgeCases.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'hsl(var(--secondary))', marginBottom: '0.75rem' }}>Follow-up Questions</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {question.followUps.map((f, idx) => (
              <li key={idx}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      <SimilarProblems question={question} onOpenQuestion={onOpenQuestion} />

      <div className="glass no-print" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h4 style={{ fontWeight: 700, fontSize: '1.25rem' }}>My Notes & Complexity Trace</h4>
          <NoteHistory
            questionId={question.id}
            currentText={notes}
            onRestore={(text) => {
              setNotes(text);
              writeText(`notes-${question.id}`, text);
            }}
          />
        </div>
        <textarea
          placeholder="Write down edge cases, your thoughts, or checklist items here..."
          style={{
            width: '100%',
            height: '140px',
            background: 'hsl(var(--bg-secondary))',
            border: '1px solid hsl(var(--border-color))',
            borderRadius: '8px',
            color: 'hsl(var(--text-primary))',
            padding: '1rem',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9rem',
            outline: 'none',
            resize: 'none',
            lineHeight: '1.6'
          }}
          value={notes}
          onChange={(e) => {
            maybeSnapshotNote(question.id, notes);
            handleNotesChange(e);
          }}
        />
      </div>
    </div>
  );
};
