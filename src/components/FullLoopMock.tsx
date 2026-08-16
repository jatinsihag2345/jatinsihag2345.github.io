import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Timer, ExternalLink, ChevronRight, RotateCcw, CheckCircle, Hourglass,
  ListChecks, Code2, MessageSquare, GraduationCap, X,
} from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import {
  readJson, writeJson, removeStoredValue, readText, writeText,
  readStringArray, STORAGE_KEYS,
} from '../utils/persistence';
import { fireConfetti } from '../utils/Confetti';
import { appendDrillLog, fmtMs, shuffle } from './drillModes';
import { ProbeDrill } from './ProbeDrill';

interface FullLoopMockProps {
  /** Jump to the problem's page. The loop stays mounted while you're there. */
  onOpenQuestion: (q: Question) => void;
}

/**
 * Full loop — one problem, sixty minutes, every phase of the real hour.
 *
 * The classic drill rehearses coding under a clock; a real loop also grades the five
 * minutes BEFORE the code and the twenty minutes after it. This mode scripts the whole
 * hour: plan (5), code (35), follow-ups (10), explain (10), each phase auto-advancing
 * when its slice is spent — interviewers move on whether you're ready or not.
 *
 * Everything you write lands under the SAME keys the problem page reads (plan-<id>,
 * followup-<id>-<i>, explain-<id>), so the loop's artifacts greet you in the plan gate,
 * the push-back walker and the Feynman box next time you open that question — the loop
 * composes with the rest of the site instead of keeping a private notebook.
 *
 * Clocks are timestamps, never counters (the house rule): reload resumes mid-phase with
 * the time honestly gone, and auto-advance re-bases to the scheduled boundary so a
 * slept tab consumes phases instead of pausing them.
 */

const KEY = 'full-loop';

/** Silence-coach setting — a SEPARATE key from the loop blob on purpose: `full-loop`
 *  is cleared the moment an hour ends, and "nudge me every N minutes" is a
 *  preference that should survive into the next loop. 0 = coach off. */
const CONFIG_KEY = 'full-loop-config';
const NUDGE_DEFAULT_MIN = 4;
interface LoopConfig { nudgeEveryMin: number }
const isLoopConfig = (v: unknown): v is LoopConfig =>
  !!v && typeof v === 'object' &&
  typeof (v as LoopConfig).nudgeEveryMin === 'number' && (v as LoopConfig).nudgeEveryMin >= 0;
/** Rotating lines so the coach doesn't wear one groove into your ear. No mic
 *  anywhere: this trains the narration RHYTHM, it never checks compliance. */
const NUDGE_LINES = [
  'Narrate your current step — which line are you writing, and why?',
  'Say the invariant out loud — what is still true after this iteration?',
  'Name the case you are handling right now — and the one you are postponing.',
];

const PHASES = [
  {
    label: 'Plan', minutes: 5, icon: <ListChecks size={14} />,
    brief: 'Restate the problem in your own words, pick an approach, and name its time/space cost. No code yet — the plan is what the interviewer is actually grading here.',
  },
  {
    label: 'Code', minutes: 35, icon: <Code2 size={14} />,
    brief: 'Open the problem and write it like the interviewer is watching. Narrate trade-offs in your head; come back when it works or the clock moves you on.',
  },
  {
    label: 'Follow-ups', minutes: 10, icon: <MessageSquare size={14} />,
    brief: 'The push-back round. Answer each follow-up in writing — direction, cost, and what you would give up.',
  },
  {
    label: 'Explain', minutes: 10, icon: <GraduationCap size={14} />,
    brief: 'Narrate the finished solution as if to your interviewer: the idea, why it is correct, what it costs.',
  },
];

interface LoopState {
  startedAt: number;
  questionId: string;
  /** 0..3, indexes PHASES. */
  phase: number;
  /** Epoch ms the current phase began. Manual next re-bases to now; auto-advance to
   *  the scheduled boundary, so slept-through time is consumed, not refunded. */
  phaseStartedAt: number;
  /** Outcome per completed phase, in order: advanced yourself = done, clock did = timeout. */
  outcomes: ('done' | 'timeout')[];
}

