const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value.trim());
}

export function toValidUuid(value: unknown): string | null {
  if (!isValidUuid(value)) return null;
  return value.trim();
}
