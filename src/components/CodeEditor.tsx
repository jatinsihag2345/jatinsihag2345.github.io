import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { readText, writeText } from '../utils/persistence';
import { highlightPythonLine } from './PythonHighlighter';

/* ---- Editor font size: one global setting --------------------------------------------
   A learner who bumps the code font wants it bumped in every editor, not per-question,
   so this is a single module-level store rather than per-instance state or a context
   provider threaded through the tree. useSyncExternalStore keeps every mounted
   CodeEditor (and the A−/A+ control) in step with zero plumbing. */

const FONT_KEY = 'editor-font';
const MIN_FONT = 12;
const MAX_FONT = 20;
/** ≈ the 0.82rem the playground textarea used before this component existed. */
const DEFAULT_FONT = 13;

const clampFont = (px: number) => Math.min(MAX_FONT, Math.max(MIN_FONT, px));

let currentFont = (() => {
  // Clamp on read too: a hand-edited or backup-restored value must not produce an
  // unreadable 4px (or 90px) editor.
  const stored = parseInt(readText(FONT_KEY), 10);
  return Number.isFinite(stored) ? clampFont(stored) : DEFAULT_FONT;
})();

const fontListeners = new Set<() => void>();

const setEditorFont = (px: number) => {
  const next = clampFont(px);
  if (next === currentFont) return;
  currentFont = next;
  writeText(FONT_KEY, String(next));
  fontListeners.forEach(notify => notify());
};

const subscribeFont = (listener: () => void) => {
  fontListeners.add(listener);
  return () => {
    fontListeners.delete(listener);
  };
};

const getFont = () => currentFont;

/** Live editor font size in px — every mounted CodeEditor re-renders when it changes. */
export const useEditorFont = () => useSyncExternalStore(subscribeFont, getFont);

/** A− / A+ stepper. Exported on its own so each host can place it in its own toolbar. */
export const EditorFontControl: React.FC = () => {
  const size = useEditorFont();
  const btn: React.CSSProperties = { padding: '0.2rem 0.5rem', fontSize: '0.7rem' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <button
        className="btn btn-secondary"
        style={btn}
        aria-label="Decrease editor font size"
        disabled={size <= MIN_FONT}
        onClick={() => setEditorFont(size - 1)}
      >
        A−
      </button>
      <span
        style={{
          fontSize: '0.7rem',
          color: 'hsl(var(--text-muted))',
          fontFamily: 'var(--font-mono)',
          minWidth: '2.6em',
          textAlign: 'center',
        }}
      >
        {size}px
      </span>
      <button
        className="btn btn-secondary"
        style={btn}
        aria-label="Increase editor font size"
        disabled={size >= MAX_FONT}
        onClick={() => setEditorFont(size + 1)}
      >
        A+
      </button>
    </div>
  );
};

/* ---- The editor ---------------------------------------------------------------------
   Overlay technique: the coloured code lives in a pointer-events-none layer BEHIND a
   textarea whose glyphs are transparent (caret stays visible via caretColor). Both
   surfaces — plus the line-number gutter — share the exact same font metrics and
   padding, and are scroll-synced imperatively, so the caret always floats over the
   coloured glyph it "owns". */

/** Shared by textarea, gutter and highlight layer — alignment depends on it. */
const LINE_HEIGHT = 1.6;
const PAD = '1rem';

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
const CLOSERS = new Set(Object.values(PAIRS));

interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  /**
   * Host key handling runs FIRST; if it calls preventDefault (the playground's Tab
   * indent and Cmd/Ctrl+Enter run), the editor adds nothing — those behaviours
   * predate this component and must keep working exactly as before.
   */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  /** The textarea is the only focusable part — this names it for screen readers. */
  ariaLabel: string;
  /**
   * Per-line tokeniser. Python by default; SqlPlayground can pass an SQL one later
   * without this file changing — the editor knows nothing about the language.
   */
  highlightLine?: (line: string) => React.ReactNode[];
  /**
   * Opt-in footer strip: this text on the left, a live "Ln X, Col Y" caret
   * readout on the right. Off unless a host asks for it, because the left half
   * is a claim about persistence only the HOST can make truthfully — the editor
   * does not save anything itself.
   */
  statusText?: string;
  /** React 19 ref-as-prop: hosts get the raw textarea for caret work (snippets). */
  ref?: React.Ref<HTMLTextAreaElement>;
}

/** 1-based line and column of `pos` within `text` — what an editor footer means
 *  by "Ln 3, Col 12". */
