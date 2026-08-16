/**
 * Runs a learner's SQL against the question's own sample data, in the browser.
 *
 * The site's answers are written in MySQL, because that is what LeetCode grades. The
 * engine here is SQLite (sql.js), so the gap has to be handled honestly rather than
 * papered over: functions MySQL has and SQLite lacks are registered as shims, and the
 * handful of pure SYNTAX differences are detected and reported as "cannot run here"
 * instead of being shown to the learner as a mistake they made.
 */
import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';
// Vite resolves this to a real URL and copies the file into the build.
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

export interface SqlTable {
  tableName: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export interface SqlRunResult {
  ok: boolean;
  headers: string[];
  rows: (string | number | null)[][];
  error?: string;
  /** Set when the query is valid MySQL that SQLite simply cannot parse. */
  unsupportedDialect?: boolean;
  elapsedMs: number;
}

export interface SqlCheckResult extends SqlRunResult {
  matches?: boolean;
  /** Human-readable reason the comparison failed, when it did. */
  mismatch?: string;
}

/**
 * MySQL constructs with no SQLite equivalent at the GRAMMAR level — a shim function
 * cannot rescue these, so we refuse to run rather than blame the learner.
 */
const MYSQL_ONLY_SYNTAX =
  /\bINTERVAL\s+\d+\s+(DAY|MONTH|YEAR)\b|\bSEPARATOR\b|\bDELETE\s+\w+\s+FROM\b|\bRLIKE\b|UNION\s+(ALL\s+)?\(/im;

let sqlPromise: Promise<SqlJsStatic> | null = null;

/** The ~1 MB WASM engine is fetched once and reused for every subsequent run. */
export const loadSqlEngine = (): Promise<SqlJsStatic> => {
  if (!sqlPromise) {
    // On failure, forget the promise so the next Run retries instead of failing forever.
    sqlPromise = initSqlJs({ locateFile: () => wasmUrl }).catch(err => {
      sqlPromise = null;
      throw err;
    });
  }
  return sqlPromise;
};

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  const d = new Date(String(value).slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Teach SQLite the MySQL functions these questions actually use. */
const installMysqlShims = (db: Database) => {
  const fn = (name: string, arity: number, impl: (...args: any[]) => any) => {
    try {
      // sql.js types the callback loosely; the runtime accepts an arity-checked function.
      (db as any).create_function(name, impl);
    } catch {
      /* a shim failing to register must never break the run */
    }
    void arity;
    void name;
  };

  fn('CHAR_LENGTH', 1, (s: any) => (s === null ? null : String(s).length));
  fn('DATEDIFF', 2, (a: any, b: any) => {
    const da = toDate(a);
    const db_ = toDate(b);
    if (!da || !db_) return null;
    return Math.round((da.getTime() - db_.getTime()) / 86_400_000);
  });
  fn('DATE_FORMAT', 2, (value: any, fmt: any) => {
    const d = toDate(value);
    if (!d) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    // One global pass so repeated specifiers all substitute; unknown ones pass through.
    const map: Record<string, string> = {
      '%Y': String(d.getUTCFullYear()),
      '%y': String(d.getUTCFullYear() % 100).padStart(2, '0'),
      '%m': pad(d.getUTCMonth() + 1),
      '%d': pad(d.getUTCDate()),
    };
    return String(fmt).replace(/%[A-Za-z%]/g, tok => map[tok] ?? tok);
  });
  // The cheap-but-common MySQL functions SQLite lacks — each one line, each saving a
  // "no such function" error on a query that is perfectly correct MySQL.
  fn('YEAR', 1, (v: any) => { const d = toDate(v); return d ? d.getUTCFullYear() : null; });
  fn('MONTH', 1, (v: any) => { const d = toDate(v); return d ? d.getUTCMonth() + 1 : null; });
  fn('DAY', 1, (v: any) => { const d = toDate(v); return d ? d.getUTCDate() : null; });
  fn('IF', 3, (cond: any, a: any, b: any) => (cond ? a : b));
  fn('LOCATE', 2, (needle: any, hay: any) =>
    needle === null || hay === null ? null : String(hay).indexOf(String(needle)) + 1);
  fn('LEFT', 2, (v: any, n: any) => (v === null ? null : String(v).slice(0, Number(n))));
  fn('RIGHT', 2, (v: any, n: any) => (v === null ? null : Number(n) === 0 ? '' : String(v).slice(-Number(n))));
  fn('REGEXP', 2, (pattern: any, s: any) => {
    if (s === null || pattern === null) return 0;
    try {
      return new RegExp(String(pattern)).test(String(s)) ? 1 : 0;
    } catch {
      return 0;
    }
  });
};

/** Build a fresh in-memory database from a question's sample tables. */
export const buildDatabase = async (tables: SqlTable[]): Promise<Database> => {
  const SQL = await loadSqlEngine();
  const db = new SQL.Database();
  for (const t of tables || []) {
    if (!t?.tableName || !t.headers?.length) continue;
    const cols = t.headers.map(h => `"${h}"`).join(', ');
    db.run(`CREATE TABLE "${t.tableName}" (${cols});`);
    const placeholders = t.headers.map(() => '?').join(',');
    const stmt = db.prepare(`INSERT INTO "${t.tableName}" VALUES (${placeholders});`);
    for (const row of t.rows || []) {
      if (row.length !== t.headers.length) continue;
      stmt.run(row as any);
    }
    stmt.free();
  }
  installMysqlShims(db);
  return db;
};

export const runQuery = async (query: string, tables: SqlTable[]): Promise<SqlRunResult> => {
  const started = performance.now();
  const blank = { headers: [], rows: [] as (string | number | null)[][] };

  if (!query.trim()) {
    return { ok: false, ...blank, error: 'Write a query first.', elapsedMs: 0 };
  }
  if (MYSQL_ONLY_SYNTAX.test(query)) {
    return {
      ok: false,
      ...blank,
      unsupportedDialect: true,
      error:
        'This uses MySQL-only syntax (INTERVAL n DAY, SEPARATOR, parenthesised UNION, ' +
        'or multi-table DELETE). It is correct for LeetCode, but the in-browser engine ' +
        'is SQLite and cannot parse it — run it on LeetCode instead.',
      elapsedMs: performance.now() - started,
    };
  }

  let db: Database | null = null;
  try {
    db = await buildDatabase(tables);
    const results = db.exec(query);
    // A query with no result set (or no rows) is legitimate, not an error.
    const first = results[0];
    return {
      ok: true,
      headers: first ? first.columns : [],
      rows: first ? (first.values as (string | number | null)[][]) : [],
      elapsedMs: performance.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      ...blank,
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: performance.now() - started,
    };
  } finally {
    db?.close();
  }
};

// Cells are joined with a control character no real data contains — joining with ''
// would make ["ab","c"] and ["a","bc"] indistinguishable and pass wrong answers.
const CELL_SEP = '\u0001';

const normCell = (c: string | number | null | undefined): string => {
  if (c === null || c === undefined) return '∅';
  // 100 and 100.00 are the same answer; MySQL and SQLite just print them differently.
  // Applied to real numbers and PLAIN decimal strings only — '0123' and '1e2' are text
  // that merely looks numeric, and collapsing them would equate distinct answers.
  if (typeof c === 'number') return String(Number(c.toFixed(4)));
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(c)) return String(Number(Number(c).toFixed(4)));
  return String(c);
};

const normRow = (r: (string | number | null)[]) => r.map(normCell).join(CELL_SEP);
const norm = (rows: (string | number | null)[][]) => rows.map(normRow).sort();

/**
 * Run the learner's query and say whether it produced the right answer.
 *
 * Row ORDER is only enforced when the query itself sorts — otherwise SQL makes no
 * ordering promise and marking an unordered result wrong would be teaching a lie.
 */
export const checkQuery = async (
  query: string,
  tables: SqlTable[],
  expected: SqlTable,
): Promise<SqlCheckResult> => {
  // Mutation questions (Delete Duplicate Emails) are graded on the TABLE AFTER the
  // statement, not on a result set — a correct DELETE returns no rows and would be
  // failed as "0 rows". Run the mutation, then read the table it touched.
  const mutation = query.match(/^\s*(?:DELETE\s+FROM|UPDATE|INSERT\s+INTO)\s+`?"?(\w+)/i);
  if (mutation) {
    const started = performance.now();
    if (MYSQL_ONLY_SYNTAX.test(query)) {
      return await runQuery(query, tables); // reuse its honest dialect message
    }
    let db: Database | null = null;
    try {
      db = await buildDatabase(tables);
      db.run(query);
      const table = mutation[1];
      const cur = db.exec(`SELECT * FROM "${table}"`)[0];
      const result: SqlRunResult = {
        ok: true,
        headers: cur ? cur.columns : [],
        rows: cur ? (cur.values as (string | number | null)[][]) : [],
        elapsedMs: performance.now() - started,
      };
      const gotRows = norm(result.rows);
      const wantRows = norm(expected?.rows || []);
      const matches =
        gotRows.length === wantRows.length && gotRows.every((r, i) => r === wantRows[i]);
      return {
        ...result,
        matches,
        mismatch: matches
          ? undefined
          : `After your statement, ${table} has ${result.rows.length} row${result.rows.length === 1 ? '' : 's'} but ${expected?.rows?.length ?? 0} were expected.`,
      };
    } catch (err) {
      return {
        ok: false, headers: [], rows: [],
        error: err instanceof Error ? err.message : String(err),
        elapsedMs: performance.now() - started,
      };
    } finally {
      db?.close();
    }
  }

  const result = await runQuery(query, tables);
  if (!result.ok) return result;

  const expectedRows = expected?.rows || [];
  // Only an OUTERMOST ORDER BY promises row order. One inside OVER (...), a CTE or a
  // subquery does not — stripping parenthesised groups to a fixed point before testing
  // keeps a correct unordered answer from being failed on row position.
  let topLevel = query;
  for (let prev = ''; prev !== topLevel; ) {
    prev = topLevel;
    topLevel = topLevel.replace(/\([^()]*\)/g, ' ');
  }
  const ordered = /\border\s+by\b/i.test(topLevel);

  if ((expected?.headers?.length ?? 0) > 0 && result.headers.length !== expected.headers.length) {
    return {
      ...result,
      matches: false,
      mismatch: `Expected ${expected.headers.length} column${expected.headers.length === 1 ? '' : 's'} (${expected.headers.join(', ')}), got ${result.headers.length} (${result.headers.join(', ') || 'none'}).`,
    };
  }

  if (result.rows.length !== expectedRows.length) {
    return {
      ...result,
      matches: false,
      mismatch: `Expected ${expectedRows.length} row${expectedRows.length === 1 ? '' : 's'}, got ${result.rows.length}.`,
    };
  }

  const got = ordered ? result.rows.map(r => norm([r])[0]) : norm(result.rows);
  const want = ordered ? expectedRows.map(r => norm([r])[0]) : norm(expectedRows);

  const firstDiff = got.findIndex((r, i) => r !== want[i]);
  if (firstDiff !== -1) {
    return {
      ...result,
      matches: false,
      mismatch:
        `Row ${firstDiff + 1} differs — expected [${want[firstDiff].split(CELL_SEP).join(', ')}], ` +
        `got [${got[firstDiff].split(CELL_SEP).join(', ')}].` +
        (ordered ? ' (Your query has ORDER BY, so row order is being checked too.)' : ''),
    };
  }

  return { ...result, matches: true };
};

/**
 * Sandbox execution: the learner brings BOTH the schema and the query, so there is
 * no sample-table scaffolding and no expected answer to grade against. Builds an
 * empty database (MySQL shims included via buildDatabase), applies the schema, then
 * runs the query. Schema failures are prefixed so the error points the learner at
 * the right textarea.
 */
export const runFreeform = async (schemaSql: string, querySql: string): Promise<SqlRunResult> => {
  const started = performance.now();
  const blank = { headers: [], rows: [] as (string | number | null)[][] };

  if (!schemaSql.trim() && !querySql.trim()) {
    return { ok: false, ...blank, error: 'Write a schema (CREATE TABLE ...) and a query first.', elapsedMs: 0 };
  }
  if (MYSQL_ONLY_SYNTAX.test(schemaSql) || MYSQL_ONLY_SYNTAX.test(querySql)) {
    return {
      ok: false,
      ...blank,
      unsupportedDialect: true,
      error:
        'This uses MySQL-only syntax (INTERVAL n DAY, SEPARATOR, parenthesised UNION, ' +
        'or multi-table DELETE). The in-browser engine is SQLite and cannot parse it.',
      elapsedMs: performance.now() - started,
    };
  }

  let db: Database | null = null;
  try {
    db = await buildDatabase([]); // empty db — the schema text is the only source of tables
    if (schemaSql.trim()) {
      try {
        // db.run executes every statement in the text, in order — one call covers
        // the CREATE TABLEs and their INSERTs together.
        db.run(schemaSql);
      } catch (err) {
        return {
          ok: false,
          ...blank,
          error: `Schema error: ${err instanceof Error ? err.message : String(err)}`,
          elapsedMs: performance.now() - started,
        };
      }
    }
    if (!querySql.trim()) {
      // Schema alone is a legitimate run — "do my CREATE TABLEs parse?" is worth knowing.
      return { ok: true, ...blank, elapsedMs: performance.now() - started };
    }
    const results = db.exec(querySql);
    // Unlike runQuery (one graded SELECT), a sandbox query box often holds several
    // statements — show the LAST result set, the one the learner is building toward.
    const last = results[results.length - 1];
    return {
      ok: true,
      headers: last ? last.columns : [],
      rows: last ? (last.values as (string | number | null)[][]) : [],
      elapsedMs: performance.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      ...blank,
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: performance.now() - started,
    };
  } finally {
    db?.close();
  }
};

// ---- Error decoder --------------------------------------------------------------------
//
// SQLite's error strings are terse and assume you already know SQLite. The decoder maps
// the twelve messages learners actually hit to a plain-language cause plus the first
// thing worth trying. Order matters: specific messages sit above the near-"X" syntax
// catch-all, which would otherwise swallow them. Returning null is the honest default —
// a wrong guess about what went wrong is worse than showing only the raw error.

export interface SqlErrorHint {
  /** What the engine is actually complaining about, in plain words. */
  cause: string;
  /** The first thing worth trying. */
  fix: string;
}

const ERROR_DECODERS: { re: RegExp; hint: (m: RegExpMatchArray) => SqlErrorHint }[] = [
  {
    re: /no such column:\s*([\w."'`]+)/i,
    hint: m => ({
      cause: `The engine cannot find a column named ${m[1]} in any table this query can see.`,
      fix:
        `Check the spelling against the table definitions. If ${m[1]} is an alias you created in ` +
        `SELECT, it does not exist yet in WHERE — repeat the expression there, or filter in HAVING.`,
    }),
  },
  {
    re: /no such table:\s*([\w."'`]+)/i,
    hint: m => ({
      cause: `No table named ${m[1]} exists in this database.`,
      fix:
        `Check the spelling. In the sandbox, make sure its CREATE TABLE is in the schema box — ` +
        `the database is rebuilt from that text on every run, so nothing survives from earlier runs.`,
    }),
  },
  {
    re: /ambiguous column name:\s*([\w."'`]+)/i,
    hint: m => ({
      cause: `${m[1]} exists in more than one of the joined tables, and the engine refuses to guess which one you mean.`,
      fix: `Prefix it with the table's alias (t.${m[1]}) everywhere it appears — in SELECT, ON, WHERE, GROUP BY and ORDER BY.`,
    }),
  },
  {
    re: /GROUP BY clause is required before HAVING/i,
    hint: () => ({
      cause: 'HAVING filters groups, and this query never made any — there is no GROUP BY.',
      fix: 'Add a GROUP BY, or — if you are filtering plain rows rather than aggregates — the condition belongs in WHERE.',
    }),
  },
  {
    re: /misuse of aggregate/i,
    hint: () => ({
      cause: 'An aggregate (COUNT, SUM, MAX…) is being used where row-level values live — most often inside WHERE or a JOIN condition.',
      fix:
        'WHERE runs before groups exist, so it cannot see aggregates. Filter on them in HAVING ' +
        '(after GROUP BY), or compute the aggregate in a subquery and compare against that.',
    }),
  },
  {
    re: /no such function:\s*(\w+)/i,
    hint: m => ({
      cause: `${m[1]} is not a function this engine (SQLite) knows — it may be perfectly valid MySQL.`,
      fix:
        `Check the spelling first. If it is a MySQL function, use the SQLite equivalent ` +
        `(IFNULL, ||, strftime…) — or run the query on LeetCode, where the grader really is MySQL.`,
    }),
  },
  {
    re: /datatype mismatch/i,
    hint: () => ({
      cause: 'A value of one type was forced into a column that demands another — the classic case is text into an INTEGER PRIMARY KEY.',
      fix: 'Compare the INSERT values against the column types, in order. Quoted numbers are text; unquoted words are column references, not strings.',
    }),
  },
  {
    re: /UNIQUE constraint failed:\s*([\w.]+)/i,
    hint: m => ({
      cause: `An INSERT or UPDATE tried to put a duplicate value into ${m[1]}, which must be unique (a PRIMARY KEY or UNIQUE column).`,
      fix: 'A row already holds that value. Change the value, remove the old row first, or use INSERT OR IGNORE if "skip duplicates" is what you mean.',
    }),
  },
  {
    re: /NOT NULL constraint failed:\s*([\w.]+)/i,
    hint: m => ({
      cause: `A row arrived with no value for ${m[1]}, and that column forbids NULL.`,
      fix:
        'Supply the value, list the columns explicitly (INSERT INTO t (a, b) VALUES …) so ' +
        'positions cannot slip, or give the column a DEFAULT in the schema.',
    }),
  },
  {
    re: /(\d+)\s+values?\s+for\s+(\d+)\s+columns?|has\s+(\d+)\s+columns?\s+but\s+(\d+)\s+values?/i,
    hint: () => ({
      cause: 'An INSERT row does not have exactly one value per column — the counts disagree.',
      fix:
        'Count the commas: every parenthesised row must match the column list. Naming the ' +
        'columns (INSERT INTO t (a, b) VALUES …) turns silent position bugs into clear errors.',
    }),
  },
  {
    re: /incomplete input/i,
    hint: () => ({
      cause: 'The statement ended mid-sentence — usually an unclosed parenthesis or quote.',
      fix:
        "Count '(' against ')' and check every string has its closing quote. A missing " +
        'semicolon between two statements can also make them read as one broken one.',
    }),
  },
  // The catch-all stays LAST: nearly every typo lands here, so anything more specific
  // above must get the first chance to explain itself.
  {
    re: /near "([^"]*)":\s*syntax error/i,
    hint: m => ({
      cause: `The parser gave up right at "${m[1]}" — the actual mistake is almost always just BEFORE that word.`,
      fix:
        `Read backwards from "${m[1]}": a missing comma in SELECT, clauses out of order ` +
        '(WHERE → GROUP BY → HAVING → ORDER BY → LIMIT), a stray trailing comma, or a reserved word used as a name.',
    }),
  },
];

/** Plain-language translation of a raw engine error, or null when we honestly don't know. */
export const decodeSqlError = (raw: string | null | undefined): SqlErrorHint | null => {
  if (!raw) return null;
  for (const d of ERROR_DECODERS) {
    const m = raw.match(d.re);
    if (m) return d.hint(m);
  }
  return null;
};

// ---- TestWriter: predicted-rows parsing & diffing -------------------------------------
//
// The playground's TestWriter asks the learner to type the rows they EXPECT before
// running anything. The text is CSV-ish on purpose — one row per line, commas between
// cells — because that is how people jot tables on paper. Parsing and diffing live here
// so the prediction is judged by the SAME normalisation the grader uses (100 vs 100.00,
// NULL spelling); a second, subtly different comparison would fail predictions the
// grader would pass.

/**
 * One line per row; commas split cells; double quotes protect a cell that itself
 * contains a comma ("" inside quotes is a literal quote); an unquoted NULL (any case)
 * means SQL NULL. Blank lines are skipped so trailing newlines cost nothing.
 */
export const parsePredictionRows = (text: string): (string | null)[][] => {
  const rows: (string | null)[][] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const cells: (string | null)[] = [];
    let i = 0;
    // Each pass of this loop consumes exactly one cell (plus its trailing comma).
    for (;;) {
      while (line[i] === ' ' || line[i] === '\t') i++;
      if (line[i] === '"') {
        i++;
        let val = '';
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i]; i++; }
        }
        while (i < line.length && line[i] !== ',') i++; // stray text after the close-quote is dropped
        cells.push(val);
      } else {
        let val = '';
        while (i < line.length && line[i] !== ',') { val += line[i]; i++; }
        const t = val.trim();
        cells.push(/^null$/i.test(t) ? null : t);
      }
      if (i >= line.length) break;
      i++; // step over the comma; a trailing comma yields one empty final cell, honestly
    }
    rows.push(cells);
  }
  return rows;
};

