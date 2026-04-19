import { useState, useRef } from 'react';
import axios from 'axios';
import {
  Upload, Terminal, FileText, PlayCircle,
  CheckCircle, XCircle, AlertTriangle, Loader2, X, Info
} from 'lucide-react';

/* ── Manual feature defaults ── */
const FORM_DEFAULT = {
  'tcp.srcport': '0',
  'tcp.dstport': '502',
  'tcp.len': '0',
  'tcp.seq': '0',
  'tcp.ack': '0',
  'mbtcp.trans_id': '0',
  'mbtcp.len': '0',
  'modbus.func_code': '0',
  inter_arrival: '0',
  tcp_payload_ratio: '0',
  rolling_pkt_rate: '0',
  seq_delta: '0',
  rare_func_code: '0',
  is_modbus_port: '0',
  txn_reuse: '0',
  'tcp.seq_log': '0',
  'tcp.ack_log': '0',
  inter_arrival_log: '0',
  seq_delta_log: '0',
  rolling_pkt_rate_log: '0',
};

const FIELD_META = {
  'tcp.srcport':           { label: 'TCP Src Port',          placeholder: '0–65535' },
  'tcp.dstport':           { label: 'TCP Dst Port',          placeholder: '502' },
  'tcp.len':               { label: 'TCP Length',            placeholder: 'bytes' },
  'tcp.seq':               { label: 'Sequence Number',       placeholder: '0' },
  'tcp.ack':               { label: 'Acknowledgment',        placeholder: '0' },
  'mbtcp.trans_id':        { label: 'ModbusTCP Trans ID',    placeholder: '0' },
  'mbtcp.len':             { label: 'ModbusTCP Length',      placeholder: '0' },
  'modbus.func_code':      { label: 'Modbus Func Code',      placeholder: '0' },
  inter_arrival:           { label: 'Inter-Arrival (ms)',    placeholder: '0.0' },
  tcp_payload_ratio:       { label: 'TCP Payload Ratio',     placeholder: '0.0' },
  rolling_pkt_rate:        { label: 'Rolling Pkt Rate',      placeholder: '0.0' },
  seq_delta:               { label: 'Seq Delta',             placeholder: '0' },
  rare_func_code:          { label: 'Rare Func Code (0/1)',  placeholder: '0' },
  is_modbus_port:          { label: 'Is Modbus Port (0/1)',  placeholder: '1' },
  txn_reuse:               { label: 'Txn Reuse (0/1)',       placeholder: '0' },
  'tcp.seq_log':           { label: 'Seq Log',               placeholder: '0.0' },
  'tcp.ack_log':           { label: 'Ack Log',               placeholder: '0.0' },
  inter_arrival_log:       { label: 'Inter-Arrival Log',     placeholder: '0.0' },
  seq_delta_log:           { label: 'Seq Delta Log',         placeholder: '0.0' },
  rolling_pkt_rate_log:    { label: 'Pkt Rate Log',          placeholder: '0.0' },
};

