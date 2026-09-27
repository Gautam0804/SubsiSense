// src/components/StatusIndicator.jsx
import { getBadgeClass, getStatusLabel, getInlineDotClass } from '../utils/riskUtils';

export function StatusBadge({ status, label }) {
  return (
    <span className={getBadgeClass(status)}>
      <span className={getInlineDotClass(status)} />
      {label || getStatusLabel(status)}
    </span>
  );
}

export function InlineDot({ status }) {
  return <span className={getInlineDotClass(status)} />;
}
