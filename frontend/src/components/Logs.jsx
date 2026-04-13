import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, ChevronDown, ChevronRight, Database, RefreshCw } from 'lucide-react';

export default function Logs() {
  const [allLogs,  setAllLogs]    = useState([]);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [filterLabel, setFilterLabel] = useState('all');

  const fetchLogs = useCallback(async (p) => {
    setLoading(true);
    try {
      const resp = await axios.get(`/api/logs/?page=${p}&limit=50`);
      setAllLogs(resp.data.logs || []);
      setTotalPages(resp.data.total_pages || 1);
      setTotal(resp.data.stats?.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(page); }, [page, fetchLogs]);

  const toggleRow = i => setExpandedRow(expandedRow === i ? null : i);

  /* Client-side filter */
  const filtered = allLogs.filter(log => {
    const matchLabel = filterLabel === 'all' || log.label?.toLowerCase() === filterLabel;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      log.source_ip?.toLowerCase().includes(q) ||
      log.protocol?.toLowerCase().includes(q) ||
      log.label?.toLowerCase().includes(q) ||
      log.attack_type?.toLowerCase().includes(q);
    return matchLabel && matchSearch;
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Event Logs</h2>
          <p>Historical intrusion detection records · {total.toLocaleString()} total events</p>
        </div>
        <button
          id="btn-refresh-logs"
          className="btn btn-ghost btn-sm"
          onClick={() => fetchLogs(page)}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          Refresh
        </button>
      </div>

      <div className="page-body">
        <div className="card">
          {/* ── Filter bar ── */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="filter-bar">
              <div className="search-input-wrap">
                <Search size={14} />
                <input
                  id="log-search"
                  className="search-input"
                  type="text"
                  placeholder="Search IP, protocol, verdict, or attack type…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Label filter buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'attack', 'normal'].map(f => (
                  <button
                    key={f}
                    id={`filter-${f}`}
                    className={`btn btn-ghost btn-sm ${filterLabel === f ? 'active' : ''}`}
                    onClick={() => setFilterLabel(f)}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {filtered.length} / {allLogs.length} rows
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th>Timestamp</th>
                  <th>Source IP</th>
                  <th>Protocol</th>
                  <th>Verdict</th>
                  <th>Attack Type</th>
                  <th style={{ minWidth: 150 }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="spinner" style={{ margin: '0 auto 12px' }} />
                        <p>Loading logs…</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <Database size={32} />
                        <p>{search || filterLabel !== 'all' ? 'No results match your filter.' : 'No logs yet — run an analysis to populate.'}</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((log, i) => {
                  const label  = log.label?.toLowerCase() === 'attack' ? 'attack'
                               : log.label?.toLowerCase() === 'probe'  ? 'probe' : 'normal';
                  const isOpen = expandedRow === i;
                  const hasPayload = !!log.payload;

                  return (
                    <React.Fragment key={i}>
                      <tr
                        className={isOpen ? 'expanded-parent' : ''}
                        onClick={() => hasPayload && toggleRow(i)}
                        style={{ cursor: hasPayload ? 'pointer' : 'default' }}
                      >
                        <td style={{ color: 'var(--text-muted)', paddingRight: 0 }}>
                          {hasPayload
                            ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                            : null}
                        </td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="mono">{log.source_ip || '–'}</td>
                        <td>{log.protocol || '–'}</td>
                        <td>
                          <span className={`badge ${label}`}>
                            <span className="badge-dot" />{log.label}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{log.attack_type || '–'}</td>
                        <td style={{ minWidth: 150 }}>
                          <div className="conf-bar-wrapper">
                            <div className="conf-bar-track">
                              <div
                                className={`conf-bar-fill ${label}`}
                                style={{ width: `${log.confidence}%` }}
                              />
                            </div>
                            <div className="conf-value">{log.confidence?.toFixed(1)}%</div>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="payload-row">
                          <td colSpan={7}>
                            <div className="payload-content">
                              <strong style={{ color: 'var(--text-secondary)' }}>▶ Raw Payload:</strong><br /><br />
                              {log.payload}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="pagination">
            <div className="pagination-info">
              Page {page} of {totalPages} &nbsp;·&nbsp; {total.toLocaleString()} total events
            </div>
            <div className="pagination-controls">
              <button
                id="btn-prev-page"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>
              <span className="page-num">Page {page} / {totalPages}</span>
              <button
                id="btn-next-page"
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
