/**
 * Runs the learner's Python in the browser via Pyodide (CPython compiled to WASM).
 *
 * The point is not "look, it runs" — it is that writing your own solution and having it
 * checked is the difference between recognising an algorithm and being able to produce
 * one. Reading a perfect solution feels like learning and mostly is not.
 *
 * Pyodide is ~10 MB, so it is loaded lazily on the first Run and reused after that.
 */

/** Helpers the questions' code and tests assume exist — the same set the offline
 *  validation harness used, so a test that passed at build time passes here too. */
const PREAMBLE = `
import sys, math, heapq, bisect, functools, itertools, collections, re, json
from collections import defaultdict, deque, Counter, OrderedDict
from typing import List, Optional, Dict, Set, Tuple, Any
from functools import lru_cache

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    def __repr__(self):
        return f"ListNode({self.val})"

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
    def __repr__(self):
        return f"TreeNode({self.val})"

class Node:
    def __init__(self, val=0, next=None, random=None, children=None):
        self.val = val
        self.next = next
        self.random = random
        self.children = children or []

def build_linked_list(values):
    head = None
    for v in reversed(values or []):
        head = ListNode(v, head)
    return head

def linked_list_to_list(head, limit=10000):
    out = []
    while head is not None and len(out) < limit:
        out.append(head.val)
        head = head.next
    return out

def build_tree(values):
    """Level-order list, None for an absent node (LeetCode style)."""
    if not values:
        return None
    root = TreeNode(values[0])
    q = deque([root])
    i = 1
    while q and i < len(values):
        node = q.popleft()
        if i < len(values):
            v = values[i]; i += 1
            if v is not None:
                node.left = TreeNode(v); q.append(node.left)
        if i < len(values):
            v = values[i]; i += 1
            if v is not None:
                node.right = TreeNode(v); q.append(node.right)
    return root

def tree_to_level_list(root):
    if not root:
        return []
    out, q = [], deque([root])
    while q:
        node = q.popleft()
        if node is None:
            out.append(None); continue
        out.append(node.val)
        q.append(node.left); q.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out
`;

export interface PyRunResult {
  ok: boolean;
  /** Anything the code printed. */
  stdout: string;
  /** Present when the code raised — already trimmed to the useful part. */
  error?: string;
  /** Set only when tests were supplied. */
  passed?: boolean;
  /** The specific assertion that failed, in plain language. */
  failedAssertion?: string;
  elapsedMs: number;
}

type Pyodide = any;

let pyodidePromise: Promise<Pyodide> | null = null;
let loadProgress: ((msg: string) => void) | null = null;

export const onPyodideProgress = (cb: (msg: string) => void) => {
  loadProgress = cb;
};

export const isPyodideReady = () => pyodidePromise !== null;

