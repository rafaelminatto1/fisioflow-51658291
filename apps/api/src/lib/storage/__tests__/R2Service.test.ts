import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn().mockResolvedValue({});
const mockGetSignedUrl = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(function S3Client() {
    return { send: mockSend };
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

vi.mock("../../analytics", () => ({
  writeEvent: vi.fn(),
}));

const env = {
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "access",
  R2_SECRET_ACCESS_KEY: "secret",
  MEDIA_BUCKET: { toString: () => "bucket" },
  ANALYTICS: { writeDataPoint: vi.fn() },
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

  it("caps AI temp download URLs at 5 minutes", async () => {
    const { R2Service } = await import("../R2Service");
    const service = new R2Service(env);

    await service.getDownloadUrl("tmp/ai/org1/req1/result.json", 900);

    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 300,
    });
  });

  it("emits audit event on download URL creation", async () => {
    const { writeEvent } = await import("../../analytics");
    const { R2Service } = await import("../R2Service");
    const service = new R2Service(env);

    await service.getDownloadUrl("orgs/org/patients/p/images/scan.jpg");

    expect(writeEvent).toHaveBeenCalledWith(
      env,
      expect.objectContaining({
        event: "r2_download_url_created",
      }),
    );
  });

  it("emits audit event on upload URL creation", async () => {
    const { writeEvent } = await import("../../analytics");
    const { R2Service } = await import("../R2Service");
    const service = new R2Service(env);

    await service.getUploadUrl("orgs/org/patients/p/documents/report.pdf");

    expect(writeEvent).toHaveBeenCalledWith(
      env,
      expect.objectContaining({
        event: "r2_upload_url_created",
      }),
    );
  });

  it("includes storage class metadata on file upload", async () => {
    const { R2Service } = await import("../R2Service");
    const service = new R2Service(env);

    await service.uploadFile(
      "orgs/org1/patients/p1/documents/report.pdf",
      new Uint8Array([1, 2, 3]),
      "application/pdf",
      "report.pdf",
      { organizationId: "org1", patientId: "p1", sourceFeature: "evolution" },
    );

    expect(mockSend).toHaveBeenCalled();
    const putCommand = (await import("@aws-sdk/client-s3")).PutObjectCommand as any;
    const lastCall = putCommand.mock.calls[putCommand.mock.calls.length - 1][0];
    expect(lastCall.Metadata).toEqual(
      expect.objectContaining({
        contentClass: "clinical_document",
        retentionClass: "legal_clinical",
        phi: "true",
        organizationId: "org1",
        patientId: "p1",
        sourceFeature: "evolution",
      }),
    );
  });

  it("emits audit event on file upload", async () => {
    const { writeEvent } = await import("../../analytics");
    const { R2Service } = await import("../R2Service");
    const service = new R2Service(env);

    await service.uploadFile(
      "orgs/org1/patients/p1/images/photo.jpg",
      new Uint8Array([1]),
      "image/jpeg",
      undefined,
      { organizationId: "org1" },
    );

    expect(writeEvent).toHaveBeenCalledWith(
      env,
      expect.objectContaining({
        event: "r2_file_uploaded",
        orgId: "org1",
      }),
    );
  });

  it("defaults to clinical_document storage class for unrecognized keys", async () => {
    const { R2Service } = await import("../R2Service");
    const service = new R2Service(env);

    await service.uploadFile("unknown/path/file.bin", new Uint8Array([1]), "application/octet-stream");

    const putCommand = (await import("@aws-sdk/client-s3")).PutObjectCommand as any;
    const lastCall = putCommand.mock.calls[putCommand.mock.calls.length - 1][0];
    expect(lastCall.Metadata.contentClass).toBe("clinical_document");
  });
});
