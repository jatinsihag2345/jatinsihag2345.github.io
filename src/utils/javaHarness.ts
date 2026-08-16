/**
 * Makes a LeetCode-shaped Java solution into a program a JVM will actually accept.
 *
 * The ports in dsaCodeTranslations.json are written the way LeetCode hands them to
 * you: an instance method on a non-public `class Solution`, no imports, and any
 * `ListNode` / `TreeNode` / `Job` it needs merely DESCRIBED in a javadoc comment
 * rather than declared. That is three separate reasons javac rejects the text
 * verbatim, and a fourth — no `main` — why the JVM would have nothing to start.
 *
 * So this module assembles a whole compilation unit around the port: imports, the
 * missing types, the port itself, and a `public class Main` whose `main` body the
 * learner owns. It is the direct counterpart of pythonRunner.ts's PREAMBLE, which
 * pre-defines ListNode/TreeNode/Node for the same reason.
 *
 * Everything here is pure string work on purpose — it can be (and was) verified by
 * feeding its output to a real javac, with no browser involved.
 *
 * What it deliberately does NOT do is guess arguments silently. `suggestMainBody`
 * produces a best-effort call seeded from the question's own worked example, and the
 * UI puts that in an editable box. A wrong guess the learner can see and fix beats a
 * hidden one that produces a baffling failure.
 */

export interface JavaParam {
  type: string;
  name: string;
}

/** The method a harness should call: the first `public` method, and its owning class. */
export interface JavaEntry {
  className: string;
  method: string;
  returnType: string;
  params: JavaParam[];
  /** What that class's constructor wants — empty for the usual `new Solution()`. */
  ctorParams: JavaParam[];
}

/** Which generated helpers are legal to reference from the main body. */
export interface HarnessCaps {
  listNode: boolean;
  treeNode: boolean;
}

/* ---- source scanning ----------------------------------------------------------------
   Every scanner below runs against a comment- and literal-blanked copy of the source,
   so a `class Foo` that exists only inside a javadoc (which is exactly how these ports
   document ListNode) can never be mistaken for a real declaration. Blanking preserves
   length and newlines, so indices and line numbers still line up with the original. */

const blankNonCode = (src: string): string => {
  const out = src.split('');
  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  let i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === '//') {
      const nl = src.indexOf('\n', i);
      const end = nl === -1 ? src.length : nl;
      blank(i, end);
      i = end;
    } else if (two === '/*') {
      const close = src.indexOf('*/', i + 2);
      const end = close === -1 ? src.length : close + 2;
      blank(i, end);
      i = end;
    } else if (src[i] === '"' || src[i] === "'") {
      const quote = src[i];
      let j = i + 1;
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\') j++;
        j++;
      }
      blank(i + 1, j);
      i = Math.min(j + 1, src.length);
    } else {
      i++;
    }
  }
  return out.join('');
};

const MODIFIERS = '(?:public\\s+|private\\s+|protected\\s+|static\\s+|final\\s+|abstract\\s+)*';

const declaresType = (blanked: string, name: string): boolean =>
  new RegExp(`\\b(?:class|interface|enum|record)\\s+${name}\\b`).test(blanked);

const mentions = (blanked: string, name: string): boolean =>
  new RegExp(`\\b${name}\\b`).test(blanked);

