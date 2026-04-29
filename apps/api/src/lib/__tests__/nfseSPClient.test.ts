import { describe, expect, it } from "vitest";
import { hasSPCertConfig } from "../nfseSPClient";

describe("hasSPCertConfig", () => {
  it("returns false when any certificate input is missing", () => {
    expect(hasSPCertConfig({} as any)).toBe(false);
    expect(hasSPCertConfig({ NFSE_SP_CERT: { fetch: async () => new Response() } } as any)).toBe(
      false,
    );
    expect(
      hasSPCertConfig({
        NFSE_SP_CERT: { fetch: async () => new Response() },
        NFSE_SP_CERT_PEM: "cert",
      } as any),
    ).toBe(false);
  });

  it("returns true when mTLS binding and signing PEM secrets are present", () => {
    expect(
      hasSPCertConfig({
        NFSE_SP_CERT: { fetch: async () => new Response() },
        NFSE_SP_CERT_PEM: "cert",
        NFSE_SP_KEY_PEM: "key",
      } as any),
    ).toBe(true);
  });
});

