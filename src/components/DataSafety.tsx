import React, { useCallback, useEffect, useState } from 'react';
import { Archive, Users, Trash2 } from 'lucide-react';
import { compareBackups, restoreEntries } from '../utils/backup';
import {
  idbSupported,
  listSnapshots,
  readSnapshotEntries,
  listProfiles,
  saveProfile,
  readProfileEntries,
  deleteProfile,
  readActiveProfile,
  setActiveProfile,
  clearActiveProfile,
  type SnapshotMeta,
  type ProfileMeta,
} from '../utils/snapshots';

/**
 * The SettingsPanel's "your data can always come back" section (features 35–36):
 * the daily-snapshot restore list and the profile switcher, both riding the
 * same utils/snapshots store and the same restoreEntries() path every other
 * restore in the app uses — one replace-all semantic, one rollback guarantee.
 *
 * Every restore confirm embeds compareBackups()'s counts line (feature 39), so
 * "which of these is the good one?" is answered inside the dialog instead of
 * after the reload.
 *
 * Lands at: src/components/DataSafety.tsx
 */

const sectionLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'hsl(var(--text-muted))',
};

const hint: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'hsl(var(--text-muted))',
  lineHeight: 1.5,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.4rem 0.5rem',
  borderRadius: '8px',
  background: 'hsl(var(--bg-tertiary))',
  border: '1px solid hsl(var(--border-color))',
};

