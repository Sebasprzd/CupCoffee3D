/**
 * WoodMaterial
 * - Simple stylized wood shader for the desk top.
 * - Procedural rings with noise warping and a tiny fake specular.
 */
import * as React from 'react';

type WoodMaterialProps = {
  color1?: string; // light wood tone
  color2?: string; // dark wood tone
  ringScale?: number; // scale for ring frequency (lower -> larger rings)
  ringTightness?: number; // multiplies ring frequency
  noiseScale?: number; // scale for noise
  noiseAmp?: number; // amplitude of ring warping by noise
  grainWarp?: number; // directional grain perturbation
  gloss?: number; // fake specular intensity
};

export function WoodMaterial({
  color1 = '#cda57a',
  color2 = '#8d5e34',
  ringScale = 0.6,
  ringTightness = 1.0,
  noiseScale = 3.0,
  noiseAmp = 0.12,
  grainWarp = 0.2,
  gloss = 0.15,
}: WoodMaterialProps) {
  // convert hex to vec3
  const c1 = React.useMemo(() => {
    const hex = color1.startsWith('#') ? color1.slice(1) : color1;
    const i = parseInt(hex, 16);
    return [((i >> 16) & 255) / 255, ((i >> 8) & 255) / 255, (i & 255) / 255];
  }, [color1]);
  const c2 = React.useMemo(() => {
    const hex = color2.startsWith('#') ? color2.slice(1) : color2;
    const i = parseInt(hex, 16);
    return [((i >> 16) & 255) / 255, ((i >> 8) & 255) / 255, (i & 255) / 255];
  }, [color2]);

  const uniforms = React.useMemo(
    () => ({
      uTime: { value: 0 },
      uC1: { value: c1 as any },
      uC2: { value: c2 as any },
      uRingScale: { value: ringScale },
      uRingTight: { value: ringTightness },
      uNoiseScale: { value: noiseScale },
      uNoiseAmp: { value: noiseAmp },
      uGrainWarp: { value: grainWarp },
      uGloss: { value: gloss },
    }),
    [c1, c2, ringScale, ringTightness, noiseScale, noiseAmp, grainWarp, gloss]
  );

  return (
    // @ts-ignore shaderMaterial intrinsic provided by r3f/drei
    <shaderMaterial
      transparent={false}
      depthWrite
      depthTest
      toneMapped={false}
      uniforms={uniforms}
      vertexShader={`
        varying vec3 vPos;
        varying vec3 vNormal;
        void main(){
          vPos = position; // object space position
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        precision highp float;
        varying vec3 vPos;
        varying vec3 vNormal;
        uniform float uTime;
        uniform vec3 uC1; // light
        uniform vec3 uC2; // dark
        uniform float uRingScale;
        uniform float uRingTight;
        uniform float uNoiseScale;
        uniform float uNoiseAmp;
        uniform float uGrainWarp;
        uniform float uGloss;

        // simple hash
        float hash(vec2 p){
          p = fract(p*vec2(123.34, 345.45));
          p += dot(p, p+34.345);
          return fract(p.x*p.y);
        }
        // value noise
        float vnoise(vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i+vec2(1.0,0.0));
          float c = hash(i+vec2(0.0,1.0));
          float d = hash(i+vec2(1.0,1.0));
          vec2 u = f*f*(3.0-2.0*f);
          return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
        }
        float fbm(vec2 p){
          float s = 0.0;
          float a = 0.5;
          for(int i=0;i<4;i++){
            s += a * vnoise(p);
            p *= 2.02;
            a *= 0.5;
          }
          return s;
        }

        void main(){
          // use xz plane for wood rings; scale controls frequency
          vec2 uv = vPos.xz * uRingScale;

          // directional grain warp
          float warp = fbm(uv * uNoiseScale) * uNoiseAmp;
          float dirGrain = sin((uv.x + uv.y*0.25) * 10.0) * uGrainWarp;

          float r = length(uv + warp + dirGrain);
          // ring pattern (0..1 bands)
          float band = 0.5 + 0.5 * sin((r * 6.28318) * (1.5 + uRingTight));

          // add additional fine grain
          float fine = fbm(uv * (uNoiseScale*2.0));
          band = mix(band, band * (0.7 + 0.3 * fine), 0.6);

          vec3 col = mix(uC2, uC1, band);

          // fake lighting: one directional light + cheap specular
          vec3 L = normalize(vec3(0.4, 0.9, 0.2));
          vec3 N = normalize(vNormal);
          float diff = clamp(dot(N, L), 0.1, 1.0);

          // view vector approximated facing camera in +Z of view space
          // small highlight that follows grain (using band)
          float spec = pow(diff, 12.0) * uGloss * (0.5 + 0.5*band);

          // final color (keep in linear space; toneMapped=false in material)
          vec3 outCol = col * (0.7 + 0.3*diff) + spec;
          gl_FragColor = vec4(outCol, 1.0);
        }
      `}
    />
  );
}
