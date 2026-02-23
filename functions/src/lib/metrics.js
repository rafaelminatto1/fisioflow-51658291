"use strict";
/**
 * Business Metrics System
 * Custom business metrics for monitoring KPIs
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMetrics = exports.sessionMetrics = exports.exerciseMetrics = exports.assessmentMetrics = exports.paymentMetrics = exports.appointmentMetrics = exports.patientMetrics = exports.MetricValueType = exports.BusinessMetric = void 0;
exports.recordBusinessMetric = recordBusinessMetric;
exports.incrementCounter = incrementCounter;
exports.recordDuration = recordDuration;
exports.recordRevenue = recordRevenue;
exports.measureMetric = measureMetric;
/**
 * Business metric types
 */
var BusinessMetric;
(function (BusinessMetric) {
    // Patient metrics
    BusinessMetric["PATIENT_REGISTERED"] = "patient_registered";
    BusinessMetric["PATIENT_ACTIVE"] = "patient_active";
    BusinessMetric["PATIENT_INACTIVE"] = "patient_inactive";
    // Appointment metrics
    BusinessMetric["APPOINTMENT_BOOKED"] = "appointment_booked";
    BusinessMetric["APPOINTMENT_CANCELLED"] = "appointment_cancelled";
    BusinessMetric["APPOINTMENT_COMPLETED"] = "appointment_completed";
    BusinessMetric["APPOINTMENT_NO_SHOW"] = "appointment_no_show";
    // Session metrics
    BusinessMetric["SESSION_COMPLETED"] = "session_completed";
    BusinessMetric["SESSION_PLANNED"] = "session_planned";
    // Exercise metrics
    BusinessMetric["EXERCISE_ASSIGNED"] = "exercise_assigned";
    BusinessMetric["EXERCISE_COMPLETED"] = "exercise_completed";
    // Assessment metrics
    BusinessMetric["ASSESSMENT_CREATED"] = "assessment_created";
    BusinessMetric["ASSESSMENT_COMPLETED"] = "assessment_completed";
    // Payment metrics
    BusinessMetric["PAYMENT_RECEIVED"] = "payment_received";
    BusinessMetric["PAYMENT_PENDING"] = "payment_pending";
    BusinessMetric["PAYMENT_OVERDUE"] = "payment_overdue";
    BusinessMetric["REVENUE_EARNED"] = "revenue_earned";
    // Treatment metrics
    BusinessMetric["TREATMENT_STARTED"] = "treatment_started";
    BusinessMetric["TREATMENT_COMPLETED"] = "treatment_completed";
    // User metrics
    BusinessMetric["USER_LOGIN"] = "user_login";
    BusinessMetric["USER_LOGOUT"] = "user_logout";
})(BusinessMetric || (exports.BusinessMetric = BusinessMetric = {}));
/**
 * Metric value types
 */
var MetricValueType;
(function (MetricValueType) {
    MetricValueType["COUNT"] = "count";
    MetricValueType["DURATION_MS"] = "duration_ms";
    MetricValueType["CURRENCY_CENTS"] = "currency_cents";
    MetricValueType["PERCENTAGE"] = "percentage";
})(MetricValueType || (exports.MetricValueType = MetricValueType = {}));
/**
 * Records a business metric
 *
 * @param metric - The metric type
 * @param value - The metric value
 * @param labels - Categorical labels
 * @param valueType - Type of value (default: COUNT)
 * @param timestamp - Optional timestamp (default: now)
 */
function recordBusinessMetric(metric, value, labels, valueType, timestamp) {
    var _a;
    if (valueType === void 0) { valueType = MetricValueType.COUNT; }
    var metricData = {
        metric: metric,
        value: value,
        valueType: valueType,
        labels: labels,
        timestamp: timestamp || new Date(),
    };
    // Log to Cloud Logging as a structured log
    var logger = (0, logger_1.getLogger)('metrics');
    logger.info('Business metric recorded', {
        metric_name: metric,
        metric_value: value,
        value_type: valueType,
        labels: labels,
        timestamp: (_a = metricData.timestamp) === null || _a === void 0 ? void 0 : _a.toISOString(),
    });
    // Send to Cloud Monitoring (if configured)
    // This will be handled by cloud-monitoring.ts
    Promise.resolve().then(function () { return require('./cloud-monitoring'); }).then(function (_a) {
        var writeCustomMetric = _a.writeCustomMetric;
        writeCustomMetric(metricData).catch(function (err) {
            logger.error('Failed to write metric to Cloud Monitoring', { error: err, metricData: metricData });
        });
    }).catch(function () {
        // Cloud Monitoring not configured, metric only logged
    });
}
/**
 * Records a counter metric (incrementing value)
 */
function incrementCounter(metric, labels, delta) {
    if (delta === void 0) { delta = 1; }
    recordBusinessMetric(metric, delta, labels, MetricValueType.COUNT);
}
/**
 * Records a duration in milliseconds
 */
function recordDuration(metric, durationMs, labels) {
    recordBusinessMetric(metric, durationMs, labels, MetricValueType.DURATION_MS);
}
/**
 * Records a currency value in cents
 */
function recordRevenue(amountCents, labels) {
    recordBusinessMetric(BusinessMetric.REVENUE_EARNED, amountCents, labels, MetricValueType.CURRENCY_CENTS);
}
/**
 * Helper function to measure execution time
 */
