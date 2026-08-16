import React, { useEffect, useMemo, useState } from 'react';
import { Puzzle, Eye, CheckCircle2, RotateCcw, Zap, Check } from 'lucide-react';
import { readJson, writeJson } from '../utils/persistence';
import { gradeQuestion, todayISO } from '../utils/review';
import { hashSeed, mulberry32 } from '../utils/practiceRandom';

interface ClozeRecallProps {
  questionId: string;
  /** The Optimal approach's code — the version worth being able to reproduce cold. */
  code: string;
}

/**
 * Fill in the missing lines.
 *
 * Re-reading a solution feels like studying and mostly is not — the eye recognises
 * every line and the hand could produce none of them. This takes the optimal code,
 * removes the 3–5 lines that actually carry the algorithm (the loop condition, the
 * pointer nudge, the return), and makes the learner type them back. It is a smaller,
 * sharper version of writing the whole thing: it finds the exact line you would
 * fumble at the whiteboard, and nothing else.
 *
 * Blank selection is seeded from the question id, never Math.random(): the exercise
 * a learner walks away from mid-attempt must be the one they come back to.
 */

interface Blank {
  lineIdx: number;
  /** What the learner must reproduce: the code before any inline comment, trimmed. */
  answer: string;
  /** The inline comment stays visible — it says WHY the line exists, which is
   *  exactly the cue that should pull the line back out of memory. */
  comment: string;
  indent: string;
}

interface ClozeAttempt {
  on: string;
  correct: number;
  revealed: number;
  total: number;
}
interface ClozeStore {
  attempts: ClozeAttempt[];
}

// Strict shape check before trusting localStorage — a stale or hand-edited blob
// must degrade to "no history", never to a crash on the problem page.
const isClozeStore = (v: unknown): v is ClozeStore => {
  if (!v || typeof v !== 'object') return false;
  const s = v as ClozeStore;
  return (
    Array.isArray(s.attempts) &&
    s.attempts.every(
      (a) =>
        !!a && typeof a.on === 'string' && typeof a.correct === 'number' &&
        typeof a.revealed === 'number' && typeof a.total === 'number',
    )
  );
};

const emptyStore: ClozeStore = { attempts: [] };

/** Split a line at the first # that isn't inside a string literal. */
const splitComment = (line: string): { codePart: string; comment: string } => {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote && line[i - 1] !== '\\') quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === '#') {
      return { codePart: line.slice(0, i), comment: line.slice(i) };
    }
  }
  return { codePart: line, comment: '' };
};

/**
 * Pick the blanks. Lines are scored by how load-bearing they are — loop conditions,
 * returns, branch tests, recursion calls and pointer updates are where algorithms
 * actually live; `def` lines and bare `else:` are scaffolding anyone can guess.
 * A seeded sub-1 jitter breaks ties per-question without ever outranking a line
 * whose base score is genuinely higher.
 */
const pickBlanks = (code: string, questionId: string): Blank[] => {
  const lines = code.split('\n');
  const defNames = lines
    .map((l) => /^\s*def\s+([A-Za-z_]\w*)/.exec(l)?.[1])
    .filter((n): n is string => !!n);
  const rng = mulberry32(hashSeed('cloze:' + questionId));

  const candidates: { idx: number; score: number }[] = [];
  lines.forEach((line, idx) => {
    const { codePart } = splitComment(line);
    const t = codePart.trim();
    if (!t || t.startsWith('#')) return;
    if (/^(def|class)\b/.test(t)) return; // signatures are given in interviews too
    if (/^(else\s*:|try\s*:|pass)$/.test(t)) return; // trivially guessable
    if (t.length < 4) return;

    let score = 0;
    if (/\bwhile\b/.test(t)) score += 4;
    if (/\breturn\b/.test(t)) score += 4;
    if (/\b(if|elif)\b/.test(t)) score += 3;
    // A call to a function defined in this snippet, on a non-def line = the recursion.
    if (defNames.some((n) => new RegExp(`\\b${n}\\s*\\(`).test(t))) score += 4;
    if (/[+\-*/]=/.test(t)) score += 3; // pointer / accumulator updates
    if (/=\s*[^=].*[+\-]\s*1\b/.test(t)) score += 3; // the classic off-by-one site
    if (/\bfor\b/.test(t)) score += 2;
    if (/,.*=.*,/.test(t)) score += 2; // tuple swap / multi-assignment
    if (t.includes('=') && !t.includes('==')) score += 1;

    candidates.push({ idx, score: score + rng() * 0.9 });
  });

  // 3–5 blanks: enough retrieval to hurt a little, not so many it becomes
  // "retype the whole solution", which the playground below already offers.
  const target = Math.max(3, Math.min(5, Math.round(candidates.length / 4)));
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(target, candidates.length))
    .sort((a, b) => a.idx - b.idx)
    .map(({ idx }) => {
      const { codePart, comment } = splitComment(lines[idx]);
      return {
        lineIdx: idx,
        answer: codePart.trim(),
        comment: comment.trim(),
        indent: codePart.slice(0, codePart.length - codePart.trimStart().length),
      };
    });
};

