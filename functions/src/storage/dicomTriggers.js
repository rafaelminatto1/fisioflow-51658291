"use strict";
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
exports.onDicomUpload = void 0;
var storage_1 = require("firebase-functions/v2/storage");
var adapter_1 = require("../healthcare/adapter");
var admin = require("firebase-admin");
/**
 * Trigger disparada quando um arquivo DICOM é carregado no Storage.
 * Caminho esperado: medical-exams/{patientId}/{fileName}.dcm
 */
exports.onDicomUpload = (0, storage_1.onObjectFinalized)({
    region: 'southamerica-east1',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var object, filePath, pathParts, patientId, gcsPath, result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                object = event.data;
                filePath = object.name;
                if (!filePath || !filePath.endsWith('.dcm')) {
                    console.log('Not a DICOM file, skipping processing.');
                    return [2 /*return*/, null];
                }
                pathParts = filePath.split('/');
                if (pathParts[0] !== 'medical-exams' || pathParts.length < 3) {
                    console.log('File is outside medical-exams folder, skipping.');
                    return [2 /*return*/, null];
                }
                patientId = pathParts[1];
                gcsPath = "gs://".concat(object.bucket, "/").concat(filePath);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 7]);
                console.log("Starting DICOM processing for patient ".concat(patientId, ": ").concat(gcsPath));
                return [4 /*yield*/, (0, adapter_1.callImageProcessor)(gcsPath)];
            case 2:
                result = _a.sent();
                console.log('Processing complete:', result);
                if (!(result.status === 'success' && result.metadata)) return [3 /*break*/, 4];
                return [4 /*yield*/, admin.firestore()
                        .collection('patients')
                        .doc(patientId)
                        .collection('exams')
                        .add({
                        type: 'DICOM',
                        gcsPath: gcsPath,
                        metadata: result.metadata,
                        processedAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'PROCESSED'
                    })];
            case 3:
                _a.sent();
                console.log("Metadata saved to Firestore for patient ".concat(patientId));
                _a.label = 4;
            case 4: return [2 /*return*/, result];
            case 5:
                error_1 = _a.sent();
                console.error('Error calling image processor:', error_1);
                // Registrar erro no Firestore
                return [4 /*yield*/, admin.firestore()
                        .collection('patients')
                        .doc(patientId)
                        .collection('exams')
                        .add({
                        type: 'DICOM',
                        gcsPath: gcsPath,
                        error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                        failedAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'ERROR'
                    })];
            case 6:
                // Registrar erro no Firestore
                _a.sent();
                throw error_1;
            case 7: return [2 /*return*/];
        }
    });
}); });