/** `class Name { … }` including the braces, brace-counted from the declaration. */
const sliceClass = (text: string, name: string): string | null => {
  const decl = new RegExp(`(?:^|\\n)[ \\t]*${MODIFIERS}class\\s+${name}\\b`).exec(text);
  if (!decl) return null;
  const start = text.indexOf('class', decl.index);
  const open = text.indexOf('{', start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
};

const commentBlocks = (src: string): string[] => src.match(/\/\*[\s\S]*?\*\//g) ?? [];

/** Strip a javadoc's `/**`, `*​/` and per-line ` * ` so the code inside compiles. */
const uncomment = (block: string): string =>
  block
    .replace(/^\/\*+/, '')
    .replace(/\*+\/$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*+ ?/, ''))
    .join('\n');

/**
 * The two shapes every tree/list question shares, as supersets of every javadoc
 * variant in the data (some document only `TreeNode(int x)`, others all three
 * constructors) — a superset compiles against all of them. Exotic types get their
 * javadoc definition instead, because those genuinely differ per question: `Node`
 * means `{data, next, bottom}` in one and `{val, next, random}` in the next.
 */
const CANONICAL: Record<string, string> = {
  ListNode: `class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}`,
  TreeNode: `class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}`,
};

/** Types the port uses but never declares — LeetCode supplies these; here we must. */
const supportTypes = (source: string): { defs: string[]; caps: HarnessCaps } => {
  const blanked = blankNonCode(source);
  const candidates = new Set<string>(['ListNode', 'TreeNode']);
  for (const block of commentBlocks(source)) {
    for (const m of uncomment(block).matchAll(/\bclass\s+([A-Z]\w*)\b/g)) candidates.add(m[1]);
  }

  const defs: string[] = [];
  const caps: HarnessCaps = { listNode: false, treeNode: false };
  for (const name of candidates) {
    if (declaresType(blanked, name) || !mentions(blanked, name)) continue;
    // Annotated: CANONICAL is Record<string, string>, so inference alone would type
    // this `string` and reject the comment-recovery fallback assigned just below.
    let def: string | null = CANONICAL[name] ?? null;
    if (!def) {
      for (const block of commentBlocks(source)) {
        def = sliceClass(uncomment(block), name);
        if (def) break;
      }
    }
    if (!def) continue; // nothing to recover — javac will name it, honestly, in the error
    if (name === 'ListNode') caps.listNode = true;
    if (name === 'TreeNode') caps.treeNode = true;
    defs.push(def);
  }
  return { defs, caps };
};

/* ---- reading the entry point --------------------------------------------------------- */

/** One level of generic nesting is enough for this data (`List<List<Integer>>`). */
const TYPE = '[A-Za-z_][\\w.$]*(?:\\s*<[^()<>]*(?:<[^()<>]*>[^()<>]*)*>)?(?:\\s*\\[\\s*\\])*';
const METHOD_RE = new RegExp(`\\bpublic\\s+(${TYPE})\\s+([a-zA-Z_]\\w*)\\s*\\(([^)]*)\\)\\s*\\{`);

/** Split a parameter list on commas that are not inside generics. */
const splitParams = (list: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === '<') depth++;
    else if (c === '>') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map(p => p.trim()).filter(Boolean);
};

const tidy = (type: string): string => type.replace(/\s+/g, '').replace(/,/g, ', ');

const readParams = (list: string): JavaParam[] | null => {
  const params: JavaParam[] = [];
  for (const raw of splitParams(list)) {
    const words = raw.split(/\s+/);
    const name = words.pop();
    if (!name || words.length === 0) return null; // varargs/annotations: not worth guessing
    params.push({ type: tidy(words.join(' ')), name });
  }
  return params;
};

export const readJavaEntry = (source: string): JavaEntry | null => {
  const blanked = blankNonCode(source);
  const method = METHOD_RE.exec(blanked);
  if (!method || method[2] === 'main') return null;

  // The entry class is the one the method sits in, not simply the first declared: the
  // design questions (LRU cache, LFU cache) put a plain data `class Node` above the
  // class that actually carries the API. Column 0 only — a nested `static class Pair`
  // is not something `main` could name, let alone instantiate.
  const classes = [
    ...blanked.matchAll(new RegExp(`(?:^|\\n)${MODIFIERS}class\\s+([A-Z]\\w*)`, 'g')),
  ];
  const owner = classes.filter(c => c.index < method.index).pop();
  if (!owner) return null;
  const className = owner[1];

  const params = readParams(method[3]);
  if (!params) return null;

  // Design questions are constructed with arguments (`new LFUCache(capacity)`), so a
  // bare `new X()` would not even compile. Prefer a no-arg constructor when one exists.
  const ctors = [
    ...blanked.matchAll(new RegExp(`\\bpublic\\s+${className}\\s*\\(([^)]*)\\)\\s*\\{`, 'g')),
  ].map(c => readParams(c[1]) ?? []);
  const ctorParams = ctors.find(c => c.length === 0) ?? ctors[0] ?? [];

  return { className, method: method[2], returnType: tidy(method[1]), params, ctorParams };
};

