// src/pages/Dashboard.jsx

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Map,
  Shield,
  Radio,
  Activity,
  RefreshCw,
  Cpu,
} from 'lucide-react';

import { zones, recentEvents } from '../data/mockData';
import { StatusBadge } from '../components/StatusIndicator';
import RiskBar from '../components/RiskBar';

const API_URL = 'https://mineguard-backend-x2km.onrender.com/api/telemetry';

const NODE_CONFIG = [
  {
    id: 'N01',
    name: 'MINE NODE 01',
    zone: 'Heap Slope A',
    live: true,
  },
  {
    id: 'N02',
    name: 'MINE NODE 02',
    zone: 'Heap Slope B',
    live: false,
  },
  {
    id: 'N03',
    name: 'MINE NODE 03',
    zone: 'North Dump',
    live: false,
  },
  {
    id: 'N04',
    name: 'MINE NODE 04',
    zone: 'South Ramp',
    live: false,
  },
];

function calculateLocalRisk(telemetry) {
  if (!telemetry) {
    return {
      level: 'offline',
      label: 'OFFLINE',
      score: 0,
      acceleration: null,
    };
  }

  const tiltX = Math.abs(Number(telemetry.tiltX) || 0);
  const tiltY = Math.abs(Number(telemetry.tiltY) || 0);

  const accelX = Number(telemetry.accelX) || 0;
  const accelY = Number(telemetry.accelY) || 0;
  const accelZ = Number(telemetry.accelZ) || 0;

  const acceleration = Math.sqrt(
    accelX ** 2 +
    accelY ** 2 +
    accelZ ** 2
  );

  if (tiltX >= 6 || tiltY >= 6 || acceleration >= 0.8) {
    return {
      level: 'critical',
      label: 'CRITICAL',
      score: 90,
      acceleration,
    };
  }

  if (tiltX >= 3 || tiltY >= 3 || acceleration >= 0.5) {
    return {
      level: 'high',
      label: 'HIGH',
      score: 70,
      acceleration,
    };
  }

  if (tiltX >= 2 || tiltY >= 2) {
    return {
      level: 'warning',
      label: 'WARNING',
      score: 40,
      acceleration,
    };
  }

  return {
    level: 'normal',
    label: 'NORMAL',
    score: 10,
    acceleration,
  };
}

function createSimulatedTelemetry(previous = null, nodeIndex = 1) {
  const base = previous || {
    accelX: 0.12 + nodeIndex * 0.03,
    accelY: -0.08 + nodeIndex * 0.02,
    accelZ: 0.93 - nodeIndex * 0.01,
    tiltX: 0.8 + nodeIndex * 0.15,
    tiltY: -0.6 + nodeIndex * 0.1,
  };

  const drift = (value, amount) =>
    Number(value) + (Math.random() - 0.5) * amount;

  return {
    accelX: drift(base.accelX, 0.06),
    accelY: drift(base.accelY, 0.06),
    accelZ: drift(base.accelZ, 0.04),
    tiltX: drift(base.tiltX, 0.35),
    tiltY: drift(base.tiltY, 0.35),
  };
}

function getBadgeStatus(level) {
  if (level === 'critical') return 'high';
  return level;
}

