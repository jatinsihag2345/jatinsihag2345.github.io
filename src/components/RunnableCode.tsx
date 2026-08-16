import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pencil, RotateCcw, Loader2, X, Wrench, ChevronDown } from 'lucide-react';
import { PythonHighlighter } from './PythonHighlighter';
import { CodeEditor } from './CodeEditor';
import { runPython } from '../utils/pythonRunner';
import { isJavaReady, onJavaProgress, runJava } from '../utils/javaRunner';
import { buildJavaProgram, suggestMainBody } from '../utils/javaHarness';

export type RunnableLanguage = 'python' | 'java';

interface RunnableCodeProps {
  code: string;
  /** Every existing call site is a Python block, so Java opts in explicitly. */
  language?: RunnableLanguage;
  /** Java only: seeds the harness `main` from the question's own worked example. */
  examples?: { input: string; output?: string }[];
}

/** Reference code should be something you can poke, not a museum piece. */
const looksRunnable = (code: string, language: RunnableLanguage) =>
  language === 'java'
    ? /\bclass\s+\w/.test(code)
    : /\bdef |\bclass |\bimport |\bprint\(|\bassert /.test(code);

/** The editor's default tokeniser is Python's; on Java it would mis-colour more than
 *  it helped (`//` is not a comment to it), so the harness box goes uncoloured. */
const noHighlight = (line: string): React.ReactNode[] => [line];

/** javac points at a column with a `^` on its own line — wrapping moves the caret off
 *  the character it accuses, so error text scrolls sideways instead of wrapping. */
const hasCaretMarker = (text: string) => /\n\s*\^/.test(text);

/**
 * Every code block in the app becomes a tiny lab: read it highlighted, hit Run to
 * execute it as-is (most reference blocks carry their own asserts/demos), or Edit
 * to fork a scratch copy and experiment. Edits are deliberately session-only —
 * the canonical teaching code stays canonical; curiosity gets a sandbox, not a pen.
 *
 * Java goes through one extra step, because a LeetCode-shaped `class Solution` is not
 * a program: javaHarness.ts wraps it in a compilation unit, and the `main` body that
 * calls it is editable here rather than guessed silently — see that file for why.
 */
export const RunnableCode: React.FC<RunnableCodeProps> = ({ code, language = 'python', examples }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code);
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; text: string; tookMs?: number } | null>(null);
  const [status, setStatus] = useState('');
  const [programShown, setProgramShown] = useState(false);

  const isJava = language === 'java';
  const runnable = looksRunnable(code, language);
  const source = editing ? draft : code;

  const seedBody = useMemo(
    () => (isJava ? suggestMainBody(code, examples) : ''),
    [isJava, code, examples],
  );
  const [mainBody, setMainBody] = useState(seedBody);

  // One RunnableCode instance is reused across questions (SolutionsTab keys its cards
  // by approach name, which repeats), so a new `code` has to reset everything derived
  // from the old one — otherwise the previous question's harness and verdict linger.
  useEffect(() => {
    setDraft(code);
    setMainBody(seedBody);
    setEditing(false);
    setOut(null);
    setStatus('');
    setProgramShown(false);
  }, [code, seedBody]);

  const execute = async () => {
    setRunning(true);
    setOut(null);
    if (isJava) {
      // javaRunner keeps a single progress slot, so claim it for the run about to start
      // rather than at mount — several of these are on screen at once.
      onJavaProgress(setStatus);
      if (!isJavaReady()) setStatus('Fetching the Java runtime (about 20 MB, one time)…');
      const res = await runJava(buildJavaProgram(source, mainBody));
      setStatus('');
      setOut({
        ok: res.ok,
        text: res.ok
          ? res.stdout.trim() || 'Compiled and ran, printed nothing — add a System.out.println(...) to see a value'
          : res.error || 'failed',
        tookMs: res.elapsedMs,
      });
    } else {
      const res = await runPython(source);
      setOut(
        res.ok
          ? { ok: true, text: res.stdout.trim() || '✓ ran clean, printed nothing — add a print(...) to inspect values' }
          : { ok: false, text: res.error || 'failed' },
      );
    }
    setRunning(false);
  };

  const btn: React.CSSProperties = { padding: '0.3rem 0.7rem', fontSize: '0.72rem' };
  const caption: React.CSSProperties = { fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.55 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {editing ? (
        <CodeEditor
          value={draft}
          onChange={setDraft}
          rows={Math.min(22, Math.max(6, draft.split('\n').length + 1))}
          ariaLabel={`Scratch copy of this ${isJava ? 'Java' : 'Python'} example`}
          highlightLine={isJava ? noHighlight : undefined}
        />
      ) : (
        <div className="code-container">
          {isJava ? (
            <pre className="code-pre" style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
              <code>{code}</code>
            </pre>
          ) : (
            <PythonHighlighter code={code} />
          )}
        </div>
      )}

      {isJava && runnable && (
        <div
          className="no-print"
          style={{
            display: 'flex', flexDirection: 'column', gap: '0.4rem',
            padding: '0.7rem 0.85rem', borderRadius: '10px',
            border: '1px solid hsl(var(--secondary) / 0.35)',
            background: 'hsl(var(--secondary) / 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <Wrench size={13} color="hsl(var(--secondary))" />
            <strong style={{ fontSize: '0.78rem' }}>How it gets called</strong>
            <span style={caption}>editable — this becomes the body of <code>main</code></span>
          </div>
          <p style={caption}>
            Java starts at <code>main</code>, and <code>class Solution</code> has none. The lines below
            are pre-filled from this question's worked example where the types line up; where they
            don't, they say so. Nothing here can be derived reliably for every signature, so it is
            yours to correct.
          </p>
          <CodeEditor
            value={mainBody}
            onChange={setMainBody}
            rows={Math.min(14, Math.max(4, mainBody.split('\n').length + 1))}
            ariaLabel="The main method body that calls this solution"
            highlightLine={noHighlight}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" style={btn} onClick={() => setMainBody(seedBody)}>
              <RotateCcw size={12} /><span>Reset the call</span>
            </button>
            <button
              className="btn btn-secondary"
              style={btn}
              aria-expanded={programShown}
              onClick={() => setProgramShown(s => !s)}
            >
              <ChevronDown size={12} />
              <span>{programShown ? 'Hide the full program' : 'Show the full program'}</span>
            </button>
          </div>
          {programShown && (
            <>
              <span style={caption}>
                Exactly what javac receives — imports, the types LeetCode would have supplied, your
                code, then <code>Main</code>. Compile errors count lines against this, not the block above.
              </span>
              <pre
                className="code-pre"
                style={{
                  margin: 0, padding: '0.7rem', fontSize: '0.72rem',
                  maxHeight: '320px', overflow: 'auto',
                }}
              >
                <code>{buildJavaProgram(source, mainBody)}</code>
              </pre>
            </>
          )}
        </div>
      )}

      {runnable && (
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={btn} onClick={execute} disabled={running}>
            {running ? <Loader2 size={12} className="spin" /> : <Play size={12} />}
            <span>{running ? 'Running…' : editing ? 'Run my version' : isJava ? 'Compile & run' : 'Run this'}</span>
          </button>
          {editing ? (
            <>
              <button className="btn btn-secondary" style={btn}
                onClick={() => { setDraft(code); setOut(null); }}>
                <RotateCcw size={12} /><span>Reset</span>
              </button>
              <button className="btn btn-secondary" style={btn}
                onClick={() => { setEditing(false); setOut(null); }}>
                <X size={12} /><span>Done experimenting</span>
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" style={btn}
              onClick={() => { setDraft(code); setEditing(true); }}>
              <Pencil size={12} /><span>Edit & experiment</span>
            </button>
          )}
          {editing && (
            <span style={caption}>scratch copy — the original stays untouched</span>
          )}
        </div>
      )}

      {isJava && runnable && (
        <span style={caption} aria-live="polite">
          {status ||
            (isJavaReady()
              ? 'Java runtime loaded — runs take a second or two.'
              : 'The first run downloads a real JVM (CheerpJ, about 20 MB) from a CDN and takes roughly half a minute; later runs are quick. It needs a connection — Python here does not.')}
        </span>
      )}

      {out && (
        <>
          <pre
            className="animate-fade"
            style={{
              margin: 0, padding: '0.7rem 0.9rem', borderRadius: '8px',
              background: 'hsl(var(--bg-tertiary))',
              border: `1px solid ${out.ok ? 'hsl(var(--border-color))' : 'hsl(var(--hard) / 0.55)'}`,
              fontFamily: 'var(--font-mono)', fontSize: '0.74rem', lineHeight: 1.55,
              whiteSpace: hasCaretMarker(out.text) ? 'pre' : 'pre-wrap',
              overflowX: 'auto', maxHeight: '260px', overflowY: 'auto',
              color: out.ok ? 'hsl(var(--text-secondary))' : 'hsl(var(--hard))',
            }}
          >
            {out.text}
          </pre>
          {isJava && out.tookMs !== undefined && (
            <span style={caption}>
              {out.ok ? 'Compiled and ran' : 'Finished'} in {(out.tookMs / 1000).toFixed(1)}s.
            </span>
          )}
        </>
      )}
    </div>
  );
};