const smallBtn: React.CSSProperties = {
  padding: '0.3rem 0.6rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.7rem',
  fontWeight: 700,
  fontFamily: 'var(--font-sans)',
  background: 'hsl(var(--primary) / 0.14)',
  border: '1px solid hsl(var(--primary) / 0.5)',
  color: 'hsl(var(--primary))',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const fmtBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`;

const fmtDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const DataSafety: React.FC = () => {
  const [snaps, setSnaps] = useState<SnapshotMeta[]>([]);
  const [profiles, setProfiles] = useState<ProfileMeta[]>([]);
  const [active, setActive] = useState(readActiveProfile);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');

  const refresh = useCallback(() => {
    // Two independent lists; whichever resolves first paints first. Failure
    // resolves to [] inside utils/snapshots, so there is nothing to catch here.
    void listSnapshots().then(setSnaps);
    void listProfiles().then(setProfiles);
    setActive(readActiveProfile());
  }, []);
  useEffect(refresh, [refresh]);

  // ---- Feature 35: restore a daily snapshot -----------------------------------
  const restoreSnapshot = async (date: string) => {
    const entries = await readSnapshotEntries(date);
    if (!entries) {
      setNote('That snapshot could not be read — the browser may have evicted it. The other rows may still work.');
      return;
    }
    // The diff guard (feature 39): counts + OLDER/NEWER verdict inside the
    // confirm, because a snapshot restore is exactly a restore of old data.
    if (
      !window.confirm(
        `Restore the ${fmtDay(date)} snapshot? It replaces your current progress on this browser and reloads the page.\n\n${compareBackups(entries)}`,
      )
    )
      return;
    if (!restoreEntries(entries)) {
      setNote('Restore failed part-way (storage quota?). Your previous progress was rolled back untouched.');
      return;
    }
    window.location.reload();
  };

  // ---- Feature 36: profiles ----------------------------------------------------
  const createProfile = async () => {
    const name = draft.trim();
    if (!name) return;
    if (profiles.some(p => p.name === name) && !window.confirm(`"${name}" already exists. Overwrite it with what is on this browser right now?`)) {
      return;
    }
    if (!(await saveProfile(name))) {
      setNote('Could not save the profile — this browser may be blocking IndexedDB (private window?).');
      return;
    }
    // Naming the current data ALSO claims it: this browser's live progress now
    // belongs to that profile, which is what makes switching later safe.
    setActiveProfile(name);
    setDraft('');
    setNote(`Saved what's here as "${name}" — now the active profile.`);
    refresh();
  };

  const switchTo = async (name: string) => {
    if (!active) {
      // Refusing is the safety: with no active profile there is nowhere to
      // save the current data, so switching would silently destroy it.
      setNote('First save what is here as a profile (box below) — otherwise switching would overwrite it with no way back.');
      return;
    }
    const entries = await readProfileEntries(name);
    if (!entries) {
      setNote(`Profile "${name}" could not be read — nothing was changed.`);
      return;
    }
    if (
      !window.confirm(
        `Switch to "${name}"?\n\nEverything on this browser is saved into "${active}" first, then "${name}" takes over and the page reloads. Nothing is merged — profiles trade places whole.\n\n${compareBackups(entries)}`,
      )
    )
      return;
    // Save BEFORE restore, and abort if it fails — the whole promise of the
    // switcher is that the outgoing person's progress is banked first.
    if (!(await saveProfile(active))) {
      setNote(`Could not bank the current data into "${active}" — switch cancelled, nothing changed.`);
      return;
    }
    if (!restoreEntries(entries)) {
      setNote('Restore failed part-way (storage quota?). Your previous progress was rolled back untouched.');
      return;
    }
    setActiveProfile(name);
    window.location.reload();
  };

  const removeProfile = async (name: string) => {
    const suffix =
      name === active
        ? ' Your live progress on this browser stays — only the banked copy goes.'
        : ' The copy banked under that name is gone for good.';
    if (!window.confirm(`Delete profile "${name}"?${suffix}`)) return;
    if (!(await deleteProfile(name))) {
      setNote('Could not delete — this browser may be blocking IndexedDB.');
      return;
    }
    // The pointer must not name a profile that no longer exists; clearing it
    // also re-arms the "save what is here first" guard above.
    if (name === active) clearActiveProfile();
    setNote(`Deleted "${name}".`);
    refresh();
  };

  if (!idbSupported()) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.6rem' }}>
        <span style={sectionLabel}>
          <Archive size={12} aria-hidden="true" /> Snapshots &amp; profiles
        </span>
        <span style={hint}>
          This browser doesn't offer IndexedDB (common in private windows), so daily snapshots and
          profiles can't be kept here. The file export and gist sync on the Dashboard still work.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.6rem' }}>
      {/* ---- Snapshots (feature 35) ---- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={sectionLabel}>
          <Archive size={12} aria-hidden="true" /> Restore a snapshot
        </span>
        <span style={hint}>
          Once a day, opening the app quietly banks a full copy of your progress here. The last 7 are
          kept — the net under every restore button in this app.
        </span>
        {snaps.length === 0 ? (
          <span style={hint}>No snapshots yet — the next app open writes the first one.</span>
        ) : (
          snaps.map(s => (
            <div key={s.date} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
                  {fmtDay(s.date)}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fmtBytes(s.bytes)} · {s.solved} solved / {s.reviews} reviews
                </div>
              </div>
              <button type="button" style={smallBtn} className="lift" onClick={() => void restoreSnapshot(s.date)}>
                Restore
              </button>
            </div>
          ))
        )}
      </div>

      {/* ---- Profiles (feature 36) ---- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={sectionLabel}>
          <Users size={12} aria-hidden="true" /> Profiles
        </span>
        <span style={hint}>
          Sharing this laptop? Each person keeps a named copy. Switching banks everything into the
          active profile, loads the other one whole, and reloads — nothing is merged.
        </span>
        <span style={{ ...hint, fontWeight: 700, color: 'hsl(var(--text-secondary))' }}>
          Active: {active ? `"${active}"` : 'none yet — what is here has no profile'}
        </span>
        {profiles.map(p => (
          <div key={p.name} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-primary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.solved} solved / {p.reviews} reviews · {fmtBytes(p.bytes)}
              </div>
            </div>
            {p.name !== active && (
              <button type="button" style={smallBtn} className="lift" onClick={() => void switchTo(p.name)}>
                Switch
              </button>
            )}
            <button
              type="button"
              aria-label={`Delete profile ${p.name}`}
              onClick={() => void removeProfile(p.name)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
                background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))',
                color: 'hsl(var(--text-muted))', padding: 0,
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void createProfile();
            }}
            placeholder="Name what's here (e.g. Abhinav)"
            aria-label="New profile name"
            style={{
              flex: 1, minWidth: 0, padding: '0.35rem 0.5rem', borderRadius: '6px',
              background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-color))', outline: 'none', fontSize: '0.75rem',
            }}
          />
          <button type="button" style={smallBtn} className="lift" disabled={!draft.trim()} onClick={() => void createProfile()}>
            Save
          </button>
        </div>
      </div>

      {/* Polite live region, same idiom as GistSync's status line. */}
      <p aria-live="polite" style={{ ...hint, minHeight: '1em', margin: 0, fontWeight: 600 }}>
        {note}
      </p>
    </div>
  );
};
