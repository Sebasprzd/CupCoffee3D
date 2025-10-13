/**
 * Desk (wooden office desk)
 * - Procedural wooden desk made of top board and legs.
 * - Mirrors the debug/marker/refs patterns used by CoffeeCup for easy scene alignment.
 * - Exposes draggable behavior on XZ plane and reports position via onPositionChange.
 */
import * as React from 'react';
import { Group, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { WoodMaterial } from './WoodMaterial';

type DeskProps = {
  size?: [number, number, number]; // width (x), thickness (y), depth (z)
  height?: number; // height from ground to top surface
  legThickness?: number;
  legInset?: number; // inset from edges for legs
  woodColor?: string;
  woodLightColor?: string; // light streak color for wood shader
  woodGloss?: number; // specular intensity for wood shader
  metalColor?: string;
  roughness?: number;
  metalness?: number;
  debugColors?: boolean;
  showRefs?: boolean;
  showMarker?: boolean;
  draggable?: boolean;
  spin?: boolean;
  visible?: boolean;
  position?: [number, number, number];
  onDragChange?: (dragging: boolean) => void;
  onPositionChange?: (pos: [number, number, number]) => void;
};

export const Desk: React.FC<DeskProps> = ({
  size = [2.0, 0.08, 1.0],
  height = 0.75,
  legThickness = 0.08,
  legInset = 0.12,
  woodColor = '#8b5a2b',
  woodLightColor = '#b07a4c',
  woodGloss = 0.14,
  metalColor = '#444',
  roughness = 0.85,
  metalness = 0.05,
  debugColors = false,
  showRefs = false,
  showMarker = false,
  draggable = false,
  spin = false,
  visible = true,
  position = [0, 0, 0],
  onDragChange,
  onPositionChange,
}) => {
  const groupRef = React.useRef<Group>(null);
  const raycaster = React.useRef(new Raycaster());
  const plane = React.useRef(new Plane(new Vector3(0, 1, 0), 0));
  const mouse = React.useRef(new Vector2());
  const dragOffset = React.useRef<Vector3 | null>(null);
  const { camera, gl } = useThree();
  const [hovered, setHovered] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  useCursor(hovered || dragging, 'grab');

  // helper: convert pointer to intersection with ground plane (y=0)
  const computePlanePoint = React.useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);
      const hit = new Vector3();
      if (raycaster.current.ray.intersectPlane(plane.current, hit)) return hit;
      return null;
    },
    [camera, gl.domElement]
  );

  const onPointerDown = React.useCallback(
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

  // notify initial position
  React.useEffect(() => {
    if (groupRef.current) {
      const p = groupRef.current.position;
      onPositionChange?.([p.x, p.y, p.z]);
    }
  }, [onPositionChange]);

  // listen pointer move/up for dragging
  React.useEffect(() => {
    if (!draggable) return;
    if (groupRef.current) {
      const p = groupRef.current.position;
      onPositionChange?.([p.x, p.y, p.z]);
    }
    const handleMove = (e: PointerEvent) => {
      if (!dragging || !groupRef.current) return;
      const p = computePlanePoint(e.clientX, e.clientY);
      if (p && dragOffset.current) {
        p.add(dragOffset.current);
        const radiusLimit = 4.0;
        const len = Math.sqrt(p.x * p.x + p.z * p.z);
        if (len > radiusLimit) p.multiplyScalar(radiusLimit / len);
        groupRef.current.position.set(p.x, groupRef.current.position.y, p.z);
        onPositionChange?.([p.x, groupRef.current.position.y, p.z]);
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

  useFrame((_, dt) => {
    if (spin && groupRef.current) groupRef.current.rotation.y += dt * 0.2;
  });

  const [w, t, d] = size;
  const legH = height - t; // legs from ground to under the top board
  const xi = w / 2 - legInset - legThickness / 2;
  const zi = d / 2 - legInset - legThickness / 2;

  return (
    <group
      ref={groupRef}
      position={position}
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
      castShadow
      receiveShadow
    >
      {/* Top board with stylized wood shader */}
      <mesh position={[0, height - t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, t, d, 1, 1, 1]} />
        {debugColors ? (
          <meshStandardMaterial color={'#cc6b3c'} roughness={0.4} metalness={0.1} />
        ) : (
          <WoodMaterial
            color1={woodLightColor}
            color2={woodColor}
            ringScale={0.7}
            ringTightness={1.0}
            noiseScale={3.0}
            noiseAmp={0.12}
            grainWarp={0.2}
            gloss={woodGloss}
          />
        )}
      </mesh>

      {/* Legs */}
      <mesh position={[xi, legH / 2, zi]} castShadow receiveShadow>
        <boxGeometry args={[legThickness, legH, legThickness]} />
        <meshStandardMaterial
          color={debugColors ? '#2e86de' : metalColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[-xi, legH / 2, zi]} castShadow receiveShadow>
        <boxGeometry args={[legThickness, legH, legThickness]} />
        <meshStandardMaterial
          color={debugColors ? '#ffcc00' : metalColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[xi, legH / 2, -zi]} castShadow receiveShadow>
        <boxGeometry args={[legThickness, legH, legThickness]} />
        <meshStandardMaterial
          color={debugColors ? '#00d084' : metalColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[-xi, legH / 2, -zi]} castShadow receiveShadow>
        <boxGeometry args={[legThickness, legH, legThickness]} />
        <meshStandardMaterial
          color={debugColors ? '#9400ff' : metalColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Support bars (front/back) */}
      <mesh position={[0, legH * 0.5, zi]} castShadow receiveShadow>
        <boxGeometry args={[w - legInset * 2, 0.04, 0.05]} />
        <meshStandardMaterial
          color={debugColors ? '#ff4d4f' : metalColor}
          roughness={0.75}
          metalness={0.15}
        />
      </mesh>
      <mesh position={[0, legH * 0.5, -zi]} castShadow receiveShadow>
        <boxGeometry args={[w - legInset * 2, 0.04, 0.05]} />
        <meshStandardMaterial
          color={debugColors ? '#ff4d4f' : metalColor}
          roughness={0.75}
          metalness={0.15}
        />
      </mesh>

      {/* Left/Right bars */}
      <mesh position={[xi, legH * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.04, d - legInset * 2]} />
        <meshStandardMaterial
          color={debugColors ? '#ff4d4f' : metalColor}
          roughness={0.75}
          metalness={0.15}
        />
      </mesh>
      <mesh position={[-xi, legH * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.04, d - legInset * 2]} />
        <meshStandardMaterial
          color={debugColors ? '#ff4d4f' : metalColor}
          roughness={0.75}
          metalness={0.15}
        />
      </mesh>

      {/* Debug/Refs: rings and cardinal markers following scene convention */}
      {(showRefs || debugColors) && (
        <group>
          {/* footprint ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <ringGeometry args={[0.01, Math.max(w, d) * 0.5 + 0.01, 64, 1]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.75} />
          </mesh>
          {/* cardinal markers */}
          <mesh position={[Math.max(w, d) * 0.5, 0.01, 0]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshBasicMaterial color="#ff3333" />
          </mesh>
          <mesh position={[-Math.max(w, d) * 0.5, 0.01, 0]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshBasicMaterial color="#3399ff" />
          </mesh>
          <mesh position={[0, 0.01, Math.max(w, d) * 0.5]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshBasicMaterial color="#33ff66" />
          </mesh>
          <mesh position={[0, 0.01, -Math.max(w, d) * 0.5]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshBasicMaterial color="#ffcc33" />
          </mesh>
        </group>
      )}

      {showMarker && (
        <mesh position={[0, 0.01, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#ff00ff" />
        </mesh>
      )}
    </group>
  );
};
