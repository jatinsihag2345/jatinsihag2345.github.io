import React from 'react';
import { Printer } from 'lucide-react';
import { dsaQuestions, dsaTheories } from '../data/dsaQuestions';
import { readText } from '../utils/persistence';
import commonMistakes from '../data/commonMistakes.json';

/**
 * Feature 34 — "Print topic pack": one topic's revision kit on paper.
 *
 * The existing PrintButton prints whatever page is on screen. This prints something
 * no screen ever shows in one place: the topic's theory, YOUR notes and plans for
 * that topic's questions, and the curated common-mistakes entries — the exact bundle
 * you'd want on the train before an interview, and the one that survives a dead
 * battery.
 *
 * Mechanism copied from PrintCards (Core CS flashcards): the button stamps
 * <html data-print="topic"> for the duration of the print dialog; the print CSS
 * then hides every direct child of .dsa-screen and reveals the TopicPackSheet
 * (mounted always, display:none on screen). A DOM attribute rather than React
 * state because the swap must exist purely in the print stylesheet — no re-render
 * between "user clicked" and "browser snapshots".
 *
 * Lands at: src/components/TopicPack.tsx  (button in DSAHub's theory view; sheet
 * as a direct child of DSAHub's .dsa-screen root)
 */

interface MistakeEntry {
  mistake: string;
  why: string;
  consequence: string;
  instead: string;
}

export const TopicPackButton: React.FC<{ topic: string }> = ({ topic }) => {
  // window.print is universal in practice, but an honest disabled button beats a
  // dead one anywhere it isn't (embedded webviews are the usual culprit).
  const canPrint = typeof window !== 'undefined' && typeof window.print === 'function';

  const printPack = () => {
    document.documentElement.dataset.print = 'topic';
    const clear = () => {
      delete document.documentElement.dataset.print;
      window.removeEventListener('afterprint', clear);
    };
    // Two exits on purpose (same as PrintCards): desktop browsers block inside
    // print() until the dialog closes (so the line after it is the cleanup), while
    // mobile ones return immediately, snapshot synchronously, and fire afterprint
    // later. clear() is idempotent, so whichever path runs second is a no-op.
    window.addEventListener('afterprint', clear);
    window.print();
    clear();
  };

  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
      onClick={printPack}
      disabled={!canPrint}
      title={
        canPrint
          ? `Print a ${topic} revision pack — the theory, your own notes, and the known slip-ups`
          : 'Printing is not available in this browser'
      }
    >
      <Printer size={15} />
      <span>Print topic pack</span>
    </button>
  );
};

/** Theory section content may embed ASCII diagrams inside ``` fences — same
 *  alternating-segment trick DSAHub's screen renderer uses, minus the styling
 *  (the print stylesheet owns the look on paper). */
const FencedText: React.FC<{ content: string }> = ({ content }) => (
  <>
    {content.split('```').map((segment, i) =>
      i % 2 === 1 ? (
        <pre key={i}>{segment.replace(/^\n/, '').replace(/\n$/, '')}</pre>
      ) : (
        segment.trim() && <p key={i} style={{ whiteSpace: 'pre-wrap' }}>{segment.trim()}</p>
      ),
    )}
  </>
);

/**
 * The paper pack. Never visible on screen (.topic-pack-sheet is display:none
 * outside topic-mode printing), so it costs DOM weight only — and it must stay
 * mounted, because the mode flag lives on <html>, outside React's knowledge.
 *
 * Notes are read at render time, not cached: DSAHub re-renders on every topic
 * switch and remounts whenever the learner returns from a problem page, so the
 * pack is never staler than the hub around it.
 */
export const TopicPackSheet: React.FC<{ topic: string }> = ({ topic }) => {
  const theory = dsaTheories[topic];
  const questions = dsaQuestions.filter(q => q.topic === topic);

  const noted = questions
    .map(q => ({ q, plan: readText(`plan-${q.id}`).trim(), notes: readText(`notes-${q.id}`).trim() }))
    .filter(e => e.plan.length > 0 || e.notes.length > 0);

  const mistakes = questions
    .map(q => ({ q, entries: ((commonMistakes as Record<string, MistakeEntry[]>)[q.title] ?? []) }))
    .filter(e => e.entries.length > 0);

  return (
    <div className="topic-pack-sheet">
      <h2>{topic} — topic pack</h2>
      <p>
        Printed {new Date().toISOString().slice(0, 10)} · theory, your own notes for{' '}
        {noted.length} of {questions.length} problems, and curated slip-ups for {mistakes.length}.
        Full code listings stay on screen — this pack keeps to concepts, your words, and known traps.
      </p>

      {/* ---- 1. Theory ------------------------------------------------------- */}
      {theory ? (
        <>
          <h3>Concepts</h3>
          <div className="pack-block">
            <p style={{ whiteSpace: 'pre-wrap' }}>{theory.summary}</p>
          </div>
          <div className="pack-block">
            <h4>Prerequisites</h4>
            <ul>{theory.preRequisites.map((item, i) => <li key={i}>{item}</li>)}</ul>
            <h4>Cheat sheet</h4>
            <ul>{theory.cheatSheet.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
          {(theory.sections || []).map((section, i) => (
            <div key={i}>
              <h4>{section.title}</h4>
              <FencedText content={section.content} />
              {section.code && <pre>{section.code}</pre>}
            </div>
          ))}
        </>
      ) : (
        <p>No broad theory is written for this topic yet — the pack carries your notes and the known slip-ups.</p>
      )}

      {/* ---- 2. Your notes ---------------------------------------------------- */}
      <h3>Your notes & plans</h3>
      {noted.length === 0 ? (
        <p>
          Nothing written for {topic} yet. Plans and notes you type on any problem
          page would print here — your own words are the best revision material this
          pack could carry.
        </p>
      ) : (
        noted.map(({ q, plan, notes }) => (
          <div key={q.id} className="pack-block">
            <h4>{q.title} ({q.difficulty})</h4>
            {/* The plan came first chronologically (written before the reveal), so
                it reads first here too — same order as the Markdown export. */}
            {plan && (
              <>
                <p><strong>My plan before coding</strong></p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{plan}</p>
              </>
            )}
            {notes && (
              <>
                <p><strong>Notes</strong></p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{notes}</p>
              </>
            )}
          </div>
        ))
      )}

      {/* ---- 3. Common mistakes ---------------------------------------------- */}
      {mistakes.length > 0 && (
        <>
          <h3>Slip-ups interviewers watch for</h3>
          {mistakes.map(({ q, entries }) => (
            <div key={q.id}>
              <h4>{q.title}</h4>
              {entries.map((m, i) => (
                <div key={i} className="pack-block">
                  <p><strong>{m.mistake}</strong></p>
                  <p>Why it happens: {m.why}</p>
                  <p>What goes wrong: {m.consequence}</p>
                  <p>Instead: {m.instead}</p>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
};
