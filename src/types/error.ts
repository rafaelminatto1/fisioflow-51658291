/**
 * Error Handling Utilities
 */

/**
 * Unknown error type - use instead of `error: any` in catch blocks
 */
export type UnknownError = unknown;

/**
 * Error with unknown type - narrow down to Error or extract message
 */
export function getErrorMessage(error: UnknownError): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as any).message);
    }
    return 'An unknown error occurred';
}

/**
 * Narrow unknown error to Error instance
 */
export function asError(error: UnknownError): Error | null {
    if (error instanceof Error) {
        return error;
    }
    if (typeof error === 'string') {
        return new Error(error);
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return new Error(String((error as any).message));
    }
    return null;
}
