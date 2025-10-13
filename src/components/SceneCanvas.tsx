/**
 * SceneCanvas
 * - Orquesta: Canvas, luces, OrbitControls, piso, UI de toggles.
 * - Importa: CoffeeCup (taza+líquido), CoffeeSteam (vapor realista), Sparkles (fallback), CoffeeParticles (modo alternativo/depuración).
 * - Estado clave:
 *   - level/baseY compartidos: derivan y del líquido (para alinear vapor y marker)
 *   - cupPos: posición reportada por CoffeeCup (para posicionar vapor/marker)
 *   - showCup / showParticles / useSparkles / showMarker / showRefs: toggles de UI
 * - Cómo cambiar el nivel de café: ajustar const level (0..1).
 */
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sparkles } from '@react-three/drei';
import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { CoffeeCup, CoffeeParticles, CoffeeSteam } from './3d/coffecup';
import { Desk } from './3d/table';
import { Lamp } from './3d/lamp';

export const SceneCanvas: React.FC = () => {
  const [debugColors, setDebugColors] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cupPos, setCupPos] = useState<[number, number, number]>([0, 0, 0]);
  const [deskPos, setDeskPos] = useState<[number, number, number]>([-1.5, -0.7, 0]);
  const [showCup, setShowCup] = useState(true); // mostramos taza para alinear plano (puedes ocultarla luego)
  const [showParticles, setShowParticles] = useState(true); // cup
  const [useSparkles, setUseSparkles] = useState(true); // cup mode
  const [showMarkerCup, setShowMarkerCup] = useState(true);
  const [showRefsCup, setShowRefsCup] = useState(true);
  const [showDesk, setShowDesk] = useState(true);
  const [showRefsDesk, setShowRefsDesk] = useState(true);
  const [showMarkerDesk, setShowMarkerDesk] = useState(true);
  const [showLamp, setShowLamp] = useState(true);
  const [showRefsLamp, setShowRefsLamp] = useState(true);
  const [showMarkerLamp, setShowMarkerLamp] = useState(true);
  const [lampLightOn, setLampLightOn] = useState(true);
  const [lampSpin, setLampSpin] = useState(false);
  const [lampPos, setLampPos] = useState<[number, number, number]>([0, 0, 0]);
  const toggle = useCallback(() => setDebugColors((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd') toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <>
      <Canvas camera={{ position: [2.2, 1.8, 2.2], fov: 50 }} shadows>
        <color attach="background" args={[0.05, 0.05, 0.07]} />
        <hemisphereLight args={[0xffffff, 0x222233, 0.4]} />
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Suspense fallback={null}>
          {(() => {
            const level = 0.7; // ajusta aquí el nivel que quieres (0..1)
            const cupScale = 0.5; // reducir taza a la mitad
            // Cálculos no escalados (geometría base de la taza)
            const baseY0 = -0.6 + 1.2 * level + 0.02;
            const rimY0 = 0.6;
            const innerTop0 = 0.73;
            const innerBottom0 = 0.59;
            const tLevel = Math.min(Math.max((baseY0 - -0.6) / 1.2, 0), 1);
            const radiusAtBase0 = innerBottom0 + (innerTop0 - innerBottom0) * tLevel;
            // Versiones escaladas para overlays/efectos
            const baseY = baseY0 * cupScale;
            const rimY = rimY0 * cupScale;
            const innerTop = innerTop0 * cupScale;
            const innerBottom = innerBottom0 * cupScale;
            const radiusAtBase = radiusAtBase0 * cupScale;
            return (
              <>
                {/* Escritorio de madera (draggable y con debug) */}
                {showDesk && (
                  <Desk
                    debugColors={debugColors}
                    showRefs={showRefsDesk}
                    showMarker={showMarkerDesk}
                    draggable
                    onDragChange={setDragging}
                    onPositionChange={setDeskPos}
                    visible={showDesk}
                    // tamaño de tablero, altura y ajustes
                    size={[3, 0.08, 1.8]}
                    height={0.78}
                    legThickness={0.09}
                    legInset={0.12}
                    woodColor="#8b5a2b"
                    metalColor="#3b3b3b"
                    position={deskPos}
                  />
                )}
                {
                  <CoffeeCup
                    debugColors={debugColors}
                    draggable
                    coffee
                    coffeeLevel={level}
                    onDragChange={setDragging}
                    onPositionChange={setCupPos}
                    visible={showCup}
                    // POSICIÓN INICIAL DE LA TAZA
                    // - Altura del tablero: 0.78
                    // - Mitad de altura de la taza: 0.6 * cupScale
                    // - Offset pequeño para evitar z-fighting: 0.03 * cupScale
                    // Edita estos valores si cambias la escala o la mesa
                    initialPosition={[
                      deskPos[0],
                      deskPos[1] + 0.78 + 0.6 * cupScale + 0.03 * cupScale,
                      deskPos[2],
                    ]}
                    // física simple: reposo sobre mesa y caída si está fuera
                    physics
                    floorY={-0.7}
                    // PARÁMETROS DE MESA (ajusta si cambias tamaño o posición)
                    deskCenter={[deskPos[0], deskPos[2]]} // [x,z] centro del tablero
                    deskTopY={deskPos[1] + 0.78} // y del tope del tablero
                    deskSize={[3, 1.8]} // [anchoX, profundidadZ] del tablero
                    // arrastre sobre la superficie de la mesa
                    dragPlaneY={deskPos[1] + 0.78}
                    // origen de la mesa para que la taza la siga si la mueves
                    deskOrigin={deskPos}
                    edgeMargin={0.2}
                    scale={cupScale}
                  />
                }
                {showCup && showRefsCup && (
                  <group>
                    {/* Aros de referencia: radio interior en base y borde */}
                    <mesh
                      rotation={[Math.PI / 2, 0, 0]}
                      position={[cupPos[0], cupPos[1] + baseY, cupPos[2]]}
                    >
                      <ringGeometry
                        args={[
                          radiusAtBase - 0.002 * cupScale,
                          radiusAtBase + 0.002 * cupScale,
                          64,
                          1,
                        ]}
                      />
                      <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
                    </mesh>
                    <mesh
                      rotation={[Math.PI / 2, 0, 0]}
                      position={[cupPos[0], cupPos[1] + rimY, cupPos[2]]}
                    >
                      <ringGeometry
                        args={[innerTop - 0.002 * cupScale, innerTop + 0.002 * cupScale, 64, 1]}
                      />
                      <meshBasicMaterial color="#ff00ff" transparent opacity={0.9} />
                    </mesh>
                    {/* Marcadores cardinales en el borde superior */}
                    <mesh position={[cupPos[0] + innerTop, cupPos[1] + rimY, cupPos[2]]}>
                      <sphereGeometry args={[0.02 * cupScale, 10, 10]} />
                      <meshBasicMaterial color="#ff3333" />
                    </mesh>
                    <mesh position={[cupPos[0] - innerTop, cupPos[1] + rimY, cupPos[2]]}>
                      <sphereGeometry args={[0.02 * cupScale, 10, 10]} />
                      <meshBasicMaterial color="#3399ff" />
                    </mesh>
                    <mesh position={[cupPos[0], cupPos[1] + rimY, cupPos[2] + innerTop]}>
                      <sphereGeometry args={[0.02 * cupScale, 10, 10]} />
                      <meshBasicMaterial color="#33ff66" />
                    </mesh>
                    <mesh position={[cupPos[0], cupPos[1] + rimY, cupPos[2] - innerTop]}>
                      <sphereGeometry args={[0.02 * cupScale, 10, 10]} />
                      <meshBasicMaterial color="#ffcc33" />
                    </mesh>
                  </group>
                )}
                {showCup &&
                  showParticles &&
                  (useSparkles ? (
                    <Sparkles
                      position={[cupPos[0], cupPos[1] + baseY, cupPos[2]]}
                      count={Math.max(30, Math.round(200 * cupScale))}
                      size={8 * cupScale}
                      // scale controla el volumen de dispersión en XYZ (escalado con la taza)
                      scale={[0.9 * cupScale, 1.3 * cupScale, 0.9 * cupScale]}
                      speed={0.6}
                      color="white"
                      opacity={1}
                    />
                  ) : (
                    <CoffeeSteam
                      position={[cupPos[0], cupPos[1] + baseY + 0.1 * cupScale, cupPos[2]]}
                      radius={0.9 * cupScale}
                      height={1.3 * cupScale}
                      columns={4}
                      spread={0.22 * cupScale}
                      speed={0.55}
                      wobble={0.06 * cupScale}
                      color="#ffffff"
                      opacity={0.7}
                    />
                  ))}
                {showCup && showMarkerCup && (
                  <mesh position={[cupPos[0], cupPos[1] + baseY, cupPos[2]]}>
                    <sphereGeometry args={[0.04 * cupScale, 16, 16]} />
                    <meshBasicMaterial color="#ff00ff" />
                  </mesh>
                )}

                {/* Lámpara de escritorio */}
                {showDesk && showLamp && (
                  <Lamp
                    debugColors={debugColors}
                    showRefs={showRefsLamp}
                    showMarker={showMarkerLamp}
                    draggable
                    onDragChange={setDragging}
                    onPositionChange={setLampPos}
                    visible={showLamp}
                    // Colocar sobre la mesa con un offset lateral/trasero
                    position={[deskPos[0] - 1.0, deskPos[1] + 0.78, deskPos[2] + 0.4]}
                    lightOn={lampLightOn}
                    lightColor="#fff5d1"
                    lightIntensity={1.6}
                    spin={lampSpin}
                  />
                )}
              </>
            );
          })()}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]} receiveShadow>
            <planeGeometry args={[6, 6]} />
            <meshStandardMaterial color="#fffd6e" roughness={0.9} />
          </mesh>
        </Suspense>
        <OrbitControls
          enableDamping
          enabled={!dragging}
          minDistance={1.5}
          maxDistance={4}
          target={[0, 0.3, 0]}
        />
      </Canvas>
      {((showCup && showRefsCup) || (showDesk && showRefsDesk) || (showLamp && showRefsLamp)) && (
        <div
          style={{
            position: 'absolute',
            bottom: '0.75rem',
            left: '0.75rem',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: '12px',
            padding: '8px 10px',
            borderRadius: '6px',
            border: '1px solid #333',
          }}
        >
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Referencia de ejes:</div>
          <div>• Rojo (X+)</div>
          <div>• Azul (X-)</div>
          <div>• Verde (Z+)</div>
          <div>• Amarillo (Z-)</div>
        </div>
      )}
      {/* Left-side control panel */}
      <div
        style={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
          width: 260,
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          fontSize: '12px',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Objetos</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowCup((v) => !v)}
            style={{
              background: showCup ? '#444' : '#2b7fff',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #444',
              cursor: 'pointer',
            }}
          >
            {showCup ? 'Ocultar taza' : 'Mostrar taza'}
          </button>
          <button
            onClick={() => setShowDesk((v) => !v)}
            style={{
              background: showDesk ? '#444' : '#a36f3d',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #444',
              cursor: 'pointer',
            }}
          >
            {showDesk ? 'Ocultar mesa' : 'Mostrar mesa'}
          </button>
          <button
            onClick={() => setShowLamp((v) => !v)}
            style={{
              background: showLamp ? '#444' : '#ffd166',
              color: '#111',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #444',
              cursor: 'pointer',
            }}
          >
            {showLamp ? 'Ocultar lámpara' : 'Mostrar lámpara'}
          </button>
        </div>

        {/* Cup controls */}
        {showCup && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #333' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Taza</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                onClick={() => setShowRefsCup((v) => !v)}
                style={{
                  background: showRefsCup ? '#444' : '#0088cc',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  cursor: 'pointer',
                }}
              >
                {showRefsCup ? 'Ocultar refs' : 'Mostrar refs'}
              </button>
              <button
                onClick={() => setShowMarkerCup((v) => !v)}
                style={{
                  background: showMarkerCup ? '#444' : '#cc00ff',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  cursor: 'pointer',
                }}
              >
                {showMarkerCup ? 'Ocultar marker' : 'Mostrar marker'}
              </button>
              <button
                onClick={() => setShowParticles((v) => !v)}
                style={{
                  background: showParticles ? '#444' : '#00aa77',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  cursor: 'pointer',
                }}
              >
                {showParticles ? 'Ocultar partículas' : 'Mostrar partículas'}
              </button>
              {showParticles && (
                <button
                  onClick={() => setUseSparkles((v) => !v)}
                  style={{
                    background: useSparkles ? '#444' : '#ff8800',
                    color: '#fff',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #444',
                    cursor: 'pointer',
                  }}
                >
                  {useSparkles ? 'Usar Points' : 'Usar Sparkles'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Desk controls */}
        {showDesk && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #333' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Mesa</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                onClick={() => setShowRefsDesk((v) => !v)}
                style={{
                  background: showRefsDesk ? '#444' : '#0088cc',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  cursor: 'pointer',
                }}
              >
                {showRefsDesk ? 'Ocultar refs' : 'Mostrar refs'}
              </button>
              <button
                onClick={() => setShowMarkerDesk((v) => !v)}
                style={{
                  background: showMarkerDesk ? '#444' : '#cc00ff',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  cursor: 'pointer',
                }}
              >
                {showMarkerDesk ? 'Ocultar marker' : 'Mostrar marker'}
              </button>
            </div>
          </div>
        )}

        {/* Lamp controls */}
        {showLamp && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #333' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Lámpara</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                onClick={() => setShowRefsLamp((v) => !v)}
                style={{
                  background: showRefsLamp ? '#444' : '#0088cc',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  cursor: 'pointer',
                }}
              >
                {showRefsLamp ? 'Ocultar refs' : 'Mostrar refs'}
              </button>
              <button
                onClick={() => setShowMarkerLamp((v) => !v)}
                style={{
                  background: showMarkerLamp ? '#444' : '#cc00ff',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  cursor: 'pointer',
                }}
              >
                {showMarkerLamp ? 'Ocultar marker' : 'Mostrar marker'}
              </button>
              <button
                onClick={() => setLampLightOn((v) => !v)}
                style={{
                  background: lampLightOn ? '#ffd166' : '#444',
                  color: lampLightOn ? '#111' : '#fff',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  cursor: 'pointer',
                }}
              >
                {lampLightOn ? 'Apagar luz' : 'Encender luz'}
              </button>
              <button
                onClick={() => setLampSpin((v) => !v)}
                style={{
                  background: lampSpin ? '#444' : '#9b5de5',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  cursor: 'pointer',
                }}
              >
                {lampSpin ? 'Parar spin' : 'Spin'}
              </button>
            </div>
          </div>
        )}

        {/* Global controls */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #333' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Global</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={toggle}
              style={{
                background: debugColors ? '#ff004d' : '#8ba543ff',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #444',
                cursor: 'pointer',
              }}
            >
              Debug {debugColors ? 'ON' : 'OFF'} (D)
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
