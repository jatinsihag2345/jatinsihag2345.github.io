import React, { useEffect, useState } from 'react';
// GitBranch stands in for a GitHub mark: this lucide version ships no brand icons.
import { GitBranch, CloudUpload, CloudDownload, KeyRound, Trash2, LoaderCircle } from 'lucide-react';
import { readText, writeText, removeStoredValue } from '../utils/persistence';
import { buildBackupPayload, parseBackup, restoreEntries, compareBackups } from '../utils/backup';

/**
 * Cross-device backup via a private GitHub gist.
 *
 * The file export already gets progress OUT of the browser, but the file then lives on
 * one machine. A gist is the lightest server the learner already owns: private by
 * default, versioned by GitHub, reachable from any device, and the API is CORS-open so
 * this static site can talk to it with no backend of ours in between.
 *
 * The token is the sensitive part, so it is handled with deliberate asymmetry: stored
 * ONLY in this browser's localStorage under 'gist-token', shown as a password field,
 * sent to no host but api.github.com, and excluded from every backup this app writes
 * (see APP_KEY in utils/backup.ts) — progress should travel, credentials should not.
 */

const TOKEN_KEY = 'gist-token';
const ID_KEY = 'gist-id';
// Daily auto-backup bookkeeping (feature 31). Both keys ride along in backups
// (see APP_KEY): a preference and a timestamp, nothing sensitive — unlike the
// token, which stays excluded from every backup this app writes.
const AUTO_KEY = 'gist-auto';
const LAST_KEY = 'gist-last-backup';
// 22h, not 24: "daily" with slack, so the backup doesn't drift a little later
// every open until it quietly starts skipping days.
const AUTO_EVERY_MS = 22 * 60 * 60 * 1000;
// Fixed filename — it is how "Restore" finds the right gist on a fresh device that has
// no stored id yet, and how a re-run backup overwrites instead of multiplying.
const FILENAME = 'striver-sde-progress.json';
const API = 'https://api.github.com';

interface GistFile {
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}

interface Gist {
  id: string;
  updated_at?: string;
  files?: Record<string, GistFile | undefined>;
}

type Tone = 'ok' | 'err' | 'info';
type Busy = 'backup' | 'restore' | null;

// Every failure ends as one human sentence — a learner mid-prep should never have to
// interpret an HTTP status code to find out whether their progress is safe.
const explainHttp = (status: number): string =>
  status === 401
    ? 'GitHub rejected that token. Generate a fresh one (only the "gist" scope) and paste it again.'
    : status === 403
      ? 'GitHub is rate-limiting requests right now. Nothing was lost — wait a minute and try again.'
      : `GitHub answered with an unexpected error (${status}). Your progress here is untouched — try again in a bit.`;

const explainNetwork = (): string =>
  'Could not reach GitHub — you look offline. Your progress is safe in this browser; try again once you are back online.';

let autoAttemptedThisLoad = false;

