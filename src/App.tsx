import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { AppProviders, useAppRuntime } from "@/app/AppRuntime";
import { fisioLogger as logger } from "@/lib/errors/logger";

const App = () => {
  useAppRuntime("App");

  // Global 404/route monitoring via popstate and performance observer
  useEffect(() => {
    const logNavigation = () => {
      const pathname = window.location.pathname;
      console.log(
        `%c[FisioFlow Route] ${pathname}`,
        "color: #0ea5e9; font-weight: bold;",
        { search: location.search },
      );

      // Known route prefixes for 404 detection
      const knownPrefixes = [
        "/", "/dashboard", "/welcome", "/auth", "/pre-cadastro",
        "/feedback-pre-cadastro", "/pending-approval", "/privacidade", "/privacy",
        "/pacientes", "/patients", "/patient-evolution", "/patient-evolution-report",
        "/session-evolution", "/financial", "/financeiro", "/agenda", "/schedule",
        "/exercises", "/exercicios", "/protocols", "/templates", "/automacoes",
        "/crm-whatsapp", "/whatsapp", "/analytics", "/ai-hub", "/telemedicine",
        "/settings", "/profile", "/organization", "/admin", "/base-conhecimento",
        "/evolucao-clinica", "/avaliacao-inicial", "/eventos",
        "/tarefas", "/cadastros", "/communications", "/reports", "/goals",
        "/prescricoes", "/agendar", "/satisfacao", "/checkin", "/assinar",
        "/nps", "/install", "/seed-data", "/error", "/inteligencia",
        "/biomechanics", "/clinical", "/computer-vision", "/augmented-reality",
        "/boards", "/gamification", "/enterprise", "/marketing",
      ];

      const isKnown = knownPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );

      if (!isKnown) {
        console.warn(
          `%c[FisioFlow 404 Detect] Rota nao reconhecida: ${pathname}`,
          "color: #f59e0b; font-weight: bold; font-size: 13px;",
          { fullPath: pathname + location.search },
        );
        logger.warn("Unrecognized route accessed", {
          pathname,
          search: location.search,
        }, "App");
      }
    };

    logNavigation();
    window.addEventListener("popstate", logNavigation);
    return () => window.removeEventListener("popstate", logNavigation);
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
};

export default App;
