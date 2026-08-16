import React, { useState } from 'react';
import { Drama } from 'lucide-react';
import { readJson, writeJson } from '../utils/persistence';
import { ReadAloud } from './ReadAloud';

/**
 * Story bank — the behavioral round, pre-written.
 *
 * "Tell me about a time…" rewards preparation more than any coding question does, and
 * is prepared for less than any of them. Six slots cover the prompts that actually get
 * asked; each is drafted beat by beat (Situation / Task / Action / Result) because a
 * story assembled live rambles, and a story assembled here doesn't.
 *
 * 30–60 words per beat ≈ a two-minute answer spoken aloud — long enough to land,
 * short enough that the interviewer still gets their follow-up. The word counter's
 * color is a nudge, never a gate: nothing here locks.
 */

interface Story {
  s: string;
  t: string;
  a: string;
  r: string;
}

const EMPTY: Story = { s: '', t: '', a: '', r: '' };

const isStory = (v: unknown): v is Story => {
  if (!v || typeof v !== 'object') return false;
  const e = v as Story;
  return [e.s, e.t, e.a, e.r].every(f => typeof f === 'string');
};

const SLOTS: { id: string; label: string; prompt: string }[] = [
  { id: 'bug-shipped', label: 'A bug you shipped', prompt: 'The one that reached users — what broke, how you found it, what the cleanup taught you.' },
  { id: 'deadline', label: 'A deadline that hurt', prompt: 'Scope, clock, or both — what you cut, kept, and communicated when time ran out.' },
  { id: 'disagreement', label: 'A disagreement', prompt: 'A technical or priority clash you worked through without pulling rank or caving.' },
  { id: 'learning', label: 'Learning fast', prompt: 'Something you had to get competent at quicker than was comfortable.' },
  { id: 'ownership', label: 'Owning it end to end', prompt: 'A thing that succeeded or failed on your watch alone — and what you did about that.' },
  { id: 'helping', label: 'Helping someone', prompt: 'Unblocking a teammate when it cost you time you did not have.' },
];

const FIELDS: { key: keyof Story; label: string; hint: string }[] = [
  { key: 's', label: 'Situation', hint: 'Where were you, and what was at stake?' },
  { key: 't', label: 'Task', hint: 'What were YOU responsible for?' },
  { key: 'a', label: 'Action', hint: 'What did you actually do — "I", not "we"?' },
  { key: 'r', label: 'Result', hint: 'What changed? Numbers if you have them.' },
];

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

// Gentle cue, not a grade: grey until you start, amber while thin or rambling,
// green in the 30–60 word pocket that speaks in 20–40 seconds.
const cueFor = (n: number): { color: string; note: string } => {
  if (n === 0) return { color: 'hsl(var(--text-muted))', note: '' };
  if (n < 30) return { color: 'hsl(var(--medium))', note: 'thin — aim for 30+' };
  if (n <= 60) return { color: 'hsl(var(--easy))', note: 'right-sized' };
  return { color: 'hsl(var(--medium))', note: 'trim toward 60' };
};

export const StoryBank: React.FC = () => {
  const [stories, setStories] = useState<Record<string, Story>>(() => {
    const init: Record<string, Story> = {};
    SLOTS.forEach(slot => {
      init[slot.id] = readJson<Story>(`story-${slot.id}`, EMPTY, isStory);
    });
    return init;
  });
  const [openSlot, setOpenSlot] = useState(SLOTS[0].id);

  const update = (slotId: string, field: keyof Story, value: string) => {
    setStories(prev => {
      const next = { ...prev, [slotId]: { ...prev[slotId], [field]: value } };
      // Write-through per keystroke, like every other box on the site — behavioral
      // stories are exactly the data you don't want to lose to a closed tab.
      writeJson(`story-${slotId}`, next[slotId]);
      return next;
    });
  };

  const slot = SLOTS.find(s => s.id === openSlot) ?? SLOTS[0];
  const story = stories[slot.id];
  const compiled = FIELDS.map(f => story[f.key].trim()).filter(Boolean).join(' ');
  const totalWords = wordCount(compiled);

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
        <Drama size={18} color="hsl(var(--accent))" />
        Story bank
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        The behavioral round is the most predictable interview you'll face — the same six
        prompts, everywhere. Draft each beat now; in the room you only have to remember,
        not invent.
      </p>

      {/* Slot chips — the n/4 counter shows which stories are still hollow. */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {SLOTS.map(s => {
          const filled = FIELDS.filter(f => wordCount(stories[s.id][f.key]) > 0).length;
          const active = s.id === openSlot;
          return (
            <button
              key={s.id}
              onClick={() => setOpenSlot(s.id)}
              className="lift"
              aria-pressed={active}
              style={{
                cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                padding: '0.35rem 0.7rem', borderRadius: '999px',
                background: active ? 'hsl(var(--accent) / 0.15)' : 'hsl(var(--bg-tertiary))',
                border: `1px solid ${active ? 'hsl(var(--accent))' : 'hsl(var(--border-color))'}`,
                color: active ? 'hsl(var(--accent))' : 'hsl(var(--text-secondary))',
              }}
            >
              {s.label}
              <span style={{ marginLeft: '0.35rem', fontWeight: 600, color: filled === 4 ? 'hsl(var(--easy))' : 'hsl(var(--text-muted))' }}>
                {filled}/4
              </span>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic', lineHeight: 1.5 }}>
        {slot.prompt}
      </p>

      {FIELDS.map(field => {
        const n = wordCount(story[field.key]);
        const cue = cueFor(n);
        return (
          <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{field.label}</span>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', flex: 1 }}>{field.hint}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cue.color, whiteSpace: 'nowrap' }}>
                {n} words{cue.note ? ` · ${cue.note}` : ''}
              </span>
            </div>
            <textarea
              value={story[field.key]}
              onChange={e => update(slot.id, field.key, e.target.value)}
              aria-label={`${slot.label} — ${field.label}`}
              placeholder={field.hint}
              rows={3}
              style={{
                width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                lineHeight: 1.6, padding: '0.7rem 0.9rem', borderRadius: '10px',
                background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
                border: '1px solid hsl(var(--border-color))', outline: 'none',
              }}
            />
          </div>
        );
      })}

      {compiled && (
        <div
          style={{
            padding: '0.9rem 1.1rem', borderRadius: '10px',
            background: 'hsl(var(--bg-secondary) / 0.5)',
            border: '1px dashed hsl(var(--border-color))',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, flex: 1, minWidth: '160px' }}>
              The whole story, read aloud
            </span>
            {/* Reuses the site-wide read-aloud button — hearing your own story at
                speaking pace is the only honest length check. */}
            <ReadAloud text={compiled} label={`your "${slot.label}" story`} />
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>
              {totalWords} words ≈ {Math.max(1, Math.round(totalWords / 140))}–{Math.max(1, Math.round(totalWords / 110))} min spoken
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.65 }}>
            {compiled}
          </p>
        </div>
      )}
    </div>
  );
};
