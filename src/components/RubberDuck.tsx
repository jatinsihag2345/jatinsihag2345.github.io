import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, CircleStop, Mic, Trash2 } from 'lucide-react';
import { readJson, writeJson } from '../utils/persistence';
import { deleteBlob, getBlob, idbSupported, putBlob } from '../utils/idb';

/**
 * Rubber-duck recorder — say the explanation, hear yourself, grade yourself.
 *
 * The Feynman box (this component's host) proves you can WRITE the why; interviews
 * grade whether you can SAY it, and spoken sentences fall apart in places written
 * ones never do. One take, played back, exposes the "um, so basically" gaps that
 * reading your own text hides. The self-grade rubric afterwards is the one an
 * interviewer actually keeps: pattern named, complexity stated, edge cases called,
 * invariant said out loud — each scored, not just checked, since "mentioned it in
 * passing" and "stated it cold" are not the same signal (interviewing.io and similar
 * mock-interview platforms score each rubric dimension rather than pass/fail it).
 *
 * Audio is audio/webm in IndexedDB (utils/idb.ts) — deliberately NOT localStorage,
 * which the JSON backup exports and whose ~5 MB quota the app's real progress needs.
 * Consequence stated in the UI: recordings never leave this browser and are not in
 * the backup file. The rubric scores are small and durable, so they DO live in
 * localStorage under `duck-<questionId>` (in backup.ts's APP_KEY).
 *
 * Feature-detected end to end: no MediaRecorder/getUserMedia → no dead record
 * button, just honest text, and the rubric still works (say it to the room).
 */

interface RubberDuckProps {
  questionId: string;
}

/** The four things an interviewer listens for in a spoken explanation. Index IS
 *  identity for the persisted scores — append new items, never reorder. */
const CHECKS = [
  'Named the pattern (not just the steps)',
  'Stated time AND space complexity',
  'Called out the edge cases',
  'Said the invariant — what stays true every iteration',
];

/** Each dimension scores 0-2, not a checkbox: "mentioned it" and "stated it cold" are
 *  different signals an interviewer would actually distinguish between. */
const LEVELS = ['Missed it', 'Mentioned it', 'Nailed it'] as const;
const MAX_LEVEL = LEVELS.length - 1;
export const MAX_SCORE = CHECKS.length * MAX_LEVEL;
/** The "Solid" cutoff verdict() below already uses — exported so ReadinessRadar's
 *  duck-rate slice counts the same bar as this card's own "good enough" line. */
export const SOLID_SCORE = MAX_SCORE * 0.6;
const LEVEL_HUE = ['text-muted', 'medium', 'easy'] as const;

const verdict = (total: number) => {
  if (total >= MAX_SCORE) return { label: 'Interview-ready', hue: 'easy' } as const;
  if (total >= SOLID_SCORE) return { label: 'Solid — a few gaps', hue: 'medium' } as const;
  if (total > 0) return { label: 'Getting there', hue: 'medium' } as const;
  return { label: 'Not graded yet', hue: 'text-muted' } as const;
};

/** Legacy data was a boolean[] (checked/unchecked) — true becomes a full "Nailed it"
 *  so nobody's already-earned progress reads as freshly ungraded after this upgrade. */
const readScores = (key: string): number[] => {
  const raw = readJson<unknown[] | null>(key, null, (v): v is unknown[] | null => v === null || Array.isArray(v));
  if (!raw) return [];
  return raw.map(v => {
    if (typeof v === 'boolean') return v ? MAX_LEVEL : 0;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.min(MAX_LEVEL, Math.max(0, Math.round(v)));
    return 0;
  });
};

/** Total rubric score for a question's duck take, or null if never attempted —
 *  ReadinessRadar reads this to fold spoken-explanation quality into "readiness".
 *  A score only ever gets WRITTEN by an explicit tap (see cycleScore below), so
 *  an empty read reliably means "never touched", not "touched, scored zero". */
export const readDuckTotal = (questionId: string): number | null => {
  const scores = readScores(`duck-${questionId}`);
  return scores.length === 0 ? null : scores.reduce((sum, v) => sum + v, 0);
};

/** Recordings self-stop here. A rubber-duck explanation past three minutes is a
 *  ramble, and unbounded takes would quietly eat the browser's storage. */
const MAX_MS = 3 * 60_000;

const canRecord =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== 'undefined' &&
  idbSupported();

