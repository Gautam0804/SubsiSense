// src/components/SensorChart.jsx
// Reusable sensor tilt trend line chart using Recharts
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px',
      fontSize: '0.78rem',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value !== null ? p.value.toFixed(2) + '°' : '—'}
        </div>
      ))}
    </div>
  );
};

export default function SensorChart({ data, nodeId, height = 200 }) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}°`}
        />
        <Tooltip content={<CustomTooltip />} />
        {nodeId && (
          <Line
            type="monotone"
            dataKey={nodeId}
            name={nodeId}
            stroke="var(--accent-blue)"
            strokeWidth={1.5}
            dot={{ r: 2, fill: 'var(--accent-blue)', strokeWidth: 0 }}
            connectNulls={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
