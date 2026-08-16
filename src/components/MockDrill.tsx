import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Timer, Play, SkipForward, CheckCircle, ExternalLink, Hourglass, RotateCcw, Zap, Meh, CloudOff, Swords, Maximize2, Minimize2, Link2,
} from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { readJson, writeJson, removeStoredValue, readStringArray, STORAGE_KEYS } from '../utils/persistence';
import { gradeQuestion, todayISO, type Recall } from '../utils/review';
import { useWakeLock } from '../utils/wakeLock';
import { fireConfetti } from '../utils/Confetti';
import { buildChallengeUrl, isDrillPreset } from '../utils/challenge';
import type { DrillPreset } from '../utils/challenge';
import { DRILL_MODES, type SimMode } from './drillModes';
import { PatternSprint } from './PatternSprint';
import { EdgeCaseHunter } from './EdgeCaseHunter';
import { FullLoopMock } from './FullLoopMock';

interface MockDrillProps {
  /** Jump to a problem's page. The drill stays mounted while you're there. */
  onOpenQuestion: (q: Question) => void;
}

/**
 * Timed mock drill — an interview simulation, not a quiz.
 *
 * Solving with unlimited time and a visible solution tab measures knowledge. Interviews
 * measure knowledge under a clock, on a problem you didn't pick. This screen recreates
 * that: a random set, one shared countdown, no pause button, and a report that feeds the
 * same review ladder as everything else — so a drill you bombed schedules its own revenge.
 *
 * The countdown is derived from a stored start timestamp, never from a ticking counter:
 * a counter freezes whenever the tab sleeps or reloads, which is exactly the accidental
 * pause button a simulation must not have.
 */

type Outcome = 'pending' | 'done' | 'skipped' | 'timeout';
type MixKey = 'any' | 'easy-medium' | 'medium-hard';

interface DrillProblem {
  id: string;
  outcome: Outcome;
  /** ms actually spent, stamped when the learner moves past it. Unset = never reached. */
  elapsedMs?: number;
}

interface DrillState {
  /** Epoch ms. Remaining time is always startedAt + budgetMs - Date.now(). */
  startedAt: number;
  budgetMs: number;
  problems: DrillProblem[];
  /** Index of the problem currently in front of the learner. */
  current: number;
  /** Epoch ms the current problem was reached — for the per-problem split. */
  problemStartedAt: number;
  /** Set once the drill ends; only ever lives in memory (storage is cleared by then). */
  finishedAt?: number;
  /** Lockdown practice (feature 11: "Vegeta mode") — leaving the tab auto-submits,
   *  and copy/paste are blocked for the duration. Stamped into the drill itself
   *  (not read from a separate setting) so a reload mid-drill still enforces it. */
  vegetaMode?: boolean;
  /** Why the drill actually ended — the results screen tells a very different
   *  story for "you got caught leaving" than for "the clock ran out". */
  endedReason?: 'clock' | 'left-tab' | 'finished';
}

const KEY = 'mockDrill';
// 35 minutes: roughly how long an interviewer lets you drive before they start steering.
const PER_PROBLEM_MS = 35 * 60_000;

const LENGTHS = [
  { count: 1, label: '1 problem', hint: '35 min — one phone-screen round' },
  { count: 3, label: '3 problems', hint: '105 min — a full onsite block' },
  { count: 5, label: '5 problems', hint: '175 min — an endurance session' },
];

const MIXES: { key: MixKey; label: string; hint: string; allowed: Question['difficulty'][] }[] = [
  { key: 'any', label: 'Any difficulty', hint: 'The whole sheet, luck of the draw', allowed: ['Easy', 'Medium', 'Hard'] },
  { key: 'easy-medium', label: 'Easy – Medium', hint: 'Early rounds and screens', allowed: ['Easy', 'Medium'] },
  { key: 'medium-hard', label: 'Medium – Hard', hint: 'Onsite loops and finals', allowed: ['Medium', 'Hard'] },
];

// Same three honest answers, same hues, as RecallRating — the drill feeds the same ladder.
const RECALLS: { key: Recall; label: string; hue: string; icon: React.ReactNode }[] = [
  { key: 'easy', label: 'Got it', hue: 'easy', icon: <Zap size={13} /> },
  { key: 'shaky', label: 'Shaky', hue: 'medium', icon: <Meh size={13} /> },
  { key: 'blanked', label: 'Blanked', hue: 'hard', icon: <CloudOff size={13} /> },
];

