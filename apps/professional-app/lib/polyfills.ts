// Polyfills para React Native
// Carregar este arquivo no topo do _layout.tsx
// IMPORTANTE: Não exportar nada para evitar que o Expo Router tente usar como rota

// Polyfill para fetch global (necessário para expo-notifications)
const runtimeGlobal = globalThis as typeof globalThis & {
  fetch?: typeof fetch;
  Request?: typeof Request;
  Response?: typeof Response;
  Headers?: typeof Headers;
};

if (typeof runtimeGlobal.fetch === "undefined") {
  // React Native 0.81+ tem fetch nativo em self
  if (typeof self !== "undefined" && (self as any).fetch) {
    runtimeGlobal.fetch = (self as any).fetch;
    runtimeGlobal.Request = (self as any).Request;
    runtimeGlobal.Response = (self as any).Response;
    runtimeGlobal.Headers = (self as any).Headers;
  }
}

console.log("Polyfills loaded, fetch available:", typeof runtimeGlobal.fetch);

// Não exportar nada - este arquivo é apenas para side effects
