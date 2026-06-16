import { describe, it, expect, vi } from "vitest";
import { fetchOpenAccessFullText } from "../sources/europepmc";

describe("fetchOpenAccessFullText", () => {
  it("returns text when OA full text exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<article>full text body</article>", { status: 200 })));
    const txt = await fetchOpenAccessFullText("PMC123");
    expect(txt).toContain("full text body");
  });
  it("returns null on 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    expect(await fetchOpenAccessFullText("PMC404")).toBeNull();
  });
  it("returns null when no pmcId", async () => {
    expect(await fetchOpenAccessFullText(null)).toBeNull();
  });
});
