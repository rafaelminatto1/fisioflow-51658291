import { describe, expect, it, vi } from "vitest";

const getWorkersApiUrlMock = vi.fn();

vi.mock("@/lib/api/config", () => ({
  getWorkersApiUrl: () => getWorkersApiUrlMock(),
}));

describe("getOptimizedImageUrl", () => {
  it("retorna vazio quando a key não existe", async () => {
    getWorkersApiUrlMock.mockReturnValue("https://workers.example.com");
    const { getOptimizedImageUrl } = await import("../images");

    expect(getOptimizedImageUrl("")).toBe("");
  });

  it("monta a URL com transformações para key interna", async () => {
    getWorkersApiUrlMock.mockReturnValue("https://workers.example.com");
    const { getOptimizedImageUrl } = await import("../images");

    expect(
      getOptimizedImageUrl("pacientes/foto.jpg", {
        width: 320,
        height: 240,
        fit: "cover",
        quality: 80,
      }),
    ).toBe(
      "https://workers.example.com/api/exercise-image/pacientes/foto.jpg?w=320&h=240&fit=cover&q=80",
    );
  });

  it("faz encode de URL externa usada como key", async () => {
    getWorkersApiUrlMock.mockReturnValue("https://workers.example.com");
    const { getOptimizedImageUrl } = await import("../images");

    expect(getOptimizedImageUrl("https://cdn.example.com/file name.png")).toBe(
      "https://workers.example.com/api/exercise-image/https%3A%2F%2Fcdn.example.com%2Ffile%20name.png",
    );
  });
});
