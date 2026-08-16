import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, SkipForward, X, Coffee, Crosshair, Volume2 } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import { todayISO } from '../utils/review';
import { readFocusLog, logFocusMinutes, focusMinutesOn } from '../utils/focusLog';
import { useWakeLock } from '../utils/wakeLock';
import {
  SOUND_KINDS,
  readFocusSoundPref,
  writeFocusSoundPref,
  soundSupported,
  startSound,
  stopSound,
  setSoundVolume,
  suspendSound,
  resumeSound,
  type FocusSoundPref,
  type SoundKind,
} from '../utils/focusSound';

interface FocusTimerProps {
  /** Fires after minutes land in the log, so the Stats charts can re-read it. */
  onLogged?: () => void;
}

/**
 * Floating 25/5 pomodoro that turns "I studied today" into minutes-per-problem.
 *
 * The timer listens for the 'question-open' event ProblemViewer dispatches, so
 * whatever problem is on screen silently collects the work minutes — no manual
 * "start tracking X" step, because a step you have to remember is a step you skip.
 * Only WORK minutes are logged; breaks are rest, not study.
 *
 * Like MockDrill's clock, remaining time is derived from a stored end timestamp,
 * never from a decrementing counter — a throttled background tab can delay the
 * repaint but never stretch the 25 minutes. Unlike the drill, pausing is allowed:
 * this is a personal metronome, not an interview simulation.
 */

const WORK_MS = 25 * 60_000;
const BREAK_MS = 5 * 60_000;

interface FocusSession {
  phase: 'work' | 'break';
  /** Epoch ms this phase ends; meaningful only while running. */
  endsAt: number;
  /** Ms left, frozen at pause time; meaningful only while paused. */
  pausedRemainingMs: number;
  running: boolean;
  /** Fully completed 25-minute blocks this sitting — the visible score. */
  blocks: number;
}

