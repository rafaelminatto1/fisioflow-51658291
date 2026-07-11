import { describe, it, expect, vi } from "vitest";
import { fetchOpenAccessFullText, xmlToPlainText } from "../sources/europepmc";

describe("xmlToPlainText", () => {
  it("strips tags, decodes entities and collapses whitespace", () => {
    const xml = `<article><front><title>Ti&amp;tle</title></front>
      <body><sec><p>First   paragraph.</p><p>Second &lt;p&gt;.</p></sec></body></article>`;
    const txt = xmlToPlainText(xml);
    expect(txt).toContain("Ti&tle");
    expect(txt).toContain("First paragraph.");
    expect(txt).toContain("Second <p>.");
    expect(txt).not.toContain("<sec>");
  });
  it("drops non-content sections like references", () => {
    const xml = `<article><body><p>Real text</p></body><back><ref-list><ref>Doe J et al</ref></ref-list></back></article>`;
    const txt = xmlToPlainText(xml);
    expect(txt).toContain("Real text");
    expect(txt).not.toContain("Doe J et al");
  });
});

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
