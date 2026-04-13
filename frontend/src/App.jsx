import { useState } from 'react';
import {
  Shield, LayoutDashboard, Search, Database,
  Wifi, ChevronRight
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Analyze from './components/Analyze';
import Logs from './components/Logs';
import './index.css';

const NAV = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, desc: 'Overview & KPIs' },
  { id: 'analyze',   label: 'Analyze',    icon: Search,           desc: 'Classify Traffic' },
  { id: 'logs',      label: 'Event Logs', icon: Database,         desc: 'Detection History' },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Shield size={18} />
            </div>
            <div>
              <div className="sidebar-title">NetGuard IDS</div>
            </div>
          </div>
          <div className="sidebar-subtitle">Intrusion Detection System</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV.map(({ id, label, icon: Icon, desc }) => (
            <div
              key={id}
              id={`nav-${id}`}
              className={`nav-link ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={17} />
              <div style={{ flex: 1 }}>
                <div style={{ lineHeight: 1.2 }}>{label}</div>
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{desc}</div>
              </div>
              {activeTab === id && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot">
            <Wifi size={13} style={{ marginLeft: 4, opacity: 0.6 }} />
            <span>ML Model Active</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'analyze'   && <Analyze />}
        {activeTab === 'logs'      && <Logs />}
      </main>
    </div>
  );
}

export default App;
