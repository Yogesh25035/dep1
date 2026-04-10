import { useState } from 'react';
import { Activity, Search, Database } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Analyze from './components/Analyze';
import Logs from './components/Logs';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container">
      <div className="sidebar">
        <h1>NetGuard IDS</h1>
        
        <div 
          className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Activity size={20} />
          Dashboard
        </div>
        
        <div 
          className={`nav-link ${activeTab === 'analyze' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyze')}
        >
          <Search size={20} />
          Analyze
        </div>
        
        <div 
          className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Database size={20} />
          Logs
        </div>
      </div>
      
      <div className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'analyze' && <Analyze />}
        {activeTab === 'logs' && <Logs />}
      </div>
    </div>
  );
}

export default App;
