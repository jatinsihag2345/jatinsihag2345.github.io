import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bug, Play, RotateCcw, Check, X, Loader2, Lightbulb, ShieldAlert } from 'lucide-react';
import type { Question } from '../data/dsaQuestions';
import { runPython, isPyodideReady } from '../utils/pythonRunner';
import { readText, writeText } from '../utils/persistence';
import { SolutionDiff } from './SolutionDiff';
import { CodeEditor } from './CodeEditor';
import { LineNudges } from './LineNudges';
import bugHuntJson from '../data/bugHunt.json';

interface BugHuntProps {
  question: Question;
}

/**
 * Debug this — the interview skill nobody rehearses.
 *
 * Writing code from scratch and repairing code that ALMOST works are different
 * muscles, and interviews increasingly test the second one ("here's a teammate's PR,
 * it fails one test, go"). This panel plants a single real bug in the question's
 * reference solution and hands it over: read, hypothesise, fix, and prove the fix
 * with the same assertions that grade your own attempts.
 *
 * The reveal (what the bug was, and a diff against the intended fix) is earned by a
 * green run — but a "show me" escape hatch always exists, because being stuck forever
 * teaches less than reading the answer does.
 */

interface BugEntry {
  title: string;
  buggyCode: string;
  fixedCode: string;
  hint: string;
  bugExplanation: string;
  bugKind: string;
}

// bugHunt.json is generated content — runtime-validate each entry so a half-shipped
// or hand-edited file degrades to "no panel on this question", never to a crash.
const isBugEntry = (v: unknown): v is BugEntry => {
  if (!v || typeof v !== 'object') return false;
  const e = v as BugEntry;
  return [e.title, e.buggyCode, e.fixedCode, e.hint, e.bugExplanation, e.bugKind]
    .every(field => typeof field === 'string' && field.length > 0);
};

const BUG_ENTRIES: BugEntry[] = Array.isArray(bugHuntJson)
  ? (bugHuntJson as unknown[]).filter(isBugEntry)
  : [];

