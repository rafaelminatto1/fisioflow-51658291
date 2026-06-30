import { describe, it, expect } from "vitest";
import { onlyDigits, looksLikePhone, canonicalBrazilPhone, formatBrazilPhone } from "../phone";

describe("onlyDigits", () => {
  it("strips non-digits", () => {
    expect(onlyDigits("(11) 99352-4648")).toBe("11993524648");
  });
});

describe("looksLikePhone", () => {
  it("accepts 10-13 digit strings", () => {
    expect(looksLikePhone("11993524648")).toBe(true);
    expect(looksLikePhone("5511993524648")).toBe(true);
  });
  it("rejects too short or webchat ids", () => {
    expect(looksLikePhone("119935")).toBe(false);
    expect(looksLikePhone("web:abc")).toBe(false);
  });
});

describe("canonicalBrazilPhone", () => {
  it("collapses 55 and 9th-digit variants", () => {
    expect(canonicalBrazilPhone("11993524648")).toBe(canonicalBrazilPhone("5511993524648"));
    expect(canonicalBrazilPhone("5511993524648")).toBe(canonicalBrazilPhone("551193524648"));
  });
  it("keeps distinct numbers distinct", () => {
    expect(canonicalBrazilPhone("11993524648")).not.toBe(canonicalBrazilPhone("11999999999"));
  });
});

describe("formatBrazilPhone", () => {
  it("formats a 13-digit E.164 mobile", () => {
    expect(formatBrazilPhone("5511993524648")).toBe("+55 11 99352-4648");
  });
  it("formats an 11-digit national mobile", () => {
    expect(formatBrazilPhone("11993524648")).toBe("+55 11 99352-4648");
  });
});
