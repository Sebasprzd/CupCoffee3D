import React, { useRef } from 'react';
import { Group } from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * CoffeeCup: Un modelo procedural simple de una taza con café y asa.
 * No usa assets externos para mantener el boceto liviano.
 */
type CoffeeCupProps = {
  spin?: boolean;
  variant?: 'detailed' | 'simple';
  debugColors?: boolean;
};

export const CoffeeCup: React.FC<CoffeeCupProps> = ({
  spin = false,
  variant = 'detailed',
  debugColors = false,
}) => {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (spin && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  if (variant === 'simple') {
    // Versión ligera: paredes dobles (externa + interna) y fondo. Sin café.
    return (
      <group ref={groupRef} position={[0, 0, 0]} dispose={null}>
        {/* Pared externa (sin tapa arriba) */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.85, 0.7, 1.2, 40, 1, true]} />
          <meshStandardMaterial
            color={debugColors ? '#ff004d' : '#f5f5f5'}
            roughness={0.62}
            metalness={0.04}
          />
        </mesh>
        {/* Pared interna (slightly smaller, invert normals usando side BackSide) */}
        <mesh position={[0, 0, 0]}>
          {/* Inner wall: height igual a la externa para que llegue al mismo plano superior (top = 0.6) */}
          <cylinderGeometry args={[0.72, 0.58, 1.2, 40, 1, true]} />
          <meshStandardMaterial
            color={debugColors ? '#0099ff' : '#ffffff'}
            roughness={0.7}
            side={2}
          />
        </mesh>
        {/* Relleno superior (anillo plano) para que no se vea hueco entre paredes */}
        <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {/* innerRadius = radio pared interna top, outerRadius = radio pared externa top */}
          <ringGeometry args={[0.72, 0.85, 64, 1]} />
          <meshStandardMaterial
            color={debugColors ? '#ffb800' : '#f5f5f5'}
            roughness={0.55}
            metalness={0.04}
            side={2}
          />
        </mesh>
        {/* Fondo (disco) */}
        <mesh position={[0, -0.6, 0]} receiveShadow>
          <cylinderGeometry args={[0.72, 0.72, 0.05, 40]} />
          <meshStandardMaterial color={debugColors ? '#7fff00' : '#ededed'} roughness={0.75} />
        </mesh>
        {/* Asa */}
        <mesh position={[0.95, -0.05, 0]} rotation={[0, Math.PI, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.38, 0.08, 16, 70, Math.PI * 1.05]} />
          <meshStandardMaterial
            color={debugColors ? '#9400ff' : '#f5f5f5'}
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]} dispose={null}>
      {/* Pared externa (más segmentos para suavidad) */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.7, 1.2, 60, 1, true]} />
        <meshStandardMaterial
          color={debugColors ? '#ff004d' : '#f5f5f5'}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
      {/* Pared interna (BackSide para invertir normales) */}
      <mesh>
        {/* Inner wall detallada: altura igual a la externa para alinear el plano superior (top = 0.6) */}
        <cylinderGeometry args={[0.73, 0.59, 1.2, 60, 1, true]} />
        <meshStandardMaterial
          color={debugColors ? '#0099ff' : '#f3f3f3'}
          roughness={0.68}
          side={2}
        />
      </mesh>
      {/* Relleno superior (anillo plano) para cerrar visualmente el grosor */}
      <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.73, 0.85, 72, 1]} />
        <meshStandardMaterial
          color={debugColors ? '#ffb800' : '#f9f9f9'}
          roughness={0.48}
          metalness={0.05}
          side={2}
        />
      </mesh>
      {/* Fondo (disco) */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[0.73, 0.73, 0.05, 60]} />
        <meshStandardMaterial color={debugColors ? '#7fff00' : '#ffffff'} roughness={0.75} />
      </mesh>
      {/* Asa */}
      <mesh position={[0.8, 0.0, 0]} rotation={[0, Math.PI, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.4, 0.085, 26, 95, Math.PI * 1.08]} />
        <meshStandardMaterial
          color={debugColors ? '#9400ff' : '#f5f5f5'}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
};
