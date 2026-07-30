import { describe, expect, it } from "vitest";
import { sanitizeNoteHtml } from "../../routes/notes";

describe("notes HTML security", () => {
  it("remove scripts, event handlers and javascript URLs", () => {
    const sanitized = sanitizeNoteHtml(`<p onclick="alert(1)">ok</p><script>alert(2)</script><a href="javascript:alert(3)">link</a>`);
    expect(sanitized).not.toMatch(/script|onclick|javascript/i);
    expect(sanitized).toContain("ok");
  });

  it("rejects non-string payloads", () => {
    expect(sanitizeNoteHtml({ html: "<script>" })).toBeNull();
  });
});
