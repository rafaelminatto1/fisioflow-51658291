import { describe, it, expect } from "vitest";
import { toE164Brazil, canonicalBrazilPhone } from "../whatsapp-identity";

describe("toE164Brazil", () => {
  it("adds country code 55 to a national mobile number", () => {
    expect(toE164Brazil("11993524642")).toBe("5511993524642");
  });

  it("keeps an already-E.164 number unchanged", () => {
    expect(toE164Brazil("5511993524642")).toBe("5511993524642");
  });

  it("strips formatting", () => {
    expect(toE164Brazil("(11) 99352-4642")).toBe("5511993524642");
  });

  it("handles a 10-digit national number (landline / no 9th digit)", () => {
    expect(toE164Brazil("1133334444")).toBe("551133334444");
  });

  it("leaves non-phone identifiers (IGSID) untouched", () => {
    expect(toE164Brazil("17841412345678901")).toBe("17841412345678901");
  });

  it("leaves webchat ids untouched", () => {
    expect(toE164Brazil("web:abc-123")).toBe("web:abc-123");
  });
});

describe("canonicalBrazilPhone", () => {
  it("collapses 55 / no-55 variants to the same key", () => {
    expect(canonicalBrazilPhone("11993524642")).toBe(canonicalBrazilPhone("5511993524642"));
  });

  it("collapses the optional 9th mobile digit", () => {
    // 5511 9 9352-4642 and 5511 9352-4642 are the same subscriber.
    expect(canonicalBrazilPhone("5511993524642")).toBe(canonicalBrazilPhone("551193524642"));
  });

  it("keeps different numbers distinct", () => {
    expect(canonicalBrazilPhone("11993524642")).not.toBe(canonicalBrazilPhone("11999999999"));
  });

  it("returns non-phone identifiers as digits-only", () => {
    expect(canonicalBrazilPhone("17841412345678901")).toBe("17841412345678901");
  });
});