/** Fetch and boot the interpreter once; every later run reuses it. */
export const loadPython = async (): Promise<Pyodide> => {
  if (!pyodidePromise) {
    loadProgress?.('Downloading Python (about 10 MB, one time)…');
    pyodidePromise = (async () => {
      const { loadPyodide, version } = await import('pyodide');
      const pyodide = await loadPyodide({
        // The CDN path is DERIVED from the installed package's own version. Hardcoding
        // it shipped a loader/assets mismatch once already — Pyodide's loader
        // version-checks its assets and throws, killing every Run with a misleading
        // network error. Deriving makes the mismatch impossible.
        indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full/`,
      });
      loadProgress?.('Starting interpreter…');
      pyodide.runPython(PREAMBLE);
      loadProgress?.('');
      return pyodide;
    })().catch(err => {
      pyodidePromise = null; // let the next attempt retry rather than fail forever
      throw err;
    });
  }
  return pyodidePromise;
};

/** Strip interpreter internals but KEEP the learner's own frames — the
 *  `File "<exec>", line N` entries are the only thing that says where it broke. */
const cleanTraceback = (raw: string): string => {
  const lines = raw.split('\n');
  const keep = lines.filter(
    l => !l.includes('/lib/python') && !l.toLowerCase().includes('pyodide') && l.trim() !== '',
  );
  return (keep.length ? keep : lines).join('\n').trim();
};

/** Turn a failed test into "assert that failed + its source line" instead of a wall
 *  of traceback.
 *
 *  The tests are compiled under their OWN filename (see runPython) so that a line
 *  number can be indexed into `tests` safely. When both were compiled as <exec>, a
 *  crash inside the learner's solution left the deepest frame pointing at a line of
 *  THEIR code, which was then quoted out of the tests file — naming a check that
 *  never ran, sometimes a comment. Everything not <tests> is now their code by
 *  construction, and the innermost <tests> frame is the check that was executing
 *  when it broke, whether the assert came out false or the solution raised under it. */
const describeFailure = (raw: string, tests: string): string => {
  const frames = [...raw.matchAll(/File "<tests>", line (\d+)/g)];
  const lastLine = frames.length ? Number(frames[frames.length - 1][1]) : NaN;
  const testLines = tests.split('\n');
  const src =
    Number.isFinite(lastLine) && lastLine >= 1 && lastLine <= testLines.length
      ? (testLines[lastLine - 1] || '').trim()
      : '';
  const errLine =
    raw
      .split('\n')
      .reverse()
      .find(l => /^\w*(Error|Exception|AssertionError)/.test(l.trim())) || '';
  if (src) {
    const err = errLine.trim() || 'AssertionError';
    // Three different failures, three sentences. A false assert means the answer was
    // wrong; an exception underneath it means the check never got an answer at all,
    // and calling that "this check failed" sends people hunting for a logic error in
    // code that never returned. A compile error is the tests' own — they can be the
    // learner's ("my tests" in Bug Hunt), so it must not read as their solution's fault.
    const header = /^AssertionError\b/.test(err)
      ? 'This check failed:'
      : /^(SyntaxError|IndentationError|TabError)\b/.test(err)
        ? 'This check could not be compiled:'
        : 'Your code raised while running this check:';
    return `${header}\n    ${src}\n${err}`;
  }
  return cleanTraceback(raw);
};

/**
 * Execute `code`. If `tests` is given, run those assertions afterwards and report
 * whether they all held.
 */
export const runPython = async (code: string, tests?: string): Promise<PyRunResult> => {
  const started = performance.now();
  let pyodide: Pyodide;
  try {
    pyodide = await loadPython();
  } catch (err) {
    return {
      ok: false,
      stdout: '',
      error:
        'Could not load the Python runtime. Check your connection — it is fetched from a CDN on first use.\n' +
        (err instanceof Error ? err.message : String(err)),
      elapsedMs: performance.now() - started,
    };
  }

  let stdout = '';
  pyodide.setStdout({ batched: (s: string) => { stdout += s + '\n'; } });
  pyodide.setStderr({ batched: (s: string) => { stdout += s + '\n'; } });

  try {
    // Fresh namespace per run so a stale variable from a previous attempt cannot
    // make a broken solution look like it works.
    const ns = pyodide.globals.get('dict')();
    pyodide.runPython(PREAMBLE, { globals: ns });
    pyodide.runPython(code, { globals: ns });

    if (tests && tests.trim()) {
      try {
        // '<tests>' (not the default '<exec>') is what lets describeFailure tell a
        // test frame from a learner frame. Angle brackets keep Pyodide from trying
        // to splice source lines into the traceback, exactly as before.
        pyodide.runPython(tests, { globals: ns, filename: '<tests>' });
      } catch (assertErr) {
        return {
          ok: true,
          stdout,
          passed: false,
          failedAssertion: describeFailure(String(assertErr), tests),
          elapsedMs: performance.now() - started,
        };
      }
      return { ok: true, stdout, passed: true, elapsedMs: performance.now() - started };
    }

    return { ok: true, stdout, elapsedMs: performance.now() - started };
  } catch (err) {
    return {
      ok: false,
      stdout,
      error: cleanTraceback(String(err)),
      elapsedMs: performance.now() - started,
    };
  }
};

// ---- Step-through tracing ------------------------------------------------------------

/** One recorded moment of a traced call. `line` is 1-based into the exact code
 *  string that was traced — which is what the timeline UI highlights. */
export interface TraceStep {
  line: number;
  event: 'line' | 'return' | 'exception';
  /** 0 = the frame the traced call opened; +1 for each nested user-code call. */
  depth: number;
  /** Local variable name → truncated repr at this moment. */
  locals: Record<string, string>;
  /** repr of the value being handed back — present on 'return' events. */
  ret?: string;
  /** "TypeError: …" — present on 'exception' events. */
  exc?: string;
}

export interface TraceRunResult {
  /** False only when the tracing MACHINERY failed (runtime unavailable, driver
   *  crash). A learner-code error still reports ok: true with `error` set — the
   *  steps recorded up to the crash are the valuable part. */
  ok: boolean;
  steps: TraceStep[];
  /** True when the step cap ended the call early — the timeline is a prefix. */
  truncated: boolean;
  /** repr of the call's return value; absent when it raised or was cut short. */
  returned?: string;
  /** The error that ended the run (learner code or machinery). */
  error?: string;
  stdout: string;
  elapsedMs: number;
}

/**
 * Run `code`, then evaluate `callExpr` under sys.settrace, recording one step per
 * line/return/exception event in the LEARNER's frames only. "Learner's frames" is
 * enforced by filename: their code is compiled as '<learner>' while the preamble,
 * the driver below, and every stdlib module carry other filenames — so library
 * internals can never leak into the timeline. Reprs are truncated (depth ≤ 2,
 * short heads) both to keep the payload small and because a 10k-element list in a
 * vars table teaches nothing. The call is ABORTED at `maxSteps`: merely pausing
 * capture there would let an accidental `while True:` freeze the tab, and an
 * honest cutoff beats a frozen page.
 */
export const traceRun = async (
  code: string,
  callExpr: string,
  maxSteps = 400,
): Promise<TraceRunResult> => {
  const started = performance.now();
  let pyodide: Pyodide;
  try {
    pyodide = await loadPython();
  } catch (err) {
    return {
      ok: false,
      steps: [],
      truncated: false,
      stdout: '',
      error:
        'Could not load the Python runtime. Check your connection — it is fetched from a CDN on first use.\n' +
        (err instanceof Error ? err.message : String(err)),
      elapsedMs: performance.now() - started,
    };
  }

  let stdout = '';
  pyodide.setStdout({ batched: (s: string) => { stdout += s + '\n'; } });
  pyodide.setStderr({ batched: (s: string) => { stdout += s + '\n'; } });

  // JSON.stringify emits valid Python string literals (the same trick CustomInput
  // uses for its echo headers), so the learner's code and call expression travel
  // into the driver with no hand-rolled escaping. Everything the driver defines is
  // _tr_-prefixed AND aliased (sys/json) BEFORE the learner's code runs, so a
  // solution that shadows `sys`, `json`, or a builtin cannot break the tracer's
  // own bookkeeping; the locals snapshot skips the _tr_ prefix so none of this
  // plumbing ever appears in the learner's vars table.
  const driver = `
import sys as _tr_sys
import json as _tr_json

_tr_MAX = ${Math.max(1, Math.floor(maxSteps))}
_tr_code = ${JSON.stringify(code)}
_tr_expr = ${JSON.stringify(callExpr)}

_tr_steps = []
_tr_cut = [False]

# BaseException on purpose: a learner's blanket "except Exception:" must not be
# able to swallow the step cap and keep an infinite loop running untraced. (A bare
# "except:" still could — the same residual risk a plain Run already carries.)
class _tr_Cap(BaseException):
    pass

def _tr_repr(v, depth=0):
    # Truncated on purpose: the table needs the SHAPE of a value, not all of it.
    try:
        if v is None or isinstance(v, (bool, int, float, complex)):
            return repr(v)
        if isinstance(v, str):
            return repr(v if len(v) <= 48 else v[:48] + '…')
        if depth >= 2:
            r = repr(v)
            return r if len(r) <= 60 else r[:60] + '…'
        if isinstance(v, (list, tuple, set, frozenset)):
            items = [_tr_repr(x, depth + 1) for x in list(v)[:8]]
            extra = '' if len(v) <= 8 else ', …+' + str(len(v) - 8) + ' more'
            if isinstance(v, list):
                return '[' + ', '.join(items) + extra + ']'
            if isinstance(v, tuple):
                return '(' + ', '.join(items) + extra + ')'
            return '{' + ', '.join(items) + extra + '}'
        if isinstance(v, dict):
            items = [_tr_repr(k, depth + 1) + ': ' + _tr_repr(w, depth + 1) for k, w in list(v.items())[:8]]
            extra = '' if len(v) <= 8 else ', …+' + str(len(v) - 8) + ' more'
            return '{' + ', '.join(items) + extra + '}'
        r = repr(v)
        return r if len(r) <= 60 else r[:60] + '…'
    except Exception:
        return '<unprintable>'

def _tr_depth(frame):
    # Frames above the traced call belong to the driver/eval (other filenames), so
    # counting '<learner>' ancestors gives 0 for the entry frame and +1 per
    # recursive user-code call — exactly the "how deep am I" number recursion
    # learners need to see.
    d = 0
    f = frame.f_back
    while f is not None:
        if f.f_code.co_filename == '<learner>':
            d += 1
        f = f.f_back
    return d

def _tr_trace(frame, event, arg):
    if frame.f_code.co_filename != '<learner>':
        return None  # not the learner's code — skip this frame entirely
    if event == 'call':
        return _tr_trace  # keep tracing inside, but a call row would duplicate the first line row
    if event not in ('line', 'return', 'exception'):
        return _tr_trace
    if len(_tr_steps) >= _tr_MAX:
        _tr_cut[0] = True
        _tr_sys.settrace(None)
        raise _tr_Cap()
    snap = {}
    for k, v in frame.f_locals.items():
        if k.startswith('__') or k.startswith('_tr_'):
            continue
        snap[k] = _tr_repr(v)
    step = {'line': frame.f_lineno, 'event': event, 'depth': _tr_depth(frame), 'locals': snap}
    if event == 'return':
        step['ret'] = _tr_repr(arg)
    elif event == 'exception':
        try:
            step['exc'] = arg[0].__name__ + ': ' + str(arg[1])
        except Exception:
            step['exc'] = 'exception'
    _tr_steps.append(step)
    return _tr_trace

_tr_ret = None
_tr_err = None
try:
    # Compiling with the '<learner>' filename is what lets the tracer recognise
    # "this frame is their code" — and it makes f_lineno index the editor's lines
    # 1:1, which the timeline's line highlight depends on.
    exec(compile(_tr_code, '<learner>', 'exec'), globals())
    _tr_call = compile(_tr_expr, '<tr-call>', 'eval')
    _tr_sys.settrace(_tr_trace)
    try:
        _tr_ret = _tr_repr(eval(_tr_call, globals()))
    finally:
        _tr_sys.settrace(None)
except _tr_Cap:
    pass
except BaseException as _tr_e:
    _tr_err = type(_tr_e).__name__ + ': ' + str(_tr_e)

_tr_json.dumps({'steps': _tr_steps, 'truncated': _tr_cut[0], 'returned': _tr_ret, 'error': _tr_err})
`;

  try {
    // Fresh namespace per trace, same reasoning as runPython: stale globals from an
    // earlier run must not change what this timeline claims happened.
    const ns = pyodide.globals.get('dict')();
    pyodide.runPython(PREAMBLE, { globals: ns });
    const raw = String(pyodide.runPython(driver, { globals: ns }));
    const parsed = JSON.parse(raw) as {
      steps: TraceStep[];
      truncated: boolean;
      returned: string | null;
      error: string | null;
    };
    return {
      ok: true,
      steps: parsed.steps,
      truncated: parsed.truncated,
      returned: parsed.returned ?? undefined,
      error: parsed.error ?? undefined,
      stdout,
      elapsedMs: performance.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      steps: [],
      truncated: false,
      stdout,
      error: cleanTraceback(String(err)),
      elapsedMs: performance.now() - started,
    };
  }
};
