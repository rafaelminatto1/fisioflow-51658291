import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PRODUCTION_NEON_AUTH_URL, getNeonAuthUrl, isNeonAuthConfigured } from "../neon";

describe("Neon config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the explicit environment variable when it exists", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_NEON_AUTH_URL", "https://custom.neonauth.aws.neon.tech/neondb/auth/");

    expect(getNeonAuthUrl()).toBe("https://custom.neonauth.aws.neon.tech/neondb/auth");
    expect(isNeonAuthConfigured()).toBe(true);
  });

  it("falls back to the same-origin proxy in production when the build env is missing", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_NEON_AUTH_URL", "");

    // No browser (jsdom aqui) o path do proxy same-origin é resolvido contra
    // window.location.origin; o path cru é o default de produção.
    expect(getNeonAuthUrl()).toBe(`${window.location.origin}${DEFAULT_PRODUCTION_NEON_AUTH_URL}`);
    expect(isNeonAuthConfigured()).toBe(true);
  });

  it("stays disabled outside production when the env is missing", () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_NEON_AUTH_URL", "");

    expect(getNeonAuthUrl()).toBeUndefined();
    expect(isNeonAuthConfigured()).toBe(false);
  });
});