export interface PredictionDiff {
  /** True when the prediction and the actual output contain exactly the same rows. */
  matches: boolean;
  /** How many predicted rows were found in the actual output. */
  matched: number;
  /** Row count of the actual output. */
  total: number;
  /** Rows the actual output has that the prediction lacks — cells ready to display. */
  missing: string[][];
  /** Predicted rows the actual output does not contain. */
  extra: string[][];
  /** Present when some predicted row has the wrong number of cells. */
  widthNote?: string;
}

/**
 * Multiset comparison, deliberately ignoring row order: a prediction is a claim about
 * WHICH rows come back, and without ORDER BY, SQL itself makes no ordering promise —
 * grading order here would be stricter than the actual grader.
 */
export const diffPrediction = (
  predicted: (string | null)[][],
  actualRows: (string | number | null)[][],
  expectedWidth: number,
): PredictionDiff => {
  // Count each normalised actual row, then let predictions consume the counts —
  // duplicates matter (predicting a row once when it appears twice is a miss).
  const want = new Map<string, number>();
  for (const r of actualRows) {
    const k = normRow(r);
    want.set(k, (want.get(k) ?? 0) + 1);
  }
  let matched = 0;
  const extra: string[][] = [];
  for (const p of predicted) {
    const k = normRow(p);
    const n = want.get(k) ?? 0;
    if (n > 0) { want.set(k, n - 1); matched++; }
    else extra.push(k.split(CELL_SEP));
  }
  const missing: string[][] = [];
  want.forEach((n, k) => {
    for (let i = 0; i < n; i++) missing.push(k.split(CELL_SEP));
  });
  const badWidth = expectedWidth > 0 && predicted.some(r => r.length !== expectedWidth);
  return {
    matches: predicted.length > 0 && extra.length === 0 && missing.length === 0,
    matched,
    total: actualRows.length,
    missing,
    extra,
    widthNote: badWidth
      ? `Heads up: each answer row has ${expectedWidth} cell${expectedWidth === 1 ? '' : 's'}, but some predicted rows have a different count.`
      : undefined,
  };
};
