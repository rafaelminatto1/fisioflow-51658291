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

// Registrar Service Worker do VitePWA com auto-update
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        type: 'classic'
      });

      // Verificar atualizações periodicamente
      setInterval(() => {
        registration.update();
      }, 60 * 1000); // Verificar a cada minuto

      // Forçar atualização imediata ao detectar nova versão
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível, recarregar página
              console.log('Nova versão disponível, recarregando...');
              window.location.reload();
            }
          });
        }
      });

      console.log('Service Worker registrado com sucesso:', registration);
    } catch (error) {
      console.error('Falha ao registrar Service Worker:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DataProvider>
      <App />
      <Analytics />
      <SpeedInsights />
    </DataProvider>
  </StrictMode>
);
