import { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CommandPalette } from './components/CommandPalette';
import type { PaletteActionId } from './components/CommandPalette';
import { GuidedTour } from './components/GuidedTour';
import { ShortcutsModal } from './components/ShortcutsModal';
import { toggleTheme } from './components/ThemeToggle';
import { buildBackupPayload, downloadFile } from './utils/backup';
import { MockDrill } from './components/MockDrill';
import { ScrollProgressBar } from './components/MotionExtras';
import { Stats } from './components/Stats';
import { DSAHub } from './components/DSAHub';
import { CoreHub } from './components/CoreHub';
// Lazy, unlike every other tab: the DevOps JSONs are ~1.3 MB of prose, and a
// statically imported hub would put all of it in the main bundle for everyone,
// including the learner who only ever opens DSA. The dynamic import splits it
// into a chunk that is fetched the first time the tab is actually opened.
const DevOpsHub = lazy(() => import('./components/DevOpsHub').then(m => ({ default: m.DevOpsHub })));
import { SQLHub } from './components/SQLHub';
import { ProblemViewer } from './components/ProblemViewer';
import { SQLViewer } from './components/SQLViewer';
import { dsaQuestions } from './data/dsaQuestions';
import type { Question } from './data/dsaQuestions';
import { sqlQuestions } from './data/sqlQuestions';
import type { SQLQuestion } from './data/sqlQuestions';
import { DueReviewNudge } from './components/Toast';
import { ChallengeInvite } from './components/ChallengeInvite';
import { PeerReviewInbox } from './components/PeerReviewInbox';
import { SessionSummary } from './components/SessionSummary';
import { fireConfetti } from './utils/Confetti';
import { updateAppBadge } from './utils/badging';
import { maybeSnapshotToday } from './utils/snapshots';
import type { BeforeInstallPromptEvent } from './components/InstallPrompt';
import {
  STORAGE_KEYS,
  calculateCurrentStreak,
  getTodayKey,
  markStudyDay,
  readStringArray,
  readStudyMeta,
  writeJson,
} from './utils/persistence';

