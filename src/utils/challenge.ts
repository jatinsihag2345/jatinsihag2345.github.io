/**
 * Friend-challenge links — a drill setup folded into a URL.
 *
 * The payload travels as #ch=base64url(json) in the hash, NOT a query string:
 * hashes never reach a server or its logs, survive static hosting, and a broken
 * one degrades to a normal page load instead of a 404. Titles travel instead of
 * internal ids so a pasted link is human-inspectable ("what am I being dared
 * into?") and stays valid across id churn in data updates — the receiving app
 * re-validates every title against its own catalogue before arming anything.
 */

export type ChallengeMode = 'any' | 'easy-medium' | 'medium-hard';

const MODES: ChallengeMode[] = ['any', 'easy-medium', 'medium-hard'];

export interface ChallengePayload {
  titles: string[];
  mode: ChallengeMode;
}

/** What App hands MockDrill after validating a link: real question ids. */
export interface DrillPreset {
  ids: string[];
  mode: ChallengeMode;
}

export const isDrillPreset = (v: unknown): v is DrillPreset => {
  if (!v || typeof v !== 'object') return false;
  const p = v as DrillPreset;
  return (
    Array.isArray(p.ids) && p.ids.length > 0 && p.ids.length <= 10 &&
    p.ids.every((id) => typeof id === 'string') &&
    MODES.includes(p.mode)
  );
};

// Base64url by hand: btoa alone chokes on non-Latin-1, and titles are user-visible
// text we don't control forever. TextEncoder round-trips any unicode safely.
// Exported: utils/peerReview.ts reuses these rather than a second hand-rolled copy.
export const b64urlEncode = (s: string): string | null => {
  if (typeof TextEncoder === 'undefined' || typeof btoa === 'undefined') return null;
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const b64urlDecode = (s: string): string | null => {
  if (typeof TextDecoder === 'undefined' || typeof atob === 'undefined') return null;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null; // hand-mangled link — the caller shows nothing, never an error page
  }
};

/**
 * Full shareable URL for the current origin. Returns null only when the encoding
 * APIs are missing (callers fall back to not offering the button's copy).
 * Titles are capped defensively — a URL is a terrible transport for a novel.
 */
export const buildChallengeUrl = (titles: string[], mode: ChallengeMode): string | null => {
  const payload: ChallengePayload = {
    // Dedupe (a repeated title would become the same drill problem twice) and
    // truncate by CODE POINTS — t.slice can split a surrogate pair and the lone
    // half fails the decode-side title match, silently dropping the question.
    titles: [...new Set(titles)].slice(0, 10).map((t) => [...t].slice(0, 120).join('')),
    mode: MODES.includes(mode) ? mode : 'any',
  };
  const encoded = b64urlEncode(JSON.stringify(payload));
  if (encoded === null) return null;
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#ch=${encoded}`;
};

/**
 * Parse a location.hash into a challenge, or null for anything that isn't one.
 * Deliberately strict: this is the one place untrusted URL bytes enter the app,
 * so unknown shapes, absurd counts and non-string titles all read as "no
 * challenge" — never as an exception during App's mount.
 */
export const parseChallengeHash = (hash: string): ChallengePayload | null => {
  const m = /^#ch=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return null;
  const json = b64urlDecode(m[1]);
  if (json === null) return null;
  try {
    const p = JSON.parse(json) as ChallengePayload;
    if (!p || typeof p !== 'object' || !Array.isArray(p.titles)) return null;
    const titles = p.titles.filter((t): t is string => typeof t === 'string' && t.trim() !== '').slice(0, 10);
    if (titles.length === 0) return null;
    return { titles, mode: MODES.includes(p.mode) ? p.mode : 'any' };
  } catch {
    return null;
  }
};
