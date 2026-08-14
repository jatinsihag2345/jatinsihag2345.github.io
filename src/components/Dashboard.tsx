import React from 'react';
import { Code2, Database, Flame, Bookmark, ArrowRight, Award, CheckCircle } from 'lucide-react';

interface DashboardProps {
  dsaProgress: number;
  sqlProgress: number;
  dsaSolvedCount: number;
  dsaTotalCount: number;
  sqlSolvedCount: number;
  sqlTotalCount: number;
  streak: number;
  bookmarkCount: number;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  dsaProgress,
  sqlProgress,
  dsaSolvedCount,
  dsaTotalCount,
  sqlSolvedCount,
  sqlTotalCount,
  streak,
  bookmarkCount,
  onNavigate,
}) => {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Welcome back, <span className="gradient-text">Future SDE</span>!
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>
          Your MAANG preparation dashboard. Master DSA patterns and SQL window functions to ace interviews.
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Hero Card */}
        <div className="dashboard-hero">
          <div className="hero-text">
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'hsl(var(--secondary) / 0.15)',
                color: 'hsl(var(--secondary))',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                width: 'fit-content'
              }}
            >
              <Flame size={14} />
              <span>INTERVIEW MODE ACTIVE</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', lineHeight: '1.2' }}>Striver SDE Sheet & SQL Top 50 Mastery</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem' }}>
              Your stacked workspace is configured. Solve problems iteratively, analyze follow-ups, and visualize algorithms to build high-quality problem-solving skills.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => onNavigate('dsa')}>
                Continue DSA <ArrowRight size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('sql')}>
                Continue SQL <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {/* DSA Circle */}
            <div className="circular-progress">
              <svg>
                <defs>
                  <linearGradient id="dsaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--secondary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" />
                  </linearGradient>
                </defs>
                <circle className="circle-bg" cx="50" cy="50" r="40" />
                <circle 
                  className="circle-fg" 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="url(#dsaGrad)"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - dsaProgress / 100)}`}
                />
              </svg>
              <div className="progress-text">{Math.round(dsaProgress)}%</div>
              <div style={{ position: 'absolute', bottom: '-20px', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>
                DSA
              </div>
            </div>

            {/* SQL Circle */}
            <div className="circular-progress">
              <svg>
                <defs>
                  <linearGradient id="sqlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--accent))" />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" />
                  </linearGradient>
                </defs>
                <circle className="circle-bg" cx="50" cy="50" r="40" />
                <circle 
                  className="circle-fg" 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="url(#sqlGrad)"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - sqlProgress / 100)}`}
                />
              </svg>
              <div className="progress-text">{Math.round(sqlProgress)}%</div>
              <div style={{ position: 'absolute', bottom: '-20px', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>
                SQL
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stat-card glass glass-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
            <span>DSA Progress</span>
            <Code2 size={20} color="hsl(var(--secondary))" />
          </div>
          <div className="stat-val">{dsaSolvedCount} / {dsaTotalCount}</div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Problems Solved</span>
        </div>

        <div className="stat-card glass glass-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
            <span>SQL Progress</span>
            <Database size={20} color="hsl(var(--accent))" />
          </div>
          <div className="stat-val">{sqlSolvedCount} / {sqlTotalCount}</div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Queries Solved</span>
        </div>

        <div className="stat-card glass glass-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
            <span>Coding Streak</span>
            <Flame size={20} color="orange" />
          </div>
          <div className="stat-val">{streak} {streak === 1 ? 'Day' : 'Days'}</div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
            {streak > 0 ? 'Tracked from your real solve activity.' : 'Start a new streak by solving one problem today.'}
          </span>
        </div>

        <div className="stat-card glass glass-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
            <span>Bookmarked Items</span>
            <Bookmark size={20} color="hsl(var(--accent))" />
          </div>
          <div className="stat-val">{bookmarkCount} Items</div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Flagged questions to review</span>
        </div>
      </div>

      {/* Recommended Topics / Study Plan */}
      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>MAANG Interview Roadmap Tips</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'hsl(var(--secondary))' }}>
              <Award size={18} />
              <span>1. Master Two-Pointer Swaps</span>
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
              Often used in sorting or reverse array questions. Understanding how left and right pointers converge can save you O(N) auxiliary space. Make sure to watch for empty or single element edge cases.
            </p>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'hsl(var(--accent))' }}>
              <Award size={18} />
              <span>2. Windows and Partition CTEs</span>
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
              SQL interviewers love DENSE_RANK() and ROW_NUMBER() combined with PARTITION BY. Always clarify if duplicate values should rank equally or increment.
            </p>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'hsl(var(--easy))' }}>
              <CheckCircle size={18} />
              <span>3. Write Out Pseudo-code First</span>
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
              Don't jump straight into syntax. Spend 5 minutes clarifying edge cases and writing the pseudo-code logic. Interviewers look for structured logical flow before compilation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
