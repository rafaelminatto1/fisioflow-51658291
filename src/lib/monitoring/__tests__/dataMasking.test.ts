/**
 * Unit tests for sensitive data masking utilities.
 *
 * Sub-task 12.1 — Unit tests for sensitive data masking
 *   Validates: Requirements 10.5
 */

import { describe, it, expect } from "vitest";
import { maskCpf, maskEmail, maskPhone, maskString, maskLogContext } from "../dataMasking";

// ============================================================================
// maskCpf
// ============================================================================

describe("maskCpf", () => {
  it("shows only first 3 characters of a formatted CPF", () => {
    const result = maskCpf("123.456.789-00");
    expect(result).toBe("123.***.***.***");
    expect(result.startsWith("123")).toBe(true);
  });

  it("shows only first 3 characters of an unformatted CPF", () => {
    const result = maskCpf("12345678900");
    expect(result).toBe("123.***.***.***");
  });

  it("returns '***' for null", () => {
    expect(maskCpf(null)).toBe("***");
  });

  it("returns '***' for undefined", () => {
    expect(maskCpf(undefined)).toBe("***");
  });

  it("returns '***' for empty string", () => {
    expect(maskCpf("")).toBe("***");
  });

  it("returns '***' for a string shorter than 3 digits", () => {
    expect(maskCpf("12")).toBe("***");
  });

  it("does not throw for any string input", () => {
    const inputs = [null, undefined, "", "abc", "123", "123.456.789-00", "12345678900", "   "];
    for (const input of inputs) {
      expect(() => maskCpf(input as string)).not.toThrow();
    }
  });

  it("masked result does not contain the full CPF", () => {
    const cpf = "987.654.321-00";
    const masked = maskCpf(cpf);
    expect(masked).not.toContain("654");
    expect(masked).not.toContain("321");
  });
});

// ============================================================================
// maskEmail
// ============================================================================

describe("maskEmail", () => {
  it("shows only first character and TLD", () => {
    const result = maskEmail("joao@example.com");
    expect(result.startsWith("j")).toBe(true);
    expect(result).toContain("@");
    expect(result.endsWith(".com")).toBe(true);
  });

  it("returns '***' for null", () => {
    expect(maskEmail(null)).toBe("***");
  });

  it("returns '***' for undefined", () => {
    expect(maskEmail(undefined)).toBe("***");
  });

  it("returns '***' for empty string", () => {
    expect(maskEmail("")).toBe("***");
  });

  it("returns '***' for string without @", () => {
    expect(maskEmail("notanemail")).toBe("***");
  });

  it("does not throw for any input", () => {
    const inputs = [null, undefined, "", "abc", "a@b.c", "joao@example.com"];
    for (const input of inputs) {
      expect(() => maskEmail(input as string)).not.toThrow();
    }
  });

  it("masked result does not contain the full local part", () => {
    const masked = maskEmail("secretuser@example.com");
    expect(masked).not.toContain("secretuser");
    expect(masked).not.toContain("example");
  });
});

// ============================================================================
// maskPhone
// ============================================================================

describe("maskPhone", () => {
  it("shows only last 4 digits", () => {
    const result = maskPhone("(11) 98765-4321");
    expect(result).toBe("***-4321");
  });

  it("handles unformatted phone", () => {
    const result = maskPhone("11987654321");
    expect(result).toBe("***-4321");
  });

  it("returns '***' for null", () => {
    expect(maskPhone(null)).toBe("***");
  });

  it("returns '***' for undefined", () => {
    expect(maskPhone(undefined)).toBe("***");
  });

  it("returns '***' for empty string", () => {
    expect(maskPhone("")).toBe("***");
  });

  it("returns '***' for string with fewer than 4 digits", () => {
    expect(maskPhone("123")).toBe("***");
  });

  it("does not throw for any input", () => {
    const inputs = [null, undefined, "", "123", "(11) 98765-4321"];
    for (const input of inputs) {
      expect(() => maskPhone(input as string)).not.toThrow();
    }
  });
});

// ============================================================================
// maskString
// ============================================================================

describe("maskString", () => {
  it("shows first 3 characters by default", () => {
    const result = maskString("secret-token");
    expect(result).toBe("sec***");
  });

  it("respects custom visibleChars parameter", () => {
    const result = maskString("secret-token", 5);
    expect(result).toBe("secre***");
  });

  it("returns '***' for null", () => {
    expect(maskString(null)).toBe("***");
  });

  it("returns '***' for undefined", () => {
    expect(maskString(undefined)).toBe("***");
  });

  it("returns '***' for empty string", () => {
    expect(maskString("")).toBe("***");
  });

  it("returns '***' for string shorter than or equal to visibleChars", () => {
    expect(maskString("ab", 3)).toBe("***");
    expect(maskString("abc", 3)).toBe("***");
  });

  it("does not throw for any input", () => {
    const inputs = [null, undefined, "", "a", "abc", "secret-token"];
    for (const input of inputs) {
      expect(() => maskString(input as string)).not.toThrow();
    }
  });
});

// ============================================================================
// maskLogContext
// ============================================================================

describe("maskLogContext", () => {
  it("masks cpf field", () => {
    const result = maskLogContext({ cpf: "123.456.789-00", name: "João" });
    expect(result.cpf).toBe("123.***.***.***");
    expect(result.name).toBe("João");
  });

  it("masks email field", () => {
    const result = maskLogContext({ email: "joao@example.com" });
    expect(result.email).not.toContain("joao");
    expect(result.email).not.toContain("example");
  });

  it("masks phone field", () => {
    const result = maskLogContext({ phone: "(11) 98765-4321" });
    expect(result.phone).toBe("***-4321");
  });

  it("masks password field", () => {
    const result = maskLogContext({ password: "super-secret-123" });
    expect(result.password).toBe("***");
  });

  it("masks token field", () => {
    const result = maskLogContext({ token: "eyJhbGciOiJIUzI1NiJ9" });
    expect(result.token).toBe("***");
  });

  it("masks secret field", () => {
    const result = maskLogContext({ secret: "my-api-secret" });
    expect(result.secret).toBe("***");
  });

  it("preserves non-sensitive fields unchanged", () => {
    const result = maskLogContext({
      operation: "PatientService.getById",
      patientId: "abc-123",
      count: 5,
    });
    expect(result.operation).toBe("PatientService.getById");
    expect(result.patientId).toBe("abc-123");
    expect(result.count).toBe(5);
  });

  it("returns empty object for null", () => {
    expect(maskLogContext(null)).toEqual({});
  });

  it("returns empty object for undefined", () => {
    expect(maskLogContext(undefined)).toEqual({});
  });

  it("does not mutate the original context", () => {
    const original = { cpf: "123.456.789-00", name: "João" };
    maskLogContext(original);
    expect(original.cpf).toBe("123.456.789-00");
  });

  it("does not throw for any input", () => {
    const inputs = [null, undefined, {}, { cpf: null }, { email: undefined }, { phone: "" }];
    for (const input of inputs) {
      expect(() => maskLogContext(input as Record<string, unknown>)).not.toThrow();
    }
  });
});
