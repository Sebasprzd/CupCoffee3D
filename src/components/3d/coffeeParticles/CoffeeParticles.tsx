/**
 * CoffeeParticles (modo Points)
 * - Sistema de puntos para “vapor” estilizado; útil para debug o estilo más chispeado.
 * - Incluye lógica de contención: mantiene las partículas dentro del radio interior de la taza
 *   hasta sobrepasar el rim, con ajustes por sector y lóbulo angular para evitar fugas locales.
 * - Para vapor más realista, ver CoffeeSteam (billboards + shader de ruido).
 */
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
  // Parámetros de la taza para contener el vapor dentro de las paredes
  constrainInside?: boolean; // si true, mantiene partículas dentro del radio interno hasta pasar el borde
  cupInnerRadiusTop?: number; // radio interno en la parte superior (y = rimY)
  cupInnerRadiusBottom?: number; // radio interno en la base interior (y = cupBottomY)
  cupBottomY?: number; // y del fondo interior de la taza (p. ej. -0.6)
  rimY?: number; // y del borde superior de la taza (p. ej. +0.6)
  innerMargin?: number; // margen de seguridad para no tocar pared
  wallEpsilon?: number; // recorte adicional para evitar solapado visual con la pared
  sectorBoost?: number; // reducción extra del radio permitido en el cuadrante X+Z+
  sectorYMaxRatio?: number; // hasta qué fracción de altura interna aplicar la reducción de sector (0..1)
  // Reducción angular alrededor del bisector entre X+ y Z+ (≈45°)
  angleBiasCenter?: number; // ángulo central en radianes (default 45° => Math.PI/4)
  angleBiasWidth?: number; // semi-ancho (radianes) donde aplica el refuerzo
  angleBoost?: number; // reducción adicional máxima del radio en el centro del lóbulo
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
  constrainInside = true,
  cupInnerRadiusTop = 0.73,
  cupInnerRadiusBottom = 0.59,
  cupBottomY = -0.6,
  rimY = 0.6,
  innerMargin = 0.025,
  wallEpsilon = 0.003,
  sectorBoost = 0,
  sectorYMaxRatio = 1,
  angleBiasCenter = Math.PI / 4,
  angleBiasWidth = Math.PI / 10,
  angleBoost = 0,
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
      let r = Math.sqrt(Math.random()) * spread;
      let x = Math.cos(a) * r;
      let z = Math.sin(a) * r;
      const y = baseY + Math.random() * 0.12;
      // Contención inicial: recortar al radio interno permitido en la altura base
      if (constrainInside) {
        const t = Math.min(Math.max((y - cupBottomY) / Math.max(1e-6, rimY - cupBottomY), 0), 1);
        let allowedR =
          MathUtils.lerp(cupInnerRadiusBottom, cupInnerRadiusTop, t) - innerMargin - wallEpsilon;
        // Reducción por sector: cuadrante X+Z+ (entre rojo y verde)
        if (x > 0 && z > 0 && t <= sectorYMaxRatio) {
          allowedR -= sectorBoost;
        }
        // Lóbulo angular centrado en 45° (solo en Q1) con caída lineal
        if (x > 0 && z > 0 && t <= sectorYMaxRatio && angleBoost > 0) {
          const ang = Math.atan2(z, x);
          const d = Math.abs(ang - angleBiasCenter);
          if (d <= angleBiasWidth) {
            const falloff = 1 - d / Math.max(angleBiasWidth, 1e-6);
            allowedR -= angleBoost * falloff;
          }
        }
        const rr = Math.sqrt(x * x + z * z);
        if (rr > allowedR) {
          const s = allowedR / rr;
          x *= s;
          z *= s;
          r = allowedR;
        }
      }
      const idx = i * 3;
      positions[idx + 0] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      speeds.current![i] = MathUtils.lerp(speedRange[0], speedRange[1], Math.random());
      phases.current![i] = Math.random() * Math.PI * 2;
    }
    return new BufferAttribute(positions, 3);
  }, [
    count,
    spread,
    baseY,
    speedRange,
    constrainInside,
    cupBottomY,
    rimY,
    cupInnerRadiusBottom,
    cupInnerRadiusTop,
    innerMargin,
    wallEpsilon,
    sectorBoost,
    sectorYMaxRatio,
    angleBiasCenter,
    angleBiasWidth,
    angleBoost,
  ]);

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
      // Contención dinámica: mantener dentro del radio interno hasta pasar el rim
      if (constrainInside && arr[idx + 1] < rimY + 0.005) {
        const ty = Math.min(
          Math.max((arr[idx + 1] - cupBottomY) / Math.max(1e-6, rimY - cupBottomY), 0),
          1
        );
        let allowedR =
          MathUtils.lerp(cupInnerRadiusBottom, cupInnerRadiusTop, ty) - innerMargin - wallEpsilon;
        const px = arr[idx + 0];
        const pz = arr[idx + 2];
        // Reducción por sector
        if (px > 0 && pz > 0 && ty <= sectorYMaxRatio) {
          allowedR -= sectorBoost;
        }
        // Lóbulo angular centrado en 45°
        if (px > 0 && pz > 0 && ty <= sectorYMaxRatio && angleBoost > 0) {
          const ang = Math.atan2(pz, px);
          const d = Math.abs(ang - angleBiasCenter);
          if (d <= angleBiasWidth) {
            const falloff = 1 - d / Math.max(angleBiasWidth, 1e-6);
            allowedR -= angleBoost * falloff;
          }
        }
        const rr = Math.sqrt(px * px + pz * pz);
        if (rr > allowedR) {
          const scale = allowedR / Math.max(rr, 1e-6);
          arr[idx + 0] = px * scale;
          arr[idx + 2] = pz * scale;
        }
      }
      // reciclar al superar altura
      if (arr[idx + 1] > baseY + height) {
        arr[idx + 1] = baseY + Math.random() * 0.1;
        const a = Math.random() * Math.PI * 2;
        let r = Math.sqrt(Math.random()) * spread;
        let x = Math.cos(a) * r;
        let z = Math.sin(a) * r;
        if (constrainInside) {
          const ty = Math.min(
            Math.max((arr[idx + 1] - cupBottomY) / Math.max(1e-6, rimY - cupBottomY), 0),
            1
          );
          let allowedR =
            MathUtils.lerp(cupInnerRadiusBottom, cupInnerRadiusTop, ty) - innerMargin - wallEpsilon;
          // Reducción por sector
          if (x > 0 && z > 0 && ty <= sectorYMaxRatio) {
            allowedR -= sectorBoost;
          }
          // Lóbulo angular centrado en 45°
          if (x > 0 && z > 0 && ty <= sectorYMaxRatio && angleBoost > 0) {
            const ang = Math.atan2(z, x);
            const d = Math.abs(ang - angleBiasCenter);
            if (d <= angleBiasWidth) {
              const falloff = 1 - d / Math.max(angleBiasWidth, 1e-6);
              allowedR -= angleBoost * falloff;
            }
          }
          const rr = Math.sqrt(x * x + z * z);
          if (rr > allowedR) {
            const s2 = allowedR / rr;
            x *= s2;
            z *= s2;
            r = allowedR;
          }
        }
        arr[idx + 0] = x;
        arr[idx + 2] = z;
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
          depthTest
          blending={AdditiveBlending}
          opacity={opacity}
        />
      </Points>
    </group>
  );
}