// Strict shape check before trusting localStorage — a stale or hand-edited blob must
// degrade to "no loop", never to a crash (same bar the classic drill sets).
const isLoopState = (v: unknown): v is LoopState => {
  if (!v || typeof v !== 'object') return false;
  const s = v as LoopState;
  return (
    typeof s.startedAt === 'number' &&
    typeof s.phaseStartedAt === 'number' &&
    typeof s.phase === 'number' && s.phase >= 0 && s.phase < PHASES.length &&
    Array.isArray(s.outcomes) && s.outcomes.every(o => o === 'done' || o === 'timeout') &&
    typeof s.questionId === 'string' && dsaQuestions.some(q => q.id === s.questionId)
  );
};

/** A textarea that reads/writes an existing app storage key — the glue that makes the
 *  loop's writing show up on the problem page (and vice versa). */
const PersistedTextarea: React.FC<{
  storageKey: string;
  ariaLabel: string;
  placeholder: string;
  rows?: number;
}> = ({ storageKey, ariaLabel, placeholder, rows = 4 }) => {
  const [text, setText] = useState(() => readText(storageKey));
  // A new loop (new question) must not keep showing the previous question's words.
  useEffect(() => {
    setText(readText(storageKey));
  }, [storageKey]);
  return (
    <textarea
      value={text}
      onChange={e => { setText(e.target.value); writeText(storageKey, e.target.value); }}
      aria-label={ariaLabel}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.88rem',
        lineHeight: 1.6, padding: '0.85rem 1rem', borderRadius: '10px',
        background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
        border: '1px solid hsl(var(--border-color))', outline: 'none',
      }}
    />
  );
};

