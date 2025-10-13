/**
 * CoffeeCup
 * - Taza procedural compuesta por: paredes exterior/interior (cilindros openEnded), aro superior (ring), base sólida y asa (torus).
 * - Incluye una “tapa” de líquido (cilindro muy delgado) que se posiciona según coffeeLevel y puede usar un shader personalizado.
 * - Soporta arrastre en el plano XZ; al arrastrar desactiva OrbitControls vía onDragChange.
 * - Reporta su posición de grupo vía onPositionChange para alinear elementos externos (vapor, marcadores, etc.).
 *
 * Geometría clave (variant='detailed'):
 * - Pared exterior: radio top=0.85, bottom=0.7, altura=1.2 (openEnded=true)
 * - Pared interior: radio top=0.73, bottom=0.59, altura=1.2 (openEnded=true)
 * - Aro superior: ring [0.73, 0.85] para cubrir el borde
 * - Base: disco interior (cilindro muy bajo) radio 0.73
 * - Asa: torus en el lado X+ (lado rojo en las refs)
 * - Líquido: disco radio ≈ 0.71 posicionado a y = -0.6 + 1.2*coffeeLevel - epsilon
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Group, BufferGeometry, Raycaster, Vector2, Plane, Vector3 } from 'three';
import { CoffeeLiquidMaterial } from './CoffeeLiquidMaterial';
import { useThree, useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';

/**
 * Props de CoffeeCup
 * - coffeeLevel: 0..1 mapea linealmente desde -0.6 (fondo interior) a +0.6 (borde/rim) usando y = -0.6 + 1.2*level
 * - draggable: habilita arrastre en el plano XZ; usa raycaster+plane para posicionar
 * - coffeeShader: si true, usa CoffeeLiquidMaterial (shader) para el disco del líquido
 * - debugColors: materiales con colores llamativos para depurar geometrías
 * - onDragChange/onPositionChange: comunicación con la escena para controles externos
 */
type CoffeeCupProps = {
  spin?: boolean;
  variant?: 'detailed' | 'simple';
  debugColors?: boolean;
  coffee?: boolean;
  coffeeLevel?: number;
  draggable?: boolean;
  onDragChange?: (dragging: boolean) => void;
  coffeeShader?: boolean;
  onPositionChange?: (pos: [number, number, number]) => void; // reportar posición del grupo
  visible?: boolean; // mostrar/ocultar taza
  initialPosition?: [number, number, number]; // posición inicial (no controlada) del grupo
  // Escala uniforme del grupo (1 = tamaño original)
  scale?: number;
  // Física simple / soporte de mesa
  physics?: boolean;
  floorY?: number; // y del suelo donde puede aterrizar si se cae
  deskCenter?: [number, number]; // [x,z] centro de la mesa
  deskTopY?: number; // y de la cara superior del tablero (mesa)
  deskSize?: [number, number]; // [anchoX, profundidadZ]
  edgeMargin?: number; // margen desde el borde para considerar “sobre la mesa”
  dragPlaneY?: number; // altura del plano de arrastre (por defecto 0)
  // Origen/posición de la mesa en mundo. Si cambia, la taza acompaña a la mesa.
  deskOrigin?: [number, number, number];
};

