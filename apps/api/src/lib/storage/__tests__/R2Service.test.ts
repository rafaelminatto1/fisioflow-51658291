import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSignedUrl = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(function S3Client() {
    return {};
  }),
  GetObjectCommand: vi.fn(function GetObjectCommand(input) {
    return { input };
  }),
  PutObjectCommand: vi.fn(function PutObjectCommand(input) {
    return { input };
  }),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn((...args) => mockGetSignedUrl(...args)),
}));

const env = {
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "access",
  R2_SECRET_ACCESS_KEY: "secret",
  MEDIA_BUCKET: { toString: () => "bucket" },
} as any;

describe("R2Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue("https://signed.example.com");
  });

  it("uses a 15 minute default TTL for protected download URLs", async () => {
    const { R2Service } = await import("../R2Service");
    const service = new R2Service(env);

    await service.getDownloadUrl("orgs/org/patients/p/documents/file.pdf");

    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 900,
    });
  });

  it("caps protected download URLs at one hour", async () => {
    const { R2Service } = await import("../R2Service");
    const service = new R2Service(env);

    await service.getDownloadUrl("orgs/org/patients/p/documents/file.pdf", 86400);

    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 3600,
    });
  });
});

