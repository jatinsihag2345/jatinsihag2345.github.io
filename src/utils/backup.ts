/**
 * Progress backup — the one place that knows what "the app's data" means.
 *
 * Everything the learner does (solves, bookmarks, notes, code attempts, review schedule)
 * lives in localStorage, one cleared cache away from gone. Three escape hatches share this
 * module: the JSON file export on the Dashboard, the GitHub gist sync, and the notes
 * Markdown export. They must agree exactly on which keys are "ours" — a backup written by
 * one definition and restored by another silently loses data, which is worse than none.
 */
import { dsaQuestions } from '../data/dsaQuestions';
import { sqlQuestions } from '../data/sqlQuestions';

// Only the app's own keys: exporting the whole origin would leak other localhost apps'
// data into the file, and restoring it would stomp them. `gist-id$` (exact match, not a
// `gist-` prefix) rides along so a restored device patches the same gist instead of
// creating a twin — but `gist-token` must NEVER match: backups travel (files, gists,
// chat threads), and a live GitHub credential must not travel with them.
export const APP_KEY =
  /^(solvedDsaIds|bookmarkedDsaIds|solvedSqlIds|bookmarkedSqlIds|studyMeta|reviewSchedule|mockDrill|notes-|plan-|attempt-|sql-attempt-|manual-trace-|cloze-|cxquiz-|hints-|runner-args-|focus-log|analytics-daily-three|followup-|explain-|delight-|snap-|editor-font$|sketch-|hld-board-|drill-log$|gate-disabled$|focus-sound$|ui-density$|notehist-|session-mark$|plan-met-log$|weekly-mark$|duck-|probe-|checklist-state$|offer-calc$|full-loop-config$|predict-|premortem-|whychain-|error-journal$|calibration-log$|warmup-enabled$|warmup-day$|blind-mode$|daily-mode$|mixed-ten$|tour-done$|whatsnew-seen$|tips-seen$|mytests-|resolve-log$|sql-predict-|design-|sandbox-mode$|achievements$|celebrations$|drill-preset$|ui-scale$|ui-font$|ui-contrast$|ui-motion$|sandbox-schema$|sandbox-query$|reminder-config$|recent-questions$|bughunt-|story-|full-loop$|gist-id$|gist-auto$|gist-last-backup$|install-dismissed$)/;

export interface BackupPayload {
  app: 'striver-sde-sheet';
  exportedAt: string;
  data: Record<string, string>;
}

/** Every APP_KEY-matching entry currently in localStorage, verbatim. */
export const collectAppData = (): Record<string, string> => {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (!APP_KEY.test(k)) continue;
    data[k] = localStorage.getItem(k)!;
  }
  return data;
};

/** The exact payload shape the file export has always written — gists reuse it so a
 *  file backup and a gist backup are interchangeable on restore. */
export const buildBackupPayload = (): BackupPayload => ({
  app: 'striver-sde-sheet',
  exportedAt: new Date().toISOString(),
  data: collectAppData(),
});

/**
 * Validate a backup blob from anywhere (file picker, downloaded gist) down to the entries
 * that are safe to write. Throws on anything that is not a backup from this app; the
 * caller turns that into one human sentence. Keys are re-filtered through APP_KEY on the
 * way in: a hand-edited file must not become a way to write arbitrary localStorage.
 */
export const parseBackup = (raw: string): [string, string][] => {
  const parsed = JSON.parse(raw) as { app?: unknown; data?: unknown };
  if (parsed?.app !== 'striver-sde-sheet' || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error('wrong shape');
  }
  const entries = Object.entries(parsed.data as Record<string, unknown>).filter(
    (e): e is [string, string] => APP_KEY.test(e[0]) && typeof e[1] === 'string',
  );
  if (entries.length === 0) throw new Error('no app data');
  return entries;
};

/**
 * Replace (not merge) the app's keys with the backup's. Snapshot first so a half-failed
 * write (storage quota) can roll back instead of leaving progress in a state that is
 * neither the old one nor the backup. Returns false when the rollback ran — the caller
 * tells the learner their previous progress survived untouched. Confirmation dialogs and
 * the post-restore reload stay in the components; this only moves the data.
 */
export const restoreEntries = (entries: [string, string][]): boolean => {
  const snapshot = new Map<string, string>();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (APP_KEY.test(k)) snapshot.set(k, localStorage.getItem(k)!);
  }
  // What we actually managed to write, so the rollback can undo the backup's keys
  // too — not just the ones we happened to have locally. Without this, a backup key
  // this browser never held (another profile's `notes-dsa-idx-40`) survives the
  // rollback and the learner ends up holding their own data plus a slice of someone
  // else's, while the caller reports "rolled back untouched".
  const written: string[] = [];
  try {
    snapshot.forEach((_, k) => localStorage.removeItem(k)); // replace, not merge
    entries.forEach(([k, v]) => {
      localStorage.setItem(k, v);
      written.push(k);
    });
    return true;
  } catch {
    // The rollback itself must never throw: it runs while storage is already full,
    // and an exception here escapes restoreEntries AND its async caller as an
    // unhandled rejection — the learner would see no message at all with their data
    // half-written. Each write is guarded on its own so one key that will not fit
    // back in cannot cost every key after it.
    written.forEach(k => {
      try { localStorage.removeItem(k); } catch { /* nothing useful left to do */ }
    });
    snapshot.forEach((v, k) => {
      try { localStorage.setItem(k, v); } catch { /* keep restoring the rest */ }
    });
    return false;
  }
};

// ---- Restore diff guard (feature 39) --------------------------------------------