export const CoffeeCup: React.FC<CoffeeCupProps> = ({
  spin = false,
  variant = 'detailed',
  debugColors = false,
  coffee = true,
  coffeeLevel = 90,
  draggable = false,
  onDragChange,
  coffeeShader = true,
  onPositionChange,
  visible = true,
  initialPosition,
  scale = 1,
  physics = false,
  floorY = -0.7,
  deskCenter,
  deskTopY,
  deskSize,
  edgeMargin = 0.4,
  dragPlaneY,
  deskOrigin,
}) => {
  const groupRef = useRef<Group>(null);
  const coffeeGeomRef = useRef<BufferGeometry | null>(null);
  const originalPositions = useRef<Float32Array | null>(null);
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<Vector3 | null>(null);
  const raycaster = useRef(new Raycaster());
  const plane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const mouse = useRef(new Vector2());
  useCursor(hovered || dragging, 'grab');

  // Física simple: caída con gravedad y reposo sobre mesa/suelo
  const yVel = useRef(0);
  const gravity = 9.8; // unidades/s^2 (escala de escena)
  const cupHalfHeight = 0.6; // de -0.6 a +0.6 en geometría (sin escalar)
  const cupHalfHeightScaled = cupHalfHeight * scale;
  const deskEnabled = !!deskCenter && deskTopY !== undefined && !!deskSize;
  const halfW = deskSize ? deskSize[0] / 2 : 0;
  const halfD = deskSize ? deskSize[1] / 2 : 0;

  const isOverDesk = useCallback(() => {
    if (!deskEnabled || !groupRef.current) return false;
    const gp = groupRef.current.position;
    const dx = gp.x - (deskCenter as [number, number])[0];
    const dz = gp.z - (deskCenter as [number, number])[1];
    return (
      Math.abs(dx) <= Math.max(0, halfW - edgeMargin) &&
      Math.abs(dz) <= Math.max(0, halfD - edgeMargin)
    );
  }, [deskEnabled, halfW, halfD, edgeMargin, deskCenter]);

  // Seguir el movimiento de la mesa: si la mesa se traslada, mover la taza con el mismo delta
  const prevDeskOrigin = useRef<[number, number, number] | null>(null);
  useEffect(() => {
    if (!deskOrigin) return;
    if (!groupRef.current) {
      prevDeskOrigin.current = deskOrigin;
      return;
    }
    if (!prevDeskOrigin.current) {
      prevDeskOrigin.current = deskOrigin;
      return;
    }
    const [px, , pz] = prevDeskOrigin.current;
    const dx = deskOrigin[0] - px;
    const dz = deskOrigin[2] - pz;
    if (dx !== 0 || dz !== 0) {
      const gp = groupRef.current.position;
      const yTop = deskTopY !== undefined ? deskTopY + cupHalfHeightScaled + 0.03 * scale : gp.y;
      groupRef.current.position.set(gp.x + dx, yTop, gp.z + dz);
      onPositionChange?.([gp.x + dx, yTop, gp.z + dz]);
    }
    prevDeskOrigin.current = deskOrigin;
  }, [deskOrigin, deskTopY, scale, cupHalfHeightScaled, onPositionChange]);

  // Proyecta el puntero al plano horizontal y=0 para convertir el arrastre en coordenadas XZ
  const computePlanePoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);
      const hit = new Vector3();
      // si se dio un dragPlaneY, ajustar el plano y=dragPlaneY
      if (dragPlaneY !== undefined) {
        // Plane: n=(0,1,0), constant = -y (Three.js plane eq: n·p + constant = 0)
        plane.current.set(new Vector3(0, 1, 0), -dragPlaneY);
      } else {
        plane.current.set(new Vector3(0, 1, 0), 0);
      }
      if (raycaster.current.ray.intersectPlane(plane.current, hit)) {
        return hit;
      }
      return null;
    },
    [camera, gl.domElement, dragPlaneY]
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

  // Aplicar posición inicial solo una vez (montaje) para evitar "snap back" en re-render
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    if (groupRef.current) {
      if (initialPosition) {
        groupRef.current.position.set(initialPosition[0], initialPosition[1], initialPosition[2]);
      }
      const p = groupRef.current.position;
      onPositionChange?.([p.x, p.y, p.z]);
      didInit.current = true;
    }
  }, []);

  // Sistema de drag: escucha pointermove/up globales; limita radio de desplazamiento para no perder la taza
  useEffect(() => {
    if (!draggable) return;
    // Notificar posición inicial cuando comenzamos a escuchar drag
    if (groupRef.current) {
      const p = groupRef.current.position;
      onPositionChange?.([p.x, p.y, p.z]);
    }
    const handleMove = (e: PointerEvent) => {
      if (!dragging || !groupRef.current) return;
      const p = computePlanePoint(e.clientX, e.clientY);
      if (p && dragOffset.current) {
        p.add(dragOffset.current);
        // Limitar arrastre al rectángulo de la mesa si hay datos de mesa
        if (deskEnabled && deskCenter && deskSize) {
          const minX = deskCenter[0] - (halfW - edgeMargin);
          const maxX = deskCenter[0] + (halfW - edgeMargin);
          const minZ = deskCenter[1] - (halfD - edgeMargin);
          const maxZ = deskCenter[1] + (halfD - edgeMargin);
          p.x = Math.min(Math.max(p.x, minX), maxX);
          p.z = Math.min(Math.max(p.z, minZ), maxZ);
        }
        // Mientras arrastras, mantener Y pegado a la mesa si está definida
        const yTop =
          deskTopY !== undefined
            ? deskTopY + cupHalfHeightScaled + 0.03 * scale
            : groupRef.current.position.y;
        groupRef.current.position.set(p.x, yTop, p.z);
        onPositionChange?.([p.x, yTop, p.z]);
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

  // Animación opcional (spin) y ondulación legacy de la tapa de café en caso de no usar shader
  useFrame((_, delta) => {
    if (spin && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
    // Física: actualizar Y
    if (physics && groupRef.current) {
      const gp = groupRef.current.position;
      const topY = deskTopY !== undefined ? deskTopY + cupHalfHeightScaled + 0.03 * scale : gp.y;
      const floorStop = floorY + cupHalfHeightScaled;
      if (dragging) {
        // mientras arrastras, si estás sobre la mesa, “pega” a la mesa
        if (isOverDesk()) {
          gp.y = topY;
          yVel.current = 0;
        }
      } else {
        if (isOverDesk()) {
          // reposo sobre mesa
          gp.y = topY;
          yVel.current = 0;
        } else {
          // caída libre hasta el suelo
          yVel.current -= gravity * delta;
          gp.y += yVel.current * delta;
          if (gp.y < floorStop) {
            gp.y = floorStop;
            yVel.current = 0;
          }
        }
      }
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

  const SimpleCup = (
    <>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.7, 1.2, 40, 1, true]} />
        <meshStandardMaterial
          color={debugColors ? '#ff004d' : '#f5f5f5'}
          roughness={0.62}
          metalness={0.04}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.72, 0.58, 1.2, 40, 1, true]} />
        <meshStandardMaterial
          color={debugColors ? '#0099ff' : '#ffffff'}
          roughness={0.7}
          side={2}
        />
      </mesh>
      <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.85, 64, 1]} />
        <meshStandardMaterial
          color={debugColors ? '#ffb800' : '#f5f5f5'}
          roughness={0.55}
          metalness={0.04}
          side={2}
        />
      </mesh>
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.05, 40]} />
        <meshStandardMaterial color={debugColors ? '#7fff00' : '#ededed'} roughness={0.75} />
      </mesh>
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
      {/* vapor removido */}
      <mesh position={[0.95, -0.05, 0]} rotation={[0, Math.PI, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.38, 0.08, 16, 70, Math.PI * 1.05]} />
        <meshStandardMaterial
          color={debugColors ? '#9400ff' : '#f5f5f5'}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>
    </>
  );

  const DetailedCup = (
    <>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.7, 1.2, 60, 1, true]} />
        <meshStandardMaterial
          color={debugColors ? '#ff004d' : '#f5f5f5'}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.73, 0.59, 1.2, 60, 1, true]} />
        <meshStandardMaterial
          color={debugColors ? '#0099ff' : '#f3f3f3'}
          roughness={0.68}
          side={2}
        />
      </mesh>
      <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.73, 0.85, 72, 1]} />
        <meshStandardMaterial
          color={debugColors ? '#ffb800' : '#f9f9f9'}
          roughness={0.48}
          metalness={0.05}
          side={2}
        />
      </mesh>
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[0.73, 0.73, 0.05, 60]} />
        <meshStandardMaterial color={debugColors ? '#7fff00' : '#ffffff'} roughness={0.75} />
      </mesh>
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
      {/* vapor removido */}
      <mesh position={[0.8, 0.0, 0]} rotation={[0, Math.PI, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.4, 0.085, 26, 95, Math.PI * 1.08]} />
        <meshStandardMaterial
          color={debugColors ? '#9400ff' : '#f5f5f5'}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
    </>
  );

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      scale={[scale, scale, scale]}
      dispose={null}
      visible={visible}
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
      {variant === 'simple' ? SimpleCup : DetailedCup}
    </group>
  );
};