const caretAt = (text: string, pos: number) => {
  const before = text.slice(0, pos);
  const lineStart = before.lastIndexOf('\n') + 1;
  return { line: before.split('\n').length, col: pos - lineStart + 1 };
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onKeyDown,
  rows,
  ariaLabel,
  highlightLine = highlightPythonLine,
  statusText,
  ref,
}) => {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const fontPx = useEditorFont();
  const [caret, setCaret] = useState({ line: 1, col: 1 });

  // The host's ref and our own must both see the textarea.
  const setTextareaRef = (el: HTMLTextAreaElement | null) => {
    taRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = el;
  };

  const syncScroll = () => {
    const el = taRef.current;
    if (!el) return;
    // Imperative DOM writes instead of state: scroll fires every frame, and a React
    // re-render per event would visibly drag the colours behind the caret.
    if (layerRef.current) {
      layerRef.current.scrollTop = el.scrollTop;
      layerRef.current.scrollLeft = el.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
  };

  // Edits and font changes move content without firing a scroll event — re-sync after
  // every commit so the layers can never be left one keystroke behind.
  useEffect(syncScroll);

  /** Replace the value and put the caret where the edit leaves it. */
  /** Insert via setRangeText so the browser records it on the textarea's native
   *  undo stack — replacing `value` wholesale wipes Cmd+Z history on every
   *  auto-close/indent, which readers of their own half-typed code rely on. */
  const applyEdit = (el: HTMLTextAreaElement, insert: string, start: number, end: number, caret: number) => {
    el.setRangeText(insert, start, end, 'preserve');
    el.setSelectionRange(caret, caret);
    onChange(el.value);
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return; // host claimed the key (Tab, Cmd/Ctrl+Enter)

    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: en } = el;
    const empty = s === en;

    // Typeover BEFORE auto-close (quotes are both): typing the closer already under
    // the caret steps over it, otherwise auto-close leaves doubled brackets to fight.
    if (empty && CLOSERS.has(e.key) && value[s] === e.key) {
      e.preventDefault();
      el.setSelectionRange(s + 1, s + 1);
      return;
    }

    // Auto-close — only on an empty selection, so selecting text and typing a bracket
    // keeps the native "replace selection" behaviour.
    if (empty && PAIRS[e.key]) {
      // Quotes double as closers; skip pairing right after a word character so an
      // apostrophe mid-word ("don't" in a comment) stays a single quote.
      const isQuote = e.key === '"' || e.key === "'";
      if (!(isQuote && /\w/.test(value[s - 1] ?? ''))) {
        e.preventDefault();
        applyEdit(e.currentTarget, e.key + PAIRS[e.key], s, en, s + 1);
        return;
      }
    }

    // Auto-indent: Python's block structure IS whitespace, so Enter carries the
    // current depth over — and goes one level deeper after a colon, because that is
    // what the colon means. Plain Enter only: modified Enter belongs to the host.
    if (e.key === 'Enter' && empty && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      const line = value.slice(lineStart, s);
      let indent = /^\s*/.exec(line)?.[0] ?? '';
      if (line.trimEnd().endsWith(':')) indent += '    ';
      applyEdit(e.currentTarget, '\n' + indent, s, en, s + 1 + indent.length);
    }
  };

  /* Undefined when there is no footer: the four other editors on a problem page
     would otherwise re-render on every caret move to feed a readout nobody is
     showing. The equality check keeps even the shown one to one render per
     actual line/column change, not one per keystroke. */
  const trackCaret =
    statusText === undefined
      ? undefined
      : (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
          const el = e.currentTarget;
          const next = caretAt(el.value, el.selectionStart);
          setCaret(prev => (prev.line === next.line && prev.col === next.col ? prev : next));
        };

  const lines = value.split('\n');
  const gutterCh = String(lines.length).length;
  const mono: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: `${fontPx}px`,
    lineHeight: LINE_HEIGHT,
    tabSize: 4,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '10px',
        border: '1px solid hsl(var(--border-color))',
        background: 'hsl(var(--bg-tertiary))',
        overflow: 'hidden',
      }}
    >
      {/* The editor row proper: gutter + code surface. Wrapped so the optional
          status strip can sit under BOTH without joining their scroll sync. */}
      <div style={{ display: 'flex', minWidth: 0 }}>
      {/* Line-number gutter: same font metrics and vertical padding as the textarea,
          scrollTop-synced. Decorative for a screen reader, hence aria-hidden. */}
      <div
        ref={gutterRef}
        aria-hidden="true"
        style={{
          ...mono,
          overflow: 'hidden',
          flexShrink: 0,
          textAlign: 'right',
          color: 'hsl(var(--text-muted))',
          userSelect: 'none',
          borderRight: '1px solid hsl(var(--border-color))',
        }}
      >
        <div style={{ padding: `${PAD} 0.6rem`, minWidth: `${gutterCh + 1}ch` }}>
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        {/* Highlight layer, painted behind the textarea. overflow:hidden (not auto) so
            it can never grow its own scrollbars — it only mirrors the textarea's. */}
        <div
          ref={layerRef}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
        >
          <pre
            style={{
              ...mono,
              margin: 0,
              padding: PAD,
              whiteSpace: 'pre',
              color: 'hsl(var(--text-primary))',
              minWidth: 'max-content',
            }}
          >
            {lines.map((line, i) => (
              <React.Fragment key={i}>
                {highlightLine(line)}
                {i < lines.length - 1 ? '\n' : ''}
              </React.Fragment>
            ))}
            {/* Zero-width space: gives a trailing empty line a real line box, so the
                pre's scroll height matches the textarea's exactly at the bottom. */}
            {'\u200B'}
          </pre>
        </div>

        {/* wrap="off" on both surfaces: a soft-wrapped line would occupy two visual
            rows against one gutter number, breaking every alignment at once. */}
        <textarea
          ref={setTextareaRef}
          className="code-editor-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={trackCaret}
          onKeyUp={trackCaret}
          onClick={trackCaret}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          rows={rows}
          aria-label={ariaLabel}
          style={{
            ...mono,
            position: 'relative',
            display: 'block',
            width: '100%',
            padding: PAD,
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            background: 'transparent',
            color: 'transparent',
            caretColor: 'hsl(var(--text-primary))',
            whiteSpace: 'pre',
            overflow: 'auto',
          }}
        />
      </div>
      </div>

      {statusText !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.3rem 0.75rem',
            borderTop: '1px solid hsl(var(--border-color))',
            background: 'hsl(var(--bg-secondary) / 0.6)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'hsl(var(--text-muted))',
          }}
        >
          <span>{statusText}</span>
          {/* Decorative for a screen reader: the caret's position is something a
              screen reader already announces as you move through the textarea,
              and a live region repeating it would talk over that. */}
          <span aria-hidden="true">Ln {caret.line}, Col {caret.col}</span>
        </div>
      )}
    </div>
  );
};