export const FullLoopMock: React.FC<FullLoopMockProps> = ({ onOpenQuestion }) => {
  // Resume straight from storage — a reload mid-loop keeps the clock bleeding.
  const [loop, setLoop] = useState<LoopState | null>(() => readJson<LoopState | null>(KEY, null, isLoopState));
  const [report, setReport] = useState<{ questionId: string; outcomes: ('done' | 'timeout')[] } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHidden, setPanelHidden] = useState(false);
  // Silence coach: the setting survives across loops; the nudge itself is ephemeral.
  const [cfg, setCfg] = useState<LoopConfig>(() =>
    readJson<LoopConfig>(CONFIG_KEY, { nudgeEveryMin: NUDGE_DEFAULT_MIN }, isLoopConfig));
  const saveCfg = (c: LoopConfig) => { setCfg(c); writeJson(CONFIG_KEY, c); };
  const [nudge, setNudge] = useState<{ until: number; text: string } | null>(null);
  // Which nudge slot fired last — a ref: firing is a side effect of the clock,
  // not a reason to re-render.
  const lastNudgeRef = useRef(0);

  const byId = useMemo(() => new Map(dsaQuestions.map(q => [q.id, q])), []);

  // Every transition lands in storage immediately, like the classic drill: closing the
  // tab is not a pause button an interviewer offers.
  useEffect(() => {
    if (loop) writeJson(KEY, loop);
  }, [loop]);

  useEffect(() => {
    if (!loop) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [loop]);

  // App hides MockDrill (and us inside it) with display:none while the learner is on
  // the problem page — exactly when the phase clock matters most. Same offsetParent
  // trick as MockDrill's floating bar; no deps on purpose, it re-checks every render.
  useEffect(() => {
    const hidden = !!panelRef.current && panelRef.current.offsetParent === null;
    if (hidden !== panelHidden) setPanelHidden(hidden);
  });

  const advance = (auto: boolean) => {
    if (!loop) return;
    const boundary = loop.phaseStartedAt + PHASES[loop.phase].minutes * 60_000;
    // Auto-advance re-bases to the SCHEDULED boundary, not Date.now(): if the tab slept
    // through two phases, the catch-up loop below must consume their budgets, not
    // refund them — otherwise a reload is a pause button.
    const t = auto ? boundary : Date.now();
    const outcomes = [...loop.outcomes, auto ? 'timeout' as const : 'done' as const];
    if (loop.phase + 1 >= PHASES.length) {
      // Loop over — clear storage so a reload can't resurrect a dead hour, then leave
      // one row in the shared drill history (one outcome per phase).
      removeStoredValue(KEY);
      appendDrillLog(outcomes, 'full-loop');
      if (outcomes.every(o => o === 'done')) fireConfetti();
      setReport({ questionId: loop.questionId, outcomes });
      setLoop(null);
    } else {
      setLoop({ ...loop, phase: loop.phase + 1, phaseStartedAt: t, outcomes });
    }
  };

  // Phase budget spent → the clock advances for you. Re-runs after each advance, so a
  // resume that is several phases late catches up one render at a time.
  useEffect(() => {
    if (!loop) return;
    const end = loop.phaseStartedAt + PHASES[loop.phase].minutes * 60_000;
    if (now >= end) advance(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, loop]);

  // Phase or loop change resets the coach's count — nudges are per-code-phase.
  useEffect(() => {
    lastNudgeRef.current = 0;
    setNudge(null);
  }, [loop?.phase, loop?.questionId]);

  // Silence coach: every N minutes INTO the code phase, one gentle "narrate" toast.
  // Slot arithmetic over timestamps (never a counter): a tab that slept through
  // three slots fires at most ONE nudge on wake, not a backlog of three.
  useEffect(() => {
    if (!loop || loop.phase !== 1 || cfg.nudgeEveryMin <= 0) return;
    const slot = Math.floor((now - loop.phaseStartedAt) / (cfg.nudgeEveryMin * 60_000));
    if (slot > lastNudgeRef.current) {
      lastNudgeRef.current = slot;
      setNudge({ until: Date.now() + 12_000, text: NUDGE_LINES[(slot - 1) % NUDGE_LINES.length] });
    }
  }, [now, loop, cfg]);

  const start = () => {
    // Unsolved first, same reasoning as the classic drill: a problem you own already
    // measures memory, not readiness.
    const solved = new Set(readStringArray(STORAGE_KEYS.solvedDsaIds));
    const picked = [
      ...shuffle(dsaQuestions.filter(q => !solved.has(q.id))),
      ...shuffle(dsaQuestions.filter(q => solved.has(q.id))),
    ][0];
    if (!picked) return;
    const t = Date.now();
    setReport(null);
    setLoop({ startedAt: t, questionId: picked.id, phase: 0, phaseStartedAt: t, outcomes: [] });
  };

  const abandon = () => {
    if (!window.confirm('Abandon this loop? Nothing will be logged (your written answers stay saved).')) return;
    removeStoredValue(KEY);
    setLoop(null);
  };

  // ---- Report -------------------------------------------------------------------
  if (report) {
    const q = byId.get(report.questionId);
    return (
      <div className="animate-in" style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Loop complete{q ? ` — ${q.title}` : ''}</h3>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
            Logged to the drill history. Your plan, follow-up answers and explanation are
            saved on the problem page itself — they'll greet you there next visit.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {PHASES.map((p, i) => {
            const done = report.outcomes[i] === 'done';
            const hue = done ? 'easy' : 'hard';
            return (
              <span
                key={p.label}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.7rem', borderRadius: '999px',
                  background: `hsl(var(--${hue}) / 0.15)`, color: `hsl(var(--${hue}))`,
                  border: `1px solid hsl(var(--${hue}))`,
                }}
              >
                {done ? <CheckCircle size={13} /> : <Hourglass size={13} />}
                {p.label}: {done ? 'your call' : 'clock moved you on'}
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {q && (
            <button className="btn btn-secondary" onClick={() => onOpenQuestion(q)}>
              <ExternalLink size={16} /> Review the problem
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setReport(null)}>
            <RotateCcw size={16} /> Another loop
          </button>
        </div>
      </div>
    );
  }

  // ---- Setup --------------------------------------------------------------------
  if (!loop) {
    return (
      <div
        className="glass animate-in"
        style={{
          padding: '1.5rem', borderRadius: '16px', maxWidth: '720px',
          border: '1px solid hsl(var(--border-color))',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Timer size={18} color="hsl(var(--secondary))" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Full loop — the whole hour</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          One random problem, four scripted phases: 5 minutes to plan, 35 to code, 10 of
          follow-up push-back, 10 to explain it back. Each phase advances itself when its
          time is spent — you can move on early, but you can't linger. Reloading doesn't
          stop the clock; there's no pause in the real hour either.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {PHASES.map(p => (
            <span
              key={p.label}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '999px',
                background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                color: 'hsl(var(--text-secondary))',
              }}
            >
              {p.icon} {p.label} · {p.minutes}m
            </span>
          ))}
        </div>
        {/* Silence coach — rhythm training for thinking out loud. The setting lives
            under full-loop-config so it outlives each individual hour. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={cfg.nudgeEveryMin > 0}
              onChange={e => saveCfg({ nudgeEveryMin: e.target.checked ? NUDGE_DEFAULT_MIN : 0 })}
            />
            Silence coach
          </label>
          {cfg.nudgeEveryMin > 0 && (
            <select
              className="btn btn-secondary"
              aria-label="Minutes between narration nudges"
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
              value={cfg.nudgeEveryMin}
              onChange={e => saveCfg({ nudgeEveryMin: Number(e.target.value) || NUDGE_DEFAULT_MIN })}
            >
              {[2, 3, 4, 5, 6, 8, 10].map(m => (
                <option key={m} value={m}>every {m} min</option>
              ))}
            </select>
          )}
          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            During the code phase: a gentle "narrate your step" toast at this rhythm.
            No mic — it never listens, only reminds.
          </span>
        </div>
        <div>
          <button className="btn btn-primary" onClick={start} disabled={dsaQuestions.length === 0}>
            <Play size={16} /> Start the hour
          </button>
        </div>
      </div>
    );
  }

  // ---- Running ------------------------------------------------------------------
  const q = byId.get(loop.questionId);
  if (!q) return null; // isLoopState guarantees this; belt and braces for data updates
  const phase = PHASES[loop.phase];
  const remaining = Math.max(0, loop.phaseStartedAt + phase.minutes * 60_000 - now);
  const frac = remaining / (phase.minutes * 60_000);
  const clockColor =
    frac <= 0.1 ? 'hsl(var(--hard))' : frac <= 0.25 ? 'hsl(var(--medium))' : 'hsl(var(--text-primary))';
  const isLast = loop.phase === PHASES.length - 1;

  return (
    <div ref={panelRef} className="animate-in" style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Timer size={18} color="hsl(var(--secondary))" />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, flex: 1, minWidth: '160px' }}>
          Phase {loop.phase + 1} of {PHASES.length}: {phase.label}
        </h3>
        {/* Phase timeline — past phases keep their earned color, like the drill's dots. */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {PHASES.map((p, i) => (
            <span
              key={p.label}
              title={i < loop.phase ? `${p.label}: ${loop.outcomes[i] === 'done' ? 'your call' : 'timed out'}` : i === loop.phase ? `${p.label}: now` : p.label}
              style={{
                width: '10px', height: '10px', borderRadius: '50%',
                border: '1px solid hsl(var(--border-color))',
                background:
                  i < loop.phase
                    ? loop.outcomes[i] === 'done' ? 'hsl(var(--easy))' : 'hsl(var(--hard))'
                    : i === loop.phase ? 'hsl(var(--primary))' : 'hsl(var(--bg-tertiary))',
              }}
            />
          ))}
        </div>
        <button
          onClick={abandon}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.72rem', color: 'hsl(var(--text-muted))', textDecoration: 'underline',
          }}
        >
          Abandon loop
        </button>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '3rem', fontWeight: 800, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums', color: clockColor, transition: 'color 0.5s ease',
          }}
        >
          {fmtMs(remaining)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.3rem' }}>
          {phase.minutes} min for this phase — it advances itself at 0:00
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
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, flex: 1, minWidth: '180px' }}>{q.title}</h3>
          <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          {phase.brief}
        </p>

        {loop.phase === 0 && (
          <>
            <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.65 }}>
              {q.problemStatement}
            </p>
            {/* Same key as the problem page's plan gate — the plan you write here has
                already unlocked the approaches when you open the problem next phase. */}
            <PersistedTextarea
              storageKey={`plan-${q.id}`}
              ariaLabel="Your plan for this problem"
              placeholder='e.g. "Sort, then walk two pointers from both ends — O(n log n) time, O(1) extra."'
              rows={4}
            />
          </>
        )}

        {loop.phase === 1 && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => onOpenQuestion(q)}>
              <ExternalLink size={16} /> Open problem
            </button>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              The floating clock follows you there. Come back when it moves you on.
            </span>
          </div>
        )}

        {loop.phase === 2 && (
          q.followUps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {q.followUps.map((f, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <p style={{ fontSize: '0.88rem', fontStyle: 'italic', color: 'hsl(var(--text-primary))', lineHeight: 1.5 }}>
                    "{f}"
                  </p>
                  {/* Same keys as the push-back walker on the problem page — answers
                      written under the clock resurface there for the slow re-read. */}
                  <PersistedTextarea
                    storageKey={`followup-${q.id}-${i}`}
                    ariaLabel={`Your answer to follow-up ${i + 1}`}
                    placeholder="Direction, cost, and what you'd give up."
                    rows={3}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6 }}>
              This problem ships no follow-ups. Use the time to invent the two an
              interviewer would ask — "can you do better on space?" is never off the table.
            </p>
          )
        )}

        {loop.phase === 2 && (
          /* The probe drill rides the follow-up phase: three pattern-matched pushes
             beyond the scripted follow-ups, writing the SAME probe-<id>-<n> keys the
             problem page's panel reads — answers made under the clock greet you
             there. Renders nothing for patterns the bank doesn't cover. */
          <ProbeDrill question={q} />
        )}

        {loop.phase === 3 && (
          /* Same key as the Feynman box on the problem page — this IS that box, under a clock. */
          <PersistedTextarea
            storageKey={`explain-${q.id}`}
            ariaLabel="Explain this solution as if to your interviewer"
            placeholder='e.g. "We trade a second pass for a hash map: each element asks whether its complement was already seen. O(n) time, O(n) space."'
            rows={6}
          />
        )}

        <div>
          <button className="btn btn-secondary" onClick={() => advance(false)}>
            {isLast ? <><CheckCircle size={16} /> Finish the loop</> : <>Done early — next phase <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>

      {/* Silence-coach toast — a portal like the clock below, and for the same
          reason. role="status": announced politely, never steals focus from the
          editor mid-keystroke. Top-center because the bottom corners are taken:
          review nudge (left), drill/loop clocks (center), focus timer (right). */}
      {nudge && now < nudge.until && loop.phase === 1 &&
        createPortal(
          <div
            data-floating-ui="true"
            role="status"
            className="glass animate-in"
            style={{
              position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
              zIndex: 125, display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.6rem 0.9rem', borderRadius: '12px',
              border: '1px solid hsl(var(--border-color))',
              boxShadow: '0 8px 24px hsl(0 0% 0% / 0.35)',
              maxWidth: 'min(92vw, 480px)',
            }}
          >
            <MessageSquare size={15} color="hsl(var(--secondary))" style={{ flexShrink: 0 }} aria-hidden="true" />
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.45 }}>
              {nudge.text}
            </span>
            <button
              onClick={() => setNudge(null)}
              aria-label="Dismiss narration nudge"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.2rem', flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>,
          document.body,
        )}

      {/* Floating phase clock, portaled to <body> — visible while App hides this panel
          with display:none (the Code phase lives on the problem page). Never collides
          with MockDrill's classic bar: a running classic drill unmounts this component
          entirely (the setup screen it lives on is gone). */}
      {panelHidden &&
        createPortal(
          <div
            data-floating-ui="true"
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
            <Timer size={15} color="hsl(var(--secondary))" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums', color: clockColor }}>
              {fmtMs(remaining)}
            </span>
            <span
              style={{
                fontSize: '0.72rem', color: 'hsl(var(--text-muted))',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              Loop {loop.phase + 1}/{PHASES.length} · {phase.label} · {q.title}
            </span>
          </div>,
          document.body,
        )}
    </div>
  );
};
