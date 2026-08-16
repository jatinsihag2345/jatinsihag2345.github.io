import React from 'react';

interface State {
  error: Error | null;
}

/**
 * The app had ZERO error boundaries anywhere — a runtime bug review confirmed
 * that ANY uncaught throw during React's commit phase (a full localStorage
 * quota was one concrete trigger, but far from the only possible one) unmounts
 * the entire tree. A learner mid-problem gets a blank white page with no
 * indication anything went wrong, no way back, and — worse — no guarantee
 * their answer was saved before the crash.
 *
 * This does not fix the underlying throw (writeJson/writeText are guarded at
 * the source now); it is the backstop for whatever the next one turns out to
 * be. "Reload" is offered, never "keep going" — React's own state is already
 * unreliable once an error escaped a render, so pretending to recover in place
 * would risk a corrupted second failure.
 */
export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Uncaught render error — the app would otherwise have gone blank:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'hsl(var(--bg-primary, 220 25% 8%))',
          color: 'hsl(var(--text-primary, 0 0% 95%))',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: '440px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Something broke on this screen</h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
            Your progress up to your last graded run or note is already saved. Reloading almost
            always clears this — if it keeps happening on the same page, your browser storage may
            be full; Settings → Export progress frees it up safely.
          </p>
          <pre
            style={{
              fontSize: '0.72rem',
              opacity: 0.55,
              textAlign: 'left',
              overflowX: 'auto',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'hsl(0 0% 100% / 0.05)',
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: 'hsl(210 90% 55%)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