/* ── Inline confidence bar ── */
function ConfBar({ value, pred }) {
  const isAttack = pred?.toLowerCase() === 'attack';
  return (
    <div className="conf-bar-wrapper">
      <div className="conf-bar-track">
        <div
          className={`conf-bar-fill ${isAttack ? 'attack' : 'normal'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="conf-value">{value}%</div>
    </div>
  );
}

export default function Analyze() {
  const [tab, setTab] = useState('batch');
  /* Batch state */
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [warning, setWarning] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  /* Manual state */
  const [form, setForm]           = useState(FORM_DEFAULT);
  const [singleResult, setSingleResult] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  /* ─── Batch handlers ─── */
  const onDrop = e => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setResults([]); }
  };
  const onFileChange = e => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResults([]); }
  };
  const clearFile = e => { e.stopPropagation(); setFile(null); setResults([]); setWarning(null); };

  const runAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setWarning(null);
    const fd = new FormData(); fd.append('file', file);
    try {
      const resp = await axios.post('/api/upload/', fd);
      setResults(resp.data.results || []);
      if (resp.data.warning) setWarning(resp.data.warning);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      alert('Upload failed: ' + msg);
    }
    setLoading(false);
  };

  /* ─── Manual handlers ─── */
  const submitManual = async e => {
    e.preventDefault(); setManualLoading(true); setSingleResult(null);
    try {
      const features = {};
      Object.entries(form).forEach(([k, v]) => { features[k] = isNaN(v) ? v : parseFloat(v); });
      const resp = await axios.post('/api/predict/', { features });
      setSingleResult(resp.data);
    } catch (err) {
      alert('Prediction failed: ' + (err.response?.data?.error || err.message));
    }
    setManualLoading(false);
  };

  const attackCount  = results.filter(r => r.prediction?.toLowerCase() === 'attack').length;
  const normalCount  = results.length - attackCount;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Analyze Network Traffic</h2>
          <p>Run ML-powered intrusion detection on packet data</p>
        </div>
      </div>

      <div className="page-body">
        {/* ── Tab strip ── */}
        <div className="tab-strip">
          <button
            id="tab-batch"
            className={`tab-btn ${tab === 'batch' ? 'active' : ''}`}
            onClick={() => setTab('batch')}
          >
            <Upload size={14} /> Batch CSV Analysis
          </button>
          <button
            id="tab-manual"
            className={`tab-btn ${tab === 'manual' ? 'active' : ''}`}
            onClick={() => setTab('manual')}
          >
            <Terminal size={14} /> Manual Feature Input
          </button>
        </div>

        {/* ════════ BATCH TAB ════════ */}
        {tab === 'batch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Upload zone card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title"><FileText size={14} /> Upload Packet Capture (CSV)</div>
              </div>
              <div className="card-body">
                <div
                  id="dropzone"
                  className={`dropzone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                  onDrop={onDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    type="file" accept=".csv"
                    ref={fileRef} style={{ display: 'none' }}
                    onChange={onFileChange}
                  />
                  {file ? (
                    <>
                      <div className="dropzone-icon"><FileText size={36} /></div>
                      <div className="dropzone-text">
                        <strong style={{ color: 'var(--accent)' }}>{file.name}</strong>
                      </div>
                      <div className="dropzone-sub">{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: 12 }}
                        onClick={clearFile}
                      >
                        <X size={13} /> Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="dropzone-icon"><Upload size={36} /></div>
                      <div className="dropzone-text">Drag & drop your <strong>.csv</strong> file here</div>
                      <div className="dropzone-sub">or click to browse · Max 500 rows processed</div>
                    </>
                  )}
                </div>

                <button
                  id="btn-run-analysis"
                  className="btn btn-primary"
                  onClick={runAnalysis}
                  disabled={!file || loading}
                >
                  {loading ? <><Loader2 size={15} className="spinner" /> Analyzing…</> : <><PlayCircle size={15} /> Run Analysis</>}
                </button>
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <>
                {/* Column mismatch warning */}
                {warning && (
                  <div style={{
                    display: 'flex', gap: 12, padding: '12px 16px',
                    background: 'rgba(255,165,2,0.08)', border: '1px solid rgba(255,165,2,0.3)',
                    borderRadius: 10, fontSize: 13, color: 'var(--warning)', marginBottom: 4
                  }}>
                    <Info size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>CSV Column Mismatch:</strong> {warning}
                    </div>
                  </div>
                )}

                {/* Summary stat strip */}
                <div className="stats-grid" style={{ marginBottom: 4 }}>
                  <div className="stat-card cyan">
                    <div className="stat-value white">{results.length}</div>
                    <div className="stat-label">Total Rows</div>
                  </div>
                  <div className="stat-card red">
                    <div className="stat-value red">{attackCount}</div>
                    <div className="stat-label">Attacks Found</div>
                  </div>
                  <div className="stat-card green">
                    <div className="stat-value green">{normalCount}</div>
                    <div className="stat-label">Normal Traffic</div>
                  </div>
                </div>

                {/* Results table */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title"><FileText size={14} /> Batch Results</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Showing {Math.min(results.length, 500)} rows
                    </div>
                  </div>
                  <div className="table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Prediction</th>
                          <th style={{ minWidth: 160 }}>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => {
                          const cls = r.prediction?.toLowerCase() === 'attack' ? 'attack' : 'normal';
                          return (
                            <tr key={i}>
                              <td className="mono" style={{ color: 'var(--text-muted)' }}>#{r.row}</td>
                              <td>
                                <span className={`badge ${cls}`}>
                                  <span className="badge-dot" />{r.prediction}
                                </span>
                              </td>
                              <td style={{ minWidth: 160 }}>
                                <ConfBar value={r.confidence} pred={r.prediction} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════ MANUAL TAB ════════ */}
        {tab === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Terminal size={14} /> Input Feature Values</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>20 engineered features · Random Forest model</div>
              </div>
              <div className="card-body">
                <form onSubmit={submitManual}>
                  <div className="form-grid">
                    {Object.keys(FORM_DEFAULT).map(key => {
                      const meta = FIELD_META[key] || { label: key, placeholder: '0' };
                      return (
                        <div key={key} className="form-group">
                          <label className="form-label" htmlFor={`field-${key}`}>{meta.label}</label>
                          <input
                            id={`field-${key}`}
                            className="form-input"
                            type="number"
                            step="any"
                            value={form[key]}
                            placeholder={meta.placeholder}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    <button
                      id="btn-evaluate"
                      type="submit"
                      className="btn btn-primary"
                      disabled={manualLoading}
                    >
                      {manualLoading
                        ? <><Loader2 size={15} className="spinner" /> Evaluating…</>
                        : <><PlayCircle size={15} /> Evaluate Payload</>}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => { setForm(FORM_DEFAULT); setSingleResult(null); }}
                    >
                      Reset Fields
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Result banner */}
            {singleResult && (
              <div className={`alert-banner ${singleResult.prediction === 'Attack' ? 'attack' : 'success'}`}>
                {singleResult.prediction === 'Attack'
                  ? <XCircle size={20} style={{ flexShrink: 0 }} />
                  : <CheckCircle size={20} style={{ flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    Verdict: {singleResult.prediction}
                    {singleResult.attack_type && singleResult.attack_type !== 'None' &&
                      <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, opacity: 0.8 }}>
                        ({singleResult.attack_type})
                      </span>
                    }
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                    Confidence: {singleResult.confidence}% &nbsp;·&nbsp;
                    Model: Random Forest v3
                  </div>
                  <div className="conf-bar-wrapper" style={{ marginTop: 10, maxWidth: 360 }}>
                    <div className="conf-bar-track" style={{ height: 8 }}>
                      <div
                        className={`conf-bar-fill ${singleResult.prediction === 'Attack' ? 'attack' : 'normal'}`}
                        style={{ width: `${singleResult.confidence}%` }}
                      />
                    </div>
                    <div className="conf-value">{singleResult.confidence}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
