/**
 * CORS helpers for HTTP handlers
 * Centralized CORS header logic for Cloud Functions
 */

export interface ResponseLike {
  set: (name: string, value: string) => unknown;
}

export interface RequestLike {
  headers?: {
    origin?: string;
    Origin?: string;
  };
}

// Static list of allowed origins for Cloud Functions options
export const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8083',
  'http://localhost:8084',
  'http://localhost:8085',
  'http://localhost:8086',
  'http://localhost:8087',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8083',
  'http://127.0.0.1:8084',
  'http://127.0.0.1:8085',
  'http://127.0.0.1:8086',
  'http://127.0.0.1:8087',
  'http://127.0.0.1:5174',
  'https://fisioflow-migration.web.app',
  'https://fisioflow.web.app',
  'https://fisioflow-professional.web.app',
  'https://moocafisio.com.br',
  'https://www.moocafisio.com.br',
];

export const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^http?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /moocafisio\.com\.br$/,
  /fisioflow\.web\.app$/,
  /fisioflow-professional\.web\.app$/,
];

/**
 * Set CORS headers on response.
 * When req is provided, reflects Origin if it matches allowed patterns; otherwise uses '*'.
 * Uses setHeader when available (Node/Cloud Run) for reliable CORS on preflight.
 */
export function setCorsHeaders(
  res: ResponseLike,
  req?: RequestLike
): void {
  const origin = req?.headers?.origin || req?.headers?.Origin;
  let allowOrigin = '*';

  // Strict origin check for credentials support
  if (origin) {
    if (CORS_ORIGINS.includes(origin)) {
      allowOrigin = origin;
    } else if (ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) {
      allowOrigin = origin;
    }
  }

  const headers: [string, string][] = [
    ['Access-Control-Allow-Origin', allowOrigin],
    ['Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH'],
    ['Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, sentry-trace, baggage'],
    ['Access-Control-Max-Age', '86400'],
  ];

  // Only allow credentials if origin is specific (not *)
  if (allowOrigin !== '*') {
    headers.push(['Access-Control-Allow-Credentials', 'true']);
  }

  const resAny = res as ResponseLike & { setHeader?(name: string, value: string): unknown };
  for (const [name, value] of headers) {
    if (typeof resAny.setHeader === 'function') {
      resAny.setHeader(name, value);
    } else {
      res.set(name, value);
    }
  }
}
