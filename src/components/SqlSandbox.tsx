import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, DraftingCompass, FlaskConical, Lightbulb, Loader2, Play } from 'lucide-react';
import { decodeSqlError, runFreeform, type SqlRunResult } from '../utils/sqlRunner';
import { readJson, readText, writeJson, writeText } from '../utils/persistence';

/**
 * SQL Sandbox — a freeform scratch database inside the SQL hub, now with two lanes:
 *
 * SCRATCH — the learner brings BOTH halves: a schema (CREATE TABLE + INSERTs) and a
 * query. The two texts persist across visits ('sandbox-schema' / 'sandbox-query'); the
 * database itself is deliberately rebuilt from the schema on every run — a scratch db
 * that accumulated state across runs would make "why is this row here?" unanswerable.
 *
 * DESIGN BRIEF — six hardcoded product briefs (library, ride-sharing, hospital…). The
 * learner writes only CREATE TABLEs against the requirements, checks they parse, then
 * interrogates the design with a self-review checklist. The checklist is questions,
 * never judgments: nothing here grades a schema, because normalisation trade-offs are
 * exactly the kind of thing an interview wants you to ARGUE, not memorise. Draft SQL
 * and ticks persist per brief under 'design-<brief>'; the chosen lane and brief
 * persist under 'sandbox-mode'.
 *
 * Lands at: src/components/SqlSandbox.tsx  (mounted as SQLHub's Sandbox sub-tab)
 */

const SAMPLE_SCHEMA = `CREATE TABLE Employees (id INTEGER, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO Employees VALUES
  (1, 'Asha',  'Engineering', 95000),
  (2, 'Bilal', 'Engineering', 87000),
  (3, 'Chen',  'Sales',       61000),
  (4, 'Dana',  'Sales',       58000),
  (5, 'Eli',   'Support',     52000);

CREATE TABLE Departments (dept TEXT, location TEXT);
INSERT INTO Departments VALUES
  ('Engineering', 'Bengaluru'),
  ('Sales',       'Mumbai'),
  ('Support',     'Pune');`;

const SAMPLE_QUERY = `SELECT e.dept, d.location, COUNT(*) AS headcount, MAX(e.salary) AS top_salary
FROM Employees e
JOIN Departments d ON d.dept = e.dept
GROUP BY e.dept, d.location
ORDER BY headcount DESC;`;

// ---- Design-brief data (16) -----------------------------------------------------------

interface DesignBrief {
  id: string;
  title: string;
  scenario: string;
  requirements: string[];
}

const DESIGN_BRIEFS: DesignBrief[] = [
  {
    id: 'library',
    title: 'Library',
    scenario: 'A city library wants to track its collection and lending.',
    requirements: [
      'Books exist as titles; the library owns multiple physical copies of a title, each with its own barcode and shelf location.',
      'Members borrow copies (not titles); a loan has a checkout date, a due date, and — eventually — a return date.',
      'Late returns accrue a fine, and a fine must be payable in several partial payments.',
      'Staff will ask: "which copies of title X are on the shelf right now?" and "which member owes the most?"',
    ],
  },
  {
    id: 'rideshare',
    title: 'Ride-sharing',
    scenario: 'A ride-hailing startup matching riders to drivers.',
    requirements: [
      'Riders and drivers sign up with a phone number; a driver registers one or more vehicles but drives one at a time.',
      'A trip connects one rider, one driver and one vehicle, with requested / accepted / completed / cancelled timestamps, pickup and dropoff points, and a fare.',
      'After a completed trip, BOTH sides may rate each other (1–5), at most once each.',
      'Ops will ask: "average rating per driver over their last trips" and "cancellations after acceptance, per week".',
    ],
  },
  {
    id: 'hospital',
    title: 'Hospital',
    scenario: 'A hospital moving its records off paper.',
    requirements: [
      'Doctors belong to a department and have consulting hours.',
      'Patients book appointments with a doctor; an appointment can produce a diagnosis and zero or more prescriptions.',
      'A prescription lists one or more drugs, each with its own dosage and duration.',
      'Drug names must stay consistent — free-text spellings of the same drug are a safety bug, not a style issue.',
    ],
  },
  {
    id: 'delivery',
    title: 'Food delivery',
    scenario: 'A restaurant marketplace with couriers.',
    requirements: [
      'Restaurants publish menus; item prices CHANGE over time, but an old order must still show exactly what was paid.',
      'An order has line items (item + quantity), one customer, one restaurant, and — once accepted — one courier.',
      'Status history matters: placed → accepted → picked up → delivered, each transition with its own timestamp.',
      'Finance will ask: "revenue per restaurant per month", priced as at order time.',
    ],
  },
  {
    id: 'streaming',
    title: 'Streaming service',
    scenario: 'A video streaming platform.',
    requirements: [
      'An account has one subscription plan but up to five profiles; watch history belongs to a profile, not the account.',
      'Titles are movies OR series; series have seasons, seasons have episodes.',
      'Playback progress is stored per profile per episode (or movie): seconds watched, last watched at.',
      'Product will ask: "which series get 3+ episodes watched by one profile in a day?"',
    ],
  },
  {
    id: 'university',
    title: 'University',
    scenario: 'Course registration for a university.',
    requirements: [
      'Courses have prerequisites (which are themselves courses) and are offered as sections per term, each with an instructor, room and capacity.',
      'Students enroll in sections, not courses, and cannot enroll twice in the same section.',
      'Grades live on the enrollment; GPA is computed from grade points and credit hours.',
      'The registrar will ask: "who is over 18 credit hours this term?" and "which sections are full?"',
    ],
  },
];

