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

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    body: hasBody ? request.body : undefined,
  };
  if (hasBody) init.duplex = "half";

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return new Response(JSON.stringify({ error: "auth_upstream_unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  const respHeaders = new Headers(upstream.headers);
  respHeaders.delete("set-cookie");
  for (const cookie of upstream.headers.getSetCookie()) {
    respHeaders.append("set-cookie", stripCookieDomain(cookie));
  }
  const location = respHeaders.get("location");
  if (location) respHeaders.set("location", rewriteAuthLocation(location, url.origin));

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isNeonAuthProxyRequest(url)) return proxyNeonAuth(request, url);

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

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

      return response;
    }

    // Log SPA fallback for analytics — helps identify routes not recognized by the SPA router
    // In production, this fires for legitimate deep links (e.g. /patients/123) AND broken routes
    const indexUrl = new URL("/", url.origin);
    const spaResponse = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    // Add header so client can detect fallback happened
    const respHeaders = new Headers(spaResponse.headers);
    respHeaders.set("x-fisioflow-spa-fallback", "true");
    respHeaders.set("x-fisioflow-original-path", url.pathname);
    return new Response(spaResponse.body, {
      status: spaResponse.status,
      statusText: spaResponse.statusText,
      headers: respHeaders,
    });
  },
} satisfies AssetWorker;
