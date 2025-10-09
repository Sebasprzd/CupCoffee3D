import * as React from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { ShaderMaterial, Color } from 'three';

export class CoffeeLiquidMat extends ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new Color('#3c2414') },
        uHighlight: { value: new Color('#9a6a3d') },
        uRimColor: { value: new Color('#d9b08c') },
        uStrength: { value: 0.4 },
        uGloss: { value: 0.9 },
        // Ondas "idle" (cuando la taza está quieta también se mueven)
        uIdleAmp: { value: 0.08 }, // amplitud base
        uIdleSpeed: { value: 1.6 }, // velocidad global
        uIdleDetail: { value: 0.55 }, // mezcla ondas finas
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uIdleAmp;
        uniform float uIdleSpeed;
        uniform float uIdleDetail;
        void main(){
          vUv = uv;
          vNormal = normalMatrix * normal;
          vec3 pos = position;
          // Ondas siempre activas (idle) incluso si la taza no se mueve.
          // Combinación de 3 frecuencias radiales + direccionales para un patrón menos repetitivo.
          if (pos.y > 0.0) {
            float r = length(pos.xz);
            float t = uTime * uIdleSpeed;
            float w1 = sin(r * 13.5 - t * 1.1);
            float w2 = sin((pos.x + pos.z) * 4.2 + t * 0.9);
            float w3 = sin((pos.x - pos.z) * 5.1 - t * 0.6);
            float concentric = sin(r * 22.0 - t * 1.7);
            float mixW = (w1 * 0.55 + w2 * 0.3 + w3 * 0.25 + concentric * uIdleDetail * 0.35);
            // Atenuar cerca del borde para evitar distorsión dura en contacto con la taza
            float edgeFalloff = smoothstep(0.95, 0.6, r);
            pos.y += mixW * uIdleAmp * edgeFalloff;
          }
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vUv;
        uniform vec3 uBaseColor;
        uniform vec3 uHighlight;
        uniform vec3 uRimColor;
        uniform float uStrength;
        uniform float uGloss;
        uniform float uTime;
        void main(){
          // Normal aproximada
          vec3 N = normalize(vNormal);
          // Fresnel simple para borde
          float fres = pow(1.0 - max(dot(N, vec3(0.0,1.0,0.0)), 0.0), 2.0);
          // Veteado sutil
          float swirl = sin((vUv.x + vUv.y + uTime*0.15) * 8.0) * 0.04;
          float shade = clamp(0.4 + swirl, 0.0, 1.0);
          vec3 base = mix(uBaseColor, uHighlight, shade*0.6);
          // Borde más claro
          base = mix(base, uRimColor, fres * 0.8);
          // Simulación especular simple
          float spec = pow(max(N.y,0.0), 40.0) * uGloss;
          vec3 color = base + spec * vec3(1.0,0.95,0.85);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: false,
    });
  }
}

extend({ CoffeeLiquidMat });

export const CoffeeLiquidMaterial: React.FC<{
  baseColor?: string;
  highlightColor?: string;
  rimColor?: string;
  strength?: number;
  gloss?: number;
  idleAmp?: number; // amplitud de ondas en reposo
  idleSpeed?: number; // velocidad de desplazamiento
  idleDetail?: number; // mezcla de patrón fino (0..1)
}> = ({
  baseColor = '#3c2414',
  highlightColor = '#9a6a3d',
  rimColor = '#d9b08c',
  strength = 0.4,
  gloss = 0.9,
  idleAmp = 0.08,
  idleSpeed = 1.6,
  idleDetail = 0.55,
}) => {
  const ref = React.useRef<CoffeeLiquidMat>(null);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.uniforms.uTime.value += dt;
      ref.current.uniforms.uBaseColor.value.set(baseColor);
      ref.current.uniforms.uHighlight.value.set(highlightColor);
      ref.current.uniforms.uRimColor.value.set(rimColor);
      ref.current.uniforms.uStrength.value = strength;
      ref.current.uniforms.uGloss.value = gloss;
      ref.current.uniforms.uIdleAmp.value = idleAmp;
      ref.current.uniforms.uIdleSpeed.value = idleSpeed;
      ref.current.uniforms.uIdleDetail.value = idleDetail;
    }
  });
  return <coffeeLiquidMat ref={ref} attach="material" />;
};