// Whitespace-insensitive: `price<min_price` and `price < min_price` are the same
// recall. Everything else — names, operators, the colon — has to come from memory.
const norm = (s: string) => s.replace(/\s+/g, '');

type LineState = 'idle' | 'correct' | 'wrong' | 'revealed';

export const ClozeRecall: React.FC<ClozeRecallProps> = ({ questionId, code }) => {
  const lines = useMemo(() => code.split('\n'), [code]);
  const blanks = useMemo(() => pickBlanks(code, questionId), [code, questionId]);
  const blankByLine = useMemo(() => new Map(blanks.map((b) => [b.lineIdx, b])), [blanks]);

  const [typed, setTyped] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [graded, setGraded] = useState(false);
  const [store, setStore] = useState<ClozeStore>(() =>
    readJson(`cloze-${questionId}`, emptyStore, isClozeStore),
  );

  // The viewer can jump between problems while this stays mounted — stale inputs
  // would then be "answers" to the WRONG question's blanks.
  useEffect(() => {
    setTyped({});
    setRevealed(new Set());
    setChecked(false);
    setGraded(false);
    setStore(readJson(`cloze-${questionId}`, emptyStore, isClozeStore));
  }, [questionId, code]);

  // Everything below derives; hooks above stay unconditional.
  const matches = (b: Blank) => norm(typed[b.lineIdx] ?? '') !== '' && norm(typed[b.lineIdx] ?? '') === norm(b.answer);
  const stateOf = (b: Blank): LineState =>
    revealed.has(b.lineIdx) ? 'revealed' : !checked ? 'idle' : matches(b) ? 'correct' : 'wrong';
  const correctCount = blanks.filter((b) => !revealed.has(b.lineIdx) && matches(b)).length;
  const allPerfect = checked && revealed.size === 0 && correctCount === blanks.length;

  const check = () => {
    setChecked(true);
    const on = todayISO();
    const attempt: ClozeAttempt = {
      on,
      correct: blanks.filter((b) => !revealed.has(b.lineIdx) && matches(b)).length,
      revealed: revealed.size,
      total: blanks.length,
    };
    // Re-checking while fixing lines is one attempt refined, not many attempts —
    // same-day checks overwrite the last entry, the way review regrades correct
    // themselves instead of climbing the ladder twice.
    const past =
      store.attempts.length > 0 && store.attempts[store.attempts.length - 1].on === on
        ? store.attempts.slice(0, -1)
        : store.attempts;
    const next: ClozeStore = { attempts: [...past, attempt].slice(-20) };
    setStore(next);
    writeJson(`cloze-${questionId}`, next);
  };

  const reveal = (b: Blank) => {
    setRevealed((s) => new Set(s).add(b.lineIdx));
    setTyped((t) => ({ ...t, [b.lineIdx]: b.answer }));
  };

  const startOver = () => {
    setTyped({});
    setRevealed(new Set());
    setChecked(false);
    setGraded(false);
  };

  const grade = () => {
    gradeQuestion(questionId, 'easy');
    setGraded(true);
  };

  // Under 2 blanks means the code is nearly all scaffolding — nothing worth drilling,
  // and a one-blank "quiz" would just be annoying.
  if (blanks.length < 2) return null;

  const best = store.attempts.reduce((m, a) => Math.max(m, a.revealed === 0 ? a.correct : 0), 0);

  const borderFor = (st: LineState) =>
    st === 'correct' ? 'hsl(var(--easy))'
    : st === 'wrong' ? 'hsl(var(--hard))'
    : st === 'revealed' ? 'hsl(var(--medium))'
    : 'hsl(var(--border-color))';

  let blankNo = 0;

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <Puzzle size={18} color="hsl(var(--secondary))" />
        <h4 style={{ fontWeight: 700, fontSize: '1rem', flex: 1, minWidth: '160px' }}>
          Fill in the missing lines
        </h4>
        {store.attempts.length > 0 && (
          <span
            style={{
              fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.6rem',
              borderRadius: '999px', background: 'hsl(var(--bg-tertiary))',
              border: '1px solid hsl(var(--border-color))',
              color: 'hsl(var(--text-secondary))',
            }}
          >
            {store.attempts.length} attempt{store.attempts.length === 1 ? '' : 's'} · best {best}/{blanks.length} from memory
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        The scaffolding is free; the {blanks.length} load-bearing lines are yours to supply.
        Spacing doesn't matter — the names, operators and colons do. The comments stay
        visible on purpose: recalling a line from its <em>why</em> is the skill.
      </p>

      <div
        style={{
          background: '#090d16', borderRadius: '10px', padding: '1rem 1.25rem',
          overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
          lineHeight: 1.7, border: '1px solid hsl(var(--border-color))',
        }}
      >
        {/* Rendered line-by-line and mostly unstyled instead of through PythonHighlighter:
            the blanks must sit inline inside the code, and the shared highlighter only
            renders whole blocks. Comments keep their green so the hints read as hints. */}
        {lines.map((line, idx) => {
          const blank = blankByLine.get(idx);
          if (!blank) {
            const isComment = line.trim().startsWith('#');
            return (
              <div
                key={idx}
                style={{
                  whiteSpace: 'pre', minHeight: '1.25rem',
                  color: isComment ? '#10b981' : '#f8fafc',
                  fontStyle: isComment ? 'italic' : undefined,
                }}
              >
                {line || ' '}
              </div>
            );
          }
          blankNo += 1;
          const n = blankNo;
          const st = stateOf(blank);
          const isRevealed = st === 'revealed';
          return (
            <div
              key={idx}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'pre', padding: '0.1rem 0', flexWrap: 'wrap' }}
            >
              <span aria-hidden="true">{blank.indent}</span>
              <input
                type="text"
                value={typed[idx] ?? ''}
                onChange={(e) => setTyped((t) => ({ ...t, [idx]: e.target.value }))}
                readOnly={isRevealed}
                spellCheck={false}
                autoComplete="off"
                aria-label={`Missing line ${n} of ${blanks.length}`}
                placeholder="type this line from memory…"
                style={{
                  width: `${Math.min(Math.max(blank.answer.length + 4, 26), 58)}ch`,
                  maxWidth: '100%',
                  fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                  padding: '0.15rem 0.5rem', borderRadius: '6px', outline: 'none',
                  background: 'hsl(var(--bg-tertiary))',
                  color: isRevealed ? 'hsl(var(--medium))' : '#f8fafc',
                  border: `1px solid ${borderFor(st)}`,
                  transition: 'border-color 0.2s ease',
                }}
              />
              {st === 'correct' && <Check size={13} color="hsl(var(--easy))" aria-label="Correct" />}
              {!isRevealed && (
                <button
                  onClick={() => reveal(blank)}
                  aria-label={`Reveal missing line ${n}`}
                  title="Reveal this line — it won't count as recalled"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'hsl(var(--text-muted))', padding: '0.15rem', display: 'inline-flex',
                  }}
                >
                  <Eye size={13} />
                </button>
              )}
              {blank.comment && (
                <span style={{ color: '#10b981', fontStyle: 'italic', opacity: 0.85, whiteSpace: 'pre-wrap' }}>
                  {blank.comment}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={check}>
          <CheckCircle2 size={16} /> Check my lines
        </button>
        <button className="btn btn-secondary" onClick={startOver}>
          <RotateCcw size={16} /> Start over
        </button>
        {checked && !allPerfect && (
          <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))' }}>
            {correctCount}/{blanks.length} from memory
            {revealed.size > 0 ? `, ${revealed.size} revealed` : ''} — the misses are the
            lines to re-derive, not re-read.
          </span>
        )}
      </div>

      {allPerfect && !graded && (
        <div
          className="animate-pop"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
            padding: '0.75rem 1rem', borderRadius: '10px',
            background: 'hsl(var(--easy) / 0.1)', border: '1px solid hsl(var(--easy))',
          }}
        >
          <span style={{ fontSize: '0.82rem', color: 'hsl(var(--easy))', fontWeight: 600, flex: 1, minWidth: '200px' }}>
            Every line came back out of your head, no peeking. That's what "Got it" means.
          </span>
          <button className="btn btn-secondary" onClick={grade} style={{ color: 'hsl(var(--easy))' }}>
            <Zap size={14} /> Log it — schedule the next review
          </button>
        </div>
      )}
      {graded && (
        <span className="animate-pop" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--easy))' }}>
          Logged as "Got it" — it's on the review ladder now.
        </span>
      )}
    </div>
  );
};
