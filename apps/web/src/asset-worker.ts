type Env = {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
};

type AssetWorker = {
  fetch(request: Request, env: Env): Promise<Response>;
};

function getFileExtension(pathname: string): string | null {
  const lastSegment = pathname.split("/").pop() ?? "";
  const lastDot = lastSegment.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === lastSegment.length - 1) return null;
  return lastSegment.slice(lastDot + 1).toLowerCase();
}

function isAssetRequest(url: URL): boolean {
  if (url.pathname.startsWith("/assets/")) return true;
  return getFileExtension(url.pathname) !== null;
}

function isSpaNavigation(request: Request, url: URL): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (isAssetRequest(url)) return false;
  if (request.method === "HEAD") return true;

  const accept = request.headers.get("Accept") ?? "";
  return accept.includes("text/html");
}

function getSpaIndexRequest(request: Request, origin: string): Request {
  const indexUrl = new URL("/", origin);
  return new Request(indexUrl.toString(), request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (isSpaNavigation(request, url)) {
      return env.ASSETS.fetch(getSpaIndexRequest(request, url.origin));
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    if (isAssetRequest(url)) {
      return response;
    }

    return env.ASSETS.fetch(getSpaIndexRequest(request, url.origin));
  },
} satisfies AssetWorker;