function App() {
  // The installed app's manifest shortcuts land on ?tab=drill etc. (see
  // vite.config.ts). Read once at first render and validated against the real
  // tab ids, so a stale or hand-typed URL degrades to the dashboard instead of
  // rendering an empty main pane.
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab && ['dashboard', 'dsa', 'sql', 'devops', 'core', 'drill', 'stats'].includes(tab)
      ? tab
      : 'dashboard';
  });
  
  // Selected Problem States
  const [selectedDsaQuestion, setSelectedDsaQuestion] = useState<Question | null>(null);
  const [selectedSqlQuestion, setSelectedSqlQuestion] = useState<SQLQuestion | null>(null);

  // User Progress States (Synced with LocalStorage)
  const [solvedDsaIds, setSolvedDsaIds] = useState<string[]>(() => {
    return readStringArray(STORAGE_KEYS.solvedDsaIds);
  });
  const [bookmarkedDsaIds, setBookmarkedDsaIds] = useState<string[]>(() => {
    return readStringArray(STORAGE_KEYS.bookmarkedDsaIds);
  });

  const [solvedSqlIds, setSolvedSqlIds] = useState<string[]>(() => {
    return readStringArray(STORAGE_KEYS.solvedSqlIds);
  });
  const [bookmarkedSqlIds, setBookmarkedSqlIds] = useState<string[]>(() => {
    return readStringArray(STORAGE_KEYS.bookmarkedSqlIds);
  });
  const [studyDays, setStudyDays] = useState<string[]>(() => readStudyMeta().studyDays);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Chromium's install offer, captured below so the Sidebar card can replay it
  // on the learner's schedule instead of the browser's.
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);

  const streak = calculateCurrentStreak(studyDays);

  // ⌘K / Ctrl+K opens the jump-to-anything palette from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);



  // Installed-app icon badge = due-review count. Refreshed on load, after every
  // grade (utils/review dispatches 'review-changed'), and on tab return — "due"
  // rolls over at midnight while the tab sleeps. No-ops in a plain browser tab.
  useEffect(() => {
    updateAppBadge();
    window.addEventListener('review-changed', updateAppBadge);
    document.addEventListener('visibilitychange', updateAppBadge);
    return () => {
      window.removeEventListener('review-changed', updateAppBadge);
      document.removeEventListener('visibilitychange', updateAppBadge);
    };
  }, []);

  // [platform-safety] Feature 35: once per local day, bank the whole APP_KEY
  // payload into IndexedDB (7 kept, oldest out) — the net under every restore
  // button in the app. Fire-and-forget: the safety net must never take the app
  // down with it, so failures are swallowed inside and retried next open.
  // Guarded against StrictMode's double effect run by a module-level flag.
  useEffect(() => {
    void maybeSnapshotToday();
  }, []);

  // Stash the install offer. preventDefault silences Chrome's own mini-infobar;
  // the stashed event object IS the permission to prompt later (see InstallPrompt).
  useEffect(() => {
    const onInstallOffer = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstallOffer);
    return () => window.removeEventListener('beforeinstallprompt', onInstallOffer);
  }, []);

  // Two tabs open, each holding its own in-memory copy of these five arrays: tab 2
  // solving a problem writes its OWN copy (which never learned about tab 1's solve)
  // straight over localStorage, silently erasing tab 1's work — confirmed by a real
  // two-tab repro. The native `storage` event fires in every OTHER tab the instant
  // one tab writes, so re-reading on that event keeps every tab's in-memory state
  // caught up before its own next write could stomp a sibling's.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.solvedDsaIds) setSolvedDsaIds(readStringArray(STORAGE_KEYS.solvedDsaIds));
      else if (e.key === STORAGE_KEYS.bookmarkedDsaIds) setBookmarkedDsaIds(readStringArray(STORAGE_KEYS.bookmarkedDsaIds));
      else if (e.key === STORAGE_KEYS.solvedSqlIds) setSolvedSqlIds(readStringArray(STORAGE_KEYS.solvedSqlIds));
      else if (e.key === STORAGE_KEYS.bookmarkedSqlIds) setBookmarkedSqlIds(readStringArray(STORAGE_KEYS.bookmarkedSqlIds));
      else if (e.key === STORAGE_KEYS.studyMeta) setStudyDays(readStudyMeta().studyDays);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Sync state changes to local storage
  useEffect(() => {
    writeJson(STORAGE_KEYS.solvedDsaIds, solvedDsaIds);
  }, [solvedDsaIds]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.bookmarkedDsaIds, bookmarkedDsaIds);
  }, [bookmarkedDsaIds]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.solvedSqlIds, solvedSqlIds);
  }, [solvedSqlIds]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.bookmarkedSqlIds, bookmarkedSqlIds);
  }, [bookmarkedSqlIds]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.studyMeta, { studyDays });
  }, [studyDays]);

  // Toggle handlers
  const handleToggleDsaSolved = (id: string) => {
    const wasSolved = solvedDsaIds.includes(id);
    if (!wasSolved) {
      // Celebrations are decided BEFORE state moves, so "first of the day" and
      // "topic complete" describe the click that caused them. Two of the three
      // confetti moments live on this click: the day's first solve (the streak
      // survives another day) and a topic reaching 100%.
      const q = dsaQuestions.find((item) => item.id === id);
      const topicDone =
        !!q &&
        dsaQuestions
          .filter((item) => item.topic === q.topic)
          .every((item) => item.id === id || solvedDsaIds.includes(item.id));
      if (topicDone || !studyDays.includes(getTodayKey())) fireConfetti();
      // Tell the achievement watcher (AchievementGallery, alive app-wide because
      // Stats stays mounted) that progress moved. It re-reads storage a beat
      // later, once React's effects have persisted this click's new state.
      window.dispatchEvent(new Event('progress-changed'));
    }
    setSolvedDsaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (!wasSolved) {
      setStudyDays((currentDays) => markStudyDay(currentDays));
    }
  };

  const handleToggleDsaBookmark = (id: string) => {
    setBookmarkedDsaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSqlSolved = (id: string) => {
    const wasSolved = solvedSqlIds.includes(id);
    // First solve of the day fires here too — the streak doesn't care which
    // half of the site kept it alive.
    if (!wasSolved && !studyDays.includes(getTodayKey())) fireConfetti();
    // Same achievement signal as the DSA toggle — SQL solves count too.
    if (!wasSolved) window.dispatchEvent(new Event('progress-changed'));
    setSolvedSqlIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (!wasSolved) {
      setStudyDays((currentDays) => markStudyDay(currentDays));
    }
  };

  const handleToggleSqlBookmark = (id: string) => {
    setBookmarkedSqlIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Navigating to detail clears other detail state to keep UI clean
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setSelectedDsaQuestion(null);
    setSelectedSqlQuestion(null);
  };

  // [discover] ⌘K quick actions. Every case maps onto behaviour the app already
  // has (drill tab, dashboard export, sidebar theme toggle) — the palette adds
  // reach, not machinery, so each verb keeps exactly one implementation.
  const handlePaletteAction = (actionId: PaletteActionId) => {
    switch (actionId) {
      case 'start-drill':
        handleTabChange('drill');
        break;
      case 'random-unsolved': {
        const pool = dsaQuestions.filter((q) => !solvedDsaIds.includes(q.id));
        if (pool.length === 0) {
          // Everything is solved — the hub's own states say that better than a
          // "random unsolved" pick that could only lie.
          handleTabChange('dsa');
          break;
        }
        const q = pool[Math.floor(Math.random() * pool.length)];
        // Deliberately NOT handleTabChange — that clears the selection this sets.
        setCurrentTab('dsa');
        setSelectedSqlQuestion(null);
        setSelectedDsaQuestion(q);
        break;
      }
      case 'review-flashcards':
        handleTabChange('core');
        break;
      case 'export-progress':
        // Same payload, same filename shape as the Dashboard's export button —
        // both go through utils/backup, so the files stay interchangeable.
        downloadFile(
          `striver-sde-progress-${new Date().toISOString().slice(0, 10)}.json`,
          JSON.stringify(buildBackupPayload(), null, 1),
          'application/json',
        );
        break;
      case 'toggle-theme':
        toggleTheme();
        break;
      case 'open-settings':
        // SettingsPanel keeps its open-state private inside the Sidebar; the
        // event is the narrowest bridge that doesn't lift that state up here.
        window.dispatchEvent(new Event('open-settings'));
        break;
    }
  };

  // ---- Topic-order navigation for the problem page ---------------------------
  // ProblemViewer renders ONE question and stays deliberately ignorant of the
  // catalogue's order; the neighbour arithmetic lives here, where the selection
  // state already does. Plain derivation (no memo): a filter over ~190 rows per
  // render is cheaper than the invalidation bookkeeping.
  const dsaNav = (() => {
    if (!selectedDsaQuestion) return null;
    const topicList = dsaQuestions.filter((q) => q.topic === selectedDsaQuestion.topic);
    const idx = topicList.findIndex((q) => q.id === selectedDsaQuestion.id);
    const unsolved = dsaQuestions.filter(
      (q) => !solvedDsaIds.includes(q.id) && q.id !== selectedDsaQuestion.id,
    );
    return {
      hasPrev: idx > 0,
      hasNext: idx >= 0 && idx < topicList.length - 1,
      onPrev: () => { if (idx > 0) setSelectedDsaQuestion(topicList[idx - 1]); },
      onNext: () => { if (idx >= 0 && idx < topicList.length - 1) setSelectedDsaQuestion(topicList[idx + 1]); },
      // Undefined (button hidden) when everything else is solved: a shuffle that
      // could only re-deal solved problems would be a lie labelled "unsolved".
      onRandom: unsolved.length > 0
        ? () => setSelectedDsaQuestion(unsolved[Math.floor(Math.random() * unsolved.length)])
        : undefined,
    };
  })();

  // Progress Calculations
  const dsaProgress = dsaQuestions.length > 0 ? (solvedDsaIds.length / dsaQuestions.length) * 100 : 0;
  const sqlProgress = sqlQuestions.length > 0 ? (solvedSqlIds.length / sqlQuestions.length) * 100 : 0;

  return (
    <div className="app-container">
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenDsa={(q) => {
          setCurrentTab('dsa');
          setSelectedSqlQuestion(null);
          setSelectedDsaQuestion(q);
        }}
        onOpenSql={(q) => {
          setCurrentTab('sql');
          setSelectedDsaQuestion(null);
          setSelectedSqlQuestion(q);
        }}
        onAction={handlePaletteAction}
        onOpenTheory={(kind) => handleTabChange(kind === 'core' ? 'core' : 'dsa')}
      />
      {/* [discover] First-run spotlight tour + the ? cheat sheet — both render
          nothing until summoned (first visit, 'start-tour' event, or the ? key). */}
      <GuidedTour
        onNavigate={handleTabChange}
        onOpenSampleProblem={() => {
          // The tour's "Your Turn" stops need a real problem page on screen.
          // Deliberately NOT handleTabChange — that clears the selection this sets.
          setCurrentTab('dsa');
          setSelectedSqlQuestion(null);
          setSelectedDsaQuestion(dsaQuestions[0]);
        }}
      />
      <ShortcutsModal />
      {/* One dismissible nudge per day when the review queue piles up (>= 3 due).
          Mounted app-wide so it fires on load whichever tab the learner lands on. */}
      <DueReviewNudge onJump={() => {
        // A tab switch alone left the review card 724px below the fold on a
        // 900px viewport — clicking "Review now" visibly did nothing. Scroll
        // to it once the Dashboard has actually mounted.
        handleTabChange('dashboard');
        requestAnimationFrame(() => {
          document.getElementById('review-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }} />
      {/* Friend-challenge links (#ch=...) surface here as a one-shot banner;
          accepting arms MockDrill through the 'drill-preset' key + event. */}
      <ChallengeInvite onStart={() => handleTabChange('drill')} />
      {/* Peer-review links (#pr=...) — the receiving half of PeerReviewComposer
          (mounted per-question in ProblemViewer/SQLViewer). Same one-shot-banner
          shape, same onOpenDsa/onOpenSql pattern CommandPalette already uses. */}
      <PeerReviewInbox
        onOpenDsa={(q) => {
          setCurrentTab('dsa');
          setSelectedSqlQuestion(null);
          setSelectedDsaQuestion(q);
        }}
        onOpenSql={(q) => {
          setCurrentTab('sql');
          setSelectedDsaQuestion(null);
          setSelectedSqlQuestion(q);
        }}
      />
      {/* Session bookend: stashes a summary when the tab hides after 10+ visible
          minutes ('session-mark'), and greets the NEXT open with one small
          "Last session: …" toast. */}
      <SessionSummary />
      {/* Motion chrome: the top scroll beam. (The cursor aura was tried and cut —
          a ring chasing the pointer reads as lag, not delight.) */}
      <ScrollProgressBar />
      <Sidebar
        currentTab={currentTab} 
        setCurrentTab={handleTabChange}
        dsaProgress={dsaProgress}
        sqlProgress={sqlProgress}
        installPrompt={installEvt}
      />
      
      <main className="main-content">
        {currentTab === 'dashboard' && (
          <Dashboard 
            dsaProgress={dsaProgress}
            sqlProgress={sqlProgress}
            dsaSolvedCount={solvedDsaIds.length}
            dsaTotalCount={dsaQuestions.length}
            sqlSolvedCount={solvedSqlIds.length}
            sqlTotalCount={sqlQuestions.length}
            streak={streak}
            bookmarkCount={bookmarkedDsaIds.length + bookmarkedSqlIds.length}
            onNavigate={handleTabChange}
            solvedDsaIds={solvedDsaIds}
            onOpenDsaQuestion={(q) => {
              // Deliberately NOT handleTabChange — that clears the selection this sets.
              setCurrentTab('dsa');
              setSelectedSqlQuestion(null);
              setSelectedDsaQuestion(q);
            }}
          />
        )}

        {currentTab === 'dsa' && (
          selectedDsaQuestion ? (
            <ProblemViewer 
              question={selectedDsaQuestion}
              hasPrev={dsaNav?.hasPrev ?? false}
              hasNext={dsaNav?.hasNext ?? false}
              onPrev={dsaNav?.onPrev}
              onNext={dsaNav?.onNext}
              onRandom={dsaNav?.onRandom}
              onBack={() => setSelectedDsaQuestion(null)}
              solvedQuestionIds={solvedDsaIds}
              bookmarkedQuestionIds={bookmarkedDsaIds}
              onToggleSolved={handleToggleDsaSolved}
              onToggleBookmark={handleToggleDsaBookmark}
              onOpenQuestion={(q) => {
                // Similar-problems jump: swap the open problem in place, keeping
                // the DSA tab (handleTabChange would clear the selection this sets).
                setSelectedSqlQuestion(null);
                setSelectedDsaQuestion(q);
              }}
            />
          ) : (
            <DSAHub 
              solvedQuestionIds={solvedDsaIds}
              bookmarkedQuestionIds={bookmarkedDsaIds}
              onToggleSolved={handleToggleDsaSolved}
              onToggleBookmark={handleToggleDsaBookmark}
              onSelectQuestion={setSelectedDsaQuestion}
            />
          )
        )}

        {currentTab === 'sql' && (
          selectedSqlQuestion ? (
            <SQLViewer 
              question={selectedSqlQuestion}
              onBack={() => setSelectedSqlQuestion(null)}
              solvedSqlIds={solvedSqlIds}
              bookmarkedSqlIds={bookmarkedSqlIds}
              onToggleSolved={handleToggleSqlSolved}
              onToggleBookmark={handleToggleSqlBookmark}
            />
          ) : (
            <SQLHub 
              solvedSqlIds={solvedSqlIds}
              bookmarkedSqlIds={bookmarkedSqlIds}
              onToggleSolved={handleToggleSqlSolved}
              onToggleBookmark={handleToggleSqlBookmark}
              onSelectQuestion={setSelectedSqlQuestion}
            />
          )
        )}

        {/* Core CS is a plain conditional mount — unlike MockDrill/Stats below, it
            owns no timers or portals that must survive a tab switch, and unmounting
            on leave means every visit re-reads the review schedule, so the flashcard
            deck rebuilds from whatever came due since the last look. */}
        {currentTab === 'core' && <CoreHub />}

        {/* Same mount-on-visit behaviour as Core CS, wrapped in Suspense because the
            hub and its content arrive as a separate chunk (see the lazy import). */}
        {currentTab === 'devops' && (
          <Suspense
            fallback={
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                Loading the DevOps material…
              </div>
            }
          >
            <DevOpsHub />
          </Suspense>
        )}

        {/* Mock drill is hidden, not unmounted, when another tab is open: an in-flight
            drill's clock must keep running while the learner is on the problem page,
            and its floating timer bar (a portal, so display:none here can't hide it)
            is what keeps the countdown visible there. `currentTab === 'drill' &&`
            would unmount it and kill both. */}
        <div style={{ display: currentTab === 'drill' ? 'block' : 'none' }}>
          <MockDrill
            onOpenQuestion={(q) => {
              // Deliberately NOT handleTabChange — that clears the selection this sets.
              setCurrentTab('dsa');
              setSelectedSqlQuestion(null);
              setSelectedDsaQuestion(q);
            }}
          />
        </div>

        {/* Stats follows the MockDrill pattern: hidden, not unmounted, so an
            in-flight focus timer keeps ticking (and logging) while the learner
            is on a problem page. Its floating clock is a portal, so the
            display:none here can't hide it. */}
        <div style={{ display: currentTab === 'stats' ? 'block' : 'none' }}>
          <Stats
            active={currentTab === 'stats'}
            solvedDsaIds={solvedDsaIds}
            onOpenQuestion={(q) => {
              // Deliberately NOT handleTabChange — that clears the selection this sets.
              setCurrentTab('dsa');
              setSelectedSqlQuestion(null);
              setSelectedDsaQuestion(q);
            }}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
