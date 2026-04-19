import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Trash2,
  TrendingUp,
  Clock,
} from "lucide-react";

/* ── Colour palette for Pie slices ── */
const ATTACK_COLOURS = {
  DoS: "#ff4757",
  Probe: "#a29bfe",
  R2L: "#ffa502",
  U2R: "#ff6b81",
  Normal: "#2ed573",
  "Batch Analysis": "#ff7f50", // Coral edge case
  "Unknown Attack": "#ee5253", // Deep red fallback
};
const FALLBACK_COLOURS = ["#1e90ff", "#eccc68", "#ff7f50", "#7bed9f"];

const getBarColor = (name, index) => {
  return (
    ATTACK_COLOURS[name] || FALLBACK_COLOURS[index % FALLBACK_COLOURS.length]
  );
};

/* ── Custom Recharts tooltip ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{ color: p.color || "var(--accent)", fontWeight: 600 }}
        >
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

/* ── Feature bar row ── */
function FeatBar({ label, value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="feat-bar-row">
      <div className="feat-bar-label" title={label}>
        {label}
      </div>
      <div className="feat-bar-track">
        <div className="feat-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="feat-bar-val">{value.toFixed(1)}%</div>
    </div>
  );
}

/* ── Confidence bar inline ── */
function ConfBar({ value, label }) {
  const cls = label?.toLowerCase() === "attack" ? "attack" : "normal";
  return (
    <div className="conf-bar-wrapper">
      <div className="conf-bar-track">
        <div
          className={`conf-bar-fill ${cls}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="conf-value">{value.toFixed(1)}%</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, attacks: 0 });
  const [logs, setLogs] = useState([]);
  const [feats, setFeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, featRes] = await Promise.allSettled([
        axios.get("/api/logs/?limit=10"),
        fetch("/feature-importance/").then(r => r.json()),
      ]);

      if (logsRes.status === "fulfilled") {
        setStats(logsRes.value.data.stats || { total: 0, attacks: 0 });
        setLogs(logsRes.value.data.logs || []);
      }
      if (
        featRes.status === "fulfilled" &&
        Array.isArray(featRes.value.features)
      ) {
        setFeats(featRes.value.features);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const resetSession = async () => {
    setResetting(true);
    try {
      await axios.post("/api/clear/");
      await fetchAll();
    } catch {
      /* ignore */
    }
    setResetting(false);
  };

  /* Derived */
  const normals = stats.total - stats.attacks;
  const attackRate =
    stats.total > 0 ? ((stats.attacks / stats.total) * 100).toFixed(1) : "0.0";
  const MODEL_ACC = stats.model_accuracy || 87.3;

  /* Pie data */
  const pieData = [
    { name: "Attack", value: stats.attacks },
    { name: "Normal", value: normals },
  ].filter(d => d.value > 0);

  /* Recent Confidence Timeline */
  const timelineData = [...logs]
    .reverse() // Chronological order for chart
    .map((log, i) => ({
      name: `Req #${i + 1}`,
      confidence: log.confidence,
      label: log.label,
    }));

  const maxFeat = feats.length > 0 ? feats[0].importance : 1;

  return (
    <>
      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Dashboard Overview</h2>
          <p>
            Real-time network intrusion monitoring · Model v3 (Random Forest)
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            id="btn-refresh"
            className="btn btn-ghost btn-sm"
            onClick={fetchAll}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spinner" : ""} />
            Refresh
          </button>
          <button
            id="btn-reset"
            className="btn btn-danger btn-sm"
            onClick={resetSession}
            disabled={resetting}
          >
            <Trash2 size={14} />
            {resetting ? "Clearing…" : "Reset Session"}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── KPI Stats ── */}
        <div className="stats-grid">
          <div className="stat-card cyan">
            <div className="stat-icon cyan">
              <Activity size={18} />
            </div>
            <div className="stat-value white">
              {stats.total.toLocaleString()}
            </div>
            <div className="stat-label">Total Packets Evaluated</div>
            <div className="stat-sub">
              <TrendingUp size={11} /> All sessions combined
            </div>
          </div>

          <div className="stat-card red">
            <div className="stat-icon red">
              <ShieldAlert size={18} />
            </div>
            <div className="stat-value red">
              {stats.attacks.toLocaleString()}
            </div>
            <div className="stat-label">Attacks Detected</div>
            <div className="stat-sub">{attackRate}% of total traffic</div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon green">
              <CheckCircle2 size={18} />
            </div>
            <div className="stat-value green">{normals.toLocaleString()}</div>
            <div className="stat-label">Normal Traffic</div>
            <div className="stat-sub">Verified clean packets</div>
          </div>

          <div className="stat-card orange">
            <div className="stat-icon orange">
              <Cpu size={18} />
            </div>
            <div className="stat-value orange">
              {stats.total > 0 ? MODEL_ACC : "–"}%
            </div>
            <div className="stat-label">Model Accuracy</div>
            <div className="stat-sub">Random Forest · 20 features</div>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="charts-grid">
          {/* Feature Importance */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <TrendingUp size={14} className="card-title-icon" />
                Top Feature Importances
              </div>
            </div>
            <div className="card-body">
              {stats.total > 0 && feats.length > 0 ? (
                feats
                  .slice(0, 8)
                  .map(f => (
                    <FeatBar
                      key={f.feature}
                      label={f.feature}
                      value={f.importance}
                      max={maxFeat}
                    />
                  ))
              ) : (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  {stats.total > 0
                    ? "Loading feature importance…"
                    : "No data — run an analysis first."}
                </div>
              )}
            </div>
          </div>

          {/* Recent Confidence Timeline */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Clock size={14} className="card-title-icon" />
                Recent Confidence History
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 8 }}>
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart
                    data={timelineData}
                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorConf"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--accent)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--accent)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(255,255,255,0.04)"
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: "var(--text-muted)", strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="confidence"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorConf)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "40px 0",
                  }}
                >
                  No recent activity logged
                </div>
              )}
            </div>
          </div>

          {/* Pie — Traffic Distribution */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Activity size={14} className="card-title-icon" />
                Traffic Distribution
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 8 }}>
              {stats.total > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map(d => (
                        <Cell
                          key={d.name}
                          fill={d.name === "Attack" ? "#ff4757" : "#2ed573"}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "40px 0",
                  }}
                >
                  No data — run an analysis first
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Alerts Table ── */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 14 }}>
            <div className="card-title">
              <Clock size={14} className="card-title-icon" />
              Recent Alerts
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Latest 10 events
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Source IP</th>
                  <th>Protocol</th>
                  <th>Verdict</th>
                  <th>Attack Type</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log, i) => {
                    const label =
                      log.label?.toLowerCase() === "attack"
                        ? "attack"
                        : log.label?.toLowerCase() === "probe"
                          ? "probe"
                          : "normal";
                    return (
                      <tr key={i}>
                        <td className="mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="mono">{log.source_ip || "–"}</td>
                        <td>{log.protocol || "Unknown"}</td>
                        <td>
                          <span className={`badge ${label}`}>
                            <span className="badge-dot" />
                            {log.label}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {log.attack_type || "–"}
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <ConfBar value={log.confidence} label={log.label} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <Activity size={32} />
                        <p>No recent events — upload or analyze some traffic</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