export default function Dashboard({ onNavigate }) {
  const [nodes, setNodes] = useState(
    NODE_CONFIG.map((node, index) => ({
      ...node,
      telemetry:
        node.live
          ? null
          : createSimulatedTelemetry(null, index),
      risk: node.live
        ? {
            level: 'offline',
            label: 'CONNECTING',
            score: 0,
            acceleration: null,
          }
        : calculateLocalRisk(
            createSimulatedTelemetry(null, index)
          ),
    }))
  );

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchRealNode() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(
            `Telemetry API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (!mounted) return;

        const realTelemetry = result.telemetry || null;
        const realRisk = result.risk || null;

        setNodes((current) =>
          current.map((node, index) => {
            if (node.live) {
              return {
                ...node,
                telemetry: realTelemetry,
                risk: realRisk
                  ? {
                      level: String(
                        realRisk.level || 'normal'
                      ).toLowerCase(),
                      label: String(
                        realRisk.level || 'NORMAL'
                      ).toUpperCase(),
                      score: Number(
                        realRisk.score ?? 0
                      ),
                      acceleration:
                        realRisk.acceleration ?? null,
                    }
                  : {
                      level: 'offline',
                      label: 'OFFLINE',
                      score: 0,
                      acceleration: null,
                    },
              };
            }

            const simulated = createSimulatedTelemetry(
              node.telemetry,
              index
            );

            return {
              ...node,
              telemetry: simulated,
              risk: calculateLocalRisk(simulated),
            };
          })
        );

        setApiError(false);
        setLastUpdated(new Date());
      } catch (error) {
        console.error(
          'Dashboard telemetry error:',
          error
        );

        if (mounted) {
          setApiError(true);

          // Keep simulated nodes moving even if the real API
          // is temporarily unavailable.
          setNodes((current) =>
            current.map((node, index) => {
              if (node.live) {
                return {
                  ...node,
                  telemetry: null,
                  risk: {
                    level: 'offline',
                    label: 'OFFLINE',
                    score: 0,
                    acceleration: null,
                  },
                };
              }

              const localTelemetry =
                createSimulatedTelemetry(
                  node.telemetry,
                  index
                );

              return {
                ...node,
                telemetry: localTelemetry,
                risk: calculateLocalRisk(
                  localTelemetry
                ),
              };
            })
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchRealNode();

    const interval = setInterval(
      fetchRealNode,
      5000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const summary = useMemo(() => {
    const online = nodes.filter(
      (node) => node.telemetry !== null
    );

    const alerts = nodes.filter(
      (node) =>
        node.risk.level === 'warning' ||
        node.risk.level === 'high' ||
        node.risk.level === 'critical'
    );

    const critical = nodes.filter(
      (node) =>
        node.risk.level === 'critical'
    );

    const scores = online.map(
      (node) => node.risk.score
    );

    const overallRisk = scores.length
      ? Math.round(
          scores.reduce(
            (sum, score) => sum + score,
            0
          ) / scores.length
        )
      : 0;

    let overallLevel = 'offline';

    if (online.length) {
      if (critical.length) {
        overallLevel = 'critical';
      } else if (
        alerts.some(
          (node) =>
            node.risk.level === 'high'
        )
      ) {
        overallLevel = 'high';
      } else if (
        alerts.some(
          (node) =>
            node.risk.level === 'warning'
        )
      ) {
        overallLevel = 'warning';
      } else {
        overallLevel = 'normal';
      }
    }

    return {
      online: online.length,
      alerts: alerts.length,
      critical: critical.length,
      overallRisk,
      overallLevel,
    };
  }, [nodes]);

  const overallLabel = {
    normal: 'NORMAL',
    warning: 'WARNING',
    high: 'HIGH RISK',
    critical: 'CRITICAL',
    offline: 'NO LIVE DATA',
  }[summary.overallLevel];

  const overallColor = {
    normal: 'var(--status-normal)',
    warning: 'var(--status-warning)',
    high: 'var(--status-high)',
    critical: 'var(--status-high)',
    offline: 'var(--text-muted)',
  }[summary.overallLevel];

  return (
    <div className="page-content page-fade-in">

      {/* HEADER */}
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <div>
            <h1>Mine Overview</h1>
            <p>
              Real-time mine safety monitoring
              across four sensor nodes
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontFamily:
                "'IBM Plex Mono', monospace",
              fontSize: '0.7rem',
              color: apiError
                ? 'var(--status-high)'
                : 'var(--status-normal)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: apiError
                  ? 'var(--status-high)'
                  : 'var(--status-normal)',
              }}
            />
            {apiError
              ? 'REAL API OFFLINE'
              : 'LIVE'}
          </div>
        </div>
      </div>

      {/* CRITICAL BANNER */}
      {summary.critical > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background:
              'var(--status-high-bg)',
            border:
              '1px solid var(--status-high-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertTriangle
              size={20}
              color="var(--status-high)"
            />

            <div>
              <div
                style={{
                  color:
                    'var(--status-high)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                CRITICAL MINE CONDITION
              </div>

              <div
                className="text-small"
                style={{ marginTop: 3 }}
              >
                {summary.critical} node
                {summary.critical > 1
                  ? 's are'
                  : ' is'}{' '}
                reporting critical conditions.
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() =>
              onNavigate('live-monitoring')
            }
          >
            Open Monitoring
          </button>
        </div>
      )}

      {/* TOP METRICS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        <div className="panel">
          <div className="panel-title">
            Overall Mine Condition
          </div>

          <div
            style={{
              color: overallColor,
              fontSize: '1.1rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              marginBottom: 6,
            }}
          >
            {overallLabel}
          </div>

          <div
            className="risk-score-display"
            style={{ marginBottom: 10 }}
          >
            <span
              className="risk-score-number"
              style={{ color: overallColor }}
            >
              {summary.overallRisk}
            </span>
            <span className="risk-score-total">
              &nbsp;/ 100
            </span>
          </div>

          <RiskBar
            score={summary.overallRisk}
            showLabel={false}
          />

          <div className="text-xs text-muted mt-8">
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleTimeString()}`
              : loading
                ? 'Connecting to telemetry...'
                : 'No update received'}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            System Summary
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4, 1fr)',
              gap: 16,
            }}
          >
            <SummaryMetric
              icon={<Radio size={15} />}
              label="Active Nodes"
              value={`${summary.online} / 4`}
              sub="sensor nodes"
            />

            <SummaryMetric
              icon={
                <AlertTriangle size={15} />
              }
              label="Active Alerts"
              value={summary.alerts}
              valueColor={
                summary.alerts
                  ? 'var(--status-high)'
                  : 'var(--status-normal)'
              }
              sub={
                summary.critical
                  ? `${summary.critical} critical`
                  : 'current conditions'
              }
            />

            <SummaryMetric
              icon={<Map size={15} />}
              label="Mine Zones"
              value={zones.length}
              sub="monitored"
            />

            <SummaryMetric
              icon={<Activity size={15} />}
              label="Refresh"
              value="5s"
              valueColor="var(--status-normal)"
              sub="live polling"
            />
          </div>
        </div>
      </div>

      {/* FOUR NODE GRID */}
      <div
        className="panel"
        style={{ marginTop: 16 }}
      >
        <div
          className="flex justify-between items-center mb-16"
        >
          <div
            className="panel-title"
            style={{ marginBottom: 0 }}
          >
            Sensor Network
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() =>
              onNavigate('mine-map')
            }
          >
            <Map size={13} />
            Open Mine Map
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
            />
          ))}
        </div>
      </div>

      {/* DETAILS + ACTIVITY */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1.2fr 1fr',
          gap: 16,
          marginTop: 16,
        }}
      >
        <div className="panel">
          <div
            className="flex justify-between items-center mb-16"
          >
            <div
              className="panel-title"
              style={{ marginBottom: 0 }}
            >
              Real Sensor Telemetry
            </div>

            <div
              className="mono text-xs"
              style={{
                color:
                  'var(--status-normal)',
              }}
            >
              MINE NODE 01
            </div>
          </div>

          {nodes[0]?.telemetry ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(3, 1fr)',
                gap: 14,
              }}
            >
              <SensorReading
                label="ACCEL X"
                value={Number(
                  nodes[0].telemetry.accelX
                ).toFixed(3)}
              />

              <SensorReading
                label="ACCEL Y"
                value={Number(
                  nodes[0].telemetry.accelY
                ).toFixed(3)}
              />

              <SensorReading
                label="ACCEL Z"
                value={Number(
                  nodes[0].telemetry.accelZ
                ).toFixed(3)}
              />

              <SensorReading
                label="TILT X"
                value={`${Number(
                  nodes[0].telemetry.tiltX
                ).toFixed(3)}°`}
              />

              <SensorReading
                label="TILT Y"
                value={`${Number(
                  nodes[0].telemetry.tiltY
                ).toFixed(3)}°`}
              />

              <SensorReading
                label="RISK"
                value={`${nodes[0].risk.score}/100`}
                valueColor={overallColor}
              />
            </div>
          ) : (
            <div className="text-xs text-muted">
              Waiting for real ThingsBoard telemetry...
            </div>
          )}

          <div
            className="text-xs text-muted"
            style={{
              marginTop: 16,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <RefreshCw size={12} />
            Real node is read from ThingsBoard
            through the Node.js backend.
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            Recent Activity
          </div>

          {nodes
            .filter(
              (node) =>
                node.risk.level !== 'normal'
            )
            .map((node) => (
              <div
                key={node.id}
                style={{
                  padding: '10px 11px',
                  marginBottom: 8,
                  borderRadius:
                    'var(--radius-sm)',
                  background:
                    node.risk.level ===
                      'warning'
                      ? 'var(--status-warning-bg)'
                      : 'var(--status-high-bg)',
                  border:
                    node.risk.level ===
                      'warning'
                      ? '1px solid var(--status-warning-border)'
                      : '1px solid var(--status-high-border)',
                }}
              >
                <div className="flex gap-8 items-center">
                  <AlertTriangle
                    size={13}
                    color={
                      node.risk.level ===
                        'warning'
                        ? 'var(--status-warning)'
                        : 'var(--status-high)'
                    }
                  />

                  <span className="mono text-xs">
                    {node.id} · {node.risk.label}
                  </span>
                </div>

                <div
                  className="text-small"
                  style={{ marginTop: 5 }}
                >
                  {node.name} is currently
                  reporting {node.risk.label.toLowerCase()}
                  conditions.
                </div>
              </div>
            ))}

          {nodes.every(
            (node) =>
              node.risk.level === 'normal'
          ) && (
            <div
              style={{
                padding: '14px 0',
                color:
                  'var(--status-normal)',
                fontSize: '0.82rem',
              }}
            >
              ✓ All four nodes are within
              normal limits.
            </div>
          )}

          <div
            className="divider"
            style={{ marginTop: 14 }}
          />

          <div className="panel-title">
            System Events
          </div>

          {recentEvents
            .slice(0, 4)
            .map((event) => (
              <div
                key={event.id}
                className="flex gap-8 items-center"
                style={{ marginBottom: 8 }}
              >
                <span
                  className="mono text-xs text-muted"
                  style={{ minWidth: 42 }}
                >
                  {event.time}
                </span>

                <span
                  className="inline-dot"
                  style={{
                    backgroundColor:
                      event.severity === 'high'
                        ? 'var(--status-high)'
                        : 'var(--status-warning)',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                  }}
                />

                <span className="text-small text-secondary">
                  Zone {event.zone} — {event.message}
                </span>
              </div>
            ))}

          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 8 }}
            onClick={() =>
              onNavigate('safety-workers')
            }
          >
            <Shield size={13} />
            View Safety
          </button>
        </div>
      </div>

      {/* NETWORK STATUS */}
      <div
        className="panel"
        style={{ marginTop: 16 }}
      >
        <div className="panel-title">
          Node Connection Status
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          {nodes.map((node) => (
            <div
              key={`connection-${node.id}`}
              style={{
                padding: 12,
                border:
                  '1px solid var(--border)',
                borderRadius:
                  'var(--radius-sm)',
              }}
            >
              <div
                className="flex justify-between items-center"
              >
                <span className="mono text-xs">
                  {node.id}
                </span>

                <span
                  style={{
                    fontSize: '0.65rem',
                    color:
                      node.risk.level === 'offline'
                        ? 'var(--text-muted)'
                        : node.risk.level === 'critical'
                          ? 'var(--status-high)'
                          : node.risk.level === 'high'
                            ? 'var(--status-high)'
                            : node.risk.level === 'warning'
                              ? 'var(--status-warning)'
                              : 'var(--status-normal)',
                  }}
                >
                  {node.risk.label}
                </span>
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: '0.78rem',
                  fontWeight: 500,
                }}
              >
                {node.name}
              </div>

              <div
                className="text-xs text-muted"
                style={{ marginTop: 4 }}
              >
                {node.risk.level === 'offline'
                  ? 'No current telemetry'
                  : 'Monitoring active'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NodeCard({ node }) {
  return (
    <div
      style={{
        padding: 14,
        border:
          '1px solid var(--border)',
        borderRadius:
          'var(--radius-md)',
        background:
          'var(--bg-surface)',
      }}
    >
      <div
        className="flex justify-between items-center"
      >
        <div
          className="flex gap-8 items-center"
        >
          <Cpu
            size={15}
            color={
              node.risk.level === 'critical'
                ? 'var(--status-high)'
                : node.risk.level === 'high'
                  ? 'var(--status-high)'
                  : node.risk.level === 'warning'
                    ? 'var(--status-warning)'
                    : node.risk.level === 'offline'
                      ? 'var(--text-muted)'
                      : 'var(--status-normal)'
            }
          />

          <span
            className="mono"
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {node.id}
          </span>
        </div>

        <span
          style={{
            fontSize: '0.58rem',
            letterSpacing: '0.06em',
            color:
              node.risk.level === 'critical'
                ? 'var(--status-high)'
                : node.risk.level === 'high'
                  ? 'var(--status-high)'
                  : node.risk.level === 'warning'
                    ? 'var(--status-warning)'
                    : node.risk.level === 'offline'
                      ? 'var(--text-muted)'
                      : 'var(--status-normal)',
          }}
        >
          {node.risk.label}
        </span>
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: '0.82rem',
          fontWeight: 600,
        }}
      >
        {node.name}
      </div>

      <div
        className="text-xs text-muted"
        style={{ marginTop: 3 }}
      >
        {node.zone}
      </div>

      <div style={{ marginTop: 12 }}>
        <StatusBadge
          status={getBadgeStatus(
            node.risk.level
          )}
          label={node.risk.label}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 1fr',
          gap: 9,
          marginTop: 12,
        }}
      >
        <SensorReading
          label="TILT X"
          value={`${Number(
            node.telemetry?.tiltX || 0
          ).toFixed(2)}°`}
        />

        <SensorReading
          label="TILT Y"
          value={`${Number(
            node.telemetry?.tiltY || 0
          ).toFixed(2)}°`}
        />

        <SensorReading
          label="ACCEL"
          value={
            node.risk.acceleration !== null
              ? node.risk.acceleration.toFixed(2)
              : '--'
          }
        />

        <SensorReading
          label="RISK"
          value={`${node.risk.score}`}
        />
      </div>

      <RiskBar
        score={node.risk.score}
        showLabel={false}
      />
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  sub,
  valueColor,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        className="flex gap-6 items-center"
        style={{
          color: 'var(--text-muted)',
        }}
      >
        {icon}
        <span style={{ fontSize: '0.75rem' }}>
          {label}
        </span>
      </div>

      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 500,
          fontFamily:
            "'IBM Plex Mono', monospace",
          color:
            valueColor ||
            'var(--text-primary)',
        }}
      >
        {value}
      </div>

      {sub && (
        <div className="text-xs text-muted">
          {sub}
        </div>
      )}
    </div>
  );
}

function SensorReading({
  label,
  value,
  valueColor,
}) {
  return (
    <div>
      <div
        className="text-xs text-muted"
        style={{
          fontFamily:
            "'IBM Plex Mono', monospace",
        }}
      >
        {label}
      </div>

      <div
        className="mono"
        style={{
          marginTop: 3,
          fontSize: '0.8rem',
          color:
            valueColor ||
            'var(--text-primary)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

