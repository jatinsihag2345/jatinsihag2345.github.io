import React from 'react';
import { Printer } from 'lucide-react';

/**
 * The @media print block in index.css does the real work — stripping the chrome,
 * flattening the glass, forcing ink-friendly colours. This button only invokes it,
 * because "File → Print" is a path most learners never think to try on a web app,
 * and a printed problem page is the one revision aid that survives a dead battery.
 */
export const PrintButton: React.FC = () => (
  <button
    type="button"
    className="btn btn-secondary"
    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
    onClick={() => window.print()}
    title="Print this page — playgrounds and controls are left off the paper"
  >
    <Printer size={16} />
    <span>Print</span>
  </button>
);
