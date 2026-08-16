import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Play, Terminal } from 'lucide-react';
import { runPython, isPyodideReady } from '../utils/pythonRunner';
import { readText, writeText } from '../utils/persistence';
import { LocalsTimeline } from './LocalsTimeline';

interface CustomInputProps {
  questionId: string;
  /** The learner's current attempt, live from the editor above. */
  code: string;
}

/**
 * The shipped tests prove correctness; they never answer "but what does it do on MY
 * input?" — the question a learner actually has when a solution half-works. This panel
 * lets them ask it: type arguments, one call per line, and we invoke the first
 * top-level function in their attempt and show the repr of whatever came back.
 */

/** Column-0 `def` only. An indented def is a method or a nested helper — calling
 *  either directly would need an instance or a closure we do not have. */
const firstTopLevelDef = (code: string): string | null => {
  const m = code.match(/^def\s+([A-Za-z_]\w*)\s*\(/m);
  return m ? m[1] : null;
};

export const CustomInput: React.FC<CustomInputProps> = ({ questionId, code }) => {
  const storageKey = `runner-args-${questionId}`;
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState<string>(() => readText(storageKey));
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState<{ text: string; isError: boolean } | null>(null);
  // Same guard as the playground: a slow run finishing after a question switch must
  // not paint the old question's output onto the new one.
  const liveQuestion = useRef(questionId);

  // Switching question swaps the whole panel's state, collapsed included.
  useEffect(() => {
    liveQuestion.current = questionId;
    setArgs(readText(storageKey));
    setOutput(null);
    setRunning(false);
    setStatus('');
    setOpen(false);
  }, [questionId, storageKey]);

  const persist = (next: string) => {
    setArgs(next);
    writeText(storageKey, next);
  };

  const fnName = firstTopLevelDef(code);
  const lines = args.split('\n').map(l => l.trim()).filter(Boolean);

  const run = async () => {
    if (!fnName || lines.length === 0) return;
    setRunning(true);
    setOutput(null);
    // The playground owns the global progress callback, so surface the one-time
    // download note here ourselves instead of stealing its slot.
    setStatus(isPyodideReady() ? '' : 'Downloading Python (about 10 MB, one time)…');
    const ranFor = questionId;
    // Each line is pasted verbatim between the parentheses — the learner is writing
    // real Python expressions, so Python is the right parser for them, not us.
    // JSON.stringify happens to emit a valid Python string literal, which gets us an
    // echoed ">>> call(...)" header without hand-rolled escaping.
    const calls = lines
      .map(line => `print(${JSON.stringify(`>>> ${fnName}(${line})`)})\nprint(repr(${fnName}(${line})))`)
      .join('\n');
    const res = await runPython(`${code}\n\n${calls}`);
    if (liveQuestion.current !== ranFor) return; // question changed mid-run; output is stale
    setOutput(
      res.error
        ? { text: res.error, isError: true }
        : { text: res.stdout.trimEnd() || '(no output)', isError: false },
    );
    setStatus('');
    setRunning(false);
  };

  return (
    <div
      style={{
        border: '1px solid hsl(var(--border-color))',
        borderRadius: '10px',
        background: 'hsl(var(--bg-secondary) / 0.5)',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 0.9rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'hsl(var(--text-secondary))',
          fontSize: '0.8rem',
          fontWeight: 600,
          textAlign: 'left',
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Terminal size={14} color="hsl(var(--secondary))" />
        <span>Try your own input</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontWeight: 400 }}>
          calls your function with arguments you choose
        </span>
      </button>

      {open && (
        <div
          className="animate-in"
          style={{ padding: '0 0.9rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
        >
          {fnName ? (
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
              One call per line — just the arguments, as Python expressions. Each line runs{' '}
              <code style={{ fontFamily: 'var(--font-mono)' }}>{fnName}(…)</code> and shows the return
              value's repr. A function that mutates in place returns <code>None</code> — add a{' '}
              <code>print</code> inside it to watch the mutation happen.
            </p>
          ) : (
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
              Write a top-level <code style={{ fontFamily: 'var(--font-mono)' }}>def</code> (at column 0)
              in the editor above first — that is the function this panel calls.
            </p>
          )}

          <textarea
            value={args}
            onChange={e => persist(e.target.value)}
            aria-label="Arguments for your function, one call per line"
            placeholder={'[2, 7, 11, 15], 9\n[3, 3], 6'}
            spellCheck={false}
            rows={3}
            style={{
              width: '100%',
              resize: 'vertical',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              lineHeight: 1.6,
              padding: '0.7rem 0.85rem',
              borderRadius: '8px',
              background: 'hsl(var(--bg-tertiary))',
              color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-color))',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
              onClick={run}
              disabled={running || !fnName || lines.length === 0}
            >
              {running ? <Loader2 size={12} className="spin" /> : <Play size={12} />}
              <span>{running ? 'Running…' : fnName ? `Run ${fnName}(…)` : 'Run'}</span>
            </button>
            {status && (
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>
                {status}
              </span>
            )}
          </div>

          {output && (
            <pre
              style={{
                margin: 0,
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                background: 'hsl(var(--bg-tertiary))',
                border: `1px solid ${output.isError ? 'hsl(var(--hard) / 0.5)' : 'hsl(var(--border-color))'}`,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                overflowX: 'auto',
                color: output.isError ? 'hsl(var(--hard))' : 'hsl(var(--text-secondary))',
              }}
            >
              {output.text}
            </pre>
          )}

          {/* Step through my run: the same call, replayed line by line with the
              locals at every step. Mounted only once a result is on screen, so the
              learner steps through something they have already watched execute. */}
          {output && fnName && lines.length > 0 && (
            <LocalsTimeline code={code} fnName={fnName} argLines={lines} />
          )}
        </div>
      )}
    </div>
  );
};