// Ceil, like MockDrill's clock: show 25:00 at the start, 0:00 only when spent.
const fmt = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`);

export const FocusTimer: React.FC<FocusTimerProps> = ({ onLogged }) => {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // State for display, ref for event handlers — commits happen inside listeners
  // where state snapshots would be stale.
  const [questionId, setQuestionId] = useState<string | null>(null);
  const questionIdRef = useRef<string | null>(null);
  const sessionRef = useRef<FocusSession | null>(null);
  /** Epoch ms the current attribution segment began; non-null only mid-work. */
  const segmentStartRef = useRef<number | null>(null);
  // Bumped after every commit so "banked today" re-reads the log.
  const [logVersion, setLogVersion] = useState(0);

  // [platform-safety] Focus sound (feature 37): the pref mirrors 'focus-sound';
  // playback itself is slaved to the running timer in the effects below.
  const [sound, setSound] = useState<FocusSoundPref>(readFocusSoundPref);
  const pickSoundKind = (kind: SoundKind) => {
    const next = { ...sound, kind };
    writeFocusSoundPref(next);
    setSound(next);
  };
  const pickSoundVolume = (volume: number) => {
    const next = { ...sound, volume };
    writeFocusSoundPref(next);
    setSound(next);
    setSoundVolume(volume); // live while playing; a no-op when nothing plays
  };
  /** Same aria-pressed segmented-button look the SettingsPanel uses. */
  const soundBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.65rem', borderRadius: '6px', cursor: 'pointer',
    fontSize: '0.72rem', fontWeight: active ? 700 : 500, fontFamily: 'var(--font-sans)',
    background: active ? 'hsl(var(--primary) / 0.18)' : 'hsl(var(--bg-tertiary))',
    border: `1px solid ${active ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
    color: active ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
  });

  sessionRef.current = session;

  const byId = useMemo(() => new Map(dsaQuestions.map((q) => [q.id, q])), []);

  /** Bank the minutes since the segment anchor and clear it. Rounded to whole
   *  minutes: the chart answers "where did my hours go", not "who owes 40 seconds". */
  const commit = (upTo: number) => {
    const startAt = segmentStartRef.current;
    segmentStartRef.current = null;
    if (startAt === null) return;
    const minutes = Math.round((upTo - startAt) / 60_000);
    if (minutes <= 0) return;
    logFocusMinutes(questionIdRef.current, minutes, todayISO());
    setLogVersion((v) => v + 1);
    onLogged?.();
  };

  // Whichever problem the learner opens becomes the attribution target. Switching
  // problems mid-block banks the minutes so far against the OLD problem first —
  // otherwise a 24-minute struggle would be credited to the problem you fled to.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ id?: unknown }>).detail?.id;
      // id === null is ProblemViewer leaving the screen: bank the segment and go
      // unassigned, so an abandoned problem stops collecting the next hour.
      if (id !== null && typeof id !== 'string') return;
      const s = sessionRef.current;
      if (s && s.running && s.phase === 'work') {
        const t = Date.now();
        commit(t);
        segmentStartRef.current = t;
      }
      questionIdRef.current = id ?? null;
      setQuestionId(id ?? null);
    };
    window.addEventListener('question-open', onOpen);
    return () => window.removeEventListener('question-open', onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repaint twice a second while running — display only; remaining time is
  // always re-derived from endsAt on render.
  useEffect(() => {
    if (!session?.running) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [session?.running]);

  // A running work phase claims the screen (feature 28): the 25 minutes are the
  // point, and a dozing display quietly pauses what should not pause. Breaks and
  // pauses release the claim — resting eyes deserve the normal screen-off rules.
  useWakeLock(!!session && session.running && session.phase === 'work');

  // [platform-safety] Sound runs exactly while the timer runs — work AND break
  // (the noise is a room, not a reward) — and stops on pause, stop, or unmount.
  // Volume changes ride setSoundVolume live instead of restarting the source,
  // which is why volume is deliberately absent from the deps.
  const soundShouldPlay = !!session && session.running;
  useEffect(() => {
    if (soundShouldPlay && sound.kind !== 'off') startSound(sound.kind, sound.volume);
    else stopSound();
    return stopSound;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundShouldPlay, sound.kind]);

  // Tab hidden = suspend, tab back = resume (only while still running) — noise
  // from a hidden tab is how a sound feature gets hated. Suspend keeps the
  // audio graph, so returning resumes the same loop instead of rebuilding it.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) suspendSound();
      else if (sessionRef.current?.running && readFocusSoundPref().kind !== 'off') resumeSound();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Phase rollover. Work minutes are capped at the phase's own end: a laptop that
  // slept through the night must not mint eight hours of "focus".
  useEffect(() => {
    if (!session || !session.running || now < session.endsAt) return;
    const t = Date.now();
    if (session.phase === 'work') {
      commit(session.endsAt);
      setSession({ ...session, phase: 'break', endsAt: t + BREAK_MS, blocks: session.blocks + 1 });
    } else {
      segmentStartRef.current = t;
      setSession({ ...session, phase: 'work', endsAt: t + WORK_MS });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, session]);

  const start = () => {
    const t = Date.now();
    segmentStartRef.current = t;
    setNow(t);
    setSession({ phase: 'work', endsAt: t + WORK_MS, pausedRemainingMs: 0, running: true, blocks: 0 });
  };

  const togglePause = () => {
    if (!session) return;
    const t = Date.now();
    if (session.running) {
      // Commit on pause, not on resume: a timer paused and forgotten overnight
      // should still have banked the minutes that were really worked.
      if (session.phase === 'work') commit(t);
      setSession({ ...session, running: false, pausedRemainingMs: Math.max(0, session.endsAt - t) });
    } else {
      if (session.phase === 'work') segmentStartRef.current = t;
      setSession({ ...session, running: true, endsAt: t + session.pausedRemainingMs });
    }
  };

  const skip = () => {
    if (!session) return;
    const t = Date.now();
    if (session.phase === 'work') {
      if (session.running) commit(t);
      setSession({ ...session, phase: 'break', running: true, endsAt: t + BREAK_MS });
    } else {
      segmentStartRef.current = t;
      setSession({ ...session, phase: 'work', running: true, endsAt: t + WORK_MS });
    }
  };

  const close = () => {
    if (session && session.running && session.phase === 'work') commit(Date.now());
    setSession(null);
  };

  const remaining = session
    ? session.running
      ? Math.max(0, session.endsAt - now)
      : session.pausedRemainingMs
    : 0;

  const todayMinutes = useMemo(
    () => focusMinutesOn(readFocusLog(), todayISO()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logVersion],
  );

  const attributed = questionId ? byId.get(questionId) : undefined;
  const isWork = session?.phase === 'work';

  const iconBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
    background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
    color: 'hsl(var(--text-primary))', padding: 0,
  };

  return (
    <div
      className="glass"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Crosshair size={18} color="hsl(var(--accent))" />
        Focus timer
      </h3>
      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
        25 minutes on, 5 off. While it runs, whichever problem you have open quietly
        collects the minutes — the "where the minutes went" chart below is built from them.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {session ? (
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--accent))' }}>
            Running — {isWork ? 'focus' : 'break'} · {fmt(remaining)} left
          </span>
        ) : (
          <button className="btn btn-primary" onClick={start}>
            <Play size={16} /> Start a 25/5 block
          </button>
        )}
        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
          {todayMinutes > 0 ? `${fmtMinutes(todayMinutes)} banked today.` : 'Nothing banked today yet.'}
        </span>
      </div>

      {/* Focus sound (feature 37): generated brown/white/rain noise — WebAudio
          only, zero assets. Plays only while the timer runs; volume is live. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.8rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--text-secondary))' }}>
          <Volume2 size={14} aria-hidden="true" /> Background sound while the timer runs
        </span>
        {soundSupported() ? (
          <>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {SOUND_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={sound.kind === k}
                  onClick={() => pickSoundKind(k)}
                  style={soundBtn(sound.kind === k)}
                >
                  {k === 'off' ? 'Off' : k === 'brown' ? 'Brown noise' : k === 'white' ? 'White noise' : 'Rain'}
                </button>
              ))}
            </div>
            {sound.kind !== 'off' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                Volume
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(sound.volume * 100)}
                  onChange={(e) => pickSoundVolume(Number(e.target.value) / 100)}
                  aria-label="Focus sound volume"
                  style={{ flex: 1, accentColor: 'hsl(var(--primary))' }}
                />
              </label>
            )}
            {!session && sound.kind !== 'off' && (
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                Starts with the timer — nothing plays while it's stopped.
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
            This browser doesn't offer WebAudio, so there's nothing to play — the
            timer itself works fine without it.
          </span>
        )}
      </div>

      {/* Portaled to <body> so the clock stays visible on every tab while App keeps
          the Stats panel mounted-but-hidden. Bottom-RIGHT on purpose: MockDrill's
          floating bar owns bottom-center, and the two can be alive at once. */}
      {session &&
        createPortal(
          <div data-floating-ui="true"
            className="glass animate-pop"
            role="timer"
            aria-label="Focus timer"
            style={{
              position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 130,
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 0.9rem', borderRadius: '14px',
              border: '1px solid hsl(var(--border-color))',
              boxShadow: '0 8px 24px hsl(var(--accent) / 0.25)',
              maxWidth: 'min(92vw, 340px)',
            }}
          >
            {isWork
              ? <Crosshair size={16} color="hsl(var(--accent))" />
              : <Coffee size={16} color="hsl(var(--easy))" />}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                  color: session.running ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                }}
              >
                {fmt(remaining)}
              </span>
              <span
                title={isWork && attributed ? attributed.title : undefined}
                style={{
                  fontSize: '0.66rem', color: 'hsl(var(--text-muted))',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px',
                }}
              >
                {isWork
                  ? attributed
                    ? `→ ${attributed.title}`
                    : 'No problem open — logging unassigned'
                  : `Break · ${session.blocks} block${session.blocks === 1 ? '' : 's'} done`}
              </span>
            </div>
            <button onClick={togglePause} aria-label={session.running ? 'Pause focus timer' : 'Resume focus timer'} style={iconBtn} className="lift">
              {session.running ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button onClick={skip} aria-label={isWork ? 'Skip to break' : 'Skip back to focus'} style={iconBtn} className="lift">
              <SkipForward size={14} />
            </button>
            <button onClick={close} aria-label="Close focus timer" style={iconBtn} className="lift">
              <X size={14} />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
};
