/**
 * O fluxo de atualização do service worker agora é centralizado em
 * `useServiceWorkerUpdate`, acionado no shell principal da aplicação.
 * Este componente permanece como no-op para evitar reintroduzir
 * um segundo fluxo de registro baseado em `virtual:pwa-register`.
 */

export function PWAUpdatePrompt() {
  return null;
}