export const BugHunt: React.FC<BugHuntProps> = ({ question }) => {
  const entry = useMemo(
    () => BUG_ENTRIES.find(e => e.title === question.title),
    [question.title],
  );
  const storageKey = `bughunt-${question.id}`;

  const [code, setCode] = useState<string>(() =>
    entry ? readText(storageKey) || entry.buggyCode : '',
  );
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof runPython>> | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [surrendered, setSurrendered] = useState(false);
  // Failed graded runs so far — the free line-nudges below stay locked until the
  // SECOND miss, because the heuristics can land exactly on the planted bug and a
  // first-try spoiler would gut the hunt. Two misses = stuck enough that a pointer
  // beats frustration.
  const [failCount, setFailCount] = useState(0);
  // Guards a slow run finishing after the viewer swapped questions — without it the
  // old question's verdict lands on the new one (same idiom as PythonPlayground).
  const liveQuestion = useRef(question.id);

  useEffect(() => {
    liveQuestion.current = question.id;
    setCode(entry ? readText(`bughunt-${question.id}`) || entry.buggyCode : '');
    setResult(null);
    setHintShown(false);
    setSurrendered(false);
    setFailCount(0);
    setRunning(false);
    setStatus('');
  }, [question.id, entry]);

  if (!entry) return null; // no planted bug for this question — the panel simply isn't

  const persist = (next: string) => {
    setCode(next);
    writeText(storageKey, next);
  };

  const execute = async () => {
    setRunning(true);
    setResult(null);
    // Static message only — the live onPyodideProgress callback slot is single-owner
    // and belongs to the playground on this same page; stealing it would mute it.
    if (!isPyodideReady()) setStatus('Downloading Python (about 10 MB, one time)…');
    const ranFor = question.id;
    const res = await runPython(code, question.tests);
    if (liveQuestion.current !== ranFor) return; // question changed mid-run; verdict is stale
    if (res.passed === false) setFailCount(c => c + 1); // count misses, not runs
    setResult(res);
    setStatus('');
    setRunning(false);
  };

  /** Tab indents, Cmd/Ctrl+Enter runs — the same editor manners as the playground. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      // Shift+Tab must keep moving focus OUT — capturing it too would be a keyboard trap.
      if (e.shiftKey) return;
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = el;
      const next = code.slice(0, s) + '    ' + code.slice(en);
      persist(next);
      requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!running) execute();
    }
  };

  const graded = !!question.tests;
  const passed = result?.passed;
  const revealed = passed === true || surrendered;

  const banner =
    passed === true
      ? { bg: 'hsl(var(--easy) / 0.12)', border: 'hsl(var(--easy))', icon: <Check size={16} />, text: 'Fixed — the same tests that failed the buggy version now pass.' }
      : passed === false
        ? { bg: 'hsl(var(--hard) / 0.12)', border: 'hsl(var(--hard))', icon: <X size={16} />, text: 'Still broken. The assertion that caught it is below.' }
        : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Debug This</h3>
      <div className="glass" style={{ borderRadius: '16px', border: '1px solid hsl(var(--border-color))', overflow: 'hidden' }}>
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid hsl(var(--border-color))',
            background: 'hsl(var(--bg-secondary) / 0.5)',
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          }}
        >
          <Bug size={18} color="hsl(var(--hard))" />
          <div style={{ flex: 1, minWidth: '180px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>One bug, planted on purpose</h4>
            <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
              {graded
                ? 'This is the reference solution with a single real defect. Find it, fix it, prove it with the tests.'
                : 'This is the reference solution with a single real defect. No shipped tests here — run it, reason, then compare against the fix.'}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
            onClick={() => {
              if (code !== entry.buggyCode && !window.confirm('Throw away your repair and restore the buggy original?')) return;
              persist(entry.buggyCode);
              setResult(null);
              setFailCount(0); // a fresh plant restarts the no-spoiler grace period
            }}
            disabled={running}
          >
            <RotateCcw size={13} /><span>Re-plant the bug</span>
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
            onClick={execute}
            disabled={running}
          >
            {running ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
            <span>{running ? 'Running…' : graded ? 'Run & check' : 'Run'}</span>
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* CodeEditor instead of the bare textarea it replaced: the nudges below say
              "line N", which is only followable with a gutter — and a repair deserves
              the same editor manners (live highlight, auto-indent, the shared font
              size) as the playground above it. */}
          <CodeEditor
            value={code}
            onChange={persist}
            onKeyDown={handleKeyDown}
            rows={Math.min(24, Math.max(10, code.split('\n').length + 2))}
            ariaLabel="The buggy solution — edit it until the tests pass"
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>
              {status || '⌘/Ctrl + Enter to run · Tab indents'}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                onClick={() => setHintShown(h => !h)}
              >
                <Lightbulb size={12} />
                <span>{hintShown ? 'Hide the hint' : 'Hint'}</span>
              </button>
              {!revealed && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                  onClick={() => setSurrendered(true)}
                >
                  <ShieldAlert size={12} />
                  <span>Stuck? Reveal the bug</span>
                </button>
              )}
            </div>
          </div>

          {hintShown && (
            <div
              className="animate-in"
              style={{
                padding: '0.8rem 1rem', borderRadius: '10px',
                background: 'hsl(var(--medium) / 0.08)',
                border: '1px dashed hsl(var(--medium) / 0.5)',
                fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6,
              }}
            >
              <strong style={{ color: 'hsl(var(--medium))' }}>Hint:</strong> {entry.hint}
            </div>
          )}

          {banner && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem',
                borderRadius: '10px', background: banner.bg, border: `1px solid ${banner.border}`,
                color: banner.border, fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              {banner.icon}<span>{banner.text}</span>
            </div>
          )}

          {/* Feature 13, gated: free static nudges only once the hunt has genuinely
              stalled (second failed check onwards) — see the failCount comment above. */}
          {passed === false && failCount >= 2 && <LineNudges code={code} />}

          {result && (result.error || result.failedAssertion || result.stdout) && (
            <pre
              style={{
                margin: 0, padding: '0.9rem 1rem', borderRadius: '10px',
                background: 'hsl(var(--bg-tertiary))',
                border: `1px solid ${result.error ? 'hsl(var(--hard) / 0.5)' : 'hsl(var(--border-color))'}`,
                fontFamily: 'var(--font-mono)', fontSize: '0.76rem', lineHeight: 1.55,
                whiteSpace: 'pre-wrap', overflowX: 'auto',
                color: result.error ? 'hsl(var(--hard))' : 'hsl(var(--text-secondary))',
              }}
            >
              {result.error || result.failedAssertion || result.stdout}
            </pre>
          )}

          {revealed && (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  padding: '0.9rem 1.1rem', borderRadius: '10px',
                  background: 'hsl(var(--primary) / 0.08)',
                  border: '1px solid hsl(var(--primary) / 0.35)',
                  display: 'flex', flexDirection: 'column', gap: '0.4rem',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--text-muted))' }}>
                    WHAT THE BUG WAS
                  </span>
                  {/* The kind is a spoiler ("off-by-one" halves the search space), so it
                      only appears once the hunt is over. */}
                  <span
                    style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '999px',
                      background: 'hsl(var(--hard) / 0.15)', color: 'hsl(var(--hard))',
                      border: '1px solid hsl(var(--hard) / 0.4)',
                    }}
                  >
                    {entry.bugKind}
                  </span>
                </span>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
                  {entry.bugExplanation}
                </p>
              </div>
              {/* Your repair vs the intended fix — two correct repairs can differ, and
                  the diff is where you see whether yours was the surgical one. */}
              <SolutionDiff
              caption="Green is your edit, violet is the shipped fix. If your version passes the tests it is ALSO a valid repair — the diff shows the reference, not the only answer." learnerCode={code} solutionCode={entry.fixedCode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
