import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Check, X, Loader2, FlaskConical, Lightbulb, ChevronDown, History, PenLine, ListChecks, Swords, Target, Timer, TimerOff, CheckSquare, Terminal } from 'lucide-react';
import { runPython, onPyodideProgress, isPyodideReady } from '../utils/pythonRunner';
import { readText, writeText, readJson, writeJson, readStringArray, STORAGE_KEYS } from '../utils/persistence';
import { dsaQuestions } from '../data/dsaQuestions';
import { gradeQuestion } from '../utils/review';
import { LineNudges } from './LineNudges';
import { CustomInput } from './CustomInput';
import { SolutionDiff } from './SolutionDiff';
import { CodeEditor, EditorFontControl } from './CodeEditor';
import { PythonHighlighter } from './PythonHighlighter';
import { ResizeHandle, useSplitRatio } from './ResizeHandle';

/** Editor over console, the ratio every online judge opens with. */
const DEFAULT_ROW_SPLIT = 0.62;

/** One kept attempt, so the learner can see how their solution evolved.
 *  Exported so SubmissionsTab.tsx (ProblemViewer's split-pane left column) can read
 *  the same `snap-<questionId>` list read-only — same data, no shared state. */
export interface Snapshot {
  on: number;
  code: string;
  /**
   * True for a run that passed the shipped tests, false for the working copy
   * `startResolve()` stashes here before wiping the editor. Optional because every
   * entry written before this field existed has no flag: those are read as passing,
   * which is what the two screens showing them already claimed — a stored history
   * must keep rendering, so the missing field is tolerated, never dropped.
   */
  passed?: boolean;
}

export const isSnapshotList = (v: unknown): v is Snapshot[] =>
  Array.isArray(v) &&
  v.every(s => !!s && typeof s === 'object' && typeof (s as Snapshot).on === 'number' && typeof (s as Snapshot).code === 'string');

/** "3m ago" beats a timestamp here: the question is "which attempt", not "when exactly". */
export const relTime = (ts: number): string => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

/**
 * Handle a Tab press inside `el`, in place. Exported because BugHunt's editor owes the
 * learner the same manners — one implementation, so the two can never drift again.
 *
 * Two things this must get right, both of which the old inline version got wrong:
 *  - A non-empty selection means "shift these lines right", NOT "replace them". The
 *    previous `code.slice(0, s) + '    ' + code.slice(en)` deleted every selected line.
 *  - The edit goes through setRangeText so the browser records it on the textarea's own
 *    undo stack (same reason CodeEditor.applyEdit exists); assigning a whole new value
 *    through React wipes Cmd/Ctrl+Z, which is what made the deletion unrecoverable.
 * The caller persists `el.value` afterwards.
 */
export const indentSelection = (el: HTMLTextAreaElement, s: number, en: number): void => {
  if (s === en) {
    el.setRangeText('    ', s, s, 'end');
    return;
  }
  const text = el.value;
  const from = text.lastIndexOf('\n', s - 1) + 1;
  // A selection ending exactly at a line start (what Shift+Down leaves) does not reach
  // into that line, so it must not be indented with the rest.
  const tailFrom = text[en - 1] === '\n' ? en - 1 : en;
  const nl = text.indexOf('\n', tailFrom);
  const to = nl === -1 ? text.length : nl;
  const indented = text
    .slice(from, to)
    .split('\n')
    .map(line => (line === '' ? line : '    ' + line)) // a blank line gains no trailing space
    .join('\n');
  el.setRangeText(indented, from, to, 'preserve');
  // Keep the same lines selected: Tab again goes one level deeper, as in any editor.
  el.setSelectionRange(from, from + indented.length);
};

/** The seven loop shapes interviews are built from, insertable at the caret's current
 *  indentation — recalling the shape is the learner's job; retyping it is not. */
const SNIPPETS: { label: string; code: string }[] = [
  {
    label: 'BFS queue loop',
    code: 'from collections import deque\n\nqueue = deque([start])\nvisited = {start}\nwhile queue:\n    node = queue.popleft()\n    for nxt in graph[node]:\n        if nxt not in visited:\n            visited.add(nxt)\n            queue.append(nxt)',
  },
  {
    label: 'DFS recursion',
    code: 'def dfs(node, visited):\n    if node in visited:\n        return\n    visited.add(node)\n    for nxt in graph[node]:\n        dfs(nxt, visited)',
  },
  {
    label: 'Binary search',
    code: 'lo, hi = 0, len(arr) - 1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if arr[mid] == target:\n        return mid\n    if arr[mid] < target:\n        lo = mid + 1\n    else:\n        hi = mid - 1\nreturn -1',
  },
  {
    label: 'Two pointers',
    code: 'left, right = 0, len(arr) - 1\nwhile left < right:\n    if arr[left] + arr[right] == target:\n        return left, right\n    if arr[left] + arr[right] < target:\n        left += 1\n    else:\n        right -= 1',
  },
  {
    label: 'Sliding window',
    code: 'left = 0\nbest = 0\nfor right in range(len(arr)):\n    # extend with arr[right], then shrink while the window is invalid\n    while window_invalid():\n        left += 1\n    best = max(best, right - left + 1)',
  },
  {
    label: 'Backtracking template',
    code: 'def backtrack(path, choices):\n    if is_complete(path):\n        results.append(path[:])\n        return\n    for choice in choices:\n        path.append(choice)\n        backtrack(path, next_choices(choices, choice))\n        path.pop()',
  },
  {
    label: 'Memo decorator',
    code: 'from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef solve(state):\n    ...',
  },
];

/* ---- TestWriter (write the tests before seeing any) --------------------------------- */

/** One learner-written assert line and how it fared against the reference. */
interface MyAssertVerdict {
  src: string;
  ok: boolean;
  detail?: string;
}

interface MyTestReport {
  results: MyAssertVerdict[];
  /** Set when the batch itself died (a setup line raised) — distinct from a FAIL. */
  error?: string;
}

/** Can this single line stand alone as a statement (no bracket or string spilling
 *  onto the next line)? Only such lines can be wrapped in their own try/except. */
const isBalancedLine = (s: string): boolean => {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
  }
  return depth === 0 && quote === null;
};

/**
 * Rewrite the learner's test text so every top-level single-line `assert` reports its
 * own verdict on stdout instead of aborting the batch at the first miss — "3 of your
 * 5 asserts hold" teaches; a lone AssertionError does not. Setup lines and any
 * multi-line construct pass through verbatim, in their original order (an unbalanced
 * assert simply is not individually tracked — it still runs). The @@MYTEST marker is
 * deliberately weird so an accidental learner print cannot collide with it.
 */
