import React from 'react';
import { SceneCanvas } from '../components/SceneCanvas';

export const Home: React.FC = () => {
  return (
    <main className="w-full h-screen flex flex-col">
      <header className="container-padded py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">mi Portafolio</h1>
        <nav className="text-sm opacity-70">Boceto inicial</nav>
      </header>
      <section className="flex-1 grid md:grid-cols-2">
        <div className="flex flex-col gap-6 justify-center container-padded order-2 md:order-1 py-12">
          <span className="text-brand-400 font-medium">Hola, soy</span>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">Sebastian Peraza Desanti</h2>
          <p className="text-neutral-400 max-w-prose">
            Este es un boceto inicial de mi portafolio. aqui todo es lamentable en este momento,
            pronto quedara hermoso.
          </p>
          <div className="flex gap-3">
            <button className="bg-brand-500 hover:bg-brand-400 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors">
              sea sapa
            </button>
            <button className="border border-brand-500 text-brand-400 hover:bg-brand-500/10 px-5 py-2 rounded-md text-sm font-medium transition-colors">
              que paaaa
            </button>
          </div>
        </div>
        <div className="relative order-1 md:order-2">
          <SceneCanvas />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-neutral-950/60 to-transparent" />
        </div>
      </section>
      <footer className="text-xs text-neutral-500 py-4 text-center">
        © {new Date().getFullYear()} Un cafe y a trabajar.
      </footer>
    </main>
  );
};
