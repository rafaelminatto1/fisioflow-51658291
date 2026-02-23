"use strict";
/**
 * Cloud Monitoring Integration
 * Integrates with Google Cloud Monitoring API for custom metrics
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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGGREGATION_TYPE_MAP = void 0;
exports.metricToTimeSeries = metricToTimeSeries;
exports.writeCustomMetric = writeCustomMetric;
exports.createMetricDescriptor = createMetricDescriptor;
exports.initializeMetricDescriptors = initializeMetricDescriptors;
exports.writeBatchMetrics = writeBatchMetrics;
exports.recordConversionRateKPI = recordConversionRateKPI;
exports.recordCancellationRateKPI = recordCancellationRateKPI;
var metrics_1 = require("./metrics");
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('cloud-monitoring');
/**
 * Default configuration
 */
var DEFAULT_CONFIG = {
    projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '',
    metricDomain: 'fisioflow.com.br',
    metricPrefix: 'custom.googleapis.com',
};
/**
 * Maps our value types to Cloud Monitoring metric kinds
 */
var VALUE_TYPE_MAP = (_a = {},
    _a[metrics_1.MetricValueType.COUNT] = 'INT64',
    _a[metrics_1.MetricValueType.DURATION_MS] = 'INT64',
    _a[metrics_1.MetricValueType.CURRENCY_CENTS] = 'INT64',
    _a[metrics_1.MetricValueType.PERCENTAGE] = 'DOUBLE',
    _a);
/**
 * Maps our value types to Cloud Monitoring aggregation types
 * Reserved for future Cloud Monitoring integration
 */
exports.AGGREGATION_TYPE_MAP = (_b = {},
    _b[metrics_1.MetricValueType.COUNT] = 'SUM',
    _b[metrics_1.MetricValueType.DURATION_MS] = 'DISTRIBUTION',
    _b[metrics_1.MetricValueType.CURRENCY_CENTS] = 'SUM',
    _b[metrics_1.MetricValueType.PERCENTAGE] = 'GAUGE',
    _b);
/**
 * Gets the metric type path for Cloud Monitoring
 *
 * @param config - Cloud Monitoring configuration
 * @param metricName - Name of the metric
 * @returns Full metric type path
 */
function getMetricType(config, metricName) {
    return "".concat(config.metricPrefix, "/").concat(metricName);
}
/**
 * Converts metric data to Cloud Monitoring format
 * Reserved for future Cloud Monitoring integration
 *
 * @param metricData - Metric data to convert
 * @param config - Cloud Monitoring configuration
 * @returns Formatted time series
 */
function metricToTimeSeries(metricData, config) {
    var _a;
    var _b;
    var metricType = getMetricType(config, metricData.metric);
    var valueType = VALUE_TYPE_MAP[metricData.valueType];
    // Build labels object, filtering out undefined values
    var labels = {};
    for (var _i = 0, _c = Object.entries(metricData.labels); _i < _c.length; _i++) {
        var _d = _c[_i], key = _d[0], value = _d[1];
        if (value !== undefined) {
            labels[key] = String(value);
        }
    }
    return {
        timeSeries: [
            {
                metric: {
                    type: metricType,
                    labels: labels,
                },
                resource: {
                    type: 'cloud_function',
                    labels: {
                        project_id: config.projectId,
                        function_name: process.env.FUNCTION_NAME || 'unknown',
                        region: process.env.FUNCTION_REGION || 'unknown',
                    },
                },
                points: [
                    {
                        interval: {
                            endTime: {
                                seconds: Math.floor((((_b = metricData.timestamp) === null || _b === void 0 ? void 0 : _b.getTime()) || Date.now()) / 1000),
                                nanos: 0,
                            },
                        },
                        value: (_a = {},
                            _a[valueType.toLowerCase()] = metricData.value,
                            _a),
                    },
                ],
            },
        ],
    };
}
/**
 * Writes a custom metric to Cloud Monitoring
 *
 * Note: This requires the Cloud Monitoring API to be enabled.
 * In production, you would use the @google-cloud/monitoring package.
 * For now, we'll log the metric that would be sent.
 *
 * @param metricData - Metric data to write
 * @param config - Optional Cloud Monitoring configuration
 * @returns Promise that resolves when metric is written
 */