function measureMetric(metric, labels, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, result, duration, error_1, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fn()];
                case 2:
                    result = _a.sent();
                    duration = Date.now() - startTime;
                    recordDuration(metric, duration, labels);
                    return [2 /*return*/, result];
                case 3:
                    error_1 = _a.sent();
                    duration = Date.now() - startTime;
                    recordDuration(metric, duration, __assign(__assign({}, labels), { success: 'false' }));
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Patient-related metrics
 */
exports.patientMetrics = {
    registered: function (organizationId, userId, patientId) {
        return incrementCounter(BusinessMetric.PATIENT_REGISTERED, {
            organization_id: organizationId,
            user_id: userId,
            patient_id: patientId,
        });
    },
    markedActive: function (organizationId, patientId) {
        return incrementCounter(BusinessMetric.PATIENT_ACTIVE, {
            organization_id: organizationId,
            patient_id: patientId,
        });
    },
    markedInactive: function (organizationId, patientId) {
        return incrementCounter(BusinessMetric.PATIENT_INACTIVE, {
            organization_id: organizationId,
            patient_id: patientId,
        });
    },
};
/**
 * Appointment-related metrics
 */
exports.appointmentMetrics = {
    booked: function (organizationId, userId, patientId, type) {
        return incrementCounter(BusinessMetric.APPOINTMENT_BOOKED, {
            organization_id: organizationId,
            user_id: userId,
            patient_id: patientId,
            appointment_type: type,
        });
    },
    cancelled: function (organizationId, patientId) {
        return incrementCounter(BusinessMetric.APPOINTMENT_CANCELLED, {
            organization_id: organizationId,
            patient_id: patientId,
        });
    },
    completed: function (organizationId, patientId, type) {
        return incrementCounter(BusinessMetric.APPOINTMENT_COMPLETED, {
            organization_id: organizationId,
            patient_id: patientId,
            appointment_type: type,
        });
    },
    noShow: function (organizationId, patientId) {
        return incrementCounter(BusinessMetric.APPOINTMENT_NO_SHOW, {
            organization_id: organizationId,
            patient_id: patientId,
        });
    },
};
/**
 * Payment-related metrics
 */
exports.paymentMetrics = {
    received: function (organizationId, amountCents, method, patientId) {
        recordRevenue(amountCents, {
            organization_id: organizationId,
            payment_method: method,
            patient_id: patientId,
        });
        incrementCounter(BusinessMetric.PAYMENT_RECEIVED, {
            organization_id: organizationId,
            payment_method: method,
            patient_id: patientId,
        });
    },
    pending: function (organizationId, amountCents, patientId) {
        return recordBusinessMetric(BusinessMetric.PAYMENT_PENDING, amountCents, {
            organization_id: organizationId,
            patient_id: patientId,
        }, MetricValueType.CURRENCY_CENTS);
    },
    overdue: function (organizationId, amountCents, patientId) {
        return recordBusinessMetric(BusinessMetric.PAYMENT_OVERDUE, amountCents, {
            organization_id: organizationId,
            patient_id: patientId,
        }, MetricValueType.CURRENCY_CENTS);
    },
};
/**
 * Assessment-related metrics
 */
exports.assessmentMetrics = {
    created: function (organizationId, userId, patientId, category) {
        return incrementCounter(BusinessMetric.ASSESSMENT_CREATED, {
            organization_id: organizationId,
            user_id: userId,
            patient_id: patientId,
            assessment_category: category,
        });
    },
    completed: function (organizationId, patientId, category) {
        return incrementCounter(BusinessMetric.ASSESSMENT_COMPLETED, {
            organization_id: organizationId,
            patient_id: patientId,
            assessment_category: category,
        });
    },
};
/**
 * Exercise-related metrics
 */
exports.exerciseMetrics = {
    assigned: function (organizationId, patientId, category) {
        return incrementCounter(BusinessMetric.EXERCISE_ASSIGNED, {
            organization_id: organizationId,
            patient_id: patientId,
            exercise_category: category,
        });
    },
    completed: function (organizationId, patientId, category) {
        return incrementCounter(BusinessMetric.EXERCISE_COMPLETED, {
            organization_id: organizationId,
            patient_id: patientId,
            exercise_category: category,
        });
    },
};
/**
 * Session-related metrics
 */
exports.sessionMetrics = {
    completed: function (organizationId, userId, patientId) {
        return incrementCounter(BusinessMetric.SESSION_COMPLETED, {
            organization_id: organizationId,
            user_id: userId,
            patient_id: patientId,
        });
    },
    planned: function (organizationId, patientId) {
        return incrementCounter(BusinessMetric.SESSION_PLANNED, {
            organization_id: organizationId,
            patient_id: patientId,
        });
    },
};
/**
 * User-related metrics
 */
exports.userMetrics = {
    login: function (organizationId, userId, role) {
        return incrementCounter(BusinessMetric.USER_LOGIN, {
            organization_id: organizationId,
            user_id: userId,
            user_role: role,
        });
    },
    logout: function (organizationId, userId) {
        return incrementCounter(BusinessMetric.USER_LOGOUT, {
            organization_id: organizationId,
            user_id: userId,
        });
    },
};
// Import getLogger locally to avoid circular dependency
var logger_1 = require("./logger");
