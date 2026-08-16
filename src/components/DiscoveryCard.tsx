import React, { useEffect, useRef, useState } from 'react';
import { Lightbulb, RefreshCw, X } from 'lucide-react';
import { readStringArray, writeJson } from '../utils/persistence';

/**
 * "Did you know" — one rotating tip on the Dashboard, drawn from a bank of
 * twenty that each point at a REAL feature (every claim below was checked
 * against the component that implements it). The app has grown past what
 * anyone finds by accident; this is the drip-feed alternative to a manual.
 *
 * Rotation contract: 'tips-seen' holds the ids already shown. A tip never
 * repeats until every tip has been seen, then the cycle restarts clean.
 * Showing IS seeing — the mount that put it on screen marks it, so a learner
 * who visits daily walks the whole bank in twenty visits, no bookkeeping.
 *
 * Lands at: src/components/DiscoveryCard.tsx (rendered by Dashboard, which
 * unmounts on tab switch — so each Dashboard visit deals the next tip).
 */

interface Tip {
  /** Stable id — renaming one orphans its "seen" mark, so don't. */
  id: string;
  text: string;
}

const TIPS: Tip[] = [
  { id: 'palette-jump', text: '⌘K (Ctrl+K) opens a palette that jumps to any problem by name, topic or pattern — try typing “monotonic”.' },
  { id: 'palette-actions', text: 'The ⌘K palette also runs actions: start a mock drill, open a random unsolved problem, export a backup, flip the theme — hands never leave the keyboard.' },
  { id: 'palette-theory', text: 'Typing in the ⌘K palette searches every Core CS and DSA theory section too — picking one opens the right subject at the right section.' },
  { id: 'list-keys', text: 'On the DSA question list, j/k walk a highlight down the rows, o or Enter opens one, s marks it solved and b bookmarks it.' },
  { id: 'recall-ladder', text: 'Rating your recall on a problem page (Got it / Shaky / Blanked) schedules it to return in 1, 3, 7, 21, then 45 days. Blanking drags it back to tomorrow.' },
  { id: 'core-cards', text: 'Core CS flashcards ride the exact same review ladder as your problems — one queue, one muscle memory for honesty.' },
  { id: 'drill-clock', text: 'The mock drill clock is a timestamp, not a counter: reloading or closing the tab does not pause it. Interviews don’t pause either.' },
  { id: 'backup', text: 'Everything you do lives in this browser. “Export progress” on the Dashboard puts a one-file backup in your hands — and a restore that fails part-way rolls itself back.' },
  { id: 'notes-md', text: '“Export notes (.md)” turns every plan and note you have written into one organised Markdown document — it pastes into Notion or Obsidian unchanged.' },
  { id: 'gist-sync', text: 'Gist sync backs your progress up to a private GitHub gist. The token stays on this device — it is deliberately excluded from every backup file.' },
  { id: 'pattern-lens', text: 'The DSA tab’s “By Pattern” lens regroups the sheet by the technique the optimal solution actually uses — the way interviewers name problems.' },
  { id: 'company-lens', text: '“By Company” on the DSA tab shows which questions are commonly reported at each company, with your solved coverage per company.' },
  { id: 'weak-patterns', text: 'The Dashboard’s “Thinnest patterns” panel ranks the patterns where your coverage is weakest — open DSA → By Pattern to drill one directly.' },
  { id: 'focus-timer', text: 'Run the Stats tab’s focus timer with a problem open and its topic earns those minutes — “Where the minutes went” is rarely where you’d guess.' },
  { id: 'install-badge', text: 'Install this site as an app and the app icon carries a badge with your due-review count (where the browser supports badges). It works offline too.' },
  { id: 'print-cards', text: 'Core CS decks print as fold-in-half paper flashcards — fronts in one column, backs in the other. Revision that survives a dead battery.' },
  { id: 'cloze-seeded', text: 'The fill-in-the-blanks drill blanks the same load-bearing lines on every visit — “I always blank on the loop condition” is only discoverable if it is always the blank.' },
  { id: 'bug-hunt', text: 'Bug Hunt plants a real bug in a problem’s reference solution and hands you its tests — look under the dry-run section; some problems have one waiting.' },
  { id: 'challenge', text: 'After a mock drill, the results screen can mint a challenge link that presets a friend’s drill to your exact problems — same set, same clock, honest race.' },
  { id: 'daily-three', text: 'The Daily Three deals three problems from today’s date — every device gets the same deal, and it reshuffles itself at midnight.' },
  { id: 'rubber-duck', text: 'Once a problem’s solutions are unlocked, record yourself explaining it out loud and grade the take on a 4-part rubric — the score now counts toward the Dashboard’s "Interview readiness" radar.' },
  { id: 'peer-review', text: 'A problem page can generate a review link — paste your code, add a note, and a friend opens it, writes feedback, and sends a reply link back. No accounts, no server.' },
  { id: 'feedback-not-volume', text: 'Two panels are labeled "Feedback, not just volume" on purpose — the mutation gauntlet (do your tests actually catch bugs?) and Calibration (is "I’m sure" actually right?). Solved-count can’t answer either one.' },
];

const SEEN_KEY = 'tips-seen';

/** Seen list, pruned to ids that still exist — a renamed tip must not haunt the
 *  cycle as an unmatchable ghost that keeps "all seen" forever out of reach. */
const readSeen = (): string[] =>
  readStringArray(SEEN_KEY).filter(id => TIPS.some(t => t.id === id));

/** Pick an unseen tip at random, mark it seen, persist. Random within the
 *  unseen pool (not sequential) so two learners comparing dashboards don't get
 *  the illusion of a fixed curriculum — but the no-repeat guarantee holds. */
const advance = (): Tip => {
  let seen = readSeen();
  if (seen.length >= TIPS.length) seen = []; // full cycle — restart clean
  const unseen = TIPS.filter(t => !seen.includes(t.id));
  const tip = unseen[Math.floor(Math.random() * unseen.length)];
  writeJson(SEEN_KEY, [...seen, tip.id]);
  return tip;
};

export const DiscoveryCard: React.FC = () => {
  const [tip, setTip] = useState<Tip | null>(null);
  // Ref-guarded so StrictMode's doubled dev effects can't burn two tips per
  // visit — refs survive the simulated remount, state alone would not help.
  const dealt = useRef(false);

  useEffect(() => {
    if (dealt.current) return;
    dealt.current = true;
    setTip(advance());
  }, []);

  // Dismiss = gone for this visit. Dashboard unmounts on tab switch, so the
  // next visit deals the next unseen tip — nothing to persist for "dismissed".
  if (!tip) return null;

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1rem 1.5rem',
        borderRadius: '16px',
        borderLeft: '4px solid hsl(var(--medium))',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.9rem',
      }}
    >
      <Lightbulb size={18} color="hsl(var(--medium))" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.06em', color: 'hsl(var(--text-muted))', marginBottom: '0.25rem' }}>
          DID YOU KNOW
        </span>
        <p style={{ fontSize: '0.86rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          {tip.text}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
        <button
          type="button"
          aria-label="Show another tip"
          title="Show another tip"
          onClick={() => setTip(advance())}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.25rem' }}
        >
          <RefreshCw size={15} />
        </button>
        <button
          type="button"
          aria-label="Dismiss this tip"
          title="Dismiss"
          onClick={() => setTip(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.25rem' }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
