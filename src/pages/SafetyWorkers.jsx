// src/pages/SafetyWorkers.jsx

import { useEffect, useMemo, useState } from 'react';

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  HelpCircle,
  Bell,
  ChevronRight,
  Radio,
  ShieldAlert,
} from 'lucide-react';

import { workers } from '../data/mockData';


/* =========================================================
   API
   ========================================================= */

const API_URL =
  'https://mineguard-backend-x2km.onrender.com/api/telemetry';


/* =========================================================
   MINE NODES
   ========================================================= */

const MINE_NODES = [
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
   ESCALATION
   ========================================================= */

const ESCALATION_STEPS = [
  {
    id: 'worker',
    label: 'Worker Alert',
    description:
      'Alert sent to workers in the affected area',
  },

  {
    id: 'supervisor',
    label: 'Supervisor Alert',
    description:
      'Supervisor notified and evacuation oversight begins',
  },

  {
    id: 'safety',
    label: 'Safety Officer Alert',
    description:
      'Safety officer and mine management informed',
  },
];


/* =========================================================
   WORKER ROW
   ========================================================= */

function WorkerRow({
  worker,
  alertActive,
  alertNode,
}) {
  /*
   * The original worker data uses zones.
   * We keep that structure instead of inventing
   * a worker-location backend.
   */

  const statusLabel = {
    safe: 'Safe',

    alerted: 'Alerted',

    no_response: 'No Response',

    needs_help: 'Needs Help',
  }[worker.status] || worker.status;


  const statusColor = {
    safe: 'var(--status-normal)',

    alerted: 'var(--status-warning)',

    no_response: 'var(--text-muted)',

    needs_help: 'var(--status-high)',
  }[worker.status];


  return (
    <div
      style={{
        display: 'flex',

        alignItems: 'center',

        justifyContent: 'space-between',

        padding: '8px 0',

        borderBottom:
          '1px solid var(--border-light)',
      }}
    >

      <div className="flex gap-12 items-center">

        <span
          className="mono text-xs text-muted"
          style={{
            minWidth: 36,
          }}
        >
          {worker.id}
        </span>


        <div>

          <div
            style={{
              fontSize:
                '0.875rem',

              fontWeight: 500,
            }}
          >
            {worker.name}
          </div>


          <div className="text-xs text-muted">

            Zone {worker.zone}

            {' · '}

            {worker.shift} shift

          </div>

        </div>

      </div>


      <div className="flex gap-8 items-center">

        <span
          style={{
            fontSize:
              '0.78rem',

            fontWeight: 500,

            color:
              statusColor,
          }}
        >
          {statusLabel}
        </span>


        {alertActive &&
          worker.status ===
            'needs_help' && (
            <HelpCircle
              size={13}
              color="var(--status-high)"
            />
          )}


        {alertActive &&
          worker.status ===
            'no_response' && (
            <Clock
              size={13}
              color="var(--text-muted)"
            />
          )}

      </div>

    </div>
  );
}


/* =========================================================
   TELEMETRY HELPERS
   ========================================================= */

function calculateRisk(
  telemetry
) {
  if (!telemetry) {
    return {
      level: 'offline',

      score: 0,

      acceleration: 0,
    };
  }


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

      acceleration,
    };
  }


  return {
    level: 'normal',

    score: 15,

    acceleration,
  };
}


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function SafetyWorkers() {

  const [
    workerView,
    setWorkerView,
  ] = useState(false);


  const [
    workerSafe,
    setWorkerSafe,
  ] = useState(false);


  const [
    alertSent,
    setAlertSent,
  ] = useState(false);


  const [
    escalationStep,
    setEscalationStep,
  ] = useState(0);


  const [
    selectedNodeId,
    setSelectedNodeId,
  ] = useState('N01');


  const [
    telemetry,
    setTelemetry,
  ] = useState(null);


  const [
    apiError,
    setApiError,
  ] = useState(false);


  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);


  /* =======================================================
     LIVE TELEMETRY
     ======================================================= */

  useEffect(() => {

    let mounted = true;


    async function fetchTelemetry() {

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


        if (!mounted) {
          return;
        }


        setTelemetry(
          result.telemetry ||
            null
        );


        setApiError(false);


        setLastUpdated(
          new Date()
        );

      } catch (error) {

        console.error(
          'Safety telemetry error:',
          error
        );


        if (mounted) {
          setApiError(true);
        }

      }

    }


    fetchTelemetry();


    const interval =
      setInterval(
        fetchTelemetry,
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
     NODE
     ======================================================= */

  const selectedNode =
    MINE_NODES.find(
      (node) =>
        node.id ===
        selectedNodeId
    );


  /* =======================================================
     RISK
     ======================================================= */

  const risk =
    useMemo(
      () =>
        calculateRisk(
          telemetry
        ),
      [telemetry]
    );


  /* =======================================================
     ALERT STATUS
     ======================================================= */

  const alertActive =
    risk.level ===
      'high' ||
    risk.level ===
      'critical';


  const alertLevel =
    risk.level ===
    'critical'
      ? 'CRITICAL'
      : risk.level ===
          'high'
        ? 'HIGH'
        : 'NORMAL';


  /* =======================================================
     WORKERS
     ======================================================= */

  const safeCount =
    workers.filter(
      (worker) =>
        worker.status ===
        'safe'
    ).length;


  const noResponseCount =
    workers.filter(
      (worker) =>
        worker.status ===
        'no_response'
    ).length;


  const needsHelpCount =
    workers.filter(
      (worker) =>
        worker.status ===
        'needs_help'
    ).length;


  /* =======================================================
     ALERT ACTION
     ======================================================= */

  const handleSendAlert =
    () => {

      setAlertSent(true);

      setEscalationStep(1);

      setWorkerSafe(false);

    };


  /* =======================================================
     ESCALATE
     ======================================================= */

  const handleEscalate =
    () => {

      setEscalationStep(
        (current) =>
          Math.min(
            current + 1,
            3
          )
      );

    };


  /* =======================================================
     DISMISS
     ======================================================= */

  const handleDismiss =
    () => {

      setAlertSent(false);

      setEscalationStep(0);

      setWorkerSafe(false);

    };


  /* =======================================================
     WORKER SAFE
     ======================================================= */

  const handleWorkerSafe =
    () => {

      setWorkerSafe(true);

    };


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
          className="flex justify-between items-center"
        >

          <div>

            <h1>
              Safety & Workers
            </h1>

            <p>
              Active alerts, worker
              status, and escalation
              management
            </p>

          </div>


          <div className="flex gap-8">

            <button
              className={`btn btn-sm ${
                workerView
                  ? 'btn-secondary'
                  : 'btn-primary'
              }`}
              onClick={() =>
                setWorkerView(false)
              }
            >
              Supervisor View
            </button>


            <button
              className={`btn btn-sm ${
                workerView
                  ? 'btn-primary'
                  : 'btn-secondary'
              }`}
              onClick={() =>
                setWorkerView(true)
              }
            >
              Worker View
            </button>

          </div>

        </div>

      </div>


      {/* ===================================================
          SENSOR STATUS
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

            flexWrap: 'wrap',
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

            {alertActive ? (
              <ShieldAlert
                size={18}
                color={
                  'var(--status-high)'
                }
              />
            ) : (
              <Radio
                size={18}
                color={
                  'var(--status-normal)'
                }
              />
            )}


            <div>

              <div
                style={{
                  fontSize:
                    '0.85rem',

                  fontWeight: 600,
                }}
              >
                Sensor Safety
                Status
              </div>


              <div
                className="text-xs text-muted"
                style={{
                  marginTop: 2,
                }}
              >
                {selectedNode?.name}
                {' · '}
                {selectedNode?.zone}
              </div>

            </div>

          </div>


          <div
            style={{
              display: 'flex',

              alignItems:
                'center',

              gap: 12,
            }}
          >

            <span
              className="text-xs text-muted"
            >
              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : 'Waiting for telemetry'}
            </span>


            <span
              style={{
                fontFamily:
                  "'IBM Plex Mono', monospace",

                fontSize:
                  '0.72rem',

                fontWeight: 600,

                color:
                  alertActive
                    ? 'var(--status-high)'
                    : apiError
                      ? 'var(--status-warning)'
                      : 'var(--status-normal)',
              }}
            >
              {apiError
                ? 'CONNECTION ISSUE'
                : alertActive
                  ? `${alertLevel} RISK`
                  : 'NORMAL'}
            </span>

          </div>

        </div>


        {/* NODE SELECTOR */}

        <div
          style={{
            display: 'flex',

            gap: 7,

            flexWrap: 'wrap',

            marginTop: 14,
          }}
        >

          {MINE_NODES.map(
            (node) => {

              const active =
                node.id ===
                selectedNodeId;


              return (
                <button
                  key={node.id}
                  className={
                    active
                      ? 'btn btn-primary btn-sm'
                      : 'btn btn-secondary btn-sm'
                  }
                  onClick={() =>
                    setSelectedNodeId(
                      node.id
                    )
                  }
                >
                  {node.id}
                  {' · '}
                  {node.zone}
                </button>
              );

            }
          )}

        </div>

      </div>


      {/* ===================================================
          WORKER VIEW
      =================================================== */}

      {workerView ? (

        <div
          style={{
            maxWidth: 420,

            margin:
              '0 auto',
          }}
        >

          <div
            className="panel"
            style={{
              textAlign:
                'center',
            }}
          >

            <div
              style={{
                fontSize:
                  '0.72rem',

                letterSpacing:
                  '0.1em',

                color:
                  'var(--text-muted)',

                marginBottom: 6,

                textTransform:
                  'uppercase',
              }}
            >
              Worker View
            </div>


            <div
              style={{
                padding:
                  '20px 24px',

                borderRadius:
                  'var(--radius-md)',

                background:
                  alertActive &&
                  !workerSafe
                    ? 'var(--status-high-bg)'
                    : 'var(--status-normal-bg)',

                border:
                  `1px solid ${
                    alertActive &&
                    !workerSafe
                      ? 'var(--status-high-border)'
                      : 'var(--status-normal-border)'
                  }`,

                marginBottom: 20,
              }}
            >

              {alertActive &&
              !workerSafe ? (

                <>

                  <div
                    style={{
                      fontSize:
                        '1.2rem',

                      fontWeight: 700,

                      color:
                        'var(--status-high)',

                      letterSpacing:
                        '0.04em',

                      marginBottom: 8,
                    }}
                  >
                    ⚠ DANGER IN
                    YOUR AREA
                  </div>


                  <div
                    style={{
                      fontSize:
                        '0.9rem',

                      fontWeight: 600,

                      marginBottom: 6,
                    }}
                  >
                    {
                      selectedNode?.zone
                    }
                  </div>


                  <div
                    style={{
                      fontSize:
                        '0.85rem',

                      color:
                        'var(--text-secondary)',
                    }}
                  >
                    Elevated ground
                    movement indicators
                    detected. Please
                    move to a safe area
                    immediately.
                  </div>

                </>

              ) : (

                <>

                  <div
                    style={{
                      fontSize:
                        '1.1rem',

                      fontWeight: 600,

                      color:
                        'var(--status-normal)',

                      marginBottom: 6,
                    }}
                  >
                    Your Area is Safe
                  </div>


                  <div
                    style={{
                      fontSize:
                        '0.85rem',

                      color:
                        'var(--text-secondary)',
                    }}
                  >
                    {
                      selectedNode?.zone
                    }
                    {' · '}
                    No active safety
                    alert
                  </div>

                </>

              )}

            </div>


            <div
              style={{
                marginBottom: 10,

                textAlign: 'left',
              }}
            >

              <div
                style={{
                  fontSize:
                    '0.75rem',

                  color:
                    'var(--text-muted)',

                  marginBottom: 4,
                }}
              >
                Monitored Area
              </div>


              <div
                style={{
                  fontSize:
                    '1rem',

                  fontWeight: 500,
                }}
              >
                {
                  selectedNode?.zone
                }
              </div>


              <div
                style={{
                  fontSize:
                    '0.78rem',

                  color:
                    'var(--text-secondary)',

                  marginTop: 2,
                }}
              >
                Current Status:{' '}

                <strong
                  style={{
                    color:
                      alertActive &&
                      !workerSafe
                        ? 'var(--status-high)'
                        : 'var(--status-normal)',
                  }}
                >
                  {alertActive &&
                  !workerSafe
                    ? 'DANGER'
                    : 'SAFE'}
                </strong>

              </div>

            </div>


            {alertActive &&
              !workerSafe && (

                <button
                  className="btn btn-success btn-lg"
                  style={{
                    width: '100%',

                    justifyContent:
                      'center',

                    marginTop: 12,
                  }}
                  onClick={
                    handleWorkerSafe
                  }
                >

                  <CheckCircle
                    size={16}
                  />

                  I'm Safe

                </button>

              )}


            {workerSafe && (

              <div
                style={{
                  padding:
                    '10px 14px',

                  background:
                    'var(--status-normal-bg)',

                  border:
                    '1px solid var(--status-normal-border)',

                  borderRadius:
                    'var(--radius-md)',

                  fontSize:
                    '0.85rem',

                  color:
                    'var(--status-normal)',

                  fontWeight: 500,

                  marginTop: 8,
                }}
              >
                ✓ Status reported
                as safe.
                Supervisor has
                been notified.
              </div>

            )}

          </div>

        </div>

      ) : (

        /* =================================================
           SUPERVISOR VIEW
           ================================================= */

        <div
          style={{
            display: 'grid',

            gridTemplateColumns:
              '1fr 320px',

            gap: 16,

            alignItems:
              'start',
          }}
        >


          {/* ===============================================
              MAIN CONTENT
              =============================================== */}

          <div
            style={{
              display: 'flex',

              flexDirection:
                'column',

              gap: 14,
            }}
          >


            {/* =============================================
                ACTIVE ALERT
                ============================================= */}

            <div
              className="panel"
              style={{
                borderColor:
                  alertActive
                    ? 'var(--status-high-border)'
                    : 'var(--border)',

                background:
                  alertActive
                    ? 'var(--status-high-bg)'
                    : 'var(--bg-surface)',
              }}
            >

              <div
                className="flex justify-between items-center mb-12"
              >

                <div
                  className="flex gap-8 items-center"
                >

                  {alertActive && (

                    <AlertTriangle
                      size={16}
                      color={
                        'var(--status-high)'
                      }
                      className="alert-pulse"
                    />

                  )}


                  <span
                    style={{
                      fontSize:
                        '0.78rem',

                      fontWeight: 600,

                      letterSpacing:
                        '0.08em',

                      color:
                        alertActive
                          ? 'var(--status-high)'
                          : 'var(--text-muted)',

                      textTransform:
                        'uppercase',
                    }}
                  >
                    {alertActive
                      ? 'Active Alert'
                      : 'No Active Alerts'}
                  </span>

                </div>


                {alertActive &&
                  alertSent && (

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={
                        handleDismiss
                      }
                    >
                      Dismiss Alert
                    </button>

                  )}

              </div>


              {alertActive ? (

                <>

                  <div
                    style={{
                      fontSize:
                        '1rem',

                      fontWeight: 600,

                      marginBottom: 4,
                    }}
                  >
                    {
                      selectedNode?.zone
                    }
                    {' — '}
                    {alertLevel}
                    {' RISK'}
                  </div>


                  <div
                    style={{
                      fontSize:
                        '0.875rem',

                      color:
                        'var(--text-secondary)',

                      marginBottom: 14,
                    }}
                  >
                    Elevated ground
                    movement indicators
                    detected by{' '}
                    {
                      selectedNode?.name
                    }
                    . Worker safety
                    procedures should
                    be initiated.
                  </div>


                  <div
                    className="flex gap-8"
                    style={{
                      flexWrap:
                        'wrap',
                    }}
                  >

                    <div className="text-xs text-secondary">

                      <strong>
                        Affected Area:
                      </strong>{' '}

                      {
                        selectedNode?.zone
                      }

                    </div>


                    <div className="text-xs text-secondary">

                      <strong>
                        Risk Score:
                      </strong>{' '}

                      {risk.score}/100

                    </div>


                    <div className="text-xs text-secondary">

                      <strong>
                        Tilt X:
                      </strong>{' '}

                      {telemetry?.tiltX !=
                      null
                        ? `${Number(
                            telemetry.tiltX
                          ).toFixed(2)}°`
                        : '--'}

                    </div>


                    <div className="text-xs text-secondary">

                      <strong>
                        Tilt Y:
                      </strong>{' '}

                      {telemetry?.tiltY !=
                      null
                        ? `${Number(
                            telemetry.tiltY
                          ).toFixed(2)}°`
                        : '--'}

                    </div>

                  </div>


                  {!alertSent && (

                    <button
                      className="btn btn-danger btn-lg"
                      style={{
                        marginTop: 16,

                        width: '100%',

                        justifyContent:
                          'center',
                      }}
                      onClick={
                        handleSendAlert
                      }
                    >

                      <Bell
                        size={16}
                      />

                      Alert Workers
                      in Affected
                      Area

                    </button>

                  )}


                  {alertSent && (

                    <div
                      style={{
                        marginTop: 14,

                        padding:
                          '10px 14px',

                        background:
                          'var(--bg-surface)',

                        border:
                          '1px solid var(--border)',

                        borderRadius:
                          'var(--radius-md)',

                        fontSize:
                          '0.82rem',

                        color:
                          'var(--text-secondary)',
                      }}
                    >

                      <span
                        style={{
                          color:
                            'var(--status-normal)',

                          fontWeight: 600,
                        }}
                      >
                        ✓ Alert sent
                      </span>

                      &nbsp;— Workers
                      in the affected
                      area have been
                      notified.

                    </div>

                  )}

                </>

              ) : (

                <div className="text-small text-muted">

                  All monitored mine
                  areas are currently
                  operating within
                  normal sensor
                  parameters.

                </div>

              )}

            </div>


            {/* =============================================
                WORKER STATUS
                ============================================= */}

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
                  Worker Status
                </div>


                {alertSent &&
                  alertActive && (

                    <div
                      className="flex gap-12"
                    >

                      <span className="text-xs text-muted">

                        <span
                          style={{
                            fontWeight: 600,

                            color:
                              'var(--status-normal)',
                          }}
                        >
                          {safeCount}
                        </span>{' '}
                        Safe

                      </span>


                      <span className="text-xs text-muted">

                        <span
                          style={{
                            fontWeight: 600,

                            color:
                              'var(--text-muted)',
                          }}
                        >
                          {
                            noResponseCount
                          }
                        </span>{' '}
                        No response

                      </span>


                      <span className="text-xs text-muted">

                        <span
                          style={{
                            fontWeight: 600,

                            color:
                              'var(--status-high)',
                          }}
                        >
                          {
                            needsHelpCount
                          }
                        </span>{' '}
                        Needs help

                      </span>

                    </div>

                  )}

              </div>


              {workers.map(
                (worker) => (

                  <WorkerRow
                    key={
                      worker.id
                    }
                    worker={
                      worker
                    }
                    alertActive={
                      alertActive &&
                      alertSent
                    }
                    alertNode={
                      selectedNode
                    }
                  />

                )
              )}

            </div>


            {/* =============================================
                MINE SENSOR STATUS
                ============================================= */}

            <div className="panel">

              <div className="panel-title">
                Mine Sensor Network
              </div>


              <div
                style={{
                  display: 'grid',

                  gridTemplateColumns:
                    'repeat(2, 1fr)',

                  gap: 8,
                }}
              >

                {MINE_NODES.map(
                  (node) => {

                    const isSelected =
                      node.id ===
                      selectedNodeId;


                    const isAlertNode =
                      node.id ===
                        'N01' &&
                      alertActive;


                    return (

                      <button
                        key={
                          node.id
                        }
                        onClick={() =>
                          setSelectedNodeId(
                            node.id
                          )
                        }
                        style={{
                          textAlign:
                            'left',

                          cursor:
                            'pointer',

                          padding:
                            '10px 12px',

                          background:
                            isSelected
                              ? 'var(--bg-secondary)'
                              : 'transparent',

                          border:
                            `1px solid ${
                              isAlertNode
                                ? 'var(--status-high-border)'
                                : isSelected
                                  ? 'var(--accent-blue)'
                                  : 'var(--border)'
                            }`,

                          borderRadius:
                            'var(--radius-sm)',

                          color:
                            'var(--text-primary)',
                        }}
                      >

                        <div
                          className="flex justify-between items-center"
                        >

                          <span
                            className="mono"
                            style={{
                              fontSize:
                                '0.75rem',

                              fontWeight: 600,
                            }}
                          >
                            {node.id}
                          </span>


                          <span
                            style={{
                              width: 7,

                              height: 7,

                              borderRadius:
                                '50%',

                              background:
                                isAlertNode
                                  ? 'var(--status-high)'
                                  : node.live
                                    ? 'var(--status-normal)'
                                    : 'var(--status-normal)',
                            }}
                          />

                        </div>


                        <div
                          className="text-xs text-muted"
                          style={{
                            marginTop: 5,
                          }}
                        >
                          {node.name}
                        </div>


                        <div
                          className="text-xs text-muted"
                          style={{
                            marginTop: 2,
                          }}
                        >
                          {node.zone}
                        </div>

                      </button>

                    );

                  }
                )}

              </div>

            </div>


            {/* =============================================
                ALL WORKERS
                ============================================= */}

            <div className="panel">

              <div className="panel-title">
                All Workers
              </div>


              <div
                style={{
                  display:
                    'flex',

                  flexDirection:
                    'column',

                  gap: 0,
                }}
              >

                {workers.map(
                  (worker) => (

                    <WorkerRow
                      key={
                        worker.id
                      }
                      worker={
                        worker
                      }
                      alertActive={
                        alertActive &&
                        alertSent
                      }
                      alertNode={
                        selectedNode
                      }
                    />

                  )
                )}

              </div>

            </div>

          </div>


          {/* ===============================================
              RIGHT SIDEBAR
              =============================================== */}

          <div
            style={{
              display: 'flex',

              flexDirection:
                'column',

              gap: 14,
            }}
          >


            {/* =============================================
                ESCALATION
                ============================================= */}

            <div className="panel">

              <div className="panel-title">
                Alert Escalation
              </div>


              <div className="timeline">

                {ESCALATION_STEPS.map(
                  (
                    step,
                    index
                  ) => {

                    const stepNum =
                      index + 1;


                    const isDone =
                      escalationStep >
                      stepNum;


                    const isActive =
                      escalationStep ===
                      stepNum;


                    return (

                      <div
                        key={
                          step.id
                        }
                        className="timeline-item"
                      >

                        <div
                          className={`timeline-dot${
                            isDone
                              ? ' done'
                              : isActive
                                ? ' active'
                                : ''
                          }`}
                        />


                        <div className="timeline-content">

                          <div
                            className="timeline-label"
                            style={{
                              color:
                                isDone
                                  ? 'var(--status-normal)'
                                  : isActive
                                    ? 'var(--text-primary)'
                                    : 'var(--text-muted)',
                            }}
                          >

                            {step.label}


                            {isDone && (

                              <span
                                style={{
                                  fontSize:
                                    '0.72rem',

                                  color:
                                    'var(--status-normal)',

                                  marginLeft: 6,
                                }}
                              >
                                ✓
                              </span>

                            )}

                          </div>


                          <div className="timeline-meta">
                            {
                              step.description
                            }
                          </div>

                        </div>

                      </div>

                    );

                  }
                )}

              </div>


              {alertActive &&
                alertSent &&
                escalationStep <
                  3 && (

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{
                      marginTop: 12,

                      width: '100%',

                      justifyContent:
                        'center',
                    }}
                    onClick={
                      handleEscalate
                    }
                  >

                    Escalate to{' '}

                    {
                      ESCALATION_STEPS[
                        escalationStep
                      ]?.label
                    }

                    <ChevronRight
                      size={13}
                    />

                  </button>

                )}


              {escalationStep ===
                3 && (

                <div
                  style={{
                    marginTop: 10,

                    fontSize:
                      '0.78rem',

                    color:
                      'var(--status-normal)',

                    fontWeight: 500,
                  }}
                >
                  ✓ All escalation
                  levels alerted
                </div>

              )}

            </div>


            {/* =============================================
                SENSOR SUMMARY
                ============================================= */}

            <div className="panel panel-sm">

              <div className="panel-title">
                Sensor Risk Summary
              </div>


              <div className="sensor-readings">

                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    Selected node
                  </span>

                  <span className="sensor-reading-value font-mono">
                    {
                      selectedNode?.id
                    }
                  </span>

                </div>


                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    Risk score
                  </span>

                  <span
                    className="sensor-reading-value font-mono"
                    style={{
                      color:
                        alertActive
                          ? 'var(--status-high)'
                          : 'var(--status-normal)',
                    }}
                  >
                    {risk.score}
                  </span>

                </div>


                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    Tilt X
                  </span>

                  <span className="sensor-reading-value font-mono">

                    {telemetry?.tiltX !=
                    null
                      ? `${Number(
                          telemetry.tiltX
                        ).toFixed(2)}°`
                      : '--'}

                  </span>

                </div>


                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    Tilt Y
                  </span>

                  <span className="sensor-reading-value font-mono">

                    {telemetry?.tiltY !=
                    null
                      ? `${Number(
                          telemetry.tiltY
                        ).toFixed(2)}°`
                      : '--'}

                  </span>

                </div>


                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    Acceleration
                  </span>

                  <span className="sensor-reading-value font-mono">

                    {risk.acceleration
                      ? risk.acceleration.toFixed(
                          3
                        )
                      : '--'}

                  </span>

                </div>


                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    Status
                  </span>

                  <span
                    className="sensor-reading-value font-mono"
                    style={{
                      color:
                        alertActive
                          ? 'var(--status-high)'
                          : 'var(--status-normal)',
                    }}
                  >
                    {alertActive
                      ? alertLevel
                      : 'NORMAL'}
                  </span>

                </div>

              </div>

            </div>


            {/* =============================================
                WORKER SUMMARY
                ============================================= */}

            <div className="panel panel-sm">

              <div className="panel-title">
                Worker Summary
              </div>


              <div className="sensor-readings">

                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    Total workers
                  </span>

                  <span className="sensor-reading-value font-mono">
                    {
                      workers.length
                    }
                  </span>

                </div>


                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    Safe
                  </span>

                  <span
                    className="sensor-reading-value font-mono"
                    style={{
                      color:
                        'var(--status-normal)',
                    }}
                  >
                    {safeCount}
                  </span>

                </div>


                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    No response
                  </span>

                  <span
                    className="sensor-reading-value font-mono"
                    style={{
                      color:
                        'var(--text-muted)',
                    }}
                  >
                    {
                      noResponseCount
                    }
                  </span>

                </div>


                <div className="sensor-reading-row">

                  <span className="sensor-reading-label">
                    Needs help
                  </span>

                  <span
                    className="sensor-reading-value font-mono"
                    style={{
                      color:
                        'var(--status-high)',
                    }}
                  >
                    {
                      needsHelpCount
                    }
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