const fmtSec = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const RubberDuck: React.FC<RubberDuckProps> = ({ questionId }) => {
  const memoKey = `duck-${questionId}`;
  const [scores, setScores] = useState<number[]>(() => readScores(memoKey));
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [now, setNow] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  /** Set synchronously so a double-click cannot open a second mic stream. */
  const startingRef = useRef(false);
  /** Which question's card is actually on screen (null once unmounted). A take is
   *  deliberately allowed to outlive the question it started on — see start() — so
   *  when it finishes, only the card it belongs to may show it. */
  const liveQuestion = useRef<string | null>(questionId);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  // Object URLs leak until revoked; one ref tracks the live one across replaces.
  const urlRef = useRef<string | null>(null);

  const swapUrl = (next: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setAudioUrl(next);
  };

  // New question → its own rubric scores and its own (possibly absent) memo.
  useEffect(() => {
    liveQuestion.current = questionId;
    setScores(readScores(`duck-${questionId}`));
    setNote('');
    swapUrl(null);
    if (!idbSupported()) return;
    let cancelled = false;
    getBlob(`duck-${questionId}`)
      .then(blob => {
        if (!cancelled && blob) swapUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        /* private-mode IndexedDB rejection — same UX as "no memo yet" */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  // Recording clock — drives the elapsed display AND the 3-minute self-stop.
  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [recording]);
  const elapsed = recording ? Math.max(0, now - startedAtRef.current) : 0;
  useEffect(() => {
    if (recording && elapsed >= MAX_MS) recRef.current?.stop();
  }, [recording, elapsed]);

  // A recorder outliving its component would hold the mic open with no UI to
  // release it — stop everything on unmount, and free the object URL.
  useEffect(
    () => () => {
      // No card left to paint into: onstop still fires after this, and without the
      // null it would mint an object URL nobody can revoke.
      liveQuestion.current = null;
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const start = async () => {
    // getUserMedia is async and `recording` only flips in its .then — so two
    // quick clicks open TWO mic streams, and recRef keeps only the second.
    // The first recorder then runs forever with the tab's mic light on, stoppable
    // by nothing. A synchronous ref is the only thing fast enough to prevent it.
    // Only a LIVE recorder blocks: onstop nulls the ref, and the state check means
    // even a recorder that died without firing it can't wedge Re-record forever.
    if (startingRef.current || (recRef.current && recRef.current.state !== 'inactive')) return;
    startingRef.current = true;
    setNote('');
    // The id is captured NOW: if the learner switches questions mid-take, the
    // memo still belongs to the question it was spoken about.
    const qid = questionId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Prefer webm/opus where supported (Chrome, Firefox, recent Safari);
      // otherwise let the browser pick — the blob remembers its own type.
      const mime =
        typeof MediaRecorder.isTypeSupported === 'function' &&
        MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : undefined;
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        // Release the mic FIRST — the tab's recording indicator must die the
        // moment the learner hits stop, not after IndexedDB finishes.
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        chunksRef.current = [];
        // This recorder is spent. Releasing the ref is what re-arms start()'s guard;
        // holding it would leave Record/Re-record dead for the rest of the session.
        recRef.current = null;
        setRecording(false);
        if (blob.size === 0) return;
        // The blob is stored under the question it was spoken about no matter what,
        // but it may only be SHOWN on that question's card: stop the take after
        // switching questions and this player belongs to somebody else now.
        const onScreen = liveQuestion.current === qid;
        // Playback works immediately from memory; persistence is best-effort on
        // top, so a private-mode IndexedDB failure degrades to "this visit only".
        if (onScreen) swapUrl(URL.createObjectURL(blob));
        putBlob(`duck-${qid}`, blob).catch(() => {
          if (liveQuestion.current === qid) {
            setNote('Playable now, but this browser refused to store it — it will be gone after reload.');
          }
        });
      };
      recRef.current = rec;
      startedAtRef.current = Date.now();
      setNow(Date.now());
      rec.start();
      setRecording(true);
      // recRef is now set, so the guard above holds on its own from here.
      startingRef.current = false;
    } catch {
      // Permission denied / no input device, or rec.start() threw after the ref was
      // set — either way nothing is recording, so the ref must not stay armed.
      recRef.current = null;
      // The checklist keeps working — the exercise is the saying, not the file.
      setNote('Microphone unavailable or permission denied — say it to the room and grade yourself below.');
      startingRef.current = false;
    }
  };

  const stop = () => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
  };

  const removeMemo = () => {
    swapUrl(null);
    deleteBlob(`duck-${questionId}`).catch(() => {
      /* nothing stored — nothing to report */
    });
  };

  /** A click cycles the dimension forward through Missed → Mentioned → Nailed →
   *  Missed, same one-control-per-row pattern the old checkbox used. */
  const cycleScore = (i: number) => {
    const cur = scores[i] ?? 0;
    const next = CHECKS.map((_, idx) => (idx === i ? (cur + 1) % (MAX_LEVEL + 1) : (scores[idx] ?? 0)));
    setScores(next);
    writeJson(memoKey, next);
  };

  const total = CHECKS.reduce((sum, _, i) => sum + (scores[i] ?? 0), 0);
  const { label: verdictLabel, hue: verdictHue } = verdict(total);

  return (
    <div
      style={{
        border: '1px solid hsl(var(--border-color))', borderRadius: '12px',
        background: 'hsl(var(--bg-secondary) / 0.5)', padding: '1rem 1.1rem',
        display: 'flex', flexDirection: 'column', gap: '0.8rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <AudioLines size={16} color="hsl(var(--accent))" aria-hidden="true" />
        <span style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1, minWidth: '180px' }}>
          Rubber-duck it — one spoken take
        </span>
        <span
          style={{
            fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '999px',
            background: `hsl(var(--${verdictHue}) / 0.15)`,
            border: `1px solid hsl(var(--${verdictHue}) / 0.4)`,
            color: `hsl(var(--${verdictHue}))`,
          }}
        >
          {total}/{MAX_SCORE} · {verdictLabel}
        </span>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        Writing the why is half the rep; the room grades the SPOKEN version. Record one
        take, play it back, and tick only what you actually heard yourself say.
      </p>

      {canRecord ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            aria-pressed={recording}
            aria-label={recording ? 'Stop recording your explanation' : 'Record your spoken explanation'}
            onClick={recording ? stop : start}
          >
            {recording ? (
              <>
                <CircleStop size={14} color="hsl(var(--hard))" /> Stop · {fmtSec(elapsed)}
              </>
            ) : (
              <>
                <Mic size={14} /> {audioUrl ? 'Re-record' : 'Record'}
              </>
            )}
          </button>
          {recording && (
            <span role="status" style={{ fontSize: '0.72rem', color: 'hsl(var(--hard))' }}>
              Recording — stops itself at 3:00.
            </span>
          )}
          {!recording && audioUrl && (
            <>
              {/* Native controls: play/pause/seek arrive keyboard-accessible for free. */}
              <audio
                src={audioUrl}
                controls
                aria-label="Play back your recorded explanation"
                style={{ height: '32px', maxWidth: 'min(100%, 280px)' }}
              />
              <button
                type="button"
                onClick={removeMemo}
                aria-label="Delete this recording"
                title="Delete this recording"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
                  background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                  color: 'hsl(var(--text-secondary))',
                }}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          {note && (
            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>{note}</span>
          )}
        </div>
      ) : (
        // Honest fallback: no dead button pretending to record.
        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
          This browser can't record audio (no MediaRecorder/IndexedDB support). Say the
          explanation out loud anyway — the rubric below is the part that grades you.
        </p>
      )}

      {/* The rubric. Buttons (not divs) so each row is keyboard-reachable; a click
          cycles the score, and the two pips plus the level word carry the state —
          never color alone, so it reads fine under blind/colorblind mode too. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {CHECKS.map((label, i) => {
          const level = scores[i] ?? 0;
          const hue = LEVEL_HUE[level];
          return (
            <button
              key={label}
              type="button"
              aria-label={`${label}: ${LEVELS[level]}. Click to change.`}
              onClick={() => cycleScore(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0',
                color: level > 0 ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))',
                fontSize: '0.8rem', lineHeight: 1.45,
              }}
            >
              <span aria-hidden="true" style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                {Array.from({ length: MAX_LEVEL }, (_, p) => (
                  <span
                    key={p}
                    style={{
                      width: '9px', height: '9px', borderRadius: '3px',
                      background: level > p ? `hsl(var(--${hue}))` : 'hsl(var(--bg-tertiary))',
                      border: `1px solid ${level > p ? `hsl(var(--${hue}))` : 'hsl(var(--border-color))'}`,
                    }}
                  />
                ))}
              </span>
              {label}
              <span style={{ fontSize: '0.68rem', color: `hsl(var(--${hue}))`, fontWeight: 600, marginLeft: 'auto', paddingLeft: '0.5rem' }}>
                {LEVELS[level]}
              </span>
            </button>
          );
        })}
      </div>

      <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
        Scores save with your progress. The audio itself stays in this browser's IndexedDB —
        it is NOT in the JSON backup and never leaves this machine.
      </span>
    </div>
  );
};
