import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  ChevronDown,
  CloudOff,
  Layers,
  Meh,
  MessageSquare,
  Plus,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { coreSubjects, type CoreSubject } from '../data/coreSubjects';
import { PrintButton } from './PrintButton';
import { PrintFlashcardsButton, FlashcardSheet } from './PrintCards';
import { ReadingAids, CollapsibleSection } from './ReadingAids';
import { GlossaryText } from './GlossaryText';
import { RunnableCode } from './RunnableCode';
import { FigureBlock } from './FigureBlock';
import { ReadAloud } from './ReadAloud';
import { PyMemoryDiagram } from './PyMemoryDiagram';
import { SystemDesignBoard } from './SystemDesignBoard';
import {
  dueQuestionIds,
  daysUntilDue,
  gradeQuestion,
  readReviews,
  todayISO,
  type Recall,
  type ReviewState,
} from '../utils/review';
import { consumePendingTheoryOpen } from './CommandPalette';

/**
 * Core CS — six theory subjects (OOP, OS, DBMS, Networks, LLD, HLD×2) on the SAME
 * spaced-repetition ladder as the problem sheet. That sameness is the point: an OS
 * fact you graded "shaky" comes back in 3 days exactly like a shaky DP problem does,
 * in the one review queue the learner already trusts.
 *
 * Also the study-hub ENGINE: every prop below is optional and defaults to Core CS's
 * own values, so `<CoreHub />` is byte-for-byte the screen it always was, while a
 * sibling library (see DevOpsHub) gets the identical UI by passing its own subject
 * list and id prefix. The prefix is what keeps the two review ladders apart in the
 * one shared ledger — see the `idPrefix` note.
 *
 * Lands at: src/components/CoreHub.tsx
 */

/** Review-ladder id for a flashcard. Index-based, so content updates must APPEND
 *  cards, never reorder — see the CoreFlashcard interface note in coreSubjects.ts.
 *  The prefix is part of the persisted id, so it is identity too: 'core' must stay
 *  'core' forever or every grade a learner has recorded orphans itself. */
const cardId = (prefix: string, subjectId: string, index: number) =>
  `${prefix}-${subjectId}-card-${index}`;

/** New (never-graded) cards allowed into a session before the learner must opt in.
 *  20 is Anki's default for the same reason: unbounded "new" buries the due queue,
 *  and the due queue is the part that fights forgetting. */
const NEW_PER_SESSION = 20;

/** Due cards first (most overdue first — dueQuestionIds already sorts that way),
 *  then new cards up to the cap. Cards graded recently but not yet due are absent
 *  on purpose: showing them early is how intervals stop meaning anything. */
const buildQueue = (prefix: string, subject: CoreSubject, state: ReviewState, newCap: number): string[] => {
  const ids = subject.flashcards.map((_, i) => cardId(prefix, subject.id, i));
  const owned = new Set(ids);
  const due = dueQuestionIds(state).filter(id => owned.has(id));
  const fresh = ids.filter(id => !state[id]);
  return [...due, ...fresh.slice(0, newCap)];
};

/** Same three grades, same hues, same order as RecallRating: one recall ladder
 *  across the site means one muscle memory for honesty. */
const GRADES: { key: Recall; label: string; hint: string; icon: React.ReactNode; hue: string }[] = [
  { key: 'easy',    label: 'Got it',  hint: 'Said it before flipping',        icon: <Zap size={15} />,      hue: 'easy' },
  { key: 'shaky',   label: 'Shaky',   hint: 'Half of it came back',           icon: <Meh size={15} />,      hue: 'medium' },
  { key: 'blanked', label: 'Blanked', hint: 'The back was news to me',        icon: <CloudOff size={15} />, hue: 'hard' },
];

/** DSAHub's theory convention, verbatim: split on ``` — odd segments are ASCII
 *  diagrams in a monospace <pre>, even segments are glossary-linked prose. Reused
 *  for chapter sections AND Q&A answers so both content kinds render identically. */
