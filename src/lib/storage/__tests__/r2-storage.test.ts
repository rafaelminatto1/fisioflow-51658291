import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getNeonAccessTokenMock = vi.fn();
const getWorkersApiUrlMock = vi.fn();
const normalizePublicStorageUrlMock = vi.fn((url: string) => url);

vi.mock("@/lib/auth/neon-token", () => ({
  getNeonAccessToken: (...args: unknown[]) => getNeonAccessTokenMock(...args),
}));

vi.mock("@/lib/api/config", () => ({
  getWorkersApiUrl: () => getWorkersApiUrlMock(),
}));

vi.mock("../public-url", () => ({
  normalizePublicStorageUrl: (url: string) => normalizePublicStorageUrlMock(url),
}));

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];

  upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 200;
  headers: Record<string, string> = {};
  method?: string;
  url?: string;
  body?: unknown;

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  send(body: unknown) {
    this.body = body;
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: 5,
      total: 10,
    } as ProgressEvent);
    queueMicrotask(() => this.onload?.());
  }
}

describe("r2-storage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    MockXMLHttpRequest.instances = [];
    getNeonAccessTokenMock.mockResolvedValue("jwt-token");
    getWorkersApiUrlMock.mockReturnValue("https://workers.example.com");
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest as unknown as typeof XMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploadToR2 solicita URL assinada e envia PUT com progresso", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            uploadUrl: "https://upload.example.com/signed",
            publicUrl: "https://media.example.com/file.png",
            key: "patients/file.png",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const onProgress = vi.fn();
    const { uploadToR2 } = await import("../r2-storage");
    const file = new File(["hello"], "file.png", { type: "image/png" });

    const result = await uploadToR2(file, "patients", { onProgress });

    expect(fetch).toHaveBeenCalledWith(
      "https://workers.example.com/api/media/upload-url",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer jwt-token",
          "Content-Type": "application/json",
        },
      }),
    );
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(MockXMLHttpRequest.instances[0]).toMatchObject({
      method: "PUT",
      url: "https://upload.example.com/signed",
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    expect(result).toMatchObject({
      url: "https://media.example.com/file.png",
      publicUrl: "https://media.example.com/file.png",
      key: "patients/file.png",
      name: "file.png",
      contentType: "image/png",
    });
  });

  it("deleteFromR2 faz encode da key e envia DELETE autenticado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { deleteFromR2 } = await import("../r2-storage");

    await expect(deleteFromR2("patients/user 1/file.png")).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith(
      "https://workers.example.com/api/media/patients%2Fuser%201%2Ffile.png",
      expect.objectContaining({
        method: "DELETE",
        headers: {
          Authorization: "Bearer jwt-token",
        },
      }),
    );
  });

  it("surfaceia erro útil quando a API rejeita a URL de upload", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "forbidden folder" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { uploadToR2 } = await import("../r2-storage");
    const file = new File(["hello"], "file.png", { type: "image/png" });

    await expect(uploadToR2(file, "patients")).rejects.toThrow("forbidden folder");
  });
});
