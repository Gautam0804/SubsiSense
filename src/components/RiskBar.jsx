// src/components/RiskBar.jsx
import { getRiskColor } from '../utils/riskUtils';

export default function RiskBar({ score, showLabel = true }) {
  const color = getRiskColor(score);

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between items-center mb-4">
          <span className="text-small text-secondary">Risk Score</span>
          <span className="mono fw-500">{score} / 100</span>
        </div>
      )}
      <div className="risk-bar-track">
        <div
          className="risk-bar-fill"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
