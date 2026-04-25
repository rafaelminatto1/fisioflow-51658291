export class QueryTimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number,
    public readonly query: string,
  ) {
    super(message);
    this.name = "QueryTimeoutError";
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly originalError: Error,
    public readonly query?: string,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export interface TimeoutConfig {
  query: number;
  mutation: number;
  report: number;
  bulk: number;
}

export const DEFAULT_TIMEOUTS: TimeoutConfig = {
  query: 30000,
  mutation: 60000,
  report: 120000,
  bulk: 45000,
};

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  queryDescription: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new QueryTimeoutError(
          `Database query timed out after ${timeoutMs}ms: ${queryDescription}`,
          timeoutMs,
          queryDescription,
        ),
      );
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error instanceof QueryTimeoutError) {
          reject(error);
        } else {
          reject(
            new DatabaseError(`Database query failed: ${error.message}`, error, queryDescription),
          );
        }
      });
  });
}

export function wrapQueryWithTimeout<T extends (...args: any[]) => Promise<any>>(
  queryFn: T,
  defaultTimeout: number = DEFAULT_TIMEOUTS.query,
): T {
  return (async (...args: any[]) => {
    const lastArg = args[args.length - 1];
    const timeout =
      typeof lastArg === "object" && lastArg?.timeout ? lastArg.timeout : defaultTimeout;

    const queryDescription = typeof args[0] === "string" ? args[0].substring(0, 100) : "query";
    const rawQuery = typeof args[0] === "string" ? args[0] : "";
    const isSafeSelect = /^\s*select\b/i.test(rawQuery);

    try {
      return await withTimeout(queryFn(...args), timeout, queryDescription);
    } catch (error) {
      if (!(error instanceof QueryTimeoutError) || !isSafeSelect) {
        throw error;
      }

      const retryTimeout = Math.max(timeout, DEFAULT_TIMEOUTS.mutation);
      console.warn("[DB] Retrying timed out SELECT query once", {
        timeout,
        retryTimeout,
        query: queryDescription,
      });

      return await withTimeout(queryFn(...args), retryTimeout, queryDescription);
    }
  }) as T;
}
