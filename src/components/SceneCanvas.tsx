import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sparkles } from '@react-three/drei';
import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { CoffeeCup } from './3d/coffecup/CoffeeCup';
import { CoffeeParticles } from './3d/coffeeParticles/CoffeeParticles';

export const SceneCanvas: React.FC = () => {
  const [debugColors, setDebugColors] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cupPos, setCupPos] = useState<[number, number, number]>([0, 0, 0]);
  const [showCup, setShowCup] = useState(true); // mostramos taza para alinear plano (puedes ocultarla luego)
  const [showParticles, setShowParticles] = useState(true);
  const [useSparkles, setUseSparkles] = useState(true);
  const [showMarker, setShowMarker] = useState(true);
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
          {/** Nivel de café compartido para alinear partículas y taza */}
          {(() => {
            const level = 0.7; // ajusta aquí el nivel que quieres (0..1)
            const baseY = -0.6 + 1.2 * level + 0.02;
            return (
              <>
                {
                  <CoffeeCup
                    debugColors={debugColors}
                    draggable
                    coffee
                    coffeeLevel={level}
                    onDragChange={setDragging}
                    onPositionChange={setCupPos}
                    visible={showCup}
                  />
                }
                {showParticles &&
                  (useSparkles ? (
                    <Sparkles
                      position={[cupPos[0], baseY, cupPos[2]]}
                      count={200}
                      size={8}
                      // scale controla el volumen de dispersión en XYZ
                      scale={[0.9, 1.3, 0.9]}
                      speed={0.6}
                      color="white"
                      opacity={1}
                    />
                  ) : (
                    <CoffeeParticles
                      position={[cupPos[0], cupPos[1], cupPos[2]]}
                      count={520}
                      spread={0.38}
                      baseY={baseY}
                      height={1.35}
                      speedRange={[0.28, 0.65]}
                      swirl={0.36}
                      size={18}
                      opacity={0.95}
                      color="#ffffff"
                    />
                  ))}
                {showMarker && (
                  <mesh position={[cupPos[0], baseY, cupPos[2]]}>
                    <sphereGeometry args={[0.04, 16, 16]} />
                    <meshBasicMaterial color="#ff00ff" />
                  </mesh>
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
      <button
        onClick={toggle}
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: debugColors ? '#ff004d' : '#8ba543ff',
          color: '#fff',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #444',
          cursor: 'pointer',
          opacity: 0.85,
        }}
      >
        Debug {debugColors ? 'ON' : 'OFF'} (D)
      </button>
      <button
        onClick={() => setShowCup((v) => !v)}
        style={{
          position: 'absolute',
          top: '2.5rem',
          right: '0.75rem',
          background: showCup ? '#444' : '#2b7fff',
          color: '#fff',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #444',
          cursor: 'pointer',
          opacity: 0.9,
        }}
      >
        {showCup ? 'Ocultar taza' : 'Mostrar taza'}
      </button>
      <button
        onClick={() => setShowParticles((v) => !v)}
        style={{
          position: 'absolute',
          top: '4.25rem',
          right: '0.75rem',
          background: showParticles ? '#444' : '#00aa77',
          color: '#fff',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #444',
          cursor: 'pointer',
          opacity: 0.9,
        }}
      >
        {showParticles ? 'Ocultar partículas' : 'Mostrar partículas'}
      </button>
      <button
        onClick={() => setUseSparkles((v) => !v)}
        style={{
          position: 'absolute',
          top: '6rem',
          right: '0.75rem',
          background: useSparkles ? '#444' : '#ff8800',
          color: '#fff',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #444',
          cursor: 'pointer',
          opacity: 0.9,
        }}
      >
        {useSparkles ? 'Usar Points' : 'Usar Sparkles'}
      </button>
      <button
        onClick={() => setShowMarker((v) => !v)}
        style={{
          position: 'absolute',
          top: '7.75rem',
          right: '0.75rem',
          background: showMarker ? '#444' : '#cc00ff',
          color: '#fff',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #444',
          cursor: 'pointer',
          opacity: 0.9,
        }}
      >
        {showMarker ? 'Ocultar marker' : 'Mostrar marker'}
      </button>
      <button
        onClick={() => setShowParticles((v) => !v)}
        style={{
          position: 'absolute',
          top: '4.25rem',
          right: '0.75rem',
          background: showParticles ? '#444' : '#00aa77',
          color: '#fff',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #444',
          cursor: 'pointer',
          opacity: 0.9,
        }}
      >
        {showParticles ? 'Ocultar partículas' : 'Mostrar partículas'}
      </button>
    </>
  );
};
