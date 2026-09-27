// src/pages/LiveMonitoring.jsx

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

import { sensorNodes } from '../data/mockData';
import { StatusBadge, InlineDot } from '../components/StatusIndicator';
import { getSensorValueClass } from '../utils/riskUtils';
import AlertSound from '../components/AlertSound';

const TIME_RANGES = ['15min', '1hour', '6hours', '24hours'];

const TIME_RANGE_LABELS = {
  '15min': '15 min',
  '1hour': '1 hour',
  '6hours': '6 hours',
  '24hours': '24 hours',
};

const API_URL = 'http://localhost:5000/api/telemetry';
const HISTORY_API_URL = 'http://localhost:5000/api/telemetry/history';

export default function LiveMonitoring() {
  const [selectedNode, setSelectedNode] = useState('N01');
  const [timeRange, setTimeRange] = useState('1hour');

  // Real ThingsBoard telemetry
  const [telemetry, setTelemetry] = useState(null);

  // Backend risk level from the real ThingsBoard telemetry
  const [risk, setRisk] = useState(null);

  // PostgreSQL historical telemetry
  const [history, setHistory] = useState([]);

  // API states
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  /*
   * Fetch latest telemetry
   *
   * React
   *   ↓
   * Node.js
   *   ↓
   * ThingsBoard
   *
   * The Node.js backend also saves
   * the reading into PostgreSQL.
   */
  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(
            `Telemetry API returned ${response.status}`
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        /*
         * Backend response:
         *
         * {
         *   success: true,
         *   telemetry: {...},
         *   savedReading: {...}
         * }
         *
         * We only need the telemetry object
         * for the live sensor cards.
         */
        setTelemetry(data.telemetry);
        setRisk(data.risk || null);

        setError(null);
        setLastUpdated(new Date());

      } catch (err) {
        console.error('Telemetry fetch error:', err);

        if (!isMounted) return;

        setError('Unable to fetch live sensor data');
        setRisk(null);

      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchTelemetry();

    // Refresh every 5 seconds
    const interval = setInterval(
      fetchTelemetry,
      5000
    );

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  /*
   * Fetch historical telemetry from PostgreSQL.
   */
  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);

        const response = await fetch(
          `${HISTORY_API_URL}?range=${timeRange}&limit=500`
        );

        if (!response.ok) {
          throw new Error(
            `History API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (!isMounted) return;

        setHistory(result.data || []);

      } catch (err) {
        console.error(
          'History fetch error:',
          err
        );

      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchHistory();

    // Refresh historical data every 5 seconds
    const interval = setInterval(
      fetchHistory,
      5000
    );

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [timeRange]);

  /*
   * Existing node information.
   *
   * The four-node presentation is kept from
   * mockData. N01 is the connected ThingsBoard
   * device; the remaining node records provide
   * the mine UI structure until more devices
   * are connected.
   */
  const node = sensorNodes.find(
    (n) => n.id === selectedNode
  );

  /*
   * Calculate acceleration magnitude:
   *
   * √(X² + Y² + Z²)
   */
  const accelerationMagnitude =
    telemetry &&
    telemetry.accelX !== null &&
    telemetry.accelX !== undefined &&
    telemetry.accelY !== null &&
    telemetry.accelY !== undefined &&
    telemetry.accelZ !== null &&
    telemetry.accelZ !== undefined
      ? Math.sqrt(
          telemetry.accelX ** 2 +
          telemetry.accelY ** 2 +
          telemetry.accelZ ** 2
        )
      : null;

  /*
   * Live node data.
   *
   * ThingsBoard values override
   * the existing mock sensor values.
   */
  const liveNode = {
    ...node,

    // The connected ThingsBoard device is N01.
    status:
      selectedNode === 'N01'
        ? (error ? 'offline' : 'online')
        : node?.status,

    tiltX:
      telemetry?.tiltX !== null &&
      telemetry?.tiltX !== undefined
        ? telemetry.tiltX
        : node?.tiltX,

    tiltY:
      telemetry?.tiltY !== null &&
      telemetry?.tiltY !== undefined
        ? telemetry.tiltY
        : node?.tiltY,

    acceleration:
      accelerationMagnitude !== null
        ? accelerationMagnitude
        : node?.acceleration,

    /*
     * ThingsBoard currently does not provide
     * a separate vibration telemetry key.
     *
     * Do not display mock vibration as real data.
     */
    // ThingsBoard currently does not provide vibration telemetry.
    vibration: null,

    // ThingsBoard currently does not provide a crack telemetry key.
    crack: null,
  };

  /*
   * =========================================================
   * LIVE SAFETY ALERT LEVEL
   * =========================================================
   *
   * Current thresholds:
   *
   * WARNING:
   *   Tilt X/Y >= 2°
   *
   * HIGH:
   *   Tilt X/Y >= 3°
   *   Acceleration >= 0.50
   *   Vibration >= 0.50
   *
   * CRITICAL:
   *   Tilt X/Y >= 6°
   *   Acceleration >= 0.80
   *
   * Crack and vibration are only considered
   * when actual telemetry keys are available.
   */
  /*
   * =========================================================
   * AUTOMATIC TILT ALARM
   * =========================================================
   *
   * N01 uses the risk level calculated by the Node.js backend.
   * The backend reads the real ThingsBoard Tilt X / Tilt Y values.
   *
   * NORMAL   : both axes < 2°  -> no alarm
   * WARNING  : either axis >= 2° -> warning alarm
   * HIGH     : either axis >= 3° -> high alarm
   * CRITICAL : either axis >= 6° -> critical alarm
   *
   * N02-N04 do not trigger the real sensor alarm.
   */
  const alertLevel =
    selectedNode === 'N01'
      ? (risk?.level
          ? String(risk.level).toLowerCase()
          : 'normal')
      : 'normal';

  /*
   * =========================================================
   * REAL TILT TREND DATA
   * =========================================================
   *
   * PostgreSQL returns the historical readings in
   * chronological order. Keep that order so the chart
   * moves naturally from old -> new.
   *
   * We plot BOTH real ThingsBoard-derived values:
   *   - tilt_x
   *   - tilt_y
   *
   * Only N01 has the connected ThingsBoard history.
   */
  const chartData =
    selectedNode === 'N01'
      ? history
          .filter(
            (reading) =>
              reading.tilt_x !== null ||
              reading.tilt_y !== null
          )
          .map((reading) => ({
            time: new Date(
              reading.recorded_at
            ).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),

            tiltX:
              reading.tilt_x !== null &&
              reading.tilt_x !== undefined
                ? Number(reading.tilt_x)
                : null,

            tiltY:
              reading.tilt_y !== null &&
              reading.tilt_y !== undefined
                ? Number(reading.tilt_y)
                : null,
          }))
      : [];

  return (
    <div className="page-content page-fade-in">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

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
            <h1>Live Monitoring</h1>

            <p>
              Raw sensor readings from active nodes
            </p>
          </div>

          {/* Live connection indicator */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.75rem',
              fontFamily:
                "'IBM Plex Mono', monospace",
              color: error
                ? 'var(--status-high)'
                : 'var(--status-normal)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: error
                  ? 'var(--status-high)'
                  : 'var(--status-normal)',
              }}
            />

            {error ? 'API OFFLINE' : 'LIVE'}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '200px 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >

        {/* =====================================================
            NODE LIST
        ====================================================== */}

        <div
          className="panel"
          style={{
            padding: '14px 0',
          }}
        >
          <div
            className="panel-title"
            style={{
              padding: '0 16px',
              marginBottom: 8,
            }}
          >
            Sensor Nodes
          </div>

          <div>
            {sensorNodes.map((n) => (
              <button
                key={n.id}
                onClick={() =>
                  setSelectedNode(n.id)
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'space-between',
                  width: '100%',
                  padding: '8px 16px',
                  background:
                    selectedNode === n.id
                      ? 'var(--bg-secondary)'
                      : 'transparent',
                  border: 'none',
                  borderLeft:
                    selectedNode === n.id
                      ? '2px solid var(--accent-blue)'
                      : '2px solid transparent',
                  cursor: 'pointer',
                  transition:
                    'all var(--transition-fast)',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    fontFamily:
                      "'IBM Plex Mono', monospace",
                    fontSize: '0.85rem',
                    color:
                      selectedNode === n.id
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    fontWeight:
                      selectedNode === n.id
                        ? 500
                        : 400,
                  }}
                >
                  {n.id}
                </span>

                <InlineDot
                  status={
                    n.status === 'online'
                      ? 'normal'
                      : n.status === 'warning'
                        ? 'warning'
                        : 'offline'
                  }
                />
              </button>
            ))}
          </div>
        </div>

        {/* =====================================================
            SELECTED NODE DETAIL
        ====================================================== */}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >

          {/* ===================================================
              NODE HEADER
          ==================================================== */}

          <div className="panel">

            <div className="flex justify-between items-center">

              <div>

                <div className="flex gap-12 items-center">

                  <span
                    style={{
                      fontFamily:
                        "'IBM Plex Mono', monospace",
                      fontSize: '1.1rem',
                      fontWeight: 600,
                    }}
                  >
                    NODE {liveNode?.id}
                  </span>

                  <StatusBadge
                    status={
                      liveNode?.status === 'online'
                        ? 'normal'
                        : liveNode?.status === 'warning'
                          ? 'warning'
                          : 'offline'
                    }
                    label={
                      liveNode?.status?.toUpperCase()
                    }
                  />

                </div>

                <div className="text-small text-muted mt-4">
                  Zone {liveNode?.zone} · Last reading:{' '}
                  <span className="mono">
                    {lastUpdated
                      ? lastUpdated.toLocaleTimeString()
                      : liveNode?.lastSeen}
                  </span>
                </div>

              </div>

              {/* Alarm + Refresh information */}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                }}
              >
                <AlertSound level={alertLevel} />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    fontFamily:
                      "'IBM Plex Mono', monospace",
                  }}
                >
                  <RefreshCw size={13} />

                  {loading
                    ? 'CONNECTING...'
                    : 'AUTO REFRESH 5s'}
                </div>
              </div>

            </div>

            {/* API error */}

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  borderRadius:
                    'var(--radius-md)',
                  background:
                    'var(--status-high-bg)',
                  border:
                    '1px solid var(--status-high-border)',
                  color:
                    'var(--status-high)',
                  fontSize: '0.78rem',
                }}
              >
                {error}
              </div>
            )}

          </div>

          {/* ===================================================
              OFFLINE STATE
          ==================================================== */}

          {liveNode?.status === 'offline' ? (

            <div
              className="panel"
              style={{
                textAlign: 'center',
                padding: '40px 20px',
              }}
            >
              <WifiOff
                size={24}
                color="var(--text-muted)"
                style={{
                  marginBottom: 10,
                }}
              />

              <div
                className="fw-500"
                style={{
                  marginBottom: 4,
                }}
              >
                No data available
              </div>

              <div className="text-small text-muted">
                Last contact:{' '}
                <span className="mono">
                  {liveNode.lastSeen}
                </span>
              </div>

              <div
                className="text-small text-muted mt-8"
              >
                An offline sensor does{' '}
                <strong>not</strong> indicate a safe
                condition. Risk status remains{' '}
                <strong>UNKNOWN</strong> until contact
                is restored.
              </div>
            </div>

          ) : (

            <>

              {/* ===============================================
                  SENSOR READINGS
              ================================================ */}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: 14,
                }}
              >

                {/* TILT */}

                <div className="panel panel-sm">

                  <div className="panel-title">
                    Tilt & Inclination
                  </div>

                  <div className="sensor-readings">

                    {/* Tilt X */}

                    <div className="sensor-reading-row">

                      <span className="sensor-reading-label">
                        Tilt X
                      </span>

                      <span
                        className={getSensorValueClass(
                          liveNode?.tiltX,
                          3,
                          6
                        )}
                      >
                        {liveNode?.tiltX !== null &&
                        liveNode?.tiltX !== undefined
                          ? `${liveNode.tiltX.toFixed(1)}°`
                          : '--'}
                      </span>

                    </div>

                    {/* Tilt Y */}

                    <div className="sensor-reading-row">

                      <span className="sensor-reading-label">
                        Tilt Y
                      </span>

                      <span
                        className={getSensorValueClass(
                          liveNode?.tiltY,
                          3,
                          5
                        )}
                      >
                        {liveNode?.tiltY !== null &&
                        liveNode?.tiltY !== undefined
                          ? `${liveNode.tiltY.toFixed(1)}°`
                          : '--'}
                      </span>

                    </div>

                  </div>
                </div>

                {/* MOTION */}

                <div className="panel panel-sm">

                  <div className="panel-title">
                    Motion & Deformation
                  </div>

                  <div className="sensor-readings">

                    {/* Acceleration */}

                    <div className="sensor-reading-row">

                      <span className="sensor-reading-label">
                        Acceleration
                      </span>

                      <span
                        className={getSensorValueClass(
                          liveNode?.acceleration,
                          0.5,
                          0.8
                        )}
                      >
                        {liveNode?.acceleration !== null &&
                        liveNode?.acceleration !== undefined
                          ? `${liveNode.acceleration.toFixed(2)} m/s²`
                          : '--'}
                      </span>

                    </div>

                    {/* Vibration */}

                    <div className="sensor-reading-row">

                      <span className="sensor-reading-label">
                        Vibration
                      </span>

                      <span
                        className={getSensorValueClass(
                          liveNode?.vibration,
                          0.5,
                          0.75
                        )}
                      >
                        {liveNode?.vibration !== null &&
                        liveNode?.vibration !== undefined
                          ? `${liveNode.vibration.toFixed(2)} m/s²`
                          : 'N/A'}
                      </span>

                    </div>

                    {/* Crack */}

                    <div className="sensor-reading-row">

                      <span className="sensor-reading-label">
                        Crack
                      </span>

                      <span
                        style={{
                          fontFamily:
                            "'IBM Plex Mono', monospace",
                          fontSize: '0.88rem',
                          fontWeight: 500,
                          color: liveNode?.crack
                            ? 'var(--status-high)'
                            : 'var(--status-normal)',
                        }}
                      >
                        {liveNode?.crack === true
                          ? 'Detected'
                          : 'N/A'}
                      </span>

                    </div>

                  </div>
                </div>

              </div>

              {/* ===============================================
                  LIVE SENSOR VALUES
              ================================================ */}

              <div className="panel">

                <div
                  className="panel-title"
                  style={{
                    marginBottom: 12,
                  }}
                >
                  Raw Accelerometer Data
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(3, 1fr)',
                    gap: 10,
                  }}
                >

                  {/* ACCEL X */}

                  <div
                    style={{
                      padding: 12,
                      border:
                        '1px solid var(--border)',
                      borderRadius:
                        'var(--radius-sm)',
                    }}
                  >
                    <div className="text-xs text-muted">
                      ACCEL X
                    </div>

                    <div
                      className="mono"
                      style={{
                        marginTop: 4,
                        fontSize: '1rem',
                      }}
                    >
                      {telemetry?.accelX !== null &&
                      telemetry?.accelX !== undefined
                        ? telemetry.accelX.toFixed(4)
                        : '--'}
                    </div>
                  </div>

                  {/* ACCEL Y */}

                  <div
                    style={{
                      padding: 12,
                      border:
                        '1px solid var(--border)',
                      borderRadius:
                        'var(--radius-sm)',
                    }}
                  >
                    <div className="text-xs text-muted">
                      ACCEL Y
                    </div>

                    <div
                      className="mono"
                      style={{
                        marginTop: 4,
                        fontSize: '1rem',
                      }}
                    >
                      {telemetry?.accelY !== null &&
                      telemetry?.accelY !== undefined
                        ? telemetry.accelY.toFixed(4)
                        : '--'}
                    </div>
                  </div>

                  {/* ACCEL Z */}

                  <div
                    style={{
                      padding: 12,
                      border:
                        '1px solid var(--border)',
                      borderRadius:
                        'var(--radius-sm)',
                    }}
                  >
                    <div className="text-xs text-muted">
                      ACCEL Z
                    </div>

                    <div
                      className="mono"
                      style={{
                        marginTop: 4,
                        fontSize: '1rem',
                      }}
                    >
                      {telemetry?.accelZ !== null &&
                      telemetry?.accelZ !== undefined
                        ? telemetry.accelZ.toFixed(4)
                        : '--'}
                    </div>
                  </div>

                </div>

              </div>

              {/* ===============================================
                  TILT TREND
              ================================================ */}

              <div className="panel">

                <div
                  className="flex justify-between items-center mb-16"
                >

                  <div>

                    <div
                      className="panel-title"
                      style={{
                        marginBottom: 2,
                      }}
                    >
                      Tilt Trend
                    </div>

                    <div className="text-xs text-muted">
                      Real PostgreSQL Tilt X / Tilt Y readings for{' '}
                      {liveNode?.id} over{' '}
                      {TIME_RANGE_LABELS[timeRange]}
                    </div>

                  </div>

                  <div className="tab-group">

                    {TIME_RANGES.map((r) => (
                      <button
                        key={r}
                        className={`tab-btn${
                          timeRange === r
                            ? ' active'
                            : ''
                        }`}
                        onClick={() =>
                          setTimeRange(r)
                        }
                      >
                        {TIME_RANGE_LABELS[r]}
                      </button>
                    ))}

                  </div>

                </div>

                {historyLoading ? (

                  <div
                    className="text-small text-muted"
                    style={{
                      padding: '40px 0',
                      textAlign: 'center',
                    }}
                  >
                    Loading historical sensor data...
                  </div>

                ) : chartData.length === 0 ? (

                  <div
                    className="text-small text-muted"
                    style={{
                      padding: '40px 0',
                      textAlign: 'center',
                    }}
                  >
                    No historical sensor data available.
                  </div>

                ) : (

                  <TiltTrendChart
                    data={chartData}
                  />

                )}

              </div>

            </>
          )}

          {/* ===================================================
              ALL NODES HEALTH
          ==================================================== */}

          <div className="panel">

            <div className="panel-title">
              All Nodes Health
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(5, 1fr)',
                gap: 8,
              }}
            >

              {sensorNodes.map((n) => (

                <div
                  key={n.id}
                  style={{
                    padding: '8px 10px',
                    border:
                      '1px solid var(--border)',
                    borderRadius:
                      'var(--radius-sm)',
                    background:
                      n.id === 'N01'
                        ? (error
                          ? 'var(--status-offline-bg)'
                          : 'transparent')
                        : n.status === 'offline'
                          ? 'var(--status-offline-bg)'
                          : n.status === 'warning'
                            ? 'var(--status-warning-bg)'
                            : 'transparent',
                  }}
                >

                  <div className="mono text-xs fw-500">
                    {n.id}
                  </div>

                  <div
                    style={{
                      fontSize: '0.72rem',
                      marginTop: 2,
                      color:
                        n.id === 'N01'
                          ? error
                            ? 'var(--status-offline)'
                            : 'var(--status-normal)'
                          : n.status === 'offline'
                            ? 'var(--status-offline)'
                            : n.status === 'warning'
                              ? 'var(--status-warning)'
                              : 'var(--status-normal)',
                      fontWeight: 500,
                      letterSpacing: '0.03em',
                    }}
                  >
                    {(n.id === 'N01'
                      ? (error ? 'offline' : 'online')
                      : n.status).toUpperCase()}
                  </div>

                  <div
                    className="text-xs text-muted mono"
                    style={{
                      marginTop: 2,
                    }}
                  >
                    {n.lastSeen}
                  </div>

                </div>

              ))}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   REAL TILT X / TILT Y TREND CHART
   ========================================================================= */

function TiltTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="text-small text-muted"
        style={{
          padding: '40px 0',
          textAlign: 'center',
        }}
      >
        No real tilt history available for this node.
      </div>
    );
  }

  const width = 900;
  const height = 280;

  const padding = {
    top: 24,
    right: 24,
    bottom: 42,
    left: 58,
  };

  const plotWidth =
    width - padding.left - padding.right;

  const plotHeight =
    height - padding.top - padding.bottom;

  const values = data
    .flatMap((point) => [
      point.tiltX,
      point.tiltY,
    ])
    .filter(
      (value) =>
        value !== null &&
        Number.isFinite(value)
    );

  if (values.length === 0) {
    return (
      <div
        className="text-small text-muted"
        style={{
          padding: '40px 0',
          textAlign: 'center',
        }}
      >
        No numeric tilt history available.
      </div>
    );
  }

  const minValue = Math.min(
    -10,
    Math.min(...values)
  );

  const maxValue = Math.max(
    10,
    Math.max(...values)
  );

  const range =
    maxValue - minValue || 1;

  const xFor = (index) => {
    if (data.length === 1) {
      return (
        padding.left +
        plotWidth / 2
      );
    }

    return (
      padding.left +
      (index / (data.length - 1)) *
        plotWidth
    );
  };

  const yFor = (value) =>
    padding.top +
    ((maxValue - value) / range) *
      plotHeight;

  const makePoints = (key) =>
    data
      .map((point, index) => {
        if (
          point[key] === null ||
          !Number.isFinite(point[key])
        ) {
          return null;
        }

        return `${xFor(index)},${yFor(
          point[key]
        )}`;
      })
      .filter(Boolean)
      .join(' ');

  const tiltXPoints = makePoints('tiltX');
  const tiltYPoints = makePoints('tiltY');

  const gridValues = [
    maxValue,
    maxValue -
      range * 0.25,
    maxValue -
      range * 0.5,
    maxValue -
      range * 0.75,
    minValue,
  ];

  const labelIndexes = [
    0,
    Math.floor((data.length - 1) / 2),
    data.length - 1,
  ].filter(
    (value, index, array) =>
      array.indexOf(value) === index
  );

  return (
    <div style={{ width: '100%' }}>
      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          marginBottom: 10,
          fontSize: '0.72rem',
          fontFamily:
            "'IBM Plex Mono', monospace",
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span
            style={{
              width: 22,
              height: 3,
              borderRadius: 3,
              background:
                'var(--accent-blue)',
              display: 'inline-block',
            }}
          />
          <span>TLT-X</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span
            style={{
              width: 22,
              height: 3,
              borderRadius: 3,
              background:
                'var(--status-high)',
              display: 'inline-block',
            }}
          />
          <span>TLT-Y</span>
        </div>

        <span
          className="text-muted"
          style={{ marginLeft: 'auto' }}
        >
          {data.length} readings
        </span>
      </div>

      <div
        style={{
          width: '100%',
          overflowX: 'auto',
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="280"
          role="img"
          aria-label="Real Tilt X and Tilt Y trend"
          preserveAspectRatio="none"
        >
          {/* Horizontal grid */}
          {gridValues.map(
            (value, index) => {
              const y = yFor(value);

              return (
                <g key={`grid-${index}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={
                      width -
                      padding.right
                    }
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="1"
                    opacity="0.7"
                  />

                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--text-muted)"
                    fontFamily="'IBM Plex Mono', monospace"
                  >
                    {value.toFixed(0)}°
                  </text>
                </g>
              );
            }
          )}

          {/* Zero-degree reference */}
          {minValue <= 0 &&
            maxValue >= 0 && (
              <line
                x1={padding.left}
                y1={yFor(0)}
                x2={
                  width -
                  padding.right
                }
                y2={yFor(0)}
                stroke="var(--text-muted)"
                strokeWidth="1.2"
                strokeDasharray="5 5"
                opacity="0.8"
              />
            )}

          {/* Tilt X */}
          {tiltXPoints && (
            <polyline
              points={tiltXPoints}
              fill="none"
              stroke="var(--accent-blue)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Tilt Y */}
          {tiltYPoints && (
            <polyline
              points={tiltYPoints}
              fill="none"
              stroke="var(--status-high)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="7 4"
            />
          )}

          {/* Latest point - Tilt X */}
          {data[data.length - 1]?.tiltX !==
            null &&
            Number.isFinite(
              data[data.length - 1]?.tiltX
            ) && (
              <circle
                cx={xFor(data.length - 1)}
                cy={yFor(
                  data[data.length - 1]
                    .tiltX
                )}
                r="5"
                fill="var(--accent-blue)"
              />
            )}

          {/* Latest point - Tilt Y */}
          {data[data.length - 1]?.tiltY !==
            null &&
            Number.isFinite(
              data[data.length - 1]?.tiltY
            ) && (
              <circle
                cx={xFor(data.length - 1)}
                cy={yFor(
                  data[data.length - 1]
                    .tiltY
                )}
                r="5"
                fill="var(--status-high)"
              />
            )}

          {/* X-axis labels */}
          {labelIndexes.map((index) => (
            <text
              key={`label-${index}`}
              x={xFor(index)}
              y={height - 14}
              textAnchor={
                index === 0
                  ? 'start'
                  : index ===
                      data.length - 1
                    ? 'end'
                    : 'middle'
              }
              fontSize="10"
              fill="var(--text-muted)"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {data[index].time}
            </text>
          ))}
        </svg>
      </div>

      <div
        className="text-xs text-muted"
        style={{
          marginTop: 4,
          textAlign: 'center',
        }}
      >
        Degrees (°) · real PostgreSQL
        history from ThingsBoard telemetry
      </div>
    </div>
  );
}

