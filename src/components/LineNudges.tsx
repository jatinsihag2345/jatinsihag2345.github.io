import React from 'react';
import { Search } from 'lucide-react';

/**
 * Post-failure line nudges — five static heuristics over a failing Python attempt.
 *
 * When a graded run fails, the learner stares at a red assertion with no idea WHERE to
 * look. A human tutor would not hand over the fix; they would say "hm, check line 4" —
 * pointing, not telling. These heuristics do exactly that: they fire on shapes that
 * statistically hide bugs (off-by-one bounds, mutating a list mid-iteration, float
 * division feeding an index, a visited set that never grows), and they deliberately
 * fire on plenty of CORRECT code too. That is why every nudge is phrased as "worth
 * checking", never "this is wrong" — an oracle that bluffs certainty it does not have
 * would burn the learner's trust the first time it pointed at a healthy line.
 *
 * Shared by PythonPlayground (the main attempt and the brute-force slot) and BugHunt.
 */

export interface LineHint {
  /** 1-indexed, matching the editor gutter. */
  line: number;
  note: string;
}

export const scanForLineHints = (code: string): LineHint[] => {
  const lines = code.split('\n');
  const found: LineHint[] = [];
  const taken = new Set<number>();
  // One nudge per line: two warnings about the same line read as a pile-on, and the
  // first heuristic to claim a line is the more specific one (they run specific→broad).
  const add = (line: number, note: string) => {
    if (taken.has(line)) return;
    taken.add(line);
    found.push({ line, note });
  };
  // Naive comment strip. A '#' inside a string literal costs at worst a missed or
  // spurious NUDGE — acceptable for a hint engine, unacceptable for a verdict engine,
  // which is exactly why this module only ever nudges.
  const stripped = lines.map(l => l.split('#')[0]);

  // 1 — range(len(x) - 1) in a scan loop: right for adjacent-pair scans, but the
  //     single most common way to silently skip the last element.
  stripped.forEach((l, i) => {
    if (/\bfor\b/.test(l) && /range\(\s*len\([^()]*\)\s*-\s*1/.test(l)) {
      add(i + 1, 'range(len(…) - 1) stops one before the last element. Right for pair scans using i and i+1 — worth a second look if this loop should visit every item.');
    }
  });

  // 2 — '<=' sharing a line with a len(...) bound: the classic off-by-one
  //     neighbourhood (inclusive bound + full length walks off the end).
  stripped.forEach((l, i) => {
    if (/<=/.test(l) && /\blen\s*\(/.test(l)) {
      add(i + 1, 'a <= comparison next to len(…) is off-by-one territory — check whether the boundary index should be included, and whether it can reach len itself.');
    }
  });

  // 3 — mutating the list a for-loop is currently walking: Python does not copy the
  //     iterable, so removals shift elements under the iterator and items get skipped.
  const forRe = /^(\s*)for\s+\w+(?:\s*,\s*\w+)*\s+in\s+([A-Za-z_]\w*)\s*:/;
  stripped.forEach((l, i) => {
    const m = forRe.exec(l);
    if (!m) return;
    const depth = m[1].length;
    const mutates = new RegExp('\\b' + m[2] + '\\.(remove|pop|append|insert|clear)\\(');
    for (let j = i + 1; j < lines.length; j++) {
      if (stripped[j].trim() === '') continue;
      if ((/^\s*/.exec(stripped[j]) as RegExpExecArray)[0].length <= depth) break; // left the loop body
      if (mutates.test(stripped[j])) {
        add(j + 1, `this changes ${m[2]} while the for-loop on line ${i + 1} is still walking it — the list shifts under the iterator and elements get skipped or repeated.`);
        break; // one report per loop is a nudge; three is an indictment
      }
    }
  });

  // 4 — true division at a spot that smells like a midpoint/index computation:
  //     / always yields a float in Python 3, and floats cannot index lists.
  stripped.forEach((l, i) => {
    if (/(?:^|[^/])\/(?!\/)\s*2\b/.test(l)) {
      add(i + 1, '/ is true division and yields a float — if this value later indexes a list (a midpoint, say), // keeps it an int.');
    }
  });

  // 5 — a queue/stack loop that READS visited but never grows it: the BFS shape where
  //     forgetting visited.add(...) makes the queue revisit forever. Only fires when
  //     `visited` is actually referenced — plenty of correct loops (tree BFS) need no
  //     visited set at all, and flagging those would be noise.
  const mentionsVisited = /\bvisited\b/.test(code);
  const growsVisited = /visited\s*\.\s*(add|append)\s*\(|visited\s*\[/.test(code);
  if (mentionsVisited && !growsVisited && /\.popleft\(|\.pop\(/.test(code)) {
    const w = stripped.findIndex(l => /^\s*while\b/.test(l));
    if (w !== -1) {
      add(w + 1, 'this loop reads visited but nothing ever adds to it — BFS/DFS shapes usually mark a node at the moment it is enqueued, or the queue revisits it forever.');
    }
  }

  // At most two. Heuristics ran specific-first, so the two kept are the two most
  // likely to matter — and a longer list stops reading as help and starts reading
  // as an accusation dump.
  return found.slice(0, 2);
};

interface LineNudgesProps {
  /** The CURRENT editor text — recomputed per render on purpose: the learner keeps
   *  typing after a failed run, and a hint pointing at yesterday's line numbers
   *  would mislead more than it helps. */
  code: string;
}

/** Renders nothing when no heuristic fires — silence beats a made-up hint. */
export const LineNudges: React.FC<LineNudgesProps> = ({ code }) => {
  const nudges = scanForLineHints(code);
  if (nudges.length === 0) return null;
  return (
    <div
      className="animate-in"
      style={{
        padding: '0.8rem 1rem',
        borderRadius: '10px',
        background: 'hsl(var(--medium) / 0.06)',
        border: '1px dashed hsl(var(--medium) / 0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <span
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
          color: 'hsl(var(--medium))',
        }}
      >
        <Search size={12} />
        NOT A VERDICT — JUST WHERE THIS SHAPE OFTEN HIDES BUGS
      </span>
      {nudges.map(n => (
        <p key={n.line} style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
          Worth checking <strong style={{ color: 'hsl(var(--text-primary))' }}>line {n.line}</strong> — {n.note}
        </p>
      ))}
    </div>
  );
};
