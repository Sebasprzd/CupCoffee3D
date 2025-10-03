import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { CoffeeCup } from './3d/CoffeeCup';

export const SceneCanvas: React.FC = () => {
  const [debugColors, setDebugColors] = useState(false);
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
          <CoffeeCup debugColors={debugColors} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]} receiveShadow>
            <planeGeometry args={[6, 6]} />
            <meshStandardMaterial color="#fffd6eff" roughness={0.9} />
          </mesh>
        </Suspense>
        <OrbitControls enableDamping minDistance={1.5} maxDistance={4} target={[0, 0.3, 0]} />
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
    </>
  );
};
