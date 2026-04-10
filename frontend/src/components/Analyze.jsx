import { useState, useRef } from 'react';
import axios from 'axios';

function Analyze() {
  const [activeTab, setActiveTab] = useState('batch');
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  const [form, setForm] = useState({
    protocol_type: '',
    service: '',
    src_bytes: '0',
    dst_bytes: '0',
    duration: '0',
    flag: ''
  });
  const [singleResult, setSingleResult] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const uploadFile = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await axios.post('/api/upload/', formData);
      setResults(resp.data.results || []);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        alert('Upload failed: ' + err.response.data.error);
      } else {
        alert('Upload failed: ' + err.message);
      }
    }
    setLoading(false);
  };

  const submitManual = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Cast integers
      const features = { ...form, src_bytes: parseInt(form.src_bytes), dst_bytes: parseInt(form.dst_bytes), duration: parseInt(form.duration) };
      const resp = await axios.post('/api/predict/', { features });
      setSingleResult(resp.data);
    } catch (err) {
      console.error(err);
      alert('Prediction failed.');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="header">
        <h2>Analyze Network Traffic</h2>
      </div>

      <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem'}}>
        <button 
          style={{backgroundColor: activeTab === 'batch' ? 'var(--primary-color)' : 'var(--panel-bg)'}}
          onClick={() => setActiveTab('batch')}
        >
          Batch CSV Analysis
        </button>
        <button 
          style={{backgroundColor: activeTab === 'manual' ? 'var(--primary-color)' : 'var(--panel-bg)'}}
          onClick={() => setActiveTab('manual')}
        >
          Manual Payload Input
        </button>
      </div>

      <div className="card">
        {activeTab === 'batch' && (
          <div>
            <h3>Upload Packet Capture (CSV)</h3>
            <div 
              className="dropzone" 
              onDrop={handleDrop} 
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                style={{display: 'none'}} 
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file ? (
                <p>Selected file: <strong>{file.name}</strong></p>
              ) : (
                <p>Drag & Drop your .csv file here, or click to browse</p>
              )}
            </div>
            <button onClick={uploadFile} disabled={!file || loading}>
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>

            {results.length > 0 && (
              <div className="table-container" style={{marginTop: '2rem'}}>
                <h4>Batch Results</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Verdict</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i}>
                        <td>{r.row}</td>
                        <td>
                          <span className={`badge ${r.prediction.toLowerCase() === 'attack' ? 'attack' : 'normal'}`}>
                            {r.prediction}
                          </span>
                        </td>
                        <td>{r.confidence}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manual' && (
          <div>
            <h3>Input Feature Values</h3>
            <form onSubmit={submitManual}>
              <div className="grid-3">
                <div className="form-group">
                  <label>Protocol Type</label>
                  <input type="text" value={form.protocol_type} onChange={e => setForm({...form, protocol_type: e.target.value})} placeholder="e.g. tcp, udp, icmp" required />
                </div>
                <div className="form-group">
                  <label>Service</label>
                  <input type="text" value={form.service} onChange={e => setForm({...form, service: e.target.value})} placeholder="e.g. http, ftp" required />
                </div>
                <div className="form-group">
                  <label>Flag</label>
                  <input type="text" value={form.flag} onChange={e => setForm({...form, flag: e.target.value})} placeholder="e.g. SF, S0" required />
                </div>
                <div className="form-group">
                  <label>Duration (ms)</label>
                  <input type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Source Bytes</label>
                  <input type="number" value={form.src_bytes} onChange={e => setForm({...form, src_bytes: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Destination Bytes</label>
                  <input type="number" value={form.dst_bytes} onChange={e => setForm({...form, dst_bytes: e.target.value})} required />
                </div>
              </div>
              <button type="submit" disabled={loading}>{loading ? 'Evaluating...' : 'Evaluate Payload'}</button>
            </form>

            {singleResult && (
              <div style={{marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                <h3>Analysis Verdict: <span className={singleResult.prediction === 'Attack' ? 'badge attack' : 'badge normal'} style={{fontSize: '1rem'}}>{singleResult.prediction}</span></h3>
                <div className="bar-chart-container" style={{maxWidth: '400px', marginTop: '1rem'}}>
                  <div className="bar-row">
                    <div className="bar-label">Confidence</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${singleResult.confidence}%`, backgroundColor: singleResult.prediction === 'Attack' ? 'var(--attack-color)' : 'var(--normal-color)' }}></div>
                    </div>
                    <div className="bar-value">{singleResult.confidence}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Analyze;
