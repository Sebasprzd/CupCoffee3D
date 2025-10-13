/**
 * Lamp (desk lamp)
 * - Procedural lamp inspired by the reference: wooden base, white curved stem, cone shade, and bulb.
 * - Mirrors debug/marker/refs/drag pattern like CoffeeCup and Desk.
 */
import * as React from 'react';
import { Group, Plane, Raycaster, Vector2, Vector3, Color, CatmullRomCurve3 } from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';

type LampProps = {
  position?: [number, number, number];
  visible?: boolean;
  draggable?: boolean;
  debugColors?: boolean;
  showRefs?: boolean;
  showMarker?: boolean;
  spin?: boolean;
  baseRadius?: number;
  baseHeight?: number;
  stemHeight?: number; // altura del cuerpo
  stemRadius?: number; // espesor del cuerpo
  stemBend?: number; // curvatura hacia delante (Z+)
  shadeLength?: number; // longitud total de la cabeza
  shadeRadiusFront?: number; // radio en la boca (frente)
  shadeRadiusNeck?: number; // radio en el cuello (cerca del cuerpo)
  onDragChange?: (dragging: boolean) => void;
  onPositionChange?: (pos: [number, number, number]) => void;
  lightOn?: boolean;
  lightColor?: string;
  lightIntensity?: number;
};

export const Lamp: React.FC<LampProps> = ({
  position = [0, 0, 0],
  visible = true,
  draggable = false,
  debugColors = false,
  showRefs = false,
  showMarker = false,
  spin = false,
  baseRadius = 0.32,
  baseHeight = 0.06,
  stemHeight = 0.8,
  stemRadius = 0.045,
  stemBend = 0.2,
  shadeLength = 0.32,
  shadeRadiusFront = 0.28,
  shadeRadiusNeck = 0.12,
  onDragChange,
  onPositionChange,
  lightOn = true,
  lightColor = '#fff5d1',
  lightIntensity = 1.6,
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

  // pointer to plane project
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
      if (p) dragOffset.current = groupRef.current.position.clone().sub(p);
    },
    [draggable, computePlanePoint, onDragChange]
  );

  React.useEffect(() => {
    if (groupRef.current) {
      const p = groupRef.current.position;
      onPositionChange?.([p.x, p.y, p.z]);
    }
  }, [onPositionChange]);

  React.useEffect(() => {
    if (!draggable) return;
    const handleMove = (e: PointerEvent) => {
      if (!dragging || !groupRef.current) return;
      const p = computePlanePoint(e.clientX, e.clientY);
      if (p && dragOffset.current) {
        p.add(dragOffset.current);
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
    if (spin && groupRef.current) groupRef.current.rotation.y += dt * 0.25;
  });

  const bulbColor = React.useMemo(() => new Color(lightColor), [lightColor]);

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
      {/* Base de madera */}
      <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[baseRadius, baseRadius, baseHeight, 48]} />
        <meshStandardMaterial color={debugColors ? '#b8793a' : '#8b5a2b'} roughness={0.7} />
      </mesh>

      {/* Cuerpo curvo unificado (TubeGeometry sobre una curva) */}
      {(() => {
        // Curva: sube vertical desde la base y luego se inclina levemente hacia Z+
        const p0 = new Vector3(0, baseHeight, 0);
        const p1 = new Vector3(0, baseHeight + stemHeight * 0.45, 0);
        const p2 = new Vector3(0, baseHeight + stemHeight * 0.8, stemBend * 0.5);
        const p3 = new Vector3(0, baseHeight + stemHeight, stemBend);
        const curve = new CatmullRomCurve3([p0, p1, p2, p3]);
        return (
          <mesh castShadow receiveShadow>
            {/* TubeGeometry(path, tubularSegments, radius) */}
            {/* Radios ligeramente mayores al frente para simular continuidad */}
            <tubeGeometry args={[curve, 60, stemRadius, 24, false]} />
            <meshStandardMaterial
              color={debugColors ? '#2e86de' : '#e7e7ea'}
              roughness={0.5}
              metalness={0.1}
            />
          </mesh>
        );
      })()}

      {/* Cabeza (shade) más continua: perfil lathe que pasa de cuello a boca */}
      {(() => {
        // Construimos un perfil 2D (r,y) y lo giramos con lathe para un cono redondeado
        const steps = 7;
        const profile: [number, number][] = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const y = -t * shadeLength; // avanza hacia delante
          // Interpolación suave entre cuello y frente con ligero abombado
          const r =
            shadeRadiusNeck * (1 - t) + shadeRadiusFront * t + Math.sin(t * Math.PI) * 0.012;
          profile.push([r, y]);
        }
        const points = profile.map(([r, y]) => new Vector3(r, y, 0));
        return (
          <group position={[0, baseHeight + stemHeight, stemBend]} rotation={[-0.25, 0, 0]}>
            <mesh castShadow>
              {/* @ts-ignore three-stdlib lathe in r3f */}
              <latheGeometry args={[points, 64]} />
              <meshStandardMaterial
                color={debugColors ? '#ff4d4f' : '#f2f3f7'}
                roughness={0.6}
                metalness={0.08}
                side={2}
              />
            </mesh>
            {/* Tapa/aro madera posterior (amplía para eliminar separación con el rojo) */}
            {/* Ajusta el factor 0.98 y el espesor si ves espacio en modo debug */}
            <mesh position={[0, 0.005, 0]}>
              <cylinderGeometry
                args={[shadeRadiusNeck * 0.98, shadeRadiusNeck * 0.98, 0.028, 48]}
              />
              <meshStandardMaterial color={debugColors ? '#ffb800' : '#c89d6d'} roughness={0.7} />
            </mesh>

            {/* Cuello conector: transición suave entre el tubo del cuerpo y el cuello de la cabeza */}
            <mesh position={[0, 0.04, 0]} castShadow>
              <cylinderGeometry args={[shadeRadiusNeck * 0.95, stemRadius * 1.2, 0.08, 32]} />
              <meshStandardMaterial
                color={debugColors ? '#2e86de' : '#e7e7ea'}
                roughness={0.5}
                metalness={0.1}
              />
            </mesh>

            {/* Bombillo y luz dentro de la cabeza, para alinearse con su orientación */}
            <mesh position={[0, -shadeLength * 0.55, 0.0]} castShadow>
              <sphereGeometry args={[0.07, 24, 24]} />
              <meshStandardMaterial
                color={debugColors ? '#ffffff' : '#fff3c4'}
                emissive={debugColors ? '#000' : '#fff3c4'}
                emissiveIntensity={lightOn ? lightIntensity : 0}
                roughness={0.3}
                metalness={0.0}
              />
            </mesh>
            {lightOn && (
              <pointLight
                color={bulbColor}
                intensity={lightIntensity}
                position={[0, -shadeLength * 0.55, 0.0]}
                distance={3.2}
                decay={2}
              />
            )}
          </group>
        );
      })()}

      {/* Bombillo y luz movidos a la cabeza (nada aquí) */}

      {/* Refs/markers */}
      {(showRefs || debugColors) && (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <ringGeometry args={[0.01, baseRadius + 0.01, 64, 1]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.75} />
          </mesh>
          <mesh position={[baseRadius, 0.01, 0]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshBasicMaterial color="#ff3333" />
          </mesh>
          <mesh position={[-baseRadius, 0.01, 0]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshBasicMaterial color="#3399ff" />
          </mesh>
          <mesh position={[0, 0.01, baseRadius]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshBasicMaterial color="#33ff66" />
          </mesh>
          <mesh position={[0, 0.01, -baseRadius]}>
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