const FencedProse: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    {text.split('```').map((segment, segIdx) =>
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
            color: 'hsl(var(--secondary))',
          }}
        >
          {/* Content authors tag fences like ```ascii / ```sql — the tag is metadata,
              not the diagram's first line. */}
          {segment.replace(/^[a-z]{1,10}\n/, '').replace(/^\n/, '').replace(/\n$/, '')}
        </pre>
      ) : (
        segment.trim() && (
          <div
            key={segIdx}
            style={{ color: 'hsl(var(--text-secondary))', lineHeight: '1.75', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}
          >
            <GlossaryText text={segment.trim()} />
          </div>
        )
      )
    )}
  </div>
);

/** ASCII diagrams read aloud are noise — speak only the prose between fences. */
const speakable = (text: string) => text.split('```').filter((_, i) => i % 2 === 0).join(' ');

const StatChip: React.FC<{ value: number; label: string; hue: string }> = ({ value, label, hue }) => (
  <span
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontSize: '0.72rem', fontWeight: 600, padding: '0.3rem 0.7rem', borderRadius: '999px',
      background: `hsl(var(--${hue}) / 0.12)`,
      border: `1px solid hsl(var(--${hue}) / 0.35)`,
      color: `hsl(var(--${hue}))`,
    }}
  >
    {value} {label}
  </span>
);

/** Core CS's own page header, kept as constants so the defaults below render the
 *  exact same DOM the hub hardcoded before it took props. */
const CORE_HEADING = <>Core <span className="gradient-text">CS</span></>;
const CORE_BLURB =
  'OOP, OS, DBMS, Networks, LLD and System Design — chapters to read, questions to drill, and flashcards that come due exactly like your problems do.';

export interface CoreHubProps {
  /** The library to render. Any list of CoreSubjects works — the hub reads nothing
   *  about them beyond the interface. */
  subjects?: CoreSubject[];
  /** Namespace for flashcard review ids (`<prefix>-<subjectId>-card-<index>`) and
   *  the tour anchor. Two hubs sharing a prefix would share each other's grades,
   *  so every library needs its own — and an existing one can never change it. */
  idPrefix?: string;
  heading?: React.ReactNode;
  blurb?: React.ReactNode;
}

