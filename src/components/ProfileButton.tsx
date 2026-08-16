import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogIn, UserRound, Check, Loader2 } from 'lucide-react';
import { compareBackups, restoreEntries } from '../utils/backup';
import {
  idbSupported,
  listProfiles,
  saveProfile,
  readProfileEntries,
  readActiveProfile,
  setActiveProfile,
  type ProfileMeta,
} from '../utils/snapshots';

/**
 * Sign-in for an app that has no server.
 *
 * There is no account here and there is not going to be one — every byte of
 * progress lives in this browser. What this button signs you into is a named
 * local profile: the same mechanism the display panel exposes under "Profiles",
 * surfaced where people actually look for a login. Two people sharing a laptop
 * each get their own solved list, review schedule and notes, and swapping is a
 * whole-for-whole trade, never a merge.
 *
 * The copy is deliberate about this. Calling it "Sign in" and letting someone
 * assume their progress is on a server somewhere — recoverable after a cache
 * clear, syncing to their phone — would be a lie the first wiped browser
 * exposes. So the button says sign in, and the panel says exactly what that
 * means.
 *
 * Switch semantics are DataSafety's, deliberately duplicated rather than
 * loosened: bank the outgoing progress FIRST, abort the whole switch if that
 * fails, and only then hand the browser to the incoming profile.
 */
export const ProfileButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<ProfileMeta[]>([]);
  const [active, setActive] = useState(readActiveProfile());
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    if (!idbSupported()) return;
    void listProfiles().then(setProfiles);
    setActive(readActiveProfile());
  }, []);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  // Click-outside / Escape close, matching SettingsPanel's behaviour.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const signIn = async () => {
    const name = draft.trim();
    if (!name || busy) return;
    if (profiles.some(p => p.name === name) &&
        !window.confirm(`"${name}" already exists. Overwrite it with what is on this browser right now?`)) {
      return;
    }
    setBusy(true);
    const ok = await saveProfile(name);
    setBusy(false);
    if (!ok) {
      setNote('Could not save — this browser may be blocking IndexedDB (private window?).');
      return;
    }
    // Naming the current data also claims it, which is what makes a later switch safe.
    setActiveProfile(name);
    setDraft('');
    setNote(`Signed in as "${name}". This browser's progress is now banked under that name.`);
    refresh();
  };

  const switchTo = async (name: string) => {
    if (busy || name === active) return;
    if (!active) {
      setNote('Name this browser’s progress first (box below) — otherwise switching would overwrite it with no way back.');
      return;
    }
    const entries = await readProfileEntries(name);
    if (!entries) {
      setNote(`Profile "${name}" could not be read — nothing was changed.`);
      return;
    }
    if (!window.confirm(
      `Switch to "${name}"?\n\nEverything on this browser is saved into "${active}" first, then "${name}" takes over and the page reloads. Nothing is merged — profiles trade places whole.\n\n${compareBackups(entries)}`,
    )) return;

    setBusy(true);
    if (!(await saveProfile(active))) {
      setBusy(false);
      setNote(`Could not bank the current data into "${active}" — switch cancelled, nothing changed.`);
      return;
    }
    if (!restoreEntries(entries)) {
      setBusy(false);
      setNote('Restore failed part-way (storage quota?). Your previous progress was rolled back untouched.');
      return;
    }
    setActiveProfile(name);
    window.location.reload();
  };

  const initial = active ? active.trim().charAt(0).toUpperCase() : null;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className="profile-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        title={active ? `Signed in as ${active}` : 'Sign in to a local profile'}
      >
        <span className="profile-btn__icon" aria-hidden="true">
          {initial ?? <LogIn size={15} />}
        </span>
        <span className="profile-btn__label">{active || 'Sign in'}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Profiles"
          className="glass animate-pop profile-pop"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <UserRound size={14} color="hsl(var(--accent))" />
            <strong style={{ fontSize: '0.82rem' }}>{active ? `Signed in as ${active}` : 'Not signed in'}</strong>
          </div>

          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
            No account, no server — a profile is a named copy of your progress kept in
            this browser. Good for sharing a laptop; it will not follow you to another
            device, and clearing site data clears it.
          </p>

          {!idbSupported() && (
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--hard))' }}>
              This browser is blocking IndexedDB, so profiles cannot be stored here.
            </p>
          )}

          {profiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {profiles.map(p => (
                <button
                  key={p.name}
                  type="button"
                  className="profile-row"
                  disabled={busy}
                  onClick={() => void switchTo(p.name)}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </span>
                  {p.name === active && <Check size={13} color="hsl(var(--easy))" />}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void signIn(); }}
              placeholder={active ? 'Add another name' : 'Your name'}
              aria-label="Profile name"
              className="profile-input"
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.74rem' }}
              disabled={!draft.trim() || busy}
              onClick={() => void signIn()}
            >
              {busy ? <Loader2 size={12} className="spin" /> : <LogIn size={12} />}
              <span>{active ? 'Save' : 'Sign in'}</span>
            </button>
          </div>

          {note && (
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>{note}</p>
          )}
        </div>
      )}
    </div>
  );
};
