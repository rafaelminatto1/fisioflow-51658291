import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DataProvider } from "@/contexts/DataContext";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/lib/sentry/config";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Inicializar Sentry antes de renderizar a aplicação
initSentry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DataProvider>
      <App />
      <Analytics />
      <SpeedInsights />
    </DataProvider>
  </StrictMode>
);
