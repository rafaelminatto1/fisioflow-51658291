"use strict";
/**
 * Shared Types for Firebase Workflows
 *
 * Common types and interfaces used across workflow functions
 * Ensures consistency and type safety
 *
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTIONS = exports.NonRetryableError = exports.RetryableError = exports.WorkflowError = void 0;
// ============================================================================
// ERROR TYPES
// ============================================================================
class WorkflowError extends Error {
    constructor(message, code, retryable = false, details) {
        super(message);
        this.code = code;
        this.retryable = retryable;
        this.details = details;
        this.name = 'WorkflowError';
    }
}
exports.WorkflowError = WorkflowError;
class RetryableError extends WorkflowError {
    constructor(message, details) {
        super(message, 'RETRYABLE', true, details);
        this.name = 'RetryableError';
    }
}
exports.RetryableError = RetryableError;
class NonRetryableError extends WorkflowError {
    constructor(message, details) {
        super(message, 'NON_RETRYABLE', false, details);
        this.name = 'NonRetryableError';
    }
}
exports.NonRetryableError = NonRetryableError;
// ============================================================================
// COLLECTION NAMES
// ============================================================================
exports.COLLECTIONS = {
    NOTIFICATIONS: 'notifications',
    APPOINTMENTS: 'appointments',
    PATIENTS: 'patients',
    USERS: 'users',
    ORGANIZATIONS: 'organizations',
    APPOINTMENT_REMINDERS: 'appointment_reminders',
    APPOINTMENT_CONFIRMATIONS: 'appointment_confirmations',
    FEEDBACK_TASKS: 'feedback_tasks',
    REACTIVATION_CAMPAIGNS: 'reactivation_campaigns',
    SCHEDULED_TASKS: 'scheduled_tasks',
    USER_TOKENS: 'user_tokens',
};
//# sourceMappingURL=types.js.map