// src/components/Navbar.jsx
import { Sun, Moon } from 'lucide-react';
import { getBadgeClass, getStatusLabel } from '../utils/riskUtils';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'mine-map', label: 'Mine Map' },
  { id: 'live-monitoring', label: 'Live Monitoring' },
  { id: 'ai-risk', label: 'AI Risk Analysis' },
  { id: 'safety-workers', label: 'Safety & Workers' },
];

export default function Navbar({ activePage, onNavigate, theme, onToggleTheme }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => onNavigate('dashboard')}>
        <span className="navbar-brand-name">SubsiSense</span>
        <span className="navbar-brand-sub">Mine Subsidence Monitoring</span>
      </div>

      <div className="navbar-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-link${activePage === tab.id ? ' active' : ''}`}
            onClick={() => onNavigate(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="navbar-right">
        <div className="system-status">
          <span className="status-dot" />
          <span>System Online</span>
        </div>

        <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'light'
            ? <><Moon size={13} /> Dark</>
            : <><Sun size={13} /> Light</>
          }
        </button>
      </div>
    </nav>
  );
}
