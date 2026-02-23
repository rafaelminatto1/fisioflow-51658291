"use strict";
/**
 * Shared Types for Firebase Workflows
 *
 * Common types and interfaces used across workflow functions
 * Ensures consistency and type safety
 *
 * @version 1.0.0
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTIONS = exports.NonRetryableError = exports.RetryableError = exports.WorkflowError = void 0;
// ============================================================================
// ERROR TYPES
// ============================================================================
var WorkflowError = /** @class */ (function (_super) {
    __extends(WorkflowError, _super);
    function WorkflowError(message, code, retryable, details) {
        if (retryable === void 0) { retryable = false; }
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.retryable = retryable;
        _this.details = details;
        _this.name = 'WorkflowError';
        return _this;
    }
    return WorkflowError;
}(Error));
exports.WorkflowError = WorkflowError;
var RetryableError = /** @class */ (function (_super) {
    __extends(RetryableError, _super);
    function RetryableError(message, details) {
        var _this = _super.call(this, message, 'RETRYABLE', true, details) || this;
        _this.name = 'RetryableError';
        return _this;
    }
    return RetryableError;
}(WorkflowError));
exports.RetryableError = RetryableError;
var NonRetryableError = /** @class */ (function (_super) {
    __extends(NonRetryableError, _super);
    function NonRetryableError(message, details) {
        var _this = _super.call(this, message, 'NON_RETRYABLE', false, details) || this;
        _this.name = 'NonRetryableError';
        return _this;
    }
    return NonRetryableError;
}(WorkflowError));
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