export const GistSync: React.FC = () => {
  const [token, setToken] = useState(() => readText(TOKEN_KEY));
  // Draft lives apart from the saved token so half-typed input is never persisted.
  const [draft, setDraft] = useState('');
  const [gistId, setGistId] = useState(() => readText(ID_KEY));
  const [busy, setBusy] = useState<Busy>(null);
  const [autoOn, setAutoOn] = useState(() => readText(AUTO_KEY) === '1');
  /** Epoch ms of the last successful backup — manual or auto, both reset the daily clock. */
  const [lastBackup, setLastBackup] = useState(() => Number(readText(LAST_KEY)) || 0);
  const [status, setStatus] = useState<{ tone: Tone; text: string } | null>(null);

  const gh = (path: string, init?: RequestInit) =>
    fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token.trim()}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });

  const saveToken = () => {
    const t = draft.trim();
    if (!t) return;
    writeText(TOKEN_KEY, t);
    setToken(t);
    setDraft('');
    setStatus({ tone: 'ok', text: 'Token saved on this device. You can back up now.' });
  };

  const forgetToken = () => {
    // The gist id survives on purpose: it is not a secret, and keeping it lets a
    // re-pasted token keep patching the same gist instead of spawning a twin.
    removeStoredValue(TOKEN_KEY);
    setToken('');
    setStatus({ tone: 'info', text: 'Token forgotten. Your gist on GitHub is untouched.' });
  };

  const backUp = async (auto = false) => {
    setBusy('backup');
    setStatus(null);
    try {
      const body = JSON.stringify({
        description: 'Striver SDE sheet progress — written by the prep site backup button',
        public: false,
        files: { [FILENAME]: { content: JSON.stringify(buildBackupPayload(), null, 1) } },
      });
      let res: Response | null = null;
      if (gistId) {
        res = await gh(`/gists/${gistId}`, { method: 'PATCH', body });
        // The remembered gist was deleted on github.com — start a fresh one rather
        // than failing on a stale pointer.
        if (res.status === 404) res = null;
      }
      if (!res) res = await gh('/gists', { method: 'POST', body });
      if (!res.ok) {
        setStatus({ tone: 'err', text: explainHttp(res.status) });
        return;
      }
      const gist = (await res.json()) as Gist;
      if (typeof gist.id === 'string' && gist.id) {
        writeText(ID_KEY, gist.id);
        setGistId(gist.id);
      }
      // Stamp the moment for the daily gate — a manual backup an hour ago
      // legitimately suppresses tonight's automatic one.
      const stamped = Date.now();
      writeText(LAST_KEY, String(stamped));
      setLastBackup(stamped);
      setStatus({
        tone: 'ok',
        text: auto
          ? 'Auto-backed up to your private gist just now.'
          : `Backed up to a private gist just now. Any device with your token can restore it.`,
      });
    } catch {
      setStatus({ tone: 'err', text: explainNetwork() });
    } finally {
      setBusy(null);
    }
  };

  const toggleAuto = () => {
    const next = !autoOn;
    setAutoOn(next);
    // '1' when on, key absent when off — same flag idiom as 'install-dismissed'.
    if (next) writeText(AUTO_KEY, '1');
    else removeStoredValue(AUTO_KEY);
  };

  // Whole hours since the last successful backup — the honesty line by the toggle.
  const hoursAgo = lastBackup > 0 ? Math.floor((Date.now() - lastBackup) / 3_600_000) : 0;

  // One quiet backup per ~day, attempted when the Dashboard mounts this card.
  // Failures land in the status line exactly as a manual backup's would — text,
  // no alert, nothing modal — and the un-stamped clock retries next load.
  useEffect(() => {
    if (autoAttemptedThisLoad) return; // once per APP LOAD — a per-instance ref would retry on every Dashboard remount
    autoAttemptedThisLoad = true;
    if (!autoOn || !token) return;
    if (Date.now() - lastBackup < AUTO_EVERY_MS) return;
    void backUp(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restore = async () => {
    setBusy('restore');
    setStatus(null);
    try {
      // Prefer the remembered id; a fresh device falls back to hunting the account's
      // gists by filename. The list endpoint returns file manifests without contents,
      // so finding and fetching are two separate steps.
      let gist: Gist | null = null;
      if (gistId) {
        const res = await gh(`/gists/${gistId}`);
        if (res.ok) gist = (await res.json()) as Gist;
        else if (res.status !== 404) {
          setStatus({ tone: 'err', text: explainHttp(res.status) });
          return;
        }
      }
      if (!gist) {
        // Paginate: an account's 101st gist must not turn into "no backup exists".
        // The backup is almost always on page 1, but correctness caps at 10 pages.
        let hit: Gist | undefined;
        for (let page = 1; page <= 10 && !hit; page++) {
          const res = await gh(`/gists?per_page=100&page=${page}`);
          if (!res.ok) {
            setStatus({ tone: 'err', text: explainHttp(res.status) });
            return;
          }
          const list = (await res.json()) as Gist[];
          if (!Array.isArray(list) || list.length === 0) break;
          hit = list.find(g => g?.files?.[FILENAME]);
          if (list.length < 100) break;
        }
        if (!hit) {
          setStatus({
            tone: 'err',
            text: `No gist named ${FILENAME} on this account yet. Press "Back up now" on the device that has your progress first.`,
          });
          return;
        }
        const full = await gh(`/gists/${hit.id}`);
        if (!full.ok) {
          setStatus({ tone: 'err', text: explainHttp(full.status) });
          return;
        }
        gist = (await full.json()) as Gist;
      }

      const file = gist.files?.[FILENAME];
      if (!file) {
        setStatus({ tone: 'err', text: `That gist no longer contains ${FILENAME}. Back up again from the device that has your progress.` });
        return;
      }
      // The gist API inlines contents only up to ~1MB; months of notes can pass that,
      // so fall back to the raw URL (also CORS-open) for the full payload.
      let raw = file.content ?? '';
      if (file.truncated && file.raw_url) {
        raw = await (await fetch(file.raw_url)).text();
      }

      let entries: [string, string][];
      try {
        entries = parseBackup(raw);
      } catch {
        setStatus({ tone: 'err', text: 'That gist does not contain a valid backup from this site.' });
        return;
      }

      const when = (gist.updated_at ?? '').slice(0, 10) || 'an unknown date';
      // Restore diff guard (feature 39): same comparison line as the file
      // import, from the same compareBackups — the escape hatches must agree.
      if (!window.confirm(`Restore the gist backup from ${when}? It replaces your current progress on this browser.\n\n${compareBackups(entries)}`)) {
        setStatus({ tone: 'info', text: 'Restore cancelled — nothing changed.' });
        return;
      }
      if (!restoreEntries(entries)) {
        setStatus({ tone: 'err', text: 'Restore failed part-way (storage quota?). Your previous progress was rolled back untouched.' });
        return;
      }
      // Remember which gist this browser now mirrors, then reload so every screen
      // re-reads localStorage — same post-restore behaviour as the file import.
      writeText(ID_KEY, gist.id);
      window.location.reload();
    } catch {
      setStatus({ tone: 'err', text: explainNetwork() });
    } finally {
      setBusy(null);
    }
  };

  const statusColor =
    status?.tone === 'ok' ? 'hsl(var(--easy))' : status?.tone === 'err' ? 'hsl(var(--hard))' : 'hsl(var(--text-secondary))';

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem',
        borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <GitBranch size={18} color="hsl(var(--secondary))" />
        Sync via GitHub gist
      </h3>

      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
        Back your progress up to a <strong>private gist</strong> on your own GitHub account, and pull it
        down on any other device. You need a personal access token with <em>only</em> the{' '}
        <code style={{ fontSize: '0.78rem' }}>gist</code> scope —{' '}
        <a
          href="https://github.com/settings/tokens/new?scopes=gist&description=Striver%20SDE%20progress%20backup"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'hsl(var(--secondary))' }}
        >
          create one here
        </a>
        .
      </p>

      {!token ? (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label htmlFor="gist-token-input" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <KeyRound size={14} color="hsl(var(--text-muted))" /> Token
          </label>
          <input
            id="gist-token-input"
            type="password"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveToken(); }}
            placeholder="ghp_… (gist scope only)"
            autoComplete="off"
            style={{
              flex: '1 1 220px', padding: '0.5rem 0.75rem', borderRadius: '8px',
              background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-color))', outline: 'none', fontSize: '0.82rem',
            }}
          />
          <button
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            onClick={saveToken}
            disabled={!draft.trim()}
          >
            Save token
          </button>
          <span style={{ flexBasis: '100%', fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
            The token is saved only in this browser's storage. It never touches any server except
            GitHub's, and it is deliberately left out of every backup this site writes.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            onClick={() => backUp()}
            disabled={busy !== null}
          >
            {busy === 'backup' ? <LoaderCircle size={14} className="spin" /> : <CloudUpload size={14} />} Back up now
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            onClick={restore}
            disabled={busy !== null}
          >
            {busy === 'restore' ? <LoaderCircle size={14} className="spin" /> : <CloudDownload size={14} />} Restore from gist
          </button>
          <button
            onClick={forgetToken}
            disabled={busy !== null}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer',
              background: 'none', border: 'none', fontSize: '0.72rem',
              color: 'hsl(var(--text-muted))', textDecoration: 'underline',
            }}
          >
            <Trash2 size={12} /> Forget token
          </button>
          <label
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-secondary))',
            }}
          >
            <input
              type="checkbox"
              checked={autoOn}
              onChange={toggleAuto}
              style={{ accentColor: 'hsl(var(--primary))' }}
            />
            Auto-backup daily
          </label>
          {autoOn && (
            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontVariantNumeric: 'tabular-nums' }}>
              {lastBackup > 0
                ? hoursAgo === 0
                  ? 'auto-backed-up under an hour ago'
                  : `auto-backed-up ${hoursAgo}h ago`
                : 'no backup yet — the next app load will run one'}
            </span>
          )}
          <span style={{ flexBasis: '100%', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            Token saved on this device only.{gistId ? ' Backing up updates your existing gist.' : ' First backup creates a private gist named ' + FILENAME + '.'}
          </span>
        </div>
      )}

      {/* Polite live region: outcomes are announced to screen readers without stealing focus. */}
      <p aria-live="polite" style={{ fontSize: '0.78rem', fontWeight: 600, color: statusColor, minHeight: '1em', margin: 0 }}>
        {status?.text ?? ''}
      </p>
    </div>
  );
};
