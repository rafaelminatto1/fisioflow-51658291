type TimestampLike = {
  toDate?: () => Date;
  seconds?: number;
  nanoseconds?: number;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const toIsoFromTimestampLike = (value: TimestampLike): string | null => {
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }

  if (typeof value.seconds === 'number') {
    const ms = value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
    return new Date(ms).toISOString();
  }

  return null;
};

export const normalizeFirestoreValue = (value: unknown): unknown => {
  if (!value) return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeFirestoreValue);
  }

  if (typeof value === 'object') {
    const timestampIso = toIsoFromTimestampLike(value as TimestampLike);
    if (timestampIso) return timestampIso;

    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = normalizeFirestoreValue(v);
      }
      return out;
    }
  }

  return value;
};

export const normalizeFirestoreData = <T extends Record<string, unknown>>(data: T): T => {
  return normalizeFirestoreValue(data) as T;
};
