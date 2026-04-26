/**
 * Financial Constants
 *
 * Centralized payment status and payment method values, derived types, and display labels.
 *
 * @module lib/constants/financial
 */

// ============================================================================
// PAYMENT STATUSES
// ============================================================================

/**
 * Canonical payment status values — matches the `payment_status` column in the database.
 */
export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "partial",
  "cancelled",
  "refunded",
] as const;

/**
 * Derived literal union type for payment statuses.
 */
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Display labels for each payment status (Brazilian Portuguese).
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  partial: "Parcial",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

// ============================================================================
// PAYMENT METHODS
// ============================================================================

/**
 * Canonical payment method values — matches the `payment_method` column in the database.
 */
export const PAYMENT_METHODS = [
  "cash",
  "credit_card",
  "debit_card",
  "pix",
  "transfer",
  "barter",
  "other",
] as const;

/**
 * Derived literal union type for payment methods.
 */
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Display labels for each payment method (Brazilian Portuguese).
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  pix: "PIX",
  transfer: "Transferência",
  barter: "Permuta",
  other: "Outro",
};

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

/**
 * Canonical transaction type values.
 */
export const TRANSACTION_TYPES = ["receita", "despesa"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  receita: "Receita",
  despesa: "Despesa",
};

// ============================================================================
// TRANSACTION STATUSES
// ============================================================================

/**
 * Canonical transaction status values — matches the `status` column in `Transacao`.
 */
export const TRANSACTION_STATUSES = ["concluido", "pendente", "cancelado"] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  concluido: "Concluído",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Returns true if the given value is a valid `PaymentStatus`.
 */
export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return PAYMENT_STATUSES.includes(value as PaymentStatus);
}

/**
 * Returns true if the given value is a valid `PaymentMethod`.
 */
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}

/**
 * Returns the display label for a payment status, falling back to the raw value.
 */
export function getPaymentStatusLabel(status: string): string {
  return isPaymentStatus(status) ? PAYMENT_STATUS_LABELS[status] : status;
}

/**
 * Returns the display label for a payment method, falling back to the raw value.
 */
export function getPaymentMethodLabel(method: string): string {
  return isPaymentMethod(method) ? PAYMENT_METHOD_LABELS[method] : method;
}
