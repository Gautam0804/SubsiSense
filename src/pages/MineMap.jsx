// src/pages/MineMap.jsx

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  Text,
} from '@react-three/drei';

import { StatusBadge } from '../components/StatusIndicator';
import RiskBar from '../components/RiskBar';
import '../styles/mineMap.css';

const REAL_API_URL =
  'https://mineguard-backend-x2km.onrender.com/api/telemetry';

/*
 * 4 physical-looking mine nodes.
 *
 * Only N01 is currently connected to ThingsBoard.
 * The connection information is kept internal.
 * It is NOT displayed in the UI.
 */
const NODES = [
  {
    id: 'N01',
    name: 'MINE NODE 01',
    zone: 'Heap Slope A',
    live: true,
    position: [-5.5, 4.0],
  },
  {
    id: 'N02',
    name: 'MINE NODE 02',
    zone: 'Heap Slope B',
    live: false,
    position: [1.8, -2.5],
  },
  {
    id: 'N03',
    name: 'MINE NODE 03',
    zone: 'North Dump',
    live: false,
    position: [6.5, 4.5],
  },
  {
    id: 'N04',
    name: 'MINE NODE 04',
    zone: 'South Ramp',
    live: false,
    position: [-6.5, -5.5],
  },
];

function getRisk(telemetry) {
  if (!telemetry) {
    return {
      level: 'offline',
      score: 0,
      label: 'OFFLINE',
      acceleration: null,
    };
  }

  const tiltX = Math.abs(
    Number(telemetry.tiltX) || 0
  );

  const tiltY = Math.abs(
    Number(telemetry.tiltY) || 0
  );

  const ax = Number(telemetry.accelX) || 0;
  const ay = Number(telemetry.accelY) || 0;
  const az = Number(telemetry.accelZ) || 0;

  const acceleration = Math.sqrt(
    ax * ax +
      ay * ay +
      az * az
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

function createNodeTelemetry(
  previous = null,
  nodeIndex = 1
) {
  const base = previous || {
    accelX:
      0.12 + nodeIndex * 0.03,

    accelY:
      -0.08 + nodeIndex * 0.02,

    accelZ:
      0.93 - nodeIndex * 0.01,

    tiltX:
      0.8 + nodeIndex * 0.15,

    tiltY:
      -0.6 + nodeIndex * 0.1,
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

function getTerrainHeight(
  x,
  z
) {
  let height =
    Math.sin(x * 0.35) *
      0.55 +
    Math.cos(z * 0.28) *
      0.45;

  const mainHeap =
    Math.sqrt(
      ((x + 2.0) / 8.0) **
        2 +
        ((z - 0.5) / 7.0) **
          2
    );

  if (mainHeap < 1) {
    height +=
      (1 - mainHeap) *
      5.6;
  }

  const secondaryHeap =
    Math.sqrt(
      ((x - 6.5) / 4.2) **
        2 +
        ((z + 4.0) / 4.5) **
          2
    );

  if (secondaryHeap < 1) {
    height +=
      (1 - secondaryHeap) *
      2.6;
  }

  const pit =
    Math.sqrt(
      ((x - 7.0) / 5.0) **
        2 +
        ((z - 6.0) / 4.5) **
          2
    );

  if (pit < 1) {
    height -=
      (1 - pit) *
      2.5;
  }

  return height;
}

function MineTerrain() {
  const geometry = useMemo(() => {
    const geo =
      new THREE.PlaneGeometry(
        30,
        30,
        90,
        90
      );

    const position =
      geo.attributes.position;

    for (
      let i = 0;
      i < position.count;
      i += 1
    ) {
      const x =
        position.getX(i);

      const y =
        position.getY(i);

      position.setZ(
        i,
        getTerrainHeight(
          x,
          y
        )
      );
    }

    geo.computeVertexNormals();

    return geo;
  }, []);

  return (
    <mesh
      rotation={[
        -Math.PI / 2,
        0,
        0,
      ]}
      geometry={geometry}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial
        color="#554a39"
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

function Road({
  position,
  rotation = 0,
  scale = 1,
}) {
  return (
    <mesh
      position={position}
      rotation={[
        0,
        rotation,
        0,
      ]}
      scale={[
        scale,
        1,
        1,
      ]}
      receiveShadow
    >
      <boxGeometry
        args={[
          13,
          0.12,
          1.5,
        ]}
      />

      <meshStandardMaterial
        color="#292929"
        roughness={1}
      />
    </mesh>
  );
}

function Truck({
  position,
  rotation = 0,
}) {
  return (
    <group
      position={position}
      rotation={[
        0,
        rotation,
        0,
      ]}
    >
      <mesh castShadow>
        <boxGeometry
          args={[
            1.8,
            0.65,
            1,
          ]}
        />

        <meshStandardMaterial
          color="#d28b28"
        />
      </mesh>

      <mesh
        position={[
          -0.45,
          0.55,
          0,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            0.65,
            0.55,
            0.82,
          ]}
        />

        <meshStandardMaterial
          color="#26333d"
          roughness={0.3}
        />
      </mesh>

      {[
        [
          -0.65,
          -0.38,
          0.55,
        ],
        [
          0.65,
          -0.38,
          0.55,
        ],
        [
          -0.65,
          -0.38,
          -0.55,
        ],
        [
          0.65,
          -0.38,
          -0.55,
        ],
      ].map(
        (p, index) => (
          <mesh
            key={index}
            position={p}
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
          >
            <cylinderGeometry
              args={[
                0.3,
                0.3,
                0.22,
                16,
              ]}
            />

            <meshStandardMaterial
              color="#111111"
            />
          </mesh>
        )
      )}
    </group>
  );
}

function SensorNode({
  node,
  risk,
  selected,
  onSelect,
}) {
  const colors = {
    normal: '#45c878',
    warning: '#e6b84c',
    high: '#ed8b3d',
    critical: '#e05252',
    offline: '#777777',
  };

  const color =
    colors[risk.level] ||
    colors.offline;

  const x =
    node.position[0];

  const z =
    node.position[1];

  const y =
    getTerrainHeight(
      x,
      z
    ) + 0.65;

  return (
    <group
      position={[
        x,
        y,
        z,
      ]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node);
      }}
    >
      {risk.level ===
        'critical' && (
        <mesh>
          <sphereGeometry
            args={[
              0.9,
              24,
              24,
            ]}
          />

          <meshBasicMaterial
            color="#e05252"
            transparent
            opacity={0.14}
          />
        </mesh>
      )}

      <mesh>
        <sphereGeometry
          args={[
            selected
              ? 0.46
              : 0.34,
            24,
            24,
          ]}
        />

        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={
            risk.level ===
            'critical'
              ? 3
              : selected
                ? 2
                : 1.2
          }
        />
      </mesh>

      <mesh
        position={[
          0,
          -0.4,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.055,
            0.055,
            0.8,
            8,
          ]}
        />

        <meshStandardMaterial
          color="#d5d5d5"
        />
      </mesh>

      <Text
        position={[
          0,
          1.05,
          0,
        ]}
        fontSize={0.38}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#000000"
      >
        {node.id}
      </Text>

      <Text
        position={[
          0,
          0.7,
          0,
        ]}
        fontSize={0.18}
        color="#45c878"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000000"
      >
        SENSOR
      </Text>

      {risk.level ===
        'critical' && (
        <pointLight
          color="#e05252"
          intensity={2}
          distance={4}
        />
      )}
    </group>
  );
}

function Scene({
  nodes,
  selectedNode,
  onSelect,
}) {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[
          18,
          16,
          20,
        ]}
        fov={45}
      />

      <color
        attach="background"
        args={[
          '#11161b',
        ]}
      />

      <ambientLight
        intensity={1.35}
      />

      <directionalLight
        position={[
          10,
          20,
          8,
        ]}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={
          2048
        }
        shadow-mapSize-height={
          2048
        }
      />

      <MineTerrain />

      <Road
        position={[
          0,
          0.25,
          -5,
        ]}
        rotation={0.08}
        scale={1.8}
      />

      <Road
        position={[
          1,
          0.35,
          2,
        ]}
        rotation={-0.65}
        scale={1.2}
      />

      <Road
        position={[
          -6,
          0.25,
          6,
        ]}
        rotation={0.2}
        scale={1.05}
      />

      <Road
        position={[
          5,
          0.3,
          6,
        ]}
        rotation={-0.45}
        scale={0.7}
      />

      <Truck
        position={[
          4,
          getTerrainHeight(
            4,
            -5
          ) + 0.65,
          -5,
        ]}
        rotation={0.2}
      />

      <Truck
        position={[
          -5,
          getTerrainHeight(
            -5,
            3
          ) + 0.65,
          3,
        ]}
        rotation={-0.4}
      />

      <Truck
        position={[
          6,
          getTerrainHeight(
            6,
            5
          ) + 0.65,
          5,
        ]}
        rotation={0.7}
      />

      {nodes.map(
        (item) => (
          <SensorNode
            key={
              item.node.id
            }
            node={
              item.node
            }
            risk={
              item.risk
            }
            selected={
              selectedNode?.id ===
              item.node.id
            }
            onSelect={
              onSelect
            }
          />
        )
      )}

      <gridHelper
        args={[
          30,
          30,
          '#3c454d',
          '#22282d',
        ]}
        position={[
          0,
          -0.08,
          0,
        ]}
      />

      <OrbitControls
        enablePan
        enableZoom
        minDistance={8}
        maxDistance={42}
        maxPolarAngle={
          Math.PI / 2.05
        }
      />
    </>
  );
}

export default function MineMap({
  onNavigate,
}) {
  const [
    nodeData,
    setNodeData,
  ] = useState(
    NODES.map(
      (
        node,
        index
      ) => ({
        node,

        telemetry:
          createNodeTelemetry(
            null,
            index
          ),

        risk:
          getRisk(
            createNodeTelemetry(
              null,
              index
            )
          ),
      })
    )
  );

  const [
    selectedNode,
    setSelectedNode,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    apiError,
    setApiError,
  ] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function updateNodes() {
      let realTelemetry =
        null;

      try {
        const response =
          await fetch(
            REAL_API_URL
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
          setApiError(null);
        }
      } catch (error) {
        console.error(
          'Mine map telemetry error:',
          error
        );

        if (mounted) {
          setApiError(
            'Real node connection unavailable'
          );
        }
      }

      if (!mounted) {
        return;
      }

      setNodeData(
        (current) =>
          current.map(
            (
              item,
              index
            ) => {

              /*
               * ONLY NODE 01 receives
               * ThingsBoard telemetry.
               */
              if (
                item.node.live
              ) {
                const telemetry =
                  realTelemetry ||
                  item.telemetry;

                return {
                  ...item,
                  telemetry,
                  risk:
                    getRisk(
                      telemetry
                    ),
                };
              }

              /*
               * Other nodes continue
               * behaving like normal
               * mine sensors in the UI.
               *
               * Their data will later be
               * replaced with real ThingsBoard
               * data when hardware is connected.
               */
              const telemetry =
                createNodeTelemetry(
                  item.telemetry,
                  index
                );

              return {
                ...item,
                telemetry,
                risk:
                  getRisk(
                    telemetry
                  ),
              };
            }
          )
      );

      setLoading(false);
    }

    updateNodes();

    const interval =
      setInterval(
        updateNodes,
        5000
      );

    return () => {
      mounted = false;
      clearInterval(
        interval
      );
    };
  }, []);

  const selected =
    nodeData.find(
      (item) =>
        item.node.id ===
        selectedNode?.id
    );

  return (
    <div className="page-content page-fade-in">

      <div className="page-header">
        <h1>
          Mine Heap
        </h1>

        <p>
          Live 3D mine terrain
          with four monitored
          sensor positions
        </p>
      </div>

      <div className="real-mine-layout">

        <div className="real-mine-view">

          <Canvas
            shadows
            dpr={[1, 2]}
          >
            <Scene
              nodes={nodeData}
              selectedNode={
                selectedNode
              }
              onSelect={
                setSelectedNode
              }
            />
          </Canvas>

          <div className="mine-hud">

            <div>
              <strong>
                ⛰ MINE HEAP
              </strong>

              <span>
                4-NODE SAFETY NETWORK
              </span>
            </div>

            <div className="mine-live-status">
              <span />

              {loading
                ? 'CONNECTING'
                : 'LIVE MONITORING'}
            </div>

          </div>

          <div className="mine-legend">

            <div>
              <span className="legend-dot normal" />
              Normal
            </div>

            <div>
              <span className="legend-dot warning" />
              Warning
            </div>

            <div>
              <span className="legend-dot high" />
              High
            </div>

            <div>
              <span className="legend-dot critical" />
              Critical
            </div>

          </div>

          {apiError && (
            <div className="mine-api-error">
              {apiError}
            </div>
          )}

        </div>

        <aside className="real-mine-side">

          <div className="panel">

            <div className="panel-title">
              Mine Nodes
            </div>

            <div className="mine-node-list">

              {nodeData.map(
                (item) => (
                  <button
                    key={
                      item.node.id
                    }
                    className={`mine-node-card ${
                      selectedNode?.id ===
                      item.node.id
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      setSelectedNode(
                        item.node
                      )
                    }
                  >

                    <div>

                      <strong>
                        {
                          item
                            .node
                            .name
                        }
                      </strong>

                      <span>
                        {
                          item
                            .node
                            .zone
                        }
                      </span>

                    </div>

                    <span
                      className={`node-status-dot ${item.risk.level}`}
                    />

                  </button>
                )
              )}

            </div>
          </div>

          {selected ? (
            <div className="panel">

              <div className="panel-title">
                Node Details
              </div>

              <div className="mine-node-name">
                {
                  selected
                    .node
                    .name
                }
              </div>

              <div
                className="text-xs text-muted"
                style={{
                  marginTop: 3,
                  marginBottom: 9,
                }}
              >
                {
                  selected
                    .node
                    .zone
                }
              </div>

              <StatusBadge
                status={
                  selected.risk
                    .level ===
                  'critical'
                    ? 'high'
                    : selected
                        .risk
                        .level
                }
                label={
                  selected
                    .risk
                    .label
                }
              />

              <div className="divider" />

              <div className="sensor-readings">

                <div className="sensor-reading-row">
                  <span>
                    Risk
                  </span>

                  <strong>
                    {
                      selected
                        .risk
                        .score
                    }
                    {' / 100'}
                  </strong>
                </div>

                <div className="sensor-reading-row">
                  <span>
                    Tilt X
                  </span>

                  <strong>
                    {selected
                      .telemetry
                      ?.tiltX !=
                    null
                      ? `${Number(
                          selected
                            .telemetry
                            .tiltX
                        ).toFixed(
                          2
                        )}°`
                      : '--'}
                  </strong>
                </div>

                <div className="sensor-reading-row">
                  <span>
                    Tilt Y
                  </span>

                  <strong>
                    {selected
                      .telemetry
                      ?.tiltY !=
                    null
                      ? `${Number(
                          selected
                            .telemetry
                            .tiltY
                        ).toFixed(
                          2
                        )}°`
                      : '--'}
                  </strong>
                </div>

                <div className="sensor-reading-row">
                  <span>
                    Accel X
                  </span>

                  <strong>
                    {selected
                      .telemetry
                      ?.accelX !=
                    null
                      ? Number(
                          selected
                            .telemetry
                            .accelX
                        ).toFixed(
                          3
                        )
                      : '--'}
                  </strong>
                </div>

                <div className="sensor-reading-row">
                  <span>
                    Accel Y
                  </span>

                  <strong>
                    {selected
                      .telemetry
                      ?.accelY !=
                    null
                      ? Number(
                          selected
                            .telemetry
                            .accelY
                        ).toFixed(
                          3
                        )
                      : '--'}
                  </strong>
                </div>

                <div className="sensor-reading-row">
                  <span>
                    Accel Z
                  </span>

                  <strong>
                    {selected
                      .telemetry
                      ?.accelZ !=
                    null
                      ? Number(
                          selected
                            .telemetry
                            .accelZ
                        ).toFixed(
                          3
                        )
                      : '--'}
                  </strong>
                </div>

              </div>

              <div
                style={{
                  marginTop: 16,
                }}
              >
                <RiskBar
                  score={
                    selected
                      .risk
                      .score
                  }
                />
              </div>

              <div className="divider" />

              <button
                className="btn btn-secondary btn-sm w-full"
                style={{
                  justifyContent:
                    'center',
                }}
                onClick={() =>
                  onNavigate(
                    'live-monitoring'
                  )
                }
              >
                Open Live Monitoring
              </button>

            </div>
          ) : (
            <div className="panel">

              <div className="panel-title">
                Network Status
              </div>

              <p
                className="text-small text-muted"
                style={{
                  lineHeight: 1.7,
                }}
              >
                Four sensor positions
                are shown across the
                mine heap and monitored
                continuously for changes
                in ground movement,
                tilt and acceleration.
              </p>

              <div className="divider" />

              {nodeData.map(
                (item) => (
                  <div
                    className="mine-stat"
                    key={
                      item.node.id
                    }
                  >
                    <span>
                      {
                        item.node.id
                      }
                    </span>

                    <strong>
                      ONLINE
                    </strong>
                  </div>
                )
              )}

            </div>
          )}

        </aside>
      </div>
    </div>
  );
}