/* ---- turning a worked example into Java arguments ------------------------------------- */

/** Bracket/quote depth before `idx`, so `a = [1, b = 2]` cannot be read as two names. */
const depthAt = (s: string, idx: number): number => {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < idx; i++) {
    const c = s[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if ('[({'.includes(c)) depth++;
    else if ('])}'.includes(c)) depth--;
  }
  return quote ? 1 : depth;
};

/** `nums = [2,7,11,15], target = 9` -> { nums: '[2,7,11,15]', target: '9' }. */
export const parseExampleInput = (input: string): Record<string, string> => {
  const re = /([A-Za-z_]\w*)\s*(?:\[\s*\])?\s*=(?!=)\s*/g;
  const hits: { name: string; at: number; valueAt: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (depthAt(input, m.index) === 0) hits.push({ name: m[1], at: m.index, valueAt: re.lastIndex });
  }
  const out: Record<string, string> = {};
  hits.forEach((hit, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].at : input.length;
    out[hit.name] = clipValue(input.slice(hit.valueAt, end).trim().replace(/,$/, '').trim());
  });
  return out;
};

/** Several examples append prose to a literal — `graph = [[1,3],[0,2]]  (a 4-cycle)`.
 *  Keep the bracketed value and drop whatever follows it. */
const clipValue = (raw: string): string => {
  if (!raw.startsWith('[')) return raw;
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '[') depth++;
    else if (raw[i] === ']' && --depth === 0) return raw.slice(0, i + 1);
  }
  return raw;
};