function writeCustomMetric(metricData_1) {
    return __awaiter(this, arguments, void 0, function (metricData, config) {
        var fullConfig;
        if (config === void 0) { config = {}; }
        return __generator(this, function (_a) {
            fullConfig = __assign(__assign({}, DEFAULT_CONFIG), config);
            if (!fullConfig.projectId) {
                logger.warn('Cloud Monitoring project ID not configured, metric only logged');
                return [2 /*return*/];
            }
            try {
                // For production, you would use:
                // import { MetricServiceClient } from '@google-cloud/monitoring';
                // const client = new MetricServiceClient();
                // await client.createTimeSeries(metricToTimeSeries(metricData, fullConfig));
                // For now, we simulate the write by logging what would be sent
                logger.info('Would write metric to Cloud Monitoring', {
                    metricType: getMetricType(fullConfig, metricData.metric),
                    value: metricData.value,
                    valueType: metricData.valueType,
                    labels: metricData.labels,
                });
                // TODO: Implement actual Cloud Monitoring API integration
                // Uncomment when @google-cloud/monitoring is installed:
                /*
                const { MetricServiceClient } = require('@google-cloud/monitoring');
                const client = new MetricServiceClient();
            
                const timeSeries = metricToTimeSeries(metricData, fullConfig);
                const [name] = await client.projectPath(fullConfig.projectId);
            
                await client.createTimeSeries({
                  name,
                  timeSeries: timeSeries.timeSeries,
                });
                */
            }
            catch (error) {
                logger.error('Failed to write metric to Cloud Monitoring', { error: error, metricData: metricData });
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Creates a custom metric descriptor in Cloud Monitoring
 *
 * @param metricName - Name of the metric
 * @param displayName - Human-readable name
 * @param description - Metric description
 * @param unit - Unit of measurement (optional)
 * @param valueType - Type of value
 * @param config - Optional configuration
 * @returns Promise that resolves when descriptor is created
 */
function createMetricDescriptor(metricName_1, displayName_1, description_1, unit_1, valueType_1) {
    return __awaiter(this, arguments, void 0, function (metricName, displayName, description, unit, valueType, config) {
        var fullConfig, metricType;
        if (config === void 0) { config = {}; }
        return __generator(this, function (_a) {
            fullConfig = __assign(__assign({}, DEFAULT_CONFIG), config);
            if (!fullConfig.projectId) {
                logger.warn('Cloud Monitoring project ID not configured');
                return [2 /*return*/];
            }
            try {
                metricType = getMetricType(fullConfig, metricName);
                logger.info('Would create metric descriptor', {
                    metricType: metricType,
                    displayName: displayName,
                    description: description,
                    unit: unit,
                });
                // TODO: Implement actual metric descriptor creation
                // Uncomment when @google-cloud/monitoring is installed:
                /*
                const { MetricServiceClient } = require('@google-cloud/monitoring');
                const client = new MetricServiceClient();
            
                const [name] = await client.projectPath(fullConfig.projectId);
            
                await client.createMetricDescriptor({
                  name,
                  metricDescriptor: {
                    name: metricType,
                    displayName,
                    description,
                    unit,
                    type: valueType === MetricValueType.PERCENTAGE ? 'GAUGE' : 'CUMULATIVE',
                    valueType: VALUE_TYPE_MAP[valueType],
                    metricKind: valueType === MetricValueType.PERCENTAGE ? 'GAUGE' : 'CUMULATIVE',
                  },
                });
                */
            }
            catch (error) {
                logger.error('Failed to create metric descriptor', { error: error, metricName: metricName });
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Initializes all custom metric descriptors
 * Call this once during deployment or cold start
 *
 * @param config - Optional configuration
 */
function initializeMetricDescriptors(config) {
    return __awaiter(this, void 0, void 0, function () {
        var metrics, _i, metrics_2, _a, name_1, display, desc, unit, type, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    metrics = [
                        // Patient metrics
                        ['patient_registered', 'Patients Registered', 'Count of new patient registrations', '1', metrics_1.MetricValueType.COUNT],
                        ['patient_active', 'Active Patients', 'Count of active patients', '1', metrics_1.MetricValueType.COUNT],
                        // Appointment metrics
                        ['appointment_booked', 'Appointments Booked', 'Count of booked appointments', '1', metrics_1.MetricValueType.COUNT],
                        ['appointment_cancelled', 'Appointments Cancelled', 'Count of cancelled appointments', '1', metrics_1.MetricValueType.COUNT],
                        ['appointment_completed', 'Appointments Completed', 'Count of completed appointments', '1', metrics_1.MetricValueType.COUNT],
                        // Payment metrics
                        ['payment_received', 'Payments Received', 'Count of payments received', '1', metrics_1.MetricValueType.COUNT],
                        ['revenue_earned', 'Revenue Earned', 'Total revenue in cents', 'cents', metrics_1.MetricValueType.CURRENCY_CENTS],
                        // Assessment metrics
                        ['assessment_created', 'Assessments Created', 'Count of assessments created', '1', metrics_1.MetricValueType.COUNT],
                        ['assessment_completed', 'Assessments Completed', 'Count of assessments completed', '1', metrics_1.MetricValueType.COUNT],
                        // Exercise metrics
                        ['exercise_assigned', 'Exercises Assigned', 'Count of exercises assigned', '1', metrics_1.MetricValueType.COUNT],
                        ['exercise_completed', 'Exercises Completed', 'Count of exercises completed', '1', metrics_1.MetricValueType.COUNT],
                        // Session metrics
                        ['session_completed', 'Sessions Completed', 'Count of treatment sessions completed', '1', metrics_1.MetricValueType.COUNT],
                    ];
                    logger.info('Initializing metric descriptors');
                    _i = 0, metrics_2 = metrics;
                    _b.label = 1;
                case 1:
                    if (!(_i < metrics_2.length)) return [3 /*break*/, 6];
                    _a = metrics_2[_i], name_1 = _a[0], display = _a[1], desc = _a[2], unit = _a[3], type = _a[4];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, createMetricDescriptor(name_1, display, desc, unit, type, config)];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _b.sent();
                    logger.warn("Failed to create metric descriptor for ".concat(name_1), { error: error_1 });
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    logger.info('Metric descriptors initialized');
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Batch write multiple metrics
 *
 * @param metrics - Array of metric data
 * @param config - Optional configuration
 */
function writeBatchMetrics(metrics, config) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all(metrics.map(function (m) { return writeCustomMetric(m, config); }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Records a conversion rate KPI
 */
function recordConversionRateKPI(data) {
    return __awaiter(this, void 0, void 0, function () {
        var conversionRate, recordBusinessMetric;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    conversionRate = data.registrations > 0
                        ? (data.first_sessions / data.registrations) * 100
                        : 0;
                    logger.info('Conversion rate KPI', {
                        organization_id: data.organization_id,
                        conversion_rate: conversionRate.toFixed(2) + '%',
                        registrations: data.registrations,
                        first_sessions: data.first_sessions,
                    });
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./metrics'); })];
                case 1:
                    recordBusinessMetric = (_a.sent()).recordBusinessMetric;
                    recordBusinessMetric('conversion_rate', conversionRate, {
                        organization_id: data.organization_id,
                    }, metrics_1.MetricValueType.PERCENTAGE);
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Records appointment cancellation rate
 */
function recordCancellationRateKPI(organizationId, total, cancelled) {
    return __awaiter(this, void 0, void 0, function () {
        var rate;
        return __generator(this, function (_a) {
            rate = total > 0 ? (cancelled / total) * 100 : 0;
            logger.info('Cancellation rate KPI', {
                organization_id: organizationId,
                cancellation_rate: rate.toFixed(2) + '%',
                total: total,
                cancelled: cancelled,
            });
            return [2 /*return*/];
        });
    });
}