const OUTCOME_META: Record<Exclude<Outcome, 'pending'>, { label: string; hue: string; icon: React.ReactNode }> = {
  done: { label: 'Done', hue: 'easy', icon: <CheckCircle size={13} /> },
  skipped: { label: 'Skipped', hue: 'medium', icon: <SkipForward size={13} /> },
  timeout: { label: 'Out of time', hue: 'hard', icon: <Hourglass size={13} /> },
};

const OUTCOMES: Outcome[] = ['pending', 'done', 'skipped', 'timeout'];

// Strict shape check before trusting localStorage: a stale or hand-edited blob must
// degrade to "no drill", not to a crash on the drill screen. Ids are checked against the
// current question set so a data update can't resume a drill pointing at nothing.
const isDrillState = (v: unknown): v is DrillState => {
  if (!v || typeof v !== 'object') return false;
  const d = v as DrillState;
  return (
    typeof d.startedAt === 'number' &&
    typeof d.budgetMs === 'number' &&
    typeof d.current === 'number' &&
    typeof d.problemStartedAt === 'number' &&
    Array.isArray(d.problems) &&
    d.problems.length > 0 &&
    d.current >= 0 &&
    d.current < d.problems.length &&
    d.problems.every(
      (p) => p && typeof p.id === 'string' && OUTCOMES.includes(p.outcome) &&
        dsaQuestions.some((q) => q.id === p.id),
    )
  );
};

// Fisher–Yates. Math.random() is plenty: the stake is variety between drills, not fairness.
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Ceil, not floor: the display should read 35:00 at the start and hit 0:00 exactly when
// the budget is spent, never show 0:00 with a second still on the clock.
const fmt = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const diffHue = (d: Question['difficulty']) => (d === 'Easy' ? 'easy' : d === 'Medium' ? 'medium' : 'hard');

