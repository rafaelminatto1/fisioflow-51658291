import { describe, expect, it } from "vitest";
import { getFileExtension, isAssetRequest } from "../asset-worker";

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
});
