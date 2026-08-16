import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { SettingsPanel } from './SettingsPanel';
import { InstallPrompt, type BeforeInstallPromptEvent } from './InstallPrompt';
import { LayoutDashboard, Code2, Database, Sparkles, Timer, BarChart3, GraduationCap, Container } from 'lucide-react';
import { ProfileButton } from './ProfileButton';

interface SidebarProps {
  currentTab: string;
  /** Stashed beforeinstallprompt from App — null until the browser offers install. */
  installPrompt?: BeforeInstallPromptEvent | null;
  setCurrentTab: (tab: string) => void;
  dsaProgress: number;
  sqlProgress: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  installPrompt,
  setCurrentTab,
  dsaProgress,
  sqlProgress,
}) => {
  // Each section owns a colour. Uniform white-on-dark icons were unreadable at
  // rail size and gave no way to navigate by memory — colour is the fastest
  // "which tab is that" cue there is, and it survives being 20px wide.
  const navItems = [
    { id: 'dashboard', name: 'Dashboard',     icon: LayoutDashboard, hue: '199 89% 60%' },  // sky
    { id: 'dsa',       name: 'DSA SDE Sheet', icon: Code2,           hue: '84 81% 55%',  progress: dsaProgress },  // lime
    { id: 'sql',       name: 'SQL Top 50',    icon: Database,        hue: '330 81% 65%', progress: sqlProgress },  // pink
    { id: 'devops',    name: 'DevOps',        icon: Container,       hue: '174 72% 50%' },  // teal
    { id: 'core',      name: 'Core CS',       icon: GraduationCap,   hue: '38 92% 58%'  },  // amber
    { id: 'drill',     name: 'Mock Drill',    icon: Timer,           hue: '0 84% 65%'   },  // red
    { id: 'stats',     name: 'Stats',         icon: BarChart3,       hue: '265 89% 70%' },  // violet
  ];

  return (
    <div className="sidebar">
      <div className="logo-container">
        <div 
          className="fx-levitate"
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
        <span className="logo-text gradient-text">Striver SDE</span>
      </div>

      <nav style={{ flex: 1 }}>
        {/* [discover] data-tour: the guided tour spotlights the whole rail (stop 1)
            and single tabs (nav-drill / nav-stats) without knowing this markup. */}
        <ul className="nav-links" data-tour="sidebar-tabs">
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
                  data-tour={`nav-${item.id}`}
                  aria-label={item.name}
                  data-tip={item.progress !== undefined ? `${item.name} — ${Math.round(item.progress)}%` : item.name}
                  style={{ ['--nav-hue' as string]: item.hue }}
                >
                  <Icon size={20} strokeWidth={2.2} />
                  <span>{item.name}</span>
                  {/* Rail mode shows progress as a hairline under the icon; the exact
                      number lives in the hover tooltip. */}
                  {item.progress !== undefined && (
                    <span className="rail-progress" aria-hidden="true"
                      style={{ width: `${Math.max(8, Math.round(item.progress))}%`, background: `hsl(${item.hue})` }} />
                  )}
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
        <ProfileButton />
        <div className="rail-hide">
          <InstallPrompt deferred={installPrompt} />
        </div>
        <SettingsPanel />
        <ThemeToggle />
      </div>
    </div>
  );
};
