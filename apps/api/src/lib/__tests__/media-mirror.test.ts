import { afterEach, describe, expect, it, vi } from "vitest";
import { extFromContentType, mirrorToR2 } from "../media-mirror";

describe("extFromContentType", () => {
  it("maps common types", () => {
    expect(extFromContentType("image/jpeg")).toBe(".jpg");
    expect(extFromContentType("image/png")).toBe(".png");
    expect(extFromContentType("audio/ogg; codecs=opus")).toBe(".ogg");
    expect(extFromContentType("application/pdf")).toBe(".pdf");
    expect(extFromContentType("video/mp4")).toBe(".mp4");
  });
  it("returns empty for unknown", () => {
    expect(extFromContentType("application/x-weird")).toBe("");
  });
});

function makeEnv(putSpy: any) {
  return {
    MEDIA_BUCKET: { put: putSpy },
    R2_PUBLIC_URL: "https://media.moocafisio.com.br",
  } as any;
}

describe("mirrorToR2", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("downloads the source and stores it in R2, returning the public URL", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    );

    const url = await mirrorToR2(makeEnv(put), "https://lookaside.fbsbx.com/x", "crm/wa");

    expect(put).toHaveBeenCalledTimes(1);
    const key = put.mock.calls[0][0] as string;
    expect(key.startsWith("crm/wa/")).toBe(true);
    expect(key.endsWith(".jpg")).toBe(true);
    expect(url).toBe(`https://media.moocafisio.com.br/${key}`);
  });

  it("falls back to the source URL when the download fails", async () => {
    const put = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, headers: { get: () => null } }));

    const url = await mirrorToR2(makeEnv(put), "https://lookaside.fbsbx.com/expired", "crm/wa");

    expect(put).not.toHaveBeenCalled();
    expect(url).toBe("https://lookaside.fbsbx.com/expired");
  });

  it("does not re-mirror a URL already on the R2 public domain", async () => {
    const put = vi.fn();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const existing = "https://media.moocafisio.com.br/crm/wa/abc.jpg";
    const url = await mirrorToR2(makeEnv(put), existing, "crm/wa");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(url).toBe(existing);
  });

  it("returns the source URL when R2 is not configured", async () => {
    const url = await mirrorToR2({} as any, "https://lookaside.fbsbx.com/x", "crm/wa");
    expect(url).toBe("https://lookaside.fbsbx.com/x");
  });
});
