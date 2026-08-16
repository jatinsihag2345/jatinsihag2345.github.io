import React, { useRef } from 'react';
import { Code2, Database, Flame, Bookmark, ArrowRight, Award, CheckCircle, Brain, Download, Upload, TrendingDown, FileText } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { readReviews, dueQuestionIds, daysUntilDue } from '../utils/review';
import { readStudyMeta } from '../utils/persistence';
import { computeStreakMercy } from '../utils/achievements';
import { buildBackupPayload, parseBackup, restoreEntries, downloadFile, buildNotesMarkdown, compareBackups } from '../utils/backup';
import { GistSync } from './GistSync';
import { WarmupGate } from './WarmupGate';
import { ShareCard } from './ShareCard';
import { DailyThree } from './DailyThree';
import { DigestCard } from './DigestCard';
import { ContestCountdown } from './ContestCountdown';
import { PlanWizard } from './PlanWizard';
import { GoalStreak } from './GoalStreak';
import { ContinueCard } from './ContinueCard';
import { DiscoveryCard } from './DiscoveryCard';
import { ReadinessRadar } from './ReadinessRadar';

interface DashboardProps {
  dsaProgress: number;
  sqlProgress: number;
  dsaSolvedCount: number;
  dsaTotalCount: number;
  sqlSolvedCount: number;
  sqlTotalCount: number;
  streak: number;
  bookmarkCount: number;
  onNavigate: (tab: string) => void;
  /** Jump straight to a specific problem — used by the review queue. */
  onOpenDsaQuestion: (q: Question) => void;
  solvedDsaIds: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  dsaProgress,
  sqlProgress,
  dsaSolvedCount,
  dsaTotalCount,
  sqlSolvedCount,
  sqlTotalCount,
  streak,
  bookmarkCount,
  onNavigate,
  onOpenDsaQuestion,
  solvedDsaIds,
}) => {
  const fileInput = useRef<HTMLInputElement>(null);

  // [learnsci] Bumped by utils/review's 'review-changed' event. The warm-up gate
  // grades three reviews BEFORE this content shows — without the re-read, the
  // due-queue below would list the cards the warm-up just cleared.
  const [reviewTick, setReviewTick] = React.useState(0);
  React.useEffect(() => {
    const bump = () => setReviewTick((t) => t + 1);
    window.addEventListener('review-changed', bump);
    return () => window.removeEventListener('review-changed', bump);
  }, []);

  // ---- Review queue: what is due today, most overdue first --------------------
  // Memoised: parsing the whole review state and scanning 191 questions on every
  // render (every palette toggle re-renders App) is waste with a visible cost.
  const { reviews, dueIds, dueQuestions, dueCoreCards, dueOtherCards } = React.useMemo(() => {
    const reviews = readReviews();
    const allDue = dueQuestionIds(reviews);
    // The review ladder now has FIVE id families (dsa-*/dsa-idx-*, core-*, sqlcard-*,
    // gloss-*, tradeoff-*) but this list can only ever open a dsaQuestions row — every
    // other family was previously left inside `dueIds`, so the header badge counted
    // them while the "nothing due" text checked dueQuestions alone: the badge said
    // "6 due" over a panel that said "Nothing due today". Every non-DSA family is now
    // split out explicitly, the same way core- already was, so the two never disagree.
    const isDsa = (id: string) => !/^(core-|sqlcard-|gloss-|tradeoff-)/.test(id);
    const dueCoreCards = allDue.filter(id => id.startsWith('core-')).length;
    const dueOtherCards = allDue.filter(id => /^(sqlcard-|gloss-|tradeoff-)/.test(id)).length;
    const dueIds = allDue.filter(isDsa);
    const byId = new Map(dsaQuestions.map(q => [q.id, q]));
    const dueQuestions = dueIds
      .map(id => byId.get(id))
      .filter((q): q is Question => !!q)
      .slice(0, 8);
    return { reviews, dueIds, dueQuestions, dueCoreCards, dueOtherCards };
    // [learnsci] reviewTick (not []): see the listener above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewTick]);

  // ---- Weak patterns: where coverage is thinnest ------------------------------
  // Only patterns with enough questions to mean something; sorted worst-first.
  const weakPatterns = React.useMemo(() => {
    const groups = new Map<string, Question[]>();
    dsaQuestions.forEach(q => (q.patterns || []).forEach(p => groups.set(p, [...(groups.get(p) || []), q])));
    return [...groups.entries()]
      .filter(([, qs]) => qs.length >= 5)
      .map(([p, qs]) => ({
        pattern: p,
        total: qs.length,
        solved: qs.filter(q => solvedDsaIds.includes(q.id)).length,
      }))
      .sort((a, b) => a.solved / a.total - b.solved / b.total)
      .slice(0, 5);
  }, [solvedDsaIds]);

  // ---- Streak mercy (display only) --------------------------------------------
  // One missed day shouldn't LOOK like starting over. When yesterday slipped but
  // the day before had activity, the streak card swaps its zero for "paused —
  // solve today to resume at N". The real streak math in utils/persistence is
  // deliberately untouched: this reads studyDays directly and only changes what
  // the card says. Memoised once per Dashboard mount — mercy flips at midnight,
  // not mid-visit.
  const mercyResumeAt = React.useMemo(() => computeStreakMercy(readStudyMeta().studyDays), []);

  // ---- Progress backup --------------------------------------------------------
  // Everything the app stores (solved, bookmarks, notes, attempts, review schedule)
  // lives in localStorage, which one cleared cache silently destroys. One JSON file
  // in the learner's hands beats months of progress held hostage by a browser.
  // What counts as "the app's data" (the APP_KEY regex) now lives in utils/backup.ts,
  // shared with the gist sync so every escape hatch carries the same keys.
  const exportProgress = () => {
    downloadFile(
      `striver-sde-progress-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(buildBackupPayload(), null, 1),
      'application/json',
    );
  };

  // Notes are the learner's own words — the part of this app no re-download can
  // rebuild. Markdown because it outlives this site: Notion, Obsidian, plain editors.
  const exportNotes = () => {
    const md = buildNotesMarkdown();
    if (!md) {
      window.alert('No notes to export yet — write some on a problem page first.');
      return;
    }
    downloadFile(`striver-sde-notes-${new Date().toISOString().slice(0, 10)}.md`, md, 'text/markdown');
  };

  const importProgress = async (file: File) => {
    try {
      const entries = parseBackup(await file.text());
      // Restore diff guard (feature 39): counts from BOTH payloads plus an
      // explicit OLDER/NEWER verdict, so a stale file found in Downloads can't
      // silently roll months of live progress back.
      if (!window.confirm(`Restore this backup? It replaces your current progress on this browser.\n\n${compareBackups(entries)}`)) return;
      if (!restoreEntries(entries)) {
        window.alert('Restore failed part-way (storage quota?). Your previous progress was rolled back untouched.');
        return;
      }
      window.location.reload();
    } catch {
      window.alert('That file is not a progress backup exported from this site.');
    }
  };

  return (
    /* [learnsci] Warm-up gate (feature 44): with the opt-in setting on, the first
       Dashboard mount of a day with 3+ reviews due shows a 60-second warm-up card
       INSTEAD of this content, which expands on finish or skip. Wrapper, not
       overlay — "before the dashboard" is structural, not a z-index trick. */
    <WarmupGate>
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          {/* Two spans, not two classes on one: .gradient-text clips its gradient TO the
              glyphs (background-clip: text), so anything else that sets `background` on the
              same element replaces that gradient and gets clipped to the letters instead.
              .fx-highlight-swipe did exactly that — its 42%-tall highlighter band became the
              only paint inside otherwise-transparent glyphs, leaving the name a ghost. The
              sweep belongs behind the text, so it gets its own element. */}
          Welcome back,{' '}
          <span className="fx-highlight-swipe">
            <span className="gradient-text">Future SDE</span>
          </span>
          !
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>
          Every problem with a brute force, an optimal, and a step-by-step walkthrough you can play.
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Hero Card */}
        <div className="dashboard-hero">
          <div className="hero-text">
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'hsl(var(--secondary) / 0.15)',
                color: 'hsl(var(--secondary))',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                width: 'fit-content'
              }}
            >
              <Flame size={14} />
              <span>INTERVIEW MODE ACTIVE</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', lineHeight: '1.2' }}>Striver SDE Sheet & SQL Top 50 Mastery</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem' }}>
              Your stacked workspace is configured. Solve problems iteratively, analyze follow-ups, and visualize algorithms to build high-quality problem-solving skills.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => onNavigate('dsa')}>
                Continue DSA <ArrowRight size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('sql')}>
                Continue SQL <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {/* DSA Circle */}
            <div className="circular-progress">
              <svg viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="dsaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--secondary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" />
                  </linearGradient>
                </defs>
                <circle className="circle-bg" cx="50" cy="50" r="40" />
                <circle 
                  className="circle-fg" 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="url(#dsaGrad)"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - dsaProgress / 100)}`}
                />
              </svg>
              <div className="progress-text">{Math.round(dsaProgress)}%</div>
              <div style={{ position: 'absolute', bottom: '-20px', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>
                DSA
              </div>
            </div>

            {/* SQL Circle */}
            <div className="circular-progress">
              <svg viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="sqlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--accent))" />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" />
                  </linearGradient>
                </defs>
                <circle className="circle-bg" cx="50" cy="50" r="40" />
                <circle 
                  className="circle-fg" 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="url(#sqlGrad)"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - sqlProgress / 100)}`}
                />
              </svg>
              <div className="progress-text">{Math.round(sqlProgress)}%</div>
              <div style={{ position: 'absolute', bottom: '-20px', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>
                SQL
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stat-card glass glass-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
            <span>DSA Progress</span>
            <Code2 size={20} color="hsl(var(--secondary))" />
          </div>
          <div className="stat-val">{dsaSolvedCount} / {dsaTotalCount}</div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Problems Solved</span>
        </div>

        <div className="stat-card glass glass-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
            <span>SQL Progress</span>
            <Database size={20} color="hsl(var(--accent))" />
          </div>
          <div className="stat-val">{sqlSolvedCount} / {sqlTotalCount}</div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Queries Solved</span>
        </div>

        <div className="stat-card glass glass-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
            <span>Bookmarked Items</span>
            <Bookmark size={20} color="hsl(var(--accent))" />
          </div>
          <div className="stat-val">{bookmarkCount} Items</div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Flagged questions to review</span>
        </div>

        {/* [learnsci] Deliberately the least visually loud of the four — a raw
            visit-streak rewards showing up, not getting better, and gamification
            research on burnout (Yu-kai Chou's "immersion to burnout" pattern) flags
            exactly this framing. Muted icon, last position, and — the actual
            promotion — real skill data (ReadinessRadar, below) gets the prominent
            placement a streak used to have alone. The number itself still shows;
            it just isn't the headline anymore. */}
        <div className="stat-card glass glass-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
            <span>Coding Streak</span>
            <Flame size={20} color="hsl(var(--text-muted))" />
          </div>
          <div className="stat-val">{mercyResumeAt !== null ? 'Paused' : `${streak} ${streak === 1 ? 'Day' : 'Days'}`}</div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
            {mercyResumeAt !== null
              ? `Yesterday slipped after a ${mercyResumeAt}-day run — solve today and start the climb back.`
              : streak > 0 ? 'Tracked from your real solve activity.' : 'Start a new streak by solving one problem today.'}
          </span>
        </div>
      </div>

      {/* [learnsci] Skill trajectory, promoted from the Stats tab to the Dashboard's
          top fold — "solved N problems" (and a visit streak even more so) hides the
          SHAPE of your prep; this is the shape. Still on Stats too, for anyone who
          wants it without the rest of the dashboard around it. */}
      <div style={{ marginTop: '1.5rem' }}>
        <ReadinessRadar solvedDsaIds={solvedDsaIds} reviews={reviews} />
      </div>

      {/* [discover] One rotating "did you know" per visit — the app has grown
          past what anyone discovers by accident, so features introduce themselves. */}
      <div style={{ marginTop: '1.5rem' }}>
        <DiscoveryCard />
      </div>

      {/* Three problems dealt by the date — the same card the Stats tab shows.
          Uses onOpenDsaQuestion (not onNavigate) so a pick opens directly. */}
      <div style={{ marginTop: '1.5rem' }}>
        <DailyThree solvedDsaIds={solvedDsaIds} onOpenQuestion={onOpenDsaQuestion} />
      </div>

      {/* Plan wizard + weekly on-track meter — the run-up to the interview cut
          into weekly targets, and this week measured against them. */}
      <div style={{ marginTop: '1.5rem' }}>
        <PlanWizard
          dsaSolvedCount={dsaSolvedCount}
          dsaTotalCount={dsaTotalCount}
          sqlSolvedCount={sqlSolvedCount}
          sqlTotalCount={sqlTotalCount}
        />
        {/* Consecutive plan-weeks met — the widget is ALSO the live detector that
            feeds 'plan-met-log' (utils/planStreak). Renders nothing without a plan. */}
        <GoalStreak dsaSolvedCount={dsaSolvedCount} sqlSolvedCount={sqlSolvedCount} />
      </div>

      {/* The last five problems opened — renders nothing until a trail exists. */}
      <ContinueCard onOpenDsaQuestion={onOpenDsaQuestion} />

      {/* Review queue + weakest patterns — the two panels that turn "solved once"
          into "still know it in the interview". */}
      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '1.5rem' }}>
        <div id="review-queue" className="glass animate-in" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
            <Brain size={18} color="hsl(var(--secondary))" />
            Due for review {(dueQuestions.length > 0 || dueCoreCards > 0 || dueOtherCards > 0) && <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'hsl(var(--medium) / 0.15)', color: 'hsl(var(--medium))', border: '1px solid hsl(var(--medium))', borderRadius: '999px', padding: '0.1rem 0.55rem' }}>{dueIds.length + dueCoreCards + dueOtherCards}</span>}
          </h3>
          {Object.keys(reviews).length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
              After you attempt a problem, rate your recall on its page ("Got it / Shaky / Blanked").
              It will come back here on a 1 → 3 → 7 → 21 → 45 day ladder — spaced repetition is the
              difference between solving something once and still having it in the interview.
            </p>
          ) : dueQuestions.length === 0 ? (
            dueCoreCards > 0 || dueOtherCards > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                  No problems due
                  {dueCoreCards > 0 && ` — ${dueCoreCards} Core CS flashcard${dueCoreCards === 1 ? ' is' : 's are'} waiting`}
                  {dueOtherCards > 0 && `${dueCoreCards > 0 ? ' and' : ' —'} ${dueOtherCards} SQL/glossary/pattern card${dueOtherCards === 1 ? ' is' : 's are'} waiting`}.
                </p>
                {dueCoreCards > 0 && (
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '0.45rem 0.9rem', fontSize: '0.8rem' }} onClick={() => onNavigate('core')}>
                    Review Core CS →
                  </button>
                )}
                {dueOtherCards > 0 && (
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '0.45rem 0.9rem', fontSize: '0.8rem' }} onClick={() => onNavigate('sql')}>
                    Review SQL →
                  </button>
                )}
              </div>
            ) : (
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
              Nothing due today — {Object.keys(reviews).length} review{Object.keys(reviews).length === 1 ? ' is' : 's are'} scheduled and resting. Come back tomorrow.
            </p>
            )
          ) : (
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {dueQuestions.map(q => {
                const overdue = -(daysUntilDue(q.id, reviews) ?? 0);
                return (
                  <button
                    key={q.id}
                    onClick={() => onOpenDsaQuestion(q)}
                    className="question-row"
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.9rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                      color: 'hsl(var(--text-primary))', fontSize: '0.85rem', fontWeight: 600,
                    }}
                  >
                    <span>{q.title}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: overdue > 0 ? 'hsl(var(--medium))' : 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>
                      {overdue > 0 ? `${overdue}d overdue` : 'due today'}
                    </span>
                  </button>
                );
              })}
              {dueIds.length > dueQuestions.length && (
                <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>…and {dueIds.length - dueQuestions.length} more once these are done.</span>
              )}
              {dueCoreCards > 0 && (
                <button
                  onClick={() => onNavigate('core')}
                  className="question-row"
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.9rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    background: 'hsl(var(--secondary) / 0.08)', border: '1px dashed hsl(var(--secondary) / 0.5)',
                    color: 'hsl(var(--text-primary))', fontSize: '0.85rem', fontWeight: 600,
                  }}
                >
                  <span>Core CS flashcards</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'hsl(var(--secondary))', whiteSpace: 'nowrap' }}>
                    {dueCoreCards} due →
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="glass animate-in" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
            <TrendingDown size={18} color="hsl(var(--hard))" />
            Thinnest patterns
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
            Interviewers name patterns, not topics. These are yours with the least coverage — open DSA → "By Pattern" to drill one.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {weakPatterns.map(w => {
              const pct = Math.round((w.solved / w.total) * 100);
              return (
                <div key={w.pattern}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{w.pattern}</span>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>{w.solved}/{w.total}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'hsl(var(--bg-tertiary))', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(pct, 2)}%`, height: '100%', borderRadius: '3px', background: pct >= 60 ? 'hsl(var(--easy))' : pct >= 25 ? 'hsl(var(--medium))' : 'hsl(var(--hard))', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* What the last 7 days actually looked like — reviews, blanks by pattern,
            focus sessions and drills, compressed into headlines. */}
        <DigestCard />

        {/* Contests are the only real deadlines this practice has — keep the
            next two in view, on the learner's own clock. */}
        <ContestCountdown />
      </div>

      {/* Progress backup — months of solves, notes and schedules live in localStorage,
          one cache-clear away from gone. Put the file in the learner's hands. */}
      <div className="glass animate-in" style={{ marginTop: '1.5rem', padding: '1rem 1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', flex: 1, minWidth: '240px' }}>
          Your progress (solves, notes, code attempts, review schedule) is stored only in this browser. Keep a backup.
        </span>
        <button className="btn btn-secondary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }} onClick={exportProgress}>
          <Download size={14} /> Export progress
        </button>
        <button className="btn btn-secondary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }} onClick={exportNotes}>
          <FileText size={14} /> Export notes (.md)
        </button>
        <button className="btn btn-secondary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }} onClick={() => fileInput.current?.click()}>
          <Upload size={14} /> Restore backup
        </button>
        <input ref={fileInput} type="file" accept="application/json" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) importProgress(f); e.target.value = ''; }} />
      </div>

      {/* Data freedom row — the same data, but off this machine: a private gist for
          cross-device sync, and a share card for the humans keeping you honest. */}
      <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '1.5rem' }}>
        <GistSync />
        <ShareCard
          dsaSolvedCount={dsaSolvedCount}
          dsaTotalCount={dsaTotalCount}
          sqlSolvedCount={sqlSolvedCount}
          sqlTotalCount={sqlTotalCount}
          streak={streak}
          solvedDsaIds={solvedDsaIds}
        />
      </div>

      {/* Recommended Topics / Study Plan */}
      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>How to use this sheet</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '1.5rem' }}>
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'hsl(var(--secondary))' }}>
              <Award size={18} />
              <span>1. Master Two-Pointer Swaps</span>
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
              Often used in sorting or reverse array questions. Understanding how left and right pointers converge can save you O(N) auxiliary space. Make sure to watch for empty or single element edge cases.
            </p>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'hsl(var(--accent))' }}>
              <Award size={18} />
              <span>2. Windows and Partition CTEs</span>
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
              SQL interviewers love DENSE_RANK() and ROW_NUMBER() combined with PARTITION BY. Always clarify if duplicate values should rank equally or increment.
            </p>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'hsl(var(--easy))' }}>
              <CheckCircle size={18} />
              <span>3. Write Out Pseudo-code First</span>
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
              Don't jump straight into syntax. Spend 5 minutes clarifying edge cases and writing the pseudo-code logic. Interviewers look for structured logical flow before compilation.
            </p>
          </div>
        </div>
      </div>
    </div>
    </WarmupGate>
  );
};
