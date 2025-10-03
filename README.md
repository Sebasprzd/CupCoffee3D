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
