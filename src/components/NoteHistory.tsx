import React, { useRef, useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';
import { readJson, writeJson } from '../utils/persistence';
import { SolutionDiff } from './SolutionDiff';

/**
 * Feature 32 — version history for the My Notes textarea.
 *
 * Notes save on every keystroke, which means every editing session silently
 * OVERWRITES the last one — the insight you wrote three weeks ago is gone the
 * moment you start "just tidying" today. This module keeps the last few session
 * boundaries recoverable: when a keystroke arrives after five quiet minutes, the
 * text the previous session left behind is snapshotted first, capped at five
 * versions per question in `notehist-<id>`.
 *
 * Five minutes because it separates SESSIONS, not keystrokes: pauses while
 * thinking are seconds to a couple of minutes; coming back after lunch or a week
 * is what should create a version. The cap keeps a heavily-edited note from
 * hoarding storage the playground attempts need.
 *
 * The dropdown shows each snapshot with a SolutionDiff against the current text —
 * reusing the playground's diff with an honest caption, because "what did I change
 * since then?" is exactly a two-version line diff.
 *
 * Lands at: src/components/NoteHistory.tsx  (mounted inside ProblemViewer's My Notes card)
 */

interface NoteVersion {
  /** ISO timestamp of the moment the snapshot was taken. */
  at: string;
  text: string;
}

interface NoteHist {
  /** Epoch ms of the last observed keystroke — what defines a "session gap". */
  lastWrite: number;
  /** Newest first. */
  versions: NoteVersion[];
}

const KEY = (questionId: string) => `notehist-${questionId}`;
const SESSION_GAP_MS = 5 * 60_000;
/** lastWrite only needs 5-minute resolution — rewriting the whole blob (up to five
 *  note-sized texts) on EVERY keystroke would be storage churn for nothing, so the
 *  timestamp refresh is throttled. Worst case the gap is measured 30s short, which
 *  cannot flip a >5-minute decision the wrong way by more than that. */
const TOUCH_THROTTLE_MS = 30_000;
const CAP = 5;

const EMPTY: NoteHist = { lastWrite: 0, versions: [] };

const isHist = (v: unknown): v is NoteHist =>
  !!v && typeof v === 'object' &&
  typeof (v as NoteHist).lastWrite === 'number' &&
  Array.isArray((v as NoteHist).versions) &&
  (v as NoteHist).versions.every(
    ver => !!ver && typeof ver === 'object' && typeof ver.at === 'string' && typeof ver.text === 'string',
  );

/**
 * Call on every notes keystroke, BEFORE the new value is stored, with the text the
 * textarea held until now. Snapshots that text when the previous keystroke was more
 * than five minutes ago (a new session is starting over old work); otherwise just
 * keeps the session clock warm. `force` is for restores — the note being replaced
 * is itself worth keeping, whatever the clock says.
 */
export const maybeSnapshotNote = (questionId: string, prevText: string, force = false): void => {
  const hist = readJson<NoteHist>(KEY(questionId), EMPTY, isHist);
  const now = Date.now();
  const newSession = force || now - hist.lastWrite > SESSION_GAP_MS;
  // Blank text is a deleted note, not a version; an unchanged text would diff empty.
  const worthKeeping = prevText.trim().length > 0 && prevText !== hist.versions[0]?.text;

  if (newSession && worthKeeping) {
    writeJson(KEY(questionId), {
      lastWrite: now,
      versions: [{ at: new Date().toISOString(), text: prevText }, ...hist.versions].slice(0, CAP),
    });
    return;
  }
  if (now - hist.lastWrite > TOUCH_THROTTLE_MS) {
    writeJson(KEY(questionId), { ...hist, lastWrite: now });
  }
};

interface NoteHistoryProps {
  questionId: string;
  /** What the textarea shows right now — the "yours" side of every diff. */
  currentText: string;
  /** Put this text back in the textarea (and its storage key). The component
   *  snapshots the current text first, so a restore never destroys anything. */
  onRestore: (text: string) => void;
}

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  // Feature-detect nothing here: toLocaleString is universal; an invalid stored
  // date (hand-edited backup) degrades to the raw string rather than "Invalid Date".
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const NoteHistory: React.FC<NoteHistoryProps> = ({ questionId, currentText, onRestore }) => {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  /** Index of the version whose diff is unfolded; one at a time keeps the panel scannable. */
  const [selected, setSelected] = useState<number | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (!open) {
      // Read at open, not at mount: snapshots may have landed since (a restore, or
      // this very session crossing the five-minute line while the page sat open).
      setVersions(readJson<NoteHist>(KEY(questionId), EMPTY, isHist).versions);
      setSelected(null);
    }
    setOpen(o => !o);
  };

  const close = () => {
    setOpen(false);
    // Hand focus back where it came from so Escape doesn't strand the keyboard.
    toggleRef.current?.focus();
  };

  const restore = (v: NoteVersion) => {
    // Force-snapshot the outgoing text first: restore must be an exchange, never
    // a deletion. Cap still applies — five versions is the contract.
    maybeSnapshotNote(questionId, currentText, true);
    onRestore(v.text);
    close();
  };

  return (
    /* Absolute-positioned panel anchored to a relative wrapper — it overlays the
       card content below, not the page, so it is NOT fixed and needs no
       data-floating-ui. Escape closes from anywhere inside. */
    <div
      style={{ position: 'relative' }}
      onKeyDown={e => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        className="btn btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
        aria-expanded={open}
        aria-label="Note history — earlier versions of this note"
        title="Earlier versions of this note"
        onClick={toggle}
      >
        <History size={14} />
        <span>History</span>
      </button>

      {open && (
        <div
          className="animate-in"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)', zIndex: 30,
            width: 'min(560px, 86vw)', maxHeight: '420px', overflowY: 'auto',
            background: 'hsl(var(--bg-secondary))',
            border: '1px solid hsl(var(--border-color))',
            borderRadius: '12px', padding: '0.9rem',
            boxShadow: '0 12px 32px hsl(var(--bg-primary) / 0.6)',
            display: 'flex', flexDirection: 'column', gap: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, flex: 1 }}>
              Earlier versions of this note
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.45rem' }}
              aria-label="Close note history"
              onClick={close}
            >
              <X size={12} />
            </button>
          </div>

          {versions.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
              No older versions yet. A snapshot is taken automatically when you come
              back to edit this note after five quiet minutes — the text your last
              session left behind is what gets kept.
            </p>
          ) : (
            <>
              <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
                The last {versions.length === 1 ? 'session boundary' : `${versions.length} session boundaries`}, newest
                first (five kept at most). Open one to see what changed since.
              </p>
              {versions.map((v, i) => (
                <div key={v.at + i} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="code-menu-item"
                      aria-expanded={selected === i}
                      onClick={() => setSelected(s => (s === i ? null : i))}
                      style={{
                        flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.15rem',
                        background: 'none', border: '1px solid hsl(var(--border-color))', borderRadius: '8px',
                        padding: '0.5rem 0.65rem', cursor: 'pointer', color: 'hsl(var(--text-primary))',
                      }}
                    >
                      <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{fmtWhen(v.at)}</span>
                      <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                        {(v.text.split('\n').find(l => l.trim()) ?? '').slice(0, 80) || '(blank first line)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.6rem' }}
                      aria-label={`Restore the ${fmtWhen(v.at)} version of this note`}
                      title="Restore this version (today's text is snapshotted first)"
                      onClick={() => restore(v)}
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                  {selected === i && (
                    /* SolutionDiff labels its sides "+ only in yours / − only in the
                       reference" — the caption makes "the reference" honest here. */
                    <SolutionDiff
                      learnerCode={currentText}
                      solutionCode={v.text}
                      caption={`"Yours" is the note as it reads right now; "the reference" is the ${fmtWhen(v.at)} snapshot. Green + lines exist only in today's text, violet − lines only in the snapshot. Restoring swaps the whole snapshot back after saving today's text as a new version.`}
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