export const CoreHub: React.FC<CoreHubProps> = ({
  subjects = coreSubjects,
  idPrefix = 'core',
  heading = CORE_HEADING,
  blurb = CORE_BLURB,
}) => {
  const [subjectId, setSubjectId] = useState<string>(subjects[0].id);
  const [subTab, setSubTab] = useState<'chapters' | 'qa' | 'cards'>('chapters');
  const [openQA, setOpenQA] = useState<Set<number>>(new Set());
  const [reviews, setReviews] = useState<ReviewState>(() => readReviews());
  // The session queue is a snapshot, advanced by position, NOT recomputed per grade:
  // grading a card immediately removes it from "due", and a live-derived queue would
  // reshuffle under the learner's hands mid-session.
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [showBack, setShowBack] = useState(false);

  // [discover] ⌘K Theory hits land here. The pending request lives in
  // sessionStorage (consumePendingTheoryOpen) so a pick made BEFORE this hub
  // mounted still applies — mount consumes it, no event-timing luck involved.
  // The 'open-theory' event is just the "check now" ping for the mounted case.
  //
  // Core-only, deliberately: the palette's theory index is built from coreSubjects
  // and dsaTheories, and consuming a request DELETES it. Another library reading
  // 'core' mail would swallow requests it has no chapter for, and Core CS would
  // never see them.
  const [theoryScrollIdx, setTheoryScrollIdx] = useState<number | null>(null);
  useEffect(() => {
    if (idPrefix !== 'core') return;
    const applyPending = () => {
      const req = consumePendingTheoryOpen('core');
      if (!req) return;
      if (!subjects.some(s => s.id === req.subjectOrTopic)) return;
      setSubjectId(req.subjectOrTopic);
      setSubTab('chapters');
      setTheoryScrollIdx(req.sectionIndex);
    };
    applyPending();
    window.addEventListener('open-theory', applyPending);
    return () => window.removeEventListener('open-theory', applyPending);
    // Both deps are module-level constants in practice, so this still runs once.
  }, [idPrefix, subjects]);
  useEffect(() => {
    if (theoryScrollIdx === null) return;
    // Two frames: one for the subject swap to commit, one for layout to settle.
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelector(`[data-theory-section="${theoryScrollIdx}"]`)?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
      setTheoryScrollIdx(null);
    }));
    return () => cancelAnimationFrame(raf);
  }, [theoryScrollIdx]);

  const subject = subjects.find(s => s.id === subjectId) ?? subjects[0];

  const resetDeck = (s: CoreSubject) => {
    // Re-read storage rather than trusting component state: grades recorded on the
    // problem side (RecallRating) share the same ledger and may have moved things.
    const state = readReviews();
    setReviews(state);
    setQueue(buildQueue(idPrefix, s, state, NEW_PER_SESSION));
    setPos(0);
    setShowBack(false);
  };

  // Subject swap starts a fresh session for that deck. The sub-tab deliberately
  // survives the swap — hopping OS→DBMS mid-flashcard-review should land on the
  // DBMS deck, not bounce back to Chapters.
  useEffect(() => {
    const s = subjects.find(x => x.id === subjectId) ?? subjects[0];
    resetDeck(s);
    setOpenQA(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // Per-subject due counts drive the pill badges and the banner — the whole feature
  // exists so due theory FINDS the learner instead of waiting to be remembered.
  const dueCounts = useMemo(() => {
    const today = todayISO();
    const counts: Record<string, number> = {};
    subjects.forEach(s => {
      counts[s.id] = s.flashcards.reduce((n, _, i) => {
        const r = reviews[cardId(idPrefix, s.id, i)];
        return n + (r && r.due <= today ? 1 : 0);
      }, 0);
    });
    return counts;
  }, [reviews, subjects, idPrefix]);

  const deckStats = useMemo(() => {
    const today = todayISO();
    let due = 0, fresh = 0, learning = 0, mature = 0;
    subject.flashcards.forEach((_, i) => {
      const r = reviews[cardId(idPrefix, subject.id, i)];
      if (!r) { fresh += 1; return; }
      if (r.due <= today) due += 1;
      // step >= 3 mirrors reviewStats' "mature" cutoff so this screen and the Stats
      // tab tell the same story about the same ledger.
      if (r.step >= 3) mature += 1; else learning += 1;
    });
    return { due, fresh, learning, mature };
  }, [subject, reviews, idPrefix]);

  /** Soonest a not-yet-due card in this deck comes back — for the all-clear panel. */
  const nextDueDays = useMemo(() => {
    let best: number | null = null;
    subject.flashcards.forEach((_, i) => {
      const d = daysUntilDue(cardId(idPrefix, subject.id, i), reviews);
      if (d !== null && d > 0 && (best === null || d < best)) best = d;
    });
    return best;
  }, [subject, reviews, idPrefix]);

  const currentId = pos < queue.length ? queue[pos] : null;
  const currentCard = useMemo(() => {
    if (!currentId) return null;
    const idx = Number(currentId.slice(currentId.lastIndexOf('-') + 1));
    return subject.flashcards[idx] ?? null;
  }, [currentId, subject]);

  // Grading is the ONLY way a card advances — never on flip, never on skip — because
  // an auto-grade is a schedule built on data the learner never gave.
  const grade = (recall: Recall) => {
    if (!currentId) return;
    setReviews(gradeQuestion(currentId, recall, reviews));
    setShowBack(false);
    setPos(p => p + 1);
  };

  const freshBeyondQueue = useMemo(() => {
    const inQueue = new Set(queue);
    return subject.flashcards
      .map((_, i) => cardId(idPrefix, subject.id, i))
      .filter(id => !reviews[id] && !inQueue.has(id)).length;
  }, [subject, queue, reviews, idPrefix]);

  // "Keep going" EXTENDS the queue rather than rebuilding it, so the session's
  // position (and the "Card X of Y" count) stays honest.
  const keepGoing = () => {
    const inQueue = new Set(queue);
    const more = subject.flashcards
      .map((_, i) => cardId(idPrefix, subject.id, i))
      .filter(id => !reviews[id] && !inQueue.has(id))
      .slice(0, NEW_PER_SESSION);
    setQueue(q => [...q, ...more]);
  };

  const toggleQA = (i: number) => {
    setOpenQA(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    /* .core-screen scopes the "Print flashcards" page-swap CSS to this hub. Not
       prefix-aware on purpose: it is a CSS hook, not an identity, and every hub
       built on this engine wants the exact same print behaviour. */
    <div className="core-screen" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page header */}
      <div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          {heading}
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>
          {blurb}
        </p>
      </div>

      {/* Subject pill row — same navigator pattern as DSAHub's topic strip. The
          print buttons (feature 50) sit OUTSIDE the scrolling strip so they can
          never scroll out of reach; the whole row is chrome, so .no-print keeps
          it off paper. */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid hsl(var(--border-color))',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', flex: 1, minWidth: 0 }}>
        {subjects.map(s => (
          <button
            key={s.id}
            className={`tab ${subjectId === s.id ? 'active' : ''}`}
            onClick={() => setSubjectId(s.id)}
            style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {s.label}
            {dueCounts[s.id] > 0 && (
              <span
                style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '0.05rem 0.4rem', borderRadius: '999px',
                  background: 'hsl(var(--medium) / 0.15)', border: '1px solid hsl(var(--medium) / 0.3)',
                  color: 'hsl(var(--medium))',
                }}
              >
                {dueCounts[s.id]} due
              </span>
            )}
          </button>
        ))}
        </div>
        {/* Paper revision (feature 50): this page as-is, or the whole deck as a
            fold-in-half front/back table (see PrintCards.tsx). */}
        <PrintButton />
        <PrintFlashcardsButton />
      </div>

      {/* Due banner — hidden on the Flashcards tab, where the deck stats already say it */}
      {deckStats.due > 0 && subTab !== 'cards' && (
        <div
          className="glass animate-in no-print"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
            padding: '0.85rem 1.25rem', borderRadius: '12px',
            borderLeft: '4px solid hsl(var(--medium))',
          }}
        >
          <CalendarClock size={16} color="hsl(var(--medium))" />
          <span style={{ flex: 1, minWidth: '200px', fontSize: '0.88rem', color: 'hsl(var(--text-secondary))' }}>
            <strong style={{ color: 'hsl(var(--text-primary))' }}>
              {deckStats.due} flashcard{deckStats.due === 1 ? '' : 's'}
            </strong>{' '}
            in {subject.label} {deckStats.due === 1 ? 'is' : 'are'} due for review.
          </span>
          <button
            className="btn btn-primary"
            style={{ padding: '0.4rem 1.1rem', fontSize: '0.82rem' }}
            onClick={() => setSubTab('cards')}
          >
            Review now
          </button>
        </div>
      )}

      {/* Sub-tab switch — same pattern as DSAHub's Theory/Questions toggle.
          The tour anchor is prefix-aware so two hubs can never answer to the same
          one; GuidedTour asks for 'core-decks', which the default prefix produces. */}
      <div
        className="no-print"
        data-tour={`${idPrefix}-decks`}
        style={{
          display: 'flex', gap: '1rem', background: 'hsl(var(--bg-secondary) / 0.5)',
          padding: '0.25rem', borderRadius: '8px', width: 'fit-content',
          border: '1px solid hsl(var(--border-color))', flexWrap: 'wrap',
        }}
      >
        <button
          className={`btn ${subTab === 'chapters' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem', borderRadius: '6px' }}
          onClick={() => setSubTab('chapters')}
        >
          <BookOpen size={14} /> Chapters ({subject.sections.length})
        </button>
        <button
          className={`btn ${subTab === 'qa' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem', borderRadius: '6px' }}
          onClick={() => setSubTab('qa')}
        >
          <MessageSquare size={14} /> Interview Q&A ({subject.interviewQA.length})
        </button>
        <button
          className={`btn ${subTab === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem', borderRadius: '6px' }}
          onClick={() => setSubTab('cards')}
        >
          <Layers size={14} /> Flashcards ({subject.flashcards.length})
        </button>
      </div>

      {subTab === 'chapters' && (
        /* ReadingAids (feature 49): progress bar + back-to-top around the long read */
        <ReadingAids>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary card, then sections — DSAHub's theory view, applied to a subject */}
          <div className="glass animate-in" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--secondary))' }}>
              <BookOpen size={24} />
              <span>{subject.subject}</span>
            </h2>
            <p style={{ color: 'hsl(var(--text-secondary))', lineHeight: '1.7', fontSize: '1rem', whiteSpace: 'pre-line' }}>
              {subject.summary}
            </p>
          </div>

          {/* Collapsible per-section (feature 49): CollapsibleSection reproduces the
              exact glass-card + h3 header this block had. Collapse state is
              session-only useState by design — a fresh visit starts fully open. */}
          {subject.sections.map((section, idx) => (
            /* [discover] data-theory-section — ⌘K Theory hits scroll here */
            <div key={idx} data-theory-section={idx}>
              <CollapsibleSection title={section.title}>
              <FencedProse text={section.content} />
              {section.code && (
                <RunnableCode code={section.code} />
              )}
              {/* Deliberately NOT prefixed: subject ids are unique across every
                  library, and prefixing now would detach every figure a Core CS
                  learner has already drawn from the section it belongs to. */}
              <FigureBlock figKey={`${subject.id}:${section.title}:${idx}`} />
              {/* Structured board (box/arrow/label), not the DSA sheet's freehand
                  pad — an HLD chapter is architecture, not a pointer diagram. */}
              {(subject.id === 'hld-blocks' || subject.id === 'hld-cases') && (
                <SystemDesignBoard sectionKey={`${subject.id}-${idx}`} />
              )}
              </CollapsibleSection>
            </div>
          ))}
          {/* OOP only: the names→objects model is the ground its vocabulary stands on */}
          {subject.id === 'oop' && <PyMemoryDiagram />}
        </div>
        </ReadingAids>
      )}

      {subTab === 'qa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Recall-first: the answer is hidden so the learner commits to one out loud
              first. Reading answers feels like studying; retrieving them is studying. */}
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
            Answer each question out loud before opening it — the reveal is for checking
            yourself, not for reading first.
          </p>
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {subject.interviewQA.map((qa, i) => {
              const open = openQA.has(i);
              return (
                <div key={i} className="glass" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggleQA(i)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '1rem 1.25rem', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                      color: 'hsl(var(--text-primary))', fontSize: '0.95rem', fontWeight: 600,
                      fontFamily: 'var(--font-sans)', lineHeight: 1.5,
                    }}
                  >
                    <span style={{ flex: 1 }}>{qa.q}</span>
                    <ChevronDown
                      size={16}
                      color="hsl(var(--text-muted))"
                      style={{
                        flexShrink: 0,
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform var(--transition-fast)',
                      }}
                    />
                  </button>
                  {open && (
                    <div
                      className="animate-fade"
                      style={{
                        padding: '1rem 1.25rem 1.25rem',
                        borderTop: '1px solid hsl(var(--border-color))',
                        display: 'flex', flexDirection: 'column', gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        {/* ReadAloud gets prose only — an ASCII diagram spoken aloud is noise */}
                        <ReadAloud text={speakable(qa.a)} label={`the answer to "${qa.q}"`} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <FencedProse text={qa.a} />
                        </div>
                      </div>
                      {qa.followUps.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--text-muted))' }}>
                            LIKELY FOLLOW-UPS
                          </span>
                          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {qa.followUps.map((f, fi) => (
                              <li key={fi} style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'cards' && (
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Deck stats — same ledger vocabulary as the Stats tab */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <StatChip value={deckStats.due} label="due today" hue="medium" />
            <StatChip value={deckStats.fresh} label="new" hue="secondary" />
            <StatChip value={deckStats.learning} label="learning" hue="primary" />
            <StatChip value={deckStats.mature} label="mature" hue="easy" />
          </div>

          {currentId && currentCard ? (
            /* key={currentId} remounts the card so animate-in replays per card —
               prefers-reduced-motion flattens it via the global CSS block. */
            <div
              key={currentId}
              className="glass animate-in"
              style={{
                padding: '2rem', borderRadius: '16px', maxWidth: '680px',
                display: 'flex', flexDirection: 'column', gap: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                    padding: '0.15rem 0.5rem', borderRadius: '999px',
                    background: reviews[currentId] ? 'hsl(var(--medium) / 0.15)' : 'hsl(var(--secondary) / 0.15)',
                    border: `1px solid ${reviews[currentId] ? 'hsl(var(--medium) / 0.4)' : 'hsl(var(--secondary) / 0.4)'}`,
                    color: reviews[currentId] ? 'hsl(var(--medium))' : 'hsl(var(--secondary))',
                  }}
                >
                  {reviews[currentId] ? 'Review' : 'New'}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                  Card {pos + 1} of {queue.length}
                </span>
              </div>

              <p style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.5 }}>{currentCard.front}</p>

              {!showBack ? (
                <>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                    Say it before you flip — recognising the back is not the same as recalling it.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary lift"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setShowBack(true)}
                  >
                    Show answer
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="animate-fade"
                    style={{
                      borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1rem',
                      fontSize: '0.92rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.7,
                    }}
                  >
                    <GlossaryText text={currentCard.back} />
                  </div>
                  {/* Grading is the only exit — flipping never schedules anything */}
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {GRADES.map(g => (
                      <button
                        key={g.key}
                        type="button"
                        className="lift"
                        onClick={() => grade(g.key)}
                        title={g.hint}
                        style={{
                          flex: '1 1 140px',
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem',
                          padding: '0.7rem 0.9rem', borderRadius: '10px', cursor: 'pointer',
                          textAlign: 'left',
                          background: 'hsl(var(--bg-tertiary))',
                          border: '1px solid hsl(var(--border-color))',
                          color: 'hsl(var(--text-primary))',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: `hsl(var(--${g.hue}))` }}>
                          {g.icon}{g.label}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{g.hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Session over (or nothing to do). New cards only mix in AFTER due ones,
               and only up to the cap — "keep going" is the learner's explicit opt-in
               for more new material today. */
            <div
              className="glass animate-in"
              style={{
                padding: '2rem', borderRadius: '16px', maxWidth: '680px',
                display: 'flex', flexDirection: 'column', gap: '1rem',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {queue.length === 0 ? 'Nothing due in this deck' : 'Deck clear for this session'}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
                {queue.length > 0 && `You graded ${queue.length} card${queue.length === 1 ? '' : 's'}. `}
                {freshBeyondQueue > 0
                  ? `${freshBeyondQueue} new card${freshBeyondQueue === 1 ? '' : 's'} ${freshBeyondQueue === 1 ? 'is' : 'are'} waiting beyond today's cap of ${NEW_PER_SESSION}.`
                  : nextDueDays !== null
                    ? `The next card comes back in ${nextDueDays} day${nextDueDays === 1 ? '' : 's'} — that gap is the schedule working, not a reason to re-cram.`
                    : 'Every card in this deck is scheduled. Come back when the pills show a due badge.'}
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {freshBeyondQueue > 0 && (
                  <button type="button" className="btn btn-primary lift" onClick={keepGoing}>
                    <Plus size={14} /> Keep going (+{Math.min(NEW_PER_SESSION, freshBeyondQueue)} new)
                  </button>
                )}
                {/* Rebuild covers the tab sitting open across midnight, or grades
                    recorded elsewhere (problem side shares the ledger). */}
                <button type="button" className="btn btn-secondary lift" onClick={() => resetDeck(subject)}>
                  <RotateCcw size={14} /> Rebuild deck
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print-only paper deck (feature 50) — revealed by the "Print flashcards"
          button's data-print="cards" stamp; invisible on screen and in normal print. */}
      <FlashcardSheet subject={subject} />
    </div>
  );
};
