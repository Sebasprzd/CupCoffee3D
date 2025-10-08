import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Group, BufferGeometry, Raycaster, Vector2, Plane, Vector3 } from 'three';
import { CoffeeLiquidMaterial } from './materials/CoffeeLiquidMaterial';
import { useThree } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

/**
 * CoffeeCup: Un modelo procedural simple de una taza con café y asa.
 * No usa assets externos para mantener el boceto liviano.
 */
type CoffeeCupProps = {
  spin?: boolean;
  variant?: 'detailed' | 'simple';
  debugColors?: boolean;
  coffee?: boolean; // mostrar líquido
  coffeeLevel?: number; // 0..1 altura relativa (0 fondo, 1 borde)
  draggable?: boolean; // permitir arrastrar en el plano XZ
  onDragChange?: (dragging: boolean) => void;
  coffeeShader?: boolean; // usar shader personalizado
};

export const CoffeeCup: React.FC<CoffeeCupProps> = ({
  spin = false,
  variant = 'detailed',
  debugColors = false,
  coffee = true,
  coffeeLevel = 0.55,
  draggable = false,
  onDragChange,
  coffeeShader = true,
}) => {
  const groupRef = useRef<Group>(null);
  const coffeeGeomRef = useRef<BufferGeometry | null>(null);
  const originalPositions = useRef<Float32Array | null>(null);
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<Vector3 | null>(null);
  const raycaster = useRef(new Raycaster());
  const plane = useRef(new Plane(new Vector3(0, 1, 0), 0)); // plano y=0
  const mouse = useRef(new Vector2());
  useCursor(hovered || dragging, 'grab');

  const computePlanePoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);
      const hit = new Vector3();
      if (raycaster.current.ray.intersectPlane(plane.current, hit)) {
        return hit;
      }
      return null;
    },
    [camera, gl.domElement]
  );

  const onPointerDown = useCallback(
    (e: any) => {
      if (!draggable || !groupRef.current) return;
      e.stopPropagation();
      setDragging(true);
      onDragChange?.(true);
      const p = computePlanePoint(e.clientX, e.clientY);
      if (p) {
        dragOffset.current = groupRef.current.position.clone().sub(p);
      }
    },
    [draggable, computePlanePoint, onDragChange]
  );

  useEffect(() => {
    if (!draggable) return;
    const handleMove = (e: PointerEvent) => {
      if (!dragging || !groupRef.current) return;
      const p = computePlanePoint(e.clientX, e.clientY);
      if (p && dragOffset.current) {
        p.add(dragOffset.current);
        // Limitar dentro de un radio (opcional)
        const radiusLimit = 2.5;
        const len = Math.sqrt(p.x * p.x + p.z * p.z);
        if (len > radiusLimit) {
          p.multiplyScalar(radiusLimit / len);
        }
        groupRef.current.position.set(p.x, groupRef.current.position.y, p.z);
      }
    };
    const handleUp = () => {
      if (dragging) {
        setDragging(false);
        onDragChange?.(false);
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, draggable, computePlanePoint]);

  useFrame((_, delta) => {
    if (spin && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
    if (coffee && coffeeGeomRef.current) {
      const geom: any = coffeeGeomRef.current;
      const posAttr = geom.attributes.position;
      if (!originalPositions.current) {
        originalPositions.current = posAttr.array.slice();
      }
      const base = originalPositions.current;
      if (base) {
        const arr = posAttr.array as Float32Array;
        const time = performance.now() * 0.0015;
        for (let i = 0; i < arr.length; i += 3) {
          const yOrig = base[i + 1];
          if (yOrig > 0) {
            const x = arr[i];
            const z = arr[i + 2];
            const r = Math.sqrt(x * x + z * z);
            const wave =
              Math.sin(r * 10 - time * 2.2) * 0.003 + Math.sin((x + z + time) * 3) * 0.002;
            arr[i + 1] = yOrig + wave;
          }
        }
        posAttr.needsUpdate = true;
        geom.computeVertexNormals();
      }
    }
  });

  if (variant === 'simple') {
    // Versión ligera hueca. Añadimos líquido si coffee = true.
    return (
      <group
        ref={groupRef}
        position={[0, 0, 0]}
        dispose={null}
        onPointerOver={(e) => {
          if (draggable) {
            e.stopPropagation();
            setHovered(true);
          }
        }}
        onPointerOut={(e) => {
          if (draggable) {
            e.stopPropagation();
            setHovered(false);
          }
        }}
        onPointerDown={onPointerDown}
      >
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
        {/* Superficie del café (simple) */}
        {coffee && (
          <mesh position={[0, -0.6 + 1.2 * coffeeLevel - 0.01, 0]}>
            <cylinderGeometry ref={coffeeGeomRef as any} args={[0.7, 0.7, 0.02, 48, 1, false]} />
            {coffeeShader ? (
              <CoffeeLiquidMaterial />
            ) : (
              <meshStandardMaterial
                color={debugColors ? '#6f3d00' : '#3d2412'}
                roughness={0.35}
                metalness={0.08}
                envMapIntensity={0.5}
              />
            )}
          </mesh>
        )}
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
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      dispose={null}
      onPointerOver={(e) => {
        if (draggable) {
          e.stopPropagation();
          setHovered(true);
        }
      }}
      onPointerOut={(e) => {
        if (draggable) {
          e.stopPropagation();
          setHovered(false);
        }
      }}
      onPointerDown={onPointerDown}
    >
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
      {/* Superficie del café (detallada) */}
      {coffee && (
        <mesh position={[0, -0.6 + 1.2 * coffeeLevel - 0.011, 0]}>
          <cylinderGeometry ref={coffeeGeomRef as any} args={[0.71, 0.71, 0.022, 72, 1, false]} />
          {coffeeShader ? (
            <CoffeeLiquidMaterial />
          ) : (
            <meshStandardMaterial
              color={debugColors ? '#6f3d00' : '#3c2414'}
              roughness={0.32}
              metalness={0.12}
              emissive={debugColors ? '#1a0800' : '#120904'}
              emissiveIntensity={0.12}
              envMapIntensity={0.6}
            />
          )}
        </mesh>
      )}
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
