import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Check, X, Loader2, Database, Lightbulb, AlertTriangle, ListChecks } from 'lucide-react';
import {
  checkQuery, runQuery, parsePredictionRows, diffPrediction, decodeSqlError,
  type SqlCheckResult, type SqlTable, type PredictionDiff,
} from '../utils/sqlRunner';
import { SqlExplain } from './SqlExplain';
import { readText, writeText } from '../utils/persistence';

interface SqlPlaygroundProps {
  questionId: string;
  exampleData: SqlTable[];
  expectedOutput: SqlTable;
  /** The verified answer, available only when the learner asks for it. */
  solutionQuery: string;
}

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

/** Plain-language decoding under the raw engine error. Local (and duplicated in
 *  SqlSandbox) the same way ResultTable is — these two surfaces deliberately do not
 *  import each other's internals. */
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

/** The TestWriter verdict: the learner's predicted rows vs rows actually produced. */
const PredictionReport: React.FC<{ diff: PredictionDiff; sourceNote: string }> = ({ diff, sourceNote }) => {
  // A missed prediction is information, not failure — amber, never red.
  const tone = diff.matches ? 'easy' : 'medium';
  const rowList = (rows: string[][], label: string) => (
    <div>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>
        {label}
      </span>
      {rows.slice(0, 6).map((r, i) => (
        <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.8, color: 'hsl(var(--text-secondary))' }}>
          [{r.join(', ')}]
        </div>
      ))}
      {rows.length > 6 && (
        <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>…and {rows.length - 6} more</div>
      )}
    </div>
  );
  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem',
        borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600,
        background: `hsl(var(--${tone}) / 0.12)`, border: `1px solid hsl(var(--${tone}))`,
        color: `hsl(var(--${tone}))`,
      }}>
        {diff.matches ? <Check size={15} /> : <X size={15} />}
        <span>
          {diff.matches
            ? `Prediction exactly right — all ${diff.total} row${diff.total === 1 ? '' : 's'}.`
            : `${diff.matched} of ${diff.total} row${diff.total === 1 ? '' : 's'} predicted · ${diff.missing.length} missed · ${diff.extra.length} predicted but absent.`}
        </span>
      </div>
      {diff.widthNote && (
        <span style={{ fontSize: '0.72rem', color: 'hsl(var(--medium))' }}>{diff.widthNote}</span>
      )}
      {diff.missing.length > 0 && rowList(diff.missing, 'IN THE REAL OUTPUT, MISSING FROM YOUR PREDICTION')}
      {diff.extra.length > 0 && rowList(diff.extra, 'IN YOUR PREDICTION, NOT IN THE REAL OUTPUT')}
      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
        Compared against {sourceNote}. Row order is ignored — without ORDER BY, SQL promises none.
      </span>
    </div>
  );
};

/**
 * Learning SQL without running SQL is barely learning. This executes the reader's query
 * against the question's own sample tables — a real SQLite database built in the browser —
 * and compares the rows to the expected answer.
 */
