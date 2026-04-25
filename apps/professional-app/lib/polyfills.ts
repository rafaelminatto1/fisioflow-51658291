// Polyfills para React Native
// Carregar este arquivo no topo do _layout.tsx
// IMPORTANTE: Não exportar nada para evitar que o Expo Router tente usar como rota

// Polyfill para fetch global (necessário para expo-notifications)
if (typeof global.fetch === "undefined") {
  // React Native 0.81+ tem fetch nativo em self
  if (typeof self !== "undefined" && (self as any).fetch) {
    (global as any).fetch = (self as any).fetch;
    (global as any).Request = (self as any).Request;
    (global as any).Response = (self as any).Response;
    (global as any).Headers = (self as any).Headers;
  }
}

console.log("Polyfills loaded, fetch available:", typeof global.fetch);

// Não exportar nada - este arquivo é apenas para side effects