/** `[[1,2],[3]]` -> ['[1,2]', '[3]']; not a bracketed list -> null. */
const splitList = (raw: string): string[] | null => {
  const s = raw.trim();
  if (!s.startsWith('[') || !s.endsWith(']')) return null;
  const inner = s.slice(1, -1).trim();
  if (inner === '') return [];
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let quote: string | null = null;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if ('[({'.includes(c)) depth++;
    else if ('])}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(inner.slice(start).trim());
  return parts;
};

const isInt = (s: string) => /^-?\d+$/.test(s);
const isNum = (s: string) => /^-?\d+(?:\.\d+)?$/.test(s);
const isQuoted = (s: string) => /^(['"]).*\1$/s.test(s);
const unquote = (s: string) => (isQuoted(s) ? s.slice(1, -1) : s);
const str = (s: string) => JSON.stringify(unquote(s));
const chr = (s: string) => `'${unquote(s).slice(0, 1) || 'a'}'`;

/**
 * `[[1,2],[3,4]]` as a Java array literal of any rank, or null if a single cell does
 * not convert. Recursive so `int[][][]` (Dijkstra's weighted adjacency list) works for
 * free rather than needing a case of its own.
 */
const arrayLiteral = (
  base: string,
  rank: number,
  raw: string,
  cell: (s: string) => string | null,
): string | null => {
  const build = (depth: number, text: string): string | null => {
    const items = splitList(text);
    if (!items) return null;
    const parts = items.map(item => (depth === 1 ? cell(item) : build(depth - 1, item)));
    return parts.every((p): p is string => p !== null) ? `{${parts.join(', ')}}` : null;
  };
  const body = build(rank, raw);
  return body === null ? null : `new ${base}${'[]'.repeat(rank)}${body}`;
};

/** A worked example's literal, rendered as Java of the parameter's type. null = no fit. */
const fromExample = (type: string, raw: string, caps: HarnessCaps): string | null => {
  const items = splitList(raw);
  const intCell = (s: string) => (isInt(s) ? s : null);
  switch (type) {
    case 'int':
    case 'short':
      return isInt(raw) ? raw : null;
    case 'long':
      return isInt(raw) ? `${raw}L` : null;
    case 'double':
    case 'float':
      return isNum(raw) ? raw : null;
    case 'boolean':
      return /^(true|false)$/i.test(raw) ? raw.toLowerCase() : null;
    case 'char':
      return unquote(raw).length === 1 ? chr(raw) : null;
    // A quoted literal is already unambiguous, brackets and all — `s = "()[]{}"` is a
    // string, not a list. Only bare text has to be bracket-checked to keep `[1,2]`
    // from being handed to a String parameter.
    case 'String':
      return isQuoted(raw) || !raw.includes('[') ? str(raw) : null;
    case 'int[]':
      return arrayLiteral('int', 1, raw, intCell);
    case 'int[][]':
      return arrayLiteral('int', 2, raw, intCell);
    case 'int[][][]':
      return arrayLiteral('int', 3, raw, intCell);
    case 'String[]':
      return arrayLiteral('String', 1, raw, s => (isQuoted(s) || !s.includes('[') ? str(s) : null));
    case 'char[]':
      return arrayLiteral('char', 1, raw, s => (unquote(s).length === 1 ? chr(s) : null));
    case 'char[][]':
      return arrayLiteral('char', 2, raw, s => (unquote(s).length === 1 ? chr(s) : null));
    case 'List<Integer>':
      return items && items.every(isInt)
        ? `new ArrayList<>(Arrays.asList(${items.join(', ')}))`
        : null;
    case 'List<String>':
      return items ? `new ArrayList<>(Arrays.asList(${items.map(str).join(', ')}))` : null;
    case 'List<List<Integer>>': {
      const rows = items?.map(splitList);
      return rows && rows.every(r => !!r && r.every(isInt))
        ? `new ArrayList<>(Arrays.asList(${rows
            .map(r => `new ArrayList<>(Arrays.asList(${r!.join(', ')}))`)
            .join(', ')}))`
        : null;
    }
    case 'ListNode':
      return caps.listNode && items && items.length > 0 && items.every(isInt)
        ? `list(${items.join(', ')})`
        : null;
    case 'ListNode[]': {
      // `lists = [[1,4,5], [1,3,4]]` — merge-k-lists hands over a list of lists.
      const rows = caps.listNode ? items?.map(splitList) : undefined;
      return rows && rows.length > 0 && rows.every(r => !!r && r.length > 0 && r.every(isInt))
        ? `new ListNode[]{${rows.map(r => `list(${r!.join(', ')})`).join(', ')}}`
        : null;
    }
    case 'TreeNode':
      return caps.treeNode && items && items.length > 0 && isInt(items[0])
        ? `tree(${items.map(v => (v === 'null' ? 'null' : isInt(v) ? v : 'null')).join(', ')})`
        : null;
    default: {
      // Arrays of a question-specific type — the examples spell those out as
      // `arr = [Item(60, 10), Item(100, 20)]`, one `new` away from being Java.
      const rank = type.match(/\[\s*\]/g)?.length ?? 0;
      if (rank === 0) return null;
      return arrayLiteral(type.slice(0, type.indexOf('[')), rank, raw, s =>
        /^[A-Z]\w*\s*\(.*\)$/s.test(s) ? `new ${s}` : null,
      );
    }
  }
};

/** Something of the right type to get a first run off the ground. */
const placeholder = (type: string, caps: HarnessCaps): string => {
  switch (type) {
    case 'int':
    case 'short':
      return '5';
    case 'long':
      return '5L';
    case 'double':
    case 'float':
      return '2.5';
    case 'boolean':
      return 'true';
    case 'char':
      return "'a'";
    case 'String':
      return '"abcabcbb"';
    case 'int[]':
      return 'new int[]{2, 7, 11, 15}';
    case 'int[][]':
      return 'new int[][]{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}';
    case 'char[][]':
      return "new char[][]{{'a', 'b'}, {'c', 'd'}}";
    case 'String[]':
      return 'new String[]{"eat", "tea", "tan"}';
    case 'List<Integer>':
      return 'new ArrayList<>(Arrays.asList(1, 2, 3))';
    case 'List<String>':
      return 'new ArrayList<>(Arrays.asList("a", "b"))';
    case 'List<List<Integer>>':
      return 'new ArrayList<>(Arrays.asList(new ArrayList<>(Arrays.asList(1, 2)), new ArrayList<>(Arrays.asList(3))))';
    case 'ListNode':
      return caps.listNode ? 'list(1, 2, 3, 4, 5)' : 'null';
    case 'ListNode[]':
      return caps.listNode ? 'new ListNode[]{list(1, 4, 5), list(1, 3, 4), list(2, 6)}' : 'new ListNode[0]';
    case 'TreeNode':
      return caps.treeNode ? 'tree(3, 9, 20, null, null, 15, 7)' : 'null';
    default: {
      // An empty array still runs; a bare `null` at least fails somewhere legible.
      const dims = type.match(/\[\s*\]/g)?.length ?? 0;
      if (dims === 0) return 'null';
      return `new ${type.slice(0, type.indexOf('['))}[0]${'[]'.repeat(dims - 1)}`;
    }
  }
};

/** How to make a value readable — arrays print as `[I@1b6d` without help. */
const show = (type: string, expr: string, caps: HarnessCaps): string => {
  if (/\[\s*\]\s*\[\s*\]$/.test(type)) return `Arrays.deepToString(${expr})`;
  if (/\[\s*\]$/.test(type)) return `Arrays.toString(${expr})`;
  if (type === 'ListNode' && caps.listNode) return `show(${expr})`;
  if (type === 'TreeNode' && caps.treeNode) return `show(${expr})`;
  return expr;
};

const MUTABLE = (type: string) => /\[\s*\]$/.test(type) || type.startsWith('List<');

/**
 * A `main` body that calls the solution once and prints what came back, seeded from
 * the question's first worked example wherever a literal fits the parameter's type.
 * Anything that does not fit gets a placeholder and a TODO the learner can see.
 */
export const suggestMainBody = (
  source: string,
  examples?: { input: string; output?: string }[],
): string => {
  const entry = readJavaEntry(source);
  const { caps } = supportTypes(source);
  if (!entry) {
    return '// Could not read a method signature out of this class.\n' +
      '// Construct it yourself and print the result, e.g.\n' +
      '//   Solution s = new Solution();\n' +
      '//   System.out.println(s.someMethod(...));';
  }

  const example = examples?.[0];
  const given = Object.entries(example ? parseExampleInput(example.input) : {});
  const lines: string[] = [];

  /**
   * Match every parameter to a value from the worked example, by name first and only
   * then by position.
   *
   * The two passes are the whole point. 0/1 Knapsack is `knapsack(int W, int[] wt,
   * int[] val)` against an example reading `values = […], weights = […], W = 50`: a
   * single left-to-right pass lets `wt` grab `values` before `val` — which is a name
   * match — ever gets a turn, and the run then prints a confident, silently wrong 0.
   * Claiming the named matches first leaves `weights` as the only value `wt` can take.
   */
  const matchAll = (all: JavaParam[]): { fits: (string | null)[]; unused: string[] } => {
    const out: (string | null)[] = all.map(() => null);
    const claimed = new Set<number>();

    const take = (slot: number, p: JavaParam, i: number): boolean => {
      const fitted = fromExample(p.type, given[i][1], caps);
      if (!fitted) return false;
      claimed.add(i);
      out[slot] = fitted;
      return true;
    };

    // Prefix either way, so `val` finds `values` and `nums` finds `numsArray`. Two
    // characters minimum: a one-letter `n` would otherwise "match" every name it starts.
    const alike = (a: string, b: string) => {
      const [x, y] = [a.toLowerCase(), b.toLowerCase()];
      if (x === y) return true;
      const short = x.length < y.length ? x : y;
      return short.length >= 2 && (x.startsWith(y) || y.startsWith(x));
    };

    all.forEach((p, slot) => {
      const hit = given.findIndex(([n], i) => !claimed.has(i) && alike(n, p.name));
      if (hit !== -1) take(slot, p, hit);
    });
    // Names drift between the prose and the port (`AdjList` in the example, `adj` in
    // the signature), so anything still unmatched takes the first unclaimed value that
    // fits its TYPE, left to right.
    all.forEach((p, slot) => {
      if (out[slot] !== null) return;
      for (let i = 0; i < given.length; i++) {
        if (!claimed.has(i) && take(slot, p, i)) return;
      }
    });
    return { fits: out, unused: given.filter((_, i) => !claimed.has(i)).map(([n]) => n) };
  };

  // Constructor and method parameters compete for the same worked example, so they are
  // matched together — `new LFUCache(capacity)` must not lose `capacity` to a later
  // `int key`, nor claim a value the method's own parameter is named for.
  const { fits, unused } = matchAll([...entry.ctorParams, ...entry.params]);
  const ctorFits = fits.slice(0, entry.ctorParams.length);
  const paramFits = fits.slice(entry.ctorParams.length);

  if (example) lines.push(`// Example: ${example.input.replace(/\n/g, ' ')}`);
  // A value the example spells out but no parameter takes is the tell that the example
  // encodes structure this harness cannot build — `pos = 1` means the list's tail loops
  // back, and a plain `list(3,2,0,-4)` has no cycle, so `hasCycle` would answer a
  // confident, wrong `false`. Naming what was dropped is the difference between a
  // result the learner can trust and one that quietly misleads.
  if (unused.length) {
    lines.push(
      `// Note: the example also sets ${unused.map(n => `\`${n}\``).join(', ')}, which nothing below uses —` +
      ' build that part by hand (a cycle, a shared node, a target reference) or the answer will not match.',
    );
  }
  const ctorArgs = entry.ctorParams.map((p, i) => ctorFits[i] ?? placeholder(p.type, caps));
  lines.push(`${entry.className} sol = new ${entry.className}(${ctorArgs.join(', ')});`);

  const sized: JavaParam[] = [];
  entry.params.forEach((p, i) => {
    if (paramFits[i]) {
      lines.push(`${p.type} ${p.name} = ${paramFits[i]};`);
      if (MUTABLE(p.type)) sized.push(p);
      return;
    }
    // These ports keep the GeeksforGeeks convention of passing a collection's own
    // length alongside it, and the worked examples never spell that out — so derive it
    // from the value already declared above rather than inventing an unrelated number.
    const counted = /^(n|N|size|len|length)$/.test(p.name) ? sized[sized.length - 1] : undefined;
    if (counted && (p.type === 'int' || p.type === 'long')) {
      lines.push(`${p.type} ${p.name} = ${counted.name}${counted.type.startsWith('List<') ? '.size()' : '.length'};`);
      return;
    }
    lines.push(`// TODO: nothing in the example fits \`${p.type} ${p.name}\` — check this value`);
    lines.push(`${p.type} ${p.name} = ${placeholder(p.type, caps)};`);
  });

  const call = `sol.${entry.method}(${entry.params.map(p => p.name).join(', ')})`;
  if (entry.returnType === 'void') {
    lines.push(`${call};`);
    const mutated = entry.params.find(p => MUTABLE(p.type));
    lines.push(
      mutated
        ? `System.out.println(${show(mutated.type, mutated.name, caps)}); // ${mutated.name} was changed in place`
        : 'System.out.println("(this method returns void — print what it changed)");',
    );
  } else {
    lines.push(`${entry.returnType} out = ${call};`);
    lines.push(`System.out.println(${show(entry.returnType, 'out', caps)});`);
  }
  if (example?.output) lines.push(`// Expected: ${example.output.replace(/\n/g, ' ')}`);

  return lines.join('\n');
};

/* ---- assembling the compilation unit --------------------------------------------------- */

const LIST_HELPERS = `    /** ints -> a singly linked list, the shape LeetCode's \`[1,2,3]\` means. */
    static ListNode list(int... xs) {
        ListNode head = null, tail = null;
        for (int x : xs) {
            ListNode node = new ListNode(x);
            if (head == null) head = node; else tail.next = node;
            tail = node;
        }
        return head;
    }

    static String show(ListNode head) {
        StringBuilder sb = new StringBuilder("[");
        for (ListNode cur = head; cur != null; cur = cur.next) {
            if (cur != head) sb.append(", ");
            sb.append(cur.val);
        }
        return sb.append("]").toString();
    }`;

const TREE_HELPERS = `    /** LeetCode level-order (nulls allowed) -> a binary tree. */
    static TreeNode tree(Integer... xs) {
        if (xs.length == 0 || xs[0] == null) return null;
        TreeNode root = new TreeNode(xs[0]);
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < xs.length) {
            TreeNode cur = queue.poll();
            if (i < xs.length && xs[i] != null) { cur.left = new TreeNode(xs[i]); queue.add(cur.left); }
            i++;
            if (i < xs.length && xs[i] != null) { cur.right = new TreeNode(xs[i]); queue.add(cur.right); }
            i++;
        }
        return root;
    }

    /** Level-order back out again, trailing nulls trimmed — same notation as the input. */
    static String show(TreeNode root) {
        List<String> out = new ArrayList<>();
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            TreeNode cur = queue.poll();
            if (cur == null) { out.add("null"); continue; }
            out.add(String.valueOf(cur.val));
            queue.add(cur.left);
            queue.add(cur.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return out.toString();
    }`;

/** javac allows exactly one public class per file, and it must be Main here. */
const demotePublicClasses = (source: string): string =>
  source.replace(/(^|\n)([ \t]*)public(\s+(?:final\s+|abstract\s+)*(?:class|interface|enum|record)\s)/g, '$1$2$3');

const indent = (body: string, pad: string): string =>
  body.split('\n').map(line => (line.trim() === '' ? '' : pad + line)).join('\n');

/**
 * The exact text handed to javac: imports, any type the port only documents in a
 * comment, the port itself, and a Main wrapping the learner's `main` body.
 *
 * Shown verbatim in the UI rather than hidden, because javac reports errors by line
 * number and a line number into a program you cannot see is not a diagnostic.
 */
export const buildJavaProgram = (source: string, mainBody: string): string => {
  const { defs, caps } = supportTypes(source);
  const helpers = [caps.listNode ? LIST_HELPERS : '', caps.treeNode ? TREE_HELPERS : '']
    .filter(Boolean)
    .join('\n\n');

  return [
    'import java.util.*;',
    '',
    ...(defs.length ? [defs.join('\n\n'), ''] : []),
    demotePublicClasses(source).trim(),
    '',
    'public class Main {',
    '    public static void main(String[] args) throws Exception {',
    indent(mainBody.trim(), '        '),
    '    }',
    ...(helpers ? ['', helpers] : []),
    '}',
    '',
  ].join('\n');
};

/** Report a compile error against the assembled program, since that is what javac saw. */
export const harnessCaps = (source: string): HarnessCaps => supportTypes(source).caps;