export const SqlPlayground: React.FC<SqlPlaygroundProps> = ({
  questionId,
  exampleData,
  expectedOutput,
  solutionQuery,
}) => {
  const storageKey = `sql-attempt-${questionId}`;
  const predictKey = `sql-predict-${questionId}`;
  const starter = '-- Write your query here\nSELECT ';

  const [query, setQuery] = useState<string>(() => readText(storageKey) || starter);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SqlCheckResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  // TestWriter: commit to an expected answer BEFORE running anything. Writing the rows
  // down first is the difference between checking an answer and merely recognising one.
  const [predictOpen, setPredictOpen] = useState(false);
  const [prediction, setPrediction] = useState<string>(() => readText(predictKey));
  const [predRunning, setPredRunning] = useState(false);
  const [predNote, setPredNote] = useState<string | null>(null);
  const [refDiff, setRefDiff] = useState<PredictionDiff | null>(null);
  const [refSourceNote, setRefSourceNote] = useState('');
  const [ownDiff, setOwnDiff] = useState<PredictionDiff | null>(null);
  const liveQuestion = React.useRef(questionId);

  useEffect(() => {
    liveQuestion.current = questionId;
    setQuery(readText(storageKey) || starter);
    setResult(null);
    setRevealed(false);
    setRunning(false);
    setPredictOpen(false);
    setPrediction(readText(`sql-predict-${questionId}`));
    setPredRunning(false);
    setPredNote(null);
    setRefDiff(null);
    setOwnDiff(null);
  }, [questionId, storageKey]);

  const persist = (next: string) => {
    setQuery(next);
    writeText(storageKey, next);
  };

  const persistPrediction = (next: string) => {
    setPrediction(next);
    writeText(predictKey, next);
    // The stored verdicts describe text that no longer exists — drop them.
    setRefDiff(null);
    setPredNote(null);
  };

  const execute = async () => {
    setRunning(true);
    setResult(null);
    const ranFor = questionId;
    const res = await checkQuery(query, exampleData, expectedOutput);
    if (liveQuestion.current !== ranFor) return; // stale verdict for a question no longer open
    setResult(res);
    setRunning(false);
    // TestWriter half two: the prediction measured against what the learner's OWN query
    // actually produced (the reference comparison lives in the panel above).
    const predRows = parsePredictionRows(prediction);
    setOwnDiff(
      res.ok && predRows.length > 0
        ? diffPrediction(predRows, res.rows, expectedOutput.headers.length)
        : null,
    );
  };

  const checkPrediction = async () => {
    const rows = parsePredictionRows(prediction);
    setRefDiff(null);
    if (rows.length === 0) {
      setPredNote('Type at least one predicted row first — one line per row.');
      return;
    }
    setPredNote(null);
    setPredRunning(true);
    const ranFor = questionId;
    // The reference runs through the same primitive as every other query here — the
    // prediction is judged against what the verified solution ACTUALLY returns.
    const ref = await runQuery(solutionQuery, exampleData);
    if (liveQuestion.current !== ranFor) return;
    setPredRunning(false);
    if (ref.ok) {
      setRefDiff(diffPrediction(rows, ref.rows, expectedOutput.headers.length));
      setRefSourceNote("the reference query's live output");
    } else {
      // Some references are MySQL-only; the documented expected output IS that query's
      // output, so falling back keeps the exercise honest instead of blocked.
      setRefDiff(diffPrediction(rows, expectedOutput.rows, expectedOutput.headers.length));
      setRefSourceNote('the documented expected output (the reference query cannot run in the browser engine)');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!running) execute();
    }
  };

  const matched = result?.matches;

  return (
    <div className="glass" style={{ borderRadius: '16px', border: '1px solid hsl(var(--border-color))', overflow: 'hidden' }}>
      <div style={{
        padding: '1rem 1.5rem', borderBottom: '1px solid hsl(var(--border-color))',
        background: 'hsl(var(--bg-secondary) / 0.5)', display: 'flex', alignItems: 'center',
        gap: '0.75rem', flexWrap: 'wrap',
      }}>
        <Database size={18} color="hsl(var(--secondary))" />
        <div style={{ flex: 1, minWidth: '180px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Write the query yourself</h3>
          <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
            Runs against the sample tables above, in your browser, and checks your rows.
          </p>
        </div>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
          onClick={() => {
            if (query !== starter && !window.confirm('Throw away your query and restore the starter?')) return;
            persist(starter); setResult(null);
          }} disabled={running}>
          <RotateCcw size={13} /><span>Reset</span>
        </button>
        <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
          onClick={execute} disabled={running}>
          {running ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
          <span>{running ? 'Running…' : 'Run & check'}</span>
        </button>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* 14 · TestWriter — sits ABOVE the editor so "predict, then write" reads as
            the intended order, not an afterthought. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div>
            <button
              className="btn btn-secondary"
              style={{
                padding: '0.35rem 0.75rem', fontSize: '0.74rem',
                ...(predictOpen
                  ? { borderColor: 'hsl(var(--secondary))', color: 'hsl(var(--secondary))', background: 'hsl(var(--secondary) / 0.08)' }
                  : {}),
              }}
              aria-pressed={predictOpen}
              aria-expanded={predictOpen}
              onClick={() => setPredictOpen(o => !o)}
            >
              <ListChecks size={13} aria-hidden="true" />
              <span>TestWriter — predict the rows first</span>
            </button>
          </div>
          {predictOpen && (
            <div className="animate-fade" style={{
              display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.85rem 1rem',
              borderRadius: '10px', border: '1px dashed hsl(var(--border-color))',
              background: 'hsl(var(--bg-secondary) / 0.3)',
            }}>
              <label htmlFor={`sql-predict-${questionId}`} style={{ fontSize: '0.74rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
                Before writing SQL, type the rows you expect the correct answer to return —
                one row per line, cells separated by commas,{' '}
                <code style={{ fontFamily: 'var(--font-mono)' }}>NULL</code> for a null.
                Columns: <strong>{expectedOutput.headers.join(', ') || 'see the expected output above'}</strong>.
              </label>
              <textarea
                id={`sql-predict-${questionId}`}
                value={prediction}
                onChange={e => persistPrediction(e.target.value)}
                spellCheck={false}
                placeholder={expectedOutput.headers.map(() => '…').join(', ') || 'value1, value2'}
                rows={Math.min(10, Math.max(3, prediction.split('\n').length + 1))}
                style={{
                  width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                  lineHeight: 1.6, padding: '0.75rem 0.9rem', borderRadius: '8px',
                  background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
                  border: '1px solid hsl(var(--border-color))', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                  onClick={checkPrediction} disabled={predRunning}>
                  {predRunning ? <Loader2 size={12} className="spin" /> : <Play size={12} />}
                  <span>Diff against the reference output</span>
                </button>
                <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
                  Runs the verified solution behind the scenes — its SQL stays hidden.
                </span>
              </div>
              {predNote && (
                <span role="status" style={{ fontSize: '0.75rem', color: 'hsl(var(--medium))' }}>{predNote}</span>
              )}
              {refDiff && <PredictionReport diff={refDiff} sourceNote={refSourceNote} />}
            </div>
          )}
        </div>

        <textarea
          value={query}
          onChange={e => persist(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          rows={Math.min(18, Math.max(6, query.split('\n').length + 2))}
          style={{
            width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
            lineHeight: 1.6, padding: '1rem', borderRadius: '10px',
            background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
            border: '1px solid hsl(var(--border-color))', outline: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>
            ⌘/Ctrl + Enter to run
          </span>
          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
            onClick={() => setRevealed(r => !r)}>
            <Lightbulb size={12} />
            <span>{revealed ? 'Hide the answer' : 'Stuck? Show the answer'}</span>
          </button>
        </div>

        {revealed && (
          <pre style={{
            margin: 0, padding: '0.85rem 1rem', borderRadius: '10px',
            background: 'hsl(var(--bg-tertiary))', border: '1px dashed hsl(var(--border-color))',
            fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.55,
            whiteSpace: 'pre-wrap', color: 'hsl(var(--text-secondary))',
          }}>
            {solutionQuery}
          </pre>
        )}

        {/* A MySQL-only construct is the learner being RIGHT and the browser engine being
            limited — it must never be shown as their mistake. */}
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
            }}>
              {result.error}
            </div>
            {/* 17 · The raw message stays (it is what real tools will say); the decoder
                translates it right underneath. */}
            <ErrorHint error={result.error} />
          </div>
        )}

        {result?.ok && (
          <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem',
              borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
              background: matched ? 'hsl(var(--easy) / 0.12)' : 'hsl(var(--hard) / 0.12)',
              border: `1px solid hsl(var(--${matched ? 'easy' : 'hard'}))`,
              color: `hsl(var(--${matched ? 'easy' : 'hard'}))`,
            }}>
              {matched ? <Check size={16} /> : <X size={16} />}
              <span>{matched ? 'Correct — your rows match the expected answer.' : result.mismatch}</span>
            </div>
            {ownDiff && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.78rem',
                color: 'hsl(var(--text-secondary))', lineHeight: 1.5,
              }}>
                <ListChecks size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px', color: 'hsl(var(--secondary))' }} />
                <span>
                  TestWriter — your prediction vs THIS query's output: {ownDiff.matched} of {ownDiff.total} row{ownDiff.total === 1 ? '' : 's'} predicted
                  {ownDiff.extra.length > 0
                    ? `, ${ownDiff.extra.length} predicted row${ownDiff.extra.length === 1 ? '' : 's'} did not appear`
                    : ''}.
                </span>
              </div>
            )}
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                YOUR RESULT · {result.rows.length} row{result.rows.length === 1 ? '' : 's'} · {result.elapsedMs.toFixed(0)}ms
              </span>
              <div style={{ marginTop: '0.35rem' }}>
                <ResultTable headers={result.headers} rows={result.rows} />
              </div>
            </div>
            {/* Only after an ok run; SqlExplain itself guards for SELECT. The reference
                query rides along so the details pane can offer the plan comparison. */}
            <SqlExplain query={query} tables={exampleData} referenceQuery={solutionQuery} />
          </div>
        )}
      </div>
    </div>
  );
};
