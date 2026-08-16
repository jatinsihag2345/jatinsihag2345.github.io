import React, { useEffect, useState } from 'react';
import { GraduationCap, Lock } from 'lucide-react';
import { readText, writeText } from '../utils/persistence';
import { VoiceDictation } from './VoiceDictation';
import { RubberDuck } from './RubberDuck';

/** Broadcast by PythonPlayground when a graded run goes green (see wiring) — an event
 *  instead of a prop so the pass signal doesn't have to be drilled through the viewer. */
export const TESTS_PASSED_EVENT = 'dsa:tests-passed';

interface ExplainBackProps {
  questionId: string;
  /** True once the learner has opened the approaches — the other honest unlock. */
  revealed: boolean;
}

/**
 * The Feynman box.
 *
 * Passing the tests proves the code works; it does not prove you can say WHY out loud,
 * which is the half of the interview the editor never rehearses. This box opens at
 * exactly the moment there is something worth explaining — tests green, or solutions
 * revealed — and asks for the explanation in interviewer-facing words.
 *
 * The payoff is deferred on purpose: what you write here greets you inside RecallRating
 * when the problem next comes due (see wiring), so past-you does the warm-up for the
 * rep that actually tests the memory.
 */
export const ExplainBack: React.FC<ExplainBackProps> = ({ questionId, revealed }) => {
  const storageKey = `explain-${questionId}`;
  const [text, setText] = useState(() => readText(storageKey));
  const [passed, setPassed] = useState(false);

  // New question, new box — a pass on the previous problem must not unlock this one.
  useEffect(() => {
    setText(readText(`explain-${questionId}`));
    setPassed(false);
  }, [questionId]);

  useEffect(() => {
    const onPass = (e: Event) => {
      const detail = (e as CustomEvent<{ questionId?: string }>).detail;
      // The id check guards against a slow run finishing after a question switch.
      if (detail?.questionId === questionId) setPassed(true);
    };
    window.addEventListener(TESTS_PASSED_EVENT, onPass);
    return () => window.removeEventListener(TESTS_PASSED_EVENT, onPass);
  }, [questionId]);

  // An existing explanation also unlocks: they earned it in a previous session and
  // should be able to revise it without re-running anything.
  const unlocked = revealed || passed || text.trim().length > 0;

  if (!unlocked) {
    return (
      <div
        className="glass"
        style={{
          padding: '0.85rem 1.25rem', borderRadius: '12px',
          border: '1px dashed hsl(var(--border-color))',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
        }}
      >
        <Lock size={14} color="hsl(var(--text-muted))" aria-hidden="true" />
        <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
          The explain-it-back box opens once your tests pass or you reveal the solutions —
          explaining a thing you can't yet solve is just guessing with confidence.
        </span>
      </div>
    );
  }

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.25rem 1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <GraduationCap size={18} color="hsl(var(--secondary))" />
        <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Explain it like I'm your interviewer</h4>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        Working code is half the interview; the narrated why is the other half. Two or three
        sentences: the idea, why it's correct, what it costs. If a sentence goes vague,
        that's the exact spot the understanding is thin — which is the point of writing it.
      </p>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); writeText(storageKey, e.target.value); }}
        aria-label="Explain this solution as if to your interviewer"
        placeholder='e.g. "We trade a second pass for a hash map: each element asks whether its complement was already seen, so one walk does the work of the nested loop. O(n) time, O(n) space."'
        rows={4}
        style={{
          width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.88rem',
          lineHeight: 1.6, padding: '0.85rem 1rem', borderRadius: '10px',
          background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
          border: '1px solid hsl(var(--border-color))', outline: 'none',
        }}
      />

      {/* In the room you'll be SAYING this — the mic makes speaking count as writing.
          Appends finalised speech only; interim words stay in the mic's own muted
          line. Feature-detected inside: no SpeechRecognition, no button. */}
      <VoiceDictation
        targetLabel="the explanation box"
        onAppend={spoken => {
          setText(prev => {
            const next = prev.trim() ? `${prev.replace(/\s+$/, '')} ${spoken}` : spoken;
            writeText(storageKey, next);
            return next;
          });
        }}
      />

      {/* Its own visual weight, not a footnote under the textarea: the mic above turns
          speech into TEXT, this keeps the speech itself, and its rubric score now
          feeds the "Interview readiness" radar (ReadinessRadar) — spoken-explanation
          quality is no longer a side quest nobody sees the payoff of. Audio in
          IndexedDB (never the backup), rubric scores under duck-<id>. Feature-detected
          inside — no MediaRecorder, no dead record button. */}
      <div style={{ borderTop: '1px dashed hsl(var(--border-color))', paddingTop: '0.9rem' }}>
        <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--text-muted))', marginBottom: '0.6rem' }}>
          THEN SAY IT OUT LOUD — THIS SCORE COUNTS TOWARD YOUR READINESS
        </p>
        <RubberDuck questionId={questionId} />
      </div>

      <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
        Saved on this browser. When this problem comes back due for review, this explanation
        greets you before you re-attempt it — past-you briefing present-you.
      </span>
    </div>
  );
};
