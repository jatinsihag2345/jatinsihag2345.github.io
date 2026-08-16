import React, { useEffect, useState } from 'react';
import { ChevronDown, Link2, UsersRound } from 'lucide-react';
import { readText } from '../utils/persistence';
import { buildReviewRequestUrl } from '../utils/peerReview';

/**
 * "Ask a friend to review this" — the sending half of async peer review.
 *
 * Lands at: src/components/PeerReviewComposer.tsx
 * Receiving half: PeerReviewInbox.tsx (mounted once in App).
 *
 * No accounts, no queue, no server: this generates a #pr=... link (utils/peerReview)
 * carrying the code and a note, to send through whatever channel the two of you
 * already use. The friend's reply comes back the same way — a link, not a message
 * in this app's inbox, because there isn't one.
 */

interface PeerReviewComposerProps {
  questionId: string;
  questionTitle: string;
  /** DSA attempts live under 'attempt-<id>' (PythonPlayground); SQL attempts
   *  live under 'sql-attempt-<id>' (SqlPlayground) — same idea, different owner. */
  attemptKeyPrefix?: string;
}

const copyOrPrompt = (url: string, onCopied: () => void) => {
  const fallback = () => { window.prompt('Copy this review link:', url); };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(onCopied, fallback);
  } else {
    fallback();
  }
};

export const PeerReviewComposer: React.FC<PeerReviewComposerProps> = ({ questionId, questionTitle, attemptKeyPrefix = 'attempt-' }) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [tooBig, setTooBig] = useState(false);

  // New question -> the composer starts fresh, prefilled from whatever the
  // learner already has saved as their attempt, so there's usually nothing to
  // paste in by hand.
  useEffect(() => {
    setCode(readText(`${attemptKeyPrefix}${questionId}`));
    setNote('');
    setCopied(false);
    setTooBig(false);
  }, [questionId, attemptKeyPrefix]);

  const generate = () => {
    const url = buildReviewRequestUrl(questionTitle, code, note);
    if (!url) { setTooBig(true); return; }
    setTooBig(false);
    copyOrPrompt(url, () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="glass no-print" style={{ borderRadius: '16px', border: '1px solid hsl(var(--border-color))', overflow: 'hidden' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
          color: 'hsl(var(--text-primary))', textAlign: 'left', fontFamily: 'var(--font-sans)',
        }}
      >
        <UsersRound size={16} color="hsl(var(--secondary))" />
        <span style={{ flex: 1, fontSize: '1rem', fontWeight: 700 }}>
          Ask a friend to review this
          <span style={{ marginLeft: '0.6rem', fontSize: '0.75rem', fontWeight: 500, color: 'hsl(var(--text-muted))' }}>
            a link they open, no account for either of you
          </span>
        </span>
        <ChevronDown size={16} color="hsl(var(--text-muted))" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
      </button>

      {open && (
        <div className="animate-fade" style={{ padding: '0 1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label htmlFor="pr-code" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>
            Your solution
          </label>
          <textarea
            id="pr-code"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Paste or write the code you want eyes on…"
            spellCheck={false}
            style={{
              width: '100%', minHeight: '160px', padding: '0.75rem', borderRadius: '8px',
              background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-color))', outline: 'none', resize: 'vertical',
              fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem', lineHeight: 1.5,
            }}
          />
          <label htmlFor="pr-note" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>
            What you want feedback on
          </label>
          <textarea
            id="pr-note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. “Is there a cleaner way to handle the empty-input case?”"
            style={{
              width: '100%', minHeight: '70px', padding: '0.75rem', borderRadius: '8px',
              background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-color))', outline: 'none', resize: 'vertical',
              fontSize: '0.85rem', lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
              onClick={generate}
              disabled={!code.trim()}
            >
              <Link2 size={14} /> {copied ? 'Link copied!' : 'Generate review link'}
            </button>
            {copied && (
              <span className="animate-pop" style={{ fontSize: '0.75rem', color: 'hsl(var(--easy))' }}>
                Send it anywhere — they open it, write feedback, and send a reply link back the same way.
              </span>
            )}
            {tooBig && (
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--hard))' }}>
                Couldn't build the link — this browser is missing an encoding API this needs.
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
            Nothing here is saved by this app or sent to any server — the code and note travel entirely
            inside the link you copy. Long solutions get trimmed to keep the link a reasonable size.
          </span>
        </div>
      )}
    </div>
  );
};
