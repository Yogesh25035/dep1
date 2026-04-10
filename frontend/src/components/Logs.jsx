import { useState, useEffect } from 'react';
import axios from 'axios';

function Logs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (p) => {
    try {
      const resp = await axios.get(`/api/logs/?page=${p}&limit=50`);
      setLogs(resp.data.logs || []);
      setTotalPages(resp.data.total_pages || 1);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="header">
        <h2>Historical Prediction Logs</h2>
      </div>

      <div className="card">
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
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
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
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default Logs;
