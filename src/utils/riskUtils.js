// src/utils/riskUtils.js
// Utility functions for risk/status display logic

export function getRiskColor(score) {
  if (score >= 70) return 'var(--status-high)';
  if (score >= 45) return 'var(--status-warning)';
  return 'var(--status-normal)';
}

export function getStatusLabel(status) {
  const labels = {
    normal: 'NORMAL',
    warning: 'WARNING',
    high: 'HIGH RISK',
    offline: 'OFFLINE',
    online: 'ONLINE',
  };
  return labels[status] || status?.toUpperCase();
}

export function getBadgeClass(status) {
  if (status === 'normal' || status === 'online') return 'badge badge-normal';
  if (status === 'warning') return 'badge badge-warning';
  if (status === 'high') return 'badge badge-high';
  if (status === 'offline') return 'badge badge-offline';
  return 'badge';
}

export function getInlineDotClass(status) {
  if (status === 'normal' || status === 'online') return 'inline-dot normal';
  if (status === 'warning') return 'inline-dot warning';
  if (status === 'high') return 'inline-dot high';
  if (status === 'offline') return 'inline-dot offline';
  return 'inline-dot';
}

export function getRiskLevelFromScore(score) {
  if (score >= 70) return 'high';
  if (score >= 45) return 'warning';
  return 'normal';
}

export function getSensorValueClass(value, warningThreshold, criticalThreshold) {
  if (value === null || value === undefined) return 'sensor-reading-value';
  if (value >= criticalThreshold) return 'sensor-reading-value critical';
  if (value >= warningThreshold) return 'sensor-reading-value elevated';
  return 'sensor-reading-value';
}
