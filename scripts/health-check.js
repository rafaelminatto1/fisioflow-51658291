const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS ?? 5000);

const frontendUrl = process.env.HEALTH_FRONTEND_URL ?? "https://fisioflow.pages.dev";
const configuredApiBase =
  process.env.HEALTH_API_URL ??
  process.env.VITE_WORKERS_API_URL ??
  "https://fisioflow-api.rafalegollas.workers.dev";

const apiHealthUrl = configuredApiBase.endsWith("/api/health")
  ? configuredApiBase
  : `${configuredApiBase.replace(/\/$/, "")}/api/health`;

const endpoints = [
  { name: "Frontend", url: frontendUrl },
  { name: "API Health", url: apiHealthUrl },
];

async function checkEndpoint(endpoint) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(endpoint.url, {
      method: "GET",
      signal: controller.signal,
    });

    const durationMs = Date.now() - startedAt;
    if (response.status >= 200 && response.status < 400) {
      console.log(`OK | ${endpoint.name}: ${response.status} (${durationMs}ms)`);
      return true;
    }

    console.error(`FAIL | ${endpoint.name}: ${response.status} - ${endpoint.url}`);
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL | ${endpoint.name}: ${message}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function run() {
  console.log("FisioFlow Health Check");

  const results = await Promise.all(endpoints.map(checkEndpoint));
  const success = results.every(Boolean);

  if (success) {
    console.log("Resultado: todos os checks passaram.");
    process.exit(0);
  }

  console.error("Resultado: há checks com falha.");
  process.exit(1);
}

run();
