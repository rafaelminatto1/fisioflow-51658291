import { lazy, Suspense, useEffect, useState } from "react";

/**
 * AICommandBar — paleta de comandos global (Cmd/Ctrl+K).
 *
 * O shell mantém apenas o listener de teclado + estado de abertura. O painel
 * pesado (cmdk + ai/react + framer-motion) é carregado sob demanda na primeira
 * vez que o usuário abre a barra, mantendo essas deps fora do bundle inicial
 * carregado em toda rota autenticada.
 */
const AICommandBarPanel = lazy(() => import("./AICommandBarPanel"));

export function AICommandBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <AICommandBarPanel onClose={() => setOpen(false)} />
    </Suspense>
  );
}
