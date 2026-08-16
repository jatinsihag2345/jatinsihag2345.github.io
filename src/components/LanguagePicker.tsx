import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { RunnableCode, type RunnableLanguage } from './RunnableCode';

/**
 * "View in another language" — a language switch for an approach's code block,
 * where two of the four languages actually run.
 *
 * Lands at: src/components/LanguagePicker.tsx
 *
 * Python runs on Pyodide (utils/pythonRunner.ts) and Java on CheerpJ, a real
 * WebAssembly JVM, with OpenJDK's javac running inside it (utils/javaRunner.ts).
 * Both are in-browser: this project has no backend judge and wants none — peer
 * review runs off share-links for the same reason.
 *
 * C++ and JavaScript stay read-only, and for different reasons — see the captions
 * below, which say which reason applies rather than repeating one blanket excuse.
 * Every port here was hand-translated and execution-verified against the same test
 * assertions as the Python version before shipping, whether or not this app can run
 * it back to you.
 *
 * `translations` is sparse by design (dsaCodeTranslations.json covers Java and C++
 * for all 191 questions but JavaScript for only a handful, and every entry hangs off
 * that question's Optimal approach alone) — a language with no entry for this approach
 * shows an honest empty state, never a silent fallback.
 */

const LANGUAGES = [
  { key: 'python', label: 'Python' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'java', label: 'Java' },
  { key: 'cpp', label: 'C++' },
] as const;

/** The two with an in-browser engine behind them. */
const RUNNABLE: Record<string, RunnableLanguage> = { python: 'python', java: 'java' };

/** Why this one is text you can only read, stated specifically. */
const READ_ONLY_REASON: Record<string, string> = {
  cpp:
    'Read-only. No C++ engine runs these correctly in a browser: the lightweight in-browser ' +
    'compilers ship no standard library, and every solution here leans on <vector>, <string> ' +
    'or <algorithm>. A full Clang/WASM toolchain would be a bigger download than the JVM and ' +
    'still needs a server to build against — so this is a port to read and copy, not to run.',
  javascript:
    'Read-only. Nothing technical stops a browser running its own language — the app just has ' +
    'no test harness for JavaScript, and a Run button with nothing checking the answer would ' +
    'promise more than it delivers. Python and Java are the two tracks that get executed.',
};

interface LanguagePickerProps {
  pythonCode: string;
  translations?: Record<string, string>;
  /** Seeds the Java harness's `main` call — see RunnableCode / javaHarness. */
  examples?: { input: string; output?: string }[];
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({ pythonCode, translations, examples }) => {
  const [lang, setLang] = useState<string>('python');
  const [copied, setCopied] = useState(false);

  const code = lang === 'python' ? pythonCode : translations?.[lang];

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div role="group" aria-label="Choose a language to view this code in" style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.key}
              type="button"
              aria-pressed={lang === l.key}
              onClick={() => setLang(l.key)}
              style={{
                padding: '0.25rem 0.65rem', borderRadius: '999px', cursor: 'pointer',
                fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-sans)',
                background: lang === l.key ? 'hsl(var(--secondary) / 0.18)' : 'hsl(var(--bg-tertiary))',
                border: `1px solid ${lang === l.key ? 'hsl(var(--secondary))' : 'hsl(var(--border-color))'}`,
                color: lang === l.key ? 'hsl(var(--secondary))' : 'hsl(var(--text-secondary))',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
        {code && (
          <button
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            onClick={copy}
          >
            {copied ? <Check size={12} color="hsl(var(--easy))" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        )}
      </div>

      {code && RUNNABLE[lang] ? (
        // Keyed by language so switching tabs rebuilds the runner from scratch rather
        // than carrying a Python scratch copy (or a Java `main`) into the other track.
        <RunnableCode key={lang} code={code} language={RUNNABLE[lang]} examples={examples} />
      ) : code ? (
        <>
          <div className="code-container">
            <pre className="code-pre" style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
              <code>{code}</code>
            </pre>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.55 }}>
            {READ_ONLY_REASON[lang]}
          </span>
        </>
      ) : (
        <div
          style={{
            padding: '1.25rem', borderRadius: '10px', border: '1px dashed hsl(var(--border-color))',
            fontSize: '0.82rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6,
          }}
        >
          Not yet translated into {LANGUAGES.find((l) => l.key === lang)?.label} for this approach.
          Ports are written against each question's <em>Optimal</em> approach — Java and C++ cover
          all 191 of those, JavaScript only a handful — so the Brute Force and Better cards stay
          Python-only.
        </div>
      )}
    </div>
  );
};
