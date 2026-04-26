/**
 * Pain Level Domain Validation
 *
 * Pure validation function for pain level business invariants.
 * Always returns `ValidationResult` — never throws.
 *
 * @module lib/validation/pain.validation
 */

import type { ValidationResult } from "@/types/common";

/**
 * Validate a pain level value.
 *
 * Rules:
 * - Must be an integer between 0 and 10 inclusive.
 * - Non-numeric, non-integer, or out-of-range values are invalid.
 *
 * @param level - The pain level to validate (accepts `unknown` for totality).
 * @returns `ValidationResult` — never throws.
 */
export function validatePainLevel(level: unknown): ValidationResult {
  const errors: string[] = [];

  try {
    if (typeof level !== "number" || !isFinite(level)) {
      errors.push("O nível de dor deve ser um número");
      return { valid: false, errors };
    }

    if (!Number.isInteger(level)) {
      errors.push("O nível de dor deve ser um número inteiro");
      return { valid: false, errors };
    }

    if (level < 0 || level > 10) {
      errors.push("O nível de dor deve ser entre 0 e 10");
    }
  } catch {
    // Totality guarantee: never propagate unexpected errors
    errors.push("Erro inesperado na validação do nível de dor");
  }

  return { valid: errors.length === 0, errors };
}
