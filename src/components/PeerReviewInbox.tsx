import React, { useState } from 'react';
import { CheckCircle2, Link2, MessageSquareText, X } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { sqlQuestions } from '../data/sqlQuestions';
import type { SQLQuestion } from '../data/sqlQuestions';
import { buildReviewResponseUrl, parseReviewHash } from '../utils/peerReview';
import type { PeerReviewPayload } from '../utils/peerReview';

interface PeerReviewInboxProps {
  onOpenDsa: (q: Question) => void;
  onOpenSql: (q: SQLQuestion) => void;
}

/**
 * The receiving end of a peer-review link (utils/peerReview.ts) — both directions
 * of it. A request (#pr=..., kind:'request') shows a friend's code and their
 * question, with a feedback box that generates a reply link back. A response
 * (kind:'response') shows that reply once it comes back.
 *
 * Mounted once in App, same one-shot-banner shape as ChallengeInvite: parsed at
 * first render, hash cleared immediately so a reload never re-offers the same
 * link forever.
 */
export const PeerReviewInbox: React.FC<PeerReviewInboxProps> = ({ onOpenDsa, onOpenSql }) => {
  const [payload, setPayload] = useState<PeerReviewPayload | null>(() => parseReviewHash(window.location.hash));
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);

  if (!payload) return null;

  // Drop #pr=... so a reload (or a copied address bar) doesn't re-offer the same
  // review forever — same reasoning and shape as ChallengeInvite's clearHash,
  // called from action handlers rather than unconditionally every render.
  const clearHash = () => {
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch { /* the panel state is already gone; a sticky hash only re-offers */ }
  };

  const dismiss = () => {
    clearHash();
    setPayload(null);
  };

  const byTitle = (t: string) => t.trim().toLowerCase();
  const matchedDsa = dsaQuestions.find(q => byTitle(q.title) === byTitle(payload.questionTitle));
  const matchedSql = !matchedDsa ? sqlQuestions.find(q => byTitle(q.title) === byTitle(payload.questionTitle)) : undefined;

  const openMatched = () => {
    // dismiss() already clears the hash and unmounts this panel.
    if (matchedDsa) onOpenDsa(matchedDsa);
    else if (matchedSql) onOpenSql(matchedSql);
    dismiss();
  };

  const sendReply = () => {
    const url = buildReviewResponseUrl(payload.questionTitle, payload.code, feedback);
    const fallback = () => { window.prompt('Copy this reply link:', url ?? ''); };
    clearHash(); // the reply is generated — a reload shouldn't re-offer the same request
    if (!url) { fallback(); return; }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }, fallback);
    } else {
      fallback();
    }
  };

  const codeBlockStyle: React.CSSProperties = {
    width: '100%', maxHeight: '260px', overflow: 'auto', padding: '0.85rem',
    borderRadius: '8px', background: '#090d16', border: '1px solid hsl(var(--border-color))',
    fontFamily: 'var(--font-mono, monospace)', fontSize: '0.8rem', lineHeight: 1.5,
    color: 'hsl(var(--secondary))', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  };

  return (
    <div
      data-floating-ui="true"
      role="dialog"
      aria-label={payload.kind === 'request' ? 'Peer review request' : 'Peer review reply'}
      className="glass animate-in"
      style={{
        position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 145, width: 'min(94vw, 560px)', maxHeight: '85vh', overflowY: 'auto',
        padding: '1.25rem 1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--secondary))',
        boxShadow: '0 12px 32px hsl(var(--secondary) / 0.25)',
        display: 'flex', flexDirection: 'column', gap: '0.85rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
        <MessageSquareText size={18} color="hsl(var(--secondary))" style={{ flexShrink: 0, marginTop: '0.1rem' }} aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: '0.92rem' }}>
            {payload.kind === 'request' ? 'A friend wants your review' : 'Your friend’s review is back'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.1rem' }}>
            {payload.questionTitle || 'Untitled problem'}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex', flexShrink: 0 }}
        >
          <X size={16} />
        </button>
      </div>

      {(matchedDsa || matchedSql) && (
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', alignSelf: 'flex-start' }} onClick={openMatched}>
          Open this problem
        </button>
      )}

      <div>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
          {payload.kind === 'request' ? "Their code" : "The code you sent"}
        </span>
        <pre style={{ ...codeBlockStyle, marginTop: '0.35rem' }}><code>{payload.code || '(no code included)'}</code></pre>
      </div>

      {payload.kind === 'request' ? (
        <>
          {payload.note && (
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>What they want feedback on</span>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55, marginTop: '0.25rem' }}>{payload.note}</p>
            </div>
          )}
          <label htmlFor="pr-reply" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>
            Your feedback
          </label>
          <textarea
            id="pr-reply"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="What would you tell them in the room?"
            style={{
              width: '100%', minHeight: '110px', padding: '0.75rem', borderRadius: '8px',
              background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-color))', outline: 'none', resize: 'vertical',
              fontSize: '0.85rem', lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }} onClick={sendReply} disabled={!feedback.trim()}>
              <Link2 size={14} /> {copied ? 'Reply link copied!' : 'Send review back'}
            </button>
            {copied && (
              <span className="animate-pop" style={{ fontSize: '0.75rem', color: 'hsl(var(--easy))' }}>
                Send it back the same way you got this one.
              </span>
            )}
          </div>
        </>
      ) : (
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={13} color="hsl(var(--easy))" /> Their feedback
          </span>
          <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-primary))', lineHeight: 1.6, marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>
            {payload.feedback}
          </p>
        </div>
      )}
    </div>
  );
};
