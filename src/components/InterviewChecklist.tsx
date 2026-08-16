import React, { useState } from 'react';
import { CheckSquare, ClipboardCheck, RotateCcw, Square } from 'lucide-react';
import { readJson, writeJson } from '../utils/persistence';

/**
 * Interview-day checklist — the night-before ritual, written down once.
 *
 * The day before an interview is exactly when working memory is worst, and the
 * failures this list prevents (dead mic, unslept brain, no questions to ask) cost
 * more than any algorithm gap. It lives on Stats next to the Story bank because
 * "re-read your STAR stories" is one of its items — the two cards are one ritual.
 *
 * Ticks persist under 'checklist-state' (in backup.ts's APP_KEY) together with the
 * questions-to-ask text. "New interview" clears only the ticks: your questions to
 * ask survive between interviews because they SHOULD be reused and sharpened.
 */

interface ChecklistState {
  ticks: Record<string, boolean>;
  ask: string;
}

const KEY = 'checklist-state';

const isState = (v: unknown): v is ChecklistState => {
  if (!v || typeof v !== 'object') return false;
  const s = v as ChecklistState;
  return (
    typeof s.ask === 'string' &&
    !!s.ticks && typeof s.ticks === 'object' &&
    Object.values(s.ticks).every(t => typeof t === 'boolean')
  );
};

/** Item ids are the persistence contract — append new items, never rename ids. */
const SECTIONS: { title: string; items: { id: string; label: string }[] }[] = [
  {
    title: 'The night before',
    items: [
      { id: 'sleep', label: 'Protect 7+ hours of sleep — a tired brain drops the invariant mid-sentence' },
      { id: 'star', label: 'Re-read your STAR stories once, out loud (the Story bank card is on this page)' },
      { id: 'logistics', label: 'Confirm time, timezone, format, and who is interviewing you' },
      { id: 'warm', label: 'Skim two bookmarked problems — warm the patterns, do not cram new ones' },
    ],
  },
  {
    title: 'Virtual? Check the room',
    items: [
      { id: 'env-av', label: 'Camera + mic tested in the actual meeting app, not just system settings' },
      { id: 'env-power', label: 'Laptop charged AND plugged; phone hotspot ready as backup internet' },
      { id: 'env-quiet', label: 'Quiet spot claimed; notifications, updates and reboots silenced' },
      { id: 'env-desk', label: 'Water within reach; editor font legible at screen-share size' },
    ],
  },
];

export const InterviewChecklist: React.FC = () => {
  const [state, setState] = useState<ChecklistState>(() =>
    readJson<ChecklistState>(KEY, { ticks: {}, ask: '' }, isState),
  );
  const save = (next: ChecklistState) => {
    setState(next);
    writeJson(KEY, next);
  };

  const toggle = (id: string) =>
    save({ ...state, ticks: { ...state.ticks, [id]: !state.ticks[id] } });

  const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const done = SECTIONS.reduce(
    (n, s) => n + s.items.filter(i => state.ticks[i.id]).length,
    0,
  );

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <ClipboardCheck size={18} color="hsl(var(--secondary))" aria-hidden="true" />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, flex: 1, minWidth: '160px' }}>
          Interview-day checklist
        </h3>
        <span
          style={{
            fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '999px',
            background: done === total ? 'hsl(var(--easy) / 0.15)' : 'hsl(var(--bg-tertiary))',
            border: `1px solid ${done === total ? 'hsl(var(--easy) / 0.4)' : 'hsl(var(--border-color))'}`,
            color: done === total ? 'hsl(var(--easy))' : 'hsl(var(--text-muted))',
          }}
        >
          {done}/{total}
        </span>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        The failures this list prevents cost more than any algorithm gap — and they all
        happen the day you're too keyed-up to remember them.
      </p>

      {SECTIONS.map(section => (
        <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <h4 style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'hsl(var(--text-muted))' }}>
            {section.title}
          </h4>
          {section.items.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={!!state.ticks[item.id]}
              onClick={() => toggle(item.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.55rem', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0',
                color: state.ticks[item.id] ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))',
                fontSize: '0.8rem', lineHeight: 1.45,
              }}
            >
              {state.ticks[item.id] ? (
                <CheckSquare size={15} color="hsl(var(--easy))" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              ) : (
                <Square size={15} color="hsl(var(--text-muted))" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              )}
              {item.label}
            </button>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label
          htmlFor="checklist-ask"
          style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'hsl(var(--text-muted))' }}
        >
          Questions you will ask them
        </label>
        <textarea
          id="checklist-ask"
          value={state.ask}
          onChange={e => save({ ...state, ask: e.target.value })}
          placeholder={'One per line, e.g.\nWhat does a strong first 90 days look like in this role?\nHow does the team decide what NOT to build?'}
          rows={3}
          style={{
            width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.82rem',
            lineHeight: 1.6, padding: '0.7rem 0.85rem', borderRadius: '10px',
            background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
            border: '1px solid hsl(var(--border-color))', outline: 'none',
          }}
        />
        <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
          "No questions" reads as no interest — walking in with two beats improvising one.
        </span>
      </div>

      <div>
        {/* Clears ticks only — the questions list is meant to be reused and sharpened */}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem' }}
          onClick={() => save({ ...state, ticks: {} })}
        >
          <RotateCcw size={13} /> New interview — untick everything
        </button>
      </div>
    </div>
  );
};
