"use strict";
/**
 * Common Type Definitions
 *
 * @description
 * Shared type definitions for frequently used patterns across the codebase.
 * These types replace `any` with proper TypeScript types.
 *
 * @module types/common
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = getErrorMessage;
exports.asError = asError;
exports.asPercentage = asPercentage;
/**
 * Error with unknown type - narrow down to Error or extract message
 */
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'An unknown error occurred';
}
/**
 * Narrow unknown error to Error instance
 */
function asError(error) {
    if (error instanceof Error) {
        return error;
    }
    if (typeof error === 'string') {
        return new Error(error);
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return new Error(String(error.message));
    }
    return null;
}
/**
 * Create a percentage value (runtime validation)
 */
function asPercentage(value) {
    if (value < 0 || value > 100) {
        throw new Error(`Percentage must be between 0 and 100, got ${value}`);
    }
    return value;
}
//# sourceMappingURL=common.js.map