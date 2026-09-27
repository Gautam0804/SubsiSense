// src/App.jsx
import { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import MineMap from './pages/MineMap';
import LiveMonitoring from './pages/LiveMonitoring';
import AIRiskAnalysis from './pages/AIRiskAnalysis';
import SafetyWorkers from './pages/SafetyWorkers';
import { useTheme } from './hooks/useTheme';
import './styles/global.css';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const { theme, toggleTheme } = useTheme();

  const navigate = (page) => setActivePage(page);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':       return <Dashboard onNavigate={navigate} />;
      case 'mine-map':        return <MineMap onNavigate={navigate} />;
      case 'live-monitoring': return <LiveMonitoring />;
      case 'ai-risk':         return <AIRiskAnalysis />;
      case 'safety-workers':  return <SafetyWorkers />;
      default:                return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-layout">
      <Navbar
        activePage={activePage}
        onNavigate={navigate}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {renderPage()}
    </div>
  );
}
