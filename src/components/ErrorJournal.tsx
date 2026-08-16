import React, { useEffect, useMemo, useState } from 'react';
import { BookX } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { readJson, readText, writeJson } from '../utils/persistence';

/**
 * Error journal (learning-science track, feature 42) + the pre-mortem echo (43).
 *
 * Every failed graded run is a data point most tools throw away the moment the
 * red banner scrolls off. This card keeps them: which question, which assertion
 * broke, and — when the learner wrote a pre-mortem before attempting — what they
 * PREDICTED would go wrong, quoted right beside what did. The "I told you so"
 * coming from your own past self is the version of feedback nobody argues with.
 *
 * Mounted on Stats, which App keeps alive behind display:none (the same contract
 * that keeps the FocusTimer ticking), so the `dsa:tests-failed` listener hears
 * failures from any problem page without ProblemViewer knowing this card exists.
 */

interface ErrEntry {
  id: string;
  assertion: string;
  /** The learner's own pre-run prediction of what would break, if they wrote one. */
  premortem?: string;
  on: number; // epoch ms
}

const KEY = 'error-journal';
const CAP = 200;

const isErrLog = (v: unknown): v is ErrEntry[] =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      !!e && typeof e === 'object' &&
      typeof (e as ErrEntry).id === 'string' &&
      typeof (e as ErrEntry).assertion === 'string' &&
      typeof (e as ErrEntry).on === 'number' &&
      ((e as ErrEntry).premortem === undefined || typeof (e as ErrEntry).premortem === 'string'),
  );

const readJournal = (): ErrEntry[] => readJson<ErrEntry[]>(KEY, [], isErrLog);

const MONTH_MS = 30 * 86_400_000;

const fmtWhen = (on: number) => {
  const days = Math.floor((Date.now() - on) / 86_400_000);
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`;
};

interface ErrorJournalProps {
  refresh?: number;
  onOpenQuestion: (q: Question) => void;
}

export const ErrorJournal: React.FC<ErrorJournalProps> = ({ refresh = 0, onOpenQuestion }) => {
  const [log, setLog] = useState<ErrEntry[]>(readJournal);

  // Re-read on tab activation — a restored backup can rewrite the key underneath us.
  useEffect(() => {
    setLog(readJournal());
  }, [refresh]);

  // The app-wide appender. The pre-mortem is captured AT FAILURE TIME: the input on
  // the problem page stays editable, and the quote must be what stood when the run
  // broke, not whatever it says next week.
  useEffect(() => {
    const onFail = (e: Event) => {
      const detail = (e as CustomEvent<{ questionId?: string; failedAssertion?: string }>).detail;
      if (!detail?.questionId) return;
      const premortem = readText(`premortem-${detail.questionId}`).trim();
      const entry: ErrEntry = {
        id: detail.questionId,
        assertion: (detail.failedAssertion ?? '').slice(0, 300),
        ...(premortem ? { premortem: premortem.slice(0, 300) } : {}),
        on: Date.now(),
      };
      const next = [...readJournal(), entry].slice(-CAP);
      writeJson(KEY, next);
      setLog(next);
    };
    window.addEventListener('dsa:tests-failed', onFail);
    return () => window.removeEventListener('dsa:tests-failed', onFail);
  }, []);

  const byId = useMemo(() => new Map(dsaQuestions.map((q) => [q.id, q])), []);

  // "Your top failure pattern this month" — count last-30-day failures by the
  // failing question's PRIMARY pattern. One headline, not a chart: the point is
  // to name the enemy, and a name is more actionable than a distribution.
  const topPattern = useMemo(() => {
    const counts = new Map<string, number>();
    log
      .filter((e) => Date.now() - e.on <= MONTH_MS)
      .forEach((e) => {
        const p = byId.get(e.id)?.patterns?.[0];
        if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
      });
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return best && best[1] >= 2 ? { pattern: best[0], n: best[1] } : null;
  }, [log, byId]);

  // Group by question, most recent failure first, keep the newest entry per group
  // visible; the count carries the rest of the story.
  const groups = useMemo(() => {
    const m = new Map<string, ErrEntry[]>();
    log.forEach((e) => m.set(e.id, [...(m.get(e.id) || []), e]));
    return [...m.entries()]
      .map(([id, entries]) => ({ id, entries, latest: entries[entries.length - 1] }))
      .sort((a, b) => b.latest.on - a.latest.on)
      .slice(0, 6);
  }, [log]);

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <BookX size={18} color="hsl(var(--hard))" />
        Error journal
      </h3>
      {log.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          When a graded run fails on a problem page, the failure lands here — which
          question, which assertion broke, and what you predicted would go wrong.
          Failures you can re-read are the cheapest teacher this app has.
        </p>
      ) : (
        <>
          {topPattern && (
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>
              Your top failure pattern this month: <strong style={{ color: 'hsl(var(--hard))' }}>{topPattern.pattern}</strong>
              <span style={{ color: 'hsl(var(--text-muted))' }}> · {topPattern.n} failed runs</span>
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {groups.map((g) => {
              const q = byId.get(g.id);
              return (
                <div
                  key={g.id}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '0.35rem',
                    padding: '0.6rem 0.8rem', borderRadius: '8px',
                    background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {q ? (
                      /* Re-openable: the entry's whole value is going back in. */
                      <button
                        onClick={() => onOpenQuestion(q)}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          color: 'hsl(var(--text-primary))', fontSize: '0.82rem', fontWeight: 600,
                          fontFamily: 'var(--font-sans)', textAlign: 'left', textDecoration: 'underline',
                          textDecorationColor: 'hsl(var(--border-color))', textUnderlineOffset: '3px',
                        }}
                      >
                        {q.title}
                      </button>
                    ) : (
                      /* A question removed in a data update: the failure still happened. */
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>{g.id}</span>
                    )}
                    {q?.patterns?.[0] && (
                      <span
                        style={{
                          fontSize: '0.62rem', fontWeight: 600, padding: '0.08rem 0.45rem', borderRadius: '999px',
                          background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))',
                          color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap',
                        }}
                      >
                        {q.patterns[0]}
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>
                      {g.entries.length === 1 ? '1 failure' : `${g.entries.length} failures`} · {fmtWhen(g.latest.on)}
                    </span>
                  </div>
                  {g.latest.assertion && (
                    <code
                      style={{
                        display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                        color: 'hsl(var(--hard))', overflowX: 'auto', whiteSpace: 'pre',
                        padding: '0.25rem 0', lineHeight: 1.5,
                      }}
                    >
                      {g.latest.assertion}
                    </code>
                  )}
                  {g.latest.premortem && (
                    /* The echo. Quoting the learner's own pre-mortem next to the real
                       failure is the whole feature — self-issued advice sticks. */
                    <span style={{ fontSize: '0.72rem', color: 'hsl(var(--medium))', lineHeight: 1.5 }}>
                      You called it: “{g.latest.premortem}”
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