const buildAssertHarness = (testText: string): { harness: string; asserts: string[] } => {
  const asserts: string[] = [];
  const out: string[] = [];
  testText.split('\n').forEach(line => {
    if (/^assert\b/.test(line) && isBalancedLine(line)) {
      const idx = asserts.length;
      asserts.push(line.trim());
      out.push('try:');
      out.push('    ' + line.trim());
      out.push(`    print("@@MYTEST ${idx} PASS")`);
      out.push('except AssertionError:');
      out.push(`    print("@@MYTEST ${idx} FAIL")`);
      out.push('except Exception as __e:');
      out.push(`    print("@@MYTEST ${idx} ERROR " + type(__e).__name__ + ": " + str(__e).split("\\n")[0])`);
    } else {
      out.push(line);
    }
  });
  return { harness: out.join('\n'), asserts };
};

/* ---- Mutation gauntlet (can your tests catch bugs?) --------------------------------- */

interface Mutant {
  label: string;
  code: string;
  /** 1-indexed line the single token changed on, plus that line before/after. */
  line: number;
  before: string;
  after: string;
}

interface GauntletRow {
  mutant: Mutant;
  caught: boolean;
}

/**
 * Rewrite the FIRST line whose comment-free text matches `re`, replacing only the
 * matched slice. First-site-only keeps every mutant a single-token change, and makes
 * the gauntlet deterministic: re-running shows the same mutants, so an escapee is a
 * stable target to write the missing assert against.
 */
const mutateFirst = (
  src: string,
  re: RegExp,
  rewrite: (m: RegExpExecArray) => string,
): { code: string; line: number } | null => {
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const codePart = lines[i].split('#')[0]; // never mutate a comment — that tests nothing
    const m = re.exec(codePart);
    if (!m) continue;
    const rebuilt =
      codePart.slice(0, m.index) + rewrite(m) + codePart.slice(m.index + m[0].length) + lines[i].slice(codePart.length);
    const next = [...lines];
    next[i] = rebuilt;
    return { code: next.join('\n'), line: i + 1 };
  }
  return null;
};

/** The four classic single-token bug families, each applied at its first site — or at
 *  its mirror image when the primary token is absent, skipped entirely when neither
 *  exists (a mutation that changes nothing would be a rigged win). */
