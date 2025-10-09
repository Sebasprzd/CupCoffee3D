import * as React from 'react';
import { useMemo, useRef } from 'react';
import { Points, PointMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, MathUtils, Points as ThreePoints, AdditiveBlending } from 'three';

export interface CoffeeParticlesProps {
  count?: number; // número de partículas
  spread?: number; // radio del disco de emisión en XZ
  baseY?: number; // altura base (nacimiento)
  height?: number; // altura máxima antes de reciclar
  speedRange?: [number, number]; // rango de velocidad ascendente
  swirl?: number; // intensidad de oscilación lateral
  size?: number; // tamaño del punto (en unidades de pantalla)
  color?: string;
  opacity?: number;
  position?: [number, number, number]; // offset global del grupo
}

export function CoffeeParticles({
  count = 400,
  spread = 0.35,
  baseY = 0.0,
  height = 1.2,
  speedRange = [0.2, 0.55],
  swirl = 0.32,
  size = 16,
  color = '#ffffff',
  opacity = 0.85,
  position = [0, 5, 0],
}: CoffeeParticlesProps) {
  const ref = useRef<ThreePoints>(null!);
  const speeds = useRef<Float32Array>();
  const phases = useRef<Float32Array>();

  const posAttr = useMemo(() => {
    const positions = new Float32Array(count * 3);
    speeds.current = new Float32Array(count);
    phases.current = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // distribución uniforme en disco (usar sqrt para densidad homogénea)
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = baseY + Math.random() * 0.12;
      const idx = i * 3;
      positions[idx + 0] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      speeds.current![i] = MathUtils.lerp(speedRange[0], speedRange[1], Math.random());
      phases.current![i] = Math.random() * Math.PI * 2;
    }
    return new BufferAttribute(positions, 3);
  }, [count, spread, baseY, speedRange]);

  useFrame((state, dt) => {
    const points = ref.current;
    if (!points) return;
    const pos = points.geometry.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    const sp = speeds.current!;
    const ph = phases.current!;
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // subir en Y
      arr[idx + 1] += sp[i] * dt;
      // swirl sutil en XZ
      const s = Math.sin(t * 0.85 + ph[i]) * swirl;
      const c = Math.cos(t * 0.72 + ph[i]) * swirl;
      arr[idx + 0] += s * 0.035;
      arr[idx + 2] += c * 0.035;
      // reciclar al superar altura
      if (arr[idx + 1] > baseY + height) {
        arr[idx + 1] = baseY + Math.random() * 0.1;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * spread;
        arr[idx + 0] = Math.cos(a) * r;
        arr[idx + 2] = Math.sin(a) * r;
        sp[i] = MathUtils.lerp(speedRange[0], speedRange[1], Math.random());
        ph[i] = Math.random() * Math.PI * 2;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <group position={position as any}>
      <Points ref={ref} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posAttr.array, 3]} />
        </bufferGeometry>
        <PointMaterial
          transparent
          color={color}
          size={size}
          sizeAttenuation
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
          opacity={opacity}
        />
      </Points>
    </group>
  );
}
