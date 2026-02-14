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

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^http?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /moocafisio\.com\.br$/,
  /fisioflow\.web\.app$/,
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
  const allowOrigin = origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))
    ? origin
    : '*';

  const headers: [string, string][] = [
    ['Access-Control-Allow-Origin', allowOrigin],
    ['Access-Control-Allow-Methods', 'GET, POST, OPTIONS'],
    ['Access-Control-Allow-Headers', 'Content-Type, Authorization'],
    ['Access-Control-Max-Age', '86400'],
  ];
  const resAny = res as ResponseLike & { setHeader?(name: string, value: string): unknown };
  for (const [name, value] of headers) {
    if (typeof resAny.setHeader === 'function') {
      resAny.setHeader(name, value);
    } else {
      res.set(name, value);
    }
  }
}
