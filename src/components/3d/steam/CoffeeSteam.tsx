import * as React from 'react';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { SteamMaterial } from './SteamMaterial';

/**
 * CoffeeSteam
 * - Vapor tipo “wispy” usando varias columnas billboard con un shader de ruido suave.
 * - Cada columna siempre mira a la cámara y se desplaza/oscila para romper simetrías.
 *
 * Props:
 * - position: ancla del grupo (recom. sobre la superficie del café, p.ej. baseY+0.1)
 * - radius/height: tamaño del billboard (ancho x alto)
 * - columns: número de columnas superpuestas
 * - spread: separación radial entre columnas
 * - speed: factor de animación del ruido/scroll
 * - wobble: oscilación lateral sutil
 * - color/opacity: aspecto general del vapor
 */
type CoffeeSteamProps = {
  position?: [number, number, number];
  radius?: number; // ancho del billboard
  height?: number; // alto del billboard
  columns?: number; // cantidad de columnas superpuestas
  spread?: number; // separación entre columnas
  speed?: number; // velocidad de desplazamiento vertical de la textura
  wobble?: number; // oscilación horizontal
  color?: string;
  opacity?: number;
};

export function CoffeeSteam({
  position = [0, 0, 0],
  radius = 0.6,
  height = 1.2,
  columns = 3,
  spread = 0.18,
  speed = 0.35,
  wobble = 0.05,
  color = '#ffffff',
  opacity = 0.85,
}: CoffeeSteamProps) {
  const group = useRef<Group>(null);
  const meshes = useRef<Mesh[]>([]);
  const { camera } = useThree();

  const offsets = useMemo(() => {
    const arr: [number, number][] = [];
    for (let i = 0; i < columns; i++) {
      const a = (i / columns) * Math.PI * 2;
      arr.push([Math.cos(a) * spread, Math.sin(a) * spread]);
    }
    return arr;
  }, [columns, spread]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // billboard: que cada columna mire a la cámara
    for (let i = 0; i < meshes.current.length; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      m.lookAt(camera.position);
      m.position.x = offsets[i][0] + Math.sin(t * 1.2 + i) * wobble;
      m.position.z = offsets[i][1] + Math.cos(t * 1.1 + i) * wobble;
      // desplazamiento vertical suave (subir un poco el billboard para dar vida)
      m.position.y = Math.sin(t * 0.7 + i) * 0.03;
      // inyectar tiempo al material
      const mat: any = m.material;
      if (mat && mat.uniforms && mat.uniforms.uTime) {
        mat.uniforms.uTime.value = t * speed * (1.0 + i * 0.07);
      }
    }
    // mantener el grupo en posición
    if (group.current) {
      group.current.position.set(position[0], position[1], position[2]);
    }
  });

  return (
    <group ref={group}>
      {offsets.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshes.current[i] = el;
          }}
          position={[offsets[i][0], 0, offsets[i][1]]}
        >
          <planeGeometry args={[radius, height]} />
          <SteamMaterial opacity={opacity} color={color} noiseStrength={0.8} />
        </mesh>
      ))}
    </group>
  );
}
