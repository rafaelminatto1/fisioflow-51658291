export class QueryTimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number,
    public readonly query: string
  ) {
    super(message);
    this.name = 'QueryTimeoutError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly originalError: Error,
    public readonly query?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export interface TimeoutConfig {
  query: number;
  mutation: number;
  report: number;
  bulk: number;
}

export const DEFAULT_TIMEOUTS: TimeoutConfig = {
  query: 10000,
  mutation: 30000,
  report: 120000,
  bulk: 45000,
};

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  queryDescription: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new QueryTimeoutError(
          `Database query timed out after ${timeoutMs}ms: ${queryDescription}`,
          timeoutMs,
          queryDescription
        )
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
            new DatabaseError(
              `Database query failed: ${error.message}`,
              error,
              queryDescription
            )
          );
        }
      });
  });
}

export function wrapQueryWithTimeout<T extends (...args: any[]) => Promise<any>>(
  queryFn: T,
  defaultTimeout: number = DEFAULT_TIMEOUTS.query
): T {
  return (async (...args: any[]) => {
    const lastArg = args[args.length - 1];
    const timeout = 
      typeof lastArg === 'object' && lastArg?.timeout 
        ? lastArg.timeout 
        : defaultTimeout;
    
    const queryDescription = typeof args[0] === 'string' 
      ? args[0].substring(0, 100) 
      : 'query';

    return withTimeout(
      queryFn(...args),
      timeout,
      queryDescription
    );
  }) as T;
}
