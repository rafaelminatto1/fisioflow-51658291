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

    // Without a `window` (node test env) the same-origin proxy path is returned
    // verbatim; in the browser it is resolved against window.location.origin.
    expect(getNeonAuthUrl()).toBe(DEFAULT_PRODUCTION_NEON_AUTH_URL);
    expect(isNeonAuthConfigured()).toBe(true);
  });

  it("stays disabled outside production when the env is missing", () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_NEON_AUTH_URL", "");

    expect(getNeonAuthUrl()).toBeUndefined();
    expect(isNeonAuthConfigured()).toBe(false);
  });
});
