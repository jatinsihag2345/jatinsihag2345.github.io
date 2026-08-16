/**
 * Async peer review — a solution and a note folded into a URL, the same
 * backend-free transport as utils/challenge.ts (#pr=base64url(json), never a
 * query string, never touching a server).
 *
 * Pramp and interviewing.io solve peer/mock review with a live, scheduled human on
 * the other end. This app has no accounts, no matching queue and no server to run
 * one — but "send a friend your code and a question, get their written feedback
 * back" doesn't need real-time matching, and a hash link is a message with no
 * inbox to build. A request link and a response link are the same shape,
 * disambiguated by `kind`, so one small module and one receiving component (see
 * PeerReviewInbox.tsx) handle both directions of the conversation.
 */

import { b64urlDecode, b64urlEncode } from './challenge';

// Generous but not unbounded — a URL is still a message, not a file transfer.
// ~5000 + ~2000 chars of raw text, once JSON-wrapped and base64-inflated by ~4/3,
// lands well under the length every modern browser handles as a normal link.
const CODE_CAP = 5000;
const TEXT_CAP = 2000;

interface ReviewRequest {
  kind: 'request';
  questionTitle: string;
  code: string;
  note: string;
}

interface ReviewResponse {
  kind: 'response';
  questionTitle: string;
  code: string;
  feedback: string;
}

export type PeerReviewPayload = ReviewRequest | ReviewResponse;

const clip = (s: string, cap: number) => [...s].slice(0, cap).join('');

export const buildReviewRequestUrl = (questionTitle: string, code: string, note: string): string | null => {
  const payload: ReviewRequest = {
    kind: 'request',
    questionTitle: clip(questionTitle.trim(), 200),
    code: clip(code, CODE_CAP),
    note: clip(note, TEXT_CAP),
  };
  const encoded = b64urlEncode(JSON.stringify(payload));
  if (encoded === null) return null;
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#pr=${encoded}`;
};

/** The reply carries the original code back too — the friend reading it later
 *  shouldn't need the request link still open in another tab to have context. */
export const buildReviewResponseUrl = (questionTitle: string, code: string, feedback: string): string | null => {
  const payload: ReviewResponse = {
    kind: 'response',
    questionTitle: clip(questionTitle.trim(), 200),
    code: clip(code, CODE_CAP),
    feedback: clip(feedback, TEXT_CAP),
  };
  const encoded = b64urlEncode(JSON.stringify(payload));
  if (encoded === null) return null;
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#pr=${encoded}`;
};

/** Strict on purpose, like parseChallengeHash: this is the one place untrusted
 *  URL bytes enter the app, so anything malformed reads as "no review", never
 *  an exception during App's mount. */
export const parseReviewHash = (hash: string): PeerReviewPayload | null => {
  const m = /^#pr=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return null;
  const json = b64urlDecode(m[1]);
  if (json === null) return null;
  try {
    const p = JSON.parse(json) as Partial<PeerReviewPayload>;
    if (!p || typeof p !== 'object') return null;
    if (typeof p.questionTitle !== 'string' || typeof p.code !== 'string') return null;
    if (p.kind === 'request' && typeof p.note === 'string') {
      return { kind: 'request', questionTitle: p.questionTitle, code: p.code, note: p.note };
    }
    if (p.kind === 'response' && typeof p.feedback === 'string') {
      return { kind: 'response', questionTitle: p.questionTitle, code: p.code, feedback: p.feedback };
    }
    return null;
  } catch {
    return null;
  }
};
