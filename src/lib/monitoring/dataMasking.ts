/**
 * Sensitive Data Masking Utilities
 *
 * Masks sensitive fields before logging to prevent PII leakage.
 * All functions are pure and never throw — they return a safe fallback
 * for null/undefined/invalid inputs.
 *
 * @module lib/monitoring/dataMasking
 */

/**
 * Mask a CPF number, showing only the first 3 digits.
 * Handles formatted (000.000.000-00) and unformatted (00000000000) CPFs.
 *
 * @param cpf - The CPF string to mask, or null/undefined.
 * @returns Masked CPF like "123.***.***.***" or "***" for invalid/empty input.
 *
 * @example
 * maskCpf("123.456.789-00") // "123.***.***.***"
 * maskCpf("12345678900")    // "123.***.***.***"
 * maskCpf(null)             // "***"
 */
export function maskCpf(cpf: string | null | undefined): string {
  try {
    if (!cpf || typeof cpf !== "string") return "***";

    // Remove formatting to get raw digits
    const digits = cpf.replace(/\D/g, "");
    if (digits.length < 3) return "***";

    // Show only first 3 digits
    const visible = digits.slice(0, 3);
    return `${visible}.***.***.***`;
  } catch {
    return "***";
  }
}

/**
 * Mask an email address, showing only the first character and domain TLD.
 *
 * @param email - The email string to mask, or null/undefined.
 * @returns Masked email like "j***@***.com" or "***" for invalid/empty input.
 *
 * @example
 * maskEmail("joao@example.com") // "j***@***.com"
 * maskEmail(null)               // "***"
 */
export function maskEmail(email: string | null | undefined): string {
  try {
    if (!email || typeof email !== "string") return "***";

    const atIndex = email.indexOf("@");
    if (atIndex < 0) return "***";

    const localPart = email.slice(0, atIndex);
    const domainPart = email.slice(atIndex + 1);

    const visibleLocal = localPart.length > 0 ? localPart[0] : "*";
    const dotIndex = domainPart.lastIndexOf(".");
    const tld = dotIndex >= 0 ? domainPart.slice(dotIndex) : "";

    return `${visibleLocal}***@***.${tld || "***"}`;
  } catch {
    return "***";
  }
}

/**
 * Mask a phone number, showing only the last 4 digits.
 *
 * @param phone - The phone string to mask, or null/undefined.
 * @returns Masked phone like "***-1234" or "***" for invalid/empty input.
 *
 * @example
 * maskPhone("(11) 98765-4321") // "***-4321"
 * maskPhone(null)              // "***"
 */
export function maskPhone(phone: string | null | undefined): string {
  try {
    if (!phone || typeof phone !== "string") return "***";

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) return "***";

    const lastFour = digits.slice(-4);
    return `***-${lastFour}`;
  } catch {
    return "***";
  }
}

/**
 * Mask a generic sensitive string, showing only the first N characters.
 *
 * @param value - The string to mask, or null/undefined.
 * @param visibleChars - Number of characters to show (default: 3).
 * @returns Masked string or "***" for invalid/empty input.
 *
 * @example
 * maskString("secret-token-abc", 4) // "secr***"
 * maskString(null)                  // "***"
 */
export function maskString(value: string | null | undefined, visibleChars = 3): string {
  try {
    if (!value || typeof value !== "string") return "***";
    if (value.length <= visibleChars) return "***";

    return `${value.slice(0, visibleChars)}***`;
  } catch {
    return "***";
  }
}

/**
 * Mask sensitive fields in a log context object.
 * Returns a new object with sensitive fields masked — does not mutate the input.
 *
 * Sensitive fields automatically masked: cpf, email, phone, password, token, secret.
 *
 * @param context - The context object to sanitize.
 * @returns A new object with sensitive fields masked.
 *
 * @example
 * maskLogContext({ cpf: "123.456.789-00", name: "João" })
 * // { cpf: "123.***.***.***", name: "João" }
 */
export function maskLogContext(
  context: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  try {
    if (!context || typeof context !== "object") return {};

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();

      if (lowerKey === "cpf") {
        result[key] = maskCpf(value as string);
      } else if (lowerKey === "email") {
        result[key] = maskEmail(value as string);
      } else if (lowerKey === "phone" || lowerKey === "telefone" || lowerKey === "celular") {
        result[key] = maskPhone(value as string);
      } else if (
        lowerKey === "password" ||
        lowerKey === "senha" ||
        lowerKey === "token" ||
        lowerKey === "secret" ||
        lowerKey === "api_key" ||
        lowerKey === "apikey"
      ) {
        result[key] = "***";
      } else {
        result[key] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
}
