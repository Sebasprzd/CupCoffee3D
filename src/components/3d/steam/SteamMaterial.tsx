/**
 * SteamMaterial
 * - Shader de fragmento para columnas de vapor: disco suave modulado por ruido fbm animado.
 * - Profundidad: depthTest activo y depthWrite apagado para composición correcta con la taza.
 *
 * Props:
 * - color, opacity: color base y opacidad del vapor
 * - noiseScale: escala espacial del ruido (más grande = patrones más grandes)
 * - noiseStrength: mezcla del ruido sobre el disco base (0..1)
 * - seed: variación por columna
 */
import * as React from 'react';
import { useMemo } from 'react';

type SteamMaterialProps = {
  color?: string;
  opacity?: number;
  noiseScale?: number;
  noiseStrength?: number; // 0..1 cuánto influye el ruido sobre el disco base
  seed?: number;
};

export function SteamMaterial({
  color = '#ffffff',
  opacity = 0.8,
  noiseScale = 3.0,
  noiseStrength = 0.75,
  seed = 0,
}: SteamMaterialProps) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: [1, 1, 1] },
      uOpacity: { value: opacity },
      uNoiseScale: { value: noiseScale },
      uNoiseStrength: { value: noiseStrength },
      uSeed: { value: seed },
    }),
    [opacity, noiseScale, noiseStrength, seed]
  );

  // convertir color hex a vec3
  const col = useMemo(() => {
    const hex = color.startsWith('#') ? color.slice(1) : color;
    const bigint = parseInt(hex, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return [r, g, b];
  }, [color]);
  uniforms.uColor.value = col as any;

  return (
    // @ts-ignore - shaderMaterial JSX intrinsic provided by drei/fiber
    <shaderMaterial
      transparent
      depthWrite={false}
      depthTest
      blending={1 /* NormalBlending */}
      uniforms={uniforms}
      vertexShader={`
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        precision highp float;
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uNoiseScale;
        uniform float uNoiseStrength;
        uniform float uSeed;

        // value noise 2D + fbm
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
        float noise(vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0,0.0));
          float c = hash(i + vec2(0.0,1.0));
          float d = hash(i + vec2(1.0,1.0));
          vec2 u = f*f*(3.0-2.0*f);
          return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
        }
        float fbm(vec2 p){
          float v = 0.0;
          float a = 0.5;
          for(int i=0;i<4;i++){
            v += a * noise(p);
            p = p*2.0 + vec2(100.0);
            a *= 0.5;
          }
          return v;
        }

        void main(){
          // uv en [-1,1]
          vec2 uv = vUv * 2.0 - 1.0;
          float r = length(uv);
          // disco suave como base
          float base = smoothstep(1.0, 0.0, r);
          // ruido animado para perforar y suavizar bordes
          float t = uTime * 0.25;
          vec2 q = uv * uNoiseScale + vec2(uSeed*12.3, uSeed*7.1);
          float n = fbm(q + vec2(t, -t)); // 0..1
          float mask = mix(1.0, n, clamp(uNoiseStrength, 0.0, 1.0));
          float alpha = base * mask * uOpacity;
          // salida
          gl_FragColor = vec4(uColor, alpha);
          // descarte temprano para ahorrar fill-rate
          if (gl_FragColor.a < 0.01) discard;
        }
      `}
    />
  );
}
// Moved to coffecup/SteamMaterial.tsx
export {};
