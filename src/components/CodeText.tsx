import React, { useMemo } from 'react';

/**
 * Renders prose with its code fragments lifted out as inline monospace chips —
 * the `nums` / `target` chips a real problem statement is full of.
 *
 * The question data is plain prose strings, not markup, so there is nothing to
 * parse: this matches the fragments instead. Two sources, in priority order:
 *
 *   1. Backtick spans, if an author ever writes them — explicit intent wins.
 *   2. A deliberately NARROW set of shapes that cannot occur in English:
 *      a comparison chain (`1 <= nums.length <= 10^5`), big-O (`O(n log n)`),
 *      and an indexed name (`nums[i]`). Arithmetic operators are excluded on
 *      purpose — "in-place" would match `a - b` and every hyphenated word in
 *      the sheet would turn into a chip.
 *
 * Verified against every problemStatement and constraint in dsaQuestions.ts:
 * it chips the constraint lines and `nums[i]`-style mentions, and leaves
 * sentences like "Given an m x n integer matrix" completely alone.
 */

/** A name, optionally dotted and/or indexed: `matrix[0].length`, `nums[i][j]`. */
const IDENT = String.raw`[A-Za-z_]\w*(?:\.\w+|\[[^\]\n]*\])*`;
const NUM = String.raw`-?\d+(?:\^\d+)?`;
const OPERAND = `(?:${IDENT}|${NUM})`;
/** `m, n` in `1 <= m, n <= 200`. Only legal before a comparison — otherwise
 *  "nums[i] > 0, break" would swallow the ", break". */
const LIST = `${OPERAND}(?:\\s*,\\s*${OPERAND})*`;
const CMP = String.raw`\s*(?:<=|>=|==|!=|<|>)\s*`;
/** Trailing `- 1` of `2^31 - 1`: an arithmetic tail is only read INSIDE a chain. */
const CHAIN = `(?:${LIST}${CMP})+${OPERAND}(?:\\s*[-+]\\s*\\d+)?`;
const BIG_O = String.raw`O\([^)\n]{1,24}\)`;
const INDEXED = String.raw`[A-Za-z_]\w*(?:\.\w+)*\[[^\]\n]*\]`;

const CODE_RE = new RegExp(`\`([^\`\n]+)\`|(?:${CHAIN}|${BIG_O}|${INDEXED})`, 'g');

export const CodeText: React.FC<{ text: string }> = ({ text }) => {
  const parts = useMemo(() => {
    const out: React.ReactNode[] = [];
    let last = 0;
    let key = 0;
    for (const m of text.matchAll(CODE_RE)) {
      const at = m.index ?? 0;
      if (at > last) out.push(text.slice(last, at));
      out.push(
        <code key={key++} className="inline-code">
          {m[1] ?? m[0]}
        </code>,
      );
      last = at + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  }, [text]);

  return <>{parts}</>;
};
