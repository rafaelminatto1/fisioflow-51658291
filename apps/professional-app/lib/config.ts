/**
 * App Configuration
 * Controls feature flags and API behavior
 */

export const config = {
  // API mode configuration
  useCloudFunctions: true, // Using Cloudflare Worker APIs

  // Cloudflare Worker API Configuration
  apiUrl: (function () {
    // EXPO_PUBLIC_API_URL é definido por perfil no eas.json e manda sempre.
    // O domínio custom api-pro.moocafisio.com.br é o destino de produção.
    const defaultWorkerUrl = "https://fisioflow-api.rafalegollas.workers.dev";
    const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

    return envUrl && envUrl.length > 0 ? envUrl.replace(/\/+$/, "") : defaultWorkerUrl;
  })(),

  // Feature flags
  enablePushNotifications: true, // Enabled via Cloudflare Worker + Expo Push
  enableBiometrics: true,
  enableOfflineMode: true,
} as const;
