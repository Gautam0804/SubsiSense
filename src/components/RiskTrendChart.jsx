// src/components/RiskTrendChart.jsx
// Risk trend chart showing past → current → predicted trajectory
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

const CustomDot = ({ cx, cy, payload }) => {
  if (payload.predicted) {
    return <circle cx={cx} cy={cy} r={4} fill="none" stroke="var(--accent-blue)" strokeWidth={1.5} strokeDasharray="2,2" />;
  }
  if (payload.time === 'Now') {
    return <circle cx={cx} cy={cy} r={5} fill="var(--accent-blue)" />;
  }
  return <circle cx={cx} cy={cy} r={3} fill="var(--accent-blue)" />;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const isPredicted = payload[0]?.payload?.predicted;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '7px 12px',
      fontSize: '0.78rem',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}{isPredicted ? ' (predicted)' : ''}</div>
      <div style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>Score: {payload[0]?.value}</div>
    </div>
  );
};

export default function RiskTrendChart({ data, height = 200 }) {
  if (!data || data.length === 0) return null;

  // Split into actual and predicted for dashed line
  const actualData = data.filter(d => !d.predicted);
  const predictedData = data.filter((d, i) => d.predicted || (data[i - 1] && data[i - 1].time === 'Now'));

  const nowIdx = data.findIndex(d => d.time === 'Now');

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        {nowIdx >= 0 && (
          <ReferenceLine
            x={data[nowIdx].time}
            stroke="var(--border)"
            strokeDasharray="4,3"
            label={{ value: 'Now', position: 'top', fontSize: 9, fill: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}
          />
        )}
        {/* Threshold lines */}
        <ReferenceLine y={70} stroke="var(--status-high)" strokeDasharray="3,3" strokeOpacity={0.5} />
        <ReferenceLine y={45} stroke="var(--status-warning)" strokeDasharray="3,3" strokeOpacity={0.5} />

        {/* Actual line */}
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--accent-blue)"
          strokeWidth={1.8}
          dot={<CustomDot />}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