/**
 * Solved problems + tracked review records in one APP_KEY payload. These two
 * numbers are the learner's own mental model of "how much progress is that" —
 * the diff guard compares them because byte counts mean nothing to a human.
 * Corrupt or absent values count as zero rather than throwing: this runs inside
 * confirm() flows where an exception would silently skip the safety line.
 */
export const countProgress = (data: Record<string, string>): { solved: number; reviews: number } => {
  const arrLen = (key: string): number => {
    try {
      const v = JSON.parse(data[key] ?? '[]') as unknown;
      return Array.isArray(v) ? v.length : 0;
    } catch {
      return 0;
    }
  };
  let reviews = 0;
  try {
    const sched = JSON.parse(data['reviewSchedule'] ?? '{}') as unknown;
    if (sched && typeof sched === 'object') reviews = Object.keys(sched).length;
  } catch {
    // A corrupt schedule counts as zero reviews, not as a crash.
  }
  return { solved: arrLen('solvedDsaIds') + arrLen('solvedSqlIds'), reviews };
};

/**
 * The reality-check line embedded in EVERY restore confirm (file, gist,
 * snapshot, profile): what the backup holds vs what this browser holds RIGHT
 * NOW, with an explicit OLDER/NEWER verdict. Restores replace rather than
 * merge, so the classic data-loss accident is confirming a stale backup over a
 * bigger live state — this line makes that impossible to do unknowingly. The
 * verdict is progress-based, not timestamp-based, on purpose: exportedAt says
 * when a file was written, not whose work is in it, and "less progress" is the
 * thing the learner is actually about to lose.
 */
export const compareBackups = (entries: [string, string][]): string => {
  const backup = countProgress(Object.fromEntries(entries));
  const here = countProgress(collectAppData());
  const b = backup.solved + backup.reviews;
  const h = here.solved + here.reviews;
  const verdict =
    b < h
      ? 'The backup looks OLDER (less progress than this browser) — restoring will roll progress back.'
      : b > h
        ? 'The backup looks NEWER (more progress than this browser).'
        : 'Both hold the same amount of progress.';
  return `Backup: ${backup.solved} solved / ${backup.reviews} review records · here right now: ${here.solved} / ${here.reviews}. ${verdict}`;
};

/** Hand the browser a file — the one piece of DOM plumbing every exporter needs. */
export const downloadFile = (name: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

// ---- Notes → Markdown ---------------------------------------------------------------

interface NoteEntry {
  notes?: string;
  plan?: string;
}

const renderQuestion = (title: string, e: NoteEntry): string => {
  let md = `### ${title}\n\n`;
  // The plan came first chronologically (written before the solutions were revealed),
  // so it reads first here too.
  if (e.plan) md += `**My plan before coding**\n\n${e.plan}\n\n`;
  if (e.notes) md += `**Notes**\n\n${e.notes}\n\n`;
  return md;
};

/**
 * Everything the learner wrote, as one organised Markdown document: approach plans and
 * notes grouped under topic headers, titled by question. Markdown because it outlives
 * this site — it pastes into Notion, Obsidian, a gist, or a plain editor unchanged.
 * Returns null when nothing is written yet, so the caller can say so instead of
 * downloading an empty file.
 */
export const buildNotesMarkdown = (): string | null => {
  // notes-/plan- keys end in a question id; collect what actually has text. An emptied
  // textarea leaves its key behind as "", which is not a note worth exporting.
  const perQuestion = new Map<string, NoteEntry>();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    // plan-config / plan-weeks are the study planner's JSON (utils/planEngine.ts),
    // not a written approach plan — without this skip they'd export as gibberish
    // "notes" for phantom questions named "config" and "weeks".
    if (k === 'plan-config' || k === 'plan-weeks') continue;
    const m = /^(notes|plan)-(.+)$/.exec(k);
    if (!m) continue;
    const text = (localStorage.getItem(k) ?? '').trim();
    if (!text) continue;
    const entry = perQuestion.get(m[2]) ?? {};
    if (m[1] === 'notes') entry.notes = text;
    else entry.plan = text;
    perQuestion.set(m[2], entry);
  }
  if (perQuestion.size === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  let md = `# Interview prep notes\n\n_Exported ${today} from Striver SDE Sheet & SQL Top 50 — ${perQuestion.size} question${perQuestion.size === 1 ? '' : 's'}._\n\n`;

  // Walk each catalogue in sheet order so topics come out grouped the way the learner
  // studied them, and consume entries as they're placed.
  const consumed = new Set<string>();
  const walk = (kind: string, catalogue: { id: string; title: string; topic: string }[]) => {
    let currentTopic: string | null = null;
    let section = '';
    catalogue.forEach(q => {
      const e = perQuestion.get(q.id);
      if (!e) return;
      consumed.add(q.id);
      if (q.topic !== currentTopic) {
        section += `## ${kind} · ${q.topic}\n\n`;
        currentTopic = q.topic;
      }
      section += renderQuestion(q.title, e);
    });
    md += section;
  };
  walk('DSA', dsaQuestions);
  walk('SQL', sqlQuestions);

  // Orphaned keys (a question removed in a data update) still carry the learner's own
  // words — keep them under a fallback header rather than silently dropping them.
  const orphans = [...perQuestion.keys()].filter(id => !consumed.has(id));
  if (orphans.length > 0) {
    md += `## No longer in the sheet\n\n`;
    orphans.forEach(id => {
      md += renderQuestion(`Unknown question (${id})`, perQuestion.get(id)!);
    });
  }

  return md;
};
