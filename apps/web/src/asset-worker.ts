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

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    if (isAssetRequest(url)) return response;

    const indexUrl = new URL("/", url.origin);
    return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  },
} satisfies AssetWorker;
