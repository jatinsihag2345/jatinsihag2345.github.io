import React from 'react';
import { Printer } from 'lucide-react';
import type { CoreSubject } from '../data/coreSubjects';

/**
 * Print for Core CS (feature 50), part two: the flashcard deck on paper.
 *
 * The existing PrintButton prints the page you are looking at. This pair prints
 * something the screen never shows: the subject's whole deck as a front/back
 * two-column table — foldable paper revision that survives a dead battery.
 *
 * Mechanism: the button stamps <html data-print="cards"> for the duration of the
 * print dialog; index.css's print rules then swap CoreHub's screen content for
 * the FlashcardSheet (mounted always, display:none on screen). A DOM attribute
 * rather than React state because the swap must exist purely in the print
 * stylesheet — no re-render between "user clicked" and "browser snapshots".
 *
 * Lands at: src/components/PrintCards.tsx
 */

export const PrintFlashcardsButton: React.FC = () => {
  // window.print is universal in practice, but an honest disabled button beats a
  // dead one anywhere it isn't (embedded webviews are the usual culprit).
  const canPrint = typeof window !== 'undefined' && typeof window.print === 'function';

  const printCards = () => {
    document.documentElement.dataset.print = 'cards';
    const clear = () => {
      delete document.documentElement.dataset.print;
      window.removeEventListener('afterprint', clear);
    };
    // Two exits on purpose: desktop browsers block inside print() until the
    // dialog closes (so the line after it is the cleanup), while mobile ones
    // return immediately, snapshot synchronously, and fire afterprint later.
    // clear() is idempotent, so whichever path runs second is a no-op.
    window.addEventListener('afterprint', clear);
    window.print();
    clear();
  };

  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
      onClick={printCards}
      disabled={!canPrint}
      title={
        canPrint
          ? 'Print this subject’s flashcards as a front/back table for paper revision'
          : 'Printing is not available in this browser'
      }
    >
      <Printer size={16} />
      <span>Print flashcards</span>
    </button>
  );
};

/**
 * The paper deck: one row per card, front | back. Never visible on screen
 * (.core-flashcard-sheet is display:none outside cards-mode printing), so it
 * costs nothing but DOM weight — and it must stay mounted, because the mode
 * flag lives on <html>, outside React's knowledge.
 */
export const FlashcardSheet: React.FC<{ subject: CoreSubject }> = ({ subject }) => (
  <div className="core-flashcard-sheet">
    <h2 style={{ fontSize: '16pt', marginBottom: '0.25rem' }}>{subject.subject} — flashcards</h2>
    <p style={{ fontSize: '9.5pt', marginBottom: '0.75rem' }}>
      {subject.flashcards.length} cards. Cover the right column (or fold along the
      table’s middle border) and say the back before looking — the same recall-first
      rule as on screen.
    </p>
    <table>
      <thead>
        <tr>
          {/* Fronts are short prompts, backs carry the explanation — 42/58 keeps
              the fold near the middle without squeezing the answers. */}
          <th style={{ width: '42%' }}>Front</th>
          <th>Back</th>
        </tr>
      </thead>
      <tbody>
        {subject.flashcards.map((card, i) => (
          <tr key={i}>
            <td>{card.front}</td>
            <td>{card.back}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