/** Questions, not judgments: each one is something to ASK of every table you wrote. */
const DESIGN_CHECKLIST: { q: string; hint: string }[] = [
  {
    q: 'Does every table have a primary key?',
    hint: 'And could you say out loud WHY that column — or pair — uniquely identifies a row?',
  },
  {
    q: 'Does every foreign key column have the same type as the column it points at?',
    hint: 'INTEGER referencing INTEGER, TEXT referencing TEXT — mixed pairs "work" until a join silently misses.',
  },
  {
    q: '1NF: could any single column ever hold more than one value?',
    hint: "A phone_numbers column containing '98,99' is a table hiding inside a cell.",
  },
  {
    q: '2NF: where a table has a composite key, does every other column depend on the WHOLE key?',
    hint: "A column that depends on only half the key belongs in that half's own table.",
  },
  {
    q: '3NF: does any non-key column determine another non-key column?',
    hint: 'city → pincode stored side by side will disagree with itself one day.',
  },
  {
    q: 'Is every many-to-many modelled as a junction table?',
    hint: 'Never a col_1, col_2, col_3 family of repeated columns.',
  },
  {
    q: 'If a parent row vanished, do you know what should happen to its children?',
    hint: 'Per FK, pick one: forbid the delete, cascade it, or null it. "Never thought about it" is the only wrong answer.',
  },
  {
    q: 'Is every fact stored exactly once?',
    hint: 'If a price lives in two tables, one of them is already wrong — derive, don\'t copy.',
  },
];

interface DesignDraft {
  sql: string;
  checks: number[];
}

const EMPTY_DRAFT: DesignDraft = { sql: '', checks: [] };

const isDesignDraft = (v: unknown): v is DesignDraft =>
  !!v && typeof v === 'object' &&
  typeof (v as DesignDraft).sql === 'string' &&
  Array.isArray((v as DesignDraft).checks) &&
  (v as DesignDraft).checks.every(
    n => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < DESIGN_CHECKLIST.length,
  );

// ---------------------------------------------------------------------------------------

/** Same rendering as SqlPlayground's result grid — kept local so the sandbox stays
 *  self-contained (SqlPlayground does not export its table). */
const ResultTable: React.FC<{ headers: string[]; rows: (string | number | null)[][] }> = ({ headers, rows }) => (
  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid hsl(var(--border-color))' }}>
    <table className="sql-grid-data">
      <thead>
        <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={Math.max(headers.length, 1)} style={{ fontStyle: 'italic', color: 'hsl(var(--text-muted))' }}>0 rows</td></tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c === null ? 'NULL' : String(c)}</td>)}</tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

/** Plain-language decoding under the raw engine error — duplicated from SqlPlayground
 *  the same way ResultTable is, deliberately. */
