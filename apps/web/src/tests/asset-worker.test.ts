import { describe, expect, it } from "vitest";
import {
  getFileExtension,
  isAssetRequest,
  isNeonAuthProxyRequest,
  rewriteAuthLocation,
  stripCookieDomain,
} from "../asset-worker";

describe("asset-worker helpers", () => {
  describe("getFileExtension", () => {
    it("returns the file extension in lowercase", () => {
      expect(getFileExtension("/assets/main.JS")).toBe("js");
      expect(getFileExtension("/style.css")).toBe("css");
      expect(getFileExtension("/path/to/file.HTML")).toBe("html");
    });

    it("returns null for paths without extensions", () => {
      expect(getFileExtension("/dashboard")).toBeNull();
      expect(getFileExtension("/patients/123")).toBeNull();
      expect(getFileExtension("/")).toBeNull();
    });

    it("returns null for dotfiles or trailing dots", () => {
      expect(getFileExtension("/.env")).toBeNull();
      expect(getFileExtension("/file.")).toBeNull();
    });
  });

  describe("isAssetRequest", () => {
    it("identifies /assets/ paths as assets", () => {
      expect(isAssetRequest(new URL("http://localhost/assets/logo.svg"))).toBe(true);
      expect(isAssetRequest(new URL("http://localhost/assets/fonts/inter.woff2"))).toBe(true);
    });

    it("identifies paths with file extensions as assets", () => {
      expect(isAssetRequest(new URL("http://localhost/bundle.js"))).toBe(true);
      expect(isAssetRequest(new URL("http://localhost/styles/main.css"))).toBe(true);
    });

    it("does not treat SPA paths as assets", () => {
      expect(isAssetRequest(new URL("http://localhost/dashboard"))).toBe(false);
      expect(isAssetRequest(new URL("http://localhost/patients/123"))).toBe(false);
      expect(isAssetRequest(new URL("http://localhost/api/data"))).toBe(false);
    });
  });

  describe("isNeonAuthProxyRequest", () => {
    it("matches the proxy prefix and its sub-paths", () => {
      expect(isNeonAuthProxyRequest(new URL("https://x/__neon-auth"))).toBe(true);
      expect(isNeonAuthProxyRequest(new URL("https://x/__neon-auth/get-session"))).toBe(true);
      expect(isNeonAuthProxyRequest(new URL("https://x/__neon-auth/sign-in/email"))).toBe(true);
    });

    it("does not match unrelated paths", () => {
      expect(isNeonAuthProxyRequest(new URL("https://x/dashboard"))).toBe(false);
      expect(isNeonAuthProxyRequest(new URL("https://x/__neon-auth-other"))).toBe(false);
      expect(isNeonAuthProxyRequest(new URL("https://x/api/__neon-auth"))).toBe(false);
    });
  });

  describe("stripCookieDomain", () => {
    it("removes the Domain attribute, keeping the rest first-party", () => {
      expect(
        stripCookieDomain(
          "__Secure-neon-auth.session_token=abc; Path=/; Domain=ep-x.neonauth.aws.neon.tech; Secure; HttpOnly; SameSite=None",
        ),
      ).toBe("__Secure-neon-auth.session_token=abc; Path=/; Secure; HttpOnly; SameSite=None");
    });

    it("is a no-op when there is no Domain attribute", () => {
      expect(stripCookieDomain("KEYCLOAK_SESSION=v; Path=/; Secure")).toBe(
        "KEYCLOAK_SESSION=v; Path=/; Secure",
      );
    });
  });

  describe("rewriteAuthLocation", () => {
    const origin = "https://www.moocafisio.com.br";

    it("rewrites upstream auth redirects onto the proxy path", () => {
      expect(
        rewriteAuthLocation(
          "https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth/callback?x=1",
          origin,
        ),
      ).toBe(`${origin}/__neon-auth/callback?x=1`);
    });

    it("leaves third-party (OAuth provider) redirects untouched", () => {
      const google = "https://accounts.google.com/o/oauth2/auth?client_id=1";
      expect(rewriteAuthLocation(google, origin)).toBe(google);
    });
  });
});
