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
exports.DriveService = void 0;
var googleapis_1 = require("googleapis");
var google_auth_library_1 = require("google-auth-library");
var DriveService = /** @class */ (function () {
    function DriveService(accessToken) {
        this.oauth2Client = new google_auth_library_1.OAuth2Client();
        this.oauth2Client.setCredentials({ access_token: accessToken });
        this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.oauth2Client });
    }
    DriveService.prototype.saveToDrive = function (pdfBuffer, fileName, folderId) {
        return __awaiter(this, void 0, void 0, function () {
            var fileMetadata, media, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fileMetadata = { name: fileName };
                        if (folderId) {
                            fileMetadata.parents = [folderId];
                        }
                        media = {
                            mimeType: 'application/pdf',
                            body: pdfBuffer,
                        };
                        return [4 /*yield*/, this.drive.files.create({
                                requestBody: fileMetadata,
                                media: media,
                                fields: 'id,webViewLink',
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    DriveService.prototype.createFolder = function (name, parentId) {
        return __awaiter(this, void 0, void 0, function () {
            var fileMetadata, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fileMetadata = {
                            name: name,
                            mimeType: 'application/vnd.google-apps.folder',
                        };
                        if (parentId) {
                            fileMetadata.parents = [parentId];
                        }
                        return [4 /*yield*/, this.drive.files.create({
                                requestBody: fileMetadata,
                                fields: 'id',
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    DriveService.prototype.shareFile = function (fileId_1, email_1) {
        return __awaiter(this, arguments, void 0, function (fileId, email, role) {
            var response;
            if (role === void 0) { role = 'reader'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.drive.permissions.create({
                            fileId: fileId,
                            requestBody: {
                                role: role,
                                type: 'user',
                                emailAddress: email,
                            },
                            sendNotificationEmail: false,
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    DriveService.prototype.listTemplates = function (folderId) {
        return __awaiter(this, void 0, void 0, function () {
            var q, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        q = folderId
                            ? "'".concat(folderId, "' in parents and mimeType = 'application/vnd.google-apps.document'")
                            : "mimeType = 'application/vnd.google-apps.document' and name contains 'Template'";
                        return [4 /*yield*/, this.drive.files.list({
                                q: q,
                                fields: 'files(id, name, thumbnailLink)',
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data.files];
                }
            });
        });
    };
    return DriveService;
}());
exports.DriveService = DriveService;
