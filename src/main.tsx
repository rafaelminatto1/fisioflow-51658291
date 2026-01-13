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

// Global Chunk Load Error Handler for Vite
window.addEventListener('vite:preloadError', (event) => {
  console.error('Vite preload error detected:', event);
  // Reloading the page to fetch the latest deployment
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DataProvider>
      <App />
      <Analytics />
      <SpeedInsights />
    </DataProvider>
  </StrictMode>
);
