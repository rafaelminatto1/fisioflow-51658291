type Env = {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
};

type AssetWorker = {
  fetch(request: Request, env: Env): Promise<Response>;
};

export function getFileExtension(pathname: string): string | null {
  const lastSegment = pathname.split("/").pop() ?? "";
  const lastDot = lastSegment.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === lastSegment.length - 1) return null;
  return lastSegment.slice(lastDot + 1).toLowerCase();
}

export function isAssetRequest(url: URL): boolean {
  if (url.pathname.startsWith("/assets/")) return true;
  return getFileExtension(url.pathname) !== null;
}

/**
 * Returns true for HTML shell requests (navigation or root paths).
 * These should NEVER be cached aggressively because they reference hashed assets.
 */
function isHtmlShellRequest(url: URL): boolean {
  if (url.pathname === "/" || url.pathname === "/index.html") return true;
  const ext = getFileExtension(url.pathname);
  if (ext === "html" || ext === "htm") return true;
  // SPA routes: paths without file extensions that are not asset requests
  if (!ext && !url.pathname.startsWith("/assets/") && !url.pathname.startsWith("/api/")) return true;
  return false;
}

/**
 * Returns true for immutable, content-hashed assets (JS/CSS/fonts/images).
 * These can be cached aggressively because their filename changes on every build.
 */
function isImmutableAsset(url: URL): boolean {
  if (!url.pathname.startsWith("/assets/")) return false;
  // Content-hashed assets have patterns like index-BlYiQUYr.js or vendor-react-XYZ.js
  const basename = url.pathname.split("/").pop() ?? "";
  // If the filename contains a hash (e.g. index-BlYiQUYr.js), it's immutable
  return basename.includes("-") && basename.length > 20;
}

// ============================================================================
// NEON AUTH SAME-ORIGIN PROXY
// Routes `<site>/__neon-auth/*` to the managed Neon Auth (better_auth) backend.
// Purpose: the SPA talks to Neon Auth directly (cross-site), so its session
// cookies (e.g. KEYCLOAK_SESSION, __Secure-neon-auth.session_token) are
// THIRD-PARTY — flagged by Lighthouse and at risk once browsers drop 3p cookies.
// Proxying through our own origin and stripping the `Domain=` attribute makes
// every auth cookie first-party. JWT contents (issuer/JWKS) are untouched, so
// the API's token validation is unaffected.
// ============================================================================
const NEON_AUTH_PREFIX = "/__neon-auth";
const NEON_AUTH_UPSTREAM =
  "https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth";
const NEON_AUTH_UPSTREAM_PATH = "/neondb/auth";

export function isNeonAuthProxyRequest(url: URL): boolean {
  return url.pathname === NEON_AUTH_PREFIX || url.pathname.startsWith(`${NEON_AUTH_PREFIX}/`);
}

/** Drops the `Domain=...` attribute so the cookie is host-only (first-party). */
export function stripCookieDomain(setCookie: string): string {
  return setCookie.replace(/;\s*Domain=[^;]*/gi, "");
}

/** Rewrites an upstream redirect back onto the proxy path when it targets the auth backend. */
export function rewriteAuthLocation(location: string, origin: string): string {
  try {
    const target = new URL(location, NEON_AUTH_UPSTREAM);
    const upstream = new URL(NEON_AUTH_UPSTREAM);
    if (target.origin === upstream.origin && target.pathname.startsWith(NEON_AUTH_UPSTREAM_PATH)) {
      const rest = target.pathname.slice(NEON_AUTH_UPSTREAM_PATH.length);
      return `${origin}${NEON_AUTH_PREFIX}${rest}${target.search}`;
    }
  } catch {
    // not an absolute/parseable URL — leave as-is
  }
  return location;
}

