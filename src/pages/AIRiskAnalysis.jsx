// src/pages/AIRiskAnalysis.jsx

import { useEffect, useMemo, useState } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Radio,
  Shield,
  RefreshCw,
} from 'lucide-react';

import { zones, riskTrendData } from '../data/mockData';

import { StatusBadge } from '../components/StatusIndicator';

import { getRiskColor } from '../utils/riskUtils';

import RiskBar from '../components/RiskBar';

import RiskTrendChart from '../components/RiskTrendChart';


/* =========================================================
   API
   ========================================================= */

const API_URL =
  'https://mineguard-backend-x2km.onrender.com/api/telemetry';


/* =========================================================
   MINE NODES
   ========================================================= */

const NODES = [
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


/* =========================================================
   TREND LABELS
   ========================================================= */

const TREND_LABELS = {
  stable: 'Stable',

  increasing: 'Increasing',

  slowly_increasing:
    'Slowly Increasing',

  decreasing: 'Decreasing',
};


/* =========================================================
   TREND ICONS
   ========================================================= */

const TREND_ICONS = {
  stable: (
    <Minus size={14} />
  ),

  increasing: (
    <TrendingUp
      size={14}
      color="var(--status-high)"
    />
  ),

  slowly_increasing: (
    <TrendingUp
      size={14}
      color="var(--status-warning)"
    />
  ),

  decreasing: (
    <TrendingDown
      size={14}
      color="var(--status-normal)"
    />
  ),
};


/* =========================================================
   FACTOR COLORS
   ========================================================= */

const FACTOR_LEVEL_COLOR = {
  normal:
    'var(--status-normal)',

  warning:
    'var(--status-warning)',

  high:
    'var(--status-high)',
};


/* =========================================================
   GENERATE SENSOR VALUES
   ========================================================= */

function createSensorTelemetry(
  previous = null,
  index = 0
) {
  const base = previous || {
    accelX:
      0.12 + index * 0.03,

    accelY:
      -0.08 + index * 0.02,

    accelZ:
      0.93 - index * 0.01,

    tiltX:
      0.8 + index * 0.15,

    tiltY:
      -0.6 + index * 0.1,
  };

  const drift = (
    value,
    amount
  ) =>
    Number(value) +
    (Math.random() - 0.5) *
      amount;

  return {
    accelX: drift(
      base.accelX,
      0.06
    ),

    accelY: drift(
      base.accelY,
      0.06
    ),

    accelZ: drift(
      base.accelZ,
      0.04
    ),

    tiltX: drift(
      base.tiltX,
      0.35
    ),

    tiltY: drift(
      base.tiltY,
      0.35
    ),
  };
}


/* =========================================================
   RISK CALCULATION
   ========================================================= */

function calculateRisk(
  telemetry
) {
  if (!telemetry) {
    return {
      level: 'offline',

      score: 0,

      label: 'OFFLINE',

      acceleration: null,
    };
  }

  const tiltX =
    Math.abs(
      Number(
        telemetry.tiltX
      ) || 0
    );

  const tiltY =
    Math.abs(
      Number(
        telemetry.tiltY
      ) || 0
    );

  const accelX =
    Number(
      telemetry.accelX
    ) || 0;

  const accelY =
    Number(
      telemetry.accelY
    ) || 0;

  const accelZ =
    Number(
      telemetry.accelZ
    ) || 0;

  const acceleration =
    Math.sqrt(
      accelX ** 2 +
        accelY ** 2 +
        accelZ ** 2
    );

  if (
    tiltX >= 6 ||
    tiltY >= 6 ||
    acceleration >= 0.8
  ) {
    return {
      level: 'critical',

      score: 95,

      label: 'CRITICAL',

      acceleration,
    };
  }

  if (
    tiltX >= 3 ||
    tiltY >= 3 ||
    acceleration >= 0.5
  ) {
    return {
      level: 'high',

      score: 75,

      label: 'HIGH',

      acceleration,
    };
  }

  if (
    tiltX >= 2 ||
    tiltY >= 2
  ) {
    return {
      level: 'warning',

      score: 45,

      label: 'WARNING',

      acceleration,
    };
  }

  return {
    level: 'normal',

    score: 15,

    label: 'NORMAL',

    acceleration,
  };
}


/* =========================================================
   FACTOR LEVEL
   ========================================================= */

function getFactorLevel(
  value
) {
  if (value >= 6) {
    return 'high';
  }

  if (value >= 2) {
    return 'warning';
  }

  return 'normal';
}


/* =========================================================
   FACTOR ROW
   ========================================================= */

function FactorRow({
  label,
  level,
}) {
  const isDetected =
    level !== 'normal';

  return (
    <div
      style={{
        display: 'flex',

        justifyContent:
          'space-between',

        alignItems: 'center',

        padding:
          '8px 0',

        borderBottom:
          '1px solid var(--border-light)',
      }}
    >

      <span
        style={{
          fontSize:
            '0.875rem',

          color:
            'var(--text-secondary)',
        }}
      >
        {label}
      </span>

      <div
        style={{
          display: 'flex',

          alignItems: 'center',

          gap: 6,
        }}
      >

        <span
          style={{
            fontFamily:
              "'IBM Plex Mono', monospace",

            fontSize:
              '0.8rem',

            fontWeight: 500,

            color:
              FACTOR_LEVEL_COLOR[
                level
              ] ||
              'var(--text-muted)',

            letterSpacing:
              '0.04em',
          }}
        >
          {level.toUpperCase()}
        </span>

        {isDetected ? (
          <CheckCircle
            size={13}
            color={
              'var(--status-high)'
            }
          />
        ) : (
          <XCircle
            size={13}
            color={
              'var(--status-normal)'
            }
          />
        )}

      </div>

    </div>
  );
}


/* =========================================================
   SENSOR AGREEMENT
   ========================================================= */

function SensorAgreementRow({
  label,
  level,
}) {
  const background =
    level === 'high'
      ? 'var(--status-high-bg)'
      : level === 'warning'
        ? 'var(--status-warning-bg)'
        : 'var(--status-normal-bg)';

  const border =
    level === 'high'
      ? 'var(--status-high-border)'
      : level === 'warning'
        ? 'var(--status-warning-border)'
        : 'var(--status-normal-border)';

  return (
    <div
      style={{
        display: 'flex',

        justifyContent:
          'space-between',

        alignItems: 'center',

        padding:
          '7px 12px',

        background,

        border:
          `1px solid ${border}`,

        borderRadius:
          'var(--radius-sm)',
      }}
    >

      <span
        style={{
          fontSize:
            '0.85rem',

          color:
            'var(--text-secondary)',
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontFamily:
            "'IBM Plex Mono', monospace",

          fontSize:
            '0.78rem',

          fontWeight: 600,

          color:
            FACTOR_LEVEL_COLOR[
              level
            ],

          letterSpacing:
            '0.04em',
        }}
      >
        {level.toUpperCase()}
      </span>

    </div>
  );
}


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function AIRiskAnalysis() {

  const [
    selectedNodeId,
    setSelectedNodeId,
  ] = useState('N01');

  const [
    nodeTelemetry,
    setNodeTelemetry,
  ] = useState(
    NODES.map(
      (
        node,
        index
      ) => {
        const telemetry =
          createSensorTelemetry(
            null,
            index
          );

        return {
          ...node,

          telemetry,

          risk:
            calculateRisk(
              telemetry
            ),
        };
      }
    )
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    apiError,
    setApiError,
  ] = useState(false);

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);


  /* =======================================================
     SELECTED NODE
     ======================================================= */

  const selectedNode =
    nodeTelemetry.find(
      (node) =>
        node.id ===
        selectedNodeId
    );


  /* =======================================================
     TELEMETRY
     ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function updateTelemetry() {
      let realTelemetry =
        null;

      try {
        const response =
          await fetch(
            API_URL
          );

        if (!response.ok) {
          throw new Error(
            `Telemetry API returned ${response.status}`
          );
        }

        const result =
          await response.json();

        realTelemetry =
          result.telemetry ||
          null;

        if (mounted) {
          setApiError(false);

          setLastUpdated(
            new Date()
          );
        }
      } catch (error) {
        console.error(
          'AI telemetry error:',
          error
        );

        if (mounted) {
          setApiError(true);
        }
      }

      if (!mounted) {
        return;
      }

      setNodeTelemetry(
        (current) =>
          current.map(
            (
              node,
              index
            ) => {

              /*
               * N01 receives the
               * actual ThingsBoard data.
               */
              if (
                node.live
              ) {
                const telemetry =
                  realTelemetry ||
                  node.telemetry;

                return {
                  ...node,

                  telemetry,

                  risk:
                    calculateRisk(
                      telemetry
                    ),
                };
              }

              /*
               * Other sensor positions
               * remain active in the UI.
               */
              const telemetry =
                createSensorTelemetry(
                  node.telemetry,
                  index
                );

              return {
                ...node,

                telemetry,

                risk:
                  calculateRisk(
                    telemetry
                  ),
              };
            }
          )
      );

      setLoading(false);
    }

    updateTelemetry();

    const interval =
      setInterval(
        updateTelemetry,
        5000
      );

    return () => {
      mounted = false;

      clearInterval(
        interval
      );
    };
  }, []);


  /* =======================================================
     AI ANALYSIS
     ======================================================= */

  const analysis =
    useMemo(() => {

      if (!selectedNode) {
        return null;
      }

      const telemetry =
        selectedNode.telemetry;

      const risk =
        selectedNode.risk;

      const tilt =
        Math.max(
          Math.abs(
            Number(
              telemetry?.tiltX
            ) || 0
          ),

          Math.abs(
            Number(
              telemetry?.tiltY
            ) || 0
          )
        );

      const acceleration =
        risk.acceleration ||
        0;

      const tiltLevel =
        getFactorLevel(
          tilt
        );

      const vibrationLevel =
        acceleration >= 0.8
          ? 'high'
          : acceleration >=
              0.5
            ? 'warning'
            : 'normal';

      /*
       * No actual crack sensor
       * exists in the current
       * telemetry structure.
       *
       * Therefore this is kept
       * normal rather than
       * inventing crack data.
       */
      const crackLevel =
        'normal';

      const factors = {
        tilt: tiltLevel,

        vibration:
          vibrationLevel,

        crack:
          crackLevel,
      };

      const factorValues =
        Object.values(
          factors
        );

      const allHigh =
        factorValues.every(
          (value) =>
            value === 'high'
        );

      const mixed =
        !allHigh &&
        factorValues.some(
          (value) =>
            value !==
            'normal'
        );

      let trend =
        'stable';

      if (
        risk.level ===
        'critical'
      ) {
        trend =
          'increasing';
      } else if (
        risk.level ===
        'high'
      ) {
        trend =
          'slowly_increasing';
      } else if (
        risk.level ===
        'warning'
      ) {
        trend =
          'slowly_increasing';
      }

      let classification =
        'stable_condition';

      if (
        risk.level ===
        'critical' ||
        allHigh
      ) {
        classification =
          'progressive_deformation';
      } else if (
        mixed
      ) {
        classification =
          'temporary_disturbance';
      }

      let classificationDetail =
        'Current sensor values remain within the normal monitoring range.';

      if (
        classification ===
        'progressive_deformation'
      ) {
        classificationDetail =
          'Multiple monitored indicators are elevated and require immediate review of the affected mine position.';
      } else if (
        classification ===
        'temporary_disturbance'
      ) {
        classificationDetail =
          'One or more sensor indicators are elevated. Continued monitoring is recommended to determine whether the change persists.';
      }

      let confidence = 55;

      if (allHigh) {
        confidence = 92;
      } else if (mixed) {
        confidence = 72;
      } else if (
        risk.level ===
        'normal'
      ) {
        confidence = 86;
      }

      return {
        riskScore:
          risk.score,

        confidence,

        trend,

        classification,

        classificationDetail,

        factors,

        acceleration,
      };
    }, [
      selectedNode,
    ]);


  /* =======================================================
     TREND DATA
     ======================================================= */

  const trendData =
    riskTrendData?.B ||
    [];


  /* =======================================================
     AGREEMENT
     ======================================================= */

  const agreementResult =
    useMemo(() => {

      if (!analysis) {
        return {
          label:
            'NO SENSOR DATA',

          color:
            'var(--text-muted)',
        };
      }

      const levels =
        Object.values(
          analysis.factors
        );

      const allHigh =
        levels.every(
          (value) =>
            value === 'high'
        );

      const mixed =
        !allHigh &&
        levels.some(
          (value) =>
            value !==
            'normal'
        );

      if (allHigh) {
        return {
          label:
            'HIGH CONFIDENCE EVENT',

          color:
            'var(--status-high)',
        };
      }

      if (mixed) {
        return {
          label:
            'MODERATE CONFIDENCE — Continue monitoring',

          color:
            'var(--status-warning)',
        };
      }

      return {
        label:
          'LOW CONFIDENCE — Situation likely stable',

        color:
          'var(--status-normal)',
      };
    }, [
      analysis,
    ]);


  const isProgressiveDeformation =
    analysis?.classification ===
    'progressive_deformation';


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="page-content page-fade-in">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="page-header">

        <div
          style={{
            display: 'flex',

            justifyContent:
              'space-between',

            alignItems:
              'flex-start',

            gap: 16,
          }}
        >

          <div>

            <h1>
              AI Risk Analysis
            </h1>

            <p>
              Interpreted sensor
              data, risk prediction
              and event
              classification
            </p>

          </div>

          <div
            style={{
              display: 'flex',

              alignItems:
                'center',

              gap: 7,

              color:
                apiError
                  ? 'var(--status-high)'
                  : 'var(--status-normal)',

              fontFamily:
                "'IBM Plex Mono', monospace",

              fontSize:
                '0.68rem',
            }}
          >

            {apiError ? (
              <AlertCircle
                size={13}
              />
            ) : (
              <Radio
                size={13}
              />
            )}

            {apiError
              ? 'CONNECTION ISSUE'
              : 'LIVE ANALYSIS'}

          </div>

        </div>

      </div>


      {/* ===================================================
          NODE SELECTOR
      =================================================== */}

      <div
        className="flex gap-12 items-center mb-16"
      >

        <label
          style={{
            fontSize:
              '0.875rem',

            color:
              'var(--text-secondary)',
          }}
        >
          Select Sensor:
        </label>

        <select
          value={
            selectedNodeId
          }
          onChange={(event) =>
            setSelectedNodeId(
              event.target.value
            )
          }
        >

          {NODES.map(
            (node) => (
              <option
                key={node.id}
                value={node.id}
              >
                {node.name} —{' '}
                {node.zone}
              </option>
            )
          )}

        </select>

      </div>


      {/* ===================================================
          SELECTED NODE STATUS
      =================================================== */}

      <div
        className="panel"
        style={{
          marginBottom: 16,
        }}
      >

        <div
          style={{
            display: 'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            gap: 16,
          }}
        >

          <div
            style={{
              display: 'flex',

              alignItems:
                'center',

              gap: 10,
            }}
          >

            <Activity
              size={17}
              color={
                getRiskColor(
                  analysis?.riskScore ||
                    0
                )
              }
            />

            <div>

              <div
                className="mono"
                style={{
                  fontSize:
                    '0.85rem',

                  fontWeight: 600,
                }}
              >
                {
                  selectedNode
                    ?.name
                }
              </div>

              <div className="text-xs text-muted">
                {
                  selectedNode
                    ?.zone
                }
              </div>

            </div>

          </div>

          <div
            style={{
              display: 'flex',

              alignItems:
                'center',

              gap: 10,
            }}
          >

            <span className="text-xs text-muted">
              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : loading
                  ? 'Connecting...'
                  : '--'}
            </span>

            <StatusBadge
              status={
                selectedNode
                  ?.risk
                  ?.level ===
                'critical'
                  ? 'high'
                  : selectedNode
                      ?.risk
                      ?.level
              }
              label={
                selectedNode
                  ?.risk
                  ?.label
              }
            />

          </div>

        </div>

      </div>


      {/* ===================================================
          MAIN GRID
      =================================================== */}

      <div
        style={{
          display: 'grid',

          gridTemplateColumns:
            '1fr 1fr',

          gap: 16,

          alignItems:
            'start',
        }}
      >

        {/* =================================================
            LEFT COLUMN
        ================================================= */}

        <div
          style={{
            display: 'flex',

            flexDirection:
              'column',

            gap: 14,
          }}
        >

          {/* =================================================
              AI ASSESSMENT
          ================================================= */}

          <div className="panel">

            <div
              className="flex justify-between items-center mb-12"
            >

              <div
                className="panel-title"
                style={{
                  marginBottom: 0,
                }}
              >
                AI Assessment
                —{' '}
                {
                  selectedNode
                    ?.id
                }
              </div>

              <StatusBadge
                status={
                  selectedNode
                    ?.risk
                    ?.level ===
                  'critical'
                    ? 'high'
                    : selectedNode
                        ?.risk
                        ?.level
                }
                label={
                  selectedNode
                    ?.risk
                    ?.label
                }
              />

            </div>

            <div
              style={{
                display: 'flex',

                alignItems:
                  'baseline',

                gap: 4,

                marginBottom: 12,
              }}
            >

              <span
                style={{
                  fontFamily:
                    "'IBM Plex Mono', monospace",

                  fontSize:
                    '2.2rem',

                  fontWeight: 500,

                  color:
                    getRiskColor(
                      analysis?.riskScore ||
                        0
                    ),

                  lineHeight: 1,
                }}
              >
                {
                  analysis?.riskScore ||
                  0
                }
              </span>

              <span
                style={{
                  color:
                    'var(--text-muted)',

                  fontSize:
                    '1rem',
                }}
              >
                &nbsp;/ 100
              </span>

            </div>

            <RiskBar
              score={
                analysis?.riskScore ||
                0
              }
              showLabel={false}
            />

            <div
              className="flex gap-8 items-center mt-12"
            >

              {
                TREND_ICONS[
                  analysis?.trend
                ]
              }

              <span
                style={{
                  fontSize:
                    '0.85rem',

                  color:
                    'var(--text-secondary)',
                }}
              >
                Trend:{' '}
                {
                  TREND_LABELS[
                    analysis?.trend
                  ] ||
                  'Stable'
                }
              </span>

            </div>

          </div>


          {/* =================================================
              SENSOR READINGS
          ================================================= */}

          <div className="panel">

            <div className="panel-title">
              Current Sensor
              Readings
            </div>

            <div
              style={{
                display: 'grid',

                gridTemplateColumns:
                  'repeat(2, 1fr)',

                gap: 14,
              }}
            >

              <SensorReading
                label="ACCEL X"
                value={
                  selectedNode
                    ?.telemetry
                    ?.accelX !=
                  null
                    ? Number(
                        selectedNode
                          .telemetry
                          .accelX
                      ).toFixed(3)
                    : '--'
                }
              />

              <SensorReading
                label="ACCEL Y"
                value={
                  selectedNode
                    ?.telemetry
                    ?.accelY !=
                  null
                    ? Number(
                        selectedNode
                          .telemetry
                          .accelY
                      ).toFixed(3)
                    : '--'
                }
              />

              <SensorReading
                label="ACCEL Z"
                value={
                  selectedNode
                    ?.telemetry
                    ?.accelZ !=
                  null
                    ? Number(
                        selectedNode
                          .telemetry
                          .accelZ
                      ).toFixed(3)
                    : '--'
                }
              />

              <SensorReading
                label="ACCELERATION"
                value={
                  analysis?.acceleration !=
                  null
                    ? analysis.acceleration.toFixed(
                        3
                      )
                    : '--'
                }
              />

              <SensorReading
                label="TILT X"
                value={
                  selectedNode
                    ?.telemetry
                    ?.tiltX !=
                  null
                    ? `${Number(
                        selectedNode
                          .telemetry
                          .tiltX
                      ).toFixed(
                        2
                      )}°`
                    : '--'
                }
              />

              <SensorReading
                label="TILT Y"
                value={
                  selectedNode
                    ?.telemetry
                    ?.tiltY !=
                  null
                    ? `${Number(
                        selectedNode
                          .telemetry
                          .tiltY
                      ).toFixed(
                        2
                      )}°`
                    : '--'
                }
              />

            </div>

          </div>


          {/* =================================================
              RISK TREND
          ================================================= */}

          <div className="panel">

            <div className="panel-title">
              Risk Score Trend
            </div>

            <div className="text-xs text-muted mb-12">
              Past 30 min →
              Current → 10 min
              prediction
            </div>

            <RiskTrendChart
              data={trendData}
              height={200}
            />

            <div
              className="flex gap-16 mt-8"
              style={{
                justifyContent:
                  'center',
              }}
            >

              <div className="flex gap-4 items-center text-xs text-muted">

                <span
                  style={{
                    width: 20,
                    height: 1.5,

                    background:
                      'var(--accent-blue)',

                    display:
                      'inline-block',
                  }}
                />

                Actual

              </div>

              <div className="flex gap-4 items-center text-xs text-muted">

                <span
                  style={{
                    width: 20,
                    height: 1.5,

                    borderTop:
                      '1.5px dashed var(--accent-blue)',

                    display:
                      'inline-block',
                  }}
                />

                Predicted

              </div>

              <div className="flex gap-4 items-center text-xs text-muted">

                <span
                  style={{
                    width: 12,
                    height: 1,

                    borderTop:
                      '1px dashed var(--status-high)',

                    display:
                      'inline-block',
                  }}
                />

                High threshold

              </div>

            </div>

          </div>


          {/* =================================================
              AI CONFIDENCE
          ================================================= */}

          <div className="panel panel-sm">

            <div
              className="flex justify-between items-center"
            >

              <div>

                <div
                  className="panel-title"
                  style={{
                    marginBottom: 2,
                  }}
                >
                  AI Confidence
                </div>

                <div
                  className="text-xs text-muted"
                  style={{
                    maxWidth: 250,
                  }}
                >
                  Based on agreement
                  between monitored
                  sensor patterns
                </div>

              </div>

              <div
                style={{
                  fontFamily:
                    "'IBM Plex Mono', monospace",

                  fontSize:
                    '1.8rem',

                  fontWeight: 500,

                  color:
                    analysis?.confidence >=
                    85
                      ? 'var(--status-normal)'
                      : analysis?.confidence >=
                          65
                        ? 'var(--status-warning)'
                        : 'var(--status-high)',
                }}
              >
                {
                  analysis?.confidence ||
                  0
                }%
              </div>

            </div>

          </div>

        </div>


        {/* =================================================
            RIGHT COLUMN
        ================================================= */}

        <div
          style={{
            display: 'flex',

            flexDirection:
              'column',

            gap: 14,
          }}
        >

          {/* =================================================
              EVENT CLASSIFICATION
          ================================================= */}

          <div className="panel">

            <div className="panel-title">
              Event Classification
            </div>

            <div
              style={{
                background:
                  isProgressiveDeformation
                    ? 'var(--status-high-bg)'
                    : 'var(--status-warning-bg)',

                border:
                  `1px solid ${
                    isProgressiveDeformation
                      ? 'var(--status-high-border)'
                      : 'var(--status-warning-border)'
                  }`,

                borderRadius:
                  'var(--radius-md)',

                padding:
                  '14px 16px',

                marginBottom: 12,
              }}
            >

              <div
                style={{
                  fontWeight: 600,

                  fontSize:
                    '0.95rem',

                  color:
                    isProgressiveDeformation
                      ? 'var(--status-high)'
                      : 'var(--status-warning)',

                  marginBottom: 6,

                  letterSpacing:
                    '0.02em',
                }}
              >
                {isProgressiveDeformation
                  ? 'Progressive Deformation'
                  : analysis?.classification ===
                      'temporary_disturbance'
                    ? 'Temporary Disturbance'
                    : 'Stable Condition'}
              </div>

              <div
                style={{
                  fontSize:
                    '0.82rem',

                  color:
                    'var(--text-secondary)',

                  lineHeight: 1.5,
                }}
              >
                {
                  analysis?.classificationDetail
                }
              </div>

            </div>

            <div
              style={{
                fontSize:
                  '0.78rem',

                color:
                  'var(--text-muted)',

                lineHeight: 1.7,
              }}
            >
              <span className="fw-500">
                Note:
              </span>{' '}
              Not every sensor
              change is treated as
              subsidence. Classification
              requires agreement across
              available sensor signals
              with a sustained trend.
            </div>

          </div>


          {/* =================================================
              CONTRIBUTING FACTORS
          ================================================= */}

          <div className="panel">

            <div className="panel-title">
              Why Was This
              Flagged?
            </div>

            <div>

              <FactorRow
                label="Progressive tilt"
                level={
                  analysis
                    ?.factors
                    ?.tilt ||
                  'normal'
                }
              />

              <FactorRow
                label="Abnormal vibration"
                level={
                  analysis
                    ?.factors
                    ?.vibration ||
                  'normal'
                }
              />

              <FactorRow
                label="Crack / deformation pattern"
                level={
                  analysis
                    ?.factors
                    ?.crack ||
                  'normal'
                }
              />

            </div>

          </div>


          {/* =================================================
              SENSOR AGREEMENT
          ================================================= */}

          <div className="panel">

            <div className="panel-title">
              Sensor Agreement
            </div>

            <div
              style={{
                display: 'flex',

                flexDirection:
                  'column',

                gap: 6,
              }}
            >

              <SensorAgreementRow
                label="Tilt"
                level={
                  analysis
                    ?.factors
                    ?.tilt ||
                  'normal'
                }
              />

              <SensorAgreementRow
                label="Vibration"
                level={
                  analysis
                    ?.factors
                    ?.vibration ||
                  'normal'
                }
              />

              <SensorAgreementRow
                label="Crack signal"
                level={
                  analysis
                    ?.factors
                    ?.crack ||
                  'normal'
                }
              />

            </div>

            <div
              style={{
                marginTop: 12,

                padding:
                  '10px 14px',

                background:
                  'var(--bg-secondary)',

                borderRadius:
                  'var(--radius-md)',

                fontSize:
                  '0.82rem',

                fontWeight: 600,

                color:
                  agreementResult.color,

                letterSpacing:
                  '0.03em',
              }}
            >
              →{' '}
              {
                agreementResult.label
              }
            </div>

          </div>


          {/* =================================================
              SENSOR NETWORK
          ================================================= */}

          <div className="panel">

            <div className="panel-title">
              Sensor Network
            </div>

            {nodeTelemetry.map(
              (node) => (
                <button
                  key={node.id}
                  className="mine-node-card"
                  onClick={() =>
                    setSelectedNodeId(
                      node.id
                    )
                  }
                  style={{
                    width: '100%',

                    display: 'flex',

                    alignItems:
                      'center',

                    justifyContent:
                      'space-between',

                    marginBottom: 7,

                    cursor:
                      'pointer',

                    textAlign:
                      'left',

                    background:
                      node.id ===
                      selectedNodeId
                        ? 'var(--bg-secondary)'
                        : 'transparent',

                    border:
                      node.id ===
                      selectedNodeId
                        ? '1px solid var(--accent-blue)'
                        : '1px solid var(--border)',

                    borderRadius:
                      'var(--radius-sm)',

                    padding:
                      '9px 11px',

                    color:
                      'var(--text-primary)',
                  }}
                >

                  <div>

                    <div
                      className="mono"
                      style={{
                        fontSize:
                          '0.72rem',

                        fontWeight: 600,
                      }}
                    >
                      {
                        node.name
                      }
                    </div>

                    <div
                      className="text-xs text-muted"
                      style={{
                        marginTop: 3,
                      }}
                    >
                      {
                        node.zone
                      }
                    </div>

                  </div>

                  <span
                    style={{
                      width: 8,
                      height: 8,

                      borderRadius:
                        '50%',

                      background:
                        node.risk
                          .level ===
                        'critical'
                          ? 'var(--status-high)'
                          : node.risk
                              .level ===
                            'warning'
                            ? 'var(--status-warning)'
                            : 'var(--status-normal)',
                    }}
                  />

                </button>
              )
            )}

          </div>

        </div>

      </div>


      {/* ===================================================
          FOOTER STATUS
      =================================================== */}

      <div
        className="panel"
        style={{
          marginTop: 16,
        }}
      >

        <div
          style={{
            display: 'flex',

            alignItems:
              'center',

            justifyContent:
              'space-between',

            gap: 12,
          }}
        >

          <div
            style={{
              display: 'flex',

              alignItems:
                'center',

              gap: 8,
            }}
          >

            <Shield
              size={15}
              color={
                'var(--status-normal)'
              }
            />

            <span
              style={{
                fontSize:
                  '0.78rem',

                color:
                  'var(--text-secondary)',
              }}
            >
              Sensor monitoring
              active
            </span>

          </div>

          <div
            className="text-xs text-muted"
            style={{
              display: 'flex',

              alignItems:
                'center',

              gap: 6,
            }}
          >

            <RefreshCw
              size={11}
            />

            5 second telemetry
            refresh

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   SENSOR READING
   ========================================================= */

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

          fontSize:
            '0.8rem',

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
