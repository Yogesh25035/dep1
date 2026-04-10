import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState({ total: 0, attacks: 0 });
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const resp = await axios.get('/api/logs/?limit=10');
      setStats(resp.data.stats || { total: 0, attacks: 0 });
      setLogs(resp.data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const resetSession = async () => {
    if (window.confirm("Are you sure you want to completely clear all packet logs and reset the dashboard?")) {
      try {
        await axios.post('/api/clear/');
        fetchLogs();
      } catch (e) {
        console.error("Failed to clear session logs.");
      }
    }
  };

  const accuracy = stats.total > 0 ? 87.3 : 0; // Mock model accuracy based on prompt 
  // In reality, accuracy is known out-of-band or via model stats, hardcoding typical mock value 87.3% 

  return (
    <div>
      <div className="header">
        <h2>Dashboard Overview</h2>
        <button 
          style={{backgroundColor: 'var(--attack-color)', padding: '0.5rem 1rem'}} 
          onClick={resetSession}
        >
          Reset Session
        </button>
      </div>

      <div className="grid-3">
        <div className="card stat-card">
          <h3>Total Packets Evaluated</h3>
          <p>{stats.total.toLocaleString()}</p>
        </div>
        <div className="card stat-card">
          <h3>Attacks Detected</h3>
          <p style={{color: 'var(--attack-color)'}}>{stats.attacks.toLocaleString()}</p>
        </div>
        <div className="card stat-card">
          <h3>Model Accuracy</h3>
          <p style={{color: 'var(--normal-color)'}}>{accuracy}%</p>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <h3>Top 5 Feature Importances</h3>
          <div className="bar-chart-container">
            <BarRow label="src_bytes" percent={85} />
            <BarRow label="dst_bytes" percent={72} />
            <BarRow label="flag" percent={60} />
            <BarRow label="same_srv_rate" percent={45} />
            <BarRow label="diff_srv_rate" percent={30} />
          </div>
        </div>

        <div className="card">
          <h3>Attack Type Breakdown</h3>
          <div className="bar-chart-container">
            <BarRow label="DoS" percent={70} danger />
            <BarRow label="Probe" percent={20} color="var(--probe-color)" />
            <BarRow label="R2L" percent={8} danger />
            <BarRow label="U2R" percent={2} danger />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Alerts</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Source IP</th>
                <th>Protocol</th>
                <th>Label</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i}>
                  <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="ip-address">{log.source_ip || 'N/A'}</td>
                  <td>{log.protocol || 'Unknown'}</td>
                  <td>
                    <span className={`badge ${log.label.toLowerCase() === 'attack' ? 'attack' : (log.label.toLowerCase() === 'probe' ? 'probe' : 'normal')}`}>
                      {log.label}
                    </span>
                  </td>
                  <td>{log.confidence.toFixed(1)}%</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', color: 'var(--text-muted)'}}>No recent logs available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, percent, danger, color }) {
  const bg = color || (danger ? 'var(--attack-color)' : 'var(--primary-color)');
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${percent}%`, backgroundColor: bg }}></div>
      </div>
      <div className="bar-value">{percent}%</div>
    </div>
  );
}

export default Dashboard;