async function proxyNeonAuth(request: Request, url: URL): Promise<Response> {
  // `rest` always starts with "/" (or is empty) and can never contain a scheme,
  // so string concatenation keeps the upstream host fixed — this is not an open proxy.
  const rest = url.pathname.slice(NEON_AUTH_PREFIX.length); // "" | "/get-session" | ...
  const target = `${NEON_AUTH_UPSTREAM}${rest}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  // better_auth validates Origin against trusted_origins for state-changing calls;
  // same-origin GETs omit it, so set it explicitly to our own origin.
  headers.set("origin", url.origin);
  // Preserve the real client IP so better_auth's rate-limiting and audit see the
  // eyeball, not the Cloudflare edge.
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) {
    const fwd = request.headers.get("x-forwarded-for");
    headers.set("x-forwarded-for", fwd ? `${fwd}, ${clientIp}` : clientIp);
  }

  const upstream = await fetch(new Request(target, {
    method: request.method,
    headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
  }));

  const respHeaders = new Headers(upstream.headers);
  respHeaders.set("x-fisioflow-neon-auth-proxy", "true");

  // Strip content-encoding from 307/308 redirects to avoid double-encoding
  if (upstream.status === 307 || upstream.status === 308) {
    const location = respHeaders.get("location");
    if (location) {
      respHeaders.set("location", rewriteAuthLocation(location, url.origin));
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

/**
 * Apply cache-control headers to prevent stale versions from being served.
 * - HTML shell: no-cache, must-revalidate (always revalidate)
 * - Immutable assets: 1 year cache (content-hashed filenames)
 * - Other assets: short cache with revalidation
 */
function applyCacheHeaders(url: URL, response: Response): Response {
  const headers = new Headers(response.headers);

  if (isHtmlShellRequest(url)) {
    // HTML shell must always be revalidated to get the latest asset references
    headers.set("cache-control", "no-cache, no-store, must-revalidate");
    headers.set("pragma", "no-cache");
    headers.set("expires", "0");
    // CDN edge: don't cache HTML either
    headers.set("cdn-cache-control", "no-cache");
    headers.set("cloudflare-cdn-cache-control", "no-cache");
  } else if (isImmutableAsset(url)) {
    // Content-hashed assets are immutable — cache aggressively
    headers.set("cache-control", "public, max-age=31536000, immutable");
    headers.set("cdn-cache-control", "public, max-age=31536000");
    headers.set("cloudflare-cdn-cache-control", "public, max-age=31536000");
  } else if (isAssetRequest(url)) {
    // Other assets (non-hashed): short cache with revalidation
    headers.set("cache-control", "public, max-age=3600, must-revalidate");
    headers.set("cdn-cache-control", "public, max-age=3600");
    headers.set("cloudflare-cdn-cache-control", "public, max-age=3600");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isNeonAuthProxyRequest(url)) return proxyNeonAuth(request, url);

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      // Apply cache-control headers to successful responses
      return applyCacheHeaders(url, response);
    }

    if (isAssetRequest(url)) {
      // Improve 404 responses for assets: ensure proper content-type
      // and detect when HTML is being served as JS/CSS (stale cache issue)
      const contentType = response.headers.get("content-type") ?? "";
      const hasInvalidContentType =
        contentType === "" ||
        (url.pathname.endsWith(".js") && !contentType.includes("javascript")) ||
        (url.pathname.endsWith(".css") && !contentType.includes("css"));

      // Check if response body looks like HTML (indicates fallback SPA being served as asset)
      const bodyMayBeHtml =
        !hasInvalidContentType &&
        (url.pathname.endsWith(".js") || url.pathname.endsWith(".css"));

      if (hasInvalidContentType || bodyMayBeHtml) {
        // Return proper 404 with correct content-type based on file extension
        let correctContentType = "text/plain";
        if (url.pathname.endsWith(".js")) {
          correctContentType = "application/javascript";
        } else if (url.pathname.endsWith(".css")) {
          correctContentType = "text/css";
        }

        // Try to get the actual body to check if it's HTML
        const clone = response.clone();
        const text = await clone.text();
        
        // If body looks like HTML (fallback SPA), treat as hard miss and suggest reload
        if (
          text.trim().startsWith("<!doctype") ||
          text.trim().startsWith("<html") ||
          (text.includes("<head") && text.includes("</head>"))
        ) {
          // Return 404 with special header to trigger client-side reload
          return new Response("Not Found", {
            status: 404,
            headers: {
              "content-type": correctContentType,
              "x-fisioflow-reload-hint": "true", // Signal to client to consider reload
              "cache-control": "no-cache, no-store, must-revalidate",
            },
          });
        }

        // Return proper 404 with correct content-type
        return new Response("Not Found", {
          status: 404,
          headers: {
            "content-type": correctContentType,
            "cache-control": "no-cache, no-store, must-revalidate",
          },
        });
      }

      return applyCacheHeaders(url, response);
    }

    // Log SPA fallback for analytics — helps identify routes not recognized by the SPA router
    // In production, this fires for legitimate deep links (e.g. /patients/123) AND broken routes
    const indexUrl = new URL("/", url.origin);
    const spaResponse = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    // Add header so client can detect fallback happened
    const respHeaders = new Headers(spaResponse.headers);
    respHeaders.set("x-fisioflow-spa-fallback", "true");
    respHeaders.set("x-fisioflow-original-path", url.pathname);
    // Apply cache headers to the HTML shell we just fetched
    return applyCacheHeaders(indexUrl, new Response(spaResponse.body, {
      status: spaResponse.status,
      statusText: spaResponse.statusText,
      headers: respHeaders,
    }));
  },
} satisfies AssetWorker;
