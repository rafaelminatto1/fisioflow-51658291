/**
 * Constants Registry — Barrel Export
 *
 * Import domain constants from this single entry point:
 *
 * @example
 * import { APPOINTMENT_STATUSES, AppointmentStatus } from '@/lib/constants';
 * import { USER_ROLES, UserRole } from '@/lib/constants';
 * import { PAYMENT_STATUSES, PaymentStatus } from '@/lib/constants';
 *
 * @module lib/constants
 */

export * from "./appointments";
export * from "./users";
export * from "./financial";