export const MockDrill: React.FC<MockDrillProps> = ({ onOpenQuestion }) => {
  // Resume straight from storage: an in-flight drill survives a reload with the clock
  // still bleeding, because the clock is a timestamp, not a counter.
  const [drill, setDrill] = useState<DrillState | null>(() => readJson<DrillState | null>(KEY, null, isDrillState));
  const [results, setResults] = useState<DrillState | null>(null);
  const [length, setLength] = useState(3);
  const [mix, setMix] = useState<MixKey>('any');
  // Setup-screen toggle for the NEXT drill — plain component state, same as
  // length/mix, not persisted between visits. Once a drill starts it is copied
  // onto DrillState itself (see start()), which IS persisted.
  const [vegetaModeSetting, setVegetaModeSetting] = useState(false);
  const [copyBlockedFlash, setCopyBlockedFlash] = useState(false);
  // ---- Friend-challenge preset (utils/challenge.ts) ---------------------------
  // A challenge link parsed by App lands here as validated question ids. Read at
  // init for the reloaded-with-a-preset case, and again on the event App fires
  // when a banner is accepted — App's effects run AFTER this component's first
  // render (it stays mounted app-wide), so init-time state alone would always
  // miss a live accept.
  const [preset, setPreset] = useState<DrillPreset | null>(
    () => readJson<DrillPreset | null>('drill-preset', null, isDrillPreset),
  );
  useEffect(() => {
    const onPreset = () => setPreset(readJson<DrillPreset | null>('drill-preset', null, isDrillPreset));
    window.addEventListener('drill-preset-changed', onPreset);
    return () => window.removeEventListener('drill-preset-changed', onPreset);
  }, []);
  /** 'copied' feedback for the results screen's challenge-link button. */
  const [challengeCopied, setChallengeCopied] = useState(false);
  // Which simulation flavour the setup screen offers. Only 'classic' consumes the
  // length/difficulty pickers; the other modes mount their own components, so this
  // state never leaks into the running-drill machinery (or finish()) below.
  const [simMode, setSimMode] = useState<SimMode>('classic');
  /** Which problems have been logged to the review queue, and with what. */
  const [logged, setLogged] = useState<Record<string, Recall>>({});
  const [now, setNow] = useState(() => Date.now());
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHidden, setPanelHidden] = useState(false);
  // Vegeta mode's listeners read this instead of closing over `drill` directly —
  // they only re-subscribe when vegetaMode flips, so a closed-over `drill` would
  // go stale the moment the learner advances to the next problem mid-drill.
  const drillRef = useRef<DrillState | null>(null);
  useEffect(() => { drillRef.current = drill; }, [drill]);

  const byId = useMemo(() => new Map(dsaQuestions.map((q) => [q.id, q])), []);

  // An active drill claims the screen (feature 28): a display that dozes off
  // mid-countdown is an accidental skip-ahead — the clock is a timestamp and
  // keeps bleeding while the screen sleeps. Released automatically on finish,
  // abandon, and unmount; silently absent where the API is unsupported.
  useWakeLock(!!drill);

  // Fullscreen state (feature 30), kept honest by the browser's own event — Esc
  // and F11 leave fullscreen without asking us, so the icon must follow
  // fullscreenElement instead of remembering what we last requested.
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  );
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);
  // iOS Safari ships no element fullscreen: the toggle renders disabled-with-a-
  // reason there rather than vanishing — an honest "can't" beats a silent nothing.
  const fullscreenSupported =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function';
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Request denied (sandboxed frame, gesture rules) — the fullscreenchange
      // listener already keeps the icon truthful, so there is nothing to repair.
    }
  };

  // Every transition lands in localStorage immediately — "I accidentally closed the tab"
  // is not an excuse an interviewer accepts, so the drill shouldn't accept it either.
  useEffect(() => {
    if (drill) writeJson(KEY, drill);
  }, [drill]);

  // Re-render once a second while a drill runs. This only refreshes the *display*;
  // remaining time is derived from startedAt on every render, so a throttled or slept
  // interval can delay the repaint but never stretch the budget.
  useEffect(() => {
    if (!drill) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [drill]);

  // App hides this component with display:none instead of unmounting it (see wiring),
  // so the drill survives navigation. When our inline panel loses its offsetParent it is
  // invisible — that's the moment the floating bar must take over as the only clock.
  useEffect(() => {
    const hidden = !!panelRef.current && panelRef.current.offsetParent === null;
    if (hidden !== panelHidden) setPanelHidden(hidden);
  });

  const finish = (finalState: DrillState, endedAt: number, endedReason: DrillState['endedReason'] = 'clock') => {
    // The drill is over — clear the saved copy so a reload cannot resurrect a dead clock.
    removeStoredValue(KEY);
    // A one-line record outlives the cleared drill state: the weekly digest and the
    // readiness radar read this log — without it, finished drills simply vanish.
    const rawLog = readJson<unknown>('drill-log', []);
    const log = Array.isArray(rawLog) ? rawLog : [];  // corrupted key must not eat results
    writeJson('drill-log', [
      ...log,
      {
        // todayISO, not toISOString().slice(0,10): every reader of this log windows on
        // LOCAL calendar days (digest's "last 7 days", the personal-bests date), so a
        // UTC stamp pushed an evening drill west of Greenwich onto tomorrow — outside
        // the window that was meant to contain it. Older rows keep whatever date they
        // were written with; re-dating a learner's history after the fact would move
        // drills they remember doing.
        on: todayISO(new Date(endedAt)),
        outcomes: finalState.problems.map(pr => pr.outcome),
        mode: 'classic',
        // Wall-clock duration, for the personal-bests card. Optional on purpose:
        // older rows and other writers don't have it, and every reader treats
        // {on, outcomes} as the whole contract.
        usedMs: Math.max(0, endedAt - finalState.startedAt),
      },
    ].slice(-60));
    // Every problem dispatched inside the budget — the exact outcome the whole
    // simulation trains for. Skips still count as finishing on your own terms;
    // timeouts (and never-reached problems, which the clock effect stamps as
    // 'timeout' before calling finish) do not.
    if (endedReason === 'clock' && finalState.problems.every((p) => p.outcome !== 'timeout' && p.outcome !== 'pending')) {
      fireConfetti();
    }
    setResults({ ...finalState, finishedAt: endedAt, endedReason });
    setDrill(null);
  };

  // Time's up. The current problem keeps its true elapsed, capped at the drill's end so
  // a reload hours later can't inflate it; problems never reached stay blank.
  useEffect(() => {
    if (!drill) return;
    const end = drill.startedAt + drill.budgetMs;
    if (now < end) return;
    const problems = drill.problems.map((p, i) =>
      p.outcome !== 'pending'
        ? p
        : {
            ...p,
            outcome: 'timeout' as const,
            elapsedMs: i === drill.current ? Math.max(0, end - drill.problemStartedAt) : undefined,
          },
    );
    finish({ ...drill, problems }, end, 'clock');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, drill]);

  // ---- Vegeta mode: lockdown enforcement ---------------------------------------
  // Every listener here is gated on drill?.vegetaMode and stays live even while
  // this component is display:none (App hides, never unmounts it — see wiring),
  // which is exactly what lets a learner tab away to ProblemViewer to solve while
  // this keeps watching. Honest about its own limits: a browser tab cannot
  // actually PREVENT navigation or app-switching, only detect it and react —
  // real lockdown software works at the OS level, this does not pretend to.
  useEffect(() => {
    if (!drill?.vegetaMode) return;

    const onVisibilityChange = () => {
      if (!document.hidden) return; // only care about LEAVING, not returning
      const curr = drillRef.current;
      if (!curr || !curr.vegetaMode) return;
      const end = Date.now();
      const problems = curr.problems.map((p, i) =>
        p.outcome !== 'pending'
          ? p
          : { ...p, outcome: 'timeout' as const, elapsedMs: i === curr.current ? Math.max(0, end - curr.problemStartedAt) : undefined },
      );
      finish({ ...curr, problems }, end, 'left-tab');
    };

    const blockClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      setCopyBlockedFlash(true);
      window.setTimeout(() => setCopyBlockedFlash(false), 1600);
    };

    // The only real lever a browser exposes for "warn before leaving" — a
    // generic confirm, never a custom message (browsers ignore custom text here).
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('copy', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('copy', blockClipboard);
      document.removeEventListener('cut', blockClipboard);
      document.removeEventListener('paste', blockClipboard);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill?.vegetaMode]);

  const start = () => {
    // A pending friend challenge overrides the random draw: same problems, same
    // order, so both people run the same gauntlet. Consumed on start — a preset
    // is an invitation, not a setting.
    if (preset) {
      const picked = preset.ids
        .map((id) => dsaQuestions.find((q) => q.id === id))
        .filter((q): q is Question => !!q);
      removeStoredValue('drill-preset');
      setPreset(null);
      if (picked.length > 0) {
        const t = Date.now();
        // `now` only advances from the once-a-second interval, which exists solely while
        // a drill runs — so it is as stale as the time since mount. Re-stamp it with the
        // same instant the drill starts, or the first paint of the clock shows the budget
        // plus all that idle drift before the first tick corrects it.
        setNow(t);
        setLogged({});
        setResults(null);
        setDrill({
          startedAt: t,
          budgetMs: picked.length * PER_PROBLEM_MS,
          problems: picked.map((q) => ({ id: q.id, outcome: 'pending' as const })),
          current: 0,
          problemStartedAt: t,
          vegetaMode: vegetaModeSetting,
        });
        return;
      }
      // Every id vanished in a data update — fall through to a normal draw.
    }
    const allowed = new Set(MIXES.find((m) => m.key === mix)!.allowed);
    const solved = new Set(readStringArray(STORAGE_KEYS.solvedDsaIds));
    const pool = dsaQuestions.filter((q) => allowed.has(q.difficulty));
    // Unsolved first: drilling problems you already own measures memory, not readiness.
    // Solved ones only top up the set, so a finished sheet can still run a drill.
    const picked = [
      ...shuffle(pool.filter((q) => !solved.has(q.id))),
      ...shuffle(pool.filter((q) => solved.has(q.id))),
    ].slice(0, length);
    if (picked.length === 0) return;
    const t = Date.now();
    setNow(t); // same stale-clock reason as the preset branch above
    setLogged({});
    setResults(null);
    setDrill({
      startedAt: t,
      // Budget follows what was actually drawn, in case the band has fewer problems.
      budgetMs: picked.length * PER_PROBLEM_MS,
      problems: picked.map((q) => ({ id: q.id, outcome: 'pending' as const })),
      current: 0,
      problemStartedAt: t,
      vegetaMode: vegetaModeSetting,
    });
  };

  const advance = (outcome: 'done' | 'skipped') => {
    if (!drill) return;
    const t = Date.now();
    const problems = drill.problems.map((p, i) =>
      i === drill.current ? { ...p, outcome, elapsedMs: t - drill.problemStartedAt } : p,
    );
    if (drill.current + 1 >= problems.length) {
      finish({ ...drill, problems }, t);
    } else {
      setDrill({ ...drill, problems, current: drill.current + 1, problemStartedAt: t });
    }
  };

  const abandon = () => {
    if (!window.confirm('Abandon this drill? Nothing will be recorded.')) return;
    removeStoredValue(KEY);
    setDrill(null);
  };

  // Whatever happened under the clock feeds the same 1/3/7/21/45 ladder as the rest of
  // the site — a drill that doesn't schedule the follow-up teaches the same lesson twice.
  const log = (id: string, recall: Recall) => {
    gradeQuestion(id, recall);
    setLogged((l) => ({ ...l, [id]: recall }));
  };

  // ---- Derived clock state ----------------------------------------------------------
  const remaining = drill ? Math.max(0, drill.startedAt + drill.budgetMs - now) : 0;
  const frac = drill ? remaining / drill.budgetMs : 1;
  // Green-ish until a quarter left, then the difficulty hues take over: the clock should
  // change color at the same moments a real interviewer's body language does.
  const clockHue = frac <= 0.1 ? 'hard' : frac <= 0.25 ? 'medium' : null;
  const clockColor = clockHue ? `hsl(var(--${clockHue}))` : 'hsl(var(--text-primary))';

  const currentQ = drill ? byId.get(drill.problems[drill.current].id) : undefined;
  const poolSize = dsaQuestions.filter((q) =>
    new Set(MIXES.find((m) => m.key === mix)!.allowed).has(q.difficulty),
  ).length;

  const badge = (d: Question['difficulty']) => (
    <span
      style={{
        fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px',
        background: `hsl(var(--${diffHue(d)}) / 0.15)`, color: `hsl(var(--${diffHue(d)}))`,
        border: `1px solid hsl(var(--${diffHue(d)}))`, whiteSpace: 'nowrap',
      }}
    >
      {d}
    </span>
  );

  return (
    <div ref={panelRef}>
      {/* ============================== SETUP ============================== */}
      {!drill && !results && (
        <div className="animate-in">
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Mock <span className="gradient-text">Drill</span>
            </h1>
            <p style={{ color: 'hsl(var(--text-secondary))' }}>
              A clock, a random problem, and nobody to hint. The closest this site gets to the real room.
            </p>
          </div>

          {/* Mode selector — four flavours of pressure. Only 'Classic timed' uses the
              length/difficulty pickers below; the other modes own their whole
              lifecycle in their own components and never touch this drill's state
              machine. Secondary hue so they don't read as the pickers' siblings. */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', maxWidth: '720px', marginBottom: '1.25rem' }}>
            {DRILL_MODES.map((m) => {
              const modeActive = simMode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setSimMode(m.key)}
                  className="lift"
                  aria-pressed={modeActive}
                  style={{
                    flex: '1 1 150px', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '0.2rem',
                    padding: '0.7rem 0.9rem', borderRadius: '10px',
                    background: modeActive ? 'hsl(var(--secondary) / 0.15)' : 'hsl(var(--bg-tertiary))',
                    border: `1px solid ${modeActive ? 'hsl(var(--secondary))' : 'hsl(var(--border-color))'}`,
                    color: modeActive ? 'hsl(var(--secondary))' : 'hsl(var(--text-primary))',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.label}</span>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{m.hint}</span>
                </button>
              );
            })}
          </div>

          {simMode === 'sprint' ? (
            <PatternSprint />
          ) : simMode === 'edge' ? (
            <EdgeCaseHunter />
          ) : simMode === 'loop' ? (
            <FullLoopMock onOpenQuestion={onOpenQuestion} />
          ) : (
          <div
            className="glass"
            style={{
              padding: '1.5rem', borderRadius: '16px', maxWidth: '720px',
              border: '1px solid hsl(var(--border-color))',
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
            }}
          >
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
              35 minutes per problem, one shared countdown for the whole set — banking time on an
              easy one buys thinking room on a hard one. There is no pause button; there isn't one
              in the interview either. Reloading the page does not stop the clock.
            </p>

            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem' }}>How long is the round?</h4>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {LENGTHS.map((l) => {
                  const active = length === l.count;
                  return (
                    <button
                      key={l.count}
                      onClick={() => setLength(l.count)}
                      className="lift"
                      // Selection is otherwise carried by colour alone — same reason the
                      // mode buttons above announce their state.
                      aria-pressed={active}
                      style={{
                        flex: '1 1 150px', textAlign: 'left', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: '0.2rem',
                        padding: '0.7rem 0.9rem', borderRadius: '10px',
                        background: active ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--bg-tertiary))',
                        border: `1px solid ${active ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
                        color: active ? 'hsl(var(--primary))' : 'hsl(var(--text-primary))',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{l.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{l.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem' }}>Difficulty band</h4>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {MIXES.map((m) => {
                  const active = mix === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMix(m.key)}
                      className="lift"
                      aria-pressed={active}
                      style={{
                        flex: '1 1 150px', textAlign: 'left', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: '0.2rem',
                        padding: '0.7rem 0.9rem', borderRadius: '10px',
                        background: active ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--bg-tertiary))',
                        border: `1px solid ${active ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
                        color: active ? 'hsl(var(--primary))' : 'hsl(var(--text-primary))',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{m.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* [learnsci] Lockdown practice — named after the user's own request for
                "what test platforms have": leave the tab and it submits itself,
                copy/paste are blocked. Off by default; a friend's casual practice
                shouldn't accidentally get harsher than they wanted. */}
            <button
              type="button"
              onClick={() => setVegetaModeSetting((v) => !v)}
              className="lift"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textAlign: 'left', cursor: 'pointer',
                padding: '0.75rem 0.9rem', borderRadius: '10px',
                background: vegetaModeSetting ? 'hsl(var(--hard) / 0.12)' : 'hsl(var(--bg-tertiary))',
                border: `1px solid ${vegetaModeSetting ? 'hsl(var(--hard))' : 'hsl(var(--border-color))'}`,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚡</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: vegetaModeSetting ? 'hsl(var(--hard))' : 'hsl(var(--text-primary))' }}>
                  Vegeta Mode {vegetaModeSetting ? '— ON' : '(off)'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
                  Lockdown practice, like a real proctored test: switch tabs or leave and the drill
                  submits itself on the spot, copy/paste are blocked for the whole round. This is a
                  browser tab, not real lockdown software — it can detect you leaving and react, it
                  cannot literally stop you from leaving.
                </span>
              </span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={start} disabled={poolSize === 0 && !preset}>
                <Play size={16} /> Start drill — {fmt((preset ? preset.ids.length : Math.min(length, poolSize)) * PER_PROBLEM_MS)} on the clock
              </button>
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                {preset
                  ? `Friend challenge armed — the next drill runs their exact ${preset.ids.length} problem${preset.ids.length === 1 ? '' : 's'}, length and band above are ignored.`
                  : `Drawing from ${poolSize} problems in the ${MIXES.find((m) => m.key === mix)!.label} band, unsolved ones first.`}
              </span>
              {preset && (
                <button
                  onClick={() => { removeStoredValue('drill-preset'); setPreset(null); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.72rem', color: 'hsl(var(--text-muted))', textDecoration: 'underline',
                  }}
                >
                  Discard challenge
                </button>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* ============================== RUNNING ============================== */}
      {drill && currentQ && (
        <div className="animate-in" style={{ maxWidth: '720px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <Swords size={18} color="hsl(var(--secondary))" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, flex: 1 }}>
              Problem {drill.current + 1} of {drill.problems.length}
            </h2>
            {drill.vegetaMode && (
              <span
                title="Leaving this tab submits the drill immediately; copy/paste are blocked."
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  fontSize: '0.66rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '999px',
                  background: 'hsl(var(--hard) / 0.15)', border: '1px solid hsl(var(--hard) / 0.4)',
                  color: 'hsl(var(--hard))', whiteSpace: 'nowrap',
                }}
              >
                ⚡ VEGETA MODE
              </span>
            )}
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              {drill.problems.map((p, i) => (
                <span
                  key={p.id}
                  title={p.outcome}
                  style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    border: '1px solid hsl(var(--border-color))',
                    background:
                      p.outcome === 'done' ? 'hsl(var(--easy))'
                      : p.outcome === 'skipped' ? 'hsl(var(--medium))'
                      : p.outcome === 'timeout' ? 'hsl(var(--hard))'
                      : i === drill.current ? 'hsl(var(--primary))'
                      : 'hsl(var(--bg-tertiary))',
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => void toggleFullscreen()}
              disabled={!fullscreenSupported}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-pressed={isFullscreen}
              title={
                fullscreenSupported
                  ? isFullscreen
                    ? 'Exit fullscreen'
                    : 'Fullscreen — just you and the clock'
                  : 'Fullscreen is not supported in this browser'
              }
              className="lift"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '30px', height: '30px', borderRadius: '8px', padding: 0,
                background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                color: 'hsl(var(--text-primary))',
                cursor: fullscreenSupported ? 'pointer' : 'not-allowed',
                opacity: fullscreenSupported ? 1 : 0.5,
              }}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              onClick={abandon}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', color: 'hsl(var(--text-muted))', textDecoration: 'underline',
              }}
            >
              Abandon drill
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                fontSize: '4rem', fontWeight: 800, lineHeight: 1,
                fontVariantNumeric: 'tabular-nums', color: clockColor,
                transition: 'color 0.5s ease',
              }}
            >
              {fmt(remaining)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.4rem' }}>
              One clock for all {drill.problems.length} problem{drill.problems.length === 1 ? '' : 's'} · {fmt(drill.budgetMs)} total
            </div>
          </div>

          <div
            className="glass"
            style={{
              padding: '1.5rem', borderRadius: '16px',
              border: '1px solid hsl(var(--border-color))',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, flex: 1, minWidth: '200px' }}>{currentQ.title}</h3>
              {badge(currentQ.difficulty)}
              <span
                style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '999px',
                  background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                  color: 'hsl(var(--text-secondary))', whiteSpace: 'nowrap',
                }}
              >
                {currentQ.topic}
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
              Open the problem, work it like the interviewer is watching, and come back honest.
              "Done" means you'd have said "I'm confident in this" out loud — not "the editor
              stopped complaining".
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* The drill stays mounted while you're on the problem page (App hides it
                  instead of unmounting); the floating bar below keeps the clock in view. */}
              <button className="btn btn-primary" onClick={() => onOpenQuestion(currentQ)}>
                <ExternalLink size={16} /> Open problem
              </button>
              <button className="btn btn-secondary" onClick={() => advance('done')}>
                <CheckCircle size={16} /> Done — next
              </button>
              <button className="btn btn-secondary" onClick={() => advance('skipped')}>
                <SkipForward size={16} /> Skip — next
              </button>
            </div>
          </div>

          {/* Upcoming titles are hidden on purpose: knowing what's next changes how long
              you fight the current one, and interviews never show you the queue. */}
          {drill.current + 1 < drill.problems.length && (
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '0.75rem' }}>
              {drill.problems.length - drill.current - 1} more after this one. You don't get to see them yet.
            </p>
          )}
        </div>
      )}

      {/* ============================== RESULTS ============================== */}
      {results && (
        <div className="animate-in" style={{ maxWidth: '760px' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              {results.endedReason === 'left-tab' ? 'Vegeta Mode caught you leaving' : 'Drill report'}
            </h1>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
              {results.endedReason === 'left-tab' && (
                <span style={{ display: 'block', color: 'hsl(var(--hard))', fontWeight: 600, marginBottom: '0.3rem' }}>
                  You switched tabs or left with Vegeta Mode on, so it submitted the drill right there —
                  everything still in progress counted as out of time.
                </span>
              )}
              Used {fmt(Math.max(0, (results.finishedAt ?? results.startedAt + results.budgetMs) - results.startedAt))} of {fmt(results.budgetMs)}.
              The numbers don't matter unless they change your queue — log each problem honestly below.
            </p>
          </div>

          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {results.problems.map((p, i) => {
              const q = byId.get(p.id);
              if (!q) return null;
              const meta = OUTCOME_META[p.outcome === 'pending' ? 'timeout' : p.outcome];
              const rated = logged[p.id];
              return (
                <div
                  key={p.id}
                  className="glass"
                  style={{
                    padding: '1rem 1.25rem', borderRadius: '12px',
                    border: '1px solid hsl(var(--border-color))',
                    display: 'flex', flexDirection: 'column', gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => onOpenQuestion(q)}
                      title="Reopen the problem — reviewing now is when logging is honest"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        fontSize: '0.95rem', fontWeight: 700, color: 'hsl(var(--text-primary))',
                        textDecoration: 'underline', textDecorationColor: 'hsl(var(--border-color))',
                        flex: 1, minWidth: '160px', padding: 0,
                      }}
                    >
                      {i + 1}. {q.title}
                    </button>
                    {badge(q.difficulty)}
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px',
                        background: `hsl(var(--${meta.hue}) / 0.15)`, color: `hsl(var(--${meta.hue}))`,
                        border: `1px solid hsl(var(--${meta.hue}))`, whiteSpace: 'nowrap',
                      }}
                    >
                      {meta.icon}{meta.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {p.elapsedMs != null ? `${fmt(p.elapsedMs)} of ${fmt(PER_PROBLEM_MS)} budget` : 'never reached'}
                    </span>
                  </div>

                  {rated ? (
                    <span
                      className="animate-pop"
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: `hsl(var(--${RECALLS.find((r) => r.key === rated)!.hue}))` }}
                    >
                      Logged as "{RECALLS.find((r) => r.key === rated)!.label}" — it's on the review ladder now.
                    </span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>Log to review queue:</span>
                      {RECALLS.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => log(p.id, r.key)}
                          className="lift"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer',
                            fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.7rem', borderRadius: '999px',
                            background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                            color: `hsl(var(--${r.hue}))`,
                          }}
                        >
                          {r.icon}{r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setResults(null)}>
              <RotateCcw size={16} /> New drill
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                // Titles, not ids, go into the link — human-inspectable and
                // stable across id churn; the receiver re-validates them anyway.
                const titles = results.problems
                  .map((p) => byId.get(p.id)?.title)
                  .filter((t): t is string => !!t);
                const url = buildChallengeUrl(titles, mix);
                if (!url) return; // encoder APIs missing — nothing honest to copy
                const fallback = () => { window.prompt('Copy this challenge link:', url); };
                // Clipboard needs a secure context; the prompt fallback still
                // hands the link over instead of failing silently.
                if (navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(url).then(() => {
                    setChallengeCopied(true);
                    window.setTimeout(() => setChallengeCopied(false), 2500);
                  }, fallback);
                } else {
                  fallback();
                }
              }}
            >
              <Link2 size={16} /> {challengeCopied ? 'Link copied!' : 'Challenge a friend'}
            </button>
            {challengeCopied && (
              <span className="animate-pop" style={{ fontSize: '0.75rem', color: 'hsl(var(--easy))' }}>
                Send it — same problems, same clock.
              </span>
            )}
          </div>
        </div>
      )}

      {/* ============================== FLOATING TIMER BAR ============================== */}
      {/* Portaled to <body> so it stays visible even while App hides this component's
          panel with display:none (a portal escapes hidden ancestors — it isn't a DOM
          descendant). Rendered only when the panel is off-screen: on the drill screen
          itself the big clock already does this job. */}
      {drill && currentQ && panelHidden &&
        createPortal(
          <div data-floating-ui="true"
            className="glass"
            style={{
              position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
              zIndex: 120, display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.5rem 1rem', borderRadius: '999px',
              border: '1px solid hsl(var(--border-color))',
              boxShadow: '0 8px 24px hsl(var(--primary) / 0.25)',
              maxWidth: 'min(92vw, 560px)',
            }}
          >
            <Timer size={15} color={clockHue ? `hsl(var(--${clockHue}))` : 'hsl(var(--secondary))'} />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums', color: clockColor }}>
              {fmt(remaining)}
            </span>
            <span
              style={{
                fontSize: '0.72rem', color: 'hsl(var(--text-muted))',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              Drill {drill.current + 1}/{drill.problems.length} · {currentQ.title}
            </span>
          </div>,
          document.body,
        )}

      {/* Vegeta Mode's copy/paste block feedback — portaled the same way as the timer
          bar above, since the attempt can happen on ANY page while this panel is
          hidden. A silently-swallowed keystroke would read as a bug, not a rule. */}
      {copyBlockedFlash &&
        createPortal(
          <div
            data-floating-ui="true"
            role="status"
            className="glass animate-in"
            style={{
              position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
              zIndex: 150, display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.55rem 1rem', borderRadius: '999px',
              border: '1px solid hsl(var(--hard))',
              boxShadow: '0 8px 24px hsl(var(--hard) / 0.35)',
              fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--hard))',
            }}
          >
            ⚡ Blocked — Vegeta Mode disables copy/paste
          </div>,
          document.body,
        )}
    </div>
  );
};
