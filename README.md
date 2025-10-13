# Boceto Portafolio (React + TS + Tailwind v3 + R3F)

## Estructura inicial

```
src/
  main.tsx          # Punto de entrada React
  styles.css        # Estilos globales + Tailwind layers
  components/
    SceneCanvas.tsx # Canvas 3D con Three.js via React Three Fiber
  sections/
    Home.tsx        # Única sección inicial (hero / portada)
```

## Decisiones

- Vite para un entorno rápido.
- TailwindCSS v3 (no v4) + PostCSS + Autoprefixer.
- React Three Fiber + Drei para utilidades 3D.
- ESLint + Prettier para consistencia.
- Strict TypeScript.

## Próximos pasos sugeridos

1. Definir tipado para datos de proyectos (`types/Project.ts`).
2. Añadir layout global y sistema de theming (dark ya base).
3. Crear rutas o anclas internas (react-router o scroll suave).
4. Cargar modelos GLTF o animaciones (dentro de `assets/`).
5. SEO básico (metatags, opengraph).

## Scripts

- `pnpm install` o `npm install` para dependencias.
- `npm run dev` levanta el servidor.
- `npm run build` compila producción.
- `npm run preview` sirve build.
- `npm run lint` revisa código.

## Notas

Este es sólo un boceto mínimo para iterar rápido sin sobre-ingeniería.

## Objeto Mesa (Desk) y cómo está enlazado

Arquitectura rápida para replicar en nuevos objetos 3D.

- Archivos clave:
  - `src/components/3d/table/Desk.tsx`: Geometría procedural de la mesa (tablero + patas + barras) y utilidades (drag, refs, markers).
  - `src/components/3d/table/WoodMaterial.tsx`: Shader de madera estilizado para el tablero (anillos + ruido + brillo leve).
  - `src/components/SceneCanvas.tsx`: Orquesta escena y UI; instancia `Desk` con props y panel lateral para toggles.

- Props principales de `Desk`:
  - `size: [x, y, z]`: tamaño del tablero (x=ancho, y=grosor, z=profundidad).
  - `height: number`: altura del tablero respecto al origen del grupo de la mesa (cara superior = `position.y + height`).
  - `legThickness`, `legInset`: grosor/inset de patas.
  - `woodColor`, `woodLightColor`, `woodGloss`: colores y brillo del shader de madera (se pasan a `WoodMaterial`).
  - `metalColor`: color de patas y barras.
  - `debugColors`: colores de depuración (materiales llamativos).
  - `showRefs`, `showMarker`: aros/markers de referencia (mismos colores cardinales que la taza).
  - `draggable`, `spin`, `visible`, `position`, `onDragChange`, `onPositionChange`.

- Shader de madera (`WoodMaterial`):
  - Props: `color1` (claro), `color2` (oscuro), `ringScale`, `ringTightness`, `noiseScale`, `noiseAmp`, `grainWarp`, `gloss`.
  - Notas: `toneMapped={false}` para evitar tintes inesperados; mezcla final en espacio lineal.
  - Para oscurecer: usa `color1` y `color2` más cercanos y reduce `gloss`.

- Wiring en `SceneCanvas`:
  - Instancia `Desk` con:
    - `size={[3, 0.08, 1.8]}` (profundidad Z controlada por el tercer valor).
    - `height={0.78}` y `position={deskPos}` (donde `deskPos` es estado para mover/centrar mesa).
    - `onPositionChange={setDeskPos}` para reportar su posición hacia la escena.
  - Panel lateral:
    - Sección “Objetos”: mostrar/ocultar mesa y taza.
    - Sección “Mesa”: toggles de `showRefs` y `showMarker`.
    - Sección “Global”: `debugColors` (aplica a mesa y taza).

- Alineación con la taza (CoffeeCup):
  - La taza se ubica sobre el tablero al montar usando `initialPosition` (en `<CoffeeCup />`):
    - `y = deskPos.y + height + 0.6 + offset` (0.6 = media altura de la taza, `offset` pequeño para evitar clipping).
  - Efectos de la taza (particles/steam/refs/marker) se posicionan con `cupPos[1] + baseY` o `cupPos[1] + rimY` para seguir su altura.

- Física simple de la taza (opcional):
  - `CoffeeCup` acepta `physics`, `floorY`, `deskCenter`, `deskTopY`, `deskSize`, `edgeMargin`.
  - Si `physics` está activo:
    - Mientras arrastras y estás “sobre la mesa”, la Y se pega al tablero.
    - Fuera del área útil (definida por `deskSize` y `edgeMargin`), la taza entra en caída libre hasta `floorY`.

### Patrón para crear un nuevo objeto 3D

1. Crea carpeta `src/components/3d/<tu-objeto>/` con tu componente TSX.
2. Expón props: `debugColors`, `showRefs`, `showMarker`, `draggable`, `visible`, `position`, `onDragChange`, `onPositionChange` (opcional `spin`).
3. Añade refs/markers de depuración con el mismo esquema de colores (rojo X+, azul X-, verde Z+, amarillo Z- y aro cyan en el plano).
4. Exporta en `index.ts` del folder y úsalo en `SceneCanvas.tsx`.
5. Si requiere shader, crea un material propio como `WoodMaterial` y ajústalo con props para no tocar el shader a mano.