const buildMutants = (src: string): Mutant[] => {
  const out: Mutant[] = [];
  const add = (hit: { code: string; line: number } | null, label: string) => {
    if (!hit || hit.code === src) return;
    out.push({
      label,
      code: hit.code,
      line: hit.line,
      before: src.split('\n')[hit.line - 1],
      after: hit.code.split('\n')[hit.line - 1],
    });
  };
  const le = mutateFirst(src, /<=/, () => '<');
  if (le) add(le, '<= tightened to <');
  else add(mutateFirst(src, /<(?![=<])/, () => '<='), '< loosened to <=');
  const plus = mutateFirst(src, / \+ /, () => ' - ');
  if (plus) add(plus, '+ flipped to -');
  else add(mutateFirst(src, / - /, () => ' + '), '- flipped to +');
  const bool = mutateFirst(src, /\band\b/, () => 'or');
  if (bool) add(bool, 'and flipped to or');
  else add(mutateFirst(src, /\bor\b/, () => 'and'), 'or flipped to and');
  // Init constants only: the [^=!<>]= guard keeps ==, !=, <=, >= comparisons out, and
  // the $ anchor keeps literals buried mid-expression out.
  const init = mutateFirst(src, /^(\s*[^#]*?[^=!<>]=\s*)0(\s*)$/, m => `${m[1]}1${m[2]}`);
  if (init) add(init, 'init 0 became 1');
  else add(mutateFirst(src, /^(\s*[^#]*?[^=!<>]=\s*)1(\s*)$/, m => `${m[1]}0${m[2]}`), 'init 1 became 0');
  return out;
};

/* ---- Timed re-solve ----------------------------------------------------------------- */

/** 15 minutes — a real interview slot for one problem, not a flash-card sprint. */
const RESOLVE_MS = 15 * 60 * 1000;

interface ResolveEntry {
  id: string;
  on: number;
  ms: number;
}

const isResolveLog = (v: unknown): v is ResolveEntry[] =>
  Array.isArray(v) &&
  v.every(
    e =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as ResolveEntry).id === 'string' &&
      typeof (e as ResolveEntry).on === 'number' &&
      typeof (e as ResolveEntry).ms === 'number',
  );

/** 14:59-style clock — the learner watches this tick, so no hours and no units. */
const fmtClock = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Chrome shared by the two toolbar dropdowns. */
const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  zIndex: 10,
  minWidth: '210px',
  padding: '0.3rem',
  borderRadius: '10px',
  background: 'hsl(var(--bg-secondary))',
  border: '1px solid hsl(var(--border-color))',
  boxShadow: '0 12px 32px hsl(0 0% 0% / 0.35)',
};

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '0.45rem 0.6rem',
  fontSize: '0.75rem',
  borderRadius: '6px',
  background: 'transparent',
  border: 'none',
  color: 'hsl(var(--text-primary))',
  cursor: 'pointer',
};

interface PythonPlaygroundProps {
  questionId: string;
  /** The verified solution, used for the starter stub and the "show me" escape hatch. */
  solutionCode: string;
  /** Assertions the attempt is graded against. Absent means run-only, no grading. */
  tests?: string;
}

/**
 * Reading a finished solution feels like learning and mostly is not — you recognise the
 * shape without being able to produce it. This panel makes the reader write the thing and
 * then tells them, honestly, whether it works: the same assertions that gate the content
 * offline are run against their attempt here.
 */
export const PythonPlayground: React.FC<PythonPlaygroundProps> = ({
  questionId,
  solutionCode,
  tests,
}) => {
  const storageKey = `attempt-${questionId}`;

  /** Signature + docstring only. Handing over the body would defeat the point. */
  const starter = React.useMemo(() => {
    const lines = solutionCode.split('\n');
    const defIdx = lines.findIndex(l => l.trimStart().startsWith('def '));
    if (defIdx === -1) return '# Write your solution here\n';
    const header = lines.slice(0, defIdx + 1).filter(l => l.trim().startsWith('class ') || l.trim().startsWith('def ') || l.trim() === '');
    const signature = lines[defIdx];
    const prefix = header.length > 1 ? lines.slice(0, defIdx).join('\n') + '\n' : '';
    // Indent relative to the def itself: a method's def sits at 4, so its body needs 8.
    const bodyIndent = (signature.match(/^\s*/)?.[0] ?? '') + '    ';
    return `${prefix}${signature}\n${bodyIndent}# Your turn. The tests below run against this function.\n${bodyIndent}pass\n`;
  }, [solutionCode]);

  const [code, setCode] = useState<string>(() => readText(storageKey) || starter);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof runPython>> | null>(null);
  const [revealed, setRevealed] = useState(false);
  // Snapshot history of green runs, plus the preview pane and the two toolbar menus.
  const [snaps, setSnaps] = useState<Snapshot[]>(() => readJson<Snapshot[]>(`snap-${questionId}`, [], isSnapshotList));
  const [previewSnap, setPreviewSnap] = useState<Snapshot | null>(null);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // TestWriter: the learner's own asserts, run against the REFERENCE — never the attempt.
  const funcName = React.useMemo(() => /def\s+(\w+)\s*\(/.exec(solutionCode)?.[1] ?? 'solve', [solutionCode]);
  const myTestSeed = `# One assert per line, run against the reference solution — e.g.\n# assert ${funcName}(...) == ...\n`;
  const [testWriterOn, setTestWriterOn] = useState(false);
  const [myTests, setMyTests] = useState<string>(() => readText(`mytests-${questionId}`) || myTestSeed);
  const [myTestRun, setMyTestRun] = useState<MyTestReport | null>(null);
  const [checkingMine, setCheckingMine] = useState(false);
  const [shippedShown, setShippedShown] = useState(false);
  // Mutation gauntlet: null = not run yet, [] = nothing mutable in the reference.
  const [gauntlet, setGauntlet] = useState<GauntletRow[] | null>(null);
  const [gauntletRunning, setGauntletRunning] = useState(false);
  // Brute-recall slot: its own editor, graded by the same tests.
  const [bruteOpen, setBruteOpen] = useState(false);
  const [bruteCode, setBruteCode] = useState<string>(() => readText(`attempt-brute-${questionId}`) || starter);
  const [bruteResult, setBruteResult] = useState<Awaited<ReturnType<typeof runPython>> | null>(null);
  const [bruteRunning, setBruteRunning] = useState(false);
  const [bruteRevealed, setBruteRevealed] = useState(false);
  // Timed re-solve. The deadline lives in BOTH state (drives the render) and a ref
  // (read after awaits in execute(), where the state closure may be a run stale).
  const [deadline, setDeadline] = useState<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(RESOLVE_MS);
  const [expired, setExpired] = useState(false);
  const [stash, setStash] = useState<string | null>(null);
  const [resolveDone, setResolveDone] = useState<number | null>(null);
  const [gradedAs, setGradedAs] = useState<'easy' | 'shaky' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Has the caret ever actually been inside the editor? See insertSnippet.
  const caretSeen = useRef(false);
  // The two dropdown triggers: Escape has to hand focus back to the button it came from.
  const snippetsBtnRef = useRef<HTMLButtonElement>(null);
  const historyBtnRef = useRef<HTMLButtonElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const rowSplit = useSplitRatio(STORAGE_KEYS.codeSplitRatio, DEFAULT_ROW_SPLIT);
  // Guards a slow run finishing after the user has opened a different question —
  // without it, the old question's verdict lands on the new one.
  const liveQuestion = useRef(questionId);

  // Switching question swaps the whole panel's state.
  useEffect(() => {
    liveQuestion.current = questionId;
    setCode(readText(storageKey) || starter);
    setResult(null);
    setRevealed(false);
    setRunning(false);
    setStatus('');
    setSnaps(readJson<Snapshot[]>(`snap-${questionId}`, [], isSnapshotList));
    setPreviewSnap(null);
    setSnippetsOpen(false);
    setHistoryOpen(false);
    // The wave-5 panels are all per-question — swap them wholesale too, countdown
    // included: a timer surviving a question switch would grade the wrong memory.
    setTestWriterOn(false);
    setMyTests(readText(`mytests-${questionId}`) || myTestSeed);
    setMyTestRun(null);
    setCheckingMine(false);
    setShippedShown(false);
    setGauntlet(null);
    setGauntletRunning(false);
    setBruteOpen(false);
    setBruteCode(readText(`attempt-brute-${questionId}`) || starter);
    setBruteResult(null);
    setBruteRunning(false);
    setBruteRevealed(false);
    deadlineRef.current = null;
    setDeadline(null);
    setRemainingMs(RESOLVE_MS);
    setExpired(false);
    setStash(null);
    setResolveDone(null);
    setGradedAs(null);
    // A new question reloads the editor's contents, so any caret position the learner
    // had picked belongs to the previous one.
    caretSeen.current = false;
  }, [questionId, starter, storageKey, myTestSeed]);

  // The textarea is the same DOM node for this panel's whole life, so one listener
  // covers every question: the first focus is the moment its caret becomes real.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const mark = () => { caretSeen.current = true; };
    el.addEventListener('focus', mark);
    return () => el.removeEventListener('focus', mark);
  }, []);

  useEffect(() => {
    onPyodideProgress(msg => setStatus(msg));
  }, []);

  const persist = (next: string) => {
    setCode(next);
    writeText(storageKey, next);
  };

  /** Drop a snippet at the caret, re-indented to the caret's current depth. */
  const insertSnippet = (snippet: string) => {
    const el = textareaRef.current;
    // A textarea that has never been focused reports selectionStart/End as 0, which is
    // indistinguishable from a deliberate caret at the top of the file — so trust the
    // caret only once it has genuinely been in there. (activeElement cannot answer this:
    // clicking the Snippets button moved focus off the editor a moment ago.) Without
    // this the snippet is spliced in front of the starter stub, mangling both.
    const hasCaret = !!el && caretSeen.current;
    const pos = hasCaret ? el.selectionStart : code.length;
    const end = hasCaret ? el.selectionEnd : code.length;
    const lineStart = code.lastIndexOf('\n', pos - 1) + 1;
    // Indentation of the line the caret sits on — the inserted block joins that block.
    const indent = /^\s*/.exec(code.slice(lineStart, pos))?.[0] ?? '';
    const body = snippet
      .split('\n')
      .map((l, i) => (i === 0 || l === '' ? l : indent + l))
      .join('\n');
    // A snippet is a block of statements, so it always starts its own line and never
    // leaves the following line glued to its tail, wherever the caret happened to be.
    const lead = pos > 0 && code[pos - 1] !== '\n' ? '\n' + indent : '';
    const tail = end < code.length && code[end] !== '\n' ? '\n' : '';
    const insert = lead + body + tail;
    const after = pos + lead.length + body.length;
    if (el) {
      // setRangeText, not a whole-value rewrite: keeps the browser's undo stack, so a
      // snippet dropped in the wrong place is one Cmd/Ctrl+Z away from gone.
      el.focus();
      el.setRangeText(insert, pos, end, 'preserve');
      el.setSelectionRange(after, after);
      persist(el.value);
    } else {
      persist(code.slice(0, pos) + insert + code.slice(end));
    }
  };

  /* ---- Feature 9: TestWriter ---------------------------------------------------- */

  const persistMyTests = (next: string) => {
    setMyTests(next);
    writeText(`mytests-${questionId}`, next);
    // Edited asserts invalidate both reports — an old verdict describing text that
    // no longer exists would be quietly dishonest.
    setMyTestRun(null);
    setGauntlet(null);
  };

  const runMyTests = async () => {
    setCheckingMine(true);
    setMyTestRun(null);
    if (!isPyodideReady()) setStatus('Downloading Python (about 10 MB, one time)…');
    const ranFor = questionId;
    const { harness, asserts } = buildAssertHarness(myTests);
    // The REFERENCE solution runs here, never the learner's attempt: TestWriter checks
    // their model of the problem's contract, not their code.
    const res = await runPython(solutionCode, harness);
    if (liveQuestion.current !== ranFor) return;
    setStatus('');
    setCheckingMine(false);
    if (asserts.length === 0) {
      setMyTestRun({ results: [], error: 'No assert lines found — write top-level lines starting with `assert`.' });
      return;
    }
    const verdicts = new Map<number, { ok: boolean; detail?: string }>();
    for (const m of res.stdout.matchAll(/@@MYTEST (\d+) (PASS|FAIL|ERROR[^\n]*)/g)) {
      const idx = Number(m[1]);
      if (m[2] === 'PASS') verdicts.set(idx, { ok: true });
      else if (m[2] === 'FAIL') verdicts.set(idx, { ok: false, detail: 'the reference disagrees' });
      else verdicts.set(idx, { ok: false, detail: m[2].slice('ERROR '.length) || 'raised before comparing' });
    }
    const results = asserts.map((src, i) => {
      const v = verdicts.get(i);
      return v ? { src, ...v } : { src, ok: false, detail: 'never ran — an earlier line raised' };
    });
    setMyTestRun({
      results,
      error: res.error ? res.error : res.passed === false ? res.failedAssertion : undefined,
    });
  };

  // The gauntlet only means anything once every assert holds against the reference —
  // mutants are judged BY those asserts, so a broken suite would judge nothing.
  const allMineHold =
    !!myTestRun && !myTestRun.error && myTestRun.results.length > 0 && myTestRun.results.every(r => r.ok);

  /* ---- Feature 10: mutation gauntlet --------------------------------------------- */

  const runGauntlet = async () => {
    setGauntletRunning(true);
    const mutants = buildMutants(solutionCode);
    const ranFor = questionId;
    const rows: GauntletRow[] = [];
    // Sequential on purpose: Pyodide is one interpreter, and a few quick runs behind
    // one spinner beat fake parallelism that serialises underneath anyway.
    for (const mutant of mutants) {
      const res = await runPython(mutant.code, myTests);
      if (liveQuestion.current !== ranFor) return;
      // "Caught" = the learner's asserts (or the mutant crashing outright) rejected it.
      rows.push({ mutant, caught: res.passed === false || !!res.error });
    }
    setGauntlet(rows);
    setGauntletRunning(false);
  };

  /* ---- Feature 11: brute-recall --------------------------------------------------- */

  // "Solved" for the re-solve/brute offers: a green run this session, a passing
  // snapshot from an earlier one, or the sheet's own solved tick — any counts.
  const solvedMarked = React.useMemo(
    () => readStringArray(STORAGE_KEYS.solvedDsaIds).includes(questionId),
    [questionId],
  );
  const solved = result?.passed === true || snaps.length > 0 || solvedMarked;

  // The OTHER approach, looked up from the catalogue by id instead of threading a new
  // prop through ProblemViewer — same data, zero shared-file edits.
  const bruteInfo = React.useMemo(() => {
    const q = dsaQuestions.find(entry => entry.id === questionId);
    if (!q || q.approaches.length < 2) return null; // one approach = nothing to recall
    return q.approaches.find(a => a.name !== 'Optimal' && a.code !== solutionCode) ?? null;
  }, [questionId, solutionCode]);

  const persistBrute = (next: string) => {
    setBruteCode(next);
    writeText(`attempt-brute-${questionId}`, next);
  };

  const executeBrute = async () => {
    setBruteRunning(true);
    setBruteResult(null);
    if (!isPyodideReady()) setStatus('Downloading Python (about 10 MB, one time)…');
    const ranFor = questionId;
    const res = await runPython(bruteCode, tests);
    if (liveQuestion.current !== ranFor) return;
    setStatus('');
    setBruteResult(res);
    setBruteRunning(false);
  };

  /* ---- Feature 12: timed re-solve ------------------------------------------------- */

  // The countdown. One interval per active deadline; expiry, abandon and unmount all
  // funnel through the same cleanup, so no interval can outlive its chip.
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const left = deadline - Date.now();
      if (left <= 0) {
        deadlineRef.current = null;
        setDeadline(null);
        setExpired(true);
      } else {
        setRemainingMs(left);
      }
    };
    tick();
    const iv = window.setInterval(tick, 1000);
    return () => window.clearInterval(iv);
  }, [deadline]);

  /** Wipe back to the starter and beat the clock. The current code is stashed into
   *  the snapshot history first, so "re-solve" can never cost work. */
  const startResolve = () => {
    if (code !== starter && code.trim() !== '') {
      const key = `snap-${questionId}`;
      const prev = readJson<Snapshot[]>(key, [], isSnapshotList);
      if (!prev.some(s => s.code === code)) {
        // passed:false — this is whatever was in the editor, verified by nothing. The
        // history and the Submissions tab both label rows from this list, so the flag
        // is what stops unrun code being presented as an accepted run.
        const stashed: Snapshot[] = [{ on: Date.now(), code, passed: false }, ...prev];
        if (stashed.length > 10) {
          // Over the cap, the oldest STASH is dropped before any passing run — an
          // unverified stash must never evict a green one. Index 0 is the stash being
          // added, so it is only sacrificed when the list holds nothing else to drop.
          const oldestStash = stashed.map(s => s.passed === false).lastIndexOf(true);
          stashed.splice(oldestStash > 0 ? oldestStash : stashed.length - 1, 1);
        }
        writeJson(key, stashed);
        setSnaps(stashed);
      }
      setStash(code);
    }
    persist(starter);
    setResult(null);
    setRevealed(false); // a worked solution left open would make the timer a lie
    setExpired(false);
    setResolveDone(null);
    setGradedAs(null);
    setRemainingMs(RESOLVE_MS);
    deadlineRef.current = Date.now() + RESOLVE_MS;
    setDeadline(deadlineRef.current);
  };

  const abandonResolve = () => {
    deadlineRef.current = null;
    setDeadline(null);
    setExpired(false);
    // The stash stays in the snapshot history — abandoning must not cost work either.
  };

  const execute = async (withTests: boolean) => {
    setRunning(true);
    setResult(null);
    if (!isPyodideReady()) setStatus('Downloading Python (about 10 MB, one time)…');
    const ranFor = questionId;
    const res = await runPython(code, withTests ? tests : undefined);
    if (liveQuestion.current !== ranFor) return; // question changed mid-run; verdict is stale
    // A FAILED graded run is the signal the error journal and the calibration
    // scorer are built on: without it the journal is permanently empty and
    // calibration only ever sees successes, scoring a fail-then-pass as a pass.
    // (This dispatch was lost once already, when a wholesale file delivery
    // overwrote the edit that added it — hence the belt-and-braces comment.)
    if (res.passed === false) {
      window.dispatchEvent(
        new CustomEvent('dsa:tests-failed', {
          detail: { questionId: ranFor, failedAssertion: res.failedAssertion },
        }),
      );
    }
    // A green graded run is the moment worth explaining — ExplainBack (the Feynman
    // box on this page) listens instead of having pass-state drilled through props.
    if (res.passed === true) {
      window.dispatchEvent(new CustomEvent('dsa:tests-passed', { detail: { questionId: ranFor } }));
      // Keep the passing code. Newest first, identical code deduped (re-running an
      // unchanged solution is not a new attempt), capped at 10 — a history, not an
      // archive.
      const key = `snap-${ranFor}`;
      const prev = readJson<Snapshot[]>(key, [], isSnapshotList);
      if (!prev.some(s => s.code === code)) {
        const nextSnaps: Snapshot[] = [{ on: Date.now(), code, passed: true }, ...prev].slice(0, 10);
        writeJson(key, nextSnaps);
        setSnaps(nextSnaps); // safe: the stale-run guard above already returned
      }
      // Timed re-solve: a green graded run while the countdown lives is the win.
      // Read through the ref, not the state closure — the tick may have expired the
      // timer while this run was awaiting, and a late pass must not count.
      if (deadlineRef.current !== null) {
        const msTaken = RESOLVE_MS - Math.max(0, deadlineRef.current - Date.now());
        deadlineRef.current = null;
        setDeadline(null);
        setResolveDone(msTaken);
        const log = readJson<ResolveEntry[]>('resolve-log', [], isResolveLog);
        writeJson('resolve-log', [...log, { id: ranFor, on: Date.now(), ms: msTaken }].slice(-200));
      }
    }
    setResult(res);
    setStatus('');
    setRunning(false);
  };

  /** Tab should indent, not jump focus — this is a code editor. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      // Shift+Tab must keep moving focus OUT — capturing it too would be a keyboard trap.
      if (e.shiftKey) return;
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = el;
      indentSelection(el, s, en);
      persist(el.value);
    }
    // Cmd/Ctrl+Enter runs, the convention every online judge uses.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!running) execute(!!tests);
    }
  };

  const passed = result?.passed;
  const banner =
    passed === true
      ? { bg: 'hsl(var(--easy) / 0.12)', border: 'hsl(var(--easy))', icon: <Check size={16} />, text: 'All tests passed — that solution is correct.' }
      : passed === false
        ? { bg: 'hsl(var(--hard) / 0.12)', border: 'hsl(var(--hard))', icon: <X size={16} />, text: 'A test failed. The assertion that broke is below.' }
        : null;

  return (
    // No card chrome of its own (no .glass, no border, no radius) — this is now
    // the SOLE content of ProblemViewer's right .viewer-pane (that pane already
    // owns the border/radius/background), so its own copy was a visibly
    // redundant card-inside-a-card. height:100% (not just flex) because the two panes
    // below divide a definite height between them — .pane-body supplies one, and an
    // auto-height root would leave the split with nothing to divide.
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div
        className="pp-split"
        ref={splitRef}
        style={{ ['--pp-split' as string]: rowSplit.ratio }}
      >
      {/* Code panel (LeetCode-style split, top-right): header, editor toolbar
          (including the TestWriter toggle — its panel stays here too, since it acts
          on the code workspace, not on a run's result), the editor itself, and the
          worked-solution / timer banners. pp-test-pane below is the Testcase/Result
          half; the brute-force recall section further down is neither and sits
          outside both panes. */}
      <div className="pp-code-pane">
      <div
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid hsl(var(--border-color))',
          background: 'hsl(var(--bg-secondary) / 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <FlaskConical size={18} color="hsl(var(--secondary))" />
        <div style={{ flex: 1, minWidth: '180px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Write it yourself</h3>
          <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
            {tests
              ? 'Runs in your browser and is checked against the real test cases.'
              : 'Runs in your browser. No test cases for this one — check the output yourself.'}
          </p>
        </div>

        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
          onClick={() => {
            if (code !== starter && !window.confirm('Throw away your attempt and restore the starter code?')) return;
            persist(starter); setResult(null);
          }} disabled={running}>
          <RotateCcw size={13} /><span>Reset</span>
        </button>
        <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
          onClick={() => execute(!!tests)} disabled={running}>
          {running ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
          <span>{running ? 'Running…' : tests ? 'Run & check' : 'Run'}</span>
        </button>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Editor toolbar: snippet palette, passing-run history, font stepper. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            style={{ position: 'relative' }}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSnippetsOpen(false); }}
            // Escape unmounts whichever menu item has focus, so the focus has to be put
            // back on the trigger by hand or it falls to <body> and Tab restarts at the
            // top of the document.
            onKeyDown={e => { if (e.key === 'Escape') { setSnippetsOpen(false); snippetsBtnRef.current?.focus(); } }}
          >
            <button
              ref={snippetsBtnRef}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
              aria-haspopup="menu"
              aria-expanded={snippetsOpen}
              onClick={() => { setSnippetsOpen(o => !o); setHistoryOpen(false); }}
            >
              <span>Snippets</span>
              <ChevronDown size={12} />
            </button>
            {snippetsOpen && (
              <div role="menu" className="animate-pop" style={menuStyle}>
                {SNIPPETS.map(s => (
                  <button
                    key={s.label}
                    role="menuitem"
                    className="code-menu-item"
                    style={menuItemStyle}
                    onClick={() => { insertSnippet(s.code); setSnippetsOpen(false); }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            style={{ position: 'relative' }}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHistoryOpen(false); }}
            onKeyDown={e => { if (e.key === 'Escape') { setHistoryOpen(false); historyBtnRef.current?.focus(); } }}
          >
            <button
              ref={historyBtnRef}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
              aria-haspopup="menu"
              aria-expanded={historyOpen}
              disabled={snaps.length === 0}
              title={snaps.length === 0 ? 'Pass the tests once to start a history' : undefined}
              onClick={() => { setHistoryOpen(o => !o); setSnippetsOpen(false); }}
            >
              <History size={12} />
              <span>History ({snaps.length})</span>
              <ChevronDown size={12} />
            </button>
            {historyOpen && (
              <div role="menu" className="animate-pop" style={menuStyle}>
                {snaps.map(s => (
                  <button
                    key={s.on}
                    role="menuitem"
                    className="code-menu-item"
                    style={menuItemStyle}
                    // Same reason as the Escape handler above: picking an item unmounts
                    // it, and the trigger is the only sensible place for the focus to land.
                    onClick={() => { setPreviewSnap(s); setHistoryOpen(false); historyBtnRef.current?.focus(); }}
                  >
                    <span style={{ fontWeight: 600 }}>{relTime(s.on)}</span>
                    <span style={{ color: 'hsl(var(--text-muted))', marginLeft: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
                      {s.code.split('\n').length} lines{s.passed === false ? ' · stashed' : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Feature 9 toggle: writing tests BEFORE seeing any is its own interview
              skill — "how would you test this?" is a standard follow-up. */}
          <button
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', ...(testWriterOn ? { borderColor: 'hsl(var(--secondary))', color: 'hsl(var(--secondary))' } : {}) }}
            aria-pressed={testWriterOn}
            onClick={() => setTestWriterOn(o => !o)}
          >
            <PenLine size={12} />
            <span>TestWriter</span>
          </button>

          {tests && solved && deadline === null && (
            <button
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
              title="Wipes the editor back to the starter (your code is stashed to History first) and starts a 15-minute clock"
              onClick={startResolve}
            >
              <Timer size={12} />
              <span>Re-solve in 15:00</span>
            </button>
          )}

          {deadline !== null && (
            <span
              role="timer"
              aria-label={`Timed re-solve, ${fmtClock(remainingMs)} remaining`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.2rem 0.3rem 0.2rem 0.6rem', borderRadius: '999px',
                fontSize: '0.74rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                // The last minute turns hard-red — colour, not motion, so the urgency
                // carries unchanged under prefers-reduced-motion.
                background: `hsl(var(--${remainingMs < 60_000 ? 'hard' : 'medium'}) / 0.12)`,
                border: `1px solid hsl(var(--${remainingMs < 60_000 ? 'hard' : 'medium'}))`,
                color: `hsl(var(--${remainingMs < 60_000 ? 'hard' : 'medium'}))`,
              }}
            >
              <Timer size={12} />
              {fmtClock(remainingMs)}
              <button
                className="btn btn-secondary"
                style={{ padding: '0.15rem 0.35rem', fontSize: '0.66rem' }}
                aria-label="Abandon the timed re-solve"
                onClick={abandonResolve}
              >
                <X size={11} />
              </button>
            </span>
          )}

          <div style={{ marginLeft: 'auto' }}>
            <EditorFontControl />
          </div>
        </div>

        {testWriterOn && (
          <div
            className="animate-in"
            style={{
              borderRadius: '10px',
              border: '1px solid hsl(var(--secondary) / 0.45)',
              background: 'hsl(var(--secondary) / 0.05)',
              padding: '0.85rem 1rem',
              display: 'flex', flexDirection: 'column', gap: '0.6rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <PenLine size={14} color="hsl(var(--secondary))" />
              <strong style={{ fontSize: '0.85rem' }}>Write the tests first</strong>
              <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                one top-level <code>assert</code> per line
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
              These run against the <strong>reference solution</strong>, never your attempt: an
              assert that fails here means your expectation disagrees with the problem — worth
              discovering before you code to it. Cover the happy path, an edge, and a boundary.
            </p>
            <CodeEditor
              value={myTests}
              onChange={persistMyTests}
              rows={Math.min(12, Math.max(5, myTests.split('\n').length + 1))}
              ariaLabel="Your test assertions, run against the reference solution"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.74rem' }}
                onClick={runMyTests}
                disabled={checkingMine}
              >
                {checkingMine ? <Loader2 size={12} className="spin" /> : <Play size={12} />}
                <span>{checkingMine ? 'Checking…' : 'Check my asserts vs the reference'}</span>
              </button>
              {myTestRun && tests && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.74rem' }}
                  onClick={() => setShippedShown(s => !s)}
                >
                  <ListChecks size={12} />
                  <span>{shippedShown ? 'Hide the shipped tests' : 'Compare with the shipped tests'}</span>
                </button>
              )}
            </div>

            {myTestRun && myTestRun.results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {myTestRun.results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {r.ok
                      ? <Check size={13} color="hsl(var(--easy))" style={{ flexShrink: 0, marginTop: '2px' }} />
                      : <X size={13} color="hsl(var(--hard))" style={{ flexShrink: 0, marginTop: '2px' }} />}
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'hsl(var(--text-secondary))', flex: 1, minWidth: '200px' }}>
                      {r.src}
                    </code>
                    {!r.ok && r.detail && (
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--hard))' }}>{r.detail}</span>
                    )}
                  </div>
                ))}
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: allMineHold ? 'hsl(var(--easy))' : 'hsl(var(--medium))' }}>
                  {myTestRun.results.filter(r => r.ok).length} of {myTestRun.results.length} hold against the reference.
                  {!allMineHold && ' A miss here is not the solution being wrong — the assert expects something the problem never promised. Re-read the statement.'}
                </span>
              </div>
            )}
            {myTestRun?.error && (
              <pre style={{ margin: 0, padding: '0.7rem 0.9rem', borderRadius: '8px', background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--hard) / 0.5)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowX: 'auto', color: 'hsl(var(--hard))' }}>
                {myTestRun.error}
              </pre>
            )}

            {shippedShown && tests && (
              <div style={{ borderRadius: '8px', border: '1px dashed hsl(var(--border-color))', padding: '0.7rem 0.9rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--text-muted))' }}>
                  THE SHIPPED TESTS — WHAT DID THEY COVER THAT YOURS DIDN'T?
                </span>
                <pre style={{ margin: '0.4rem 0 0', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowX: 'auto', color: 'hsl(var(--text-secondary))' }}>
                  {tests}
                </pre>
              </div>
            )}

            {allMineHold && gauntlet === null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {/* [learnsci] Named on purpose — see CalibrationPrompt.tsx for the other
                    half. Passing your own asserts FEELS like a finished problem the same
                    way a streak count feels like progress; neither checks whether the
                    thing underneath is actually solid. This does. */}
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--secondary))' }}>
                  FEEDBACK, NOT JUST VOLUME
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.74rem', alignSelf: 'flex-start' }}
                  onClick={runGauntlet}
                  disabled={gauntletRunning}
                >
                  {gauntletRunning ? <Loader2 size={12} className="spin" /> : <Swords size={12} />}
                  <span>{gauntletRunning ? 'Running the gauntlet…' : 'Can your tests catch bugs? Run the mutation gauntlet'}</span>
                </button>
              </div>
            )}

            {gauntlet !== null && (gauntlet.length === 0 ? (
              <span style={{ fontSize: '0.76rem', color: 'hsl(var(--text-muted))' }}>
                The reference has none of the four mutable token shapes (&lt; / &lt;=, + / −, and / or, 0 / 1 init) — no gauntlet on this one.
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: gauntlet.every(g => g.caught) ? 'hsl(var(--easy))' : 'hsl(var(--medium))' }}>
                  Your asserts caught {gauntlet.filter(g => g.caught).length} of {gauntlet.length} planted bugs
                  {gauntlet.every(g => g.caught) ? ' — airtight.' : ' — each escapee below is a missing assert.'}
                </span>
                {gauntlet.map(({ mutant, caught }) => (
                  <div key={mutant.label} style={{ borderRadius: '8px', border: `1px solid hsl(var(--${caught ? 'easy' : 'hard'}) / 0.45)`, padding: '0.5rem 0.7rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.74rem' }}>
                      <span className={caught ? 'badge-easy' : 'badge-hard'} style={{ padding: '0.1rem 0.5rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.66rem' }}>
                        {caught ? 'CAUGHT' : 'ESCAPED'}
                      </span>
                      <span style={{ fontWeight: 600 }}>{mutant.label}</span>
                      <span style={{ color: 'hsl(var(--text-muted))' }}>line {mutant.line}</span>
                    </span>
                    {!caught && (
                      <>
                        <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', lineHeight: 1.5, whiteSpace: 'pre', overflowX: 'auto' }}>
                          <span style={{ color: 'hsl(var(--text-muted))' }}>- {mutant.before}</span>{'\n'}
                          <span style={{ color: 'hsl(var(--hard))' }}>+ {mutant.after}</span>
                        </pre>
                        <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>
                          Every one of your asserts still passed with this change in place — add one whose answer that token would flip.
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <CodeEditor
          ref={textareaRef}
          value={code}
          onChange={persist}
          onKeyDown={handleKeyDown}
          // This editor is now the SOLE occupant of the right column (RecallRating/
          // ExplainBack moved out — see ProblemViewer.tsx), so a 10-row floor tuned
          // for the old cramped three-way split reads as tiny in the space it
          // actually has now. A short starter stub still deserves real presence.
          rows={Math.min(30, Math.max(18, code.split('\n').length + 2))}
          ariaLabel="Python code editor"
          // `persist` writes to localStorage on every keystroke, so "Saved" here is
          // a fact — and "in this browser" is the whole truth: nothing leaves the
          // device, and clearing site data takes the attempt with it.
          statusText="Saved in this browser"
        />

        {previewSnap && (
          <div className="animate-in" style={{ borderRadius: '10px', border: '1px solid hsl(var(--border-color))', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'hsl(var(--bg-secondary) / 0.5)', borderBottom: '1px solid hsl(var(--border-color))' }}>
              <History size={13} color="hsl(var(--text-muted))" />
              <span style={{ flex: 1, minWidth: '140px', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                {/* A stash was never run against the tests — calling it a passing attempt
                    is the one thing this preview must not do. */}
                {previewSnap.passed === false ? 'Stashed before a re-solve' : 'Passing attempt'} from {relTime(previewSnap.on)} — read-only preview
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}
                onClick={() => {
                  // Restoring stomps the working copy — only ask when it actually would.
                  if (code !== previewSnap.code && !window.confirm('Replace your current code with this snapshot?')) return;
                  persist(previewSnap.code);
                  setPreviewSnap(null);
                }}
              >
                Restore
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                aria-label="Close snapshot preview"
                onClick={() => setPreviewSnap(null)}
              >
                <X size={12} />
              </button>
            </div>
            <div style={{ maxHeight: '260px', overflow: 'auto' }}>
              <PythonHighlighter code={previewSnap.code} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>
            {status || '⌘/Ctrl + Enter to run · Tab indents · Enter keeps depth · brackets auto-close'}
          </span>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
            onClick={() => setRevealed(r => !r)}
          >
            <Lightbulb size={12} />
            <span>{revealed ? 'Hide the worked solution' : 'Stuck? Show the worked solution'}</span>
          </button>
        </div>

        {revealed && (
          <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'hsl(var(--bg-tertiary))', border: '1px dashed hsl(var(--border-color))' }}>
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginBottom: '0.5rem' }}>
              Read it, close it, then write it again from memory — that is what makes it stick.
            </p>
            <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'hsl(var(--text-secondary))' }}>
              {solutionCode}
            </pre>
          </div>
        )}

        {expired && (
          <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem', borderRadius: '10px', background: 'hsl(var(--hard) / 0.1)', border: '1px solid hsl(var(--hard) / 0.6)', flexWrap: 'wrap' }}>
            <TimerOff size={15} color="hsl(var(--hard))" />
            <span style={{ flex: 1, minWidth: '200px', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
              <strong style={{ color: 'hsl(var(--hard))' }}>Time's up.</strong> No tricks — 15:00
              passed without a green run. Useful data: this pattern is not interview-ready yet.
            </span>
            {stash && (
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                onClick={() => { if (stash) persist(stash); setExpired(false); }}
              >
                Restore my stashed code
              </button>
            )}
            <button
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
              aria-label="Dismiss the time's-up notice"
              onClick={() => setExpired(false)}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {resolveDone !== null && (
          <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem', borderRadius: '10px', background: 'hsl(var(--easy) / 0.1)', border: '1px solid hsl(var(--easy) / 0.6)', flexWrap: 'wrap' }}>
            <Timer size={15} color="hsl(var(--easy))" />
            <span style={{ flex: 1, minWidth: '200px', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
              <strong style={{ color: 'hsl(var(--easy))' }}>Re-solved in {fmtClock(resolveDone)}.</strong>{' '}
              {gradedAs === null ? 'Fold it into your review schedule?' : 'Scheduled — the review queue has it.'}
            </span>
            {gradedAs === null && (
              <>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                  onClick={() => { gradeQuestion(questionId, 'easy'); setGradedAs('easy'); }}
                >
                  Smooth — got it
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                  onClick={() => { gradeQuestion(questionId, 'shaky'); setGradedAs('shaky'); }}
                >
                  Had to fight — shaky
                </button>
              </>
            )}
            <button
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
              aria-label="Dismiss the re-solve result"
              onClick={() => setResolveDone(null)}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
      </div>

      <ResizeHandle
        orientation="horizontal"
        containerRef={splitRef}
        split={rowSplit}
        label="Code and testcase panes"
      />

      {/* Testcase / Test Result panel (bottom-right): the "run it on my own input"
          console and everything that reports on a graded run — as opposed to
          pp-code-pane above, which acts on the code itself. */}
      <div className="pp-test-pane">
      {/* Labels, NOT tabs. LeetCode splits these into two switchable views; here
          the custom-input console and the graded-run report are stacked and both
          always visible, so a tab control would be a switch that switches
          nothing. Naming the two halves is the honest half of that design. */}
      <div
        style={{
          // The pane scrolls (see .pp-test-pane), so the labels stick to its top —
          // a header that scrolls away stops naming anything. Solid background,
          // not the usual translucent one, so content cannot show through it.
          position: 'sticky',
          top: 0,
          zIndex: 1,
          flexShrink: 0,
          padding: '0.6rem 1.5rem',
          borderBottom: '1px solid hsl(var(--border-color))',
          background: 'hsl(var(--bg-secondary))',
          display: 'flex',
          alignItems: 'center',
          gap: '0.9rem',
          flexWrap: 'wrap',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'hsl(var(--text-secondary))',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <CheckSquare size={14} color="hsl(var(--secondary))" />
          Testcase
        </span>
        <span aria-hidden="true" style={{ width: '1px', alignSelf: 'stretch', background: 'hsl(var(--border-color))' }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Terminal size={14} color="hsl(var(--secondary))" />
          Test Result
        </span>
      </div>
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Custom-input console: the shipped tests answer "is it right?", this answers
            "what does it do on my input?" — a different question, asked more often. */}
        <CustomInput questionId={questionId} code={code} />

        {banner && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem',
            borderRadius: '10px', background: banner.bg, border: `1px solid ${banner.border}`,
            color: banner.border, fontSize: '0.85rem', fontWeight: 600,
          }}>
            {banner.icon}<span>{banner.text}</span>
          </div>
        )}

        {/* Feature 13: static heuristics over the failing attempt — at most two gentle
            "worth checking" pointers, never a verdict. See LineNudges for why. */}
        {passed === false && <LineNudges code={code} />}

        {/* Only after a pass: a diff against the reference is a reward, not a crutch —
            before the tests pass it would just be a fancy way to read the solution. */}
        {passed === true && <SolutionDiff learnerCode={code} solutionCode={solutionCode} />}

        {result && (result.error || result.failedAssertion || result.stdout) && (
          <pre style={{
            margin: 0, padding: '0.9rem 1rem', borderRadius: '10px',
            background: 'hsl(var(--bg-tertiary))',
            border: `1px solid ${result.error ? 'hsl(var(--hard) / 0.5)' : 'hsl(var(--border-color))'}`,
            fontFamily: 'var(--font-mono)', fontSize: '0.76rem', lineHeight: 1.55,
            whiteSpace: 'pre-wrap', overflowX: 'auto',
            color: result.error ? 'hsl(var(--hard))' : 'hsl(var(--text-secondary))',
          }}>
            {result.error || result.failedAssertion || result.stdout}
          </pre>
        )}

        {result && !result.error && !result.failedAssertion && !result.stdout && passed === undefined && (
          <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
            Ran without errors and printed nothing. Add a <code>print(...)</code> to inspect a value.
          </span>
        )}
      </div>
      </div>
      </div>

      {/* Neither Code nor Testcase/Result: writing the brute-force approach from
          memory — graded by the same tests, but a second exercise, not a run of the
          code above — so it sits below the split rather than inside either pane.
          flexShrink:0 keeps the resizable split above from stealing its height back. */}
      {tests && bruteInfo && solved && (
        <div style={{ padding: '0 1.5rem 1.5rem', flexShrink: 0 }}>
          <div style={{ borderTop: '1px dashed hsl(var(--border-color))', paddingTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Target size={15} color="hsl(var(--medium))" />
              <strong style={{ fontSize: '0.9rem', flex: 1, minWidth: '160px' }}>Now the brute force — from memory</strong>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                aria-expanded={bruteOpen}
                onClick={() => setBruteOpen(o => !o)}
              >
                <span>{bruteOpen ? 'Close' : `Write the ${bruteInfo.name}`}</span>
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', lineHeight: 1.55 }}>
              "Start with brute force, then optimise" is the expected interview arc — and the
              brute force is the half nobody rehearses. The same tests grade it: correctness
              is correctness, only the complexity differs.
            </p>
            {bruteOpen && (
              <>
                <CodeEditor
                  value={bruteCode}
                  onChange={persistBrute}
                  rows={Math.min(20, Math.max(8, bruteCode.split('\n').length + 2))}
                  ariaLabel="Brute-force attempt editor"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.35rem 0.8rem', fontSize: '0.74rem' }}
                    onClick={executeBrute}
                    disabled={bruteRunning}
                  >
                    {bruteRunning ? <Loader2 size={12} className="spin" /> : <Play size={12} />}
                    <span>{bruteRunning ? 'Running…' : 'Run & check'}</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.8rem', fontSize: '0.74rem' }}
                    onClick={() => setBruteRevealed(r => !r)}
                  >
                    <Lightbulb size={12} />
                    <span>{bruteRevealed ? 'Hide the approach card' : 'Stuck? Show the approach card'}</span>
                  </button>
                </div>
                {bruteResult?.passed === true && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', borderRadius: '10px', background: 'hsl(var(--easy) / 0.12)', border: '1px solid hsl(var(--easy))', color: 'hsl(var(--easy))', fontSize: '0.82rem', fontWeight: 600 }}>
                    <Check size={15} /><span>Correct — you now own both ends of the follow-up conversation.</span>
                  </div>
                )}
                {bruteResult?.passed === false && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', borderRadius: '10px', background: 'hsl(var(--hard) / 0.12)', border: '1px solid hsl(var(--hard))', color: 'hsl(var(--hard))', fontSize: '0.82rem', fontWeight: 600 }}>
                    <X size={15} /><span>Not yet — the check that failed is below.</span>
                  </div>
                )}
                {bruteResult?.passed === false && <LineNudges code={bruteCode} />}
                {bruteResult && (bruteResult.error || bruteResult.failedAssertion || bruteResult.stdout) && (
                  <pre style={{ margin: 0, padding: '0.8rem 1rem', borderRadius: '10px', background: 'hsl(var(--bg-tertiary))', border: `1px solid ${bruteResult.error ? 'hsl(var(--hard) / 0.5)' : 'hsl(var(--border-color))'}`, fontFamily: 'var(--font-mono)', fontSize: '0.74rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowX: 'auto', color: bruteResult.error ? 'hsl(var(--hard))' : 'hsl(var(--text-secondary))' }}>
                    {bruteResult.error || bruteResult.failedAssertion || bruteResult.stdout}
                  </pre>
                )}
                {bruteRevealed && (
                  <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'hsl(var(--bg-tertiary))', border: '1px dashed hsl(var(--border-color))', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--text-muted))' }}>
                        {bruteInfo.name.toUpperCase()} — THE APPROACH CARD
                      </span>
                      <span className="badge-medium" style={{ padding: '0.1rem 0.5rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.66rem' }}>
                        {bruteInfo.complexity.time} time · {bruteInfo.complexity.space} space
                      </span>
                    </span>
                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>{bruteInfo.intuition}</p>
                    <div style={{ maxHeight: '320px', overflow: 'auto', borderRadius: '8px' }}>
                      <PythonHighlighter code={bruteInfo.code} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
