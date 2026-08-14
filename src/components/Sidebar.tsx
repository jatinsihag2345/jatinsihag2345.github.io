import React from 'react';
import { LayoutDashboard, Code2, Database, Award, Sparkles } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  dsaProgress: number;
  sqlProgress: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  dsaProgress,
  sqlProgress,
}) => {
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'dsa', name: 'DSA SDE Sheet', icon: Code2, progress: dsaProgress },
    { id: 'sql', name: 'SQL MAANG Prep', icon: Database, progress: sqlProgress },
  ];

  return (
    <div className="sidebar">
      <div className="logo-container">
        <div 
          style={{
            background: 'linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--primary)) 100%)',
            padding: '0.5rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px hsl(var(--primary) / 0.3)'
          }}
        >
          <Sparkles size={20} color="white" />
        </div>
        <span className="logo-text gradient-text">MAANG.Prep</span>
      </div>

      <nav style={{ flex: 1 }}>
        <ul className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setCurrentTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                  {item.progress !== undefined && (
                    <span 
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.75rem',
                        background: 'hsl(var(--bg-tertiary))',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        color: 'hsl(var(--text-secondary))',
                        border: '1px solid hsl(var(--border-color))'
                      }}
                    >
                      {Math.round(item.progress)}%
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="nav-footer">
        <div 
          className="glass"
          style={{
            padding: '1rem',
            borderRadius: '12px',
            fontSize: '0.8rem',
            color: 'hsl(var(--text-secondary))',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
            <Award size={16} color="hsl(var(--secondary))" />
            <span>Focused Prep Mode</span>
          </div>
          <span>Solve daily, review patterns, and build interview depth with guided theory, solutions, and traces.</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
          v1.1.0 • MAANG Prep Hub
        </div>
      </div>
    </div>
  );
};
