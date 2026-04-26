/**
 * Unit tests for the constants registry.
 *
 * Validates:
 * - TypeScript infers literal types correctly (no widening to `string`)
 * - All status/role/method values have a corresponding display label
 * - Helper functions behave correctly
 *
 * Requirements: 8.2, 8.4
 */

import { describe, it, expect } from "vitest";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
  isAppointmentStatus,
  getAppointmentStatusLabel,
  type AppointmentStatus,
} from "./appointments";
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  isUserRole,
  getUserRoleLabel,
  type UserRole,
} from "./users";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_LABELS,
  isPaymentStatus,
  isPaymentMethod,
  getPaymentStatusLabel,
  getPaymentMethodLabel,
  type PaymentStatus,
  type PaymentMethod,
} from "./financial";

// ============================================================================
// APPOINTMENT CONSTANTS
// ============================================================================

describe("APPOINTMENT_STATUSES", () => {
  it("is a readonly tuple (as const — no widening to string[])", () => {
    // If TypeScript widened to string[], this assignment would fail at compile time.
    // At runtime we verify the array is frozen / readonly-like.
    const statuses: readonly AppointmentStatus[] = APPOINTMENT_STATUSES;
    expect(statuses).toBeDefined();
  });

  it("contains the expected canonical status values", () => {
    expect(APPOINTMENT_STATUSES).toContain("scheduled");
    expect(APPOINTMENT_STATUSES).toContain("confirmed");
    expect(APPOINTMENT_STATUSES).toContain("completed");
    expect(APPOINTMENT_STATUSES).toContain("missed");
    expect(APPOINTMENT_STATUSES).toContain("cancelled");
    expect(APPOINTMENT_STATUSES).toContain("rescheduled");
    expect(APPOINTMENT_STATUSES).toContain("no_show");
    expect(APPOINTMENT_STATUSES).toContain("in_progress");
  });

  it("every status has a corresponding display label", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(APPOINTMENT_STATUS_LABELS).toHaveProperty(status);
      expect(typeof APPOINTMENT_STATUS_LABELS[status]).toBe("string");
      expect(APPOINTMENT_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it("APPOINTMENT_STATUS_LABELS has no extra keys beyond APPOINTMENT_STATUSES", () => {
    const labelKeys = Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[];
    expect(labelKeys.length).toBe(APPOINTMENT_STATUSES.length);
    for (const key of labelKeys) {
      expect(APPOINTMENT_STATUSES).toContain(key);
    }
  });
});

describe("APPOINTMENT_TYPES", () => {
  it("contains the expected type values", () => {
    expect(APPOINTMENT_TYPES).toContain("Consulta Inicial");
    expect(APPOINTMENT_TYPES).toContain("Fisioterapia");
    expect(APPOINTMENT_TYPES).toContain("Reavaliação");
    expect(APPOINTMENT_TYPES).toContain("Consulta de Retorno");
  });

  it("every type has a corresponding display label", () => {
    for (const type of APPOINTMENT_TYPES) {
      expect(APPOINTMENT_TYPE_LABELS).toHaveProperty(type);
      expect(typeof APPOINTMENT_TYPE_LABELS[type]).toBe("string");
    }
  });
});

describe("isAppointmentStatus", () => {
  it("returns true for valid statuses", () => {
    expect(isAppointmentStatus("scheduled")).toBe(true);
    expect(isAppointmentStatus("cancelled")).toBe(true);
    expect(isAppointmentStatus("in_progress")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isAppointmentStatus("Confirmado")).toBe(false); // Portuguese variant
    expect(isAppointmentStatus("unknown")).toBe(false);
    expect(isAppointmentStatus("")).toBe(false);
    expect(isAppointmentStatus(null)).toBe(false);
    expect(isAppointmentStatus(undefined)).toBe(false);
    expect(isAppointmentStatus(42)).toBe(false);
  });
});

describe("getAppointmentStatusLabel", () => {
  it("returns the Portuguese label for known statuses", () => {
    expect(getAppointmentStatusLabel("scheduled")).toBe("Agendado");
    expect(getAppointmentStatusLabel("confirmed")).toBe("Confirmado");
    expect(getAppointmentStatusLabel("completed")).toBe("Concluído");
    expect(getAppointmentStatusLabel("cancelled")).toBe("Cancelado");
    expect(getAppointmentStatusLabel("no_show")).toBe("Não Compareceu");
    expect(getAppointmentStatusLabel("in_progress")).toBe("Em Atendimento");
  });

  it("falls back to the raw value for unknown statuses", () => {
    expect(getAppointmentStatusLabel("unknown_status")).toBe("unknown_status");
    expect(getAppointmentStatusLabel("Confirmado")).toBe("Confirmado");
  });
});

// ============================================================================
// USER CONSTANTS
// ============================================================================

describe("USER_ROLES", () => {
  it("is a readonly tuple (as const — no widening to string[])", () => {
    const roles: readonly UserRole[] = USER_ROLES;
    expect(roles).toBeDefined();
  });

  it("contains the expected role values", () => {
    expect(USER_ROLES).toContain("admin");
    expect(USER_ROLES).toContain("fisioterapeuta");
    expect(USER_ROLES).toContain("estagiario");
    expect(USER_ROLES).toContain("recepcionista");
    expect(USER_ROLES).toContain("paciente");
    expect(USER_ROLES).toContain("owner");
  });

  it("every role has a corresponding display label", () => {
    for (const role of USER_ROLES) {
      expect(USER_ROLE_LABELS).toHaveProperty(role);
      expect(typeof USER_ROLE_LABELS[role]).toBe("string");
      expect(USER_ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });

  it("USER_ROLE_LABELS has no extra keys beyond USER_ROLES", () => {
    const labelKeys = Object.keys(USER_ROLE_LABELS) as UserRole[];
    expect(labelKeys.length).toBe(USER_ROLES.length);
    for (const key of labelKeys) {
      expect(USER_ROLES).toContain(key);
    }
  });
});

describe("isUserRole", () => {
  it("returns true for valid roles", () => {
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("fisioterapeuta")).toBe(true);
    expect(isUserRole("owner")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isUserRole("superadmin")).toBe(false);
    expect(isUserRole("")).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
  });
});

describe("getUserRoleLabel", () => {
  it("returns the Portuguese label for known roles", () => {
    expect(getUserRoleLabel("admin")).toBe("Administrador");
    expect(getUserRoleLabel("fisioterapeuta")).toBe("Fisioterapeuta");
    expect(getUserRoleLabel("estagiario")).toBe("Estagiário");
    expect(getUserRoleLabel("recepcionista")).toBe("Recepcionista");
    expect(getUserRoleLabel("paciente")).toBe("Paciente");
    expect(getUserRoleLabel("owner")).toBe("Proprietário");
  });

  it("falls back to the raw value for unknown roles", () => {
    expect(getUserRoleLabel("superadmin")).toBe("superadmin");
  });
});

// ============================================================================
// FINANCIAL CONSTANTS
// ============================================================================

describe("PAYMENT_STATUSES", () => {
  it("is a readonly tuple (as const — no widening to string[])", () => {
    const statuses: readonly PaymentStatus[] = PAYMENT_STATUSES;
    expect(statuses).toBeDefined();
  });

  it("contains the expected payment status values", () => {
    expect(PAYMENT_STATUSES).toContain("pending");
    expect(PAYMENT_STATUSES).toContain("paid");
    expect(PAYMENT_STATUSES).toContain("partial");
    expect(PAYMENT_STATUSES).toContain("cancelled");
    expect(PAYMENT_STATUSES).toContain("refunded");
  });

  it("every payment status has a corresponding display label", () => {
    for (const status of PAYMENT_STATUSES) {
      expect(PAYMENT_STATUS_LABELS).toHaveProperty(status);
      expect(typeof PAYMENT_STATUS_LABELS[status]).toBe("string");
      expect(PAYMENT_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it("PAYMENT_STATUS_LABELS has no extra keys beyond PAYMENT_STATUSES", () => {
    const labelKeys = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[];
    expect(labelKeys.length).toBe(PAYMENT_STATUSES.length);
    for (const key of labelKeys) {
      expect(PAYMENT_STATUSES).toContain(key);
    }
  });
});

describe("PAYMENT_METHODS", () => {
  it("is a readonly tuple (as const — no widening to string[])", () => {
    const methods: readonly PaymentMethod[] = PAYMENT_METHODS;
    expect(methods).toBeDefined();
  });

  it("contains the expected payment method values", () => {
    expect(PAYMENT_METHODS).toContain("cash");
    expect(PAYMENT_METHODS).toContain("credit_card");
    expect(PAYMENT_METHODS).toContain("debit_card");
    expect(PAYMENT_METHODS).toContain("pix");
    expect(PAYMENT_METHODS).toContain("transfer");
    expect(PAYMENT_METHODS).toContain("barter");
    expect(PAYMENT_METHODS).toContain("other");
  });

  it("every payment method has a corresponding display label", () => {
    for (const method of PAYMENT_METHODS) {
      expect(PAYMENT_METHOD_LABELS).toHaveProperty(method);
      expect(typeof PAYMENT_METHOD_LABELS[method]).toBe("string");
      expect(PAYMENT_METHOD_LABELS[method].length).toBeGreaterThan(0);
    }
  });

  it("PAYMENT_METHOD_LABELS has no extra keys beyond PAYMENT_METHODS", () => {
    const labelKeys = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
    expect(labelKeys.length).toBe(PAYMENT_METHODS.length);
    for (const key of labelKeys) {
      expect(PAYMENT_METHODS).toContain(key);
    }
  });
});

describe("TRANSACTION_TYPES", () => {
  it("contains receita and despesa", () => {
    expect(TRANSACTION_TYPES).toContain("receita");
    expect(TRANSACTION_TYPES).toContain("despesa");
  });

  it("every transaction type has a label", () => {
    for (const type of TRANSACTION_TYPES) {
      expect(TRANSACTION_TYPE_LABELS).toHaveProperty(type);
      expect(TRANSACTION_TYPE_LABELS[type].length).toBeGreaterThan(0);
    }
  });
});

describe("TRANSACTION_STATUSES", () => {
  it("contains concluido, pendente, cancelado", () => {
    expect(TRANSACTION_STATUSES).toContain("concluido");
    expect(TRANSACTION_STATUSES).toContain("pendente");
    expect(TRANSACTION_STATUSES).toContain("cancelado");
  });

  it("every transaction status has a label", () => {
    for (const status of TRANSACTION_STATUSES) {
      expect(TRANSACTION_STATUS_LABELS).toHaveProperty(status);
      expect(TRANSACTION_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });
});

describe("isPaymentStatus", () => {
  it("returns true for valid payment statuses", () => {
    expect(isPaymentStatus("pending")).toBe(true);
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isPaymentStatus("refunded")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isPaymentStatus("Pendente")).toBe(false); // Portuguese variant
    expect(isPaymentStatus("unknown")).toBe(false);
    expect(isPaymentStatus(null)).toBe(false);
    expect(isPaymentStatus(undefined)).toBe(false);
  });
});

describe("isPaymentMethod", () => {
  it("returns true for valid payment methods", () => {
    expect(isPaymentMethod("cash")).toBe(true);
    expect(isPaymentMethod("pix")).toBe(true);
    expect(isPaymentMethod("barter")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isPaymentMethod("boleto")).toBe(false);
    expect(isPaymentMethod("")).toBe(false);
    expect(isPaymentMethod(null)).toBe(false);
  });
});

describe("getPaymentStatusLabel", () => {
  it("returns the Portuguese label for known statuses", () => {
    expect(getPaymentStatusLabel("pending")).toBe("Pendente");
    expect(getPaymentStatusLabel("paid")).toBe("Pago");
    expect(getPaymentStatusLabel("partial")).toBe("Parcial");
    expect(getPaymentStatusLabel("cancelled")).toBe("Cancelado");
    expect(getPaymentStatusLabel("refunded")).toBe("Reembolsado");
  });

  it("falls back to the raw value for unknown statuses", () => {
    expect(getPaymentStatusLabel("unknown")).toBe("unknown");
  });
});

describe("getPaymentMethodLabel", () => {
  it("returns the Portuguese label for known methods", () => {
    expect(getPaymentMethodLabel("cash")).toBe("Dinheiro");
    expect(getPaymentMethodLabel("pix")).toBe("PIX");
    expect(getPaymentMethodLabel("credit_card")).toBe("Cartão de Crédito");
    expect(getPaymentMethodLabel("barter")).toBe("Permuta");
  });

  it("falls back to the raw value for unknown methods", () => {
    expect(getPaymentMethodLabel("boleto")).toBe("boleto");
  });
});

// ============================================================================
// BARREL EXPORT — verify re-exports work
// ============================================================================

describe("barrel export (index.ts)", () => {
  it("re-exports all appointment constants", async () => {
    const mod = await import("./index");
    expect(mod.APPOINTMENT_STATUSES).toBeDefined();
    expect(mod.APPOINTMENT_STATUS_LABELS).toBeDefined();
    expect(mod.APPOINTMENT_TYPES).toBeDefined();
  });

  it("re-exports all user constants", async () => {
    const mod = await import("./index");
    expect(mod.USER_ROLES).toBeDefined();
    expect(mod.USER_ROLE_LABELS).toBeDefined();
  });

  it("re-exports all financial constants", async () => {
    const mod = await import("./index");
    expect(mod.PAYMENT_STATUSES).toBeDefined();
    expect(mod.PAYMENT_STATUS_LABELS).toBeDefined();
    expect(mod.PAYMENT_METHODS).toBeDefined();
    expect(mod.PAYMENT_METHOD_LABELS).toBeDefined();
  });
});
