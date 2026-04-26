/**
 * User Constants
 *
 * Centralized user role values, derived types, and display labels.
 *
 * @module lib/constants/users
 */

// ============================================================================
// USER ROLES
// ============================================================================

/**
 * Canonical user role values — matches the `role` column in the database.
 */
export const USER_ROLES = [
  "admin",
  "fisioterapeuta",
  "estagiario",
  "recepcionista",
  "paciente",
  "owner",
] as const;

/**
 * Derived literal union type for user roles.
 * Use this instead of `string` for role fields.
 */
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Display labels for each user role (Brazilian Portuguese).
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  fisioterapeuta: "Fisioterapeuta",
  estagiario: "Estagiário",
  recepcionista: "Recepcionista",
  paciente: "Paciente",
  owner: "Proprietário",
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Returns true if the given value is a valid `UserRole`.
 */
export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

/**
 * Returns the display label for a role, falling back to the raw value.
 */
export function getUserRoleLabel(role: string): string {
  return isUserRole(role) ? USER_ROLE_LABELS[role] : role;
}