const ErrorHint: React.FC<{ error?: string }> = ({ error }) => {
  const hint = decodeSqlError(error);
  if (!hint) return null;
  return (
    <div className="animate-fade" style={{
      display: 'flex', gap: '0.6rem', padding: '0.7rem 1rem', borderRadius: '10px',
      background: 'hsl(var(--secondary) / 0.08)', border: '1px solid hsl(var(--secondary) / 0.35)',
      fontSize: '0.8rem', lineHeight: 1.55, color: 'hsl(var(--text-secondary))',
    }}>
      <Lightbulb size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px', color: 'hsl(var(--secondary))' }} />
      <span>
        <strong style={{ color: 'hsl(var(--text-primary))' }}>What this usually means: </strong>{hint.cause}{' '}
        <strong style={{ color: 'hsl(var(--text-primary))' }}>Try: </strong>{hint.fix}
      </span>
    </div>
  );
};

const editorStyle: React.CSSProperties = {
  width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
  lineHeight: 1.6, padding: '1rem', borderRadius: '10px',
  background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
  border: '1px solid hsl(var(--border-color))', outline: 'none',
};

type SandboxMode = 'scratch' | 'design';

export const SqlSandbox: React.FC = () => {
  const [schema, setSchema] = useState<string>(() => readText('sandbox-schema'));
  const [query, setQuery] = useState<string>(() => readText('sandbox-query'));
  // Lane + chosen brief share one key ('scratch' or 'design:<briefId>') so a learner
  // mid-design lands back exactly where they left off.
  const [mode, setMode] = useState<SandboxMode>(() =>
    readText('sandbox-mode').startsWith('design') ? 'design' : 'scratch');
  const [briefId, setBriefId] = useState<string>(() => {
    const stored = readText('sandbox-mode');
    const id = stored.startsWith('design:') ? stored.slice('design:'.length) : '';
    return DESIGN_BRIEFS.some(b => b.id === id) ? id : DESIGN_BRIEFS[0].id;
  });
  const [draft, setDraft] = useState<DesignDraft>(() =>
    readJson<DesignDraft>(`design-${readText('sandbox-mode').startsWith('design:') ? readText('sandbox-mode').slice('design:'.length) : DESIGN_BRIEFS[0].id}`, EMPTY_DRAFT, isDesignDraft));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SqlRunResult | null>(null);
  // The WASM engine load can outlive the tab the learner is looking at — never
  // setState after unmount.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // Load the stored draft whenever the brief changes (the mount run re-reads the same
  // data the initializer read — a harmless no-op).
  useEffect(() => {
    setDraft(readJson<DesignDraft>(`design-${briefId}`, EMPTY_DRAFT, isDesignDraft));
  }, [briefId]);

  const persistSchema = (next: string) => { setSchema(next); writeText('sandbox-schema', next); };
  const persistQuery = (next: string) => { setQuery(next); writeText('sandbox-query', next); };
  const persistDraft = (next: DesignDraft) => { setDraft(next); writeJson(`design-${briefId}`, next); };

  const switchMode = (m: SandboxMode) => {
    setMode(m);
    setResult(null);
    writeText('sandbox-mode', m === 'design' ? `design:${briefId}` : 'scratch');
  };

  const pickBrief = (id: string) => {
    setBriefId(id);
    setResult(null);
    writeText('sandbox-mode', `design:${id}`);
  };

  const toggleCheck = (i: number) => {
    const ticked = draft.checks.includes(i);
    persistDraft({
      ...draft,
      checks: ticked ? draft.checks.filter(c => c !== i) : [...draft.checks, i].sort((a, b) => a - b),
    });
  };

  const execute = async () => {
    setRunning(true);
    setResult(null);
    let res: SqlRunResult;
    if (mode === 'design') {
      if (!draft.sql.trim()) {
        res = { ok: false, headers: [], rows: [], error: 'Write your CREATE TABLE statements first.', elapsedMs: 0 };
      } else {
        // Probe run: apply the learner's DDL, then list what actually got created —
        // "did my tables parse, and what are they called?" is the design-mode question.
        res = await runFreeform(
          draft.sql,
          "SELECT name AS created_table FROM sqlite_master WHERE type = 'table' ORDER BY name;",
        );
      }
    } else {
      res = await runFreeform(schema, query);
    }
    if (!alive.current) return;
    setResult(res);
    setRunning(false);
  };

  // Same shortcut as the graded playground, from any textarea.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!running) execute();
    }
  };

  const loadSample = () => {
    // Only ask before destroying something the learner actually typed.
    const dirty =
      (schema.trim() !== '' && schema !== SAMPLE_SCHEMA) ||
      (query.trim() !== '' && query !== SAMPLE_QUERY);
    if (dirty && !window.confirm('Replace your current schema and query with the sample?')) return;
    persistSchema(SAMPLE_SCHEMA);
    persistQuery(SAMPLE_QUERY);
    setResult(null);
  };

  const brief = DESIGN_BRIEFS.find(b => b.id === briefId) ?? DESIGN_BRIEFS[0];

  return (
    <div className="glass" style={{ borderRadius: '16px', border: '1px solid hsl(var(--border-color))', overflow: 'hidden' }}>
      <div style={{
        padding: '1rem 1.5rem', borderBottom: '1px solid hsl(var(--border-color))',
        background: 'hsl(var(--bg-secondary) / 0.5)', display: 'flex', alignItems: 'center',
        gap: '0.75rem', flexWrap: 'wrap',
      }}>
        {mode === 'design'
          ? <DraftingCompass size={18} color="hsl(var(--secondary))" />
          : <FlaskConical size={18} color="hsl(var(--secondary))" />}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
            {mode === 'design' ? 'Design brief — schema from a blank page' : 'Sandbox — your own tables, your own queries'}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
            {mode === 'design'
              ? 'Pick a brief, write the CREATE TABLEs, then interrogate your design with the checklist.'
              : 'Both texts persist on this device; the database is rebuilt from your schema on every run.'}
          </p>
        </div>
        {mode === 'scratch' && (
          <button
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
            onClick={loadSample}
            disabled={running}
          >
            <Lightbulb size={13} /><span>Load sample schema</span>
          </button>
        )}
        <button
          className="btn btn-primary"
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
          onClick={execute}
          disabled={running}
        >
          {running ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
          <span>{running ? 'Running…' : mode === 'design' ? 'Check schema' : 'Run'}</span>
        </button>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Lane switch — a mode toggle, not navigation, hence buttons with aria-pressed. */}
        <div role="group" aria-label="Sandbox mode" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['scratch', 'design'] as const).map(m => (
            <button
              key={m}
              className="btn btn-secondary"
              aria-pressed={mode === m}
              style={{
                padding: '0.35rem 0.8rem', fontSize: '0.75rem',
                ...(mode === m
                  ? { borderColor: 'hsl(var(--secondary))', background: 'hsl(var(--secondary) / 0.1)', color: 'hsl(var(--secondary))' }
                  : {}),
              }}
              onClick={() => switchMode(m)}
            >
              {m === 'scratch' ? <FlaskConical size={12} aria-hidden="true" /> : <DraftingCompass size={12} aria-hidden="true" />}
              <span>{m === 'scratch' ? 'Scratch database' : 'Design brief'}</span>
            </button>
          ))}
        </div>

        {mode === 'scratch' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="sandbox-schema-input"
                style={{ fontSize: '0.7rem', fontWeight: 600, color: 'hsl(var(--text-muted))', letterSpacing: '0.04em' }}
              >
                SCHEMA — CREATE TABLE and INSERT statements
              </label>
              <textarea
                id="sandbox-schema-input"
                value={schema}
                onChange={e => persistSchema(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder={'CREATE TABLE Orders (id INTEGER, amount INTEGER);\nINSERT INTO Orders VALUES (1, 250), (2, 900);'}
                rows={Math.min(16, Math.max(5, schema.split('\n').length + 1))}
                style={editorStyle}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="sandbox-query-input"
                style={{ fontSize: '0.7rem', fontWeight: 600, color: 'hsl(var(--text-muted))', letterSpacing: '0.04em' }}
              >
                QUERY — runs against the schema above; the last statement's rows are shown
              </label>
              <textarea
                id="sandbox-query-input"
                value={query}
                onChange={e => persistQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder="SELECT * FROM Orders WHERE amount > 300;"
                rows={Math.min(14, Math.max(4, query.split('\n').length + 1))}
                style={editorStyle}
              />
            </div>
          </>
        )}

        {mode === 'design' && (
          <>
            <div role="group" aria-label="Choose a design brief" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {DESIGN_BRIEFS.map(b => (
                <button
                  key={b.id}
                  className="btn btn-secondary"
                  aria-pressed={briefId === b.id}
                  style={{
                    padding: '0.3rem 0.7rem', fontSize: '0.72rem',
                    ...(briefId === b.id
                      ? { borderColor: 'hsl(var(--secondary))', background: 'hsl(var(--secondary) / 0.1)', color: 'hsl(var(--secondary))' }
                      : {}),
                  }}
                  onClick={() => pickBrief(b.id)}
                >
                  {b.title}
                </button>
              ))}
            </div>

            <div style={{
              padding: '0.85rem 1rem', borderRadius: '10px',
              border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-secondary) / 0.3)',
              display: 'flex', flexDirection: 'column', gap: '0.45rem',
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{brief.title}: {brief.scenario}</span>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {brief.requirements.map((r, i) => (
                  <li key={i} style={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'hsl(var(--text-secondary))' }}>{r}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="design-sql-input"
                style={{ fontSize: '0.7rem', fontWeight: 600, color: 'hsl(var(--text-muted))', letterSpacing: '0.04em' }}
              >
                YOUR SCHEMA — CREATE TABLE statements only; "Check schema" verifies they parse
              </label>
              <textarea
                id="design-sql-input"
                value={draft.sql}
                onChange={e => persistDraft({ ...draft, sql: e.target.value })}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder={'CREATE TABLE members (\n  member_id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  joined_on TEXT\n);'}
                rows={Math.min(22, Math.max(8, draft.sql.split('\n').length + 1))}
                style={editorStyle}
              />
            </div>
          </>
        )}

        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>
          ⌘/Ctrl + Enter to run
        </span>

        {/* A MySQL-only construct is the learner being RIGHT and the browser engine being
            limited — shown as a limitation, never as their mistake. */}
        {result?.unsupportedDialect && (
          <div className="animate-fade" style={{
            display: 'flex', gap: '0.6rem', padding: '0.75rem 1rem', borderRadius: '10px',
            background: 'hsl(var(--medium) / 0.12)', border: '1px solid hsl(var(--medium))',
            color: 'hsl(var(--medium))', fontSize: '0.82rem', lineHeight: 1.5,
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{result.error}</span>
          </div>
        )}

        {result && !result.ok && !result.unsupportedDialect && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="animate-shake" style={{
              padding: '0.75rem 1rem', borderRadius: '10px',
              background: 'hsl(var(--hard) / 0.12)', border: '1px solid hsl(var(--hard))',
              color: 'hsl(var(--hard))', fontSize: '0.82rem', fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap',
            }}>
              {result.error}
            </div>
            {/* 17 · The raw message stays (it is what real tools will say); the decoder
                translates it right underneath. */}
            <ErrorHint error={result.error} />
          </div>
        )}

        {result?.ok && (
          <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
              {mode === 'design'
                ? `SCHEMA PARSED — ${result.rows.length} table${result.rows.length === 1 ? '' : 's'} created · ${result.elapsedMs.toFixed(0)}ms`
                : result.headers.length === 0
                  ? `STATEMENTS RAN — no result set to show · ${result.elapsedMs.toFixed(0)}ms`
                  : `RESULT · ${result.rows.length} row${result.rows.length === 1 ? '' : 's'} · ${result.elapsedMs.toFixed(0)}ms`}
            </span>
            {result.headers.length > 0 && (
              <ResultTable headers={result.headers} rows={result.rows} />
            )}
          </div>
        )}

        {mode === 'design' && (
          <div style={{
            padding: '0.85rem 1rem', borderRadius: '10px',
            border: '1px solid hsl(var(--border-color))',
            display: 'flex', flexDirection: 'column', gap: '0.55rem',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              Self-review · {draft.checks.length}/{DESIGN_CHECKLIST.length} questions asked
            </span>
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5, margin: 0 }}>
              Tick a box once you have asked that question of every table you wrote. The tick
              is your record of having looked — nothing here grades the answer.
            </p>
            {DESIGN_CHECKLIST.map((item, i) => (
              <label key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={draft.checks.includes(i)}
                  onChange={() => toggleCheck(i)}
                  style={{ marginTop: '3px', accentColor: 'hsl(var(--secondary))' }}
                />
                <span>
                  {item.q}{' '}
                  <span style={{ color: 'hsl(var(--text-muted))' }}>{item.hint}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
