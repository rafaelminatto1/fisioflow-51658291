import React from 'react';
import ProcedureChecklistV1 from './v1-simple/ProcedureChecklistBlock';
import ProcedureChecklistV2 from './v2-improved/ProcedureChecklistBlock';
import ProcedureChecklistV3 from './v3-premium/ProcedureChecklistBlock';

const ChecklistPreview = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-16">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Evolução do Componente Checklist
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            De uma lista simples a uma ferramenta clínica premium com animações e feedback visual.
          </p>
        </header>

        <section className="space-y-8">
          <div className="text-center">
            <span className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full uppercase tracking-widest">
              Versão 1: Minimalista
            </span>
            <h2 className="text-2xl font-bold text-slate-800 mt-2">Simples e Funcional</h2>
          </div>
          <ProcedureChecklistV1 />
        </section>

        <div className="h-px bg-slate-200" />

        <section className="space-y-8">
          <div className="text-center">
            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full uppercase tracking-widest">
              Versão 2: Melhorada
            </span>
            <h2 className="text-2xl font-bold text-slate-800 mt-2">Visual Polido e CRUD</h2>
          </div>
          <ProcedureChecklistV2 />
        </section>

        <div className="h-px bg-slate-200" />

        <section className="space-y-8">
          <div className="text-center">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-widest">
              Versão 3: Premium (Estado da Arte)
            </span>
            <h2 className="text-2xl font-bold text-slate-800 mt-2">Experiência Clínica Imersiva</h2>
            <p className="text-sm text-slate-500 mt-1 italic">
              Drag-and-drop, glassmorphism, confetes e atalhos de teclado.
            </p>
          </div>
          <ProcedureChecklistV3 />
        </section>

        <footer className="pt-12 text-center border-t border-slate-200">
          <p className="text-sm text-slate-400">
            FisioFlow Design System &copy; 2026
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ChecklistPreview;
